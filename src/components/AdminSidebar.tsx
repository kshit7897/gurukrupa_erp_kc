'use client';

import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import { notify } from '../lib/notify';
import { getAuthFromStorage, clearAuthStorage } from '../lib/auth/storage';
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
  Building2,
  RefreshCw,
} from 'lucide-react';

const MENU_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/parties', label: 'Parties', icon: Users },
  { path: '/admin/items', label: 'Inventory', icon: Package },
  { path: '/admin/sales/create', label: 'Sale Entry', icon: ShoppingCart },
  { path: '/admin/purchase/create', label: 'Purchase Entry', icon: ShoppingCart },
  { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { path: '/admin/other-txns', label: 'Other Transactions', icon: TrendingUp },
  { path: '/invoices/all', label: 'Invoices', icon: FileText },
  { path: '/admin/payments', label: 'Payments', icon: FileBarChart },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

// Helper to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export const AdminSidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname() || '';
  const router = useRouter();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const [displayName, setDisplayName] = useState<string>('');
  const [displayRole, setDisplayRole] = useState<string>('');
  const [activeCompanyName, setActiveCompanyName] = useState<string>('');

  useEffect(() => {
    try {
      const data = getAuthFromStorage();
      const u = data?.user || null;
      if (u) {
        setDisplayName(u.name || u.username || 'User');
        setDisplayRole(u.role || (u.isAdmin ? 'admin' : 'staff') || 'user');
      }
      
      // Get active company name from cookie
      const companyName = getCookie('activeCompanyName');
      if (companyName) {
        setActiveCompanyName(companyName);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    clearAuthStorage();
    localStorage.removeItem('gurukrupa_user');
    // Clear company cookies
    document.cookie = 'activeCompanyId=; path=/; max-age=0';
    document.cookie = 'activeCompanyName=; path=/; max-age=0';
    router.push('/login');
  };
  
  const handleSwitchCompany = () => {
    // Clear company cookies and redirect to selection page
    document.cookie = 'activeCompanyId=; path=/; max-age=0';
    document.cookie = 'activeCompanyName=; path=/; max-age=0';
    router.push('/select-company');
  };

  return (
    <>
      {/* MOBILE HEADER */}
      <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-3">
          <button onClick={toggleSidebar} className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100">
            <Menu className="h-6 w-6" />
          </button>
          <div>
            <span className="font-bold text-slate-800 text-lg block leading-tight">Gurukrupa ERP</span>
            {activeCompanyName && (
              <span className="text-xs text-blue-600 font-medium">{activeCompanyName}</span>
            )}
          </div>
        </div>
        <button 
          onClick={handleSwitchCompany}
          className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs ring-2 ring-white shadow-sm"
          title="Switch Company"
        >
          <Building2 className="h-4 w-4" />
        </button>
      </header>

      {/* SIDEBAR (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0f172a] text-white transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) md:translate-x-0 md:static md:h-screen ${
          isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="border-b border-slate-800/50 bg-[#0f172a]">
          <div className="h-16 flex items-center justify-between px-6">
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
          
          {/* Active Company Indicator */}
          {activeCompanyName && (
            <div className="px-4 pb-3">
              <button
                onClick={handleSwitchCompany}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm text-slate-300 truncate">{activeCompanyName}</span>
                </div>
                <RefreshCw className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-400 flex-shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Content */}
        <div className="flex flex-col flex-1 min-h-0 justify-between">
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
            {MENU_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.path);
              // map routes to permissions (add more as needed)
              const permMap: Record<string, string> = {
                '/admin/parties': 'parties',
                '/admin/items': 'items',
                '/admin/sales/create': 'sales',
                '/admin/purchase/create': 'purchase',
                '/admin/reports': 'reports',
                '/admin/other-txns': 'other_txns',
                '/invoices/all': 'invoices',
                '/admin/payments': 'payments',
                '/admin/settings': 'permissions',
                '/admin/dashboard': 'dashboard'
              };
              const required = permMap[item.path];
              const allowed = required ? hasPermission(required) : true;

              if (allowed) {
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
              }

              // Disabled item when permission missing
              return (
                <div
                  key={item.path}
                  onClick={() => notify('error', 'You do not have permission to access this')}
                  className="group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-slate-600 opacity-50 cursor-not-allowed"
                >
                  <div className="flex items-center">
                    <item.icon className="h-5 w-5 mr-3 text-slate-500" />
                    {item.label}
                  </div>
                </div>
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
                {displayName ? displayName.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase() : 'U'}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{displayName || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{displayRole || 'role'}</p>
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
