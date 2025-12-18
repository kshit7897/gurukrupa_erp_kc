// 'use client';
// import React, { useEffect, useState, useRef } from 'react';
// import { Button, SoftLoader, Skeleton } from '../../../../components/ui/Common';
// import { Printer, Download, ArrowLeft } from 'lucide-react';
// import { useParams, useRouter } from 'next/navigation';
// import { api } from '../../../../lib/api';
// import { Party, Invoice } from '../../../../types';
// import { formatDate } from '../../../../lib/formatDate';
// import { numberToWords } from '../../../../lib/numberToWords';

// export default function PaymentReceipt() {
//   const { id } = useParams();
//   const router = useRouter();
//   const [payment, setPayment] = useState<any | null>(null);
//   const [party, setParty] = useState<Party | null>(null);
//   const [company, setCompany] = useState<any | null>(null);
//   const [invoices, setInvoices] = useState<Invoice[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [isDownloading, setIsDownloading] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);
//   const [scale, setScale] = useState(1);
//   const [savedFlag, setSavedFlag] = useState(false);

//   useEffect(() => {
//     const load = async () => {
//       if (!id) return;
//       setLoading(true);
//       try {
//         // fetch payments list and find by id (route returns list)
//         const res = await fetch('/api/payments');
//         if (!res.ok) throw new Error('Failed to fetch payment');
//         const all = await res.json();
//         const pay = all.find((p: any) => (p._id?.toString?.() === id) || (p.id === id) || (p._id === id));
//         if (!pay) {
//           setPayment(null);
//           setLoading(false);
//           return;
//         }
//         setPayment(pay);
//         try {
//           const p = await api.parties.get(pay.partyId);
//           if (p) setParty(p);
//         } catch (e) { /* ignore */ }
//         try {
//           const r = await fetch('/api/company');
//           if (r.ok) {
//             const d = await r.json();
//             setCompany(d?.company || null);
//           }
//         } catch (e) { /* ignore */ }

//         // load invoice details for allocations
//         const allocs = Array.isArray(pay.allocations) ? pay.allocations : [];
//     try {
//       const params = new URLSearchParams(window.location.search);
//       setSavedFlag(params.get('saved') === '1');
//       if (params.get('download') === '1') {
//         setTimeout(() => {
//           const el = document.getElementById('receipt-content');
//           if (el) {
//             try { handleDownload(); } catch (e) { /* ignore */ }
//           }
//         }, 300);
//       }
//     } catch (e) { /* ignore */ }
//         const loaded: Invoice[] = [];
//         for (const a of allocs) {

//   useEffect(() => {
//     const handleResize = () => {
//       if (containerRef.current) {
//         const containerWidth = containerRef.current.offsetWidth;
//         const a4WidthPx = 794; const padding = 24;
//         if (containerWidth < (a4WidthPx + padding)) {
//           setScale((containerWidth - padding) / a4WidthPx);
//         } else { setScale(1); }
//       }
//     };
//     handleResize();
//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, [loading]);
//           if (!a.invoiceId) continue;
//           try {
//             const inv = await api.invoices.get(a.invoiceId);
//             if (inv) loaded.push(inv);
//           } catch (e) { /* ignore per invoice */ }
//         }
//         setInvoices(loaded);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//   }, [id]);

//   const handleDownload = async () => {
//     if (!id) return;
//     setIsDownloading(true);
//     try {
//       const res = await fetch(`/api/payments/receipt/${id}/pdf`);
//       if (!res.ok) {
//         const text = await res.text().catch(() => '');
//         console.error('Receipt PDF failed', text);
//         alert('Failed to generate PDF');
//         return;
//       }
//       const blob = await res.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = `Payment_${payment?.id || payment?._id || id}.pdf`;
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       window.URL.revokeObjectURL(url);
//     } catch (e) {
//       console.error(e);
//       alert('Failed to generate PDF');
//     } finally {
//       setIsDownloading(false);
//     }
//   };

//   if (loading) return (
//     <div className="flex h-full items-start justify-center text-slate-500 bg-slate-100 p-6">
//       <div className="max-w-5xl w-full space-y-4">
//         <Skeleton variant="card" />
//         <div className="grid grid-cols-3 gap-4">
//           <Skeleton variant="card" />
//           <Skeleton variant="card" />
//           <Skeleton variant="card" />
//         </div>
//         <Skeleton variant="card" />
//       </div>
//     </div>
//   );
//   if (!payment) return <div className="text-center py-20 bg-slate-50 h-full"><h2 className="text-2xl font-bold text-slate-700">Payment Not Found</h2><Button onClick={() => router.push('/admin/payments')} className="mt-4">Back to Payments</Button></div>;

