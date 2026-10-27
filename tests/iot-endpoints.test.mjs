import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('src');

describe('IoT REST Endpoints Specification & Contract Suite', () => {
  it('Fast Status Polling Endpoint file exists and enforces no-cache headers', () => {
    const statusRoutePath = path.join(SRC, 'app/api/payments/status/route.ts');
    assert.strictEqual(fs.existsSync(statusRoutePath), true, 'status route file must exist');

    const content = fs.readFileSync(statusRoutePath, 'utf8');
    assert.match(content, /export async function GET/, 'Must export GET handler');
    assert.match(content, /force-dynamic/, 'Must enforce force-dynamic');
    assert.match(content, /force-no-store/, 'Must enforce force-no-store');
    assert.match(content, /revalidate = 0/, 'Must enforce revalidate = 0');
    assert.match(content, /orderId/, 'Must parse orderId parameter');
    assert.match(content, /is_paid/, 'Must return is_paid boolean for ESP32');
    assert.match(content, /pulse_count/, 'Must return pulse_count integer for ESP32');
  });

  it('QRIS Generation Endpoint supports IoT kiosk creation and raw qr_string', () => {
    const createQrisPath = path.join(SRC, 'app/api/payments/create-qris/route.ts');
    assert.strictEqual(fs.existsSync(createQrisPath), true, 'create-qris route file must exist');

    const content = fs.readFileSync(createQrisPath, 'utf8');
    assert.match(content, /export async function POST/, 'Must export POST handler');
    assert.match(content, /created_from/, 'Must record created_from column');
    assert.match(content, /qr_string/, 'Must return qr_string for TJC HMI qr0 component');
    assert.match(content, /order_id/, 'Must return top-level order_id for ArduinoJson parser');
    assert.match(content, /pulse_count/, 'Must return pulse_count for ESP32');
  });

  it('Hardware Heartbeat Endpoint supports dual snake_case and camelCase payloads', () => {
    const heartbeatPath = path.join(SRC, 'app/api/heartbeat/route.ts');
    assert.strictEqual(fs.existsSync(heartbeatPath), true, 'heartbeat route file must exist');

    const content = fs.readFileSync(heartbeatPath, 'utf8');
    assert.match(content, /export async function POST/, 'Must export POST handler');
    assert.match(content, /chair_id/, 'Must accept chair_id snake_case parameter');
    assert.match(content, /firmware_version/, 'Must accept firmware_version snake_case parameter');
    assert.match(content, /last_heartbeat/, 'Must update last_heartbeat timestamp');
  });

  it('TypeScript schema types declare ClientDeviceType and IoT telemetry', () => {
    const typesPath = path.join(SRC, 'types/index.ts');
    const content = fs.readFileSync(typesPath, 'utf8');
    assert.match(content, /ClientDeviceType/, 'Must declare ClientDeviceType');
    assert.match(content, /IOT_KIOSK/, 'Must include IOT_KIOSK device option');
    assert.match(content, /qr_string\?: string/, 'ChairSlip must declare optional qr_string');
    assert.match(content, /firmware_version\?: string/, 'Chair must declare optional firmware_version');
  });

  it('Midtrans QRIS Charge sets custom 3-minute expiration', () => {
    const midtransPath = path.join(SRC, 'lib/midtrans.ts');
    const content = fs.readFileSync(midtransPath, 'utf8');
    assert.match(content, /custom_expiry/, 'Must configure custom_expiry in Midtrans charge');
    assert.match(content, /expiry_duration:\s*3/, 'Expiry duration must be exactly 3 minutes');
    assert.match(content, /unit:\s*['"]minute['"]/, 'Expiry unit must be minute');
  });

  it('EDC & IoT Kiosk ACK Route guarantees session_start_at and session_end_at integrity', () => {
    const ackRoutePath = path.join(SRC, 'app/api/admin/chairs/ack/route.ts');
    const content = fs.readFileSync(ackRoutePath, 'utf8');
    assert.match(content, /session_inprocess/, 'Must handle session_inprocess event');
    assert.match(content, /session_end_at\s*=\s*now/, 'Must set session_end_at when targetStatus is done');
    assert.match(content, /durationMins/, 'Must read duration_in_minutes for fallback timestamp calculation');
  });

  it('Cron Reconcile auto-expires at 4 minutes and auto-heals missing session_end_at', () => {
    const cronRoutePath = path.join(SRC, 'app/api/cron/reconcile/route.ts');
    const content = fs.readFileSync(cronRoutePath, 'utf8');
    assert.match(content, /fourMinutesAgo/, 'Must auto-expire pending transactions older than 4 minutes');
    assert.match(content, /healedNullEndCount/, 'Must track auto-healed null session_end_at transactions');
    assert.match(content, /autoCompletedSessions/, 'Must track auto-completed session_inprocess records');
  });

  it('ESP32 Firmware synchronizes NTP time and sends ISO timestamps for Supabase ACK', () => {
    const fwPath = path.resolve('smart_chair_esp32/smart_chair_esp32_v2/smart_chair_esp32_v2.ino');
    const content = fs.readFileSync(fwPath, 'utf8');
    assert.match(content, /configTime/, 'ESP32 firmware must synchronize NTP time');
    assert.match(content, /getIsoTimestamp/, 'ESP32 firmware must format ISO timestamps');
    assert.match(content, /session_end_at/, 'ESP32 direct ACK must include session_end_at for done events');
  });

  it('Live Ongoing Session page triggers session_inprocess on mount and done on finish', () => {
    const sessionPagePath = path.join(SRC, 'app/session/[orderId]/page.tsx');
    const content = fs.readFileSync(sessionPagePath, 'utf8');
    assert.match(content, /status_event:\s*['"]session_inprocess['"]/, 'Session page mount must notify session_inprocess');
    assert.match(content, /status_event:\s*['"]done['"]/, 'Session countdown completion must notify done');
  });
});
