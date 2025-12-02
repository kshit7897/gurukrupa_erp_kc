'use client';
import React, { useEffect, useState } from 'react';
import { Button, Input, Select, Table, Card, Modal, SoftLoader } from '../../../components/ui/Common';
import { Plus, Download } from 'lucide-react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/formatDate';
import { useRouter } from 'next/navigation';

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [parties, setParties] = useState<{ label: string; value: string }[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [notif, setNotif] = useState<{ type: 'success'|'error'; message: string } | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

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

  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleExport = async () => {
    try {
      const data = await api.payments.list();
      if (!data || data.length === 0) return alert('No payments to export');
      const headers = [ 'date','partyId','type','amount','mode','reference','invoiceIds','allocations','notes' ];
      const rows = data.map((p:any) => {
        const invs = Array.isArray(p.invoiceIds) ? p.invoiceIds.join('|') : (p.invoiceId || '');
        const alloc = Array.isArray(p.allocations) ? p.allocations.map((a:any) => `${a.invoiceId}:${a.amount}`).join('|') : '';
        return [ formatDate(p.date||''), p.partyName || p.partyId, p.type || '', (p.amount||0), p.mode || '', p.reference || '', invs, alloc, p.notes || '' ];
      });
      const csv = [headers.join(','), ...rows.map((r:any) => r.map((c:any)=> '"'+String(c).replace(/"/g,'""')+'"').join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `payments_export_${formatDate(new Date())}.csv`; a.click(); URL.revokeObjectURL(url);
    } catch (e:any) { console.error(e); alert('Export failed'); }
  };

  // Quick-save modal was removed; inline save handler not needed here.

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row items-center md:justify-between">
        <h1 className="text-2xl font-bold hidden md:block">Payments</h1>
        <div className="flex justify-center md:justify-end flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <Button variant="outline" icon={Download} onClick={handleExport} className="w-full md:w-auto">Export</Button>
          <div className="flex flex-col md:flex-row gap-2 md:gap-3 w-full md:w-auto">
            <Button onClick={() => router.push('/payments/receive')} className="w-full md:w-auto">Receive</Button>
            <Button onClick={() => router.push('/payments/pay')} className="w-full md:w-auto">Make Payment</Button>
          </div>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="p-6 text-center"><SoftLoader size="lg" text="Loading payments..." /></div>
        ) : payments.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No payments recorded yet.</div>
        ) : (
          <>
            {isMobile ? (
              <div className="space-y-3">
                {payments.map(p => (
                  <div
                    key={p.id || p._id}
                    className="border border-slate-100 rounded p-3 bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">{formatDate(p.date)}</div>
                        <div className="font-semibold text-slate-800 truncate">{p.partyName || p.partyId}</div>
                        <div className="text-xs text-slate-500 mt-1 max-w-[180px] truncate">{p.invoiceId ? `Invoice: ${p.invoiceId}` : (p._id || p.id)}</div>
                        {p.reference && <div className="text-xs text-slate-500 mt-1">{p.reference}</div>}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold">₹ {Number(p.amount || 0).toFixed(2)}</div>
                        <div className="text-xs text-slate-500">{p.mode || ''}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">&nbsp;</div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/payments/receipt/${p.id || p._id}`)}>View</Button>
                        <Button variant="danger" size="sm" onClick={(e:any) => { e.stopPropagation(); setToDelete(p); setDeleteResult(null); }}>Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <Table headers={[ 'Date', 'Party', 'Invoice', 'Amount', 'Mode', 'Ref', 'Actions' ]}>
                  {payments.map(p => (
                    <tr key={p.id || p._id} className="group hover:bg-slate-50">
                      <td className="px-4 py-3">{formatDate(p.date)}</td>
                      <td className="px-4 py-3">{p.partyName || p.partyId}</td>
                      <td className="px-4 py-3">{p.invoiceId || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold">₹ {p.amount}</td>
                      <td className="px-4 py-3">{p.mode}</td>
                      <td className="px-4 py-3">{p.reference || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/payments/receipt/${p.id || p._id}`)}>View</Button>
                          <Button variant="danger" size="sm" onClick={() => { setToDelete(p); setDeleteResult(null); }}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal isOpen={!!toDelete} onClose={() => { if (!deleting) setToDelete(null); }} title={`Delete Payment`} footer={<>
        <Button variant="ghost" onClick={() => { if (!deleting) setToDelete(null); }}>Cancel</Button>
        <Button onClick={async () => {
          if (!toDelete) return;
          setDeleting(true);
          setDeleteResult(null);
          try {
            const res: any = await api.payments.delete(toDelete.id || toDelete._id);
            await load();
            if (res?.warnings && res.warnings.length) {
              setDeleteResult('Deleted with warnings:\n' + res.warnings.join('\n'));
            } else {
              setToDelete(null);
            }
            setNotif({ type: 'success', message: 'Payment deleted' });
            setTimeout(() => setNotif(null), 3000);
          } catch (e: any) {
            setDeleteResult('Failed: ' + (e?.message || e));
            setNotif({ type: 'error', message: e?.message || 'Delete failed' });
            setTimeout(() => setNotif(null), 4000);
          } finally { setDeleting(false); }
        }}>{deleting ? <><SoftLoader size="sm"/> Deleting...</> : 'Delete'}</Button>
      </> }>
        <div className="space-y-3">
          <div>Are you sure you want to delete this payment? This will revert any invoice allocations and cannot be undone.</div>
          {toDelete && (
            <div className="text-sm text-slate-600 mt-2">
              <div><strong>Party:</strong> {toDelete.partyName || toDelete.partyId}</div>
              <div><strong>Date:</strong> {formatDate(toDelete.date)}</div>
              <div><strong>Amount:</strong> ₹ {(Number(toDelete.amount)||0).toFixed(2)}</div>
            </div>
          )}
          {deleteResult && <div className="mt-3 whitespace-pre-wrap text-sm">{deleteResult}</div>}
        </div>
      </Modal>

      {/* Quick modal removed - use full Receive / Make Payment pages */}

      {notif && (
        <div className={`fixed top-6 right-6 z-50 max-w-xs w-full p-3 rounded shadow-md ${notif.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notif.message}
        </div>
      )}
    </div>
  );
}

