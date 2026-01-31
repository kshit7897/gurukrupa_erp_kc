import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { numberToWords } from '../numberToWords';

// Use same sizing and visual styles as InvoicePdf to ensure pixel-perfect match
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: 3, borderBottomColor: '#0f172a', paddingBottom: 20, marginBottom: 30 },
  logoSection: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  logoBox: { width: 60, height: 60, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  companyName: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase' },
  companyDetails: { fontSize: 8, color: '#64748b', marginTop: 2, textTransform: 'uppercase' },
  
  titleBox: { alignItems: 'flex-end' },
  title: { backgroundColor: '#0f172a', color: '#ffffff', padding: '4 12', borderRadius: 4, fontSize: 9, fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  metaLabel: { fontSize: 7, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' },
  metaValue: { fontSize: 9, color: '#0f172a', fontWeight: 'bold', marginBottom: 5 },

  partySection: { flexDirection: 'row', gap: 20, marginBottom: 40 },
  partyBox: { flex: 1, backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  partyLabel: { fontSize: 7, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5 },
  partyName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: 5 },
  partyAddress: { fontSize: 8, color: '#64748b', fontStyle: 'italic' },

  paymentMeta: { flex: 1, justifyContent: 'center', gap: 10 },
  paymentMetaRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: 1, borderBottomColor: '#f1f5f9', paddingBottom: 5 },
  
  amountSection: { backgroundColor: '#0f172a', borderRadius: 16, padding: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  amountLabel: { fontSize: 8, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5 },
  amountValue: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  balanceLabel: { fontSize: 8, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'right', marginBottom: 5 },
  balanceValue: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', opacity: 0.8, textAlign: 'right' },
  
  wordsSection: { paddingHorizontal: 10, marginBottom: 40 },
  wordsLabel: { fontSize: 7, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 3 },
  wordsValue: { fontSize: 9, color: '#334155', fontWeight: 'bold', fontStyle: 'italic', textDecoration: 'underline' },

  notesSection: { borderLeft: 2, borderLeftColor: '#e2e8f0', paddingLeft: 15, marginBottom: 60 },
  notesText: { fontSize: 9, color: '#64748b', fontStyle: 'italic' },

  signatureArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' },
  sigBox: { width: 140, textAlign: 'center' },
  sigLine: { borderTop: 1, borderTopColor: '#e2e8f0', marginTop: 5, paddingTop: 5 },
  sigLineCompany: { borderTop: 2, borderTopColor: '#0f172a', marginTop: 5, paddingTop: 5 },
  sigLabel: { fontSize: 7, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' },
  companySigLabel: { fontSize: 9, fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: 30 },
  
  footer: { textAlign: 'center', fontSize: 7, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 3, borderTop: 1, borderTopColor: '#f8fafc', paddingTop: 10 },
});

export function ReceiptPdf({ payment, party, company }: any) {
  if (!payment) return <Document><Page size="A4"><Text>No data</Text></Page></Document>;

  const title = String(payment?.type || '').toLowerCase() === 'receive' ? 'RECEIPT' : 'PAYMENT VOUCHER';
  const voucherDisplay = payment.voucherNo || '-';
  const formatCurrency = (v: any) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(Number(v || 0));

  return (
    <Document title={`Receipt - ${voucherDisplay}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <View style={styles.logoBox}>
              {company?.logo ? <Image src={company.logo} style={{ width: 45, height: 45, objectFit: 'contain' }} /> : <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#e2e8f0' }}>G</Text>}
            </View>
            <View>
              <Text style={styles.companyName}>{company?.name}</Text>
              <Text style={styles.companyDetails}>{company?.address}</Text>
              <Text style={styles.companyDetails}>GST: {company?.gstin} | PH: {company?.phone}</Text>
            </View>
          </View>
          <View style={styles.titleBox}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.metaLabel}>Voucher No</Text>
            <Text style={styles.metaValue}>{voucherDisplay}</Text>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{payment.date ? String(payment.date).slice(0,10) : '-'}</Text>
          </View>
        </View>

        <View style={styles.partySection}>
          <View style={styles.partyBox}>
             <Text style={styles.partyLabel}>{payment.type === 'receive' ? 'Received From' : 'Payment To'}</Text>
             <Text style={styles.partyName}>{party?.name || payment.partyName}</Text>
             <Text style={styles.partyAddress}>{party?.billingAddress?.line1}</Text>
             <Text style={styles.partyAddress}>GSTIN: {party?.gstin || 'N/A'}</Text>
          </View>
          <View style={styles.paymentMeta}>
             <View style={styles.paymentMetaRow}>
                <Text style={styles.metaLabel}>Payment Mode</Text>
                <Text style={[styles.metaValue, { marginBottom: 0 }]}>{payment.mode || 'CASH'}</Text>
             </View>
             <View style={styles.paymentMetaRow}>
                <Text style={styles.metaLabel}>Reference No</Text>
                <Text style={[styles.metaValue, { marginBottom: 0 }]}>{payment.reference || '-'}</Text>
             </View>
          </View>
        </View>

        <View style={styles.amountSection}>
          <View>
             <Text style={styles.amountLabel}>Transaction Amount</Text>
             <Text style={styles.amountValue}>₹ {formatCurrency(payment.amount)}</Text>
          </View>
          <View>
             <Text style={styles.balanceLabel}>Remaining Balance</Text>
             <Text style={styles.balanceValue}>₹ {formatCurrency(payment.outstandingAfter)}</Text>
          </View>
        </View>

        <View style={styles.wordsSection}>
           <Text style={styles.wordsLabel}>Amount in Words</Text>
           <Text style={styles.wordsValue}>{numberToWords(payment.amount)} Only</Text>
        </View>

        {payment.notes && (
          <View style={styles.notesSection}>
             <Text style={styles.partyLabel}>Remarks</Text>
             <Text style={styles.notesText}>"{payment.notes}"</Text>
          </View>
        )}

        <View style={styles.signatureArea}>
          <View style={styles.sigBox}>
             <View style={styles.sigLine} />
             <Text style={styles.sigLabel}>Receiver's Signature</Text>
          </View>
          <View style={styles.sigBox}>
             <Text style={styles.companySigLabel}>For {company?.name}</Text>
             <View style={styles.sigLineCompany} />
             <Text style={styles.sigLabel}>Authorized Signatory</Text>
          </View>
        </View>

        <Text style={styles.footer}>*** End of Receipt ***</Text>
      </Page>
    </Document>
  );
}


