import './globals.css';
import React from 'react';
import Providers from '../components/Providers';
import { AuthProvider } from '../components/AuthProvider';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gurukrupa ERP',
  description: 'ERP System for Gurukrupa Multi Ventures Pvt Ltd',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
          }
        `,
          }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 font-sans">
        {/* Wrap with AuthProvider for login persistence */}
        <AuthProvider>
          <Providers>{children}</Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
