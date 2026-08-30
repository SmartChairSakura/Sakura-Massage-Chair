'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Activity,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  RefreshCw,
  Percent,
  ChevronDown,
  Filter,
  ArrowUpRight,
} from 'lucide-react';
import { Location, Transaction } from '@/types';

export const dynamic = 'force-dynamic';

interface DailyTrendItem {
  rawDate: string;
  dateLabel: string;
  gross: number;
  ownerNet: number;
  transactions: number;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const locationIdParam = searchParams.get('location_id') || 'ALL';

  const [rangeFilter, setRangeFilter] = useState<string>('all');
  const [dateType, setDateType] = useState<'created_at' | 'settled_at'>('created_at');
  const [showCustomDate, setShowCustomDate] = useState<boolean>(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrendItem[]>([]);
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<DailyTrendItem | null>(null);

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
    periodChangePct: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (locationIdParam !== 'ALL') query.set('location_id', locationIdParam);
      query.set('date_type', dateType);
      if (dateFrom) query.set('date_from', dateFrom);
      if (dateTo) query.set('date_to', dateTo);
      if (!dateFrom && !dateTo && rangeFilter !== 'all') query.set('range', rangeFilter);

      const res = await fetch(`/api/admin/dashboard?${query.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLocations(data.locations || []);
        setTransactions(data.transactions || []);
        setDailyTrend(data.dailyTrend || []);

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
          periodChangePct: s.periodChangePct || 0,
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
  }, [locationIdParam, rangeFilter, dateType, dateFrom, dateTo]);

  const handleResetDateFilters = () => {
    setDateFrom('');
    setDateTo('');
    setRangeFilter('all');
    setShowCustomDate(false);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // SVG Line Chart Coordinate Generator
  const renderTrendChart = () => {
    if (dailyTrend.length === 0) {
      return (
        <div className="h-48 flex flex-col items-center justify-center text-[#817478] bg-[#FBF9F9] rounded-2xl border border-dashed border-[#EFEDED]">
          <TrendingUp className="w-8 h-8 mb-2 text-[#D2C3C7]" />
          <p className="text-xs font-bold">Belum ada data tren omset pada rentang tanggal terpilih.</p>
        </div>
      );
    }

    const width = 600;
    const height = 180;
    const padding = 25;

    const maxVal = Math.max(...dailyTrend.map((d) => d.gross), 100000);
    const minVal = 0;

    const points = dailyTrend.map((d, idx) => {
      const x = padding + (idx / Math.max(1, dailyTrend.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.gross - minVal) / (maxVal - minVal)) * (height - padding * 2);
      return { x, y, data: d };
    });

    const pathD = points.reduce(
      (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
      ''
    );

    return (
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#EFEDED" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#EFEDED" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#EFEDED" />

          {/* Line path */}
          <path d={pathD} fill="none" stroke="#795465" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Point markers */}
          {points.map((pt, idx) => (
            <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredTrendPoint(pt.data)}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredTrendPoint?.rawDate === pt.data.rawDate ? 6 : 4}
                fill={hoveredTrendPoint?.rawDate === pt.data.rawDate ? '#4E635A' : '#795465'}
                stroke="#FFFFFF"
                strokeWidth="2"
                className="transition-all"
              />
            </g>
          ))}
        </svg>

        {/* Tooltip Overlay */}
        {hoveredTrendPoint && (
          <div className="p-3 bg-[#1B1C1C] text-white rounded-xl shadow-xl text-xs space-y-1 my-2">
            <div className="flex items-center justify-between gap-4 font-bold border-b border-zinc-700 pb-1">
              <span>{hoveredTrendPoint.dateLabel}</span>
              <span className="text-[#F8C8DC]">{hoveredTrendPoint.transactions} Sesi</span>
            </div>
            <div className="flex items-center justify-between gap-4 font-mono">
              <span className="text-zinc-400">Gross:</span>
              <span>{formatRupiah(hoveredTrendPoint.gross)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 font-mono font-bold text-emerald-400">
              <span>Owner Net:</span>
              <span>{formatRupiah(hoveredTrendPoint.ownerNet)}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Streamlined Filter Bar */}
      <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#1B1C1C] tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#795465]" />
            <span>Sales Summary</span>
          </h1>
          <p className="text-xs text-[#817478] font-medium mt-1">
            Ringkasan omset penjualan QRIS, biaya MDR (0.7%), hak bersih owner, dan bagi hasil sistem.
          </p>
        </div>

        {/* Filter Controls (Presets + Settlement Toggle + Custom Date) */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Toggle: Date Mode (Created At vs Settled At) */}
          <div className="flex items-center bg-[#F5F3F3] p-1 rounded-2xl border border-[#EFEDED]">
            <button
              onClick={() => setDateType('created_at')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                dateType === 'created_at'
                  ? 'bg-[#795465] text-white shadow-sm'
                  : 'text-[#4F4448] hover:text-[#1B1C1C]'
              }`}
            >
              Created At
            </button>
            <button
              onClick={() => setDateType('settled_at')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                dateType === 'settled_at'
                  ? 'bg-[#795465] text-white shadow-sm'
                  : 'text-[#4F4448] hover:text-[#1B1C1C]'
              }`}
            >
              Settled At
            </button>
          </div>

          {/* Preset Date Range Buttons */}
          <div className="flex items-center bg-[#F5F3F3] p-1 rounded-2xl border border-[#EFEDED]">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: '7d', label: '7 Hari' },
              { id: 'month', label: 'Bulan Ini' },
              { id: 'all', label: 'Semua' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setRangeFilter(tab.id);
                  setShowCustomDate(false);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  !dateFrom && !dateTo && rangeFilter === tab.id
                    ? 'bg-[#795465] text-white shadow-sm'
                    : 'text-[#4F4448] hover:text-[#1B1C1C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Collapsible Custom Date Filter */}
          <button
            onClick={() => setShowCustomDate(!showCustomDate)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-[#EFEDED] text-xs font-extrabold transition-colors ${
              dateFrom || dateTo ? 'bg-[#795465] text-white' : 'bg-[#F5F3F3] text-[#1B1C1C] hover:bg-[#EFEDED]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{dateFrom || dateTo ? 'Custom Date' : 'Custom'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expanded Custom Date Picker Bar */}
      {showCustomDate && (
        <div className="p-4 bg-white rounded-2xl border border-[#EFEDED] shadow-sm flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
          <span className="text-xs font-extrabold text-[#795465] uppercase">Custom Date Range:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] outline-none"
          />
          <span className="text-xs font-bold text-[#817478]">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] outline-none"
          />
          <button
            onClick={handleResetDateFilters}
            className="p-1.5 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#795465] rounded-xl transition-colors"
            title="Reset Date"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero Financial Summary: Waterfall Flow Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Highlight Card: Owner Net */}
        <div className="lg:col-span-2 bg-[#FBF9F9] border-2 border-[#4E635A]/30 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
                  Owner Net ({analytics.ownerSharePct}%)
                </span>
                <p className="text-[11px] text-[#817478] font-bold">Pendapatan Bersih Pemilik Lahan</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {analytics.periodChangePct >= 0 ? `+${analytics.periodChangePct}%` : `${analytics.periodChangePct}%`}
            </span>
          </div>

          <div>
            <div className="text-4xl sm:text-5xl font-black text-[#1B1C1C] tracking-tight">
              {formatRupiah(analytics.ownerNet)}
            </div>
            <p className="text-xs font-bold text-[#817478] mt-2">
              Bersih setelah pemotongan MDR ({analytics.mdrFee > 0 ? formatRupiah(analytics.mdrFee) : '0.7%'}) dan Pembagian Sistem ({analytics.systemSharePct}%).
            </p>
          </div>

          {/* Waterfall Financial Deduction Flow */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#EFEDED] text-xs">
            <div className="p-3 bg-white rounded-2xl border border-[#EFEDED]">
              <span className="text-[10px] font-extrabold text-[#795465] uppercase block">Gross Sales</span>
              <span className="font-extrabold text-[#1B1C1C] text-sm block mt-0.5">{formatRupiah(analytics.grossRevenue)}</span>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-[#EFEDED]">
              <span className="text-[10px] font-extrabold text-[#BA1A1A] uppercase block">[-] MDR (0.7%)</span>
              <span className="font-extrabold text-[#BA1A1A] text-sm block mt-0.5">{formatRupiah(analytics.mdrFee)}</span>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-[#EFEDED]">
              <span className="text-[10px] font-extrabold text-[#4E635A] uppercase block">[=] Net Sales</span>
              <span className="font-extrabold text-[#4E635A] text-sm block mt-0.5">{formatRupiah(analytics.netGross)}</span>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-[#EFEDED]">
              <span className="text-[10px] font-extrabold text-[#795465] uppercase block">System Share ({analytics.systemSharePct}%)</span>
              <span className="font-extrabold text-[#795465] text-sm block mt-0.5">{formatRupiah(analytics.systemNet)}</span>
            </div>
          </div>
        </div>

        {/* Business Capacity Summary Cards */}
        <div className="lg:col-span-1 space-y-4 flex flex-col justify-between">
          {/* Online Fleet Card */}
          <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[#817478] uppercase tracking-wider block">Online Fleet</span>
              <div className="text-2xl font-black text-emerald-700">
                {analytics.onlineCount} / {analytics.totalChairs} <span className="text-xs text-[#817478] font-bold">Unit</span>
              </div>
              <p className="text-[11px] text-[#817478] font-bold">Unit Kursi Siap Operasional</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          {/* Total Transactions Card */}
          <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[#817478] uppercase tracking-wider block">Total Transactions</span>
              <div className="text-2xl font-black text-[#795465]">
                {analytics.totalTransactions} <span className="text-xs text-[#817478] font-bold">Tiket</span>
              </div>
              <p className="text-[11px] text-[#817478] font-bold">Sesi Pijat QRIS Sukses</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#F8C8DC] text-[#795465] flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Revenue Trend Chart (1-Color QRIS Line Chart) */}
      <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-[#1B1C1C] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#795465]" />
              <span>Grafik Tren Penjualan Harian (QRIS)</span>
            </h2>
            <p className="text-xs text-[#817478] font-medium mt-0.5">
              Fluktuasi omset penjualan per hari dalam rentang tanggal terpilih.
            </p>
          </div>
          <span className="px-3 py-1 bg-[#F5F3F3] text-[#795465] text-[10px] font-extrabold rounded-full border border-[#EFEDED]">
            QRIS Trend
          </span>
        </div>

        {renderTrendChart()}
      </div>

      {/* Location Revenue Breakdown Table */}
      <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-[#1B1C1C] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#795465]" />
          <span>Breakdown Bagi Hasil Per Lokasi Cabang</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FBF9F9] text-[#795465] border-b border-[#EFEDED] text-[10px] font-extrabold uppercase tracking-wider">
                <th className="p-4">Nama Lokasi Cabang</th>
                <th className="p-4">Kode Unik</th>
                <th className="p-4">Total Armada</th>
                <th className="p-4">Config Split (Owner / System)</th>
                <th className="p-4">Status Operasional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEDED] font-bold text-[#1B1C1C]">
              {locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-[#FBF9F9] transition-colors">
                  <td className="p-4 font-extrabold text-[#1B1C1C]">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#795465]" />
                      <span>{loc.name}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-extrabold text-[#795465]">{loc.location_code}</td>
                  <td className="p-4 text-[#1B1C1C]">{loc.chair_count || 0} Unit Kursi</td>
                  <td className="p-4">
                    <span className="text-emerald-700 font-extrabold">{loc.owner_share_pct}% Owner</span>
                    <span className="text-[#817478] mx-1">/</span>
                    <span className="text-[#795465] font-extrabold">{loc.system_share_pct}% System</span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Aktif ({loc.online_chair_count || 0}/{loc.chair_count || 0})
                    </span>
                  </td>
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
    <Suspense fallback={<div className="py-12 text-center text-xs font-extrabold text-[#795465] animate-pulse">Memuat Sales Summary...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
