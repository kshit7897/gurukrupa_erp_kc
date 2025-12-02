'use client';
import React, { useEffect, useState } from 'react';
import { Card, Table, Select, Button, Modal, SoftLoader } from '../../../components/ui/Common';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/formatDate';

export default function MonthlyInvoicesPage(){
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  useEffect(()=>{}, []);

  const load = async () => {
    if (!month) return alert('Select month');
    setLoading(true);
    try{
      const params = new URLSearchParams();
      params.set('month', month);
      params.set('year', year);
      const res = await fetch('/api/invoices?' + params.toString());
      if(!res.ok){ setRows([]); return; }
      const data = await res.json();
      setRows(data || []);
    }catch(e){ console.error(e); setRows([]); }
    finally{ setLoading(false); }
  };

  const months = Array.from({length:12}).map((_,i)=> ({label: String(i+1).padStart(2,'0'), value: String(i+1)}));
  const years = [String(new Date().getFullYear()-1), String(new Date().getFullYear()), String(new Date().getFullYear()+1)];

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Select options={[{label:'Select month', value:''}, ...months]} value={month} onChange={(e:any)=> setMonth(e.target.value)} />
        <Select options={years.map(y=> ({label: y, value: y}))} value={year} onChange={(e:any)=> setYear(e.target.value)} />
        <Button onClick={load}>Get</Button>
      </div>

      <Card>
        <Table headers={[ 'Date', 'Invoice No', 'Party', 'Total', 'Actions' ]}>
          {loading ? (<tr><td colSpan={5} className="px-4 py-6 text-center">Loading...</td></tr>) : (
            (rows||[]).map(r=> (
              <tr key={r.id}>
                <td className="px-4 py-3">{formatDate(r.date)}</td>
                <td className="px-4 py-3">{r.invoice_no || r.invoiceNo}</td>
                <td className="px-4 py-3">{r.partyName || r.partyId}</td>
                <td className="px-4 py-3">₹ {Number(r.grandTotal||0).toFixed(2)}</td>
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
