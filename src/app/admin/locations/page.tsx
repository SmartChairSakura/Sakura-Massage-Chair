'use client';

import React, { useState, useEffect, Suspense, useId, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Edit2,
  Trash2,
  Armchair,
  Check,
  AlertCircle,
  AlertTriangle,
  X,
  ChevronRight,
  Search,
  Filter,
  Lock,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { Location, IncomeBreakdownItem, IncomeEntity } from '@/types';
import { AppSelect, Option } from '@/components/admin/ThemedSelect';

export const dynamic = 'force-dynamic';

const PROVINCE_OPTIONS: Option[] = [
  'DKI Jakarta',
  'Jawa Barat',
  'Jawa Tengah',
  'Jawa Timur',
  'Banten',
  'DI Yogyakarta',
  'Bali',
  'Sumatera Utara',
  'Sumatera Selatan',
  'Kepulauan Riau',
  'Lainnya',
].map((prov) => ({ value: prov, label: prov }));

const STATUS_FILTER_OPTIONS: Option[] = [
  { value: 'ALL', label: 'Status: All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const RECIPIENT_OPTIONS: Option[] = [
  { value: 'OWNER', label: 'Owner', hint: 'Venue owner / pemilik tempat' },
  { value: 'SYSTEM', label: 'Platform', hint: 'Platform / system ops' },
  { value: 'PARTNER', label: 'Partner', hint: 'Location sub-partner' },
  { value: 'OTHER', label: 'Other', hint: 'Other recipient' },
];

const DEFAULT_BREAKDOWN_ITEMS: IncomeBreakdownItem[] = [
  {
    entity: 'OWNER',
    party_name: 'Venue Owner',
    percentage: 95,
    is_default: true,
  },
  {
    entity: 'SYSTEM',
    party_name: 'Platform / System',
    percentage: 5,
    is_default: false,
  },
];

function formatChairCount(count: number): string {
  const n = Math.max(0, Number(count || 0));
  return `${n} chair${n === 1 ? '' : 's'}`;
}

const inputCls =
  'h-10 w-full rounded-lg border border-(--border-field) bg-white px-3 text-sm text-(--text) ' +
  'placeholder:text-(--text-placeholder) focus-visible:border-(--brand) focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-(--focus-ring)/30 aria-[invalid=true]:border-(--error)';

function Field({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: (p: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] leading-5 font-medium text-(--text)">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-(--text-muted)">(optional)</span>
        )}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && <p id={hintId} className="text-xs text-(--text-muted)">{hint}</p>}
      {error && <p id={errId} className="text-xs font-medium text-(--error)">{error}</p>}
    </div>
  );
}

