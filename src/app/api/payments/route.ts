import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Payment from '../../../lib/models/Payment';
import Invoice from '../../../lib/models/Invoice';
import mongoose from 'mongoose';

async function findInvoiceFlexible(id: string, session?: mongoose.ClientSession | null) {
  if (!id) return null;
  const opts = session ? { session } : undefined;
  if (mongoose.Types.ObjectId.isValid(id)) {
    const inv = await Invoice.findById(id, null, opts);
    if (inv) return inv;
  }
  return Invoice.findOne({ $or: [{ invoiceNo: id }, { invoice_no: id }] }, null, opts);
}

// GET: list payments, optional query param `party` to filter by partyId
export async function GET(request: Request) {
  try {
    await dbConnect();
      const { searchParams } = new URL(request.url);
      const partyId = searchParams.get('party');
      const id = searchParams.get('id');

      // if `id` query param provided, return that single payment (by _id, id or voucherNo)
      if (id) {
        let payment: any = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
          payment = await Payment.findById(id).lean();
        }
        if (!payment) {
          payment = await Payment.findOne({ $or: [{ id: id }, { voucherNo: id }, { _id: id }] }).lean();
        }
        if (!payment) return NextResponse.json(null);
        return NextResponse.json({ ...(payment as any), id: (payment as any)._id?.toString() });
      }

      const q: any = {};
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
    const body = await request.json();
    if (!body || !body.partyId || typeof body.amount !== 'number' || !body.type) {
      return NextResponse.json({ error: 'partyId, type and numeric amount required' }, { status: 400 });
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
        const inv = await findInvoiceFlexible(id);
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
    const inv = await findInvoiceFlexible(a.invoiceId);
      if (!inv) return NextResponse.json({ error: `Invoice not found: ${a.invoiceId}` }, { status: 400 });
      const due = Math.max(0, (inv.dueAmount || ((inv.grandTotal || 0) - (inv.paidAmount || 0))));
      if (a.amount > due) return NextResponse.json({ error: `Allocation ${a.amount} exceeds due ${due} for invoice ${inv._id}` }, { status: 400 });
    }

    // Persist payment and apply allocations inside a DB transaction for atomicity
    const session = await mongoose.startSession();
    let payment: any = null;
    try {
      await session.withTransaction(async () => {
        // Generate simple voucher number based on type and timestamp
        const prefix = body.type === 'receive' ? 'RCV' : 'PAY';
        const timestamp = Date.now().toString().slice(-8);
        const voucherNo = `${prefix}-${timestamp}`;
        
        payment = await Payment.create([{
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
          created_by: body.created_by || null
        }], { session });

        // Payment.create with array returns array
        payment = (Array.isArray(payment) ? payment[0] : payment) as any;

        // Apply allocations to invoices within the same session
        if (allocations.length > 0) {
          for (const a of allocations) {
            const invoice = await findInvoiceFlexible(a.invoiceId, session);
            if (!invoice) continue;
            invoice.paidAmount = (invoice.paidAmount || 0) + Number(a.amount || 0);
            invoice.dueAmount = Math.max(0, (invoice.grandTotal || 0) - invoice.paidAmount);
            await invoice.save({ session });
          }
        }
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
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'payment id required' }, { status: 400 });

    const session = await mongoose.startSession();
    let deletedCount = 0;
    try {
      await session.withTransaction(async () => {
        const payment = await Payment.findById(id).session(session);
        if (!payment) return;

        // revert allocations: for each allocation, reduce invoice.paidAmount and recompute dueAmount
        if (Array.isArray(payment.allocations) && payment.allocations.length > 0) {
          for (const a of payment.allocations) {
            const inv = await findInvoiceFlexible(a.invoiceId, session);
            if (!inv) continue;
            inv.paidAmount = Math.max(0, (inv.paidAmount || 0) - Number(a.amount || 0));
            inv.dueAmount = Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0));
            await inv.save({ session });
          }
        }

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
