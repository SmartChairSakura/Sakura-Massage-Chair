# Implementation Plan: Location Setting (`/admin/locations`) & Add/Edit Location Modal UI/UX Overhaul

## Overview
Overhaul the **Location Setting (`/admin/locations`)** page, the **Add/Edit Location Modal**, global typography/color tokens, and native `<select>` controls based on the 15 findings in `LOCATION_SETTING_UIUX_AUDIT.md` and `ThemedSelect.tsx`. This plan fixes all P0–P2 issues: truncated `<select>` options and browser-blue native dropdowns (replaced with Radix-powered `AppSelect`), low-contrast input borders (`1.10:1` → `3.57:1` `#8F8589`), low-contrast placeholders (`2.15:1` → `4.83:1` `#7A6F73`), clipped modal footers (`max-h-[90dvh]` sticky header/footer flex layout), excessive `font-extrabold` usage (replaced with 400/500/600 hierarchy + `JetBrains Mono` exclusively for `Site Code`), redundant `+` symbols and decorative icons, separation of Location `Status` (`Active`/`Inactive`) from `Fleet Size` (`X chairs · Y online` with proper pluralization), hiding the redundant global `LocationSelector` on `/admin/locations`, and reversible interactions (dirty-form close guard + 6s/8s Undo toast for row & location deletion).

---

## Architecture Decisions

1. **WCAG 2.2 AA Color & Surface Token System (`src/app/globals.css` & `src/app/layout.tsx`):**
   - Add audited CSS custom properties (`--bg-page`, `--bg-surface`, `--bg-field`, `--bg-subtle`, `--text`, `--text-muted: #6B6064`, `--text-placeholder: #7A6F73`, `--border: #E6E0E3`, `--border-field: #8F8589`, `--brand: #795465`, `--brand-hover: #664556`, `--brand-soft: #F6E9EF`, `--brand-soft-hover: #EFDCE5`, `--focus-ring: #795465`, `--ok: #0F6E56`, `--ok-bg: #E1F5EE`, `--warn: #8A5A00`, `--warn-bg: #FFF3D6`, `--error: #A32D2D`, `--error-bg: #FCEBEB`).
   - Load `JetBrains_Mono` (`400`, `500`, `variable: '--font-mono'`) alongside `Plus_Jakarta_Sans` (`400`, `500`, `600`, `700`) in `src/app/layout.tsx` so `font-mono` uses a deliberate monospace typeface strictly on `Site Code` (`GI-01`), while numbers and percentages use `Plus Jakarta Sans` with `tabular-nums`.

2. **Radix-Powered `AppSelect` (`src/components/admin/ThemedSelect.tsx`):**
   - Install `@radix-ui/react-select` and implement `AppSelect` (`ThemedSelect.tsx`) with custom viewport scrollbars, `prefers-reduced-motion` support, 3 distinct item states (hover `#F5F3F3`, checked `#F6E9EF` + check icon, checked+hover `#EFDCE5`), and `hint` subtitle support.
   - Replace all native `<select>` elements in `/admin/locations` (Status Filter, State/Province, and Recipient/Income Entity) with `AppSelect`.
   - Shorten Income Entity labels to `Owner` (hint: `'Venue owner'`), `Platform` (hint: `'Platform / system ops'`), `Partner` (hint: `'Location sub-partner'`), and `Other` so options never truncate even at 360px width.

3. **Non-Clipped Modal Shell & Accessible `Field` Component:**
   - Structure the Add/Edit Location Dialog as `role="dialog" aria-modal="true" aria-labelledby="loc-modal-title"` with `max-h-[90dvh] flex flex-col overflow-hidden`.
   - Keep `<header>` and `<footer>` outside the scrollable `<div className="flex-1 overflow-y-auto">` container so `Cancel` and `Save Location` are permanently visible at any viewport height.
   - Use sentence-case labels without colons (`Branch name`, `Site code`, `Address`, `Country`, `State / province`, `City`, `PIC name`, `PIC phone`, `Recipient`, `Party name`, `Share`), explicit `(optional)` tags, white input backgrounds with `border-[#8F8589]`, and `aria-live="polite"` 3-state Revenue Share Total badge (`Total 100%` ok, `Total X%, remaining Y%` warn, `Total X%, excess Y%` error).

4. **Table UX, Header Context & Reversible Interactions (Undo):**
   - Hide `<LocationSelector />` in `AdminHeader.tsx` when `pathname === '/admin/locations'`.
   - Separate Location **Status** (`Active` / `Inactive` pill with icon) from **Fleet Size** (`1 chair` / `8 chairs` pluralized via helper, showing `8 / 8 online` or warning `7 / 8 online`, and `<ChevronRight />` instead of `<ExternalLink />`).
   - Support soft-delete restoration (`deleted_at: null, status: 'active'`) in `PATCH /api/admin/locations/[id]` so deleting a location with 0 active chairs offers an 8-second **"Undo"** toast, and removing a revenue share row in the modal offers a 6-second **"Undo"** banner.
   - Guard modal dismissal (`Esc`, `X`, backdrop click) with an inline **"Discard unsaved changes?"** prompt when the form is dirty.

