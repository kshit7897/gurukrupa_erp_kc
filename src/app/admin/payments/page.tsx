'use client';
import React, { useEffect, useState } from 'react';
import { Button, Input, Select, Table, Card, Modal, SoftLoader } from '../../../components/ui/Common';
import { Plus, Download, Eye, Trash2, ReceiptIndianRupee, Wallet } from 'lucide-react';
import { api } from '../../../lib/api';
import { formatDate } from '../../../lib/formatDate';
import { useRouter } from 'next/navigation';
import PaymentForm from '../../../components/payments/PaymentForm';

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [parties, setParties] = useState<{ label: string; value: string }[]>([]);
  const [notif, setNotif] = useState<{ type: 'success'|'error'; message: string } | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  // Modal states
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [savedPayment, setSavedPayment] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const p = await api.payments.list();
      const pts = await api.parties.list();
      setParties((pts || []).map((x:any) => ({ label: x.name, value: x._id || x.id || x })));
      
      const partyMap = new Map<string,string>();
      (pts || []).forEach((x:any) => {
        const id = x._id || x.id;
        if (id) partyMap.set(String(id), x.name || String(id));
      });

      const enriched = (p || []).map((pay:any) => ({
        ...pay,
        partyName: pay.partyName || partyMap.get(String(pay.partyId)) || 'Unknown Party',
        id: pay._id?.toString() || pay.id
      }));
      setPayments(enriched);
    } catch (e) {
      console.error(e);
      setPayments([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

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
      const headers = [ 'date','party','type','amount','mode','reference','notes' ];
      const rows = data.map((p:any) => [
        formatDate(p.date), p.partyName, p.type, p.amount, p.mode, p.reference, p.notes
      ]);
      const csv = [headers.join(','), ...rows.map((r: any[]) => r.map((c: any) => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `payments_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    } catch (e) { alert('Export failed'); }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Payments & Receipts</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Settle invoices and track cashflow</p>
        </div>
        <div className="grid grid-cols-2 md:flex md:items-center gap-2 w-full md:w-auto">
          <Button variant="outline" icon={Download} onClick={handleExport} className="col-span-2 md:col-span-1 border-slate-200 text-slate-600">Export</Button>
          <Button icon={ReceiptIndianRupee} variant="primary" onClick={() => setShowReceiveModal(true)} className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-[10px] md:text-sm px-2 md:px-4">Receive</Button>
          <Button icon={Wallet} variant="primary" onClick={() => setShowPayModal(true)} className="whitespace-nowrap bg-rose-600 hover:bg-rose-700 text-[10px] md:text-sm px-2 md:px-4">Pay</Button>
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-xl bg-white/50 backdrop-blur-sm">
        {loading ? (
          <div className="p-12 text-center"><SoftLoader size="lg" text="Fetching payment records..." /></div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ReceiptIndianRupee className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-400 uppercase tracking-wider">No payments found</h3>
            <p className="text-sm text-slate-500">Record your first payment or receipt above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-[0.2em]">
                  <th className="px-6 py-4 text-left">Date</th>
                  <th className="px-6 py-4 text-left">Voucher</th>
                  <th className="px-6 py-4 text-left">Party / Customer</th>
                  <th className="px-6 py-4 text-left text-right">Amount</th>
                  <th className="px-6 py-4 text-left">Mode</th>
                  <th className="px-6 py-4 text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p => (
                  <tr key={p.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-bold whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400">{p.voucherNo || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 uppercase tracking-tight">{p.partyName}</div>
                      <div className={`text-[10px] font-black uppercase mt-0.5 ${p.type === 'receive' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {p.type === 'receive' ? 'Inward Receipt' : 'Outward Payment'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`text-base font-black ${p.type === 'receive' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ₹ {Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap uppercase text-[10px] font-bold text-slate-400">{p.mode}</td>
                    <td className="px-6 py-4 text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" icon={Eye} onClick={() => router.push(`/payments/receipt/${p.id}`)} title="View Receipt" />
                        <Button variant="ghost" size="sm" icon={Trash2} onClick={() => { setToDelete(p); setDeleteResult(null); }} className="text-rose-400 hover:text-rose-600" title="Delete" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Receive Modal */}
      <Modal 
        isOpen={showReceiveModal} 
        onClose={() => setShowReceiveModal(false)}
        title="Payment Received (Mili Hui Rakam)"
        full
      >
        <PaymentForm 
          type="receive" 
          onSuccess={(p) => {
            setShowReceiveModal(false);
            setSavedPayment(p);
            load();
            setNotif({ type: 'success', message: 'Receipt recorded successfully' });
            setTimeout(() => setNotif(null), 3000);
          }} 
          onCancel={() => setShowReceiveModal(false)} 
        />
      </Modal>

      {/* Pay Modal */}
      <Modal 
        isOpen={showPayModal} 
        onClose={() => setShowPayModal(false)}
        title="Make Payment (Diyi Hui Rakam)"
        full
      >
        <PaymentForm 
          type="pay" 
          onSuccess={(p) => {
            setShowPayModal(false);
            setSavedPayment(p);
            load();
            setNotif({ type: 'success', message: 'Payment recorded successfully' });
            setTimeout(() => setNotif(null), 3000);
          }} 
          onCancel={() => setShowPayModal(false)} 
        />
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!toDelete} onClose={() => { if (!deleting) setToDelete(null); }} title="Delete Transaction" footer={<>
        <Button variant="ghost" onClick={() => setToDelete(null)}>Discard</Button>
        <Button variant="primary" onClick={async () => {
          setDeleting(true);
          try {
            await api.payments.delete(toDelete.id);
            await load();
            setToDelete(null);
            setNotif({ type: 'success', message: 'Deleted successfully' });
          } catch (e:any) { setDeleteResult(e.message); }
          finally { setDeleting(false); }
        }} disabled={deleting}>{deleting ? 'Deleting...' : 'Confirm Deletion'}</Button>
      </>}>
        <div className="text-sm p-2">
          <p className="mb-4">Are you sure you want to delete this {toDelete?.type} transaction? This will reverse the account balance.</p>
          {deleteResult && <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold">{deleteResult}</div>}
        </div>
      </Modal>

      {notif && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl transition-all animate-in slide-in-from-bottom flex items-center gap-3 font-bold text-sm ${notif.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {notif.type === 'success' ? '✓' : '✕'} {notif.message}
        </div>
      )}
    </div>
  );
}

