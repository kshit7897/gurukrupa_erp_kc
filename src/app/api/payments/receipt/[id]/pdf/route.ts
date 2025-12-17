import { NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import dbConnect from '@/lib/mongodb';
import Payment from '@/lib/models/Payment';
import Party from '@/lib/models/Party';
import Company from '@/lib/models/Company';
import { ReceiptPdf } from '@/lib/pdf/ReceiptPdf';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    await dbConnect();

    const payment = await Payment.findById(id).lean();
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const party = payment.partyId ? await Party.findById(payment.partyId).lean() : null;
    const company = await Company.findOne().lean();

    const buffer = await renderToBuffer(
      React.createElement(ReceiptPdf as any, { payment, party, company })
    );

    return new NextResponse(buffer, {
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


