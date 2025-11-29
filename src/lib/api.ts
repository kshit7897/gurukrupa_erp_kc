
import { Party, Item, Invoice, PartyType, Payment } from '../types';

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

export const api = {
  auth: {
    login: async (username: string, password: string) => {
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
      if (data?.user) localStorage.setItem('gurukrupa_user', JSON.stringify(data.user));
      return true;
    }
  },
  dashboard: {
    getStats: async () => {
      await delay(500);
      const totalSales = MOCK_INVOICES.filter(i => i.type === 'SALES').reduce((acc, i) => acc + i.grandTotal, 0) + 125000;
      const totalPurchase = MOCK_INVOICES.filter(i => i.type === 'PURCHASE').reduce((acc, i) => acc + i.grandTotal, 0) + 85000;
      
      // Calculate Receivables (Credit Sales - Payments)
      const receivables = MOCK_PARTIES
        .filter(p => p.type === PartyType.CUSTOMER)
        .reduce((sum, p) => sum + p.openingBalance, 0);

      return {
        totalSales,
        totalPurchase,
        receivables: receivables + 15000, // Dummy addition for effect
        lowStock: MOCK_ITEMS.filter(i => i.stock < 10).length
      };
    },
    getRecentTransactions: async () => {
      await delay(500);
      const recent = MOCK_INVOICES.slice(-5).reverse().map(inv => ({
        id: inv.invoiceNo,
        party: inv.partyName,
        amount: inv.grandTotal,
        type: inv.type === 'SALES' ? 'Sale' : 'Purchase',
        date: inv.date
      }));
      // Add some dummy data if empty
      if (recent.length === 0) {
        return [
           { id: '101', party: 'Ramesh Traders', amount: 4500, type: 'Sale', date: '2025-05-10' },
           { id: '102', party: 'Suresh Supplies', amount: 12000, type: 'Purchase', date: '2025-05-11' },
           { id: '103', party: 'Pune Construction', amount: 8500, type: 'Sale', date: '2025-05-12' },
        ];
      }
      return recent;
    }
  },
  parties: {
    list: async () => {
      const res = await fetch('/api/parties');
      if (!res.ok) throw new Error('Failed to fetch parties');
      const data = await res.json();
      return data;
    },
    get: async (id: string) => {
      const res = await fetch(`/api/parties?id=${id}`);
      if (!res.ok) throw new Error('Failed to fetch party');
      return await res.json();
    },
    add: async (party: Party) => {
      const res = await fetch('/api/parties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(party) });
      if (!res.ok) throw new Error('Failed to create party');
      return await res.json();
    },
    update: async (party: Party) => {
      const res = await fetch('/api/parties', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(party) });
      if (!res.ok) throw new Error('Failed to update party');
      return await res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/parties?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete party');
      return true;
    }
  },
  items: {
    list: async () => {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error('Failed to fetch items');
      return await res.json();
    },
    add: async (item: Item) => {
      const res = await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
      if (!res.ok) throw new Error('Failed to create item');
      return await res.json();
    },
    update: async (item: Item) => {
      const res = await fetch('/api/items', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
      if (!res.ok) throw new Error('Failed to update item');
      return await res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/items?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      return true;
    }
  },
  payments: {
    add: async (payment: Omit<Payment, 'id'>) => {
      await delay(500);
      const newPayment = { ...payment, id: Math.random().toString(36).substr(2, 9) };
      MOCK_PAYMENTS.unshift(newPayment);
      return newPayment;
    },
    list: async (partyId?: string) => {
      await delay(300);
      if (partyId) return MOCK_PAYMENTS.filter(p => p.partyId === partyId);
      return [...MOCK_PAYMENTS];
    }
  },
  invoices: {
    add: async (invoice: any) => {
      const res = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoice) });
      if (!res.ok) throw new Error('Failed to create invoice');
      return await res.json();
    },
    list: async () => {
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return await res.json();
    },
    get: async (id: string) => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) return null;
      return await res.json();
    }
  },
  reports: {
    getOutstanding: async () => {
      await delay(500);
      // Calculate Outstanding Balance for each party
      const report = MOCK_PARTIES.map(party => {
        // 1. Calculate Total Credit Sales (Receivables)
        const totalCreditSales = MOCK_INVOICES
          .filter(i => i.partyId === party.id && i.type === 'SALES' && i.paymentMode === 'credit')
          .reduce((sum, i) => sum + i.grandTotal, 0);

        // 2. Calculate Total Payments Received
        const totalReceived = MOCK_PAYMENTS
          .filter(p => p.partyId === party.id)
          .reduce((sum, p) => sum + p.amount, 0);

        // 3. Current Outstanding = Opening Balance + Credit Sales - Received
        const currentBalance = party.openingBalance + totalCreditSales - totalReceived;

        return {
          ...party,
          totalCreditSales,
          totalReceived,
          currentBalance
        };
      });
      
      return report;
    },
    getLedger: async (partyId: string, startDate?: string, endDate?: string) => {
      await delay(500);
      let transactions: any[] = [];
      const party = MOCK_PARTIES.find(p => p.id === partyId);
      if (!party) return [];

      // 1. Get Invoices (Debits/Credits)
      const invoices = MOCK_INVOICES.filter(i => i.partyId === partyId).map(i => ({
        id: i.invoiceNo,
        date: i.date,
        ref: i.invoiceNo,
        type: i.type === 'SALES' ? 'SALE' : 'PURCHASE',
        credit: i.type === 'PURCHASE' ? i.grandTotal : 0,
        debit: i.type === 'SALES' ? i.grandTotal : 0,
        desc: `${i.type === 'SALES' ? 'Sale' : 'Purchase'} Invoice`
      }));

      // 2. Get Payments (Credits/Debits)
      const payments = MOCK_PAYMENTS.filter(p => p.partyId === partyId).map(p => ({
        id: p.id,
        date: p.date,
        ref: p.reference || 'PAY-REC',
        type: 'PAYMENT',
        credit: party.type === 'Customer' ? p.amount : 0, // Customer paying reduces debit
        debit: party.type === 'Supplier' ? p.amount : 0, // Paying supplier reduces credit
        desc: `Payment (${p.mode})`
      }));

      // Merge and Sort
      transactions = [...invoices, ...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Filter by Date
      if (startDate && endDate) {
        transactions = transactions.filter(t => t.date >= startDate && t.date <= endDate);
      }

      // Calculate Running Balance
      let balance = party.openingBalance; // Simplified: Assuming opening balance is from start of time
      
      return transactions.map(t => {
        // Customer: Debit increases balance (receivable), Credit decreases it
        // Supplier: Credit increases balance (payable), Debit decreases it
        if (party.type === 'Customer') {
          balance = balance + t.debit - t.credit;
        } else {
          balance = balance + t.credit - t.debit;
        }
        return { ...t, balance };
      });
    },
    getStock: async () => {
      await delay(300);
      return MOCK_ITEMS.map(item => ({
        ...item,
        value: item.stock * item.purchaseRate
      }));
    }
  }
};
