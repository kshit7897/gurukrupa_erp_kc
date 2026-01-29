import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  // Company scoping for multi-company support (optional for backward compatibility)
  companyId: { type: String, index: true },
  
  key: { type: String, required: true },
  seq: { type: Number, default: 0 }
}, { timestamps: true });

// Compound unique index for company-specific counters
CounterSchema.index({ companyId: 1, key: 1 }, { unique: true });

export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
