import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Item from '../../../lib/models/Item';
import StockMovement from '../../../lib/models/StockMovement';
import { getCompanyContextFromRequest } from '../../../lib/companyContext';

// Always fetch live stock; avoid any caching
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await dbConnect();
  
  // Get company context
  const { companyId } = getCompanyContextFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: 'No company selected' }, { status: 400 });
  }
  
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const item = await Item.findOne({ _id: id, companyId });
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json({ ...(item as any).toObject(), id: (item as any)._id.toString() });
    }

    // Company-scoped query
    const items = await Item.find({ 
      companyId
    }).sort({ name: 1 });
    const formatted = items.map(doc => ({ ...(doc as any).toObject(), id: (doc as any)._id.toString() }));
    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Item API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
    const item = await Item.create({ ...body, companyId }); // Add company scope
    const itemId = (item as any)._id.toString();
    
    // If item has opening stock, create a stock movement entry to track it
    const openingStock = Number(body.stock || 0);
    if (openingStock !== 0) {
      try {
        await StockMovement.create({
          companyId, // Add company scope
          itemId: itemId,
          qty: openingStock,
          type: 'ADJUSTMENT',
          refId: null,
          date: new Date().toISOString().split('T')[0],
          note: 'Opening stock',
          prevStock: 0,
          newStock: openingStock
        });
      } catch (e) {
        console.error('Failed to create opening stock movement entry:', e);
        // Continue - don't fail item creation for stock movement failure
      }
    }
    
    return NextResponse.json({ ...(item as any).toObject(), id: itemId });
  } catch (error) {
    console.error('Failed to create item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
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
    const { id, ...updateData } = body;
    
    // Company-scoped find
    const existing = await Item.findOne({ _id: id, companyId });
    if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    
    // Migrate legacy data
    if (!existing.companyId) {
      updateData.companyId = companyId;
    }
    
    const prevStock = existing.stock || 0;
    const item = await Item.findByIdAndUpdate(id, updateData, { new: true });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    // If stock was directly changed via update, log adjustment
    if (typeof updateData.stock !== 'undefined' && Number(updateData.stock) !== prevStock) {
      try {
        await StockMovement.create({ 
          companyId, // Add company scope
          itemId: id, 
          qty: Number(item.stock) - prevStock, 
          type: 'ADJUSTMENT', 
          prevStock, 
          newStock: item.stock, 
          note: 'Manual stock update' 
        });
      } catch (e) {
        console.error('Failed to log stock movement for item update', e);
      }
    }

    return NextResponse.json({ ...(item as any).toObject(), id: (item as any)._id.toString() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
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
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    
    // Verify item belongs to this company
    const item = await Item.findOne({ _id: id, companyId });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    
    await Item.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}