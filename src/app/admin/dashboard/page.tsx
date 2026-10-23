'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  HelpCircle,
  Info,
} from 'lucide-react';
import DatePickerModal, { DateRangeState } from '@/components/admin/DatePickerModal';

export const dynamic = 'force-dynamic';

interface DailyTrendItem {
  rawDate: string;
  dateLabel: string;
  grossSales: number;
  gross: number;
  ownerNet: number;
  ticketCount: number;
  transactions: number;
}

function formatRupiah(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1B1C1C] text-white rounded-xl px-4 py-3 text-xs shadow-xl space-y-1.5 border border-zinc-700/50">
      <p className="font-semibold text-gray-200 border-b border-zinc-700 pb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey || entry.name} className="flex items-center justify-between gap-4 font-mono text-[11px]">
          <span className="text-gray-400 capitalize">{entry.name}:</span>
          <span className="font-semibold text-white">
            {typeof entry.value === 'number' && entry.dataKey !== 'ticketCount'
              ? formatRupiah(entry.value)
              : `${entry.value} Sessions`}
          </span>
        </div>
      ))}
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const locationIdParam = searchParams.get('location_id') || 'ALL';

  const [rangeFilter, setRangeFilter] = useState<string>('all');
  const [dateType, setDateType] = useState<'created_at' | 'settled_at'>('created_at');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [timeFrom, setTimeFrom] = useState<string>('00:00');
  const [timeTo, setTimeTo] = useState<string>('23:59');

  const [dailyTrend, setDailyTrend] = useState<DailyTrendItem[]>([]);
  const [granularity, setGranularity] = useState<'daily' | 'monthly'>('daily');
  const [granularityNotice, setGranularityNotice] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const [summary, setSummary] = useState({
    gross_sales: 0,
    mdr_fee: 0,
    net_sales: 0,
    owner_net: 0,
    system_share: 0,
    total_tickets: 0,
    online_fleet: 0,
    total_fleet: 0,
    owner_share_pct: 95.0,
    system_share_pct: 5.0,
    period_change_pct: null as number | null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (locationIdParam !== 'ALL') query.set('location_id', locationIdParam);
      query.set('date_type', dateType);

      if (dateFrom) query.set('date_from', dateFrom);
      if (dateTo) query.set('date_to', dateTo);
      if (timeFrom) query.set('time_from', timeFrom);
      if (timeTo) query.set('time_to', timeTo);

      if (rangeFilter) {
        query.set('range', rangeFilter);
      }

      query.set('_t', Date.now().toString());

      const res = await fetch(`/api/admin/dashboard?${query.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      const data = await res.json();

      if (data.success) {
        setDailyTrend(data.dailyTrend || []);
        setGranularity(data.granularity || 'daily');
        setGranularityNotice(data.granularity_notice || null);

        const s = data.summary || {};
        const pChange = s.period_change_pct ?? s.periodChangePct;
        setSummary({
          gross_sales: Number(s.gross_sales ?? s.grossRevenue ?? 0),
          mdr_fee: Number(s.mdr_fee ?? s.mdrFee ?? 0),
          net_sales: Number(s.net_sales ?? s.netGross ?? 0),
          owner_net: Number(s.owner_net ?? s.ownerNet ?? 0),
          system_share: Number(s.system_share ?? s.systemNet ?? 0),
          total_tickets: Number(s.total_tickets ?? s.totalTransactions ?? 0),
          online_fleet: Number(s.online_fleet ?? s.onlineCount ?? 0),
          total_fleet: Number(s.total_fleet ?? s.totalChairs ?? 0),
          owner_share_pct: Number(s.owner_share_pct ?? s.ownerSharePct ?? 95.0),
          system_share_pct: Number(s.system_share_pct ?? s.systemSharePct ?? 5.0),
          period_change_pct: pChange !== null && pChange !== undefined ? Number(pChange) : null,
        });
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [locationIdParam, rangeFilter, dateType, dateFrom, dateTo, timeFrom, timeTo]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDateModalApply = (newRange: DateRangeState) => {
    setRangeFilter(newRange.rangePreset);
    setDateFrom(newRange.dateFrom);
    setDateTo(newRange.dateTo);
    setTimeFrom(newRange.timeFrom);
    setTimeTo(newRange.timeTo);
  };

  return (
    <div className="space-y-6">
      {/* Top Streamlined Filter Bar (Parkee CMS Sales Summary Architecture) */}
      <div className="bg-white rounded-3xl border border-[#EFEDED] p-5 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1B1C1C] tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#795465]" />
            <span>Sales Overview</span>
          </h1>
          <p className="text-xs text-gray-500 font-normal mt-1">
            Real-time QRIS revenue, payment processing fees, and partner payouts.
          </p>
        </div>

        {/* Filter Controls (Presets + Parkee DatePickerModal + Settlement Toggle) */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {/* Toggle: Date Mode (Transaction Date vs Settlement Date) */}
          <div className="flex items-center bg-[#F5F3F3] p-1 rounded-xl border border-[#EFEDED]">
            <button
              onClick={() => setDateType('created_at')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                dateType === 'created_at'
                  ? 'bg-[#795465] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#1B1C1C]'
              }`}
              title="Filter based on QRIS generation timestamp"
            >
              Transaction Date
            </button>
            <button
              onClick={() => setDateType('settled_at')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                dateType === 'settled_at'
                  ? 'bg-[#795465] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#1B1C1C]'
              }`}
              title="Filter based on payment gateway settlement timestamp"
            >
              Settlement Date
            </button>
          </div>

          {/* Parkee CMS DatePickerModal Popover (Dual calendar + presets) */}
          <DatePickerModal
            labelPrefix="Date"
            initialRange={rangeFilter}
            initialDateFrom={dateFrom}
            initialDateTo={dateTo}
            initialTimeFrom={timeFrom}
            initialTimeTo={timeTo}
            onApply={handleDateModalApply}
          />
        </div>
      </div>

      {/* Hero Financial Summary: Waterfall Flow Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Highlight Card: Net Payout (Clean border, 3-tier typography) */}
        <div className="lg:col-span-2 bg-white border border-[#EFEDED] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wide block">
                  Net Payout ({summary.owner_share_pct}%)
                </span>
                <p className="text-[11px] text-gray-500 font-medium">Partner Net Earnings</p>
              </div>
            </div>

            {/* Dynamic Period Delta Badge (Real Comparison vs Previous Period or Neutral Lifetime Badge) */}
            {summary.period_change_pct !== null && summary.period_change_pct !== undefined ? (
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                  summary.period_change_pct >= 0
                    ? 'bg-[#E1F5EE] text-[#0F6E56]'
                    : 'bg-[#FCEBEB] text-[#A32D2D]'
                }`}
              >
                {summary.period_change_pct >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {summary.period_change_pct >= 0 ? `+${summary.period_change_pct}%` : `${summary.period_change_pct}%`}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-[#F5F3F3] text-gray-500 border border-[#EFEDED]">
                All-time total
              </span>
            )}
          </div>

          <div>
            <div className="text-4xl sm:text-5xl font-bold text-[#1B1C1C] tracking-tight">
              {formatRupiah(summary.owner_net)}
            </div>
            <p className="text-xs font-normal text-gray-500 mt-2">
              Net revenue after 0.7% MDR and {summary.system_share_pct}% platform fee.
            </p>
          </div>

          {/* Waterfall Financial Deduction Flow (Disciplined Semantic Colors) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#EFEDED] text-xs">
            <div className="p-3 bg-[#FBF9F9] rounded-2xl border border-[#EFEDED]">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block">Gross Sales</span>
              <span className="font-semibold text-sm text-[#1B1C1C] block mt-0.5">{formatRupiah(summary.gross_sales)}</span>
            </div>

            <div className="p-3 bg-[#FBF9F9] rounded-2xl border border-[#EFEDED]">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block">MDR Fee (0.7%)</span>
              <span className="font-semibold text-sm text-[#A32D2D] block mt-0.5">{formatRupiah(summary.mdr_fee)}</span>
            </div>

            <div className="p-3 bg-[#FBF9F9] rounded-2xl border border-[#EFEDED]">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block">Net Sales</span>
              <span className="font-semibold text-sm text-[#1B1C1C] block mt-0.5">{formatRupiah(summary.net_sales)}</span>
            </div>

            <div className="p-3 bg-[#FBF9F9] rounded-2xl border border-[#EFEDED]">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block">Platform Fee ({summary.system_share_pct}%)</span>
              <span className="font-semibold text-sm text-[#1B1C1C] block mt-0.5">{formatRupiah(summary.system_share)}</span>
            </div>
          </div>
        </div>

        {/* Business Capacity Summary Cards */}
        <div className="lg:col-span-1 space-y-4 flex flex-col justify-between">
          {/* Active Fleet Card */}
          <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block">Active Fleet</span>
              <div className="text-2xl font-bold text-emerald-800">
                {summary.online_fleet} / {summary.total_fleet} <span className="text-xs text-gray-500 font-medium">Chairs</span>
              </div>
              <p className="text-[11px] text-gray-500 font-normal">Chairs ready for service</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          {/* Paid Sessions Card */}
          <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block">Paid Sessions</span>
              <div className="text-2xl font-bold text-[#795465]">
                {summary.total_tickets} <span className="text-xs text-gray-500 font-medium">Sessions</span>
              </div>
              <p className="text-[11px] text-gray-500 font-normal">Completed massage sessions</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#F8C8DC] text-[#795465] flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Informative Visual Range Notification when > 60 days */}
      {granularityNotice && (
        <div className="flex items-start sm:items-center gap-2.5 p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 shadow-2xs leading-relaxed">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong className="font-semibold">Batas Visualisasi Grafik:</strong> {granularityNotice} Total angka finansial dan sesi pada kartu ringkasan di atas tetap 100% akurat mencakup seluruh rentang yang Anda pilih.
          </span>
        </div>
      )}

      {/* Two Trend Charts Side-by-Side Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Revenue Trend (Recharts AreaChart with zero-fill + X/Y axis labels) */}
        <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#1B1C1C] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#795465]" />
                <span>Daily Revenue Trend</span>
              </h2>
              <p className="text-xs text-gray-500 font-normal mt-0.5">
                Daily gross revenue and net payout performance.
              </p>
            </div>
            <span className="px-3 py-1 bg-[#F5F3F3] text-[#795465] text-[10px] font-semibold rounded-full border border-[#EFEDED]">
              {granularity === 'monthly' ? 'Monthly Gross Sales (IDR)' : 'Gross Sales (IDR)'}
            </span>
          </div>

          {isMounted && dailyTrend.length > 0 ? (
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#795465" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#795465" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFEDED" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11, fill: '#817478' }}
                    axisLine={{ stroke: '#EFEDED' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#817478' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                    width={45}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="grossSales"
                    name="Gross Sales"
                    stroke="#795465"
                    strokeWidth={2.5}
                    fill="url(#revenueGrad)"
                    dot={{ r: 3, fill: '#795465', strokeWidth: 2, stroke: '#FFFFFF' }}
                    activeDot={{ r: 5, fill: '#795465', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-gray-400 bg-[#FBF9F9] rounded-2xl border border-dashed border-[#EFEDED]">
              <TrendingUp className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-xs font-normal">No transaction data recorded for this period.</p>
            </div>
          )}
        </div>

        {/* Chart 2: Daily Session Volume (Recharts BarChart with rounded bars) */}
        <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#1B1C1C] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#4E635A]" />
                <span>Daily Session Volume</span>
              </h2>
              <p className="text-xs text-gray-500 font-normal mt-0.5">
                Number of completed sessions per day.
              </p>
            </div>
            <span className="px-3 py-1 bg-[#E1F5EE] text-[#0F6E56] text-[10px] font-semibold rounded-full border border-emerald-200">
              {granularity === 'monthly' ? 'Monthly Volume' : 'Session Volume'}
            </span>
          </div>

          {isMounted && dailyTrend.length > 0 ? (
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFEDED" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11, fill: '#817478' }}
                    axisLine={{ stroke: '#EFEDED' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#817478' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="ticketCount"
                    name="Paid Sessions"
                    fill="#4E635A"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-gray-400 bg-[#FBF9F9] rounded-2xl border border-dashed border-[#EFEDED]">
              <BarChart3 className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-xs font-normal">No transaction sessions recorded for this period.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SalesSummaryDashboardPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs font-medium text-[#795465] animate-pulse">Loading Sales Overview...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
