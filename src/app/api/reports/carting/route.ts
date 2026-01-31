import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Invoice from '../../../../lib/models/Invoice';
import { getCompanyContextFromRequest } from '../../../../lib/companyContext';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const partyId = searchParams.get('partyId');
    const vehicleNo = searchParams.get('vehicleNo');

    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }

    const query: any = { companyId };
    if (from && to) {
      query.date = { $gte: from, $lte: to };
    } else if (from) {
      query.date = { $gte: from };
    } else if (to) {
      query.date = { $lte: to };
    }

    if (vehicleNo) {
      query.vehicle_no = { $regex: vehicleNo, $options: 'i' };
    }

    // We search across all invoices that have items with carting
    // Optimization: find invoices that have at least one item with cartingPartyId
    query['items.cartingPartyId'] = { $exists: true, $ne: null };
    
    if (partyId) {
      query['items.cartingPartyId'] = partyId;
    }

    const invoices = await Invoice.find(query).sort({ date: -1 }).lean();

    const reportData: any[] = [];

    invoices.forEach((inv: any) => {
      inv.items.forEach((item: any) => {
        // If we filtered by partyId, skip items that don't match
        if (partyId && item.cartingPartyId !== partyId) return;
        
        // Skip items without carting
        if (!item.cartingAmount || item.cartingAmount <= 0) return;

        reportData.push({
          date: inv.date,
          invoiceId: inv._id.toString(),
          invoiceNo: inv.invoice_no || inv.invoiceNo,
          customerName: inv.partyName,
          vehicleNo: inv.vehicle_no || '-',
          cartingPartyId: item.cartingPartyId,
          cartingPartyName: item.cartingPartyName,
          amount: item.cartingAmount,
          itemDescription: item.name
        });
      });
    });

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Carting Report Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
