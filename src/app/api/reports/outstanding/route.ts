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
      const partyInvoices = invoices.filter(i => (i.partyId || '').toString() === partyId);
      const billed = partyInvoices
        .filter(i => ((p.type || '').toString().toLowerCase() === 'customer' ? i.type === 'SALES' : i.type === 'PURCHASE'))
        .reduce((s, i) => s + (i.grandTotal || 0), 0);

      // Sum payments for this party, but consider payment.type to distinguish receive vs pay
      const totalReceived = payments
        .filter((pay: any) => (pay.partyId || '').toString() === partyId && (pay.type === 'receive' || pay.type === 'pay'))
        .reduce((s: number, pay: any) => s + (pay.amount || 0), 0);

      // Current balance: opening + outstanding invoices (dueAmount)
      const outstandingFromInvoices = partyInvoices.reduce((s, i) => s + (i.dueAmount != null ? i.dueAmount : Math.max(0, (i.grandTotal || 0) - (i.paidAmount || 0))), 0);
      let currentBalance = (p.openingBalance || 0) + outstandingFromInvoices;

      // Keep the older-style fields for compatibility
      return { ...p, billed, totalReceived, currentBalance };
    });

    return NextResponse.json(report);
  } catch (err: any) {
    console.error('GET /api/reports/outstanding error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
