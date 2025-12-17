import { NextResponse } from 'next/server';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import dbConnect from '@/lib/mongodb';
import Item from '@/lib/models/Item';
import Invoice from '@/lib/models/Invoice';
import Party from '@/lib/models/Party';
import Payment from '@/lib/models/Payment';
import OtherTxn from '@/lib/models/OtherTxn';
import Company from '@/lib/models/Company';

function createOtherTxnsPdf(from: string, to: string, rows: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc: any = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    doc.fontSize(16).text('Other Income / Expense', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Period: ${from} to ${to}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(11).text('Date', 40, doc.y, { width: 70 });
    doc.text('Type', 110, doc.y, { width: 60 });
    doc.text('Amount', 170, doc.y, { width: 80, align: 'right' });
    doc.text('Category', 250, doc.y, { width: 120 });
    doc.text('Note', 370, doc.y, { width: 170 });
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    rows.forEach((t: any) => {
      doc.moveDown(0.2);
      doc.fontSize(9).text(String(t.date || ''), 40, doc.y, { width: 70 });
      doc.text(String(t.kind || ''), 110, doc.y, { width: 60 });
      doc.text(Number(t.amount || 0).toFixed(2), 170, doc.y, { width: 80, align: 'right' });
      doc.text(String(t.category || ''), 250, doc.y, { width: 120 });
      doc.text(String(t.note || ''), 370, doc.y, { width: 170 });
    });

    doc.end();
  });
}

export const dynamic = 'force-dynamic';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e5e7eb', padding: 4, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: 4, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  cell: { paddingRight: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
});

function StockDoc({ rows }: { rows: any[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Stock Summary Report</Text>
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

function OutstandingDoc({ rows }: { rows: any[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Outstanding Report</Text>
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

function ProfitLossDoc({ data }: { data: any }) {
  const { from, to, openingBalance, sales, purchase, otherIncome, otherExpense, grossProfit, netProfit } = data || {};
  const totalRevenue = Number(sales || 0) + Number(otherIncome || 0);
  const totalExpenses = Number(purchase || 0) + Number(otherExpense || 0);
  const closing = Number(openingBalance || 0) + Number(netProfit || 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Profit & Loss Statement</Text>
        <Text>{`Period: ${from} to ${to}`}</Text>
        <View style={{ marginTop: 8, marginBottom: 6 }}>
          <Text style={styles.sectionTitle}>Revenue</Text>
          <View style={styles.row}><Text>Sales</Text><Text>₹ {Number(sales || 0).toFixed(2)}</Text></View>
          <View style={styles.row}><Text>Other Income</Text><Text>₹ {Number(otherIncome || 0).toFixed(2)}</Text></View>
          <View style={styles.row}><Text>Total Revenue</Text><Text>₹ {totalRevenue.toFixed(2)}</Text></View>
        </View>
        <View style={{ marginBottom: 6 }}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          <View style={styles.row}><Text>Purchase</Text><Text>₹ {Number(purchase || 0).toFixed(2)}</Text></View>
          <View style={styles.row}><Text>Other Expenses</Text><Text>₹ {Number(otherExpense || 0).toFixed(2)}</Text></View>
          <View style={styles.row}><Text>Total Expenses</Text><Text>₹ {totalExpenses.toFixed(2)}</Text></View>
        </View>
        <View>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.row}><Text>Gross Profit</Text><Text>₹ {Number(grossProfit || 0).toFixed(2)}</Text></View>
          <View style={styles.row}><Text>Net Profit/Loss</Text><Text>₹ {Number(netProfit || 0).toFixed(2)}</Text></View>
          {(openingBalance || netProfit) && (
            <View style={styles.row}><Text>Closing Balance</Text><Text>₹ {closing.toFixed(2)}</Text></View>
          )}
        </View>
      </Page>
    </Document>
  );
}

function OtherTxnsDoc({ rows, from, to }: { rows: any[]; from: string; to: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Other Income / Expense</Text>
        <Text>{`Period: ${from} to ${to}`}</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, { width: '20%' }]}>Date</Text>
          <Text style={[styles.cell, { width: '15%' }]}>Type</Text>
          <Text style={[styles.cell, { width: '20%', textAlign: 'right' }]}>Amount</Text>
          <Text style={[styles.cell, { width: '20%' }]}>Category</Text>
          <Text style={[styles.cell, { width: '25%' }]}>Note</Text>
        </View>
        {rows.map((t, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={[styles.cell, { width: '20%' }]}>{t.date || ''}</Text>
            <Text style={[styles.cell, { width: '15%' }]}>{t.kind || ''}</Text>
            <Text style={[styles.cell, { width: '20%', textAlign: 'right' }]}>{Number(t.amount || 0).toFixed(2)}</Text>
            <Text style={[styles.cell, { width: '20%' }]}>{t.category || ''}</Text>
            <Text style={[styles.cell, { width: '25%' }]}>{t.note || ''}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get('type') || '').toLowerCase();

    if (!type) {
      return NextResponse.json({ error: 'type query param is required' }, { status: 400 });
    }

    await dbConnect();

    if (type === 'stock') {
      const items = await Item.find({}).lean();
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

      const buffer = await renderToBuffer(<StockDoc rows={rows} />);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="Stock_Report.pdf"',
        },
      });
    }

    if (type === 'outstanding') {
      const parties = await Party.find({}).lean();
      const invoices = await Invoice.find({}).lean();
      const payments = await Payment.find({}).lean();

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
        } else if (pType === 'supplier') {
          currentBalance = currentBalance - (partyUnallocatedPayments || 0);
        }

        return { ...p, billed, totalReceived, currentBalance };
      });

      const buffer = await renderToBuffer(<OutstandingDoc rows={report} />);
      return new NextResponse(buffer, {
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

      const company = await Company.findOne().lean();
      const openingBalance = company?.openingBalance || 0;

      const range = { $gte: from, $lte: to };
      const invMatch: any = { date: range };

      const salesAgg = await Invoice.aggregate([
        { $match: { ...invMatch, type: 'SALES' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$grandTotal', 0] } } } },
      ]);
      const purchaseAgg = await Invoice.aggregate([
        { $match: { ...invMatch, type: 'PURCHASE' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$grandTotal', 0] } } } },
      ]);

      const other = await OtherTxn.aggregate([
        { $match: { date: range } },
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
        openingBalance,
        sales,
        purchase,
        grossProfit: gross,
        otherIncome: incomeOther,
        otherExpense: expenseOther,
        netProfit: net,
      };

      const buffer = await renderToBuffer(<ProfitLossDoc data={plData} />);
      return new NextResponse(buffer, {
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
      const rows = await OtherTxn.find({ date: range }).lean();

      const buffer = await renderToBuffer(<OtherTxnsDoc rows={rows || []} from={from} to={to} />);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Other_Income_Expense_${from}_to_${to}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported type' }, { status: 400 });
  } catch (err: any) {
    console.error('GET /api/reports/pdf error', err);
    return NextResponse.json({ error: err?.message || 'Failed to generate PDF' }, { status: 500 });
  }
}


