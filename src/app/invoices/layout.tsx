'use client';

import React from 'react';
import { AdminLayout } from '../../components/Layout';

export default function InvoicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}
