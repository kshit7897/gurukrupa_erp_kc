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

    // 1. Find all Bank/UPI parties
    const bankParties = await Party.find({ 
      companyId, 
      roles: { $in: ['Bank', 'UPI'] } 
    }).select('_id name type').lean();
    
    const bankPartyIds = bankParties.map(p => p._id.toString());

    if (bankPartyIds.length === 0) return NextResponse.json([]);

    // 2. Fetch LedgerEntries for these parties
    const q: any = { companyId, partyId: { $in: bankPartyIds } };
    if (from && to) q.date = { $gte: from, $lte: to };

    const entries = await LedgerEntry.find(q).sort({ date: 1, createdAt: 1 }).lean();

    const tx = entries.map((e: any) => {
      const party = bankParties.find(p => p._id.toString() === e.partyId);
      return {
        id: e._id || e.id,
        date: e.date,
        partyName: e.narration || 'Bank Entry',
        mode: party?.type || 'Bank',
        credit: e.debit, // Bank Debit = Deposit (In)
        debit: e.credit, // Bank Credit = Withdrawal (Out)
        amount: e.debit || e.credit,
        reference: e.refNo,
      };
    });

    return NextResponse.json(tx);
  } catch (err: any) {
    console.error('Bankbook error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
