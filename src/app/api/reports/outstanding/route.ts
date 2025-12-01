import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Invoice from '../../../../lib/models/Invoice';
import Party from '../../../../lib/models/Party';

export async function GET() {
  try {
    await dbConnect();
    const parties = await Party.find({}).lean();
    const invoices = await Invoice.find({}).lean();

    const report = parties.map(p => {
      const totalCreditSales = invoices.filter(i => i.partyId === (p._id || p.id) && i.type === 'SALES' && i.paymentMode === 'credit')
        .reduce((s, i) => s + (i.grandTotal || 0), 0);
      // No payments collection yet - assume 0
      const totalReceived = 0;
      const currentBalance = (p.openingBalance || 0) + totalCreditSales - totalReceived;
      return { ...p, totalCreditSales, totalReceived, currentBalance };
    });

    return NextResponse.json(report);
  } catch (err: any) {
    console.error('GET /api/reports/outstanding error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
