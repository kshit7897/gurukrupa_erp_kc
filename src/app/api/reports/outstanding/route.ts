import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Invoice from '../../../../lib/models/Invoice';
import Party from '../../../../lib/models/Party';
import Payment from '../../../../lib/models/Payment';
import LedgerEntry from '../../../../lib/models/LedgerEntry';
import { getCompanyContextFromRequest } from '../../../../lib/companyContext';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { companyId } = getCompanyContextFromRequest(req);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }

    const allParties = await Party.find({ companyId }).lean();
    const parties = allParties.filter((p: any) => 
      !p.isSystemAccount && 
      !['Cash', 'Bank', 'UPI'].some(role => (p.roles || []).includes(role))
    );

    // Sum all ledger entries for each party in one go
    const ledgerAgg = await LedgerEntry.aggregate([
      { $match: { companyId } },
      { $group: {
          _id: "$partyId",
          totalDebit: { $sum: "$debit" },
          totalCredit: { $sum: "$credit" }
      }}
    ]);

    const ledgerMap = new Map();
    ledgerAgg.forEach((item: any) => {
      ledgerMap.set(item._id.toString(), item);
    });

    const report = parties.map(p => {
      const partyId = (p._id || p.id).toString();
      const stats = ledgerMap.get(partyId) || { totalDebit: 0, totalCredit: 0 };
      
      const pType = (p.type || '').toString().toLowerCase();
      const isCustomer = pType === 'customer';
      
      // Calculate current balance based on ledger sums
      // For customers (Receivable): Debit increases, Credit decreases
      // For others (Payable/Suppliers/Carting): Credit increases, Debit decreases
      let currentBalance = 0;
      if (isCustomer) {
        currentBalance = stats.totalDebit - stats.totalCredit;
      } else {
        currentBalance = stats.totalCredit - stats.totalDebit;
      }

      return { 
        ...p, 
        id: partyId,
        totalDebit: stats.totalDebit,
        totalCredit: stats.totalCredit,
        currentBalance: Number(currentBalance.toFixed(2))
      };
    });

    return NextResponse.json(report);
  } catch (err: any) {
    console.error('GET /api/reports/outstanding error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
