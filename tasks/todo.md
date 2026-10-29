# Task Breakdown & Checklist: Chair List, Edit Chair, & Firmware OTA UI/UX Overhaul

## Task 1: Backend API Security, Archive Restoration, & Safe OTA Controls
**Description:** Harden `/api/admin/chairs/route.ts` so `GET` masks `pin` (`pin_masked: '••••••'`, `has_default_pin: boolean`) and supports `include_archived=true`, while `POST`/`PATCH` support audited `REVEAL_PIN`, archive restoration (`deleted_at: null, is_active: true`), `CANCEL_OTA`, and `ROLLBACK_OTA`. Enhance `/api/admin/chairs/firmware/upload/route.ts` with SemVer validation, 1.5 MB size limit, server-side SHA-256 checksum, and canary/staged/selected target resolution.

**Acceptance criteria:**
- [x] `GET /api/admin/chairs` does not expose plaintext `pin` in list items; returns `pin_masked: '••••••'` and `has_default_pin: boolean`.
- [x] `POST /api/admin/chairs` with `action: 'REVEAL_PIN'` verifies admin session, logs audit event, and returns the chair's PIN.
- [x] `PATCH /api/admin/chairs` supports restoring archived chairs (`deleted_at: null, is_active: true`), cancelling pending OTA (`ota_status: 'IDLE', target_firmware_version: null`), and rolling back firmware.
- [x] `POST /api/admin/chairs/firmware/upload` validates SemVer (`/^\d+\.\d+\.\d+$/`), enforces max file size `1,572,864` bytes (1.5 MB), computes SHA-256 checksum, and supports `strategy` (`canary` | `staged` | `all`) and `chair_ids`.

**Verification:**
- [x] Tests pass: `node --test tests/chair-list-uiux.test.mjs`
- [x] Build succeeds: `npm run build`

**Dependencies:** None

**Files likely touched:**
- `src/app/api/admin/chairs/route.ts`
- `src/app/api/admin/chairs/firmware/upload/route.ts`
- `src/types/index.ts`

**Estimated scope:** Medium (3 files)

---

## Task 2: Route Unification & Global LocationSelector Synchronization
**Description:** Eliminate the duplicate Indonesian chair list page at `/admin/locations/[locationId]/chairs/page.tsx` by converting it to a redirect to `/admin/chairs?location=<locationId>`. Update `/admin/locations/page.tsx` Fleet Size link and synchronize `LocationSelector.tsx` and `AdminHeader.tsx` so URL query params (`location` / `location_id`), header selector, and active sidebar menu are always in sync.

**Acceptance criteria:**
- [x] `src/app/admin/locations/[locationId]/chairs/page.tsx` redirects to `/admin/chairs?location=${params.locationId}`.
- [x] `LocationSelector.tsx` reads `searchParams.get('location') || searchParams.get('location_id') || 'ALL'` and updates the query parameter cleanly.
- [x] `/admin/locations/page.tsx` Fleet Size link navigates to `/admin/chairs?location=${loc.id}`.

**Verification:**
- [x] Tests pass: `node --test tests/chair-list-uiux.test.mjs`
- [x] Build succeeds: `npm run build`

**Dependencies:** Task 1

**Files likely touched:**
- `src/app/admin/locations/[locationId]/chairs/page.tsx`
- `src/app/admin/locations/page.tsx`
- `src/components/admin/LocationSelector.tsx`
- `src/components/admin/AdminHeader.tsx`

**Estimated scope:** Medium (4 files)

---

## Checkpoint 1: Foundation & Routing
- [x] API security and OTA validation rules in place
- [x] Single unified route `/admin/chairs` synchronized with `LocationSelector`

---

## Task 3: Core UI Sub-Components (`Field`, `PinField`, `StatusCell`, `FirmwareCell`)
**Description:** Implement the reusable accessible sub-components in `/admin/chairs/page.tsx`: `<Field>` (consistent sentence-case 13px/500 label without colons), `<PinField>` (masked numeric 6-digit input with show/hide toggle and random PIN generator), `<StatusCell>` (5 device states: `Online`, `In use`, `Offline`, `Updating`, `Error` with semantic dot + relative `Last seen` heartbeat via `Intl.RelativeTimeFormat`), and `<FirmwareCell>` (single-line `current → target` + `Waiting standby` badge + `Cancel` / `Rollback` buttons).

