'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
  FileBarChart,
} from 'lucide-react';

const MENU_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/parties', label: 'Parties', icon: Users },
  { path: '/admin/items', label: 'Inventory', icon: Package },
  { path: '/admin/sales/create', label: 'Sale Entry', icon: ShoppingCart },
  { path: '/admin/purchase/create', label: 'Purchase Entry', icon: ShoppingCart },
  { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { path: '/admin/other-txns', label: 'Other Income/Expense', icon: TrendingUp },
  { path: '/invoices/all', label: 'Invoices', icon: FileText },
  { path: '/admin/payments', label: 'Payments', icon: FileBarChart },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export const AdminSidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('gurukrupa_user');
    router.push('/login');
  };

  return (
    <>
      {/* MOBILE HEADER */}
      <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-3">
          <button onClick={toggleSidebar} className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100">
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold text-slate-800 text-lg">Gurukrupa ERP</span>
        </div>
        <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs ring-2 ring-white shadow-sm">
          SA
        </div>
      </header>

      {/* SIDEBAR (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0f172a] text-white transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) md:translate-x-0 md:static md:h-screen ${
          isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/50 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-100">Gurukrupa</span>
          </div>
          <button onClick={toggleSidebar} className="md:hidden text-slate-400 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex flex-col h-[calc(100vh-5rem)] justify-between">
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
            {MENU_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon
                      className={`h-5 w-5 mr-3 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'
                      }`}
                    />
                    {item.label}
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-800 bg-[#0f172a]">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-400/10 hover:text-red-300 rounded-lg transition-colors mb-2"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
            <div className="mt-2 flex items-center px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                SA
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">Super Admin</p>
                <p className="text-xs text-slate-500 truncate">admin@gurukrupa.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* OVERLAY for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
};
