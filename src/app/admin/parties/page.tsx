'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Table, Modal, Select, Skeleton, SoftLoader } from '../../../components/ui/Common';
import { Plus, Search, Edit2, Trash2, ChevronDown, X, Check } from 'lucide-react';
import { Party, PartyType, PartyRole, BalanceType } from '../../../types';
import { api } from '../../../lib/api';

// All available roles for parties
const ALL_ROLES = [
  { value: PartyRole.CUSTOMER, label: 'Customer', color: 'bg-green-100 text-green-700' },
  { value: PartyRole.SUPPLIER, label: 'Supplier', color: 'bg-blue-100 text-blue-700' },
  { value: PartyRole.OWNER, label: 'Owner', color: 'bg-purple-100 text-purple-700' },
  { value: PartyRole.PARTNER, label: 'Partner', color: 'bg-indigo-100 text-indigo-700' },
  { value: PartyRole.EMPLOYEE, label: 'Employee', color: 'bg-amber-100 text-amber-700' },
  { value: PartyRole.CARTING, label: 'Carting', color: 'bg-orange-100 text-orange-700' },
  { value: PartyRole.CASH, label: 'Cash', color: 'bg-slate-200 text-slate-800' },
  { value: PartyRole.BANK, label: 'Bank', color: 'bg-blue-200 text-blue-800' },
  { value: PartyRole.UPI, label: 'UPI', color: 'bg-purple-200 text-purple-800' },
];

