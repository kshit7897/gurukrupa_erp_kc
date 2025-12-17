'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Input } from '../../../components/ui/Common';
import { Download } from 'lucide-react';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function OtherTxnsPage() {
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ kind: 'income', date: todayStr(), amount: '', category: '', note: '' });

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/other-txns?from=${fromDate}&to=${toDate}`);
      const data = await res.json();
      setRows(res.ok ? data : []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, [fromDate, toDate]);

  const handleSave = async () => {
    const amt = Number(form.amount);
    if (!amt) return alert('Enter amount');
    try {
      setSaving(true);
      if (editingId) {
        // Update existing
        await fetch('/api/other-txns', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...form, amount: amt }),
        });
        setEditingId(null);
      } else {
        // Create new
        await fetch('/api/other-txns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, amount: amt }),
        });
      }
      setForm({ ...form, amount: '' });
      await load();
    } catch (e) {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (txn: any) => {
    setEditingId(txn.id || txn._id);
    setForm({ kind: txn.kind, date: txn.date, amount: String(txn.amount), category: txn.category || '', note: txn.note || '' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ kind: 'income', date: todayStr(), amount: '', category: '', note: '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete entry?')) return;
    try {
      setLoading(true);
      await fetch(`/api/other-txns?id=${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      alert('Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams();
      params.set('type', 'other-txns');
      params.set('from', fromDate);
      params.set('to', toDate);
      const res = await fetch(`/api/reports/pdf?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Other Txns PDF export failed', text);
        alert('Failed to generate PDF');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Other_Income_Expense_${fromDate}_to_${toDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Other Income / Expense</h1>
        <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">From</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">To</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Button variant="outline" icon={Download} onClick={handleExportPDF} disabled={loading}>
            Export PDF
          </Button>
        </div>
      </div>

      <Card title="Add Entry">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            className="border rounded px-3 py-2"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <Input
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <Input placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="flex gap-2 mt-3">
          <Button className="mt-3" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
          </Button>
          {editingId && (
            <Button className="mt-3" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      <Card title="Entries">
        {loading ? (
          <div className="py-6 text-center text-slate-500">Loading...</div>
        ) : (
          <>
            {/* Mobile card view */}
            <div id="other-txns-content-mobile" className="md:hidden space-y-3">
              {(rows || []).map((t) => (
                <div key={t.id} className="bg-white p-4 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm text-slate-500">{t.date}</div>
                      <div className={`text-sm font-bold mt-1 ${t.kind === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.kind === 'income' ? '+' : '-'} ₹ {Number(t.amount || 0).toFixed(2)}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${t.kind === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.kind === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {t.category && <div className="text-xs text-slate-600"><span className="text-slate-500">Category:</span> {t.category}</div>}
                    {t.note && <div className="text-xs text-slate-600"><span className="text-slate-500">Note:</span> {t.note}</div>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(t)} className="flex-1 text-blue-600">
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="flex-1 text-red-600">
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div id="other-txns-content" className="hidden md:block">
              <Table headers={['Date', 'Type', 'Amount', 'Category', 'Note', 'Action']}>
                {(rows || []).map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 text-sm">{t.date}</td>
                    <td className="px-3 py-2 text-sm capitalize">{t.kind}</td>
                    <td className="px-3 py-2 text-sm font-bold">₹ {Number(t.amount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-sm">{t.category || '-'}</td>
                    <td className="px-3 py-2 text-sm">{t.note || '-'}</td>
                    <td className="px-3 py-2 text-right text-sm space-x-2">
                      <Button variant="ghost" onClick={() => handleEdit(t)} className="inline-block text-blue-600">
                        Edit
                      </Button>
                      <Button variant="ghost" onClick={() => handleDelete(t.id)} className="inline-block text-red-600">
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
