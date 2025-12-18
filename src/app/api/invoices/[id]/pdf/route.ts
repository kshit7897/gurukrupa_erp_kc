import { NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Party from '@/lib/models/Party';
import Company from '@/lib/models/Company';
import { InvoicePdf } from '@/lib/pdf/InvoicePdf';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: any) {
  try {
    const { id } = context.params;
    console.log('[invoice-pdf] incoming id', id);
    await dbConnect();

    let invoice: any = null;

    // Try ObjectId when valid to avoid cast errors
    if (mongoose.Types.ObjectId.isValid(id)) {
      invoice = await Invoice.findById(id).lean();
    }

    // Fallback: invoice number stored in invoiceNo / invoice_no
    if (!invoice) {
      invoice = await Invoice.findOne({
        $or: [{ invoiceNo: id }, { invoice_no: id }],
      }).lean();
    }

    if (!invoice) {
      // Log a small sample to help diagnose mismatched ids/numbers
      const sample = await Invoice.find({}, { _id: 1, invoiceNo: 1, invoice_no: 1 })
        .limit(3)
        .lean();
      console.warn('[invoice-pdf] invoice not found for id', id, 'sample ids', sample);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const party = invoice.partyId ? await Party.findById(invoice.partyId).lean() : null;
    const company = await Company.findOne().lean();

    const buffer = await renderToBuffer(
      (React.createElement(InvoicePdf as any, { invoice, party, company }) as any)
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice_${invoice.invoiceNo || id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('GET /api/invoices/[id]/pdf error', err);
    return NextResponse.json({ error: err?.message || 'Failed to generate invoice PDF' }, { status: 500 });
  }
}


