import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Invoice from '../../../lib/models/Invoice';
import Payment from '../../../lib/models/Payment';
import Item from '../../../lib/models/Item';
import OtherTxn from '../../../lib/models/OtherTxn';
import mongoose from 'mongoose';

// Always serve fresh metrics; dashboard must not be cached
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();

    // Totals (all-time)
    const totalSales = await Invoice.aggregate([
      { $match: { type: 'SALES' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const totalPurchase = await Invoice.aggregate([
      { $match: { type: 'PURCHASE' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);

    // Month-to-date totals
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const monthSalesAgg = await Invoice.aggregate([
      { $match: { type: 'SALES', $or: [ { date: { $gte: monthStart, $lt: nextMonthStart } }, { createdAt: { $gte: monthStart, $lt: nextMonthStart } } ] } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const monthPurchaseAgg = await Invoice.aggregate([
      { $match: { type: 'PURCHASE', $or: [ { date: { $gte: monthStart, $lt: nextMonthStart } }, { createdAt: { $gte: monthStart, $lt: nextMonthStart } } ] } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);

    // Outstanding (sum of dueAmount for all invoices)
    const outstandingAgg = await Invoice.aggregate([
      { $group: { _id: null, totalDue: { $sum: { $ifNull: ['$dueAmount', 0] } } } }
    ]);

    // Receivables: due amounts only for sales (customers)
    const receivablesAgg = await Invoice.aggregate([
      { $match: { type: 'SALES' } },
      { $group: { _id: null, receivable: { $sum: { $ifNull: ['$dueAmount', 0] } } } }
    ]);

    // Month receivables (sales with dueAmount within month)
    const monthReceivablesAgg = await Invoice.aggregate([
      { $match: { type: 'SALES', $or: [ { date: { $gte: monthStart, $lt: nextMonthStart } }, { createdAt: { $gte: monthStart, $lt: nextMonthStart } } ] } },
      { $group: { _id: null, receivable: { $sum: { $ifNull: ['$dueAmount', 0] } } } }
    ]);

    // Low stock count
    const lowStock = await Item.countDocuments({ stock: { $lt: 10 } });
    // Current stock snapshot: top items by stock (positive stock), limit 4
    const currentStockItems = await Item.find({ stock: { $exists: true } }).sort({ stock: -1 }).limit(4).select({ name: 1, stock: 1, sku: 1 }).lean();

    // Recent transactions (fetch more for sparkline computation client-side)
    const recentInvoices = await Invoice.find({}).sort({ createdAt: -1 }).limit(20).lean();
    const recentPayments = await Payment.find({}).sort({ createdAt: -1 }).limit(20).lean();
    const recentOther = await OtherTxn.find({}).sort({ createdAt: -1 }).limit(20).lean();

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

    // Payables: due amounts for PURCHASE invoices
    const payablesAgg = await Invoice.aggregate([
      { $match: { type: 'PURCHASE' } },
      { $group: { _id: null, payable: { $sum: { $ifNull: ['$dueAmount', 0] } } } }
    ]);

    // Cash In / Cash Out include payments and other income/expense entries
    const cashAgg = await Payment.aggregate([
      { $group: { _id: '$type', total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);
    const otherAgg = await OtherTxn.aggregate([
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

    // Unallocated payments (advances) — these are payments without allocations
    const unallocReceiptsAgg = await Payment.aggregate([
      { $match: { type: 'receive', $or: [ { allocations: { $exists: false } }, { allocations: { $size: 0 } } ] } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);
    const unallocPaymentsAgg = await Payment.aggregate([
      { $match: { type: 'pay', $or: [ { allocations: { $exists: false } }, { allocations: { $size: 0 } } ] } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);
    const unallocatedReceipts = unallocReceiptsAgg[0]?.total || 0;
    const unallocatedPayments = unallocPaymentsAgg[0]?.total || 0;

    // Unallocated payments within the current month (so monthReceivables/payables can be adjusted)
    const monthUnallocReceiptsAgg = await Payment.aggregate([
      { $match: { $and: [ { type: 'receive' }, { $or: [ { allocations: { $exists: false } }, { allocations: { $size: 0 } } ] }, { $or: [ { date: { $gte: monthStart, $lt: nextMonthStart } }, { createdAt: { $gte: monthStart, $lt: nextMonthStart } } ] } ] } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);
    const monthUnallocPaymentsAgg = await Payment.aggregate([
      { $match: { $and: [ { type: 'pay' }, { $or: [ { allocations: { $exists: false } }, { allocations: { $size: 0 } } ] }, { $or: [ { date: { $gte: monthStart, $lt: nextMonthStart } }, { createdAt: { $gte: monthStart, $lt: nextMonthStart } } ] } ] } },
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
      currentStock: (currentStockItems || []).map((it:any) => ({ id: it._id?.toString(), name: it.name || it.title || 'Unnamed', sku: it.sku || null, stock: Number(it.stock || 0) })),
      recentInvoices,
      recentPayments,
      recentOtherTxns: recentOther
    });
  } catch (err: any) {
    console.error('GET /api/dashboard error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to compute dashboard' }, { status: 500 });
  }
}

