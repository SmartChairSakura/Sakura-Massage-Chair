'use client';

import React, { useState } from 'react';
import { Chair, Transaction } from '@/types';
import { Armchair, TrendingUp, DollarSign, Activity, MapPin, Phone, RefreshCw } from 'lucide-react';
import { TOKUYO_THEME } from '@/lib/theme';

const MOCK_CHAIRS: Chair[] = [
  { id: 'SAKURA-GI-01', name: 'Sakura Series #01', location_name: 'Grand Indonesia Lt 3', status: 'ONLINE', is_active: true, created_at: '2026-07-30' },
  { id: 'SAKURA-GI-02', name: 'Sakura Series #02', location_name: 'Grand Indonesia Lt 3', status: 'BUSY', is_active: true, created_at: '2026-07-30' },
  { id: 'SAKURA-CP-01', name: 'Sakura Series #03', location_name: 'Central Park Fl 1', status: 'ONLINE', is_active: true, created_at: '2026-07-30' },
  { id: 'SAKURA-CP-02', name: 'Sakura Series #04', location_name: 'Central Park Fl 1', status: 'OFFLINE', is_active: true, created_at: '2026-07-30' },
  { id: 'SAKURA-PIM-01', name: 'Sakura Series #05', location_name: 'Pondok Indah Mall 2', status: 'ONLINE', is_active: true, created_at: '2026-07-30' },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-01',
    idempotency_key: 'TRX-SAKURA-GI-01-1001',
    chair_id: 'SAKURA-GI-01',
    customer_phone: 'GUEST',
    customer_email: '',
    amount: 20000,
    duration_minutes: 16,
    pulse_count: 4,
    payment_method: 'QRIS',
    status: 'PAID',
    created_at: new Date().toLocaleTimeString(),
    updated_at: new Date().toLocaleTimeString(),
  },
  {
    id: 'tx-02',
    idempotency_key: 'TRX-SAKURA-GI-02-1002',
    chair_id: 'SAKURA-GI-02',
    customer_phone: 'GUEST',
    customer_email: '',
    amount: 50000,
    duration_minutes: 40,
    pulse_count: 10,
    payment_method: 'QRIS',
    status: 'ONGOING',
    created_at: new Date().toLocaleTimeString(),
    updated_at: new Date().toLocaleTimeString(),
  },
  {
    id: 'tx-03',
    idempotency_key: 'TRX-SAKURA-CP-01-1003',
    chair_id: 'SAKURA-CP-01',
    customer_phone: 'GUEST',
    amount: 10000,
    duration_minutes: 8,
    pulse_count: 2,
    payment_method: 'CASH',
    status: 'COMPLETED',
    created_at: new Date().toLocaleTimeString(),
    updated_at: new Date().toLocaleTimeString(),
  },
];

export default function AdminDashboardPage() {
  const [chairs] = useState<Chair[]>(MOCK_CHAIRS);
  const [transactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);

  const totalRevenue = transactions.reduce(
    (acc, curr) =>
      acc + (curr.status === 'PAID' || curr.status === 'ONGOING' || curr.status === 'COMPLETED' ? curr.amount : 0),
    0
  );
  const onlineCount = chairs.filter((c) => c.status === 'ONLINE' || c.status === 'BUSY').length;

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
            <p className="text-xs text-slate-500 font-medium">Monitoring 25 Unit Kursi Pijat Sakura & Revenue Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live WebSocket Realtime
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
            Rp {totalRevenue.toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-emerald-600 font-semibold">
            +12% dibanding kemarin
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Status Fleet Unit</span>
            <Activity className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            {onlineCount} / {chairs.length} <span className="text-sm font-normal text-slate-500">Online</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            25 Unit Tersebar di Cabang
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Transaksi QRIS vs Cash</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            67% <span className="text-sm font-normal text-slate-500">QRIS</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            33% Tunai (GENIUS 7)
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
          Armada Kursi Pijat Sakura (25 Unit Multi-Location Tracker)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-amber-50/80 text-amber-900 border-b border-amber-200">
                <th className="p-3 font-bold">ID Kursi</th>
                <th className="p-3 font-bold">Nama Unit</th>
                <th className="p-3 font-bold">Lokasi Cabang</th>
                <th className="p-3 font-bold">Status Device</th>
                <th className="p-3 font-bold">Aktivitas Terakhir</th>
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
                  <td className="p-3 text-slate-500">Baru saja (30s)</td>
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
          Aktivitas Tiket & Transaksi Pelanggan
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-amber-50/80 text-amber-900 border-b border-amber-200">
                <th className="p-3 font-bold">Idempotency Key</th>
                <th className="p-3 font-bold">Tipe Pelanggan</th>
                <th className="p-3 font-bold">Unit Kursi</th>
                <th className="p-3 font-bold">Nominal & Durasi</th>
                <th className="p-3 font-bold">Metode Bayar</th>
                <th className="p-3 font-bold">Status</th>
                <th className="p-3 font-bold">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono text-slate-500">{tx.idempotency_key}</td>
                  <td className="p-3 text-slate-800 font-medium">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-orange-600" />
                      <span>{tx.customer_phone || 'GUEST'}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono font-bold text-orange-600">{tx.chair_id}</td>
                  <td className="p-3 font-bold">
                    <span className="text-slate-900 font-mono">Rp {tx.amount.toLocaleString('id-ID')}</span>
                    <span className="text-slate-500 text-[11px] ml-1 font-normal">({tx.duration_minutes} Mnt)</span>
                  </td>
                  <td className="p-3">
                    <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono text-[10px] text-slate-700">
                      {tx.payment_method}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-emerald-700 font-bold">{tx.status}</span>
                  </td>
                  <td className="p-3 text-slate-500">{tx.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
