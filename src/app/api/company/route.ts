import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Company from '../../../lib/models/Company';

export async function GET() {
  try {
    await dbConnect();
    // Return the first company document (single-tenant app)
    const company = await Company.findOne().lean();
    if (!company) return NextResponse.json({ success: true, company: null });
    return NextResponse.json({ success: true, company: { ...(company as any), id: (company as any)._id.toString() } });
  } catch (err) {
    console.error('Company GET error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    // Upsert single company document
    const opts = { upsert: true, new: true, setDefaultsOnInsert: true } as any;
    const updated = await Company.findOneAndUpdate({}, body, opts).lean();
    return NextResponse.json({ success: true, company: { ...(updated as any), id: (updated as any)._id.toString() } });
  } catch (err) {
    console.error('Company PUT error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
