'use client';
import React, { useState } from 'react';
import { Button, Input, Card, Switch, Table, Select, Modal } from '../../../components/ui/Common';
import { User, Shield, Building, Key, Upload, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('Company');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const CompanySettings = () => (
    <Card title="Company Profile" className="animate-in fade-in duration-300">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input label="Company Name" defaultValue="Gurukrupa Multi Ventures Pvt Ltd" />
          <Input label="GST Number" placeholder="27ABCDE1234F1Z5" />
          <Input label="Phone Number" placeholder="+91" />
          <Input label="Email Address" placeholder="info@gurukrupa.com" />
        </div>
        <Input label="Registered Address" placeholder="Street Address" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Input label="City" placeholder="Pune" />
          <Input label="State" placeholder="Maharashtra" />
          <Input label="Pincode" placeholder="411037" />
        </div>
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </div>
    </Card>
  );

  const UserSettings = () => (
    <Card title="Team Management" className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6"><p className="text-sm text-slate-500">Manage access to your ERP.</p><Button size="sm" icon={Plus} onClick={() => setIsUserModalOpen(true)}>Add User</Button></div>
      <Table headers={['Name', 'Email', 'Role', 'Status', 'Action']}>
        <tr className="group hover:bg-slate-50">
          <td className="px-4 py-3 font-medium text-slate-900">Amit Singh</td><td className="px-4 py-3 text-slate-500">amit@gurukrupa.com</td><td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">Admin</span></td><td className="px-4 py-3"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Active</span></td><td className="px-4 py-3 flex gap-2"><button className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="h-4 w-4" /></button><button className="p-1 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button></td>
        </tr>
      </Table>
    </Card>
  );

  const PermissionSettings = () => {
    const [selectedRole, setSelectedRole] = useState('Staff');
    const [permissions, setPermissions] = useState([
      { id: 'create_invoice', label: 'Create Invoice', desc: 'Can create new sales invoices', checked: true },
      { id: 'edit_invoice', label: 'Edit Invoice', desc: 'Can edit existing invoices', checked: false },
      { id: 'view_reports', label: 'View Reports', desc: 'Access to financial reports', checked: false },
    ]);
    const handleToggle = (id: string) => setPermissions(prev => prev.map(p => p.id === id ? { ...p, checked: !p.checked } : p));
    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedRole(e.target.value);
    return (
      <Card title="Role Permissions" className="animate-in fade-in duration-300">
         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Select Role to Edit:</label>
            <select value={selectedRole} onChange={handleRoleChange} className="w-full sm:w-auto border-slate-300 rounded-md text-sm p-2 bg-white shadow-sm outline-none"><option value="Staff">Staff</option><option value="Manager">Manager</option></select>
         </div>
         <div className="space-y-1">{permissions.map((perm) => (<div key={perm.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"><div className="pr-4"><p className="text-sm font-medium text-slate-900">{perm.label}</p><p className="text-xs text-slate-500">{perm.desc}</p></div><Switch checked={perm.checked} onChange={() => handleToggle(perm.id)} /></div>))}</div>
         <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end"><Button onClick={() => alert(`Permissions saved`)}><CheckCircle2 className="w-4 h-4 mr-2" />Save Permissions</Button></div>
      </Card>
    );
  };

  const PasswordSettings = () => (
    <Card title="Security" className="animate-in fade-in duration-300 max-w-2xl">
      <div className="space-y-4"><Input label="Current Password" type="password" /><Input label="New Password" type="password" /><div className="pt-2 flex justify-end"><Button>Update Password</Button></div></div>
    </Card>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-10">
      <div className="w-full lg:w-72 flex-shrink-0">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 px-1">Settings</h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
          {[{ id: 'Company', icon: Building, label: 'Company Profile' }, { id: 'Users', icon: User, label: 'Users & Roles' }, { id: 'Permissions', icon: Shield, label: 'Permissions' }, { id: 'Password', icon: Key, label: 'Change Password' }].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center px-5 py-4 text-sm font-medium transition-all duration-200 border-l-[3px] ${activeTab === item.id ? 'bg-blue-50 text-blue-700 border-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'}`}><item.icon className={`h-4 w-4 mr-3 ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400'}`} />{item.label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 lg:pt-14">{activeTab === 'Company' && <CompanySettings />}{activeTab === 'Users' && <UserSettings />}{activeTab === 'Permissions' && <PermissionSettings />}{activeTab === 'Password' && <PasswordSettings />}</div>
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Add New User" footer={<><Button variant="ghost" onClick={() => setIsUserModalOpen(false)}>Cancel</Button><Button onClick={() => setIsUserModalOpen(false)}>Create User</Button></>}><div className="space-y-4"><Input label="Full Name" placeholder="John Doe" /><Input label="Email Address" type="email" placeholder="john@company.com" /><div className="grid grid-cols-2 gap-4"><Input label="Mobile" placeholder="+91" /><Select label="Role" options={[{label: 'Select Role', value: ''}, {label: 'Admin', value: 'admin'}]} /></div><Input label="Temporary Password" type="password" /></div></Modal>
    </div>
  );
}