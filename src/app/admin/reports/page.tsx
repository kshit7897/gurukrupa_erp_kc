"use client";
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Button, Table, Card, Select, Input } from '../../../components/ui/Common';
// Stock PDF export intentionally removed for Stock tab
import { Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

const Tabs = ({ active, setActive, tabs }: any) => (
  <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto mb-6 overflow-x-auto">
    {tabs.map((tab: string) => (
      <button key={tab} onClick={() => setActive(tab)} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${active === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>
    ))}
  </div>
);

export default function Reports() {
  const [activeTab, setActiveTab] = useState('Stock');
  const router = useRouter();
  const [parties, setParties] = useState<{ label: string; value: string }[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(true);
  const [selectedParty, setSelectedParty] = useState('');
  const today = new Date().toISOString().slice(0,10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [daybookDate, setDaybookDate] = useState(today);
  const [stockRows, setStockRows] = useState<any[] | null>(null);
  const [outstandingRows, setOutstandingRows] = useState<any[] | null>(null);
  const [plData, setPlData] = useState<any | null>(null);
  const [plLoading, setPlLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [outstandingLoading, setOutstandingLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // New report states
  const [daybookData, setDaybookData] = useState<any[] | null>(null);
  const [daybookLoading, setDaybookLoading] = useState(false);
  const [cashbookData, setCashbookData] = useState<any[] | null>(null);
  const [cashbookLoading, setCashbookLoading] = useState(false);
  const [bankbookData, setBankbookData] = useState<any[] | null>(null);
  const [bankbookLoading, setBankbookLoading] = useState(false);

  const formatCurrency = (v: any) => {
    const n = Number(v || 0);
    // fixed 2 decimals and thousands separator
    return `₹ ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  // load parties client-side and show skeletons while loading
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setPartiesLoading(true);
        const res = await fetch('/api/parties');
        if (!res.ok) { setParties([]); return; }
        const data = await res.json();
        if (!mounted) return;
        const opts = data.map((p: any) => ({ label: p.name, value: p._id || p.id }));
        setParties(opts);
      } catch (e) { console.error(e); setParties([]); }
      finally { if (mounted) setPartiesLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  // fetch P&L when tab active
  useEffect(() => {
    if (activeTab !== 'P&L') return;
    const load = async () => {
      try {
        setPlLoading(true);
        const res = await fetch(`/api/reports/profitloss?from=${fromDate}&to=${toDate}`);
        const data = await res.json();
        setPlData(res.ok ? data : null);
      } catch (e) {
        console.error(e);
        setPlData(null);
      } finally { setPlLoading(false); }
    };
    load();
  }, [activeTab, fromDate, toDate]);

  // pick tab from query param for deep links
  useEffect(() => {
    try {
      const tabParam = (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : '') || '';
      const t = tabParam.toLowerCase();
      if (!t) return;
      if (t === 'pl') setActiveTab('P&L');
      else if (t === 'stock') setActiveTab('Stock');
      else if (t === 'outstanding') setActiveTab('Outstanding');
    } catch (e) {}
  }, []);

  // fetch stock when Stock tab active
  useEffect(() => {
    let mounted = true;
    if (activeTab !== 'Stock') return;
    const load = async () => {
      try {
        setStockLoading(true);
        const res = await fetch('/api/reports/stock');
        if (!res.ok) { setStockRows([]); return; }
        const data = await res.json();
        if (!mounted) return;
        setStockRows(data || []);
      } catch (e) { console.error(e); setStockRows([]); }
      finally { if (mounted) setStockLoading(false); }
    };
    load();
    const onData = () => { load().catch(() => {}); };
    document.addEventListener('gurukrupa:data:updated', onData);
    return () => { mounted = false; document.removeEventListener('gurukrupa:data:updated', onData); };
  }, [activeTab]);

  // fetch outstanding when Outstanding tab active
  useEffect(() => {
    let mounted = true;
    if (activeTab !== 'Outstanding') return;
    const load = async () => {
      try {
        setOutstandingLoading(true);
        const res = await fetch('/api/reports/outstanding');
        if (!res.ok) { setOutstandingRows([]); return; }
        const data = await res.json();
        if (!mounted) return;
        setOutstandingRows(data || []);
      } catch (e) { console.error(e); setOutstandingRows([]); }
      finally { if (mounted) setOutstandingLoading(false); }
    };
    load();
    const onData = () => { load().catch(() => {}); };
    document.addEventListener('gurukrupa:data:updated', onData);
    return () => { mounted = false; document.removeEventListener('gurukrupa:data:updated', onData); };
  }, [activeTab]);

  // fetch daybook when Daybook tab active
  useEffect(() => {
    let mounted = true;
    if (activeTab !== 'Daybook') return;
    const load = async () => {
      try {
        setDaybookLoading(true);
        const res = await fetch(`/api/reports/daybook?date=${daybookDate}`);
        if (!res.ok) { setDaybookData([]); return; }
        const data = await res.json();
        if (!mounted) return;
        setDaybookData(data || []);
      } catch (e) { console.error(e); setDaybookData([]); }
      finally { if (mounted) setDaybookLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [activeTab, daybookDate]);

  // fetch cashbook when Cashbook tab active
  useEffect(() => {
    let mounted = true;
    if (activeTab !== 'Cashbook') return;
    const load = async () => {
      try {
        setCashbookLoading(true);
        const res = await fetch(`/api/reports/cashbook?from=${fromDate}&to=${toDate}`);
        if (!res.ok) { setCashbookData([]); return; }
        const data = await res.json();
        if (!mounted) return;
        setCashbookData(data || []);
      } catch (e) { console.error(e); setCashbookData([]); }
      finally { if (mounted) setCashbookLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [activeTab, fromDate, toDate]);

  // fetch bankbook when Bankbook tab active
  useEffect(() => {
    let mounted = true;
    if (activeTab !== 'Bankbook') return;
    const load = async () => {
      try {
        setBankbookLoading(true);
        const res = await fetch(`/api/reports/bankbook?from=${fromDate}&to=${toDate}`);
        if (!res.ok) { setBankbookData([]); return; }
        const data = await res.json();
        if (!mounted) return;
        setBankbookData(data || []);
      } catch (e) { console.error(e); setBankbookData([]); }
      finally { if (mounted) setBankbookLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [activeTab, fromDate, toDate]);

  

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      let type: string | null = null;
      if (activeTab === 'Stock') type = 'stock';
      else if (activeTab === 'Outstanding') type = 'outstanding';
      else if (activeTab === 'P&L') type = 'pl';
      else if (activeTab === 'Ledger') {
        alert('Open the Ledger Preview (Get Ledger) and use its PDF/Print buttons to export.');
        setIsExporting(false);
        return;
      }
      if (!type) {
        alert('No report selected for export');
        setIsExporting(false);
        return;
      }

      let url = `/api/reports/pdf?type=${encodeURIComponent(type)}`;
      if (type === 'pl') {
        url += `&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('PDF export failed', text);
        alert('Failed to generate PDF');
        setIsExporting(false);
        return;
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const filename =
        type === 'stock'
          ? 'Stock_Report.pdf'
          : type === 'outstanding'
          ? 'Outstanding_Report.pdf'
          : `Profit_Loss_${fromDate}_to_${toDate}.pdf`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h1 className="text-2xl font-bold text-slate-800">Business Reports</h1>
        {/* Export button hidden when Stock tab is active */}
        {activeTab === 'Stock' ? null : (
          <Button
            variant="outline"
            icon={Download}
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Preparing PDF...' : 'Export PDF'}
          </Button>
        )}
      </div>

      <Tabs active={activeTab} setActive={setActiveTab} tabs={[ 'Stock', 'Outstanding', 'Ledger', 'P&L', 'Daybook', 'Cashbook', 'Bankbook' ]} />

      {/* Stock Tab */}
      {activeTab === 'Stock' && (
        <>
          <div id="report-stock-content" className="md:hidden space-y-4">
            {stockLoading ? (
              <div className="space-y-2">
                <div className="h-20 bg-slate-200 rounded animate-pulse" />
                <div className="h-20 bg-slate-200 rounded animate-pulse" />
              </div>
            ) : (stockRows || []).map((s, idx) => (
              <div key={s.id || idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800">{s.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">Purchase Rate<br/><span className="font-semibold text-slate-700">{formatCurrency(s.purchaseRate)}</span></p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block px-2 py-1 bg-slate-100 rounded text-xs font-semibold text-blue-600">{s.unitLabel}</div>
                    <div className="mt-3 font-bold text-slate-800">{formatCurrency(s.totalValue)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div id="report-stock-content-desktop" className="hidden md:block">
            <Card title="Stock Summary">
              <Table headers={[ 'Item Name', 'Purchase Rate', 'Stock', 'Total Value' ]}>
                {stockLoading ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading stock...</td></tr>
                ) : (stockRows || []).map((s, idx) => (
                  <tr key={s.id || idx}>
                    <td className="px-4 py-3">{s.name}</td>
                    <td className="px-4 py-3">{formatCurrency(s.purchaseRate)}</td>
                    <td className="px-4 py-3">{s.unitLabel}</td>
                    <td className="px-4 py-3 font-bold">{formatCurrency(s.totalValue)}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>
        </>
      )}

      {/* Outstanding Tab */}
      {activeTab === 'Outstanding' && (
        <>
          <div id="report-outstanding-content" className="md:hidden space-y-4">
            {outstandingLoading ? (
              <div className="space-y-2">
                <div className="h-20 bg-slate-200 rounded animate-pulse" />
                <div className="h-20 bg-slate-200 rounded animate-pulse" />
              </div>
            ) : (outstandingRows || []).map((p, idx) => (
              <div key={p._id || p.id || idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800">{p.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{p.mobile || ''}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${p.currentBalance >= 0 ? 'text-green-600' : 'text-rose-600'}`}>{formatCurrency(Math.abs(p.currentBalance || 0))}</div>
                    <div className="text-xs text-slate-400 mt-1">{(p.type || '').toString().toLowerCase() === 'customer' ? 'To Receive' : 'To Pay'}</div>
                  </div>
                </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <div className="bg-slate-50 p-2 rounded">Opening<br/><span className="font-semibold text-slate-700">{formatCurrency(p.openingBalance || 0)}</span></div>
                  <div className="bg-slate-50 p-2 rounded">Billed<br/><span className="font-semibold text-slate-700">{formatCurrency(p.billed || 0)}</span></div>
                  <div className="bg-slate-50 p-2 rounded">Paid/Recvd<br/><span className="font-semibold text-slate-700">{formatCurrency(p.totalReceived || 0)}</span></div>
                </div>
              </div>
            ))}
          </div>

          <div id="report-outstanding-content-desktop" className="hidden md:block">
            <Card title="Outstanding Payments">
              <Table headers={[ 'Party', 'Mobile', 'Status', 'Amount' ]}>
                {outstandingLoading ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading...</td></tr>
                ) : (outstandingRows || []).map((p, idx) => (
                  <tr key={p._id || p.id || idx}>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3">{p.mobile || ''}</td>
                    <td className="px-4 py-3 text-sm">{(p.type || '').toString().toLowerCase() === 'customer' ? 'To Receive' : 'To Pay'}</td>
                    <td className="px-4 py-3 font-bold">{formatCurrency(Math.abs(p.currentBalance || 0))}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>
        </>
      )}

      {/* Ledger Tab */}
      {activeTab === 'Ledger' && (
        <div className="space-y-4">
          <div className="md:grid md:grid-cols-3 md:gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-100">
              <label className="text-xs text-slate-500 mb-2 block">Select Party</label>
              {partiesLoading ? (
                <div className="space-y-2">
                  <div className="h-10 bg-slate-200 rounded-md animate-pulse" />
                </div>
              ) : (
                <Select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} options={[{ label: 'Select Party...', value: '' }, ...parties]} />
              )}
              <label className="text-xs text-slate-500 mb-2 block mt-3">From Date</label>
              {partiesLoading ? <div className="h-10 bg-slate-200 rounded-md animate-pulse" /> : <Input value={fromDate} onChange={(e) => setFromDate(e.target.value)} type="date" />}
              <label className="text-xs text-slate-500 mb-2 block mt-3">To Date</label>
              {partiesLoading ? <div className="h-10 bg-slate-200 rounded-md animate-pulse" /> : <Input value={toDate} onChange={(e) => setToDate(e.target.value)} type="date" />}
              <Button className="mt-3" disabled={partiesLoading || !selectedParty} onClick={() => {
                if (!selectedParty) return alert('Please select a party');
                router.push(`/admin/reports/ledger/preview?party=${selectedParty}&from=${fromDate || ''}&to=${toDate || ''}`);
              }}>{partiesLoading ? 'Loading...' : 'Get Ledger'}</Button>
            </div>
            <div className="md:col-span-2">
              <Card title="Detailed Ledger">
                <div className="text-center text-slate-400 py-8">Select a party and date range to view ledger</div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Daybook Tab */}
      {activeTab === 'Daybook' && (
        <Card title="Day Book">
          <div className="flex flex-col md:flex-row md:items-end md:gap-4 mb-6">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Select Date</label>
              <Input type="date" value={daybookDate} onChange={(e) => setDaybookDate(e.target.value)} />
            </div>
          </div>
          
          {daybookLoading ? (
            <div className="py-12 text-center text-slate-500">Loading...</div>
          ) : (daybookData || []).length === 0 ? (
            <div className="py-12 text-center text-slate-500">No transactions found for this date</div>
          ) : (
            <>
              {/* Mobile view */}
              <div className="md:hidden space-y-3">
                {(daybookData || []).map((p: any, idx: number) => (
                  <div key={p._id || idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800">{p.partyName || 'Unknown'}</h4>
                        <p className="text-xs text-slate-500 mt-1">{p.voucherNo || p._id}</p>
                        <p className="text-xs text-slate-400">{p.mode || 'cash'}</p>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${p.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                          {p.type === 'receive' ? '+' : '-'} {formatCurrency(p.amount)}
                        </div>
                        <div className="text-xs text-slate-400">{p.type === 'receive' ? 'Received' : 'Paid'}</div>
                      </div>
                    </div>
                    {p.notes && <p className="text-xs text-slate-500 mt-2 border-t pt-2">{p.notes}</p>}
                  </div>
                ))}
              </div>
              
              {/* Desktop view */}
              <div className="hidden md:block">
                <Table headers={['Voucher', 'Party', 'Mode', 'Credit', 'Debit', 'Notes']}>
                  {(daybookData || []).map((p: any, idx: number) => (
                    <tr key={p._id || idx}>
                      <td className="px-4 py-3 text-sm">{p.voucherNo || p._id?.slice(-8)}</td>
                      <td className="px-4 py-3 font-medium">{p.partyName || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm uppercase">{p.mode || 'cash'}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">{p.type === 'receive' ? formatCurrency(p.amount) : '-'}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold">{p.type === 'pay' ? formatCurrency(p.amount) : '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{p.notes || '-'}</td>
                    </tr>
                  ))}
                </Table>
              </div>
              
              {/* Summary */}
              <div className="mt-4 p-4 bg-slate-50 rounded-lg grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Total Received</div>
                  <div className="font-bold text-green-600">
                    {formatCurrency((daybookData || []).filter((p: any) => p.type === 'receive').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Total Paid</div>
                  <div className="font-bold text-red-600">
                    {formatCurrency((daybookData || []).filter((p: any) => p.type === 'pay').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0))}
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Cashbook Tab */}
      {activeTab === 'Cashbook' && (
        <Card title="Cash Book">
          <div className="flex flex-col md:flex-row md:items-end md:gap-4 mb-6">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          
          {cashbookLoading ? (
            <div className="py-12 text-center text-slate-500">Loading...</div>
          ) : (cashbookData || []).length === 0 ? (
            <div className="py-12 text-center text-slate-500">No cash transactions found for this period</div>
          ) : (
            <>
              {/* Mobile view */}
              <div className="md:hidden space-y-3">
                {(cashbookData || []).map((p: any, idx: number) => (
                  <div key={p._id || idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800">{p.partyName || 'Unknown'}</h4>
                        <p className="text-xs text-slate-500 mt-1">{p.date}</p>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${p.credit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {p.credit > 0 ? '+' : '-'} {formatCurrency(p.credit || p.debit)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop view */}
              <div className="hidden md:block">
                <Table headers={['Date', 'Party', 'Credit (In)', 'Debit (Out)', 'Reference']}>
                  {(cashbookData || []).map((p: any, idx: number) => (
                    <tr key={p._id || idx}>
                      <td className="px-4 py-3 text-sm">{p.date}</td>
                      <td className="px-4 py-3 font-medium">{p.partyName || 'Unknown'}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">{p.credit > 0 ? formatCurrency(p.credit) : '-'}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold">{p.debit > 0 ? formatCurrency(p.debit) : '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{p.reference || '-'}</td>
                    </tr>
                  ))}
                </Table>
              </div>
              
              {/* Summary */}
              <div className="mt-4 p-4 bg-slate-50 rounded-lg grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Total Cash In</div>
                  <div className="font-bold text-green-600">
                    {formatCurrency((cashbookData || []).reduce((sum: number, p: any) => sum + Number(p.credit || 0), 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Total Cash Out</div>
                  <div className="font-bold text-red-600">
                    {formatCurrency((cashbookData || []).reduce((sum: number, p: any) => sum + Number(p.debit || 0), 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Net Cash</div>
                  <div className="font-bold text-blue-600">
                    {formatCurrency((cashbookData || []).reduce((sum: number, p: any) => sum + Number(p.credit || 0) - Number(p.debit || 0), 0))}
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Bankbook Tab */}
      {activeTab === 'Bankbook' && (
        <Card title="Bank Book">
          <div className="flex flex-col md:flex-row md:items-end md:gap-4 mb-6">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          
          {bankbookLoading ? (
            <div className="py-12 text-center text-slate-500">Loading...</div>
          ) : (bankbookData || []).length === 0 ? (
            <div className="py-12 text-center text-slate-500">No bank transactions found for this period</div>
          ) : (
            <>
              {/* Mobile view */}
              <div className="md:hidden space-y-3">
                {(bankbookData || []).map((p: any, idx: number) => (
                  <div key={p._id || idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800">{p.partyName || 'Unknown'}</h4>
                        <p className="text-xs text-slate-500 mt-1">{p.date}</p>
                        <p className="text-xs text-slate-400 uppercase">{p.mode || 'bank'}</p>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${p.credit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {p.credit > 0 ? '+' : '-'} {formatCurrency(p.credit || p.debit)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop view */}
              <div className="hidden md:block">
                <Table headers={['Date', 'Party', 'Mode', 'Credit (In)', 'Debit (Out)', 'Reference']}>
                  {(bankbookData || []).map((p: any, idx: number) => (
                    <tr key={p._id || idx}>
                      <td className="px-4 py-3 text-sm">{p.date}</td>
                      <td className="px-4 py-3 font-medium">{p.partyName || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm uppercase">{p.mode || 'bank'}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">{p.credit > 0 ? formatCurrency(p.credit) : '-'}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold">{p.debit > 0 ? formatCurrency(p.debit) : '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{p.reference || '-'}</td>
                    </tr>
                  ))}
                </Table>
              </div>
              
              {/* Summary */}
              <div className="mt-4 p-4 bg-slate-50 rounded-lg grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Total Bank In</div>
                  <div className="font-bold text-green-600">
                    {formatCurrency((bankbookData || []).reduce((sum: number, p: any) => sum + Number(p.credit || 0), 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Total Bank Out</div>
                  <div className="font-bold text-red-600">
                    {formatCurrency((bankbookData || []).reduce((sum: number, p: any) => sum + Number(p.debit || 0), 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Net Balance</div>
                  <div className="font-bold text-blue-600">
                    {formatCurrency((bankbookData || []).reduce((sum: number, p: any) => sum + Number(p.credit || 0) - Number(p.debit || 0), 0))}
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Profit & Loss Tab */}
      {activeTab === 'P&L' && (
        <Card title="Profit & Loss Statement">
          <div className="flex flex-col md:flex-row md:items-end md:gap-4 mb-6">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <Button variant="outline" icon={Download} disabled={isExporting} onClick={handleExport}>
              {isExporting ? 'Preparing PDF...' : 'Export PDF'}
            </Button>
          </div>
          <div id="pl-content" className="bg-white p-6" style={{ color: '#000' }}>
            {plLoading ? (
              <div className="py-12 text-center text-slate-500">Loading...</div>
            ) : plData ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center border-b-2 border-slate-400 pb-4">
                  <h2 className="text-2xl font-bold text-slate-900">Profit & Loss Statement</h2>
                  <p className="text-sm text-slate-700 mt-2">For the period {fromDate} to {toDate}</p>
                </div>

                {/* Opening Balance - always show (zero allowed) */}
                <div className="border-l-4 border-blue-600 bg-blue-50 p-4 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Opening Balance</span>
                    <span className="font-bold text-lg text-slate-900">{Number(plData.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Revenue Section */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">Revenue</h3>
                  <div className="bg-slate-100 p-4 rounded space-y-2 border border-slate-300">
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="font-semibold">Sales</span>
                      <span className="font-semibold">{Number(plData.sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="font-semibold">Other Income</span>
                      <span className="text-green-900 font-semibold">{Number(plData.otherIncome || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-2 flex justify-between font-bold text-slate-900">
                      <span>Total Revenue</span>
                      <span className="text-green-900">{Number((plData.sales || 0) + (plData.otherIncome || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Expenses Section */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">Expenses</h3>
                  <div className="bg-slate-100 p-4 rounded space-y-2 border border-slate-300">
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="font-semibold">Purchase</span>
                      <span className="font-semibold">{Number(plData.purchase || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="font-semibold">Other Expenses</span>
                      <span className="text-red-900 font-semibold">{Number(plData.otherExpense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-2 flex justify-between font-bold text-slate-900">
                      <span>Total Expenses</span>
                      <span className="text-red-900">{Number((plData.purchase || 0) + (plData.otherExpense || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Profit/Loss Summary */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">Summary</h3>
                  <div className="bg-blue-50 p-4 rounded border border-blue-300 space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-blue-200">
                      <span className="text-slate-900 font-semibold">Total Revenue</span>
                      <span className="font-bold text-lg text-green-900">{Number((plData.sales || 0) + (plData.otherIncome || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-200">
                      <span className="text-slate-900 font-semibold">Total Expenses</span>
                      <span className="font-bold text-lg text-red-900">{Number((plData.purchase || 0) + (plData.otherExpense || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-200">
                      <span className="text-slate-900 font-semibold">Gross Profit (Sales - Purchase)</span>
                      <span className="font-bold text-lg text-slate-900">{Number(plData.grossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-extrabold text-slate-900">Net Profit/Loss</span>
                      <span className={`font-extrabold text-2xl ${(plData.netProfit || 0) >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                        {Number(plData.netProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Closing Balance */}
                <div className="border-l-4 border-green-600 bg-green-100 p-4 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Closing Balance</span>
                    <span className="font-extrabold text-lg text-green-900">{Number((plData.openingBalance || 0) + (plData.netProfit || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">No data available for selected period</div>
            )}
          </div>
        </Card>
      )}

    </div>
  );
}

// load parties list once (client-side)
function useLoadParties(setParties: any) {
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/parties');
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        const opts = data.map((p: any) => ({ label: p.name, value: p._id || p.id }));
        setParties(opts);
      } catch (e) { console.error(e); }
    };
    load();

    const onData = () => { load().catch(() => {}); };
    document.addEventListener('gurukrupa:data:updated', onData);

    return () => { mounted = false; document.removeEventListener('gurukrupa:data:updated', onData); };
  }, [setParties]);
}
