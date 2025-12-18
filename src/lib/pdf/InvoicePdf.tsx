import React from 'react';

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

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
    width: 530, // ~210mm
    minHeight: 780, // ~297mm
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
  companyBlock: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'extrabold',
    color: '#0f172a',
  },
  companyDetails: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 1.3,
  },
  metaBlock: {
    width: 180,
    alignItems: 'flex-end',
  },
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 2,
  },
  metaLabel: {
    width: 70,
    color: '#64748b',
    fontSize: 10,
    textAlign: 'right',
  },
  metaValue: {
    width: 90,
    fontWeight: 'bold',
    color: '#0f172a',
    fontSize: 10,
    textAlign: 'right',
    marginLeft: 8,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  partyBlock: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  partyName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  partyDetails: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 1.2,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    fontSize: 9,
    color: '#334155',
    textAlign: 'left',
    paddingRight: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 9,
    color: '#1e293b',
    textAlign: 'left',
    paddingRight: 2,
  },
  tableCellRight: {
    textAlign: 'right',
  },
  summaryBlock: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  summaryLeft: {
    width: '50%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    fontSize: 10,
  },
  summaryRight: {
    width: '50%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    fontSize: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 10,
  },
  summaryValue: {
    fontWeight: 'bold',
    color: '#0f172a',
    fontSize: 10,
  },
  grandTotal: {
    fontSize: 13,
    fontWeight: 'extrabold',
    color: '#0f172a',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bankBlock: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    fontSize: 10,
  },
  declarationBlock: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    fontSize: 10,
  },
  signBlock: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  signText: {
    fontSize: 10,
    color: '#334155',
    textAlign: 'center',
    marginTop: 8,
  },
  qrBox: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
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
        <View style={styles.container}>
          <View style={styles.content}>
            {/* Header: logo, company, meta */}
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
                  <Text style={styles.companyDetails}>
                    {company?.city ? `${company.city} - ${company?.pincode || ''}` : ''}{company?.state ? `, ${company.state}` : ''}
                  </Text>
                  <Text style={styles.companyDetails}>Contact: {company?.contactNumbers?.join(', ') || company?.phone || '-'}</Text>
                  <Text style={[styles.companyDetails, { fontWeight: 'bold' }]}>GSTIN: {company?.gstin || company?.gstNumber || '-'}</Text>
                  <Text style={[styles.companyDetails, { fontWeight: 'bold' }]}>CIN: {company?.cin || '-'}</Text>
                </View>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaTitle}>{invoiceTitle}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Invoice No.</Text>
                  <Text style={styles.metaValue}>{invoice.invoiceNo}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Inv. Date</Text>
                  <Text style={styles.metaValue}>{String(invoice.date).slice(0, 10)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Payment Mode</Text>
                  <Text style={styles.metaValue}>{invoice.payment_mode || invoice.paymentMode || '-'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Reverse Charge</Text>
                  <Text style={styles.metaValue}>{invoice.reverse_charge ? 'YES' : 'NO'}</Text>
                </View>
              </View>
            </View>

            {/* Party blocks */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{invoice.type === 'PURCHASE' ? 'Supplier' : 'Bill To'}</Text>
              <View style={styles.partyBlock}>
                <Text style={styles.partyName}>{invoice.billingAddress?.name || party?.name || invoice.partyName}</Text>
                <Text style={styles.partyDetails}>{invoice.billingAddress?.line1 || party?.billingAddress?.line1 || party?.address || ''}</Text>
                {invoice.billingAddress?.line2 || party?.billingAddress?.line2 ? (
                  <Text style={styles.partyDetails}>{invoice.billingAddress?.line2 || party?.billingAddress?.line2}</Text>
                ) : null}
                <Text style={styles.partyDetails}>
                  {(invoice.billingAddress?.city || party?.billingAddress?.city || '') +
                    ((invoice.billingAddress?.pincode || party?.billingAddress?.pincode) ? ` - ${invoice.billingAddress?.pincode || party?.billingAddress?.pincode}` : '')}
                </Text>
                <Text style={styles.partyDetails}>{invoice.billingAddress?.state || party?.billingAddress?.state || ''}</Text>
                <Text style={styles.partyDetails}>Phone: {invoice.billingAddress?.phone || party?.phone || party?.mobile || '-'}</Text>
                <Text style={styles.partyDetails}>GSTIN: {invoice.billingAddress?.gstin || party?.gstin || party?.gstNo || '-'}</Text>
                <Text style={styles.partyDetails}>CIN: {party?.cin || '-'}</Text>
              </View>
            </View>

            {/* Items Table */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '6%' }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: '28%' }]}>Item</Text>
                <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>HSN</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%', textAlign: 'right' }]}>Qty</Text>
                <Text style={[styles.tableHeaderCell, { width: '14%', textAlign: 'right' }]}>Rate</Text>
                <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>%</Text>
                <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>GST Amt.</Text>
                <Text style={[styles.tableHeaderCell, { width: '14%', textAlign: 'right' }]}>Total</Text>
              </View>
              {(invoice.items || []).map((item: any, index: number) => {
                const taxable = (item.amount || (item.qty * item.rate)) || 0;
                const gstAmt = taxable * ((item.taxPercent || 0) / 100);
                const lineTotal = taxable + gstAmt;
                return (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: '6%' }]}>{index + 1}</Text>
                    <Text style={[styles.tableCell, { width: '28%' }]}>{item.name}</Text>
                    <Text style={[styles.tableCell, styles.tableCellRight, { width: '10%' }]}>{item.hsn || '-'}</Text>
                    <Text style={[styles.tableCell, styles.tableCellRight, { width: '12%' }]}>{item.qty}</Text>
                    <Text style={[styles.tableCell, styles.tableCellRight, { width: '14%' }]}>{item.rate?.toFixed ? item.rate.toFixed(2) : item.rate}</Text>
                    <Text style={[styles.tableCell, styles.tableCellRight, { width: '10%' }]}>{item.taxPercent}%</Text>
                    <Text style={[styles.tableCell, styles.tableCellRight, { width: '10%' }]}>{gstAmt.toFixed(2)}</Text>
                    <Text style={[styles.tableCell, styles.tableCellRight, { width: '14%' }]}>{lineTotal.toFixed(2)}</Text>
                  </View>
                );
              })}
            </View>

            {/* Summary and Bank Details */}
            <View style={styles.summaryBlock}>
              <View style={styles.summaryLeft}>
                <Text style={{ fontWeight: 'bold', color: '#334155', marginBottom: 4 }}>Our Bank Details</Text>
                <Text style={styles.summaryLabel}>Bank Name: <Text style={styles.summaryValue}>{company?.bank_name || '-'}</Text></Text>
                <Text style={styles.summaryLabel}>Branch: <Text style={styles.summaryValue}>{company?.bank_branch || company?.city || '-'}</Text></Text>
                <Text style={styles.summaryLabel}>Account No: <Text style={styles.summaryValue}>{company?.bank_account_no || '-'}</Text></Text>
                <Text style={styles.summaryLabel}>IFSC Code: <Text style={styles.summaryValue}>{company?.ifsc_code || '-'}</Text></Text>
                <Text style={styles.summaryLabel}>UPI ID: <Text style={styles.summaryValue}>{company?.upi_id || '-'}</Text></Text>
                {Array.isArray(company?.extraDetails) && company.extraDetails.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    {company.extraDetails.map((e: any, i: number) => (
                      <Text key={i} style={styles.summaryLabel}>{e.label}: <Text style={styles.summaryValue}>{e.value}</Text></Text>
                    ))}
                  </View>
                )}
                <Text style={{ fontWeight: 'bold', color: '#334155', marginTop: 8 }}>Invoice Total in Words</Text>
                <Text style={styles.summaryLabel}>{invoice.total_amount_in_words || ''}</Text>
              </View>
              <View style={styles.summaryRight}>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Sub-Total:</Text><Text style={styles.summaryValue}>{(totals.subtotal.toFixed(2) + '').replace(/[^0-9.]/g, '')}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>CGST:</Text><Text style={styles.summaryValue}>{(totals.cgst.toFixed(2) + '').replace(/[^0-9.]/g, '')}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>SGST:</Text><Text style={styles.summaryValue}>{(totals.sgst.toFixed(2) + '').replace(/[^0-9.]/g, '')}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>IGST:</Text><Text style={styles.summaryValue}>{(totals.igst.toFixed(2) + '').replace(/[^0-9.]/g, '')}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total GST:</Text><Text style={styles.summaryValue}>{(totals.taxTotal.toFixed(2) + '').replace(/[^0-9.]/g, '')}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Freight/Packing:</Text><Text style={styles.summaryValue}>{(freight.toFixed(2) + '').replace(/[^0-9.]/g, '')}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Round off:</Text><Text style={styles.summaryValue}>{((invoice.roundOff || 0).toFixed(2) + '').replace(/[^0-9.]/g, '')}</Text></View>
                <View style={styles.grandTotal}><Text>Grand Total:</Text><Text>{(totals.grand.toFixed(2) + '').replace(/[^0-9.]/g, '')}</Text></View>
              </View>
            </View>

            {/* Declaration and Signature */}
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <View style={{ flex: 2 }}>
                <View style={styles.declarationBlock}>
                  <Text style={{ fontWeight: 'bold', color: '#334155', marginBottom: 4 }}>Declaration</Text>
                  {company?.declaration_text ? (
                    company.declaration_text.map((d: string, i: number) => (
                      <Text key={i} style={styles.summaryLabel}>{d}</Text>
                    ))
                  ) : (
                    <>
                      <Text style={styles.summaryLabel}>1. Subject to jurisdiction</Text>
                      <Text style={styles.summaryLabel}>2. Terms & conditions are subject to our trade policy</Text>
                      <Text style={styles.summaryLabel}>3. Our risk & responsibility ceases after the delivery of goods.</Text>
                    </>
                  )}
                </View>
              </View>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                <View style={styles.qrBox}><Text>QR</Text></View>
                <Text style={styles.signText}>Thank You For Business With Us!</Text>
                <View style={styles.signBlock}>
                  <View style={{ width: 100, borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 18 }} />
                </View>
                <Text style={styles.signText}>Authorized Signatory</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}


