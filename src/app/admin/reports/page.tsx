"use client";
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Table, Card, Select, Input, SoftLoader } from '../../../components/ui/Common';
import { Download, Search, Filter, Calendar, Truck, User } from 'lucide-react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/formatDate';

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
  const [accounts, setAccounts] = useState<{ label: string; value: string }[]>([]);
  const [cartingParties, setCartingParties] = useState<any[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(true);
  const [selectedParty, setSelectedParty] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const today = new Date().toISOString().slice(0,10);
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  
  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(today);
  const [daybookDate, setDaybookDate] = useState(today);
  const [stockRows, setStockRows] = useState<any[] | null>(null);
  const [outstandingRows, setOutstandingRows] = useState<any[] | null>(null);
  const [plData, setPlData] = useState<any | null>(null);
  const [cartingData, setCartingData] = useState<any[]>([]);
  
  const [plLoading, setPlLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [outstandingLoading, setOutstandingLoading] = useState(false);
  const [daybookLoading, setDaybookLoading] = useState(false);
  const [cartingLoading, setCartingLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [daybookData, setDaybookData] = useState<any[] | null>(null);

  const formatCurrency = (v: any) => {
    const n = Number(v || 0);
    return `₹ ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setPartiesLoading(true);
        const data = await api.parties.list(true);
        if (!mounted) return;
        
        // Categorize parties
        const pOpts = data
          .filter((p: any) => !p.isSystemAccount && !['Cash', 'Bank', 'UPI'].some(role => (p.roles || []).includes(role)))
          .map((p: any) => ({ label: p.name, value: p._id || p.id }));
        setParties(pOpts);

        const aOpts = data
          .filter((p: any) => p.isSystemAccount || ['Cash', 'Bank', 'UPI'].some(role => (p.roles || []).includes(role)))
          .map((p: any) => ({ label: p.name, value: p._id || p.id }));
        setAccounts(aOpts);
        
        const cp = (data || []).filter((p: any) => 
          (p.roles || []).includes('Carting') || p.type === 'Carting'
        );
        setCartingParties(cp);
      } catch (e) { console.error(e); }
      finally { if (mounted) setPartiesLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (activeTab === 'P&L') loadPL();
    else if (activeTab === 'Stock') loadStock();
    else if (activeTab === 'Outstanding') loadOutstanding();
    else if (activeTab === 'Daybook') loadDaybook();
    else if (activeTab === 'Carting') loadCarting();
  }, [activeTab]);

  async function loadPL() {
    try {
      setPlLoading(true);
      const res = await fetch(`/api/reports/profitloss?from=${fromDate}&to=${toDate}`);
      const data = await res.json();
      setPlData(res.ok ? data : null);
    } catch (e) { setPlData(null); }
    finally { setPlLoading(false); }
  }

  async function loadStock() {
    try {
      setStockLoading(true);
      const res = await fetch('/api/reports/stock');
      const data = await res.json();
      setStockRows(res.ok ? data : []);
    } catch (e) { setStockRows([]); }
    finally { setStockLoading(false); }
  }

  async function loadOutstanding() {
    try {
      setOutstandingLoading(true);
      const res = await fetch('/api/reports/outstanding');
      const data = await res.json();
      setOutstandingRows(res.ok ? data : []);
    } catch (e) { setOutstandingRows([]); }
    finally { setOutstandingLoading(false); }
  }

  async function loadDaybook() {
    try {
      setDaybookLoading(true);
      const res = await fetch(`/api/reports/daybook?date=${daybookDate}`);
      const data = await res.json();
      setDaybookData(res.ok ? data : []);
    } catch (e) { setDaybookData([]); }
    finally { setDaybookLoading(false); }
  }

  async function loadCarting() {
    try {
      setCartingLoading(true);
      const qs = new URLSearchParams();
      if (fromDate) qs.set('from', fromDate);
      if (toDate) qs.set('to', toDate);
      if (selectedParty) qs.set('partyId', selectedParty);
      if (vehicleNo) qs.set('vehicleNo', vehicleNo);

      const res = await fetch(`/api/reports/carting?${qs.toString()}`);
      const data = await res.json();
      setCartingData(res.ok ? data : []);
    } catch (e) { setCartingData([]); }
    finally { setCartingLoading(false); }
  }

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      let type: string | null = null;
      if (activeTab === 'Stock') type = 'stock';
      else if (activeTab === 'Outstanding') type = 'outstanding';
      else if (activeTab === 'P&L') type = 'pl';
      else if (activeTab === 'Carting') type = 'carting';
      
      if (!type) {
        if (activeTab === 'Ledger') alert('Open Ledger Preview to export.');
        setIsExporting(false);
        return;
      }

      let url = `/api/reports/pdf?type=${type}`;
      if (['pl', 'Carting'].includes(activeTab)) {
        url += `&from=${fromDate}&to=${toDate}`;
        if (activeTab === 'Carting') {
          if (selectedParty) url += `&partyId=${selectedParty}`;
          if (vehicleNo) url += `&vehicleNo=${vehicleNo}`;
        }
      }

      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Business Reports</h1>
        <div className="flex gap-2">
          {activeTab !== 'Stock' && activeTab !== 'Ledger' && (
            <Button variant="outline" icon={Download} onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          )}
        </div>
      </div>

      <Tabs 
        active={activeTab} 
        setActive={setActiveTab} 
        tabs={[ 'Stock', 'Outstanding', 'Party Ledger', 'Cash/Bank', 'P&L', 'Daybook', 'Carting' ]} 
      />

      {/* Stock Tab */}
      {activeTab === 'Stock' && (
        <Card title="Stock Summary">
          <Table headers={[ 'Item Name', 'Purchase Rate', 'Stock', 'Total Value' ]}>
            {stockLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading stock...</td></tr>
            ) : (stockRows || []).map((s, idx) => (
              <tr key={s.id || idx}>
                <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                <td className="px-4 py-3 text-slate-600">{formatCurrency(s.purchaseRate)}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold text-blue-600 uppercase">{s.unitLabel}</span></td>
                <td className="px-4 py-3 font-bold text-slate-900 text-right">{formatCurrency(s.totalValue)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* Outstanding Tab */}
      {activeTab === 'Outstanding' && (
        <Card title="Outstanding Payments">
          <Table headers={[ 'Party', 'Mobile', 'Status', 'Amount' ]}>
            {outstandingLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : (outstandingRows || []).map((p, idx) => (
              <tr key={p._id || p.id || idx}>
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-500">{p.mobile || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${(p.type || '').toString().toLowerCase() === 'customer' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {(p.type || '').toString().toLowerCase() === 'customer' ? 'To Receive' : 'To Pay'}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-right text-slate-900">{formatCurrency(Math.abs(p.currentBalance || 0))}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* Party Ledger Tab */}
      {activeTab === 'Party Ledger' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-4 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Party Statement</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Select Customer/Supplier</label>
                <Select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} options={[{ label: 'Select Party...', value: '' }, ...parties]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">From</label>
                  <Input value={fromDate} onChange={(e) => setFromDate(e.target.value)} type="date" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">To</label>
                  <Input value={toDate} onChange={(e) => setToDate(e.target.value)} type="date" />
                </div>
              </div>
              <Button className="w-full" disabled={partiesLoading || !selectedParty} onClick={() => {
                router.push(`/admin/reports/ledger/preview?party=${selectedParty}&from=${fromDate || ''}&to=${toDate || ''}`);
              }}>Generate Ledger</Button>
            </div>
          </Card>
          <div className="md:col-span-2">
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center h-full">
               <div className="bg-slate-100 h-16 w-16 rounded-2xl flex items-center justify-center mb-4"><User className="h-8 w-8 text-slate-400" /></div>
               <h3 className="font-bold text-slate-800 mb-2">Customer & Supplier Ledger</h3>
               <p className="text-sm text-slate-500 max-w-xs">View detailed transaction history, sales, and payments for any commercial party.</p>
            </div>
          </div>
        </div>
      )}

      {/* Cash/Bank Tab */}
      {activeTab === 'Cash/Bank' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-4 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Account Statement</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Select Cash/Bank Account</label>
                <Select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} options={[{ label: 'Select Account...', value: '' }, ...accounts]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">From</label>
                  <Input value={fromDate} onChange={(e) => setFromDate(e.target.value)} type="date" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">To</label>
                  <Input value={toDate} onChange={(e) => setToDate(e.target.value)} type="date" />
                </div>
              </div>
              <Button className="w-full" disabled={partiesLoading || !selectedAccount} onClick={() => {
                router.push(`/admin/reports/ledger/preview?party=${selectedAccount}&from=${fromDate || ''}&to=${toDate || ''}`);
              }}>View Statement</Button>
            </div>
          </Card>
          <div className="md:col-span-2">
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center h-full">
               <div className="bg-slate-100 h-16 w-16 rounded-2xl flex items-center justify-center mb-4"><Search className="h-8 w-8 text-slate-400" /></div>
               <h3 className="font-bold text-slate-800 mb-2">Cash & Bank Books</h3>
               <p className="text-sm text-slate-500 max-w-xs">Monitor your liquidity. Track every rupee moving in and out of your internal company accounts.</p>
            </div>
          </div>
        </div>
      )}

      {/* Profit & Loss Tab */}
      {activeTab === 'P&L' && (
        <Card title="P&L Statement">
           <div className="flex flex-wrap gap-4 mb-6 items-end">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">From</label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">To</label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={loadPL}>Calculate</Button>
           </div>
           
           {plLoading ? <div className="py-20 text-center"><SoftLoader /></div> : plData && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                <div className="space-y-4">
                   <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <div className="text-xs font-bold text-green-600 uppercase mb-2">Revenue</div>
                      <div className="flex justify-between items-center py-2 border-b border-green-100/50"><span>Sales</span><span className="font-bold">{formatCurrency(plData.sales)}</span></div>
                      <div className="flex justify-between items-center py-2"><span>Other Income</span><span className="font-bold">{formatCurrency(plData.otherIncome)}</span></div>
                      <div className="flex justify-between items-center pt-3 border-t-2 border-green-200 mt-2"><span className="font-bold">Total In</span><span className="text-xl font-black text-green-700">{formatCurrency(plData.sales + plData.otherIncome)}</span></div>
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <div className="text-xs font-bold text-red-600 uppercase mb-2">Expenses</div>
                      <div className="flex justify-between items-center py-2 border-b border-red-100/50"><span>Purchases</span><span className="font-bold">{formatCurrency(plData.purchase)}</span></div>
                      <div className="flex justify-between items-center py-2"><span>Other Expense</span><span className="font-bold">{formatCurrency(plData.otherExpense)}</span></div>
                      <div className="flex justify-between items-center pt-3 border-t-2 border-red-200 mt-2"><span className="font-bold">Total Out</span><span className="text-xl font-black text-red-700">{formatCurrency(plData.purchase + plData.otherExpense)}</span></div>
                   </div>
                </div>
                <div className="md:col-span-2">
                   <div className={`p-6 rounded-2xl text-white text-center shadow-lg ${plData.netProfit >= 0 ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-rose-600 to-red-700'}`}>
                      <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">Net Business Profit/Loss</p>
                      <h2 className="text-5xl font-black">{formatCurrency(plData.netProfit)}</h2>
                   </div>
                </div>
             </div>
           )}
        </Card>
      )}

      {/* Daybook Tab */}
      {activeTab === 'Daybook' && (
        <Card title="Daily Day Book">
          <div className="flex gap-4 mb-6 items-end">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Select Date</label>
              <Input type="date" value={daybookDate} onChange={(e) => setDaybookDate(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={loadDaybook}>Refresh</Button>
          </div>
          <Table headers={['Voucher', 'Party', 'Type', 'In (Credit)', 'Out (Debit)']}>
            {daybookLoading ? (
              <tr><td colSpan={5} className="py-8 text-center"><SoftLoader /></td></tr>
            ) : (daybookData || []).length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400">No transactions recorded on this date.</td></tr>
            ) : daybookData?.map((p: any, idx: number) => (
              <tr key={idx}>
                <td className="px-4 py-3 text-sm font-mono text-slate-500 uppercase">{p.voucherNo || '-'}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{p.partyName || 'Unknown'}</td>
                <td className="px-4 py-3 capitalize text-xs text-slate-500">{p.entryType}</td>
                <td className="px-4 py-3 text-green-600 font-bold text-right">{p.credit > 0 ? formatCurrency(p.credit) : '-'}</td>
                <td className="px-4 py-3 text-red-600 font-bold text-right">{p.debit > 0 ? formatCurrency(p.debit) : '-'}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* Carting Tab */}
      {activeTab === 'Carting' && (
        <div className="space-y-4">
           <Card className="p-4 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                 <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">From</label>
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">To</label>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Vehicle No.</label>
                    <Input placeholder="Search Vehicle..." value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Carting Party</label>
                    <Select 
                      value={selectedParty} 
                      onChange={(e) => setSelectedParty(e.target.value)}
                      options={[
                        { label: 'All Parties', value: '' },
                        ...cartingParties.map(p => ({ label: p.name, value: p.id || p._id }))
                      ]}
                    />
                 </div>
                 <Button icon={Search} onClick={loadCarting}>Search</Button>
              </div>
           </Card>

           <Card title="Carting Details">
              <div className="overflow-x-auto">
                <Table headers={['Date', 'Vehicle No', 'Invoice', 'Customer', 'Carting Party', 'Amount']}>
                  {cartingLoading ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400"><SoftLoader /></td></tr>
                  ) : cartingData.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400">No carting records found.</td></tr>
                  ) : (
                    <>
                      {cartingData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">{formatDate(row.date)}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black border border-slate-200 uppercase">{row.vehicleNo}</span></td>
                          <td className="px-4 py-3 text-sm font-mono text-slate-400">{row.invoiceNo}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{row.customerName}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{row.cartingPartyName}</td>
                          <td className="px-4 py-3 font-black text-slate-900 text-right">{formatCurrency(row.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-black">
                        <td colSpan={5} className="px-4 py-4 text-right uppercase text-xs tracking-widest text-slate-500">Total Carting Amount</td>
                        <td className="px-4 py-4 text-right text-lg text-blue-700">{formatCurrency(cartingData.reduce((s,r) => s + r.amount, 0))}</td>
                      </tr>
                    </>
                  )}
                </Table>
              </div>
           </Card>
        </div>
      )}

    </div>
  );
}
