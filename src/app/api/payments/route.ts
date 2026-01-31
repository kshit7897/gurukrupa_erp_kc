import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Payment from '../../../lib/models/Payment';
import Invoice from '../../../lib/models/Invoice';
import LedgerEntry from '../../../lib/models/LedgerEntry';
import { generateVoucherNumber } from '../../../lib/invoiceNumber';
import { getCompanyContextFromRequest } from '../../../lib/companyContext';
import mongoose from 'mongoose';

async function findInvoiceFlexible(id: string, companyId?: string, session?: mongoose.ClientSession | null) {
  if (!id) return null;
  const opts = session ? { session } : undefined;
  const companyFilter = companyId ? { companyId } : {};
  
  if (mongoose.Types.ObjectId.isValid(id)) {
    const inv = await Invoice.findOne({ _id: id, ...companyFilter }, null, opts);
    if (inv) return inv;
  }
  return Invoice.findOne({ $or: [{ invoiceNo: id }, { invoice_no: id }], ...companyFilter }, null, opts);
}

// GET: list payments, optional query param `party` to filter by partyId
export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const partyId = searchParams.get('party');
    const id = searchParams.get('id');

    // Company scope filter
    const companyFilter = { companyId };

    // if `id` query param provided, return that single payment (by _id, id or voucherNo)
    if (id) {
      let payment: any = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        payment = await Payment.findOne({ _id: id, ...companyFilter }).lean();
      }
      if (!payment) {
        payment = await Payment.findOne({ $or: [{ id: id }, { voucherNo: id }, { _id: id as any }], ...companyFilter } as any).lean();
      }
      if (!payment) return NextResponse.json(null);
      return NextResponse.json({ ...(payment as any), id: (payment as any)._id?.toString() });
    }

    const q: any = { ...companyFilter };
    if (partyId) q.partyId = partyId;
    const payments = await Payment.find(q).sort({ createdAt: -1 }).lean();
    return NextResponse.json(payments.map(p => ({ ...(p as any), id: (p as any)._id?.toString() })));
  } catch (err: any) {
    console.error('GET /api/payments error', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch payments' }, { status: 500 });
  }
}