function LocationSettingContent() {
  const searchParams = useSearchParams();
  const locationIdParam = searchParams.get('location_id') || 'ALL';

  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'fleet'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for Add / Edit Location
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Location Metadata Form States
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locCodeError, setLocCodeError] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locCountry, setLocCountry] = useState('Indonesia');
  const [locStateProv, setLocStateProv] = useState('DKI Jakarta');
  const [locCity, setLocCity] = useState('Kota Jakarta Pusat');
  const [locPicName, setLocPicName] = useState('');
  const [locPicPhone, setLocPicPhone] = useState('');

  // Income Breakdown Items (Revenue Split for Owner & System)
  const [incomeBreakdown, setIncomeBreakdown] = useState<IncomeBreakdownItem[]>(
    DEFAULT_BREAKDOWN_ITEMS
  );

  // Reversible Row Deletion Undo State (6s)
  const [removedRowBackup, setRemovedRowBackup] = useState<{
    item: IncomeBreakdownItem;
    index: number;
  } | null>(null);
  const rowUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reversible Location Deletion Undo Toast State (8s)
  const [deletedLocationUndo, setDeletedLocationUndo] = useState<Location | null>(null);
  const locUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalMsg, setModalMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Location Confirmation Modal
  const [deleteConfirmLoc, setDeleteConfirmLoc] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  const addTriggerRef = useRef<HTMLButtonElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/locations');
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.warn('Fetch locations error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Focus first field when modal opens & handle Escape key
  useEffect(() => {
    if (!showModal) return;
    const focusTimer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isFormDirty) {
          setConfirmDiscard(true);
        } else {
          setShowModal(false);
          addTriggerRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal, isFormDirty]);

  // Compute total owner and system percentages from breakdown list
  const computedOwnerPct = useMemo(
    () =>
      incomeBreakdown
        .filter((item) => item.entity !== 'SYSTEM')
        .reduce((sum, item) => sum + (Number(item.percentage) || 0), 0),
    [incomeBreakdown]
  );

  const computedSystemPct = useMemo(
    () =>
      incomeBreakdown
        .filter((item) => item.entity === 'SYSTEM')
        .reduce((sum, item) => sum + (Number(item.percentage) || 0), 0),
    [incomeBreakdown]
  );

  const totalBreakdownPct = useMemo(
    () => +(computedOwnerPct + computedSystemPct).toFixed(2),
    [computedOwnerPct, computedSystemPct]
  );

  const pctDiff = useMemo(() => +(100 - totalBreakdownPct).toFixed(2), [totalBreakdownPct]);
  const totalState: 'ok' | 'under' | 'over' =
    Math.abs(pctDiff) < 0.01 ? 'ok' : pctDiff > 0 ? 'under' : 'over';

  const canSaveModal =
    totalState === 'ok' &&
    Boolean(locName.trim()) &&
    Boolean(locCode.trim()) &&
    !locCodeError &&
    incomeBreakdown.every(
      (p) =>
        Number(p.percentage) > 0 &&
        (p.entity === 'SYSTEM' || Boolean(p.party_name?.trim()))
    );

  const handleRequestCloseModal = () => {
    if (isFormDirty) {
      setConfirmDiscard(true);
    } else {
      setShowModal(false);
      setConfirmDiscard(false);
      addTriggerRef.current?.focus();
    }
  };

  const handleForceCloseModal = () => {
    setShowModal(false);
    setConfirmDiscard(false);
    setIsFormDirty(false);
    addTriggerRef.current?.focus();
  };

  const handleAddBreakdownItem = () => {
    setIsFormDirty(true);
    const defaultRemaining = pctDiff > 0 ? pctDiff : 0;
    setIncomeBreakdown((prev) => [
      ...prev,
      {
        entity: 'PARTNER',
        party_name: '',
        percentage: defaultRemaining,
        is_default: false,
      },
    ]);
  };

  const handleRemoveBreakdownItem = (index: number) => {
    if (incomeBreakdown.length <= 1) return;
    setIsFormDirty(true);
    const removed = incomeBreakdown[index];
    setRemovedRowBackup({ item: removed, index });
    setIncomeBreakdown((prev) => prev.filter((_, i) => i !== index));

    if (rowUndoTimerRef.current) clearTimeout(rowUndoTimerRef.current);
    rowUndoTimerRef.current = setTimeout(() => {
      setRemovedRowBackup(null);
    }, 6000);
  };

  const handleUndoRemoveRow = () => {
    if (!removedRowBackup) return;
    if (rowUndoTimerRef.current) clearTimeout(rowUndoTimerRef.current);
    setIncomeBreakdown((prev) => {
      const next = [...prev];
      const insertAt = Math.min(removedRowBackup.index, next.length);
      next.splice(insertAt, 0, removedRowBackup.item);
      return next;
    });
    setRemovedRowBackup(null);
  };

  const handleAutoBalanceRemaining = () => {
    if (incomeBreakdown.length === 0 || Math.abs(pctDiff) < 0.01) return;
    setIsFormDirty(true);
    setIncomeBreakdown((prev) => {
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      const adjusted = Math.max(0, +(Number(copy[lastIdx].percentage || 0) + pctDiff).toFixed(2));
      copy[lastIdx] = { ...copy[lastIdx], percentage: adjusted };
      return copy;
    });
  };

  const handleUpdateBreakdownItem = (
    index: number,
    field: keyof IncomeBreakdownItem,
    val: any
  ) => {
    setIsFormDirty(true);
    setIncomeBreakdown((prev) => {
      const copy = [...prev];
      const updated = { ...copy[index], [field]: val };
      if (field === 'entity' && val === 'SYSTEM') {
        updated.party_name = 'Platform / System';
      }
      copy[index] = updated;
      return copy;
    });
  };

  const validateSiteCodeUniqueness = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setLocCodeError('');
      return;
    }
    const duplicate = locations.find(
      (l) =>
        l.location_code.toUpperCase() === clean &&
        (!editingLocation || l.id !== editingLocation.id)
    );
    if (duplicate) {
      setLocCodeError(`Site code "${clean}" is already used by ${duplicate.name}.`);
    } else {
      setLocCodeError('');
    }
  };

  const openAddModal = () => {
    setEditingLocation(null);
    setLocName('');
    setLocCode('');
    setLocCodeError('');
    setLocAddress('');
    setLocCountry('Indonesia');
    setLocStateProv('DKI Jakarta');
    setLocCity('Kota Jakarta Pusat');
    setLocPicName('');
    setLocPicPhone('');
    setIncomeBreakdown([
      { entity: 'OWNER', party_name: 'Venue Owner', percentage: 95, is_default: true },
      { entity: 'SYSTEM', party_name: 'Platform / System', percentage: 5, is_default: false },
    ]);
    setRemovedRowBackup(null);
    setModalMsg('');
    setIsFormDirty(false);
    setConfirmDiscard(false);
    setShowModal(true);
  };

  const openEditModal = (loc: Location) => {
    setEditingLocation(loc);
    setLocName(loc.name);
    setLocCode(loc.location_code);
    setLocCodeError('');
    setLocAddress(loc.address || '');
    setLocCountry(loc.country || 'Indonesia');
    setLocStateProv(loc.state_province || 'DKI Jakarta');
    setLocCity(loc.city || 'Kota Jakarta Pusat');
    setLocPicName(loc.pic_name || '');
    setLocPicPhone(loc.pic_phone || '');

    if (loc.income_breakdown && loc.income_breakdown.length > 0) {
      setIncomeBreakdown(loc.income_breakdown);
    } else {
      setIncomeBreakdown([
        {
          entity: 'OWNER',
          party_name: loc.name ? `Owner (${loc.name})` : 'Venue Owner',
          percentage: loc.owner_share_pct || 95,
          is_default: true,
        },
        {
          entity: 'SYSTEM',
          party_name: 'Platform / System',
          percentage: loc.system_share_pct || 5,
          is_default: false,
        },
      ]);
    }

    setRemovedRowBackup(null);
    setModalMsg('');
    setIsFormDirty(false);
    setConfirmDiscard(false);
    setShowModal(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim() || !locCode.trim()) {
      setModalMsg('Branch name and site code are required.');
      return;
    }

    if (locCodeError) {
      setModalMsg(locCodeError);
      return;
    }

    if (Math.abs(totalBreakdownPct - 100) > 0.01) {
      setModalMsg(
        `Total revenue share breakdown must equal exactly 100%. Current total: ${totalBreakdownPct}%`
      );
      return;
    }

    setIsSaving(true);
    setModalMsg('');

    try {
      const normalizedBreakdown = incomeBreakdown.map((item) => ({
        ...item,
        party_name:
          item.entity === 'SYSTEM'
            ? 'Platform / System'
            : item.party_name.trim() || 'Venue Owner',
      }));

      const payload = {
        name: locName.trim(),
        location_code: locCode.trim().toUpperCase(),
        address: locAddress.trim(),
        country: locCountry.trim() || 'Indonesia',
        state_province: locStateProv.trim(),
        city: locCity.trim(),
        pic_name: locPicName.trim() || 'Operational Team',
        pic_phone: locPicPhone.trim() || '-',
        owner_share_pct: computedOwnerPct,
        system_share_pct: computedSystemPct,
        income_breakdown: normalizedBreakdown,
      };

      let res;
      if (editingLocation) {
        res = await fetch(`/api/admin/locations/${editingLocation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const resData = await res.json();

      if (resData.success) {
        setShowModal(false);
        setIsFormDirty(false);
        setConfirmDiscard(false);
        fetchLocations();
      } else {
        setModalMsg(resData.error || 'Failed to save location.');
      }
    } catch (err: any) {
      setModalMsg(`Error: ${err?.message || 'Server error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLocationConfirm = async () => {
    if (!deleteConfirmLoc) return;
    setIsDeleting(true);
    setDeleteErrorMsg('');

    try {
      const targetLoc = deleteConfirmLoc;
      const res = await fetch(`/api/admin/locations/${targetLoc.id}`, {
        method: 'DELETE',
      });
      const resData = await res.json();

      if (resData.success) {
        setDeleteConfirmLoc(null);
        setDeletedLocationUndo(targetLoc);
        fetchLocations();

        if (locUndoTimerRef.current) clearTimeout(locUndoTimerRef.current);
        locUndoTimerRef.current = setTimeout(() => {
          setDeletedLocationUndo(null);
        }, 8000);
      } else {
        setDeleteErrorMsg(resData.error || 'Failed to delete location.');
      }
    } catch (err: any) {
      setDeleteErrorMsg(`Error: ${err?.message || 'Server error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUndoDeleteLocation = async () => {
    if (!deletedLocationUndo) return;
    const locToRestore = deletedLocationUndo;
    if (locUndoTimerRef.current) clearTimeout(locUndoTimerRef.current);
    setDeletedLocationUndo(null);

    try {
      await fetch(`/api/admin/locations/${locToRestore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleted_at: null, status: 'active' }),
      });
      fetchLocations();
    } catch (err) {
      console.warn('Undo location delete error:', err);
    }
  };

  const toggleSort = (column: 'name' | 'fleet') => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  // Filter and sort locations
  const filteredLocations = useMemo(() => {
    const filtered = locations.filter((loc) => {
      const matchesHeaderId = locationIdParam === 'ALL' || loc.id === locationIdParam;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        loc.name.toLowerCase().includes(q) ||
        loc.location_code.toLowerCase().includes(q) ||
        (loc.city && loc.city.toLowerCase().includes(q)) ||
        (loc.pic_name && loc.pic_name.toLowerCase().includes(q));

      const locStatus = (loc.status || 'active').toLowerCase();
      const matchesStatus = statusFilter === 'ALL' || locStatus === statusFilter.toLowerCase();

      return matchesHeaderId && matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'fleet') {
        return ((a.chair_count || 0) - (b.chair_count || 0)) * dir;
      }
      return a.name.localeCompare(b.name) * dir;
    });
  }, [locations, locationIdParam, searchQuery, statusFilter, sortBy, sortDir]);

  return (
    <div className="space-y-5">
      {/* Compact Page Header Row (No bloated card wrapper, no duplicate MapPin icon, single Plus icon) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-(--text) tracking-tight">
            Locations & Revenue Sharing
          </h1>
          <p className="text-xs text-(--text-muted) font-normal mt-1">
            Manage branch sites, operational contacts, and revenue share terms.
          </p>
        </div>

        <button
          ref={addTriggerRef}
          onClick={openAddModal}
          className="h-10 px-4 bg-(--brand) hover:bg-(--brand-hover) text-white rounded-xl text-sm font-semibold shadow-xs flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Location</span>
        </button>
      </div>

      {/* Filter Bar & Locations Table Surface */}
      <div className="bg-white rounded-2xl border border-(--border) p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input (WCAG 3.57:1 border & 4.83:1 placeholder) */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search locations"
              placeholder="Search by branch name, site code, city, or PIC..."
              className={`${inputCls} pl-10`}
            />
            <Search className="w-4 h-4 text-(--text-muted) absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Themed Status Filter Dropdown (AppSelect) */}
          <div className="w-full sm:w-48">
            <AppSelect
              aria-label="Filter location status"
              icon={<Filter className="size-4" />}
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>
        </div>

        {/* Locations Table */}
        <div className="overflow-x-auto rounded-xl border border-(--border)">
          {isLoading ? (
            <div className="py-12 text-center text-sm font-medium text-(--brand) animate-pulse">
              Loading branches...
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="py-12 text-center text-sm text-(--text-muted) font-normal">
              No locations found. Click &ldquo;Add Location&rdquo; to register your first branch.
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-(--bg-subtle) text-(--text-muted) border-b border-(--border) text-xs uppercase tracking-wide">
                  <th className="py-3 px-4 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1 hover:text-(--text) focus-visible:outline-none"
                    >
                      <span>Branch Name</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3 px-4 font-semibold">Site Code</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort('fleet')}
                      className="inline-flex items-center gap-1 hover:text-(--text) focus-visible:outline-none"
                    >
                      <span>Fleet Size</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3 px-4 font-semibold">Revenue Split (Owner / Platform)</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border) bg-white">
                {filteredLocations.map((loc) => {
                  const isActive = (loc.status || 'active').toLowerCase() !== 'inactive';
                  const totalChairs = Number(loc.chair_count || 0);
                  const onlineChairs = Number(loc.online_chair_count || 0);
                  const hasOfflineChairs = totalChairs > 0 && onlineChairs < totalChairs;
                  const ownerPct = Number(loc.owner_share_pct ?? 95);
                  const systemPct = Number(loc.system_share_pct ?? 5);

                  const breakdownTooltip =
                    loc.income_breakdown && loc.income_breakdown.length > 0
                      ? loc.income_breakdown
                          .map((p) => `${p.party_name || p.entity}: ${p.percentage}%`)
                          .join(' · ')
                      : `Owner: ${ownerPct}% · Platform: ${systemPct}%`;

                  return (
                    <tr
                      key={loc.id}
                      className="hover:bg-(--bg-subtle)/60 transition-colors"
                    >
                      {/* Branch Name + City + PIC Contact */}
                      <td className="py-3 px-4 align-middle">
                        <div
                          className="max-w-[28ch] truncate font-medium text-(--text)"
                          title={loc.name}
                        >
                          {loc.name}
                        </div>
                        <div className="text-xs text-(--text-muted) truncate max-w-[34ch]">
                          {loc.city || 'Jakarta'} · {loc.state_province || 'DKI Jakarta'}
                          {loc.pic_name ? ` · PIC: ${loc.pic_name}` : ''}
                        </div>
                      </td>

                      {/* Site Code (JetBrains Mono exclusively here) */}
                      <td className="py-3 px-4 align-middle">
                        <span className="font-mono text-[13px] font-medium text-(--brand)">
                          {loc.location_code}
                        </span>
                      </td>

                      {/* Location Operational Status (Active / Inactive separated from Fleet Health) */}
                      <td className="py-3 px-4 align-middle">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-(--ok-bg) text-(--ok)">
                            <Check className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-(--bg-subtle) text-(--text-muted)">
                            <X className="w-3.5 h-3.5" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* Fleet Size & Online Health (Proper pluralization + internal ChevronRight) */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <Link
                            href={`/admin/chairs?location=${loc.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-(--bg-subtle) hover:bg-(--brand-soft) text-(--brand) text-xs font-semibold rounded-lg transition-colors tabular-nums"
                          >
                            <Armchair className="w-3.5 h-3.5" />
                            <span>{formatChairCount(totalChairs)}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] tabular-nums ${
                              totalChairs === 0
                                ? 'text-(--text-muted)'
                                : hasOfflineChairs
                                ? 'text-(--warn) font-medium'
                                : 'text-(--ok)'
                            }`}
                          >
                            {hasOfflineChairs && <AlertTriangle className="w-3 h-3 shrink-0" />}
                            {totalChairs === 0
                              ? '0 online'
                              : `${onlineChairs} / ${totalChairs} online`}
                          </span>
                        </div>
                      </td>

                      {/* Segmented Revenue Split Bar + Tabular Numbers */}
                      <td className="py-3 px-4 align-middle" title={breakdownTooltip}>
                        <div className="space-y-1.5 max-w-[200px]">
                          <div className="flex items-center justify-between text-xs tabular-nums">
                            <span className="font-semibold text-(--text)">
                              {ownerPct}% Owner
                            </span>
                            <span className="text-(--text-muted)">
                              {systemPct}% Platform
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-(--bg-subtle) overflow-hidden flex gap-0.5">
                            <div
                              className="h-full bg-(--brand) rounded-l-full"
                              style={{ width: `${Math.max(0, Math.min(100, ownerPct))}%` }}
                            />
                            <div
                              className="h-full bg-[#8A8186] rounded-r-full"
                              style={{ width: `${Math.max(0, Math.min(100, systemPct))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Accessible 40x40px Action Buttons (Neutral by default, red only on hover/focus) */}
                      <td className="py-3 px-4 align-middle text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(loc)}
                            aria-label={`Edit ${loc.name}`}
                            title={`Edit ${loc.name}`}
                            className="w-10 h-10 grid place-items-center rounded-lg text-(--text-muted) hover:bg-(--bg-subtle) hover:text-(--brand) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteErrorMsg('');
                              setDeleteConfirmLoc(loc);
                            }}
                            aria-label={`Delete ${loc.name}`}
                            title={`Delete ${loc.name}`}
                            className="w-10 h-10 grid place-items-center rounded-lg text-(--text-muted) hover:bg-(--error-bg) hover:text-(--error) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 8-Second Location Soft-Delete Undo Toast */}
      {deletedLocationUndo && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-white text-(--text) border border-(--border-field) rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 text-sm"
        >
          <span>
            Location <strong>{deletedLocationUndo.name}</strong> deleted.
          </span>
          <button
            type="button"
            onClick={handleUndoDeleteLocation}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-(--brand-soft) hover:bg-(--brand-soft-hover) text-(--brand) font-semibold text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Non-Clipped Add / Edit Location Modal (max-h-[90dvh], sticky header & footer) */}
      {showModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) handleRequestCloseModal();
          }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="loc-modal-title"
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-2xl bg-white border border-(--border) shadow-xl overflow-hidden"
          >
            {/* Sticky Modal Header (shrink-0, sentence case, 40x40px close button) */}
            <header className="flex shrink-0 items-center justify-between border-b border-(--border) px-6 py-4 bg-white">
              <h2 id="loc-modal-title" className="text-base font-semibold text-(--text)">
                {editingLocation ? 'Edit location' : 'Add location'}
              </h2>
              <button
                type="button"
                onClick={handleRequestCloseModal}
                aria-label="Close modal"
                title="Close modal"
                className="grid size-10 place-items-center rounded-lg text-(--text-muted) hover:bg-(--bg-subtle) hover:text-(--text) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
              >
                <X className="size-5" />
              </button>
            </header>

            {/* Scrollable Form Body */}
            <form
              id="location-modal-form"
              onSubmit={handleModalSubmit}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
            >
              {/* Section 1: Details */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold text-(--text) border-b border-(--border) pb-2">
                  Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Branch name">
                    {({ id, describedBy, invalid }) => (
                      <input
                        ref={firstInputRef}
                        id={id}
                        type="text"
                        value={locName}
                        onChange={(e) => {
                          setIsFormDirty(true);
                          setLocName(e.target.value);
                        }}
                        placeholder="e.g. Grand Indonesia"
                        required
                        aria-describedby={describedBy}
                        aria-invalid={invalid}
                        className={inputCls}
                      />
                    )}
                  </Field>

                  <Field
                    label="Site code"
                    hint="Unique uppercase code, letters and numbers without spaces."
                    error={locCodeError || undefined}
                  >
                    {({ id, describedBy, invalid }) => (
                      <input
                        id={id}
                        type="text"
                        value={locCode}
                        onChange={(e) => {
                          setIsFormDirty(true);
                          const normalized = e.target.value.toUpperCase().replace(/\s+/g, '');
                          setLocCode(normalized);
                          if (locCodeError) validateSiteCodeUniqueness(normalized);
                        }}
                        onBlur={(e) => validateSiteCodeUniqueness(e.target.value)}
                        placeholder="e.g. GI-01"
                        required
                        aria-describedby={describedBy}
                        aria-invalid={invalid}
                        className={`${inputCls} font-mono uppercase`}
                      />
                    )}
                  </Field>
                </div>

                <Field label="Address" optional>
                  {({ id, describedBy, invalid }) => (
                    <textarea
                      id={id}
                      rows={2}
                      value={locAddress}
                      onChange={(e) => {
                        setIsFormDirty(true);
                        setLocAddress(e.target.value);
                      }}
                      placeholder="e.g. Jl. M.H. Thamrin No. 1, Jakarta Pusat"
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      className="w-full rounded-lg border border-(--border-field) bg-white px-3 py-2 text-sm text-(--text) placeholder:text-(--text-placeholder) focus-visible:border-(--brand) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)/30"
                    />
                  )}
                </Field>

                {/* Country / State / City (stacks to 1 column below 640px) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Country">
                    {({ id }) => (
                      <div className="relative">
                        <input
                          id={id}
                          type="text"
                          value={locCountry}
                          readOnly
                          className="h-10 w-full rounded-lg border border-(--border) bg-(--bg-subtle) px-3 pr-8 text-sm text-(--text-muted) cursor-default outline-none"
                        />
                        <Lock className="w-3.5 h-3.5 text-(--text-muted) absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}
                  </Field>

                  <Field label="State / province">
                    {({ id, describedBy, invalid }) => (
                      <AppSelect
                        id={id}
                        aria-describedby={describedBy}
                        aria-invalid={invalid}
                        zIndexClass="z-[90]"
                        value={locStateProv}
                        onValueChange={(val) => {
                          setIsFormDirty(true);
                          setLocStateProv(val);
                        }}
                        options={PROVINCE_OPTIONS}
                      />
                    )}
                  </Field>

                  <Field label="City">
                    {({ id, describedBy, invalid }) => (
                      <input
                        id={id}
                        type="text"
                        value={locCity}
                        onChange={(e) => {
                          setIsFormDirty(true);
                          setLocCity(e.target.value);
                        }}
                        placeholder="e.g. Jakarta Pusat"
                        aria-describedby={describedBy}
                        aria-invalid={invalid}
                        className={inputCls}
                      />
                    )}
                  </Field>
                </div>

                {/* Operational PIC Contact Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="PIC name" optional>
                    {({ id, describedBy, invalid }) => (
                      <input
                        id={id}
                        type="text"
                        value={locPicName}
                        onChange={(e) => {
                          setIsFormDirty(true);
                          setLocPicName(e.target.value);
                        }}
                        placeholder="e.g. Operational Team"
                        aria-describedby={describedBy}
                        aria-invalid={invalid}
                        className={inputCls}
                      />
                    )}
                  </Field>

                  <Field label="PIC phone" optional>
                    {({ id, describedBy, invalid }) => (
                      <input
                        id={id}
                        type="tel"
                        inputMode="tel"
                        value={locPicPhone}
                        onChange={(e) => {
                          setIsFormDirty(true);
                          setLocPicPhone(e.target.value);
                        }}
                        placeholder="e.g. 081234567890"
                        aria-describedby={describedBy}
                        aria-invalid={invalid}
                        className={`${inputCls} tabular-nums`}
                      />
                    )}
                  </Field>
                </div>
              </section>

              {/* Section 2: Revenue share */}
              <section className="space-y-4 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--border) pb-2">
                  <div>
                    <h3 className="text-base font-semibold text-(--text)">Revenue share</h3>
                    <p className="text-xs text-(--text-muted)">
                      Percentage changes apply to subsequent transactions.
                    </p>
                  </div>

                  {/* 3-State Accessible Live Total Badge */}
                  <p
                    aria-live="polite"
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
                      totalState === 'ok'
                        ? 'bg-(--ok-bg) text-(--ok)'
                        : totalState === 'under'
                        ? 'bg-(--warn-bg) text-(--warn)'
                        : 'bg-(--error-bg) text-(--error)'
                    }`}
                  >
                    {totalState === 'ok' && (
                      <>
                        <Check className="size-3.5" />
                        <span>Total 100%</span>
                      </>
                    )}
                    {totalState === 'under' && (
                      <>
                        <AlertTriangle className="size-3.5" />
                        <span>
                          Total {totalBreakdownPct}%, remaining {pctDiff}%
                        </span>
                      </>
                    )}
                    {totalState === 'over' && (
                      <>
                        <X className="size-3.5" />
                        <span>
                          Total {totalBreakdownPct}%, excess {-pctDiff}%
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* 6-Second Row Removal Undo Banner */}
                {removedRowBackup && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-(--bg-subtle) border border-(--border) text-xs text-(--text)"
                  >
                    <span>
                      Removed <strong>{removedRowBackup.item.party_name || removedRowBackup.item.entity}</strong> row.
                    </span>
                    <button
                      type="button"
                      onClick={handleUndoRemoveRow}
                      className="inline-flex items-center gap-1 font-semibold text-(--brand) hover:underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  {incomeBreakdown.map((item, index) => {
                    const isPlatform = item.entity === 'SYSTEM';

                    return (
                      <div
                        key={index}
                        role="group"
                        aria-label={`Party ${index + 1}`}
                        className="p-3.5 bg-(--bg-subtle)/60 rounded-xl border border-(--border) grid grid-cols-1 sm:grid-cols-[160px_1fr_120px_40px] gap-3 items-end"
                      >
                        <Field label="Recipient">
                          {({ id }) => (
                            <AppSelect
                              id={id}
                              zIndexClass="z-[90]"
                              value={item.entity}
                              onValueChange={(val) =>
                                handleUpdateBreakdownItem(index, 'entity', val as IncomeEntity)
                              }
                              options={RECIPIENT_OPTIONS}
                            />
                          )}
                        </Field>

                        <Field label="Party name">
                          {({ id }) =>
                            isPlatform ? (
                              <div
                                id={id}
                                className="h-10 w-full rounded-lg border border-(--border) bg-(--bg-subtle) px-3 flex items-center text-sm text-(--text-muted) truncate"
                              >
                                Platform / System
                              </div>
                            ) : (
                              <input
                                id={id}
                                type="text"
                                value={item.party_name}
                                onChange={(e) =>
                                  handleUpdateBreakdownItem(index, 'party_name', e.target.value)
                                }
                                placeholder="e.g. PT Mitra Properti"
                                className={inputCls}
                              />
                            )
                          }
                        </Field>

                        <Field label="Share">
                          {({ id }) => (
                            <div className="relative">
                              <input
                                id={id}
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                min="0"
                                max="100"
                                value={item.percentage}
                                onChange={(e) =>
                                  handleUpdateBreakdownItem(
                                    index,
                                    'percentage',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className={`${inputCls} pr-7 text-right tabular-nums font-medium`}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-(--text-muted) pointer-events-none">
                                %
                              </span>
                            </div>
                          )}
                        </Field>

                        <button
                          type="button"
                          onClick={() => handleRemoveBreakdownItem(index)}
                          disabled={incomeBreakdown.length <= 1}
                          aria-label={`Remove ${item.party_name || item.entity} row`}
                          title="Remove party row"
                          className="w-10 h-10 grid place-items-center rounded-lg text-(--text-muted) hover:bg-(--error-bg) hover:text-(--error) disabled:opacity-40 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add Party & Auto-Balance Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleAddBreakdownItem}
                    className="h-9 px-3.5 bg-(--bg-subtle) hover:bg-(--brand-soft) border border-(--border) rounded-lg text-xs font-semibold text-(--brand) inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add party</span>
                  </button>

                  {totalState !== 'ok' && (
                    <button
                      type="button"
                      onClick={handleAutoBalanceRemaining}
                      className="h-9 px-3.5 bg-white hover:bg-(--bg-subtle) border border-(--border-field) rounded-lg text-xs font-semibold text-(--text) inline-flex items-center gap-1.5 transition-colors tabular-nums"
                    >
                      <span>
                        Auto-balance last row ({pctDiff > 0 ? `+${pctDiff}%` : `${pctDiff}%`})
                      </span>
                    </button>
                  )}
                </div>
              </section>
            </form>

            {/* Server / Validation Error Banner Above Sticky Footer */}
            {modalMsg && (
              <div
                role="alert"
                className="mx-6 mb-2 p-3 rounded-lg bg-(--error-bg) text-(--error) text-xs font-medium flex items-center gap-2 shrink-0"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalMsg}</span>
              </div>
            )}

            {/* Sticky Modal Footer (shrink-0: always visible even on short viewports) */}
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-(--border) px-6 py-4 bg-white">
              {confirmDiscard ? (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="text-xs font-medium text-(--warn)">
                    Discard unsaved changes?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDiscard(false)}
                      className="h-10 rounded-lg px-4 text-sm font-semibold bg-(--bg-subtle) hover:bg-(--border) text-(--text)"
                    >
                      Keep editing
                    </button>
                    <button
                      type="button"
                      onClick={handleForceCloseModal}
                      className="h-10 rounded-lg px-4 text-sm font-semibold bg-(--error) text-white hover:opacity-90"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex w-full items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleRequestCloseModal}
                    className="h-10 rounded-lg px-4 text-sm font-semibold text-(--text) hover:bg-(--bg-subtle) transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="location-modal-form"
                    disabled={isSaving || !canSaveModal}
                    className="h-10 rounded-lg bg-(--brand) hover:bg-(--brand-hover) px-5 text-sm font-semibold text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save location'}
                  </button>
                </div>
              )}
            </footer>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal with Explicit Chair Impact Summary */}
      {deleteConfirmLoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-loc-title"
            className="bg-white rounded-2xl border border-(--border) shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-(--error-bg) text-(--error) flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="del-loc-title" className="text-base font-semibold text-(--text)">
                  Delete {deleteConfirmLoc.name}?
                </h3>
                <p className="text-xs text-(--text-muted) font-normal mt-1 leading-relaxed">
                  {(deleteConfirmLoc.chair_count || 0) > 0
                    ? `This location currently has ${formatChairCount(
                        deleteConfirmLoc.chair_count || 0
                      )} assigned. You must reassign or remove active chairs before deleting this branch.`
                    : `This branch has 0 active chairs. You can undo this action within 8 seconds after deletion.`}
                </p>
              </div>
            </div>

            {deleteErrorMsg && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-(--error-bg) text-(--error) text-xs font-medium flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deleteErrorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmLoc(null)}
                className="h-10 px-4 hover:bg-(--bg-subtle) text-(--text) font-semibold text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLocationConfirm}
                disabled={isDeleting}
                className="h-10 px-4 bg-(--error) hover:opacity-90 text-white font-semibold text-sm rounded-lg shadow-xs disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LocationSettingPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm font-medium text-(--brand) animate-pulse">
          Loading location settings...
        </div>
      }
    >
      <LocationSettingContent />
    </Suspense>
  );
}
