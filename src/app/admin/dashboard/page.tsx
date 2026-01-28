'use client';
import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Common';
import { TrendingUp, TrendingDown, Users, Package, AlertCircle } from 'lucide-react';

import { api } from '../../../lib/api';
import { Skeleton } from '../../../components/ui/Common';



const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <Card size="sm" className="border-l-4" style={{ borderLeftColor: color }}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-xl sm:text-2xl font-bold mt-1">{value}</h3>
        <p className="text-xs text-slate-400 mt-1">{subtext}</p>
      </div>
      <div className={`p-2 rounded-lg bg-opacity-10`} style={{ backgroundColor: `${color}20` }}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: color }} />
      </div>
      
    </div>
  </Card>
);

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);





  useEffect(() => {
    const load = async () => {
      const s = await api.dashboard.getStats();
      setStats(s);
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





  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <div className="text-sm text-slate-500 hidden md:block">Gurukrupa Multi Ventures Pvt Ltd</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
                <div className="mt-2 text-lg font-bold text-slate-900">{Number(it.stock || 0).toLocaleString()} {it.unit || ''}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}
