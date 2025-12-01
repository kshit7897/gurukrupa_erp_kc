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

    // Payables: due amounts for PURCHASE invoices
    const payablesAgg = await Invoice.aggregate([
      { $match: { type: 'PURCHASE' } },
      { $group: { _id: null, payable: { $sum: { $ifNull: ['$dueAmount', 0] } } } }
    ]);

    // Cash In / Cash Out from payments, aggregated by party.type (Customer => cash in, Supplier => cash out)
    const cashAgg = await Payment.aggregate([
      { $lookup: {
          from: 'parties',
          let: { pid: '$partyId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', { $toObjectId: '$$pid' }] } } },
            { $project: { type: 1 } }
          ],
          as: 'party'
      }},
      { $unwind: { path: '$party', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$party.type', total: { $sum: { $ifNull: ['$amount', 0] } } } }
    ]);

    let cashIn = 0, cashOut = 0;
    (cashAgg || []).forEach((c: any) => {
      if (c._id === 'Customer') cashIn = c.total || 0;
      if (c._id === 'Supplier') cashOut = c.total || 0;
    });

    return NextResponse.json({
      totalSales: totalSales[0]?.total || 0,
      totalPurchase: totalPurchase[0]?.total || 0,
      outstanding: outstandingAgg[0]?.totalDue || 0,
      receivables: receivablesAgg[0]?.receivable || 0,
      payables: payablesAgg[0]?.payable || 0,
      cashIn,
      cashOut,
      lowStock,
      recentInvoices,
      recentPayments
    });
  } catch (err: any) {
    console.error('GET /api/dashboard error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to compute dashboard' }, { status: 500 });
  }
}

