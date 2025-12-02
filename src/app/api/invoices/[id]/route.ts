import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Invoice from '../../../../lib/models/Invoice';
import mongoose from 'mongoose';
import { updateStockForInvoice, revertStockForInvoice } from '../../../../lib/stock';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  
  try {
    const params = await props.params;
    // validate id to avoid CastError when non-objectId segments (like 'list') are requested
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid Invoice ID' }, { status: 404 });
    }
    const invoice = await Invoice.findById(params.id);
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ...(invoice as any).toObject(), id: (invoice as any)._id.toString() });
  } catch (error) {
    console.error("Invoice API Error:", error);
    return NextResponse.json({ error: 'Invalid Invoice ID or Not Found' }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  try {
    const params = await props.params;
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid Invoice ID' }, { status: 404 });
    }
    const id = params.id;
    const existing = await Invoice.findById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const oldObj = { ...(existing as any).toObject(), id: (existing as any)._id.toString() };

    const body = await request.json();

    // Normalize payment amounts similar to POST
    const payload: any = { ...body };
    const grand = Number(payload.grandTotal || existing.grandTotal || 0);
    if (payload.paymentMode === 'cash') {
      payload.paidAmount = grand;
      payload.dueAmount = 0;
    } else if (payload.paymentMode) {
      payload.paidAmount = Number(payload.paidAmount || existing.paidAmount || 0);
      payload.dueAmount = Math.max(0, grand - (payload.paidAmount || 0));
    }

    // Ensure invoice_no/serial are preserved unless explicitly changed
    if (!payload.invoice_no && !payload.invoiceNo) {
      payload.invoice_no = existing.invoice_no || existing.invoiceNo;
    }

    // Step 1: revert stock effects of existing invoice
    const revertWarnings = await revertStockForInvoice(oldObj);
    if (Array.isArray(revertWarnings) && revertWarnings.length > 0) {
      console.error('Warnings while reverting stock before update:', revertWarnings);
      return NextResponse.json({ error: 'Failed to fully revert stock for existing invoice', warnings: revertWarnings }, { status: 400 });
    }

    // Step 2: update invoice document
    let updated: any;
    try {
      updated = await Invoice.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
      if (!updated) throw new Error('Failed to update invoice');
    } catch (err: any) {
      // Try to re-apply old stock to restore state
      try {
        await updateStockForInvoice(oldObj);
      } catch (reErr) {
        console.error('Failed to reapply old stock after update failure:', reErr);
      }
      console.error('Invoice update failed:', err);
      return NextResponse.json({ error: 'Failed to update invoice: ' + (err?.message || err) }, { status: 500 });
    }

    const updatedObj = { ...(updated as any).toObject(), id: (updated as any)._id.toString() };

    // Step 3: apply stock for updated invoice
    try {
      await updateStockForInvoice(updatedObj);
    } catch (err: any) {
      console.error('Failed to apply stock for updated invoice, attempting rollback:', err);
      // Try to revert any partial changes for updated invoice
      try {
        await revertStockForInvoice(updatedObj);
      } catch (re2) {
        console.error('Failed to revert stock for updated invoice during rollback:', re2);
      }
      // Try restore DB to old invoice
      try {
        await Invoice.findByIdAndUpdate(id, oldObj, { new: true, runValidators: true });
      } catch (reDb) {
        console.error('Failed to restore invoice document after failed stock apply:', reDb);
      }
      // Try to reapply old stock to get to previous state
      try {
        await updateStockForInvoice(oldObj);
      } catch (re3) {
        console.error('Failed to reapply old stock after rollback:', re3);
      }
      return NextResponse.json({ error: 'Failed to apply stock for updated invoice: ' + (err?.message || err) }, { status: 500 });
    }

    return NextResponse.json({ ...(updated as any).toObject(), id: (updated as any)._id.toString() });
  } catch (error) {
    console.error('PATCH /api/invoices/[id] error:', error);
    return NextResponse.json({ error: (error as any)?.message || 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  try {
    const params = await props.params;
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid Invoice ID' }, { status: 404 });
    }
    const id = params.id;
    const existing = await Invoice.findById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const existingObj = { ...(existing as any).toObject(), id: (existing as any)._id.toString() };

    // Revert stock for this invoice first. Collect warnings but allow delete to proceed so user can remove bad invoices.
    const warnings = await revertStockForInvoice(existingObj);
    await Invoice.findByIdAndDelete(id);
    if (Array.isArray(warnings) && warnings.length > 0) {
      return NextResponse.json({ deleted: true, warnings });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/invoices/[id] error:', error);
    return NextResponse.json({ error: (error as any)?.message || 'Failed to delete invoice' }, { status: 500 });
  }
}