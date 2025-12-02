'use client';
import React, { useEffect, useState } from 'react';
import { Card, Table, Input, Button, Modal, SoftLoader } from '../../../components/ui/Common';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/formatDate';

export default function AllInvoicesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

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
        {/* Desktop: table view */}
        <div className="hidden md:block">
          <Table headers={[ 'Date', 'Invoice No', 'Party', 'Type', 'Total', 'Due', 'Actions' ]}>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center">Loading...</td></tr>
            ) : (
              (rows || []).filter(r => {
                if (!q) return true;
                const term = q.toLowerCase();
                return (r.invoice_no || r.invoiceNo || '').toString().toLowerCase().includes(term) || (r.partyName || '').toString().toLowerCase().includes(term);
              }).map((r:any) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">{formatDate(r.date)}</td>
                  <td className="px-4 py-3">{r.invoice_no || r.invoiceNo}</td>
                  <td className="px-4 py-3">{r.partyName || r.partyId}</td>
                  <td className="px-4 py-3">{r.type}</td>
                  <td className="px-4 py-3">₹ {Number(r.grandTotal || 0).toFixed(2)}</td>
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
        </div>

        {/* Mobile: card/list view */}
        <div className="block md:hidden space-y-3">
          {loading ? (
            <div className="px-4 py-6 text-center">Loading...</div>
          ) : (
            (rows || []).filter(r => {
              if (!q) return true;
              const term = q.toLowerCase();
              return (r.invoice_no || r.invoiceNo || '').toString().toLowerCase().includes(term) || (r.partyName || '').toString().toLowerCase().includes(term);
            }).map((r:any) => (
              <div key={r.id} className="border rounded-lg p-3 bg-white shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-slate-500">{formatDate(r.date)}</div>
                    <div className="font-semibold text-sm mt-1">{r.invoice_no || r.invoiceNo}</div>
                    <div className="text-sm text-slate-600">{r.partyName || r.partyId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">₹ {Number(r.grandTotal || 0).toFixed(2)}</div>
                    <div className="text-xs text-slate-400 mt-1">Due ₹ {Number(r.dueAmount || 0).toFixed(2)}</div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 text-sm bg-green-600 text-white rounded" onClick={() => window.open(`${window.location.origin}/admin/invoice/${r.id}`, '_blank')}>Reprint</button>
                    <button className="px-3 py-1 text-sm bg-red-600 text-white rounded" onClick={() => { setToDelete(r); setDeleteResult(null); }}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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
              // keep modal open and show warnings
              setDeleteResult('Deleted with warnings:\n' + res.warnings.join('\n'));
            } else {
              // close modal on clean delete
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
