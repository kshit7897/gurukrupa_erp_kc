import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  // Company scoping for multi-company support
  companyId: { type: String, index: true },
  
  voucherNo: { type: String },
  partyId: { type: String, required: true },
  partyName: { type: String },
  // type: receive => customer receipt, pay => supplier payment
  type: { type: String, enum: ['receive', 'pay'], required: true },
  invoiceIds: [{ type: String }],
  allocations: [{ invoiceId: String, amount: Number }],
  amount: { type: Number, required: true },
  outstandingBefore: { type: Number },
  outstandingAfter: { type: Number },
  date: { type: String, required: true },
  mode: { type: String, default: 'cash' },
  reference: String,
  notes: String,
  created_by: String,

  // Who received the payment (for double-entry ledger)
  // Can be a company account (Cash/Bank/UPI) or a Partner party.
  receivedById: { type: String },
  receivedByName: { type: String },
  receivedByType: { type: String } // e.g. 'COMPANY_ACCOUNT' | 'PARTNER'
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

