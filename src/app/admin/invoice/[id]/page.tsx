'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Button, SoftLoader } from '../../../../components/ui/Common';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { Invoice, Party } from '../../../../types';
import { formatDate } from '../../../../lib/formatDate';
import { numberToWords } from '../../../../lib/numberToWords';

export default function InvoiceView() {
  const _params = useParams();
  const id = _params?.id as string | undefined;
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(1);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setSavedFlag(params.get('saved') === '1');
      if (params.get('download') === '1') {
        // mark that we should auto-download once invoice loads
        setTimeout(() => {
          // delay until invoice content renders
          const el = document.getElementById('invoice-content');
          if (el) {
            // trigger download via existing handler
            try { handleDownload(); } catch (e) { /* ignore */ }
          }
        }, 300);
      }
    } catch (e) {
      setSavedFlag(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const inv = await api.invoices.get(id as string);
        if (inv) {
          setInvoice(inv);
          const p = await api.parties.get(inv.partyId);
          if (p) setParty(p);
          try {
            const res = await fetch('/api/company');
            if (res.ok) {
              const data = await res.json();
              setCompany(data?.company || null);
            }
          } catch (e) { /* ignore */ }
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    const onData = () => {
      (async () => {
        setLoading(true);
        try {
          if (!id) return;
          const inv = await api.invoices.get(id as string);
          if (inv) {
            setInvoice(inv);
            const p = await api.parties.get(inv.partyId);
            if (p) setParty(p);
          }
        } catch (e) { console.error(e); } finally { setLoading(false); }
      })();
    };
    document.addEventListener('gurukrupa:data:updated', onData);
    return () => document.removeEventListener('gurukrupa:data:updated', onData);
  }, [id]);

  useEffect(() => {
    if (savedFlag) {
      setTimeout(() => {
        // Clear query param by replacing without it
        router.replace(`/admin/invoice/${id}`);
      }, 1200);
    }
  }, [savedFlag, id]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const a4WidthPx = 794; const padding = 24;
        if (containerWidth < (a4WidthPx + padding)) {
          setScale((containerWidth - padding) / a4WidthPx);
        } else { setScale(1); }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loading]);

  const handleDownload = async () => {
    if (!id) return;
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/invoices/pdf?id=${encodeURIComponent(id as string)}`);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Invoice PDF failed', text);
        setNotification({ type: 'error', message: 'Failed to generate PDF' });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice?.invoiceNo || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', message: 'Failed to generate PDF' });
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center text-slate-500 bg-slate-100"><div><SoftLoader size="lg" text="Loading invoice..." /></div></div>;
  if (!invoice) return <div className="text-center py-20 bg-slate-50 h-full"><h2 className="text-2xl font-bold text-slate-700">Invoice Not Found</h2><Button onClick={() => router.push('/admin/dashboard')} className="mt-4">Go to Dashboard</Button></div>;

  const invoiceTitle = invoice.type === 'PURCHASE' ? 'PURCHASE VOUCHER' : (invoice.paymentMode === 'cash' ? 'CASH MEMO' : 'TAX INVOICE');
  const freight = Number((invoice as any)?.freight || 0);

  // Derive totals from line items so header/table and footer stay in sync
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

  return (
    <div className="h-full bg-slate-100 flex flex-col">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 no-print shadow-sm shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3"><Button variant="ghost" onClick={() => router.back()} size="sm" className="text-slate-600"><ArrowLeft className="h-5 w-5" /> Back</Button><h2 className="font-bold text-slate-800">Preview</h2></div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (<><SoftLoader size="sm" /> Saving...</>) : (<><Download className="h-4 w-4 mr-2" /> PDF</>)}
            </Button>
            <Button icon={Printer} onClick={() => window.print()}>Print</Button>
          </div>
        </div>
      </div>
      {savedFlag && <div className="max-w-5xl mx-auto mt-4 p-3 text-sm rounded bg-green-100 text-green-800">Invoice saved successfully</div>}
      {notification && (
        <div className={`max-w-5xl mx-auto mt-4 p-3 text-sm rounded ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{notification.message}</div>
      )}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 print:p-0 print:overflow-visible bg-slate-100/50 flex flex-col items-center" ref={containerRef}>
        <style>{`@media print { #invoice-scaled { transform: none !important; width: 210mm !important; margin-bottom: 0 !important; } #invoice-content { box-shadow: none !important; min-height: auto !important; padding: 0 !important; } }`}</style>
        <div id="invoice-scaled" className="relative transition-transform print:transform-none print:w-full" style={{ width: '210mm', transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: `-${(1 - scale) * 297}mm` }}>
          <div id="invoice-content" className="bg-white shadow-xl print:shadow-none min-h-[297mm] text-slate-900 print:w-full print:m-0" style={{ padding: '10mm 12mm' }}>
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
              <div className="flex items-center gap-6 w-2/3">
                {/* <div className="w-28 h-28 bg-slate-100 rounded-md flex items-center justify-center border border-slate-200 overflow-hidden"> */}
                <div className="w-60 h-60 bg-slate-100 rounded-md flex items-center justify-center border border-slate-200 overflow-hidden">
                  {company?.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.logo} alt="logo" className="w-full h-full object-contain" />
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="14" rx="2" fill="#0EA5A4"/><path d="M7 10h10v4H7z" fill="white"/></svg>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{company?.name || 'Company Name'}</h1>
                  <div className="text-sm text-slate-600 leading-tight mt-1">
                    <div>{company?.address_line_1 || company?.address || ''}</div>
                    {company?.address_line_2 && <div>{company.address_line_2}</div>}
                    <div>{company?.city ? `${company.city} - ${company?.pincode || ''}` : ''} {company?.state ? `, ${company.state}` : ''}</div>
                    <div className="mt-1">Contact: {company?.contactNumbers?.join(', ') || company?.phone || '-'}</div>
                    <div className="mt-1 font-semibold">GSTIN: {company?.gstin || company?.gstNumber || '-'}</div>
                    <div className="mt-1 font-semibold">CIN: {company?.cin || '-'}</div>
                  </div>
                </div>
              </div>
              <div className="w-1/3 text-right">
                <div className="inline-block text-sm text-slate-700 font-bold bg-slate-100 px-3 py-1 rounded border border-slate-200">{invoiceTitle}</div>
                  <div className="mt-3 text-sm text-right">
                  <div className="flex justify-end"><div className="w-40 text-slate-600">Invoice No.</div><div className="w-48 font-bold text-slate-900">{invoice.invoiceNo}</div></div>
                  <div className="flex justify-end mt-1"><div className="w-40 text-slate-600">Inv. Date</div><div className="w-48">{formatDate(invoice.date)}</div></div>
                  <div className="flex justify-end mt-1"><div className="w-40 text-slate-600">Payment Mode</div><div className="w-48">{invoice.payment_mode || invoice.paymentMode || '-'}</div></div>
                  {/* <div className="flex justify-end mt-1"><div className="w-40 text-slate-600">Reverse Charge</div><div className="w-48">{invoice.reverse_charge ? 'YES' : 'NO'}</div></div> */}
                </div>
              </div>
            </div>

            {/* Purchase-specific layout: Supplier block + metadata on right */}
            {invoice.type === 'PURCHASE' ? (
              <div className="grid grid-cols-5 gap-4 mb-4">
                <div className="col-span-3">
                  <div className="bg-slate-50 border border-slate-100 rounded p-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase">Supplier</div>
                    <div className="mt-2 text-sm font-semibold text-slate-800">{invoice.billingAddress?.name || party?.name || invoice.partyName}</div>
                    <div className="mt-1 text-sm text-slate-600 leading-tight">
                      {(invoice.billingAddress?.line1 || party?.billingAddress?.line1 || party?.address) || ''}
                      {(invoice.billingAddress?.line2 || party?.billingAddress?.line2) && (<div>{invoice.billingAddress?.line2 || party?.billingAddress?.line2}</div>)}
                      <div>{invoice.billingAddress?.city || party?.billingAddress?.city || ''}{(invoice.billingAddress?.pincode || party?.billingAddress?.pincode) ? ` - ${invoice.billingAddress?.pincode || party?.billingAddress?.pincode}` : ''}</div>
                      <div className="mt-1">Contact: {invoice.billingAddress?.phone || party?.phone || party?.mobile || '-'}</div>
                      <div className="mt-1">GSTIN: {invoice.billingAddress?.gstin || party?.gstin || party?.gstNo || '-'}</div>
                      <div className="mt-1">CIN: {party?.cin || '-'}</div>
                    </div>
                  </div>
                </div>
                {/* <div className="col-span-2">
                  <div className="border border-slate-100 rounded p-3 text-sm bg-white">
                    <div className="space-y-2 text-slate-600">
                      <div className="flex justify-between items-center">
                        <div className="w-40 font-medium text-slate-700">Purchase Voucher No.</div>
                        <div className="text-right text-slate-900 whitespace-nowrap ml-4">{invoice.invoiceNo || '-'}</div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="w-40 font-medium text-slate-700">Supplier Invoice No.</div>
                        <div className="text-right text-slate-900 whitespace-nowrap ml-4">{invoice.supplier_ref || '-'}</div>
                      </div>
                        <div className="flex justify-between items-center">
                        <div className="w-40 font-medium text-slate-700">Supplier Invoice Date</div>
                        <div className="text-right text-slate-900 whitespace-nowrap ml-4">{formatDate(invoice.delivery_date || invoice.date)}</div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="w-40 font-medium text-slate-700">Purchase Type</div>
                        <div className="text-right text-slate-900 whitespace-nowrap ml-4">{(invoice.payment_mode || invoice.paymentMode || 'Cash').toString()}</div>
                      </div>
                    </div>
                  </div>
                </div> */}
              </div>
            ) : (
              <div className="grid grid-cols-5 grid-rows-2 gap-4 mb-4">
                <div className="col-span-3 row-span-2 flex flex-col gap-4">
                  <div className="bg-slate-50 border border-slate-100 rounded p-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase">Bill To</div>
                    <div className="mt-2 text-sm font-semibold text-slate-800">{invoice.billingAddress?.name || party?.name || invoice.partyName}</div>
                      <div className="mt-1 text-sm text-slate-600 leading-tight">
                      {(invoice.billingAddress?.line1 || party?.billingAddress?.line1 || party?.address) || ''}
                      {(invoice.billingAddress?.line2 || party?.billingAddress?.line2) && (<div>{invoice.billingAddress?.line2 || party?.billingAddress?.line2}</div>)}
                      <div>{invoice.billingAddress?.city || party?.billingAddress?.city || ''}{(invoice.billingAddress?.pincode || party?.billingAddress?.pincode) ? ` - ${invoice.billingAddress?.pincode || party?.billingAddress?.pincode}` : ''}</div>
                      <div>{invoice.billingAddress?.state || party?.billingAddress?.state || ''}</div>
                      <div className="mt-1">Phone: {invoice.billingAddress?.phone || party?.phone || party?.mobile || '-'}</div>
                      <div className="mt-1">GSTIN: {invoice.billingAddress?.gstin || party?.gstin || party?.gstNo || '-'}</div>
                      <div className="mt-1">CIN: {party?.cin || '-'}</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded p-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase">Ship To</div>
                      <div className="mt-2 text-sm font-semibold text-slate-800">{invoice.shippingAddress?.name || party?.name || invoice.partyName}</div>
                      <div className="mt-1 text-sm text-slate-600 leading-tight">
                        {(invoice.shippingAddress?.line1 || party?.shippingAddress?.line1 || party?.address) || ''}
                        {(invoice.shippingAddress?.line2 || party?.shippingAddress?.line2) && (<div>{invoice.shippingAddress?.line2 || party?.shippingAddress?.line2}</div>)}
                        <div>{invoice.shippingAddress?.city || party?.shippingAddress?.city || ''}{(invoice.shippingAddress?.pincode || party?.shippingAddress?.pincode) ? ` - ${invoice.shippingAddress?.pincode || party?.shippingAddress?.pincode}` : ''}</div>
                        <div>{invoice.shippingAddress?.state || party?.shippingAddress?.state || ''}</div>
                        <div className="mt-1">GSTIN: {invoice.shippingAddress?.gstin || party?.gstin || party?.gstNo || '-'}</div>
                          <div className="mt-1">CIN: {party?.cin || '-'}</div>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 row-span-2">
                  <div className="border border-slate-100 rounded p-3 text-sm h-full flex items-start bg-white">
                    <div className="w-full space-y-2 text-slate-600">
                      <div className="flex justify-between items-center">
                        <div className="w-40 font-medium text-slate-700">Buyer&apos;s Order No</div>
                        <div className="text-right text-slate-900 whitespace-nowrap ml-4">{invoice.buyer_order_no || '-'}</div>
                      </div>
                      {/* <div className="flex justify-between items-center">
                        <div className="w-40 font-medium text-slate-700">Supplier&apos;s Ref.</div>
                        <div className="text-right text-slate-900 whitespace-nowrap ml-4">{invoice.supplier_ref || '-'}</div>
                      </div> */}
                      <div className="flex justify-between items-center">
                        <div className="w-40 font-medium text-slate-700">Vehicle Number</div>
                        <div className="text-right text-slate-900 whitespace-nowrap ml-4">{invoice.vehicle_no || '-'}</div>
                      </div>
                      {/* <div className="flex justify-between items-center">
                        <div className="w-40 font-medium text-slate-700">Delivery Date</div>
                        <div className="text-right text-slate-900 whitespace-nowrap ml-4">{invoice.delivery_date || '-'}</div>
                      </div> */}
                      {/* <div className="flex justify-between items-center">
                        <div className="w-40 font-medium text-slate-700">Transport Details</div>
                        <div className="text-right text-slate-900 whitespace-nowrap ml-4">{invoice.transport_details || '-'}</div>
                      </div> */}
                      {/* <div className="flex justify-between items-center">
                        <div className="w-40 font-medium text-slate-700">Terms Of Delivery</div>
                        <div className="text-right text-slate-900 whitespace-nowrap ml-4">{invoice.terms_of_delivery || '-'}</div>
                      </div> */}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Items table */}
            <div className="mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  {invoice.type === 'PURCHASE' ? (
                    <tr className="bg-slate-100 text-slate-700 text-left text-xs">
                      <th className="py-2 px-2 w-8">Sr</th>
                      <th className="py-2 px-2">Item Name</th>
                      <th className="py-2 px-2 w-16 text-right">HSN</th>
                      <th className="py-2 px-2 w-20 text-right">Quantity</th>
                      <th className="py-2 px-2 w-24 text-right">Rate</th>
                      <th className="py-2 px-2 w-16 text-right">GST %</th>
                      <th className="py-2 px-2 w-24 text-right">GST Amt.</th>
                      <th className="py-2 px-2 w-28 text-right">Value</th>
                    </tr>
                  ) : (
                    <tr className="bg-slate-100 text-slate-700 text-left text-xs">
                      <th className="py-2 px-2 w-8">Sr</th>
                      <th className="py-2 px-2">Goods & Service Description</th>
                      <th className="py-2 px-2 w-16 text-right">HSN</th>
                      <th className="py-2 px-2 w-20 text-right">Quantity</th>
                      <th className="py-2 px-2 w-24 text-right">Rate</th>
                      <th className="py-2 px-2 w-24 text-right">Taxable</th>
                      <th className="py-2 px-2 w-16 text-right">GST %</th>
                      <th className="py-2 px-2 w-24 text-right">GST Amt.</th>
                      <th className="py-2 px-2 w-28 text-right">Total</th>
                    </tr>
                  )}
                </thead>
                <tbody className="text-slate-700">
                  {invoice.items.map((item, index) => {
                    const taxable = (item.amount || (item.qty * item.rate)) || 0;
                    const gstAmt = taxable * ((item.taxPercent || 0) / 100);
                    const lineTotal = taxable + gstAmt;
                    return (
                      <tr key={index} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 px-2 text-slate-500">{index + 1}</td>
                        <td className="py-3 px-2 font-semibold text-slate-800">{item.name}</td>
                        <td className="py-3 px-2 text-right text-slate-500">{(item as any).hsn || '-'}</td>
                        {invoice.type === 'PURCHASE' ? (
                          <>
                            <td className="py-3 px-2 text-right">{item.qty}</td>
                            <td className="py-3 px-2 text-right">{item.rate?.toFixed ? item.rate.toFixed(2) : item.rate}</td>
                            <td className="py-3 px-2 text-right">{item.taxPercent}%</td>
                            <td className="py-3 px-2 text-right">{gstAmt.toFixed(2)}</td>
                            <td className="py-3 px-2 text-right font-semibold">{lineTotal.toFixed(2)}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-2 text-right">{item.qty}</td>
                            <td className="py-3 px-2 text-right">{item.rate?.toFixed ? item.rate.toFixed(2) : item.rate}</td>
                            <td className="py-3 px-2 text-right">{taxable.toFixed(2)}</td>
                            <td className="py-3 px-2 text-right">{item.taxPercent}%</td>
                            <td className="py-3 px-2 text-right">{gstAmt.toFixed(2)}</td>
                            <td className="py-3 px-2 text-right font-bold">{lineTotal.toFixed(2)}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary and payment/bank/footer */}
            <div className="flex gap-4 mt-4">
              <div className="w-1/2 bg-white border border-slate-100 rounded p-3 text-sm">
                <div className="font-semibold text-slate-700">Our Bank Details</div>
                <div className="mt-2 text-slate-600 text-sm">
                  <div><span className="font-medium">Bank Name :</span> {company?.bank_name || '-'}</div>
                  <div><span className="font-medium">Branch :</span> {company?.bank_branch || company?.city || '-'}</div>
                  <div><span className="font-medium">Account No :</span> {company?.bank_account_no || '-'}</div>
                  <div><span className="font-medium">IFSC Code :</span> {company?.ifsc_code || '-'}</div>
                  <div><span className="font-medium">UPI ID :</span> {company?.upi_id || '-'}</div>
                </div>
                  {Array.isArray(company?.extraDetails) && company.extraDetails.length > 0 && (
                    <div className="mt-4 bg-slate-50 border border-slate-100 rounded p-3 text-sm">
                      {company.extraDetails.map((e: any, i: number) => (
                        <div key={i}><span className="font-medium">{e.label} :</span> {e.value}</div>
                      ))}
                    </div>
                  )}
                <div className="mt-4 text-slate-700 font-medium">Invoice Total in Word</div>
                <div className="mt-1 text-slate-600">{invoice.total_amount_in_words || numberToWords(invoice.grandTotal || 0)}</div>
              </div>
              <div className="w-1/2">
                <div className="bg-white border border-slate-100 rounded p-3">
                  {invoice.type === 'PURCHASE' ? (
                    <div>
                      <div className="text-sm text-slate-600 flex justify-between"><div>Subtotal</div><div className="font-bold">₹ {totals.subtotal.toFixed(2)}</div></div>
                      <div className="text-sm text-slate-600 flex justify-between mt-1"><div>CGST</div><div className="font-bold">₹ {totals.cgst.toFixed(2)}</div></div>
                      <div className="text-sm text-slate-600 flex justify-between mt-1"><div>SGST</div><div className="font-bold">₹ {totals.sgst.toFixed(2)}</div></div>
                      <div className="text-sm text-slate-600 flex justify-between mt-1"><div>Total GST</div><div className="font-bold">₹ {totals.taxTotal.toFixed(2)}</div></div>
                      <div className="text-lg font-extrabold text-slate-900 flex justify-between mt-2 border-t border-slate-200 pt-2"><div>Grand Total</div><div>₹ {totals.grand.toFixed(2)}</div></div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-slate-600 flex justify-between"><div>Sub-Total:</div><div className="font-bold">{totals.subtotal.toFixed(2)}</div></div>
                      <div className="text-sm text-slate-600 flex justify-between mt-1"><div>CGST Amt :</div><div className="font-bold">{totals.cgst.toFixed(2)}</div></div>
                      <div className="text-sm text-slate-600 flex justify-between mt-1"><div>SGST Amt :</div><div className="font-bold">{totals.sgst.toFixed(2)}</div></div>
                      <div className="text-sm text-slate-600 flex justify-between mt-1"><div>IGST Amt :</div><div className="font-bold">{totals.igst.toFixed(2)}</div></div>
                      <div className="text-sm text-slate-600 flex justify-between mt-1"><div>Total GST :</div><div className="font-bold">{totals.taxTotal.toFixed(2)}</div></div>
                      {/* <div className="text-sm text-slate-600 flex justify-between mt-1"><div>Freight/Packing:</div><div className="font-bold">{freight.toFixed(2)}</div></div> */}
                      <div className="text-sm text-slate-600 flex justify-between mt-2 border-t border-slate-100 pt-2"><div>Round off :</div><div className="font-bold">{(invoice.roundOff || 0).toFixed(2)}</div></div>
                      <div className="text-lg font-extrabold text-slate-900 flex justify-between mt-2 border-t border-slate-200 pt-2"><div>Total Amount :</div><div>₹ {totals.grand.toFixed(2)}</div></div>
                    </div>
                  )}
                </div>
                {/* <div className="mt-6 flex justify-end">
                  <div className="text-center">
                    <div className="text-xs font-semibold text-slate-800 mb-2">{company?.name || 'Company Name'}</div>
                    
                    <div className="w-40 mx-auto mb-2">
                      <div className="h-14 border-b border-dashed border-slate-300"></div>
                    </div>
                    <div className="h-20 w-36 border-t border-slate-300 text-sm font-semibold text-slate-700">Authorized Signatory</div>
                  </div>
                </div> */}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="col-span-2 bg-white border border-slate-100 rounded p-3 text-sm">
                <div className="font-semibold text-slate-700">Declaration</div>
                <div className="mt-2 text-slate-600 text-sm">
                  {company?.declaration_text ? company.declaration_text.map((d: string, i: number) => (<div key={i}>{d}</div>)) : (<>
                    <div>1. Subject to jurisdiction</div>
                    <div>2. Terms & conditions are subject to our trade policy</div>
                    <div>3. Our risk & responsibility ceases after the delivery of goods.</div>
                  </>)}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                  <div className="text-center">
                    <div className="text-xs font-semibold text-slate-800 mb-2">{company?.name || 'Company Name'}</div>
                    {/* Signature area: empty space where user can sign */}
                    <div className="w-40 mx-auto mb-2">
                      <div className="h-10 "></div>
                    </div>
                    <div className="h-20 w-36 border-t border-slate-300 text-sm font-semibold text-slate-700">Authorized Signatory</div>
                  </div>
                </div>
              {/* <div className="col-span-1 flex flex-col items-center justify-between">
                <div className="w-36 h-36 border border-slate-200 rounded flex items-center justify-center">QR</div>
                <div className="text-xs text-slate-500 mt-2">Thank You For Business With US!</div>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
