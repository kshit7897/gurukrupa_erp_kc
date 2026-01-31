import mongoose from 'mongoose';

const OtherTxnSchema = new mongoose.Schema({
  // Company scoping for multi-company support
  companyId: { type: String, index: true },
  
  // Type of transaction
  txnType: { 
    type: String, 
    enum: ['INCOME', 'EXPENSE', 'CONTRA'],
    default: 'INCOME'
  },
  
  // For backward compatibility or simpler entries
  kind: { type: String, required: false },
  
  date: { type: String, required: true }, // ISO date string
  amount: { type: Number, required: true },
  
  // Source Account/Party
  fromId: { type: String, index: true },
  fromName: { type: String },
  
  // Destination Account/Party
  toId: { type: String, index: true },
  toName: { type: String },
  
  // Details
  referenceNo: { type: String },
  note: { type: String },
  category: { type: String },
}, { timestamps: true });

// Force model re-registration to pick up schema updates in Next.js development
if (mongoose.models.OtherTxn) {
  delete (mongoose.models as any).OtherTxn;
}

export default mongoose.model('OtherTxn', OtherTxnSchema);
