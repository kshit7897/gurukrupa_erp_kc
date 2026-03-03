import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import { generateInvoiceNumber } from '../../../../lib/invoiceNumber';
import { getCompanyContextFromRequest } from '../../../../lib/companyContext';

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const url = new URL(request.url);
    const paymentMode = url.searchParams.get('paymentMode') || 'cash';
    const date = url.searchParams.get('date') || new Date().toISOString();
    const type = url.searchParams.get('type') || 'SALES';
    
    // Call generateInvoiceNumber to get the predicted next number
    // We pass companyId so it looks at the right sequences
    const nextInvoiceData = await generateInvoiceNumber({
      companyId,
      date,
      paymentMode,
      invoiceType: type as any,
    });
    
    return NextResponse.json(nextInvoiceData);
  } catch (err: any) {
    console.error('GET /api/invoices/next-number error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to generate next invoice number' }, { status: 500 });
  }
}
