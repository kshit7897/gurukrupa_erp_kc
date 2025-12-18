"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/Common';
import { Download } from 'lucide-react';

export function StockReportPdfDownloadButton({ rows }: { rows?: any[] }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reports/pdf?type=stock');
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('Failed to fetch stock PDF', txt);
        alert('Failed to generate PDF');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Stock_Report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" icon={Download} onClick={handleClick} disabled={loading}>
      {loading ? 'Preparing PDF...' : 'Export PDF'}
    </Button>
  );
}

export default StockReportPdfDownloadButton;
