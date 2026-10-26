# Task Breakdown: Location Setting (`/admin/locations`) & Modal UI/UX Overhaul

> **Scope:** Comprehensive UI/UX, accessibility (WCAG 2.2 AA), typography (`Plus Jakarta Sans` 400/500/600 + `JetBrains Mono` for `Site Code`), `AppSelect` (`ThemedSelect.tsx`), resilient text layout, concise labels, and reversible interactions (Undo) for `/admin/locations`.

---

## Phase 1: Design Tokens, Typography Pairing & `AppSelect` Foundation

### Task 1: Install `@radix-ui/react-select` & Configure Global WCAG Tokens + `JetBrains Mono`

**Description:** Install `@radix-ui/react-select`, configure `JetBrains_Mono` (`--font-mono`, weights `400`, `500`) alongside `Plus_Jakarta_Sans` in `src/app/layout.tsx`, and add the audited WCAG 2.2 AA CSS variables (`--bg-page`, `--bg-surface`, `--bg-field`, `--bg-subtle`, `--text`, `--text-muted: #6B6064`, `--text-placeholder: #7A6F73`, `--border: #E6E0E3`, `--border-field: #8F8589`, `--brand: #795465`, `--brand-hover: #664556`, `--brand-soft: #F6E9EF`, `--brand-soft-hover: #EFDCE5`, `--focus-ring: #795465`, `--ok: #0F6E56`, `--ok-bg: #E1F5EE`, `--warn: #8A5A00`, `--warn-bg: #FFF3D6`, `--error: #A32D2D`, `--error-bg: #FCEBEB`) plus `.app-select-content` / `.app-select-viewport` rules in `src/app/globals.css`.

**Acceptance criteria:**
- [x] `@radix-ui/react-select` is installed in `package.json`.
- [x] `JetBrains_Mono` is loaded in `src/app/layout.tsx` and bound to `--font-mono`.
- [x] All WCAG 2.2 AA surface, text, border (`#8F8589` >= 3:1), and semantic status tokens are defined in `src/app/globals.css`.
- [x] `.app-select-content` animations respect `@media (prefers-reduced-motion: reduce)`.

**Verification:**
- [x] Build check or unit test verifying tokens in `src/app/globals.css` and `src/app/layout.tsx`.

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `src/app/layout.tsx`
- `src/app/globals.css`

**Estimated scope:** Small (3 files)

---

### Task 2: Create `src/components/admin/ThemedSelect.tsx` (`AppSelect`)

**Description:** Create `src/components/admin/ThemedSelect.tsx` exporting `AppSelect` and `Option` based on the audited `ThemedSelect.tsx` reference. Supports `value`, `onValueChange`, `options` (`{ value, label, hint, disabled }`), `id`, `aria-label`, `aria-invalid`, `aria-describedby`, `icon`, `disabled`, `className`, and `zIndexClass` (default `'z-[70]'`, `'z-[90]'` inside modals).

**Acceptance criteria:**
- [x] `AppSelect` renders a Radix Select trigger with `h-10`, `border-[#8F8589]`, `bg-white`, `text-[#1B1C1C]`, and `focus-visible:ring-2`.
- [x] Dropdown items show 3 distinct states: hover (`#F5F3F3`), checked (`#F6E9EF` + font-semibold + `<Check />` indicator), and checked+hover (`#EFDCE5`).
- [x] Optional `hint` renders below the item label in `#6B6064` without truncating the trigger text unexpectedly.

