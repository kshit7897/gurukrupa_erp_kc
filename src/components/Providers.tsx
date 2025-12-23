"use client";

import React from 'react';
import Toasts from './ui/Toast';
import { loaderEvents } from '../lib/loaderEvents';
import { useEffect } from 'react';
import { getAuthFromStorage } from '../lib/auth/storage';

// Map first path segment after /api to a list of allowed permission keys.
// If the user has ANY of the listed permissions (or '*'), allow the API.
const apiPermissionMap: Record<string, string[]> = {
  dashboard: ['dashboard'],
  invoices: ['invoices'],
  items: ['items'],
  // Parties may be needed by multiple features (sales, purchase, payments)
  parties: ['parties', 'sales', 'purchase', 'payments'],
  payments: ['payments'],
  reports: ['reports'],
  users: ['settings'],
  company: ['settings'],
  permissions: ['settings'],
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalFetch = window.fetch;
    const wrappedFetch = async (...args: any[]) => {
      try {
        loaderEvents.inc();

        try {
          const input = args[0];
          // Only enforce for same-origin API calls under /api/
          if (typeof input === 'string' && input.startsWith('/api/')) {
            const url = new URL(input, window.location.origin);
            const parts = url.pathname.split('/').filter(Boolean); // ['api','...']
            const resource = parts[1] || '';
            const required = apiPermissionMap[resource];
            if (required) {
              const auth = getAuthFromStorage();
              // If auth data is not available, allow the request to proceed to avoid breaking UX
              if (!auth || !auth.user || !Array.isArray((auth.user as any).permissions)) {
                // allow: permission resolution will happen once auth is loaded
              } else {
                const perms: string[] = (auth.user as any).permissions || [];
                // allow if wildcard
                if (perms.includes('*')) {
                  // allowed
                } else {
                  // allowed if any of required perms present
                  const ok = required.some(r => perms.includes(r));
                  if (!ok) {
                    return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
                  }
                }
              }
            }
          }
        } catch (e) {
          // If anything unexpected happens, allow the request to avoid breaking functionality
        }

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
