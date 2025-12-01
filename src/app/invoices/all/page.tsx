'use client';
import React, { useEffect, useState } from 'react';
import { Card, Table, Input, Button } from '../../../components/ui/Common';
import { api } from '../../../lib/api';

export default function AllInvoicesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) { setRows([]); return; }
      const data = await res.json();
      setRows(data || []);
    } catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">All Invoices</h2>
        <div className="flex items-center gap-2">
          <Input placeholder="Search by invoice, party" value={q} onChange={(e:any)=> setQ(e.target.value)} />
          <Button onClick={() => { load(); }}>Refresh</Button>
        </div>
      </div>

      <Card>
        <Table headers={[ 'Date', 'Invoice No', 'Party', 'Type', 'Total', 'Due', 'Actions' ]}>
          {loading ? (
            <tr><td colSpan={6} className="px-4 py-6 text-center">Loading...</td></tr>
          ) : (
            (rows || []).filter(r => {
              if (!q) return true;
              const term = q.toLowerCase();
              return (r.invoice_no || r.invoiceNo || '').toString().toLowerCase().includes(term) || (r.partyName || '').toString().toLowerCase().includes(term);
            }).map((r:any) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{(r.date || '').slice(0,10)}</td>
                <td className="px-4 py-3">{r.invoice_no || r.invoiceNo}</td>
                <td className="px-4 py-3">{r.partyName || r.partyId}</td>
                <td className="px-4 py-3">{r.type}</td>
                <td className="px-4 py-3">₹ {Number(r.grandTotal || 0).toFixed(2)}</td>
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