**Verification:**
- [x] Component imports and compiles cleanly with TypeScript.

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/admin/ThemedSelect.tsx`

**Estimated scope:** Small (1 file)

---

### Checkpoint: After Tasks 1–2
- [x] Global tokens, `JetBrains Mono`, and `ThemedSelect.tsx` are ready for consumption.

---

## Phase 2: Location List Page, Header Context & API Undo Support

### Task 3: Hide Global `LocationSelector` on `/admin/locations` & Add Soft-Delete Undo Support to API

**Description:**
1. In `src/components/admin/AdminHeader.tsx`, conditionally hide `<LocationSelector />` when `pathname === '/admin/locations'` (since `/admin/locations` manages all locations), and upgrade the Sign Out icon button to a 40×40px accessible target (`w-10 h-10`, `aria-label="Sign Out"`).
2. In `src/app/api/admin/locations/[id]/route.ts`, allow `PATCH` to accept `deleted_at: null` so soft-deleted locations can be restored within the 8-second Undo window.

**Acceptance criteria:**
- [x] `<LocationSelector />` is not rendered when `pathname === '/admin/locations'`, while remaining active on `/admin/dashboard`, `/admin/chairs`, and `/admin/tickets`.
- [x] `PATCH /api/admin/locations/[id]` with `{ deleted_at: null, status: 'active' }` restores a soft-deleted location.

**Verification:**
- [x] Tests pass: `node --test tests/dashboard-copywriting.test.mjs`

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/admin/AdminHeader.tsx`
- `src/app/api/admin/locations/[id]/route.ts`

**Estimated scope:** Small (2 files)

---

### Task 4: Overhaul `/admin/locations` List View, Typography Hierarchy & Table Columns

**Description:** Refactor the list view in `src/app/admin/locations/page.tsx`:
1. **Typography & Header:** Remove all `font-extrabold` / `font-black` classes; use weights `400`, `500`, `600`. Remove the duplicate `<MapPin />` before H1 `Locations & Revenue Sharing` and remove the duplicate `+` text from the `Add Location` button (`<Plus />` icon + `<span>Add Location</span>`).
2. **Search & Status Filter:** Use white input with `border-[#8F8589]` and placeholder `#7A6F73`. Replace the native status `<select>` with `<AppSelect />` (`Status: All`, `Active`, `Inactive`).
3. **Table Structure & Resilient Text:**
   - Separate **Status** (`Active` with `<Check />` in `#0F6E56` / `#E1F5EE` vs `Inactive` in `#6B6064` / `#F5F3F3`) from **Fleet Size**.
   - **Fleet Size** column: Use proper pluralization (`1 chair` vs `8 chairs`), show online ratio (`8 / 8 online` or warning `7 / 8 online` in `#8A5A00`), and use `<ChevronRight />` instead of `<ExternalLink />`.
   - **Site Code** column: Use `font-mono` (`JetBrains Mono`) exclusively here.
   - **PIC Contact** info: Show `pic_name` and `pic_phone` cleanly under/alongside branch details so the subtitle promise (*"Manage branch sites, operational contacts, and revenue share terms."*) is fulfilled.
   - **Revenue Split** column: Render a compact segmented bar + `tabular-nums` label (`95% Owner / 5% Platform`) with hover tooltip listing all parties.
   - **Sorting & Actions:** Add sort toggles on `Branch Name` and `Fleet Size`. Make Edit and Delete buttons 40×40px (`w-10 h-10`) with `aria-label`, using neutral icon color (`text-[#6B6064]`) that turns brand/red only on hover/focus.

**Acceptance criteria:**
- [x] Zero `font-extrabold` or `font-black` in `src/app/admin/locations/page.tsx`.
- [x] Button says `Add Location` with a single `<Plus />` icon (no `+ Add Location` double plus).
- [x] `Status` (`Active`/`Inactive`) and `Fleet Size` (`1 chair` / `N chairs` + `X / Y online`) are separated.
- [x] Action icon buttons are 40×40px with explicit `aria-label` attributes.

**Verification:**
- [x] Tests pass: `node --test tests/dashboard-copywriting.test.mjs`

**Dependencies:** Task 1, Task 2, Task 3

**Files likely touched:**
- `src/app/admin/locations/page.tsx`

**Estimated scope:** Small (1 file)

---

### Checkpoint: After Tasks 3–4
- [x] Location list page, header context, and API undo endpoint are complete and pass existing tests.

---

## Phase 3: Add/Edit Location Modal Overhaul, Reversible Actions & Test Suite

