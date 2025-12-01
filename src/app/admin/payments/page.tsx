'use client';
import React, { useEffect, useState } from 'react';
import { Button, Modal, Input, Select, Table, Card, SoftLoader } from '../../../components/ui/Common';
import { Plus, Download } from 'lucide-react';
import { api } from '../../../lib/api';

export default function PaymentsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [parties, setParties] = useState<{ label: string; value: string }[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [form, setForm] = useState<any>({ partyId: '', invoiceId: '', amount: '', date: '', mode: 'cash', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ type: 'success'|'error'; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const p = await api.payments.list();
      setPayments(p || []);
      const pts = await api.parties.list();
      setParties((pts || []).map((x:any) => ({ label: x.name, value: x._id || x.id || x })));
      const inv = await api.invoices.list();
      setInvoices(inv || []);
    } catch (e) {
      console.error(e);
      setPayments([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onData = () => { load().catch(() => {}); };
    document.addEventListener('gurukrupa:data:updated', onData);
    return () => document.removeEventListener('gurukrupa:data:updated', onData);
  }, []);

  const openModal = () => {
    setForm({ partyId: '', invoiceId: '', amount: '', date: new Date().toISOString().slice(0,10), mode: 'cash', reference: '', notes: '' });
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!form.partyId || !form.amount) { setNotif({ type: 'error', message: 'Party and amount required' }); return; }
    setSaving(true);
    try {
      await api.payments.add({ partyId: form.partyId, invoiceId: form.invoiceId || undefined, amount: Number(form.amount), date: form.date, mode: form.mode, reference: form.reference, notes: form.notes });
      setIsOpen(false);
      setNotif({ type: 'success', message: 'Payment recorded' });
      // api.payments.add dispatches data update; local load will refresh via event, but refresh now for instant UX
      await load();
    } catch (e:any) {
      console.error(e);
      setNotif({ type: 'error', message: e?.message || 'Failed to save' });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payments</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={Download}>Export</Button>
          <Button onClick={openModal} icon={Plus}>Receive Payment</Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="p-6 text-center"><SoftLoader size="lg" text="Loading payments..." /></div>
        ) : payments.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No payments recorded yet.</div>
        ) : (
          <Table headers={[ 'Date', 'Party', 'Invoice', 'Amount', 'Mode', 'Ref' ]}>
            {payments.map(p => (
              <tr key={p.id || p._id} className="group hover:bg-slate-50">
                <td className="px-4 py-3">{(p.date || '').slice(0,10)}</td>
                <td className="px-4 py-3">{p.partyName || p.partyId}</td>
                <td className="px-4 py-3">{p.invoiceId || '-'}</td>
                <td className="px-4 py-3 text-right font-semibold">₹ {p.amount}</td>
                <td className="px-4 py-3">{p.mode}</td>
                <td className="px-4 py-3">{p.reference || '-'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Record Payment" footer={<><Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Payment'}</Button></>}>
        <div className="space-y-4">
          <div>
            <label className="text-sm block mb-1">Party</label>
            <Select value={form.partyId} onChange={(e:any)=> setForm({...form, partyId: e.target.value})} options={[{ label: 'Select party', value: '' }, ...parties]} />
          </div>
          <div>
            <label className="text-sm block mb-1">Invoice (optional)</label>
            <Select value={form.invoiceId} onChange={(e:any)=> setForm({...form, invoiceId: e.target.value})} options={[{ label: 'Select invoice (optional)', value: '' }, ...(invoices || []).filter((inv:any)=> inv.dueAmount && inv.dueAmount>0).map((inv:any)=>({ label: `${inv.invoiceNo} • ₹ ${inv.dueAmount}`, value: inv._id || inv.id }))]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm block mb-1">Amount</label>
              <Input type="number" value={form.amount} onChange={(e:any)=> setForm({...form, amount: e.target.value})} />
            </div>
            <div>
              <label className="text-sm block mb-1">Date</label>
              <Input type="date" value={form.date} onChange={(e:any)=> setForm({...form, date: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm block mb-1">Mode</label>
              <Select value={form.mode} onChange={(e:any)=> setForm({...form, mode: e.target.value})} options={[{label:'Cash',value:'cash'},{label:'Online',value:'online'},{label:'Cheque',value:'cheque'}]} />
            </div>
            <div>
              <label className="text-sm block mb-1">Reference</label>
              <Input value={form.reference} onChange={(e:any)=> setForm({...form, reference: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="text-sm block mb-1">Notes</label>
            <Input value={form.notes} onChange={(e:any)=> setForm({...form, notes: e.target.value})} />
          </div>
        </div>
      </Modal>

      {notif && (
        <div className={`fixed top-6 right-6 z-50 max-w-xs w-full p-3 rounded shadow-md ${notif.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notif.message}
        </div>
      )}
    </div>
  );
}

