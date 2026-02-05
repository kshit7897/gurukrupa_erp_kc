'use client';
import React from 'react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { Users, ShoppingCart, FileBarChart, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <AdminSidebar />
      
      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-4rem)] md:h-screen bg-slate-50/50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
          {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-16 flex items-center justify-around z-20 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link href="/admin/dashboard" className={`flex flex-col items-center p-2 ${pathname.includes('/dashboard') ? 'text-blue-600' : 'text-slate-500'}`}>
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </Link>
        <Link href="/admin/parties" className={`flex flex-col items-center p-2 ${pathname.includes('/parties') ? 'text-blue-600' : 'text-slate-500'}`}>
          <Users className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">Parties</span>
        </Link>
        <Link href="/admin/purchase/create" className={`flex flex-col items-center p-2 ${pathname.includes('/purchase') ? 'text-blue-600' : 'text-slate-500'}`}>
          <ShoppingCart className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">Purchase</span>
        </Link>
        <Link href="/admin/sales/create" className={`flex flex-col items-center p-2 ${pathname.includes('/sales') ? 'text-blue-600' : 'text-slate-500'}`}>
          <ShoppingCart className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">Sale</span>
        </Link>
        <Link href="/admin/payments" className={`flex flex-col items-center p-2 ${pathname.includes('/payments') ? 'text-blue-600' : 'text-slate-500'}`}>
          <FileBarChart className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">Payment</span>
        </Link>
      </nav>
    </div>
  );
}
