import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Party from '../../../../lib/models/Party';
import LedgerEntry from '../../../../lib/models/LedgerEntry';
import { getCompanyContextFromRequest } from '../../../../lib/companyContext';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { companyId } = getCompanyContextFromRequest(req);
    if (!companyId) return NextResponse.json({ error: 'No company selected' }, { status: 400 });

    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    // 1. Find all Cash parties
    const cashParties = await Party.find({ companyId, roles: 'Cash' }).select('_id name').lean();
    const cashPartyIds = cashParties.map(p => p._id.toString());

    if (cashPartyIds.length === 0) return NextResponse.json([]);

    // 2. Fetch LedgerEntries for these parties
    const q: any = { companyId, partyId: { $in: cashPartyIds } };
    if (from && to) q.date = { $gte: from, $lte: to };

    const entries = await LedgerEntry.find(q).sort({ date: 1, createdAt: 1 }).lean();

    const tx = entries.map((e: any) => ({
      id: e._id || e.id,
      date: e.date,
      // We want to show the 'Counter' party name in the cashbook
      // But ledger entries for 'Cash' only have narration often or we'd need to cross-ref.
      // For now, use narration as the party/note.
      partyName: e.narration || 'Cash Entry',
      credit: e.debit, // Cash Debit = Money IN
      debit: e.credit, // Cash Credit = Money OUT
      amount: e.debit || e.credit,
      reference: e.refNo,
    }));

    return NextResponse.json(tx);
  } catch (err: any) {
    console.error('Cashbook error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
