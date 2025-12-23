import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '../../../lib/mongodb';
import User from '../../../lib/models/User';
import RolePermission from '../../../lib/models/RolePermission';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { username, password } = body;
    if (!username || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });

    const user = await User.findOne({ username }).lean();
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const stored = (user as any).password || '';
    let ok = false;
    // if stored looks like a bcrypt hash, use bcrypt.compare
    if (typeof stored === 'string' && stored.startsWith('$2')) {
      ok = await bcrypt.compare(password, stored);
    } else {
      ok = stored === password;
    }

    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    // Merge permissions: user-specific first, otherwise role defaults
    const DEFAULT_PERMS: Record<string, string[]> = {
      admin: ['*'],
      manager: ['dashboard', 'sales', 'purchase', 'parties', 'items', 'payments', 'reports', 'invoices', 'settings'],
      staff: ['dashboard', 'sales', 'purchase']
    };
    let mergedPerms: string[] = Array.isArray((user as any).permissions) ? (user as any).permissions : [];
    const roleKey = ((user as any).role || 'staff').toLowerCase();
    if (!mergedPerms.length) {
      // Try to load role-level permissions saved in RolePermission collection
      try {
        const rp = await RolePermission.findOne({ role: roleKey }).lean();
        if (rp && Array.isArray(rp.permissions) && rp.permissions.length) {
          mergedPerms = rp.permissions;
        } else {
          mergedPerms = DEFAULT_PERMS[roleKey] || [];
        }
      } catch (e) {
        mergedPerms = DEFAULT_PERMS[roleKey] || [];
      }
    }
    // As a guarantee, admins always get full access
    if (roleKey === 'admin') {
      mergedPerms = ['*'];
    }
    // Return minimal user info
    const safe = { id: (user as any)._id.toString(), username: user.username, name: user.name, role: user.role, permissions: mergedPerms };
    // Create a signed token valid for 24 hours
    const secret = process.env.JWT_SECRET || 'dev_secret_change_this';
    const token = jwt.sign({ id: safe.id, username: safe.username, role: safe.role, permissions: safe.permissions }, secret, { expiresIn: '24h' });

    const res = NextResponse.json({ success: true, user: safe, token });
    res.cookies.set('token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res;
  } catch (err) {
    console.error('Auth route error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
