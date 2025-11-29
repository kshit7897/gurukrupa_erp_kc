import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Invoice from '../../../lib/models/Invoice';

export async function GET() {
  await dbConnect();
  const invoices = await Invoice.find({}).sort({ createdAt: -1 });
  const formatted = invoices.map(doc => ({ ...(doc as any).toObject(), id: (doc as any)._id.toString() }));
  return NextResponse.json(formatted);
}

export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json();
  const invoice = await Invoice.create(body);
  return NextResponse.json({ ...(invoice as any).toObject(), id: (invoice as any)._id.toString() });
}