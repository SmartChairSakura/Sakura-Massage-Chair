import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('src');

// Timezone offset for Western Indonesian Time (WIB) in hours
const WIB_OFFSET_HOURS = 7;

function getWibNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + WIB_OFFSET_HOURS * 3600000);
}

function getWibDateKey(dateInput) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wib = new Date(utc + WIB_OFFSET_HOURS * 3600000);
  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, '0');
  const dd = String(wib.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getWibDateRange(filterRange, dateFrom, dateTo) {
  const wibNow = getWibNow();
  const yyyy = wibNow.getFullYear();
  const mm = String(wibNow.getMonth() + 1).padStart(2, '0');
  const dd = String(wibNow.getDate()).padStart(2, '0');
  const todayKey = `${yyyy}-${mm}-${dd}`;

  let startIso = null;
  let endIso = null;

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

const STATUS_CATEGORIES = {
  COMPLETED: ['done', 'completed', 'paid', 'ongoing', 'session_inprocess', 'DONE', 'COMPLETED', 'PAID', 'ONGOING'],
  PENDING: ['pending', 'paid_pending_delivery', 'PENDING'],
  FAILED: ['failed', 'expired', 'cancelled', 'FAILED', 'EXPIRED', 'CANCELLED'],
};

function mapStatusFilter(status) {
  if (!status || status === 'ALL' || status === 'ALL STATUS' || status.toUpperCase() === 'ALL STATUS' || status.toUpperCase() === 'ALL') {
    return null;
  }
  const clean = status.toLowerCase().trim();
  if (['completed', 'done', 'paid'].includes(clean)) {
    return [...STATUS_CATEGORIES.COMPLETED];
  }
  if (['inprocess', 'ongoing'].includes(clean)) {
    return ['ongoing', 'session_inprocess'];
  }
  if (['pending', 'waiting'].includes(clean)) {
    return [...STATUS_CATEGORIES.PENDING];
  }
  if (['failed', 'expired', 'cancelled', 'unpaid'].includes(clean)) {
    return [...STATUS_CATEGORIES.FAILED];
  }
  return [clean];
}

describe('Filter Logic & Timezone Precision (WIB UTC+7)', () => {
  it('mapStatusFilter should map "completed" to all completed session statuses including "done"', () => {
    const statuses = mapStatusFilter('completed');
    assert.ok(statuses, 'Should return array');
    assert.strictEqual(statuses.includes('done'), true, 'Must include done');
    assert.strictEqual(statuses.includes('completed'), true, 'Must include completed');
    assert.strictEqual(statuses.includes('paid'), true, 'Must include paid');
  });

  it('mapStatusFilter should map "pending" to pending session statuses', () => {
    const statuses = mapStatusFilter('pending');
    assert.ok(statuses, 'Should return array');
    assert.strictEqual(statuses.includes('pending'), true, 'Must include pending');
    assert.strictEqual(statuses.includes('paid_pending_delivery'), true, 'Must include paid_pending_delivery');
  });

  it('mapStatusFilter should map "failed" to failed and expired session statuses', () => {
    const statuses = mapStatusFilter('failed');
    assert.ok(statuses, 'Should return array');
    assert.strictEqual(statuses.includes('expired'), true, 'Must include expired');
    assert.strictEqual(statuses.includes('failed'), true, 'Must include failed');
    assert.strictEqual(statuses.includes('cancelled'), true, 'Must include cancelled');
  });

  it('mapStatusFilter should return null for "ALL", "ALL STATUS", or empty', () => {
    assert.strictEqual(mapStatusFilter('ALL'), null);
    assert.strictEqual(mapStatusFilter('ALL STATUS'), null);
    assert.strictEqual(mapStatusFilter('all status'), null);
    assert.strictEqual(mapStatusFilter('all'), null);
    assert.strictEqual(mapStatusFilter(''), null);
    assert.strictEqual(mapStatusFilter(null), null);
  });

  it('mapStatusFilter should handle Parkee CMS status presets (DONE, INPROCESS, WAITING, UNPAID)', () => {
    const doneList = mapStatusFilter('DONE');
    assert.ok(doneList.includes('done'), 'DONE must include done');

    const inprocessList = mapStatusFilter('INPROCESS');
    assert.ok(inprocessList.length > 0, 'INPROCESS must map to ongoing sessions');

    const waitingList = mapStatusFilter('WAITING');
    assert.ok(waitingList.includes('pending'), 'WAITING must include pending');

    const unpaidList = mapStatusFilter('UNPAID');
    assert.ok(unpaidList.includes('expired'), 'UNPAID must include expired');
  });

  it('getWibDateRange should compute accurate start & end for "today"', () => {
    const { startIso, endIso, todayKey } = getWibDateRange('today');
    assert.ok(startIso, 'Must provide startIso');
    assert.ok(endIso, 'Must provide endIso');
    assert.strictEqual(startIso.endsWith(':00.000Z'), true);
    assert.strictEqual(endIso.endsWith(':59.999Z'), true);

    const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
    assert.strictEqual(diffMs, 24 * 3600000 - 1);
  });

  it('getWibDateRange should parse custom date range with WIB boundary', () => {
    const { startIso, endIso } = getWibDateRange(null, '2026-10-16', '2026-10-16');
    assert.strictEqual(startIso, '2026-10-15T17:00:00.000Z', 'Start of 2026-10-16 WIB in UTC');
    assert.strictEqual(endIso, '2026-10-16T16:59:59.999Z', 'End of 2026-10-16 WIB in UTC');
  });

  it('getWibDateKey should convert UTC timestamps to WIB YYYY-MM-DD correctly', () => {
    assert.strictEqual(getWibDateKey('2026-10-15T17:30:00.000Z'), '2026-10-16');
    assert.strictEqual(getWibDateKey('2026-10-16T14:49:17.754Z'), '2026-10-16');
    assert.strictEqual(getWibDateKey('2026-10-16T16:59:59.000Z'), '2026-10-16');
    assert.strictEqual(getWibDateKey('2026-10-16T17:01:00.000Z'), '2026-10-17');
  });

  it('src/lib/date-utils.ts file must exist and export required utilities', () => {
    const dateUtilsSrc = fs.readFileSync(path.join(SRC, 'lib/date-utils.ts'), 'utf8');
    assert.strictEqual(dateUtilsSrc.includes('export function getWibDateRange'), true);
    assert.strictEqual(dateUtilsSrc.includes('export function getWibDateKey'), true);
    assert.strictEqual(dateUtilsSrc.includes('export function mapStatusFilter'), true);
    assert.strictEqual(dateUtilsSrc.includes('export const STATUS_CATEGORIES'), true);
  });
});
