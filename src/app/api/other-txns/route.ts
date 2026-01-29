import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import OtherTxn from '../../../lib/models/OtherTxn';
import { getCompanyContextFromRequest } from '../../../lib/companyContext';

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const kind = url.searchParams.get('kind');
    
    // Company scope filter
    const q: any = { companyId };
    if (kind === 'income' || kind === 'expense') q.kind = kind;
    if (from && to) {
      q.date = { $gte: from, $lte: to };
    }
    const items = await OtherTxn.find(q).sort({ date: -1, createdAt: -1 }).lean();
    return NextResponse.json(items.map((t: any) => ({ ...(t as any), id: t._id?.toString() })));
  } catch (err: any) {
    console.error('GET /api/other-txns error', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const body = await request.json();
    if (!body.kind || !body.date || typeof body.amount !== 'number') {
      return NextResponse.json({ error: 'kind, date, amount required' }, { status: 400 });
    }
    const doc = await OtherTxn.create({ ...body, companyId }); // Add company scope
    return NextResponse.json({ ...(doc as any).toObject(), id: (doc as any)._id.toString() });
  } catch (err: any) {
    console.error('POST /api/other-txns error', err);
    return NextResponse.json({ error: err?.message || 'Failed to create' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const body = await request.json();
    const { id, _id, ...data } = body;
    const targetId = id || _id;
    if (!targetId) return NextResponse.json({ error: 'id required' }, { status: 400 });
    
    // Verify record belongs to this company
    const existing = await OtherTxn.findOne({ 
      _id: targetId, 
      companyId
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Migrate legacy data
    if (!existing.companyId) {
      data.companyId = companyId;
    }
    
    const doc = await OtherTxn.findByIdAndUpdate(targetId, data, { new: true });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ...(doc as any).toObject(), id: (doc as any)._id.toString() });
  } catch (err: any) {
    console.error('PUT /api/other-txns error', err);
    return NextResponse.json({ error: err?.message || 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    
    // Verify record belongs to this company
    const existing = await OtherTxn.findOne({ 
      _id: id, 
      companyId
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    await OtherTxn.findByIdAndDelete(id);
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error('DELETE /api/other-txns error', err);
    return NextResponse.json({ error: err?.message || 'Failed to delete' }, { status: 500 });
  }
}
