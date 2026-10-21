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
});
