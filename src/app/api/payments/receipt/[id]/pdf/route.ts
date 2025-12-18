import { NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import dbConnect from '@/lib/mongodb';
import Payment from '@/lib/models/Payment';
import Party from '@/lib/models/Party';
import Company from '@/lib/models/Company';
import { ReceiptPdf } from '@/lib/pdf/ReceiptPdf';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    await dbConnect();

    // Try flexible lookup: prefer findById, then fallback to alternate fields
    let payment: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      payment = await Payment.findById(id).lean();
    }
    if (!payment) {
      // fallback to common alternative keys
      const orClauses: any[] = [];
      orClauses.push({ id: id });
      orClauses.push({ voucherNo: id });
      // try to match string _id as well
      if (mongoose.Types.ObjectId.isValid(id)) orClauses.push({ _id: id });
      payment = await Payment.findOne({ $or: orClauses }).lean();
    }
    if (!payment) {
      console.warn('[receipt-pdf] payment not found for id', id);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const party = payment.partyId ? await Party.findById(payment.partyId).lean() : null;
    const company = await Company.findOne().lean();

    // Puppeteer rendering disabled to avoid blank PDFs and slow prints.
    // The server will render the receipt via react-pdf for consistent output.

    // Fallback: render via react-pdf (existing behavior)
    const buffer = await renderToBuffer(React.createElement(ReceiptPdf as any, { payment, party, company }));
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Payment_${payment._id || id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('GET /api/payments/receipt/[id]/pdf error', err);
    return NextResponse.json({ error: err?.message || 'Failed to generate receipt PDF' }, { status: 500 });
  }
}

// Accept POST with JSON body { payment, party?, company? } to render PDF from client-provided data.
export async function POST(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const body = await req.json().catch(() => ({}));
    const payment = body?.payment || null;
    if (!payment) return NextResponse.json({ error: 'payment object required in request body' }, { status: 400 });

    await dbConnect();
    // Prefer client-supplied party/company for pixel-perfect match; fallback to DB lookups
    let party = body?.party || null;
    let company = body?.company || null;
    if (!party && payment.partyId) {
      try { party = await Party.findById(payment.partyId).lean(); } catch (e) { party = null; }
    }
    if (!company) {
      try { company = await Company.findOne().lean(); } catch (e) { company = null; }
    }

    const buffer = await renderToBuffer(React.createElement(ReceiptPdf as any, { payment, party, company }));
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Payment_${payment._id || id || 'receipt'}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('POST /api/payments/receipt/[id]/pdf error', err);
    return NextResponse.json({ error: err?.message || 'Failed to generate receipt PDF' }, { status: 500 });
  }
}