### Task 5: Overhaul Add/Edit Location Modal, `AppSelect` Recipient & Reversible Undo Flows

**Description:** Refactor the Add/Edit Location Modal and Delete flows in `src/app/admin/locations/page.tsx`:
1. **Non-Clipped Modal Layout (`max-h-[90dvh] flex flex-col`):**
   - Dialog container has `role="dialog" aria-modal="true" aria-labelledby="loc-modal-title"` and `max-h-[90dvh] flex flex-col overflow-hidden`.
   - `<header>` (`shrink-0`) and `<footer>` (`shrink-0`) stay fixed at top and bottom while the body scrolls (`overflow-y-auto flex-1`), guaranteeing `Cancel` and `Save Location` are never clipped.
   - Close button (`X`) is `w-10 h-10` with `aria-label="Close modal"`.
2. **Concise Sentence-Case Labels & Accessible `Field` Component:**
   - Replace `BRANCH NAME:`, `SITE CODE:`, `INCOME ENTITY:`, `PARTY NAME:`, `PERCENTAGE (%):` with sentence-case `<label htmlFor>` without colons (`Branch name`, `Site code`, `Address`, `Country`, `State / province`, `City`, `PIC name`, `PIC phone`, `Recipient`, `Party name`, `Share`).
   - Mark optional fields with `(optional)` (`Address`, `PIC phone`).
   - Shorten placeholders (`e.g. Grand Indonesia`, `e.g. GI-01`) with helper text on Site code (*"Unique uppercase code without spaces"*), auto-normalizing `locCode` to uppercase.
   - Lock `Country` (`Indonesia`) as a read-only field with subtle background (`bg-[#F5F3F3]`) and a small `<Lock />` icon.
   - Replace `State / province` native `<select>` with `<AppSelect zIndexClass="z-[90]" />`.
3. **Revenue Share Breakdown Overhaul:**
   - Add notice: *"Percentage changes apply to subsequent transactions."*
   - 3-state `aria-live="polite"` Total Badge:
     - `Total 100%` (`bg-[#E1F5EE] text-[#0F6E56]` + `<Check />`)
     - `Total X%, remaining Y%` (`bg-[#FFF3D6] text-[#8A5A00]` + `<AlertTriangle />`)
     - `Total X%, excess Y%` (`bg-[#FCEBEB] text-[#A32D2D]` + `<X />`)
   - Use `<AppSelect zIndexClass="z-[90]" />` for `Recipient` with concise labels that never truncate:
     - `OWNER` → `Owner` (hint: `'Venue owner'`)
     - `SYSTEM` → `Platform` (hint: `'Platform / system ops'`)
     - `PARTNER` → `Partner` (hint: `'Location sub-partner'`)
     - `OTHER` → `Other`
   - For `Share` input: right-aligned `tabular-nums` input with inline `%` suffix and an **"Auto-balance"** (`Bagi sisa`) button when `total !== 100`.
   - Every row has a 40×40px remove button (`aria-label="Remove row"`, disabled only when `incomeBreakdown.length <= 1`), plus a 6-second **"Row removed — Undo"** banner when a row is deleted.
   - Add row button uses a single `<Plus />` icon and label `Add party` (no double plus).
4. **Reversible Interactions (Dirty Guard & 8s Location Delete Undo):**
   - Pressing `Esc`, clicking `X`, or clicking backdrop closes immediately if `!isFormDirty`, or prompts **"Discard unsaved changes?"** (`Keep editing` / `Discard`) if `isFormDirty`.
   - Deleting a location with 0 active chairs soft-deletes it and shows an 8-second toast (`"Location deleted — Undo"`) that calls `PATCH /api/admin/locations/[id]` (`{ deleted_at: null, status: 'active' }`) to restore it. If the location has active chairs (`chair_count > 0`), the confirmation dialog clearly states the impact (`This branch has X active chairs`).

