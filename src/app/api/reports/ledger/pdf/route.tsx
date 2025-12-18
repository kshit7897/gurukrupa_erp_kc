import { NextResponse } from 'next/server';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
// Register Noto Sans font for rupee symbol support, fallback to Helvetica if not found
let ledgerFontFamily = 'NotoSans';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Font.register({
    family: 'NotoSans',
    src: require('@/lib/pdf/fonts/NotoSans-Regular.ttf'),
  });
} catch (e) {
  ledgerFontFamily = 'Helvetica';
}
import { renderToBuffer } from '@react-pdf/renderer';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Payment from '@/lib/models/Payment';
import Party from '@/lib/models/Party';
import Company from '@/lib/models/Company';

export const dynamic = 'force-dynamic';

const styles = StyleSheet.create({
  page: { padding: 0, fontSize: 10, fontFamily: ledgerFontFamily, backgroundColor: '#f1f5f9' },
  container: { width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 12 },
  content: {
    width: 530,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 6,
    boxShadow: '0 2px 6px #e5e7eb',
    color: '#0f172a',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' },
  logoBox: { width: 60, height: 60, backgroundColor: '#f1f5f9', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 10 },
  metaBlock: { width: 160, alignItems: 'flex-end' },
  companyDetailsSmall: { fontSize: 9, color: '#64748b', lineHeight: 1.2 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0f172a', paddingVertical: 6, paddingHorizontal: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#eef2f6', alignItems: 'center' },
  cell: { paddingRight: 6 },
  thinSeparator: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
  totalsBox: { marginTop: 10, padding: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e6eef6', borderRadius: 6 },
  smallMuted: { fontSize: 9, color: '#64748b' },
  boldValue: { fontSize: 12, fontWeight: 'bold' },
});

function LedgerDoc({ company, party, rows, from, to }: any) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
                <View style={styles.logoBox}>
                  {company?.logo ? (
                    <Image src={company.logo} style={{ width: 60, height: 60, objectFit: 'contain' }} />
                  ) : (
                    <Text style={{ fontSize: 10, color: '#94a3b8' }}>Logo</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{company?.name || 'Company Name'}</Text>
                  <Text style={styles.companyDetailsSmall}>{company?.address_line_1 || company?.address || ''}</Text>
                  {company?.address_line_2 && <Text style={styles.companyDetailsSmall}>{company.address_line_2}</Text>}
                  <Text style={styles.companyDetailsSmall}>{company?.city ? `${company.city} - ${company?.pincode || ''}` : ''}{company?.state ? `, ${company.state}` : ''}</Text>
                  <Text style={styles.companyDetailsSmall}>Contact: {company?.contactNumbers?.join(', ') || company?.phone || '-'}</Text>
                  <Text style={[styles.companyDetailsSmall, { fontWeight: 'bold' }]}>GSTIN: {company?.gstin || company?.gstNumber || '-'}</Text>
                </View>
              </View>
              <View style={styles.metaBlock}>
                <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Ledger Preview</Text>
                {from && to ? <Text style={styles.smallMuted}>{`Period: ${from} — ${to}`}</Text> : null}
              </View>
            </View>

            <View style={styles.thinSeparator} />

            <View style={{ marginTop: 6, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{party?.name || 'Party Ledger'}</Text>
              {party?.address && <Text style={styles.smallMuted}>{party.address}</Text>}
              {party?.mobile && <Text style={styles.smallMuted}>Phone: {party.mobile}</Text>}
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.cell, { width: '12%', color: '#fff' }]}>Date</Text>
              <Text style={[styles.cell, { width: '34%', color: '#fff' }]}>Ref</Text>
              <Text style={[styles.cell, { width: '12%', color: '#fff' }]}>Type</Text>
              <Text style={[styles.cell, { width: '10%', textAlign: 'center', color: '#fff' }]}>Cash</Text>
              <Text style={[styles.cell, { width: '10%', textAlign: 'right', color: '#fff' }]}>Debit</Text>
              <Text style={[styles.cell, { width: '10%', textAlign: 'right', color: '#fff' }]}>Credit</Text>
              <Text style={[styles.cell, { width: '12%', textAlign: 'right', color: '#fff' }]}>Balance</Text>
            </View>

            {rows.map((r: any, idx: number) => (
              <View key={idx} style={styles.tableRow} wrap={false}>
                <Text style={[styles.cell, { width: '12%' }]}>{String(r.date || '').slice(0, 10)}</Text>
                <Text style={[styles.cell, { width: '34%' }]}>{String(r.ref || '').slice(0, 120)}</Text>
                <Text style={[styles.cell, { width: '12%' }]}>{r.type || ''}</Text>
                <Text style={[styles.cell, { width: '10%', textAlign: 'center', color: r.cash ? (/sale/i.test(String(r.type || '')) ? '#059669' : '#059669') : '#94a3b8' }]}>{r.cash ? (/sale/i.test(String(r.type || '')) ? 'Cash Sale' : 'Cash') : '-'}</Text>
                <Text style={[styles.cell, { width: '10%', textAlign: 'right' }]}>{r.debit ? Number(r.debit).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}) : '-'}</Text>
                <Text style={[styles.cell, { width: '10%', textAlign: 'right' }]}>{r.credit ? Number(r.credit).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}) : '-'}</Text>
                <Text style={[styles.cell, { width: '12%', textAlign: 'right', fontWeight: 'bold' }]}>{Number(r.balance || 0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>
              </View>
            ))}

            {/* Totals summary similar to preview */}
            {rows && rows.length > 0 && (
              (() => {
                const cashSalesTx = (rows || []).filter((it: any) => it.cash && /sale/i.test(String(it.type || '')));
                const cashSalesTotal = cashSalesTx.reduce((s: number, it: any) => s + (Number(it.credit || it.debit || 0) || 0), 0);
                const totalDebit = (rows || []).reduce((s: number, it: any) => s + (Number(it.debit || 0) || 0), 0);
                const totalCredit = (rows || []).reduce((s: number, it: any) => s + (Number(it.credit || 0) || 0), 0);
                const endingBalance = rows[rows.length - 1]?.balance || 0;
                return (
                  <View style={styles.totalsBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={styles.smallMuted}>Totals</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <View style={{ marginRight: 8 }}>
                          <Text style={styles.smallMuted}>Total Debit</Text>
                          <Text style={styles.boldValue}>{totalDebit.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>
                        </View>
                        <View style={{ marginRight: 8 }}>
                          <Text style={styles.smallMuted}>Total Credit</Text>
                          <Text style={styles.boldValue}>{totalCredit.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>
                        </View>
                        <View>
                          <Text style={styles.smallMuted}>Ending Balance</Text>
                          <Text style={styles.boldValue}>{Number(endingBalance || 0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>
                        </View>
                      </View>
                      <View>
                        <Text style={styles.smallMuted}>Cash Sales Total</Text>
                        <Text style={styles.boldValue}>{cashSalesTotal.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>
                      </View>
                    </View>
                  </View>
                );
              })()
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const partyId = url.searchParams.get('partyId');
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;

    if (!partyId) {
      return NextResponse.json({ error: 'partyId is required' }, { status: 400 });
    }

    await dbConnect();

    const partyDoc: any = await Party.findById(partyId).lean();
    if (!partyDoc) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const company: any = await Company.findOne().lean();
    // Ensure logo URL is absolute so react-pdf in Node can fetch it
    try {
      const origin = new URL(req.url).origin;
      if (company && company.logo && typeof company.logo === 'string' && company.logo.startsWith('/')) {
        company.logo = origin + company.logo;
      }
    } catch (e) {
      // ignore origin resolution errors
    }

    const invMatch: any = { partyId };
    if (from && to) {
      invMatch.date = { $gte: from, $lte: to };
    }

    const invoices = await Invoice.find(invMatch).lean();

    const paymentMatch: any = { partyId };
    if (from && to) {
      paymentMatch.date = { $gte: from, $lte: to };
    }
    const payments = await Payment.find(paymentMatch).lean();

    const invTx = (invoices || []).map((inv: any) => {
      const isSale = (inv.type || '').toString() === 'SALES';
      const amount = Number(inv.grandTotal || 0);
      const paid = Number(inv.paidAmount || 0);
      const debit = isSale ? amount : 0;
      const credit = isSale ? 0 : amount;
      return {
        date: inv.date,
        ref: inv.invoiceNo,
        type: inv.type,
        cash: inv.paymentMode === 'cash' || inv.payment_mode === 'cash',
        debit,
        credit,
      };
    });

    const payTx = (payments || []).map((p: any) => {
      const isReceive = (p.type || '').toString() === 'receive';
      const amt = Number(p.amount || 0);
      const debit = isReceive ? 0 : amt;
      const credit = isReceive ? amt : 0;
      return {
        date: p.date,
        ref: p.voucherNo || p.reference || p._id?.toString() || '',
        type: p.type,
        cash: p.mode === 'cash' || p.paymentMode === 'cash',
        debit,
        credit,
      };
    });

    const transactions = invTx
      .concat(payTx)
      .sort((a, b) => new Date(a.date as any).getTime() - new Date(b.date as any).getTime());

    let balance = partyDoc.openingBalance || 0;
    const rows = transactions.map((t) => {
      if ((partyDoc.type || '').toString().toLowerCase() === 'customer') {
        balance = balance + (t.debit || 0) - (t.credit || 0);
      } else {
        balance = balance + (t.credit || 0) - (t.debit || 0);
      }
      return { ...t, balance };
    });

    const buffer = await renderToBuffer(
      <LedgerDoc company={company} party={partyDoc} rows={rows} from={from} to={to} />
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Ledger_${partyDoc.name || partyId}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('GET /api/reports/ledger/pdf error', err);
    return NextResponse.json({ error: err?.message || 'Failed to generate ledger PDF' }, { status: 500 });
  }
}



