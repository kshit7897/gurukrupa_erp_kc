
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Input, Card, Modal, Select, SoftLoader } from './ui/Common';
import { Plus, Trash2, Search, User, ShoppingCart, Tag, MapPin, Phone, FileText, Package, AlertCircle, X, CalendarClock } from 'lucide-react';
import { InvoiceItem, Party, Item, Invoice, PartyType } from '../types';
import { api } from '../lib/api';
import { formatDate } from '../lib/formatDate';
import { numberToWords } from '../lib/numberToWords';
import { useRouter } from 'next/navigation';

interface TransactionFormProps {
  type: 'SALES' | 'PURCHASE';
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ type }) => {
  const isSales = type === 'SALES';
  const router = useRouter();
  // avoid using next/navigation's useSearchParams here to prevent SSR bailout during build
  // we'll read window.location.search inside effects where needed

  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [deliveryDateMeta, setDeliveryDateMeta] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [addedItems, setAddedItems] = useState<InvoiceItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [company, setCompany] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingInvoiceNo, setExistingInvoiceNo] = useState<string>('');
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [deliverySame, setDeliverySame] = useState<boolean>(true);
  const [shippingAddress, setShippingAddress] = useState<Partial<any>>({
    name: '', line1: '', line2: '', city: '', state: '', pincode: '', gstin: '', phone: ''
  });
  const [billingAddressState, setBillingAddressState] = useState<Partial<any>>({
    name: '', line1: '', line2: '', city: '', state: '', pincode: '', gstin: '', phone: ''
  });
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Validation State
  const [formError, setFormError] = useState<string | null>(null);

  // Line Item States
  const [currentQty, setCurrentQty] = useState<number | ''>(1);
  const [currentRate, setCurrentRate] = useState<number | ''>('');
  const [currentDiscount, setCurrentDiscount] = useState<number | ''>(0);
  const [currentTaxMode, setCurrentTaxMode] = useState<'CGST_SGST' | 'IGST'>('CGST_SGST');
  const [currentTaxPercent, setCurrentTaxPercent] = useState<number | ''>('');

  // Manual GST override at invoice level
  const [manualGstEnabled, setManualGstEnabled] = useState(false);
  const [manualGstAmount, setManualGstAmount] = useState<number | ''>('');
  const [manualGstMode, setManualGstMode] = useState<'CGST_SGST' | 'IGST'>('CGST_SGST');

  // Carting feature
  const [cartingEnabled, setCartingEnabled] = useState(false);
  const [selectedCartingParty, setSelectedCartingParty] = useState<Party | null>(null);
  const [cartingSearchQuery, setCartingSearchQuery] = useState('');
  const [showCartingDropdown, setShowCartingDropdown] = useState(false);
  const [currentCartingAmount, setCurrentCartingAmount] = useState<number | ''>(0);
  const [showCartingSeparately, setShowCartingSeparately] = useState(true);
  const cartingDropdownRef = useRef<HTMLDivElement>(null);

  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  const [newPartyData, setNewPartyData] = useState<Partial<Party>>({
    name: '', mobile: '', type: isSales ? PartyType.CUSTOMER : PartyType.SUPPLIER, email: '', gstNo: '', cin: '', address: '', openingBalance: 0
  });

  const [newItemData, setNewItemData] = useState<Partial<Item>>({
    name: '', hsn: '', unit: 'PCS', purchaseRate: 0, saleRate: 0, taxPercent: 18, stock: 0
  });

  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const itemDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsSaving(false);
    loadMasterData();
    const handleClickOutside = (event: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setShowPartyDropdown(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target as Node)) {
        setShowItemDropdown(false);
      }
      if (cartingDropdownRef.current && !cartingDropdownRef.current.contains(event.target as Node)) {
        setShowCartingDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // If URL contains ?id=..., load invoice for editing (read from window.location to avoid SSR bailout)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const sp = new URLSearchParams(window.location.search);
      const id = sp.get('id') || null;
      if (!id) return;
      setEditingId(id);
      (async () => {
        try {
          const inv: any = await api.invoices.get(id);
          if (!inv) return;
          // populate fields
          setExistingInvoiceNo(inv.invoiceNo || inv.invoice_no || '');
          setInvoiceDate(inv.date || new Date().toISOString().split('T')[0]);
          setPaymentMode(inv.paymentMode || inv.payment_mode || 'cash');
          setPaymentDetails(inv.paymentDetails || '');
          setVehicleNo(inv.vehicle_no || '');
          setDeliveryDateMeta(inv.delivery_date || new Date().toISOString().split('T')[0]);
          setDueDate(inv.dueDate || '');
          setShowCartingSeparately(inv.show_carting_separately ?? true);
          setCartingEnabled(inv.items?.some((it: any) => it.cartingAmount > 0) || false);
          // normalize item lines to the form's expected shape
          const normalizedItems = (Array.isArray(inv.items) ? inv.items : []).map((it: any) => {
            const qty = Number(it.qty || 0);
            const rate = Number((it.rate != null ? it.rate : it.price) || 0);
            const discountPercent = Number((it.discountPercent != null ? it.discountPercent : it.discount) || 0);
            const base = qty * rate;
            const discountAmount = base * (discountPercent / 100);
            const taxable = (it.amount != null) ? Number(it.amount) : (base - discountAmount);
            const taxPercent = Number((it.taxPercent != null ? it.taxPercent : it.tax) || 0);
            const cgst = Number(it.cgstAmount || 0);
            const sgst = Number(it.sgstAmount || 0);
            const igst = Number(it.igstAmount || 0);
            const taxType = it.taxType || 'CGST_SGST';
            // fallback name from master items if missing
            let name = it.name || '';
            try {
              if (!name && it.itemId) {
                const master = items.find(m => (m as any).id === it.itemId);
                if (master) name = master.name;
              }
            } catch { /* ignore */ }
            return {
              itemId: it.itemId || it.item_id || '',
              name,
              qty,
              rate,
              discountPercent,
              taxPercent,
              amount: taxable,
              cgstAmount: cgst,
              sgstAmount: sgst,
              igstAmount: igst,
              taxType,
              cartingAmount: Number(it.cartingAmount || 0),
              cartingPartyId: it.cartingPartyId || '',
              cartingPartyName: it.cartingPartyName || ''
            } as any;
          });
          setAddedItems(normalizedItems);
          setBillingAddressState(inv.billingAddress || {});
          setShippingAddress(inv.shippingAddress || {});
          try {
            const p = await api.parties.get(inv.partyId);
            if (p) {
              setSelectedParty(p as Party);
              setPartySearchQuery((p as Party).name || inv.partyName || '');
              setShowPartyDropdown(false);
            } else {
              // fallback to invoice partyName so input shows a value
              setPartySearchQuery(inv.partyName || '');
            }
          } catch (e) { console.error('Failed to load party for edit', e); }
        } catch (e) {
          console.error('Failed to load invoice for edit', e);
        }
      })();
    } catch (err) { /* ignore */ }
  }, []);

  // Effect to calculate Due Date when mode changes to Credit
  useEffect(() => {
    if (paymentMode === 'credit') {
      const date = new Date(invoiceDate);
      date.setDate(date.getDate() + 15); // Add 15 days
      setDueDate(date.toISOString().split('T')[0]);
    } else {
      setDueDate('');
    }
  }, [paymentMode, invoiceDate]);

  const loadMasterData = async () => {
    try {
      const p = await api.parties.list();
      const i = await api.items.list();
      setParties(p);
      setItems(i);
      try {
        const res = await fetch('/api/company');
        if (res.ok) {
          const data = await res.json();
          setCompany(data?.company || null);
        }
      } catch (e) { /* ignore */ }
    } catch (error) {
      console.error("Failed to load master data", error);
    }
  };

  const showError = (msg: string) => {
    setFormError(msg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setFormError(null), 4000);
  };

  const handlePartySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPartySearchQuery(val);
    setShowPartyDropdown(true);
    if (selectedParty && selectedParty.name !== val) {
      setSelectedParty(null);
    }
  };

  const handleSelectParty = (party: Party) => {
    setPartySearchQuery(party.name);
    setSelectedParty(party);
    setShowPartyDropdown(false);
    setFormError(null);
    // derive billing address from party if available
    const billing = {
      name: party.name,
      line1: party.billingAddress?.line1 || party.address || '',
      line2: party.billingAddress?.line2 || '',
      city: party.billingAddress?.city || '',
      state: party.billingAddress?.state || '',
      pincode: party.billingAddress?.pincode || '',
      gstin: party.gstin || party.gstNo || '',
      phone: party.phone || party.mobile || ''
    };
    setBillingAddressState(billing);
    // if deliverySame is true (default), copy billing to shipping
    if (deliverySame) {
      setShippingAddress({ ...billing });
    }
  };

  const openNewPartyModal = () => {
    setNewPartyData({
      name: partySearchQuery,
      mobile: '',
      type: isSales ? PartyType.CUSTOMER : PartyType.SUPPLIER,
      gstNo: '',
      address: '',
      openingBalance: 0
    });
    setIsPartyModalOpen(true);
    setShowPartyDropdown(false);
  };

  const handleSaveNewParty = async () => {
    // validation
    if (!newPartyData.name) { showError('Party Name is required.'); return; }
    const mobile = (newPartyData.mobile || '').toString().replace(/\D/g, '');
    // Mobile is now optional
    // if (!mobile) { showError('Mobile number is required.'); return; }
    if (mobile && mobile.length !== 10) { showError('Mobile number must be 10 digits.'); return; }
    if (newPartyData.email) {
      const em = (newPartyData.email || '').toString();
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(em)) { showError('Invalid email address.'); return; }
    }
    try {
      const created = await api.parties.add(newPartyData as Party);
      setParties([created, ...parties]);
      handleSelectParty(created);
      setIsPartyModalOpen(false);
    } catch (e) {
      showError("Failed to create party. Please try again.");
    }
  };

  const handleItemSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setItemSearchQuery(val);
    setShowItemDropdown(true);
    if (selectedItem && selectedItem.name !== val) {
      setSelectedItem(null);
      setCurrentRate('');
    }
  };

  const handleSelectItem = (item: Item) => {
    setItemSearchQuery(item.name);
    setSelectedItem(item);
    setCurrentRate(isSales ? item.saleRate : item.purchaseRate);
    setCurrentTaxPercent(item.taxPercent || '');
    setShowItemDropdown(false);
    setFormError(null);
  };

  const openNewItemModal = () => {
    setNewItemData({
      name: itemSearchQuery,
      hsn: '',
      unit: 'PCS',
      purchaseRate: 0,
      saleRate: 0,
      taxPercent: 18,
      stock: 0
    });
    setIsItemModalOpen(true);
    setShowItemDropdown(false);
  };

  const handleSaveNewItem = async () => {
    if (!newItemData.name) {
      showError("Product Name is required.");
      return;
    }
    try {
      const created = await api.items.add(newItemData as Item);
      setItems([created, ...items]);
      handleSelectItem(created);
      setIsItemModalOpen(false);
    } catch (e) {
      showError("Failed to create item.");
    }
  };

  const handleAddItemToInvoice = () => {
    if (!selectedItem) {
      showError("Please select a valid product from the list first.");
      return;
    }
    if (currentQty === '' || Number(currentQty) <= 0) {
      showError("Please enter a valid quantity (greater than 0).");
      return;
    }
    if (currentRate === '') {
      showError("Please enter a valid rate.");
      return;
    }
    // Validate carting if enabled
    if (cartingEnabled && !selectedCartingParty) {
      showError("Please select a carting party or disable carting.");
      return;
    }

    const qty = Number(currentQty);
    const rate = Number(currentRate);
    const discount = Number(currentDiscount) || 0;
    const cartingPerUnit = cartingEnabled ? Number(currentCartingAmount) || 0 : 0;
    const totalLineCarting = cartingPerUnit * qty;

    // Calculate Base Amount (Rate * Qty)
    const baseAmount = qty * rate;
    // Calculate Discount Amount
    const discountAmount = baseAmount * (discount / 100);
    // Calculate Taxable Value (Amount) - includes carting if enabled
    const taxableValue = baseAmount - discountAmount + totalLineCarting;

    // calculate taxes on merged amount (including carting)
    const taxPct = Number(currentTaxPercent || selectedItem.taxPercent || 0);
    const gstAmt = taxableValue * (taxPct / 100);
    let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;
    if (currentTaxMode === 'CGST_SGST') { cgstAmt = gstAmt / 2; sgstAmt = gstAmt / 2; }
    else { igstAmt = gstAmt; }

    const newItemLine: InvoiceItem & { cartingAmount?: number; cartingPartyId?: string; cartingPartyName?: string } = {
      itemId: selectedItem.id,
      name: selectedItem.name,
      qty: qty,
      rate: rate,
      discountPercent: discount,
      taxPercent: taxPct,
      amount: taxableValue, // Store as Taxable Value (includes carting)
      cgstAmount: cgstAmt,
      sgstAmount: sgstAmt,
      igstAmount: igstAmt,
      taxType: currentTaxMode,
      // Carting details
      cartingAmount: totalLineCarting,
      cartingPartyId: selectedCartingParty?.id,
      cartingPartyName: selectedCartingParty?.name
    };

    setAddedItems([...addedItems, newItemLine as InvoiceItem]);
    setSelectedItem(null);
    setItemSearchQuery('');
    setCurrentQty(1);
    setCurrentRate('');
    setCurrentDiscount(0);
    setCurrentTaxPercent('');
    // Reset carting for next item
    setCurrentCartingAmount(0);
    setFormError(null); // Clear any previous errors
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...addedItems];
    newItems.splice(index, 1);
    setAddedItems(newItems);
  };

  // Calculations - Memoized to prevent re-calc on every render
  const { subtotal, cgstTotal, sgstTotal, igstTotal, computedTaxTotal, totalCartingAmt } = useMemo(() => {
    const s = addedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const c = addedItems.reduce((sum, item) => sum + (item.cgstAmount || 0), 0);
    const sg = addedItems.reduce((sum, item) => sum + (item.sgstAmount || 0), 0);
    const i = addedItems.reduce((sum, item) => sum + (item.igstAmount || 0), 0);
    const cart = addedItems.reduce((sum, item) => sum + ((item as any).cartingAmount || 0), 0);
    return {
      subtotal: s,
      cgstTotal: c,
      sgstTotal: sg,
      igstTotal: i,
      computedTaxTotal: c + sg + i,
      totalCartingAmt: cart
    };
  }, [addedItems]);

  // If manual GST override is enabled, use manual values instead of computed ones
  const { effectiveCgstTotal, effectiveSgstTotal, effectiveIgstTotal, taxTotal, total } = useMemo(() => {
    const manualTax = Number(manualGstAmount || 0);
    const effCgst = manualGstEnabled ? (manualGstMode === 'CGST_SGST' ? manualTax / 2 : 0) : cgstTotal;
    const effSgst = manualGstEnabled ? (manualGstMode === 'CGST_SGST' ? manualTax / 2 : 0) : sgstTotal;
    const effIgst = manualGstEnabled ? (manualGstMode === 'IGST' ? manualTax : 0) : igstTotal;
    const tTotal = manualGstEnabled ? (effCgst + effSgst + effIgst) : computedTaxTotal;
    return {
      effectiveCgstTotal: effCgst,
      effectiveSgstTotal: effSgst,
      effectiveIgstTotal: effIgst,
      taxTotal: tTotal,
      total: subtotal + tTotal
    };
  }, [manualGstAmount, manualGstEnabled, manualGstMode, cgstTotal, sgstTotal, igstTotal, computedTaxTotal, subtotal]);

  // Live calculation for the input line - Memoized
  const { liveBase, liveDisc, liveCarting, liveTaxable } = useMemo(() => {
    const qty = Number(currentQty) || 0;
    const base = qty * (Number(currentRate) || 0);
    const disc = base * ((Number(currentDiscount) || 0) / 100);
    const cart = cartingEnabled ? (Number(currentCartingAmount) || 0) * qty : 0;
    return { liveBase: base, liveDisc: disc, liveCarting: cart, liveTaxable: base - disc + cart };
  }, [currentQty, currentRate, currentDiscount, cartingEnabled, currentCartingAmount]);

  const handleSaveInvoice = async () => {
    if (!selectedParty) {
      showError("Please select a Party (Customer/Supplier) before generating the invoice.");
      return;
    }
    if (addedItems.length === 0) {
      showError("Invoice is empty. Please add at least one item.");
      return;
    }
    // --- NEGATIVE STOCK HANDLING ---
    // Client-side: allow sale even if stock is insufficient or negative.
    // Show a non-blocking warning if any item will result in negative stock, but do NOT block the sale.
    if (isSales) {
      const itemMap: Record<string, Item> = {};
      items.forEach(i => { if (i && (i as any).id) itemMap[(i as any).id] = i; });
      const warnings: string[] = [];
      for (const line of addedItems) {
        const iid = (line as any).itemId;
        const master = itemMap[iid];
        if (!master) {
          warnings.push(`Item not found: ${line.name || iid}`);
          continue;
        }
        const available = Number(master.stock || 0);
        const required = Number(line.qty || 0);
        if (required > available) {
          warnings.push(`${master.name}: available ${available}, required ${required} (stock will go negative)`);
        }
      }
      if (warnings.length > 0) {
        // Show warning but do NOT block the sale
        alert('Warning: Some items have insufficient stock. Sale will proceed and stock will go negative.\n' + warnings.join('; '));
      }
    }
    if (paymentMode !== 'cash' && paymentMode !== 'credit' && !paymentDetails) {
      if (!confirm('You have not entered payment remarks (Cheque No/Trans ID). Continue?')) return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const invoiceNo = editingId ? (existingInvoiceNo || `INV-${Math.floor(Math.random() * 100000)}`) : `INV-${Math.floor(Math.random() * 100000)}`;
      const newInvoice: any = {
        invoiceNo,
        date: invoiceDate,
        partyId: selectedParty.id,
        partyName: selectedParty.name,
        items: addedItems,
        subtotal,
        taxAmount: taxTotal,
        roundOff: 0,
        grandTotal: total,
        type: type,
        paymentMode,
        paymentDetails,
        dueDate: paymentMode === 'credit' ? dueDate : undefined
        ,
        // invoice metadata
        buyer_order_no: invoiceNo,
        vehicle_no: vehicleNo,
        delivery_date: deliveryDateMeta,
        // GST split totals (respect manual override when enabled)
        cgstAmount: effectiveCgstTotal,
        sgstAmount: effectiveSgstTotal,
        igstAmount: effectiveIgstTotal,
        // manual GST metadata
        manualGst: {
          enabled: manualGstEnabled,
          amount: manualGstEnabled ? Number(manualGstAmount || 0) : 0,
          mode: manualGstMode
        },
        // billing/shipping saved elsewhere in the payload (handled earlier)
        // save billing and shipping addresses with invoice
        billingAddress: {
          name: billingAddressState.name || selectedParty.name,
          line1: billingAddressState.line1 || selectedParty.address || '',
          line2: billingAddressState.line2 || '',
          city: billingAddressState.city || '',
          state: billingAddressState.state || '',
          pincode: billingAddressState.pincode || '',
          gstin: billingAddressState.gstin || selectedParty.gstNo || '',
          phone: billingAddressState.phone || selectedParty.mobile || ''
        },
        shippingAddress: {
          name: shippingAddress.name || billingAddressState.name || selectedParty.name,
          line1: shippingAddress.line1 || billingAddressState.line1 || selectedParty.address || '',
          line2: shippingAddress.line2 || billingAddressState.line2 || '',
          city: shippingAddress.city || billingAddressState.city || '',
          state: shippingAddress.state || billingAddressState.state || '',
          pincode: shippingAddress.pincode || billingAddressState.pincode || '',
          gstin: shippingAddress.gstin || billingAddressState.gstin || selectedParty.gstNo || '',
          phone: shippingAddress.phone || billingAddressState.phone || selectedParty.mobile || ''
        },
        show_carting_separately: showCartingSeparately
      };

      if (editingId) {
        const savedInvoice = await api.invoices.update(editingId, newInvoice);
        router.replace(`/admin/invoice/${savedInvoice.id}?saved=1`);
      } else {
        const savedInvoice = await api.invoices.add(newInvoice);
        // Redirect to preview and indicate saved so preview can show a success banner
        router.replace(`/admin/invoice/${savedInvoice.id}?saved=1`);
      }

    } catch (error: any) {
      console.error("Failed to save transaction", error);
      const msg = (error && error.message) ? error.message : "Failed to save transaction. Please check your connection and try again.";
      showError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredParties = parties.filter(p => {
    // For sales: show customers; for purchase: show suppliers
    // Also support new multi-role system
    const roles = (p as any).roles || [p.type];
    const targetRole = isSales ? 'Customer' : 'Supplier';

    // Strict check: Must have the specific role AND not be a system account (Cash/Bank/UPI)
    // System accounts are handled elsewhere or should not be selected as the primary party for an invoice
    if (p.isSystemAccount) return false;

    // Check if role exists (case-insensitive just in case, though enum is strict)
    const matchesRole = roles.some((r: any) => r && r.toString().toLowerCase() === targetRole.toLowerCase());

    // Fallback: check p.type for backward compatibility
    const matchesType = (p.type || '').toString().toLowerCase() === (isSales ? PartyType.CUSTOMER : PartyType.SUPPLIER).toLowerCase();

    return (matchesRole || matchesType) && p.name.toLowerCase().includes(partySearchQuery.toLowerCase());
  });

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  // Filter carting parties - only show parties with 'Carting' role
  const cartingParties = parties.filter(p => {
    const roles = (p as any).roles || [];
    return roles.includes('Carting') && p.name.toLowerCase().includes(cartingSearchQuery.toLowerCase());
  });

  const handleSelectCartingParty = (party: Party) => {
    setSelectedCartingParty(party);
    setCartingSearchQuery(party.name);
    setShowCartingDropdown(false);
  };

  const unitOptions = [
    { label: 'PCS (Pieces)', value: 'PCS' },
    { label: 'KG (Kilograms)', value: 'KG' },
    { label: 'BOX (Boxes)', value: 'BOX' },
    { label: 'BAG (Bags)', value: 'BAG' },
    { label: 'TON (Tons)', value: 'TON' },
    { label: 'LTR (Liters)', value: 'LTR' },
    { label: 'MTR (Meters)', value: 'MTR' },
    { label: 'DOZ (Dozens)', value: 'DOZ' },
    { label: 'BDL (Bundles)', value: 'BDL' },
    { label: 'SQFT (Sq. Feet)', value: 'SQFT' },
    { label: 'PKT (Packets)', value: 'PKT' },
    { label: 'SET (Sets)', value: 'SET' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-300">

      {/* HEADER & ERROR BANNER */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          {isSales ? <ShoppingCart className="text-blue-600" /> : <ShoppingCart className="text-amber-600" />}
          {editingId ? (isSales ? 'Edit Sale Entry' : 'Edit Purchase Entry') : (isSales ? 'New Sale Entry' : 'New Purchase Entry')}
        </h1>

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-sm">Action Required</h4>
              <p className="text-sm">{formError}</p>
            </div>
            <button onClick={() => setFormError(null)} className="text-red-400 hover:text-red-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <Card className="bg-white p-5 space-y-5 shadow-sm border border-slate-200">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <User className="h-3 w-3" /> Party Details
          </h3>
          {selectedParty && (
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">VERIFIED</span>
          )}
        </div>

        <div className="space-y-4">
          <div className="relative" ref={partyDropdownRef}>
            <label className="text-xs text-slate-500 mb-1 block font-semibold">Select Party</label>
            <div className="relative">
              <input
                type="text"
                className={`w-full h-11 bg-slate-50 border text-slate-900 rounded-lg pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${!selectedParty && formError?.includes('Party') ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'}`}
                placeholder={isSales ? "Search Customer..." : "Search Supplier..."}
                value={partySearchQuery}
                onChange={handlePartySearchChange}
                onFocus={() => setShowPartyDropdown(true)}
              />
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            </div>

            {showPartyDropdown && partySearchQuery && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {filteredParties.length > 0 ? (
                  filteredParties.map(p => (
                    <div
                      key={p.id}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                      onClick={() => handleSelectParty(p)}
                    >
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.mobile} • {p.address || 'No Address'}</p>
                    </div>
                  ))
                ) : (
                  <div
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-blue-600 font-medium flex items-center gap-2"
                    onClick={openNewPartyModal}
                  >
                    <Plus className="h-4 w-4" /> Add New Party "{partySearchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => {
                  setPaymentMode(e.target.value);
                  setPaymentDetails('');
                }}
                className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            {paymentMode === 'credit' ? (
              <div className="animate-in fade-in">
                <label className="text-xs text-slate-500 mb-1 block">Due Date (Auto)</label>
                <div className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm flex items-center text-slate-600">
                  <CalendarClock className="h-4 w-4 mr-2 text-slate-400" />
                  {dueDate}
                </div>
              </div>
            ) : paymentMode !== 'cash' ? (
              <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                <label className="text-xs text-slate-500 mb-1 block">
                  {paymentMode === 'cheque' ? 'Cheque No / Bank' : 'Transaction ID / UTR'}
                </label>
                <input
                  type="text"
                  placeholder={paymentMode === 'cheque' ? "e.g. 000123 HDFC Bank" : "e.g. UPI/12345/..."}
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  className="w-full h-10 bg-white border border-blue-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>
            ) : (
              <div className="hidden md:block"></div>
            )}
          </div>
          {/* Invoice Metadata (Vehicle, Delivery, Transport, Terms). Buyer's Order No will be auto-set. Supplier's Ref removed. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Vehicle Number</label>
              <input type="text" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} placeholder="e.g. MH12AB1234" className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Delivery Date</label>
              <input type="date" value={deliveryDateMeta} onChange={(e) => setDeliveryDateMeta(e.target.value)} className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">&nbsp;</label>
              <div />
            </div>
            <div className="md:col-span-2">
              {/* Removed Transport Details (per request) */}
            </div>
          </div>
        </div>
      </Card>

      {/* Print-only invoice preview: hidden on screen, visible only when printing */}
      <div className="hidden print:block">
        <style>{`@media print { #invoice-scaled { transform: none !important; width: 210mm !important; margin-bottom: 0 !important; } #invoice-content { box-shadow: none !important; min-height: auto !important; padding: 0 !important; } }`}</style>
        <div id="invoice-scaled" className="relative print:w-full" style={{ width: '210mm' }}>
          <div id="invoice-content" className="bg-white min-h-[297mm] text-slate-900 print:w-full print:m-0" style={{ padding: '10mm 12mm' }}>
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
              <div className="flex items-center gap-6 w-2/3">
                {/* <div className="w-28 h-28 bg-slate-100 rounded-md flex items-center justify-center border border-slate-200 overflow-hidden"> */}
                <div className="w-60 h-60 bg-slate-100 rounded-md flex items-center justify-center border border-slate-200 overflow-hidden">
                  {company?.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={company.logo} alt="logo" className="w-full h-full object-contain" />
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="14" rx="2" fill="#0EA5A4" /><path d="M7 10h10v4H7z" fill="white" /></svg>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{company?.name || 'Company Name'}</h1>
                  <div className="text-sm text-slate-600 leading-tight mt-1">
                    <div>{company?.address_line_1 || company?.address || ''}</div>
                    {company?.address_line_2 && <div>{company.address_line_2}</div>}
                    <div>{company?.city ? `${company.city} - ${company?.pincode || ''}` : ''} {company?.state ? `, ${company.state}` : ''}</div>
                    <div className="mt-1">Contact: {company?.contactNumbers?.join(', ') || company?.phone || '-'}</div>
                    <div className="mt-1 font-semibold">GSTIN: {company?.gstin || company?.gstNumber || '-'}</div>
                  </div>
                </div>
              </div>
              <div className="w-1/3 text-right">
                <div className="inline-block text-sm text-slate-700 font-bold bg-slate-100 px-3 py-1 rounded border border-slate-200">{isSales ? (paymentMode === 'cash' ? 'CASH MEMO' : 'TAX INVOICE') : 'PURCHASE VOUCHER'}</div>
                <div className="mt-3 text-sm text-right">
                  <div className="flex justify-end"><div className="w-40 text-slate-600">Invoice No.</div><div className="w-48 font-bold text-slate-900">{existingInvoiceNo || `INV-${Math.floor(Math.random() * 100000)}`}</div></div>
                  <div className="flex justify-end mt-1"><div className="w-40 text-slate-600">Inv. Date</div><div className="w-48">{formatDate(invoiceDate)}</div></div>
                  <div className="flex justify-end mt-1"><div className="w-40 text-slate-600">Payment Mode</div><div className="w-48">{paymentMode}</div></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 grid-rows-2 gap-4 mb-4">
              <div className="col-span-3 row-span-2 flex flex-col gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded p-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Bill To</div>
                  <div className="mt-2 text-sm font-semibold text-slate-800">{billingAddressState.name || selectedParty?.name || partySearchQuery}</div>
                  <div className="mt-1 text-sm text-slate-600 leading-tight">
                    {billingAddressState.line1 || ''}
                    {billingAddressState.line2 && (<div>{billingAddressState.line2}</div>)}
                    <div>{billingAddressState.city || ''}{billingAddressState.pincode ? ` - ${billingAddressState.pincode}` : ''}</div>
                    <div className="mt-1">Phone: {billingAddressState.phone || selectedParty?.mobile || '-'}</div>
                    <div className="mt-1">GSTIN: {billingAddressState.gstin || selectedParty?.gstNo || '-'}</div>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded p-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Ship To</div>
                  <div className="mt-2 text-sm font-semibold text-slate-800">{shippingAddress.name || billingAddressState.name || selectedParty?.name}</div>
                  <div className="mt-1 text-sm text-slate-600 leading-tight">
                    {shippingAddress.line1 || ''}
                    {shippingAddress.line2 && (<div>{shippingAddress.line2}</div>)}
                    <div>{shippingAddress.city || ''}{shippingAddress.pincode ? ` - ${shippingAddress.pincode}` : ''}</div>
                    <div className="mt-1">GSTIN: {shippingAddress.gstin || billingAddressState.gstin || selectedParty?.gstNo || '-'}</div>
                  </div>
                </div>
              </div>
              <div className="col-span-2 row-span-2">
                <div className="border border-slate-100 rounded p-3 text-sm h-full flex items-start bg-white">
                  <div className="w-full space-y-2 text-slate-600">
                    <div className="flex justify-between items-center">
                      <div className="w-40 font-medium text-slate-700">Buyer&apos;s Order No</div>
                      <div className="text-right text-slate-900 whitespace-nowrap ml-4">{existingInvoiceNo || '-'}</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="w-40 font-medium text-slate-700">Vehicle Number</div>
                      <div className="text-right text-slate-900 whitespace-nowrap ml-4">{vehicleNo || '-'}</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="w-40 font-medium text-slate-700">Delivery Date</div>
                      <div className="text-right text-slate-900 whitespace-nowrap ml-4">{deliveryDateMeta || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-left text-xs">
                    <th className="py-2 px-2 w-8">Sr</th>
                    <th className="py-2 px-2">Goods & Service Description</th>
                    <th className="py-2 px-2 w-16 text-right">HSN</th>
                    <th className="py-2 px-2 w-20 text-right">Quantity</th>
                    <th className="py-2 px-2 w-24 text-right">Rate</th>
                    <th className="py-2 px-2 w-24 text-right">Taxable</th>
                    <th className="py-2 px-2 w-16 text-right">%</th>
                    <th className="py-2 px-2 w-24 text-right">GST Amt.</th>
                    <th className="py-2 px-2 w-28 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {addedItems.map((item, index) => {
                    const taxable = (item.amount || (item.qty * item.rate)) || 0;
                    const gstAmt = taxable * ((item.taxPercent || 0) / 100);
                    const lineTotal = taxable + gstAmt;
                    return (
                      <tr key={index} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 px-2 text-slate-500">{index + 1}</td>
                        <td className="py-3 px-2 font-semibold text-slate-800">{item.name}</td>
                        <td className="py-3 px-2 text-right text-slate-500">{(item as any).hsn || '-'}</td>
                        <td className="py-3 px-2 text-right">{item.qty}</td>
                        <td className="py-3 px-2 text-right">{item.rate?.toFixed ? item.rate.toFixed(2) : item.rate}</td>
                        <td className="py-3 px-2 text-right">{taxable.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right">{item.taxPercent}%</td>
                        <td className="py-3 px-2 text-right">{gstAmt.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right font-bold">{lineTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4 mt-4 justify-end">
              <div className="w-1/3 bg-white border border-slate-100 rounded p-3 text-sm">
                <div className="mb-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={manualGstEnabled} onChange={(e) => setManualGstEnabled(e.target.checked)} className="form-checkbox" />
                    <span className="text-sm text-slate-700">Enable manual GST override</span>
                  </label>
                </div>
                {manualGstEnabled && (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" step="0.01" value={manualGstAmount as any} onChange={(e) => setManualGstAmount(e.target.value === '' ? '' : Number(e.target.value))} placeholder="GST Amount" className="w-32 h-8 px-2 border rounded" />
                      <select value={manualGstMode} onChange={(e) => setManualGstMode(e.target.value as any)} className="h-8 px-2 border rounded">
                        <option value="CGST_SGST">CGST + SGST</option>
                        <option value="IGST">IGST</option>
                      </select>
                    </div>
                    <div className="text-xs text-slate-500">Manual GST will replace computed GST totals when enabled.</div>
                  </div>
                )}
                <div className="flex justify-between"><div className="text-slate-600">Subtotal</div><div className="font-bold">₹ {subtotal.toFixed(2)}</div></div>
                <div className="flex justify-between mt-1"><div className="text-slate-600">CGST</div><div className="font-bold">₹ {effectiveCgstTotal.toFixed(2)}</div></div>
                <div className="flex justify-between mt-1"><div className="text-slate-600">SGST</div><div className="font-bold">₹ {effectiveSgstTotal.toFixed(2)}</div></div>
                <div className="flex justify-between mt-1"><div className="text-slate-600">IGST</div><div className="font-bold">₹ {effectiveIgstTotal.toFixed(2)}</div></div>
                <div className="flex justify-between mt-2 border-t pt-2"><div className="text-slate-700 font-semibold">Total</div><div className="text-xl font-extrabold">₹ {total.toFixed(2)}</div></div>
                <div className="mt-2 text-xs text-slate-600">Amount in words: {numberToWords(Math.round(total))} only</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SHIPPING / DELIVERY ADDRESS */}
      <Card className="bg-white p-5 space-y-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-3 w-3" /> Delivery Address
          </h3>
          <div className="text-sm text-slate-500">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={deliverySame} onChange={(e) => { setDeliverySame(e.target.checked); if (e.target.checked) { setShippingAddress({ ...billingAddressState }); } }} className="h-4 w-4" />
              <span className="text-sm">Delivery address same as party address</span>
            </label>
          </div>
        </div>

        <div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Name</label>
            <input type="text" value={shippingAddress.name} onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })} disabled={deliverySame} readOnly={deliverySame} className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm" />
          </div>
          {/* Show fields only when user unchecks deliverySame */}
          {!deliverySame && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Address Line 1</label>
                <input type="text" value={shippingAddress.line1} onChange={(e) => setShippingAddress({ ...shippingAddress, line1: e.target.value })} className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">City</label>
                <input type="text" value={shippingAddress.city} onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })} className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Address Line 2</label>
                <input type="text" value={shippingAddress.line2} onChange={(e) => setShippingAddress({ ...shippingAddress, line2: e.target.value })} className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">State</label>
                <input type="text" value={shippingAddress.state} onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })} className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Pincode</label>
                <input type="text" value={shippingAddress.pincode} onChange={(e) => setShippingAddress({ ...shippingAddress, pincode: e.target.value })} className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">GSTIN</label>
                <input type="text" value={shippingAddress.gstin} onChange={(e) => setShippingAddress({ ...shippingAddress, gstin: e.target.value })} className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Phone</label>
                <input type="text" value={shippingAddress.phone} onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })} className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm" />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ITEM ENTRY SECTION */}
      <div className={`bg-blue-50/50 p-5 rounded-xl border space-y-4 shadow-sm transition-colors ${formError?.includes('valid product') || formError?.includes('quantity') || formError?.includes('rate') ? 'border-red-200 bg-red-50/30' : 'border-blue-100'}`}>
        <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-2">
          <Tag className="h-3 w-3" /> Add Items
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">

          <div className="md:col-span-4 relative" ref={itemDropdownRef}>
            <label className="text-xs text-slate-500 mb-1 block ml-1">Product Name</label>
            <div className="relative">
              <input
                type="text"
                className={`w-full h-11 bg-white border text-slate-900 rounded-lg pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${!selectedItem && formError?.includes('valid product') ? 'border-red-300 ring-2 ring-red-100' : 'border-blue-200'}`}
                placeholder="Search Item..."
                value={itemSearchQuery}
                onChange={handleItemSearchChange}
                onFocus={() => setShowItemDropdown(true)}
              />
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>

            {showItemDropdown && itemSearchQuery && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {filteredItems.length > 0 ? (
                  filteredItems.map(i => (
                    <div
                      key={i.id}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between"
                      onClick={() => handleSelectItem(i)}
                    >
                      <div>
                        <p className="font-medium text-slate-900">{i.name}</p>
                        <p className="text-xs text-slate-500">Stock: {i.stock} {i.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-700">₹ {isSales ? i.saleRate : i.purchaseRate}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-blue-600 font-medium flex items-center gap-2"
                    onClick={openNewItemModal}
                  >
                    <Plus className="h-4 w-4" /> Add New Product "{itemSearchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-500 mb-1 block ml-1">Qty</label>
            <input
              type="number"
              className={`w-full h-11 bg-white border rounded-lg px-3 text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${(!currentQty || Number(currentQty) <= 0) && formError?.includes('quantity') ? 'border-red-300 ring-2 ring-red-100' : 'border-blue-200'}`}
              value={currentQty}
              onChange={(e) => setCurrentQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-500 mb-1 block ml-1">Rate (₹)</label>
            <input
              type="number"
              className={`w-full h-11 bg-white border rounded-lg px-3 text-right font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm ${currentRate === '' && formError?.includes('rate') ? 'border-red-300 ring-2 ring-red-100' : 'border-blue-200'}`}
              value={currentRate === null ? '' : currentRate}
              onChange={(e) => setCurrentRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-500 mb-1 block ml-1">Disc (%)</label>
            <input
              type="number"
              className="w-full h-11 bg-white border border-blue-200 rounded-lg px-3 text-right font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              placeholder="0"
              value={currentDiscount}
              onChange={(e) => setCurrentDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="0" step="0.01"
                className="w-20 h-8 px-2 border rounded text-right"
                placeholder="GST %"
                value={currentTaxPercent as any}
                onChange={(e) => setCurrentTaxPercent(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <select value={currentTaxMode} onChange={(e) => setCurrentTaxMode(e.target.value as any)} className="h-8 px-2 border rounded text-sm">
                <option value="CGST_SGST">CGST+SGST</option>
                <option value="IGST">IGST</option>
              </select>
            </div>
          </div>
        </div>

        {/* Carting Section */}
        <div className="mt-4 p-3 bg-orange-50/50 border border-orange-100 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cartingEnabled}
                onChange={(e) => {
                  setCartingEnabled(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedCartingParty(null);
                    setCartingSearchQuery('');
                    setCurrentCartingAmount(0);
                  }
                }}
                className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-orange-800">Add Carting Charges</span>
            </label>
            <span className="text-xs text-orange-600">(Merged into item amount, GST calculated on total)</span>
          </div>

          {cartingEnabled && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCartingSeparately}
                    onChange={(e) => setShowCartingSeparately(e.target.checked)}
                    className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-orange-800">Show Carting Separately in Invoice</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative" ref={cartingDropdownRef}>
                  <label className="text-xs text-slate-500 mb-1 block">Carting Party</label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full h-10 bg-white border rounded-lg pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500 ${!selectedCartingParty && cartingEnabled ? 'border-orange-300' : 'border-slate-200'}`}
                      placeholder="Search carting party..."
                      value={cartingSearchQuery}
                      onChange={(e) => {
                        setCartingSearchQuery(e.target.value);
                        setShowCartingDropdown(true);
                        if (selectedCartingParty && selectedCartingParty.name !== e.target.value) {
                          setSelectedCartingParty(null);
                        }
                      }}
                      onFocus={() => setShowCartingDropdown(true)}
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  </div>

                  {showCartingDropdown && cartingSearchQuery && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {cartingParties.length > 0 ? (
                        cartingParties.map(p => (
                          <div
                            key={p.id}
                            className="px-4 py-2 hover:bg-orange-50 cursor-pointer border-b border-slate-50 last:border-0"
                            onClick={() => handleSelectCartingParty(p)}
                          >
                            <p className="font-medium text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.mobile}</p>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-orange-600 text-sm">
                          No carting parties found. Add a party with "Carting" role first.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Carting Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-right font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                    value={currentCartingAmount}
                    onChange={(e) => setCurrentCartingAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleAddItemToInvoice}
            className="px-6 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" /> Add Item to Invoice
          </button>
        </div>

        {selectedItem && (
          <div className="flex justify-end px-1">
            <p className="text-xs text-blue-600 font-medium">
              Line Total: ₹ {liveTaxable.toFixed(2)}
              <span className="text-slate-400 font-normal ml-1">
                (Taxable Value{liveCarting > 0 ? ` incl. ₹${liveCarting.toFixed(2)} total carting` : ''})
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {addedItems.length === 0 ? (
          <div className={`text-center py-10 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed ${formError?.includes('empty') ? 'border-red-300 bg-red-50/20' : 'border-slate-200'}`}>
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No items added yet</p>
            <p className="text-xs mt-1">Search and add products above</p>
          </div>
        ) : (
          addedItems.map((item, index) => {
            const itemWithCarting = item as any;
            return (
              <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group hover:border-blue-200 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg text-slate-500 text-xs font-bold">{index + 1}</div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm md:text-base">{item.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">Qty: {item.qty}</span>
                      <span>x</span>
                      <span>₹ {item.rate}</span>
                      {item.discountPercent > 0 && <span className="text-red-500">(-{item.discountPercent}%)</span>}
                      {itemWithCarting.cartingAmount > 0 && (
                        <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                          +₹{itemWithCarting.cartingAmount} carting
                        </span>
                      )}
                      <span className="text-slate-300">|</span>
                      <span>Tax: {item.taxPercent}%</span>
                    </div>
                    {itemWithCarting.cartingPartyName && (
                      <p className="text-xs text-orange-600 mt-1">Carting: {itemWithCarting.cartingPartyName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">₹ {item.amount?.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">Taxable</p>
                  </div>
                  <button onClick={() => handleRemoveItem(index)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Card className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl mt-6">
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-slate-400 text-sm">
            <span>{showCartingSeparately && totalCartingAmt > 0 ? 'Base Sub-Total' : 'Sub-Total'}</span>
            <span>₹ {(subtotal - (showCartingSeparately ? totalCartingAmt : 0)).toFixed(2)}</span>
          </div>
          {showCartingSeparately && totalCartingAmt > 0 && (
            <>
              <div className="flex justify-between text-slate-400 text-sm">
                <span>Total Carting</span>
                <span>₹ {totalCartingAmt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-sm font-semibold border-t border-slate-800 pt-2">
                <span>Taxable Amount</span>
                <span>₹ {subtotal.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-slate-400 text-sm">
            <span>Total Tax</span>
            <span>₹ {taxTotal.toFixed(2)}</span>
          </div>
          <div className="h-px bg-slate-800 my-2"></div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">Grand Total</span>
            <span className="font-bold text-3xl text-blue-400">₹ {total.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handleSaveInvoice}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSaving}
        >
          {isSaving ? <SoftLoader size="sm" /> : <FileText className="h-5 w-5" />}
          {isSaving ? 'Processing...' : 'Save and Preview'}
        </button>
      </Card>

      <Modal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        title="Add New Party to Master"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsPartyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNewParty}>Save Party</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Party Name" value={newPartyData.name} onChange={e => setNewPartyData({ ...newPartyData, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Mobile Number" value={newPartyData.mobile} onChange={e => setNewPartyData({ ...newPartyData, mobile: (e.target.value || '').toString().replace(/\D/g, '').slice(0, 10) })} />
            <Select
              label="Party Type"
              value={newPartyData.type}
              onChange={e => setNewPartyData({ ...newPartyData, type: e.target.value as PartyType })}
              options={[{ label: 'Customer', value: PartyType.CUSTOMER }, { label: 'Supplier', value: PartyType.SUPPLIER }]}
            />
          </div>
          <Input label="GSTIN (Optional)" value={newPartyData.gstNo} onChange={e => setNewPartyData({ ...newPartyData, gstNo: e.target.value })} />
          <Input label="CIN (Optional)" value={newPartyData.cin} onChange={e => setNewPartyData({ ...newPartyData, cin: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Pincode (Optional)" value={(newPartyData.billingAddress as any)?.pincode || ''} onChange={e => setNewPartyData({ ...newPartyData, billingAddress: { ...(newPartyData.billingAddress || {}), pincode: (e.target.value || '').toString().replace(/\D/g, '').slice(0, 6) } })} />
            <Input label="Address" value={newPartyData.address} onChange={e => setNewPartyData({ ...newPartyData, address: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title="Add New Product to Master"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsItemModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNewItem}>Save Product</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Product Name" value={newItemData.name} onChange={e => setNewItemData({ ...newItemData, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="HSN Code" value={newItemData.hsn} onChange={e => setNewItemData({ ...newItemData, hsn: e.target.value })} />
            <Select
              label="Unit"
              value={newItemData.unit}
              onChange={e => setNewItemData({ ...newItemData, unit: e.target.value })}
              options={unitOptions}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Purchase Rate" type="number" value={newItemData.purchaseRate} onChange={e => setNewItemData({ ...newItemData, purchaseRate: parseFloat(e.target.value) })} />
            <Input label="Sale Rate" type="number" value={newItemData.saleRate} onChange={e => setNewItemData({ ...newItemData, saleRate: parseFloat(e.target.value) })} />
          </div>
          <Input label="Tax %" type="number" value={newItemData.taxPercent} onChange={e => setNewItemData({ ...newItemData, taxPercent: parseFloat(e.target.value) })} />
        </div>
      </Modal>
    </div>
  );
};