**Acceptance criteria:**
- [x] Modal footer (`Cancel` / `Save Location`) is outside the scrollable body (`shrink-0`) and never clips.
- [x] All `<select>` elements in `src/app/admin/locations/page.tsx` are replaced with `AppSelect` (zero native `<select>` tags remaining in `src/app/admin/locations/page.tsx`).
- [x] Recipient options use concise labels (`Owner`, `Platform`, `Partner`, `Other`) with hints and never truncate.
- [x] 3-state `aria-live="polite"` total badge disables `Save Location` unless total is 100%.
- [x] Dirty-form close guard and 6s/8s Undo flows work cleanly.

**Verification:**
- [x] Tests pass: `node --test tests/*.test.mjs`
- [x] Build succeeds: `npm run build`

**Dependencies:** Task 1, Task 2, Task 3, Task 4

**Files likely touched:**
- `src/app/admin/locations/page.tsx`

**Estimated scope:** Small (1 file)

---

### Task 6: Global Rollout of `AppSelect` Across All Remaining `<select>` Dropdowns in the Web App

**Description:** Replace all remaining native `<select>` elements across the entire web application (14 total across 5 files) with `AppSelect` (`src/components/admin/ThemedSelect.tsx`), including transparent `"" <-> "__EMPTY__"` value mapping inside `AppSelect` so forms using `""` for unselected states never trigger Radix empty-value errors:
1. `src/components/admin/LocationSelector.tsx` (1 dropdown: Global Branch Selector `All Locations`).
2. `src/app/admin/locations/page.tsx` (3 dropdowns: Status Filter, State/Province, Recipient).
3. `src/app/admin/chairs/page.tsx` (3 dropdowns: Branch Filter, Modal Branch Location, Firmware OTA Target Chair).
4. `src/app/admin/tickets/page.tsx` (2 dropdowns: `Show by` Field Filter, Transaction Status Filter).
5. `src/app/admin/users/page.tsx` (5 dropdowns: Register Role, Register Location, Edit Role, Edit Location, Edit Account Status).

**Acceptance criteria:**
- [x] `grep -rn "<select" src/` returns **0 matches** across the entire `src/` directory.
- [x] Every dropdown in the application uses `AppSelect` with consistent Sakura Zen mauve theme (`#795465` / `#F6E9EF`), custom thin scrollbars, and `zIndexClass="z-[90]"` inside modals.

**Verification:**
- [x] `grep -rn "<select" src/` returns 0 native `<select>` elements.
- [x] Build succeeds: `npm run build`.

**Dependencies:** Task 2, Task 5

**Files likely touched:**
- `src/components/admin/ThemedSelect.tsx`
- `src/components/admin/LocationSelector.tsx`
- `src/app/admin/chairs/page.tsx`
- `src/app/admin/tickets/page.tsx`
- `src/app/admin/users/page.tsx`

**Estimated scope:** Medium (5 files)

---

### Task 7: Create Automated Verification Suite (`tests/location-setting-uiux.test.mjs`)

**Description:** Create `tests/location-setting-uiux.test.mjs` verifying all 17 items from Section 13 of `LOCATION_SETTING_UIUX_AUDIT.md` AND verifying that **zero native `<select>` elements remain anywhere in `src/`**.

**Acceptance criteria:**
- [x] All tests in `tests/location-setting-uiux.test.mjs` and `tests/dashboard-copywriting.test.mjs` pass 100%.
- [x] `npm run build` completes with zero TypeScript or Next.js errors.

**Verification:**
- [x] `node --test tests/*.test.mjs`
- [x] `npm run build`

**Dependencies:** Task 1–6

**Files likely touched:**
- `tests/location-setting-uiux.test.mjs`
- `tests/dashboard-copywriting.test.mjs`

**Estimated scope:** Small (2 files)

---

### Checkpoint: Complete (After Tasks 5–7)
- [x] All 15 findings and 17 verification checklist items from `LOCATION_SETTING_UIUX_AUDIT.md` & `ThemedSelect.tsx` are resolved and verified.
- [x] All 14 dropdowns across the entire web app use `AppSelect`.
