#!/usr/bin/env node
/**
 * One-off script to update a user's password in MongoDB.
 * Usage:
 *  - Ensure `MONGODB_URI` is set in `.env.local` or pass URI as the first arg.
 *  - Run:
 *      node scripts/set-password.js --username 8141568451 --password admin123
 *  - Or by id:
 *      node scripts/set-password.js --id 692ad2dd1d5996732a63da5a --password admin123
 *
 * NOTE: This script will hash the password with bcrypt and update the user document.
 * Do not commit credentials. Run locally where `.env.local` is present.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--username' || a === '-u') out.username = args[i+1], i++;
    else if (a === '--id' || a === '-i') out.id = args[i+1], i++;
    else if (a === '--password' || a === '-p') out.password = args[i+1], i++;
    else if (a === '--uri') out.uri = args[i+1], i++;
  }
  return out;
}

async function main() {
  const { username, id, password, uri } = parseArgs();
  const mongoUri = process.env.MONGODB_URI || uri || process.argv[2];
  if (!mongoUri) {
    console.error('ERROR: Provide MongoDB URI via MONGODB_URI env var, --uri, or as first arg.');
    process.exit(1);
  }
  if (!password) {
    console.error('ERROR: Provide --password <newpassword>');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName: new URL(mongoUri).searchParams.get('authSource') || undefined });
    console.log('Connected.');

    // Use existing User model if defined, else create minimal one
    let User;
    try { User = mongoose.model('User'); } catch (e) {
      const schema = new mongoose.Schema({ username: String, password: String, name: String, role: String, email: String }, { timestamps: true });
      User = mongoose.model('User', schema);
    }

    let user = null;
    if (id) user = await User.findById(id);
    if (!user && username) user = await User.findOne({ username });
    if (!user) {
      console.error('User not found. Provide correct --id or --username.');
      process.exit(2);
    }

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    await user.save();
    console.log(`Success: Updated password for user ${user.username} (id: ${user._id}).`);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(3);
  } finally {
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(0);
  }
}

main();
