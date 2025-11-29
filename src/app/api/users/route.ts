import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import User from '../../../lib/models/User';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await dbConnect();
    const users = await User.find().lean();
    const safe = users.map(u => ({ id: (u as any)._id.toString(), username: u.username, name: u.name, role: u.role, createdAt: u.createdAt }));
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
    const { username, password, name, role } = body;
    if (!username || !password || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const exists = await User.findOne({ username }).lean();
    if (exists) return NextResponse.json({ error: 'Username already exists' }, { status: 409 });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed, name: name || '', role });
    const safe = { id: (user as any)._id.toString(), username: user.username, name: user.name, role: user.role };
    return NextResponse.json({ success: true, user: safe });
  } catch (err) {
    console.error('Users POST error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
