'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Button, SoftLoader, Skeleton } from '../../../../components/ui/Common';
import { Printer, Download, ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { Party, Invoice } from '../../../../types';
import { formatDate } from '../../../../lib/formatDate';

export default function PaymentReceipt() {
  const { id } = useParams();
  const router = useRouter();
  const [payment, setPayment] = useState<any | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // fetch payments list and find by id (route returns list)
        const res = await fetch('/api/payments');
        if (!res.ok) throw new Error('Failed to fetch payment');
        const all = await res.json();
        const pay = all.find((p: any) => (p._id?.toString?.() === id) || (p.id === id) || (p._id === id));
        if (!pay) {
          setPayment(null);
          setLoading(false);
          return;
        }
        setPayment(pay);
        try {
          const p = await api.parties.get(pay.partyId);
          if (p) setParty(p);
        } catch (e) { /* ignore */ }
        try {
          const r = await fetch('/api/company');
          if (r.ok) {
            const d = await r.json();
            setCompany(d?.company || null);
          }
        } catch (e) { /* ignore */ }

        // load invoice details for allocations
        const allocs = Array.isArray(pay.allocations) ? pay.allocations : [];
    try {
      const params = new URLSearchParams(window.location.search);
      setSavedFlag(params.get('saved') === '1');
      if (params.get('download') === '1') {
        setTimeout(() => {
          const el = document.getElementById('receipt-content');
          if (el) {
            try { handleDownload(); } catch (e) { /* ignore */ }
          }
        }, 300);
      }
    } catch (e) { /* ignore */ }
        const loaded: Invoice[] = [];
        for (const a of allocs) {

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
          if (!a.invoiceId) continue;
          try {
            const inv = await api.invoices.get(a.invoiceId);
            if (inv) loaded.push(inv);
          } catch (e) { /* ignore per invoice */ }
        }
        setInvoices(loaded);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDownload = () => {
    const element = document.getElementById('receipt-content');
    if (!element) return;
    setIsDownloading(true);
    // @ts-ignore
    if (typeof window.html2pdf === 'undefined') { setIsDownloading(false); alert('PDF generator initializing'); return; }
    // @ts-ignore
    window.html2pdf().set({ margin: 0, filename: `Payment_${payment?.id || payment?._id}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save().then(() => setIsDownloading(false)).catch(() => setIsDownloading(false));
  };

  if (loading) return (
    <div className="flex h-full items-start justify-center text-slate-500 bg-slate-100 p-6">
      <div className="max-w-5xl w-full space-y-4">
        <Skeleton variant="card" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
        <Skeleton variant="card" />
      </div>
    </div>
  );
  if (!payment) return <div className="text-center py-20 bg-slate-50 h-full"><h2 className="text-2xl font-bold text-slate-700">Payment Not Found</h2><Button onClick={() => router.push('/admin/payments')} className="mt-4">Back to Payments</Button></div>;

  const title = String(payment?.type || '').toLowerCase() === 'receive' ? 'RECEIPT' : 'PAYMENT VOUCHER';
  const totalApplied = (Array.isArray(payment.allocations) ? payment.allocations.reduce((s: number, a: any) => s + (a.amount || 0), 0) : 0) || 0;

  return (
    <div className="h-full bg-slate-100 flex flex-col">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 no-print shadow-sm shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.back()} size="sm" className="text-slate-600"><ArrowLeft className="h-5 w-5" /> Back</Button>
            {/* hide verbose label on small screens so mobile preview/PDF fits */}
            <h2 className="font-bold text-slate-800 hidden sm:block">Payment Receipt</h2>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (<><SoftLoader size="sm" /> Saving...</>) : (<><Download className="h-4 w-4 mr-2" /> PDF</>)}
            </Button>
            <Button icon={Printer} onClick={() => window.print()}>Print</Button>
          </div>
        </div>
      </div>
      {savedFlag && <div className="max-w-5xl mx-auto mt-4 p-3 text-sm rounded bg-green-100 text-green-800">Payment saved successfully</div>}

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 print:p-0 print:overflow-visible bg-slate-100/50 flex flex-col items-center" ref={containerRef}>
        <style>{`@media print { #receipt-scaled { transform: none !important; width: 210mm !important; margin-bottom: 0 !important; } #receipt-content { box-shadow: none !important; min-height: auto !important; padding: 0 !important; } }`}</style>
        <div id="receipt-scaled" className="relative transition-transform print:transform-none print:w-full" style={{ width: '210mm', transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: `-${(1 - scale) * 297}mm` }}>
          <div id="receipt-content" className="bg-white shadow-xl print:shadow-none min-h-[297mm] text-slate-900 print:w-full print:m-0" style={{ padding: '10mm 12mm' }}>
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
              <div className="flex items-start gap-4 w-2/3">
                <div className="w-20 h-20 bg-slate-100 rounded-md flex items-center justify-center border border-slate-200 overflow-hidden">
                  {company?.logo ? (
                    // logo may be a data URL or path
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
                <div className="inline-block text-sm text-slate-700 font-bold bg-slate-100 px-3 py-1 rounded border border-slate-200">{title}</div>
                <div className="mt-3 text-sm text-right">
                  <div className="flex justify-end">
                    <div className="w-40 text-slate-600">Voucher No.</div>
                    <div className="w-48 font-bold text-slate-900">
                      {(() => {
                        const full = payment.voucherNo || payment.id || payment._id || '';
                        if (!full) return '-';
                        const start = String(full).slice(0,8);
                        const end = String(full).slice(-4);
                        const short = `${start}...${end}`;
                        return (<span title={full}>{short}</span>);
                      })()}
                    </div>
                  </div>
                  <div className="flex justify-end mt-1"><div className="w-40 text-slate-600">Date</div><div className="w-48">{formatDate(payment.date)}</div></div>
                  <div className="flex justify-end mt-1"><div className="w-40 text-slate-600">Payment Mode</div><div className="w-48">{payment.mode || payment.paymentMode || 'cash'}</div></div>
                  <div className="flex justify-end mt-1"><div className="w-40 text-slate-600">Reference No.</div><div className="w-48">{payment.reference || '-'}</div></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2 bg-slate-50 border border-slate-100 rounded p-3">
                <div className="text-xs font-semibold text-slate-500 uppercase">{(String(payment.type || '').toLowerCase() === 'receive') ? 'Paid By' : 'Paid To'}</div>
                <div className="mt-2 text-sm font-semibold text-slate-800">{party?.name || payment.partyName || '-'}</div>
                <div className="mt-1 text-sm text-slate-600 leading-tight">
                  <div>{party?.billingAddress?.line1 || party?.address || ''}</div>
                  {party?.billingAddress?.line2 && (<div>{party.billingAddress.line2}</div>)}
                  <div>{party?.billingAddress?.city || ''}{party?.billingAddress?.pincode ? ` - ${party.billingAddress.pincode}` : ''}</div>
                  <div className="mt-1">Contact: {party?.phone || party?.mobile || '-'}</div>
                  <div className="mt-1">GSTIN: {party?.gstin || party?.gstNo || '-'}</div>
                  <div className="mt-1">CIN: {party?.cin || '-'}</div>
                </div>
              </div>
              <div className="col-span-1 bg-white border border-slate-100 rounded p-3 text-sm">
                <div className="font-semibold text-slate-700">Summary</div>
                <div className="mt-2 text-slate-600 text-sm">
                  <div className="flex justify-between"><div>Total Paid</div><div className="font-bold">₹ {(payment.amount || 0).toFixed(2)}</div></div>
                  <div className="flex justify-between mt-1"><div>Applied</div><div className="font-bold">₹ {totalApplied.toFixed(2)}</div></div>
                  <div className="flex justify-between mt-1"><div>Unallocated</div><div className="font-bold">₹ {( (payment.amount || 0) - totalApplied ).toFixed(2)}</div></div>
                  <div className="flex justify-between mt-2 border-t border-slate-100 pt-2"><div>Outstanding (Before)</div><div className="font-bold">₹ {(typeof payment.outstandingBefore === 'number' ? payment.outstandingBefore : 0).toFixed(2)}</div></div>
                  <div className="flex justify-between mt-1"><div>Outstanding (After)</div><div className="font-bold">₹ {(typeof payment.outstandingAfter === 'number' ? payment.outstandingAfter : 0).toFixed(2)}</div></div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-left text-xs">
                    <th className="py-2 px-2">Invoice No.</th>
                    <th className="py-2 px-2 text-right">Amount Applied</th>
                    <th className="py-2 px-2 text-right">Invoice Due</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {invoices.length === 0 && (
                    <tr><td colSpan={3} className="py-4 px-2 text-center text-slate-500">No invoice allocations (Advance / Unallocated)</td></tr>
                  )}
                  {invoices.map((inv, idx) => {
                    const alloc = (payment.allocations || []).find((a: any) => (a.invoiceId === inv.id) || (a.invoiceId === (inv as any)._id));
                    return (
                      <tr key={idx} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 px-2 font-semibold text-slate-800">{(inv as any).invoiceNo || (inv as any).invoice_no || inv.id}</td>
                        <td className="py-3 px-2 text-right">₹ {(alloc?.amount || 0).toFixed(2)}</td>
                        <td className="py-3 px-2 text-right">₹ {(((inv as any).dueAmount != null ? (inv as any).dueAmount : Math.max(0, (inv.grandTotal || 0) - ((inv as any).paidAmount || 0))) as number).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div>
                <div className="text-sm text-slate-600">Amount in Words</div>
                <div className="mt-1 text-lg font-semibold text-slate-800">{payment.amountInWords || ''}</div>
              </div>
              <div className="text-center">
                <div className="h-20 w-36 border-t border-slate-300 text-sm font-semibold text-slate-700">Authorized Signatory</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
