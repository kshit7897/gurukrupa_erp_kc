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
            <div className="border-b-2 border-slate-900 mb-6 pb-6">
              <div className="flex justify-between items-start gap-8">
                <div className="flex-1">
                  {company?.logo ? (
                    <img src={company.logo} alt="logo" className="h-16 w-auto mb-4 object-contain" />
                  ) : (
                    <div className="h-12 w-32 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400 mb-4 font-bold uppercase tracking-widest">Logo</div>
                  )}
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{company?.name || 'Company Name'}</h1>
                  <div className="text-[11px] text-slate-600 leading-relaxed uppercase font-semibold">
                    {company?.address_line_1 || company?.address || ''}<br/>
                    {company?.address_line_2 && <>{company.address_line_2}<br/></>}
                    {company?.city ? `${company.city} - ${company?.pincode || ''}` : ''}{company?.state ? `, ${company.state}` : ''}
                  </div>
                  <div className="mt-2 flex gap-4 text-[11px] text-slate-700">
                    <div><span className="text-slate-400 font-bold">GSTIN:</span> {company?.gstin || company?.gstNumber || '-'}</div>
                    <div><span className="text-slate-400 font-bold">PH:</span> {company?.contactNumbers?.join(', ') || company?.phone || '-'}</div>
                  </div>
                </div>

                <div className="text-right">
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-1">Statement</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Of Account</p>
                  <div className="mt-6 border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="text-[10px] text-slate-400 uppercase font-black mb-1">Statement Period</div>
                    <div className="text-sm font-bold text-slate-800">{fromDate ? formatDate(fromDate) : 'Start'} — {toDate ? formatDate(toDate) : 'End'}</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-12">
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-black mb-2 tracking-widest">Bill To:</div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">{party?.name || 'Party Ledger'}</h2>
                  {party && (
                    <div className="mt-1 text-sm text-slate-600 leading-relaxed">
                      {party.address || 'Address not available'}<br/>
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Mobile:</span> {party.mobile || '-'}
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-end items-end pb-2">
                  <div className="text-[10px] text-slate-400 uppercase font-black mb-1">Report Generated</div>
                  <div className="text-xs font-bold text-slate-600 uppercase">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            </div>

            {loading && (
              <div className="py-12 text-center text-slate-500"><SoftLoader size="lg" text="Loading ledger..." /></div>
            )}

            {!loading && transactions.length === 0 && <div className="py-12 text-center text-slate-500">No transactions in selected range.</div>}

            {!loading && transactions.length > 0 && (
              <div className="border border-slate-900 mt-6">
                <table className="w-full text-[11px] border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase tracking-wider font-bold">
                      <th className="text-left py-3 px-3 w-[12%] border-r border-slate-700">Date</th>
                      <th className="text-left py-3 px-3 w-[45%] border-r border-slate-700">Particulars / Description</th>
                      <th className="text-left py-3 px-3 w-[15%] border-r border-slate-700">Ref No</th>
                      <th className="text-right py-3 px-3 w-[10%] border-r border-slate-700">Debit (+)</th>
                      <th className="text-right py-3 px-3 w-[10%] border-r border-slate-700">Credit (-)</th>
                      <th className="text-right py-3 px-3 w-[13%]">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    {/* Opening Balance Row */}
                    <tr className="border-b border-slate-200 bg-slate-50 italic">
                      <td className="py-2 px-3 border-r border-slate-200">{fromDate ? formatDate(fromDate) : 'Start'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-bold">Opening Balance</td>
                      <td className="py-2 px-3 border-r border-slate-200 italic text-slate-400">Brought Forward</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">-</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right">-</td>
                      <td className="py-2 px-3 text-right font-black">
                        ₹ {Math.abs(Number(party?.openingBalance || 0)).toFixed(2)} 
                        <span className="ml-1 text-[8px] opacity-70">{(Number(party?.openingBalance || 0) >= 0) ? 'Dr' : 'Cr'}</span>
                      </td>
                    </tr>

                    {transactions.map((t, idx) => {
                      const bal = Number(t.balance || 0);
                      const suffix = bal >= 0 ? 'Dr' : 'Cr';
                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="py-3 px-3 align-top border-r border-slate-100">{(() => {
                            try {
                              const isSaleOrPurchase = /sale|purchase/i.test(String(t.type || ''));
                              const d = isSaleOrPurchase ? (t.deliveryDate || t.date) : (t.date);
                              return formatDate(d || new Date().toISOString());
                            } catch (e) {
                              return formatDate(t.date || new Date().toISOString());
                            }
                          })()}</td>
                          <td className="py-3 px-3 align-top border-r border-slate-100">
                            <div className="font-bold text-slate-900 uppercase text-[10px]">{t.type}</div>
                            {t.desc && <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{t.desc}</div>}
                          </td>
                          <td className="py-3 px-3 align-top font-mono text-slate-500 border-r border-slate-100">{t.ref}</td>
                          <td className="py-3 px-3 text-right align-top font-semibold text-rose-600 border-r border-slate-100">{t.debit ? `₹ ${Number(t.debit).toFixed(2)}` : '-'}</td>
                          <td className="py-3 px-3 text-right align-top font-semibold text-emerald-600 border-r border-slate-100">{t.credit ? `₹ ${Number(t.credit).toFixed(2)}` : '-'}</td>
                          <td className="py-3 px-3 text-right align-top font-black text-slate-900 bg-slate-50/30">
                            ₹ {Math.abs(bal).toFixed(2)}
                            <span className="ml-1 text-[8px] opacity-70">{suffix}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Statement Summary */}
            {!loading && transactions.length > 0 && (
              (() => {
                const totalDebit = (transactions || []).reduce((s: number, it: any) => s + (Number(it.debit || 0) || 0), 0);
                const totalCredit = (transactions || []).reduce((s: number, it: any) => s + (Number(it.credit || 0) || 0), 0);
                const openingBalance = Number(party?.openingBalance || 0);
                const closingBalance = Number(transactions[transactions.length - 1]?.balance || 0);
                
                return (
                  <div>
                    <div className="mt-8 border-t-2 border-slate-900 pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 italic text-[10px] text-slate-400 pr-12">
                          * This is a computer generated statement and does not require a physical signature unless specific local regulations apply. Please report any discrepancies within 7 days.
                        </div>
                        <div className="w-80 space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 uppercase font-black tracking-widest">Opening Balance</span>
                            <span className="font-bold text-slate-700">₹ {Math.abs(openingBalance).toLocaleString(undefined,{minimumFractionDigits:2})} {openingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 uppercase font-black tracking-widest">Total Charges (+)</span>
                            <span className="font-bold text-rose-600">₹ {totalDebit.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 uppercase font-black tracking-widest">Total Received (-)</span>
                            <span className="font-bold text-emerald-600">₹ {totalCredit.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                          </div>
                          <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">Closing Balance</span>
                            <span className="text-2xl font-black text-slate-900">₹ {Math.abs(closingBalance).toLocaleString(undefined,{minimumFractionDigits:2})} {closingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Authorized Signatory */}
                    <div className="mt-20 flex justify-between items-end border-t border-slate-100 pt-8">
                       <div className="text-center">
                          <div className="h-1 bg-slate-200 w-40 mb-2 mx-auto"></div>
                          <div className="text-[10px] font-black uppercase text-slate-400">Receiver's Seal & Sig</div>
                       </div>
                       <div className="text-center">
                          <div className="text-xs font-black text-slate-800 uppercase mb-4">For {company?.name || 'Authorized Body'}</div>
                          <div className="h-1 bg-slate-950 w-56 mb-2 mx-auto"></div>
                          <div className="text-[10px] font-black uppercase text-slate-400">Authorized Signatory</div>
                       </div>
                    </div>

                    <div className="mt-12 text-center text-[10px] text-slate-300 font-bold uppercase tracking-[0.25em]">
                      End of Statement of Account
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
