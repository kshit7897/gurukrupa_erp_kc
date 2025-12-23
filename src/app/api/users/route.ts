import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import User from '../../../lib/models/User';
import RolePermission from '../../../lib/models/RolePermission';
// default perms used if role-level doc missing
const DEFAULT_PERMS: Record<string, string[]> = {
  admin: ['*'],
  manager: ['dashboard', 'sales', 'purchase', 'parties', 'items', 'payments', 'reports', 'invoices', 'settings'],
  staff: ['dashboard', 'sales', 'purchase']
};
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await dbConnect();
    const users = await User.find().lean();
    const safe = users.map(u => ({ id: (u as any)._id.toString(), username: u.username, email: (u as any).email || null, name: u.name, role: u.role, permissions: (u as any).permissions || [], createdAt: u.createdAt }));
    return NextResponse.json({ success: true, users: safe });
  } catch (err) {
    console.error('Users GET error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { username, password, name, role, email, permissions } = body;
    if (!username || !password || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const exists = await User.findOne({ username }).lean();
    if (exists) return NextResponse.json({ error: 'Username already exists' }, { status: 409 });

    const hashed = await bcrypt.hash(password, 10);
    let permsToSave: string[] = [];
    if (Array.isArray(permissions) && permissions.length) {
      permsToSave = permissions.map((p: any) => String(p));
    } else {
      // No explicit permissions passed -> inherit role-level permissions if available
      const roleKey = (role || 'staff').toLowerCase();
      try {
        const rp = await RolePermission.findOne({ role: roleKey }).lean();
        if (rp && Array.isArray(rp.permissions) && rp.permissions.length) permsToSave = rp.permissions;
        else permsToSave = DEFAULT_PERMS[roleKey] || [];
      } catch (e) {
        permsToSave = DEFAULT_PERMS[roleKey] || [];
      }
    }
    const user = await User.create({ username, password: hashed, name: name || '', role, email: email || null, permissions: permsToSave });
    const safe = { id: (user as any)._id.toString(), username: user.username, email: (user as any).email || null, name: user.name, role: user.role, permissions: (user as any).permissions || [] };
    return NextResponse.json({ success: true, user: safe });
  } catch (err) {
    console.error('Users POST error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
