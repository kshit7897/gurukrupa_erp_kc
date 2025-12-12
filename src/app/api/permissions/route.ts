import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import RolePermission from '../../../lib/models/RolePermission';

const DEFAULTS: Record<string, string[]> = {
  admin: ['*'],
  manager: ['dashboard', 'sales', 'purchase', 'parties', 'items', 'payments', 'reports', 'invoices'],
  staff: ['dashboard', 'sales', 'purchase']
};

export async function GET(request: Request) {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const role = (url.searchParams.get('role') || 'staff').toLowerCase();
    const doc = await RolePermission.findOne({ role }).lean();
    const permissions = doc?.permissions?.length ? doc.permissions : (DEFAULTS[role] || []);
    return NextResponse.json({ role, permissions });
  } catch (err: any) {
    console.error('GET /api/permissions error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const role = (body.role || '').toLowerCase();
    const permissions = Array.isArray(body.permissions) ? body.permissions.map((p: any) => String(p)) : [];
    if (!role) return NextResponse.json({ error: 'role is required' }, { status: 400 });
    const doc = await RolePermission.findOneAndUpdate(
      { role },
      { permissions },
      { new: true, upsert: true }
    );
    return NextResponse.json({ role: doc.role, permissions: doc.permissions });
  } catch (err: any) {
    console.error('PUT /api/permissions error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
