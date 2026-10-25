# Task Checklist: Ticket Management (`/admin/tickets`) Overhaul

- [x] **Task 1: Add `export=true` Support & Filter Optimization in `/api/admin/tickets/route.ts`**
  - **Description:** Enhance `/api/admin/tickets/route.ts` to support unpaginated querying when `export=true` is requested. Streamline `applyTicketFilters` to remove obsolete `PHONE` search, focusing on `chair_slip_number` and `chair_code`.
  - **Acceptance criteria:**
    - [x] When `export=true` is passed, returns all matching transactions without page slicing (up to 10,000 items).
    - [x] `searchBy` handles `ALL`, `TICKET_NUMBER`, `CHAIR_CODE` efficiently.
    - [x] Summary KPIs and count remain accurate.
  - **Verification:**
    - [x] Tested API endpoint with `export=true`; verified full array returned.
    - [x] Run `npm test` (59/59 passed).
  - **Dependencies:** None
  - **Files touched:** `src/app/api/admin/tickets/route.ts`

- [x] **Task 2: Overhaul Full-Dataset CSV Export in `src/app/admin/tickets/page.tsx`**
  - **Description:** Re-implement `handleExportCSV` to query the API with active filters and `export=true` instead of taking the 15-item paginated state. Add loading state spinner to button during export generation.
  - **Acceptance criteria:**
    - [x] Export to CSV downloads all records in the active date/status filter, not just the current page.
    - [x] Button shows `<Loader2 className="animate-spin" /> Exporting...` while downloading.
    - [x] CSV columns include cleanly formatted Indonesian timestamps (`YYYY-MM-DD HH:mm:ss WIB`) and UTF-8 BOM.
  - **Verification:**
    - [x] Unit test verified `query.set('export', 'true')` contract.
  - **Dependencies:** Task 1
  - **Files touched:** `src/app/admin/tickets/page.tsx`

- [x] **Task 3: Streamline "Show by" Filter & Remove `CUSTOMER_PHONE`**
  - **Description:** Remove `PHONE` (`CUSTOMER_PHONE`) option from `Show by` selector. Format raw snake_case enums into human labels: `"All Fields"`, `"Ticket Number"`, `"Chair Code"`. Update DatePickerModal trigger label to `"Date"`.
  - **Acceptance criteria:**
    - [x] Dropdown options are: `All Fields`, `Ticket Number`, `Chair Code`.
    - [x] Search input placeholder dynamically reflects the selected option.
    - [x] Date picker label displays `Date: ...` instead of `Checkout Date: ...`.
  - **Verification:**
    - [x] Verified via unit test suite.
  - **Dependencies:** None
  - **Files touched:** `src/app/admin/tickets/page.tsx`, `tests/dashboard-copywriting.test.mjs`

- [x] **Task 4: Typography Hierarchy & Status Badges Polish in `page.tsx`**
  - **Description:** Implement 3-tier font weight scale across `/admin/tickets`. Eliminate mass `font-black`/`font-extrabold` in table, KPI cards, and badges. Polish status badges to match the Sakura Zen design palette.
  - **Acceptance criteria:**
    - [x] Header uses `text-xl font-semibold text-[#1B1C1C]`.
    - [x] KPI cards use `text-2xl font-bold` for values and `text-[10px] font-semibold text-gray-500` for labels.
    - [x] Table headers use `text-[11px] font-semibold uppercase text-gray-500 tracking-wider`.
    - [x] Status badges use clean Sakura Zen / semantic colors with consistent padding and typography.
    - [x] Retain all copywriting test strings (`Export to CSV`, `Slip Number`, `Date & Time`, `Customer`).
  - **Verification:**
    - [x] `npm test` passes 100% (59/59).
  - **Dependencies:** None
  - **Files touched:** `src/app/admin/tickets/page.tsx`

- [x] **Task 5: End-to-End Regression Testing & Documentation Sync**
  - **Description:** Run all test suites, compile production build, generate audit report artifact, and mirror to Windows.
  - **Acceptance criteria:**
    - [x] `npm test` passes all 59 tests.
    - [x] `npm run build` compiles with code 0.
    - [x] Audit report created in brain artifacts and synced to `C:\Users\rifal\Downloads\TICKET_MANAGEMENT_AUDIT_REPORT.md`.
  - **Verification:**
    - [x] Remote commit and push to `feature/iot-esp32`.
  - **Dependencies:** Tasks 1-4
  - **Files touched:** `smart-kursi-pijat-web/`
