# Security Hardening Plan — Sakura Zen Smart Massage Chair (`smart-kursi-pijat-web`)

**Source Audit Reference**: `/home/rifpamks/security-audit-skill/smart-kursi-pijat-web/run-1/` (`REPORT.md`, `FINDINGS-DETAIL.md`, `NEEDS-VALIDATION.md`, `findings.json`, `coverage-ledger.json`)
**Reviewed Commit**: `8b9c82db16bff90d8b4d56c7b8480cf7684aa9fc` (`feature/iot-esp32`)

---

## Executive Summary of Discovered Vulnerabilities

| ID | Severity | Vulnerability Title | Primary Files |
|---|---|---|---|
| **VULN-01** | **CRITICAL** | Unauthenticated `POST /api/webhooks/payment` allows anyone to mark orders `paid`/`done` and fabricate `chair_slip_payments` revenue split records | `src/app/api/webhooks/payment/route.ts`, `src/app/payment/[orderId]/page.tsx`, `src/app/session/[orderId]/page.tsx` |
| **VULN-02** | **CRITICAL** | Production Supabase `service_role` secret key hardcoded in server helper and compiled into ESP32 firmware sketches | `src/lib/supabase-server.ts`, `smart_chair_esp32/smart_chair_esp32_v2/smart_chair_esp32_v2.ino`, `smart_chair_esp32/smart_chair_esp32.ino` |
| **VULN-03** | **CRITICAL** | Permissive Supabase RLS policies grant the public `anon` key full read/write access to `admin_users` (`password_hash`, `otp_code`), `chairs`, and `locations`, and omit RLS on `chair_slips` | `supabase/migrations/11_admin_users_schema.sql`, `07_convert_chairs_id_to_bigint.sql`, `09_locations_and_fk_restructure.sql`, `05_payment_hardening_and_audit.sql` |
| **VULN-04** | **HIGH** | QRIS charge creation (`create-qris`) and callback trust client-supplied `amount`, `durationMinutes`, and `pulseCount` (Price Tampering) | `src/app/api/payments/create-qris/route.ts`, `src/app/api/payment/callback/route.ts` |
| **VULN-05** | **HIGH** | Broken multi-branch tenant isolation (`MANAGEMENT` / `OWNER` bypass `session.location_id`) and missing `SUPER_ADMIN` checks on chair/location/firmware mutations + chair PIN exposure | `src/app/api/admin/dashboard/route.ts`, `tickets/route.ts`, `chairs/route.ts`, `locations/route.ts`, `locations/[id]/route.ts`, `chairs/firmware/upload/route.ts` |
| **VULN-06** | **HIGH** | Hardcoded fallback `JWT_SECRET` and `SUPER_ADMIN` default role fallback in `verifySessionJWT` | `src/lib/jwt-edge.ts`, `src/lib/auth-server.ts` |
| **VULN-07** | **HIGH** | Password reset uses non-CSPRNG `Math.random()` OTP and process-local `otpStore` attempt counter that resets across serverless cold starts | `src/app/api/admin/auth/forgot-password/route.ts`, `src/app/api/admin/auth/reset-password/route.ts`, `src/lib/otp-store.ts` |
| **VULN-08** | **HIGH** | Unauthenticated device & operational endpoints (`/api/heartbeat`, `/api/admin/chairs/ack`, `/api/admin/chairs/firmware/status`, `/api/transactions/[id]/cancel`, `/api/cron/reconcile`) | `src/middleware.ts`, `src/app/api/heartbeat/route.ts`, `src/app/api/admin/chairs/ack/route.ts`, `src/app/api/admin/chairs/firmware/status/route.ts`, `src/app/api/cron/reconcile/route.ts` |
| **VULN-09** | **HIGH** | ESP32 OTA firmware update disables TLS verification (`client.setInsecure()`) and flashes unsigned binary URLs | `smart_chair_esp32/smart_chair_esp32_v2/smart_chair_esp32_v2.ino`, `src/app/api/admin/chairs/firmware/upload/route.ts` |
| **VULN-10** | **MEDIUM** | Unsanitized user input interpolated into PostgREST `.or()` filters across auth, ticket, user, and payment routes | `src/app/api/admin/auth/login/route.ts`, `src/app/api/admin/tickets/route.ts`, `src/app/api/admin/users/route.ts`, `src/app/api/payments/create-qris/route.ts` |
| **LEAD-01** | **NEEDS VALIDATION** | Midtrans webhook callback falls back to `'SB-Mid-server-DUMMYKEY'` and skips signature failure when `NODE_ENV !== 'production'` | `src/app/api/payment/callback/route.ts`, `src/lib/midtrans.ts` |
| **LEAD-02** | **NEEDS VALIDATION** | Missing `X-Frame-Options` and CSP `frame-ancestors` anti-framing headers on `/admin/*` and `/setup` / `/test-hardware` pages | `next.config.mjs`, `vercel.json`, `src/middleware.ts` |

