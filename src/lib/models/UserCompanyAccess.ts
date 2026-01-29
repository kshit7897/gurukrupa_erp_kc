import mongoose from 'mongoose';

/**
 * UserCompanyAccess model for managing user access to companies
 * 
 * A user can belong to MULTIPLE companies with DIFFERENT roles per company.
 * Permissions are evaluated as (user + company) combination.
 */

const UserCompanyAccessSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  companyId: { type: String, required: true, index: true },
  
  // Role for this user in this specific company
  role: { type: String, required: true, default: 'staff' },
  
  // Company-specific permissions (overrides role defaults if provided)
  permissions: [{ type: String }],
  
  // Whether this is the user's default company
  isDefault: { type: Boolean, default: false },
  
  // Access status
  isActive: { type: Boolean, default: true },
  
  // Who granted access
  grantedBy: { type: String },
  grantedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index for unique user-company combination
UserCompanyAccessSchema.index({ userId: 1, companyId: 1 }, { unique: true });

// Index for finding all users of a company
UserCompanyAccessSchema.index({ companyId: 1, isActive: 1 });

// Index for finding all companies of a user
UserCompanyAccessSchema.index({ userId: 1, isActive: 1 });

export default mongoose.models.UserCompanyAccess || mongoose.model('UserCompanyAccess', UserCompanyAccessSchema);
