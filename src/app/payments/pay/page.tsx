'use client';
import React, { useEffect, useState } from 'react';
import { Button, Input, Select, Table, Card, SoftLoader, Modal } from '../../../components/ui/Common';
import { api } from '../../../lib/api';
import { useRouter } from 'next/navigation';

export default function MakePaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState<any[]>([]);
  const [selectedPartyObj, setSelectedPartyObj] = useState<any | null>(null);
  const [partyLoading, setPartyLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [amount, setAmount] = useState('');
  const [totalOutstanding, setTotalOutstanding] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [mode, setMode] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search || '');
        const party = sp.get('party');
        const amount = sp.get('amount');
        if (party) {
          setSelectedParty(party);
          fetchAndSetParty(party);
        }
        if (amount) setAmount(amount);
      }
    } catch (e) {}
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const pts = await api.parties.list();
      setParties(pts || []);
      const inv = await api.invoices.list();
      setInvoices(inv || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  // allocations removed — direct payments without invoice allocation

  React.useEffect(() => {
    if (!selectedParty) { setTotalOutstanding(0); return; }
    // prefer party-level currentBalance (includes advances/unallocated). fallback to invoice due sum
    const partyObj = (parties || []).find((p:any) => (p._id || p.id || '').toString() === selectedParty.toString());
    if (partyObj && typeof partyObj.currentBalance === 'number') {
      setTotalOutstanding(Number(partyObj.currentBalance || 0));
      return;
    }
    const total = (invoices || []).filter((i:any) => (i.partyId || '').toString() === selectedParty.toString()).reduce((s:number, inv:any) => {
      const due = Number(inv.dueAmount != null ? inv.dueAmount : Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0)));
      return s + (due || 0);
    }, 0);
    setTotalOutstanding(total);
  }, [selectedParty, invoices, parties]);

  // Auto-fetch fresh party details when a party is selected to get up-to-date balances
  React.useEffect(() => {
    if (!selectedParty) return;
    let mounted = true;
    (async () => {
      try {
        setPartyLoading(true);
        const fresh = await api.parties.get(selectedParty);
        if (!mounted || !fresh) return;
        setSelectedPartyObj(fresh as any);
        // update parties cache with fresh data
        setParties((prev) => {
          const exists = (prev || []).some((p:any) => (p._id || p.id || '').toString() === selectedParty.toString());
          if (exists) return (prev || []).map((p:any) => ((p._id || p.id || '').toString() === selectedParty.toString() ? fresh : p));
          return [(fresh as any), ...(prev || [])];
        });
        if (typeof fresh.currentBalance === 'number') {
          setTotalOutstanding(Number(fresh.currentBalance || 0));
        } else {
          // fallback: fetch outstanding report and pick the party balance (matches dashboard source)
          try {
            const out = await api.reports.getOutstanding();
            const found = (out || []).find((pp:any) => (pp._id || pp.id || '').toString() === selectedParty.toString());
            if (found && typeof found.currentBalance === 'number') {
              setTotalOutstanding(Number(found.currentBalance || 0));
            }
          } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }
      finally { setPartyLoading(false); }
    })();
    return () => { mounted = false; };
  }, [selectedParty]);

  // Helper to fetch authoritative party balance and set state immediately
  const fetchAndSetParty = async (partyId: string) => {
    if (!partyId) return;
    try {
      setPartyLoading(true);
      const fresh = await api.parties.get(partyId);
      if (fresh) {
        setSelectedPartyObj(fresh as any);
        setParties((prev) => {
          const exists = (prev || []).some((p:any) => (p._id || p.id || '').toString() === partyId.toString());
          if (exists) return (prev || []).map((p:any) => ((p._id || p.id || '').toString() === partyId.toString() ? fresh : p));
          return [(fresh as any), ...(prev || [])];
        });
        const cb = fresh.currentBalance;
        if (typeof cb === 'number') setTotalOutstanding(Number(cb || 0));
        else if (typeof cb === 'string' && !isNaN(Number(cb))) setTotalOutstanding(Number(cb));
        else {
          try {
            const out = await api.reports.getOutstanding();
            const found = (out || []).find((pp:any) => (pp._id || pp.id || '').toString() === partyId.toString());
            if (found && typeof found.currentBalance === 'number') setTotalOutstanding(Number(found.currentBalance || 0));
          } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }
    finally { setPartyLoading(false); }
  };

  const handleSave = async () => {
    if (!selectedParty) return alert('Select supplier');
    const amt = Number(amount || 0);
    if (amt <= 0) return alert('Invalid amount');
    // allow direct payment without allocating to invoices
    setSaving(true);
    try {
      // re-fetch fresh party details to ensure outstanding numbers are accurate
      let outstandingBefore = totalOutstanding;
      try {
        const fresh = await api.parties.get(selectedParty);
        if (fresh && typeof fresh.currentBalance === 'number') {
          outstandingBefore = Number(fresh.currentBalance || 0);
        }
      } catch (e) { /* ignore */ }
      const outstandingAfter = Math.max(0, outstandingBefore - amt);
      const payload: any = {
        partyId: selectedParty,
        type: 'pay',
        amount: amt,
        date,
        mode,
        reference,
        notes,
        allocations: [], // no allocations — direct/advance payment
        outstandingBefore,
        outstandingAfter
      };
      const res = await api.payments.add(payload);
      // store canonical saved payment object to ensure PDF uses exact preview data
      setSavedPayment(res || null);
      const pid = res?._id || res?.id || res?.paymentId;
      if (pid) {
        setSavedReceiptId(pid);
        setShowReceiptModal(true);
      } else {
        router.push('/admin/payments');
      }
    } catch (e:any) {
      console.error(e);
      alert(e?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  // modal state for receipt preview
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [savedReceiptId, setSavedReceiptId] = useState<string | null>(null);
  const [savedPayment, setSavedPayment] = useState<any | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const openReceiptInNewTab = (path: string) => {
    try { window.open(path, '_blank'); } catch (e) { window.location.href = path; }
  };
  const handleCloseReceiptModal = () => {
    if (pdfPreviewUrl) {
      try { window.URL.revokeObjectURL(pdfPreviewUrl); } catch (e) {}
    }
    setPdfPreviewUrl(null);
    setShowReceiptModal(false);
  };
  const previewReceipt = async (id: string) => {
    try {
      let payment: any = null;
      if (savedPayment && (String(savedPayment._id) === String(id) || String(savedPayment.id) === String(id))) {
        payment = savedPayment;
      } else {
        const pRes = await fetch(`/api/payments?id=${encodeURIComponent(id)}`);
        if (!pRes.ok) return;
        payment = await pRes.json();
      }
      let party = null; let company = null;
      try { if (payment?.partyId) party = await api.parties.get(payment.partyId); } catch (e) { party = null; }
      try { const cr = await fetch('/api/company'); if (cr.ok) { const cd = await cr.json(); company = cd?.company || null; } } catch (e) { company = null; }

      const res = await fetch(`/api/payments/receipt/${encodeURIComponent(id)}/pdf`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment, party, company })
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      if (pdfPreviewUrl) { try { window.URL.revokeObjectURL(pdfPreviewUrl); } catch (e) {} }
      setPdfPreviewUrl(url);
    } catch (e) {
      console.error('preview failed', e);
    }
  };
  const downloadFromIframe = async (id: string) => {
    // Prefer the in-memory savedPayment to guarantee PDF uses preview data
    try {
      let payment: any = null;
      if (savedPayment && (String(savedPayment._id) === String(id) || String(savedPayment.id) === String(id))) {
        payment = savedPayment;
      }

      let party = null;
      let company = null;

      if (payment) {
        try { if (payment?.partyId) party = await api.parties.get(payment.partyId); } catch (e) { party = null; }
        try { const cr = await fetch('/api/company'); if (cr.ok) { const cd = await cr.json(); company = cd?.company || null; } } catch (e) { company = null; }
      } else {
        const pRes = await fetch(`/api/payments?id=${encodeURIComponent(id)}`);
        if (!pRes.ok) return openReceiptInNewTab(`/payments/receipt/${id}?download=1`);
        payment = await pRes.json();
        try { if (payment?.partyId) party = await api.parties.get(payment.partyId); } catch (e) { party = null; }
        try { const cr = await fetch('/api/company'); if (cr.ok) { const cd = await cr.json(); company = cd?.company || null; } } catch (e) { company = null; }
      }

      const res = await fetch(`/api/payments/receipt/${encodeURIComponent(id)}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment, party, company }),
      });
      if (!res.ok) return openReceiptInNewTab(`/payments/receipt/${id}?download=1`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payment_${payment?.id || payment?._id || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      openReceiptInNewTab(`/payments/receipt/${id}?download=1`);
    }
  };

  const printIframe = () => {
    if (!savedReceiptId) return;
    const url = `/payments/receipt/${savedReceiptId}`;
    try {
      const w = window.open(url, '_blank');
      if (w) {
        w.focus();
        setTimeout(() => { try { w.print(); } catch (e) { /* ignore */ } }, 600);
      } else {
        window.location.href = url;
      }
    } catch (e) {
      window.location.href = url;
    }
  };

  if (loading) return <div className="p-6"><SoftLoader text="Loading..." /></div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">Paid Payment</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { /* export stub */ }}>Export</Button>
          <Button onClick={() => router.push('/admin/payments')}>Back</Button>
        </div>
      </div>

      <Card className="max-w-lg mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1">Supplier</label>
            <Select value={selectedParty} onChange={(e:any)=> setSelectedParty(e.target.value)} options={[{ label: 'Select supplier', value: '' }, ...(parties || []).filter((p:any)=> (p.type||'').toString().toLowerCase()==='supplier').map((p:any)=>({ label: p.name, value: p._id || p.id }))]} />
          </div>
          <div>
            <label className="text-sm block mb-1">Date</label>
            <Input type="date" value={date} onChange={(e:any)=> setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1">Amount Paid</label>
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
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2">
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => router.push('/admin/payments')}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">{saving ? 'Saving...' : 'Save Payment'}</Button>
            </div>
          </div>
        </div>
      </Card>
      {showReceiptModal && (
        <Modal isOpen={showReceiptModal} onClose={() => handleCloseReceiptModal()} title="Payment Saved" full showBack>
          <div className="flex flex-col h-full">
            <div className="mb-3 flex gap-2">
              <Button variant="outline" onClick={() => savedReceiptId && downloadFromIframe(savedReceiptId)}>Download PDF</Button>
              <Button onClick={() => savedReceiptId && printIframe()}>Print</Button>
              <Button variant="ghost" onClick={() => savedReceiptId && previewReceipt(savedReceiptId)}>Preview</Button>
            </div>
            <div className="mt-2">
              <div className="text-sm text-slate-600">Use the buttons above to download or preview the receipt for printing.</div>
            </div>
            {pdfPreviewUrl && (
              <div className="mt-4 h-full flex-1 overflow-auto">
                <object data={pdfPreviewUrl} type="application/pdf" width="100%" height="100%">Your browser does not support PDFs — <a href={pdfPreviewUrl}>Download PDF</a>.</object>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
