'use client';
import React, { useState, useEffect } from 'react';
import { Button, Input, Table, Modal, Select } from '../../../components/ui/Common';
import { Plus, Search, Edit2, Trash2, Loader2, Package } from 'lucide-react';
import { Item } from '../../../types';
import { api } from '../../../lib/api';

export default function Items() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Item>>({
    name: '', hsn: '', unit: 'PCS', purchaseRate: 0, saleRate: 0, taxPercent: 18, stock: 0
  });

  const loadItems = async () => {
    setIsLoading(true);
    try { const data = await api.items.list(); setItems(data); } catch(e) { console.error(e) }
    setIsLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(t);
  }, [notification]);

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: '', hsn: '', unit: 'PCS', purchaseRate: 0, saleRate: 0, taxPercent: 18, stock: 0 });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if(!formData.name) return;
    setIsLoading(true);
    if (editingId) await api.items.update({ ...formData, id: editingId } as Item);
    else await api.items.add(formData as Item);
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', hsn: '', unit: 'PCS', purchaseRate: 0, saleRate: 0, taxPercent: 18, stock: 0 });
    await loadItems();
    setNotification({ type: 'success', message: editingId ? 'Product updated' : 'Product created' });
  };

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
    setIsDeleteConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Package className="h-6 w-6 text-blue-600" /> Product Master</h1></div>
        <Button onClick={openNewModal} icon={Plus}>Add Product</Button>
      </div>
      <div className="flex gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Search items..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
      </div>
      {/* Mobile card list */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-slate-500"><div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 animate-[pulse_1.6s_ease-in-out_infinite] shadow-inner mx-auto" /><div className="text-sm text-slate-500 mt-2">Loading Inventory...</div></div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No items found. Add your first product.</div>
        ) : (
          items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-800">{item.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">HSN: {item.hsn || '-'}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-700">₹ {item.saleRate}</div>
                  <div className="text-xs text-slate-400">Sale Rate</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-500">
                <div className="bg-slate-50 p-2 rounded">Purchase<br/><span className="font-semibold text-slate-700">₹ {item.purchaseRate}</span></div>
                <div className="bg-slate-50 p-2 rounded">Stock<br/><span className="font-semibold text-slate-700">{item.stock} {item.unit}</span></div>
                <div className="bg-slate-50 p-2 rounded">Tax<br/><span className="font-semibold text-slate-700">{item.taxPercent}%</span></div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleEdit(item)} className="flex-1 py-2 bg-white border border-slate-200 rounded-md text-blue-600 font-semibold">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="flex-1 py-2 bg-red-600 text-white rounded-md font-semibold">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table headers={["Item Name", "Unit", "Purchase Price", "Sale Price", "Stock", "Action"]}>
          {isLoading ? (<tr><td colSpan={6} className="text-center py-12 text-slate-500"><div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 animate-[pulse_1.6s_ease-in-out_infinite] shadow-inner mx-auto" /><div className="text-sm text-slate-500 mt-2">Loading Inventory...</div></td></tr>) : items.length === 0 ? (<tr><td colSpan={6} className="text-center py-8 text-slate-500">No items found. Add your first product.</td></tr>) : (
          items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
            <tr key={item.id}>
              <td className="px-4 py-3 font-medium text-slate-900">{item.name}<div className="text-xs text-slate-400">HSN: {item.hsn}</div></td>
              <td className="px-4 py-3 text-sm">{item.unit}</td>
              <td className="px-4 py-3 text-right">₹ {item.purchaseRate}</td>
              <td className="px-4 py-3 text-right font-semibold">₹ {item.saleRate}</td>
              <td className="px-4 py-3 text-right">{item.stock}</td>
               <td className="px-4 py-3 text-right space-x-2">
                <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
              </td>
            </tr>
          ))
        )}
        </Table>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Product" : "Add New Product"} footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Item'}</Button></>}>
        <div className="space-y-4">
          <Input label="Item Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="HSN Code" value={formData.hsn} onChange={e => setFormData({...formData, hsn: e.target.value})} />
            <Select label="Unit" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} options={[{label: 'PCS', value: 'PCS'}, {label: 'KG', value: 'KG'}, {label: 'BOX', value: 'BOX'}, {label: 'BAG', value: 'BAG'}]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Purchase Price" type="number" value={formData.purchaseRate} onChange={e => setFormData({...formData, purchaseRate: parseFloat(e.target.value)})} />
            <Input label="Sale Price" type="number" value={formData.saleRate} onChange={e => setFormData({...formData, saleRate: parseFloat(e.target.value)})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tax Rate (%)" type="number" value={formData.taxPercent} onChange={e => setFormData({...formData, taxPercent: parseFloat(e.target.value)})} />
            <Input label="Opening Stock" type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseFloat(e.target.value)})} />
          </div>
        </div>
      </Modal>
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} title="Confirm delete" footer={<><Button variant="ghost" onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }}>Cancel</Button><Button onClick={async () => { if (!deleteTarget) return; try { await api.items.delete(deleteTarget); await loadItems(); setIsDeleteConfirmOpen(false); setDeleteTarget(null); setNotification({ type: 'success', message: 'Product deleted' }); } catch (err) { setNotification({ type: 'error', message: 'Failed to delete' }); } }}>Delete</Button></>}> <div className="py-4">Are you sure you want to delete this product? This will remove it from the database.</div></Modal>

      {notification && (
        <div className={`fixed top-6 right-6 z-50 max-w-xs w-full p-3 rounded shadow-md ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
