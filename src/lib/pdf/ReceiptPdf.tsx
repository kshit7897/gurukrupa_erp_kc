import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { numberToWords } from '../numberToWords';

// Use same sizing and visual styles as InvoicePdf to ensure pixel-perfect match
const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#f1f5f9',
  },
  container: {
    margin: 0,
    padding: 0,
    width: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    marginTop: 24,
    marginBottom: 24,
    width: 530,
    minHeight: 780,
    borderRadius: 8,
    boxShadow: '0 2px 8px #e5e7eb',
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    color: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 16,
    marginBottom: 16,
  },
  logoBox: {
    width: 70,
    height: 70,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 16,
  },
  companyBlock: { flex: 1, flexDirection: 'column', justifyContent: 'center' },
  companyName: { fontSize: 18, fontWeight: 'extrabold', color: '#0f172a' },
  companyDetails: { fontSize: 10, color: '#64748b', marginTop: 2, lineHeight: 1.3 },
  metaBlock: { width: 180, alignItems: 'flex-end' },
  metaTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    textAlign: 'right',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#334155', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  partyBlock: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  partyName: { fontSize: 11, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
  partyDetails: { fontSize: 10, color: '#64748b', lineHeight: 1.2 },
  summaryBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { color: '#64748b', fontSize: 10 },
  summaryValue: { fontWeight: 'bold', color: '#0f172a', fontSize: 10 },
});

export function ReceiptPdf({ payment, party, company }: any) {
  if (!payment) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>No payment data</Text>
        </Page>
      </Document>
    );
  }

  const title = String(payment?.type || '').toLowerCase() === 'receive' ? 'RECEIPT' : 'PAYMENT VOUCHER';
  const voucherDisplay =
    payment.voucherNo && String(payment.voucherNo).trim().length > 0
      ? payment.voucherNo
      : `${String(payment?.type || '').toLowerCase() === 'receive' ? 'RCV' : 'PAY'}-${(payment?.date ? new Date(payment.date).getTime() : Date.now()).toString().slice(-8)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={styles.logoBox}>
                  {company?.logo ? (
                    <Image src={company.logo} style={{ width: 60, height: 60, objectFit: 'contain' }} />
                  ) : (
                    <View style={{ width: 40, height: 40, backgroundColor: '#0EA5A4', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>LOGO</Text>
                    </View>
                  )}
                </View>
                <View style={styles.companyBlock}>
                  <Text style={styles.companyName}>{company?.name || 'Company Name'}</Text>
                  <Text style={styles.companyDetails}>{company?.address_line_1 || company?.address || ''}</Text>
                  {company?.address_line_2 && <Text style={styles.companyDetails}>{company.address_line_2}</Text>}
                  <Text style={styles.companyDetails}>{company?.city ? `${company.city} - ${company?.pincode || ''}` : ''}{company?.state ? `, ${company.state}` : ''}</Text>
                  <Text style={styles.companyDetails}>Contact: {company?.contactNumbers?.join(', ') || company?.phone || '-'}</Text>
                  <Text style={[styles.companyDetails, { fontWeight: 'bold' }]}>GSTIN: {company?.gstin || company?.gstNumber || '-'}</Text>
                </View>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaTitle}>{title}</Text>
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 10, color: '#64748b' }}>Voucher No.</Text>
                  <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{voucherDisplay}</Text>
                </View>
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 10, color: '#64748b' }}>Date</Text>
                  <Text style={{ color: '#0f172a' }}>{String(payment.date).slice(0, 10)}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: '#64748b' }}>Payment Mode</Text>
                  <Text style={{ color: '#0f172a' }}>{payment.mode || payment.paymentMode || 'cash'}</Text>
                </View>
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>{String(payment.type || '').toLowerCase() === 'receive' ? 'Paid By' : 'Paid To'}</Text>
              <View style={styles.partyBlock}>
                <Text style={styles.partyName}>{party?.name || payment.partyName || '-'}</Text>
                <Text style={styles.partyDetails}>{party?.billingAddress?.line1 || party?.address || ''}</Text>
                {party?.billingAddress?.line2 && <Text style={styles.partyDetails}>{party.billingAddress.line2}</Text>}
                <Text style={styles.partyDetails}>{party?.billingAddress?.city || ''}{party?.billingAddress?.pincode ? ` - ${party.billingAddress.pincode}` : ''}</Text>
                <Text style={styles.partyDetails}>Contact: {party?.phone || party?.mobile || '-'}</Text>
                <Text style={styles.partyDetails}>GSTIN: {party?.gstin || party?.gstNo || '-'}</Text>
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={[styles.summaryBox, { marginBottom: 8 }]}> 
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Outstanding</Text><Text style={styles.summaryValue}>{(typeof payment.outstandingBefore === 'number' ? payment.outstandingBefore : 0).toFixed(2)}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{String(payment?.type || '').toLowerCase() === 'receive' ? 'Received' : 'Paid'}</Text><Text style={styles.summaryValue}>{(payment.amount || 0).toFixed(2)}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Balance Due</Text><Text style={styles.summaryValue}>{(typeof payment.outstandingAfter === 'number' ? payment.outstandingAfter : 0).toFixed(2)}</Text></View>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionTitle}>Amount in Words</Text>
              <Text style={{ color: '#0f172a', fontWeight: 'bold' }}>{payment.amountInWords || numberToWords(payment.amount || 0)}</Text>
            </View>

          </View>
        </View>
      </Page>
    </Document>
  );
}


