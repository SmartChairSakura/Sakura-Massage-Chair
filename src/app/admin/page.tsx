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
} from 'lucide-react';
import { TOKUYO_THEME } from '@/lib/theme';
import { supabase } from '@/lib/supabase-client';
import { getLocalRegisteredChairs, saveLocalRegisteredChair, ChairUnit } from '@/lib/chair-registry';

export default function AdminDashboardPage() {
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
  const [newLocationName, setNewLocationName] = useState('');
  const [newPin, setNewPin] = useState('123456');
  const [modalMsg, setModalMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    // 1. Read local persistent chairs immediately
    const localChairs = getLocalRegisteredChairs();

    try {
      const query = new URLSearchParams();
      if (selectedChairFilter !== 'ALL') query.set('chairId', selectedChairFilter);
      if (selectedRangeFilter !== 'all') query.set('range', selectedRangeFilter);

      const res = await fetch(`/api/admin/dashboard?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        // Merge API chairs with local persistent chairs
        const chairMap = new Map<string, any>();
        localChairs.forEach((c) => chairMap.set(c.id, c));
        (data.chairs || []).forEach((c: any) => chairMap.set(c.id, c));

        const mergedChairs = Array.from(chairMap.values());
        mergedChairs.sort((a, b) => a.id.localeCompare(b.id));

        setChairs(mergedChairs);
        setTransactions(data.transactions || []);
        setAnalytics({
          ...(data.analytics || {
            grossRevenue: 0,
            mdrFee: 0,
            devShare: 0,
            ownerNet: 0,
            totalTransactions: 0,
            onlineCount: mergedChairs.length,
            totalChairs: mergedChairs.length,
          }),
          totalChairs: mergedChairs.length,
          onlineCount: mergedChairs.length,
        });
      } else {
        setChairs(localChairs);
      }
    } catch (err) {
      console.warn('Dashboard fetch fallback to local:', err);
      setChairs(localChairs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Supabase Realtime live update
    const chairsChannel = supabase
      .channel('admin-chairs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chairs' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const txChannel = supabase
      .channel('admin-transactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chairsChannel);
      supabase.removeChannel(txChannel);
    };
  }, [selectedChairFilter, selectedRangeFilter]);

  const handleAddChairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newChairId.trim().toUpperCase();
    const cleanName = newChairName.trim();
    const cleanLocation = newLocationName.trim();
    const cleanPin = newPin.trim() || '123456';

    if (!cleanId || !cleanName || !cleanLocation) {
      setModalMsg('Silakan isi seluruh kolom form.');
      return;
    }

    setIsSaving(true);
    setModalMsg('');

    const newUnit: ChairUnit = {
      id: cleanId,
      name: cleanName,
      location_name: cleanLocation,
      status: 'ONLINE',
      is_active: true,
      pin: cleanPin,
      created_at: new Date().toISOString(),
    };

    // 1. Save to local browser registry IMMEDIATELY (Optimistic Instant UI Sync)
    const updatedLocalChairs = saveLocalRegisteredChair(newUnit);
    setChairs(updatedLocalChairs);
    setAnalytics((prev) => ({
      ...prev,
      totalChairs: updatedLocalChairs.length,
      onlineCount: updatedLocalChairs.length,
    }));

    // Reset Modal Form & Close
    setShowAddModal(false);
    setNewChairId('');
    setNewChairName('');
    setNewLocationName('');
    setNewPin('123456');

    // 2. Background Sync to API & Supabase DB
    try {
      await fetch('/api/admin/chairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanId,
          name: cleanName,
          location_name: cleanLocation,
          pin: cleanPin,
        }),
      });
    } catch (err: any) {
      console.warn('API background sync note:', err);
    } finally {
      setIsSaving(false);
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

    transactions.forEach((tx) => {
      const row = [
        `"${tx.idempotency_key}"`,
        `"${new Date(tx.created_at).toLocaleString('id-ID')}"`,
        `"${tx.customer_phone || 'GUEST'}"`,
        `"${tx.chair_id}"`,
        tx.amount,
        tx.duration_minutes,
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
          {/* Branch / Chair Filter Dropdown */}
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

          {/* Date Range Filter Buttons */}
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
        {/* Gross Revenue */}
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

        {/* Owner Net Share (94.3%) */}
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

        {/* Developer Share (5%) */}
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

        {/* Fleet Devices Status */}
        <div className="bg-white border border-[#EFEDED] rounded-3xl p-5 space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-[#4F4448] text-xs font-extrabold uppercase tracking-wider">
            <span>Status Armada Kursi</span>
            <Activity className="w-5 h-5 text-[#795465]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#1B1C1C] font-mono">
            {chairs.length} / {chairs.length} <span className="text-xs font-bold text-[#4E635A]">ONLINE</span>
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
                <th className="p-3 font-extrabold">ID Kursi / Username EDC</th>
                <th className="p-3 font-extrabold">Nama Unit</th>
                <th className="p-3 font-extrabold">Lokasi Cabang</th>
                <th className="p-3 font-extrabold">Status Device</th>
                <th className="p-3 font-extrabold">PIN EDC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEDED]">
              {chairs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[#4F4448] font-medium">
                    Belum ada unit kursi terdaftar.
                  </td>
                </tr>
              ) : (
                chairs.map((chair) => (
                  <tr key={chair.id} className="hover:bg-[#F5F3F3]/50 transition-colors">
                    <td className="p-3 font-mono font-black text-[#795465]">{chair.id}</td>
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
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#F5F3F3]/50 transition-colors">
                    <td className="p-3 font-mono text-[#4F4448] text-[11px]">{tx.idempotency_key}</td>
                    <td className="p-3 text-[#1B1C1C] font-medium">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#795465]" />
                        <span>{tx.customer_phone || 'GUEST'}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-extrabold text-[#795465]">{tx.chair_id}</td>
                    <td className="p-3 font-bold">
                      <span className="text-[#1B1C1C] font-mono">Rp {Number(tx.amount).toLocaleString('id-ID')}</span>
                      <span className="text-[#4F4448] text-[11px] ml-1 font-normal">({tx.duration_minutes} Mnt)</span>
                    </td>
                    <td className="p-3">
                      <span className="bg-[#F5F3F3] border border-[#EFEDED] px-2 py-0.5 rounded font-mono text-[10px] text-[#4F4448] font-bold">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          tx.status === 'PAID' || tx.status === 'COMPLETED'
                            ? 'bg-[#CEE5DA] text-[#4E635A]'
                            : tx.status === 'CANCELLED'
                            ? 'bg-[#FFDAD6] text-[#93000A]'
                            : 'bg-[#ECCFC1] text-[#6F5A4F]'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#4F4448]">
                      {new Date(tx.created_at).toLocaleTimeString()}
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
                  ID Kursi / Username EDC:
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
                  Nama Unit Kursi:
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
    </div>
  );
}
