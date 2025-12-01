
import { Party, Item, Invoice, PartyType, Payment } from '../types';
import { loaderEvents, dataEvents } from './loaderEvents';
import { notify } from './notify';

// --- MOCK DATA STORE ---
// In a real app, this would be a backend database.
// For now, we simulate data persistence in memory.

let MOCK_PARTIES: Party[] = [
  { id: '1', name: 'Ramesh Traders', mobile: '9876543210', email: 'ramesh@gmail.com', address: 'Pune', gstNo: '27ABCDE1234F1Z5', openingBalance: 2500, type: PartyType.CUSTOMER },
  { id: '2', name: 'Suresh Supplies', mobile: '9123456780', email: 'suresh@gmail.com', address: 'Mumbai', gstNo: '27FGHIJ5678K1Z9', openingBalance: 5000, type: PartyType.SUPPLIER },
  { id: '3', name: 'Pune Construction', mobile: '9988776655', email: 'info@puneconst.com', address: 'Baner, Pune', gstNo: '27KLMNO9012P1Z3', openingBalance: 12000, type: PartyType.CUSTOMER },
];

let MOCK_ITEMS: Item[] = [
  { id: '1', name: 'Cement Bag (50kg)', hsn: '2523', unit: 'BAG', purchaseRate: 350, saleRate: 400, taxPercent: 18, stock: 100, barcode: 'CEM001' },
  { id: '2', name: 'Bricks (Red)', hsn: '6901', unit: 'PCS', purchaseRate: 8, saleRate: 12, taxPercent: 5, stock: 5000, barcode: 'BRK001' },
  { id: '3', name: 'Steel Rod (10mm)', hsn: '7214', unit: 'KG', purchaseRate: 60, saleRate: 75, taxPercent: 18, stock: 1000, barcode: 'STL010' },
  { id: '4', name: 'Sand (River)', hsn: '2505', unit: 'BRAS', purchaseRate: 5000, saleRate: 6500, taxPercent: 5, stock: 10, barcode: 'SND001' },
];

let MOCK_INVOICES: Invoice[] = [];
let MOCK_PAYMENTS: Payment[] = [];

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withLoader = async <T,>(fn: () => Promise<T>) => {
  if (typeof window !== 'undefined') loaderEvents.inc();
  try {
    const res = await fn();
    return res;
  } finally {
    if (typeof window !== 'undefined') loaderEvents.dec();
  }
};

