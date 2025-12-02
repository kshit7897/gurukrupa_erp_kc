"use client";

import React from 'react';
import Toasts from './ui/Toast';
import { loaderEvents } from '../lib/loaderEvents';
import { useEffect } from 'react';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalFetch = window.fetch;
    const wrappedFetch = async (...args: any[]) => {
      try {
        loaderEvents.inc();
        return await originalFetch.apply(window, args as any);
      } finally {
        setTimeout(() => loaderEvents.dec(), 50);
      }
    };
    // @ts-ignore
    window.fetch = wrappedFetch;
    return () => {
      // @ts-ignore
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <>
      {children}
      <Toasts />
    </>
  );
};

export default Providers;
