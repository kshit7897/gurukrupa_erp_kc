import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Party from '../../../../lib/models/Party';
import LedgerEntry from '../../../../lib/models/LedgerEntry';
import { getCompanyContextFromRequest } from '../../../../lib/companyContext';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { companyId } = getCompanyContextFromRequest(req);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }

    const url = new URL(req.url);
    const partyId = url.searchParams.get('party');
    const start = url.searchParams.get('from') || undefined;
    const end = url.searchParams.get('to') || undefined;
    if (!partyId) return NextResponse.json({ error: 'party is required' }, { status: 400 });

    const partyDoc = await Party.findOne({ _id: partyId, companyId }).lean();
    if (!partyDoc) return NextResponse.json([], { status: 200 });

    const q: any = { partyId, companyId };
    if (start && end) {
      q.date = { $gte: start, $lte: end };
    } else if (start) {
      q.date = { $gte: start };
    } else if (end) {
      q.date = { $lte: end };
    }

    const entries = await LedgerEntry.find(q).sort({ date: 1, createdAt: 1 }).lean();

    // Map to a consistent transaction format
    const transactions = entries.map((e: any) => ({
      id: e._id.toString(),
      date: e.date,
      ref: e.refNo || '-',
      type: e.entryType || e.refType || 'TXN',
      debit: Number(e.debit || 0),
      credit: Number(e.credit || 0),
      cash: e.paymentMode?.toLowerCase() === 'cash' || e.narration?.toLowerCase().includes('cash'),
      desc: e.narration || ''
    }));

    // running balance starting from openingBalance
    let balance = (partyDoc.openingBalance || 0);
    
    // Logic for balance: 
    // Assets (Customer, Cash, Bank, UPI): Debit increases, Credit decreases
    // Liabilities/Equity (Supplier, Partner, Owner): Credit increases, Debit decreases
    const roles: string[] = (partyDoc.roles || [partyDoc.type]).map((r: any) => r && r.toString().toLowerCase());
    const isAsset = roles.some(r => ['customer', 'cash', 'bank', 'upi'].includes(r));

    const result = transactions.map((t: any) => {
      if (isAsset) {
        balance = balance + t.debit - t.credit;
      } else {
        balance = balance + t.credit - t.debit;
      }
      return { ...t, balance };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('GET /api/reports/ledger error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
