"use client";

import React, { useEffect, useState } from 'react';
import { SoftLoader } from './Common';

export const GlobalLoader: React.FC = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const inc = () => setCount(c => c + 1);
    const dec = () => setCount(c => Math.max(0, c - 1));
    document.addEventListener('gurukrupa:loader:inc', inc as EventListener);
    document.addEventListener('gurukrupa:loader:dec', dec as EventListener);
    return () => {
      document.removeEventListener('gurukrupa:loader:inc', inc as EventListener);
      document.removeEventListener('gurukrupa:loader:dec', dec as EventListener);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="p-6 rounded-xl bg-white/90 shadow-lg border border-slate-100 flex flex-col items-center">
        <SoftLoader size="lg" text="Processing..." />
      </div>
    </div>
  );
};

export default GlobalLoader;
