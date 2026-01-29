/* eslint-disable no-console */
/**
 * Fix missing UserCompanyAccess mappings.
 *
 * - Ensures every non-admin user has at least one active company mapping.
 * - Uses the first active company (or first company) as the default assignment.
 * - Permissions come from:
 *    1) existing user.permissions (if any)
 *    2) rolepermissions.permissions for that role
 *    3) fallback defaults for the role
 *
 * Usage:
 *   node scripts/fix-user-company-access.js
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

const DEFAULT_PERMS = {
  admin: ["*"],
  manager: ["dashboard", "sales", "purchase", "parties", "items", "payments", "reports", "invoices", "settings"],
  staff: ["dashboard", "sales", "purchase"],
};

async function main() {
  const uri = readMongoUri();
  if (!uri) throw new Error("Missing MONGODB_URI (set env var or create .env.local)");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const companies = await db.collection("companies").find({}).project({ isActive: 1, name: 1 }).toArray();
  const targetCompany = companies.find((c) => c.isActive !== false) || companies[0];
  if (!targetCompany) throw new Error("No companies found in DB");

  const rolePermissions = await db.collection("rolepermissions").find({}).project({ role: 1, permissions: 1 }).toArray();
  const rolePermMap = new Map(rolePermissions.map((rp) => [String(rp.role || "").toLowerCase(), Array.isArray(rp.permissions) ? rp.permissions : []]));

  const users = await db.collection("users").find({}).project({ username: 1, role: 1, permissions: 1 }).toArray();

  const created = [];
  const skipped = [];

  for (const u of users) {
    const userId = String(u._id);
    const roleKey = String(u.role || "staff").toLowerCase();

    // Ensure at least one active mapping exists for this user
    const existingAny = await db.collection("usercompanyaccesses").findOne({ userId, isActive: true });
    if (existingAny) {
      skipped.push({ userId, username: u.username, reason: "already-has-active-mapping" });
      continue;
    }

    // Admins get auto-created mappings on login, but we still create a default mapping for consistency
    const permsFromUser = Array.isArray(u.permissions) ? u.permissions : [];
    const permsFromRole = rolePermMap.get(roleKey) || [];
    const perms = roleKey === "admin" ? ["*"] : (permsFromUser.length ? permsFromUser : (permsFromRole.length ? permsFromRole : (DEFAULT_PERMS[roleKey] || [])));

    const doc = {
      userId,
      companyId: String(targetCompany._id),
      role: roleKey,
      permissions: perms,
      isActive: true,
      isDefault: true,
      grantedAt: new Date(),
    };

    try {
      await db.collection("usercompanyaccesses").insertOne(doc);
      created.push({ userId, username: u.username, companyId: doc.companyId, role: doc.role, permissions: doc.permissions });
    } catch (e) {
      // If unique index exists and there is an inactive mapping, try to revive it.
      const existing = await db.collection("usercompanyaccesses").findOne({ userId, companyId: doc.companyId });
      if (existing) {
        await db.collection("usercompanyaccesses").updateOne(
          { _id: existing._id },
          { $set: { isActive: true, isDefault: true, role: doc.role, permissions: doc.permissions } }
        );
        created.push({ userId, username: u.username, companyId: doc.companyId, role: doc.role, permissions: doc.permissions, revived: true });
      } else {
        throw e;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        companyAssigned: { id: String(targetCompany._id), name: targetCompany.name },
        createdCount: created.length,
        skippedCount: skipped.length,
        created,
        skipped,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

