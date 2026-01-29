import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Invoice from '../../../lib/models/Invoice';
import LedgerEntry from '../../../lib/models/LedgerEntry';
import { updateStockForInvoice } from '../../../lib/stock';
import { generateInvoiceNumber } from '../../../lib/invoiceNumber';
import { getCompanyContextFromRequest } from '../../../lib/companyContext';

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const url = new URL(request.url);
    const party = url.searchParams.get('party');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');
    const bill_type = url.searchParams.get('bill_type');
    const pending = url.searchParams.get('pending'); // '1' or 'true'
    const type = url.searchParams.get('type'); // 'SALES' or 'PURCHASE'

    // Add company scope to query
    const q: any = {
      companyId
    };
    if (party) q.partyId = party;
    if (bill_type) q.paymentMode = bill_type;
    if (type) q.type = type;
    if (pending === '1' || pending === 'true') q.dueAmount = { $gt: 0 };

    if (from && to) {
      q.date = { $gte: from, $lte: to };
    } else if (month && year) {
      // filter by month/year (date is stored as ISO-ish string). We'll match prefix YYYY-MM
      const mm = month.padStart(2, '0');
      const prefix = `${year}-${mm}`;
      q.date = { $regex: `^${prefix}` };
    }

    const invoices = await Invoice.find(q).sort({ date: -1, createdAt: -1 });
    const formatted = invoices.map(doc => ({ ...(doc as any).toObject(), id: (doc as any)._id.toString() }));
    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error('GET /api/invoices error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const body = await request.json();
    console.log('POST /api/invoices body:', JSON.stringify(body).slice(0, 1000));
    
    const payload = { ...body, companyId } as any; // Add company scope
    const grand = Number(payload.grandTotal || 0);
    
    /**
     * IMPORTANT: Cash Sale Rule
     * Even cash sales must appear as PENDING initially.
     * Amount reduces ONLY after explicit payment entry.
     * No auto-settlement allowed.
     */
    payload.paidAmount = 0;
    payload.dueAmount = grand;

    // Generate invoice numbering fields: invoice_no, serial, bill_type, financial_year
    // Format: GK-CR-0001-24-25 (credit) or GK-C-0001-24-25 (cash)
    try {
      const gen = await generateInvoiceNumber({ 
        paymentMode: payload.paymentMode, 
        date: payload.date, 
        bill_type: payload.bill_type,
        invoiceType: payload.type,
        companyId // Pass companyId for company-specific numbering
      });
      if (gen && gen.invoice_no) {
        payload.invoice_no = gen.invoice_no;
        payload.serial = gen.serial;
        payload.bill_type = gen.bill_type;
        payload.financial_year = gen.financial_year;
        // keep legacy field as well
        payload.invoiceNo = gen.invoice_no;
      }
    } catch (err) {
      console.error('Invoice number generation failed', err);
      // fallback: if client provided legacy invoiceNo, use that; otherwise create a timestamp-based fallback
      if (payload.invoiceNo) {
        payload.invoice_no = payload.invoiceNo;
      } else if (payload.invoice_no) {
        // nothing to do
      } else {
        const fallback = `AUTO/${new Date().toISOString()}`;
        payload.invoice_no = fallback;
        payload.invoiceNo = fallback;
      }
    }

    const invoice = await Invoice.create(payload);
    const invoiceId = (invoice as any)._id.toString();
    
    // Create ledger entry for the invoice
    try {
      const isSales = payload.type === 'SALES';
      await LedgerEntry.create({
        companyId, // Add company scope
        partyId: payload.partyId,
        partyName: payload.partyName,
        date: payload.date,
        entryType: 'INVOICE',
        refType: 'INVOICE',
        refId: invoiceId,
        refNo: payload.invoice_no || payload.invoiceNo,
        // Sales: Debit (receivable from customer)
        // Purchase: Credit (payable to supplier)
        debit: isSales ? grand : 0,
        credit: isSales ? 0 : grand,
        narration: `${isSales ? 'Sales' : 'Purchase'} Invoice: ${payload.invoice_no || payload.invoiceNo}`,
        paymentMode: payload.paymentMode,
        metadata: {
          invoiceType: payload.type
        }
      });
    } catch (ledgerErr) {
      console.error('Ledger entry creation failed:', ledgerErr);
      // Continue - don't fail invoice creation for ledger entry failure
    }
    
    // Update stock; if this fails, delete the created invoice and ledger entry
    try {
      await updateStockForInvoice({ ...((invoice as any).toObject()), id: invoiceId, companyId });
    } catch (err) {
      console.error('Stock update failed after invoice create, reverting:', err);
      await Invoice.findByIdAndDelete(invoiceId);
      await LedgerEntry.deleteMany({ refId: invoiceId, refType: 'INVOICE' });
      return NextResponse.json({ error: 'Failed to update stock for invoice: ' + (err as any).message }, { status: 500 });
    }

    const out = { ...(invoice as any).toObject(), id: invoiceId };
    console.log('Invoice created, id=', out.id);
    return NextResponse.json(out);
  } catch (err: any) {
    console.error('POST /api/invoices error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create invoice' }, { status: 500 });
  }
}