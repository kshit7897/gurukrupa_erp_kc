'use client';
import React, { useEffect, useState } from 'react';
import { Button, Table, Card, Select, Input, Skeleton, SoftLoader } from '../../../components/ui/Common';
import { Eye, Printer, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate } from '../../../lib/formatDate';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'SALES' | 'PURCHASE'>('ALL');
  const [parties, setParties] = useState<{ label: string; value: string }[]>([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [query, setQuery] = useState('');
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      // API returns array of invoices
      setInvoices(data || []);
      // load parties for filter
      try {
        const p = await fetch('/api/parties');
        if (p.ok) {
          const pd = await p.json();
          setParties(pd.map((x: any) => ({ label: x.name, value: x._id || x.id })));
        }
      } catch (e) { /* ignore */ }
    } catch (err) {
      console.error(err);
      setInvoices([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const onData = () => { load().catch(() => {}); };
    document.addEventListener('gurukrupa:data:updated', onData);
    return () => document.removeEventListener('gurukrupa:data:updated', onData);
  }, []);

  return (
    <div className="p-4">
      <Card title="Saved Invoices">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Type</label>
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} options={[{ label: 'All', value: 'ALL' }, { label: 'Sales', value: 'SALES' }, { label: 'Purchase', value: 'PURCHASE' }]} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Party</label>
            {loading ? <div className="h-10 bg-slate-200 rounded-md animate-pulse" /> : <Select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} options={[{ label: 'All Parties', value: '' }, ...parties]} />}
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">From</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">To</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Input placeholder="Search invoice # or party" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button onClick={() => { /* client filters applied below */ }}>Apply</Button>
          <Button variant="ghost" onClick={() => { setFilterType('ALL'); setSelectedParty(''); setFromDate(''); setToDate(''); setQuery(''); }}>Reset</Button>
        </div>

        {loading ? (
          <div className="p-6"><div className="text-center"><SoftLoader size="lg" text="Loading invoices..." /></div></div>
        ) : (
          <div>
            {invoices.length === 0 ? <div className="p-6 text-slate-500">No invoices found</div> : (
              <Table headers={["Invoice #", "Party", "Type", "Date", "Total", "Action"]}>
                {invoices.filter(inv => {
                  if (filterType !== 'ALL' && inv.type !== filterType) return false;
                  if (selectedParty && ((inv.partyId || inv.party_id || inv.party) !== selectedParty)) return false;
                  if (fromDate && inv.date < fromDate) return false;
                  if (toDate && inv.date > toDate) return false;
                  if (query) {
                    const q = query.toLowerCase();
                    if (!((inv.invoiceNo || '').toString().toLowerCase().includes(q) || (inv.partyName || '').toString().toLowerCase().includes(q))) return false;
                  }
                  return true;
                }).map((inv: any) => (
                  <tr key={inv.id || inv._id} className="group hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{inv.invoiceNo}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.partyName}</td>
                    <td className="px-4 py-3">{inv.type}</td>
                    <td className="px-4 py-3">{formatDate(inv.date)}</td>
                    <td className="px-4 py-3 text-right">₹{(inv.grandTotal || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => router.push(`/admin/invoice/${inv.id || inv._id}`)} icon={Eye}>Preview</Button>
                      <Button size="sm" variant="outline" onClick={() => router.push(`/admin/invoice/${inv.id || inv._id}?download=1`)} icon={Download}>Download</Button>
                      <Button size="sm" variant="outline" onClick={() => router.push(`/admin/invoice/${inv.id || inv._id}`)} icon={Printer}>Print</Button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