//   const title = String(payment?.type || '').toLowerCase() === 'receive' ? 'RECEIPT' : 'PAYMENT VOUCHER';
//   // totalApplied removed from UI; keep only simple summary
//   const voucherDisplay = (payment.voucherNo && String(payment.voucherNo).trim().length > 0)
//     ? payment.voucherNo
//     : `${String(payment?.type || '').toLowerCase() === 'receive' ? 'RCV' : 'PAY'}-${(payment?.date ? new Date(payment.date).getTime() : Date.now()).toString().slice(-8)}`;

//   return (
//     <div className="h-full bg-slate-100 flex flex-col">
//       <div className="bg-white border-b border-slate-200 sticky top-0 z-10 no-print shadow-sm shrink-0">
//         <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
//           <div className="flex items-center gap-3">
//             <Button variant="ghost" onClick={() => router.back()} size="sm" className="text-slate-600"><ArrowLeft className="h-5 w-5" /> Back</Button>
//             {/* hide verbose label on small screens so mobile preview/PDF fits */}
//             <h2 className="font-bold text-slate-800 hidden sm:block">Payment Receipt</h2>
//           </div>
//           <div className="flex space-x-3">
//             <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
//               {isDownloading ? (<><SoftLoader size="sm" /> Saving...</>) : (<><Download className="h-4 w-4 mr-2" /> PDF</>)}
//             </Button>
//             <Button icon={Printer} onClick={() => window.print()}>Print</Button>
//           </div>
//         </div>
//       </div>
//       {savedFlag && <div className="max-w-5xl mx-auto mt-4 p-3 text-sm rounded bg-green-100 text-green-800">Payment saved successfully</div>}

//       <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 print:p-0 print:overflow-visible bg-slate-100/50 flex flex-col items-center" ref={containerRef}>
//         <style>{`
//           @media print { 
//             .no-print { display: none !important; }
//             #receipt-scaled { transform: none !important; width: 210mm !important; margin-bottom: 0 !important; } 
//             #receipt-content { box-shadow: none !important; min-height: auto !important; padding: 0 !important; } 
//           }
//         `}</style>
//         <div id="receipt-scaled" className="relative transition-transform print:transform-none print:w-full" style={{ width: '210mm', transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: `-${(1 - scale) * 297}mm` }}>
//           <div id="receipt-content" className="bg-white shadow-xl print:shadow-none min-h-[297mm] text-slate-900 print:w-full print:m-0" style={{ padding: '10mm 12mm' }}>
//             <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-200 pb-4 mb-4">
//               <div className="flex items-start gap-4 sm:gap-6 w-full md:w-2/3">
//                 <div className="w-32 h-32 print:w-[50mm] print:h-[50mm] bg-slate-100 rounded-md flex items-center justify-center border border-slate-200 overflow-hidden">
//                   {company?.logo ? (
//                     // logo may be a data URL or path
//                     // eslint-disable-next-line @next/next/no-img-element
//                     <img src={company.logo} alt="logo" className="w-full h-full object-contain" />
//                   ) : (
//                     <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="14" rx="2" fill="#0EA5A4"/><path d="M7 10h10v4H7z" fill="white"/></svg>
//                   )}
//                 </div>
//                 <div className="min-w-0">
//                   <h1 className="text-2xl sm:text-3xl print:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">{company?.name || 'Company Name'}</h1>
//                   <div className="text-xs sm:text-sm text-slate-600 leading-tight mt-1 sm:mt-2">
//                     <div>{company?.address_line_1 || company?.address || ''}</div>
//                     {company?.address_line_2 && <div>{company.address_line_2}</div>}
//                     <div>{company?.city ? `${company.city} - ${company?.pincode || ''}` : ''} {company?.state ? `, ${company.state}` : ''}</div>
//                     <div className="mt-1">Contact: {company?.contactNumbers?.join(', ') || company?.phone || '-'}</div>
//                     <div className="mt-1 font-semibold">GSTIN: {company?.gstin || company?.gstNumber || '-'}</div>
//                     <div className="mt-1 font-semibold">CIN: {company?.cin || '-'}</div>
//                   </div>
//                 </div>
//               </div>
//               <div className="w-full md:w-1/3 text-left md:text-right mt-4 md:mt-0">
//                 <div className="inline-block text-xs sm:text-sm text-slate-700 font-bold bg-slate-100 px-3 py-1 rounded border border-slate-200">{title}</div>
//                 <div className="mt-2 sm:mt-3 text-sm">
//                   <div className="flex justify-between md:justify-end">
//                     <div className="w-32 sm:w-40 text-slate-600">Voucher No.</div>
//                     <div className="w-40 sm:w-48 font-bold text-slate-900 break-words">{voucherDisplay}</div>
//                   </div>
//                   <div className="flex justify-between md:justify-end mt-1"><div className="w-32 sm:w-40 text-slate-600">Date</div><div className="w-40 sm:w-48">{formatDate(payment.date)}</div></div>
//                   <div className="flex justify-between md:justify-end mt-1"><div className="w-32 sm:w-40 text-slate-600">Payment Mode</div><div className="w-40 sm:w-48">{payment.mode || payment.paymentMode || 'cash'}</div></div>
//                   <div className="flex justify-between md:justify-end mt-1"><div className="w-32 sm:w-40 text-slate-600">Reference No.</div><div className="w-40 sm:w-48">{payment.reference || '-'}</div></div>
//                 </div>
//               </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
//               <div className="col-span-1 md:col-span-2 bg-slate-50 border border-slate-200 rounded p-4">
//                 <div className="text-xs font-semibold text-slate-500 uppercase">{(String(payment.type || '').toLowerCase() === 'receive') ? 'Paid By' : 'Paid To'}</div>
//                 <div className="mt-2 text-sm font-semibold text-slate-800">{party?.name || payment.partyName || '-'}</div>
//                 <div className="mt-1 text-sm text-slate-600 leading-tight">
//                   <div>{party?.billingAddress?.line1 || party?.address || ''}</div>
//                   {party?.billingAddress?.line2 && (<div>{party.billingAddress.line2}</div>)}
//                   <div>{party?.billingAddress?.city || ''}{party?.billingAddress?.pincode ? ` - ${party.billingAddress.pincode}` : ''}</div>
//                   <div className="mt-1">Contact: {party?.phone || party?.mobile || '-'}</div>
//                   <div className="mt-1">GSTIN: {party?.gstin || party?.gstNo || '-'}</div>
//                   <div className="mt-1">CIN: {party?.cin || '-'}</div>
//                 </div>
//               </div>
//               <div className="col-span-1 bg-white border border-slate-200 rounded p-4 text-sm">
//                 <div className="font-semibold text-slate-800">Summary</div>
//                 <div className="mt-3 text-slate-700 text-sm space-y-3">
//                   <div className="flex justify-between"><div>Outstanding</div><div className="font-bold">₹ {(typeof payment.outstandingBefore === 'number' ? payment.outstandingBefore : 0).toFixed(2)}</div></div>
//                   <div className="flex justify-between"><div>{String(payment?.type || '').toLowerCase() === 'receive' ? 'Received' : 'Paid'}</div><div className="font-bold">₹ {(payment.amount || 0).toFixed(2)}</div></div>
//                   <div className="flex justify-between"><div>Balance Due</div><div className="font-bold">₹ {(typeof payment.outstandingAfter === 'number' ? payment.outstandingAfter : 0).toFixed(2)}</div></div>
//                 </div>
//               </div>
//             </div>

