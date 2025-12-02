'use client';
import React, { useEffect, useState } from 'react';
import { Card, Table, Select, Input, Button, Modal, SoftLoader } from '../../../components/ui/Common';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/formatDate';

export default function PartyInvoicesPage() {
  const [party, setParty] = useState('');
  const [parties, setParties] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [billType, setBillType] = useState('');
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

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
                <td className="px-4 py-3">{formatDate(r.date)}</td>
                <td className="px-4 py-3">{r.invoice_no || r.invoiceNo}</td>
                <td className="px-4 py-3">{r.type}</td>
                <td className="px-4 py-3">₹ {Number(r.grandTotal || 0).toFixed(2)}</td>
                <td className="px-4 py-3">₹ {Number(r.paidAmount || 0).toFixed(2)}</td>
                <td className="px-4 py-3">₹ {Number(r.dueAmount || 0).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 text-sm bg-green-600 text-white rounded" onClick={() => window.open(`${window.location.origin}/admin/invoice/${r.id}`, '_blank')}>Reprint</button>
                    <button className="px-2 py-1 text-sm bg-red-600 text-white rounded" onClick={() => { setToDelete(r); setDeleteResult(null); }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </Table>
      </Card>
      <Modal isOpen={!!toDelete} onClose={() => { if (!deleting) setToDelete(null); }} title={`Delete Invoice ${toDelete?.invoice_no || toDelete?.invoiceNo || ''}`} footer={<>
        <Button variant="ghost" onClick={() => { if (!deleting) setToDelete(null); }}>Cancel</Button>
        <Button onClick={async () => {
          if (!toDelete) return;
          setDeleting(true);
          setDeleteResult(null);
          try {
            const res: any = await api.invoices.delete(toDelete.id);
            await load();
            if (res?.warnings && res.warnings.length) {
              setDeleteResult('Deleted with warnings:\n' + res.warnings.join('\n'));
            } else {
              setToDelete(null);
            }
          } catch (e: any) {
            setDeleteResult('Failed: ' + (e?.message || e));
          } finally { setDeleting(false); }
        }}>{deleting ? <><SoftLoader size="sm"/> Deleting...</> : 'Delete'}</Button>
      </> }>
        <div className="space-y-3">
          <div>Are you sure you want to delete this invoice? This will attempt to revert stock changes and update reports/ledger/dashboard.</div>
          {toDelete && (
            <div className="text-sm text-slate-600 mt-2">
              <div><strong>Invoice:</strong> {toDelete.invoice_no || toDelete.invoiceNo}</div>
              <div><strong>Date:</strong> {formatDate(toDelete.date)}</div>
              <div><strong>Total:</strong> ₹ {(toDelete.grandTotal||0).toFixed(2)}</div>
            </div>
          )}
          {deleteResult && <div className="mt-3 whitespace-pre-wrap text-sm">{deleteResult}</div>}
        </div>
      </Modal>
    </div>
  );
}
