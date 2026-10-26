'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Ticket,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  QrCode,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { ChairSlip } from '@/types';
import DatePickerModal, { DateRangeState } from '@/components/admin/DatePickerModal';
import { AppSelect } from '@/components/admin/ThemedSelect';
import { getWibNow } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

interface TicketSummary {
  totalTickets: number;
  completedSessions: number;
  grossSales: number;
  netSales: number;
  netPayout: number;
}

function formatWibCsvTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || '';
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);
  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, '0');
  const dd = String(wib.getDate()).padStart(2, '0');
  const hh = String(wib.getHours()).padStart(2, '0');
  const min = String(wib.getMinutes()).padStart(2, '0');
  const ss = String(wib.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} WIB`;
}

function TicketContent() {
  const searchParams = useSearchParams();
  const locationIdParam = searchParams.get('location_id') || 'ALL';

  const [tickets, setTickets] = useState<ChairSlip[]>([]);
  const [summary, setSummary] = useState<TicketSummary>({
    totalTickets: 0,
    completedSessions: 0,
    grossSales: 0,
    netSales: 0,
    netPayout: 0,
  });

  // Streamlined Search Selector (All Fields, Ticket Number, Chair Code — no redundant customer phone)
  const [searchBy, setSearchBy] = useState<'ALL' | 'TICKET_NUMBER' | 'CHAIR_CODE'>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  // Ticket Status Dropdown (ALL STATUS, DONE, INPROCESS, WAITING, UNPAID)
  const [statusFilter, setStatusFilter] = useState<string>('ALL STATUS');

  // Date Range State (Defaults to today in WIB)
  const [dateRange, setDateRange] = useState<DateRangeState>(() => {
    const wib = getWibNow();
    const yyyy = wib.getFullYear();
    const mm = String(wib.getMonth() + 1).padStart(2, '0');
    const dd = String(wib.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    return {
      rangePreset: 'today',
      dateFrom: todayStr,
      dateTo: todayStr,
      timeFrom: '00:00',
      timeTo: '23:59',
    };
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const buildFilterQueryParams = useCallback(() => {
    const query = new URLSearchParams();
    if (locationIdParam !== 'ALL') query.set('location_id', locationIdParam);
    if (statusFilter && statusFilter !== 'ALL STATUS') query.set('status', statusFilter);
    if (appliedSearch.trim()) {
      query.set('search', appliedSearch.trim());
      query.set('search_by', searchBy);
    }

    if (dateRange.rangePreset === 'all') {
      query.set('range', 'all');
    } else {
      if (dateRange.dateFrom) query.set('date_from', dateRange.dateFrom);
      if (dateRange.dateTo) query.set('date_to', dateRange.dateTo);
      if (dateRange.timeFrom) query.set('time_from', dateRange.timeFrom);
      if (dateRange.timeTo) query.set('time_to', dateRange.timeTo);
      if (dateRange.rangePreset && dateRange.rangePreset !== 'custom') {
        query.set('range', dateRange.rangePreset);
      }
    }
    return query;
  }, [locationIdParam, statusFilter, appliedSearch, searchBy, dateRange]);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = buildFilterQueryParams();
      query.set('page', page.toString());
      query.set('limit', '15');
      query.set('_t', Date.now().toString());

      const res = await fetch(`/api/admin/tickets?${query.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      const data = await res.json();

      if (data.success) {
        setTickets(data.tickets || []);
        if (data.pagination) {
          setTotalCount(data.pagination.total || 0);
          setTotalPages(data.pagination.totalPages || 1);
        }
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.warn('Fetch tickets error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [buildFilterQueryParams, page]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };

  const handleDateApply = (newRange: DateRangeState) => {
    setDateRange(newRange);
    setPage(1);
  };

  // Full-Dataset CSV Export matching active Date & Status filters (not truncated to 15-row page)
  const handleExportCSV = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const query = buildFilterQueryParams();
      query.set('export', 'true');
      query.set('_t', Date.now().toString());

      const res = await fetch(`/api/admin/tickets?${query.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      const data = await res.json();
      const allTickets: any[] = data.tickets || [];

      if (!data.success || allTickets.length === 0) {
        alert('No transactions found to export for the selected filter.');
        return;
      }

      const headers = [
        'Slip Number',
        'Date & Time (WIB)',
        'Customer',
        'Chair Code',
        'Amount (IDR)',
        'Duration (Mins)',
        'Pulses',
        'Payment Method',
        'Status',
      ];
      const csvRows = [headers.join(',')];

      allTickets.forEach((tx: any) => {
        const cleanSlip = String(tx.chair_slip_number || tx.id || '').replace(/"/g, '""');
        const cleanDate = formatWibCsvTimestamp(tx.created_at);
        const cleanCustomer = String(tx.customer_phone || 'GUEST').replace(/"/g, '""');
        const cleanChair = String(tx.chair_code || tx.chair_id || '-').replace(/"/g, '""');
        const amountVal = Number(tx.amount || 0);
        const durationVal = Number(tx.duration_in_minutes || 4);
        const pulseVal = Number(tx.pulse_count || 5);
        const cleanMethod = String(tx.payment_method || 'QRIS').replace(/"/g, '""');
        const cleanStatus = String(tx.status || '').toUpperCase().replace(/"/g, '""');

        const row = [
          `"${cleanSlip}"`,
          `"${cleanDate}"`,
          `"${cleanCustomer}"`,
          `"${cleanChair}"`,
          amountVal,
          durationVal,
          pulseVal,
          `"${cleanMethod}"`,
          `"${cleanStatus}"`,
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const suffix =
        dateRange.rangePreset === 'all'
          ? 'all_time'
          : dateRange.dateFrom && dateRange.dateTo
          ? `${dateRange.dateFrom}_to_${dateRange.dateTo}`
          : new Date().toISOString().slice(0, 10);

      link.setAttribute('download', `sakura_tickets_${suffix}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV failed:', err);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const st = String(status || '').toLowerCase();
    if (['done', 'completed', 'paid'].includes(st)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E1F5EE] text-[#0F6E56]">
          <CheckCircle2 className="w-3 h-3" />
          DONE
        </span>
      );
    }
    if (['ongoing', 'session_inprocess', 'inprocess'].includes(st)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3 h-3 animate-pulse" />
          INPROCESS
        </span>
      );
    }
    if (['pending', 'waiting'].includes(st)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3" />
          WAITING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FCEBEB] text-[#A32D2D]">
        <XCircle className="w-3 h-3" />
        UNPAID / EXPIRED
      </span>
    );
  };

  const getSearchPlaceholder = () => {
    if (searchBy === 'TICKET_NUMBER') return 'Search ticket number (e.g. TRX-SAKURA...)...';
    if (searchBy === 'CHAIR_CODE') return 'Search chair code (e.g. SAKURA-GI-01)...';
    return 'Search ticket number or chair code...';
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#EFEDED] p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1B1C1C] tracking-tight flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#795465]" />
            <span>Ticket Transaction History</span>
          </h1>
          <p className="text-xs text-gray-500 font-normal mt-1">
            Enterprise QRIS session audit and transaction reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting || isLoading}
            className="px-4 py-2.5 bg-[#795465] hover:bg-[#684756] disabled:opacity-60 text-white rounded-xl text-xs font-semibold shadow-xs shadow-[#795465]/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export to CSV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Summary Banner (3-Tier Typography & Semantic Colors) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-[#EFEDED] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Tickets</span>
            <Ticket className="w-4 h-4 text-[#795465]" />
          </div>
          <div className="text-2xl font-bold text-[#1B1C1C]">{summary.totalTickets}</div>
          <p className="text-[11px] text-[#0F6E56] font-medium">
            {summary.completedSessions} sessions completed
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFEDED] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Gross Sales (IDR)</span>
            <TrendingUp className="w-4 h-4 text-[#795465]" />
          </div>
          <div className="text-2xl font-bold text-[#1B1C1C]">
            {formatRupiah(summary.grossSales)}
          </div>
          <p className="text-[11px] text-gray-500 font-normal">100% QRIS volume</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFEDED] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Net Sales (IDR)</span>
            <DollarSign className="w-4 h-4 text-[#795465]" />
          </div>
          <div className="text-2xl font-bold text-[#1B1C1C]">
            {formatRupiah(summary.netSales)}
          </div>
          <p className="text-[11px] text-gray-500 font-normal">After 0.7% MDR processing</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFEDED] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[#0F6E56]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Net Payout (IDR)</span>
            <ShieldCheck className="w-4 h-4 text-[#0F6E56]" />
          </div>
          <div className="text-2xl font-bold text-[#0F6E56]">
            {formatRupiah(summary.netPayout)}
          </div>
          <p className="text-[11px] text-gray-500 font-normal">95% Partner net settlement</p>
        </div>
      </div>

      {/* Filter Bar & Tickets Table Container */}
      <div className="bg-white rounded-3xl border border-[#EFEDED] p-4 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2.5">
          {/* Show by dropdown selector (Clean Title Case, without obsolete Customer Phone) */}
          <div className="w-44">
            <AppSelect
              aria-label="Show by field"
              value={searchBy}
              onValueChange={(val) => {
                setSearchBy(val as 'ALL' | 'TICKET_NUMBER' | 'CHAIR_CODE');
                if (appliedSearch) {
                  setPage(1);
                }
              }}
              options={[
                { value: 'ALL', label: 'All Fields' },
                { value: 'TICKET_NUMBER', label: 'Ticket Number' },
                { value: 'CHAIR_CODE', label: 'Chair Code' },
              ]}
            />
          </div>

          {/* Search Query Input */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                const val = e.target.value;
                setSearchInput(val);
                if (val === '' && appliedSearch !== '') {
                  setAppliedSearch('');
                  setPage(1);
                }
              }}
              placeholder={getSearchPlaceholder()}
              className="w-full px-3.5 py-2 pl-9 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-medium text-[#1B1C1C] placeholder-gray-400 focus:bg-white focus:border-[#795465] outline-none transition-colors"
            />
            <Search className="w-4 h-4 text-[#795465] absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Date Picker Popover */}
          <DatePickerModal
            labelPrefix="Date"
            initialRange={dateRange.rangePreset}
            initialDateFrom={dateRange.dateFrom}
            initialDateTo={dateRange.dateTo}
            initialTimeFrom={dateRange.timeFrom}
            initialTimeTo={dateRange.timeTo}
            onApply={handleDateApply}
          />

          {/* Ticket Status Dropdown */}
          <div className="w-44">
            <AppSelect
              aria-label="Filter ticket status"
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'ALL STATUS', label: 'All Status' },
                { value: 'DONE', label: 'Done' },
                { value: 'INPROCESS', label: 'In Process' },
                { value: 'WAITING', label: 'Waiting' },
                { value: 'UNPAID', label: 'Unpaid / Expired' },
              ]}
            />
          </div>

          {/* Submit Search Button */}
          <button
            type="submit"
            className="px-4 py-2 bg-[#795465] text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-[#684756] transition-all cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Tickets Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#EFEDED]">
          {isLoading ? (
            <div className="py-14 text-center text-xs font-medium text-[#795465] animate-pulse">
              Loading transactions...
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-14 text-center text-xs text-gray-500 font-normal space-y-1">
              <p className="font-medium text-[#1B1C1C]">No transaction records found for the selected filter.</p>
              <p className="text-[11px] text-gray-400">
                Try selecting &ldquo;ALL TIME&rdquo; in the Date filter or &ldquo;All Status&rdquo;.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F3F3] text-gray-500 border-b border-[#EFEDED]">
                  <th className="p-3.5 font-semibold uppercase text-[11px] tracking-wider">Slip Number</th>
                  <th className="p-3.5 font-semibold uppercase text-[11px] tracking-wider">Date & Time</th>
                  <th className="p-3.5 font-semibold uppercase text-[11px] tracking-wider">Customer</th>
                  <th className="p-3.5 font-semibold uppercase text-[11px] tracking-wider">Chair Code</th>
                  <th className="p-3.5 font-semibold uppercase text-[11px] tracking-wider">Amount & Duration</th>
                  <th className="p-3.5 font-semibold uppercase text-[11px] tracking-wider">Payment Method</th>
                  <th className="p-3.5 font-semibold uppercase text-[11px] tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEDED] bg-white">
                {tickets.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-[#FBF9F9] transition-colors">
                    <td className="p-3.5 font-mono text-xs font-semibold text-[#795465]">
                      {tx.chair_slip_number || tx.id}
                    </td>
                    <td className="p-3.5 text-xs font-normal text-gray-600">
                      {new Date(tx.created_at).toLocaleString('en-US', {
                        timeZone: 'Asia/Jakarta',
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}{' '}
                      WIB
                    </td>
                    <td className="p-3.5 text-xs font-medium text-gray-600">
                      {tx.customer_phone || 'GUEST'}
                    </td>
                    <td className="p-3.5 font-mono text-xs font-semibold text-[#1B1C1C]">
                      {tx.chair_code || tx.chair_id}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-sm text-[#1B1C1C]">{formatRupiah(tx.amount || 0)}</div>
                      <div className="text-[11px] text-gray-400 font-normal mt-0.5">
                        Duration: {tx.duration_in_minutes || 4} mins ({tx.pulse_count || 5} pulses)
                      </div>
                    </td>
                    <td className="p-3.5 text-xs font-medium text-[#1B1C1C]">
                      <span className="inline-flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-[#795465]" />
                        <span>{tx.payment_method || 'QRIS'}</span>
                      </span>
                    </td>
                    <td className="p-3.5">{renderStatusBadge(tx.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-3 text-xs">
          <span className="text-gray-500 font-normal">
            Showing <span className="font-semibold text-[#1B1C1C]">{tickets.length}</span> of{' '}
            <span className="font-semibold text-[#1B1C1C]">{totalCount}</span> transactions (Page {page} of {Math.max(1, totalPages)})
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] rounded-xl font-medium disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-[#795465] px-2">{page}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] rounded-xl font-medium disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketListPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs font-medium text-[#795465] animate-pulse">
          Loading ticket audit logs...
        </div>
      }
    >
      <TicketContent />
    </Suspense>
  );
}
