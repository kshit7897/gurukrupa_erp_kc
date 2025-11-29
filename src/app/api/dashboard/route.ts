import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Invoice from '../../../lib/models/Invoice';
import Item from '../../../lib/models/Item';

export async function GET() {
  await dbConnect();
  
  // Calculate totals from DB
  const invoices = await Invoice.find({});
  const totalSales = invoices.filter(i => i.type === 'SALES').reduce((acc, curr) => acc + curr.grandTotal, 0);
  const totalPurchase = invoices.filter(i => i.type === 'PURCHASE').reduce((acc, curr) => acc + curr.grandTotal, 0);
  const lowStockCount = await Item.countDocuments({ stock: { $lt: 10 } });

  return NextResponse.json({
    totalSales,
    totalPurchase,
    receivables: 0, // Placeholder
    lowStock: lowStockCount
  });
}
