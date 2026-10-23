# 📑 Master Specification & Context Handover: Dedicated IoT Controller Hub & Cloud OTA Update

> **Project:** Sakura Zen - Smart Kursi Pijat (Tokuyo Commercial Massage Chair System)  
> **Git Repository:** `https://github.com/SmartChairSakura/Sakura-Massage-Chair.git`  
> **Active Branch:** `feature/iot-esp32`  
> **Target Audience:** Cross-Agent Handover (Claude / Antigravity / Cursor / Human Engineers)  
> **Last Updated:** 23 Oktober 2026

---

## 1. 🎯 Executive Summary & Architecture Overview

Proyek ini mentransformasi sistem kursi pijat komersial konvensional (**Tokuyo**) menjadi **Smart IoT Massage Chair** berbasis pembayaran QRIS dinamis (Midtrans) dan manajemen armada multi-cabang (SaaS Backoffice).

### Pergeseran Arsitektur (ADR 003):
- **Arsitektur Lama (Legacy `main` branch):** Tablet / Mesin EDC Android Kiosk menjalankan web browser kiosk (`EDC_KIOSK`). Sering mengalami kendala browser crash, OS lag, keterbatasan baterai/suhu, serta biaya unit tinggi.
- **Arsitektur Baru (`feature/iot-esp32` branch):** **Dedicated IoT Controller Hub (`IOT_KIOSK`)** menggunakan mikrokontroler mandiri **ESP32 DevKit V1 (Dual-Core 240MHz)** + **Layar HMI Sentuh TJC 4.3" (USART Serial)** + **Relay Optocoupler Active LOW (Socket J3 Tokuyo)** dengan dukungan **Cloud OTA Firmware Deployment** langsung dari Web Dashboard.

```mermaid
graph TD
    subgraph CLOUD["Cloud SaaS Architecture"]
        VERCEL["Next.js 14 Web Backoffice (Vercel)"]
        SUPA_DB[("Supabase PostgreSQL (Tables: chairs, chair_slips)")]
        SUPA_ST[("Supabase Cloud Storage (Bucket: firmware)")]
        MID["Midtrans Core API (Sandbox & Production QRIS)"]
    end

    subgraph IOT_HUB["Dedicated IoT Controller Hub (Di Kursi Pijat)"]
        ESP32["ESP32 DevKit V1 (Dual-Core FreeRTOS)"]
        TJC["Layar HMI Sentuh TJC 4.3\" (USART Serial2)"]
        RELAY["Relay Optocoupler (GPIO 23 Active LOW)"]
    end

    subgraph HARDWARE["Mesin Kursi Pijat"]
        TOKUYO["Tokuyo Massage Chair Mainboard (Socket J3)"]
    end

    VERCEL <--> SUPA_DB
    VERCEL <--> SUPA_ST
    VERCEL <--> MID
    
    ESP32 <-->|HTTPS REST API / Fast Polling| VERCEL
    ESP32 <-->|Direct PostgREST REST Fallback| SUPA_DB
    ESP32 <-->|HTTPS Binary Download (OTA)| SUPA_ST
    ESP32 <-->|UART 9600 bps| TJC
    ESP32 -->|Pulse 200ms ON / 150ms OFF| RELAY
    RELAY -->|Socket J3 Pin 1 & 2 Contact| TOKUYO
```

---

## 2. 🔐 Kredensial, Environment Variables, & Endpoints

### A. Environment Variables (`.env.local`):
```env
# Supabase PostgreSQL & PostgREST Live Credentials
NEXT_PUBLIC_SUPABASE_URL=https://ndhlvkqswysexrdurlrk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGx2a3Fzd3lzZXhyZHVybHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTc2NDgsImV4cCI6MjEwMDk3MzY0OH0.sNNN14Lm6s5G1vIOiC8AQReyl_zM-5EZQawQjneGy_k
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGx2a3Fzd3lzZXhyZHVybHJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTM5NzY0OCwiZXhwIjoyMTAwOTczNjQ4fQ.x57j7Ev9ETNmuTxxwGTMvjZX0hF4rQbxj2dpEpu4X8I

# Web Application URLs
NEXT_PUBLIC_APP_URL=https://sakura-massage-chair.vercel.app
VERCEL_PREVIEW_URL=https://sakura-massage-chair-git-feature-iot-esp32-sakura-26a0.vercel.app

# Midtrans Configuration (Sandbox Environment)
# (Key tersimpan di .env.local untuk keamanan git push protection)
MIDTRANS_SERVER_KEY=<LIHAT_DI_ENV_LOCAL_ATAU_DASHBOARD_MIDTRANS>
MIDTRANS_CLIENT_KEY=Mid-client-f-1554iU_QBslEdx
MIDTRANS_MERCHANT_ID=M921588884
MIDTRANS_IS_PRODUCTION=false
```

