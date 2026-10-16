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
  Filter,
  ChevronDown,
} from 'lucide-react';
import { ChairSlip } from '@/types';
import DatePickerModal, { DateRangeState } from '@/components/admin/DatePickerModal';
import { getWibNow } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

interface TicketSummary {
  totalTickets: number;
  completedSessions: number;
  grossSales: number;
  netSales: number;
  netPayout: number;
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

  // Search by selector (Parkee CMS: Show by TICKET_NUMBER / CHAIR_CODE / PHONE / ALL)
  const [searchBy, setSearchBy] = useState<'TICKET_NUMBER' | 'CHAIR_CODE' | 'PHONE' | 'ALL'>('TICKET_NUMBER');
  const [searchQuery, setSearchQuery] = useState('');

  // Ticket Status Dropdown (Parkee CMS Screenshot_69: ALL STATUS, DONE, INPROCESS, WAITING, UNPAID)
  const [statusFilter, setStatusFilter] = useState<string>('ALL STATUS');

  // Date Range State (Parkee CMS Screenshot_68 & 70)
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

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (locationIdParam !== 'ALL') query.set('location_id', locationIdParam);
      if (statusFilter && statusFilter !== 'ALL STATUS') query.set('status', statusFilter);
      if (searchQuery.trim()) {
        query.set('search', searchQuery.trim());
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
  }, [locationIdParam, statusFilter, page, dateRange, searchQuery, searchBy]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleDateApply = (newRange: DateRangeState) => {
    setDateRange(newRange);
    setPage(1);
  };

