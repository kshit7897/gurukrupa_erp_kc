/* eslint-disable no-console */
/**
 * DB audit for auth + multi-company consistency.
 *
 * Usage:
 *   node scripts/audit-db.js
 *   (reads MONGODB_URI from process.env or .env.local)
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function readMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return null;
  const env = fs.readFileSync(p, "utf8");
  const m = env.match(/^MONGODB_URI=(.*)$/m);
  return m ? m[1].trim() : null;
}

function compactId(x) {
  try {
    return String(x);
  } catch {
    return "";
  }
}

async function main() {
  const uri = readMongoUri();
  if (!uri) throw new Error("Missing MONGODB_URI (set env var or create .env.local)");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const [users, access, companies, rolePermissions] = await Promise.all([
    db
      .collection("users")
      .find({})
      .project({ username: 1, role: 1, permissions: 1 })
      .toArray(),
    db
      .collection("usercompanyaccesses")
      .find({})
      .project({ userId: 1, companyId: 1, role: 1, permissions: 1, isActive: 1, isDefault: 1 })
      .toArray(),
    db.collection("companies").find({}).project({ name: 1, isActive: 1 }).toArray(),
    db.collection("rolepermissions").find({}).project({ role: 1, permissions: 1 }).toArray(),
  ]);

  const [invoiceCountsByCompanyId, duplicateUserCompanyAccessPairs] = await Promise.all([
    db
      .collection("invoices")
      .aggregate([{ $group: { _id: "$companyId", count: { $sum: 1 } } }])
      .toArray(),
    db
      .collection("usercompanyaccesses")
      .aggregate([
        { $group: { _id: { userId: "$userId", companyId: "$companyId" }, n: { $sum: 1 }, ids: { $push: "$_id" } } },
        { $match: { n: { $gt: 1 } } },
      ])
      .toArray(),
  ]);

  const output = {
    users: users.map((u) => ({
      id: compactId(u._id),
      username: u.username,
      role: u.role,
      permissions: Array.isArray(u.permissions) ? u.permissions : u.permissions ?? null,
    })),
    rolePermissions: rolePermissions.map((rp) => ({
      id: compactId(rp._id),
      role: rp.role,
      permissions: Array.isArray(rp.permissions) ? rp.permissions : rp.permissions ?? null,
    })),
    companies: companies.map((c) => ({
      id: compactId(c._id),
      name: c.name,
      isActive: c.isActive,
    })),
    userCompanyAccesses: access.map((a) => ({
      id: compactId(a._id),
      userId: a.userId,
      companyId: a.companyId,
      role: a.role,
      permissions: Array.isArray(a.permissions) ? a.permissions : a.permissions ?? null,
      isActive: a.isActive,
      isDefault: a.isDefault,
    })),
    invoiceCountsByCompanyId: invoiceCountsByCompanyId.map((x) => ({
      companyId: x._id,
      count: x.count,
    })),
    duplicateUserCompanyAccessPairs: duplicateUserCompanyAccessPairs.map((d) => ({
      userId: d._id?.userId,
      companyId: d._id?.companyId,
      n: d.n,
      ids: (d.ids || []).map(compactId),
    })),
  };

  console.log(JSON.stringify(output, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

