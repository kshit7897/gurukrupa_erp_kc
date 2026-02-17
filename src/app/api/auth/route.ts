import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '../../../lib/mongodb';
import User from '../../../lib/models/User';
import RolePermission from '../../../lib/models/RolePermission';
import Company from '../../../lib/models/Company';
import UserCompanyAccess from '../../../lib/models/UserCompanyAccess';
import bcrypt from 'bcryptjs';

const DEFAULT_PERMS: Record<string, string[]> = {
  admin: ['*'],
  manager: ['dashboard', 'sales', 'purchase', 'parties', 'items', 'payments', 'reports', 'invoices', 'settings'],
  staff: ['dashboard', 'sales', 'purchase']
};

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { username, password, action, companyId } = body;

    // Handle company selection action
    if (action === 'selectCompany') {
      return handleCompanySelection(body);
    }

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

    const userId = (user as any)._id.toString();
    const roleKey = ((user as any).role || 'staff').toLowerCase();

    // Get companies user has access to
    let companies: any[] = [];
    let userCompanyAccess: any[] = [];

    // For admin users, grant access to all companies automatically
    if (roleKey === 'admin') {
      companies = await Company.find({ isActive: { $ne: false } }).lean();
      // Ensure admin has access records for all companies
      for (const company of companies) {
        const companyIdStr = (company as any)._id.toString();
        const existing = await UserCompanyAccess.findOne({ userId, companyId: companyIdStr });
        if (!existing) {
          await UserCompanyAccess.create({
            userId,
            companyId: companyIdStr,
            role: 'admin',
            permissions: ['*'],
            isActive: true
          });
        }
      }
      userCompanyAccess = await UserCompanyAccess.find({ userId, isActive: true }).lean();
    } else {
      // For non-admin users, only show companies they have explicit access to
      userCompanyAccess = await UserCompanyAccess.find({ userId, isActive: true }).lean();
      const companyIds = userCompanyAccess.map((a: any) => a.companyId);
      if (companyIds.length > 0) {
        const { default: mongoose } = await import('mongoose');
        companies = await Company.find({
          _id: { $in: companyIds.map(id => new mongoose.Types.ObjectId(id)) },
          isActive: { $ne: false }
        }).lean();
      }
    }

    // Format companies for response
    const formattedCompanies = companies.map((c: any) => {
      const access = userCompanyAccess.find((a: any) => a.companyId === c._id.toString());
      return {
        id: c._id.toString(),
        name: c.name,
        role: access?.role || roleKey,
        isDefault: access?.isDefault || false
      };
    });

    // Get user-level permissions
    let mergedPerms: string[] = Array.isArray((user as any).permissions) ? (user as any).permissions : [];
    if (!mergedPerms.length) {
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
    if (roleKey === 'admin') {
      mergedPerms = ['*'];
    }

    // Create token (without company - user must select company next)
    const safe = {
      id: userId,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: mergedPerms
    };
    const secret = process.env.JWT_SECRET || 'dev_secret_change_this';
    const token = jwt.sign({
      id: safe.id,
      username: safe.username,
      role: safe.role,
      permissions: safe.permissions
    }, secret, { expiresIn: '365d' });

    const res = NextResponse.json({
      success: true,
      user: safe,
      token,
      companies: formattedCompanies,
      requireCompanySelection: formattedCompanies.length !== 1,
      // If only one company, auto-select it
      autoSelectedCompany: formattedCompanies.length === 1 ? formattedCompanies[0] : null
    });

    res.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year 
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    // If only one company, auto-select it
    if (formattedCompanies.length === 1) {
      res.cookies.set('activeCompanyId', formattedCompanies[0].id, {
        httpOnly: false, // Accessible to JS for UI
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      res.cookies.set('activeCompanyName', formattedCompanies[0].name, {
        httpOnly: false,
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
    }

    return res;
  } catch (err) {
    console.error('Auth route error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function handleCompanySelection(body: any) {
  const { userId, companyId } = body;

  if (!userId || !companyId) {
    return NextResponse.json({ error: 'Missing userId or companyId' }, { status: 400 });
  }

  await dbConnect();

  // Verify user exists
  const user = await User.findById(userId).lean();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Verify company exists and is active
  const company = await Company.findById(companyId).lean();
  if (!company || (company as any).isActive === false) {
    return NextResponse.json({ error: 'Company not found or inactive' }, { status: 404 });
  }

  const roleKey = ((user as any).role || 'staff').toLowerCase();

  // Verify user has access to this company (admins have access to all)
  if (roleKey !== 'admin') {
    const access = await UserCompanyAccess.findOne({
      userId,
      companyId,
      isActive: true
    });
    if (!access) {
      return NextResponse.json({ error: 'No access to this company' }, { status: 403 });
    }
  }

  // Get company-specific permissions
  const access = await UserCompanyAccess.findOne({ userId, companyId }).lean();
  let companyPermissions = access?.permissions || [];
  let companyRole = access?.role || roleKey;

  if (!companyPermissions.length) {
    companyPermissions = DEFAULT_PERMS[companyRole] || [];
  }
  if (companyRole === 'admin' || roleKey === 'admin') {
    companyPermissions = ['*'];
  }

  // Create new token with company context
  const secret = process.env.JWT_SECRET || 'dev_secret_change_this';
  const token = jwt.sign({
    id: userId,
    username: (user as any).username,
    role: companyRole,
    permissions: companyPermissions,
    activeCompanyId: companyId
  }, secret, { expiresIn: '365d' });

  const res = NextResponse.json({
    success: true,
    company: {
      id: companyId,
      name: (company as any).name
    },
    role: companyRole,
    permissions: companyPermissions
  });

  res.cookies.set('token', token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  res.cookies.set('activeCompanyId', companyId, {
    httpOnly: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  res.cookies.set('activeCompanyName', (company as any).name, {
    httpOnly: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  return res;
}
