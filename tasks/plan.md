# Implementation Plan: Ticket Management (`/admin/tickets`) Audit & Overhaul

## Overview
Comprehensive overhaul of the Ticket Transaction History page (`/admin/tickets`), addressing all defects identified in user audit of `Screenshot_95.jpg` and `Screenshot_96.jpg`. The scope includes:
1. **Full-Dataset CSV Export:** Fixing the critical bug where CSV export only downloads the current page (15 rows) instead of all records matching the active date filter and search query.
2. **Filter Controls Optimization:** Removing obsolete `CUSTOMER_PHONE` from the `Show by` selector; formatting raw snake_case enums (`TICKET_NUMBER`, `CHAIR_CODE`) into clean human labels (`Ticket Number`, `Chair Code`, `All Fields`).
3. **Typography & Semantic Palette:** Adopting the 3-tier font weight scale, eliminating ubiquitous `font-black`/`font-extrabold`, and polishing status badges (DONE, INPROCESS, WAITING, UNPAID/EXPIRED).
4. **Date Filter & Timezone Precision:** Harmonizing date filter triggers (renaming `"Checkout Date"` to `"Date"` / `"Transaction Date"`), full WIB timezone sync, and date preset integrity.

---

## Architecture Decisions

1. **Full Dataset Export Pattern (`export=true`):**
   - When the user clicks `Export to CSV`, the application will NOT export the truncated client-side 15-item `tickets` state.
   - Instead, the client queries `/api/admin/tickets?export=true&...` with identical active filter parameters (`location_id`, `status`, `date_from`, `date_to`, `time_from`, `time_to`, `range`, `search`, `search_by`).
   - The API will query the entire matching set (up to 10,000 records) without page limit/offset slicing, returning all matching transactions.
   - The CSV generator will format clean Indonesian/WIB timestamps (`YYYY-MM-DD HH:mm:ss WIB`), formatted currency (`Rp XX.XXX`), and clean status strings.

2. **Show By Filter Simplification:**
   - In massage chair operations, transactions are 100% self-service QRIS without customer phone capture (all customer records are `GUEST`).
   - Remove `CUSTOMER_PHONE` / `PHONE` option from the `Show by` dropdown selector.
   - Supported selectors:
     - `ALL`: `"All Fields"` (searches Ticket Slip Number & Chair Code)
     - `TICKET_NUMBER`: `"Ticket Number"`
     - `CHAIR_CODE`: `"Chair Code"`
   - Provide intuitive, context-aware input placeholders.

3. **3-Tier Typography & Status Badging:**
   - **Header:** `text-xl font-semibold text-[#1B1C1C]`
   - **KPI Summary Cards:** Values `text-2xl font-bold text-[#1B1C1C]` (Net Payout in `text-[#0F6E56]`), labels `text-[10px] font-semibold text-gray-500 uppercase tracking-wider`.
   - **Table Headers:** `text-[11px] font-semibold uppercase text-gray-500 tracking-wider bg-[#F5F3F3]`
   - **Table Rows:** Slip number `font-mono text-xs font-semibold text-[#795465]`, Date `text-xs text-gray-600`, Amount `font-semibold text-sm text-[#1B1C1C]`.
   - **Status Badges:**
     - `DONE`: `bg-[#E1F5EE] text-[#0F6E56]`
     - `INPROCESS`: `bg-blue-50 text-blue-700 border border-blue-200`
     - `WAITING`: `bg-amber-50 text-amber-800 border border-amber-200`
     - `UNPAID / EXPIRED`: `bg-[#FCEBEB] text-[#A32D2D]`

4. **Copywriting Contract Compliance:**
   - Retain all assertions required by `tests/dashboard-copywriting.test.mjs`:
     `Export to CSV`, `Slip Number`, `Date & Time`, `Customer`.

---

## Task List

### Phase 1: Backend Precision & Full-Dataset Export API
- [ ] **Task 1: Add `export=true` Support to `/api/admin/tickets/route.ts`**
  - Implement unpaginated data retrieval when `export=true` is present in query parameters.
  - Remove `PHONE` search branch; optimize `searchBy` to target `chair_slip_number` and `chair_code`.
  - Add optional `date_type` parameter (`created_at` vs `updated_at`) consistent with sales dashboard.
  - *Verification:* Query `/api/admin/tickets?export=true&range=this_month`; verify returns complete dataset matching the month without 15-item limit.

### Checkpoint 1: Backend
- [ ] API endpoint supports both paginated browser browsing (`limit=15`) and full-dataset export (`export=true`).
- [ ] Unit tests pass: `npm test`.

---

### Phase 2: Frontend Filter Overhaul & Full CSV Export
- [ ] **Task 2: Overhaul CSV Export Flow in `src/app/admin/tickets/page.tsx`**
  - Replace `tickets.forEach` with an async fetch to `/api/admin/tickets?export=true&...`.
  - Add visual loading spinner state on the "Export to CSV" button (`isExporting`).
  - Format CSV rows with clean timestamps, clean currency values, and accurate metadata.
  - *Verification:* Filter a date range with > 15 tickets, click Export; verify CSV contains all records across all pages.

- [ ] **Task 3: Streamline "Show by" Selector & Remove `CUSTOMER_PHONE`**
  - Update `searchBy` state and dropdown options: `"All Fields"`, `"Ticket Number"`, `"Chair Code"`.
  - Update dynamic input placeholder based on selection.
  - Update DatePickerModal trigger label from `"Checkout Date"` to `"Date"`.
  - *Verification:* Open dropdown; verify `CUSTOMER_PHONE` is gone, labels are title-cased.

- [ ] **Task 4: Typography Hierarchy & Status Badges Polish**
  - Replace `font-black`/`font-extrabold` in KPI cards, table headers, and table cells with the 3-tier hierarchy.
  - Standardize status badge styles and colors.
  - *Verification:* Visual check; typography matches Sales Summary standards.

### Checkpoint 2: UI & Export
- [ ] CSV exports 100% of records in selected date range.
- [ ] Show by dropdown is clean without customer phone.
- [ ] Typography follows 3-tier standard.
- [ ] Tests pass: `npm test`.

---

### Phase 3: Verification & Documentation
- [ ] **Task 5: End-to-End Regression & Audit Report Sync**
  - Execute full test suite `npm test` (57+ tests).
  - Execute Next.js build `npm run build` (code 0).
  - Generate comprehensive audit report artifact and sync to Windows `C:\Users\rifal\Downloads\TICKET_MANAGEMENT_AUDIT_REPORT.md`.
  - *Verification:* Remote commit & push to `feature/iot-esp32`.

### Checkpoint: Complete
- [ ] All tickets audit points resolved and verified.
