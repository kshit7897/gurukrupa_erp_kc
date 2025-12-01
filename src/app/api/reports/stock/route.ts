import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Item from '../../../../lib/models/Item';

export async function GET() {
  try {
    await dbConnect();
    const items = await Item.find({}).lean();

    // compute unit label and total value
    const rows = items.map((it: any) => {
      const stock = Number(it.stock || 0);
      const purchaseRate = Number(it.purchaseRate || 0);
      const totalValue = stock * purchaseRate;
      const unitLabel = `${stock} ${it.unit || ''}`.trim();
      return {
        id: it._id || it.id,
        name: it.name,
        unitLabel,
        purchaseRate,
        stock,
        totalValue
      };
    });

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('GET /api/reports/stock error', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