### B. Daftar REST Endpoints untuk IoT & Firmware:

| Method | Endpoint Path | Autentikasi | Deskripsi & Payload |
|---|---|---|---|
| `POST` | `/api/heartbeat` | Public | Telemetri ping ESP32 (`chair_id`, `status: ONLINE/BUSY`, `firmware_version`, `rssi`, `ip`). |
| `POST` | `/api/payments/create-qris` | Public | Request QRIS Midtrans (`chair_id`, `amount`, `duration_minutes`, `pulse_count`, `created_from: 'IOT_KIOSK'`). Mengembalikan `order_id`, `qr_string` (EMVCo), dan `qr_url`. |
| `GET` | `/api/payments/status?orderId=...` | Public (Anti-Cache) | Fast Status Polling (`< 200ms`). Mengembalikan `{ is_paid: boolean, status: 'pending'\|'paid', pulse_count, duration_minutes }`. Menggunakan regex guard `isUuid` untuk keamanan PostgREST. |
| `POST` | `/api/admin/chairs/ack` | Public (Whitelisted) | Telemetri eksekusi relay (`chair_slip_number`, `chair_id`, `status_event: 'session_inprocess' \| 'done'`). |
| `POST` | `/api/admin/chairs/firmware/upload` | Admin Session | Multipart upload binary `.bin` ESP32, upload ke bucket Supabase `firmware`, dan update target kursi ke status `PENDING`. |
| `POST` | `/api/admin/chairs/firmware/status` | Public (Whitelisted) | Callback telemetri status update OTA dari ESP32 (`DOWNLOADING`, `SUCCESS`, `FAILED`). |
| `POST` | `/api/payment/callback` | Webhook (SHA512) | Webhook notifikasi pembayaran Midtrans (mengubah slip jadi `paid` saat `settlement`). |

---

## 3. 🗄️ Skema Database Supabase

### A. Tabel `chairs` (Master Armada Kursi Pijat):
- `id` (uuid, Primary Key)
- `chair_code` (text, Unique — contoh: `"SAKURA-GI-01"`)
- `name` (text — contoh: `"Sakura Deluxe Unit 1"`)
- `location_id` (uuid, Foreign Key ke `locations`)
- `status` (text: `'ONLINE'`, `'BUSY'`, `'OFFLINE'`)
- `firmware_version` (text — contoh: `"2.2.0-ota"`)
- `target_firmware_version` (text — versi target OTA)
- `firmware_url` (text — URL file `.bin` di Supabase Storage)
- `ota_status` (text: `'IDLE'`, `'PENDING'`, `'DOWNLOADING'`, `'SUCCESS'`, `'FAILED'`)
- `rssi` (integer — kekuatan sinyal WiFi dalam dBm)
- `last_heartbeat` (timestamptz)
- `is_active` (boolean)

### B. Tabel `chair_slips` (Master Audit Transaksi & Tiket):
- `id` (uuid, Primary Key)
- `chair_slip_number` (text, Unique — format: `"TRX-SAKURA-GI-01-<timestamp>-<rand>"`)
- `chair_id` (text / uuid)
- `chair_code` (text — contoh: `"SAKURA-GI-01"`)
- `amount` (numeric — contoh: `5000.00`)
- `duration_in_minutes` (integer — contoh: `4`)
- `pulse_count` (integer — contoh: `5`)
- `payment_method` (text: `'QRIS'`)
- `status` (text: `'pending'`, `'paid'`, `'session_inprocess'`, `'done'`, `'expired'`)
- `qr_url` (text — link gambar QR dari Midtrans)
- `created_from` (text: `'IOT_KIOSK'` atau `'EDC_KIOSK'`)
- `session_start_at` (timestamptz)
- `session_end_at` (timestamptz)
- `created_at` (timestamptz)

