import dbConnect from './mongodb';
import Counter from './models/Counter';

/**
 * Invoice Number Format:
 * - Tax Invoice (Credit): GK-CR-<SEQ>-<FINYEAR> (e.g., GK-CR-0001-24-25)
 * - Cash Invoice: GK-C-<SEQ>-<FINYEAR> (e.g., GK-C-0001-24-25)
 * - Online/UPI: GK-ON-<SEQ>-<FINYEAR>
 * - Cheque: GK-CH-<SEQ>-<FINYEAR>
 */

const PREFIX_MAP: Record<string, string> = {
  cash: 'C',
  credit: 'CR',
  online: 'ON',
  cheque: 'CH',
  upi: 'ON' // UPI treated same as online
};

// Company prefix - can be configured via environment or settings
const COMPANY_PREFIX = 'GK';

function getFinancialYearFromDate(date?: string | Date) {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    return formatFY(now.getFullYear(), now.getMonth());
  }
  return formatFY(d.getFullYear(), d.getMonth());
}

function formatFY(year: number, monthZeroBased: number) {
  // financial year starts Apr (month 3) and ends Mar (month 2)
  const start = monthZeroBased >= 3 ? year : year - 1;
  const end = start + 1;
  const a = String(start % 100).padStart(2, '0');
  const b = String(end % 100).padStart(2, '0');
  return `${a}-${b}`;
}

/**
 * Generate invoice number with atomic serial allocation using counters collection.
 * Uses a counter key composed from companyId, bill_type and financial_year to ensure separate sequences per company.
 * 
 * Format: GK-<TYPE>-<SEQ>-<FINYEAR>
 * Examples:
 * - GK-CR-0001-24-25 (Credit/Tax Invoice)
 * - GK-C-0001-24-25 (Cash Invoice)
 */
export async function generateInvoiceNumber(payload: { 
  paymentMode?: string; 
  date?: string | Date; 
  bill_type?: string;
  invoiceType?: 'SALES' | 'PURCHASE';
  companyId?: string; // For multi-company support
}) {
  await dbConnect();

  // Determine bill type key (normalized)
  const pm = (payload.bill_type || payload.paymentMode || '').toString().toLowerCase();
  const billKey = pm || 'cash';
  const prefix = PREFIX_MAP[billKey] || (pm === 'credit' ? 'CR' : (pm === 'cash' ? 'C' : 'OT'));

  const fy = getFinancialYearFromDate(payload.date);

  // counter key scoped to company + bill type + financial year
  if (!payload.companyId) {
    throw new Error('companyId is required for invoice numbering');
  }
  const companyKey = payload.companyId;
  const counterKey = `inv:${companyKey}:${billKey}:${fy}`;

  // Atomically increment and retrieve next serial
  const updated = await Counter.findOneAndUpdate(
    { companyId: payload.companyId, key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();

  const nextSerial = (updated && typeof (updated as any).seq === 'number') ? (updated as any).seq : 1;
  const serialPadded = String(nextSerial).padStart(4, '0');
  
  // New format: GK-CR-0001-24-25 or GK-C-0001-24-25
  const invoice_no = `${COMPANY_PREFIX}-${prefix}-${serialPadded}-${fy}`;

  return { invoice_no, serial: nextSerial, bill_type: billKey, financial_year: fy };
}

/**
 * Generate voucher number for payments
 * Format: GK-RCV-<SEQ>-<FINYEAR> or GK-PAY-<SEQ>-<FINYEAR>
 */
export async function generateVoucherNumber(type: 'receive' | 'pay', date?: string | Date, companyId?: string) {
  await dbConnect();
  
  const prefix = type === 'receive' ? 'RCV' : 'PAY';
  const fy = getFinancialYearFromDate(date);
  if (!companyId) {
    throw new Error('companyId is required for voucher numbering');
  }
  const companyKey = companyId;
  const counterKey = `voucher:${companyKey}:${type}:${fy}`;
  
  const updated = await Counter.findOneAndUpdate(
    { companyId, key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();

  const nextSerial = (updated && typeof (updated as any).seq === 'number') ? (updated as any).seq : 1;
  const serialPadded = String(nextSerial).padStart(4, '0');
  
  return `${COMPANY_PREFIX}-${prefix}-${serialPadded}-${fy}`;
}

export default generateInvoiceNumber;