// Multi-select dropdown component for roles
const RoleMultiSelect = ({
  selectedRoles,
  onChange
}: {
  selectedRoles: PartyRole[],
  onChange: (roles: PartyRole[]) => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleRole = (role: PartyRole) => {
    if (selectedRoles.includes(role)) {
      onChange(selectedRoles.filter(r => r !== role));
    } else {
      onChange([...selectedRoles, role]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Party Roles</label>
      <div
        className="min-h-[42px] w-full border border-slate-200 rounded-lg px-3 py-2 cursor-pointer flex flex-wrap gap-1 items-center bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedRoles.length === 0 ? (
          <span className="text-slate-400 text-sm">Select roles...</span>
        ) : (
          selectedRoles.map(role => {
            const roleConfig = ALL_ROLES.find(r => r.value === role);
            return (
              <span
                key={role}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${roleConfig?.color || 'bg-slate-100 text-slate-700'}`}
              >
                {roleConfig?.label || role}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleRole(role); }}
                  className="hover:opacity-70"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })
        )}
        <ChevronDown className={`h-4 w-4 text-slate-400 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {ALL_ROLES.map(role => (
            <div
              key={role.value}
              className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-slate-50 ${selectedRoles.includes(role.value) ? 'bg-blue-50' : ''}`}
              onClick={() => toggleRole(role.value)}
            >
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${role.color}`}>
                {role.label}
              </span>
              {selectedRoles.includes(role.value) && <Check className="h-4 w-4 text-blue-600" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Parties() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parties, setParties] = useState<Party[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | PartyRole>('ALL');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Party>>({
    name: '', mobile: '', type: PartyType.CUSTOMER, email: '', gstNo: '', address: '', openingBalance: 0,
    openingBalanceType: BalanceType.DR,
    roles: [PartyRole.CUSTOMER],
    city: '', state: '', pincode: '',
    billingAddress: { pincode: '' }
  });

  const loadParties = async () => {
    setIsLoading(true);
    try {
      const data = await api.parties.list(true);
      setParties(data);
    } catch (e) { console.error(e) }
    setIsLoading(false);
  };

  useEffect(() => { loadParties(); }, []);
  useEffect(() => {
    const onData = () => { loadParties().catch(() => { }); };
    document.addEventListener('gurukrupa:data:updated', onData);
    return () => document.removeEventListener('gurukrupa:data:updated', onData);
  }, []);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(t);
  }, [notification]);

  const handleEdit = (party: Party) => {
    setEditingId(party.id);
    const fallbackRole: PartyRole = party.type === PartyType.SUPPLIER ? PartyRole.SUPPLIER : PartyRole.CUSTOMER;
    setFormData({
      ...party,
      roles: (party.roles && party.roles.length ? party.roles : [fallbackRole]),
      openingBalanceType: (party as any).openingBalanceType || BalanceType.DR,
    });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({
      name: '', mobile: '', type: PartyType.CUSTOMER, email: '', gstNo: '', cin: '', address: '',
      city: '', state: '', pincode: '',
      openingBalance: 0, openingBalanceType: BalanceType.DR,
      roles: [PartyRole.CUSTOMER],
      billingAddress: { pincode: '' }
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    // validation
    if (!formData.name) {
      setNotification({ type: 'error', message: 'Name is required' });
      return;
    }
    const mobile = (formData.mobile || '').toString().replace(/\D/g, '');
    // Mobile is now optional
    // if (!mobile) { setNotification({ type: 'error', message: 'Mobile number is required' }); return; }
    if (mobile && mobile.length !== 10) { setNotification({ type: 'error', message: 'Mobile number must be 10 digits' }); return; }
    if (formData.email) {
      const em = (formData.email || '').toString();
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(em)) { setNotification({ type: 'error', message: 'Invalid email address' }); return; }
    }
    const pincode = (formData.billingAddress && (formData.billingAddress as any).pincode) || '';
    if (pincode) {
      const pc = pincode.toString().replace(/\D/g, '');
      if (pc.length !== 6) { setNotification({ type: 'error', message: 'Pincode must be 6 digits' }); return; }
      // ensure billingAddress.pincode normalized
      setFormData(prev => ({ ...(prev || {}), billingAddress: { ...(prev?.billingAddress || {}), pincode: pc } }));
    }

    setIsLoading(true);
    try {
      if (editingId) await api.parties.update({ ...formData, id: editingId } as Party);
      else await api.parties.add(formData as Party);
    } catch (err) {
      console.error('Failed to save party', err);
      setNotification({ type: 'error', message: 'Failed to save party' });
      setIsLoading(false);
      return;
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', mobile: '', type: PartyType.CUSTOMER, email: '', gstNo: '', address: '', openingBalance: 0, billingAddress: { pincode: '' } });
    await loadParties();
    setNotification({ type: 'success', message: editingId ? 'Party updated' : 'Party created' });
  };

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
    setIsDeleteConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Parties</h1>
        <Button onClick={openNewModal} icon={Plus}>Add Party</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search parties..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            options={[
              { label: 'All Parties', value: 'ALL' },
              { label: 'Customers', value: PartyRole.CUSTOMER },
              { label: 'Suppliers', value: PartyRole.SUPPLIER },
              { label: 'Owners', value: PartyRole.OWNER },
              { label: 'Partners', value: PartyRole.PARTNER },
              { label: 'Employees', value: PartyRole.EMPLOYEE },
              { label: 'Carting', value: PartyRole.CARTING },
              { label: 'Cash Accounts', value: PartyRole.CASH },
              { label: 'Bank Accounts', value: PartyRole.BANK },
              { label: 'UPI/Digital', value: PartyRole.UPI },
            ]}
          />
        </div>
      </div>
      {/* Mobile card list */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-slate-500"><Skeleton variant="card" /></div>
        ) : parties.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No parties found. Add your first party.</div>
        ) : (
          parties
            .filter(p => {
              if (filterType === 'ALL') return true;
              const roles: PartyRole[] = (p.roles && p.roles.length)
                ? p.roles
                : [p.type === PartyType.SUPPLIER ? PartyRole.SUPPLIER : PartyRole.CUSTOMER];
              return roles.includes(filterType);
            })
            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(party => {
              const roles: PartyRole[] = (party.roles && party.roles.length)
                ? party.roles
                : [party.type === PartyType.SUPPLIER ? PartyRole.SUPPLIER : PartyRole.CUSTOMER];
              const balanceType = (party as any).openingBalanceType || 'DR';
              return (
                <div key={party.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800">{party.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{party.mobile} • {party.address || party.city || 'No Address'}</p>
                    </div>
                    <div className="text-right flex flex-wrap gap-1 justify-end max-w-[120px]">
                      {roles.map(role => {
                        const roleConfig = ALL_ROLES.find(r => r.value === role);
                        return (
                          <span key={role} className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${roleConfig?.color || 'bg-slate-100 text-slate-700'}`}>
                            {role}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-500">GST: <span className="font-mono text-sm text-slate-700">{party.gstNo || party.gstin || '-'}</span></div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${balanceType === 'DR' ? 'text-green-600' : 'text-red-600'}`}>
                        ₹ {party.openingBalance} <span className="text-xs">({balanceType})</span>
                      </div>
                      <div className="text-xs text-slate-400">Opening Balance</div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleEdit(party)} className="flex-1 py-2 bg-white border border-slate-200 rounded-md text-blue-600 font-semibold">Edit</button>
                    <button onClick={() => handleDelete(party.id)} className="flex-1 py-2 bg-red-600 text-white rounded-md font-semibold">Del</button>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table headers={["Name", "Roles", "Mobile", "City", "GSTIN", "Balance", "Action"]}>
          {isLoading ? (
            <Skeleton variant="tableRow" lines={6} colSpan={7} />
          ) : parties.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-8 text-slate-500">No parties found. Add your first party.</td></tr>
          ) : (
            parties
              .filter(p => {
                if (filterType === 'ALL') return true;
                const roles: PartyRole[] = (p.roles && p.roles.length)
                  ? p.roles
                  : [p.type === PartyType.SUPPLIER ? PartyRole.SUPPLIER : PartyRole.CUSTOMER];
                return roles.includes(filterType);
              })
              .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(party => {
                const roles: PartyRole[] = (party.roles && party.roles.length)
                  ? party.roles
                  : [party.type === PartyType.SUPPLIER ? PartyRole.SUPPLIER : PartyRole.CUSTOMER];
                const balanceType = (party as any).openingBalanceType || 'DR';
                return (
                  <tr key={party.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{party.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {roles.map(role => {
                          const roleConfig = ALL_ROLES.find(r => r.value === role);
                          return (
                            <span key={role} className={`px-2 py-0.5 rounded text-xs font-semibold ${roleConfig?.color || 'bg-slate-100 text-slate-700'}`}>
                              {role}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{party.mobile}</td>
                    <td className="px-4 py-3 text-slate-600">{party.city || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{party.gstNo || party.gstin || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-right">
                      <span className={balanceType === 'DR' ? 'text-green-600' : 'text-red-600'}>
                        ₹ {party.openingBalance} <span className="text-xs font-normal">({balanceType})</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(party)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(party.id)} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })
          )}
        </Table>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Party" : "Add New Party"} footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Party'}</Button></>}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <Input label="Party Name *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Mobile Number *" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: (e.target.value || '').toString().replace(/\D/g, '').slice(0, 10) })} />
            <Input label="Email (Optional)" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>

          <RoleMultiSelect
            selectedRoles={formData.roles || [PartyRole.CUSTOMER]}
            onChange={(roles) => setFormData({
              ...formData,
              roles,
              type: (roles[0] === PartyRole.SUPPLIER ? PartyType.SUPPLIER : PartyType.CUSTOMER)
            })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="GST Number (Optional)" value={formData.gstNo || formData.gstin} onChange={e => setFormData({ ...formData, gstNo: e.target.value, gstin: e.target.value })} />
            <Input label="CIN (Optional)" value={formData.cin} onChange={e => setFormData({ ...formData, cin: e.target.value })} />
          </div>

          <Input label="Address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="City" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
            <Input label="State" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
            <Input label="Pincode" value={formData.pincode || (formData.billingAddress as any)?.pincode || ''} onChange={e => {
              const pincode = (e.target.value || '').toString().replace(/\D/g, '').slice(0, 6);
              setFormData({
                ...formData,
                pincode,
                billingAddress: { ...(formData.billingAddress || {}), pincode }
              });
            }} />
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Opening Balance</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount"
                type="number"
                value={formData.openingBalance}
                onChange={e => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
              />
              <Select
                label="Type"
                value={formData.openingBalanceType || 'DR'}
                onChange={e => setFormData({ ...formData, openingBalanceType: e.target.value as BalanceType })}
                options={[
                  { label: 'Debit (DR) - Receivable', value: 'DR' },
                  { label: 'Credit (CR) - Payable', value: 'CR' }
                ]}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              DR (Debit) = Amount receivable from party. CR (Credit) = Amount payable to party.
            </p>
          </div>
        </div>
      </Modal>
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} title="Confirm delete" footer={<><Button variant="ghost" onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }}>Cancel</Button><Button onClick={async () => { if (!deleteTarget) return; try { await api.parties.delete(deleteTarget, false); await loadParties(); setIsDeleteConfirmOpen(false); setDeleteTarget(null); setNotification({ type: 'success', message: 'Party deleted' }); } catch (err: any) { const errorMessage = err?.message || 'Failed to delete party'; if (errorMessage.includes('orphaned ledger entries')) { try { await api.parties.delete(deleteTarget, true); await loadParties(); setIsDeleteConfirmOpen(false); setDeleteTarget(null); setNotification({ type: 'success', message: 'Party deleted (cleaned up orphaned entries)' }); } catch (retryErr: any) { setNotification({ type: 'error', message: retryErr?.message || 'Failed to delete party' }); } } else { setNotification({ type: 'error', message: errorMessage }); } } }}>Delete</Button></>}> <div className="py-4">Are you sure you want to delete this party? This will remove it from the database.</div></Modal>

      {notification && (
        <div className={`fixed top-6 right-6 z-50 max-w-xs w-full p-3 rounded shadow-md ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
