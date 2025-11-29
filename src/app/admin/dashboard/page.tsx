'use client';
import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Common';
import { TrendingUp, TrendingDown, Users, Package, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../../../lib/api';

const data = [
  { name: 'Mon', sales: 4000, purchase: 2400 },
  { name: 'Tue', sales: 3000, purchase: 1398 },
  { name: 'Wed', sales: 2000, purchase: 9800 },
  { name: 'Thu', sales: 2780, purchase: 3908 },
  { name: 'Fri', sales: 1890, purchase: 4800 },
  { name: 'Sat', sales: 2390, purchase: 3800 },
  { name: 'Sun', sales: 3490, purchase: 4300 },
];

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

  useEffect(() => {
    api.dashboard.getStats().then(setStats);
    api.dashboard.getRecentTransactions().then(setTransactions);
  }, []);

  if (!stats) {
    return <div className="p-10 text-center text-slate-500">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <div className="text-sm text-slate-500">Gurukrupa Multi Ventures Pvt Ltd</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Sales" value={`₹ ${stats.totalSales.toLocaleString()}`} subtext="+20.1% from last month" icon={TrendingUp} color="#10b981" />
        <StatCard title="Total Purchase" value={`₹ ${stats.totalPurchase.toLocaleString()}`} subtext="+4.5% from last month" icon={TrendingDown} color="#ef4444" />
        <StatCard title="Parties Receivables" value={`₹ ${stats.receivables.toLocaleString()}`} subtext="3 Parties pending" icon={Users} color="#3b82f6" />
        <StatCard title="Low Stock Items" value={`${stats.lowStock} Items`} subtext="Reorder needed" icon={AlertCircle} color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Sales vs Purchase" className="lg:col-span-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchase" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Recent Transactions">
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded flex items-center justify-center font-bold text-xs ${tx.type === 'Sale' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {tx.type[0]}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{tx.party}</p>
                    <p className="text-xs text-slate-500">Inv #00{tx.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${tx.type === 'Sale' ? 'text-green-600' : 'text-slate-700'}`}>
                    {tx.type === 'Sale' ? '+' : '-'} ₹ {tx.amount}
                  </p>
                  <p className="text-xs text-slate-400">{tx.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
