import { NextResponse } from 'next/server';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
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
  page: { padding: 24, fontSize: 10, fontFamily: ledgerFontFamily },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e5e7eb', padding: 4, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: 4, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  cell: { paddingRight: 4 },
});

function LedgerDoc({ company, party, rows, from, to }: any) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{company?.name || 'Company Name'}</Text>
            <Text>{company?.address_line_1 || company?.address || ''}</Text>
            {company?.address_line_2 && <Text>{company.address_line_2}</Text>}
            <Text>{company?.city ? `${company.city} - ${company?.pincode || ''}` : ''} {company?.state ? `, ${company.state}` : ''}</Text>
            <Text>Contact: {company?.contactNumbers?.join(', ') || company?.phone || '-'}</Text>
            <Text style={{ fontWeight: 'bold' }}>GSTIN: {company?.gstin || company?.gstNumber || '-'}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Ledger Preview</Text>
            {from && to ? <Text>{`Period: ${from} — ${to}`}</Text> : null}
          </View>
        </View>

        {/* party under company header like preview */}
        <View style={{ marginTop: 6, marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{party?.name || 'Party Ledger'}</Text>
          {party?.address && <Text style={{ fontSize: 9 }}>{party.address}</Text>}
          {party?.mobile && <Text style={{ fontSize: 9 }}>Phone: {party.mobile}</Text>}
        </View>

        <View style={[styles.tableHeader, { backgroundColor: '#0f172a' }]}>
          <Text style={[styles.cell, { width: '15%', color: '#fff' }]}>Date</Text>
          <Text style={[styles.cell, { width: '20%', color: '#fff' }]}>Ref</Text>
          <Text style={[styles.cell, { width: '18%', color: '#fff' }]}>Type</Text>
          <Text style={[styles.cell, { width: '12%', textAlign: 'center', color: '#fff' }]}>Cash</Text>
          <Text style={[styles.cell, { width: '11%', textAlign: 'right', color: '#fff' }]}>Debit</Text>
          <Text style={[styles.cell, { width: '11%', textAlign: 'right', color: '#fff' }]}>Credit</Text>
          <Text style={[styles.cell, { width: '13%', textAlign: 'right', color: '#fff' }]}>Balance</Text>
        </View>

        {rows.map((r: any, idx: number) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={[styles.cell, { width: '15%' }]}>{String(r.date || '').slice(0, 10)}</Text>
            <Text style={[styles.cell, { width: '20%' }]}>{r.ref || ''}</Text>
            <Text style={[styles.cell, { width: '18%' }]}>{r.type || ''}</Text>
            <Text style={[styles.cell, { width: '12%', textAlign: 'center', color: r.cash ? ( /sale/i.test(String(r.type || '')) ? '#059669' : '#059669') : '#94a3b8' }]}>{r.cash ? (/sale/i.test(String(r.type || '')) ? 'Cash Sale' : 'Cash') : '-'}</Text>
            <Text style={[styles.cell, { width: '11%', textAlign: 'right' }]}>{r.debit ? Number(r.debit).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '-'}</Text>
            <Text style={[styles.cell, { width: '11%', textAlign: 'right' }]}>{r.credit ? Number(r.credit).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '-'}</Text>
            <Text style={[styles.cell, { width: '13%', textAlign: 'right' }]}>{Number(r.balance || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>
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
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 10, color: '#64748b' }}>Totals</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ marginRight: 12 }}>
                      <Text style={{ fontSize: 9, color: '#64748b' }}>Total Debit</Text>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', fontFamily: ledgerFontFamily }}>{totalDebit.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>
                    </View>
                    <View style={{ marginRight: 12 }}>
                      <Text style={{ fontSize: 9, color: '#64748b' }}>Total Credit</Text>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', fontFamily: ledgerFontFamily }}>{totalCredit.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 9, color: '#64748b' }}>Ending Balance</Text>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', fontFamily: ledgerFontFamily }}>{Number(endingBalance || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>
                    </View>
                  </View>
                  <View>
                    <Text style={{ fontSize: 9, color: '#64748b' }}>Cash Sales Total</Text>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', fontFamily: ledgerFontFamily }}>{cashSalesTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>
                  </View>
                </View>
              </View>
            );
          })()
        )}
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