  const handleResetFilters = () => {
    const wib = getWibNow();
    const yyyy = wib.getFullYear();
    const mm = String(wib.getMonth() + 1).padStart(2, '0');
    const dd = String(wib.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    setSearchQuery('');
    setSearchBy('TICKET_NUMBER');
    setStatusFilter('ALL STATUS');
    setDateRange({
      rangePreset: 'today',
      dateFrom: todayStr,
      dateTo: todayStr,
      timeFrom: '00:00',
      timeTo: '23:59',
    });
    setPage(1);
  };

  const handleExportCSV = () => {
    if (tickets.length === 0) {
      alert('No transactions found to export.');
      return;
    }

    const headers = [
      'Slip Number',
      'Date & Time',
      'Customer Phone',
      'Chair Code',
      'Amount (IDR)',
      'Duration (Min)',
      'Pulses',
      'Payment Method',
      'Status',
    ];
    const csvRows = [headers.join(',')];

    tickets.forEach((tx: any) => {
      const row = [
        `"${tx.chair_slip_number || tx.id}"`,
        `"${new Date(tx.created_at).toLocaleString('en-US')}"`,
        `"${tx.customer_phone || 'GUEST'}"`,
        `"${tx.chair_code || tx.chair_id}"`,
        tx.amount,
        tx.duration_in_minutes || 4,
        tx.pulse_count || 5,
        `"${tx.payment_method || 'QRIS'}"`,
        `"${tx.status}"`,
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sakura_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatusBadge = (status: string) => {
    const st = String(status || '').toLowerCase();
    if (['done', 'completed', 'paid'].includes(st)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#CEE5DA] text-[#4E635A]">
          <CheckCircle2 className="w-3 h-3" />
          DONE
        </span>
      );
    }
    if (['ongoing', 'session_inprocess', 'inprocess'].includes(st)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3 animate-pulse" />
          INPROCESS
        </span>
      );
    }
    if (['pending', 'waiting'].includes(st)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#F8C8DC] text-[#765162]">
          <Clock className="w-3 h-3" />
          WAITING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FFDAD6] text-[#93000A]">
        <XCircle className="w-3 h-3" />
        UNPAID / EXPIRED
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card (Parkee CMS Header Style) */}
      <div className="bg-white rounded-3xl border border-[#EFEDED] p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#1B1C1C] tracking-tight flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#795465]" />
            <span>Ticket Transaction History</span>
          </h1>
          <p className="text-xs text-[#817478] font-medium mt-1">
            Enterprise QRIS session audit and transaction reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-[#795465] hover:bg-[#684756] text-white rounded-xl text-xs font-extrabold shadow-sm shadow-[#795465]/20 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Parkee CMS KPI Summary Banner (Screenshot_67) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-[#EFEDED] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[#817478]">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Tickets</span>
            <Ticket className="w-4 h-4 text-[#795465]" />
          </div>
          <div className="text-xl font-black text-[#1B1C1C]">{summary.totalTickets}</div>
          <p className="text-[10px] text-[#4E635A] font-extrabold">
            {summary.completedSessions} sessions completed
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFEDED] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[#817478]">
            <span className="text-[10px] font-black uppercase tracking-wider">Gross Sales (IDR)</span>
            <TrendingUp className="w-4 h-4 text-[#795465]" />
          </div>
          <div className="text-xl font-black text-[#1B1C1C]">
            {formatRupiah(summary.grossSales)}
          </div>
          <p className="text-[10px] text-[#817478] font-bold">100% QRIS volume</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFEDED] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[#817478]">
            <span className="text-[10px] font-black uppercase tracking-wider">Net Sales (IDR)</span>
            <DollarSign className="w-4 h-4 text-[#795465]" />
          </div>
          <div className="text-xl font-black text-[#1B1C1C]">
            {formatRupiah(summary.netSales)}
          </div>
          <p className="text-[10px] text-[#817478] font-bold">After 0.7% MDR processing</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFEDED] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[#817478]">
            <span className="text-[10px] font-black uppercase tracking-wider">Net Payout (IDR)</span>
            <ShieldCheck className="w-4 h-4 text-[#4E635A]" />
          </div>
          <div className="text-xl font-black text-[#4E635A]">
            {formatRupiah(summary.netPayout)}
          </div>
          <p className="text-[10px] text-[#817478] font-bold">95% Partner net settlement</p>
        </div>
      </div>

      {/* Parkee CMS Filter Bar (Screenshot_67 - Screenshot_70) */}
      <div className="bg-white rounded-3xl border border-[#EFEDED] p-4 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2.5">
          {/* Show by dropdown selector (Parkee CMS) */}
          <div className="flex items-center bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#1B1C1C]">
            <span className="text-[#817478] text-[11px] font-medium mr-1.5 hidden sm:inline">Show by:</span>
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value as any)}
              className="bg-transparent font-black text-[#795465] text-xs outline-none cursor-pointer"
            >
              <option value="TICKET_NUMBER">TICKET_NUMBER</option>
              <option value="CHAIR_CODE">CHAIR_CODE</option>
              <option value="PHONE">CUSTOMER_PHONE</option>
              <option value="ALL">ALL FIELDS</option>
            </select>
          </div>

          {/* Search Query Input */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search by ${searchBy.toLowerCase()}...`}
              className="w-full px-3.5 py-2 pl-9 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] placeholder-[#817478] focus:bg-white focus:border-[#795465] outline-none"
            />
            <Search className="w-4 h-4 text-[#795465] absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Parkee Date Picker Popover */}
          <DatePickerModal
            labelPrefix="Checkout Date"
            initialRange={dateRange.rangePreset}
            initialDateFrom={dateRange.dateFrom}
            initialDateTo={dateRange.dateTo}
            initialTimeFrom={dateRange.timeFrom}
            initialTimeTo={dateRange.timeTo}
            onApply={handleDateApply}
          />

          {/* Parkee CMS Ticket Status Dropdown (Screenshot_69) */}
          <div className="flex items-center bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#1B1C1C]">
            <span className="text-[#817478] text-[11px] font-medium mr-1.5 hidden sm:inline">Ticket Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent font-black text-[#795465] text-xs outline-none cursor-pointer uppercase"
            >
              <option value="ALL STATUS">ALL STATUS</option>
              <option value="DONE">DONE</option>
              <option value="INPROCESS">INPROCESS</option>
              <option value="WAITING">WAITING</option>
              <option value="UNPAID">UNPAID</option>
            </select>
          </div>

          {/* Submit Search Button */}
          <button
            type="submit"
            className="px-4 py-2 bg-[#795465] text-white rounded-xl text-xs font-extrabold shadow-sm hover:bg-[#684756] transition-all"
          >
            Search
          </button>
        </form>

        {/* Tickets Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#EFEDED]">
          {isLoading ? (
            <div className="py-14 text-center text-xs font-black text-[#795465] animate-pulse">
              Loading transactions from Supabase...
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-14 text-center text-xs text-[#817478] font-bold space-y-1">
              <p>No transaction records found for the selected filter.</p>
              <p className="text-[11px] text-[#795465]">
                Try selecting "ALL TIME" in the Checkout Date filter or "ALL STATUS".
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F3F3] text-[#1B1C1C] border-b border-[#EFEDED]">
                  <th className="p-3.5 font-black uppercase text-[10px] tracking-wider">Slip Number</th>
                  <th className="p-3.5 font-black uppercase text-[10px] tracking-wider">Date & Time</th>
                  <th className="p-3.5 font-black uppercase text-[10px] tracking-wider">Customer</th>
                  <th className="p-3.5 font-black uppercase text-[10px] tracking-wider">Chair Code</th>
                  <th className="p-3.5 font-black uppercase text-[10px] tracking-wider">Amount & Duration</th>
                  <th className="p-3.5 font-black uppercase text-[10px] tracking-wider">Payment Method</th>
                  <th className="p-3.5 font-black uppercase text-[10px] tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEDED] bg-white">
                {tickets.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-[#FBF9F9] transition-colors">
                    <td className="p-3.5 font-mono font-black text-[#795465]">
                      {tx.chair_slip_number || tx.id}
                    </td>
                    <td className="p-3.5 font-bold text-[#4F4448]">
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
                    <td className="p-3.5 font-bold text-[#1B1C1C]">
                      {tx.customer_phone || 'GUEST'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#795465]">
                      {tx.chair_code || tx.chair_id}
                    </td>
                    <td className="p-3.5 font-black text-[#1B1C1C]">
                      <div>{formatRupiah(tx.amount || 0)}</div>
                      <div className="text-[10px] text-[#817478] font-normal">
                        Duration: {tx.duration_in_minutes || 4} mins ({tx.pulse_count || 5} pulses)
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-[#1B1C1C]">
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
          <span className="text-[#817478] font-bold">
            Showing {totalCount} transactions (Page {page} of {totalPages})
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] rounded-xl font-bold disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-black text-[#795465] px-2">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] rounded-xl font-bold disabled:opacity-40 transition-colors"
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
        <div className="py-12 text-center text-xs font-black text-[#795465] animate-pulse">
          Loading ticket audit logs...
        </div>
      }
    >
      <TicketContent />
    </Suspense>
  );
}
