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

  const handlePrint = () => window.print();

  const handleDownload = () => {
    const element = document.getElementById('ledger-content');
    if (!element) return;
    // @ts-ignore
    if (typeof window.html2pdf === 'undefined') { alert('PDF helper not ready'); return; }
    // @ts-ignore
    window.html2pdf().set({ margin: 0, filename: `Ledger_${party?.name || partyId}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save();
  };

  return (
    <div className="h-full bg-slate-100 flex flex-col">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 no-print shadow-sm shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3"><Button variant="ghost" onClick={() => router.back()} size="sm" className="text-slate-600"><ArrowLeft className="h-5 w-5" /> Back</Button><h2 className="font-bold text-slate-800">Ledger Preview</h2></div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleDownload}><Download className="h-4 w-4 mr-2" /> PDF</Button>
            <Button icon={Printer} onClick={handlePrint}>Print</Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 print:p-0 print:overflow-visible bg-slate-100/50 flex flex-col items-center" ref={containerRef}>
        <div className="relative transition-transform print:transform-none print:w-full" style={{ width: '210mm' }}>
          <div id="ledger-content" className="bg-white shadow-xl print:shadow-none min-h-[297mm] text-slate-900 print:w-full print:m-0 p-6">
            <div className="flex justify-between items-start border-b mb-4 pb-4 gap-4">
              <div className="flex items-start gap-4">
                {company?.logo ? (
                  <div className="w-20 h-20 bg-white rounded overflow-hidden border border-slate-100 p-2">
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
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-slate-900">{party?.name || 'Party Ledger'}</h2>
                {party && <div className="text-sm text-slate-600">{party.address || ''} • {party.mobile || ''}</div>}
                <div className="text-sm text-slate-600 mt-3">{fromDate ? formatDate(fromDate) : 'Start'} - {toDate ? formatDate(toDate) : 'End'}</div>
              </div>
            </div>

            {loading && (
              <div className="py-12 text-center text-slate-500"><SoftLoader size="lg" text="Loading ledger..." /></div>
            )}

            {!loading && transactions.length === 0 && <div className="py-12 text-center text-slate-500">No transactions in selected range.</div>}

            {!loading && transactions.length > 0 && (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white"><th className="text-left py-2 px-3">Date</th><th className="text-left py-2 px-3">Ref</th><th className="text-left py-2 px-3">Type</th><th className="text-left py-2 px-3">Cash</th><th className="text-right py-2 px-3">Debit</th><th className="text-right py-2 px-3">Credit</th><th className="text-right py-2 px-3">Balance</th></tr>
                </thead>
                <tbody className="text-slate-700">
                  {transactions.map((t, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3">{formatDate(t.date)}</td>
                      <td className="py-3 px-3">{t.ref}</td>
                      <td className="py-3 px-3">{t.type}</td>
                      <td className="py-3 px-3">{t.cash ? <span className="text-green-600 font-medium">Cash</span> : <span className="text-slate-400">-</span>}</td>
                      <td className="py-3 px-3 text-right">{t.debit ? `₹ ${t.debit}` : '-'}</td>
                      <td className="py-3 px-3 text-right">{t.credit ? `₹ ${t.credit}` : '-'}</td>
                      <td className="py-3 px-3 text-right font-bold">₹ {t.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
