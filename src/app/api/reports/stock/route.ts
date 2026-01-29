import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Item from '../../../../lib/models/Item';
import { getCompanyContextFromRequest } from '../../../../lib/companyContext';

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }

    const items = await Item.find({ companyId }).lean();

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
