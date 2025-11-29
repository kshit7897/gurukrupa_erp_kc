import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '../../../lib/mongodb';
import User from '../../../lib/models/User';
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

    // Return minimal user info
    const safe = { id: (user as any)._id.toString(), username: user.username, name: user.name, role: user.role };
    // Create a signed token valid for 24 hours
    const secret = process.env.JWT_SECRET || 'dev_secret_change_this';
    const token = jwt.sign({ id: safe.id, username: safe.username, role: safe.role }, secret, { expiresIn: '24h' });

    const res = NextResponse.json({ success: true, user: safe });
    res.cookies.set('token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res;
  } catch (err) {
    console.error('Auth route error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
