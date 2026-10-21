# ADR 003: Dedicated IoT Controller Hub (ESP32 DevKit V1 + TJC HMI 4.3") & Cloud Backend Dual-Track Architecture

## Status
**Accepted & Implemented on branch `feature/iot-esp32`** (2026-10-21)

## Context & Problem Statement
Sistem Smart Kursi Pijat Tokuyo awalnya dioperasikan menggunakan tablet Android komersial yang terhubung ke relay USB LCUS via kabel OTG (CH340). Meskipun secara fungsional software berjalan lancar, pengoperasian jangka panjang di lapangan (mal dan ruang publik 24/7) menemukan sejumlah kendala fisik kritis:
1. **Pencabutan Izin USB OTG Otomatis (*Android Permission Dropouts*):** OS Android secara berkala mencabut izin akses USB port saat perangkat idle atau reboot otomatis. Akibatnya, relay gagal memicu pulsa ke kursi pijat meskipun pembayaran QRIS telah lunas.
2. **Risiko Termal & Baterai Kembung (*Battery Bloating*):** Tablet Android komersial yang terhubung ke charger AC 220V terus-menerus selama 24 jam/hari berisiko tinggi mengalami degradasi baterai lithium, kembung, hingga bahaya kebakaran.
3. **Biaya Pengadaan Tinggi (*Capex*):** Pengadaan tablet Android berkisar antara Rp 1.500.000 – Rp 3.000.000 per unit kursi.
4. **Waktu Booting Lambat:** Pemadaman listrik sesaat di mal menyebabkan jeda booting Android 30–60 detik sebelum kursi siap melayani pelanggan kembali.

Dibutuhkan perangkat keras kelas industri yang tangguh (*industrial grade*), bebas risiko baterai (*zero battery*), berbiaya rendah (< Rp 300.000), instan menyala (< 1 detik), dan memiliki sinkronisasi data yang seamless dengan Cloud Backend Next.js 14, Supabase, dan Midtrans.

## Decision Drivers
- **Keandalan Eksekusi Fisik:** Relay wajib memicu pulsa dengan keandalan 99.99% tanpa risiko terblokir sistem operasi.
- **Efisiensi Capex:** Penurunan biaya perangkat keras >85% per kursi.
- **Ketahanan Operasional 24/7:** Bebas baterai kimia, tahan suhu tinggi, didukung Hardware Watchdog Timer (WDT).
- **Kompatibilitas Cloud Tunggal:** Menggunakan master database Supabase yang sama dengan platform Android bawaan di branch `main`.

## Considered Options
1. **Opsi A (Status Quo):** Tetap menggunakan Tablet Android Kiosk di semua titik.
2. **Opsi B (Hard Switch):** Mengganti seluruh kode repositori langsung ke ESP32 dan menghapus Kiosk Android.
3. **Opsi C (Dual-Track Monorepo - Terpilih):** Menjaga branch `main` tetap bersih dan stabil sebagai jalur produksi default (Android Kiosk & Admin Backoffice), sembari mengembangkan arsitektur Dedicated IoT Controller pada branch terisolasi `feature/iot-esp32`.

## Decision Outcome
Dipilih **Opsi C (Dual-Track Architecture via branch `feature/iot-esp32`)**:

### 1. Perangkat Keras Controller (Dedicated IoT Hub)
- **Mikrokontroler:** ESP32 DOIT DevKit V1 (38-pin, Dual Core 240MHz, WiFi 2.4GHz + Bluetooth).
- **Layar Sentuh Interaktif:** TJC4880X243_011 (4.3 Inch Capacitive Touchscreen USART HMI, 480×272, 9600 baud, TTL UART via GPIO 16/17).
- **Modul Relay Optocoupler:** 1-Channel 5V Relay with optocoupler isolation, Normally Open (NO) & COM dihubungkan paralel ke kabel sinyal koin Socket J3 Kursi Tokuyo (GPIO 23).
- **Timing Pulsa:** 200ms Active HIGH, 150ms Pause LOW (Tokuyo Coin Ratio: 5 pulsa = 4 menit).

### 2. Dual-Core Firmware Architecture (Arduino C++)
- **Core 1 (UI & Hardware Pulse):** Mengelola rendering layar USART HMI via Serial2 dan timing pulsa relay tanpa interupsi.
- **Core 0 (Network & Polling):** Menangani koneksi WiFi, request Dynamic QRIS via HTTPS, dan polling status pembayaran setiap 2.5 detik.

### 3. Backend Endpoints (Next.js 14 App Router)
- `GET /api/payments/status?orderId={id}`: Fast status polling endpoint ultra-ringan dengan header anti-cache mutlak (`Cache-Control: no-store, no-cache`).
- `POST /api/payments/create-qris`: Mendukung pembuatan order dari `created_from: 'IOT_KIOSK'` dan menjamin ketersediaan raw EMVCo payload (`qr_string`) untuk komponen `qr0` layar TJC.
- `POST /api/heartbeat`: Telemetri kesehatan perangkat keras (`rssi`, `ip_address`, `firmware_version`, `status`).

## Consequences

### Positif
- **Zero Battery Risk:** Bebas dari baterai kembung dan risiko termal di ruang publik.
- **Penghematan Biaya:** Belanja modal hardware turun dari ~Rp 2.500.000 menjadi ~Rp 250.000 per kursi.
- **Instan Boot:** Siap melayani pelanggan dalam < 1 detik setelah listrik hidup.
- **Branch `main` Aman:** Jalur produksi Kiosk Android dan CMS Backoffice tetap 100% stabil tanpa risiko regresi.

### Kompromi / Mitigasi
- **Dual Firmware Maintenance:** Kode Arduino C++ (`smart_chair_esp32.ino`) dan Web Kiosk dikelola bersama.
  *Mitigasi:* Monorepo structure menyatukan firmware di folder `smart_chair_esp32/` di bawah version control Git yang sama.
- **RAM Mikrokontroler Terbatas:** ESP32 tidak dapat menjalankan WebSocket client yang berat.
  *Mitigasi:* Endpoint fast polling `GET /api/payments/status` menghasilkan payload JSON sangat kecil (<150 bytes) yang mudah diurai dengan `ArduinoJson`.
