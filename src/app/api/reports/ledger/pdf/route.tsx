import { NextResponse } from 'next/server';
import React from 'react';
import path from 'path';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
// Register Noto Sans font for rupee symbol support, fallback to Helvetica if not found
let ledgerFontFamily = 'NotoSans';
try {
  const fontPath = path.join(process.cwd(), 'src', 'lib', 'pdf', 'fonts', 'NotoSans-Regular.ttf');
  Font.register({
    family: 'NotoSans',
    src: fontPath,
  });
} catch (e) {
  ledgerFontFamily = 'Helvetica';
}
import { renderToBuffer } from '@react-pdf/renderer';
import dbConnect from '@/lib/mongodb';
import Party from '@/lib/models/Party';
import Company from '@/lib/models/Company';
import LedgerEntry from '@/lib/models/LedgerEntry';
import { getCompanyContextFromRequest } from '@/lib/companyContext';

export const dynamic = 'force-dynamic';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: ledgerFontFamily, backgroundColor: '#ffffff' },
  headerContainer: { borderBottomWidth: 2, borderBottomColor: '#0f172a', paddingBottom: 20, marginBottom: 20 },
  companySection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  companyInfo: { flex: 1 },
  logo: { width: 100, height: 40, objectFit: 'contain', marginBottom: 10 },
  companyName: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', color: '#0f172a' },
  companyAddress: { fontSize: 9, color: '#64748b', marginTop: 2 },
  statementTitleBox: { alignItems: 'flex-end', width: 200 },
  statementTitle: { fontSize: 24, fontWeight: 'bold', textTransform: 'uppercase', color: '#0f172a' },
  statementSubtitle: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginTop: -4 },
  periodBox: { marginTop: 15, padding: 8, backgroundColor: '#f8fafc', borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0', width: 180, alignItems: 'center' },
  
  billingGrid: { flexDirection: 'row', marginTop: 20, gap: 40 },
  billToBox: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  billToLabel: { fontSize: 8, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  partyName: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },
  partyAddress: { fontSize: 9, color: '#475569', marginTop: 4, lineHeight: 1.4 },

  tableHeader: { flexDirection: 'row', backgroundColor: '#0f172a', paddingVertical: 8, paddingHorizontal: 6, marginTop: 20 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9', alignItems: 'flex-start' },
  cell: { paddingRight: 4 },
  cellHeader: { color: '#ffffff', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  
  summaryContainer: { marginTop: 30, borderTopWidth: 2, borderTopColor: '#0f172a', paddingTop: 15, flexDirection: 'row', justifyContent: 'flex-end' },
  summaryBox: { width: 220 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 8, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' },
  summaryValue: { fontSize: 9, fontWeight: 'bold', color: '#0f172a' },
  netDueRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  netDueLabel: { fontSize: 10, fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase' },
  netDueValue: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  footer: { marginTop: 40, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15, textAlign: 'center', fontSize: 8, color: '#94a3b8', textTransform: 'uppercase' },
});

function LedgerDoc({ company, party, rows, from, to }: any) {
  const totalDebit = (rows || []).reduce((s: number, it: any) => s + (Number(it.debit || 0) || 0), 0);
  const totalCredit = (rows || []).reduce((s: number, it: any) => s + (Number(it.credit || 0) || 0), 0);
  const openingBalance = Number(party?.openingBalance || 0);
  const closingBalance = rows.length > 0 ? rows[rows.length - 1]?.balance : openingBalance;

  return (
    <Document title={`Statement - ${party?.name || 'Party'}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerContainer}>
          <View style={styles.companySection}>
            <View style={styles.companyInfo}>
              {company?.logo && <Image src={company.logo} style={styles.logo} />}
              <Text style={styles.companyName}>{company?.name || 'Company Name'}</Text>
              <Text style={styles.companyAddress}>{company?.address_line_1 || company?.address || ''}</Text>
              {company?.address_line_2 && <Text style={styles.companyAddress}>{company.address_line_2}</Text>}
              <Text style={styles.companyAddress}>{company?.city ? `${company.city} - ${company?.pincode || ''}` : ''}{company?.state ? `, ${company.state}` : ''}</Text>
              <Text style={[styles.companyAddress, { fontWeight: 'bold', marginTop: 5 }]}>GSTIN: {company?.gstin || company?.gstNumber || '-'}</Text>
            </View>
            <View style={styles.statementTitleBox}>
              <Text style={styles.statementTitle}>Statement</Text>
              <Text style={styles.statementSubtitle}>Of Account</Text>
              <View style={styles.periodBox}>
                <Text style={styles.summaryLabel}>Statement Period</Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>{from || 'Start'} — {to || 'End'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.billingGrid}>
            <View style={styles.billToBox}>
              <Text style={styles.billToLabel}>Bill To:</Text>
              <Text style={styles.partyName}>{party?.name || 'Customer'}</Text>
              <Text style={styles.partyAddress}>{party?.address || ''}</Text>
              <Text style={[styles.partyAddress, { fontWeight: 'bold' }]}>PH: {party?.mobile || '-'}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
              <Text style={styles.billToLabel}>Generated On</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.cell, styles.cellHeader, { width: '12%' }]}>Date</Text>
          <Text style={[styles.cell, styles.cellHeader, { width: '44%' }]}>Particulars</Text>
          <Text style={[styles.cell, styles.cellHeader, { width: '14%' }]}>Ref No</Text>
          <Text style={[styles.cell, styles.cellHeader, { width: '10%', textAlign: 'right' }]}>Debit</Text>
          <Text style={[styles.cell, styles.cellHeader, { width: '10%', textAlign: 'right' }]}>Credit</Text>
          <Text style={[styles.cell, styles.cellHeader, { width: '10%', textAlign: 'right' }]}>Balance</Text>
        </View>

        {rows.map((r: any, idx: number) => (
          <View key={idx} style={styles.tableRow} wrap={false}>
            <Text style={[styles.cell, { width: '12%' }]}>{String(r.date || '').slice(0, 10)}</Text>
            <View style={{ width: '44%' }}>
              <Text style={{ fontWeight: 'bold' }}>{r.type}</Text>
              {r.desc ? <Text style={{ fontSize: 7, color: '#64748b', marginTop: 2 }}>{r.desc}</Text> : null}
            </View>
            <Text style={[styles.cell, { width: '14%', fontFamily: 'Courier' }]}>{r.ref}</Text>
            <Text style={[styles.cell, { width: '10%', textAlign: 'right', color: '#be123c' }]}>{r.debit ? Number(r.debit).toFixed(2) : '-'}</Text>
            <Text style={[styles.cell, { width: '10%', textAlign: 'right', color: '#047857' }]}>{r.credit ? Number(r.credit).toFixed(2) : '-'}</Text>
            <Text style={[styles.cell, { width: '10%', textAlign: 'right', fontWeight: 'bold' }]}>{Number(r.balance || 0).toFixed(2)}</Text>
          </View>
        ))}

        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Opening Balance</Text>
              <Text style={styles.summaryValue}>{openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Charges (+)</Text>
              <Text style={[styles.summaryValue, { color: '#be123c' }]}>{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Payments (-)</Text>
              <Text style={[styles.summaryValue, { color: '#047857' }]}>{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.netDueRow}>
              <Text style={styles.netDueLabel}>Net Amount Due</Text>
              <Text style={styles.netDueValue}>₹ {Number(closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>Thank you for your business with {company?.name || 'us'}</Text>
      </Page>
    </Document>
  );
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { companyId } = getCompanyContextFromRequest(req);
    const url = new URL(req.url);
    const partyId = url.searchParams.get('partyId');
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;

    if (!partyId) return NextResponse.json({ error: 'partyId is required' }, { status: 400 });

    const partyDoc: any = await Party.findOne({ _id: partyId, companyId }).lean();
    if (!partyDoc) return NextResponse.json({ error: 'Party not found' }, { status: 404 });

    const company: any = await Company.findOne({ _id: companyId }).lean();
    try {
      const origin = new URL(req.url).origin;
      if (company && company.logo && company.logo.startsWith('/')) {
        company.logo = origin + company.logo;
      }
    } catch (e) {}

    const q: any = { partyId, companyId };
    if (from && to) q.date = { $gte: from, $lte: to };
    else if (from) q.date = { $gte: from };
    else if (to) q.date = { $lte: to };

    const entries = await LedgerEntry.find(q).sort({ date: 1, createdAt: 1 }).lean();

    const transactions = entries.map((e: any) => ({
      date: e.date,
      ref: e.refNo || '-',
      type: e.entryType || e.refType || 'TXN',
      debit: Number(e.debit || 0),
      credit: Number(e.credit || 0),
      desc: e.narration || ''
    }));

    let balance = Number(partyDoc.openingBalance || 0);
    const roles: string[] = (partyDoc.roles || [partyDoc.type]).map((r: any) => r && r.toString().toLowerCase());
    const isAsset = roles.some(r => ['customer', 'cash', 'bank', 'upi'].includes(r));

    const rows = transactions.map((t) => {
      if (isAsset) {
        balance = balance + t.debit - t.credit;
      } else {
        balance = balance + t.credit - t.debit;
      }
      return { ...t, balance };
    });

    const buffer = await renderToBuffer(<LedgerDoc company={company} party={partyDoc} rows={rows} from={from} to={to} />);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Ledger_${partyDoc.name || partyId}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('GET /api/reports/ledger/pdf error', err);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}



