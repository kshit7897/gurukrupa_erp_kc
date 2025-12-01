import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Invoice from '../../../../lib/models/Invoice';
import Party from '../../../../lib/models/Party';
import Payment from '../../../../lib/models/Payment';

export async function GET() {
  try {
    await dbConnect();
    const parties = await Party.find({}).lean();
    const invoices = await Invoice.find({}).lean();
    const payments = await Payment.find({}).lean();

    const report = parties.map(p => {
      const partyId = (p._id || p.id).toString();

      // For customers we consider SALES invoices, for suppliers PURCHASE invoices
      const billed = invoices
        .filter(i => (i.partyId || '').toString() === partyId && ((p.type || '').toString().toLowerCase() === 'customer' ? i.type === 'SALES' : i.type === 'PURCHASE'))
        .reduce((s, i) => s + (i.grandTotal || 0), 0);

      const totalReceived = payments
        .filter((pay: any) => (pay.partyId || '').toString() === partyId)
        .reduce((s: number, pay: any) => s + (pay.amount || 0), 0);

      // For customers: opening + billed - received
      // For suppliers: opening + received - billed (because we owe them)
      let currentBalance = (p.openingBalance || 0);
      if ((p.type || '').toString().toLowerCase() === 'customer') {
        currentBalance = currentBalance + billed - totalReceived;
      } else {
        currentBalance = currentBalance + totalReceived - billed;
      }

      return { ...p, billed, totalReceived, currentBalance };
    });

    return NextResponse.json(report);
  } catch (err: any) {
    console.error('GET /api/reports/outstanding error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
