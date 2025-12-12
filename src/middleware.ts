import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Avoid heavy JWT libs in edge; we'll decode payload without verification for routing decisions.

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/auth/password',
  '/api/auth/logout',
  '/favicon.ico'
];

const DEFAULT_PERMS: Record<string, string[]> = {
  admin: ['*'],
  manager: ['dashboard', 'sales', 'purchase', 'parties', 'items', 'payments', 'reports', 'invoices'],
  staff: ['dashboard', 'sales', 'purchase']
};

function pathToPermission(pathname: string): string | null {
  const map: Array<{ match: RegExp; perm: string }> = [
    { match: /^\/?admin\/(dashboard)?$/i, perm: 'dashboard' },
    { match: /^\/?admin\/sales/i, perm: 'sales' },
    { match: /^\/?admin\/purchase/i, perm: 'purchase' },
    { match: /^\/?admin\/invoice/i, perm: 'invoices' },
    { match: /^\/?admin\/items/i, perm: 'items' },
    { match: /^\/?admin\/parties/i, perm: 'parties' },
    { match: /^\/?admin\/payments/i, perm: 'payments' },
    { match: /^\/?admin\/reports/i, perm: 'reports' },
    { match: /^\/?admin\/settings/i, perm: 'settings' },
    // APIs
    { match: /^\/?api\/invoices/i, perm: 'invoices' },
    { match: /^\/?api\/items/i, perm: 'items' },
    { match: /^\/?api\/parties/i, perm: 'parties' },
    { match: /^\/?api\/payments/i, perm: 'payments' },
    { match: /^\/?api\/reports/i, perm: 'reports' },
    { match: /^\/?api\/dashboard/i, perm: 'dashboard' },
  ];
  for (const m of map) {
    if (m.match.test(pathname)) return m.perm;
  }
  return null;
}

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const json = atob(parts[1]);
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static and _next files
  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) return NextResponse.next();
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  // Allow public file extensions
  if (pathname.match(/\.(.*)$/)) return NextResponse.next();

  const token = req.cookies.get('token')?.value;
  if (!token) {
    // API unauthenticated -> 401
    if (pathname.startsWith('/api')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const payload = decodeJwtPayload(token);
  const role = (payload?.role || 'staff').toLowerCase();
  const tokenPerms: string[] = Array.isArray(payload?.permissions) ? payload.permissions : [];
  const perms: string[] = role === 'admin' ? ['*'] : (tokenPerms.length ? tokenPerms : (DEFAULT_PERMS[role] || []));

  const needed = pathToPermission(pathname);
  const allowed = perms.includes('*') || (needed ? perms.includes(needed) : true);
  if (!allowed) {
    if (pathname.startsWith('/api')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next|static).*)',
};
