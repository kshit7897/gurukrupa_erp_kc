const mongoose = require('mongoose');

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const candidates = ['.env.local', '.env'];
  for (const file of candidates) {
    const p = path.join(process.cwd(), file);
    if (fs.existsSync(p)) {
      const txt = fs.readFileSync(p, 'utf8');
      txt.split(/\r?\n/).forEach(line => {
        const m = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
        if (m) {
          const key = m[1].trim();
          const val = m[2].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      });
    }
  }
}

loadEnv();

// Lightweight schemas to avoid TS imports
const User = mongoose.model('User', new mongoose.Schema({ role: String, permissions: [String] }, { collection: 'users' }));
const RolePermission = mongoose.model('RolePermission', new mongoose.Schema({ role: { type: String, unique: true }, permissions: [String] }, { collection: 'rolepermissions' }));

(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
    await mongoose.connect(process.env.MONGODB_URI);
    const res1 = await User.updateMany({ role: 'admin' }, { $set: { permissions: ['*'] } });
    const res2 = await RolePermission.updateMany({ role: 'admin' }, { $set: { permissions: ['*'] } }, { upsert: true });
    console.log({ updatedAdmins: res1.modifiedCount ?? res1.matchedCount, rolePermUpserted: res2.modifiedCount ?? res2.matchedCount });
  } catch (e) {
    console.error('Error updating admin permissions:', e);
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
