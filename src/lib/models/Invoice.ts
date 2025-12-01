import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  // legacy camelCase invoiceNo kept for backward compatibility
  invoiceNo: { type: String, required: true },
  // new fields per requirements
  invoice_no: { type: String, required: true, unique: true },
  serial: { type: Number },
  bill_type: { type: String },
  financial_year: { type: String },
  date: { type: String, required: true },
  partyId: { type: String, required: true },
  partyName: String,
  items: [{
    itemId: String,
    name: String,
    qty: Number,
    rate: Number,
    taxPercent: Number,
    amount: Number
  }],
  subtotal: Number,
  taxAmount: Number,
  roundOff: Number,
  grandTotal: Number,
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  type: { type: String, enum: ['SALES', 'PURCHASE'] },
  paymentMode: String,
  paymentDetails: String
}, { timestamps: true });

// index to help lookup last serial; not strictly unique because we pair with serial
InvoiceSchema.index({ bill_type: 1, financial_year: 1, serial: -1 });
InvoiceSchema.index({ invoice_no: 1 }, { unique: true, sparse: true });

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
