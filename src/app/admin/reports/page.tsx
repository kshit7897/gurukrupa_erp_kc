'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Table, Card, Select, Input } from '../../../components/ui/Common';
import { Download } from 'lucide-react';

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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [stockRows, setStockRows] = useState<any[] | null>(null);
  const [outstandingRows, setOutstandingRows] = useState<any[] | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [outstandingLoading, setOutstandingLoading] = useState(false);

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

  // fetch stock when Stock tab active
  useEffect(() => {
    let mounted = true;
    if (activeTab !== 'Stock') return;
    (async () => {
      try {
        setStockLoading(true);
        const res = await fetch('/api/reports/stock');
        if (!res.ok) { setStockRows([]); return; }
        const data = await res.json();
        if (!mounted) return;
        setStockRows(data || []);
      } catch (e) { console.error(e); setStockRows([]); }
      finally { if (mounted) setStockLoading(false); }
    })();
    return () => { mounted = false; };
  }, [activeTab]);

  // fetch outstanding when Outstanding tab active
  useEffect(() => {
    let mounted = true;
    if (activeTab !== 'Outstanding') return;
    (async () => {
      try {
        setOutstandingLoading(true);
        const res = await fetch('/api/reports/outstanding');
        if (!res.ok) { setOutstandingRows([]); return; }
        const data = await res.json();
        if (!mounted) return;
        setOutstandingRows(data || []);
      } catch (e) { console.error(e); setOutstandingRows([]); }
      finally { if (mounted) setOutstandingLoading(false); }
    })();
    return () => { mounted = false; };
  }, [activeTab]);

  

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h1 className="text-2xl font-bold text-slate-800">Business Reports</h1>
        <Button variant="outline" icon={Download}>Export PDF</Button>
      </div>

      <Tabs active={activeTab} setActive={setActiveTab} tabs={[ 'Stock', 'Outstanding', 'Ledger' ]} />

      {/* Stock Tab */}
      {activeTab === 'Stock' && (
        <>
          <div className="md:hidden space-y-4">
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

          <div className="hidden md:block">
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
          <div className="md:hidden space-y-4">
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

          <div className="hidden md:block">
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
