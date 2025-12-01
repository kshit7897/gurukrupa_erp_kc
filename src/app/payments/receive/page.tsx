'use client';
import React, { useEffect, useState } from 'react';
import { Button, Input, Select, Table, Card, SoftLoader } from '../../../components/ui/Common';
import { api } from '../../../lib/api';
import { useRouter } from 'next/navigation';

export default function ReceivePaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [totalOutstanding, setTotalOutstanding] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [mode, setMode] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const pts = await api.parties.list();
      setParties(pts || []);
      const inv = await api.invoices.list();
      // only keep invoices with outstanding due > 0
      const unpaid = (inv || []).filter((i:any) => {
        const due = Number(i.dueAmount != null ? i.dueAmount : Math.max(0, (i.grandTotal || 0) - (i.paidAmount || 0)));
        return due > 0;
      });
      setInvoices(unpaid || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  // compute total outstanding for selected party (sum of due on unpaid invoices)
  React.useEffect(() => {
    if (!selectedParty) { setTotalOutstanding(0); return; }
    const total = (invoices || []).filter((i:any) => (i.partyId || '').toString() === selectedParty).reduce((s:number, inv:any) => {
      const due = Number(inv.dueAmount != null ? inv.dueAmount : Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0)));
      return s + (due || 0);
    }, 0);
    setTotalOutstanding(total);
  }, [selectedParty, invoices]);

  const handleSave = async () => {
    if (!selectedParty) return alert('Select party');
    const amt = Number(amount || 0);
    if (amt <= 0) return alert('Invalid amount');
    setSaving(true);
    try {
      const outstandingBefore = totalOutstanding;
      const outstandingAfter = Math.max(0, outstandingBefore - amt);
      const payload: any = {
        partyId: selectedParty,
        type: 'receive',
        amount: amt,
        date,
        mode,
        reference,
        notes,
        allocations: [], // direct/advance payment — no invoice allocations
        outstandingBefore,
        outstandingAfter
      };
      const res = await api.payments.add(payload);
      // open receipt preview for the created payment
      const pid = res?._id || res?.id || res?.paymentId;
      if (pid) {
        router.push(`/payments/receipt/${pid}`);
      } else {
        router.push('/admin/payments');
      }
    } catch (e:any) {
      console.error(e);
      alert(e?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-6"><SoftLoader text="Loading..." /></div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Receive Payment (Customer)</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { /* export can be added later */ }}>Export</Button>
          <Button onClick={() => router.push('/admin/payments')}>Back</Button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1">Party</label>
            <Select value={selectedParty} onChange={(e:any)=> setSelectedParty(e.target.value)} options={[{ label: 'Select party', value: '' }, ...(parties || []).filter((p:any)=> (p.type||'').toString().toLowerCase()==='customer').map((p:any)=>({ label: p.name, value: p._id || p.id }))]} />
          </div>
          <div>
            <label className="text-sm block mb-1">Date</label>
            <Input type="date" value={date} onChange={(e:any)=> setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1">Amount Received</label>
            <Input type="number" value={amount} onChange={(e:any)=> setAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1">Mode</label>
            <Select value={mode} onChange={(e:any)=> setMode(e.target.value)} options={[{label:'Cash',value:'cash'},{label:'Online',value:'online'},{label:'Cheque',value:'cheque'},{label:'UPI',value:'upi'},{label:'Bank Transfer',value:'bank'}]} />
          </div>
          <div>
            <label className="text-sm block mb-1">Reference</label>
            <Input value={reference} onChange={(e:any)=> setReference(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1">Notes</label>
            <Input value={notes} onChange={(e:any)=> setNotes(e.target.value)} />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-3 text-sm text-slate-700">
            <div><span className="font-medium">Total Outstanding:</span> ₹ {totalOutstanding.toFixed(2)}</div>
            <div><span className="font-medium">Remaining After Payment:</span> ₹ {(Math.max(0, totalOutstanding - Number(amount || 0))).toFixed(2)}</div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => router.push('/admin/payments')}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Payment'}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
