'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
} from 'lucide-react';
import { ChairSlip } from '@/types';

export const dynamic = 'force-dynamic';

function TicketContent() {
  const searchParams = useSearchParams();
  const locationIdParam = searchParams.get('location_id') || 'ALL';

  const [tickets, setTickets] = useState<ChairSlip[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (locationIdParam !== 'ALL') query.set('location_id', locationIdParam);
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (searchQuery.trim()) query.set('search', searchQuery.trim());
      if (dateFrom) query.set('date_from', dateFrom);
      if (dateTo) query.set('date_to', dateTo);
      query.set('page', page.toString());
      query.set('limit', '15');

      const res = await fetch(`/api/admin/tickets?${query.toString()}`);
      const data = await res.json();

      if (data.success) {
        setTickets(data.tickets || []);
        if (data.pagination) {
          setTotalCount(data.pagination.total || 0);
          setTotalPages(data.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      console.warn('Fetch tickets error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [locationIdParam, statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleExportCSV = () => {
    if (tickets.length === 0) {
      alert('Belum ada transaksi tiket untuk diexport.');
      return;
    }

    const headers = [
      'Ticket Number',
      'Tanggal & Jam',
      'Pelanggan',
      'Unit ID Kursi',
      'Nominal (Rp)',
      'Durasi (Mnt)',
      'Metode Bayar',
      'Status',
    ];
    const csvRows = [headers.join(',')];

    tickets.forEach((tx: any) => {
      const row = [
        `"${tx.chair_slip_number || tx.id}"`,
        `"${new Date(tx.created_at).toLocaleString('id-ID')}"`,
        `"${tx.customer_phone || 'GUEST'}"`,
        `"${tx.chair_code || tx.chair_id}"`,
        tx.amount,
        tx.duration_in_minutes || 4,
        `"${tx.payment_method}"`,
        `"${tx.status}"`,
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rekap_tiket_sakura_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const renderStatusBadge = (status: string) => {
    const st = String(status || '').toLowerCase();
    if (['done', 'completed', 'paid', 'ongoing', 'session_inprocess'].includes(st)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#CEE5DA] text-[#4E635A]">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      );
    }
    if (st === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#F8C8DC] text-[#765162]">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FFDAD6] text-[#93000A]">
        <XCircle className="w-3 h-3" />
        Failed / Cancelled
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#1B1C1C] tracking-tight flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#795465]" />
            <span>Ticket Transactions</span>
          </h1>
          <p className="text-xs text-[#4F4448] font-bold mt-1">
            Daftar transaksi sesi kursi pijat pelanggan berbasis pembayaran QRIS.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-3 bg-[#795465] hover:bg-[#684756] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#795465]/20 flex items-center gap-2 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>EXPORT CSV</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-[2rem] border border-[#EFEDED] p-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nomor Tiket / Phone / Kode Unit..."
              className="w-full px-4 py-2.5 pl-10 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] placeholder-[#817478] focus:bg-white focus:border-[#795465] outline-none"
            />
            <Search className="w-4 h-4 text-[#795465] absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-[#F5F3F3] p-1 rounded-xl border border-[#EFEDED]">
            {[
              { id: 'ALL', label: 'Semua Status' },
              { id: 'completed', label: 'Done / Paid' },
              { id: 'pending', label: 'Pending' },
              { id: 'failed', label: 'Failed' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-[#795465] text-white shadow-sm'
                    : 'text-[#4F4448] hover:text-[#1B1C1C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="px-4 py-2.5 bg-[#795465] text-white rounded-xl text-xs font-extrabold shadow-sm hover:bg-[#684756]"
          >
            Cari
          </button>
        </form>

        {/* Tickets Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-xs font-extrabold text-[#795465] animate-pulse">
              Memuat data transaksi tiket...
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#817478] font-bold">
              Tidak ada data transaksi tiket ditemukan.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F5F3F3] text-[#1B1C1C] border-b border-[#EFEDED]">
                  <th className="p-3.5 font-extrabold">Ticket Number / Slip</th>
                  <th className="p-3.5 font-extrabold">Waktu Transaksi</th>
                  <th className="p-3.5 font-extrabold">Pelanggan</th>
                  <th className="p-3.5 font-extrabold">Kode Unit Kursi</th>
                  <th className="p-3.5 font-extrabold">Nominal & Durasi</th>
                  <th className="p-3.5 font-extrabold">Metode Bayar</th>
                  <th className="p-3.5 font-extrabold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEDED]">
                {tickets.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-[#FBF9F9] transition-colors">
                    <td className="p-3.5 font-mono font-extrabold text-[#795465]">
                      {tx.chair_slip_number || tx.id}
                    </td>
                    <td className="p-3.5 font-bold text-[#4F4448]">
                      {new Date(tx.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3.5 font-bold text-[#1B1C1C]">
                      {tx.customer_phone || 'GUEST'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#795465]">
                      {tx.chair_code || tx.chair_id}
                    </td>
                    <td className="p-3.5 font-extrabold text-[#1B1C1C]">
                      <div>{formatRupiah(tx.amount || 0)}</div>
                      <div className="text-[10px] text-[#817478] font-normal">
                        Durasi: {tx.duration_in_minutes || 4} Menit ({tx.pulse_count || 5} Pulsa)
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-[#1B1C1C] flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-[#795465]" />
                      <span>{tx.payment_method || 'QRIS'}</span>
                    </td>
                    <td className="p-3.5">{renderStatusBadge(tx.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#EFEDED] text-xs">
          <span className="text-[#817478] font-bold">
            Total {totalCount} Transaksi (Halaman {page} dari {totalPages})
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] rounded-xl font-bold disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-[#795465] px-2">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] rounded-xl font-bold disabled:opacity-50"
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
    <Suspense fallback={<div className="py-12 text-center text-xs font-extrabold text-[#795465] animate-pulse">Memuat transaksi tiket...</div>}>
      <TicketContent />
    </Suspense>
  );
}
