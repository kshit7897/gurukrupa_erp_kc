import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
  name: String,
  // common existing fields
  gstNumber: String,
  phone: String,
  email: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  // additional fields required by invoice template
  gstin: String,
  contactNumbers: [String],
  address_line_1: String,
  address_line_2: String,
  bank_name: String,
  bank_branch: String,
  bank_account_no: String,
  ifsc_code: String,
  upi_id: String,
  declaration_text: [String]
}, { timestamps: true });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
