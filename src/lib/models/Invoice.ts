import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  // Company scoping for multi-company support
  companyId: { type: String, index: true },
  
  // legacy camelCase invoiceNo kept for backward compatibility
  invoiceNo: { type: String, required: true },
  // new fields per requirements
  invoice_no: { type: String, required: true, index: true, unique: true, sparse: true },
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
  ,
  // additional invoice metadata
  payment_mode: String,
  reverse_charge: { type: Boolean, default: false },
  buyer_order_no: String,
  supplier_ref: String,
  vehicle_no: String,
  delivery_date: String,
  transport_details: String,
  terms_of_delivery: String,
  total_amount_in_words: String,
  // tax split fields
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 }
  ,
  // billing and shipping address objects saved with invoice
  billingAddress: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
    gstin: String,
    phone: String
  },
  shippingAddress: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
    gstin: String,
    phone: String
  }
}, { timestamps: true });

// index to help lookup last serial; not strictly unique because we pair with serial
InvoiceSchema.index({ bill_type: 1, financial_year: 1, serial: -1 });
// invoice_no index declared on field to avoid duplicate index warnings

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
