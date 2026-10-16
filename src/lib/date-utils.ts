/**
 * Date and Status filtering utilities with WIB (Asia/Jakarta, UTC+7) timezone precision.
 */

// Timezone offset for Western Indonesian Time (WIB) in hours
const WIB_OFFSET_HOURS = 7;

/**
 * Returns current timestamp converted to WIB date object representation.
 */
export function getWibNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + WIB_OFFSET_HOURS * 3600000);
}

/**
 * Converts any date or ISO string to a WIB date key formatted as YYYY-MM-DD.
 * Useful for grouping transactions by day according to Indonesian local time.
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

export interface WibDateRangeResult {
  startIso: string | null;
  endIso: string | null;
  todayKey: string;
}

/**
 * Computes exact start and end ISO strings (in UTC) representing the requested
 * range in Western Indonesian Time (WIB, UTC+7).
 */
export function getWibDateRange(
  filterRange?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null
): WibDateRangeResult {
  const wibNow = getWibNow();
  const yyyy = wibNow.getFullYear();
  const mm = String(wibNow.getMonth() + 1).padStart(2, '0');
  const dd = String(wibNow.getDate()).padStart(2, '0');
  const todayKey = `${yyyy}-${mm}-${dd}`;

  let startIso: string | null = null;
  let endIso: string | null = null;

  // Custom date range takes precedence if provided
  if (dateFrom) {
    const cleanFrom = dateFrom.trim();
    const str = cleanFrom.includes('T') ? cleanFrom : `${cleanFrom}T00:00:00+07:00`;
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      startIso = d.toISOString();
    }
  } else if (filterRange === 'today') {
    startIso = new Date(`${todayKey}T00:00:00+07:00`).toISOString();
    endIso = new Date(`${todayKey}T23:59:59.999+07:00`).toISOString();
  } else if (filterRange === '7d') {
    // 6 days ago 00:00:00 WIB to today 23:59:59.999 WIB = 7 days total
    const d7 = new Date(wibNow.getTime() - 6 * 24 * 3600000);
    const d7Str = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`;
    startIso = new Date(`${d7Str}T00:00:00+07:00`).toISOString();
    endIso = new Date(`${todayKey}T23:59:59.999+07:00`).toISOString();
  } else if (filterRange === 'month') {
    startIso = new Date(`${yyyy}-${mm}-01T00:00:00+07:00`).toISOString();
    endIso = new Date(`${todayKey}T23:59:59.999+07:00`).toISOString();
  }

  if (dateTo) {
    const cleanTo = dateTo.trim();
    const str = cleanTo.includes('T') ? cleanTo : `${cleanTo}T23:59:59.999+07:00`;
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      endIso = d.toISOString();
    }
  }

  return { startIso, endIso, todayKey };
}

/**
 * Standard Status Categories for Sakura Massage Chair Operational Sessions.
 */
export const STATUS_CATEGORIES = {
  COMPLETED: ['done', 'completed', 'paid', 'ongoing', 'session_inprocess', 'DONE', 'COMPLETED', 'PAID', 'ONGOING'] as const,
  PENDING: ['pending', 'paid_pending_delivery', 'PENDING'] as const,
  FAILED: ['failed', 'expired', 'cancelled', 'FAILED', 'EXPIRED', 'CANCELLED'] as const,
};

/**
 * Maps a front-end status filter string to an array of matching database status values.
 * Returns null if no filter is requested ('ALL', empty, or undefined).
 */
export function mapStatusFilter(status?: string | null): string[] | null {
  if (!status || status === 'ALL' || status.toUpperCase() === 'ALL') {
    return null;
  }
  const clean = status.toLowerCase().trim();
  if (['completed', 'done', 'paid'].includes(clean)) {
    return [...STATUS_CATEGORIES.COMPLETED];
  }
  if (['pending'].includes(clean)) {
    return [...STATUS_CATEGORIES.PENDING];
  }
  if (['failed', 'expired', 'cancelled'].includes(clean)) {
    return [...STATUS_CATEGORIES.FAILED];
  }
  return [clean];
}
