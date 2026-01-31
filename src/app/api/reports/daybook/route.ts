import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import LedgerEntry from '../../../../lib/models/LedgerEntry';
import { getCompanyContextFromRequest } from '../../../../lib/companyContext';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { companyId } = getCompanyContextFromRequest(req);
    if (!companyId) return NextResponse.json({ error: 'No company selected' }, { status: 400 });

    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 });

    const entries = await LedgerEntry.find({ date, companyId }).sort({ createdAt: 1 }).lean();

    const tx = entries.map((e: any) => ({
      id: e._id || e.id,
      date: e.date,
      partyName: e.partyName,
      type: e.debit > 0 ? 'debit' : 'credit', // In daybook, show entries
      amount: e.debit || e.credit,
      credit: e.credit,
      debit: e.debit,
      voucherNo: e.refNo,
      notes: e.narration,
      entryType: e.entryType
    }));

    return NextResponse.json(tx);
  } catch (err: any) {
    console.error('Daybook error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
