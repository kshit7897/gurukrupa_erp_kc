import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Invoice from '../../../../lib/models/Invoice';
import Party from '../../../../lib/models/Party';
import Payment from '../../../../lib/models/Payment';
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
    const invoices = await Invoice.find({ companyId }).lean();
    const payments = await Payment.find({ companyId }).lean();

    const report = parties.map(p => {
      const partyId = (p._id || p.id).toString();

      // For customers we consider SALES invoices, for suppliers PURCHASE invoices
      const partyInvoices = invoices.filter(i => (i.partyId || '').toString() === partyId);
      const billed = partyInvoices
        .filter(i => ((p.type || '').toString().toLowerCase() === 'customer' ? i.type === 'SALES' : i.type === 'PURCHASE'))
        .reduce((s, i) => s + (i.grandTotal || 0), 0);

      // Sum payments for this party (all payments)
      const totalReceived = payments
        .filter((pay: any) => (pay.partyId || '').toString() === partyId && (pay.type === 'receive' || pay.type === 'pay'))
        .reduce((s: number, pay: any) => s + (pay.amount || 0), 0);

      // Outstanding from invoices (uses invoice.dueAmount when available)
      const outstandingFromInvoices = partyInvoices.reduce((s, i) => s + (i.dueAmount != null ? i.dueAmount : Math.max(0, (i.grandTotal || 0) - (i.paidAmount || 0))), 0);

      // Compute unallocated payments for this party (advances)
      const partyUnallocatedReceipts = payments
        .filter((pay: any) => (pay.partyId || '').toString() === partyId && pay.type === 'receive' && (!pay.allocations || (Array.isArray(pay.allocations) && pay.allocations.length === 0)))
        .reduce((s: number, pay: any) => s + (pay.amount || 0), 0);
      const partyUnallocatedPayments = payments
        .filter((pay: any) => (pay.partyId || '').toString() === partyId && pay.type === 'pay' && (!pay.allocations || (Array.isArray(pay.allocations) && pay.allocations.length === 0)))
        .reduce((s: number, pay: any) => s + (pay.amount || 0), 0);

      // Current balance mirrors dashboard logic: opening + outstanding invoices
      // then adjust for this party's unallocated advances/payments.
      // For customers, unallocated receipts reduce what they owe. For suppliers, unallocated payments
      // (money we've already paid) should reduce what we owe to them — so subtract accordingly.
      let currentBalance = (p.openingBalance || 0) + outstandingFromInvoices;
      const pType = (p.type || '').toString().toLowerCase();
      if (pType === 'customer') {
        currentBalance = currentBalance - (partyUnallocatedReceipts || 0);
      } else if (pType === 'supplier') {
        currentBalance = currentBalance - (partyUnallocatedPayments || 0);
      }

      // Keep the older-style fields for compatibility
      return { ...p, billed, totalReceived, currentBalance };
    });

    return NextResponse.json(report);
  } catch (err: any) {
    console.error('GET /api/reports/outstanding error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
