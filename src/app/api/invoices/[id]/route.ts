import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Invoice from '../../../../lib/models/Invoice';
import LedgerEntry from '../../../../lib/models/LedgerEntry';
import mongoose from 'mongoose';
import { updateStockForInvoice, revertStockForInvoice } from '../../../../lib/stock';
import { generateInvoiceNumber } from '../../../../lib/invoiceNumber';
import { getCompanyContextFromRequest } from '../../../../lib/companyContext';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  
  try {
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }

    const params = await props.params;
    const id = params.id;
    let invoice: any = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      invoice = await Invoice.findOne({ _id: id, companyId });
    }
    if (!invoice) {
      invoice = await Invoice.findOne({ 
        $or: [{ invoiceNo: id }, { invoice_no: id }],
        companyId
      });
    }
    if (!invoice) {
      const sample = await Invoice.find({}, { _id: 1, invoiceNo: 1, invoice_no: 1 }).limit(3);
      console.warn('[invoice-get] invoice not found for id', id, 'sample ids', sample);
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
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
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }

    const params = await props.params;
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid Invoice ID' }, { status: 404 });
    }
    const id = params.id;
    const existing = await Invoice.findOne({ _id: id, companyId });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const oldObj = { ...(existing as any).toObject(), id: (existing as any)._id.toString() };

    const body = await request.json();

    // Normalize payment amounts similar to POST, but handle conversion from cash->credit properly
    const payload: any = { ...body };
    const grand = Number(payload.grandTotal || existing.grandTotal || 0);
    const origPaymentMode = existing.paymentMode || 'cash';

    if (payload.paymentMode === 'cash') {
      payload.paidAmount = grand;
      payload.dueAmount = 0;
    } else if (payload.paymentMode) {
      // If converting from cash -> non-cash and client didn't provide paidAmount, assume unpaid (0)
      if ((origPaymentMode === 'cash' || origPaymentMode === 'CASH') && (payload.paidAmount == null || payload.paidAmount === '')) {
        payload.paidAmount = 0;
      } else {
        payload.paidAmount = Number(payload.paidAmount != null ? payload.paidAmount : (existing.paidAmount || 0));
      }
      payload.dueAmount = Math.max(0, grand - (payload.paidAmount || 0));
    }

    // If payment mode changed, regenerate invoice number/serial for the new bill type
    try {
      const newMode = payload.paymentMode || existing.paymentMode || 'cash';
      if (newMode && newMode !== origPaymentMode) {
        const gen = await generateInvoiceNumber({ paymentMode: newMode, date: payload.date || existing.date, bill_type: payload.bill_type, companyId });
        if (gen && gen.invoice_no) {
          payload.invoice_no = gen.invoice_no;
          payload.serial = gen.serial;
          payload.bill_type = gen.bill_type;
          payload.financial_year = gen.financial_year;
          payload.invoiceNo = gen.invoice_no;
        }
      }
    } catch (e) {
      console.error('Failed to regenerate invoice number on paymentMode change', e);
      // fallback: preserve existing number below
    }

    // Ensure invoice_no/serial are preserved unless explicitly changed or regenerated above
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

    // Step 4: Create ledger reversal and new entry for the update
    // This ensures the ledger trail is maintained
    try {
      const isSales = updatedObj.type === 'SALES';
      const oldGrand = Number(oldObj.grandTotal || 0);
      const newGrand = Number(updatedObj.grandTotal || 0);
      
      // Only create reversal/new entries if amounts changed
      if (oldGrand !== newGrand || oldObj.partyId !== updatedObj.partyId) {
        // Create reversal entry for the old invoice
        await LedgerEntry.create({
          companyId,
          partyId: oldObj.partyId,
          partyName: oldObj.partyName,
          date: new Date().toISOString().split('T')[0],
          entryType: 'REVERSAL',
          refType: 'INVOICE',
          refId: id,
          refNo: `REV-${oldObj.invoice_no || oldObj.invoiceNo}`,
          debit: isSales ? 0 : oldGrand,
          credit: isSales ? oldGrand : 0,
          narration: `Reversal for invoice update: ${oldObj.invoice_no || oldObj.invoiceNo}`,
          paymentMode: oldObj.paymentMode,
          isReversal: true,
          metadata: { invoiceType: oldObj.type }
        });
        
        // Create new entry for the updated invoice
        await LedgerEntry.create({
          companyId,
          partyId: updatedObj.partyId,
          partyName: updatedObj.partyName,
          date: updatedObj.date,
          entryType: 'INVOICE',
          refType: 'INVOICE',
          refId: id,
          refNo: updatedObj.invoice_no || updatedObj.invoiceNo,
          debit: isSales ? newGrand : 0,
          credit: isSales ? 0 : newGrand,
          narration: `${isSales ? 'Sales' : 'Purchase'} Invoice (Updated): ${updatedObj.invoice_no || updatedObj.invoiceNo}`,
          paymentMode: updatedObj.paymentMode,
          metadata: { invoiceType: updatedObj.type }
        });
      }
    } catch (ledgerErr) {
      console.error('Ledger entry update failed:', ledgerErr);
      // Continue - don't fail the update for ledger entry failure
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
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }

    const params = await props.params;
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid Invoice ID' }, { status: 404 });
    }
    const id = params.id;
    const existing = await Invoice.findOne({ _id: id, companyId });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const existingObj = { ...(existing as any).toObject(), id: (existing as any)._id.toString() };

    // Revert stock for this invoice first. Collect warnings but allow delete to proceed so user can remove bad invoices.
    const warnings = await revertStockForInvoice(existingObj);
    
    // Create ledger reversal entry instead of deleting (per accounting rules: ledger entries must NEVER be deleted)
    try {
      const isSales = existingObj.type === 'SALES';
      const grand = Number(existingObj.grandTotal || 0);
      
      await LedgerEntry.create({
        companyId,
        partyId: existingObj.partyId,
        partyName: existingObj.partyName,
        date: new Date().toISOString().split('T')[0],
        entryType: 'REVERSAL',
        refType: 'INVOICE',
        refId: id,
        refNo: `REV-${existingObj.invoice_no || existingObj.invoiceNo}`,
        // Reverse the original entry direction
        debit: isSales ? 0 : grand,
        credit: isSales ? grand : 0,
        narration: `Invoice Deleted/Reversed: ${existingObj.invoice_no || existingObj.invoiceNo}`,
        paymentMode: existingObj.paymentMode,
        reversedEntryId: id,
        isReversal: true,
        metadata: { invoiceType: existingObj.type }
      });
    } catch (ledgerErr) {
      console.error('Ledger reversal entry creation failed:', ledgerErr);
      // Continue with deletion even if ledger entry fails
    }
    
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