'use client';
import React, { useState, useEffect } from 'react';
import { Button, Input, Table, Modal, Select, Skeleton, SoftLoader } from '../../../components/ui/Common';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { Party, PartyType } from '../../../types';
import { api } from '../../../lib/api';

export default function Parties() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parties, setParties] = useState<Party[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | PartyType.CUSTOMER | PartyType.SUPPLIER>('ALL');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Party>>({
    name: '', mobile: '', type: PartyType.CUSTOMER, email: '', gstNo: '', address: '', openingBalance: 0,
    billingAddress: { pincode: '' }
  });

  const loadParties = async () => {
    setIsLoading(true);
    try {
      const data = await api.parties.list();
      setParties(data);
    } catch(e) { console.error(e) }
    setIsLoading(false);
  };

  useEffect(() => { loadParties(); }, []);
  useEffect(() => {
    const onData = () => { loadParties().catch(() => {}); };
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
    setFormData({ ...party });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: '', mobile: '', type: PartyType.CUSTOMER, email: '', gstNo: '', address: '', openingBalance: 0 });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    // validation
    if (!formData.name) {
      setNotification({ type: 'error', message: 'Name is required' });
      return;
    }
    const mobile = (formData.mobile || '').toString().replace(/\D/g, '');
    if (!mobile) { setNotification({ type: 'error', message: 'Mobile number is required' }); return; }
    if (mobile.length !== 10) { setNotification({ type: 'error', message: 'Mobile number must be 10 digits' }); return; }
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
      <div className="flex gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search parties..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="w-48">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} options={[{ label: 'All', value: 'ALL' }, { label: 'Customer', value: PartyType.CUSTOMER }, { label: 'Supplier', value: PartyType.SUPPLIER }]} />
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
            .filter(p => (filterType === 'ALL' ? true : p.type === filterType))
            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(party => (
            <div key={party.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-800">{party.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{party.mobile} • {party.address || 'No Address'}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${party.type === PartyType.CUSTOMER ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{party.type}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-slate-500">GST: <span className="font-mono text-sm text-slate-700">{party.gstNo || '-'}</span></div>
                <div className="text-right">
                  <div className="text-sm font-bold">₹ {party.openingBalance}</div>
                  <div className="text-xs text-slate-400">Opening Balance</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleEdit(party)} className="flex-1 py-2 bg-white border border-slate-200 rounded-md text-blue-600 font-semibold">Edit</button>
                <button onClick={() => handleDelete(party.id)} className="flex-1 py-2 bg-red-600 text-white rounded-md font-semibold">Del</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table headers={["Name", "Type", "Mobile", "GSTIN", "Balance", "Action"]}>
           {isLoading ? (
             <Skeleton variant="tableRow" lines={6} colSpan={6} />
           ) : parties.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-8 text-slate-500">No parties found. Add your first party.</td></tr>
          ) : (
              parties
                .filter(p => (filterType === 'ALL' ? true : p.type === filterType))
                .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(party => (
              <tr key={party.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{party.name}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${party.type === PartyType.CUSTOMER ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{party.type}</span></td>
                <td className="px-4 py-3 text-slate-600">{party.mobile}</td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{party.gstNo || '-'}</td>
                <td className="px-4 py-3 font-semibold text-right">₹ {party.openingBalance}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => handleEdit(party)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(party.id)} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
              ))
          )}
        </Table>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Party" : "Add New Party"} footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Party'}</Button></>}>
        <div className="space-y-4">
          <Input label="Party Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Mobile Number" value={formData.mobile} onChange={e => setFormData({...formData, mobile: (e.target.value || '').toString().replace(/\D/g,'').slice(0,10)})} />
            <Select label="Party Type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PartyType})} options={[{label: 'Customer', value: PartyType.CUSTOMER}, {label: 'Supplier', value: PartyType.SUPPLIER}]} />
          </div>
          <Input label="Email Address" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Pincode" value={(formData.billingAddress as any)?.pincode || ''} onChange={e => setFormData({...formData, billingAddress: { ...(formData.billingAddress || {}), pincode: (e.target.value || '').toString().replace(/\D/g,'').slice(0,6) }})} />
            <Input label="GSTIN" value={formData.gstNo} onChange={e => setFormData({...formData, gstNo: e.target.value})} />
          </div>
          <Input label="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          <Input label="Opening Balance" type="number" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: parseFloat(e.target.value)})} />
        </div>
      </Modal>
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} title="Confirm delete" footer={<><Button variant="ghost" onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }}>Cancel</Button><Button onClick={async () => { if (!deleteTarget) return; try { await api.parties.delete(deleteTarget); await loadParties(); setIsDeleteConfirmOpen(false); setDeleteTarget(null); setNotification({ type: 'success', message: 'Party deleted' }); } catch (err) { setNotification({ type: 'error', message: 'Failed to delete' }); } }}>Delete</Button></>}> <div className="py-4">Are you sure you want to delete this party? This will remove it from the database.</div></Modal>

      {notification && (
        <div className={`fixed top-6 right-6 z-50 max-w-xs w-full p-3 rounded shadow-md ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
