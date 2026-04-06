'use client';
import React, { useEffect, useState } from 'react';
import { Card, Modal, Button, Table } from '../../../components/ui/Common';
import { TrendingUp, TrendingDown, Users, Package, AlertCircle, ChevronRight, Download, FileSpreadsheet, X, ArrowLeft, IndianRupee } from 'lucide-react';

import { api } from '../../../lib/api';
import { Skeleton } from '../../../components/ui/Common';

interface DrilldownData {
  metric: string;
  breakdown: 'yearly' | 'monthly' | 'transactions';
  year?: number;
  month?: number;
  partyId?: string;
  partyName?: string;
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
  const [_now] = useState(new Date());
  const [fromDate, setFromDate] = useState(new Date(_now.getFullYear(), _now.getMonth(), 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(_now.toISOString().split('T')[0]);
  
  const metricLabels: Record<string, string> = {
    sales: 'Sales',
    purchase: 'Purchase',
    profit: 'Profit',
    receivable: 'Receivables',
    payable: 'Payables',
    ledger: 'Ledger'
  };
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const loadDrilldown = async (metric: string, level: 'year' | 'month' | 'transactions', year?: number, month?: number, partyId?: string) => {
    setDrilldownLoading(true);
    try {
      let url = `/api/dashboard?drilldown=${level}&metric=${metric}`;
      if (year) url += `&year=${year}`;
      if (month) url += `&month=${month}`;
      if (partyId) url += `&partyId=${partyId}`;
      if (metric === 'ledger') url += `&from=${fromDate}&to=${toDate}`;
      
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
  
  const openDrilldown = async (metric: string, partyId?: string) => {
    setDrilldownMetric(metric);
    setDrilldownData(null); // Reset
    setDrilldownOpen(true);
    
    if (metric === 'ledger') {
      setDrilldownLevel('transactions'); // Simple view
      await loadDrilldown('ledger', 'year', undefined, undefined, partyId);
    } else {
      setDrilldownLevel('year');
      setDrilldownYear(null);
      setDrilldownMonth(null);
      await loadDrilldown(metric, 'year', undefined, undefined, partyId);
    }
  };
  
  const drillToMonth = async (year: number) => {
    setDrilldownLevel('month');
    setDrilldownYear(year);
    await loadDrilldown(drilldownMetric, 'month', year, undefined, (drilldownData as any)?.partyId);
  };
  
  const drillToTransactions = async (month: number) => {
    if (!drilldownYear) return;
    setDrilldownLevel('transactions');
    setDrilldownMonth(month);
    await loadDrilldown(drilldownMetric, 'transactions', drilldownYear, month, (drilldownData as any)?.partyId);
  };
  
  const goBack = async () => {
    const pid = (drilldownData as any)?.partyId;
    if (drilldownLevel === 'transactions' && drilldownMetric !== 'ledger') {
      setDrilldownLevel('month');
      setDrilldownMonth(null);
      await loadDrilldown(drilldownMetric, 'month', drilldownYear!, undefined, pid);
    } else if (drilldownLevel === 'month') {
      setDrilldownLevel('year');
      setDrilldownYear(null);
      await loadDrilldown(drilldownMetric, 'year', undefined, undefined, pid);
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
    } else if (drilldownLevel === 'transactions' || drilldownMetric === 'ledger') {
      csvContent = 'Date,Ref No,Party,Debit (Out),Credit (In),Balance\n';
      (drilldownData.transactions || []).forEach(row => {
        csvContent += `${row.date},${row.invoiceNo},"${row.partyName}",${row.debit},${row.credit},${row.balance}\n`;
      });
      filename += `${fromDate}_to_${toDate}_ledger.csv`;
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
  
  const fVal = (val: number) => `₹ ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <div className="text-sm text-slate-500 hidden md:block">Gurukrupa Multi Ventures Pvt Ltd</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard 
          title={`Monthly Profit`} 
          value={fVal(stats.monthProfit)} 
          subtext="Click for year-wise breakdown" 
          icon={IndianRupee} 
          color="#8b5cf6" 
          clickable 
          onClick={() => openDrilldown('profit')} 
        />
        <StatCard 
          title={`Total Sales`} 
          value={fVal(stats.monthSales)} 
          subtext="Click for year-wise breakdown" 
          icon={TrendingUp} 
          color="#10b981" 
          clickable 
          onClick={() => openDrilldown('sales')} 
        />
        <StatCard 
          title={`Total Purchase`} 
          value={fVal(stats.monthPurchase)} 
          subtext="Click for year-wise breakdown" 
          icon={TrendingDown} 
          color="#ef4444" 
          clickable 
          onClick={() => openDrilldown('purchase')} 
        />
        <StatCard 
          title={`Parties Receivables`} 
          value={fVal(stats.monthReceivables)} 
          subtext="Click for year-wise breakdown" 
          icon={Users} 
          color="#3b82f6" 
          clickable 
          onClick={() => openDrilldown('receivable')} 
        />
        <StatCard 
          title="Payables" 
          value={fVal(stats.payables)} 
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

      {/* Financial Accounts Section */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <IndianRupee className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">Financial Accounts & Partners</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(stats.financialAccounts || []).map((acc: any) => (
            <div 
              key={acc.id} 
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => openDrilldown('ledger', acc.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">{acc.roles?.[0] || acc.type}</div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="text-base font-semibold text-slate-800 mb-1">{acc.name}</div>
              <div className={`text-xl font-bold ${acc.currentBalance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                ₹ {Number(acc.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
          {(stats.financialAccounts || []).length === 0 && (
            <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
              No financial accounts configured (Bank/Cash/Partners)
            </div>
          )}
        </div>
      </div>

      {/* Drilldown Modal */}
      <Modal 
        isOpen={drilldownOpen} 
        onClose={() => setDrilldownOpen(false)} 
        size="xl"
        title={`${drilldownData?.partyName || metricLabels[drilldownMetric] || 'Details'}`}
      >
        <div className="min-h-[300px]">
          {/* Dashboard Modal Header / Controls */}
          {drilldownMetric === 'ledger' ? (
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                   <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">From Date</label>
                      <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-sm" />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">To Date</label>
                      <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-sm" />
                   </div>
                   <button 
                     onClick={() => loadDrilldown('ledger', 'year', undefined, undefined, (drilldownData as any)?.partyId)}
                     className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-bold hover:bg-blue-700 transition-colors"
                   >
                     Show Ledger
                   </button>
                </div>
             </div>
          ) : (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {drilldownLevel !== 'year' && (
                  <button onClick={goBack} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                )}
              </div>
              <button onClick={exportToCSV} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                <FileSpreadsheet className="h-4 w-4" /> Export CSV
              </button>
            </div>
          )}
          
          {drilldownLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : drilldownData ? (
            <>
              {/* Year/Month discovery views (Existing logic) */}
              {drilldownMetric !== 'ledger' && (
                <>
                  {drilldownLevel === 'year' && (
                    <Table headers={['Year', 'Opening', 'New activity', 'Payments/Off', 'Closing Balance']}>
                       {(drilldownData.data || []).map((row: any) => (
                         <tr key={row.year} className="cursor-pointer hover:bg-slate-50" onClick={() => drillToMonth(row.year)}>
                           <td className="px-4 py-3 font-bold">{row.year}</td>
                           <td className="px-4 py-3 text-slate-500">₹ {row.opening?.toLocaleString()}</td>
                           <td className="px-4 py-3 text-blue-600 font-bold">₹ {row.total.toLocaleString()}</td>
                           <td className="px-4 py-3 text-green-600">₹ {row.paid.toLocaleString()}</td>
                           <td className={`px-4 py-3 font-black ${row.due > 0 ? 'text-red-600' : 'text-green-700'}`}>₹ {row.due.toLocaleString()}</td>
                         </tr>
                       ))}
                    </Table>
                  )}
                  {drilldownLevel === 'month' && (
                    <Table headers={['Month', 'Opening', 'New activity', 'Payments/Off', 'Closing Balance']}>
                      {(drilldownData.data || []).filter((r:any) => r.count > 0 || r.opening !== 0).map((row: any) => (
                         <tr key={row.month} className="cursor-pointer hover:bg-slate-50" onClick={() => drillToTransactions(row.month)}>
                           <td className="px-4 py-3 font-bold">{row.monthName}</td>
                           <td className="px-4 py-3 text-slate-500">₹ {row.opening?.toLocaleString()}</td>
                           <td className="px-4 py-3 text-blue-600 font-bold">₹ {row.total.toLocaleString()}</td>
                           <td className="px-4 py-3 text-green-600">₹ {row.paid.toLocaleString()}</td>
                           <td className={`px-4 py-3 font-black ${row.due > 0 ? 'text-red-600' : 'text-green-700'}`}>₹ {row.due.toLocaleString()}</td>
                         </tr>
                      ))}
                    </Table>
                  )}
                  {drilldownLevel === 'transactions' && (
                     <div className="space-y-4">
                        <Table headers={['Date', 'Ref No', 'Party', 'Amount', 'Due']}>
                          {(drilldownData.transactions || []).map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-xs">{t.date}</td>
                              <td className="px-4 py-2 font-medium">{t.invoiceNo}</td>
                              <td className="px-4 py-2 text-slate-600 truncate max-w-[120px]">{t.partyName}</td>
                              <td className="px-4 py-2 font-bold">₹ {t.amount.toLocaleString()}</td>
                              <td className="px-4 py-2 font-bold text-red-600">₹ {t.due.toLocaleString()}</td>
                            </tr>
                          ))}
                        </Table>
                     </div>
                  )}
                </>
              )}

              {/* Ledger View (Simple flat list with Hindi Labels) */}
              {drilldownMetric === 'ledger' && (
                <div className="space-y-4">
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 p-3 rounded border border-slate-100">
                         <div className="text-[10px] text-slate-400 font-bold uppercase">Opening</div>
                         <div className="text-sm font-black">₹ {drilldownData.summary?.openingBalance.toLocaleString()}</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded border border-blue-100">
                         <div className="text-[10px] text-blue-400 font-bold uppercase">Di hui rakam (Debit)</div>
                         <div className="text-sm font-black text-blue-700">₹ {drilldownData.summary?.totalDebit.toLocaleString()}</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded border border-green-100">
                         <div className="text-[10px] text-green-400 font-bold uppercase">Mili hui rakam (Credit)</div>
                         <div className="text-sm font-black text-green-700">₹ {drilldownData.summary?.totalCredit.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800 text-white">
                         <div className="text-[10px] text-slate-400 font-bold uppercase">Closing</div>
                         <div className="text-sm font-black whitespace-nowrap">₹ {drilldownData.summary?.closingBalance.toLocaleString()}</div>
                      </div>
                   </div>

                   <div className="overflow-x-auto">
                     <Table headers={['Date', 'Ref No', 'Di hui rakam (Debit)', 'Mili hui rakam (Credit)', 'Balance']}>
                        {(drilldownData.transactions || []).map((t: any) => (
                           <tr key={t.id} className="text-sm hover:bg-slate-50 transition-colors border-b border-slate-50">
                              <td className="px-4 py-2 whitespace-nowrap text-slate-400 text-xs">{t.date}</td>
                              <td className="px-4 py-2">
                                <div className="font-bold text-slate-800">{t.invoiceNo}</div>
                                <div className="text-[10px] text-slate-400 uppercase font-medium">{t.type}</div>
                              </td>
                              <td className="px-4 py-2 text-red-600 font-bold">{t.debit > 0 ? `₹ ${t.debit.toLocaleString()}` : '—'}</td>
                              <td className="px-4 py-2 text-green-600 font-bold">{t.credit > 0 ? `₹ ${t.credit.toLocaleString()}` : '—'}</td>
                              <td className="px-4 py-2 font-black text-slate-900">₹ {t.balance.toLocaleString()}</td>
                           </tr>
                        ))}
                        {(drilldownData.transactions || []).length === 0 && (
                          <tr><td colSpan={5} className="py-20 text-center text-slate-400">No transactions in this date range</td></tr>
                        )}
                     </Table>
                   </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-2">
               <Package className="h-8 w-8 opacity-20" />
               <p>Select dates and click Show Ledger</p>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
