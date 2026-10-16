/**
 * Date and Status filtering utilities with WIB (Asia/Jakarta, UTC+7) timezone precision.
 * Conforms to enterprise Backoffice & CMS standards (as seen in Parkee CMS).
 */

const WIB_OFFSET_HOURS = 7;

/**
 * Returns current timestamp converted to WIB Date representation.
 */
export function getWibNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + WIB_OFFSET_HOURS * 3600000);
}

/**
 * Formats a Date or ISO string into YYYY-MM-DD in WIB.
 */
export function getWibDateKey(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wib = new Date(utc + WIB_OFFSET_HOURS * 3600000);
  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, '0');
  const dd = String(wib.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats a date range into Indonesian display string (e.g. "16 Okt 2026 00:00 - 16 Okt 2026 23:59")
 */
export function formatWibDisplayRange(startIso: string | null, endIso: string | null): string {
  if (!startIso && !endIso) return 'All Time';
  
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const wib = new Date(utc + WIB_OFFSET_HOURS * 3600000);
    const day = String(wib.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[wib.getMonth()];
    const year = wib.getFullYear();
    const hours = String(wib.getHours()).padStart(2, '0');
    const mins = String(wib.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${mins}`;
  };

  if (startIso && endIso) {
    return `${formatDate(startIso)} - ${formatDate(endIso)}`;
  }
  if (startIso) return `From ${formatDate(startIso)}`;
  if (endIso) return `Until ${formatDate(endIso)}`;
  return 'All Time';
}

export interface WibDateRangeResult {
  startIso: string | null;
  endIso: string | null;
  todayKey: string;
}

/**
 * Computes exact start and end ISO strings (in UTC) for presets or custom date ranges
 * with strict Western Indonesian Time (WIB, UTC+7) adherence.
 */
export function getWibDateRange(
  filterRange?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null,
  timeFrom: string = '00:00',
  timeTo: string = '23:59'
): WibDateRangeResult {
  const wibNow = getWibNow();
  const yyyy = wibNow.getFullYear();
  const mm = String(wibNow.getMonth() + 1).padStart(2, '0');
  const dd = String(wibNow.getDate()).padStart(2, '0');
  const todayKey = `${yyyy}-${mm}-${dd}`;

  let startIso: string | null = null;
  let endIso: string | null = null;

  // Custom date range takes precedence if explicitly passed
  if (dateFrom) {
    const cleanFrom = dateFrom.trim();
    const startTimePart = timeFrom || '00:00';
    const str = cleanFrom.includes('T') ? cleanFrom : `${cleanFrom}T${startTimePart}:00+07:00`;
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      startIso = d.toISOString();
    }
  }

  if (dateTo) {
    const cleanTo = dateTo.trim();
    const endTimePart = timeTo || '23:59';
    const str = cleanTo.includes('T') ? cleanTo : `${cleanTo}T${endTimePart}:59.999+07:00`;
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      endIso = d.toISOString();
    }
  }

  // If custom date was provided, return directly
  if (dateFrom || dateTo) {
    return { startIso, endIso, todayKey };
  }

  // Preset evaluation
  const range = (filterRange || 'all').toLowerCase();

  if (range === 'today') {
    startIso = new Date(`${todayKey}T00:00:00+07:00`).toISOString();
    endIso = new Date(`${todayKey}T23:59:59.999+07:00`).toISOString();
  } else if (range === 'yesterday') {
    const yesterday = new Date(wibNow.getTime() - 24 * 3600000);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    startIso = new Date(`${yStr}T00:00:00+07:00`).toISOString();
    endIso = new Date(`${yStr}T23:59:59.999+07:00`).toISOString();
  } else if (range === 'this_week' || range === 'week') {
    // Current week starting Monday
    const dayOfWeek = wibNow.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(wibNow.getTime() - diffToMonday * 24 * 3600000);
    const mStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    startIso = new Date(`${mStr}T00:00:00+07:00`).toISOString();
    endIso = new Date(`${todayKey}T23:59:59.999+07:00`).toISOString();
  } else if (range === 'last_week') {
    const dayOfWeek = wibNow.getDay();
    const diffToLastMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 7;
    const lastMonday = new Date(wibNow.getTime() - diffToLastMonday * 24 * 3600000);
    const lastSunday = new Date(lastMonday.getTime() + 6 * 24 * 3600000);
    const lmStr = `${lastMonday.getFullYear()}-${String(lastMonday.getMonth() + 1).padStart(2, '0')}-${String(lastMonday.getDate()).padStart(2, '0')}`;
    const lsStr = `${lastSunday.getFullYear()}-${String(lastSunday.getMonth() + 1).padStart(2, '0')}-${String(lastSunday.getDate()).padStart(2, '0')}`;
    startIso = new Date(`${lmStr}T00:00:00+07:00`).toISOString();
    endIso = new Date(`${lsStr}T23:59:59.999+07:00`).toISOString();
  } else if (range === '7d') {
    const d7 = new Date(wibNow.getTime() - 6 * 24 * 3600000);
    const d7Str = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`;
    startIso = new Date(`${d7Str}T00:00:00+07:00`).toISOString();
    endIso = new Date(`${todayKey}T23:59:59.999+07:00`).toISOString();
  } else if (range === 'month' || range === 'this_month') {
    startIso = new Date(`${yyyy}-${mm}-01T00:00:00+07:00`).toISOString();
    endIso = new Date(`${todayKey}T23:59:59.999+07:00`).toISOString();
  } else if (range === 'last_month') {
    const firstOfThisMonth = new Date(wibNow.getFullYear(), wibNow.getMonth(), 1);
    const lastDayOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);
    const prevYear = lastDayOfPrevMonth.getFullYear();
    const prevMonth = String(lastDayOfPrevMonth.getMonth() + 1).padStart(2, '0');
    const prevLastDay = String(lastDayOfPrevMonth.getDate()).padStart(2, '0');
    startIso = new Date(`${prevYear}-${prevMonth}-01T00:00:00+07:00`).toISOString();
    endIso = new Date(`${prevYear}-${prevMonth}-${prevLastDay}T23:59:59.999+07:00`).toISOString();
  } else if (range === 'all') {
    startIso = null;
    endIso = null;
  }

  return { startIso, endIso, todayKey };
}

/**
 * Standard Status Categories conforming to Parkee CMS design pattern.
 */
export const STATUS_CATEGORIES = {
  // Completed / Done sessions
  DONE: ['done', 'completed', 'paid', 'DONE', 'COMPLETED', 'PAID'] as const,
  // Ongoing chair sessions
  INPROCESS: ['session_inprocess', 'ongoing', 'paid_pending_delivery', 'INPROCESS', 'ONGOING'] as const,
  // Waiting for customer to scan / complete QRIS
  WAITING: ['pending', 'WAITING', 'PENDING'] as const,
  // Abandoned / Expired QRIS sessions
  UNPAID: ['expired', 'failed', 'cancelled', 'EXPIRED', 'FAILED', 'CANCELLED', 'UNPAID'] as const,
  // Legacy aliases
  COMPLETED: ['done', 'completed', 'paid', 'ongoing', 'session_inprocess', 'DONE', 'COMPLETED', 'PAID', 'ONGOING'] as const,
  PENDING: ['pending', 'paid_pending_delivery', 'PENDING'] as const,
  FAILED: ['failed', 'expired', 'cancelled', 'FAILED', 'EXPIRED', 'CANCELLED'] as const,
};

/**
 * Maps a front-end status filter string to an array of matching database status values.
 * Returns null if no filter is requested ('ALL', 'ALL STATUS', empty, or undefined).
 */
export function mapStatusFilter(status?: string | null): string[] | null {
  if (!status || status === 'ALL' || status.toUpperCase() === 'ALL' || status.toUpperCase() === 'ALL STATUS') {
    return null;
  }
  const clean = status.toLowerCase().trim();
  if (['done', 'completed', 'paid'].includes(clean)) {
    return [...STATUS_CATEGORIES.DONE];
  }
  if (['inprocess', 'ongoing'].includes(clean)) {
    return [...STATUS_CATEGORIES.INPROCESS];
  }
  if (['waiting', 'pending'].includes(clean)) {
    return [...STATUS_CATEGORIES.WAITING];
  }
  if (['unpaid', 'expired', 'failed', 'cancelled'].includes(clean)) {
    return [...STATUS_CATEGORIES.UNPAID];
  }
  return [clean];
}
