import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const res = NextResponse.json({ success: true });
    // Clear cookie by setting maxAge to 0
    res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    console.error('Auth logout error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
