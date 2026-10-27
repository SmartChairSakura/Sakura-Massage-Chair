# Panduan & Spesifikasi Antarmuka Layar Sentuh TJC HMI (USART HMI)

## 1. Spesifikasi Perangkat Keras Layar
* **Model Hardware:** TJC4880X243_011 (4.3 Inch Capacitive Touchscreen USART HMI)
* **Resolusi:** 480 × 272 Piksel
* **Tegangan Operasional:** 5V DC (Rekomendasi Adaptor Terpisah ≥ 2A)
* **Antarmuka Komunikasi:** UART Serial TTL (Logic Level 3.3V / 5V Tolerant)
* **Baudrate:** 9600 bps (8 data bits, no parity, 1 stop bit)
* **Format Terminator Serial:** 3 byte `0xFF 0xFF 0xFF` di akhir setiap string perintah.

---

## 2. Skema Pengkabelan (Wiring Diagram) ke ESP32

| Pin Layar TJC HMI | Pin ESP32 DevKit V1 | Keterangan |
| :--- | :--- | :--- |
| **+5V (Merah)** | **External 5V DC** | Hubungkan ke jalur power supply 5V stabil (jangan dari 3.3V ESP32) |
| **GND (Hitam)** | **GND** | Wajib *Common Ground* antara ESP32, Relay, dan Layar |
| **TX (Biru)** | **GPIO 16 (RXD2)** | Menerima sentuhan / event tombol dari layar ke ESP32 |
| **RX (Kuning)** | **GPIO 17 (TXD2)** | Mengirim data halaman, QR string, dan timer dari ESP32 ke layar |

---

## 3. Struktur Halaman UI (3-Screen State Flow)

```
┌─────────────────┐       Touch P1..P8       ┌─────────────────┐
│     page 0      │ ───────────────────────> │     page 1      │
│   Menu Paket    │ <─────────────────────── │   QRIS Display  │
└─────────────────┘      Cancel / Timeout    └─────────────────┘
         ▲                                            │ Payment
         │                 Session Done               │ Verified
         └────────────────────────────────────────────┴─────────────┐
                                                                    ▼
                                                             ┌─────────────────┐
                                                             │     page 2      │
                                                             │  Timer Berjalan │
                                                             └─────────────────┘
```

### A. Halaman 0 (`page 0`): Menu Pemilihan Paket
* Berisi 4 hingga 8 tombol paket durasi pijat (`b0` s/d `b7` atau `P1` s/d `P8`).
* Event Touch Release pada USART HMI editor mengirimkan string kode paket via UART:
  - Paket 1 (4 Menit / Rp 5.000 / 5 Pulsa): mengirimkan `P1`
  - Paket 2 (8 Menit / Rp 10.000 / 10 Pulsa): mengirimkan `P2`
  - Paket 3 (16 Menit / Rp 20.000 / 20 Pulsa): mengirimkan `P3`
  - Paket 4 (40 Menit / Rp 50.000 / 50 Pulsa): mengirimkan `P4`

### B. Halaman 1 (`page 1`): Tampilan QRIS Dinamis & Instruksi Bayar
* **Komponen `qr0` (QR Code Generator):**
  - **PENTING:** Atribut `txt_maxl` pada komponen `qr0` **WAJIB diatur ke nilai 500** (default software 80 char). Jika kurang dari 300, string EMVCo Midtrans (panjang ~249 karakter) akan terpotong dan QR code tidak dapat di-scan oleh aplikasi bank/e-wallet.
  - Perintah pengisian dari ESP32:
    ```
    qr0.txt="00020101021226670016ID.CO.MIDTRANS.WWW011893600914300000000002155000000000000005030336054050005802ID5910SMART_CHAIR6007JAKARTA63048F3A"\xFF\xFF\xFF
    ```
* **Komponen `t_cancel` (Tombol Batal):**
  - Mengirimkan string `CANCEL` atau `BATAL` ke ESP32.
  - ESP32 merespons dengan membatalkan pesanan di Cloud, membersihkan `qr0`, dan memindahkan layar kembali: `page 0\xFF\xFF\xFF`.
* **Auto-Cancel Timeout (180 Detik):**
  - Jika pelanggan tidak menyelesaikan pembayaran dalam 3 menit, ESP32 otomatis memicu pembatalan dan mengirim `page 0\xFF\xFF\xFF`.

### C. Halaman 2 (`page 2`): Timer Sesi Pijat Berjalan
* **Komponen `t_timer` (Teks Hitung Mundur):**
  - Menerima update string format `MM:SS` setiap 1 detik dari ESP32:
    ```
    t_timer.txt="03:59"\xFF\xFF\xFF
    t_timer.txt="03:58"\xFF\xFF\xFF
    ```
* **Status Selesai:**
  - Saat waktu habis (`00:00`), relay dimatikan, ACK status `done` dikirim ke backend, dan ESP32 mengirim `page 0\xFF\xFF\xFF`.

---

## 4. Prosedur Flashing Firmware Layar via MicroSD
1. Siapkan kartu MicroSD kapasitas 2 GB s/d 32 GB.
2. Format MicroSD menggunakan format **FAT32** (Allocation unit size: 4096 bytes).
3. Buka project di aplikasi **USART HMI Editor**, klik **Compile** untuk menghasilkan file biner `.tft`.
4. Salin file `.tft` (contoh: `Sakura_Kursi_Pijat_TJC_011.tft`) langsung ke direktori utama (root) kartu MicroSD (pastikan hanya ada 1 file `.tft` di MicroSD).
5. Lepaskan kabel power 5V dari layar TJC.
6. Masukkan kartu MicroSD ke slot kartu pada bagian belakang layar.
7. Hubungkan kembali kabel power 5V ke layar. Layar akan menampilkan progres flashing:
   ```
   SD Card Update...
   File size: xxxxxx bytes
   Successed!
   ```
8. Lepaskan power 5V, cabut MicroSD, lalu nyalakan kembali layar. UI siap beroperasi.

---

## 5. Tool Patch Bahasa Inggris USART HMI (1-Click Installer)

Jika editor USART HMI masih berbahasa Mandarin, gunakan tool installer patch otomatis yang sudah disediakan di:
👉 [`tools/usart_hmi_english_patch/`](../tools/usart_hmi_english_patch/)

**Cara Pakai:**
1. Masuk ke folder `tools/usart_hmi_english_patch/`
2. Klik ganda `install.bat` (atau klik kanan -> *Run as administrator*).
3. Seluruh antarmuka USART HMI langsung berubah 100% menjadi Bahasa Inggris!