---

## Phased Hardening Implementation Plan

### Phase 1: Payment Settlement & Pricing Integrity (Critical / High)
1. **Lock down `POST /api/webhooks/payment` (`src/app/api/webhooks/payment/route.ts`)**:
   - Remove unauthenticated client-driven status mutations. Require either a valid `SUPER_ADMIN` session or internal server/Midtrans signature verification before transitioning any slip to `paid`/`done` or inserting into `chair_slip_payments`.
   - Update `handleCheckAlreadyPaid` in `src/app/payment/[orderId]/page.tsx` and the session mount effect in `src/app/session/[orderId]/page.tsx` to query `GET /api/payments/status?orderId=...` (and verify live status via `checkMidtransTransactionStatus` if still `pending`) instead of posting `status: 'PAID'` to `/api/webhooks/payment`.
2. **Enforce Server-Side Package Pricing & Pulse Validation (`src/app/api/payments/create-qris/route.ts`, `src/app/api/payment/callback/route.ts`)**:
   - Define an authoritative server-side pricing table mapping valid durations (`4`, `10`, `15`, `20`, `30`, etc.) to exact Rupiah `amount` and `pulse_count` values (or validate `amount === pulseCount * 1000` with strict positive integer bounds `1 <= pulseCount <= 60` and minimum `amount >= 1000`).
   - In `POST /api/payment/callback`, remove the `'SB-Mid-server-DUMMYKEY'` fallback, require valid Midtrans SHA-512 signature verification unconditionally, check buffer length before `crypto.timingSafeEqual` in `src/lib/midtrans.ts`, and verify `Math.round(Number(body.gross_amount)) === Math.round(Number(existingSlip.amount))` before marking a slip `paid`.

