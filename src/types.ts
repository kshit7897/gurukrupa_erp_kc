
export enum PartyType {
  CUSTOMER = 'Customer',
  SUPPLIER = 'Supplier'
}

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  ADMIN = 'Admin',
  STAFF = 'Staff'
}

export interface Party {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  gstNo: string;
  openingBalance: number;
  type: PartyType;
}

export interface Item {
  id: string;
  name: string;
  hsn: string;
  unit: string;
  purchaseRate: number;
  saleRate: number;
  taxPercent: number;
  barcode: string;
  stock: number;
}

export interface InvoiceItem {
  itemId: string;
  name: string;
  qty: number;
  rate: number;
  discountPercent: number;
  taxPercent: number;
  amount: number; // This represents Taxable Value (Qty * Rate - Discount)
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  partyId: string;
  partyName: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
  type: 'SALES' | 'PURCHASE';
  paymentMode: string;
  paymentDetails?: string; // Cheque No, Transaction ID, etc.
  dueDate?: string; // For Credit invoices
}

export interface Payment {
  id: string;
  partyId: string;
  amount: number;
  date: string;
  mode: string; // 'cash', 'online', 'cheque'
  reference?: string;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
}

export interface PermissionNode {
  id: string;
  label: string;
  enabled: boolean;
  children?: PermissionNode[];
}