**Acceptance criteria:**
- [x] `<PinField>` uses `type={show ? 'text' : 'password'}`, `inputMode="numeric"`, `maxLength={6}`, `pattern="\d{6}"`, digit sanitization, and `<Eye />` / `<EyeOff />` button with `aria-pressed`.
- [x] `<StatusCell>` renders all 5 states (`Online`, `In use`, `Offline`, `Updating`, `Error`) with colored dots and `<time>` relative heartbeat (`Last seen ...`).
- [x] `<FirmwareCell>` renders on a single line (`whitespace-nowrap`) with `--warn` (`#8A5A00`) on `--warn-bg` (`#FFF3D6`) for `Waiting standby` and inline `Cancel` / `Rollback` actions.
- [x] Zero `font-extrabold` or ALL-CAPS labels with colons.

**Verification:**
- [x] Tests pass: `node --test tests/chair-list-uiux.test.mjs`

**Dependencies:** Task 1

**Files likely touched:**
- `src/app/admin/chairs/page.tsx`

**Estimated scope:** Small (1 file)

---

## Task 4: Chair List Table, Orthogonal Filters, Bulk Selection & Detail Drawer
**Description:** Overhaul the main `/admin/chairs/page.tsx` layout: replace the bloated header card with a compact header row (secondary `"Deploy firmware"` button instead of `#1B1C1C` black button, primary `"Add Chair"` button with single `<Plus />`), replace the duplicate location filter in the toolbar with **Status** and **Firmware** `AppSelect` dropdowns + **Active / Archived** view toggle, add natural alphanumeric sorting (`SAKURA-LWGWB-04` before `-05`) with `aria-sort`, add row selection checkboxes + Bulk Action Bar (`Deploy firmware to N chairs`, `Move branch`), make `Chair Code` open a **Chair Detail & Telemetry Modal/Drawer** (with audited PIN reveal), and replace permanent red delete icons with 40x40px neutral **Archive** actions + 8-second Undo toast (`aria-live="polite"`).

**Acceptance criteria:**
- [x] Header has no card wrapper, no `<Armchair />` in `H1`, secondary white/bordered `"Deploy firmware"` button, and single `<Plus />` in `"Add Chair"`.
- [x] Table toolbar has Search + Status `AppSelect` + Firmware `AppSelect` + Active/Archived pill (no duplicate Location dropdown).
- [x] Default sort uses natural alphanumeric comparison on `Chair Code`; columns have `<th scope="col" aria-sort="...">`.
- [x] Table PIN column shows `••••••` (plus `"Default PIN"` warning badge if applicable) and never exposes raw PIN in table HTML.
- [x] Clicking `Chair Code` opens the Chair Detail & Telemetry Drawer/Modal where PIN can be explicitly revealed (logged) and copied.
- [x] Archiving a chair triggers an 8-second Undo toast (`aria-live="polite"`) and moves the chair to the Archived view.

**Verification:**
- [x] Tests pass: `node --test tests/chair-list-uiux.test.mjs`

**Dependencies:** Task 2, Task 3

**Files likely touched:**
- `src/app/admin/chairs/page.tsx`

**Estimated scope:** Small (1 file)

---

## Checkpoint 2: Table & Telemetry UX
- [x] All table columns, filters, bulk actions, detail drawer, and archive undo flows work end-to-end

---

## Task 5: Overhaul Add/Edit Chair Modal & Safe Deploy Firmware OTA Modal
**Description:** Overhaul both modals in `/admin/chairs/page.tsx` for WCAG 2.2 AA compliance, keyboard accessibility, and operational safety.

**Acceptance criteria:**
- [x] Add/Edit Chair modal uses `AppSelect` for `Hardware Model` and `Branch location`, `<PinField>` for `Terminal PIN`, and `<Lock />` + explanation for disabled `Chair Code`.
- [x] Changing `Branch location` when editing shows an inline impact warning; saving shows a toast with `Undo`.
- [x] `"Save Changes"` is disabled when `!isDirty`, and closing a dirty modal prompts `"Discard unsaved changes?"`.
- [x] Deploy Firmware OTA modal defaults to `'SELECTED'` / single chair (not `'ALL'`), includes strategy selector (`canary`, `staged`, `all`), validates SemVer > installed, displays `.bin` name + KB size + SHA-256 + `"Replace file"`, requires typing `DEPLOY` when targeting fleet/bulk, and shows `"Deploy {version} to {N} chair(s)"` in `--brand`.