### Phase 2: Secrets, Supabase RLS & Database Lockdown (Critical)
1. **Remove Hardcoded Service-Role & JWT Secrets (`src/lib/supabase-server.ts`, `src/lib/jwt-edge.ts`)**:
   - Require `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` from environment variables in production (failing closed with a clear startup error if missing rather than falling back to committed literals).
   - Document required variables in `.env.example` (`JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `IOT_DEVICE_SECRET`, `CRON_SECRET`).
2. **Create Migration `supabase/migrations/12_security_rls_and_otp_hardening.sql`**:
   - Drop permissive `PUBLIC` / `anon` policies on `public.admin_users`, `public.chairs`, `public.locations`, and `public.transactions`.
   - Enable RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) on `chair_slips`, `chair_slip_payments`, `chair_slip_summary_detail`, and `chair_slip_settlements`.
   - Restrict `admin_users` exclusively to `TO service_role`.
   - Restrict write operations (`INSERT`, `UPDATE`, `DELETE`) on `chairs`, `locations`, `chair_slips`, and `chair_slip_payments` to `TO service_role` only, leaving `anon` with minimal read-only `SELECT` on active chairs if needed by the kiosk UI.
   - Add `otp_attempts INT NOT NULL DEFAULT 0` to `public.admin_users` for persistent serverless-safe OTP brute-force protection.

### Phase 3: Admin Auth, OTP Hardening & Multi-Branch RBAC Isolation (High)
1. **Harden `verifySessionJWT` (`src/lib/jwt-edge.ts`)**:
   - Never default a missing `payload.role` to `'SUPER_ADMIN'`; reject any JWT whose `role` is not explicitly `'SUPER_ADMIN'`, `'MANAGEMENT'`, or `'OWNER'`.
2. **Harden Forgot/Reset Password (`src/app/api/admin/auth/forgot-password/route.ts`, `reset-password/route.ts`)**:
   - Replace `Math.random()` with `crypto.randomInt(100000, 1000000)`.
   - HTML-escape `adminUser.full_name` and `cleanEmail` in the email template.
   - Persist and increment `otp_attempts` in `admin_users` on every failed verification attempt, invalidating `otp_code` in the database after 5 failed attempts across any serverless instance, and compare OTP codes using `crypto.timingSafeEqual`.
3. **Enforce Multi-Branch Tenant Isolation (`session.location_id`) & `SUPER_ADMIN` Guards**:
   - Add `resolveScopedLocationId(session, requestedLocationId)` and `requireSuperAdmin(session)` helpers in `src/lib/auth-server.ts`.
   - Enforce `session.location_id` on `GET /api/admin/dashboard`, `GET /api/admin/tickets` (including `export=true`), `GET /api/admin/locations`, `GET /api/admin/locations/[id]/chairs`, and `GET /api/admin/chairs` whenever `session.role !== 'SUPER_ADMIN'`.
   - Mask/omit `pin` from `GET /api/admin/dashboard` and `GET /api/admin/chairs` for non-`SUPER_ADMIN` sessions.
   - Require `SUPER_ADMIN` on `POST/PATCH/DELETE /api/admin/chairs` (except `action === 'LOGIN'` pairing check), `POST /api/admin/locations`, `PATCH/DELETE /api/admin/locations/[id]`, and `POST /api/admin/chairs/firmware/upload`.
   - Prevent self-deactivation/self-demotion of the active `SUPER_ADMIN` in `PATCH/DELETE /api/admin/users`.

### Phase 4: Device Authentication, PostgREST Sanitization & HTTP Security Headers (High / Medium)
1. **Sanitize PostgREST `.or()` Filter Inputs (`src/lib/postgrest-sanitize.ts`)**:
   - Create a dedicated sanitizer `sanitizePostgrestFilterValue(input)` that strips PostgREST grammar delimiters (`,`, `(`, `)`, `"`, `'`, `\\`) and control characters, and apply it across `login/route.ts`, `tickets/route.ts`, `users/route.ts`, `create-qris/route.ts`, `webhooks/payment/route.ts`, and `transactions/[id]/cancel/route.ts`.
2. **Authenticate Device, Cron & Firmware Endpoints**:
   - Add device token verification (`x-device-key` or `Authorization: Bearer` checked when `IOT_DEVICE_SECRET` is configured) on `/api/heartbeat`, `/api/admin/chairs/ack`, and `/api/admin/chairs/firmware/status`, and restrict `/api/heartbeat` to updating existing registered chairs or validated chair codes.
   - Add `CRON_SECRET` verification on `GET /api/cron/reconcile`.
   - Validate ESP32 `.bin` magic byte (`0xE9`) and maximum file size (`<= 4 MB`) in `POST /api/admin/chairs/firmware/upload`.
3. **Configure Global Security Headers (`next.config.mjs` / `vercel.json` / `src/middleware.ts`)**:
   - Add `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Content-Security-Policy: frame-ancestors 'none'` across application and admin responses.
