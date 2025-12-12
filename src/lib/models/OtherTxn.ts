import mongoose from 'mongoose';

const OtherTxnSchema = new mongoose.Schema({
  kind: { type: String, enum: ['income', 'expense'], required: true },
  date: { type: String, required: true }, // ISO date string
  amount: { type: Number, required: true },
  note: { type: String },
  category: { type: String },
}, { timestamps: true });

export default mongoose.models.OtherTxn || mongoose.model('OtherTxn', OtherTxnSchema);
