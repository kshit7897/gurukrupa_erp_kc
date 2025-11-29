import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../lib/models/User';
import bcrypt from 'bcryptjs';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const body = await request.json();
    // Accept id from params or body (id, _id) or username as fallback
    const paramId = params?.id;
    const bodyId = (body && (body.id || body._id)) || null;
    const usernameFallback = body && body.username ? body.username : null;
    const id = paramId || bodyId || null;

    // Try to find user by id first, then by username
    let user = null as any;
    if (id) user = await User.findById(id);
    if (!user && usernameFallback) user = await User.findOne({ username: usernameFallback });
    if (!user) return NextResponse.json({ error: `User not found (searched id: ${id || 'none'}, username: ${usernameFallback || 'none'})` }, { status: 404 });
    const { name, role, password } = body;
    if (typeof name === 'string') user.name = name;
    if (typeof role === 'string') user.role = role;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      user.password = hashed;
    }
    await user.save();
    const safe = { id: (user as any)._id.toString(), username: user.username, name: user.name, role: user.role };
    return NextResponse.json({ success: true, user: safe });
  } catch (err) {
    console.error('Users PUT error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const paramId = params?.id;
    const bodyId = (body && (body.id || body._id)) || null;
    const usernameFallback = body && body.username ? body.username : null;
    const id = paramId || bodyId || null;

    let user = null as any;
    if (id) user = await User.findById(id);
    if (!user && usernameFallback) user = await User.findOne({ username: usernameFallback });
    if (!user) return NextResponse.json({ error: `User not found (searched id: ${id || 'none'}, username: ${usernameFallback || 'none'})` }, { status: 404 });
    await User.deleteOne({ _id: user._id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Users DELETE error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
