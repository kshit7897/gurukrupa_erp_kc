'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Button, SoftLoader, Skeleton } from '../../../../components/ui/Common';
import { Printer, Download, ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { formatDate } from '../../../../lib/formatDate';
import { numberToWords } from '../../../../lib/numberToWords';

export default function PaymentReceipt() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [payment, setPayment] = useState<any | null>(null);
  const [party, setParty] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const a4WidthPx = 794; 
        const padding = 32;
        if (containerWidth < (a4WidthPx + padding)) {
          setScale(Math.max(0.3, (containerWidth - padding) / a4WidthPx));
        } else {
          setScale(1);
        }
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
      const res = await fetch(`/api/payments/receipt/${id}/pdf`);
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payment_${payment?.voucherNo || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) return (
    <div className="flex h-full items-start justify-center text-slate-500 bg-slate-100 p-6">
      <div className="max-w-5xl w-full space-y-4">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    </div>
  );

  if (!payment) return (
    <div className="text-center py-20 bg-slate-50 h-full">
      <h2 className="text-2xl font-bold text-slate-700 uppercase tracking-tighter">Payment Not Found</h2>
      <Button onClick={() => router.push('/admin/payments')} className="mt-4">Back to Payments</Button>
    </div>
  );

  const title = String(payment?.type || '').toLowerCase() === 'receive' ? 'RECEIPT' : 'PAYMENT VOUCHER';
  const voucherDisplay = payment.voucherNo || (payment.id ? `V-${payment.id.slice(-6)}` : '-');

  return (
    <div className="h-full bg-slate-100 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-10 no-print shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <Button variant="ghost" onClick={() => router.back()} icon={ArrowLeft} className="text-slate-500">
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload} disabled={isDownloading} icon={Download} className="border-slate-200">
              PDF
            </Button>
            <Button onClick={() => window.print()} icon={Printer}>
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-slate-100/50"
      >
        <div
          ref={receiptRef}
          className="bg-white shadow-2xl print:shadow-none w-[210mm] relative shrink-0"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            padding: '12mm 15mm',
            minHeight: '297mm'
          }}
        >
          {/* Header Section */}
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
            <div className="flex gap-6 items-center text-left">
              <div className="w-20 h-20 md:w-24 md:h-24 border-2 border-slate-100 rounded-2xl flex items-center justify-center bg-slate-50 p-2 shrink-0">
                {company?.logo ? (
                  <img src={company.logo} alt="logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-slate-200 font-black text-4xl">G</div>
                )}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{company?.name || 'Gurukrupa Enterprises'}</h1>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 space-y-0.5 max-w-sm">
                  <div>{company?.address}</div>
                  <div>GSTIN: <span className="text-slate-900">{company?.gstin}</span></div>
                  <div>Contact: <span className="text-slate-900">{company?.phone}</span></div>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="inline-block bg-slate-900 text-white px-4 py-1 rounded text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                {title}
              </div>
              <div className="space-y-1">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Voucher Number</span>
                  <span className="text-xs font-black text-slate-900 font-mono tracking-tighter">{voucherDisplay}</span>
                </div>
                <div className="flex flex-col items-end pt-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transaction Date</span>
                  <span className="text-xs font-bold text-slate-900">{formatDate(payment.date)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Party Details */}
          <div className="grid grid-cols-2 gap-8 mb-10 text-left">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] block mb-3">
                {payment.type === 'receive' ? 'Payment From' : 'Payment To'}
              </span>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">{party?.name || payment.partyName}</h3>
              <div className="text-[11px] text-slate-600 space-y-1 font-medium italic">
                {party?.billingAddress?.line1 && <div>{party.billingAddress.line1}</div>}
                <div>GSTIN: {party?.gstin || 'N/A'}</div>
                <div>Contact: {party?.phone || 'N/A'}</div>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="space-y-4 px-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Mode</span>
                  <span className="text-xs font-black text-slate-900 uppercase">{payment.mode || 'Cash'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref No.</span>
                  <span className="text-xs font-bold text-slate-700">{payment.reference || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="mb-12">
             <div className="bg-slate-900 rounded-3xl p-8 flex justify-between items-center text-white shadow-2xl">
                <div className="text-left">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Transaction Amount</div>
                   <div className="text-4xl font-black tracking-tighter">₹ {Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="h-12 w-px bg-slate-700 mx-8"></div>
                <div className="text-right">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Remaining Balance</div>
                   <div className="text-xl font-bold opacity-80">₹ {Number(payment.outstandingAfter).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
             </div>
             <div className="mt-4 px-4 text-xs text-left">
                <span className="text-slate-400 font-bold uppercase text-[9px] mr-2">Amount in Words:</span>
                <span className="font-bold text-slate-700 italic uppercase underline decoration-slate-200 decoration-2 underline-offset-4 tracking-tight">
                  {numberToWords(payment.amount)} Only
                </span>
             </div>
          </div>

          {/* Notes Section */}
          {payment.notes && (
            <div className="mb-12 border-l-4 border-slate-200 pl-6 py-2 text-left">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Transaction Remark</span>
               <p className="text-sm text-slate-600 italic font-medium">"{payment.notes}"</p>
            </div>
          )}

          {/* Footer Signatures */}
          <div className="absolute bottom-[20mm] left-[15mm] right-[15mm]">
            <div className="flex justify-between items-end">
              <div className="text-center w-48">
                <div className="h-0.5 bg-slate-200 w-full mb-2"></div>
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Receiver's Signature</div>
              </div>
              
              <div className="text-center w-64">
                <div className="text-[10px] font-black text-slate-900 uppercase mb-8 tracking-tighter">For {company?.name || 'Gurukrupa Enterprises'}</div>
                <div className="h-1 bg-slate-900 w-full mb-2"></div>
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Authorized Signatory</div>
              </div>
            </div>
            <div className="mt-12 text-center text-[9px] text-slate-300 font-bold uppercase tracking-[0.5em] border-t border-slate-50 pt-4">
              Computer Generated Receipt • {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
