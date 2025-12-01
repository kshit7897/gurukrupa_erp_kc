"use client";
import React, { useEffect, useState } from 'react';

// Client-side printable invoice page — reads ?id and optional ?print=1
export default function ReprintInvoicePage() {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const doPrint = params.get('print') === '1' || params.get('print') === 'true';
    if (!id) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (!res.ok) { setInvoice(null); return; }
        const data = await res.json();
        setInvoice(data);
        setTimeout(() => {
          if (doPrint) window.print?.();
        }, 500);
      } catch (e) { console.error(e); setInvoice(null); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!invoice) return <div className="p-6">Invoice not found or id missing</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Invoice: {invoice.invoice_no || invoice.invoiceNo}</h2>
        <div>
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => window.print?.()}>Print</button>
        </div>
      </div>

      <div className="mt-4">
        <div><strong>Party:</strong> {invoice.partyName || invoice.partyId}</div>
        <div><strong>Date:</strong> {(invoice.date||'').slice(0,10)}</div>
        <div className="mt-4">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr>
                <th className="text-left">Item</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items||[]).map((it:any,idx:number)=> (
                <tr key={idx}>
                  <td>{it.name}</td>
                  <td className="text-right">{it.qty}</td>
                  <td className="text-right">₹ {Number(it.rate||0).toFixed(2)}</td>
                  <td className="text-right">₹ {Number(it.amount||0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-right">
          <div>Subtotal: ₹ {Number(invoice.subtotal||0).toFixed(2)}</div>
          <div>Tax: ₹ {Number(invoice.taxAmount||0).toFixed(2)}</div>
          <div className="font-bold">Total: ₹ {Number(invoice.grandTotal||0).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
