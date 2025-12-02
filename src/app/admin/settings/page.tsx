 'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, Switch, Table, Select, Modal, Skeleton, SoftLoader } from '../../../components/ui/Common';
import { User, Shield, Building, Key, Upload, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('Company');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [users, setUsers] = useState<Array<any>>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState('staff');
  const [usersLoading, setUsersLoading] = useState(true);
  const [newUserPassword, setNewUserPassword] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(t);
  }, [notification]);

  const CompanySettings = () => (
    <CompanyCard />
  );

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) return setUsers([]);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Edit / Delete state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const UserSettings = () => (
    <Card title="Team Management" className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6"><p className="text-sm text-slate-500">Manage access to your ERP.</p><Button size="sm" icon={Plus} onClick={() => setIsUserModalOpen(true)}>Add User</Button></div>
      
      {/* Mobile card list for users */}
      <div className="md:hidden space-y-4">
        {usersLoading ? (
          <div className="text-center py-8 text-slate-500"><Skeleton variant="card" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No users found</div>
        ) : (
          users.map(u => (
            <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-800">{u.name || '-'}</h4>
                  <p className="text-xs text-slate-500 mt-1">{u.username}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{u.role}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-slate-500">Created: <span className="font-mono text-sm text-slate-700">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</span></div>
                <div className="text-right" />
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { setEditingUser(u); setNewUserName(u.name || ''); setNewUserEmail(u.email || ''); setNewUserUsername(u.username || ''); setNewUserRole(u.role || 'staff'); setIsUserModalOpen(true); }} className="flex-1 py-2 bg-white border border-slate-200 rounded-md text-blue-600 font-semibold">Edit</button>
                <button onClick={() => { setDeleteTarget(u.id); setIsDeleteConfirmOpen(true); }} className="flex-1 py-2 bg-red-600 text-white rounded-md font-semibold">Del</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table headers={['Name', 'Username', 'Role', 'Created', 'Action']}>
          {usersLoading ? (
            <Skeleton variant="tableRow" lines={5} colSpan={5} />
          ) : users.length === 0 ? (
            <tr className="group hover:bg-slate-50"><td className="px-4 py-3 text-slate-500" colSpan={5}>No users found</td></tr>
          ) : null}
          {users.map((u) => (
            <tr key={u.id} className="group hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{u.name || '-'}</td>
              <td className="px-4 py-3 text-slate-500">{u.username}</td>
              <td className="px-4 py-3">{u.role === 'admin' ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">Admin</span> : <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-medium">{u.role}</span>}</td>
              <td className="px-4 py-3 text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
              <td className="px-4 py-3 flex gap-2">
                <button onClick={() => { setEditingUser(u); setNewUserName(u.name || ''); setNewUserEmail(u.email || ''); setNewUserUsername(u.username || ''); setNewUserRole(u.role || 'staff'); setIsUserModalOpen(true); }} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => { setDeleteTarget(u.id); setIsDeleteConfirmOpen(true); }} className="p-1 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </Card>
  );

  const PermissionSettings = () => {
    const [selectedRole, setSelectedRole] = useState('staff');
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
            <select value={selectedRole} onChange={handleRoleChange} className="w-full sm:w-auto border-slate-300 rounded-md text-sm p-2 bg-white shadow-sm outline-none">
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
         </div>
         <div className="space-y-1">{permissions.map((perm) => (<div key={perm.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"><div className="pr-4"><p className="text-sm font-medium text-slate-900">{perm.label}</p><p className="text-xs text-slate-500">{perm.desc}</p></div><Switch checked={perm.checked} onChange={() => handleToggle(perm.id)} /></div>))}</div>
         <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end"><Button onClick={() => setNotification({ type: 'success', message: 'Permissions saved' })}><CheckCircle2 className="w-4 h-4 mr-2" />Save Permissions</Button></div>
      </Card>
    );
  };

  // CompanyCard component: fetches and saves company profile
  const CompanyCard = () => {
    const [company, setCompany] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<any>({ name: '', gstNumber: '', cin: '', phone: '', mobile2: '', email: '', address: '', city: '', state: '', pincode: '', bank_name: '', bank_branch: '', bank_account_no: '', ifsc_code: '', upi_id: '', logo: '', extraDetails: [] });

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const res = await fetch('/api/company');
          if (!res.ok) return;
          const data = await res.json();
          if (!mounted) return;
          const c = data.company || null;
          setCompany(c);
          if (c) setForm({ name: c.name || '', gstNumber: c.gstNumber || '', cin: c.cin || '', phone: c.phone || (Array.isArray(c.contactNumbers) && c.contactNumbers[0]) || '', mobile2: c.mobile2 || (Array.isArray(c.contactNumbers) && c.contactNumbers[1]) || '', email: c.email || '', address: c.address || '', city: c.city || '', state: c.state || '', pincode: c.pincode || '', bank_name: c.bank_name || '', bank_branch: c.bank_branch || '', bank_account_no: c.bank_account_no || '', ifsc_code: c.ifsc_code || '', upi_id: c.upi_id || '', logo: c.logo || '', extraDetails: c.extraDetails || [] });
        } catch (err) {
          console.error(err);
        }
      })();
      return () => { mounted = false };
    }, []);

    const save = async () => {
      setLoading(true);
      try {
          // Construct contactNumbers array from phone/mobile2 for backward compatibility
          const body = { ...form, contactNumbers: [ ...(form.phone ? [form.phone] : []), ...(form.mobile2 ? [form.mobile2] : []) ] };
          const res = await fetch('/api/company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
          if (!res.ok) {
          setNotification({ type: 'error', message: data?.error || 'Failed to save company' });
        } else {
          setCompany(data.company);
          setNotification({ type: 'success', message: 'Company profile updated' });
        }
      } catch (err) { setNotification({ type: 'error', message: 'Network error' }); }
      setLoading(false);
    }

    return (
      <Card title="Company Profile" className="animate-in fade-in duration-300">
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input label="Company Name" value={form.name} onChange={(e) => setForm({ ...form, name: (e as any).target.value })} />
            <Input label="GST Number" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: (e as any).target.value })} />
            <Input label="CIN (Optional)" value={form.cin} onChange={(e) => setForm({ ...form, cin: (e as any).target.value })} />
            <Input label="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: (e as any).target.value })} />
            <Input label="Alternate Phone (Optional)" value={form.mobile2} onChange={(e) => setForm({ ...form, mobile2: (e as any).target.value })} />
            <Input label="Email Address" value={form.email} onChange={(e) => setForm({ ...form, email: (e as any).target.value })} />
          </div>
          <Input label="Registered Address" value={form.address} onChange={(e) => setForm({ ...form, address: (e as any).target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: (e as any).target.value })} />
            <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: (e as any).target.value })} />
            <Input label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: (e as any).target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
            <Input label="Bank Name" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: (e as any).target.value })} />
            <Input label="Branch" value={form.bank_branch} onChange={(e) => setForm({ ...form, bank_branch: (e as any).target.value })} />
            <Input label="Account No" value={form.bank_account_no} onChange={(e) => setForm({ ...form, bank_account_no: (e as any).target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
            <Input label="IFSC Code" value={form.ifsc_code} onChange={(e) => setForm({ ...form, ifsc_code: (e as any).target.value })} />
            <Input label="UPI ID" value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: (e as any).target.value })} />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Logo (png/jpg)</label>
            <input type="file" accept="image/*" onChange={async (e:any)=>{
              const f = e.target.files && e.target.files[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = () => { setForm((prev:any)=> ({ ...prev, logo: reader.result })); };
              reader.readAsDataURL(f);
            }} />
            {form.logo && (<div className="mt-3 w-28 h-20 border border-slate-200 rounded overflow-hidden"><img src={form.logo} alt="logo" className="w-full h-full object-contain" /></div>)}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Additional Company Details</label>
            <div className="space-y-2">
              {(form.extraDetails || []).map((ed:any, idx:number) => (
                <div key={idx} className="flex gap-2">
                  <Input placeholder="Label" value={ed.label} onChange={(e)=>{ const val = (e as any).target.value; const copy = [...form.extraDetails]; copy[idx] = { ...copy[idx], label: val }; setForm({ ...form, extraDetails: copy }); }} />
                  <Input placeholder="Value" value={ed.value} onChange={(e)=>{ const val = (e as any).target.value; const copy = [...form.extraDetails]; copy[idx] = { ...copy[idx], value: val }; setForm({ ...form, extraDetails: copy }); }} />
                  <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={()=>{ const copy = [...form.extraDetails]; copy.splice(idx,1); setForm({ ...form, extraDetails: copy }); }}>Del</button>
                </div>
              ))}
              <div>
                <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=> setForm({ ...form, extraDetails: [ ...(form.extraDetails||[]), { label:'', value:'' } ] })}>Add Detail</button>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </div>
      </Card>
    );
  }

  const PasswordSettings = () => {
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const router = useRouter();
    const handleUpdate = async () => {
      setMessage(null);
      const stored = localStorage.getItem('gurukrupa_user');
      if (!stored) return setMessage('Not authenticated');
      let username = '';
      try { username = JSON.parse(stored).username } catch(e) { username = '' }
      if (!username) return setMessage('Unable to determine user');
      if (!currentPwd || !newPwd) return setMessage('Please fill both fields');
      setLoading(true);
      try {
        const res = await fetch('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, currentPassword: currentPwd, newPassword: newPwd }) });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data?.error || 'Failed to update password');
        } else {
          // Clear local auth and redirect to login with a success flag
          localStorage.removeItem('gurukrupa_user');
          setCurrentPwd(''); setNewPwd('');
          router.replace('/login?changed=1');
        }
      } catch (err) {
        setMessage('Network or server error');
      } finally { setLoading(false); }
    }

    return (
      <Card title="Security" className="animate-in fade-in duration-300 max-w-2xl">
        <div className="space-y-4">
          <Input label="Current Password" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
          <Input label="New Password" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          {message && <p className="text-sm text-slate-600">{message}</p>}
          <div className="pt-2 flex justify-end"><Button onClick={handleUpdate} disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button></div>
        </div>
      </Card>
    )
  };

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
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => { setIsUserModalOpen(false); setEditingUser(null); }}
        title={editingUser ? 'Edit User' : 'Add New User'}
        footer={<>
          <Button variant="ghost" onClick={() => { setIsUserModalOpen(false); setEditingUser(null); }}>Cancel</Button>
          <Button onClick={async () => {
            setUserLoading(true);
            try {
              if (editingUser) {
              // Update
                const body = { name: newUserName, role: newUserRole, email: newUserEmail } as any;
              if (newUserPassword) body.password = newUserPassword;
              const id = (editingUser as any).id || (editingUser as any)._id;
              if (!id) { setNotification({ type: 'error', message: 'Unable to determine user id for update' }); setUserLoading(false); return; }
              body.id = id; // include id in body as defensive fallback
              const res = await fetch(`/api/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                const data = await res.json();
                if (!res.ok) {
                  setNotification({ type: 'error', message: data?.error || 'Failed to update user' });
                } else {
                  setIsUserModalOpen(false);
                  setEditingUser(null);
                  setNewUserName(''); setNewUserEmail(''); setNewUserUsername(''); setNewUserPassword(''); setNewUserRole('staff');
                  await fetchUsers();
                }
              } else {
                // Create
                const body = { username: newUserUsername, password: newUserPassword, name: newUserName, role: newUserRole, email: newUserEmail };
                const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                const data = await res.json();
                if (!res.ok) {
                  setNotification({ type: 'error', message: data?.error || 'Failed to create user' });
                } else {
                  setIsUserModalOpen(false);
                  setNewUserName(''); setNewUserEmail(''); setNewUserUsername(''); setNewUserPassword(''); setNewUserRole('staff');
                  await fetchUsers();
                }
              }
            } catch (err) {
              setNotification({ type: 'error', message: 'Network error' });
            } finally { setUserLoading(false); }
          }}>{userLoading ? (editingUser ? 'Saving...' : 'Creating...') : (editingUser ? 'Save Changes' : 'Create User')}</Button>
        </>}
      >
        <div className="space-y-4">
          <Input label="Full Name" placeholder="John Doe" value={newUserName} onChange={(e) => setNewUserName((e as any).target.value)} />
          <Input label="Email Address" type="email" placeholder="john@company.com" value={newUserEmail} onChange={(e) => setNewUserEmail((e as any).target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Username" placeholder="username" value={newUserUsername} onChange={(e) => setNewUserUsername((e as any).target.value)} disabled={!!editingUser} />
            <Select label="Role" options={[{label: 'Admin', value: 'admin'}, {label: 'Manager', value: 'manager'}, {label: 'Staff', value: 'staff'}]} value={newUserRole} onChange={(e: any) => setNewUserRole(e.target.value)} />
          </div>
          <Input label={editingUser ? 'New Password (leave blank to keep current)' : 'Temporary Password'} type="password" value={newUserPassword} onChange={(e) => setNewUserPassword((e as any).target.value)} />
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} title="Confirm delete" footer={<>
        <Button variant="ghost" onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }}>Cancel</Button>
        <Button onClick={async () => {
          if (!deleteTarget) return;
          try {
            const res = await fetch(`/api/users/${deleteTarget}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget }) });
            const data = await res.json();
            if (!res.ok) { setNotification({ type: 'error', message: data?.error || 'Failed to delete user' }); }
            else { await fetchUsers(); setIsDeleteConfirmOpen(false); setDeleteTarget(null); setNotification({ type: 'success', message: 'User deleted' }); }
          } catch (err) { setNotification({ type: 'error', message: 'Network error' }); }
        }}>Delete</Button>
      </>}> <div className="py-4">Are you sure you want to delete this user? This action cannot be undone.</div></Modal>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 max-w-xs w-full p-3 rounded shadow-md ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}