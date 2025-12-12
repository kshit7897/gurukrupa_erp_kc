
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
  gstin?: string;
  phone?: string;
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  shippingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  openingBalance: number;
  type: PartyType;
  cin?: string;
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
  // Per-line tax split
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  taxType?: 'CGST_SGST' | 'IGST';
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
  // additional metadata
  payment_mode?: string;
  reverse_charge?: boolean;
  buyer_order_no?: string;
  supplier_ref?: string;
  vehicle_no?: string;
  delivery_date?: string;
  transport_details?: string;
  terms_of_delivery?: string;
  total_amount_in_words?: string;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  billingAddress?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    phone?: string;
  };
  shippingAddress?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    phone?: string;
  };
  // New generated fields
  invoice_no?: string;
  serial?: number;
  bill_type?: string;
  financial_year?: string;
}

export interface Company {
  id?: string;
  name?: string;
  gstNumber?: string;
  gstin?: string;
  cin?: string;
  phone?: string;
  contactNumbers?: string[];
  email?: string;
  address?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account_no?: string;
  ifsc_code?: string;
  upi_id?: string;
  declaration_text?: string[];
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
  permissions?: string[];
}

export interface PermissionNode {
  id: string;
  label: string;
  enabled: boolean;
  children?: PermissionNode[];
}
