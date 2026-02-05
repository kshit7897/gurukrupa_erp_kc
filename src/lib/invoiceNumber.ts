import dbConnect from './mongodb';
import Counter from './models/Counter';
import Company from './models/Company';
import Invoice from './models/Invoice';

/**
 * Invoice Numbering System (Revised)
 * 
 * Rules:
 * 1. Prefix: Dynamic from Company.invoicePrefix (First 2 chars of name if not set)
 * 2. Series Type: 
 *    - C:  Cash Invoice
 *    - CR: Credit Invoice (Tax Invoice) / Online
 *    - PUR: Purchase
 * 3. Financial Year: YYYY (e.g., 2026) - As per user request, simply the year of the date.
 * 4. Sequence: 4-digit padded, atomic per Company+Series+FY using Max+1 strategy for reset support.
 * 5. Separator: Hyphen "-"
 * 
 * Format: {PREFIX}-{SERIES}-{SEQ}-{YYYY}
 * Example: DE-C-0001-2026
 */

interface GenerateOptions {
  companyId: string;
  date?: string | Date;
  paymentMode?: string;      // 'cash', 'credit', 'online', etc.
  bill_type?: string;        // override for paymentMode
  invoiceType?: 'SALES' | 'PURCHASE';
  type?: 'SALES' | 'PURCHASE'; // alias for invoiceType
}

export async function generateInvoiceNumber(payload: GenerateOptions) {
  if (!payload.companyId) {
    throw new Error('companyId is required for invoice numbering');
  }

  await dbConnect();

  // 1. Get Company Prefix
  const company = await Company.findById(payload.companyId).select('invoicePrefix name').lean();
  let prefix = 'GK'; // Default fallback

  if (company) {
    if (company.invoicePrefix) {
      prefix = company.invoicePrefix;
    } else if (company.name) {
      // Logic: First 2 chars of name, uppercase.
      // Example: "DevHub" -> "DE", "Gurukrupa" -> "GU"
      prefix = company.name.substring(0, 2).toUpperCase();
    }
  }

  // 2. Determine Series (C vs CR)
  const actualType = payload.invoiceType || payload.type || 'SALES';
  const mode = (payload.bill_type || payload.paymentMode || '').toLowerCase();

  let seriesCode = 'CR'; // Default to Credit

  if (actualType === 'PURCHASE') {
    seriesCode = 'PUR';
  } else {
    // SALES Logic
    if (mode === 'cash' || mode === 'c') {
      seriesCode = 'C';
    } else {
      // credit, online, cheque, or mixed -> defaults to CR
      seriesCode = 'CR';
    }
  }

  // 3. Determine Financial Year (Full Year: 2026)
  const dateObj = payload.date ? new Date(payload.date) : new Date();
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided for invoice generation');
  }

  const fy = getFinancialYearShort(dateObj); // "2026"

  // 4. Calculate Sequence (Max + 1 Strategy)
  // This allows resetting to 1 if all invoices are deleted, or filling the gap if the last one is deleted.
  const lastInvoice = await Invoice.findOne({
    companyId: payload.companyId,
    bill_type: seriesCode,
    financial_year: fy
  })
    .sort({ serial: -1 })
    .select('serial')
    .lean();

  const nextSeq = (lastInvoice?.serial || 0) + 1;
  const seqPadded = String(nextSeq).padStart(4, '0');

  // 5. Construct Final Number
  // Format: {PREFIX}-{SERIES}-{SEQ}-{FY}
  // Example: DE-C-0001-2026
  const invoice_no = `${prefix}-${seriesCode}-${seqPadded}-${fy}`;

  return {
    invoice_no,
    serial: nextSeq,
    bill_type: seriesCode,
    financial_year: fy,
    prefix
  };
}

/**
 * Returns Full Year string (e.g. "2026")
 * As per user request, this strictly returns the year of the date provided.
 */
function getFinancialYearShort(date: Date): string {
  return String(date.getFullYear());
}

export async function generateVoucherNumber(type: string, date: string | Date | undefined, companyId: string) {
  if (!companyId) throw new Error('companyId is required for voucher numbering');

  await dbConnect();

  // 1. Get Company Prefix
  const company = await Company.findById(companyId).select('invoicePrefix name').lean();
  let prefix = 'GK';
  if (company) {
    if (company.invoicePrefix) {
      prefix = company.invoicePrefix;
    } else if (company.name) {
      prefix = company.name.substring(0, 2).toUpperCase();
    }
  }

  // 2. Determine Series (RCV vs PAY)
  const seriesCode = type === 'receive' ? 'RCV' : 'PAY';

  // 3. Determine FY
  const dateObj = date ? new Date(date) : new Date();
  const fy = getFinancialYearShort(dateObj);

  // 4. Atomic Increment
  // Key: voucher:{companyId}:{series}:{fy}
  const counterKey = `voucher:${companyId}:${seriesCode}:${fy}`;

  const counter = await Counter.findOneAndUpdate(
    { companyId: companyId, key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();

  const nextSeq = (counter?.seq || 1);
  const seqPadded = String(nextSeq).padStart(4, '0');

  // Format: PREFIX-RCV-0001-25/26
  return `${prefix}-${seriesCode}-${seqPadded}-${fy}`;
}

export default generateInvoiceNumber;