//             {/* Allocations table removed as requested */}

//             <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
//               <div className="max-w-full md:max-w-[70%] break-words">
//                 <div className="text-sm text-slate-600">Amount in Words</div>
//                 <div className="mt-1 text-lg font-semibold text-slate-800">{payment.amountInWords || numberToWords(payment.amount || 0)}</div>
//               </div>
//               <div className="text-left md:text-center">
//                 <div className="text-xs font-semibold text-slate-800 mb-4">GuruKrupa Multi Venture Pvt. Ltd</div>
//                 <div className="h-20 w-40 border-t border-slate-300 text-sm font-semibold text-slate-700">Authorized Signatory</div>
//               </div>
//             </div>

//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

'use client';
import React, { useEffect, useState, useRef } from 'react';
import { Button, SoftLoader, Skeleton } from '../../../../components/ui/Common';
import { Printer, Download, ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { Party, Invoice } from '../../../../types';
import { formatDate } from '../../../../lib/formatDate';
import { numberToWords } from '../../../../lib/numberToWords';

export default function PaymentReceipt() {
  const params = useParams();
  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : undefined;
  const router = useRouter();

  const [payment, setPayment] = useState<any | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  /* ---------------- Load Data ---------------- */
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/payments?id=${encodeURIComponent(id)}`);
        const pay = await res.json();
        setPayment(pay || null);

        if (pay?.partyId) {
          const p = await api.parties.get(pay.partyId);
          if (p) setParty(p);
        }

        const r = await fetch('/api/company');
        if (r.ok) {
          const d = await r.json();
          setCompany(d?.company || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  /* ---------------- Scale for Mobile Preview ---------------- */
  useEffect(() => {
    const computeScale = () => {
      const container = containerRef.current;
      const receipt = receiptRef.current;
      if (!container || !receipt) return;

      receipt.style.transform = 'none';
      const rw = receipt.getBoundingClientRect().width;
      const cw = container.getBoundingClientRect().width;

      let s = 1;
      if (rw > 0 && cw > 0) s = Math.min(1, cw / rw);
      setScale(s);
    };

    computeScale();
    window.addEventListener('resize', computeScale);
    window.addEventListener('beforeprint', () => setScale(1));
    window.addEventListener('afterprint', computeScale);

    return () => {
      window.removeEventListener('resize', computeScale);
    };
  }, [loading, payment]);

  /* ---------------- PDF Download ---------------- */
  const handleDownload = async () => {
    if (!id) return;
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/payments/receipt/${id}/pdf`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payment_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-100">
        <Skeleton variant="card" />
      </div>
    );
  }

  if (!payment) {
    return <div className="text-center py-20">Payment Not Found</div>;
  }

  const title =
    String(payment?.type || '').toLowerCase() === 'receive'
      ? 'RECEIPT'
      : 'PAYMENT VOUCHER';

  const voucherDisplay =
    payment.voucherNo ||
    `${payment.type === 'receive' ? 'RCV' : 'PAY'}-${Date.now()
      .toString()
      .slice(-8)}`;

  return (
    <div className="h-full bg-slate-100 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-10 no-print">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex justify-center"
      >
        <div
          ref={receiptRef}
          className="bg-white shadow print:shadow-none w-[210mm]"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            padding: '10mm 12mm',
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4 mb-4">
            <div className="flex gap-4">
              {/* <div className="w-28 h-28 border rounded flex items-center justify-center"> */}
                <div className="w-28 h-28 border border-slate-200 rounded flex items-center justify-center">

                {company?.logo && (
                  <img src={company.logo} alt="logo" className="object-contain" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{company?.name}</h1>
                <div className="text-sm text-slate-600 mt-1">
                  <div>{company?.address}</div>
                  <div>Contact: {company?.phone}</div>
                  <div className="font-semibold">GSTIN: {company?.gstin}</div>
                  <div className="font-semibold">CIN: {company?.cin}</div>
                </div>
              </div>
            </div>

            {/* ✅ FIXED VOUCHER / DATE BOX */}
            {/* <div className="border rounded-lg p-4 w-56 pt-8 relative"> */}
            <div className="border border-slate-200 rounded-lg p-4 w-56 pt-8 relative">
              {/* <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-slate-100 px-3 py-1 text-sm font-bold border rounded"> */}
               <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-slate-50 px-3 py-1 text-sm font-bold border border-slate-200 rounded">

                {title}
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <div>
                  <div className="text-slate-500 text-xs">Voucher No.</div>
                  <div className="font-bold whitespace-nowrap">{voucherDisplay}</div>
                </div>

                <div>
                  <div className="text-slate-500 text-xs">Date</div>
                  <div className="whitespace-nowrap">{formatDate(payment.date)}</div>
                </div>

                <div>
                  <div className="text-slate-500 text-xs">Payment Mode</div>
                  <div className="whitespace-nowrap">
                    {payment.mode || payment.paymentMode}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 text-xs">Reference No.</div>
                  <div className="whitespace-nowrap">{payment.reference || '-'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* <div className="col-span-2 border rounded p-4 bg-slate-50"> */}
            <div className="col-span-2 border border-slate-200 rounded p-4 bg-slate-50">

              <div className="text-xs font-semibold uppercase text-slate-500">
                {payment.type === 'receive' ? 'Paid By' : 'Paid To'}
              </div>
              <div className="font-semibold mt-1">{party?.name}</div>
              <div className="text-sm text-slate-600 mt-1">
                <div>Contact: {party?.phone}</div>
                <div>GSTIN: {party?.gstin}</div>
                <div>CIN: {party?.cin}</div>
              </div>
            </div>

            {/* <div className="border rounded p-4"> */}
            <div className="border border-slate-200 rounded p-4">

              <div className="font-semibold">Summary</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Outstanding</span>
                  <span className="font-bold">₹ {payment.outstandingBefore}</span>
                </div>
                <div className="flex justify-between">
                  <span>{payment.type === 'receive' ? 'Received' : 'Paid'}</span>
                  <span className="font-bold">₹ {payment.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Balance Due</span>
                  <span className="font-bold">₹ {payment.outstandingAfter}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center mt-8">
            <div>
              <div className="text-sm text-slate-600">Amount in Words</div>
              <div className="font-semibold">
                {numberToWords(payment.amount)}
              </div>
            </div>
            <div className="text-center">
              <div className="font-semibold mb-8">{company?.name}</div>
              <div className="border-t pt-2 text-sm">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

