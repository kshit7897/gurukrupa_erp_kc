import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
  // Company scoping for multi-company support
  companyId: { type: String, index: true },
  
  name: { type: String, required: true },
  hsn: String,
  unit: String,
  purchaseRate: { type: Number, default: 0 },
  saleRate: { type: Number, default: 0 },
  taxPercent: { type: Number, default: 18 },
  barcode: String,
  stock: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Item || mongoose.model('Item', ItemSchema);
