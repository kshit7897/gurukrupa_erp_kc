import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
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
      : `${String(payment?.type || '').toLowerCase() === 'receive' ? 'RCV' : 'PAY'}-${(payment?.date
          ? new Date(payment.date).getTime()
          : Date.now()
        )
          .toString()
          .slice(-8)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{company?.name || 'Company Name'}</Text>
            <Text>{company?.address_line_1 || company?.address || ''}</Text>
            {company?.address_line_2 && <Text>{company.address_line_2}</Text>}
            <Text>
              {(company?.city || '') +
                (company?.pincode ? ` - ${company.pincode}` : '') +
                (company?.state ? `, ${company.state}` : '')}
            </Text>
            <Text>Contact: {company?.contactNumbers?.join(', ') || company?.phone || '-'}</Text>
            <Text>GSTIN: {company?.gstin || company?.gstNumber || '-'}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{title}</Text>
            <Text>Voucher No: {voucherDisplay}</Text>
            <Text>Date: {String(payment.date).slice(0, 10)}</Text>
            <Text>Payment Mode: {payment.mode || payment.paymentMode || 'cash'}</Text>
          </View>
        </View>

        {/* Party */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.sectionTitle}>
            {String(payment.type || '').toLowerCase() === 'receive' ? 'Paid By' : 'Paid To'}
          </Text>
          <Text>{party?.name || payment.partyName || '-'}</Text>
          <Text>{party?.billingAddress?.line1 || party?.address || ''}</Text>
          {party?.billingAddress?.line2 && <Text>{party.billingAddress.line2}</Text>}
        </View>

        {/* Summary */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.row}>
            <Text>Outstanding</Text>
            <Text>
              ₹{' '}
              {(
                typeof payment.outstandingBefore === 'number' ? payment.outstandingBefore : 0
              ).toFixed(2)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text>{String(payment?.type || '').toLowerCase() === 'receive' ? 'Received' : 'Paid'}</Text>
            <Text>₹ {(payment.amount || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Balance Due</Text>
            <Text>
              ₹{' '}
              {(
                typeof payment.outstandingAfter === 'number' ? payment.outstandingAfter : 0
              ).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Amount in words */}
        <View style={{ marginTop: 10 }}>
          <Text style={styles.sectionTitle}>Amount in Words</Text>
          <Text>{payment.amountInWords || ''}</Text>
        </View>
      </Page>
    </Document>
  );
}