// POST: create a payment and update referenced invoice paid/due amounts
export async function POST(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const body = await request.json();
    if (!body || !body.partyId || typeof body.amount !== 'number' || !body.type) {
      return NextResponse.json({ error: 'partyId, type and numeric amount required' }, { status: 400 });
    }
    if (body.type === 'receive' && !body.receivedById) {
      return NextResponse.json({ error: 'receivedById required for receive payments' }, { status: 400 });
    }
    if (body.type === 'pay' && !body.paidFromId) {
      return NextResponse.json({ error: 'paidFromId required for payments' }, { status: 400 });
    }

    const allocations: Array<{ invoiceId: string; amount: number }> = [];
    let remaining = Number(body.amount || 0);

    // If explicit allocations provided, use them
    if (Array.isArray(body.allocations) && body.allocations.length > 0) {
      for (const a of body.allocations) {
        const amt = Number(a.amount || 0);
        if (amt <= 0) continue;
        allocations.push({ invoiceId: a.invoiceId, amount: amt });
        remaining -= amt;
      }
    } else if (Array.isArray(body.invoiceIds) && body.invoiceIds.length > 0) {
      // Allocate FIFO across provided invoiceIds
      for (const id of body.invoiceIds) {
        if (remaining <= 0) break;
        const inv = await findInvoiceFlexible(id, companyId);
        if (!inv) continue;
        const due = Math.max(0, (inv.dueAmount || ((inv.grandTotal || 0) - (inv.paidAmount || 0))));
        if (due <= 0) continue;
        const apply = Math.min(due, remaining);
        allocations.push({ invoiceId: id, amount: apply });
        remaining -= apply;
      }
    }

    // Validate allocations do not exceed provided amount (if any allocations present)
    const allocatedTotal = allocations.reduce((s, a) => s + (a.amount || 0), 0);
    if (allocatedTotal > Number(body.amount || 0)) {
      return NextResponse.json({ error: 'Allocations exceed payment amount' }, { status: 400 });
    }

    // Validate per-invoice allocation does not exceed current due (best-effort). Transaction will enforce final consistency.
    for (const a of allocations) {
      const inv = await findInvoiceFlexible(a.invoiceId, companyId);
      if (!inv) return NextResponse.json({ error: `Invoice not found: ${a.invoiceId}` }, { status: 400 });
      const due = Math.max(0, (inv.dueAmount || ((inv.grandTotal || 0) - (inv.paidAmount || 0))));
      if (a.amount > due) return NextResponse.json({ error: `Allocation ${a.amount} exceeds due ${due} for invoice ${inv._id}` }, { status: 400 });
    }

    // Persist payment and apply allocations inside a DB transaction for atomicity
    const session = await mongoose.startSession();
    let payment: any = null;
    try {
      await session.withTransaction(async () => {
        // Generate proper voucher number using the standard format (company-scoped)
        let voucherNo: string;
        try {
          voucherNo = await generateVoucherNumber(body.type, body.date, companyId);
        } catch (e) {
          // Fallback to simple format
          const prefix = body.type === 'receive' ? 'RCV' : 'PAY';
          const timestamp = Date.now().toString().slice(-8);
          voucherNo = `${prefix}-${timestamp}`;
        }
        
        payment = await Payment.create([{
          companyId, // Add company scope
          voucherNo,
          partyId: body.partyId,
          partyName: body.partyName || '',
          type: body.type,
          invoiceIds: allocations.map(a => a.invoiceId),
          allocations,
          outstandingBefore: typeof body.outstandingBefore === 'number' ? body.outstandingBefore : undefined,
          outstandingAfter: typeof body.outstandingAfter === 'number' ? body.outstandingAfter : undefined,
          amount: body.amount,
          date: body.date || new Date().toISOString(),
          mode: body.mode || 'cash',
          reference: body.reference,
          notes: body.notes,
          created_by: body.created_by || null,
          receivedById: body.receivedById || null,
          receivedByName: body.receivedByName || null,
          receivedByType: body.receivedByType || null
        }], { session });

        // Payment.create with array returns array
        payment = (Array.isArray(payment) ? payment[0] : payment) as any;
        const paymentId = payment._id.toString();

        // Apply allocations to invoices within the same session
        if (allocations.length > 0) {
          for (const a of allocations) {
            const invoice = await findInvoiceFlexible(a.invoiceId, companyId, session);
            if (!invoice) continue;
            invoice.paidAmount = (invoice.paidAmount || 0) + Number(a.amount || 0);
            invoice.dueAmount = Math.max(0, (invoice.grandTotal || 0) - invoice.paidAmount);
            await invoice.save({ session });
          }
        }
        
        // Create ledger entries for the payment (double-entry for receipts)
        const isReceive = body.type === 'receive';
        const ledgerDate = body.date || new Date().toISOString().split('T')[0];

        const ledgerEntries: any[] = [];

        // 1) Party ledger (customer/supplier settlement)
        ledgerEntries.push({
          companyId, // Add company scope
          partyId: body.partyId,
          partyName: body.partyName || '',
          date: ledgerDate,
          entryType: isReceive ? 'RECEIPT' : 'PAYMENT',
          refType: 'PAYMENT',
          refId: paymentId,
          refNo: voucherNo,
          // Receive from customer: Credit (reduces receivable)
          // Pay to supplier: Debit (reduces payable)
          debit: isReceive ? 0 : Number(body.amount || 0),
          credit: isReceive ? Number(body.amount || 0) : 0,
          narration: `${isReceive ? 'Payment received' : 'Payment made'}: ${voucherNo}`,
          paymentMode: body.mode || 'cash'
        });

        // 2) Source/Target account ledger (cash/bank/UPI or partner)
        const accountId = isReceive ? body.receivedById : body.paidFromId;
        const accountName = isReceive ? body.receivedByName : body.paidFromName;
        
        if (accountId) {
          ledgerEntries.push({
            companyId,
            partyId: accountId,
            partyName: accountName || '',
            date: ledgerDate,
            entryType: isReceive ? 'RECEIPT' : 'PAYMENT',
            refType: 'PAYMENT',
            refId: paymentId,
            refNo: voucherNo,
            // Receive: Debit receiving account (asset increase)
            // Pay: Credit source account (asset decrease)
            debit: isReceive ? Number(body.amount || 0) : 0,
            credit: isReceive ? 0 : Number(body.amount || 0),
            narration: `${isReceive ? 'Amount received by' : 'Amount paid from'} ${accountName || accountId}: ${voucherNo}`,
            paymentMode: body.mode || 'cash'
          });
        }

        await LedgerEntry.create(ledgerEntries, { session, ordered: true });
      });
    } finally {
      session.endSession();
    }

    return NextResponse.json({ ...(payment as any).toObject(), id: (payment as any)._id.toString() });
  } catch (err: any) {
    console.error('POST /api/payments error', err);
    return NextResponse.json({ error: err?.message || 'Failed to create payment' }, { status: 500 });
  }
}

