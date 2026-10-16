# ADR 002: Enterprise Admin Backoffice, Date Range Engine & Audit Architecture (Parkee CMS Standard)

- **Status:** Accepted
- **Deciders:** Lead Systems Architect & SupEng / TSE Team
- **Date:** 2026-10-16
- **Technical Context:** Smart Kursi Pijat Sakura — Backoffice Dashboard & Audit Log (`/admin/dashboard` & `/admin/tickets`)

---

## 1. Context & Business Problem

Pada implementasi awal backoffice Smart Kursi Pijat Sakura, operator dan manajemen menghadapi sejumlah kendala UI/UX dan konsistensi data:
1. **Status "Pending" Kosong:** Filter tiket "Pending" seringkali menampilkan 0 record karena transaksi QRIS yang tidak diselesaikan dalam 15 menit otomatis berstatus `expired` / `unpaid`. Operator membutuhkan tampilan sesi transaksi yang selesai (`DONE`) atau seluruh riwayat transaksi secara langsung.
2. **Kueri "All Time" Menghasilkan Rp 0:** Caching agresif Next.js Data Cache di serverless runtime Vercel serta tidak adanya penanganan eksplisit untuk rentang tak terbatas (`all`) menyebabkan kueri mengembalikan data kedaluwarsa atau kosong.
3. **Redundansi UI & Elemen "AI Slop":** Terdapat tombol refresh yang tersebar berlebihan (di header global, header kartu tiket, samping tombol search, dan filter bar dashboard) beserta timestamp detik (`HH:mm:ss WIB`) yang tidak memberikan nilai operasional.
4. **Horizontal Overflow / Potongan Tampilan di Desktop:** Popover date picker menggunakan orientasi `sm:left-0 sm:right-auto` pada elemen yang terletak di tepi kanan layar, menyebabkan popover melebar melewati batas kanan viewport desktop dan memicu scroll horizontal yang memotong tombol *Apply Filter*.

---

## 2. Decisions & Architectural Specifications

### A. Adopsi Popover Tanggal Standar Parkee CMS (`DatePickerModal`)
**Keputusan:** Menggantikan tombol preset yang tersebar dengan popover terpadu berpanel ganda yang diadaptasi dari Parkee CMS:
- **Panel Presets:** `TODAY`, `YESTERDAY`, `THIS WEEK`, `LAST WEEK`, `THIS MONTH`, `LAST MONTH`, dan `ALL TIME`.
- **Panel Presisi Tanggal & Jam:** Input tanggal mulai (`00:00`) dan tanggal selesai (`23:59`) dengan ringkasan pill seleksi aktif.
- **Preset `ALL TIME`:** Secara eksplisit mengirimkan parameter `range=all` yang menghasilkan batas kueri `{ startIso: null, endIso: null }` di Supabase, memastikan seluruh data historis dari awal operasional terhitung tanpa filter waktu.

### B. Eliminasi Redundansi Refresh & Clutter
**Keputusan:** Menghapus seluruh tombol refresh internal dan timestamp detik di halaman admin:
- Dihapus dari `AdminHeader.tsx` (top navigation bar).
- Dihapus dari `dashboard/page.tsx` (filter bar & timestamp).
- Dihapus dari `tickets/page.tsx` (header card & reset icon di samping search).
- **Rasional:** Aplikasi web modern memanfaatkan mekanisme auto-fetch saat filter berubah dan browser refresh bawaan, sehingga tombol refresh manual di dalam halaman merupakan clutter yang menurunkan kualitas visual.

### C. Standarisasi Status Tiket Enterprise
**Keputusan:** Mengadopsi pemetaan multi-status standar Parkee CMS:
- **`ALL STATUS`:** Menampilkan seluruh status tiket tanpa batasan (`null` query filter).
- **`DONE`:** Memetakan status sukses (`done`, `completed`, `paid`).
- **`INPROCESS`:** Memetakan sesi pijat yang sedang berlangsung (`ongoing`, `session_inprocess`).
- **`WAITING`:** Memetakan tiket yang masih menunggu scan QR (`pending`, `waiting`).
- **`UNPAID`:** Memetakan tiket yang hangus atau gagal dibayar (`expired`, `failed`, `cancelled`, `unpaid`).

### D. Zero Horizontal Overflow & Responsivitas Mobile
**Keputusan:** Menerapkan strategi pemosisian popover berbasis adaptive breakpoint:
- **Desktop (`>= 640px`):** Menggunakan `sm:absolute sm:top-full sm:right-0 sm:left-auto sm:w-[540px]`. Popover terkunci di sisi kanan trigger dan berekspansi ke arah kiri, menjamin modal berada 100% di dalam layar tanpa memotong panel preset atau tombol aksi.
- **Mobile Phone (`< 640px`):** Menggunakan `fixed inset-x-3 top-20 z-50 max-h-[88vh] overflow-y-auto` dengan backdrop overlay `fixed inset-0 bg-black/25 backdrop-blur-xs`. Modal terpusat rapi dengan margin 12px di sisi kiri dan kanan, menghindari overflow di semua resolusi smartphone (misal iPhone 14: 390px).

### E. Penonaktifan Cache Serverless Next.js 14
**Keputusan:**
1. Menambahkan wrapper `global.fetch` dengan opsi `cache: 'no-store'` pada instans klien `supabaseServer` di `src/lib/supabase-server.ts`.
2. Menetapkan konstanta route handler:
   ```ts
   export const dynamic = 'force-dynamic';
   export const revalidate = 0;
   export const fetchCache = 'force-no-store';
   ```
3. Mengembalikan header respon `Cache-Control: no-store, no-cache, must-revalidate` pada endpoint `/api/admin/tickets` dan `/api/admin/dashboard`.

---

## 3. Verifikasi & Pengujian Visual (DevTools MCP & Automation)

Pengujian dilakukan menggunakan headless browser Chrome (`puppeteer-core`) dengan metrik bounding box DOM riil:

| Target Uji | Resolusi | Bounding Box Modal | `isCutOffRight` | `hasHorizontalScroll` | Hasil |
|---|---|---|---|---|---|
| Desktop Dashboard | 1920 x 1080 | Left: 1327px, Right: 1867px | **False** | **False (1920px)** | **PASS** |
| Desktop Tickets | 1920 x 1080 | Left: 1052px, Right: 1592px | **False** | **False (1920px)** | **PASS** |
| Mobile Dashboard | 390 x 844 | Left: 12px, Right: 378px, Width: 366px | **False** | **False (390px)** | **PASS** |
| Mobile Tickets | 390 x 844 | Left: 12px, Right: 378px, Width: 366px | **False** | **False (390px)** | **PASS** |

---

## 4. Consequences & Impact

- **Positif:** Antarmuka bersih, modular, berstandar enterprise seperti CMS Parkee, dan sepenuhnya responsif di semua perangkat.
- **Positif:** Data omset, bagi hasil 95% pemilik, dan riwayat tiket 100% akurat tanpa tertahan cache server.
- **Pemeliharaan:** Pengembang berikutnya dapat merujuk ke komponen reusable `DatePickerModal.tsx` untuk setiap kebutuhan filter rentang tanggal/jam di modul admin lainnya.
