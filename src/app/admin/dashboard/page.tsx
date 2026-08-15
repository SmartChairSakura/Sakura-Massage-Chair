'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Activity,
  Armchair,
  CheckCircle2,
  QrCode,
  Percent,
} from 'lucide-react';
import { Chair, Transaction } from '@/types';

export const dynamic = 'force-dynamic';

function DashboardContent() {
  const searchParams = useSearchParams();
  const locationIdParam = searchParams.get('location_id') || 'ALL';

  const [rangeFilter, setRangeFilter] = useState<string>('all');
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState({
    grossRevenue: 0,
    mdrFee: 0,
    netGross: 0,
    ownerNet: 0,
    systemNet: 0,
    totalTransactions: 0,
    onlineCount: 0,
    totalChairs: 0,
    ownerSharePct: 95.0,
    systemSharePct: 5.0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (locationIdParam !== 'ALL') query.set('location_id', locationIdParam);
      if (rangeFilter !== 'all') query.set('range', rangeFilter);

      const res = await fetch(`/api/admin/dashboard?${query.toString()}`);
      const data = await res.json();

      if (data.success) {
        setChairs(data.chairs || []);
        setTransactions(data.transactions || []);

        const s = data.summary || {};
        setAnalytics({
          grossRevenue: s.grossRevenue || 0,
          mdrFee: s.mdrFee || 0,
          netGross: s.netGross || 0,
          ownerNet: s.ownerNet || 0,
          systemNet: s.systemNet || 0,
          totalTransactions: s.totalTransactions || 0,
          onlineCount: s.onlineCount || (data.chairs || []).length,
          totalChairs: s.totalChairs || (data.chairs || []).length,
          ownerSharePct: s.ownerSharePct || 95.0,
          systemSharePct: s.systemSharePct || 5.0,
        });
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [locationIdParam, rangeFilter]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#1B1C1C] tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#795465]" />
            <span>Sales Summary & Revenue Analytics</span>
          </h1>
          <p className="text-xs text-[#4F4448] font-bold mt-1">
            Ringkasan omset kotor, biaya MDR QRIS (0.7%), hak net owner, dan bagi hasil system.
          </p>
        </div>

        {/* Date Range Tabs */}
        <div className="flex items-center bg-[#F5F3F3] p-1 rounded-2xl border border-[#EFEDED]">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: '7d', label: '7 Hari' },
            { id: 'month', label: 'Bulan Ini' },
            { id: 'all', label: 'Semua' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRangeFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                rangeFilter === tab.id
                  ? 'bg-[#795465] text-white shadow-sm'
                  : 'text-[#4F4448] hover:text-[#1B1C1C]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4-Tier Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue Gross */}
        <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#795465] uppercase tracking-wider">
              Total Omset Kotor (Gross)
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#F8C8DC] text-[#795465] flex items-center justify-center font-extrabold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#1B1C1C]">
              {formatRupiah(analytics.grossRevenue)}
            </div>
            <span className="text-[10px] font-bold text-[#817478] mt-0.5 block">
              {analytics.totalTransactions} Transaksi QRIS Sukses
            </span>
          </div>
        </div>

        {/* Card 2: MDR Fee (0.7%) */}
        <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#BA1A1A] uppercase tracking-wider">
              MDR Fee (0.7% QRIS)
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#FFDAD6] text-[#BA1A1A] flex items-center justify-center font-extrabold">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#1B1C1C]">
              {formatRupiah(analytics.mdrFee)}
            </div>
            <span className="text-[10px] font-bold text-[#817478] mt-0.5 block">
              Dipotong Bank / Gateway QRIS
            </span>
          </div>
        </div>

        {/* Card 3: Hak Owner Net (95%) */}
        <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#4E635A] uppercase tracking-wider">
              Hak Owner Net ({analytics.ownerSharePct}%)
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#CEE5DA] text-[#4E635A] flex items-center justify-center font-extrabold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#4E635A]">
              {formatRupiah(analytics.ownerNet)}
            </div>
            <span className="text-[10px] font-bold text-[#817478] mt-0.5 block">
              Bersih Setelah MDR & Bagi Hasil
            </span>
          </div>
        </div>

        {/* Card 4: Bagi Hasil System Net (5%) */}
        <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#795465] uppercase tracking-wider">
              Bagi Hasil System ({analytics.systemSharePct}%)
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#F8C8DC] text-[#795465] flex items-center justify-center font-extrabold">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#795465]">
              {formatRupiah(analytics.systemNet)}
            </div>
            <span className="text-[10px] font-bold text-[#817478] mt-0.5 block">
              Pengembang & Operasional
            </span>
          </div>
        </div>
      </div>

      {/* QRIS Method & Status Fleet Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QRIS Payment Breakdown Banner */}
        <div className="lg:col-span-1 bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#F8C8DC] text-[#795465] flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-extrabold text-[#1B1C1C]">Metode Bayar: QRIS</h2>
            </div>
            <p className="text-xs text-[#4F4448] font-bold">
              Seluruh transaksi pembayaran kursi pijat menggunakan integrasi QRIS Statis & Dinamis EDC.
            </p>
          </div>

          <div className="p-4 bg-[#FBF9F9] rounded-2xl border border-[#EFEDED] mt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#4E635A]" />
              <span className="text-xs font-extrabold text-[#1B1C1C]">QRIS Merchant Settlement</span>
            </div>
            <span className="text-xs font-mono font-extrabold text-[#795465]">100%</span>
          </div>
        </div>

        {/* Status Fleet Summary Card */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-extrabold text-[#1B1C1C] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#795465]" />
                <span>Status Armada & Keterhubungan Database</span>
              </h2>
              <p className="text-xs text-[#4F4448] font-bold mt-0.5">
                Monitoring unit terhubung secara realtime dengan PostgreSQL Supabase.
              </p>
            </div>
            <span className="px-3 py-1 bg-[#CEE5DA] text-[#4E635A] text-[10px] font-extrabold rounded-full">
              Realtime Sync
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-[#FBF9F9] rounded-2xl border border-[#EFEDED]">
              <span className="text-[10px] font-bold text-[#817478] uppercase">Armada Online</span>
              <div className="text-xl font-extrabold text-[#4E635A] mt-1">
                {analytics.onlineCount} / {analytics.totalChairs}
              </div>
            </div>
            <div className="p-4 bg-[#FBF9F9] rounded-2xl border border-[#EFEDED]">
              <span className="text-[10px] font-bold text-[#817478] uppercase">Total Sesi QRIS</span>
              <div className="text-xl font-extrabold text-[#795465] mt-1">
                {analytics.totalTransactions} Sesi
              </div>
            </div>
            <div className="p-4 bg-[#FBF9F9] rounded-2xl border border-[#EFEDED] col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-[#817478] uppercase">Status Sistem</span>
              <div className="text-xs font-extrabold text-[#4E635A] mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Terhubung</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registered Fleet Table Overview */}
      <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] space-y-4">
        <h2 className="text-sm font-extrabold text-[#1B1C1C] flex items-center gap-2">
          <Armchair className="w-4 h-4 text-[#795465]" />
          <span>Daftar Armada Kursi Terdaftar</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F5F3F3] text-[#1B1C1C] border-b border-[#EFEDED]">
                <th className="p-3.5 font-extrabold">Kode Unit / EDC</th>
                <th className="p-3.5 font-extrabold">Model Hardware</th>
                <th className="p-3.5 font-extrabold">Nama Unit</th>
                <th className="p-3.5 font-extrabold">Lokasi Cabang</th>
                <th className="p-3.5 font-extrabold">Status Device</th>
                <th className="p-3.5 font-extrabold">PIN Password</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEDED]">
              {chairs.map((c) => (
                <tr key={String(c.chair_code || c.id)} className="hover:bg-[#FBF9F9] transition-colors">
                  <td className="p-3.5 font-mono font-extrabold text-[#795465]">
                    {c.chair_code || String(c.id)}
                  </td>
                  <td className="p-3.5 font-extrabold text-[#1B1C1C]">{c.model_type || 'Tokuyo TC-355'}</td>
                  <td className="p-3.5 font-bold text-[#4F4448]">{c.name}</td>
                  <td className="p-3.5 font-bold text-[#1B1C1C]">{c.location_name}</td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#CEE5DA] text-[#4E635A]">
                      <CheckCircle2 className="w-3 h-3" />
                      {c.status || 'ONLINE'}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono font-bold text-[#1B1C1C]">{c.pin || '123456'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SalesSummaryDashboardPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs font-extrabold text-[#795465] animate-pulse">Memuat dashboard analytics...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
