# Task Checklist: Multi-Location Chair Management & Pairing

- [ ] Task 1: API Endpoint Chair CRUD (`/api/admin/chairs/route.ts`)
  - Acceptance: GET & POST endpoint for managing registered chairs in Supabase.
  - Verify: Fetch chairs array & insert test chair.
  - Files: `src/app/api/admin/chairs/route.ts`

- [ ] Task 2: Kiosk Initial Pairing Screen (`/setup`)
  - Acceptance: Layar setup bagi teknisi untuk memilih `Chair ID` (e.g. `SAKURA-GI-01`) & mengunci di `localStorage`.
  - Verify: Pairing in browser & check `localStorage`.
  - Files: `src/app/setup/page.tsx`, `src/components/KioskHeader.tsx`, `src/app/page.tsx`

- [ ] Task 3: Modal "+ Tambah Unit Kursi Baru" in Admin Dashboard
  - Acceptance: Admin dapat menambah unit & lokasi cabang baru dari UI `/admin`.
  - Verify: Test modal submission in `/admin`.
  - Files: `src/app/admin/page.tsx`

- [ ] Task 4: Multi-Location Filter in Admin Dashboard Analytics
  - Acceptance: Filter omset & transaksi berdasarkan cabang (All, GI, CP, MOI).
  - Verify: Select branch filter & verify analytics numbers update.
  - Files: `src/app/admin/page.tsx`, `src/app/api/admin/dashboard/route.ts`
