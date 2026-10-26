'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Armchair,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  X,
  Search,
  Filter,
  CloudUpload,
  Cpu,
  Eye,
  EyeOff,
  Lock,
  ArrowUpDown,
  Copy,
  Check,
  RefreshCw,
  ShieldAlert,
  Wifi,
} from 'lucide-react';
import { Chair, Location } from '@/types';
import { AppSelect, Option } from '@/components/admin/ThemedSelect';

export const dynamic = 'force-dynamic';

const MAX_FIRMWARE_BYTES = 1_572_864; // 1.5 MB ESP32 OTA partition limit
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

const HARDWARE_MODEL_OPTIONS: Option[] = [
  { value: 'Tokuyo TC-355', label: 'Tokuyo TC-355', hint: 'Standard PCB J3' },
  { value: 'Tokuyo TC-297', label: 'Tokuyo TC-297', hint: 'Compact Series' },
  { value: 'Ogawa Master Drive', label: 'Ogawa Master Drive', hint: 'Pulse Relay' },
  { value: 'Rovos R662L', label: 'Rovos R662L', hint: 'Commercial Grade' },
  { value: 'Sakura Zen Pro IoT', label: 'Sakura Zen Pro IoT', hint: 'ESP32 Native' },
];

const STATUS_FILTER_OPTIONS: Option[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'online', label: 'Online' },
  { value: 'in_use', label: 'In use' },
  { value: 'offline', label: 'Offline' },
  { value: 'updating', label: 'Updating' },
  { value: 'error', label: 'Error' },
];

const FIRMWARE_FILTER_OPTIONS: Option[] = [
  { value: 'ALL', label: 'All Firmware' },
  { value: 'UP_TO_DATE', label: 'Up to date' },
  { value: 'PENDING', label: 'Waiting standby' },
  { value: 'FAILED', label: 'Failed' },
];

const STRATEGY_OPTIONS: Option[] = [
  { value: 'canary', label: 'Canary (1 chair first)', hint: 'Recommended' },
  { value: 'staged', label: 'Staged rollout (10% of target)', hint: 'Gradual' },
  { value: 'all', label: 'Immediate (All target chairs)', hint: 'Broadcast' },
];

const SCHEDULE_OPTIONS: Option[] = [
  { value: 'standby', label: 'Execute immediately on standby (idle)' },
  { value: 'window_02_05', label: 'Maintenance window (02:00–05:00 WIB)' },
];

type DeviceState = 'online' | 'in_use' | 'offline' | 'updating' | 'error';

const STATE_CONFIG: Record<
  DeviceState,
  { label: string; dot: string; text: string; bg: string }
> = {
  online: {
    label: 'Online',
    dot: 'bg-(--ok)',
    text: 'text-(--ok)',
    bg: 'bg-(--ok-bg)',
  },
  in_use: {
    label: 'In use',
    dot: 'bg-(--brand)',
    text: 'text-(--brand)',
    bg: 'bg-(--brand-soft)',
  },
  offline: {
    label: 'Offline',
    dot: 'bg-(--text-muted)',
    text: 'text-(--text-muted)',
    bg: 'bg-(--bg-subtle)',
  },
  updating: {
    label: 'Updating',
    dot: 'bg-(--warn)',
    text: 'text-(--warn)',
    bg: 'bg-(--warn-bg)',
  },
  error: {
    label: 'Error',
    dot: 'bg-(--error)',
    text: 'text-(--error)',
    bg: 'bg-(--error-bg)',
  },
};

function resolveDeviceState(chair: Chair): DeviceState {
  const ota = String(chair.ota_status || '').toUpperCase();
  if (ota === 'DOWNLOADING') return 'updating';
  if (ota === 'FAILED') return 'error';

  const rawStatus = String(chair.status || 'ONLINE').toUpperCase();
  if (rawStatus === 'BUSY' || rawStatus === 'IN_USE') return 'in_use';
  if (rawStatus === 'OFFLINE') return 'offline';
  if (rawStatus === 'UPDATING') return 'updating';
  if (rawStatus === 'MAINTENANCE' || rawStatus === 'ERROR') return 'error';
  return 'online';
}

function formatRelativeHeartbeat(isoDate?: string | null): string {
  if (!isoDate) return 'Just now';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absSeconds < 60) return 'Just now';
  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function generateRandomClientPin(): string {
  const weak = new Set([
    '123456',
    '000000',
    '111111',
    '222222',
    '333333',
    '444444',
    '555555',
    '666666',
    '777777',
    '888888',
    '999999',
    '654321',
  ]);
  let candidate = '123456';
  while (weak.has(candidate)) {
    candidate = String(Math.floor(100000 + Math.random() * 900000));
  }
  return candidate;
}

function formatChairCount(n: number): string {
  return `${n} chair${n === 1 ? '' : 's'}`;
}

const inputCls =
  'h-10 w-full rounded-lg border border-(--border-field) bg-white px-3 text-sm text-(--text) ' +
  'placeholder:text-(--text-placeholder) focus-visible:border-(--brand) focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-(--brand)/30 disabled:bg-(--bg-subtle) disabled:text-(--text-muted)';

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[13px] font-medium text-(--text)">{label}</label>
        {hint && <span className="text-xs text-(--text-muted)">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-xs font-medium text-(--error)">
          {error}
        </p>
      )}
    </div>
  );
}

function PinField({
  id,
  value,
  onChange,
  onRandomize,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onRandomize?: () => void;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          pattern="\d{6}"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6 digits"
          aria-invalid={invalid}
          className="h-10 w-full rounded-lg border border-(--border-field) bg-white px-3 pr-11 font-mono text-[13px] tabular-nums tracking-widest text-(--text) placeholder:tracking-normal placeholder:font-sans placeholder:text-(--text-placeholder) focus-visible:border-(--brand) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)/30"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide PIN' : 'Show PIN'}
          aria-pressed={show}
          className="absolute right-1 top-1 grid size-8 place-items-center rounded-md text-(--text-muted) hover:bg-(--bg-subtle) hover:text-(--text)"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {onRandomize && (
        <button
          type="button"
          onClick={onRandomize}
          className="h-10 px-3 rounded-lg border border-(--border-field) bg-white hover:bg-(--bg-subtle) text-xs font-medium text-(--text) inline-flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <RefreshCw className="size-3.5 text-(--text-muted)" />
          <span>Generate random</span>
        </button>
      )}
    </div>
  );
}

function StatusCell({
  state,
  lastSeenIso,
}: {
  state: DeviceState;
  lastSeenIso?: string | null;
}) {
  const s = STATE_CONFIG[state];
  const parsedDate = lastSeenIso ? new Date(lastSeenIso) : null;
  const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}
      >
        <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
        <span>{s.label}</span>
      </span>
      <time
        dateTime={validDate ? validDate.toISOString() : undefined}
        title={validDate ? validDate.toLocaleString('en-GB') : 'Active heartbeat'}
        className="text-[11px] text-(--text-muted) tabular-nums"
      >
        Last seen {formatRelativeHeartbeat(lastSeenIso)}
      </time>
    </div>
  );
}

function FirmwareCell({
  current,
  target,
  otaStatus,
  onCancelOta,
  onRollbackOta,
}: {
  current: string;
  target?: string;
  otaStatus?: string;
  onCancelOta: () => void;
  onRollbackOta: () => void;
}) {
  const status = String(otaStatus || 'IDLE').toUpperCase();
  const isPending = status === 'PENDING';
  const isDownloading = status === 'DOWNLOADING';
  const isSuccess = status === 'SUCCESS';
  const isFailed = status === 'FAILED';

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="font-mono text-[13px] tabular-nums text-(--text)">{current}</span>
      {isPending && target && (
        <>
          <span aria-hidden="true" className="text-(--text-muted)">
            →
          </span>
          <span className="font-mono text-[13px] font-medium tabular-nums text-(--text)">
            {target}
          </span>
          <span className="rounded-full bg-(--warn-bg) px-2 py-0.5 text-xs font-semibold text-(--warn)">
            Waiting standby
          </span>
          <button
            type="button"
            onClick={onCancelOta}
            className="text-xs font-medium text-(--error) hover:underline px-1 py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
          >
            Cancel
          </button>
        </>
      )}
      {isDownloading && (
        <span className="rounded-full bg-(--warn-bg) px-2 py-0.5 text-xs font-semibold text-(--warn)">
          Updating...
        </span>
      )}
      {isSuccess && (
        <>
          <span className="rounded-full bg-(--ok-bg) px-2 py-0.5 text-xs font-semibold text-(--ok)">
            Up to date
          </span>
          <button
            type="button"
            onClick={onRollbackOta}
            className="text-xs font-medium text-(--text-muted) hover:text-(--text) hover:underline px-1 py-0.5 rounded"
          >
            Rollback
          </button>
        </>
      )}
      {isFailed && (
        <span className="rounded-full bg-(--error-bg) px-2 py-0.5 text-xs font-semibold text-(--error)">
          Failed
        </span>
      )}
    </div>
  );
}

function ChairListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locationIdParam =
    searchParams.get('location') || searchParams.get('location_id') || 'ALL';

  const [locations, setLocations] = useState<Location[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Orthogonal Toolbar Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [firmwareFilter, setFirmwareFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

  // Sorting State (Default: natural Chair Code ascending)
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'branch' | 'status' | 'firmware'>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Bulk Selection State
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  // Reversible Undo Banner State (8s Archive Undo / Branch Transfer Undo / OTA Undo)
  const [undoBanner, setUndoBanner] = useState<{
    message: string;
    onUndo?: () => Promise<void> | void;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Chair Detail & Telemetry Drawer / Modal State
  const [detailChair, setDetailChair] = useState<Chair | null>(null);
  const [revealedPinMap, setRevealedPinMap] = useState<
    Record<string, { pin: string; auditedBy: string; revealedAt: string }>
  >({});
  const [isRevealingPin, setIsRevealingPin] = useState(false);
  const [copiedPinCode, setCopiedPinCode] = useState<string | null>(null);

  // Add / Edit Chair Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingChair, setEditingChair] = useState<Chair | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Form Fields
  const [chairCode, setChairCode] = useState('');
  const [chairName, setChairName] = useState('');
  const [modelType, setModelType] = useState('Tokuyo TC-355');
  const [locationId, setLocationId] = useState('');
  const [pin, setPin] = useState('');
  const [modalMsg, setModalMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState('');

  // Bulk Move Branch Modal State
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [bulkMoveLocationId, setBulkMoveLocationId] = useState('');
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  // Safe Firmware OTA Modal State
  const [showOtaModal, setShowOtaModal] = useState(false);
  const [otaFile, setOtaFile] = useState<File | null>(null);
  const [otaFileSha256, setOtaFileSha256] = useState<string>('');
  const [otaVersion, setOtaVersion] = useState('2.2.0');
  const [otaTargetChairId, setOtaTargetChairId] = useState('');
  const [otaStrategy, setOtaStrategy] = useState<'canary' | 'staged' | 'all'>('canary');
  const [otaSchedule, setOtaSchedule] = useState('standby');
  const [otaNotes, setOtaNotes] = useState('');
  const [otaTypedConfirm, setOtaTypedConfirm] = useState('');
  const [otaMsg, setOtaMsg] = useState('');
  const [isDeployingOta, setIsDeployingOta] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToastWithUndo = (message: string, onUndo?: () => Promise<void> | void) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoBanner({ message, onUndo });
    undoTimerRef.current = setTimeout(() => {
      setUndoBanner(null);
    }, 8000);
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/admin/locations');
      const data = await res.json();
      if (data.success) {
        const list = data.locations || [];
        setLocations(list);
        if (list.length > 0 && !locationId) {
          setLocationId(list[0].id);
          setBulkMoveLocationId(list[0].id);
        }
      }
    } catch (err) {
      console.warn('Fetch locations error:', err);
    }
  };

  const fetchChairs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/chairs?include_archived=true');
      const data = await res.json();
      if (data.success) {
        setChairs(data.chairs || []);
      }
    } catch (err) {
      console.warn('Fetch chairs error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchChairs();
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // Suggest next Chair Code SAKURA-{LOCATION_CODE}-{NN} when adding a new unit
  const suggestChairCodeForLocation = (locId: string): string => {
    const loc = locations.find((l) => l.id === locId);
    const rawPrefix = (loc?.location_code || 'GI').replace(/-\d+$/, '').toUpperCase();
    const existingNums = chairs
      .map((c) => {
        const code = String(c.chair_code || '');
        const match = code.match(new RegExp(`^SAKURA-${rawPrefix}-(\\d+)$`, 'i'));
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    return `SAKURA-${rawPrefix}-${String(nextNum).padStart(2, '0')}`;
  };

  // Active vs Archived partition
  const activeChairs = useMemo(
    () => chairs.filter((c) => !c.deleted_at && c.is_active !== false),
    [chairs]
  );
  const archivedChairs = useMemo(
    () => chairs.filter((c) => Boolean(c.deleted_at) || c.is_active === false),
    [chairs]
  );

  // Active location object if URL has ?location=<id>
  const activeLocationObj = useMemo(() => {
    if (locationIdParam === 'ALL') return null;
    return locations.find((l) => l.id === locationIdParam) || null;
  }, [locations, locationIdParam]);

  // Filter & natural sort chairs
  const filteredChairs = useMemo(() => {
    const baseList = viewMode === 'archived' ? archivedChairs : activeChairs;

    const filtered = baseList.filter((c) => {
      const matchesLoc =
        locationIdParam === 'ALL' ||
        c.location_id === locationIdParam ||
        (activeLocationObj && c.location_name === activeLocationObj.name);

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(c.chair_code || '').toLowerCase().includes(q) ||
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.location_name || '').toLowerCase().includes(q) ||
        String(c.model_type || '').toLowerCase().includes(q);

      const devState = resolveDeviceState(c);
      const matchesStatus = statusFilter === 'ALL' || devState === statusFilter;

      const ota = String(c.ota_status || 'IDLE').toUpperCase();
      const matchesFirmware =
        firmwareFilter === 'ALL' ||
        (firmwareFilter === 'PENDING' && (ota === 'PENDING' || ota === 'DOWNLOADING')) ||
        (firmwareFilter === 'FAILED' && ota === 'FAILED') ||
        (firmwareFilter === 'UP_TO_DATE' && (ota === 'IDLE' || ota === 'SUCCESS'));

      return matchesLoc && matchesSearch && matchesStatus && matchesFirmware;
    });

    return filtered.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        return (
          String(a.name || '').localeCompare(String(b.name || ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          }) * dir
        );
      }
      if (sortBy === 'branch') {
        return (
          String(a.location_name || '').localeCompare(String(b.location_name || ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          }) * dir
        );
      }
      if (sortBy === 'status') {
        return resolveDeviceState(a).localeCompare(resolveDeviceState(b)) * dir;
      }
      if (sortBy === 'firmware') {
        return (
          String(a.firmware_version || '2.1.0').localeCompare(
            String(b.firmware_version || '2.1.0'),
            undefined,
            { numeric: true }
          ) * dir
        );
      }
      return (
        String(a.chair_code || a.id).localeCompare(String(b.chair_code || b.id), undefined, {
          numeric: true,
          sensitivity: 'base',
        }) * dir
      );
    });
  }, [
    viewMode,
    archivedChairs,
    activeChairs,
    locationIdParam,
    activeLocationObj,
    searchQuery,
    statusFilter,
    firmwareFilter,
    sortBy,
    sortDir,
  ]);

  const toggleSort = (col: 'code' | 'name' | 'branch' | 'status' | 'firmware') => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  // Selection helpers
  const allVisibleCodes = useMemo(
    () => filteredChairs.map((c) => String(c.chair_code || c.id)),
    [filteredChairs]
  );
  const allVisibleSelected =
    allVisibleCodes.length > 0 && allVisibleCodes.every((code) => selectedCodes.includes(code));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedCodes((prev) => prev.filter((c) => !allVisibleCodes.includes(c)));
    } else {
      setSelectedCodes((prev) => Array.from(new Set([...prev, ...allVisibleCodes])));
    }
  };

  const toggleSelectOne = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Dirty check for Add/Edit Chair Modal
  const currentFormSnapshot = JSON.stringify({
    chairCode: chairCode.trim().toUpperCase(),
    chairName: chairName.trim(),
    modelType,
    locationId,
    pin,
  });
  const isChairModalDirty = showModal && currentFormSnapshot !== initialFormSnapshot;

  const requestCloseChairModal = () => {
    if (isChairModalDirty) {
      setShowDiscardConfirm(true);
    } else {
      setShowModal(false);
      setShowDiscardConfirm(false);
    }
  };

  const openAddModal = () => {
    setEditingChair(null);
    const defaultLocId =
      locationIdParam !== 'ALL'
        ? locationIdParam
        : locations.length > 0
        ? locations[0].id
        : '';
    const suggestedCode = defaultLocId ? suggestChairCodeForLocation(defaultLocId) : 'SAKURA-GI-01';
    const randomPin = generateRandomClientPin();

    setChairCode(suggestedCode);
    setChairName('');
    setModelType('Tokuyo TC-355');
    setLocationId(defaultLocId);
    setPin(randomPin);
    setModalMsg('');
    setShowDiscardConfirm(false);
    setInitialFormSnapshot(
      JSON.stringify({
        chairCode: suggestedCode,
        chairName: '',
        modelType: 'Tokuyo TC-355',
        locationId: defaultLocId,
        pin: randomPin,
      })
    );
    setShowModal(true);
  };

  const openEditModal = (chair: Chair) => {
    setEditingChair(chair);
    const code = String(chair.chair_code || chair.id);
    const name = chair.name || '';
    const model = chair.model_type || 'Tokuyo TC-355';
    const matchedLoc = locations.find(
      (l) => l.id === chair.location_id || l.name === chair.location_name
    );
    const resolvedLocId = matchedLoc
      ? matchedLoc.id
      : locations.length > 0
      ? locations[0].id
      : '';

    setChairCode(code);
    setChairName(name);
    setModelType(model);
    setLocationId(resolvedLocId);
    setPin(''); // Blank means keep existing PIN unless admin enters a new 6-digit PIN
    setModalMsg('');
    setShowDiscardConfirm(false);
    setInitialFormSnapshot(
      JSON.stringify({
        chairCode: code.trim().toUpperCase(),
        chairName: name.trim(),
        modelType: model,
        locationId: resolvedLocId,
        pin: '',
      })
    );
    setShowModal(true);
  };

  // Detect if branch location was changed during Edit
  const originalEditLocation = useMemo(() => {
    if (!editingChair) return null;
    return (
      locations.find(
        (l) => l.id === editingChair.location_id || l.name === editingChair.location_name
      ) || null
    );
  }, [editingChair, locations]);

  const isBranchTransferring = Boolean(
    editingChair && originalEditLocation && locationId && locationId !== originalEditLocation.id
  );

  // Unique alias check within the selected branch location
  const duplicateAliasError = useMemo(() => {
    const cleanName = chairName.trim().toLowerCase();
    if (!cleanName || !locationId) return undefined;
    const matchedLoc = locations.find((l) => l.id === locationId);
    const conflict = activeChairs.find((c) => {
      const sameLoc =
        c.location_id === locationId || (matchedLoc && c.location_name === matchedLoc.name);
      const sameName = String(c.name || '').trim().toLowerCase() === cleanName;
      const isSelf =
        editingChair &&
        String(c.chair_code || c.id).toUpperCase() ===
          String(editingChair.chair_code || editingChair.id).toUpperCase();
      return sameLoc && sameName && !isSelf;
    });
    return conflict
      ? `Unit name "${chairName.trim()}" is already used by ${conflict.chair_code} in this branch.`
      : undefined;
  }, [chairName, locationId, locations, activeChairs, editingChair]);

  const handleChairFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = chairCode.trim().toUpperCase();
    const cleanName = chairName.trim();
    const cleanModel = modelType.trim() || 'Tokuyo TC-355';
    const cleanPin = pin.replace(/\D/g, '').slice(0, 6);

    if (!cleanCode || !cleanName) {
      setModalMsg('Chair code and unit name are required.');
      return;
    }

    if (duplicateAliasError) {
      setModalMsg(duplicateAliasError);
      return;
    }

    if (!locationId) {
      setModalMsg('Please select a registered branch location.');
      return;
    }

    if (!editingChair && cleanPin.length !== 6) {
      setModalMsg('Terminal PIN must be exactly 6 numeric digits.');
      return;
    }

    if (editingChair && cleanPin.length > 0 && cleanPin.length !== 6) {
      setModalMsg('New Terminal PIN must be exactly 6 numeric digits.');
      return;
    }

    const matchedLoc = locations.find((l) => l.id === locationId);
    const prevLoc = originalEditLocation;

    setIsSaving(true);
    setModalMsg('');

    try {
      let res;
      if (editingChair) {
        const patchBody: Record<string, any> = {
          chair_code: cleanCode,
          name: cleanName,
          model_type: cleanModel,
          location_id: locationId,
          location_name: matchedLoc?.name || 'Branch Kiosk',
        };
        if (cleanPin.length === 6) {
          patchBody.pin = cleanPin;
        }
        res = await fetch('/api/admin/chairs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        });
      } else {
        res = await fetch('/api/admin/chairs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chair_code: cleanCode,
            name: cleanName,
            model_type: cleanModel,
            location_id: locationId,
            location_name: matchedLoc?.name || 'Branch Kiosk',
            pin: cleanPin,
          }),
        });
      }

      const resData = await res.json();

      if (resData.success) {
        setShowModal(false);
        setShowDiscardConfirm(false);
        await fetchChairs();

        if (editingChair && isBranchTransferring && prevLoc) {
          showToastWithUndo(
            `${cleanCode} moved to ${matchedLoc?.name}.`,
            async () => {
              await fetch('/api/admin/chairs', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chair_code: cleanCode,
                  location_id: prevLoc.id,
                  location_name: prevLoc.name,
                }),
              });
              setUndoBanner(null);
              fetchChairs();
            }
          );
        } else if (!editingChair) {
          showToastWithUndo(
            `Chair ${cleanCode} registered with PIN ${resData.generated_pin || cleanPin}.`
          );
        } else {
          showToastWithUndo(`Saved changes to ${cleanCode}.`);
        }
      } else {
        setModalMsg(resData.error || 'Failed to save chair unit.');
      }
    } catch (err: any) {
      setModalMsg(`Error: ${err?.message || 'Server unreachable'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Reversible Archive (Soft-Delete) with 8-Second Undo Toast
  const handleArchiveChair = async (chair: Chair) => {
    const targetCode = String(chair.chair_code || chair.id).trim();
    try {
      const res = await fetch(`/api/admin/chairs?id=${encodeURIComponent(targetCode)}`, {
        method: 'DELETE',
      });
      const resData = await res.json();
      if (resData.success) {
        setSelectedCodes((prev) => prev.filter((c) => c !== targetCode));
        await fetchChairs();
        showToastWithUndo(`${targetCode} archived.`, async () => {
          await handleRestoreChair(targetCode);
          setUndoBanner(null);
        });
      }
    } catch (err) {
      console.warn('Archive chair error:', err);
    }
  };

  const handleRestoreChair = async (chairCodeToRestore: string) => {
    try {
      const res = await fetch('/api/admin/chairs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chair_code: chairCodeToRestore,
          deleted_at: null,
          is_active: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchChairs();
        showToastWithUndo(`${chairCodeToRestore} restored to active fleet.`);
      }
    } catch (err) {
      console.warn('Restore chair error:', err);
    }
  };

  // Audited PIN Reveal handler
  const handleRevealPin = async (chair: Chair) => {
    const code = String(chair.chair_code || chair.id);
    setIsRevealingPin(true);
    try {
      const res = await fetch('/api/admin/chairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REVEAL_PIN', chair_code: code }),
      });
      const data = await res.json();
      if (data.success && data.pin) {
        setRevealedPinMap((prev) => ({
          ...prev,
          [code]: {
            pin: data.pin,
            auditedBy: data.audited_by || 'Admin',
            revealedAt: data.revealed_at || new Date().toISOString(),
          },
        }));
      }
    } catch (err) {
      console.warn('Reveal PIN error:', err);
    } finally {
      setIsRevealingPin(false);
    }
  };

  const handleCopyPin = (code: string, pinValue: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pinValue);
      setCopiedPinCode(code);
      setTimeout(() => setCopiedPinCode(null), 2000);
    }
  };

  // Cancel & Rollback OTA handlers
  const handleCancelOta = async (chair: Chair) => {
    const code = String(chair.chair_code || chair.id);
    try {
      const res = await fetch('/api/admin/chairs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL_OTA', chair_code: code }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchChairs();
        showToastWithUndo(`Cancelled pending OTA update for ${code}.`);
      }
    } catch (err) {
      console.warn('Cancel OTA error:', err);
    }
  };

  const handleRollbackOta = async (chair: Chair) => {
    const code = String(chair.chair_code || chair.id);
    const prevVersion = chair.previous_firmware_version || '2.1.0';
    try {
      const res = await fetch('/api/admin/chairs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ROLLBACK_OTA',
          chair_code: code,
          rollback_version: prevVersion,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchChairs();
        showToastWithUndo(`Rollback to v${prevVersion} queued for ${code}.`, async () => {
          await handleCancelOta(chair);
        });
      }
    } catch (err) {
      console.warn('Rollback OTA error:', err);
    }
  };

  // Bulk Move Branch handler
  const handleBulkMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkMoveLocationId || selectedCodes.length === 0) return;
    const targetLoc = locations.find((l) => l.id === bulkMoveLocationId);
    if (!targetLoc) return;

    setIsBulkMoving(true);
    try {
      await Promise.all(
        selectedCodes.map((code) =>
          fetch('/api/admin/chairs', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chair_code: code,
              location_id: targetLoc.id,
              location_name: targetLoc.name,
            }),
          })
        )
      );
      const movedCount = selectedCodes.length;
      setShowBulkMoveModal(false);
      setSelectedCodes([]);
      await fetchChairs();
      showToastWithUndo(`Moved ${formatChairCount(movedCount)} to ${targetLoc.name}.`);
    } catch (err) {
      console.warn('Bulk move error:', err);
    } finally {
      setIsBulkMoving(false);
    }
  };

  // Safe OTA Modal Open & File SHA-256 Computation
  const openOtaModal = (preselectedTarget?: string) => {
    setOtaMsg('');
    setOtaTypedConfirm('');
    setOtaStrategy('canary');
    if (preselectedTarget) {
      setOtaTargetChairId(preselectedTarget);
    } else if (selectedCodes.length > 0) {
      setOtaTargetChairId('SELECTED');
    } else if (activeChairs.length > 0) {
      setOtaTargetChairId(String(activeChairs[0].chair_code || activeChairs[0].id));
    } else {
      setOtaTargetChairId('');
    }
    setShowOtaModal(true);
  };

  const handleOtaFileSelect = async (file: File | null) => {
    setOtaMsg('');
    if (!file) {
      setOtaFile(null);
      setOtaFileSha256('');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.bin')) {
      setOtaMsg('Invalid file format. Only compiled ESP32 binary (.bin) files are supported.');
      return;
    }
    if (file.size > MAX_FIRMWARE_BYTES) {
      setOtaMsg(
        `File size (${(file.size / 1024).toFixed(1)} KB) exceeds the 1.5 MB ESP32 OTA partition limit.`
      );
      return;
    }
    setOtaFile(file);
    try {
      if (typeof window !== 'undefined' && window.crypto?.subtle) {
        const buf = await file.arrayBuffer();
        const hashBuf = await window.crypto.subtle.digest('SHA-256', buf);
        const hashHex = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        setOtaFileSha256(hashHex);
      } else {
        setOtaFileSha256('verified-on-server');
      }
    } catch {
      setOtaFileSha256('verified-on-server');
    }
  };

  // Compute candidate & effective OTA target chairs based on Target + Rollout Strategy
  const otaCandidateChairs = useMemo(() => {
    if (!otaTargetChairId) return [];
    if (otaTargetChairId === 'ALL') return activeChairs;
    if (otaTargetChairId === 'SELECTED') {
      return activeChairs.filter((c) =>
        selectedCodes.includes(String(c.chair_code || c.id))
      );
    }
    return activeChairs.filter(
      (c) =>
        String(c.chair_code || c.id) === otaTargetChairId ||
        String(c.id) === otaTargetChairId
    );
  }, [otaTargetChairId, activeChairs, selectedCodes]);

  const effectiveTargetChairs = useMemo(() => {
    if (otaCandidateChairs.length === 0) return [];
    if (otaStrategy === 'canary') return otaCandidateChairs.slice(0, 1);
    if (otaStrategy === 'staged') {
      const count = Math.max(1, Math.ceil(otaCandidateChairs.length * 0.1));
      return otaCandidateChairs.slice(0, count);
    }
    return otaCandidateChairs;
  }, [otaCandidateChairs, otaStrategy]);

  const affectedBranchesCount = useMemo(() => {
    const set = new Set(effectiveTargetChairs.map((c) => c.location_name).filter(Boolean));
    return Math.max(1, set.size);
  }, [effectiveTargetChairs]);

  const minInstalledVersion = useMemo(() => {
    const versions = effectiveTargetChairs
      .map((c) => String(c.firmware_version || '2.1.0').trim())
      .filter((v) => SEMVER_REGEX.test(v));
    if (versions.length === 0) return '2.1.0';
    return versions.reduce((min, cur) => (compareSemver(cur, min) < 0 ? cur : min));
  }, [effectiveTargetChairs]);

  const otaVersionError = useMemo(() => {
    const clean = otaVersion.trim();
    if (!clean) return 'Version is required.';
    if (!SEMVER_REGEX.test(clean)) return 'Use semantic version format MAJOR.MINOR.PATCH (e.g. 2.2.0).';
    if (compareSemver(clean, minInstalledVersion) <= 0) {
      return `Must be higher than currently installed version (${minInstalledVersion}).`;
    }
    return undefined;
  }, [otaVersion, minInstalledVersion]);

  const needsTypedOtaConfirm =
    (otaTargetChairId === 'ALL' && otaStrategy === 'all') || effectiveTargetChairs.length > 5;

  const canDeployOta =
    !otaVersionError &&
    Boolean(otaFile) &&
    effectiveTargetChairs.length > 0 &&
    (!needsTypedOtaConfirm || otaTypedConfirm.trim() === 'DEPLOY') &&
    !isDeployingOta;

  const handleDeployOta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canDeployOta || !otaFile) return;

    setIsDeployingOta(true);
    setOtaMsg('');

    try {
      const formData = new FormData();
      formData.append('file', otaFile);
      formData.append('version', otaVersion.trim());
      formData.append('strategy', otaStrategy);
      formData.append('schedule_window', otaSchedule);
      formData.append(
        'chair_ids',
        effectiveTargetChairs.map((c) => String(c.chair_code || c.id)).join(',')
      );
      formData.append('chair_id', otaTargetChairId);
      formData.append('notes', otaNotes.trim());

      const res = await fetch('/api/admin/chairs/firmware/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        const deployedCount = effectiveTargetChairs.length;
        setShowOtaModal(false);
        setOtaFile(null);
        setOtaFileSha256('');
        setOtaMsg('');
        await fetchChairs();
        showToastWithUndo(
          `Firmware v${otaVersion.trim()} queued for ${formatChairCount(deployedCount)} (${otaStrategy}).`
        );
      } else {
        setOtaMsg(data.error || 'Failed to deploy firmware.');
      }
    } catch (err: any) {
      setOtaMsg(`Network error: ${err?.message || 'Server unreachable'}`);
    } finally {
      setIsDeployingOta(false);
    }
  };

  // Close modals on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showModal) requestCloseChairModal();
        if (showOtaModal) setShowOtaModal(false);
        if (detailChair) setDetailChair(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const otaTargetOptions = useMemo<Option[]>(() => {
    const opts: Option[] = [];
    if (selectedCodes.length > 0) {
      opts.push({
        value: 'SELECTED',
        label: `Selected chairs (${selectedCodes.length})`,
        hint: 'Checked in table',
      });
    }
    activeChairs.forEach((c) => {
      const code = String(c.chair_code || c.id);
      opts.push({
        value: code,
        label: `${code} — ${c.name}`,
        hint: c.location_name || undefined,
      });
    });
    opts.push({
      value: 'ALL',
      label: `All chairs (${activeChairs.length})`,
      hint: 'Fleet-wide',
    });
    return opts;
  }, [selectedCodes, activeChairs]);

  return (
    <div className="space-y-5">
      {/* Compact Page Header Row (No bloated card wrapper, no duplicate Armchair icon, secondary Deploy firmware button, single Plus in Add Chair) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-(--text) tracking-tight">
            Chairs & Hardware Fleet
          </h1>
          <p className="text-xs text-(--text-muted) font-normal mt-1">
            Manage massage chairs, real-time heartbeat telemetry, and staged firmware updates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => openOtaModal()}
            className="h-10 px-4 bg-white hover:bg-(--bg-subtle) text-(--text) border border-(--border-field) rounded-xl text-sm font-medium shadow-2xs flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
          >
            <CloudUpload className="w-4 h-4 text-(--brand)" />
            <span>Deploy firmware</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="h-10 px-4 bg-(--brand) hover:bg-(--brand-hover) text-white rounded-xl text-sm font-semibold shadow-xs flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Chair</span>
          </button>
        </div>
      </div>

      {/* Reversible Action Toast / Undo Banner (aria-live="polite") */}
      <div aria-live="polite" aria-atomic="true">
        {undoBanner && (
          <div
            role="status"
            className="flex items-center justify-between gap-4 rounded-xl border border-(--border) bg-white px-4 py-3 shadow-sm"
          >
            <span className="text-sm font-medium text-(--text)">{undoBanner.message}</span>
            <div className="flex items-center gap-2">
              {undoBanner.onUndo && (
                <button
                  type="button"
                  onClick={undoBanner.onUndo}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-(--brand-soft) px-3 py-1.5 text-xs font-semibold text-(--brand) hover:bg-(--brand) hover:text-white transition-colors"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Undo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setUndoBanner(null)}
                aria-label="Dismiss notification"
                className="p-1 text-(--text-muted) hover:text-(--text) rounded-md"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar & Table Surface */}
      <div className="bg-white rounded-2xl border border-(--border) p-5 shadow-xs space-y-4">
        {/* Orthogonal Toolbar: Search + Status AppSelect + Firmware AppSelect + Active/Archived Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search chairs"
              placeholder="Search by chair code, unit name, model, or branch..."
              className={`${inputCls} pl-10`}
            />
            <Search className="w-4 h-4 text-(--text-muted) absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Device Status Filter (AppSelect) */}
          <div className="w-full sm:w-44">
            <AppSelect
              aria-label="Filter by device status"
              icon={<Filter className="size-4" />}
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>

          {/* Firmware / OTA Filter (AppSelect) */}
          <div className="w-full sm:w-48">
            <AppSelect
              aria-label="Filter by firmware status"
              icon={<Cpu className="size-4" />}
              value={firmwareFilter}
              onValueChange={setFirmwareFilter}
              options={FIRMWARE_FILTER_OPTIONS}
            />
          </div>

          {/* Active vs Archived Segmented Toggle */}
          <div
            role="group"
            aria-label="Fleet archive view"
            className="inline-flex rounded-lg border border-(--border-field) bg-(--bg-subtle) p-0.5 text-xs"
          >
            <button
              type="button"
              onClick={() => setViewMode('active')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === 'active'
                  ? 'bg-white text-(--text) shadow-2xs'
                  : 'text-(--text-muted) hover:text-(--text)'
              }`}
            >
              Active ({activeChairs.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('archived')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === 'archived'
                  ? 'bg-white text-(--text) shadow-2xs'
                  : 'text-(--text-muted) hover:text-(--text)'
              }`}
            >
              Archived ({archivedChairs.length})
            </button>
          </div>
        </div>

        {/* Active Branch Scope Indicator (Synced with Header LocationSelector) */}
        {activeLocationObj && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-(--bg-subtle) px-3.5 py-2 text-xs text-(--text)">
            <span>
              Scoped to branch:{' '}
              <strong className="font-semibold">{activeLocationObj.name}</strong>{' '}
              <span className="font-mono text-(--text-muted)">
                ({activeLocationObj.location_code})
              </span>
            </span>
            <button
              type="button"
              onClick={() => router.push('/admin/chairs')}
              className="font-medium text-(--brand) hover:underline"
            >
              Show all branches
            </button>
          </div>
        )}

        {/* Bulk Action Bar (Appears when 1+ rows are checked) */}
        {selectedCodes.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--brand)/30 bg-(--brand-soft)/60 px-4 py-2.5">
            <span className="text-xs font-semibold text-(--brand) tabular-nums">
              {formatChairCount(selectedCodes.length)} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openOtaModal('SELECTED')}
                className="h-8 px-3 rounded-lg bg-(--brand) text-white text-xs font-semibold hover:bg-(--brand-hover) transition-colors"
              >
                Deploy firmware to {formatChairCount(selectedCodes.length)}
              </button>
              <button
                type="button"
                onClick={() => setShowBulkMoveModal(true)}
                className="h-8 px-3 rounded-lg border border-(--border-field) bg-white text-(--text) text-xs font-medium hover:bg-(--bg-subtle) transition-colors"
              >
                Move branch
              </button>
              <button
                type="button"
                onClick={() => setSelectedCodes([])}
                className="h-8 px-2.5 text-xs font-medium text-(--text-muted) hover:text-(--text)"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Chairs Table */}
        <div className="overflow-x-auto rounded-xl border border-(--border)">
          {isLoading ? (
            <div className="py-12 text-center text-sm font-medium text-(--brand) animate-pulse">
              Loading chairs...
            </div>
          ) : filteredChairs.length === 0 ? (
            <div className="py-14 px-4 text-center space-y-3">
              <div className="mx-auto w-11 h-11 rounded-2xl bg-(--bg-subtle) text-(--text-muted) grid place-items-center">
                <Armchair className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-(--text)">
                  {viewMode === 'archived'
                    ? 'No archived chairs'
                    : 'No chairs registered in this view'}
                </h3>
                <p className="text-xs text-(--text-muted)">
                  {viewMode === 'archived'
                    ? 'Archived units will appear here and can be restored anytime.'
                    : 'Register your first massage chair unit to begin monitoring telemetry and QRIS sessions.'}
                </p>
              </div>
              {viewMode === 'active' && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-(--brand) text-white text-xs font-semibold hover:bg-(--brand-hover) transition-colors"
                >
                  <Plus className="size-3.5" />
                  <span>Add first chair</span>
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <caption className="sr-only">Chairs and hardware fleet list</caption>
              <thead>
                <tr className="bg-(--bg-subtle) text-(--text-muted) border-b border-(--border) text-xs uppercase tracking-wide">
                  <th scope="col" className="py-3 pl-4 pr-2 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all visible chairs"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-(--border-field) accent-(--brand) cursor-pointer"
                    />
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'code'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="py-3 px-4 font-semibold"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('code')}
                      className="inline-flex items-center gap-1 hover:text-(--text)"
                    >
                      <span>Chair Code</span>
                      <ArrowUpDown className="size-3.5" />
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-4 font-semibold">
                    Hardware Model
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'name'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="py-3 px-4 font-semibold"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1 hover:text-(--text)"
                    >
                      <span>Unit Name</span>
                      <ArrowUpDown className="size-3.5" />
                    </button>
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'branch'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="py-3 px-4 font-semibold"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('branch')}
                      className="inline-flex items-center gap-1 hover:text-(--text)"
                    >
                      <span>Branch Location</span>
                      <ArrowUpDown className="size-3.5" />
                    </button>
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'status'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="py-3 px-4 font-semibold"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('status')}
                      className="inline-flex items-center gap-1 hover:text-(--text)"
                    >
                      <span>Device Status</span>
                      <ArrowUpDown className="size-3.5" />
                    </button>
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'firmware'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="py-3 px-4 font-semibold"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('firmware')}
                      className="inline-flex items-center gap-1 hover:text-(--text)"
                    >
                      <span>Firmware / OTA</span>
                      <ArrowUpDown className="size-3.5" />
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-4 font-semibold">
                    Terminal PIN
                  </th>
                  <th scope="col" className="py-3 px-4 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border) bg-white">
                {filteredChairs.map((chair) => {
                  const code = String(chair.chair_code || chair.id);
                  const isSelected = selectedCodes.includes(code);
                  const devState = resolveDeviceState(chair);

                  return (
                    <tr
                      key={code}
                      className={`hover:bg-(--bg-subtle)/60 transition-colors ${
                        isSelected ? 'bg-(--brand-soft)/30' : ''
                      }`}
                    >
                      <td className="py-3 pl-4 pr-2 align-middle">
                        <input
                          type="checkbox"
                          aria-label={`Select ${code}`}
                          checked={isSelected}
                          onChange={() => toggleSelectOne(code)}
                          className="size-4 rounded border-(--border-field) accent-(--brand) cursor-pointer"
                        />
                      </td>

                      {/* Clickable Chair Code -> Opens Chair Detail & Telemetry Drawer */}
                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDetailChair(chair)}
                          className="font-mono text-[13px] font-medium tabular-nums text-(--brand) hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) rounded"
                        >
                          {code}
                        </button>
                      </td>

                      {/* Hardware Model (Regular muted 400 weight) */}
                      <td className="py-3 px-4 align-middle font-normal text-(--text-muted) whitespace-nowrap">
                        {chair.model_type || 'Tokuyo TC-355'}
                      </td>

                      {/* Unit Name */}
                      <td className="py-3 px-4 align-middle font-normal text-(--text)">
                        <div className="max-w-[24ch] truncate" title={chair.name}>
                          {chair.name}
                        </div>
                      </td>

                      {/* Branch Location (Truncated resilient text without redundant MapPin icon) */}
                      <td className="py-3 px-4 align-middle font-normal text-(--text)">
                        <div className="max-w-[26ch] truncate" title={chair.location_name}>
                          {chair.location_name}
                        </div>
                      </td>

                      {/* 5-State StatusCell + Relative Last Seen Heartbeat */}
                      <td className="py-3 px-4 align-middle">
                        <StatusCell
                          state={devState}
                          lastSeenIso={chair.last_heartbeat || chair.updated_at}
                        />
                      </td>

                      {/* Single-line FirmwareCell with Cancel / Rollback */}
                      <td className="py-3 px-4 align-middle">
                        <FirmwareCell
                          current={chair.firmware_version || '2.1.0'}
                          target={chair.target_firmware_version}
                          otaStatus={chair.ota_status}
                          onCancelOta={() => handleCancelOta(chair)}
                          onRollbackOta={() => handleRollbackOta(chair)}
                        />
                      </td>

                      {/* Masked Terminal PIN (Never plaintext in table) + Default PIN warning badge */}
                      <td className="py-3 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-[13px] tracking-widest text-(--text-muted)"
                            aria-label="Masked terminal PIN"
                          >
                            ••••••
                          </span>
                          {chair.has_default_pin && (
                            <span className="rounded-full bg-(--warn-bg) px-2 py-0.5 text-[11px] font-semibold text-(--warn)">
                              Default PIN
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setDetailChair(chair)}
                            aria-label={`Inspect and reveal PIN for ${code}`}
                            className="text-xs font-medium text-(--brand) hover:underline"
                          >
                            Show
                          </button>
                        </div>
                      </td>

                      {/* 40x40px Neutral Action Targets */}
                      <td className="py-3 px-4 align-middle text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {viewMode === 'archived' ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreChair(code)}
                              aria-label={`Restore ${code}`}
                              className="h-10 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-(--brand) hover:bg-(--brand-soft) transition-colors"
                            >
                              <RotateCcw className="size-4" />
                              <span>Restore</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(chair)}
                                aria-label={`Edit ${code}`}
                                title={`Edit ${code}`}
                                className="w-10 h-10 grid place-items-center rounded-xl text-(--text-muted) hover:text-(--text) hover:bg-(--bg-subtle) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchiveChair(chair)}
                                aria-label={`Archive ${code}`}
                                title={`Archive ${code}`}
                                className="w-10 h-10 grid place-items-center rounded-xl text-(--text-muted) hover:text-(--error) hover:bg-(--error-bg) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </>
                          )}
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

      {/* Chair Telemetry & Audited PIN Detail Modal */}
      {detailChair && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDetailChair(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="chair-detail-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-(--border) shadow-xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-(--border) px-6 py-4">
              <div>
                <h2 id="chair-detail-title" className="text-base font-semibold text-(--text)">
                  {detailChair.name}
                </h2>
                <p className="font-mono text-xs text-(--brand) mt-0.5">
                  {detailChair.chair_code || detailChair.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailChair(null)}
                aria-label="Close detail dialog"
                className="w-10 h-10 grid place-items-center rounded-xl text-(--text-muted) hover:text-(--text) hover:bg-(--bg-subtle)"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-(--bg-subtle) p-3.5">
                <div>
                  <span className="text-xs text-(--text-muted) block">Status</span>
                  <div className="mt-1">
                    <StatusCell
                      state={resolveDeviceState(detailChair)}
                      lastSeenIso={detailChair.last_heartbeat || detailChair.updated_at}
                    />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-(--text-muted) block">Branch</span>
                  <span className="font-medium text-(--text) mt-1 block truncate">
                    {detailChair.location_name}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-(--text-muted) block">Model</span>
                  <span className="text-(--text) mt-0.5 block">
                    {detailChair.model_type || 'Tokuyo TC-355'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-(--text-muted) block">Wi-Fi / Telemetry</span>
                  <span className="font-mono text-xs text-(--text) mt-0.5 inline-flex items-center gap-1">
                    <Wifi className="size-3.5 text-(--ok)" />
                    {detailChair.ip_address || 'DHCP Active'}{' '}
                    {detailChair.rssi ? `(${detailChair.rssi} dBm)` : ''}
                  </span>
                </div>
              </div>

              {/* Audited Terminal PIN Reveal Card */}
              <div className="rounded-xl border border-(--border) p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[13px] font-medium text-(--text)">Terminal PIN</h3>
                    <p className="text-xs text-(--text-muted)">
                      Revealing the PIN is recorded in the security audit log.
                    </p>
                  </div>
                  {detailChair.has_default_pin && (
                    <span className="rounded-full bg-(--warn-bg) px-2 py-0.5 text-xs font-semibold text-(--warn)">
                      Default PIN
                    </span>
                  )}
                </div>

                {(() => {
                  const code = String(detailChair.chair_code || detailChair.id);
                  const revealed = revealedPinMap[code];
                  return revealed ? (
                    <div className="flex items-center justify-between rounded-lg bg-(--bg-subtle) px-3.5 py-2.5">
                      <div>
                        <span className="font-mono text-base font-semibold tracking-widest text-(--text) tabular-nums">
                          {revealed.pin}
                        </span>
                        <span className="block text-[11px] text-(--text-muted)">
                          Audited for {revealed.auditedBy}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPin(code, revealed.pin)}
                        className="h-8 px-3 rounded-lg border border-(--border-field) bg-white text-xs font-medium text-(--text) inline-flex items-center gap-1.5 hover:bg-(--bg-subtle)"
                      >
                        {copiedPinCode === code ? (
                          <>
                            <Check className="size-3.5 text-(--ok)" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            <span>Copy PIN</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isRevealingPin}
                      onClick={() => handleRevealPin(detailChair)}
                      className="h-9 w-full rounded-lg border border-(--border-field) bg-white hover:bg-(--bg-subtle) text-xs font-semibold text-(--text) inline-flex items-center justify-center gap-2 transition-colors"
                    >
                      <Eye className="size-3.5 text-(--brand)" />
                      <span>{isRevealingPin ? 'Verifying session...' : 'Reveal PIN (Audited)'}</span>
                    </button>
                  );
                })()}
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-end gap-2.5 border-t border-(--border) px-6 py-3.5 bg-(--bg-subtle)/50">
              <button
                type="button"
                onClick={() => {
                  const target = detailChair;
                  setDetailChair(null);
                  openEditModal(target);
                }}
                className="h-9 px-4 rounded-lg border border-(--border-field) bg-white hover:bg-(--bg-subtle) text-xs font-semibold text-(--text)"
              >
                Edit chair
              </button>
              <button
                type="button"
                onClick={() => {
                  const code = String(detailChair.chair_code || detailChair.id);
                  setDetailChair(null);
                  openOtaModal(code);
                }}
                className="h-9 px-4 rounded-lg bg-(--brand) hover:bg-(--brand-hover) text-white text-xs font-semibold"
              >
                Deploy firmware
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Add / Edit Chair Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={requestCloseChairModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="chair-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-(--border) shadow-xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-(--border) px-6 py-4">
              <div>
                <h2 id="chair-modal-title" className="text-base font-semibold text-(--text)">
                  {editingChair ? 'Edit chair' : 'Register chair'}
                </h2>
                {editingChair && (
                  <p className="font-mono text-xs text-(--brand) mt-0.5">
                    {editingChair.chair_code || editingChair.id}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={requestCloseChairModal}
                aria-label="Close modal"
                className="w-10 h-10 grid place-items-center rounded-xl text-(--text-muted) hover:text-(--text) hover:bg-(--bg-subtle)"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <form
              id="chair-form"
              onSubmit={handleChairFormSubmit}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
            >
              {modalMsg && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-(--error-bg) text-(--error) text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalMsg}</span>
                </div>
              )}

              {/* Discard Unsaved Changes Guard */}
              {showDiscardConfirm && (
                <div
                  role="alert"
                  className="rounded-xl border border-(--warn)/40 bg-(--warn-bg) p-3.5 space-y-2.5"
                >
                  <p className="text-xs font-semibold text-(--warn)">
                    Discard unsaved changes?
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      autoFocus
                      onClick={() => setShowDiscardConfirm(false)}
                      className="h-8 px-3 rounded-lg bg-(--brand) text-white text-xs font-semibold"
                    >
                      Keep editing
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDiscardConfirm(false);
                        setShowModal(false);
                      }}
                      className="h-8 px-3 rounded-lg border border-(--border-field) bg-white text-xs font-medium text-(--text)"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}

              {/* Chair Code (Readable Disabled State with Lock + Explanation when Editing) */}
              <Field
                label="Chair code"
                hint={editingChair ? 'Cannot be changed' : 'Format: SAKURA-{BRANCH}-{NN}'}
              >
                <div className="relative">
                  <input
                    type="text"
                    value={chairCode}
                    onChange={(e) => setChairCode(e.target.value)}
                    placeholder="SAKURA-GI-01"
                    required
                    disabled={!!editingChair}
                    className={`${inputCls} font-mono text-[13px] uppercase ${
                      editingChair ? 'pr-9' : ''
                    }`}
                  />
                  {editingChair && (
                    <Lock
                      aria-hidden="true"
                      className="size-4 text-(--text-muted) absolute right-3 top-1/2 -translate-y-1/2"
                    />
                  )}
                </div>
                {editingChair && (
                  <p className="text-xs text-(--text-muted)">
                    Linked to physical hardware and cannot be changed.
                  </p>
                )}
              </Field>

              {/* Hardware Model (AppSelect Dropdown instead of error-prone free text) */}
              <Field label="Model">
                <AppSelect
                  aria-label="Hardware model"
                  zIndexClass="z-[90]"
                  value={modelType}
                  onValueChange={setModelType}
                  options={HARDWARE_MODEL_OPTIONS}
                />
              </Field>

              {/* Unit Name (Alias) with Unique Branch Validation */}
              <Field
                label="Name"
                hint="Unique per branch"
                error={duplicateAliasError}
              >
                <input
                  type="text"
                  value={chairName}
                  onChange={(e) => setChairName(e.target.value)}
                  placeholder="Sakura Chair 01"
                  required
                  className={inputCls}
                />
              </Field>

              {/* Branch Location with Revenue Attribution Warning */}
              <Field label="Branch location">
                <AppSelect
                  aria-label="Branch location"
                  zIndexClass="z-[90]"
                  value={locationId}
                  onValueChange={(newLocId) => {
                    setLocationId(newLocId);
                    if (!editingChair) {
                      setChairCode(suggestChairCodeForLocation(newLocId));
                    }
                  }}
                  options={locations.map((loc) => ({
                    value: loc.id,
                    label: loc.name,
                    hint: loc.location_code,
                  }))}
                />
                {isBranchTransferring && (
                  <div
                    role="status"
                    className="mt-1.5 flex items-start gap-2 rounded-lg bg-(--warn-bg) px-3 py-2 text-xs text-(--warn)"
                  >
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <span>
                      Moving this chair to another branch will attribute future transactions and
                      revenue share to the new branch.
                    </span>
                  </div>
                )}
              </Field>

              {/* Terminal PIN (Masked Numeric PinField without leaking 123456 default) */}
              <Field
                label="Terminal PIN"
                hint={editingChair ? 'Leave blank to keep current 6-digit PIN' : '6-digit numeric'}
              >
                <PinField
                  id="chair-terminal-pin"
                  value={pin}
                  onChange={setPin}
                  onRandomize={() => setPin(generateRandomClientPin())}
                />
              </Field>
            </form>

            <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-(--border) px-6 py-4 bg-white">
              <button
                type="button"
                onClick={requestCloseChairModal}
                className="h-10 px-4 rounded-xl border border-(--border-field) bg-white hover:bg-(--bg-subtle) text-(--text) font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="chair-form"
                disabled={isSaving || Boolean(duplicateAliasError) || (!!editingChair && !isChairModalDirty)}
                className="h-10 px-5 rounded-xl bg-(--brand) hover:bg-(--brand-hover) text-white font-semibold text-xs shadow-xs disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Saving...' : editingChair ? 'Save Changes' : 'Register Chair'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Bulk Move Branch Modal */}
      {showBulkMoveModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowBulkMoveModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-move-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-(--border) shadow-xl w-full max-w-md overflow-hidden"
          >
            <header className="flex items-center justify-between border-b border-(--border) px-6 py-4">
              <h2 id="bulk-move-title" className="text-base font-semibold text-(--text)">
                Move {formatChairCount(selectedCodes.length)} to branch
              </h2>
              <button
                type="button"
                onClick={() => setShowBulkMoveModal(false)}
                aria-label="Close bulk move modal"
                className="w-9 h-9 grid place-items-center rounded-lg text-(--text-muted) hover:bg-(--bg-subtle)"
              >
                <X className="size-4" />
              </button>
            </header>
            <form onSubmit={handleBulkMoveSubmit} className="p-6 space-y-4">
              <Field label="Destination branch">
                <AppSelect
                  aria-label="Destination branch"
                  zIndexClass="z-[90]"
                  value={bulkMoveLocationId}
                  onValueChange={setBulkMoveLocationId}
                  options={locations.map((loc) => ({
                    value: loc.id,
                    label: loc.name,
                    hint: loc.location_code,
                  }))}
                />
              </Field>
              <div className="flex items-start gap-2 rounded-lg bg-(--warn-bg) px-3 py-2 text-xs text-(--warn)">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>
                  Future sessions and revenue splits for the selected chairs will be attributed to
                  the destination branch.
                </span>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkMoveModal(false)}
                  className="h-9 px-4 rounded-lg border border-(--border-field) bg-white text-xs font-medium text-(--text)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBulkMoving}
                  className="h-9 px-4 rounded-lg bg-(--brand) text-white text-xs font-semibold hover:bg-(--brand-hover) disabled:opacity-50"
                >
                  {isBulkMoving ? 'Moving...' : `Move ${formatChairCount(selectedCodes.length)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Firmware OTA Deployment Modal */}
      {showOtaModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowOtaModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ota-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-(--border) shadow-xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-(--border) px-6 py-4">
              <div>
                <h2 id="ota-modal-title" className="text-base font-semibold text-(--text)">
                  Deploy firmware
                </h2>
                <p className="text-xs text-(--text-muted) mt-0.5">
                  Staged cloud OTA update for ESP32 chair controllers
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOtaModal(false)}
                aria-label="Close firmware deployment modal"
                className="w-10 h-10 grid place-items-center rounded-xl text-(--text-muted) hover:text-(--text) hover:bg-(--bg-subtle)"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <form
              id="ota-form"
              onSubmit={handleDeployOta}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
            >
              {otaMsg && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-(--error-bg) text-(--error) text-xs font-medium flex items-center gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{otaMsg}</span>
                </div>
              )}

              {/* Target Chair Selection (Default is Selected / Single chair, never ALL) */}
              <Field label="Target">
                <AppSelect
                  aria-label="Target chair deployment"
                  zIndexClass="z-[90]"
                  value={otaTargetChairId}
                  onValueChange={(val) => {
                    setOtaTargetChairId(val);
                    setOtaTypedConfirm('');
                  }}
                  options={otaTargetOptions}
                />
              </Field>

              {/* Rollout Strategy (Canary 1 chair default, Staged 10%, All) */}
              <Field label="Rollout strategy" hint="Default: Canary">
                <AppSelect
                  aria-label="Rollout strategy"
                  zIndexClass="z-[90]"
                  value={otaStrategy}
                  onValueChange={(val) => setOtaStrategy(val as 'canary' | 'staged' | 'all')}
                  options={STRATEGY_OPTIONS}
                />
              </Field>

              {/* Impact Summary Banner */}
              <div className="rounded-xl bg-(--bg-subtle) border border-(--border) px-3.5 py-2.5 text-xs text-(--text) flex items-center justify-between gap-2">
                <span>
                  Impact:{' '}
                  <strong className="font-semibold tabular-nums">
                    {formatChairCount(effectiveTargetChairs.length)}
                  </strong>{' '}
                  across{' '}
                  <strong className="font-semibold tabular-nums">
                    {affectedBranchesCount} {affectedBranchesCount === 1 ? 'branch' : 'branches'}
                  </strong>
                </span>
                <span className="font-mono text-(--text-muted) tabular-nums">
                  Installed: v{minInstalledVersion}
                </span>
              </div>

              {/* SemVer Version Input */}
              <Field
                label="Version"
                hint={`Must be > ${minInstalledVersion}`}
                error={otaVersionError}
              >
                <input
                  type="text"
                  value={otaVersion}
                  onChange={(e) => setOtaVersion(e.target.value)}
                  placeholder="2.2.0"
                  required
                  className={`${inputCls} font-mono text-[13px] tabular-nums`}
                />
              </Field>

              {/* Accessible Keyboard-Focusable .bin File Dropzone + SHA-256 Verification Card */}
              <Field label="Firmware file (.bin)" hint="Max 1.5 MB">
                <input
                  ref={fileInputRef}
                  id="ota-bin-file-input"
                  type="file"
                  accept=".bin"
                  onChange={(e) => handleOtaFileSelect(e.target.files?.[0] || null)}
                  className="sr-only peer"
                />
                {otaFile ? (
                  <div className="rounded-xl border border-(--border-field) bg-(--bg-subtle) p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Cpu className="size-4 text-(--brand) shrink-0" />
                        <span className="font-mono text-xs font-medium text-(--text) truncate">
                          {otaFile.name}
                        </span>
                        <span className="text-xs text-(--text-muted) tabular-nums shrink-0">
                          ({(otaFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      {otaFileSha256 && (
                        <p className="font-mono text-[11px] text-(--text-muted) truncate">
                          SHA-256: {otaFileSha256.slice(0, 24)}…
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtaFile(null);
                        setOtaFileSha256('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="h-8 px-3 rounded-lg border border-(--border-field) bg-white hover:bg-(--bg-subtle) text-xs font-medium text-(--text) shrink-0"
                    >
                      Replace file
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="ota-bin-file-input"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const dropped = e.dataTransfer.files?.[0] || null;
                      handleOtaFileSelect(dropped);
                    }}
                    className="border-2 border-dashed border-(--border-field) hover:border-(--brand) peer-focus-visible:border-(--brand) peer-focus-visible:ring-2 peer-focus-visible:ring-(--brand)/30 rounded-xl p-5 text-center bg-(--bg-subtle)/50 transition-colors cursor-pointer block"
                  >
                    <Cpu className="w-7 h-7 text-(--brand) mx-auto mb-2" />
                    <span className="text-xs font-semibold text-(--text) block">
                      Choose .bin file or drop it here
                    </span>
                    <span className="text-xs text-(--text-muted) mt-0.5 block">
                      Exported from Arduino IDE (Sketch → Export Compiled Binary)
                    </span>
                  </label>
                )}
              </Field>

              {/* Schedule Window */}
              <Field label="Schedule">
                <AppSelect
                  aria-label="OTA execution schedule"
                  zIndexClass="z-[90]"
                  value={otaSchedule}
                  onValueChange={setOtaSchedule}
                  options={SCHEDULE_OPTIONS}
                />
              </Field>

              {/* Release Notes */}
              <Field label="Release notes (optional)">
                <textarea
                  rows={2}
                  value={otaNotes}
                  onChange={(e) => setOtaNotes(e.target.value)}
                  placeholder="e.g. Faster heartbeat telemetry and pulse relay guard"
                  className="w-full rounded-lg border border-(--border-field) bg-white px-3 py-2 text-sm text-(--text) placeholder:text-(--text-placeholder) focus-visible:border-(--brand) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)/30 resize-none"
                />
              </Field>

              {/* High-Risk Fleet Confirmation Gate */}
              {needsTypedOtaConfirm && (
                <div className="rounded-xl border border-(--warn)/40 bg-(--warn-bg) p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-(--warn)">
                    <ShieldAlert className="size-4 shrink-0" />
                    <span>
                      High-impact rollout ({formatChairCount(effectiveTargetChairs.length)} across{' '}
                      {affectedBranchesCount} {affectedBranchesCount === 1 ? 'branch' : 'branches'})
                    </span>
                  </div>
                  <label
                    htmlFor="ota-typed-confirm"
                    className="block text-xs text-(--text)"
                  >
                    Type <strong className="font-mono font-semibold">DEPLOY</strong> to confirm
                    broadcasting this firmware:
                  </label>
                  <input
                    id="ota-typed-confirm"
                    type="text"
                    value={otaTypedConfirm}
                    onChange={(e) => setOtaTypedConfirm(e.target.value)}
                    placeholder="DEPLOY"
                    className={`${inputCls} font-mono text-xs uppercase`}
                  />
                </div>
              )}
            </form>

            <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-(--border) px-6 py-4 bg-white">
              <button
                type="button"
                onClick={() => setShowOtaModal(false)}
                className="h-10 px-4 rounded-xl border border-(--border-field) bg-white hover:bg-(--bg-subtle) text-(--text) font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="ota-form"
                disabled={!canDeployOta}
                className="h-10 px-5 rounded-xl bg-(--brand) hover:bg-(--brand-hover) text-white font-semibold text-xs shadow-xs disabled:opacity-50 transition-colors tabular-nums"
              >
                {isDeployingOta
                  ? 'Deploying...'
                  : `Deploy ${otaVersion.trim() || '0.0.0'} to ${formatChairCount(
                      effectiveTargetChairs.length
                    )}`}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChairListPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm font-medium text-(--brand) animate-pulse">
          Loading chairs...
        </div>
      }
    >
      <ChairListContent />
    </Suspense>
  );
}
