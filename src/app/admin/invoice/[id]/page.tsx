'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Button } from '../../../../components/ui/Common';
import { Printer, ArrowLeft, Download, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { Invoice, Party } from '../../../../types';

export default function InvoiceView() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const inv = await api.invoices.get(id as string);
        if (inv) {
          setInvoice(inv);
          const p = await api.parties.get(inv.partyId);
          if (p) setParty(p);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    loadData();
  }, [id]);

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

  const handleDownload = () => {
    const element = document.getElementById('invoice-content');
    if (!element) return;
    setIsDownloading(true);
    // @ts-ignore
    if (typeof window.html2pdf === 'undefined') { alert("PDF generator is initializing"); setIsDownloading(false); return; }
    // @ts-ignore
    window.html2pdf().set({ margin: 0, filename: `Invoice_${invoice?.invoiceNo}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save().then(() => setIsDownloading(false));
  };

  if (loading) return <div className="flex h-full items-center justify-center text-slate-500 bg-slate-100"><Loader2 className="h-8 w-8 animate-spin mr-3 text-blue-600" /> Loading Invoice...</div>;
  if (!invoice) return <div className="text-center py-20 bg-slate-50 h-full"><h2 className="text-2xl font-bold text-slate-700">Invoice Not Found</h2><Button onClick={() => router.push('/admin/dashboard')} className="mt-4">Go to Dashboard</Button></div>;

  const invoiceTitle = invoice.paymentMode === 'cash' ? 'CASH MEMO' : 'TAX INVOICE';

  return (
    <div className="h-full bg-slate-100 flex flex-col">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 no-print shadow-sm shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3"><Button variant="ghost" onClick={() => router.back()} size="sm" className="text-slate-600"><ArrowLeft className="h-5 w-5" /> Back</Button><h2 className="font-bold text-slate-800">Preview</h2></div>
          <div className="flex space-x-3"><Button variant="outline" icon={isDownloading ? Loader2 : Download} onClick={handleDownload} disabled={isDownloading}>{isDownloading ? 'Saving...' : 'PDF'}</Button><Button icon={Printer} onClick={() => window.print()}>Print</Button></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 print:p-0 print:overflow-visible bg-slate-100/50 flex flex-col items-center" ref={containerRef}>
        <div className="relative transition-transform print:transform-none print:w-full" style={{ width: '210mm', transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: `-${(1 - scale) * 297}mm` }}>
          <div id="invoice-content" className="bg-white shadow-xl print:shadow-none min-h-[297mm] text-slate-900 print:w-full print:m-0" style={{ padding: '10mm 12mm' }}>
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
              <div className="w-2/3"><h1 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase">Gurukrupa Multi Ventures Pvt Ltd</h1><p className="text-sm font-medium text-slate-600 mt-2">Shop No 4, Market Yard, Pune - 411037</p><div className="flex gap-4 mt-1 text-sm text-slate-600"><span className="font-semibold">GSTIN: 27ABCDE1234F1Z5</span><span>|</span><span>+91 98765 43210</span></div></div>
              <div className="text-right w-1/3"><h2 className="text-xl font-bold text-slate-700 uppercase bg-slate-100 px-3 py-1 inline-block rounded border border-slate-200">{invoiceTitle}</h2><div className="mt-3 text-sm"><p className="font-bold text-slate-800">Invoice #: {invoice.invoiceNo}</p><p className="text-slate-500">Date: {invoice.date}</p></div></div>
            </div>
            <div className="mb-8 flex justify-between">
               <div className="w-1/2 pr-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bill To</p><div className="border-l-4 border-blue-600 pl-3 py-1"><h3 className="text-lg font-bold text-slate-800">{invoice.partyName}</h3>{party && (<div className="text-sm text-slate-600 mt-1 space-y-0.5"><p>{party.address}</p><p>Phone: {party.mobile}</p>{party.gstNo && <p className="font-medium">GSTIN: {party.gstNo}</p>}</div>)}</div></div>
            </div>
            <div className="mb-8">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-slate-800 text-white print:bg-slate-200 print:text-black"><th className="text-left py-2 px-3 rounded-l-md print:rounded-none w-12">#</th><th className="text-left py-2 px-3">Item Description</th><th className="text-right py-2 px-3 w-20">HSN</th><th className="text-right py-2 px-3 w-20">Qty</th><th className="text-right py-2 px-3 w-24">Rate</th><th className="text-right py-2 px-3 w-24">Tax %</th><th className="text-right py-2 px-3 rounded-r-md print:rounded-none w-28">Amount</th></tr></thead>
                <tbody className="text-slate-700">{invoice.items.map((item, index) => (<tr key={index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="py-3 px-3 text-slate-400 font-medium">{index + 1}</td><td className="py-3 px-3 font-semibold text-slate-800">{item.name}</td><td className="py-3 px-3 text-right text-slate-500 text-xs">-</td><td className="py-3 px-3 text-right font-medium">{item.qty}</td><td className="py-3 px-3 text-right">₹{item.rate.toFixed(2)}</td><td className="py-3 px-3 text-right text-slate-500">{item.taxPercent}%</td><td className="py-3 px-3 text-right font-bold text-slate-900">₹{item.amount.toFixed(2)}</td></tr>))}</tbody>
              </table>
            </div>
            <div className="flex justify-between items-end mt-auto pt-4 border-t-2 border-slate-100">
               <div className="w-1/2 pr-8"><h4 className="font-bold text-slate-700 text-sm mb-2">Payment Details</h4><div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm"><div className="flex justify-between mb-1"><span className="text-slate-500">Mode:</span><span className="font-bold capitalize">{invoice.paymentMode}</span></div>{invoice.paymentDetails && (<div className="flex justify-between"><span className="text-slate-500">Reference:</span><span className="font-medium">{invoice.paymentDetails}</span></div>)}</div></div>
               <div className="w-1/2 pl-8"><div className="space-y-2 text-sm"><div className="flex justify-between text-slate-600"><span>Subtotal</span><span>₹ {invoice.subtotal.toFixed(2)}</span></div><div className="flex justify-between text-slate-600"><span>Tax Amount (GST)</span><span>₹ {invoice.taxAmount.toFixed(2)}</span></div><div className="flex justify-between text-xl font-extrabold text-slate-900 border-t-2 border-slate-800 pt-2 mt-2"><span>Grand Total</span><span>₹ {invoice.grandTotal.toFixed(2)}</span></div></div><div className="mt-12 text-center"><div className="h-12"></div><p className="font-bold text-slate-700 text-sm border-t border-slate-300 pt-2 inline-block px-8">Authorized Signatory</p></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