**Verification:**
- [x] Tests pass: `node --test tests/chair-list-uiux.test.mjs`
- [x] Build succeeds: `npm run build`

**Dependencies:** Task 3, Task 4

**Files likely touched:**
- `src/app/admin/chairs/page.tsx`

**Estimated scope:** Small (1 file)

---

## Task 6: Automated Verification Suite (`tests/chair-list-uiux.test.mjs`) & Final Build
**Description:** Create a comprehensive automated test suite `tests/chair-list-uiux.test.mjs` asserting all 18 checklist items from Section 13 of `CHAIR_LIST_UIUX_AUDIT.md`, verify compatibility with all existing test suites (`tests/*.test.mjs`), and run a full production build (`npm run build`).

**Acceptance criteria:**
- [x] `tests/chair-list-uiux.test.mjs` tests all 18 checklist items from Section 13 of `CHAIR_LIST_UIUX_AUDIT.md`.
- [x] `node --test tests/*.test.mjs` passes 100% with 0 failures (92/92 tests pass).
- [x] `npm run build` compiles all routes with 0 TypeScript or Next.js errors.

**Verification:**
- [x] `node --test tests/*.test.mjs`
- [x] `npm run build`

**Dependencies:** Task 1, Task 2, Task 3, Task 4, Task 5

**Files likely touched:**
- `tests/chair-list-uiux.test.mjs`
- `tests/dashboard-copywriting.test.mjs`

**Estimated scope:** Small (2 files)

---

## Checkpoint 3: Complete
- [x] All 18 audit items from `CHAIR_LIST_UIUX_AUDIT.md` verified
- [x] Ready for human review / execution

---

## Task 7: QRIS 3-Minute Expiry & Session End Lifecycle Hardening (IoT ESP32 & EDC)
**Description:** Configure Midtrans dynamic QRIS charge to expire in 3 minutes (`expiry_duration: 3, unit: 'minute'`). Enforce database lifecycle: `pending` -> `paid` -> `session_inprocess` -> `done`. Ensure `session_end_at` is guaranteed populated whenever status becomes `done` or `cancelled`, backfill missing start times via duration offset, auto-complete abandoned `session_inprocess` and auto-heal null `session_end_at` in `/api/cron/reconcile` (4-minute window), and synchronize NTP time with ISO timestamps in ESP32 firmware for Direct Supabase ACK fallback.

**Acceptance criteria:**
- [x] `src/lib/midtrans.ts` specifies `custom_expiry: { expiry_duration: 3, unit: 'minute' }`.
- [x] `/api/admin/chairs/ack` sets `session_end_at = now` when `done`, and falls back to `now - duration` if `session_start_at` was missing.
- [x] `/api/cron/reconcile` auto-expires pending slips after 4 minutes, auto-completes abandoned `session_inprocess` slips, and auto-heals slips with `status = 'done' AND session_end_at IS NULL`.
- [x] `/api/webhooks/payment` maps `PAID` to `paid` and guarantees `session_end_at` if set to `done`.
- [x] `session/[orderId]/page.tsx` emits `status_event: 'session_inprocess'` on mount and `status_event: 'done'` on finish or cancellation.
- [x] ESP32 firmware (`smart_chair_esp32_v2.ino` & `smart_chair_esp32.ino`) synchronizes NTP time (`configTime`) and attaches ISO timestamps (`session_end_at`) during Supabase direct patch.

**Verification:**
- [x] `node --test tests/*.test.mjs` (97/97 tests pass)
- [x] `npm run build` (30/30 pages compile cleanly)

---

## Task 8: Backend API Financial Enrichment & Location Context
**Description:** Enhance `src/app/api/admin/tickets/route.ts` to return granular financial settlement fields (`gross_sales`, `mdr_fee`, `platform_fee`, `net_payout`, `payment_status`, `pg_ref_number`) and location metadata (`location_name`, `location_code`) for each ticket, resolving via joined `chair_slip_payments` or deterministic business calculation.