---

## 4. ⚡ Spesifikasi Hardware & Pinout Wiring

| Komponen Hardware | Pin Komponen | Konek ke ESP32 | Keterangan & Logika |
|---|---|---|---|
| **Layar TJC HMI 4.3"** | `5V` & `GND` | `VIN` & `GND` | Power supply serial screen (konsumsi ~250mA). |
| | `TXD` | `GPIO 16 (RX2)` | Serial2 USART baudrate 9600 bps. |
| | `RXD` | `GPIO 17 (TX2)` | Serial2 USART baudrate 9600 bps. |
| **Relay Optocoupler** | `VCC` & `GND` | `VIN (5V)` & `GND` | Common Ground wajib terhubung. |
| | `IN` | `GPIO 23` | Active LOW (Kaki NO & COM menutup saat LOW). |
| **Konektor Tokuyo** | **Socket J3 Pin 1 & 2** | `Relay NO & COM` | Pulsa: **200ms ON / 150ms OFF** per ketukan. Paket P1 (4 mnt) = 5 pulsa. |

---

## 5. 🔄 Siklus State Machine ESP32 (FreeRTOS)

ESP32 menggunakan arsitektur dual-core FreeRTOS:
- **Core 1 (State Machine & Hardware Controller):** Mengendalikan navigasi layar TJC, membaca tombol sentuh, menghitung mundur sesi timer, dan memicu relay optocoupler GPIO 23 tanpa blocking.
- **Core 0 (`networkTask`):** Menangani koneksi SSL/HTTPS non-blocking, fast status polling (setiap 2.5 detik), heartbeat (setiap 30 detik), dan polling jadwal OTA (setiap 15 detik saat standby).

```mermaid
stateDiagram-v2
    [*] --> STATE_STANDBY: Booting & WiFi Connect
    STATE_STANDBY --> STATE_QRIS_DISPLAY: User Sentuh Paket di Layar TJC (P1/P2/P3)
    STATE_STANDBY --> EXECUTING_OTA: Supabase ota_status == 'PENDING'
    
    state STATE_QRIS_DISPLAY {
        [*] --> REQUESTING_QRIS
        REQUESTING_QRIS --> DISPLAYING_QR: HTTP 200 & Render qr0
        DISPLAYING_QR --> WAITING_PAYMENT: Polling Status (2.5s)
        WAITING_PAYMENT --> TIMEOUT_CANCEL: Timeout 180s atau Tombol Batal
    }

    TIMEOUT_CANCEL --> STATE_STANDBY: Reset Layar ke Halaman 0
    STATE_QRIS_DISPLAY --> TRIGGER_PULSES: Status == 'paid' Terdeteksi

    state STATE_MASSAGE_RUNNING {
        TRIGGER_PULSES --> INJECT_RELAY: Injeksi 5 Pulsa (200ms ON/150ms OFF)
        INJECT_RELAY --> SEND_ACK_START: POST /api/admin/chairs/ack (session_inprocess)
        SEND_ACK_START --> TIMER_COUNTDOWN: Update Layar TJC Setiap 1 Detik
        TIMER_COUNTDOWN --> SEND_ACK_DONE: Waktu Habis (00:00) -> ACK done
    }

    SEND_ACK_DONE --> STATE_STANDBY: Kursi Kembali Standby

    state EXECUTING_OTA {
        DOWNLOADING_BIN: TJC "UPDATING FW" & Lapor DOWNLOADING
        FLASHING: httpUpdate.update(client, firmware_url)
        REBOOT: Lapor SUCCESS -> ESP.restart()
    }
    EXECUTING_OTA --> STATE_STANDBY: Gagal (FAILED) atau Pasca-Reboot
```

---

## 6. ☁️ Mekanisme Cloud OTA Firmware Update

Fitur OTA memungkinkan deploy file binary Arduino compiled (`.bin`) langsung dari Web Dashboard tanpa perlu colok kabel USB ke kursi di mall:

