'use client';
import React, { useEffect, useState } from 'react';
import { Card, Modal, Button } from '../../../components/ui/Common';
import { TrendingUp, TrendingDown, Users, Package, AlertCircle, ChevronRight, Download, FileSpreadsheet, X, ArrowLeft, IndianRupee } from 'lucide-react';

import { api } from '../../../lib/api';
import { Skeleton } from '../../../components/ui/Common';

interface DrilldownData {
  metric: string;
  breakdown: 'yearly' | 'monthly' | 'transactions';
  year?: number;
  month?: number;
  data?: any[];
  summary?: any;
  partyWise?: any[];
  transactions?: any[];
}

const StatCard = ({ title, value, subtext, icon: Icon, color, onClick, clickable }: any) => (
  <Card 
    size="sm" 
    className={`border-l-4 ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} 
    style={{ borderLeftColor: color }}
    onClick={onClick}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-xl sm:text-2xl font-bold mt-1">{value}</h3>
        <p className="text-xs text-slate-400 mt-1">{subtext}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className={`p-2 rounded-lg bg-opacity-10`} style={{ backgroundColor: `${color}20` }}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: color }} />
        </div>
        {clickable && <ChevronRight className="h-4 w-4 text-slate-400" />}
      </div>
    </div>
  </Card>
);

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  
  // Drill-down state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownMetric, setDrilldownMetric] = useState<string>('');
  const [drilldownLevel, setDrilldownLevel] = useState<'year' | 'month' | 'transactions'>('year');
  const [drilldownYear, setDrilldownYear] = useState<number | null>(null);
  const [drilldownMonth, setDrilldownMonth] = useState<number | null>(null);
  const [drilldownData, setDrilldownData] = useState<DrilldownData | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  
  const metricLabels: Record<string, string> = {
    sales: 'Sales',
    purchase: 'Purchase',
    profit: 'Profit',
    receivable: 'Receivables',
    payable: 'Payables'
  };
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const loadDrilldown = async (metric: string, level: 'year' | 'month' | 'transactions', year?: number, month?: number) => {
    setDrilldownLoading(true);
    try {
      let url = `/api/dashboard?drilldown=${level}&metric=${metric}`;
      if (year) url += `&year=${year}`;
      if (month) url += `&month=${month}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDrilldownData(data);
      }
    } catch (err) {
      console.error('Failed to load drilldown:', err);
    }
    setDrilldownLoading(false);
  };
  
  const openDrilldown = async (metric: string) => {
    setDrilldownMetric(metric);
    setDrilldownLevel('year');
    setDrilldownYear(null);
    setDrilldownMonth(null);
    setDrilldownOpen(true);
    await loadDrilldown(metric, 'year');
  };
  
  const drillToMonth = async (year: number) => {
    setDrilldownLevel('month');
    setDrilldownYear(year);
    await loadDrilldown(drilldownMetric, 'month', year);
  };
  
  const drillToTransactions = async (month: number) => {
    if (!drilldownYear) return;
    setDrilldownLevel('transactions');
    setDrilldownMonth(month);
    await loadDrilldown(drilldownMetric, 'transactions', drilldownYear, month);
  };
  
  const goBack = async () => {
    if (drilldownLevel === 'transactions') {
      setDrilldownLevel('month');
      setDrilldownMonth(null);
      await loadDrilldown(drilldownMetric, 'month', drilldownYear!);
    } else if (drilldownLevel === 'month') {
      setDrilldownLevel('year');
      setDrilldownYear(null);
      await loadDrilldown(drilldownMetric, 'year');
    }
  };
  
  const exportToCSV = () => {
    if (!drilldownData) return;
    
    let csvContent = '';
    let filename = `${drilldownMetric}_`;
    
    if (drilldownLevel === 'year' && drilldownData.data) {
      csvContent = 'Year,Total,Due,Paid,Count\n';
      drilldownData.data.forEach(row => {
        csvContent += `${row.year},${row.total},${row.due},${row.paid},${row.count}\n`;
      });
      filename += 'yearly.csv';
    } else if (drilldownLevel === 'month' && drilldownData.data) {
      csvContent = 'Month,Total,Due,Paid,Count\n';
      drilldownData.data.forEach(row => {
        csvContent += `${row.monthName},${row.total},${row.due},${row.paid},${row.count}\n`;
      });
      filename += `${drilldownYear}_monthly.csv`;
    } else if (drilldownLevel === 'transactions' && drilldownData.transactions) {
      csvContent = 'Invoice No,Date,Party,Amount,Due,Paid\n';
      drilldownData.transactions.forEach(row => {
        csvContent += `${row.invoiceNo},${row.date},"${row.partyName}",${row.amount},${row.due},${row.paid}\n`;
      });
      filename += `${drilldownYear}_${drilldownMonth}_transactions.csv`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };





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
        <StatCard 
          title={`Monthly Profit — ${monthName}`} 
          value={`₹ ${(Number(stats.monthProfit || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`} 
          subtext="Click for year-wise breakdown" 
          icon={IndianRupee} 
          color="#8b5cf6" 
          clickable 
          onClick={() => openDrilldown('profit')} 
        />
        <StatCard 
          title={`Total Sales — ${monthName}`} 
          value={`₹ ${(Number(stats.monthSales || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`} 
          subtext="Click for year-wise breakdown" 
          icon={TrendingUp} 
          color="#10b981" 
          clickable 
          onClick={() => openDrilldown('sales')} 
        />
        <StatCard 
          title={`Total Purchase — ${monthName}`} 
          value={`₹ ${(Number(stats.monthPurchase || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`} 
          subtext="Click for year-wise breakdown" 
          icon={TrendingDown} 
          color="#ef4444" 
          clickable 
          onClick={() => openDrilldown('purchase')} 
        />
        <StatCard 
          title={`Parties Receivables — ${monthName}`} 
          value={`₹ ${(Number(stats.monthReceivables || 0)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`} 
          subtext="Click for year-wise breakdown" 
          icon={Users} 
          color="#3b82f6" 
          clickable 
          onClick={() => openDrilldown('receivable')} 
        />
        <StatCard 
          title="Payable (Supplier)" 
          value={`${stats.payables ? `₹ ${Number(stats.payables || 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}` : '—'}`} 
          subtext="Click for year-wise breakdown" 
          icon={TrendingDown} 
          color="#ef4444" 
          clickable 
          onClick={() => openDrilldown('payable')} 
        />
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
                <div className={`mt-2 text-lg font-bold ${Number(it.stock || 0) < 0 ? 'text-red-600' : Number(it.stock || 0) < 10 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {Number(it.stock || 0).toLocaleString()} {it.unit || ''}
                  {Number(it.stock || 0) < 0 && <span className="text-xs ml-1">(Negative)</span>}
                  {Number(it.stock || 0) >= 0 && Number(it.stock || 0) < 10 && <span className="text-xs ml-1">(Low)</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Drilldown Modal */}
      <Modal 
        isOpen={drilldownOpen} 
        onClose={() => setDrilldownOpen(false)} 
        title={`${metricLabels[drilldownMetric] || 'Details'} - ${drilldownLevel === 'year' ? 'Year-wise' : drilldownLevel === 'month' ? `${drilldownYear} Monthly` : `${monthNames[(drilldownMonth || 1) - 1]} ${drilldownYear}`}`}
      >
        <div className="min-h-[300px]">
          {/* Navigation and Export */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {drilldownLevel !== 'year' && (
                <button 
                  onClick={goBack} 
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}
            </div>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export CSV
            </button>
          </div>
          
          {drilldownLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : drilldownData ? (
            <>
              {/* Year-wise breakdown */}
              {drilldownLevel === 'year' && drilldownData.data && (
                <div className="space-y-2">
                  {drilldownData.data.map((row: any) => (
                    <div 
                      key={row.year}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                      onClick={() => drillToMonth(row.year)}
                    >
                      <div>
                        <span className="font-bold text-slate-800">{row.year}</span>
                        <span className="text-sm text-slate-500 ml-2">({row.count} invoices)</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-slate-800">₹ {row.total.toLocaleString()}</div>
                          {row.due > 0 && <div className="text-xs text-red-600">Due: ₹ {row.due.toLocaleString()}</div>}
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                  {drilldownData.data.length === 0 && (
                    <div className="text-center py-8 text-slate-500">No data available</div>
                  )}
                </div>
              )}
              
              {/* Month-wise breakdown */}
              {drilldownLevel === 'month' && drilldownData.data && (
                <div className="space-y-2">
                  {drilldownData.data.filter((row: any) => row.count > 0).map((row: any) => (
                    <div 
                      key={row.month}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                      onClick={() => drillToTransactions(row.month)}
                    >
                      <div>
                        <span className="font-bold text-slate-800">{row.monthName}</span>
                        <span className="text-sm text-slate-500 ml-2">({row.count} invoices)</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-slate-800">₹ {row.total.toLocaleString()}</div>
                          {row.due > 0 && <div className="text-xs text-red-600">Due: ₹ {row.due.toLocaleString()}</div>}
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                  {drilldownData.data.filter((row: any) => row.count > 0).length === 0 && (
                    <div className="text-center py-8 text-slate-500">No transactions this year</div>
                  )}
                </div>
              )}
              
              {/* Transaction breakdown */}
              {drilldownLevel === 'transactions' && drilldownData.summary && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Total</div>
                      <div className="font-bold text-blue-700">₹ {drilldownData.summary.totalAmount.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Due</div>
                      <div className="font-bold text-red-600">₹ {drilldownData.summary.totalDue.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Invoices</div>
                      <div className="font-bold text-slate-700">{drilldownData.summary.totalTransactions}</div>
                    </div>
                  </div>
                  
                  {/* Party-wise summary */}
                  {drilldownData.partyWise && drilldownData.partyWise.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Party-wise Summary</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {drilldownData.partyWise.slice(0, 5).map((p: any) => (
                          <div key={p.partyId} className="flex justify-between text-sm p-2 bg-slate-50 rounded">
                            <span className="truncate">{p.partyName}</span>
                            <span className="font-semibold">₹ {p.total.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Transactions list */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Transactions</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {(drilldownData.transactions || []).map((t: any) => (
                        <div key={t.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded hover:bg-slate-100">
                          <div>
                            <div className="font-medium">{t.invoiceNo}</div>
                            <div className="text-xs text-slate-500">{t.partyName} • {t.date}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${t.type === 'PURCHASE' && drilldownMetric === 'profit' ? 'text-red-600' : t.type === 'SALES' && drilldownMetric === 'profit' ? 'text-green-600' : ''}`}>
                                {t.type === 'PURCHASE' && drilldownMetric === 'profit' ? '- ' : ''}₹ {t.amount.toLocaleString()}
                            </div>
                            {t.due > 0 && <div className="text-xs text-red-600">Due: ₹ {t.due.toLocaleString()}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-slate-500">No data available</div>
          )}
        </div>
      </Modal>

    </div>
  );
}
