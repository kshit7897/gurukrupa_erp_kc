import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Company from '../../../lib/models/Company';
import { getCompanyContextFromRequest } from '../../../lib/companyContext';

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Get the currently active company from context
    const { companyId } = getCompanyContextFromRequest(request);
    
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    // Return the active company only
    const company = await Company.findById(companyId).lean();
    if (!company) {
      return NextResponse.json({ success: true, company: null });
    }
    return NextResponse.json({ 
      success: true, 
      company: { ...(company as any), id: (company as any)._id.toString() } 
    });
  } catch (err) {
    console.error('Company GET error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    
    // Get the currently active company from context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }

    const body = await request.json();
    
    // Update the active company only
    const updated = await Company.findByIdAndUpdate(companyId, body, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    return NextResponse.json({ 
      success: true, 
      company: { ...(updated as any), id: (updated as any)._id.toString() } 
    });
  } catch (err) {
    console.error('Company PUT error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
