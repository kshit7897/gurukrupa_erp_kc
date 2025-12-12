import mongoose from 'mongoose';

const RolePermissionSchema = new mongoose.Schema({
  role: { type: String, required: true, unique: true },
  permissions: { type: [String], default: [] }
}, { timestamps: true });

export default mongoose.models.RolePermission || mongoose.model('RolePermission', RolePermissionSchema);
