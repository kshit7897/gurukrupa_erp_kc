import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
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
  created_by: String
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

