"use client";
import React, { useEffect, useState, useRef } from 'react';
import { Button, SoftLoader, Skeleton } from '../../../../../components/ui/Common';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../../lib/api';
import { formatDate } from '../../../../../lib/formatDate';

export default function LedgerPreviewPage() {
  const router = useRouter();
  const [partyId, setPartyId] = useState('');
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [party, setParty] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ledgerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('party') || '';
      const f = params.get('from') || '';
      const t = params.get('to') || '';
      setPartyId(p);
      setFromDate(f || null);
      setToDate(t || null);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!partyId) { setLoading(false); return; }
      try {
        setLoading(true);
        // fetch ledger
        const data = await api.reports.getLedger(partyId, fromDate || undefined, toDate || undefined);
        if (!mounted) return;
        setTransactions(data || []);
        // load party details
        const p = await fetch(`/api/parties?id=${partyId}`).then(r => r.ok ? r.json() : null);
        if (mounted) setParty(p);
        // load company details for header
        try {
          const rc = await fetch('/api/company').then(r => r.ok ? r.json() : null);
          if (mounted) setCompany(rc?.company || null);
        } catch (e) { /* ignore */ }
      } catch (e) { console.error(e); } finally { if (mounted) setLoading(false); }
    };
    load();
    const onData = () => { load().catch(() => {}); };
    document.addEventListener('gurukrupa:data:updated', onData);
    return () => { mounted = false; document.removeEventListener('gurukrupa:data:updated', onData); };
  }, [partyId, fromDate, toDate]);

  // scale the preview to fit small screens without changing layout
  useEffect(() => {
    const computeScale = () => {
      try {
        const container = containerRef.current;
        const ledger = ledgerRef.current;
        if (!container || !ledger) return;
        // ledger natural width (in px) measured from element when not scaled
        // temporarily remove transform to measure accurately
        const prevTransform = ledger.style.transform;
        ledger.style.transform = 'none';
        const ledgerWidth = ledger.getBoundingClientRect().width;
        const containerWidth = container.getBoundingClientRect().width;
        let newScale = 1;
        if (ledgerWidth > 0 && containerWidth > 0) {
          newScale = Math.min(1, containerWidth / ledgerWidth);
        }
        setScale(newScale);
        // restore transform will be applied via state update
        ledger.style.transform = prevTransform;
      } catch (e) {
        // ignore
      }
    };

    computeScale();
    const onResize = () => computeScale();
    window.addEventListener('resize', onResize);

    // when printing, ensure scale is 1 (no zoom)
    const onBeforePrint = () => { setScale(1); };
    const onAfterPrint = () => { computeScale(); };
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [transactions.length]);

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    if (!partyId) return;
    try {
      const params = new URLSearchParams();
      params.set('type', 'ledger');
      params.set('partyId', partyId);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const res = await fetch(`/api/reports/ledger/pdf?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Ledger PDF download failed', text);
        alert('Failed to generate PDF');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ledger_${party?.name || partyId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF');
    }
  };

  return (
    <div className="h-full bg-slate-100 flex flex-col">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 no-print shadow-sm shrink-0">
          <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3"><Button variant="ghost" onClick={() => router.back()} size="sm" className="text-slate-600"><ArrowLeft className="h-5 w-5" /> Back</Button><h2 className="font-bold text-slate-800 hidden sm:block">Ledger Preview</h2></div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleDownload}><Download className="h-4 w-4 mr-2" /> PDF</Button>
            <Button icon={Printer} onClick={handlePrint}>Print</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 print:p-0 print:overflow-visible bg-slate-100/50 flex flex-col items-center" ref={containerRef}>
        <style>{`
          /* Force desktop layout inside the preview container. This locks layout and disables responsive breakpoints */
          #ledger-content, #ledger-content * { box-sizing: border-box !important; }
          /* Keep the physical desktop width regardless of viewport */
          #ledger-content { width: 210mm !important; max-width: none !important; }
          /* Prevent flex containers from wrapping or switching to column */
          #ledger-content .flex { flex-wrap: nowrap !important; }
          #ledger-content .flex-col, #ledger-content .md\\:flex-row { flex-direction: row !important; }
          /* Force grid columns to desktop counts */
          #ledger-content .grid, #ledger-content .md\\:grid-cols-2 { grid-auto-flow: column !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          /* Ensure no element will shrink/stack unexpectedly */
          // #ledger-content * { min-width: 0 !important; }
          /* Make sure print uses same fixed desktop width */
          @media print { #ledger-content{ transform:none !important; transform-origin: top left !important; margin:0 auto !important } }
        `}</style>
        <div className="relative transition-transform print:transform-none print:w-[210mm] min-w-0 w-full md:w-[210mm] max-w-full flex justify-center">
          <div id="ledger-content" ref={ledgerRef} className="bg-white shadow-xl print:shadow-none min-h-[297mm] text-slate-900 print:w-full print:m-0 p-6 w-[210mm] mx-auto" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
            <div className="flex justify-between items-start border-b mb-4 pb-4 gap-4">
              <div className="flex items-start gap-4">
                {company?.logo ? (
                  <div className="w-60 h-60 bg-white rounded overflow-hidden border border-slate-100 p-2">
                    <img src={company.logo} alt="logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-slate-50 rounded border border-slate-100 flex items-center justify-center text-sm text-slate-400">Logo</div>
                )}
                <div>
                  <h1 className="text-lg font-bold text-slate-900">{company?.name || 'Company Name'}</h1>
                  <div className="text-sm text-slate-600">{company?.address_line_1 || company?.address || ''}</div>
                  {company?.address_line_2 && <div className="text-sm text-slate-600">{company.address_line_2}</div>}
                  <div className="text-sm text-slate-600">{company?.city ? `${company.city} - ${company?.pincode || ''}` : ''} {company?.state ? `, ${company.state}` : ''}</div>
                  <div className="text-sm text-slate-600 mt-1">Contact: {company?.contactNumbers?.join(', ') || company?.phone || '-'}</div>
                  <div className="text-sm text-slate-600 font-semibold">GSTIN: {company?.gstin || company?.gstNumber || '-'}</div>
                  {/* Party details placed under company details as requested */}
                  <div className="mt-3 border-t pt-3">
                    <h2 className="text-base font-semibold text-slate-800">{party?.name || 'Party Ledger'}</h2>
                    {party && <div className="text-sm text-slate-600">{party.address || ''} • {party.mobile || ''}</div>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="w-56 text-right flex-shrink-0">
                  <div className="text-sm text-slate-600">Period</div>
                  <div className="text-base font-semibold">{fromDate ? formatDate(fromDate) : 'Start'} — {toDate ? formatDate(toDate) : 'End'}</div>
                  <div className="mt-3 text-sm text-slate-600">(Cash sales are marked in the Cash column)</div>
                </div>
              </div>
            </div>

            {loading && (
              <div className="py-12 text-center text-slate-500"><SoftLoader size="lg" text="Loading ledger..." /></div>
            )}

            {!loading && transactions.length === 0 && <div className="py-12 text-center text-slate-500">No transactions in selected range.</div>}

            {!loading && transactions.length > 0 && (
              <table className="w-full text-sm border-collapse table-auto">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-left py-2 px-3">Ref</th>
                    <th className="text-left py-2 px-3">Type</th>
                    <th className="text-left py-2 px-3">Cash</th>
                    <th className="text-right py-2 px-3">Debit</th>
                    <th className="text-right py-2 px-3">Credit</th>
                    <th className="text-right py-2 px-3">Balance</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {transactions.map((t, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3">{(() => {
                        try {
                          const isSaleOrPurchase = /sale|purchase/i.test(String(t.type || ''));
                          if (isSaleOrPurchase) {
                            const d = t.deliveryDate || t.date || new Date().toISOString();
                            return formatDate(d);
                          }
                          return formatDate(t.date || new Date().toISOString());
                        } catch (e) {
                          return formatDate(t.date || new Date().toISOString());
                        }
                      })()}</td>
                      <td className="py-3 px-3">{t.ref}</td>
                      <td className="py-3 px-3">{t.type}</td>
                      <td className="py-3 px-3">{
                        t.cash ? (
                          /sale/i.test(String(t.type || '')) ? (
                            <span className="text-emerald-600 font-medium">Cash Sale</span>
                          ) : (
                            <span className="text-green-600 font-medium">Cash</span>
                          )
                        ) : <span className="text-slate-400">-</span>
                      }</td>
                      <td className="py-3 px-3 text-right">{t.debit ? `₹ ${t.debit}` : '-'}</td>
                      <td className="py-3 px-3 text-right">{t.credit ? `₹ ${t.credit}` : '-'}</td>
                      <td className="py-3 px-3 text-right font-bold">₹ {t.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* Totals summary */}
            {!loading && transactions.length > 0 && (
              (() => {
                // compute cash sales total (sales marked with cash=true and type ~ sale)
                const cashSalesTx = (transactions || []).filter((it: any) => it.cash && /sale/i.test(String(it.type || '')));
                const cashSalesTotal = cashSalesTx.reduce((s: number, it: any) => s + (Number(it.credit || it.debit || 0) || 0), 0);
                const visible = transactions || [];
                const totalDebit = (visible || []).reduce((s: number, it: any) => s + (Number(it.debit || 0) || 0), 0);
                const totalCredit = (visible || []).reduce((s: number, it: any) => s + (Number(it.credit || 0) || 0), 0);
                const endingBalance = visible[visible.length - 1]?.balance || transactions[transactions.length - 1]?.balance || 0;
                return (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="text-sm text-slate-600">Totals</div>
                    <div className="flex items-center gap-6">
                      <div className="text-sm text-slate-500">Total Debit</div>
                      <div className="text-lg font-semibold">₹ {totalDebit.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                      <div className="text-sm text-slate-500">Total Credit</div>
                      <div className="text-lg font-semibold">₹ {totalCredit.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                      <div className="text-sm text-slate-500">Ending Balance</div>
                      <div className="text-lg font-semibold">₹ {Number(endingBalance || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                    </div>
                    <div className="text-sm text-slate-600 md:text-right">
                      <div>Cash Sales Total</div>
                      <div className="text-lg font-semibold">₹ {cashSalesTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                    </div>
                  </div>
                );
              })()
            )}
            {/* show skeleton rows briefly if loading took long: */}
            {loading && (
              <table className="w-full text-sm border-collapse mt-2">
                <tbody>
                  <Skeleton variant="tableRow" lines={6} />
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
