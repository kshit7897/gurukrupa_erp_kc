import mongoose from 'mongoose';

const PartySchema = new mongoose.Schema({
  // Company scoping for multi-company support
  companyId: { type: String, index: true },

  name: { type: String, required: true },
  mobile: { type: String, required: false },
  email: String,
  address: String,
  gstNo: String,
  gstin: String,
  cin: String,
  phone: String,
  // Direct address fields
  city: String,
  state: String,
  pincode: String,
  // billing/shipping structured addresses
  billingAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String
  },
  shippingAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String
  },
  openingBalance: { type: Number, default: 0 },
  openingBalanceType: { type: String, enum: ['DR', 'CR'], default: 'DR' }, // DR = Receivable, CR = Payable
  // Primary type for backward compatibility
  type: { type: String, required: true, enum: ['Customer', 'Supplier', 'Owner', 'Partner', 'Employee', 'Carting', 'Cash', 'Bank', 'UPI'] },
  // Multi-role support - a party can have multiple roles
  roles: [{ type: String, enum: ['Customer', 'Supplier', 'Owner', 'Partner', 'Employee', 'Carting', 'Cash', 'Bank', 'UPI'] }],
  // System accounts flag (for Cash/Bank/UPI)
  isSystemAccount: { type: Boolean, default: false },
  // Track if opening balance ledger entry was created
  openingBalanceLedgerCreated: { type: Boolean, default: false },
}, { timestamps: true });

// Index for faster lookups by role
PartySchema.index({ roles: 1 });
PartySchema.index({ type: 1 });
PartySchema.index({ isSystemAccount: 1 });

// Check if model already exists to prevent overwrite error in Next.js hot reload
export default mongoose.models.Party || mongoose.model('Party', PartySchema);
