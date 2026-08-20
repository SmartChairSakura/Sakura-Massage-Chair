'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Key,
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
  role: 'SUPER_ADMIN' | 'OWNER';
  location_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  locations?: Location | null;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    phone_number: '',
    password: '',
    role: 'OWNER' as 'SUPER_ADMIN' | 'OWNER',
    location_id: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
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
  }, []);

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
        setErrorMsg(data.error || 'Gagal membuat user.');
      } else {
        setSuccessMsg(data.message || 'User berhasil dibuat.');
        setShowCreateModal(false);
        setFormData({
          full_name: '',
          email: '',
          username: '',
          phone_number: '',
          password: '',
          role: 'OWNER',
          location_id: '',
        });
        fetchUsers();
      }
    } catch (e) {
      setErrorMsg('Terjadi kesalahan jaringan.');
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
        setErrorMsg(data.error || 'Gagal mereset password.');
      } else {
        setSuccessMsg(`Password untuk ${selectedUser.full_name} berhasil diperbarui.`);
        setShowResetModal(false);
        setNewPassword('');
        setSelectedUser(null);
      }
    } catch (e) {
      setErrorMsg('Terjadi kesalahan server.');
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
                Kelola akun administrator HO dan Mitra Owner cabang.
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
            <span>CREATE USER</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
          <input
            type="text"
            placeholder="Cari nama, email, atau no handphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#EFEDED] rounded-2xl text-xs font-bold text-[#1B1C1C] focus:outline-none focus:border-[#795465] transition-colors"
          />
        </form>

        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-3 bg-white border border-[#EFEDED] hover:bg-[#FBF9F9] text-[#795465] rounded-2xl text-xs font-extrabold shadow-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH TABLE</span>
        </button>
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
                    <span>Memuat data pengguna...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#817478]">
                    Tidak ada data pengguna yang ditemukan.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const locationName = user.locations?.name || (user.role === 'SUPER_ADMIN' ? 'All Head Office' : '-');

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
                            user.role === 'SUPER_ADMIN'
                              ? 'bg-[#795465] text-white shadow-sm'
                              : 'bg-[#F8C8DC] text-[#795465]'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Owner Mitra'}
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
                          ? new Date(user.last_login_at).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Belum Pernah'}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
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
                          title={user.is_active ? 'Nonaktifkan Account' : 'Aktifkan Account'}
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

      {/* Modal + CREATE USER */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-[#EFEDED] shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#EFEDED] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#F8C8DC]/40 rounded-2xl text-[#795465]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1B1C1C]">Tambah User Account Baru</h3>
                  <p className="text-[11px] text-[#817478] font-medium">Buat kredensial login untuk Admin atau Owner.</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-[#F5F3F3] rounded-xl text-[#817478]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-bold text-[#1B1C1C]">
              <div>
                <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Nama Lengkap</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Hendro Wijaya"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
                    <input
                      type="email"
                      required
                      placeholder="owner@sakurazen.id"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">No. Handphone</label>
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
                <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Password Awal</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Job Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'SUPER_ADMIN' | 'OWNER' })}
                    className="w-full px-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465]"
                  >
                    <option value="OWNER">Owner Mitra Cabang</option>
                    <option value="SUPER_ADMIN">Super Admin (HO)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Cabang Lokasi</label>
                  <select
                    disabled={formData.role === 'SUPER_ADMIN'}
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#FBF9F9] border border-[#EFEDED] rounded-xl focus:outline-none focus:border-[#795465] disabled:opacity-50"
                  >
                    <option value="">-- Pilih Cabang --</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#EFEDED]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 border border-[#EFEDED] hover:bg-[#FBF9F9] rounded-xl text-xs font-extrabold text-[#817478]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#795465] hover:bg-[#634251] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#795465]/20 disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan & Buat User'}
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
                  <h3 className="text-base font-black text-[#1B1C1C]">Reset Password User</h3>
                  <p className="text-[11px] text-[#817478] font-medium">{selectedUser.full_name} ({selectedUser.email})</p>
                </div>
              </div>
              <button onClick={() => setShowResetModal(false)} className="p-2 hover:bg-[#F5F3F3] rounded-xl text-[#817478]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs font-bold text-[#1B1C1C]">
              <div>
                <label className="block text-[10px] font-extrabold text-[#795465] uppercase mb-1">Password Baru</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#817478]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Masukkan password baru"
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
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#795465] hover:bg-[#634251] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#795465]/20 disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
