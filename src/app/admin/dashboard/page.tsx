'use client';
import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Common';
import { TrendingUp, TrendingDown, Users, Package, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { api } from '../../../lib/api';
import { SoftLoader } from '../../../components/ui/Common';

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
    };
    load();

    const onData = () => {
      load().catch(() => {});
    };
    document.addEventListener('gurukrupa:data:updated', onData);
    return () => document.removeEventListener('gurukrupa:data:updated', onData);
  }, []);

  if (!stats) {
    return <div className="p-10 text-center"><SoftLoader size="lg" text="Loading dashboard..." /></div>;
  }
  const weekData = computeWeekData(transactions || []);
  const salesLast5 = (transactions || []).filter(t => t.type === 'Sale').slice(0,5);
  const purchaseLast5 = (transactions || []).filter(t => t.type === 'Purchase').slice(0,5);
  const paymentsLast5 = (payments || []).slice(0,5);

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
        <div className="text-sm text-slate-500">Gurukrupa Multi Ventures Pvt Ltd</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Sales" value={`₹ ${(Number(stats.totalSales || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`} subtext="" icon={TrendingUp} color="#10b981" />
        <StatCard title="Total Purchase" value={`₹ ${(Number(stats.totalPurchase || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`} subtext="" icon={TrendingDown} color="#ef4444" />
        <StatCard title="Parties Receivables" value={`₹ ${(Number(stats.receivables || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`} subtext="" icon={Users} color="#3b82f6" />
        <StatCard title="Low Stock Items" value={`${stats.lowStock || 0} Items`} subtext="" icon={AlertCircle} color="#f59e0b" />
      </div>

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
        <div className="md:hidden space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card>
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
              <div className="h-2 bg-slate-100 rounded mt-3">
                <div className="h-2 rounded bg-green-500" style={{ width: `${Math.min(100, (stats.receivables || 0) / Math.max(1, stats.totalSales || 1) * 100)}%` }}></div>
              </div>
            </Card>

            <Card>
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

        <div className="grid grid-cols-1 gap-4">
          <Card title="Last 5 Transactions">
            <div className="space-y-3">
              {(transactions || []).slice(0,5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <div className={`h-8 w-8 rounded flex items-center justify-center font-bold text-xs flex-shrink-0 ${tx.type === 'Sale' ? 'bg-green-100 text-green-700' : tx.type === 'Purchase' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {tx.type === 'Sale' ? 'S' : tx.type === 'Purchase' ? 'P' : '₹'}
                    </div>
                    <div className="ml-3 min-w-0">
                      <p className="text-sm font-medium truncate max-w-[14rem] md:max-w-[18rem]">{tx.party || tx.partyId || 'Unknown'}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[14rem] md:max-w-[18rem]">{tx.type === 'Payment' ? `Ref ${tx.id}` : `Inv #${tx.id}`}</p>
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className={`text-sm font-bold ${tx.type === 'Sale' ? 'text-green-600' : tx.type === 'Purchase' ? 'text-slate-700' : 'text-slate-600'}`}>{tx.type === 'Purchase' ? '-' : '+'} ₹ {(Number(tx.amount || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                    <p className="text-xs text-slate-400">{tx.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
