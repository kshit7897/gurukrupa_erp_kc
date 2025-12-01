"use client";
import React, { useEffect, useState } from 'react';

type Toast = { id: string; type: 'success' | 'error' | 'info'; message: string };

export const Toasts: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (e: any) => {
      const { type, message } = e.detail || {};
      if (!message) return;
      const id = String(Date.now()) + Math.random().toString(36).slice(2, 7);
      setToasts((t) => [...t, { id, type: type || 'info', message }]);
      // auto remove after 3.5s
      setTimeout(() => setToasts((t) => t.filter(x => x.id !== id)), 3500);
    };
    window.addEventListener('gurukrupa:notify', handler as EventListener);
    return () => window.removeEventListener('gurukrupa:notify', handler as EventListener);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-6 z-50 flex flex-col gap-3">
      {toasts.map(t => (
        <div key={t.id} className={`max-w-sm w-full px-4 py-3 rounded-lg shadow-md text-sm font-medium ${t.type === 'success' ? 'bg-green-100 text-green-800' : t.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-900'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
};

export default Toasts;
