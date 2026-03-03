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

    // --- CUSTOM INVOICE NUMBER HANDLING ---
    // If the frontend passed a custom invoice_no, we validate it and use it.
    // Otherwise, we auto-generate it.

    let isCustomInvoice = false;
    // Check if user manually typed an invoice_no.
    // Ensure it's not starting with "AUTO/" (fallback)
    if (payload.invoice_no && !payload.invoice_no.startsWith("AUTO/")) {
      isCustomInvoice = true;
    }

    if (isCustomInvoice) {
      // 1. We must determine the bill_type and financial_year first to check duplicates properly within the year
      // A safe way is to call generation logic just to get `financial_year` and `bill_type`, throwing away the sequence.
      const genMeta = await generateInvoiceNumber({
        paymentMode: payload.paymentMode,
        date: payload.date,
        bill_type: payload.bill_type,
        invoiceType: payload.type,
        companyId
      });

      const fy = genMeta.financial_year;
      const parsedBillType = genMeta.bill_type; // e.g. "C", "CR", "PUR"

      // 2. Check for duplicates in the DB for this company + financial_year + invoice_no
      const existing = await Invoice.findOne({
        companyId,
        financial_year: fy,
        invoice_no: payload.invoice_no
      });

      if (existing) {
        return NextResponse.json({ error: `Duplicate Invoice Warning: Invoice No '${payload.invoice_no}' already exists in Financial Year ${fy}.` }, { status: 409 });
      }

      // 3. Extract the numeric serial from the custom invoice_no (e.g. "GK-CR-0050-2026" -> 50)
      // We look for the right-most group of digits before the year.
      // Easiest robust fallback: parse all numbers, try to find the sequence.
      // Better: assume the format is PREFIX-SERIES-XXXX-YYYY and split by "-"
      let extractedSerial = genMeta.serial; // fallback to auto-generated serial

      const parts = payload.invoice_no.split('-');
      if (parts.length >= 3) {
        // e.g. GK - CR - 0050 - 2026 -> sequence is index 2
        const potentialSerial = parseInt(parts[2], 10);
        if (!isNaN(potentialSerial)) {
          extractedSerial = potentialSerial;
        }
      }

      // 4. Apply custom fields
      payload.serial = extractedSerial;
      payload.bill_type = parsedBillType;
      payload.financial_year = fy;
      payload.invoiceNo = payload.invoice_no; // sync legacy field

    } else {
      // --- AUTO INVOICE NUMBER GENERATION (Existing Logic) ---
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
      // --- END AUTO INVOICE NUMBER GENERATION ---
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