### Prosedur Deploy OTA:
1. **Compile Binary di Arduino IDE:**  
   Buka [`smart_chair_esp32_v2.ino`](file:///home/rifpamks/Documents/Smart%20Kursi%20Pijat/smart-kursi-pijat-web/smart_chair_esp32/smart_chair_esp32_v2/smart_chair_esp32_v2.ino) ➔ Menu **Sketch ➔ Export Compiled Binary**.
2. **Buka Web Dashboard Admin:**  
   Masuk ke menu `/admin/chairs` ➔ Klik tombol **[Deploy Firmware (OTA)]**.
3. **Upload & Broadcast:**  
   - Pilih target kursi (`All Active Chairs` atau kursi spesifik).
   - Masukkan string versi baru (misal: `2.2.1`).
   - Pilih file `.bin`.
   - Klik **[Deploy OTA Update]**.
4. **Eksekusi Otomatis di Lapangan:**  
   - Backend mengunggah file ke Supabase Storage bucket `firmware` dan menyetel `ota_status = 'PENDING'`.
   - ESP32 yang sedang dalam mode `STATE_STANDBY` mendeteksi perintah tersebut dalam ~15 detik.
   - Layar TJC menampilkan tulisan `"UPDATING FW"`.
   - ESP32 mengunduh file `.bin` via HTTPS `HTTPUpdate`.
   - Begitu flashing 100% selesai, ESP32 mengirim status `SUCCESS` ke cloud lalu me-reboot dirinya sendiri (`ESP.restart()`).

---

## 7. 🧪 Testing & Quality Gates

Command verifikasi yang harus selalu dijalankan dan dipastikan hijau:

```bash
cd smart-kursi-pijat-web

# 1. Jalankan Seluruh Automated Unit Tests (51 Tests)
npm test

# 2. Jalankan TypeScript Typecheck & Production Build
npm run build

# 3. Jalankan End-to-End IoT Simulation Runner (9-Step State Machine)
node scripts/simulate-iot-flow.mjs --url=http://localhost:3000
```

---

## 8. 📂 Struktur File Terkait di Branch `feature/iot-esp32`

```text
smart-kursi-pijat-web/
├── docs/
│   ├── adr/
│   │   └── 003-dedicated-iot-controller-hub-esp32-tjc.md
│   ├── specs/
│   │   └── iot-esp32-ota-master-spec.md               <-- DOKUMEN INI
│   └── IOT_INTEGRATION_PROGRESS_AND_HANDOVER.md
├── scripts/
│   └── simulate-iot-flow.mjs                           <-- Runner E2E Virtual Hardware
├── smart_chair_esp32/
│   ├── smart_chair_esp32.ino                           <-- Firmware C++ ESP32 Standar
│   └── smart_chair_esp32_v2/
│       └── smart_chair_esp32_v2.ino                   <-- Firmware C++ ESP32 OTA V2
├── tjc_ui_assets/
│   ├── Sakura_TJC.HMI                                 <-- Project Source Layar TJC
│   ├── output/sakura_zen_4_3.tft                      <-- Binary TFT Layar Siap Flash
│   └── README.md
├── src/
│   ├── app/
│   │   ├── admin/chairs/page.tsx                      <-- UI Table Kursi & Modal OTA
│   │   ├── api/
│   │   │   ├── admin/chairs/ack/route.ts              <-- Handler ACK Telemetri
│   │   │   ├── admin/chairs/firmware/upload/route.ts  <-- API Upload & Storage OTA
│   │   │   ├── admin/chairs/firmware/status/route.ts  <-- API Status Telemetri OTA
│   │   │   ├── heartbeat/route.ts                     <-- Heartbeat Ping & Telemetri
│   │   │   ├── payments/create-qris/route.ts          <-- Dynamic QRIS Midtrans
│   │   │   ├── payments/status/route.ts               <-- Fast Polling Anti-Cache
│   │   │   └── payment/callback/route.ts              <-- Webhook Midtrans
│   ├── middleware.ts                                  <-- Whitelist Routes IoT
│   └── types/index.ts                                 <-- Typings: ClientDeviceType, OTA
└── tests/
    └── iot-endpoints.test.mjs                         <-- Contract Test Suite IoT
```
