import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Payment from '../../../../lib/models/Payment';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 });

    const q: any = { date };
    const payments = await Payment.find(q).sort({ mode: 1 }).lean();

    const tx = payments.map((p:any) => ({
      id: p._id || p.id,
      date: p.date,
      type: p.type,
      amount: p.amount || 0,
      mode: p.mode,
      reference: p.reference,
      allocations: p.allocations || [],
      notes: p.notes || ''
    }));

    return NextResponse.json(tx);
  } catch (err:any) {
    console.error('GET /api/reports/daybook error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
