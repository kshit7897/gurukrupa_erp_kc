'use client';
import React, { useEffect, useState } from 'react';
import { Button, Input, Select, SoftLoader } from '../ui/Common';
import { api } from '../../lib/api';

interface PaymentFormProps {
  type: 'receive' | 'pay';
  onSuccess: (payment: any) => void;
  onCancel: () => void;
}

export default function PaymentForm({ type, onSuccess, onCancel }: PaymentFormProps) {
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState<any[]>([]);
  const [partyLoading, setPartyLoading] = useState(false);
  const [selectedParty, setSelectedParty] = useState('');
  const [totalOutstanding, setTotalOutstanding] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [accountId, setAccountId] = useState<string>('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const pts = await api.parties.list(true);
      setParties(pts || []);

      // Default account selection logic
      const systemRoles = ['Cash', 'Bank', 'UPI'];
      const companyAccounts = (pts || []).filter((p: any) => {
        const roles: string[] = (p.roles || [p.type]).map((r: any) => r && r.toString());
        return roles.some(r => systemRoles.includes(r));
      });
      if (companyAccounts.length > 0) {
        setAccountId((companyAccounts[0]._id || companyAccounts[0].id || '').toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch fresh party details when a party is selected to get up-to-date balances
  useEffect(() => {
    if (!selectedParty) {
      setTotalOutstanding(0);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        setPartyLoading(true);
        const fresh = await api.parties.get(selectedParty);
        if (!mounted || !fresh) return;
        
        // update parties cache with fresh data locally
        setParties((prev) => (prev || []).map((p: any) => ((p._id || p.id || '').toString() === selectedParty.toString() ? fresh : p)));
        
        const cb = fresh.currentBalance;
        if (typeof cb === 'number') setTotalOutstanding(Number(cb || 0));
        else if (typeof cb === 'string' && !isNaN(Number(cb))) setTotalOutstanding(Number(cb));
        else {
          // fallback: fetch outstanding report
          try {
            const out = await api.reports.getOutstanding();
            const found = (out || []).find((pp: any) => (pp._id || pp.id || '').toString() === selectedParty.toString());
            if (found && typeof found.currentBalance === 'number') setTotalOutstanding(Number(found.currentBalance || 0));
          } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }
      finally { setPartyLoading(false); }
    })();
    return () => { mounted = false; };
  }, [selectedParty]);

  const handleSave = async () => {
    if (!selectedParty) return alert(`Select ${type === 'receive' ? 'customer' : 'supplier'}`);
    if (!accountId) return alert('Select account');
    const amt = Number(amount || 0);
    if (amt <= 0) return alert('Invalid amount');

    setSaving(true);
    try {
      const outstandingBefore = totalOutstanding;
      const outstandingAfter = Math.max(0, outstandingBefore - amt);
      
      const acc = (parties || []).find((p: any) => (p._id || p.id || '').toString() === accountId.toString()) || null;
      const accName = acc?.name || '';
      const accRoles: string[] = (acc?.roles || [acc?.type]).map((r: any) => r && r.toString());
      const systemRoles = ['Cash', 'Bank', 'UPI'];
      const accType = accRoles.some(r => systemRoles.includes(r)) ? 'COMPANY_ACCOUNT' : 'PARTNER';

      const payload: any = {
        partyId: selectedParty,
        partyName: (parties || []).find(p => (p._id || p.id) === selectedParty)?.name || '',
        type,
        amount: amt,
        date,
        mode,
        reference,
        notes,
        allocations: [],
        outstandingBefore,
        outstandingAfter,
      };

      if (type === 'receive') {
        payload.receivedById = accountId;
        payload.receivedByName = accName;
        payload.receivedByType = accType;
      } else {
        payload.paidFromId = accountId;
        payload.paidFromName = accName;
        payload.paidByType = accType;
      }

      const res = await api.payments.add(payload);
      onSuccess(res);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Failed to save');
    } finally {
      setSaving(true); // stay disabled until modal closes
    }
  };

  if (loading) return <div className="py-12"><SoftLoader text="Loading form..." /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 block">
            {type === 'receive' ? 'Customer' : 'Supplier'}
          </label>
          <Select 
            value={selectedParty} 
            onChange={(e: any) => setSelectedParty(e.target.value)} 
            options={[
              { label: `Select ${type === 'receive' ? 'customer' : 'supplier'}`, value: '' }, 
              ...(parties || [])
                .filter((p: any) => {
                  const t = (p.type || '').toString().toLowerCase();
                  return type === 'receive' ? t === 'customer' : t === 'supplier';
                })
                .map((p: any) => ({ label: p.name, value: p._id || p.id }))
            ]} 
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 block">Date</label>
          <Input type="date" value={date} onChange={(e: any) => setDate(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 block">Amount</label>
          <Input type="number" value={amount} onChange={(e: any) => setAmount(e.target.value)} placeholder="0.00" />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 block">Mode</label>
          <Select value={mode} onChange={(e: any) => setMode(e.target.value)} options={[
            { label: 'Cash', value: 'cash' },
            { label: 'Online / UPI', value: 'online' },
            { label: 'Cheque', value: 'cheque' },
            { label: 'Bank Transfer', value: 'bank' }
          ]} />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 block">Reference No.</label>
          <Input value={reference} onChange={(e: any) => setReference(e.target.value)} placeholder="Txn ID / Chq No" />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 block">
            {type === 'receive' ? 'Received Into' : 'Paid From'}
          </label>
          <Select
            value={accountId}
            onChange={(e: any) => setAccountId(e.target.value)}
            options={[
              { label: 'Select account', value: '' },
              ...(parties || [])
                .filter((p: any) => {
                  const roles: string[] = (p.roles || [p.type]).map((r: any) => r && r.toString());
                  return p.isSystemAccount || roles.some(r => ['Cash', 'Bank', 'UPI', 'Partner'].includes(r));
                })
                .map((p: any) => ({
                  label: `${p.name} (${(p.roles || [p.type]).join('/')})`,
                  value: (p._id || p.id) as string
                })),
            ]}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 block">Notes</label>
          <Input value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder="Additional remarks..." />
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Outstanding:</span>
            <span className={`font-black ${totalOutstanding > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              ₹ {Number(totalOutstanding).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Remaining:</span>
            <span className="font-bold text-slate-700">
              ₹ {Math.max(0, totalOutstanding - Number(amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="ghost" onClick={onCancel} className="flex-1 sm:flex-none text-xs md:text-sm px-3 md:px-6">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || partyLoading} className="flex-[2] sm:flex-none py-2 md:py-3 px-4 md:px-8 text-xs md:text-sm">
            {saving ? <><SoftLoader size="sm" /> Saving...</> : `Confirm ${type === 'receive' ? 'Receipt' : 'Payment'}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
