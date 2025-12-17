import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e5e7eb', paddingVertical: 4, paddingHorizontal: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', paddingVertical: 3, paddingHorizontal: 4 },
  cell: { paddingRight: 4 },
});

export function InvoicePdf({ invoice, party, company }: any) {
  if (!invoice) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>No invoice data</Text>
        </Page>
      </Document>
    );
  }

  const freight = Number((invoice as any)?.freight || 0);

  const totals = (() => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    (invoice.items || []).forEach((item: any) => {
      const qty = Number(item.qty || 0);
      const rate = Number(item.rate || 0);
      const taxable = Number(item.amount != null ? item.amount : qty * rate);
      const gstAmt = taxable * (Number(item.taxPercent || 0) / 100);
      const taxType = (item.taxType || 'CGST_SGST').toUpperCase();
      subtotal += taxable;
      if (taxType === 'IGST') {
        igst += gstAmt;
      } else {
        cgst += gstAmt / 2;
        sgst += gstAmt / 2;
      }
    });
    const taxTotal = cgst + sgst + igst;
    const grand = subtotal + taxTotal + freight + Number(invoice.roundOff || 0);
    return { subtotal, cgst, sgst, igst, taxTotal, grand };
  })();

  const invoiceTitle =
    invoice.type === 'PURCHASE'
      ? 'PURCHASE VOUCHER'
      : invoice.paymentMode === 'cash'
      ? 'CASH MEMO'
      : 'TAX INVOICE';

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
            <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{invoiceTitle}</Text>
            <Text>Invoice No: {invoice.invoiceNo}</Text>
            <Text>Inv. Date: {String(invoice.date).slice(0, 10)}</Text>
            <Text>Payment Mode: {invoice.payment_mode || invoice.paymentMode || '-'}</Text>
          </View>
        </View>

        {/* Party section */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.sectionTitle}>
            {invoice.type === 'PURCHASE' ? 'Supplier' : 'Bill To'}
          </Text>
          <Text>{invoice.billingAddress?.name || party?.name || invoice.partyName}</Text>
          <Text>{invoice.billingAddress?.line1 || party?.billingAddress?.line1 || party?.address || ''}</Text>
          {invoice.billingAddress?.line2 || party?.billingAddress?.line2 ? (
            <Text>{invoice.billingAddress?.line2 || party?.billingAddress?.line2}</Text>
          ) : null}
        </View>

        {/* Items table */}
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, { width: '6%' }]}>#</Text>
            <Text style={[styles.cell, { width: '34%' }]}>Item</Text>
            <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>Qty</Text>
            <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>Rate</Text>
            <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>Taxable</Text>
            <Text style={[styles.cell, { width: '8%', textAlign: 'right' }]}>%</Text>
            <Text style={[styles.cell, { width: '10%', textAlign: 'right' }]}>Total</Text>
          </View>
          {(invoice.items || []).map((item: any, index: number) => {
            const taxable = (item.amount || (item.qty * item.rate)) || 0;
            const gstAmt = taxable * ((item.taxPercent || 0) / 100);
            const lineTotal = taxable + gstAmt;
            return (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.cell, { width: '6%' }]}>{index + 1}</Text>
                <Text style={[styles.cell, { width: '34%' }]}>{item.name}</Text>
                <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>{item.qty}</Text>
                <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>
                  {item.rate?.toFixed ? item.rate.toFixed(2) : item.rate}
                </Text>
                <Text style={[styles.cell, { width: '14%', textAlign: 'right' }]}>
                  {taxable.toFixed(2)}
                </Text>
                <Text style={[styles.cell, { width: '8%', textAlign: 'right' }]}>
                  {item.taxPercent}%
                </Text>
                <Text style={[styles.cell, { width: '10%', textAlign: 'right' }]}>
                  {lineTotal.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={{ marginTop: 4 }}>
          <Text style={styles.sectionTitle}>Totals</Text>
          <View style={styles.row}>
            <Text>Sub-Total:</Text>
            <Text>₹ {totals.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text>CGST:</Text>
            <Text>₹ {totals.cgst.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text>SGST:</Text>
            <Text>₹ {totals.sgst.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text>IGST:</Text>
            <Text>₹ {totals.igst.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Total GST:</Text>
            <Text>₹ {totals.taxTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Freight/Packing:</Text>
            <Text>₹ {freight.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Round off:</Text>
            <Text>₹ {(invoice.roundOff || 0).toFixed(2)}</Text>
          </View>
          <View style={[styles.row, { marginTop: 4 }]}>
            <Text style={{ fontWeight: 'bold' }}>Grand Total:</Text>
            <Text style={{ fontWeight: 'bold' }}>₹ {totals.grand.toFixed(2)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}


