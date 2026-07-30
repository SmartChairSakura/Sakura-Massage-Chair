# Specification Document: Kursi Pijat Sakura QRIS Kiosk System

## 1. Executive Summary & Objective

Proyek **Kursi Pijat Sakura** adalah modernisasi (*retrofit*) sistem kursi pijat konvensional (Tokuyo) menjadi **Sistem Kiosk Self-Service Hybrid (QRIS Dinamis & Uang Kertas GENIUS 7)**.

Aplikasi dioperasikan melalui perangkat **EDC Android / Touchscreen Kiosk** yang terhubung secara fisik via USB OTG ke **Modul USB Relay LCUS-1 CH340** (dengan relay 5V SRD-05VDC-SL-C) untuk mengontrol **Socket J3 PCB Tokuyo**, serta terhubung ke cloud backend **Vercel Serverless** dan **Supabase Realtime PostgreSQL Database**.

---

## 2. Technical Architecture & Tech Stack

- **Frontend Framework:** Next.js 14.2 LTS (App Router, React 18, TypeScript 5.x)
- **Styling & Design System:** TailwindCSS 4, **Sakura Zen Design System** (`Design.md` & Stitch Spec):
  - Primary (`Sakura Pink`): `#795465` (Dusty Rose)
  - Primary Container: `#F8C8DC` (Soft Pink Accent)
  - Secondary (`Sage Green`): `#4E635A` / `#CEE5DA` (Status Sukses & Location Badge)
  - Tertiary (`Branch Brown`): `#6F5A4F`
  - Base Surface (`Petal White`): `#FBF9F9`
  - Elevasi Ambient Shadow: `shadow-[0_20px_50px_rgba(78,59,49,0.05)]`
- **Typography & Icons:** Google Font **Plus Jakarta Sans**, Material Symbols Outlined, Lucide React Icons
- **Multi-Language i18n:** Client-side i18n Context (`src/lib/i18n.tsx`) dengan dukungan Bahasa Indonesia (`ID`) & English (`EN`)
- **Hardware Protocol:** Native Browser **Web Serial API** (`9600 BPS Baudrate`) untuk Modul LCUS-1 CH340
- **Database & Realtime Sync:** Supabase PostgreSQL + Supabase Realtime Subscriptions (`https://ndhlvkqswysexrdurirk.supabase.co`)
- **Deployment Platform:** Vercel Serverless (Region `sin1` Singapore)
- **Version Control:** GitHub (`SmartChairSakura/Sakura-Massage-Chair`)

---

## 3. Physical Hardware Specs & Wiring Protocol

### Hardware Components:
1. **Modul USB Relay LCUS-1 CH340:**
   - Single channel 5V DC relay (`SRD-05VDC-SL-C`) dengan micro-controller STC15F104W dan USB-to-Serial CH340G.
   - Terminal block 3-pin: **NO** (Normally Open), **COM** (Common), **NC** (Normally Closed).
2. **Socket J3 PCB Controller Tokuyo:**
   - Pin 1: +12V DC (Power bawaan validator GENIUS 7)
   - Pin 2: MS1 (Sinyal Pulsa - Kabel Biru) ➔ Terhubung ke Terminal **NO** USB Relay
   - Pin 3: GND (Ground - Kabel Ungu/Hitam) ➔ Terhubung ke Terminal **COM** USB Relay

### Hex Command Protocol (Baudrate 9600 BPS):
- **Pulse Active (Relay ON / Short MS1 to GND):** `0xA0 0x01 0x01 0xA2` (Hold 100ms)
- **Pulse Inactive (Relay OFF / Release Saklar):** `0xA0 0x01 0x00 0xA1` (Interval 100ms)
- **Emergency Breaker OFF:** `0xA0 0x01 0x00 0xA1`

---

## 4. UI/UX Specifications & 5-Step Kiosk User Journey

### 🌸 Kiosk Header (`src/components/KioskHeader.tsx`)
- Ultra-clean header: Branding **Sakura Zen** dengan logo icon `spa` dalam lingkaran pink `#F8C8DC`, Badge Lokasi Kiosk (`Grand Indonesia [SAKURA-GI-01]`), dan Dropdown Bahasa (`ID` / `EN`).
- *Note:* Link placeholder non-kiosk (Experience, Locations, Membership) dihilangkan untuk mencegah kebingungan pengguna EDC.

### 🌸 Step 1: Layar Standby & Kiosk Start (`src/app/page.tsx`)
- **Friction-Free:** Tanpa input No. HP atau Email untuk mempercepat transaksi Kiosk.
- **Visual:** Background ambient glow blur, recessed chair graphic container, pill badge `Step 1 dari 5 • Kiosk Standby`, dan tombol gradient **"Mulai Sesi Pijat Sakura ➔"**.

