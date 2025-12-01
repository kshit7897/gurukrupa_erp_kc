import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Invoice from '../../../lib/models/Invoice';
import Payment from '../../../lib/models/Payment';
import Item from '../../../lib/models/Item';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await dbConnect();

    // Totals
    const totalSales = await Invoice.aggregate([
      { $match: { type: 'SALES' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const totalPurchase = await Invoice.aggregate([
      { $match: { type: 'PURCHASE' } },
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

    // Low stock count
    const lowStock = await Item.countDocuments({ stock: { $lt: 10 } });

    // Recent transactions (fetch more for sparkline computation client-side)
    const recentInvoices = await Invoice.find({}).sort({ createdAt: -1 }).limit(20).lean();
    const recentPayments = await Payment.find({}).sort({ createdAt: -1 }).limit(20).lean();

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
    const combined = [...mappedInvoices, ...mappedPayments].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentTransactions = combined.slice(0, 5);

    // Payables: due amounts for PURCHASE invoices
    const payablesAgg = await Invoice.aggregate([
      { $match: { type: 'PURCHASE' } },
      { $group: { _id: null, payable: { $sum: { $ifNull: ['$dueAmount', 0] } } } }
    ]);

    // Cash In / Cash Out from payments — use payment.type to determine direction
    // receive => cash in, pay => cash out
    const cashAgg = await Payment.aggregate([
      { $group: { _id: '$type', total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);

    let cashIn = 0, cashOut = 0;
    (cashAgg || []).forEach((c: any) => {
      if ((c._id || '').toString() === 'receive') cashIn = c.total || 0;
      if ((c._id || '').toString() === 'pay') cashOut = c.total || 0;
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

    const roundUp = (v: any) => Math.ceil(Number(v || 0));
    return NextResponse.json({
      totalSales: roundUp(totalSales[0]?.total),
      totalPurchase: roundUp(totalPurchase[0]?.total),
      // adjust outstanding/receivables/payables to account for unallocated advances
      outstanding: roundUp(Math.max(0, (outstandingAgg[0]?.totalDue || 0) - unallocatedReceipts + unallocatedPayments)),
      receivables: roundUp(Math.max(0, (receivablesAgg[0]?.receivable || 0) - unallocatedReceipts)),
      payables: roundUp(Math.max(0, (payablesAgg[0]?.payable || 0) - unallocatedPayments)),
      cashIn: roundUp(cashIn),
      cashOut: roundUp(cashOut),
      lowStock: Number(lowStock || 0),
      recentInvoices,
      recentPayments
    });
  } catch (err: any) {
    console.error('GET /api/dashboard error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to compute dashboard' }, { status: 500 });
  }
}

