import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/auth/password',
  '/api/auth/logout',
  '/favicon.ico'
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static and _next files
  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) return NextResponse.next();
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  // Allow public file extensions
  if (pathname.match(/\.(.*)$/)) return NextResponse.next();

  const token = req.cookies.get('token')?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next|api|static).*)',
};
