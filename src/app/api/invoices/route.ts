import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Invoice from '../../../lib/models/Invoice';
import { updateStockForInvoice } from '../../../lib/stock';
import { generateInvoiceNumber } from '../../../lib/invoiceNumber';

export async function GET() {
  try {
    await dbConnect();
    const invoices = await Invoice.find({}).sort({ createdAt: -1 });
    const formatted = invoices.map(doc => ({ ...(doc as any).toObject(), id: (doc as any)._id.toString() }));
    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error('GET /api/invoices error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    console.log('POST /api/invoices body:', JSON.stringify(body).slice(0, 1000));
    // Ensure payment fields are set correctly
    const payload = { ...body } as any;
    const grand = Number(payload.grandTotal || 0);
    if (payload.paymentMode === 'cash') {
      payload.paidAmount = grand;
      payload.dueAmount = 0;
    } else {
      payload.paidAmount = Number(payload.paidAmount || 0);
      payload.dueAmount = Math.max(0, grand - (payload.paidAmount || 0));
    }

    // Generate invoice numbering fields: invoice_no, serial, bill_type, financial_year
    try {
      const gen = await generateInvoiceNumber({ paymentMode: payload.paymentMode, date: payload.date, bill_type: payload.bill_type });
      payload.invoice_no = gen.invoice_no;
      payload.serial = gen.serial;
      payload.bill_type = gen.bill_type;
      payload.financial_year = gen.financial_year;
      // keep legacy field as well
      payload.invoiceNo = gen.invoice_no;
    } catch (err) {
      console.error('Invoice number generation failed', err);
      return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 });
    }

    const invoice = await Invoice.create(payload);
    // ensure stock updates; if this fails, delete the created invoice and return error
    try {
      await updateStockForInvoice({ ...((invoice as any).toObject()), id: (invoice as any)._id.toString() });
    } catch (err) {
      console.error('Stock update failed after invoice create, reverting invoice:', err);
      await Invoice.findByIdAndDelete((invoice as any)._id);
      return NextResponse.json({ error: 'Failed to update stock for invoice: ' + (err as any).message }, { status: 500 });
    }

    const out = { ...(invoice as any).toObject(), id: (invoice as any)._id.toString() };
    console.log('Invoice created, id=', out.id);
    return NextResponse.json(out);
  } catch (err: any) {
    console.error('POST /api/invoices error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create invoice' }, { status: 500 });
  }
}