**Acceptance criteria:**
- [x] Ticket objects return `gross_sales`, `mdr_fee`, `platform_fee`, and `net_payout`.
- [x] Unpaid / Expired / Cancelled tickets have `mdr_fee: 0`, `platform_fee: 0`, and `net_payout: 0`.
- [x] Paid / Done tickets compute `mdr_fee = round(gross * 0.007)`, `platform_fee = round(gross * 0.05)`, and `net_payout = gross - mdr - platform_fee` (unless explicit payment record exists).
- [x] Tickets payload includes `location_name` and `location_code` (resolved via `locations` / `chairs`).

**Verification:**
- [x] API returns 200 with enriched ticket objects.
- [x] Tests pass: `node --test tests/tickets-financial-breakdown.test.mjs`

**Dependencies:** None
**Files likely touched:** `src/app/api/admin/tickets/route.ts`
**Estimated scope:** Small (1 file)

---

## Task 9: UI Table Separation & Pulse Elimination
**Description:** Restructure the tickets table in `src/app/admin/tickets/page.tsx` to separate the merged "Amount & Duration" column into individual dedicated columns (`Amount`, `Net Payout`, `MDR`, `Platform Fee`, `Duration`), eliminate pulse counts from client display, and format with high-contrast typography and semantic badge styling.

**Acceptance criteria:**
- [x] Table headers include distinct columns: `Amount`, `Net Payout`, `MDR`, `Platform Fee`, `Duration`.
- [x] Pulse count (`pulses`) is completely removed from the table headers and row cells.
- [x] `Amount` renders Gross Sales in bold `tabular-nums text-[#1B1C1C]`.
- [x] `Net Payout` renders in emerald `text-[#0F6E56]` when session is paid/done, or neutral zero/dash when unpaid.
- [x] `MDR` and `Platform Fee` render in readable muted `text-gray-500 tabular-nums`.
- [x] `Duration` renders clean `X mins` without pulse information.

**Verification:**
- [x] Visual inspection & DOM structure validation via automated tests.
- [x] Tests pass: `node --test tests/tickets-financial-breakdown.test.mjs`

**Dependencies:** Task 8
**Files likely touched:** `src/app/admin/tickets/page.tsx`
**Estimated scope:** Medium (1 file)

---

## Task 10: Enterprise CSV Export Overhaul Matching PARKEE Standard
**Description:** Update `handleExportCSV` in `src/app/admin/tickets/page.tsx` to output 20 structured enterprise settlement columns matching the PARKEE reference format (`Ticket_25102026-25102026_DONE.csv`), excluding pulses for a clean client-facing export, and formatting numbers cleanly for Excel / Google Sheets calculation.

**Acceptance criteria:**
- [x] Export headers contain: `Location, Location Code, Chair Code, Created From, Slip Number, Date & Time (WIB), Session Start (WIB), Session End (WIB), Duration (Mins), Customer, Payment Method, Payment Provider, Payment Status, PG Ref Number, MDR Paid By, Gross Sales (IDR), MDR Fee (IDR), Platform Fee (IDR), Net Payout (IDR), Ticket Status`.
- [x] No pulse count column in client-facing export.
- [x] File exports with UTF-8 BOM (`\uFEFF`) and clean numeric cells without thousands formatting.
- [x] Exports full dataset (up to 10,000 records) based on active date & status filters.

**Verification:**
- [x] Tests pass: `node --test tests/tickets-financial-breakdown.test.mjs`

**Dependencies:** Task 8, Task 9
**Files likely touched:** `src/app/admin/tickets/page.tsx`
**Estimated scope:** Small (1 file)

---

## Task 11: Automated Test Suite & Next.js Production Build
**Description:** Create comprehensive automated test suite `tests/tickets-financial-breakdown.test.mjs` verifying backend calculations, UI table column separation, pulse elimination, and CSV export structure. Verify Next.js production build (`npm run build`).

**Acceptance criteria:**
- [x] Automated tests pass: `node --test tests/tickets-financial-breakdown.test.mjs`.
- [x] Full test suite passes: `node --test tests/*.test.mjs` (all 100+ tests pass).
- [x] Next.js production build completes with 0 errors (`npm run build`).

**Verification:**
- [x] `node --test tests/*.test.mjs`
- [x] `npm run build`

**Dependencies:** Task 8, Task 9, Task 10
**Files likely touched:** `tests/tickets-financial-breakdown.test.mjs`
**Estimated scope:** Small (1 file)

---

## Checkpoint 4: Complete
- [x] All 4 tasks completed and verified
- [x] Ready for human review and git push
