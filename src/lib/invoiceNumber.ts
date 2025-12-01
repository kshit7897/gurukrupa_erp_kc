import dbConnect from './mongodb';
import Counter from './models/Counter';

const PREFIX_MAP: Record<string, string> = {
  cash: 'C',
  credit: 'CR',
  online: 'ON',
  cheque: 'CH'
};

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
 * Uses a counter key composed from bill_type and financial_year to ensure separate sequences.
 */
export async function generateInvoiceNumber(payload: { paymentMode?: string; date?: string | Date; bill_type?: string }) {
  await dbConnect();

  // Determine bill type key (normalized)
  const pm = (payload.bill_type || payload.paymentMode || '').toString().toLowerCase();
  const billKey = pm || 'cash';
  const prefix = PREFIX_MAP[billKey] || (pm === 'credit' ? 'CR' : (pm === 'cash' ? 'C' : 'OT'));

  const fy = getFinancialYearFromDate(payload.date);

  // counter key scoped to bill type + financial year
  const counterKey = `inv:${billKey}:${fy}`;

  // Atomically increment and retrieve next serial
  const updated = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();

  const nextSerial = (updated && typeof (updated as any).seq === 'number') ? (updated as any).seq : 1;
  const serialPadded = String(nextSerial).padStart(4, '0');
  const invoice_no = `${prefix}/${fy}/${serialPadded}`;

  return { invoice_no, serial: nextSerial, bill_type: billKey, financial_year: fy };
}

export default generateInvoiceNumber;
