import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../lib/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { username, currentPassword, newPassword } = body;
    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const user = await User.findOne({ username }).exec();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const stored = user.password || '';
    let match = false;
    // Support both hashed and plaintext (legacy) passwords
    if (stored.startsWith('$2')) {
      match = await bcrypt.compare(currentPassword, stored);
    } else {
      match = stored === currentPassword;
    }

    if (!match) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Change password error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
