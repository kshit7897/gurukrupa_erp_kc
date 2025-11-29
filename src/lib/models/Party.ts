import mongoose from 'mongoose';

const PartySchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: String,
  address: String,
  gstNo: String,
  openingBalance: { type: Number, default: 0 },
  type: { type: String, required: true, enum: ['Customer', 'Supplier'] },
}, { timestamps: true });

// Check if model already exists to prevent overwrite error in Next.js hot reload
export default mongoose.models.Party || mongoose.model('Party', PartySchema);
