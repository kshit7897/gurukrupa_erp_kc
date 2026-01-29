import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Company from '../../../lib/models/Company';
import UserCompanyAccess from '../../../lib/models/UserCompanyAccess';
import User from '../../../lib/models/User';
import jwt from 'jsonwebtoken';

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function getUserFromRequest(request: Request): { userId: string | null; role: string } {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );
  
  const token = cookies['token'];
  if (!token) return { userId: null, role: 'staff' };
  
  const payload = decodeJwtPayload(token);
  return {
    userId: payload?.id || null,
    role: (payload?.role || 'staff').toLowerCase()
  };
}

// GET: List companies user has access to, or get single company by ID
export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const forSelection = searchParams.get('forSelection') === 'true';
    
    const { userId, role } = getUserFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get single company by ID
    if (id) {
      const company = await Company.findById(id).lean();
      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
      
      // Check access (admins have access to all)
      if (role !== 'admin') {
        const access = await UserCompanyAccess.findOne({ userId, companyId: id, isActive: true });
        if (!access) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }
      
      return NextResponse.json({ ...(company as any), id: (company as any)._id.toString() });
    }
    
    // List companies for selection page
    if (forSelection) {
      let companies: any[] = [];
      let userCompanyAccess: any[] = [];
      
      if (role === 'admin') {
        // Admins see all active companies
        companies = await Company.find({ isActive: { $ne: false } }).lean();
        userCompanyAccess = await UserCompanyAccess.find({ userId, isActive: true }).lean();
      } else {
        // Other users only see companies they have access to
        userCompanyAccess = await UserCompanyAccess.find({ userId, isActive: true }).lean();
        const companyIds = userCompanyAccess.map((a: any) => a.companyId);
        if (companyIds.length > 0) {
          const mongoose = (await import('mongoose')).default;
          companies = await Company.find({
            _id: { $in: companyIds.map(cid => new mongoose.Types.ObjectId(cid)) },
            isActive: { $ne: false }
          }).lean();
        }
      }
      
      const formattedCompanies = companies.map((c: any) => {
        const access = userCompanyAccess.find((a: any) => a.companyId === c._id.toString());
        return {
          id: c._id.toString(),
          name: c.name,
          gstNumber: c.gstNumber || c.gstin,
          city: c.city,
          role: access?.role || role,
          isDefault: access?.isDefault || false
        };
      });
      
      return NextResponse.json({
        companies: formattedCompanies,
        userId,
        userRole: role
      });
    }
    
    // Default: list all companies (for admin management)
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const companies = await Company.find({ isActive: { $ne: false } }).lean();
    const formatted = companies.map((c: any) => ({
      ...c,
      id: c._id.toString()
    }));
    
    return NextResponse.json(formatted);
  } catch (err) {
    console.error('GET /api/companies error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Create new company
export async function POST(request: Request) {
  try {
    await dbConnect();
    const { userId, role } = getUserFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }
    
    // Create company
    const company = await Company.create({
      ...body,
      createdBy: userId,
      isActive: true
    });
    
    const companyId = (company as any)._id.toString();
    
    // Grant creator admin access to the company
    await UserCompanyAccess.create({
      userId,
      companyId,
      role: 'admin',
      permissions: ['*'],
      isDefault: true, // First company created by user is their default
      isActive: true,
      grantedBy: userId
    });
    
    return NextResponse.json({
      success: true,
      company: {
        ...(company as any).toObject(),
        id: companyId
      }
    });
  } catch (err) {
    console.error('POST /api/companies error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT: Update company
export async function PUT(request: Request) {
  try {
    await dbConnect();
    const { userId, role } = getUserFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }
    
    // Check access
    if (role !== 'admin') {
      const access = await UserCompanyAccess.findOne({ userId, companyId: id, isActive: true });
      if (!access || access.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required for this company' }, { status: 403 });
      }
    }
    
    const company = await Company.findByIdAndUpdate(id, updateData, { new: true }).lean();
    
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      company: {
        ...(company as any),
        id: (company as any)._id.toString()
      }
    });
  } catch (err) {
    console.error('PUT /api/companies error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE: Soft delete company (or prevent if transactions exist)
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { userId, role } = getUserFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }
    
    // Check if company has transactions (invoices, payments, ledger entries)
    const Invoice = (await import('../../../lib/models/Invoice')).default;
    const Payment = (await import('../../../lib/models/Payment')).default;
    const LedgerEntry = (await import('../../../lib/models/LedgerEntry')).default;
    
    const hasInvoices = await Invoice.countDocuments({ companyId: id });
    const hasPayments = await Payment.countDocuments({ companyId: id });
    const hasLedger = await LedgerEntry.countDocuments({ companyId: id });
    
    if (hasInvoices > 0 || hasPayments > 0 || hasLedger > 0) {
      // Soft delete - just mark as inactive
      await Company.findByIdAndUpdate(id, { isActive: false });
      return NextResponse.json({
        success: true,
        message: 'Company has been deactivated (has existing transactions)',
        softDeleted: true
      });
    }
    
    // Hard delete if no transactions
    await Company.findByIdAndDelete(id);
    
    // Also remove all access records for this company
    await UserCompanyAccess.deleteMany({ companyId: id });
    
    return NextResponse.json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (err) {
    console.error('DELETE /api/companies error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
