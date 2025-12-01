'use client';
import React, { useEffect, useState } from 'react';
import { Card, Table, Select, Button } from '../../../components/ui/Common';

export default function MonthlyInvoicesPage(){
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
                <td className="px-4 py-3">{(r.date||'').slice(0,10)}</td>
                <td className="px-4 py-3">{r.invoice_no || r.invoiceNo}</td>
                <td className="px-4 py-3">{r.partyName || r.partyId}</td>
                <td className="px-4 py-3">₹ {Number(r.grandTotal||0).toFixed(2)}</td>
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
