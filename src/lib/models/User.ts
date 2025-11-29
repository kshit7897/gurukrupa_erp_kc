import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // plaintext for dev; replace with hashed in production
  name: String,
  email: String,
  role: { type: String, default: 'admin' }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
