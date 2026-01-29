import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Payment from '../../../../lib/models/Payment';
import { getCompanyContextFromRequest } from '../../../../lib/companyContext';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { companyId } = getCompanyContextFromRequest(req);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const q: any = { mode: 'cash', companyId };
    if (from && to) q.date = { $gte: from, $lte: to };

    const payments = await Payment.find(q).sort({ date: 1 }).lean();

    const tx = payments.map((p:any) => ({
      id: p._id || p.id,
      date: p.date,
      type: p.type,
      amount: p.amount || 0,
      credit: p.type === 'receive' ? (p.amount || 0) : 0,
      debit: p.type === 'pay' ? (p.amount || 0) : 0,
      mode: p.mode,
      reference: p.reference,
      allocations: p.allocations || [],
      notes: p.notes || ''
    }));

    return NextResponse.json(tx);
  } catch (err:any) {
    console.error('GET /api/reports/cashbook error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
