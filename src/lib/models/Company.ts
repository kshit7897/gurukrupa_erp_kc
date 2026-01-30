import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true },
  // common existing fields
  gstNumber: String,
  phone: String,
  mobile2: String,
  email: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  // Invoice numbering prefix (e.g., "GK", "DH")
  invoicePrefix: { type: String, uppercase: true, trim: true },
  // additional fields required by invoice template
  gstin: String,
  cin: String,
  contactNumbers: [String],
  address_line_1: String,
  address_line_2: String,
  bank_name: String,
  bank_branch: String,
  bank_account_no: String,
  ifsc_code: String,
  upi_id: String,
  declaration_text: [String],
  openingBalance: { type: Number, default: 0 },
  // logo as data URL or image path
  logo: String,
  // arbitrary extra details to show on invoices (array of { label, value })
  extraDetails: [{ label: String, value: String }],
  
  // Multi-company support fields
  createdBy: { type: String }, // User ID who created this company
  isActive: { type: Boolean, default: true }, // Soft delete support
  isDefault: { type: Boolean, default: false }, // Default company for migration
}, { timestamps: true });

// Index for faster lookups
CompanySchema.index({ isActive: 1 });
CompanySchema.index({ createdBy: 1 });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
