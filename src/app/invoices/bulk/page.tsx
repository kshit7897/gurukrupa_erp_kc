'use client';
import React, { useEffect, useState } from 'react';
import { Card, Select, Button } from '../../../components/ui/Common';

export default function BulkInvoicesPage(){
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if(!month) return alert('Select month');
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

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_${year}_${month}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const months = Array.from({length:12}).map((_,i)=> ({label: String(i+1).padStart(2,'0'), value: String(i+1)}));
  const years = [String(new Date().getFullYear()-1), String(new Date().getFullYear()), String(new Date().getFullYear()+1)];

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Select options={[{label:'Select month', value:''}, ...months]} value={month} onChange={(e:any)=> setMonth(e.target.value)} />
        <Select options={years.map(y=> ({label: y, value: y}))} value={year} onChange={(e:any)=> setYear(e.target.value)} />
        <Button onClick={load}>Load</Button>
        <Button onClick={downloadJSON} disabled={rows.length===0}>Download JSON</Button>
      </div>

      <Card>
        <div className="p-4">
          {loading ? 'Loading...' : `${rows.length} invoices loaded`}
        </div>
      </Card>
    </div>
  );
}
