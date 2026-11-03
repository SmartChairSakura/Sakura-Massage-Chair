import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';

const WEB_ROOT = path.resolve(process.cwd());

function readFile(relativePath) {
  return fs.readFileSync(path.join(WEB_ROOT, relativePath), 'utf8');
}

async function importTsModule(relativePath) {
  const tsCode = readFile(relativePath);
  const jsOutput = ts.transpileModule(tsCode, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const dataUrl = `data:text/javascript;base64,${Buffer.from(jsOutput, 'utf8').toString('base64')}`;
  return import(dataUrl);
}

const security = await importTsModule('src/lib/security.ts');
const midtrans = await importTsModule('src/lib/midtrans.ts');

test('Security Audit Hardening — Pure Function & ESP32 Compatibility Suite', async (t) => {
  await t.test('VULN-04: validateChairPackage accepts all 8 ESP32 HMI demo packages (P1..P8: Rp 5..40) when MIN_PRICE_PER_PULSE_IDR=1', () => {
    const espPackages = [
      { durationMinutes: 4, amount: 5, pulseCount: 5 },
      { durationMinutes: 8, amount: 10, pulseCount: 10 },
      { durationMinutes: 12, amount: 15, pulseCount: 15 },
      { durationMinutes: 16, amount: 20, pulseCount: 20 },
      { durationMinutes: 20, amount: 25, pulseCount: 25 },
      { durationMinutes: 24, amount: 30, pulseCount: 30 },
      { durationMinutes: 28, amount: 35, pulseCount: 35 },
      { durationMinutes: 32, amount: 40, pulseCount: 40 },
    ];
    for (const pkg of espPackages) {
      const res = security.validateChairPackage(pkg, 1);
      assert.equal(res.ok, true, `ESP32 package ${pkg.durationMinutes}m should be valid in demo mode`);
    }
  });

  await t.test('VULN-04: validateChairPackage accepts Web Kiosk production packages (Rp 5.000..60.000) and rejects price/pulse tampering', () => {
    // Valid production package: 16m = 20 pulses = Rp 20.000
    assert.equal(
      security.validateChairPackage({ durationMinutes: 16, pulseCount: 20, amount: 20000 }, 1000).ok,
      true
    );

    // Reject pulse inflation: 4m claiming 30 pulses
    assert.equal(
      security.validateChairPackage({ durationMinutes: 4, pulseCount: 30, amount: 5000 }, 1).ok,
      false
    );

    // Reject price tampering below minPricePerPulse (e.g. Rp 100 for 20 pulses when min=1000)
    assert.equal(
      security.validateChairPackage({ durationMinutes: 16, pulseCount: 20, amount: 100 }, 1000).ok,
      false
    );

    // Reject invalid duration (not multiple of 4 or out of range)
    assert.equal(
      security.validateChairPackage({ durationMinutes: 7, pulseCount: 5, amount: 5000 }, 1).ok,
      false
    );
    assert.equal(
      security.validateChairPackage({ durationMinutes: 120, pulseCount: 150, amount: 150000 }, 1).ok,
      false
    );
  });

  await t.test('VULN-10: sanitizePostgrestValue strips PostgREST filter delimiters (, ( ) " \' \\)', () => {
    assert.equal(
      security.sanitizePostgrestValue('admin@parkee.app,is_active.eq.true)'),
      'admin@parkee.appis_active.eq.true'
    );
    assert.equal(
      security.sanitizePostgrestValue('SAKURA-GI-01"\\'),
      'SAKURA-GI-01'
    );
  });

  await t.test('VULN-05: resolveScopedLocationId pins branch-assigned non-SUPER_ADMIN to session.location_id and allows All Locations when location_id is null', () => {
    assert.equal(
      security.resolveScopedLocationId({ role: 'SUPER_ADMIN', location_id: null }, 'ALL'),
      'ALL'
    );
    assert.equal(
      security.resolveScopedLocationId({ role: 'MANAGEMENT', location_id: 'loc-123' }, 'ALL'),
      'loc-123'
    );
    // Management user with Assigned branch = "All Locations" (location_id: null, e.g. Boss Besar)
    assert.equal(
      security.resolveScopedLocationId({ role: 'MANAGEMENT', location_id: null }, 'ALL'),
      'ALL'
    );
    assert.equal(
      security.resolveScopedLocationId({ role: 'OWNER', location_id: null }, 'loc-456'),
      'loc-456'
    );
  });

  await t.test('VULN-08: verifyOptionalSecret is graceful when secret is unset (ESP32 demo safe) and strict when configured', () => {
    // Graceful mode (default during demo)
    assert.equal(security.verifyOptionalSecret(null, undefined), true);
    assert.equal(security.verifyOptionalSecret('', ''), true);

    // Strict mode when secret is configured
    assert.equal(security.verifyOptionalSecret(null, 'my-device-secret'), false);
    assert.equal(security.verifyOptionalSecret('wrong', 'my-device-secret'), false);
    assert.equal(security.verifyOptionalSecret('my-device-secret', 'my-device-secret'), true);
    assert.equal(security.verifyOptionalSecret('Bearer my-device-secret', 'my-device-secret'), true);
  });

  await t.test('LEAD-01: verifyMidtransSignature handles arbitrary signature lengths without throwing RangeError', () => {
    const serverKey = 'Mid-server-test-key';
    const orderId = 'TRX-SAKURA-GI-01-123';
    const statusCode = '200';
    const grossAmount = '10000.00';
    const validSig = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest('hex');

    assert.equal(
      midtrans.verifyMidtransSignature(
        { order_id: orderId, status_code: statusCode, gross_amount: '10000', signature_key: validSig, transaction_status: 'settlement' },
        serverKey
      ),
      true
    );

    // Short / malformed signature must return false cleanly (not throw ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH)
    assert.equal(
      midtrans.verifyMidtransSignature(
        { order_id: orderId, status_code: statusCode, gross_amount: '10000', signature_key: 'short-sig', transaction_status: 'settlement' },
        serverKey
      ),
      false
    );
  });
});

test('Security Audit Hardening — Route & Migration Invariant Suite', async (t) => {
  await t.test('VULN-01: /api/webhooks/payment verifies payment via Midtrans Status API instead of trusting client status', () => {
    const webhookRoute = readFile('src/app/api/webhooks/payment/route.ts');
    assert.match(webhookRoute, /checkMidtransTransactionStatus/);
    assert.match(webhookRoute, /amountMatches/);
    assert.doesNotMatch(webhookRoute, /const targetStatus = String\(status \|\| 'PAID'\)/);
  });

  await t.test('LEAD-01: /api/payment/callback removes SB-Mid-server-DUMMYKEY fallback, enforces signature unconditionally, and checks gross_amount', () => {
    const callbackRoute = readFile('src/app/api/payment/callback/route.ts');
    assert.doesNotMatch(callbackRoute, /SB-Mid-server-DUMMYKEY/);
    assert.doesNotMatch(callbackRoute, /!isValidSignature && process\.env\.NODE_ENV === 'production'/);
    assert.match(callbackRoute, /if \(!isValidSignature\)/);
    assert.match(callbackRoute, /Amount mismatch/);
  });

  await t.test('VULN-03 & VULN-07: Migration 12 locks admin_users to service_role, keeps anon SELECT on chair_slips for Realtime, and adds otp_attempts', () => {
    const mig12 = readFile('supabase/migrations/12_security_rls_and_otp_hardening.sql');
    assert.match(mig12, /ADD COLUMN IF NOT EXISTS otp_attempts/);
    assert.match(mig12, /ON public\.admin_users[\s\S]*?TO service_role/);
    assert.match(mig12, /ON public\.chair_slips[\s\S]*?FOR SELECT[\s\S]*?TO anon, authenticated/);
    assert.match(mig12, /ON public\.chair_slip_payments[\s\S]*?TO service_role/);
  });

  await t.test('VULN-06: jwt-edge.ts rejects missing/unknown role instead of defaulting to SUPER_ADMIN', () => {
    const jwtEdge = readFile('src/lib/jwt-edge.ts');
    assert.doesNotMatch(jwtEdge, /\(payload\.role as UserRole\) \|\| 'SUPER_ADMIN'/);
    assert.match(jwtEdge, /if \(!VALID_ROLES\.includes\(role\)\) return null/);
  });

  await t.test('VULN-07: forgot-password uses crypto.randomInt CSPRNG + HTML escaping; reset-password persists otp_attempts and uses timingSafeEqual', () => {
    const forgotRoute = readFile('src/app/api/admin/auth/forgot-password/route.ts');
    const resetRoute = readFile('src/app/api/admin/auth/reset-password/route.ts');
    assert.doesNotMatch(forgotRoute, /Math\.random\(\)/);
    assert.match(forgotRoute, /crypto\.randomInt\(100000, 1000000\)/);
    assert.match(forgotRoute, /escapeHtml/);
    assert.match(resetRoute, /otp_attempts/);
    assert.match(resetRoute, /crypto\.timingSafeEqual/);
  });

  await t.test('VULN-05: Multi-branch tenant isolation & SUPER_ADMIN guards enforced across admin routes', () => {
    assert.match(readFile('src/app/api/admin/dashboard/route.ts'), /resolveScopedLocationId/);
    assert.match(readFile('src/app/api/admin/tickets/route.ts'), /resolveScopedLocationId/);
    assert.match(readFile('src/app/api/admin/chairs/route.ts'), /resolveScopedLocationId/);
    assert.match(readFile('src/app/api/admin/chairs/route.ts'), /session\.role !== 'SUPER_ADMIN'/);
    assert.match(readFile('src/app/api/admin/locations/route.ts'), /resolveScopedLocationId/);
    assert.match(readFile('src/app/api/admin/locations/[id]/route.ts'), /session\.role !== 'SUPER_ADMIN'/);
    assert.match(readFile('src/app/api/admin/chairs/firmware/upload/route.ts'), /session\.role !== 'SUPER_ADMIN'/);
    assert.match(readFile('src/app/api/admin/users/route.ts'), /You cannot deactivate your own account/);
  });

  await t.test('VULN-08, VULN-09 & LEAD-02: Firmware magic byte 0xE9, graceful device/cron auth, and anti-framing headers', () => {
    assert.match(readFile('src/app/api/admin/chairs/firmware/upload/route.ts'), /0xe9/i);
    assert.match(readFile('src/app/api/heartbeat/route.ts'), /verifyOptionalSecret/);
    assert.match(readFile('src/app/api/admin/chairs/ack/route.ts'), /verifyOptionalSecret/);
    assert.match(readFile('src/app/api/admin/chairs/firmware/status/route.ts'), /verifyOptionalSecret/);
    assert.match(readFile('src/app/api/cron/reconcile/route.ts'), /verifyOptionalSecret/);
    assert.match(readFile('next.config.mjs'), /X-Frame-Options/);
    assert.match(readFile('next.config.mjs'), /frame-ancestors 'none'/);
  });
});
