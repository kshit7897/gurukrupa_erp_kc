import dbConnect from './mongodb';
import Counter from './models/Counter';
import Company from './models/Company';

/**
 * Invoice Numbering System (Revised)
 * 
 * Rules:
 * 1. Prefix: Dynamic from Company.invoicePrefix (First 2 chars of name if not set)
 * 2. Series Type: 
 *    - C:  Cash Invoice
 *    - CR: Credit Invoice (Tax Invoice) / Online
 *    - PUR: Purchase
 * 3. Financial Year: YY/YY (e.g., 25/26)
 * 4. Sequence: 4-digit padded, atomic per Company+Series+FY
 * 5. Separator: Hyphen "-"
 * 6. Counter Key: inv:{companyId}:{series}:{financialYear}
 * 
 * Format: {PREFIX}-{SERIES}-{SEQ}-{FY}
 * Example: DE-C-0001-25/26
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

  // 3. Determine Financial Year (Short Format: 25/26)
  const dateObj = payload.date ? new Date(payload.date) : new Date();
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided for invoice generation');
  }
  
  const fy = getFinancialYearShort(dateObj); // "25/26"

  // 4. Atomic Increment
  // Key format: inv:{companyId}:{series}:{financialYear}
  // Example: inv:123:C:25/26
  const counterKey = `inv:${payload.companyId}:${seriesCode}:${fy}`;
  
  const counter = await Counter.findOneAndUpdate(
    { companyId: payload.companyId, key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();
  
  const nextSeq = (counter?.seq || 1);
  const seqPadded = String(nextSeq).padStart(4, '0');

  // 5. Construct Final Number
  // Format: {PREFIX}-{SERIES}-{SEQ}-{FY}
  // Example: DE-C-0001-25/26
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
 * Returns FY in format "YY/YY" (e.g. "25/26")
 */
function getFinancialYearShort(date: Date): string {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();
  
  // April (3) starts new FY
  let startYear = year;
  if (month < 3) { // Jan, Feb, Mar belong to previous FY start
    startYear = year - 1;
  }
  
  const startYY = String(startYear).slice(-2);
  const endYY = String(startYear + 1).slice(-2);
  
  return `${startYY}/${endYY}`;
}

export default generateInvoiceNumber;