export const api = {
  auth: {
    login: async (username: string, password: string) => {
      return withLoader(async () => {
        // Call backend auth route
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Invalid credentials');
        }
        const data = await res.json();
      // store minimal user info in localStorage for client-side guard
      if (data?.user) {
        // store expiry (24 hours) so client-side checks can expire if cookie removed
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
        localStorage.setItem('gurukrupa_user', JSON.stringify({ ...data.user, expiresAt }));
      }
        return true;
      });
    }
  },
  dashboard: {
    getStats: async () => {
      return withLoader(async () => {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to fetch dashboard');
        return await res.json();
      });
    },
    getRecentTransactions: async () => {
      return withLoader(async () => {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to fetch dashboard');
        const data = await res.json();
        const recent: any[] = [];
        if (Array.isArray(data.recentInvoices)) {
          data.recentInvoices.forEach((inv: any) => recent.push({ id: inv._id || inv.id, party: inv.partyName, amount: inv.grandTotal, type: inv.type === 'SALES' ? 'Sale' : 'Purchase', date: inv.date }));
        }
        if (Array.isArray(data.recentPayments)) {
          data.recentPayments.forEach((p: any) => recent.push({ id: p._id || p.id, party: p.partyId, amount: p.amount, type: 'Payment', date: p.date }));
        }
        // sort by date desc and return only last 5 combined transactions
        recent.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return recent.slice(0, 5);
      });
    }
  },
  parties: {
    list: async () => {
      return withLoader(async () => {
        const res = await fetch('/api/parties');
        if (!res.ok) throw new Error('Failed to fetch parties');
        const data = await res.json();
        return data;
      });
    },
    get: async (id: string) => {
      return withLoader(async () => {
        const res = await fetch(`/api/parties?id=${id}`);
        if (!res.ok) throw new Error('Failed to fetch party');
        return await res.json();
      });
    },
    add: async (party: Party) => {
      return withLoader(async () => {
        const res = await fetch('/api/parties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(party) });
        if (!res.ok) throw new Error('Failed to create party');
        const out = await res.json();
        dataEvents.dispatch();
        try { notify('success', 'Party created'); } catch (e) {}
        return out;
      });
    },
    update: async (party: Party) => {
      return withLoader(async () => {
        const res = await fetch('/api/parties', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(party) });
        if (!res.ok) throw new Error('Failed to update party');
        const out = await res.json();
        dataEvents.dispatch();
        try { notify('success', 'Party updated'); } catch (e) {}
        return out;
      });
    },
    delete: async (id: string) => {
      return withLoader(async () => {
        const res = await fetch(`/api/parties?id=${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete party');
        dataEvents.dispatch();
        try { notify('success', 'Party deleted'); } catch (e) {}
        return true;
      });
    }
  },
  items: {
    list: async () => {
      return withLoader(async () => {
        const res = await fetch('/api/items');
        if (!res.ok) throw new Error('Failed to fetch items');
        return await res.json();
      });
    },
    add: async (item: Item) => {
      return withLoader(async () => {
        const res = await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
        if (!res.ok) throw new Error('Failed to create item');
        const out = await res.json();
        dataEvents.dispatch();
        try { notify('success', 'Item created'); } catch (e) {}
        return out;
      });
    },
    update: async (item: Item) => {
      return withLoader(async () => {
        const res = await fetch('/api/items', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
        if (!res.ok) throw new Error('Failed to update item');
        const out = await res.json();
        dataEvents.dispatch();
        try { notify('success', 'Item updated'); } catch (e) {}
        return out;
      });
    },
    delete: async (id: string) => {
      return withLoader(async () => {
        const res = await fetch(`/api/items?id=${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete item');
        dataEvents.dispatch();
        try { notify('success', 'Item deleted'); } catch (e) {}
        return true;
      });
    }
  },
  payments: {
    add: async (payment: Omit<Payment, 'id'> & { invoiceId?: string }) => {
      return withLoader(async () => {
        const res = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payment) });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Failed to create payment');
        }
        const out = await res.json();
        dataEvents.dispatch();
        try { notify('success', 'Payment recorded'); } catch (e) {}
        return out;
      });
    },
    list: async (partyId?: string) => {
      return withLoader(async () => {
        const qs = new URLSearchParams();
        if (partyId) qs.set('party', partyId);
        const res = await fetch(`/api/payments${qs.toString() ? ('?' + qs.toString()) : ''}`);
        if (!res.ok) throw new Error('Failed to fetch payments');
        return await res.json();
      });
    }
  },
  invoices: {
    add: async (invoice: any) => {
      return withLoader(async () => {
        const res = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoice) });
        if (!res.ok) throw new Error('Failed to create invoice');
        const out = await res.json();
        dataEvents.dispatch();
        try { notify('success', 'Invoice created'); } catch (e) {}
        return out;
      });
    },
    list: async () => {
      return withLoader(async () => {
        const res = await fetch('/api/invoices');
        if (!res.ok) throw new Error('Failed to fetch invoices');
        return await res.json();
      });
    },
    get: async (id: string) => {
      return withLoader(async () => {
        const res = await fetch(`/api/invoices/${id}`);
        if (!res.ok) return null;
        return await res.json();
      });
    }
  },
  reports: {
    getOutstanding: async () => {
      return withLoader(async () => {
        const res = await fetch('/api/reports/outstanding');
        if (!res.ok) throw new Error('Failed to fetch outstanding report');
        return await res.json();
      });
    },
    getLedger: async (partyId: string, startDate?: string, endDate?: string) => {
      const qs = new URLSearchParams();
      if (partyId) qs.set('party', partyId);
      if (startDate) qs.set('from', startDate);
      if (endDate) qs.set('to', endDate);
      return withLoader(async () => {
        const res = await fetch(`/api/reports/ledger?${qs.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch ledger');
        return await res.json();
      });
    },
    getStock: async () => {
      return withLoader(async () => {
        const res = await fetch('/api/items');
        if (!res.ok) throw new Error('Failed to fetch items');
        const items = await res.json();
        return items.map((item: any) => ({ ...item, value: (item.stock || 0) * (item.purchaseRate || 0) }));
      });
    }
  }
};
