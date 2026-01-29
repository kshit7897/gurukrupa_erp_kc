import mongoose from 'mongoose';

const OtherTxnSchema = new mongoose.Schema({
  // Company scoping for multi-company support
  companyId: { type: String, index: true },
  
  kind: { type: String, enum: ['income', 'expense'], required: true },
  date: { type: String, required: true }, // ISO date string
  amount: { type: Number, required: true },
  note: { type: String },
  category: { type: String },
}, { timestamps: true });

export default mongoose.models.OtherTxn || mongoose.model('OtherTxn', OtherTxnSchema);
