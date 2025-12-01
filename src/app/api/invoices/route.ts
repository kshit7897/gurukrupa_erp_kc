import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Invoice from '../../../lib/models/Invoice';
import { updateStockForInvoice } from '../../../lib/stock';
import { generateInvoiceNumber } from '../../../lib/invoiceNumber';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const party = url.searchParams.get('party');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');
    const bill_type = url.searchParams.get('bill_type');
    const pending = url.searchParams.get('pending'); // '1' or 'true'

    const q: any = {};
    if (party) q.partyId = party;
    if (bill_type) q.paymentMode = bill_type;
    if (pending === '1' || pending === 'true') q.dueAmount = { $gt: 0 };

    if (from && to) {
      q.date = { $gte: from, $lte: to };
    } else if (month && year) {
      // filter by month/year (date is stored as ISO-ish string). We'll match prefix YYYY-MM
      const mm = month.padStart(2, '0');
      const prefix = `${year}-${mm}`;
      q.date = { $regex: `^${prefix}` };
    }

    const invoices = await Invoice.find(q).sort({ date: -1, createdAt: -1 });
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