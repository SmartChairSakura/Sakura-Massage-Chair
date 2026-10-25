'use client';

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
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
  Armchair,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Info,
} from 'lucide-react';
import DatePickerModal, { DateRangeState } from '@/components/admin/DatePickerModal';
import {
  niceScale,
  formatCompactK,
  findPeakIndex,
  buildSparklineGeometry,
  buildWaterfallRows,
  WaterfallRowItem,
} from '@/lib/chart-utils';

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

/**
 * Light-surface tooltip inheriting Plus Jakarta Sans with `tabular-nums`.
 * Replaces the legacy dark monospace tooltip so it blends naturally with white cards.
 */
function CustomTooltip({ active, payload, label, mode }: any) {
  if (!active || !payload?.length) return null;
  const point: DailyTrendItem | undefined = payload[0]?.payload;

  return (
    <div
      role="tooltip"
      className="bg-white text-[#1B1C1C] rounded-[10px] px-3 py-2 text-xs border border-[#D8D1D4] shadow-[0_8px_24px_rgba(27,28,28,0.12)] space-y-1 min-w-[148px]"
    >
      <p className="text-[11px] font-semibold text-[#5B5257] mb-1">{label}</p>
      {payload.map((entry: any) => {
        const isSessionMetric = entry.dataKey === 'ticketCount';
        const formattedValue =
          typeof entry.value === 'number' && !isSessionMetric
            ? formatRupiah(entry.value)
            : `${entry.value} sesi`;

        return (
          <div
            key={entry.dataKey || entry.name}
            className="flex items-center gap-1.5 leading-snug tabular-nums"
          >
            <i
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color || '#795465' }}
            />
            <strong className="font-bold text-[#1B1C1C] tabular-nums">{formattedValue}</strong>
            <span className="text-[#5B5257]">{isSessionMetric ? 'Sesi selesai' : 'Gross sales'}</span>
          </div>
        );
      })}

      {/* Secondary session context row inside the Revenue Trend tooltip */}
      {mode === 'revenue' && point && (
        <div className="flex items-center gap-1.5 leading-snug tabular-nums pt-0.5 border-t border-[#EFEDED]">
          <strong className="font-bold text-[#1B1C1C] tabular-nums">
            {point.ticketCount} sesi
          </strong>
          <span className="text-[#5B5257]">selesai</span>
        </div>
      )}
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
  const [activeWaterfallRow, setActiveWaterfallRow] = useState<string | null>(null);

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

  // Precompute deterministic chart scales, peak indices, sparkline & waterfall geometry
  const grossSeries = useMemo(() => dailyTrend.map((d) => Number(d.grossSales || 0)), [dailyTrend]);
  const sessionSeries = useMemo(() => dailyTrend.map((d) => Number(d.ticketCount || 0)), [dailyTrend]);

  const maxGross = useMemo(() => Math.max(0, ...grossSeries), [grossSeries]);
  const maxSessions = useMemo(() => Math.max(0, ...sessionSeries), [sessionSeries]);

  const revenueScale = useMemo(() => niceScale(maxGross, 5), [maxGross]);
  const sessionScale = useMemo(
    () => niceScale(maxSessions, 4, { integerOnly: true }),
    [maxSessions]
  );

  const peakRevenueIdx = useMemo(() => findPeakIndex(grossSeries), [grossSeries]);
  const peakSessionIdx = useMemo(() => findPeakIndex(sessionSeries), [sessionSeries]);

  const sparkline = useMemo(
    () => buildSparklineGeometry(grossSeries, 320, 44),
    [grossSeries]
  );

  const waterfallRows = useMemo<WaterfallRowItem[]>(
    () => buildWaterfallRows(summary),
    [summary]
  );

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

      {/* Hero Financial Summary: Chart #1 (Hero KPI + Sparkline) & Chart #4 (Waterfall Deduction) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Highlight Card: Net Payout + Sparkline (#1) + Waterfall Potongan (#4) */}
        <div className="lg:col-span-2 bg-white border border-[#EFEDED] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden">
          {/* Top Row: Hero KPI + Mini Linear Sparkline (#1) */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wide block">
                    Net Payout ({summary.owner_share_pct}%)
                  </span>
                  <p className="text-[11px] text-[#5B5257] font-medium">Partner Net Earnings</p>
                </div>
              </div>

              <div className="pt-1">
                <div className="text-4xl sm:text-5xl font-bold text-[#1B1C1C] tracking-tight tabular-nums">
                  {formatRupiah(summary.owner_net)}
                </div>
                <p className="text-xs font-normal text-[#5B5257] mt-1.5">
                  {summary.period_change_pct === null
                    ? `Net revenue after 0.7% MDR and ${summary.system_share_pct}% platform fee (belum ada periode pembanding).`
                    : `Net revenue after 0.7% MDR and ${summary.system_share_pct}% platform fee.`}
                </p>
              </div>
            </div>

            {/* Right Column: Dynamic Period Delta Badge (hidden when no comparison period) + 44px Sparkline */}
            <div className="flex flex-col items-start sm:items-end justify-between gap-3 sm:min-w-[210px]">
              {summary.period_change_pct !== null && summary.period_change_pct !== undefined && (
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold tabular-nums ${
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
                  {summary.period_change_pct >= 0
                    ? `+${summary.period_change_pct}%`
                    : `${summary.period_change_pct}%`}
                </span>
              )}

              {/* Chart #1: Compact Linear Sparkline (h=44px, neutral stroke #8A8186, terminal ring dot #795465) */}
              {dailyTrend.length > 0 && (
                <div className="w-full sm:w-[220px]">
                  <svg
                    width="100%"
                    height={44}
                    viewBox={`0 0 ${sparkline.width} ${sparkline.height}`}
                    role="img"
                    aria-label="Tren gross sales harian"
                    className="overflow-visible"
                  >
                    <path
                      d={sparkline.pathD}
                      fill="none"
                      stroke="#8A8186"
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={sparkline.endX}
                      cy={sparkline.endY}
                      r={4.5}
                      fill="#795465"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  </svg>
                  <span className="block text-[10px] text-[#5B5257] sm:text-right mt-0.5 tabular-nums">
                    Tren {dailyTrend.length} {granularity === 'monthly' ? 'bulan' : 'hari'} terakhir
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Chart #4: Horizontal Waterfall Deduction Chart (Gross Sales -> MDR -> Net Sales -> Platform Fee -> Net Payout) */}
          <div className="pt-4 border-t border-[#EFEDED] space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-[#5B5257]">
              <span className="font-semibold uppercase tracking-wide text-[#5B5257]">
                Waterfall Potongan Pendapatan (Gross to Net Payout)
              </span>
              <span className="text-[11px] text-[#5B5257]">
                Merah = potongan · Hijau = diterima mitra
              </span>
            </div>

            <div
              className="space-y-1.5"
              role="img"
              aria-label={`Waterfall dari Gross Sales ${formatRupiah(summary.gross_sales)} ke Net Payout ${formatRupiah(summary.owner_net)}`}
            >
              {waterfallRows.map((row) => {
                const isHovered = activeWaterfallRow === row.id;
                const displayAmount = row.isDeduction
                  ? `- ${formatRupiah(row.amount)}`
                  : formatRupiah(row.amount);

                const valueTextColor =
                  row.tone === 'fee'
                    ? 'text-[#A32D2D]'
                    : row.tone === 'positive'
                    ? 'text-[#0F6E56]'
                    : 'text-[#1B1C1C]';

                return (
                  <div
                    key={row.id}
                    onMouseEnter={() => setActiveWaterfallRow(row.id)}
                    onMouseLeave={() => setActiveWaterfallRow(null)}
                    className="relative grid grid-cols-12 items-center gap-2 py-1 px-2 rounded-lg hover:bg-[#FBF9F9] transition-colors cursor-default"
                  >
                    {/* Left Label */}
                    <div className="col-span-4 sm:col-span-3 text-right pr-2">
                      <span className="text-xs font-medium text-[#5B5257] block truncate">
                        {row.label}
                      </span>
                    </div>

                    {/* Floating Horizontal Bar Track */}
                    <div className="col-span-5 sm:col-span-6 h-5 flex items-center border-l border-[#D8D1D4] pl-0.5 relative">
                      <div className="w-full h-3.5 bg-[#F5F3F3]/80 rounded-r-[4px] relative overflow-hidden">
                        {row.widthPct > 0 && (
                          <div
                            className="absolute top-0 bottom-0 rounded-r-[4px] transition-opacity"
                            style={{
                              left: `${row.leftPct}%`,
                              width: `${row.widthPct}%`,
                              backgroundColor: row.color,
                              opacity: isHovered ? 0.78 : 1,
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Right Value Label (tabular-nums) */}
                    <div className="col-span-3 text-right">
                      <span className={`text-xs font-bold tabular-nums ${valueTextColor}`}>
                        {displayAmount}
                      </span>
                    </div>

                    {/* Light-Surface Tooltip on Hover */}
                    {isHovered && (
                      <div
                        role="tooltip"
                        className="absolute z-20 right-4 -top-11 bg-white text-[#1B1C1C] border border-[#D8D1D4] rounded-[10px] px-3 py-1.5 text-xs shadow-[0_8px_24px_rgba(27,28,28,0.12)] flex items-center gap-2 pointer-events-none"
                      >
                        <i
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: row.color }}
                        />
                        <strong className="font-bold tabular-nums">{displayAmount}</strong>
                        <span className="text-[#5B5257]">{row.sublabel}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Business Capacity Summary Cards (Strict Semantic Color Rule: No Green Here) */}
        <div className="lg:col-span-1 space-y-4 flex flex-col justify-between">
          {/* Active Fleet Card — Neutral ink #1B1C1C + Brand Mauve #795465 icon (Green reserved for Net Payout) */}
          <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-[#5B5257] uppercase tracking-wide block">
                Active Fleet
              </span>
              <div className="text-2xl font-bold text-[#1B1C1C] tabular-nums">
                {summary.online_fleet} / {summary.total_fleet}{' '}
                <span className="text-xs text-[#5B5257] font-medium">Chairs</span>
              </div>
              <p className="text-[11px] text-[#5B5257] font-normal">Chairs ready for service</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#F5F3F3] text-[#795465] flex items-center justify-center font-bold">
              <Armchair className="w-5 h-5" />
            </div>
          </div>

          {/* Paid Sessions Card */}
          <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-[#5B5257] uppercase tracking-wide block">
                Paid Sessions
              </span>
              <div className="text-2xl font-bold text-[#795465] tabular-nums">
                {summary.total_tickets}{' '}
                <span className="text-xs text-[#5B5257] font-medium">Sessions</span>
              </div>
              <p className="text-[11px] text-[#5B5257] font-normal">Completed massage sessions</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#F8C8DC]/60 text-[#795465] flex items-center justify-center font-bold">
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
            <strong className="font-semibold">Batas Visualisasi Grafik:</strong> {granularityNotice}{' '}
            Total angka finansial dan sesi pada kartu ringkasan di atas tetap 100% akurat mencakup
            seluruh rentang yang Anda pilih.
          </span>
        </div>
      )}

      {/* Two Trend Charts Side-by-Side Grid: Chart #2 (Linear Area) & Chart #3 (Daily Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart #2: Daily Revenue Trend (Linear AreaChart, niceScale Y-axis, solid gridlines, peak label, table toggle) */}
        <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#1B1C1C] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#795465]" />
                <span>Daily Revenue Trend</span>
              </h2>
              <p className="text-xs text-[#5B5257] font-normal mt-0.5">
                {granularity === 'monthly'
                  ? 'Monthly gross sales trajectory across the selected period.'
                  : 'Daily gross sales trajectory across the selected period.'}
              </p>
            </div>
            <span className="px-3 py-1 bg-[#F5F3F3] text-[#795465] text-[10px] font-semibold rounded-full border border-[#EFEDED]">
              {granularity === 'monthly' ? 'Monthly Gross Sales (IDR)' : 'Gross Sales (IDR)'}
            </span>
          </div>

          {isMounted && dailyTrend.length > 0 ? (
            <>
              <div className="w-full h-[240px]">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart
                    data={dailyTrend}
                    margin={{ top: 24, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#EFEDED" vertical={false} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: '#5B5257' }}
                      axisLine={{ stroke: '#D8D1D4' }}
                      tickLine={false}
                      minTickGap={16}
                    />
                    <YAxis
                      domain={[0, revenueScale.top]}
                      ticks={revenueScale.ticks}
                      tick={{ fontSize: 11, fill: '#5B5257' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCompactK(Number(v))}
                      width={44}
                    />
                    <Tooltip
                      cursor={{ stroke: '#8A8186', strokeWidth: 1, strokeDasharray: '3 3' }}
                      content={<CustomTooltip mode="revenue" />}
                    />
                    <Area
                      type="linear"
                      dataKey="grossSales"
                      name="Gross Sales"
                      stroke="#795465"
                      strokeWidth={2}
                      fill="#795465"
                      fillOpacity={0.1}
                      dot={(dotProps: any) => {
                        const { cx, cy, index } = dotProps;
                        const isSinglePoint = dailyTrend.length === 1;
                        if ((!isSinglePoint && index !== peakRevenueIdx) || cx == null || cy == null) {
                          return <g key={`dot-${index}`} />;
                        }
                        const anchor =
                          isSinglePoint
                            ? 'middle'
                            : index === 0
                            ? 'start'
                            : index === dailyTrend.length - 1
                            ? 'end'
                            : 'middle';
                        const labelY = Math.max(12, Number(cy) - 10);
                        return (
                          <g key={`peak-dot-${index}`}>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={4.5}
                              fill="#795465"
                              stroke="#FFFFFF"
                              strokeWidth={2}
                            />
                            <text
                              x={cx}
                              y={labelY}
                              textAnchor={anchor}
                              fill="#1B1C1C"
                              fontSize={11}
                              fontWeight={700}
                              className="tabular-nums"
                            >
                              {formatRupiah(dailyTrend[index]?.grossSales || 0)}
                            </text>
                          </g>
                        );
                      }}
                      activeDot={{
                        r: 4.5,
                        fill: '#795465',
                        stroke: '#FFFFFF',
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Accessible Collapsible Table View (<details><summary>Lihat sebagai tabel</summary>) */}
              <details className="pt-2.5 border-t border-dashed border-[#EFEDED] text-xs text-[#5B5257]">
                <summary className="cursor-pointer font-semibold text-[#795465] select-none hover:underline">
                  Lihat sebagai tabel (View as table)
                </summary>
                <div className="mt-2.5 max-h-56 overflow-y-auto rounded-xl border border-[#EFEDED]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#F5F3F3] text-[#5B5257] sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-semibold border-b border-[#EFEDED]">
                          Tanggal
                        </th>
                        <th className="py-2 px-3 font-semibold border-b border-[#EFEDED] text-right">
                          Gross Sales
                        </th>
                        <th className="py-2 px-3 font-semibold border-b border-[#EFEDED] text-right">
                          Net Payout
                        </th>
                        <th className="py-2 px-3 font-semibold border-b border-[#EFEDED] text-right">
                          Sesi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFEDED] bg-white">
                      {dailyTrend.map((row) => (
                        <tr key={row.rawDate} className="hover:bg-[#FBF9F9]">
                          <td className="py-1.5 px-3 text-[#1B1C1C]">{row.dateLabel}</td>
                          <td className="py-1.5 px-3 text-right font-medium text-[#1B1C1C] tabular-nums">
                            {formatRupiah(row.grossSales)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-medium text-[#0F6E56] tabular-nums">
                            {formatRupiah(row.ownerNet)}
                          </td>
                          <td className="py-1.5 px-3 text-right text-[#5B5257] tabular-nums">
                            {row.ticketCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-gray-400 bg-[#FBF9F9] rounded-2xl border border-dashed border-[#EFEDED]">
              <TrendingUp className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-xs font-normal">No transaction data recorded for this period.</p>
            </div>
          )}
        </div>

        {/* Chart #3: Daily Session Volume (Single-Hue Brand Mauve #795465, maxBarSize=24, niceScale integer ticks, peak label) */}
        <div className="bg-white rounded-3xl border border-[#EFEDED] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#1B1C1C] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#795465]" />
                <span>Daily Session Volume</span>
              </h2>
              <p className="text-xs text-[#5B5257] font-normal mt-0.5">
                Number of completed sessions per day.
              </p>
            </div>
            <span className="px-3 py-1 bg-[#F5F3F3] text-[#795465] text-[10px] font-semibold rounded-full border border-[#EFEDED]">
              {granularity === 'monthly' ? 'Monthly Volume' : 'Session Volume'}
            </span>
          </div>

          {isMounted && dailyTrend.length > 0 ? (
            <div className="w-full h-[240px]">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={dailyTrend}
                  margin={{ top: 24, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid stroke="#EFEDED" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11, fill: '#5B5257' }}
                    axisLine={{ stroke: '#D8D1D4' }}
                    tickLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    domain={[0, sessionScale.top]}
                    ticks={sessionScale.ticks}
                    tick={{ fontSize: 11, fill: '#5B5257' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: '#F5F3F3', fillOpacity: 0.6 }}
                    content={<CustomTooltip mode="sessions" />}
                  />
                  <Bar
                    dataKey="ticketCount"
                    name="Paid Sessions"
                    fill="#795465"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                    label={(labelProps: any) => {
                      const { x, y, width, value, index } = labelProps;
                      if (
                        index !== peakSessionIdx ||
                        !value ||
                        value <= 0 ||
                        x == null ||
                        y == null
                      ) {
                        return <g key={`bar-lbl-${index}`} />;
                      }
                      const cx = Number(x) + Number(width || 0) / 2;
                      const labelY = Math.max(12, Number(y) - 6);
                      return (
                        <text
                          key={`peak-bar-lbl-${index}`}
                          x={cx}
                          y={labelY}
                          textAnchor="middle"
                          fill="#1B1C1C"
                          fontSize={11}
                          fontWeight={700}
                          className="tabular-nums"
                        >
                          {value}
                        </text>
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-gray-400 bg-[#FBF9F9] rounded-2xl border border-dashed border-[#EFEDED]">
              <BarChart3 className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-xs font-normal">
                No transaction sessions recorded for this period.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SalesSummaryDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs font-medium text-[#795465] animate-pulse">
          Loading Sales Overview...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
