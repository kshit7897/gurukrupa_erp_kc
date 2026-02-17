import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../lib/models/User';
import UserCompanyAccess from '../../../../lib/models/UserCompanyAccess';
import RolePermission from '../../../../lib/models/RolePermission';

const DEFAULT_PERMS: Record<string, string[]> = {
  admin: ['*'],
  manager: ['dashboard', 'sales', 'purchase', 'parties', 'items', 'payments', 'reports', 'invoices', 'settings'],
  staff: ['dashboard', 'sales', 'purchase'],
};

export async function POST(req: NextRequest) {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_this';
  const token = req.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
  }

  await dbConnect();

  const userId = String(payload?.id || '');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user: any = await User.findById(userId).lean();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRoleKey = String(user.role || 'staff').toLowerCase();

  const activeCompanyId = req.cookies.get('activeCompanyId')?.value || payload?.activeCompanyId;
  if (!activeCompanyId) {
    return NextResponse.json({ error: 'No company selected', code: 'NO_COMPANY' }, { status: 400 });
  }

  // Compute company-scoped role + permissions
  let companyRole = userRoleKey;
  let permissions: string[] = [];

  if (userRoleKey === 'admin') {
    companyRole = 'admin';
    permissions = ['*'];
  } else {
    const access: any = await UserCompanyAccess.findOne({ userId, companyId: activeCompanyId, isActive: true }).lean();
    if (!access) {
      return NextResponse.json({ error: 'No access to this company', code: 'NO_COMPANY_ACCESS' }, { status: 403 });
    }
    companyRole = String(access.role || userRoleKey).toLowerCase();
    permissions = Array.isArray(access.permissions) ? access.permissions : [];

    if (!permissions.length) {
      // fallback: user-level permissions -> role permissions -> defaults
      const userPerms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
      if (userPerms.length) {
        permissions = userPerms;
      } else {
        const rp: any = await RolePermission.findOne({ role: companyRole }).lean();
        if (rp && Array.isArray(rp.permissions) && rp.permissions.length) {
          permissions = rp.permissions;
        } else {
          permissions = DEFAULT_PERMS[companyRole] || [];
        }
      }
    }
  }

  if (companyRole === 'admin') permissions = ['*'];

  const newToken = jwt.sign(
    {
      id: userId,
      username: user.username,
      role: companyRole,
      permissions,
      activeCompanyId,
    },
    secret,
    { expiresIn: '365d' }
  );

  const safeUser = {
    id: userId,
    username: user.username,
    name: user.name,
    role: companyRole,
    permissions,
  };

  const res = NextResponse.json({ success: true, token: newToken, user: safeUser, activeCompanyId });
  res.cookies.set('token', newToken, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return res;
}

