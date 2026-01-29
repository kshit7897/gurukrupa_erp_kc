import mongoose from 'mongoose';

/**
 * LedgerEntry model for tracking all financial transactions
 * This provides a proper double-entry bookkeeping system
 * 
 * Entry types:
 * - OPENING_BALANCE: Initial balance for a party/account
 * - INVOICE: Sales or Purchase invoice
 * - PAYMENT: Payment received or made
 * - RECEIPT: Alias for payment receipt
 * - ADJUSTMENT: Manual adjustments
 * - REVERSAL: Reversal of a previous entry
 */

const LedgerEntrySchema = new mongoose.Schema({
  // Company scoping for multi-company support
  companyId: { type: String, index: true },
  
  // Reference to the party/account
  partyId: { type: String, required: true, index: true },
  partyName: String,
  
  // Entry details
  date: { type: String, required: true, index: true }, // ISO date string
  
  // Entry type for categorization
  entryType: { 
    type: String, 
    required: true,
    enum: ['OPENING_BALANCE', 'INVOICE', 'PAYMENT', 'RECEIPT', 'ADJUSTMENT', 'REVERSAL', 'CAPITAL', 'EXPENSE', 'INCOME']
  },
  
  // Reference to the source document
  refType: { 
    type: String, 
    enum: ['INVOICE', 'PAYMENT', 'PARTY', 'ADJUSTMENT', 'OTHER_TXN'] 
  },
  refId: String, // ID of the referenced document
  refNo: String, // Reference number (invoice no, voucher no, etc.)
  
  // Financial amounts - double entry
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  
  // Description/narration
  narration: String,
  
  // Payment mode for cash flow tracking
  paymentMode: String, // 'cash', 'bank', 'upi', 'cheque', 'credit'
  
  // For reversal entries
  reversedEntryId: String,
  isReversal: { type: Boolean, default: false },
  
  // For tracking who created the entry
  createdBy: String,
  
  // Additional metadata
  metadata: {
    invoiceType: String, // SALES or PURCHASE
    balanceType: String, // DR or CR for opening balance
  }
}, { timestamps: true });

// Compound indexes for common queries
LedgerEntrySchema.index({ partyId: 1, date: 1 });
LedgerEntrySchema.index({ entryType: 1, date: 1 });
LedgerEntrySchema.index({ refType: 1, refId: 1 });
LedgerEntrySchema.index({ paymentMode: 1, date: 1 });

export default mongoose.models.LedgerEntry || mongoose.model('LedgerEntry', LedgerEntrySchema);
