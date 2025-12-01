import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  partyId: { type: String, required: true },
  invoiceId: { type: String },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  mode: { type: String, default: 'cash' },
  reference: String,
  notes: String
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

