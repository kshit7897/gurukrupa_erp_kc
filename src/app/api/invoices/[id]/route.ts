import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Invoice from '../../../../lib/models/Invoice';
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  
  try {
    const params = await props.params;
    // validate id to avoid CastError when non-objectId segments (like 'list') are requested
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid Invoice ID' }, { status: 404 });
    }
    const invoice = await Invoice.findById(params.id);
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ...(invoice as any).toObject(), id: (invoice as any)._id.toString() });
  } catch (error) {
    console.error("Invoice API Error:", error);
    return NextResponse.json({ error: 'Invalid Invoice ID or Not Found' }, { status: 404 });
  }
}