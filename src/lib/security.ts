/**
 * Pure security helpers (no imports) so they can be unit-tested directly.
 */

/**
 * Strips PostgREST filter grammar delimiters from user input before it is
 * interpolated into `.or(...)` strings, preventing extra-predicate injection.
 */
export function sanitizePostgrestValue(input: unknown): string {
  return String(input ?? '')
    .replace(/[,()"'\\]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}

// Tokuyo PCB rule: every 4 minutes = 5 pulses.
export const MINUTES_PER_BLOCK = 4;
export const PULSES_PER_BLOCK = 5;
export const MAX_SESSION_MINUTES = 60;

export type PackageValidation =
  | { ok: true; amount: number; durationMinutes: number; pulseCount: number }
  | { ok: false; error: string };

/**
 * Server-side package validation for QRIS creation.
 * - durationMinutes must be a positive multiple of 4, max 60.
 * - pulseCount must equal durationMinutes / 4 * 5 (no free pulses).
 * - amount must be an integer >= pulseCount * minPricePerPulse.
 */
export function validateChairPackage(
  input: { amount: unknown; durationMinutes: unknown; pulseCount: unknown },
  minPricePerPulse: number
): PackageValidation {
  const amount = Number(input.amount);
  const durationMinutes = Number(input.durationMinutes);
  const pulseCount = Number(input.pulseCount);

  if (![amount, durationMinutes, pulseCount].every(Number.isInteger)) {
    return { ok: false, error: 'amount, durationMinutes, and pulseCount must be integers' };
  }
  if (
    durationMinutes < MINUTES_PER_BLOCK ||
    durationMinutes > MAX_SESSION_MINUTES ||
    durationMinutes % MINUTES_PER_BLOCK !== 0
  ) {
    return { ok: false, error: `durationMinutes must be a multiple of ${MINUTES_PER_BLOCK} between ${MINUTES_PER_BLOCK} and ${MAX_SESSION_MINUTES}` };
  }
  const expectedPulses = (durationMinutes / MINUTES_PER_BLOCK) * PULSES_PER_BLOCK;
  if (pulseCount !== expectedPulses) {
    return { ok: false, error: `pulseCount must be ${expectedPulses} for ${durationMinutes} minutes` };
  }
  const minPrice = Number.isFinite(minPricePerPulse) && minPricePerPulse > 0 ? minPricePerPulse : 1;
  if (amount < pulseCount * minPrice) {
    return { ok: false, error: 'amount is below the minimum price for this package' };
  }
  return { ok: true, amount, durationMinutes, pulseCount };
}

// UUID that matches no row; used to scope sessions without an assigned location.
export const NO_LOCATION_ID = '00000000-0000-0000-0000-000000000000';

/**
 * SUPER_ADMIN or MANAGEMENT/OWNER with Assigned branch = "All Locations" (`location_id: null`)
 * may query any location (including 'ALL').
 * When a non-SUPER_ADMIN has a specific assigned branch (`session.location_id`), they are pinned to it.
 */
export function resolveScopedLocationId(
  session: { role: string; location_id: string | null },
  requestedLocationId: string | null | undefined
): string {
  if (session.role === 'SUPER_ADMIN' || !session.location_id) {
    return requestedLocationId || 'ALL';
  }
  return session.location_id;
}

/**
 * Checks whether an admin session may mutate a resource scoped to `targetLocationId`.
 * - `SUPER_ADMIN` or `MANAGEMENT`/`OWNER` with `location_id: null` ("All Locations") -> true.
 * - Branch-pinned `MANAGEMENT`/`OWNER` (`session.location_id` set) -> true only when
 *   `targetLocationId` matches `session.location_id`.
 */
export function canAccessLocation(
  session: { role: string; location_id: string | null },
  targetLocationId?: string | null
): boolean {
  if (session.role === 'SUPER_ADMIN' || !session.location_id) return true;
  if (!targetLocationId) return false;
  return String(targetLocationId) === String(session.location_id);
}

/**
 * Graceful secret verification for device (IOT_DEVICE_SECRET) and cron (CRON_SECRET) endpoints.
 * - When `configuredSecret` is empty/unset, returns `true` so existing ESP32 firmware & cron jobs
 *   continue operating without interruption during demo/transition.
 * - When `configuredSecret` is set, requires a matching header (`x-device-key`, `x-cron-secret`,
 *   or `Authorization: Bearer <secret>`).
 */
export function verifyOptionalSecret(
  providedHeader: string | null | undefined,
  configuredSecret: string | undefined
): boolean {
  const expected = String(configuredSecret || '').trim();
  if (!expected) return true;
  const raw = String(providedHeader || '').trim();
  if (!raw) return false;
  const token = raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : raw;
  return token === expected;
}

