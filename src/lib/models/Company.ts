import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
  name: String,
  gstNumber: String,
  phone: String,
  email: String,
  address: String,
  city: String,
  state: String,
  pincode: String
}, { timestamps: true });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
