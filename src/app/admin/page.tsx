'use client';

import React, { useState, useEffect } from 'react';
import { Chair, Transaction } from '@/types';
import {
  Armchair,
  TrendingUp,
  DollarSign,
  Activity,
  MapPin,
  Phone,
  RefreshCw,
  Plus,
  Download,
  Filter,
  PieChart,
  CheckCircle2,
  X,
  Database,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { TOKUYO_THEME } from '@/lib/theme';

export default function AdminDashboardPage() {
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dbSyncStatus, setDbSyncStatus] = useState<'unknown' | 'synced' | 'error'>('unknown');
  const [analytics, setAnalytics] = useState<{
    grossRevenue: number;
    mdrFee: number;
    devShare: number;
    ownerNet: number;
    totalTransactions: number;
    onlineCount: number;
    totalChairs: number;
  }>({
    grossRevenue: 0,
    mdrFee: 0,
    devShare: 0,
    ownerNet: 0,
    totalTransactions: 0,
    onlineCount: 0,
    totalChairs: 0,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [selectedChairFilter, setSelectedChairFilter] = useState<string>('ALL');
  const [selectedRangeFilter, setSelectedRangeFilter] = useState<string>('all');

  // Add Chair Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChairId, setNewChairId] = useState('');
  const [newChairName, setNewChairName] = useState('');
  const [newModelType, setNewModelType] = useState('Tokuyo TC-355');
  const [newLocationName, setNewLocationName] = useState('');
  const [newPin, setNewPin] = useState('123456');
  const [modalMsg, setModalMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Chair Modal State
  const [deleteConfirmChair, setDeleteConfirmChair] = useState<Chair | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // CORE FIX: Fetch ALL data via server-side API route only.
  // The API runs on Vercel serverless → CAN reach Supabase DB.
  // Browser-side Supabase client SDK is NOT used for data reads.
  // This guarantees identical data across all browsers.
  // ─────────────────────────────────────────────────────────────
  const fetchDashboardData = async () => {
    setIsLoading(true);

    try {
      const query = new URLSearchParams();
      if (selectedChairFilter !== 'ALL') query.set('chairId', selectedChairFilter);
      if (selectedRangeFilter !== 'all') query.set('range', selectedRangeFilter);

      const res = await fetch(`/api/admin/dashboard?${query.toString()}`);
      const data = await res.json();

      if (data.success) {
        const serverChairs = (data.chairs || []).map((c: any) => ({
          ...c,
          pin: c.pin || '123456',
          status: c.status || 'ONLINE',
        }));
        serverChairs.sort((a: any, b: any) => String(a.chair_code || a.id).localeCompare(String(b.chair_code || b.id)));

        setChairs(serverChairs);
        setTransactions(data.transactions || []);
        setDbSyncStatus('synced');
        const s = data.summary || data.analytics || {};
        setAnalytics({
          grossRevenue: s.grossRevenue || 0,
          mdrFee: s.mdrFee || 0,
          devShare: s.devShare || 0,
          ownerNet: s.ownerNet || 0,
          totalTransactions: s.totalTransactions || 0,
          onlineCount: s.onlineCount || serverChairs.length,
          totalChairs: s.totalChairs || serverChairs.length,
        });
      } else {
        console.warn('[Admin FE] Dashboard API returned error:', data);
        setDbSyncStatus('error');
      }
    } catch (err) {
      console.error('[Admin FE] Dashboard fetch error:', err);
      setDbSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedChairFilter, selectedRangeFilter]);

  // ─────────────────────────────────────────────────────────────
  // CORE FIX: Add chair via server API route ONLY.
  // Server-side supabaseServer writes directly to PostgreSQL.
  // No more browser-side Supabase SDK writes.
  // ─────────────────────────────────────────────────────────────
  const handleAddChairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newChairId.trim().toUpperCase();
    const cleanName = newChairName.trim();
    const cleanModelType = newModelType.trim() || 'Tokuyo TC-355';
    const cleanLocation = newLocationName.trim();
    const cleanPin = newPin.trim() || '123456';

    if (!cleanId || !cleanName || !cleanLocation) {
      setModalMsg('Silakan isi seluruh kolom form.');
      return;
    }

    setIsSaving(true);
    setModalMsg('');

    try {
      const res = await fetch('/api/admin/chairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanId,
          chair_code: cleanId,
          name: cleanName,
          model_type: cleanModelType,
          location_name: cleanLocation,
          pin: cleanPin,
        }),
      });

      const resData = await res.json();

      if (resData.success) {
        setShowAddModal(false);
      } else {
        setModalMsg(`Gagal menyimpan: ${resData.error || 'Unknown error'}`);
        setIsSaving(false);
        return;
      }
    } catch (err: any) {
      setModalMsg(`Network error: ${err?.message || 'Server unreachable'}`);
      setIsSaving(false);
      return;
    }

    // Reset form
    setNewChairId('');
    setNewChairName('');
    setNewLocationName('');
    setNewPin('123456');
    setIsSaving(false);

    // Refresh from server to get unified truth
    fetchDashboardData();
  };

  const handleDeleteChairConfirm = async () => {
    if (!deleteConfirmChair) return;
    const targetCode = String(deleteConfirmChair.chair_code || deleteConfirmChair.id).trim();

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/chairs?id=${encodeURIComponent(targetCode)}`, {
        method: 'DELETE',
      });
      const resData = await res.json();

      if (resData.success) {
        // Optimistically remove from state
        setChairs((prev) => prev.filter((c) => String(c.chair_code || c.id) !== targetCode));
        setDeleteConfirmChair(null);
      } else {
        alert(`Gagal menghapus unit kursi: ${resData.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Network error: ${e?.message || 'Server unreachable'}`);
    } finally {
      setIsDeleting(false);
      fetchDashboardData();
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('Belum ada transaksi untuk diexport.');
      return;
    }

    const headers = ['Idempotency Key', 'Tanggal & Jam', 'Pelanggan', 'Unit ID Kursi', 'Nominal (Rp)', 'Durasi (Mnt)', 'Metode Bayar', 'Status'];
    const csvRows = [headers.join(',')];

    transactions.forEach((tx: any) => {
      const row = [
        `"${tx.chair_slip_number || tx.idempotency_key || tx.id}"`,
        `"${new Date(tx.created_at).toLocaleString('id-ID')}"`,
        `"${tx.customer_phone || 'GUEST'}"`,
        `"${tx.chair_id}"`,
        tx.amount,
        tx.duration_in_minutes || tx.duration_minutes || 4,
        `"${tx.payment_method}"`,
        `"${tx.status}"`,
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap_transaksi_sakura_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex-1 p-4 sm:p-8 space-y-6 ${TOKUYO_THEME.bgBase}`}>
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-[#EFEDED] rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#F8C8DC] text-[#795465] rounded-2xl shadow-xs">
            <Armchair className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1B1C1C]">Admin Dashboard & Fleet Control</h1>
            <p className="text-xs text-[#4F4448] font-medium">Monitoring Armada Kursi Pijat & Realtime Revenue Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#795465] hover:bg-[#60404f] text-white px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Unit Kursi</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-white hover:bg-[#F5F3F3] border border-[#EFEDED] text-[#1B1C1C] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#795465]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-xl border border-[#EFEDED] hover:bg-[#F5F3F3] transition-colors text-[#4F4448] cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Filter Control Bar */}
      <div className="bg-white border border-[#EFEDED] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-[#1B1C1C]">
          <Filter className="w-4 h-4 text-[#795465]" />
          <span>Filter Laporan & Cabang:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#4F4448] font-medium">Cabang Unit:</span>
            <select
              value={selectedChairFilter}
              onChange={(e) => setSelectedChairFilter(e.target.value)}
              className="bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-3 py-1.5 font-bold text-[#795465] focus:outline-none cursor-pointer"
            >
              <option value="ALL">🌐 Semua Lokasi Cabang</option>
              {chairs.map((c) => (
                <option key={c.id} value={c.id}>
                  📍 {c.id} - {c.location_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-[#F5F3F3] p-1 rounded-xl border border-[#EFEDED] text-xs font-bold">
            <button
              onClick={() => setSelectedRangeFilter('today')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                selectedRangeFilter === 'today' ? 'bg-[#795465] text-white shadow-xs' : 'text-[#4F4448]'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setSelectedRangeFilter('7d')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                selectedRangeFilter === '7d' ? 'bg-[#795465] text-white shadow-xs' : 'text-[#4F4448]'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setSelectedRangeFilter('month')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                selectedRangeFilter === 'month' ? 'bg-[#795465] text-white shadow-xs' : 'text-[#4F4448]'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setSelectedRangeFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                selectedRangeFilter === 'all' ? 'bg-[#795465] text-white shadow-xs' : 'text-[#4F4448]'
              }`}
            >
              Semua
            </button>
          </div>
        </div>
      </div>

      {/* Metric Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white border border-[#EFEDED] rounded-3xl p-5 space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-[#4F4448] text-xs font-extrabold uppercase tracking-wider">
            <span>Total Omset Kotor</span>
            <DollarSign className="w-5 h-5 text-[#795465]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#1B1C1C] font-mono">
            Rp {analytics.grossRevenue.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-[#4E635A] font-semibold">
            {analytics.totalTransactions} Transaksi QRIS Sukses
          </div>
        </div>

        <div className="bg-[#CEE5DA]/30 border border-[#CEE5DA] rounded-3xl p-5 space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-[#4E635A] text-xs font-extrabold uppercase tracking-wider">
            <span>Hak Owner (95%)</span>
            <PieChart className="w-5 h-5 text-[#4E635A]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#4E635A] font-mono">
            Rp {analytics.ownerNet.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-[#4E635A] font-medium">
            Bersih Setelah QRIS MDR 0.7% & Bagi Hasil
          </div>
        </div>

        <div className="bg-[#F8C8DC]/30 border border-[#F8C8DC] rounded-3xl p-5 space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-[#795465] text-xs font-extrabold uppercase tracking-wider">
            <span>Bagi Hasil System (5%)</span>
            <TrendingUp className="w-5 h-5 text-[#795465]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#795465] font-mono">
            Rp {analytics.devShare.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-[#795465] font-semibold">
            Hak Pengembang & Operational
          </div>
        </div>

        <div className="bg-white border border-[#EFEDED] rounded-3xl p-5 space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-[#4F4448] text-xs font-extrabold uppercase tracking-wider">
            <span>Status Armada Kursi</span>
            <Activity className="w-5 h-5 text-[#795465]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#1B1C1C] font-mono">
            {analytics.onlineCount} / {analytics.totalChairs} <span className="text-xs font-bold text-[#4E635A]">ONLINE</span>
          </div>
          <div className="text-[11px] text-[#4F4448] font-medium">
            Terhubung di Supabase Realtime
          </div>
        </div>
      </div>

      {/* Registered Chairs Table */}
      <div className="bg-white border border-[#EFEDED] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-[#1B1C1C] flex items-center gap-2">
            <Armchair className="w-5 h-5 text-[#795465]" />
            Daftar Armada & Cabang Unit Kursi (EDC Pairings)
          </h2>
          <span className="text-xs text-[#4F4448] font-semibold">{chairs.length} Unit Terdaftar</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F5F3F3] text-[#1B1C1C] border-b border-[#EFEDED]">
                <th className="p-3 font-extrabold">Kode Unit / Username EDC</th>
                <th className="p-3 font-extrabold">Tipe / Model</th>
                <th className="p-3 font-extrabold">Nama Unit</th>
                <th className="p-3 font-extrabold">Lokasi Cabang</th>
                <th className="p-3 font-extrabold">Status Device</th>
                <th className="p-3 font-extrabold">PIN EDC</th>
                <th className="p-3 font-extrabold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEDED]">
              {chairs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#4F4448] font-medium">
                    {isLoading ? 'Memuat data dari server...' : 'Belum ada unit kursi terdaftar.'}
                  </td>
                </tr>
              ) : (
                chairs.map((chair) => (
                  <tr key={chair.id} className="hover:bg-[#F5F3F3]/50 transition-colors">
                    <td className="p-3 font-mono font-black text-[#795465]">
                      {chair.chair_code || chair.id}
                    </td>
                    <td className="p-3 text-[#4F4448]">
                      <span className="bg-[#F5F3F3] border border-[#EFEDED] px-2 py-0.5 rounded font-mono text-[10px] text-[#4F4448] font-bold">
                        {chair.model_type || 'Tokuyo TC-355'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-[#1B1C1C]">{chair.name}</td>
                    <td className="p-3 text-[#4F4448] font-semibold">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#795465]" />
                        <span>{chair.location_name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="bg-[#CEE5DA] text-[#4E635A] px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-max">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{chair.status || 'ONLINE'}</span>
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-[#4F4448]">{chair.pin || '123456'}</td>
                    <td className="p-3">
                      <button
                        onClick={() => setDeleteConfirmChair(chair)}
                        title="Hapus Unit Kursi"
                        className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Activity Table */}
      <div className="bg-white border border-[#EFEDED] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-base sm:text-lg font-black text-[#1B1C1C] flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#4E635A]" />
          Aktivitas Transaksi Pelanggan Realtime
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F5F3F3] text-[#1B1C1C] border-b border-[#EFEDED]">
                <th className="p-3 font-extrabold">Idempotency Key</th>
                <th className="p-3 font-extrabold">Pelanggan</th>
                <th className="p-3 font-extrabold">Unit Kursi ID</th>
                <th className="p-3 font-extrabold">Nominal & Durasi</th>
                <th className="p-3 font-extrabold">Metode Bayar</th>
                <th className="p-3 font-extrabold">Status</th>
                <th className="p-3 font-extrabold">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEDED]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#4F4448] font-medium">
                    Belum ada data transaksi pada filter terpilih.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-[#F5F3F3]/50 transition-colors">
                    <td className="p-3 font-mono text-[#4F4448] text-[11px]">
                      {tx.chair_slip_number || tx.idempotency_key || tx.id}
                    </td>
                    <td className="p-3 text-[#1B1C1C] font-medium">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#795465]" />
                        <span>{tx.customer_phone || 'GUEST'}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-extrabold text-[#795465]">{tx.chair_id}</td>
                    <td className="p-3 font-bold">
                      <span className="text-[#1B1C1C] font-mono">Rp {Number(tx.amount).toLocaleString('id-ID')}</span>
                      <span className="text-[#4F4448] text-[11px] ml-1 font-normal">
                        ({tx.duration_in_minutes || tx.duration_minutes || 4} Mnt)
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="bg-[#F5F3F3] border border-[#EFEDED] px-2 py-0.5 rounded font-mono text-[10px] text-[#4F4448] font-bold">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="p-3">
                      {(() => {
                        const st = String(tx.status || '').toLowerCase();
                        if (st === 'session_inprocess' || st === 'ongoing') {
                          return (
                            <span className="font-extrabold px-2.5 py-1 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-max animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                              <span>SESSION INPROCESS</span>
                            </span>
                          );
                        }
                        if (st === 'done' || st === 'completed' || st === 'paid') {
                          return (
                            <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-[#CEE5DA] text-[#4E635A]">
                              {st === 'done' ? 'DONE' : st.toUpperCase()}
                            </span>
                          );
                        }
                        if (st === 'paid_pending_delivery') {
                          return (
                            <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-900 border border-amber-300">
                              PENDING DELIVERY
                            </span>
                          );
                        }
                        if (st === 'expired_paid') {
                          return (
                            <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-rose-100 text-rose-900 border border-rose-300">
                              EXPIRED PAID
                            </span>
                          );
                        }
                        if (st === 'pending') {
                          return (
                            <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-[#ECCFC1] text-[#6F5A4F]">
                              PENDING
                            </span>
                          );
                        }
                        return (
                          <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-[#FFDAD6] text-[#93000A]">
                            {st.toUpperCase()}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 text-[#4F4448]">
                      {tx.created_at ? new Date(tx.created_at).toLocaleTimeString('id-ID') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add New Chair Form */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#1B1C1C]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EFEDED] rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-[#4F4448] hover:text-[#1B1C1C] p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#EFEDED] pb-3">
              <div className="p-2.5 bg-[#F8C8DC] text-[#795465] rounded-xl">
                <Armchair className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1B1C1C]">Registrasi Unit Kursi Baru</h3>
                <p className="text-xs text-[#4F4448]">Daftarkan ID Kursi untuk Login EDC di Lokasi</p>
              </div>
            </div>

            {modalMsg && (
              <div className="bg-[#FFDAD6] text-[#93000A] text-xs font-bold p-3 rounded-xl border border-[#FFB4AB]">
                {modalMsg}
              </div>
            )}

            <form onSubmit={handleAddChairSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Kode Unit / Username EDC:
                </label>
                <input
                  type="text"
                  value={newChairId}
                  onChange={(e) => setNewChairId(e.target.value.toUpperCase())}
                  placeholder="Contoh: SAKURA-PIK-01"
                  className="w-full bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#1B1C1C] focus:outline-none focus:border-[#795465]"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Tipe / Model Hardware:
                </label>
                <input
                  type="text"
                  value={newModelType}
                  onChange={(e) => setNewModelType(e.target.value)}
                  placeholder="Contoh: Tokuyo TC-355"
                  className="w-full bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1B1C1C] focus:outline-none focus:border-[#795465]"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Nama Unit Kursi (Alias):
                </label>
                <input
                  type="text"
                  value={newChairName}
                  onChange={(e) => setNewChairName(e.target.value)}
                  placeholder="Contoh: Sakura Series #04 - PIK"
                  className="w-full bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1B1C1C] focus:outline-none focus:border-[#795465]"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  Lokasi Cabang:
                </label>
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="Contoh: Pantai Indah Kapuk - PIK"
                  className="w-full bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1B1C1C] focus:outline-none focus:border-[#795465]"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-1">
                  PIN Password EDC (Default 123456):
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#1B1C1C] focus:outline-none focus:border-[#795465]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-[#795465] text-white font-extrabold py-3 rounded-xl text-xs shadow-md shadow-[#795465]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Unit Kursi'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 bg-[#F5F3F3] text-[#4F4448] font-bold py-3 rounded-xl text-xs hover:bg-[#E9E8E8] transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Chair */}
      {deleteConfirmChair && (
        <div className="fixed inset-0 bg-[#1B1C1C]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EFEDED] rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setDeleteConfirmChair(null)}
              className="absolute right-4 top-4 text-[#4F4448] hover:text-[#1B1C1C] p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#EFEDED] pb-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1B1C1C]">Konfirmasi Hapus Unit Kursi</h3>
                <p className="text-xs text-[#4F4448]">Tindakan ini akan menonaktifkan unit kursi</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-1">
              <p className="font-bold">
                Apakah Anda yakin ingin menghapus unit kursi{' '}
                <span className="font-mono text-rose-950 font-black">
                  '{deleteConfirmChair.chair_code || deleteConfirmChair.id}'
                </span>?
              </p>
              <p className="text-[11px] text-rose-700">
                Nama Unit: {deleteConfirmChair.name} ({deleteConfirmChair.location_name})
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleDeleteChairConfirm}
                disabled={isDeleting}
                className="flex-1 bg-rose-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-md shadow-rose-700/20 hover:bg-rose-800 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Unit Kursi'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmChair(null)}
                className="px-4 bg-[#F5F3F3] text-[#4F4448] font-bold py-3 rounded-xl text-xs hover:bg-[#E9E8E8] transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
