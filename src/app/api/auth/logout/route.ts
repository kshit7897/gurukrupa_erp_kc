import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const res = NextResponse.json({ success: true });
    // Clear all auth cookies
    res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 });
    res.cookies.set('activeCompanyId', '', { httpOnly: false, path: '/', maxAge: 0 });
    res.cookies.set('activeCompanyName', '', { httpOnly: false, path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    console.error('Auth logout error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: any) {
  const url = req.nextUrl.clone();
  url.pathname = '/login';

  const res = NextResponse.redirect(url);
  // Clear all auth cookies
  res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set('activeCompanyId', '', { httpOnly: false, path: '/', maxAge: 0 });
  res.cookies.set('activeCompanyName', '', { httpOnly: false, path: '/', maxAge: 0 });
  return res;
}
