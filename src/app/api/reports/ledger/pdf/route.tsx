import { NextResponse } from 'next/server';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/lib/models/Invoice';
import Payment from '@/lib/models/Payment';
import Party from '@/lib/models/Party';
import Company from '@/lib/models/Company';

export const dynamic = 'force-dynamic';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica' },
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
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>Ledger Statement</Text>
            {from && to ? <Text>{`Period: ${from} to ${to}`}</Text> : null}
            <Text>{party?.name || 'Party'}</Text>
            <Text>{party?.type || ''}</Text>
          </View>
          <View>
            <Text>{company?.name || 'Company'}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.cell, { width: '18%' }]}>Date</Text>
          <Text style={[styles.cell, { width: '22%' }]}>Ref</Text>
          <Text style={[styles.cell, { width: '16%' }]}>Type</Text>
          <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>Debit</Text>
          <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>Credit</Text>
          <Text style={[styles.cell, { width: '16%', textAlign: 'right' }]}>Balance</Text>
        </View>
        {rows.map((r: any, idx: number) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={[styles.cell, { width: '18%' }]}>{String(r.date || '').slice(0, 10)}</Text>
            <Text style={[styles.cell, { width: '22%' }]}>{r.ref || ''}</Text>
            <Text style={[styles.cell, { width: '16%' }]}>{r.type || ''}</Text>
            <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>{r.debit ? Number(r.debit).toFixed(2) : '-'}</Text>
            <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>{r.credit ? Number(r.credit).toFixed(2) : '-'}</Text>
            <Text style={[styles.cell, { width: '16%', textAlign: 'right' }]}>{Number(r.balance || 0).toFixed(2)}</Text>
          </View>
        ))}
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

    return new NextResponse(buffer, {
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


