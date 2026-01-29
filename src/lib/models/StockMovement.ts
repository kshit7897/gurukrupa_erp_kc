import mongoose from 'mongoose';

const StockMovementSchema = new mongoose.Schema({
  // Company scoping for multi-company support
  companyId: { type: String, index: true },
  
  itemId: { type: String, required: true },
  qty: { type: Number, required: true }, // positive for IN, negative for OUT
  type: { type: String, enum: ['PURCHASE', 'SALE', 'ADJUSTMENT'], required: true },
  refId: { type: String }, // invoiceId or purchaseId
  date: { type: String, default: () => new Date().toISOString() },
  note: String,
  prevStock: Number,
  newStock: Number
}, { timestamps: true });

export default mongoose.models.StockMovement || mongoose.model('StockMovement', StockMovementSchema);
