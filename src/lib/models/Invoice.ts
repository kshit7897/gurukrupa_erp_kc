import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true },
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
  type: { type: String, enum: ['SALES', 'PURCHASE'] },
  paymentMode: String,
  paymentDetails: String
}, { timestamps: true });

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
