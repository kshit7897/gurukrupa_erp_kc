import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Payment from '../../../lib/models/Payment';
import Invoice from '../../../lib/models/Invoice';

// GET: list payments, optional query param `party` to filter by partyId
export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const partyId = searchParams.get('party');
    const q: any = {};
    if (partyId) q.partyId = partyId;
    const payments = await Payment.find(q).sort({ createdAt: -1 }).lean();
    return NextResponse.json(payments.map(p => ({ ...(p as any), id: (p as any)._id?.toString() })));
  } catch (err: any) {
    console.error('GET /api/payments error', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch payments' }, { status: 500 });
  }
}

// POST: create a payment and update referenced invoice paid/due amounts
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    if (!body || !body.partyId || typeof body.amount !== 'number') {
      return NextResponse.json({ error: 'partyId and numeric amount required' }, { status: 400 });
    }

    const payment = await Payment.create({
      partyId: body.partyId,
      invoiceId: body.invoiceId,
      amount: body.amount,
      date: body.date || new Date().toISOString(),
      mode: body.mode || 'cash',
      reference: body.reference,
      notes: body.notes
    });

    if (body.invoiceId) {
      const invoice = await Invoice.findById(body.invoiceId);
      if (invoice) {
        invoice.paidAmount = (invoice.paidAmount || 0) + Number(body.amount || 0);
        invoice.dueAmount = Math.max(0, (invoice.grandTotal || 0) - invoice.paidAmount);
        await invoice.save();
      }
    }

    return NextResponse.json({ ...(payment as any).toObject(), id: (payment as any)._id.toString() });
  } catch (err: any) {
    console.error('POST /api/payments error', err);
    return NextResponse.json({ error: err?.message || 'Failed to create payment' }, { status: 500 });
  }
}
