import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Invoice from '../../../../lib/models/Invoice';
import OtherTxn from '../../../../lib/models/OtherTxn';
import Company from '../../../../lib/models/Company';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (!from || !to) return NextResponse.json({ error: 'from and to required (YYYY-MM-DD)' }, { status: 400 });

    // Get company opening balance
    const company = await Company.findOne().lean();
    const openingBalance = company?.openingBalance || 0;

    const range = { $gte: from, $lte: to };
    const invMatch = { date: range } as any;

    const salesAgg = await Invoice.aggregate([
      { $match: { ...invMatch, type: 'SALES' } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$grandTotal', 0] } } } }
    ]);
    const purchaseAgg = await Invoice.aggregate([
      { $match: { ...invMatch, type: 'PURCHASE' } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$grandTotal', 0] } } } }
    ]);

    const other = await OtherTxn.aggregate([
      { $match: { date: range } },
      { $group: { _id: '$kind', total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);

    const incomeOther = other.find(o => o._id === 'income')?.total || 0;
    const expenseOther = other.find(o => o._id === 'expense')?.total || 0;

    const sales = salesAgg[0]?.total || 0;
    const purchase = purchaseAgg[0]?.total || 0;
    const gross = sales - purchase;
    const net = gross + incomeOther - expenseOther;

    return NextResponse.json({
      from,
      to,
      openingBalance,
      sales,
      purchase,
      grossProfit: gross,
      otherIncome: incomeOther,
      otherExpense: expenseOther,
      netProfit: net
    });
  } catch (err: any) {
    console.error('GET /api/reports/profitloss error', err);
    return NextResponse.json({ error: err?.message || 'Failed to compute P&L' }, { status: 500 });
  }
}
