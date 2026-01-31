'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Download, Trash2, Edit2, 
  TrendingUp, TrendingDown, Repeat, ArrowRightLeft, 
  Wallet, Landmark, IndianRupee, Filter, 
  Calculator, Calendar, FileText, ChevronRight
} from 'lucide-react';
import { Button, Input, Select, Card, Modal, Table } from '../../../components/ui/Common';
import { notify } from '../../../lib/notify';
import { api } from '../../../lib/api';

interface OtherTxn {
  _id: string;
  id: string;
  date: string;
  amount: number;
  note: string;
  category: string;
  txnType: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'CAPITAL' | 'DRAWINGS' | 'CONTRA';
  fromId?: string;
  fromName?: string;
  toId?: string;
  toName?: string;
  referenceNo?: string;
}

const TXN_TYPES = [
  { value: 'INCOME', label: 'Income (Aamdani)', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'EXPENSE', label: 'Expense (Kharcha)', icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
  { value: 'CONTRA', label: 'Contra (Transfer)', icon: ArrowRightLeft, color: 'text-blue-600', bg: 'bg-blue-50' },
];

interface FormState {
  date: string;
  amount: number;
  note: string;
  category: string;
  txnType: OtherTxn['txnType'];
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  referenceNo: string;
}

const INITIAL_FORM: FormState = {
  date: new Date().toISOString().split('T')[0],
  amount: 0,
  note: '',
  category: '',
  txnType: 'INCOME',
  fromId: '',
  fromName: '',
  toId: '',
  toName: '',
  referenceNo: ''
};

export default function OtherTxnsPage() {
  const [items, setItems] = useState<OtherTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parties, setParties] = useState<any[]>([]);
  
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);

  useEffect(() => {
    loadData();
    loadParties();
  }, [fromDate, toDate]);

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/other-txns?from=${fromDate}&to=${toDate}`);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (e) {
      notify('error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  async function loadParties() {
    try {
      const data = await api.parties.list(true);
      setParties(data);
    } catch (e) {}
  }

  const handleTypeChange = (type: string) => {
    const sysAccounts = parties.filter(p => ['Cash', 'Bank', 'UPI'].some(role => p.roles?.includes(role)));
    const defaultAccount = sysAccounts[0] || { _id: '', name: '' };

    let newForm = { ...form, txnType: type as any };
    
    if (type === 'INCOME') {
      newForm.toId = defaultAccount._id || defaultAccount.id;
      newForm.toName = defaultAccount.name;
      newForm.fromId = '';
      newForm.fromName = '';
    } else if (type === 'EXPENSE') {
      newForm.fromId = defaultAccount._id || defaultAccount.id;
      newForm.fromName = defaultAccount.name;
      newForm.toId = '';
      newForm.toName = '';
    } else if (type === 'CONTRA') {
      newForm.fromId = '';
      newForm.fromName = '';
      newForm.toId = defaultAccount._id || defaultAccount.id;
      newForm.toName = defaultAccount.name;
    }
    
    setForm(newForm);
  };

  const syncPartyName = (field: 'from' | 'to', id: string) => {
    const p = parties.find(x => (x._id || x.id) === id);
    if (p) {
      setForm(prev => ({ 
        ...prev, 
        [`${field}Id`]: id, 
        [`${field}Name`]: p.name 
      }));
    } else {
      setForm(prev => ({ 
        ...prev, 
        [`${field}Id`]: id, 
        [`${field}Name`]: '' 
      }));
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) return notify('error', 'Please enter a valid amount');
    
    try {
      setLoading(true);
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...form, id: editingId } : form;
      
      const res = await fetch('/api/other-txns', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        notify('success', `Transaction ${editingId ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setForm(INITIAL_FORM);
        setEditingId(null);
        loadData();
      } else {
        const error = await res.json();
        notify('error', error.error || 'Failed to save transaction');
      }
    } catch (e) {
      notify('error', 'An error occurred while saving');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this transaction? This will also remove associated ledger entries.')) return;
    try {
      const res = await fetch(`/api/other-txns?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        notify('success', 'Transaction deleted');
        loadData();
      }
    } catch (e) {
      notify('error', 'Failed to delete');
    }
  }

  const handleExport = () => {
    window.open(`/api/reports/pdf?type=other-txns&from=${fromDate}&to=${toDate}`, '_blank');
  };

  const getPartyOptions = (filter?: string) => {
    let opts = [{ label: 'Select Account...', value: '' }];
    
    // Filter functions for better readability
    const isPartner = (p: any) => (p.roles || []).includes('Partner') || p.type === 'Partner';
    const isSystem = (p: any) => p.isSystemAccount || ['Cash', 'Bank', 'UPI'].some(role => (p.roles || []).includes(role) || p.type === role);
    
    const partnerOpts = parties.filter(isPartner).map(p => ({ label: `Partner: ${p.name}`, value: p._id || p.id }));
    const sysOpts = parties.filter(isSystem).map(p => {
      const type = (p.roles || []).find((r:any) => ['Cash', 'Bank', 'UPI'].includes(r)) || p.type || 'Account';
      return { label: `${type}: ${p.name}`, value: p._id || p.id };
    });
    const otherOpts = parties.filter(p => !isPartner(p) && !isSystem(p)).map(p => ({ label: p.name, value: p._id || p.id }));

    return [...opts, ...sysOpts, ...partnerOpts, ...otherOpts];
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-600" />
            Financial Transactions
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage capital, transfers, and income/expenses across company accounts</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 shadow-inner">
            <Calendar className="h-4 w-4 text-slate-400 mr-2" />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="text-sm bg-transparent border-0 focus:ring-0 p-0 w-28 text-slate-600" />
            <span className="mx-2 text-slate-300">to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="text-sm bg-transparent border-0 focus:ring-0 p-0 w-28 text-slate-600" />
          </div>
          <Button variant="outline" icon={Download} onClick={handleExport} disabled={loading}>Report</Button>
          <Button icon={Plus} onClick={() => { setForm({ ...INITIAL_FORM, date: today }); setEditingId(null); setShowForm(true); }}>Add New</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Total Income</p>
          <p className="text-2xl font-black text-slate-800 mt-1">₹ {items.filter(i => i.txnType === 'INCOME').reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100">
          <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">Total Expenses</p>
          <p className="text-2xl font-black text-slate-800 mt-1">₹ {items.filter(i => i.txnType === 'EXPENSE').reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Other Transfers</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{items.filter(i => !['INCOME', 'EXPENSE'].includes(i.txnType)).length} Transactions</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden rounded-2xl border-slate-200/60 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Party / Account</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ref / Note</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && items.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Loading transactions...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">No transactions found in this period</td></tr>
              ) : items.map((item) => {
                const typeData = TXN_TYPES.find(t => t.value === item.txnType) || TXN_TYPES[0];
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{item.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${typeData.bg} ${typeData.color} border border-current/10`}>
                        <typeData.icon className="h-3.5 w-3.5 mr-1.5" />
                        {typeData.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="font-semibold text-slate-500">{item.fromName || 'External'}</span>
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        <span className="font-semibold text-blue-700">{item.toName || 'General'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-slate-800">₹ {item.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-xs text-slate-500 truncate">{item.referenceNo && <span className="font-bold text-slate-700 mr-2 text-[10px] uppercase bg-slate-100 px-1 rounded">{item.referenceNo}</span>} {item.note || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { 
                          setForm({ 
                            date: item.date || today,
                            amount: item.amount || 0,
                            note: item.note || '',
                            category: item.category || '',
                            txnType: item.txnType,
                            fromId: item.fromId || '',
                            fromName: item.fromName || '',
                            toId: item.toId || '',
                            toName: item.toName || '',
                            referenceNo: item.referenceNo || ''
                          }); 
                          setEditingId(item.id); 
                          setShowForm(true); 
                        }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Transaction' : 'New Transaction'}>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 row-gap-6 gap-6">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Transaction Type</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {TXN_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => handleTypeChange(t.value)} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${form.txnType === t.value ? `${t.bg} border-current ${t.color}` : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                    <t.icon className="h-5 w-5 mb-2" />
                    <span className="text-[10px] font-bold text-center leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Date</label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Amount (₹)</label>
              <Input type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} required className="font-bold text-lg" />
            </div>

            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">{form.txnType === 'INCOME' ? 'Source / Category' : 'From / Money Source'}</label>
              <Select value={form.fromId} onChange={(e) => syncPartyName('from', e.target.value)} options={getPartyOptions()} />
            </div>

            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">{form.txnType === 'EXPENSE' ? 'Target / Category' : 'To / Recipient'}</label>
              <Select value={form.toId} onChange={(e) => syncPartyName('to', e.target.value)} options={getPartyOptions()} />
            </div>

            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Reference No.</label>
              <Input placeholder="Check / TXN ID / Ref" value={form.referenceNo} onChange={(e) => setForm({ ...form, referenceNo: e.target.value })} />
            </div>

            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Category</label>
              <Input placeholder="Salary, Rent, Capital, etc." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Narration / Note</label>
              <textarea placeholder="Write details about this transaction..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm h-20 p-3" />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setShowForm(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (editingId ? 'Update Transaction' : 'Save Transaction')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
