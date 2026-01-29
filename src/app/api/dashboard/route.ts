import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Invoice from '../../../lib/models/Invoice';
import Payment from '../../../lib/models/Payment';
import Item from '../../../lib/models/Item';
import OtherTxn from '../../../lib/models/OtherTxn';
import { getCompanyContextFromRequest } from '../../../lib/companyContext';
import mongoose from 'mongoose';

// Always serve fresh metrics; dashboard must not be cached
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    // Strict company scope filter
    const companyFilter = { companyId };
    
    const url = new URL(request.url);
    const drilldown = url.searchParams.get('drilldown'); // 'year', 'month', or 'transactions'
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    const metric = url.searchParams.get('metric'); // 'sales', 'purchase', 'receivable', 'payable'
    
    // If drilldown is requested, return specific data
    if (drilldown === 'year' && metric) {
      return await getYearlyBreakdown(metric, companyId);
    }
    if (drilldown === 'month' && year && metric) {
      return await getMonthlyBreakdown(metric, parseInt(year), companyId);
    }
    if (drilldown === 'transactions' && year && month && metric) {
      return await getTransactionBreakdown(metric, parseInt(year), parseInt(month), companyId);
    }

    // Totals (all-time) - with company scope
    const totalSales = await Invoice.aggregate([
      { $match: { type: 'SALES', ...companyFilter } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const totalPurchase = await Invoice.aggregate([
      { $match: { type: 'PURCHASE', ...companyFilter } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);

    // Month-to-date totals
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const monthSalesAgg = await Invoice.aggregate([
      { $match: { type: 'SALES', ...companyFilter, $or: [ { date: { $gte: monthStart, $lt: nextMonthStart } }, { createdAt: { $gte: monthStart, $lt: nextMonthStart } } ] } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const monthPurchaseAgg = await Invoice.aggregate([
      { $match: { type: 'PURCHASE', ...companyFilter, $or: [ { date: { $gte: monthStart, $lt: nextMonthStart } }, { createdAt: { $gte: monthStart, $lt: nextMonthStart } } ] } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);

    // Outstanding (sum of dueAmount for all invoices) - with company scope
    const outstandingAgg = await Invoice.aggregate([
      { $match: companyFilter },
      { $group: { _id: null, totalDue: { $sum: { $ifNull: ['$dueAmount', 0] } } } }
    ]);

    // Receivables: due amounts only for sales (customers) - with company scope
    const receivablesAgg = await Invoice.aggregate([
      { $match: { type: 'SALES', ...companyFilter } },
      { $group: { _id: null, receivable: { $sum: { $ifNull: ['$dueAmount', 0] } } } }
    ]);

    // Month receivables (sales with dueAmount within month) - with company scope
    const monthReceivablesAgg = await Invoice.aggregate([
      { $match: { type: 'SALES', ...companyFilter, $or: [ { date: { $gte: monthStart, $lt: nextMonthStart } }, { createdAt: { $gte: monthStart, $lt: nextMonthStart } } ] } },
      { $group: { _id: null, receivable: { $sum: { $ifNull: ['$dueAmount', 0] } } } }
    ]);

    // Low stock count - with company scope
    const lowStock = await Item.countDocuments({ stock: { $lt: 10 }, ...companyFilter });
    // Current stock snapshot: top items by stock (positive stock), limit 4 - with company scope
    const currentStockItems = await Item.find({ stock: { $exists: true }, ...companyFilter }).sort({ stock: -1 }).limit(4).select({ name: 1, stock: 1, sku: 1, unit: 1 }).lean();

    // Recent transactions (fetch more for sparkline computation client-side) - with company scope
    const recentInvoices = await Invoice.find(companyFilter).sort({ createdAt: -1 }).limit(20).lean();
    const recentPayments = await Payment.find(companyFilter).sort({ createdAt: -1 }).limit(20).lean();
    const recentOther = await OtherTxn.find(companyFilter).sort({ createdAt: -1 }).limit(20).lean();

    // Combine invoices and payments into a unified recent transactions list (sorted by createdAt desc)
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

    // Payables: due amounts for PURCHASE invoices - with company scope
    const payablesAgg = await Invoice.aggregate([
      { $match: { type: 'PURCHASE', ...companyFilter } },
      { $group: { _id: null, payable: { $sum: { $ifNull: ['$dueAmount', 0] } } } }
    ]);

    // Cash In / Cash Out include payments and other income/expense entries - with company scope
    const cashAgg = await Payment.aggregate([
      { $match: companyFilter },
      { $group: { _id: '$type', total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);
    const otherAgg = await OtherTxn.aggregate([
      { $match: companyFilter },
      { $group: { _id: '$kind', total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);

    let cashIn = 0, cashOut = 0;
    (cashAgg || []).forEach((c: any) => {
      if ((c._id || '').toString() === 'receive') cashIn += c.total || 0;
      if ((c._id || '').toString() === 'pay') cashOut += c.total || 0;
    });
    (otherAgg || []).forEach((o: any) => {
      if ((o._id || '').toString() === 'income') cashIn += o.total || 0;
      if ((o._id || '').toString() === 'expense') cashOut += o.total || 0;
    });

    // Unallocated payments (advances) — these are payments without allocations - with company scope
    const unallocReceiptsAgg = await Payment.aggregate([
      { $match: { type: 'receive', ...companyFilter, $or: [ { allocations: { $exists: false } }, { allocations: { $size: 0 } } ] } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);
    const unallocPaymentsAgg = await Payment.aggregate([
      { $match: { type: 'pay', ...companyFilter, $or: [ { allocations: { $exists: false } }, { allocations: { $size: 0 } } ] } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);
    const unallocatedReceipts = unallocReceiptsAgg[0]?.total || 0;
    const unallocatedPayments = unallocPaymentsAgg[0]?.total || 0;

    // Unallocated payments within the current month (so monthReceivables/payables can be adjusted) - with company scope
    const monthUnallocReceiptsAgg = await Payment.aggregate([
      { $match: { $and: [ { type: 'receive' }, companyFilter, { $or: [ { allocations: { $exists: false } }, { allocations: { $size: 0 } } ] }, { $or: [ { date: { $gte: monthStart, $lt: nextMonthStart } }, { createdAt: { $gte: monthStart, $lt: nextMonthStart } } ] } ] } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);
    const monthUnallocPaymentsAgg = await Payment.aggregate([
      { $match: { $and: [ { type: 'pay' }, companyFilter, { $or: [ { allocations: { $exists: false } }, { allocations: { $size: 0 } } ] }, { $or: [ { date: { $gte: monthStart, $lt: nextMonthStart } }, { createdAt: { $gte: monthStart, $lt: nextMonthStart } } ] } ] } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);
    const monthUnallocatedReceipts = monthUnallocReceiptsAgg[0]?.total || 0;
    const monthUnallocatedPayments = monthUnallocPaymentsAgg[0]?.total || 0;

    const roundUp = (v: any) => Math.ceil(Number(v || 0));
    return NextResponse.json({
      totalSales: roundUp(totalSales[0]?.total),
      totalPurchase: roundUp(totalPurchase[0]?.total),
      // month-to-date values
      monthSales: roundUp(monthSalesAgg[0]?.total || 0),
      monthPurchase: roundUp(monthPurchaseAgg[0]?.total || 0),
      monthReceivables: roundUp(Math.max(0, (monthReceivablesAgg[0]?.receivable || 0) - monthUnallocatedReceipts)),
      // adjust outstanding/receivables/payables to account for unallocated advances
      outstanding: roundUp(Math.max(0, (outstandingAgg[0]?.totalDue || 0) - unallocatedReceipts + unallocatedPayments)),
      receivables: roundUp(Math.max(0, (receivablesAgg[0]?.receivable || 0) - unallocatedReceipts)),
      payables: roundUp(Math.max(0, (payablesAgg[0]?.payable || 0) - unallocatedPayments)),
      cashIn: roundUp(cashIn),
      cashOut: roundUp(cashOut),
      lowStock: Number(lowStock || 0),
      currentStock: (currentStockItems || []).map((it:any) => ({ id: it._id?.toString(), name: it.name || it.title || 'Unnamed', sku: it.sku || null, stock: Number(it.stock || 0), unit: it.unit || null })),
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
  const invoiceType = metric === 'sales' || metric === 'receivable' ? 'SALES' : 'PURCHASE';
  const companyFilter = { $or: [{ companyId }, { companyId: { $exists: false } }] };
  
  // Get all years with data
  const yearlyData = await Invoice.aggregate([
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
    { $sort: { _id: -1 } }
  ]);
  
  return NextResponse.json({
    metric,
    breakdown: 'yearly',
    data: yearlyData.map(y => ({
      year: y._id,
      total: Math.round(y.totalAmount || 0),
      due: Math.round(y.dueAmount || 0),
      paid: Math.round(y.paidAmount || 0),
      count: y.count
    }))
  });
}

// Helper function to get monthly breakdown for a year
async function getMonthlyBreakdown(metric: string, year: number, companyId: string) {
  const invoiceType = metric === 'sales' || metric === 'receivable' ? 'SALES' : 'PURCHASE';
  const companyFilter = { $or: [{ companyId }, { companyId: { $exists: false } }] };
  
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);
  
  const monthlyData = await Invoice.aggregate([
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
        month: { 
          $month: { 
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
        _id: '$month',
        totalAmount: { $sum: '$grandTotal' },
        dueAmount: { $sum: { $ifNull: ['$dueAmount', 0] } },
        paidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  // Fill in missing months with zero values
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const filledData = monthNames.map((name, idx) => {
    const monthData = monthlyData.find(m => m._id === idx + 1);
    return {
      month: idx + 1,
      monthName: name,
      total: Math.round(monthData?.totalAmount || 0),
      due: Math.round(monthData?.dueAmount || 0),
      paid: Math.round(monthData?.paidAmount || 0),
      count: monthData?.count || 0
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
  const invoiceType = metric === 'sales' || metric === 'receivable' ? 'SALES' : 'PURCHASE';
  const companyFilter = { $or: [{ companyId }, { companyId: { $exists: false } }] };
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  const transactions = await Invoice.find({
    type: invoiceType,
    ...companyFilter,
    $or: [
      { date: { $gte: startStr, $lt: endStr } },
      { createdAt: { $gte: startDate, $lt: endDate } }
    ]
  })
  .sort({ date: -1, createdAt: -1 })
  .lean();
  
  // Group by party for summary
  const partyWise: Record<string, { partyName: string; total: number; due: number; count: number }> = {};
  
  transactions.forEach((inv: any) => {
    const partyId = inv.partyId || 'unknown';
    const partyName = inv.partyName || inv.billingAddress?.name || 'Unknown Party';
    
    if (!partyWise[partyId]) {
      partyWise[partyId] = { partyName, total: 0, due: 0, count: 0 };
    }
    partyWise[partyId].total += Number(inv.grandTotal || 0);
    partyWise[partyId].due += Number(inv.dueAmount || 0);
    partyWise[partyId].count += 1;
  });
  
  return NextResponse.json({
    metric,
    year,
    month,
    breakdown: 'transactions',
    summary: {
      totalTransactions: transactions.length,
      totalAmount: Math.round(transactions.reduce((sum: number, inv: any) => sum + Number(inv.grandTotal || 0), 0)),
      totalDue: Math.round(transactions.reduce((sum: number, inv: any) => sum + Number(inv.dueAmount || 0), 0))
    },
    partyWise: Object.entries(partyWise).map(([partyId, data]) => ({
      partyId,
      ...data,
      total: Math.round(data.total),
      due: Math.round(data.due)
    })).sort((a, b) => b.total - a.total),
    transactions: transactions.map((inv: any) => ({
      id: inv._id?.toString(),
      invoiceNo: inv.invoice_no || inv.invoiceNo,
      date: inv.date,
      partyName: inv.partyName || inv.billingAddress?.name,
      amount: Math.round(Number(inv.grandTotal || 0)),
      due: Math.round(Number(inv.dueAmount || 0)),
      paid: Math.round(Number(inv.paidAmount || 0))
    }))
  });
}
