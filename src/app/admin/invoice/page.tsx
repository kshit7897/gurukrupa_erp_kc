'use client';
import React, { useEffect, useState } from 'react';
import { Button, Table, Card } from '../../../components/ui/Common';
import { Eye, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      // API returns array of invoices
      setInvoices(data || []);
    } catch (err) {
      console.error(err);
      setInvoices([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4">
      <Card title="Saved Invoices">
        {loading ? <div className="p-6 text-center text-slate-600">Loading...</div> : (
          <div>
            {invoices.length === 0 ? <div className="p-6 text-slate-500">No invoices found</div> : (
              <Table headers={["Invoice #", "Party", "Date", "Total", "Action"]}>
                {invoices.map((inv: any) => (
                  <tr key={inv.id || inv._id} className="group hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{inv.invoiceNo || inv.invoiceNo}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.partyName || inv.partyName}</td>
                    <td className="px-4 py-3">{inv.date}</td>
                    <td className="px-4 py-3 text-right">₹{(inv.grandTotal || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => router.push(`/admin/invoice/${inv.id || inv._id}`)} icon={Eye}>Preview</Button>
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
