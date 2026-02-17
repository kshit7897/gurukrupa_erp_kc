'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Plus, Edit2, Trash2, Check, LogOut, Loader2 } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  role: string;
  gstNumber?: string;
  city?: string;
  isDefault?: boolean;
}

export default function SelectCompanyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/admin/dashboard';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Company | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('staff');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    try {
      setLoading(true);
      const res = await fetch('/api/companies?forSelection=true');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load companies');
      }
      const data = await res.json();
      setCompanies(data.companies || []);
      setUserId(data.userId || '');
      setUserRole(data.userRole || 'staff');

      // If no companies and user is admin, show create modal
      if ((!data.companies || data.companies.length === 0) && data.userRole === 'admin') {
        setShowCreateModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  async function selectCompany(company: Company) {
    try {
      setSelecting(company.id);
      setError('');

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'selectCompany',
          userId,
          companyId: company.id
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to select company');
      }

      // Redirect to dashboard or requested page (force reload to update session)
      window.location.href = redirect;
    } catch (err: any) {
      setError(err.message || 'Failed to select company');
      setSelecting(null);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error', err);
      router.push('/login');
    }
  }

  async function deleteCompany(company: Company) {
    if (!confirm(`Are you sure you want to delete "${company.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/companies?id=${company.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete company');
      }
      fetchCompanies();
    } catch (err: any) {
      setError(err.message || 'Failed to delete company');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Select Company</h1>
            <p className="text-gray-600 mt-1">Choose a company to continue</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {companies.map((company) => (
            <div
              key={company.id}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 hover:shadow-md ${selecting === company.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100 hover:border-blue-300'
                }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 line-clamp-1">{company.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{company.role}</p>
                    </div>
                  </div>
                  {company.isDefault && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Default</span>
                  )}
                </div>

                {(company.gstNumber || company.city) && (
                  <div className="text-sm text-gray-500 mb-4">
                    {company.gstNumber && <p>GST: {company.gstNumber}</p>}
                    {company.city && <p>{company.city}</p>}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectCompany(company)}
                    disabled={selecting !== null}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  >
                    {selecting === company.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Selecting...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Select</span>
                      </>
                    )}
                  </button>

                  {userRole === 'admin' && (
                    <>
                      <button
                        onClick={() => setShowEditModal(company)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteCompany(company)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create Company Button */}
        {userRole === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Create New Company</span>
          </button>
        )}

        {companies.length === 0 && userRole !== 'admin' && (
          <div className="text-center py-12 bg-white rounded-xl">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Companies Available</h3>
            <p className="text-gray-500">Please contact an administrator to get access to a company.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Company Modal */}
      {(showCreateModal || showEditModal) && (
        <CompanyModal
          company={showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(null);
          }}
          onSaved={() => {
            setShowCreateModal(false);
            setShowEditModal(null);
            fetchCompanies();
          }}
        />
      )}
    </div>
  );
}

function CompanyModal({
  company,
  onClose,
  onSaved
}: {
  company: Company | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: company?.name || '',
    gstNumber: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    bank_name: '',
    bank_account_no: '',
    ifsc_code: '',
    upi_id: ''
  });

  useEffect(() => {
    if (company) {
      // Fetch full company details
      fetch(`/api/companies?id=${company.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setForm({
              name: data.name || '',
              gstNumber: data.gstNumber || data.gstin || '',
              phone: data.phone || '',
              email: data.email || '',
              address: data.address || data.address_line_1 || '',
              city: data.city || '',
              state: data.state || '',
              pincode: data.pincode || '',
              bank_name: data.bank_name || '',
              bank_account_no: data.bank_account_no || '',
              ifsc_code: data.ifsc_code || '',
              upi_id: data.upi_id || ''
            });
          }
        })
        .catch(err => console.error('Failed to load company details', err));
    }
  }, [company]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Company name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        ...form,
        gstin: form.gstNumber,
        address_line_1: form.address,
        ...(company ? { id: company.id } : {})
      };

      const res = await fetch('/api/companies', {
        method: company ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save company');
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save company');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {company ? 'Edit Company' : 'Create New Company'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">GST Number</label>
                <input
                  type="text"
                  value={form.gstNumber}
                  onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+91 9876543210"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="company@example.com"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123456"
                />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Bank name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Account Number</label>
                <input
                  type="text"
                  value={form.bank_account_no}
                  onChange={(e) => setForm({ ...form, bank_account_no: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Account number"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={form.ifsc_code}
                  onChange={(e) => setForm({ ...form, ifsc_code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="IFSC code"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">UPI ID</label>
                <input
                  type="text"
                  value={form.upi_id}
                  onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="upi@bank"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 md:flex-none px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{company ? 'Update Company' : 'Create Company'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
