import { NextResponse } from 'next/server';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { registerAppFont } from '@/lib/pdf/registerFont';
import { renderToBuffer } from '@react-pdf/renderer';
import dbConnect from '@/lib/mongodb';
import Item from '@/lib/models/Item';
import Invoice from '@/lib/models/Invoice';
import Party from '@/lib/models/Party';
import Payment from '@/lib/models/Payment';
import OtherTxn from '@/lib/models/OtherTxn';
import Company from '@/lib/models/Company';
import { getCompanyContextFromRequest } from '@/lib/companyContext';

export const dynamic = 'force-dynamic';

const appFontFamily = registerAppFont();
const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: appFontFamily },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#1e293b' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 6, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  tableRow: { flexDirection: 'row', padding: 6, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  cell: { paddingRight: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  headerInfo: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', pb: 10 }
});

function StockDoc({ rows, companyName }: { rows: any[]; companyName: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerInfo}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{companyName}</Text>
          <Text style={styles.sectionTitle}>Stock Summary Report</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, { width: '40%' }]}>Item Name</Text>
          <Text style={[styles.cell, { width: '20%', textAlign: 'right' }]}>Purchase Rate</Text>
          <Text style={[styles.cell, { width: '20%', textAlign: 'right' }]}>Stock</Text>
          <Text style={[styles.cell, { width: '20%', textAlign: 'right' }]}>Total Value</Text>
        </View>
        {rows.map((r, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={[styles.cell, { width: '40%' }]}>{r.name || ''}</Text>
            <Text style={[styles.cell, { width: '20%', textAlign: 'right' }]}>{Number(r.purchaseRate || 0).toFixed(2)}</Text>
            <Text style={[styles.cell, { width: '20%', textAlign: 'right' }]}>{r.unitLabel || ''}</Text>
            <Text style={[styles.cell, { width: '20%', textAlign: 'right' }]}>{Number(r.totalValue || 0).toFixed(2)}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

function OutstandingDoc({ rows, companyName }: { rows: any[]; companyName: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerInfo}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{companyName}</Text>
          <Text style={styles.sectionTitle}>Outstanding Report</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, { width: '35%' }]}>Party</Text>
          <Text style={[styles.cell, { width: '25%' }]}>Mobile</Text>
          <Text style={[styles.cell, { width: '20%' }]}>Status</Text>
          <Text style={[styles.cell, { width: '20%', textAlign: 'right' }]}>Amount</Text>
        </View>
        {rows.map((p, idx) => {
          const isCustomer = (p.type || '').toString().toLowerCase() === 'customer';
          const status = isCustomer ? 'To Receive' : 'To Pay';
          const amount = Math.abs(Number(p.currentBalance || 0) || 0);
          return (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.cell, { width: '35%' }]}>{p.name || ''}</Text>
              <Text style={[styles.cell, { width: '25%' }]}>{p.mobile || ''}</Text>
              <Text style={[styles.cell, { width: '20%' }]}>{status}</Text>
              <Text style={[styles.cell, { width: '20%', textAlign: 'right' }]}>{amount.toFixed(2)}</Text>
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

function ProfitLossDoc({ data, companyName }: { data: any; companyName: string }) {
  const { from, to, openingBalance, sales, purchase, otherIncome, otherExpense, grossProfit, netProfit } = data || {};
  const totalRevenue = Number(sales || 0) + Number(otherIncome || 0);
  const totalExpenses = Number(purchase || 0) + Number(otherExpense || 0);
  const closing = Number(openingBalance || 0) + Number(netProfit || 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerInfo}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{companyName}</Text>
          <Text style={styles.sectionTitle}>Profit & Loss Statement</Text>
          <Text>{`For the period: ${from} to ${to}`}</Text>
        </View>

        <View style={{ marginTop: 8, marginBottom: 8, padding: 8, borderLeftWidth: 4, borderLeftColor: '#2b6cb0', backgroundColor: '#ebf8ff' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: 'bold' }}>Opening Balance</Text>
              <Text style={{ fontWeight: 'bold' }}>{Number(openingBalance || 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Revenue</Text>
          <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 6 }}>
            <View style={styles.row}><Text>Sales</Text><Text>{Number(sales || 0).toFixed(2)}</Text></View>
              <View style={styles.row}><Text>Other Income</Text><Text style={{ color: '#166534' }}>{Number(otherIncome || 0).toFixed(2)}</Text></View>
            <View style={{ borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6 }}>
              <View style={styles.row}><Text style={{ fontWeight: 'bold' }}>Total Revenue</Text><Text style={{ fontWeight: 'bold', color: '#166534' }}>{totalRevenue.toFixed(2)}</Text></View>
            </View>
          </View>
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Expenses</Text>
          <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 6 }}>
              <View style={styles.row}><Text>Purchase</Text><Text>{Number(purchase || 0).toFixed(2)}</Text></View>
            <View style={styles.row}><Text>Other Expenses</Text><Text style={{ color: '#9f1239' }}>{Number(otherExpense || 0).toFixed(2)}</Text></View>
            <View style={{ borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6 }}>
              <View style={styles.row}><Text style={{ fontWeight: 'bold' }}>Total Expenses</Text><Text style={{ fontWeight: 'bold', color: '#9f1239' }}>{totalExpenses.toFixed(2)}</Text></View>
            </View>
          </View>
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Summary</Text>
          <View style={{ backgroundColor: '#ebf8ff', borderWidth: 1, borderColor: '#bfdbfe', padding: 8 }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#dbeafe', paddingBottom: 6 }}>
              <View style={styles.row}><Text>Total Revenue</Text><Text style={{ color: '#166534', fontWeight: 'bold' }}>{totalRevenue.toFixed(2)}</Text></View>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#dbeafe', paddingVertical: 6 }}>
              <View style={styles.row}><Text>Total Expenses</Text><Text style={{ color: '#9f1239', fontWeight: 'bold' }}>{totalExpenses.toFixed(2)}</Text></View>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#dbeafe', paddingVertical: 6 }}>
              <View style={styles.row}><Text>Gross Profit (Sales - Purchase)</Text><Text>{Number(grossProfit || 0).toFixed(2)}</Text></View>
            </View>
            <View style={{ paddingTop: 6 }}>
              <View style={styles.row}><Text style={{ fontWeight: 'bold' }}>Net Profit/Loss</Text><Text style={{ fontWeight: 'bold', fontSize: 14, color: (netProfit || 0) >= 0 ? '#166534' : '#9f1239' }}>{Number(netProfit || 0).toFixed(2)}</Text></View>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 6, padding: 8, borderLeftWidth: 4, borderLeftColor: '#15803d', backgroundColor: '#ecfccb' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: 'bold' }}>Closing Balance</Text>
              <Text style={{ fontWeight: 'bold' }}>{closing.toFixed(2)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function CartingDoc({ rows, from, to, companyName }: { rows: any[]; from: string; to: string; companyName: string }) {
  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerInfo}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{companyName}</Text>
          <Text style={styles.sectionTitle}>Carting Detail Report</Text>
          <Text>{`Period: ${from} to ${to}`}</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, { width: '12%' }]}>Date</Text>
          <Text style={[styles.cell, { width: '15%' }]}>Vehicle No</Text>
          <Text style={[styles.cell, { width: '15%' }]}>Invoice</Text>
          <Text style={[styles.cell, { width: '23%' }]}>Customer</Text>
          <Text style={[styles.cell, { width: '23%' }]}>Carting Party</Text>
          <Text style={[styles.cell, { width: '12%', textAlign: 'right' }]}>Amount</Text>
        </View>
        {rows.map((r, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={[styles.cell, { width: '12%', fontSize: 8 }]}>{r.date || ''}</Text>
            <Text style={[styles.cell, { width: '15%', fontSize: 8, fontWeight: 'bold' }]}>{r.vehicleNo || ''}</Text>
            <Text style={[styles.cell, { width: '15%', fontSize: 8 }]}>{r.invoiceNo || ''}</Text>
            <Text style={[styles.cell, { width: '23%', fontSize: 8 }]}>{r.customerName || ''}</Text>
            <Text style={[styles.cell, { width: '23%', fontSize: 8 }]}>{r.cartingPartyName || ''}</Text>
            <Text style={[styles.cell, { width: '12%', textAlign: 'right', fontWeight: 'bold' }]}>{Number(r.amount || 0).toFixed(2)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#cbd5e1' }}>
          <Text style={{ width: '88%', textAlign: 'right', fontWeight: 'bold', fontSize: 10 }}>Total Amount: </Text>
          <Text style={{ width: '12%', textAlign: 'right', fontWeight: 'bold', fontSize: 10, color: '#2563eb' }}>{total.toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  );
}

function OtherTxnsDoc({ rows, from, to, companyName }: { rows: any[]; from: string; to: string; companyName: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerInfo}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{companyName}</Text>
          <Text style={styles.sectionTitle}>Transaction Report</Text>
          <Text>{`Period: ${from} to ${to}`}</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, { width: '12%' }]}>Date</Text>
          <Text style={[styles.cell, { width: '12%' }]}>Type</Text>
          <Text style={[styles.cell, { width: '20%' }]}>From / Source</Text>
          <Text style={[styles.cell, { width: '20%' }]}>To / Target</Text>
          <Text style={[styles.cell, { width: '12%', textAlign: 'right' }]}>Amount</Text>
          <Text style={[styles.cell, { width: '24%' }]}>Notes</Text>
        </View>
        {rows.map((t, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={[styles.cell, { width: '12%', fontSize: 8 }]}>{t.date || ''}</Text>
            <Text style={[styles.cell, { width: '12%', fontSize: 8 }]}>{t.txnType || t.kind || ''}</Text>
            <Text style={[styles.cell, { width: '20%', fontSize: 8 }]}>{t.fromName || 'N/A'}</Text>
            <Text style={[styles.cell, { width: '20%', fontSize: 8 }]}>{t.toName || 'N/A'}</Text>
            <Text style={[styles.cell, { width: '12%', textAlign: 'right', fontWeight: 'bold' }]}>{Number(t.amount || 0).toFixed(2)}</Text>
            <Text style={[styles.cell, { width: '24%', fontSize: 8 }]}>{t.note || ''}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function GET(req: Request) {
  try {
    const { companyId } = getCompanyContextFromRequest(req);
    if (!companyId) return NextResponse.json({ error: 'No company selected' }, { status: 400 });

    const url = new URL(req.url);
    const type = (url.searchParams.get('type') || '').toLowerCase();

    if (!type) {
      return NextResponse.json({ error: 'type query param is required' }, { status: 400 });
    }

    await dbConnect();
    const company = await Company.findById(companyId).lean();
    const companyName = company?.name || 'Company Report';

    if (type === 'stock') {
      const items = await Item.find({ companyId }).lean();
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
          totalValue,
        };
      });

      const buffer = await renderToBuffer(<StockDoc rows={rows} companyName={companyName} />);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="Stock_Report.pdf"',
        },
      });
    }

    if (type === 'outstanding') {
      const parties = await Party.find({ companyId }).lean();
      const invoices = await Invoice.find({ companyId }).lean();
      const payments = await Payment.find({ companyId }).lean();

      const report = parties.map((p: any) => {
        const partyId = (p._id || p.id).toString();

        const partyInvoices = invoices.filter((i: any) => (i.partyId || '').toString() === partyId);
        const billed = partyInvoices
          .filter((i: any) =>
            ((p.type || '').toString().toLowerCase() === 'customer' ? i.type === 'SALES' : i.type === 'PURCHASE')
          )
          .reduce((s: number, i: any) => s + (i.grandTotal || 0), 0);

        const totalReceived = payments
          .filter((pay: any) => (pay.partyId || '').toString() === partyId && (pay.type === 'receive' || pay.type === 'pay'))
          .reduce((s: number, pay: any) => s + (pay.amount || 0), 0);

        const outstandingFromInvoices = partyInvoices.reduce(
          (s: number, i: any) =>
            s + (i.dueAmount != null ? i.dueAmount : Math.max(0, (i.grandTotal || 0) - (i.paidAmount || 0))),
          0
        );

        const partyUnallocatedReceipts = payments
          .filter(
            (pay: any) =>
              (pay.partyId || '').toString() === partyId &&
              pay.type === 'receive' &&
              (!pay.allocations || (Array.isArray(pay.allocations) && pay.allocations.length === 0))
          )
          .reduce((s: number, pay: any) => s + (pay.amount || 0), 0);
        
        const partyUnallocatedPayments = payments
          .filter(
            (pay: any) =>
              (pay.partyId || '').toString() === partyId &&
              pay.type === 'pay' &&
              (!pay.allocations || (Array.isArray(pay.allocations) && pay.allocations.length === 0))
          )
          .reduce((s: number, pay: any) => s + (pay.amount || 0), 0);

        let currentBalance = (p.openingBalance || 0) + outstandingFromInvoices;
        const pType = (p.type || '').toString().toLowerCase();
        if (pType === 'customer') {
          currentBalance = currentBalance - (partyUnallocatedReceipts || 0);
        } else if (pType === 'supplier' || pType === 'partner') {
          currentBalance = currentBalance - (partyUnallocatedPayments || 0);
        }

        return { ...p, billed, totalReceived, currentBalance };
      });

      const buffer = await renderToBuffer(<OutstandingDoc rows={report} companyName={companyName} />);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="Outstanding_Report.pdf"',
        },
      });
    }

    if (type === 'pl') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      if (!from || !to) {
        return NextResponse.json({ error: 'from and to required (YYYY-MM-DD)' }, { status: 400 });
      }

      const range = { $gte: from, $lte: to };
      const invMatch: any = { date: range, companyId };

      const salesAgg = await Invoice.aggregate([
        { $match: { ...invMatch, type: 'SALES' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$grandTotal', 0] } } } },
      ]);
      const purchaseAgg = await Invoice.aggregate([
        { $match: { ...invMatch, type: 'PURCHASE' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$grandTotal', 0] } } } },
      ]);

      const other = await OtherTxn.aggregate([
        { $match: { date: range, companyId } },
        { $group: { _id: '$kind', total: { $sum: { $ifNull: ['$amount', 0] } } } },
      ]);

      const incomeOther = other.find((o: any) => o._id === 'income')?.total || 0;
      const expenseOther = other.find((o: any) => o._id === 'expense')?.total || 0;

      const sales = salesAgg[0]?.total || 0;
      const purchase = purchaseAgg[0]?.total || 0;
      const gross = sales - purchase;
      const net = gross + incomeOther - expenseOther;

      const plData = {
        from,
        to,
        openingBalance: company?.openingBalance || 0,
        sales,
        purchase,
        grossProfit: gross,
        otherIncome: incomeOther,
        otherExpense: expenseOther,
        netProfit: net,
      };

      const buffer = await renderToBuffer(<ProfitLossDoc data={plData} companyName={companyName} />);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Profit_Loss_${from}_to_${to}.pdf"`,
        },
      });
    }

    if (type === 'other-txns') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      if (!from || !to) {
        return NextResponse.json({ error: 'from and to required (YYYY-MM-DD)' }, { status: 400 });
      }

      const range = { $gte: from, $lte: to };
      const rows = await OtherTxn.find({ date: range, companyId }).sort({ date: 1, createdAt: 1 }).lean();

      const buffer = await renderToBuffer(<OtherTxnsDoc rows={rows || []} from={from} to={to} companyName={companyName} />);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Transactions_${from}_to_${to}.pdf"`,
        },
      });
    }

    if (type === 'carting') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const partyId = url.searchParams.get('partyId');
      const vehicleNo = url.searchParams.get('vehicleNo');
      
      if (!from || !to) {
        return NextResponse.json({ error: 'from and to required' }, { status: 400 });
      }

      const query: any = { companyId, date: { $gte: from, $lte: to } };
      query['items.cartingPartyId'] = { $exists: true, $ne: null };
      if (partyId) query['items.cartingPartyId'] = partyId;
      if (vehicleNo) query.vehicle_no = { $regex: vehicleNo, $options: 'i' };

      const invoices = await Invoice.find(query).sort({ date: 1 }).lean();
      const reportData: any[] = [];

      invoices.forEach((inv: any) => {
        inv.items.forEach((item: any) => {
          if (partyId && item.cartingPartyId !== partyId) return;
          if (!item.cartingAmount || item.cartingAmount <= 0) return;
          reportData.push({
            date: inv.date,
            invoiceNo: inv.invoice_no || inv.invoiceNo,
            customerName: inv.partyName,
            vehicleNo: inv.vehicle_no || '-',
            cartingPartyName: item.cartingPartyName,
            amount: item.cartingAmount
          });
        });
      });

      const buffer = await renderToBuffer(<CartingDoc rows={reportData} from={from} to={to} companyName={companyName} />);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Carting_Report_${from}_to_${to}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported type' }, { status: 400 });
  } catch (err: any) {
    console.error('GET /api/reports/pdf error', err);
    return NextResponse.json({ error: err?.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
