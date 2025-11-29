import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Party from '../../../lib/models/Party';

export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const party = await Party.findById(id);
      if (!party) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
      }
      return NextResponse.json({ ...(party as any).toObject(), id: (party as any)._id.toString() });
    }

    const parties = await Party.find({}).sort({ createdAt: -1 });
    const formatted = parties.map(doc => ({ ...(doc as any).toObject(), id: (doc as any)._id.toString() }));
    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Party API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const party = await Party.create(body);
    return NextResponse.json({ ...(party as any).toObject(), id: (party as any)._id.toString() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create party' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, ...updateData } = body;
    const party = await Party.findByIdAndUpdate(id, updateData, { new: true });
    if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    return NextResponse.json({ ...(party as any).toObject(), id: (party as any)._id.toString() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update party' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await Party.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete party' }, { status: 500 });
  }
}