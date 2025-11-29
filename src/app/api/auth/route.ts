import { NextResponse } from 'next/server';
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
    return NextResponse.json({ success: true, user: safe });
  } catch (err) {
    console.error('Auth route error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
