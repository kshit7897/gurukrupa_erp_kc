import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Invoice from '../../../lib/models/Invoice';
import Payment from '../../../lib/models/Payment';
import Item from '../../../lib/models/Item';
import OtherTxn from '../../../lib/models/OtherTxn';
import Party from '../../../lib/models/Party';
import LedgerEntry from '../../../lib/models/LedgerEntry';
import { getCompanyContextFromRequest } from '../../../lib/companyContext';
import mongoose from 'mongoose';

// Always serve fresh metrics; dashboard must not be cached
export const dynamic = 'force-dynamic';

// Strict company scope filter
const companyIdFilter = (cid: string) => ({ companyId: cid });

export async function GET(request: Request) {
  try {
    await dbConnect();

    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }

    const companyFilter = companyIdFilter(companyId);

    const url = new URL(request.url);
    const drilldown = url.searchParams.get('drilldown'); // 'year', 'month', or 'transactions'
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const metric = url.searchParams.get('metric'); // 'sales', 'purchase', 'receivable', 'payable', 'ledger'
    const partyId = url.searchParams.get('partyId');

    // If drilldown is requested, return specific data
    if (drilldown === 'year' && metric) {
      if (metric === 'ledger' && partyId) return await getLedgerForRange(partyId, from, to, companyId);
      return await getYearlyBreakdown(metric, companyId);
    }
    if (drilldown === 'month' && year && metric) {
      if (metric === 'ledger' && partyId) return await getLedgerForRange(partyId, from, to, companyId);
      return await getMonthlyBreakdown(metric, parseInt(year), companyId);
    }
    if (drilldown === 'transactions' && year && month && metric) {
      if (metric === 'ledger' && partyId) return await getLedgerForRange(partyId, from, to, companyId);
      return await getTransactionBreakdown(metric, parseInt(year), parseInt(month), companyId);
    }

    // Month-to-date range calculation
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthFilter = { $or: [{ date: { $gte: monthStart, $lt: nextMonthStart } }, { createdAt: { $gte: monthStart, $lt: nextMonthStart } }] };

    // Parallelize all independent database queries
    const [
      totalSalesAgg,
      totalPurchaseAgg,
      monthSalesAgg,
      monthPurchaseAgg,
      outstandingAgg,
      receivablesAgg,
      monthReceivablesAgg,
      lowStock,
      currentStockItems,
      recentInvoices,
      recentPayments,
      recentOther,
      payablesAgg,
      cashAgg,
      otherAgg,
      unallocReceiptsAgg,
      unallocPaymentsAgg,
      monthUnallocReceiptsAgg,
      monthUnallocPaymentsAgg,
      financialAccountsAgg,
      ledgerSumsAgg
    ] = await Promise.all([
      // 1. Total Sales
      Invoice.aggregate([{ $match: { type: 'SALES', ...companyFilter } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      // 2. Total Purchase
      Invoice.aggregate([{ $match: { type: 'PURCHASE', ...companyFilter } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      // 3. Month Sales
      Invoice.aggregate([{ $match: { type: 'SALES', ...companyFilter, ...monthFilter } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      // 4. Month Purchase
      Invoice.aggregate([{ $match: { type: 'PURCHASE', ...companyFilter, ...monthFilter } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
      // 5. Total Outstanding
      Invoice.aggregate([{ $match: companyFilter }, { $group: { _id: null, totalDue: { $sum: { $ifNull: ['$dueAmount', 0] } } } }]),
      // 6. Total Receivables
      Invoice.aggregate([{ $match: { type: 'SALES', ...companyFilter } }, { $group: { _id: null, receivable: { $sum: { $ifNull: ['$dueAmount', 0] } } } }]),
      // 7. Month Receivables
      Invoice.aggregate([{ $match: { type: 'SALES', ...companyFilter, ...monthFilter } }, { $group: { _id: null, receivable: { $sum: { $ifNull: ['$dueAmount', 0] } } } }]),
      // 8. Low Stock Count
      Item.countDocuments({ stock: { $lt: 10 }, ...companyFilter }),
      // 9. Stock Snapshot
      Item.find({ stock: { $exists: true }, ...companyFilter }).sort({ stock: -1 }).limit(4).select({ name: 1, stock: 1, sku: 1, unit: 1 }).lean(),
      // 10, 11, 12. Recent Activity
      Invoice.find(companyFilter).sort({ createdAt: -1 }).limit(20).lean(),
      Payment.find(companyFilter).sort({ createdAt: -1 }).limit(20).lean(),
      OtherTxn.find(companyFilter).sort({ createdAt: -1 }).limit(20).lean(),
      // 13. Payables
      Invoice.aggregate([{ $match: { type: 'PURCHASE', ...companyFilter } }, { $group: { _id: null, payable: { $sum: { $ifNull: ['$dueAmount', 0] } } } }]),
      // 14, 15 Cash flow
      Payment.aggregate([{ $match: companyFilter }, { $group: { _id: '$type', total: { $sum: { $ifNull: ['$amount', 0] } } } }]),
      OtherTxn.aggregate([{ $match: companyFilter }, { $group: { _id: '$kind', total: { $sum: { $ifNull: ['$amount', 0] } } } }]),
      // 16, 17, 18, 19 Unallocated advances
      Payment.aggregate([{ $match: { type: 'receive', ...companyFilter, $or: [{ allocations: { $exists: false } }, { allocations: { $size: 0 } }] } }, { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }]),
      Payment.aggregate([{ $match: { type: 'pay', ...companyFilter, $or: [{ allocations: { $exists: false } }, { allocations: { $size: 0 } }] } }, { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }]),
      Payment.aggregate([{ 
        $match: { 
          $and: [
            { type: 'receive' },
            companyFilter, 
            { $or: [{ allocations: { $exists: false } }, { allocations: { $size: 0 } }] }, 
            monthFilter 
          ] 
        } 
      }, { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }]),
      Payment.aggregate([{ 
        $match: { 
          $and: [
            { type: 'pay' },
            companyFilter, 
            { $or: [{ allocations: { $exists: false } }, { allocations: { $size: 0 } }] }, 
            monthFilter 
          ] 
        } 
      }, { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }]),
      // 20. Financial Accounts (Partner, Bank, Cash, UPI, Owner)
      Party.find({
        roles: { $in: ['Partner', 'Bank', 'Cash', 'UPI', 'Owner'] },
        companyId
      }).lean(),
      // 21. All Ledger sums for these accounts
      LedgerEntry.aggregate([
        { $match: { companyId } },
        { $group: { _id: "$partyId", totalDebit: { $sum: "$debit" }, totalCredit: { $sum: "$credit" } } }
      ])
    ]);

    // Combine recent transactions
    const mappedInvoices = (recentInvoices || []).map((inv: any) => ({
      id: inv._id?.toString(),
      kind: 'invoice',
      subtype: inv.type || 'SALES',
      amount: Number(inv.grandTotal || 0),
      partyId: inv.partyId,
      partyName: inv.partyName || inv.billingAddress?.name || null,
      date: inv.createdAt || inv.date,
      ref: inv.invoiceNo || null
    }));
    const mappedPayments = (recentPayments || []).map((p: any) => ({
      id: p._id?.toString(),
      kind: 'payment',
      subtype: p.type || 'receive',
      amount: Number(p.amount || 0),
      partyId: p.partyId,
      partyName: null,
      date: p.createdAt || p.date,
      ref: p.reference || p._id?.toString(),
      outstandingBefore: p.outstandingBefore,
      outstandingAfter: p.outstandingAfter
    }));
    const mappedOther = (recentOther || []).map((o: any) => ({
      id: o._id?.toString(),
      kind: 'other',
      subtype: o.kind,
      amount: Number(o.amount || 0),
      partyId: null,
      partyName: o.category || null,
      date: o.createdAt || o.date,
      ref: o.note || null
    }));
    const combined = [...mappedInvoices, ...mappedPayments, ...mappedOther].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentTransactions = combined.slice(0, 5);

    // Calculate Cash flow totals
    let cashIn = 0, cashOut = 0;
    (cashAgg || []).forEach((c: any) => {
      if ((c._id || '').toString() === 'receive') cashIn += c.total || 0;
      if ((c._id || '').toString() === 'pay') cashOut += c.total || 0;
    });
    (otherAgg || []).forEach((o: any) => {
      if ((o._id || '').toString() === 'income') cashIn += o.total || 0;
      if ((o._id || '').toString() === 'expense') cashOut += o.total || 0;
    });

    const unallocatedReceipts = unallocReceiptsAgg[0]?.total || 0;
    const unallocatedPayments = unallocPaymentsAgg[0]?.total || 0;

    const roundUp = (v: any) => Math.ceil(Number(v || 0));

    return NextResponse.json({
      totalSales: roundUp(totalSalesAgg[0]?.total || 0),
      totalPurchase: roundUp(totalPurchaseAgg[0]?.total || 0),
      monthSales: roundUp(monthSalesAgg[0]?.total || 0),
      monthPurchase: roundUp(monthPurchaseAgg[0]?.total || 0),
      monthProfit: roundUp((monthSalesAgg[0]?.total || 0) - (monthPurchaseAgg[0]?.total || 0)),
      monthReceivables: roundUp(Math.max(0, (monthReceivablesAgg[0]?.receivable || 0) - (monthUnallocReceiptsAgg[0]?.total || 0))),
      outstanding: roundUp(Math.max(0, (outstandingAgg[0]?.totalDue || 0) - unallocatedReceipts + unallocatedPayments)),
      receivables: roundUp(Math.max(0, (receivablesAgg[0]?.receivable || 0) - unallocatedReceipts)),
      payables: roundUp(Math.max(0, (payablesAgg[0]?.payable || 0) - unallocatedPayments)),
      cashIn: roundUp(cashIn),
      cashOut: roundUp(cashOut),
      lowStock: Number(lowStock || 0),
      currentStock: (currentStockItems || []).map((it: any) => ({ id: it._id?.toString(), name: it.name || it.title || 'Unnamed', sku: it.sku || null, stock: Number(it.stock || 0), unit: it.unit || null })),
      financialAccounts: (financialAccountsAgg || []).map((p: any) => {
        const id = p._id.toString();
        const stats = (ledgerSumsAgg || []).find((s: any) => s._id === id) || { totalDebit: 0, totalCredit: 0 };
        const isCustomer = p.type === 'Customer';
        let currentBalance = isCustomer ? (stats.totalDebit - stats.totalCredit) : (stats.totalCredit - stats.totalDebit);
        return {
          id,
          name: p.name,
          type: p.type,
          roles: p.roles || [],
          currentBalance: Number(currentBalance.toFixed(2))
        };
      }),
      recentInvoices,
      recentPayments,
      recentOtherTxns: recentOther
    });
  } catch (err: any) {
    console.error('GET /api/dashboard error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to compute dashboard' }, { status: 500 });
  }
}

// Helper function to get yearly breakdown
async function getYearlyBreakdown(metric: string, companyId: string) {
  const companyFilter = { companyId };

  if (metric === 'profit') {
    const sales = await Invoice.aggregate([
      { $match: { type: 'SALES', ...companyFilter } },
      { $addFields: { year: { $year: { $cond: [{ $type: '$date' }, { $dateFromString: { dateString: '$date', onError: '$createdAt' } }, '$createdAt'] } } } },
      { $group: { _id: '$year', total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]);
    const purchase = await Invoice.aggregate([
      { $match: { type: 'PURCHASE', ...companyFilter } },
      { $addFields: { year: { $year: { $cond: [{ $type: '$date' }, { $dateFromString: { dateString: '$date', onError: '$createdAt' } }, '$createdAt'] } } } },
      { $group: { _id: '$year', total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]);

    const years = new Set([...sales.map(s => s._id), ...purchase.map(p => p._id)]);
    const data = Array.from(years).map(year => {
      const s = sales.find(x => x._id === year) || { total: 0, count: 0 };
      const p = purchase.find(x => x._id === year) || { total: 0, count: 0 };
      return {
        year,
        total: Math.round(s.total - p.total),
        due: 0,
        paid: 0,
        count: s.count + p.count
      };
    }).sort((a, b) => b.year - a.year);

    return NextResponse.json({
      metric,
      breakdown: 'yearly',
      data
    });
  }

  const invoiceType = metric === 'sales' || metric === 'receivable' ? 'SALES' : 'PURCHASE';
  const paymentType = metric === 'sales' || metric === 'receivable' ? 'receive' : 'pay';

  const [yearlyInvoices, unallocatedPayments] = await Promise.all([
    Invoice.aggregate([
      { $match: { type: invoiceType, ...companyFilter } },
      {
        $addFields: {
          year: {
            $year: {
              $cond: [
                { $type: '$date' },
                { $dateFromString: { dateString: '$date', onError: '$createdAt' } },
                '$createdAt'
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: '$year',
          totalAmount: { $sum: '$grandTotal' },
          dueAmount: { $sum: { $ifNull: ['$dueAmount', 0] } },
          paidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Payment.aggregate([
      { 
        $match: { 
          type: paymentType, 
          ...companyFilter, 
          $or: [{ allocations: { $exists: false } }, { allocations: { $size: 0 } }] 
        } 
      },
      {
        $addFields: {
          year: {
            $year: {
              $cond: [
                { $type: '$date' },
                { $dateFromString: { dateString: { $substr: ['$date', 0, 10] }, onError: '$createdAt' } },
                '$createdAt'
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: '$year',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const allYears = Array.from(new Set([
    ...yearlyInvoices.map((y: any) => y._id),
    ...unallocatedPayments.map((p: any) => p._id)
  ])).sort((a: any, b: any) => a - b);

  let runningBalance = 0;
  const result = allYears.map(year => {
    const inv = yearlyInvoices.find((y: any) => y._id === year) || { totalAmount: 0, dueAmount: 0, paidAmount: 0, count: 0 };
    const unalloc = unallocatedPayments.find((p: any) => p._id === year) || { total: 0 };
    
    const opening = runningBalance;
    const yearTotal = inv.totalAmount;
    const yearPaid = inv.paidAmount + unalloc.total;
    const closing = opening + yearTotal - yearPaid;
    
    runningBalance = closing;

    return {
      year,
      total: yearTotal,
      paid: yearPaid,
      opening: Math.round(opening),
      due: Math.round(closing), // Closing balance
      count: inv.count || 0
    };
  }).reverse(); // Most recent first for UI

  return NextResponse.json({
    metric,
    breakdown: 'yearly',
    data: result
  });
}

// Helper function to get monthly breakdown for a year
async function getMonthlyBreakdown(metric: string, year: number, companyId: string) {
  const companyFilter = { companyId };
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (metric === 'profit') {
    const agg = (type: string) => Invoice.aggregate([
      {
        $match: {
          type,
          ...companyFilter,
          $or: [
            { date: { $gte: startDate.toISOString().split('T')[0], $lt: endDate.toISOString().split('T')[0] } },
            { createdAt: { $gte: startDate, $lt: endDate } }
          ]
        }
      },
      { $addFields: { month: { $month: { $cond: [{ $type: '$date' }, { $dateFromString: { dateString: '$date', onError: '$createdAt' } }, '$createdAt'] } } } },
      { $group: { _id: '$month', total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]);

    const sales = await agg('SALES');
    const purchase = await agg('PURCHASE');

    const filledData = monthNames.map((name, idx) => {
      const s = sales.find(m => m._id === idx + 1);
      const p = purchase.find(m => m._id === idx + 1);
      const sTot = s?.total || 0;
      const pTot = p?.total || 0;
      return {
        month: idx + 1,
        monthName: name,
        total: Math.round(sTot - pTot),
        due: 0,
        paid: 0,
        count: (s?.count || 0) + (p?.count || 0)
      };
    });

    return NextResponse.json({
      metric,
      year,
      breakdown: 'monthly',
      data: filledData
    });
  }

  const invoiceType = metric === 'sales' || metric === 'receivable' ? 'SALES' : 'PURCHASE';
  const paymentType = metric === 'sales' || metric === 'receivable' ? 'receive' : 'pay';

  // 1. Calculate historical opening balance before Jan 1 of selected year
  const [histInv, histUnalloc] = await Promise.all([
    Invoice.aggregate([
      { 
        $match: { 
          type: invoiceType, 
          ...companyFilter,
          $and: [
            { date: { $lt: startDate.toISOString().split('T')[0] } },
            { createdAt: { $lt: startDate } }
          ]
        } 
      },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, paid: { $sum: { $ifNull: ['$paidAmount', 0] } } } }
    ]),
    Payment.aggregate([
      { 
        $match: { 
          type: paymentType, 
          ...companyFilter, 
          $and: [
            { date: { $lt: startDate.toISOString().split('T')[0] } },
            { createdAt: { $lt: startDate } },
            { $or: [{ allocations: { $exists: false } }, { allocations: { $size: 0 } }] }
          ]
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  const initialOpening = (histInv[0]?.total || 0) - (histInv[0]?.paid || 0) - (histUnalloc[0]?.total || 0);

  // 2. Get data for each month of selected year
  const [monthlyInvoices, unallocatedPayments] = await Promise.all([
    Invoice.aggregate([
      {
        $match: {
          type: invoiceType,
          ...companyFilter,
          $or: [
            { date: { $gte: startDate.toISOString().split('T')[0], $lt: endDate.toISOString().split('T')[0] } },
            { createdAt: { $gte: startDate, $lt: endDate } }
          ]
        }
      },
      {
        $addFields: {
          month: { $month: { $cond: [{ $type: '$date' }, { $dateFromString: { dateString: '$date', onError: '$createdAt' } }, '$createdAt'] } }
        }
      },
      {
        $group: {
          _id: '$month',
          totalAmount: { $sum: '$grandTotal' },
          paidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } },
          count: { $sum: 1 }
        }
      }
    ]),
    Payment.aggregate([
      {
        $match: {
          $and: [
            { type: paymentType, ...companyFilter },
            { 
              $or: [
                { date: { $gte: startDate.toISOString().split('T')[0], $lt: endDate.toISOString().split('T')[0] } },
                { createdAt: { $gte: startDate, $lt: endDate } }
              ]
            },
            { $or: [{ allocations: { $exists: false } }, { allocations: { $size: 0 } }] }
          ]
        }
      },
      {
        $addFields: {
          month: { $month: { $cond: [{ $type: '$date' }, { $dateFromString: { dateString: { $substr: ['$date', 0, 10] }, onError: '$createdAt' } }, '$createdAt'] } }
        }
      },
      {
        $group: {
          _id: '$month',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  let runningBalance = initialOpening;
  const filledData = monthNames.map((name, idx) => {
    const month = idx + 1;
    const inv = monthlyInvoices.find(m => m._id === month) || { totalAmount: 0, paidAmount: 0, count: 0 };
    const pmt = unallocatedPayments.find(m => m._id === month) || { total: 0 };
    
    const opening = runningBalance;
    const monthTotal = inv.totalAmount;
    const monthPaid = inv.paidAmount + pmt.total;
    const closing = opening + monthTotal - monthPaid;
    
    runningBalance = closing;

    return {
      month,
      monthName: name,
      opening: Math.round(opening),
      total: Math.round(monthTotal),
      paid: Math.round(monthPaid),
      due: Math.round(closing), // Closing balance
      count: inv.count + (pmt.count || 0)
    };
  });

  return NextResponse.json({
    metric,
    year,
    breakdown: 'monthly',
    data: filledData
  });
}

// Helper function to get transaction breakdown for a specific month
async function getTransactionBreakdown(metric: string, year: number, month: number, companyId: string) {
  const companyFilter = { companyId };

  let matchQuery: any = { ...companyFilter };

  if (metric === 'profit') {
    matchQuery.type = { $in: ['SALES', 'PURCHASE'] };
  } else {
    const invoiceType = metric === 'sales' || metric === 'receivable' ? 'SALES' : 'PURCHASE';
    matchQuery.type = invoiceType;
  }

  const paymentType = metric === 'sales' || metric === 'receivable' ? 'receive' : 'pay';

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const [transactions, advances] = await Promise.all([
    Invoice.find({
      ...matchQuery,
      $or: [
        { date: { $gte: startStr, $lt: endStr } },
        { createdAt: { $gte: startDate, $lt: endDate } }
      ]
    }).sort({ date: -1, createdAt: -1 }).lean(),
    Payment.find({
      $and: [
        { type: paymentType, ...companyFilter },
        {
          $or: [
            { date: { $gte: startStr, $lt: endStr } },
            { createdAt: { $gte: startDate, $lt: endDate } }
          ]
        },
        { $or: [{ allocations: { $exists: false } }, { allocations: { $size: 0 } }] }
      ]
    }).lean()
  ]);

  // Group by party for summary
  const partyWise: Record<string, { partyName: string; total: number; due: number; count: number }> = {};

  transactions.forEach((inv: any) => {
    const partyId = inv.partyId || 'unknown';
    const partyName = inv.partyName || inv.billingAddress?.name || 'Unknown Party';

    if (!partyWise[partyId]) {
      partyWise[partyId] = { partyName, total: 0, due: 0, count: 0 };
    }

    const amount = Number(inv.grandTotal || 0);
    const isExpense = inv.type === 'PURCHASE';

    if (metric === 'profit') {
      partyWise[partyId].total += isExpense ? -amount : amount;
    } else {
      partyWise[partyId].total += amount;
    }

    partyWise[partyId].due += Number(inv.dueAmount || 0);
    partyWise[partyId].count += 1;
  });

  // Include advances in party-wise and totals
  advances.forEach((adv: any) => {
    const partyId = adv.partyId || 'unknown';
    const partyName = adv.partyName || 'Unknown Party';

    if (!partyWise[partyId]) {
      partyWise[partyId] = { partyName, total: 0, due: 0, count: 0 };
    }

    const amount = Number(adv.amount || 0);
    // Advances reduce due
    partyWise[partyId].due -= amount;
    partyWise[partyId].count += 1;
  });

  let totalAmount = 0;
  if (metric === 'profit') {
    totalAmount = transactions.reduce((sum: number, inv: any) => {
      const amt = Number(inv.grandTotal || 0);
      return sum + (inv.type === 'PURCHASE' ? -amt : amt);
    }, 0);
  } else {
    totalAmount = transactions.reduce((sum: number, inv: any) => sum + Number(inv.grandTotal || 0), 0);
  }

  const totalDue = transactions.reduce((sum: number, inv: any) => sum + Number(inv.dueAmount || 0), 0) - 
                   advances.reduce((sum: number, adv: any) => sum + Number(adv.amount || 0), 0);

  // Map both to display list
  const displayTransactions = [
    ...transactions.map((inv: any) => ({
      id: inv._id?.toString(),
      invoiceNo: inv.invoice_no || inv.invoiceNo,
      date: inv.date,
      partyName: inv.partyName || inv.billingAddress?.name,
      amount: Math.round(Number(inv.grandTotal || 0)),
      type: inv.type,
      due: Math.round(Number(inv.dueAmount || 0)),
      paid: Math.round(Number(inv.paidAmount || 0))
    })),
    ...advances.map((adv: any) => ({
      id: adv._id?.toString(),
      invoiceNo: adv.voucherNo || `ADV-${adv._id?.toString().slice(-4)}`,
      date: adv.date ? (typeof adv.date === 'string' ? adv.date.split('T')[0] : new Date(adv.date).toISOString().split('T')[0]) : null,
      partyName: adv.partyName,
      amount: Math.round(Number(adv.amount || 0)),
      type: 'ADVANCE',
      due: -Math.round(Number(adv.amount || 0)),
      paid: Math.round(Number(adv.amount || 0))
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    metric,
    year,
    month,
    breakdown: 'transactions',
    summary: {
      totalTransactions: transactions.length + advances.length,
      totalAmount: Math.round(totalAmount),
      totalDue: Math.round(totalDue)
    },
    partyWise: Object.entries(partyWise).map(([partyId, data]) => ({
      partyId,
      ...data,
      total: Math.round(data.total),
      due: Math.round(data.due)
    })).sort((a, b) => b.total - a.total),
    transactions: displayTransactions
  });
}

// Simple ledger for a specific date range
async function getLedgerForRange(partyId: string, from: string | null, to: string | null, companyId: string) {
  const party = await Party.findOne({ _id: partyId, ...companyIdFilter(companyId) });
  if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 });

  // Default to current month if dates are missing
  const now = new Date();
  const defFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defTo = now.toISOString().split('T')[0];
  const startDate = from || defFrom;
  const endDate = to || defTo;

  // 1. Calculate Opening Balance before startDate
  const opAgg = await LedgerEntry.aggregate([
    { $match: { partyId: partyId, date: { $lt: startDate }, ...companyIdFilter(companyId) } },
    { $group: { _id: null, debit: { $sum: '$debit' }, credit: { $sum: '$credit' } } }
  ]);
  const op = opAgg[0] || { debit: 0, credit: 0 };
  const isCustomer = party.type === 'Customer';
  const openingBalance = isCustomer ? (op.debit - op.credit) : (op.credit - op.debit);

  // 2. Fetch transactions in range
  const transactions = await LedgerEntry.find({
    partyId: partyId,
    date: { $gte: startDate, $lte: endDate },
    ...companyIdFilter(companyId)
  }).sort({ date: 1, createdAt: 1 }).lean();

  // 3. Format rows
  let runningBalance = openingBalance;
  const rows = transactions.map((t: any) => {
    const amt = isCustomer ? (t.debit - t.credit) : (t.credit - t.debit);
    runningBalance += amt;
    return {
      id: t._id.toString(),
      date: t.date,
      invoiceNo: t.description || 'Ref: ' + (t.voucherNo || t.id),
      partyName: party.name,
      type: t.referenceType || (t.debit > 0 ? 'Debit' : 'Credit'),
      amount: t.debit > 0 ? t.debit : t.credit, // For simple list
      debit: t.debit, // "Di hui rakam"
      credit: t.credit, // "Mili hui rakam"
      paid: t.credit, // For compatibility
      due: runningBalance,
      balance: runningBalance
    };
  });

  const totalDebit = transactions.reduce((s, t: any) => s + (t.debit || 0), 0);
  const totalCredit = transactions.reduce((s, t: any) => s + (t.credit || 0), 0);

  return NextResponse.json({
    partyId: partyId,
    partyName: party.name,
    metric: 'ledger',
    summary: {
      openingBalance,
      totalDebit, // Di hui rakam
      totalCredit, // Mili hui rakam
      closingBalance: runningBalance,
      totalTransactions: transactions.length
    },
    transactions: rows
  });
}
