'use client';

import React, { useState, useEffect } from 'react';
import { Chair, Transaction } from '@/types';
import { Armchair, TrendingUp, DollarSign, Activity, MapPin, Phone, RefreshCw } from 'lucide-react';
import { TOKUYO_THEME } from '@/lib/theme';
import { supabase } from '@/lib/supabase-client';

export default function AdminDashboardPage() {
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<{ totalRevenue: number; onlineCount: number; totalChairs: number }>({
    totalRevenue: 0,
    onlineCount: 0,
    totalChairs: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      if (data.success) {
        setChairs(data.chairs || []);
        setTransactions(data.transactions || []);
        setAnalytics(data.analytics || { totalRevenue: 0, onlineCount: 0, totalChairs: 0 });
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Supabase Realtime live update on chairs & transactions
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
  }, []);

  return (
    <div className={`flex-1 p-6 md:p-10 space-y-8 ${TOKUYO_THEME.bgBase}`}>
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-amber-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-600 to-amber-600 text-white rounded-2xl shadow-md">
            <Armchair className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Web Dashboard & Fleet Tracker</h1>
            <p className="text-xs text-slate-500 font-medium">Monitoring Unit Kursi Pijat Sakura & Live Revenue Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Supabase Realtime Active
          </span>
        </div>
      </header>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Pendapatan Hari Ini</span>
            <DollarSign className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            Rp {analytics.totalRevenue.toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-emerald-600 font-semibold">
            Live Stream Database
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Status Fleet Unit</span>
            <Activity className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            {analytics.onlineCount} / {analytics.totalChairs} <span className="text-sm font-normal text-slate-500">Online</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Tersebar di Cabang & Staging
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Metode Bayar</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            100% <span className="text-sm font-normal text-slate-500">QRIS</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Sistem Kiosk Otomatis
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Rata-Rata Durasi</span>
            <Armchair className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            16 Menit
          </div>
          <div className="text-xs text-orange-700 font-semibold">
            Paket Rp 20.000 Terfavorit
          </div>
        </div>
      </div>

      {/* Chair Fleet Status Table */}
      <div className="bg-white border border-amber-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Armchair className="w-5 h-5 text-orange-600" />
          Armada Kursi Pijat Sakura (Multi-Location Tracker)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-amber-50/80 text-amber-900 border-b border-amber-200">
                <th className="p-3 font-bold">ID Kursi</th>
                <th className="p-3 font-bold">Nama Unit</th>
                <th className="p-3 font-bold">Lokasi Cabang</th>
                <th className="p-3 font-bold">Status Device</th>
                <th className="p-3 font-bold">Heartbeat Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chairs.map((chair) => (
                <tr key={chair.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-orange-600">{chair.id}</td>
                  <td className="p-3 font-bold text-slate-900">{chair.name}</td>
                  <td className="p-3 text-slate-600 flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-orange-600" />
                    {chair.location_name}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold ${
                        chair.status === 'ONLINE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : chair.status === 'BUSY'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          chair.status === 'ONLINE'
                            ? 'bg-emerald-500 animate-pulse'
                            : chair.status === 'BUSY'
                            ? 'bg-amber-500 animate-pulse'
                            : 'bg-rose-500'
                        }`}
                      />
                      {chair.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">
                    {chair.last_heartbeat ? new Date(chair.last_heartbeat).toLocaleTimeString() : 'Baru saja'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Ticket & Transaction Activity Table */}
      <div className="bg-white border border-amber-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          Aktivitas Transaksi Pelanggan (Supabase Realtime)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-amber-50/80 text-amber-900 border-b border-amber-200">
                <th className="p-3 font-bold">Idempotency Key</th>
                <th className="p-3 font-bold">Pelanggan</th>
                <th className="p-3 font-bold">Unit Kursi</th>
                <th className="p-3 font-bold">Nominal & Durasi</th>
                <th className="p-3 font-bold">Metode Bayar</th>
                <th className="p-3 font-bold">Status</th>
                <th className="p-3 font-bold">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">
                    Belum ada transaksi. Transaksi baru akan muncul otomatis secara Real-time.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-500 text-[11px]">{tx.idempotency_key}</td>
                    <td className="p-3 text-slate-800 font-medium">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-orange-600" />
                        <span>{tx.customer_phone || 'GUEST'}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-orange-600">{tx.chair_id}</td>
                    <td className="p-3 font-bold">
                      <span className="text-slate-900 font-mono">Rp {Number(tx.amount).toLocaleString('id-ID')}</span>
                      <span className="text-slate-500 text-[11px] ml-1 font-normal">({tx.duration_minutes} Mnt)</span>
                    </td>
                    <td className="p-3">
                      <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono text-[10px] text-slate-700">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          tx.status === 'PAID' || tx.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : tx.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(tx.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
