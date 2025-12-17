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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    console.log('[invoice-pdf] incoming id (query)', id);
    await dbConnect();

    let invoice: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      invoice = await Invoice.findById(id).lean();
    }
    if (!invoice) {
      invoice = await Invoice.findOne({ $or: [{ invoiceNo: id }, { invoice_no: id }] }).lean();
    }
    if (!invoice) {
      const sample = await Invoice.find({}, { _id: 1, invoiceNo: 1, invoice_no: 1 }).limit(3).lean();
      console.warn('[invoice-pdf] invoice not found for id', id, 'sample ids', sample);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const party = invoice.partyId ? await Party.findById(invoice.partyId).lean() : null;
    const company = await Company.findOne().lean();

    const buffer = await renderToBuffer(
      React.createElement(InvoicePdf as any, { invoice, party, company })
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice_${invoice.invoiceNo || id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('GET /api/invoices/pdf error', err);
    return NextResponse.json({ error: err?.message || 'Failed to generate invoice PDF' }, { status: 500 });
  }
}


