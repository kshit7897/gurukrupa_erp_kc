'use client';
import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Common';
import { TrendingUp, TrendingDown, Users, Package, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/formatDate';
import { SoftLoader, Skeleton } from '../../../components/ui/Common';
import { Modal, Button, Table } from '../../../components/ui/Common';
import { useRouter } from 'next/navigation';

// placeholder; we'll compute weekly data dynamically from recent transactions
const emptyWeek = [{ name: 'Mon', sales: 0, purchase: 0 }, { name: 'Tue', sales: 0, purchase: 0 }, { name: 'Wed', sales: 0, purchase: 0 }, { name: 'Thu', sales: 0, purchase: 0 }, { name: 'Fri', sales: 0, purchase: 0 }, { name: 'Sat', sales: 0, purchase: 0 }, { name: 'Sun', sales: 0, purchase: 0 }];

const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <Card className="border-l-4" style={{ borderLeftColor: color }}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold mt-1">{value}</h3>
        <p className="text-xs text-slate-400 mt-1">{subtext}</p>
      </div>
      <div className={`p-2 rounded-lg bg-opacity-10`} style={{ backgroundColor: `${color}20` }}>
        <Icon className="h-6 w-6" style={{ color: color }} />
      </div>
      
    </div>
  </Card>
);

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [outstandingReport, setOutstandingReport] = useState<any[]>([]);
  const [receivableSearch, setReceivableSearch] = useState('');
  const [payableSearch, setPayableSearch] = useState('');
  const [showReceivableModal, setShowReceivableModal] = useState(false);
  const [showPayableModal, setShowPayableModal] = useState(false);
  const router = useRouter();

  const computeWeekData = (txs: any[]) => {
    // build totals for last 7 days keyed by weekday name
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const map: Record<string, { sales: number; purchase: number }> = {};
    for (let d of days) map[d] = { sales: 0, purchase: 0 };
    const now = new Date();
    const sevenAgo = new Date(); sevenAgo.setDate(now.getDate() - 6);
    txs.forEach(t => {
      const dt = new Date(t.date);
      if (isNaN(dt.getTime())) return;
      if (dt < sevenAgo) return;
      const day = days[dt.getDay()];
      if (t.type === 'Sale' || t.type === 'SALES') map[day].sales += Number(t.amount || 0);
      else map[day].purchase += Number(t.amount || 0);
    });
    // return ordered Mon..Sun
    const order = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    return order.map(d => ({ name: d, sales: map[d].sales, purchase: map[d].purchase }));
  };

  useEffect(() => {
    const load = async () => {
      const s = await api.dashboard.getStats();
      setStats(s);
      const tx = await api.dashboard.getRecentTransactions();
      setTransactions(tx || []);
      const pay = await api.payments.list();
      setPayments(pay || []);
      try {
        const out = await api.reports.getOutstanding();
        setOutstandingReport(out || []);
      } catch (e) { console.error(e); }
    };
    load();

    const onData = () => {
      load().catch(() => {});
    };
    document.addEventListener('gurukrupa:data:updated', onData);
    return () => document.removeEventListener('gurukrupa:data:updated', onData);
  }, []);

  if (!stats) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <div className="w-1/3">
            <Skeleton variant="text" lines={2} />
          </div>
          <div className="w-1/6 hidden md:block">
            <Skeleton variant="text" lines={1} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton variant="card" />
          </div>
          <div>
            <Skeleton variant="card" />
          </div>
        </div>
      </div>
    );
  }
  const _d = new Date();
  const monthName = `${_d.toLocaleString(undefined, { month: 'short' })}-${_d.getFullYear().toString().slice(-2)}`;
  const weekData = computeWeekData(transactions || []);

  const filteredReceivables = (outstandingReport || [])
    .filter((p:any)=> (p.type||'').toString().toLowerCase()==='customer' && Number(p.currentBalance || 0) > 0)
    .filter((p:any) => {
      if (!receivableSearch) return true;
      return (p.name || '').toString().toLowerCase().includes(receivableSearch.toLowerCase()) || (p._id || p.id || '').toString().toLowerCase().includes(receivableSearch.toLowerCase());
    });

  const filteredPayables = (outstandingReport || [])
    .filter((p:any)=> (p.type||'').toString().toLowerCase()==='supplier' && Number(p.currentBalance || 0) > 0)
    .filter((p:any) => {
      if (!payableSearch) return true;
      return (p.name || '').toString().toLowerCase().includes(payableSearch.toLowerCase()) || (p._id || p.id || '').toString().toLowerCase().includes(payableSearch.toLowerCase());
    });

  const buildSpark = (items: any[], key = 'amount') => {
    // last 7 days totals
    const now = new Date();
    const arr: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(now.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const dayEndDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()); dayEndDate.setDate(d.getDate()+1);
      const dayEnd = dayEndDate.toISOString();
      const total = items.reduce((s, it) => {
        const dt = new Date(it.date);
        if (isNaN(dt.getTime())) return s;
        if (dt.toISOString() >= dayStart && dt.toISOString() < dayEnd) return s + Number(it[key] || 0);
        return s;
      }, 0);
      arr.push(total);
    }
    return arr.map((v,i) => ({ x: i, y: v }));
  };

  const receivableSpark = buildSpark((stats?.recentInvoices || []).filter((inv:any)=>inv.type==='SALES'), 'dueAmount');
  const payableSpark = buildSpark((stats?.recentInvoices || []).filter((inv:any)=>inv.type==='PURCHASE'), 'dueAmount');
  const cashInSpark = buildSpark((stats?.recentPayments || payments || []), 'amount');
  // cashOut per-party type isn't available client-side; approximate with zero or same as payments split if server provides
  const cashOutSpark = buildSpark([], 'amount');

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <div className="text-sm text-slate-500 hidden md:block">Gurukrupa Multi Ventures Pvt Ltd</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={`Total Sales — ${monthName}`} value={`₹ ${(Number(stats.monthSales || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`} subtext="Month-to-date" icon={TrendingUp} color="#10b981" />
        <StatCard title={`Total Purchase — ${monthName}`} value={`₹ ${(Number(stats.monthPurchase || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`} subtext="Month-to-date" icon={TrendingDown} color="#ef4444" />
        <StatCard title={`Parties Receivables — ${monthName}`} value={`₹ ${(Number(stats.monthReceivables || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`} subtext="Month-to-date" icon={Users} color="#3b82f6" />
        <StatCard title="Payable (Supplier)" value={`${stats.payables ? `₹ ${Number(stats.payables || 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}` : '—'}`} subtext="Outstanding" icon={TrendingDown} color="#ef4444" />
      </div>
      {/* Current Stock snapshot */}
      <div className="mt-4">
        <Card title="Current Stock (Top items)">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {(stats.currentStock || []).length === 0 && (
              <div className="col-span-1 text-sm text-slate-500">No stock data available</div>
            )}
            {(stats.currentStock || []).map((it:any) => (
              <div key={it.id} className="bg-white border border-slate-100 rounded p-3">
                <div className="text-sm text-slate-500">{it.sku || 'SKU'}</div>
                <div className="mt-1 font-semibold text-slate-800 truncate">{it.name}</div>
                <div className="mt-2 text-lg font-bold text-slate-900">{Number(it.stock || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      {/* Receivables modal */}
      <Modal isOpen={showReceivableModal} onClose={() => setShowReceivableModal(false)} title="Receivables — Parties" full showBack>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              aria-label="Search parties"
              placeholder="Search parties by name or id..."
              value={receivableSearch}
              onChange={(e) => setReceivableSearch((e.target as HTMLInputElement).value)}
              className="w-full md:w-80 px-3 py-2 border rounded text-sm"
            />
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="max-h-[60vh] overflow-auto">
              <Table headers={[ 'Party', 'Amount Due', 'Actions' ]}>
                {filteredReceivables.map((p:any) => (
                  <tr key={p._id || p.id}>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3">₹ {(Number(p.currentBalance || 0) || 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => { setShowReceivableModal(false); router.push(`/payments/receive?party=${p._id || p.id}`); }}>Receive</Button>
                        <Button size="sm" onClick={() => { setShowReceivableModal(false); router.push(`/payments/receive?party=${p._id || p.id}`); }}>Open</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          </div>

          {/* Mobile stacked rows */}
          <div className="md:hidden space-y-2">
            <div className="max-h-[60vh] overflow-auto space-y-2">
              {filteredReceivables.map((p:any) => (
                <div key={p._id || p.id} className="bg-white border border-slate-100 rounded p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-sm text-slate-500 mt-1">₹ {(Number(p.currentBalance || 0) || 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap ml-4">
                    <Button variant="outline" size="sm" onClick={() => { setShowReceivableModal(false); router.push(`/payments/receive?party=${p._id || p.id}`); }}>Receive</Button>
                    <Button size="sm" onClick={() => { setShowReceivableModal(false); router.push(`/payments/receive?party=${p._id || p.id}`); }}>Open</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Payables modal */}
      <Modal isOpen={showPayableModal} onClose={() => setShowPayableModal(false)} title="Payables — Suppliers" full showBack>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              aria-label="Search suppliers"
              placeholder="Search suppliers by name or id..."
              value={payableSearch}
              onChange={(e) => setPayableSearch((e.target as HTMLInputElement).value)}
              className="w-full md:w-80 px-3 py-2 border rounded text-sm"
            />
          </div>

          <div className="hidden md:block">
            <div className="max-h-[60vh] overflow-auto">
              <Table headers={[ 'Supplier', 'Amount Due', 'Actions' ]}>
                {filteredPayables.map((p:any) => (
                  <tr key={p._id || p.id}>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3">₹ {(Number(p.currentBalance || 0) || 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => { setShowPayableModal(false); router.push(`/payments/pay?party=${p._id || p.id}`); }}>Pay</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          </div>

          {/* Mobile stacked rows */}
          <div className="md:hidden space-y-2">
            <div className="max-h-[60vh] overflow-auto space-y-2">
              {filteredPayables.map((p:any) => (
                <div key={p._id || p.id} className="bg-white border border-slate-100 rounded p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-sm text-slate-500 mt-1">₹ {(Number(p.currentBalance || 0) || 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap ml-4">
                        <Button variant="outline" size="sm" onClick={() => { setShowPayableModal(false); router.push(`/payments/pay?party=${p._id || p.id}`); }}>Pay</Button>
                        <Button size="sm" onClick={() => { setShowPayableModal(false); router.push(`/payments/pay?party=${p._id || p.id}`); }}>Open</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Desktop: show Bar chart */}
        <div className="hidden md:block lg:col-span-2">
          <Card title="Sales vs Purchase" className="lg:col-span-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData.length ? weekData : emptyWeek} margin={{ top: 20, right: 20, left: 24, bottom: 12 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} width={60} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchase" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Mobile: show summary stats with sparklines and progress */}
        {/* Mobile summary (small cards) */}
        <div className="md:hidden space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card onClick={() => setShowReceivableModal(true)} className="cursor-pointer">
              <p className="text-xs text-slate-500">Receivable (Customer)</p>
                <div>
                  <div className="text-lg font-bold">₹ {(Number(stats.receivables || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  <div className="text-xs text-slate-400">Outstanding from customers</div>
                </div>
                <div style={{width:80, height:40}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={receivableSpark}><Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={2} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              <div className="h-2 bg-slate-100 rounded mt-3">
                <div className="h-2 rounded bg-green-500" style={{ width: `${Math.min(100, (stats.receivables || 0) / Math.max(1, stats.totalSales || 1) * 100)}%` }}></div>
              </div>
            </Card>

            <Card onClick={() => setShowPayableModal(true)} className="cursor-pointer">
              <p className="text-xs text-slate-500">Payable (Supplier)</p>
                  <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="text-lg font-bold">₹ {(Number(stats.payables || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                </div>
                <div style={{width:80, height:40}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={payableSpark}><Line type="monotone" dataKey="y" stroke="#ef4444" strokeWidth={2} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded mt-3">
                <div className="h-2 rounded bg-red-500" style={{ width: `${Math.min(100, (stats.payables || 0) / Math.max(1, stats.totalPurchase || 1) * 100)}%` }}></div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-xs text-slate-500">Cash In</p>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="text-lg font-bold">₹ {(Number(stats.cashIn || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  <div className="text-xs text-slate-400">Received from customers</div>
                </div>
                <div style={{width:80, height:40}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashInSpark}><Line type="monotone" dataKey="y" stroke="#10b981" strokeWidth={2} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded mt-3">
                <div className="h-2 rounded bg-green-600" style={{ width: `${Math.min(100, (stats.cashIn || 0) / Math.max(1, stats.totalSales || 1) * 100)}%` }}></div>
              </div>
            </Card>

            <Card>
              <p className="text-xs text-slate-500">Cash Out</p>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="text-lg font-bold">₹ {(Number(stats.cashOut || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  <div className="text-xs text-slate-400">Paid to suppliers</div>
                </div>
                <div style={{width:80, height:40}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashOutSpark}><Line type="monotone" dataKey="y" stroke="#f59e0b" strokeWidth={2} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded mt-3">
                <div className="h-2 rounded bg-yellow-500" style={{ width: `${Math.min(100, (stats.cashOut || 0) / Math.max(1, stats.totalPurchase || 1) * 100)}%` }}></div>
              </div>
            </Card>
          </div>
        </div>

        {/* Desktop small summary grid (clickable Receivable/Payable) */}
        <div className="hidden md:block lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            <Card onClick={() => setShowReceivableModal(true)} className="cursor-pointer">
              <p className="text-xs text-slate-500">Receivable (Customer)</p>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="text-lg font-bold">₹ {(Number(stats.receivables || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  <div className="text-xs text-slate-400">Outstanding from customers</div>
                </div>
                <div style={{width:80, height:40}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={receivableSpark}><Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={2} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded mt-3"><div className="h-2 rounded bg-green-500" style={{ width: `${Math.min(100, (stats.receivables || 0) / Math.max(1, stats.totalSales || 1) * 100)}%` }}></div></div>
            </Card>

            <Card onClick={() => setShowPayableModal(true)} className="cursor-pointer">
              <p className="text-xs text-slate-500">Payable (Supplier)</p>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="text-lg font-bold">₹ {(Number(stats.payables || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  <div className="text-xs text-slate-400">Outstanding to suppliers</div>
                </div>
                <div style={{width:80, height:40}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={payableSpark}><Line type="monotone" dataKey="y" stroke="#ef4444" strokeWidth={2} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded mt-3"><div className="h-2 rounded bg-red-500" style={{ width: `${Math.min(100, (stats.payables || 0) / Math.max(1, stats.totalPurchase || 1) * 100)}%` }}></div></div>
            </Card>

            <Card>
              <p className="text-xs text-slate-500">Cash In</p>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="text-lg font-bold">₹ {(Number(stats.cashIn || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  <div className="text-xs text-slate-400">Received from customers</div>
                </div>
                <div style={{width:80, height:40}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashInSpark}><Line type="monotone" dataKey="y" stroke="#10b981" strokeWidth={2} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded mt-3"><div className="h-2 rounded bg-green-600" style={{ width: `${Math.min(100, (stats.cashIn || 0) / Math.max(1, stats.totalSales || 1) * 100)}%` }}></div></div>
            </Card>

            <Card>
              <p className="text-xs text-slate-500">Cash Out</p>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="text-lg font-bold">₹ {(Number(stats.cashOut || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  <div className="text-xs text-slate-400">Paid to suppliers</div>
                </div>
                <div style={{width:80, height:40}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashOutSpark}><Line type="monotone" dataKey="y" stroke="#f59e0b" strokeWidth={2} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded mt-3"><div className="h-2 rounded bg-yellow-500" style={{ width: `${Math.min(100, (stats.cashOut || 0) / Math.max(1, stats.totalPurchase || 1) * 100)}%` }}></div></div>
            </Card>
          </div>
        </div>

        {/* Last 5 Transactions section removed as requested */}
      </div>
    </div>
  );
}
