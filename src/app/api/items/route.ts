import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Item from '../../../lib/models/Item';
import StockMovement from '../../../lib/models/StockMovement';

export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const item = await Item.findById(id);
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json({ ...(item as any).toObject(), id: (item as any)._id.toString() });
    }

    const items = await Item.find({}).sort({ name: 1 });
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
    const body = await request.json();
    const item = await Item.create(body);
    return NextResponse.json({ ...(item as any).toObject(), id: (item as any)._id.toString() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, ...updateData } = body;
    const existing = await Item.findById(id);
    if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    const prevStock = existing.stock || 0;
    const item = await Item.findByIdAndUpdate(id, updateData, { new: true });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    // If stock was directly changed via update, log adjustment
    if (typeof updateData.stock !== 'undefined' && Number(updateData.stock) !== prevStock) {
      try {
        await StockMovement.create({ itemId: id, qty: Number(item.stock) - prevStock, type: 'ADJUSTMENT', prevStock, newStock: item.stock, note: 'Manual stock update' });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await Item.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}