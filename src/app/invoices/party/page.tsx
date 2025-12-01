'use client';
import React, { useEffect, useState } from 'react';
import { Card, Table, Select, Input, Button } from '../../../components/ui/Common';

export default function PartyInvoicesPage() {
  const [party, setParty] = useState('');
  const [parties, setParties] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [billType, setBillType] = useState('');

  useEffect(() => { loadParties(); }, []);

  const loadParties = async () => {
    try {
      const res = await fetch('/api/parties');
      if (!res.ok) { setParties([]); return; }
      const data = await res.json();
      setParties((data || []).map((p:any)=> ({ label: p.name, value: p._id || p.id })));
    } catch (e) { console.error(e); setParties([]); }
  };

  const load = async () => {
    if (!party) return alert('Select a party');
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('party', party);
      if (from && to) { params.set('from', from); params.set('to', to); }
      if (billType) params.set('bill_type', billType);
      const res = await fetch('/api/invoices?' + params.toString());
      if (!res.ok) { setRows([]); return; }
      const data = await res.json();
      setRows(data || []);
    } catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Select options={[{ label: 'Select party', value: '' }, ...parties]} value={party} onChange={(e:any)=> setParty(e.target.value)} />
        <Input type="date" value={from} onChange={(e:any)=> setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e:any)=> setTo(e.target.value)} />
        <Select options={[{ label: 'All', value: '' }, { label: 'Cash', value: 'cash' }, { label: 'Credit', value: 'credit' }, { label: 'Online', value: 'online' }, { label: 'Cheque', value: 'cheque' }]} value={billType} onChange={(e:any)=> setBillType(e.target.value)} />
        <Button onClick={load}>Filter</Button>
      </div>

      <Card>
        <Table headers={[ 'Date', 'Invoice No', 'Type', 'Total', 'Paid', 'Due', 'Actions' ]}>
          {loading ? (<tr><td colSpan={7} className="px-4 py-6 text-center">Loading...</td></tr>) : (
            (rows || []).map((r:any)=> (
              <tr key={r.id}>
                <td className="px-4 py-3">{(r.date||'').slice(0,10)}</td>
                <td className="px-4 py-3">{r.invoice_no || r.invoiceNo}</td>
                <td className="px-4 py-3">{r.type}</td>
                <td className="px-4 py-3">₹ {Number(r.grandTotal || 0).toFixed(2)}</td>
                <td className="px-4 py-3">₹ {Number(r.paidAmount || 0).toFixed(2)}</td>
                <td className="px-4 py-3">₹ {Number(r.dueAmount || 0).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 text-sm bg-green-600 text-white rounded" onClick={() => window.open(`${window.location.origin}/admin/invoice/${r.id}`, '_blank')}>Reprint</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </Table>
      </Card>
    </div>
  );
}
