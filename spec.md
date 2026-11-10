# Spec: Kursi Pijat Sakura — IoT ESP32 Hub & Enterprise Backoffice System

## 1. Objective

Modernisasi (*retrofit*) kursi pijat komersial **Tokuyo (TC-355 / TC-297)** menjadi sistem layanan mandiri berbasis **Dedicated IoT Controller Hub (ESP32 + Layar Sentuh HMI TJC 4.3" + Relay Optocoupler Socket J3)** yang terintegrasi dengan **Midtrans Core API (QRIS Dinamis)**, **Supabase PostgreSQL**, dan **Sakura Zen Enterprise Backoffice CMS**.

- **Primary Users:**
  - **Pelanggan Mal (Kiosk User):** Memilih durasi pijat (`P1` 4 menit s/d `P8` 32 menit) di layar TJC 4.3", memindai QRIS dinamis (batas waktu 3 menit), dan menikmati sesi pijat otomatis.
  - **Super Admin (`SUPER_ADMIN`):** Mengelola seluruh cabang (`locations`), unit kursi (`chairs`), pengguna (`admin_users`), audit transaksi (`tickets`), ringkasan finansial (`dashboard`), dan *Canary/Staged Cloud OTA Firmware Deployment*.
  - **Management / Mitra Lokasi (`MANAGEMENT`):** Memantau pendapatan bersih (*Net Payout*), transaksi, dan armada kursi sesuai cakupan lokasi (`location_id: null` untuk *All Locations* atau UUID cabang tertentu).

---

## 2. Tech Stack

- **Web & Cloud API:** Next.js 14.2.24 (App Router, React 18, TypeScript 5, Node.js Serverless di Vercel region `sin1`)
- **Styling & Charts:** Tailwind CSS 3.4, Recharts 2.x, Lucide React (`Sakura Zen Design System`, WCAG 2.2 AA)
- **Database & Storage:** Supabase PostgreSQL (`chair_slips`, `chair_slip_payments`, `chairs`, `locations`, `admin_users`) + Supabase Storage (`firmware-ota`)
- **Payment Gateway:** Midtrans Core API v2 (`qris` charge dengan `custom_expiry: 3 minutes`, SHA-512 webhook signature verification, dan Status API reconciliation)
- **IoT Hardware & Firmware:**
  - **MCU:** ESP32 DevKit V1 (Dual-Core FreeRTOS: Core 0 Network & Persistent SSL Polling, Core 1 UI & Relay Timer) — [`smart_chair_esp32/smart_chair_esp32_v2/smart_chair_esp32_v2.ino`](file:///home/rifpamks/Documents/Smart%20Kursi%20Pijat/smart-kursi-pijat-web/smart_chair_esp32/smart_chair_esp32_v2/smart_chair_esp32_v2.ino)
  - **Display:** USART HMI TJC 4.3" (`TJC4827X243_011`, baudrate `9600 bps` via `UART2 GPIO 16/17`) — [`tjc_ui_assets/`](file:///home/rifpamks/Documents/Smart%20Kursi%20Pijat/smart-kursi-pijat-web/tjc_ui_assets/)
  - **Actuator:** Relay Optocoupler 5V pada `GPIO 23` → **Socket J3 PCB Tokuyo** (`PULSE_ON_MS = 200ms`, `PULSE_OFF_MS = 150ms`; formula `4 menit = 5 pulsa`)

---

## 3. Commands

```bash
# Run full unit & security regression test suite (125+ tests) in UTC timezone (matching Vercel)
TZ=UTC node --test tests/*.test.mjs

# Run single focused test suite
TZ=UTC node --test tests/security-audit-hardening.test.mjs
TZ=UTC node --test tests/filter-logic.test.mjs

# Run production build & TypeScript check
npm run build

# Run local development server
npm run dev

# Run end-to-end IoT flow simulation
node scripts/simulate-iot-flow.mjs
```

---

## 4. Project Structure

```text
smart-kursi-pijat-web/
├── src/
│   ├── app/
│   │   ├── admin/             → Backoffice UI (dashboard, tickets, chairs, locations, users, login)
│   │   ├── api/
│   │   │   ├── admin/         → Protected backoffice & device ACK/OTA endpoints
│   │   │   ├── payments/      → QRIS creation (/create-qris) & fast status polling (/status)
│   │   │   ├── payment/       → Midtrans webhook callback (/callback)
│   │   │   ├── webhooks/      → Active Midtrans settlement verifier (/payment)
│   │   │   ├── heartbeat/     → ESP32 telemetry & OTA check endpoint
│   │   │   └── cron/          → 4-min auto-expiry & Midtrans reconciliation (/reconcile)
│   │   └── (kiosk pages)/     → Web Kiosk fallback (/duration, /payment/[orderId], /session/[orderId])
│   ├── components/admin/      → Shared Backoffice components (AdminSidebar, AdminHeader, DatePickerModal, ThemedSelect)
│   └── lib/                   → Core utilities (security.ts, date-utils.ts, chart-utils.ts, midtrans.ts, jwt-edge.ts, supabase-server.ts)
├── smart_chair_esp32/         → Arduino C++ ESP32 Firmware (v2.2.0-ota & v2.3.0 hybrid spec)
├── tjc_ui_assets/             → USART HMI TJC 4.3" project (.HMI) & compiled .tft binaries
├── supabase/migrations/       → PostgreSQL schema & RLS lockdown migrations (01..12)
├── tests/                     → Automated Node.js test suites (*.test.mjs)
└── tasks/                     → Implementation plans (plan.md) & task checklists (todo.md)
```

---

## 5. Code Style & Security Invariants

```typescript
// 1. Always enforce WIB (UTC+7) deterministically without relying on server TZ
const { startIso, endIso, todayKey } = getWibDateRange(filterRange, dateFrom, dateTo, timeFrom, timeTo);
const dateLabel = formatWibDayLabel(dayKey); // "2026-11-03" -> "3 Nov" (identical on TZ=UTC and TZ=Asia/Jakarta)

// 2. Always scope multi-branch access & sanitize PostgREST .or() filter values
const filterLocationId = resolveScopedLocationId(
  session,
  sanitizePostgrestValue(searchParams.get('location_id')) || null
);

// 3. Server-driven package & pricing validation (4 mins = 5 pulses)
const pkg = validateChairPackage({ amount: effectiveAmount, durationMinutes, pulseCount }, minPricePerPulse);
```

---

## 6. Testing Strategy

- **Runner:** Native Node.js Test Runner (`node --test tests/*.test.mjs`), dijalankan dengan `TZ=UTC` agar identik dengan runtime Vercel.
- **Suites:**
  1. `tests/security-audit-hardening.test.mjs` — RBAC tenant isolation, Midtrans signature & Status API verification, RLS Migration 12 invariants, ESP32 package/price validation, PostgREST sanitization, UI dual-axis scrollbar invariants.
  2. `tests/filter-logic.test.mjs` — WIB (`UTC+7`) date range & label formatting under `TZ=UTC`, status category mapping.
  3. `tests/tickets-financial-breakdown.test.mjs` — Zero-discrepancy MDR (0.7%), Platform Fee (5%), Net Payout (95% of Net), and 20-column PARKEE CSV export.
  4. `tests/chair-list-uiux.test.mjs` & `tests/location-setting-uiux.test.mjs` — WCAG 2.2 AA tokens, masked Terminal PIN, Canary/Staged OTA flow, reversible Undo flows.
  5. `tests/iot-endpoints.test.mjs` & `tests/chart-utils.test.mjs` — IoT contract & deterministic chart geometry.

---

## 7. Boundaries

- **Always do:**
  - Jalankan `TZ=UTC node --test tests/*.test.mjs` dan `npm run build` sebelum setiap commit/merge ke `main`.
  - Gunakan tabel utama `public.chair_slips` dan `public.chair_slip_payments` (jangan menulis ke tabel legacy `public.transactions` yang sudah dihapus).
  - Pertahankan kompatibilitas mundur terhadap firmware ESP32 `v2.2.0-ota` selama masa demo klien.
- **Ask first:**
  - Merotasi `SUPABASE_SERVICE_ROLE_KEY` di dashboard Supabase (wajib menunggu Firmware `v2.3.0` ter-deploy via Cloud OTA).
  - Mengubah skema tabel database di Supabase atau mengubah harga produksi (`PRICE_PER_PULSE_IDR=1000`).
- **Never do:**
  - Membuka akses tulis (`INSERT/UPDATE/DELETE`) untuk role `anon` pada tabel Supabase mana pun.
  - Membiarkan `toLocaleDateString` dijalankan di server tanpa eksplisit WIB/deterministic formatter.
  - Menyembunyikan scrollbar global dengan `display: none` di halaman admin.

---

## 8. Success Criteria (Current Phase: Merge to `main` & Post-Stress-Test Readiness)

1. **Zero Dead Legacy Queries:** Seluruh 7 endpoint API transaksi (`create-qris`, `payments/status`, `payment/callback`, `webhooks/payment`, `chairs/ack`, `cron/reconcile`, `transactions/[id]/cancel`) bersih dari query ke tabel `public.transactions` yang sudah tidak ada.
2. **Server-Driven Pricing (`PRICE_PER_PULSE_IDR`):** `/api/payments/create-qris` mendukung `PRICE_PER_PULSE_IDR` (default `1` untuk demo `Rp 5–40`, `1000` untuk produksi `Rp 5.000–40.000` tanpa perlu re-flash ESP32).
3. **Production Branch (`main`) Synced:** Branch `feature/iot-esp32` ter-merge bersih ke `main` dan ter-push ke `origin/main` dengan `100%` unit test lulus di `TZ=UTC` dan `npm run build` sukses.
4. **Post-Demo Hardening Checklist Documented:** Prosedur transisi pasca-demo (OTA `v2.3.0` Hybrid `anon` polling + `x-device-key` → rotasi `SUPABASE_SERVICE_ROLE_KEY` → set `PRICE_PER_PULSE_IDR=1000` & `IOT_DEVICE_SECRET`) terdokumentasi di `tasks/plan.md` dan `tasks/todo.md`.
