'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, X, ChevronDown, Check } from 'lucide-react';
import { getWibNow, getWibDateRange } from '@/lib/date-utils';

export interface DateRangeState {
  rangePreset: string; // 'today' | 'yesterday' | 'this_week' | 'last_week' | 'month' | 'last_month' | 'all' | 'custom'
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  timeFrom: string; // HH:mm
  timeTo: string; // HH:mm
}

interface DatePickerModalProps {
  initialRange?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  initialTimeFrom?: string;
  initialTimeTo?: string;
  onApply: (range: DateRangeState) => void;
  labelPrefix?: string;
}

export default function DatePickerModal({
  initialRange = 'today',
  initialDateFrom = '',
  initialDateTo = '',
  initialTimeFrom = '00:00',
  initialTimeTo = '23:59',
  onApply,
  labelPrefix = 'Checkout Date',
}: DatePickerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const wibNow = getWibNow();
  const yyyy = wibNow.getFullYear();
  const mm = String(wibNow.getMonth() + 1).padStart(2, '0');
  const dd = String(wibNow.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const [preset, setPreset] = useState<string>(initialRange || 'today');
  const [dateFrom, setDateFrom] = useState<string>(initialDateFrom || todayStr);
  const [dateTo, setDateTo] = useState<string>(initialDateTo || todayStr);
  const [timeFrom, setTimeFrom] = useState<string>(initialTimeFrom || '00:00');
  const [timeTo, setTimeTo] = useState<string>(initialTimeTo || '23:59');

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle Preset Clicks (Parkee CMS style)
  const handleSelectPreset = (pId: string) => {
    setPreset(pId);
    if (pId === 'all') {
      setDateFrom('');
      setDateTo('');
      setTimeFrom('00:00');
      setTimeTo('23:59');
      return;
    }

    const { startIso, endIso } = getWibDateRange(pId);
    if (startIso && endIso) {
      const dStart = new Date(startIso);
      const dEnd = new Date(endIso);
      // Format back to WIB YYYY-MM-DD
      const startWib = new Date(dStart.getTime() + 7 * 3600000);
      const endWib = new Date(dEnd.getTime() + 7 * 3600000);

      setDateFrom(startWib.toISOString().slice(0, 10));
      setDateTo(endWib.toISOString().slice(0, 10));
      setTimeFrom('00:00');
      setTimeTo('23:59');
    }
  };

  const handleApply = () => {
    onApply({
      rangePreset: preset,
      dateFrom,
      dateTo,
      timeFrom,
      timeTo,
    });
    setIsOpen(false);
  };

  const formatButtonDisplay = () => {
    if (preset === 'all' && !dateFrom && !dateTo) {
      return 'All Time';
    }
    if (dateFrom && dateTo) {
      const formatDate = (ds: string, ts: string) => {
        const parts = ds.split('-');
        if (parts.length !== 3) return ds;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const mIdx = parseInt(parts[1], 10) - 1;
        return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0]} ${ts}`;
      };
      return `${formatDate(dateFrom, timeFrom)} - ${formatDate(dateTo, timeTo)}`;
    }
    return 'Select Date Range';
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button (Parkee CMS Filter Bar Style) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#1B1C1C] border border-[#EFEDED] rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all shadow-sm"
        title="Open Date Filter"
      >
        <CalendarIcon className="w-4 h-4 text-[#795465] shrink-0" />
        <span className="text-[#817478] font-medium hidden sm:inline">{labelPrefix}:</span>
        <span className="font-extrabold text-[#1B1C1C]">{formatButtonDisplay()}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#817478] ml-1 shrink-0" />
      </button>

      {/* Popover Modal (Parkee CMS Dual Panel Style) */}
      {isOpen && (
        <>
          {/* Mobile overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/25 z-40 sm:hidden backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="fixed inset-x-3 top-20 sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:mt-2 w-auto sm:w-[540px] max-w-[calc(100vw-24px)] bg-white rounded-3xl border border-[#EFEDED] shadow-2xl z-50 p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEDED]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#795465]" />
                <h3 className="text-xs font-black text-[#1B1C1C] uppercase tracking-wider">
                  Filter Date & Time Range
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-[#817478] hover:text-[#1B1C1C] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Left/Middle: Date & Time Inputs */}
            <div className="sm:col-span-2 space-y-3">
              {/* Start Date & Time */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#795465] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Start Date & Time</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPreset('custom');
                    }}
                    className="flex-1 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-3 py-2 text-xs font-bold text-[#1B1C1C] outline-none focus:border-[#795465]"
                  />
                  <input
                    type="time"
                    value={timeFrom}
                    onChange={(e) => {
                      setTimeFrom(e.target.value);
                      setPreset('custom');
                    }}
                    className="w-24 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-2.5 py-2 text-xs font-bold text-[#1B1C1C] outline-none focus:border-[#795465]"
                  />
                </div>
              </div>

              {/* End Date & Time */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#795465] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>End Date & Time</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPreset('custom');
                    }}
                    className="flex-1 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-3 py-2 text-xs font-bold text-[#1B1C1C] outline-none focus:border-[#795465]"
                  />
                  <input
                    type="time"
                    value={timeTo}
                    onChange={(e) => {
                      setTimeTo(e.target.value);
                      setPreset('custom');
                    }}
                    className="w-24 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl px-2.5 py-2 text-xs font-bold text-[#1B1C1C] outline-none focus:border-[#795465]"
                  />
                </div>
              </div>

              {/* Selection Summary Pill */}
              <div className="p-3 bg-[#F5F3F3] rounded-xl border border-[#EFEDED] text-[11px] font-medium text-[#4F4448]">
                <span className="font-extrabold text-[#795465]">Active Selection: </span>
                <span>{formatButtonDisplay()}</span>
              </div>
            </div>

            {/* Right Panel: Quick Presets (Matching Parkee CMS Screenshot_68 & 70) */}
            <div className="flex flex-col gap-1.5 border-t sm:border-t-0 sm:border-l border-[#EFEDED] pt-3 sm:pt-0 sm:pl-3">
              <span className="text-[10px] font-black text-[#817478] uppercase tracking-wider mb-1">
                Quick Presets
              </span>
              {[
                { id: 'today', label: 'TODAY' },
                { id: 'yesterday', label: 'YESTERDAY' },
                { id: 'this_week', label: 'THIS WEEK' },
                { id: 'last_week', label: 'LAST WEEK' },
                { id: 'month', label: 'THIS MONTH' },
                { id: 'last_month', label: 'LAST MONTH' },
                { id: 'all', label: 'ALL TIME' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold text-left transition-all flex items-center justify-between ${
                    preset === p.id
                      ? 'bg-[#795465] text-white shadow-sm'
                      : 'bg-[#F5F3F3] text-[#4F4448] hover:bg-[#EFEDED] hover:text-[#1B1C1C]'
                  }`}
                >
                  <span>{p.label}</span>
                  {preset === p.id && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Footer (Cancel & Apply) */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEDED]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-[#F5F3F3] hover:bg-[#EFEDED] text-[#4F4448] rounded-xl text-xs font-extrabold transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-[#795465] hover:bg-[#684756] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#795465]/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Filter</span>
            </button>
          </div>
        </div>
      </>
    )}
    </div>
  );
}