### ⏱️ Step 2: Layar Pemilihan Durasi & Tarif (`src/app/duration/page.tsx`)
- **Manual Stepper Counter (`[-] X Menit [+]`):**
  - Tombol `-` dan `+` dengan kelipatan **4 Menit** (1 Pulsa = Rp 5.000).
  - Tampilan teks durasi besar, pill pulsa `bolt`, dan indikator estimasi jam selesai pijat (*Estimasi Selesai: Pukul 15:45 WIB*).
- **Quick Presets Grid (2x2):** 4 Min (Rp 5.000), 8 Min (Rp 10.000), 16 Min (Rp 20.000 - *Paling Favorit*), 40 Min (Rp 50.000).
- **Summary Price Card:** Biaya Layanan + Admin QRIS Gratis (Rp 0) + Tombol **"BAYAR VIA QRIS"**.

### 💳 Step 3: Layar Pembayaran QRIS Dinamis (`src/app/payment/[orderId]/page.tsx`)
- **Dual Panel Layout:**
  - *Left Pink Context Panel:* Title Scan QRIS, instruksi singkat, dan Countdown Timer `02:53`.
  - *Right Action Panel:* Transaction ID strip dengan tombol salin, QR Code focus container dengan corner brackets, scan line animation, NMID, polling status pill, serta tombol **"SAYA SUDAH BAYAR"** dan **"KEMBALI (GANTI DURASI)"**.
- **Supabase Realtime Listener:** Auto-detect status `PAID` dan auto-redirect ke Step 4.

### 🎉 Step 4: Layar Pembayaran Sukses & Trigger Relay (`src/app/payment/success/page.tsx`)
- Visual selebrasi confetti, checkmark hijau `#CEE5DA`, rincian transaksi, dan auto-trigger sinyal pulsa Hex ke Modul USB Relay via Web Serial API. Auto-redirect ke Step 5 dalam 2.5 detik.

### 🧘 Step 5: Layar Sesi Pijat Berlangsung & Emergency Cancel (`src/app/session/[orderId]/page.tsx`)
- Live countdown timer melingkar berukuran besar, animasi floating sakura petals, ilustrasi `TokuyoChairGraphic` dengan audio equalizer waves, dan tombol **"Hentikan / Batalkan Sesi Pijat"**.
- **Emergency Modal Confirmation:** Menampilkan konfirmasi darurat. Jika dikonfirmasi, sistem mengirim **Breaker OFF Hex (`0xA0 0x01 0x00 0xA1`)** ke PCB Tokuyo, mencatat status `CANCELLED` di Supabase API, dan kembali ke Step 1 Standby.

---

## 5. Cloud Database Schema & RLS Policies (Supabase)

### Master Tables:
1. **`chairs` Table:**
   - `id` (VARCHAR 50, PK): e.g. `'SAKURA-GI-01'`, `'SAKURA-STG-01'`
   - `name` (VARCHAR 100), `location_name` (VARCHAR 150), `status` (VARCHAR 20: ONLINE/OFFLINE/BUSY/MAINTENANCE), `last_heartbeat` (TIMESTAMPTZ), `firmware_version` (VARCHAR 20), `is_active` (BOOLEAN).
2. **`transactions` Table:**
   - `id` (UUID, PK), `idempotency_key` (VARCHAR 100, UNIQUE), `chair_id` (VARCHAR 50, FK), `customer_phone` (VARCHAR 20), `amount` (NUMERIC 12,2), `duration_minutes` (INT), `pulse_count` (INT), `status` (VARCHAR 20: PENDING/PAID/ONGOING/COMPLETED/FAILED/EXPIRED/CANCELLED), `payment_gateway_ref` (VARCHAR 100), `qr_url` (TEXT), `session_start_at` (TIMESTAMPTZ), `session_end_at` (TIMESTAMPTZ), `cancelled_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).

### Supabase Migrations Executed:
- `01_initial_schema.sql` (Tables & Realtime Publication)
- `02_rls_policies.sql` (Security Policies for anon & service_role)
- `03_realtime_functions.sql` (Atomic function `fn_update_transaction_status` & `updated_at` trigger)

---

## 6. Deployment & Environment Strategy

- **Production URL:** `https://sakura-massage-chair.vercel.app`
- **Supabase Project:** `https://ndhlvkqswysexrdurirk.supabase.co` (Region: Tokyo)
- **Vercel Region:** `sin1` (Singapore - low latency)
- **Environment Strategy:**
  - Single Supabase DB dengan pemisahan Unit ID: `SAKURA-STG-01` (Staging/Test) & `SAKURA-GI-01` (Production Pilot).
  - Vercel Preview Deployments via Git branch `staging` untuk testing terisolasi secara gratis.

---

## 7. Operational Roadmap & Next Steps

1. **Phase Payment Gateway Integration:** Menggantikan Mock QRIS URL dengan API resmi Midtrans / Tripay / Xendit.
2. **Offline Resilience Queue (IndexedDB):** Cache transaksi lokal saat jaringan seluler lokasi tidak stabil.
3. **PIN Lock Admin Dashboard:** Keamanan PIN 6-digit untuk mengakses halaman `/admin`.