// DELETE: remove a payment and revert allocations
// NOTE: Ledger entries should NOT be deleted per accounting rules - create reversal entry instead
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'payment id required' }, { status: 400 });

    const session = await mongoose.startSession();
    let deletedCount = 0;
    try {
      await session.withTransaction(async () => {
        // Verify payment belongs to this company
        const payment = await Payment.findOne({ 
          _id: id, 
          companyId
        }).session(session);
        if (!payment) return;

        // revert allocations: for each allocation, reduce invoice.paidAmount and recompute dueAmount
        if (Array.isArray(payment.allocations) && payment.allocations.length > 0) {
          for (const a of payment.allocations) {
            const inv = await findInvoiceFlexible(a.invoiceId, companyId, session);
            if (!inv) continue;
            inv.paidAmount = Math.max(0, (inv.paidAmount || 0) - Number(a.amount || 0));
            inv.dueAmount = Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0));
            await inv.save({ session });
          }
        }

        // Create reversal ledger entry instead of deleting
        const isReceive = payment.type === 'receive';
        const reversalDate = new Date().toISOString().split('T')[0];

        const reversalEntries: any[] = [];

        // Reverse party ledger entry
        reversalEntries.push({
          companyId, // Add company scope
          partyId: payment.partyId,
          partyName: payment.partyName || '',
          date: reversalDate,
          entryType: 'REVERSAL',
          refType: 'PAYMENT',
          refId: id,
          refNo: `REV-${payment.voucherNo}`,
          // Reverse the original entry
          debit: isReceive ? Number(payment.amount || 0) : 0,
          credit: isReceive ? 0 : Number(payment.amount || 0),
          narration: `Reversal of ${payment.voucherNo}`,
          paymentMode: payment.mode || 'cash',
          reversedEntryId: id,
          isReversal: true
        });

        // Reverse receiving account ledger entry for receipts (if present)
        if (isReceive && payment.receivedById) {
          reversalEntries.push({
            companyId,
            partyId: payment.receivedById,
            partyName: payment.receivedByName || '',
            date: reversalDate,
            entryType: 'REVERSAL',
            refType: 'PAYMENT',
            refId: id,
            refNo: `REV-${payment.voucherNo}`,
            // Reverse original debit on receiving account
            debit: 0,
            credit: Number(payment.amount || 0),
            narration: `Reversal of receiving account for ${payment.voucherNo}`,
            paymentMode: payment.mode || 'cash',
            reversedEntryId: id,
            isReversal: true
          });
        }

        await LedgerEntry.create(reversalEntries, { session, ordered: true });

        const res = await Payment.deleteOne({ _id: id }).session(session);
        deletedCount = res.deletedCount || 0;
      });
    } finally {
      session.endSession();
    }

    if (!deletedCount) return NextResponse.json({ error: 'Payment not found or not deleted' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error('DELETE /api/payments error', err);
    return NextResponse.json({ error: err?.message || 'Failed to delete payment' }, { status: 500 });
  }
}
