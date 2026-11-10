# Task Breakdown & Checklist: IoT Release to `main` & Post-Demo Production Cutover

## Phase A: Pre-Demo Cleanup, Server-Driven Pricing & Release to `main` (Current Execution)

- [x] **Task 1: Update Living Specification & Planning Docs**
  - Acceptance: `spec.md`, `tasks/plan.md`, and `tasks/todo.md` accurately reflect the ESP32 + TJC HMI + `chair_slips` architecture and the agreed `/grill-me` decisions.
  - Verify: Inspect `spec.md`, `tasks/plan.md`, and `tasks/todo.md`.
  - Files: `spec.md`, `tasks/plan.md`, `tasks/todo.md`

- [x] **Task 2: Eliminate Dead Legacy `public.transactions` Queries & Fix Session Cancel Chair Reset (`/ponytail-review`)**
  - Acceptance: Zero `.from('transactions')` calls remain in `src/app/api/`; `/api/transactions/[id]/cancel` resets the corresponding chair status to `'ONLINE'` in `public.chairs` using the cancelled `chair_slips` row (`chair_code` or numeric `id`).
  - Verify: `grep -rn "from('transactions')" src/` returns empty; unit tests pass.
  - Files: `src/app/api/payments/create-qris/route.ts`, `src/app/api/payments/status/route.ts`, `src/app/api/payment/callback/route.ts`, `src/app/api/webhooks/payment/route.ts`, `src/app/api/admin/chairs/ack/route.ts`, `src/app/api/cron/reconcile/route.ts`, `src/app/api/transactions/[id]/cancel/route.ts`

- [x] **Task 3: Implement Server-Driven Pricing (`PRICE_PER_PULSE_IDR`) Without ESP32 Re-Flash**
  - Acceptance: `/api/payments/create-qris` computes `effectiveAmount = createdFrom === 'IOT_KIOSK' && pricePerPulse > 1 ? Math.max(Number(amount), Number(pulseCount) * pricePerPulse) : Number(amount)` and validates via `validateChairPackage`; `.env.example` documents `PRICE_PER_PULSE_IDR=1`.
  - Verify: Unit tests verify both demo (`PRICE_PER_PULSE_IDR=1` -> `Rp 5..40`) and production (`PRICE_PER_PULSE_IDR=1000` -> `Rp 5.000..40.000`) behavior.
  - Files: `src/lib/security.ts`, `src/app/api/payments/create-qris/route.ts`, `.env.example`, `tests/security-audit-hardening.test.mjs`

- [x] **Task 4: Run Full Automated Test Suite in `TZ=UTC` & Production Build**
  - Acceptance: All unit tests in `tests/*.test.mjs` pass under `TZ=UTC`, and `npm run build` exits with code `0`.
  - Verify: `TZ=UTC node --test tests/*.test.mjs && npm run build`
  - Files: `tests/security-audit-hardening.test.mjs`

- [x] **Task 5: Merge `feature/iot-esp32` into `main` & Push to `origin/main`**
  - Acceptance: `main` fast-forwards / merges cleanly to match `feature/iot-esp32` and is pushed to `origin/main`.
  - Verify: `git status -sb` and `git rev-list --left-right --count origin/main...origin/feature/iot-esp32` shows `0 0`.
  - Files: Git branches `feature/iot-esp32`, `main`

---

## Phase B: Post-Demo Production Cutover Checklist (Execute After Client Demo)

- [ ] **Task 6.1 (Vercel Env):** Pastikan `JWT_SECRET` (random 32-byte hex) dan `CRON_SECRET` terpasang di Vercel Production Environment Variables.
- [ ] **Task 6.2 (Cloud OTA `v2.3.0`):** Compile & upload Firmware ESP32 `v2.3.0` (menggunakan `NEXT_PUBLIC_SUPABASE_ANON_KEY` untuk polling `GET /rest/v1/chair_slips` & `chairs`, serta mengirim header `x-device-key` ke `/api/heartbeat`, `/api/admin/chairs/ack`, dan `/api/admin/chairs/firmware/status`) melalui menu **Deploy Firmware** di `/admin/chairs`.
- [ ] **Task 6.3 (Strict Device Auth & Key Rotation):** Setelah semua kursi melaporkan versi `2.3.0` (`Online`), isi `IOT_DEVICE_SECRET` di Vercel dan rotasi `service_role` key di Supabase Dashboard → perbarui `SUPABASE_SERVICE_ROLE_KEY` di Vercel.
- [ ] **Task 6.4 (Production Pricing Cutover):** Ubah `PRICE_PER_PULSE_IDR=1000` dan `MIN_PRICE_PER_PULSE_IDR=1000` di Vercel agar paket `P1..P8` otomatis menagih `Rp 5.000–Rp 40.000` tanpa perlu flash ulang ESP32.
