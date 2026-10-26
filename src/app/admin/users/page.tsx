'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Key,
  Edit2,
  CheckCircle2,
  XCircle,
  Building2,
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { AppSelect } from '@/components/admin/ThemedSelect';

interface Location {
  id: string;
  name: string;
  location_code: string;
}

interface UserData {
  id: string;
  email: string;
  username: string;
  phone_number: string | null;
  full_name: string;
  role: 'SUPER_ADMIN' | 'MANAGEMENT' | 'OWNER';
  location_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  locations?: Location | null;
}

function UserManagementContent() {
  const searchParams = useSearchParams();
  const selectedLocationId = searchParams.get('location_id') || 'all';

  const [users, setUsers] = useState<UserData[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    phone_number: '',
    password: '',
    role: 'MANAGEMENT' as 'SUPER_ADMIN' | 'MANAGEMENT',
    location_id: '',
  });

  const [editFormData, setEditFormData] = useState({
    id: '',
    full_name: '',
    email: '',
    phone_number: '',
    role: 'MANAGEMENT' as 'SUPER_ADMIN' | 'MANAGEMENT',
    location_id: '',
    is_active: true,
  });

  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const url = `/api/admin/users?search=${encodeURIComponent(search)}&location_id=${encodeURIComponent(selectedLocationId)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Fetch users error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/admin/locations');
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (e) {
      console.error('Fetch locations error:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLocations();
  }, [selectedLocationId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error || 'Failed to create user.');
      } else {
        setSuccessMsg(data.message || 'User created successfully.');
        setShowCreateModal(false);
        setFormData({
          full_name: '',
          email: '',
          username: '',
          phone_number: '',
          password: '',
          role: 'MANAGEMENT',
          location_id: '',
        });
        fetchUsers();
      }
    } catch (e) {
      setErrorMsg('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    const normalizedRole = (user.role === 'MANAGEMENT' || user.role === 'OWNER') ? 'MANAGEMENT' : 'SUPER_ADMIN';
    setEditFormData({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number || '',
      role: normalizedRole,
      location_id: user.location_id || '',
      is_active: user.is_active,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error || 'Failed to update user.');
      } else {
        setSuccessMsg('User updated successfully.');
        setShowEditModal(false);
        fetchUsers();
      }
    } catch (e) {
      setErrorMsg('Server error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          new_password: newPassword,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error || 'Failed to reset password.');
      } else {
        setSuccessMsg(`Password for ${selectedUser.full_name} updated successfully.`);
        setShowResetModal(false);
        setNewPassword('');
        setSelectedUser(null);
      }
    } catch (e) {
      setErrorMsg('Server error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserData) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          is_active: !user.is_active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (e) {
      console.error('Toggle status error:', e);
    }
  };

  const activeUsersCount = users.filter((u) => u.is_active).length;

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-[#F8C8DC]/30 border border-[#F8C8DC] text-[#795465] rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#795465]" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="p-1 hover:bg-[#F8C8DC]/50 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-[#FFDAD6] border border-[#BA1A1A]/20 text-[#BA1A1A] rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-[#FFDAD6]/50 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#EFEDED] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#F8C8DC]/40 rounded-2xl text-[#795465]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#1B1C1C] tracking-tight">User Management</h1>
              <p className="text-xs text-[#817478] font-medium">
                Manage administrator accounts and branch management teams.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Users Counter Badge */}
          <div className="px-4 py-2 bg-[#FBF9F9] border border-[#EFEDED] rounded-2xl text-center">
            <span className="text-[10px] font-bold text-[#817478] block uppercase">Active Users</span>
            <span className="text-base font-black text-[#795465]">{activeUsersCount}</span>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-[#795465] hover:bg-[#634251] text-white rounded-2xl text-xs font-extrabold shadow-md shadow-[#795465]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add User</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#EFEDED] rounded-2xl text-xs font-bold text-[#1B1C1C] focus:outline-none focus:border-[#795465] transition-colors"
          />
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#EFEDED] rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FBF9F9] border-b border-[#EFEDED] text-[10px] font-extrabold text-[#795465] uppercase tracking-wider">
                <th className="py-4 px-6">Employee / User Name</th>
                <th className="py-4 px-6">Email Address</th>
                <th className="py-4 px-6">Job Role</th>
                <th className="py-4 px-6">Assigned Branch</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Last Login</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEDED] text-xs font-bold text-[#1B1C1C]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#817478]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#795465]" />
                    <span>Loading users...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#817478]">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const locationName = user.locations?.name || 'All Locations';
                  const isManagementRole = user.role === 'MANAGEMENT' || user.role === 'OWNER';

                  return (
                    <tr key={user.id} className="hover:bg-[#FBF9F9] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#F8C8DC]/40 text-[#795465] flex items-center justify-center font-black text-xs">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-[#1B1C1C]">{user.full_name}</p>
                            <p className="text-[10px] text-[#817478] font-medium">{user.phone_number || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-[#4F4448] font-medium">{user.email}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                            isManagementRole
                              ? 'bg-[#F8C8DC] text-[#795465]'
                              : 'bg-[#795465] text-white shadow-sm'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {isManagementRole ? 'MANAGEMENT' : 'SUPER ADMIN'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[#4F4448]">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#795465]" />
                          <span>{locationName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${
                            user.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[11px] text-[#817478] font-medium">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleString('en-US', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Never'}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 bg-[#F5F3F3] hover:bg-[#F8C8DC] text-[#795465] rounded-xl transition-colors"
                          title="Edit User Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowResetModal(true);
                          }}
                          className="p-2 bg-[#F5F3F3] hover:bg-[#F8C8DC] text-[#795465] rounded-xl transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`p-2 rounded-xl transition-colors ${
                            user.is_active
                              ? 'bg-[#FFDAD6] text-[#BA1A1A] hover:bg-[#FFB4AB]'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                          title={user.is_active ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {user.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register New User */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-[#EFEDED] shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#EFEDED] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#F8C8DC]/40 rounded-2xl text-[#795465]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1B1C1C]">Register New User</h3>
                  <p className="text-[11px] text-[#817478] font-medium">Create login credentials for Administrator or Branch Management.</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-[#F5F3F3] rounded-xl text-[#817478]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-bold text-[#1B1C1C]">
              <div>
                <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hendro Wijaya"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
                    <input
                      type="email"
                      required
                      placeholder="admin@sakurazen.id"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
                    <input
                      type="text"
                      placeholder="08123456789"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Initial Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1B1C1C] mb-1.5">Job role</label>
                  <AppSelect
                    aria-label="Job role"
                    zIndexClass="z-[90]"
                    value={formData.role}
                    onValueChange={(val) => setFormData({ ...formData, role: val as 'SUPER_ADMIN' | 'MANAGEMENT' })}
                    options={[
                      { value: 'MANAGEMENT', label: 'Management' },
                      { value: 'SUPER_ADMIN', label: 'Super Admin' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1B1C1C] mb-1.5">Assigned branch</label>
                  <AppSelect
                    aria-label="Assigned branch"
                    zIndexClass="z-[90]"
                    value={formData.location_id}
                    onValueChange={(val) => setFormData({ ...formData, location_id: val })}
                    options={[
                      { value: '', label: 'All Locations' },
                      ...locations.map((loc) => ({
                        value: loc.id,
                        label: loc.name,
                        hint: loc.location_code,
                      })),
                    ]}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#EFEDED]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 border border-[#EFEDED] hover:bg-[#FBF9F9] rounded-xl text-xs font-extrabold text-[#817478]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#795465] hover:bg-[#634251] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#795465]/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal EDIT USER */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-[#EFEDED] shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#EFEDED] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#F8C8DC]/40 rounded-2xl text-[#795465]">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1B1C1C]">Edit User Account</h3>
                  <p className="text-[11px] text-[#817478] font-medium">Update user profile details and branch assignment.</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-[#F5F3F3] rounded-xl text-[#817478]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-bold text-[#1B1C1C]">
              <div>
                <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
                  <input
                    type="text"
                    required
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
                    <input
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
                    <input
                      type="text"
                      value={editFormData.phone_number}
                      onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1B1C1C] mb-1.5">Job role</label>
                  <AppSelect
                    aria-label="Edit job role"
                    zIndexClass="z-[90]"
                    value={editFormData.role}
                    onValueChange={(val) => setEditFormData({ ...editFormData, role: val as 'SUPER_ADMIN' | 'MANAGEMENT' })}
                    options={[
                      { value: 'MANAGEMENT', label: 'Management' },
                      { value: 'SUPER_ADMIN', label: 'Super Admin' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1B1C1C] mb-1.5">Assigned branch</label>
                  <AppSelect
                    aria-label="Edit assigned branch"
                    zIndexClass="z-[90]"
                    value={editFormData.location_id}
                    onValueChange={(val) => setEditFormData({ ...editFormData, location_id: val })}
                    options={[
                      { value: '', label: 'All Locations' },
                      ...locations.map((loc) => ({
                        value: loc.id,
                        label: loc.name,
                        hint: loc.location_code,
                      })),
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1B1C1C] mb-1.5">Account status</label>
                <AppSelect
                  aria-label="Account status"
                  zIndexClass="z-[90]"
                  value={editFormData.is_active ? 'active' : 'inactive'}
                  onValueChange={(val) => setEditFormData({ ...editFormData, is_active: val === 'active' })}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#EFEDED]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 border border-[#EFEDED] hover:bg-[#FBF9F9] rounded-xl text-xs font-extrabold text-[#817478]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#795465] hover:bg-[#634251] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#795465]/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#EFEDED] shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#EFEDED] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#F8C8DC]/40 rounded-2xl text-[#795465]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1B1C1C]">Reset User Password</h3>
                  <p className="text-[11px] text-[#817478] font-medium">{selectedUser.full_name} ({selectedUser.email})</p>
                </div>
              </div>
              <button onClick={() => setShowResetModal(false)} className="p-2 hover:bg-[#F5F3F3] rounded-xl text-[#817478]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs font-bold text-[#1B1C1C]">
              <div>
                <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465]"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#EFEDED]">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-5 py-2.5 border border-[#EFEDED] hover:bg-[#FBF9F9] rounded-xl text-xs font-extrabold text-[#817478]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#795465] hover:bg-[#634251] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#795465]/20 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserManagementPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-[#817478]">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#795465]" />
        <span>Loading user management...</span>
      </div>
    }>
      <UserManagementContent />
    </Suspense>
  );
}