---

## Dependency Graph

```
package.json (@radix-ui/react-select) + src/app/layout.tsx (JetBrains Mono) + src/app/globals.css (WCAG tokens & select animations)
    │
    ├── src/components/admin/ThemedSelect.tsx (AppSelect component)
    │
    ├── src/components/admin/AdminHeader.tsx (Hide LocationSelector on /admin/locations + 40x40 accessible icon buttons)
    │
    ├── src/app/api/admin/locations/[id]/route.ts (Support soft-delete undo/restore via PATCH deleted_at: null)
    │
    └── src/app/admin/locations/page.tsx (Full UI/UX, typography, modal, table, PIC fields, & Undo overhaul)
            │
            └── tests/dashboard-copywriting.test.mjs & tests/location-setting-uiux.test.mjs
```

---

## Task List

### Phase 1: Design Tokens, Typography Pairing & `AppSelect` Foundation
- [x] **Task 1:** Install `@radix-ui/react-select`, configure `JetBrains_Mono` (`--font-mono`) in `src/app/layout.tsx`, and add WCAG 2.2 AA color/surface tokens & select animations to `src/app/globals.css`.
- [x] **Task 2:** Create `src/components/admin/ThemedSelect.tsx` (`AppSelect`) with support for `hint`, `icon`, `zIndexClass`, and accessible ARIA attributes.

### Checkpoint 1: Foundation & `AppSelect` Ready
- [x] `ThemedSelect.tsx` and global tokens compile cleanly.

### Phase 2: Location List Page, Header Context & API Undo Support
- [x] **Task 3:** Update `src/components/admin/AdminHeader.tsx` to hide `<LocationSelector />` on `/admin/locations` and add accessible 40×40px target & `aria-label` on the Sign Out button; update `src/app/api/admin/locations/[id]/route.ts` to allow restoring soft-deleted locations (`deleted_at: null`).
- [x] **Task 4:** Overhaul the `/admin/locations` table & filter bar in `src/app/admin/locations/page.tsx` (3-tier 400/500/600 typography, `AppSelect` status filter, separated `Status` vs `Fleet Size` with pluralization `1 chair` / `N chairs` & `<ChevronRight />`, PIC contact display, segmented Revenue Split bar, column sorting on Branch Name & Fleet Size, and neutral row action icons with 40×40px hit targets).

### Checkpoint 2: List View & API Verified
- [x] All table headers and copywriting contracts in `tests/dashboard-copywriting.test.mjs` pass.

### Phase 3: Add/Edit Location Modal Overhaul, Global `AppSelect` Rollout & Test Suite
- [x] **Task 5:** Overhaul the Add/Edit Location Modal in `src/app/admin/locations/page.tsx` (sticky header/footer `max-h-[90dvh]` layout, reusable `Field` component with `#8F8589` 3.57:1 borders & `#7A6F73` 4.83:1 placeholders, sentence-case labels without colons, PIC name/phone inputs, read-only Country lock, `AppSelect` for State/Province and short Recipient labels `Owner`/`Platform`/`Partner`/`Other`, `%`-suffixed `tabular-nums` share input, 3-state `aria-live="polite"` total badge, "Auto-balance" button, 6s row-delete Undo, 8s location-delete Undo, and dirty-form Esc/backdrop close guard).
- [x] **Task 6:** Roll out `AppSelect` (`src/components/admin/ThemedSelect.tsx`) across **all remaining native `<select>` dropdowns in the web app** (14 total across `LocationSelector.tsx`, `locations/page.tsx`, `chairs/page.tsx`, `tickets/page.tsx`, and `users/page.tsx`) with empty-string (`""`) sentinel handling so zero native OS/browser dropdowns remain.
- [x] **Task 7:** Create `tests/location-setting-uiux.test.mjs`, update `tests/dashboard-copywriting.test.mjs`, and run full verification (`node --test tests/*.test.mjs` and `npm run build`).

### Checkpoint 3: Complete
- [x] All 17 items in the Section 13 AI Agent Verification Checklist (`LOCATION_SETTING_UIUX_AUDIT.md`) are satisfied and verified by automated tests.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Breaking existing copywriting tests in `tests/dashboard-copywriting.test.mjs`** | High | Keep exact tested English strings (`Locations & Revenue Sharing`, `Add Location`, `Branch Name`, `Site Code`, `Fleet Size`, `Actions`, `Total revenue share must equal exactly 100%.`, `saved successfully.`). |
| **Radix Select portal rendering behind modal backdrop (`z-50`)** | High | Pass `zIndexClass="z-[90]"` to `AppSelect` instances inside the modal so the dropdown popper always layers above the `z-50` modal overlay. |
| **Radix Select throwing error if an option `value` is `""` (empty string)** | Medium | Ensure all `AppSelect` option values are non-empty strings (`'ALL'`, `'active'`, `'inactive'`, `'OWNER'`, `'SYSTEM'`, `'PARTNER'`, `'OTHER'`). |
