import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Invoice from '../../../../lib/models/Invoice';
import Party from '../../../../lib/models/Party';
import Payment from '../../../../lib/models/Payment';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const partyId = url.searchParams.get('party');
    const start = url.searchParams.get('from') || undefined;
    const end = url.searchParams.get('to') || undefined;
    if (!partyId) return NextResponse.json({ error: 'party is required' }, { status: 400 });

    const partyDoc = await Party.findOne({ _id: partyId }).lean();
    if (!partyDoc) return NextResponse.json([], { status: 200 });

    const q: any = { partyId };
    if (start && end) q.date = { $gte: start, $lte: end };

    const invoices = await Invoice.find(q).sort({ date: 1 }).lean();

    const invTx = invoices.map(i => ({
      id: i.invoiceNo || (i._id || ''),
      date: i.date,
      ref: i.invoiceNo || (i._id || ''),
      type: i.type === 'SALES' ? 'SALE' : 'PURCHASE',
      credit: i.type === 'PURCHASE' ? (i.grandTotal || 0) : 0,
      debit: i.type === 'SALES' ? (i.grandTotal || 0) : 0,
      desc: `${i.type === 'SALES' ? 'Sale' : 'Purchase'} Invoice`
    }));

    // include payments for this party in the date range
    const payQuery: any = { partyId };
    if (start && end) payQuery.date = { $gte: start, $lte: end };
    const payments = await Payment.find(payQuery).sort({ date: 1 }).lean();
    const payTx = payments.map((p: any) => ({
      id: p._id || p.id,
      date: p.date,
      ref: p.reference || (p._id || ''),
      type: 'PAYMENT',
      // For customers, payment reduces receivable (credit). For suppliers, payment reduces payable (debit).
      credit: (partyDoc.type || '').toString().toLowerCase() === 'customer' ? (p.amount || 0) : 0,
      debit: (partyDoc.type || '').toString().toLowerCase() === 'supplier' ? (p.amount || 0) : 0,
      desc: `Payment ${p.mode || ''}`
    }));

    const transactions = invTx.concat(payTx).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // running balance starting from openingBalance
    let balance = (partyDoc.openingBalance || 0);
    const result = transactions.map(t => {
      if ((partyDoc.type || '').toString().toLowerCase() === 'customer') {
        balance = balance + (t.debit || 0) - (t.credit || 0);
      } else {
        balance = balance + (t.credit || 0) - (t.debit || 0);
      }
      return { ...t, balance };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('GET /api/reports/ledger error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
