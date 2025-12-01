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
  ,
  // logo as data URL or image path
  logo: String,
  // arbitrary extra details to show on invoices (array of { label, value })
  extraDetails: [{ label: String, value: String }]
}, { timestamps: true });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
