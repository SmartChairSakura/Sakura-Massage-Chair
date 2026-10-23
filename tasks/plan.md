# Implementation Plan: Sales Summary Dashboard UI/UX & Flow Overhaul

## Overview
Comprehensive overhaul of the Sales Summary Dashboard (`/admin/dashboard`), addressing all 6 defect areas identified in `SALES_SUMMARY_UI_ANALYSIS.md`, `SalesSummaryRevised.tsx`, and user audit of `Screenshot_92.jpg`. The scope includes: fixing typography hierarchy (replacing ubiquitous `font-extrabold`/`font-black` with a disciplined 3-tier scale), rectifying chart distortion via backend date zero-filling and X/Y axis labels, converting discrete session volume to an SVG/Recharts bar chart, eliminating semantic color confusion by reserving green strictly for Net Payout, synchronizing DatePickerModal state (resolving the "ALL TIME" preset mismatch bug), and adding real period-over-period delta calculation.

---

## Architecture Decisions

1. **3-Tier Typography Scale:**
   - **Hero Tier:** `text-4xl sm:text-5xl font-bold tracking-tight text-[#1B1C1C]` reserved strictly for Net Payout.
   - **Labels / Section Headers:** `text-xs font-semibold uppercase tracking-wide text-gray-500` for metric labels; `text-base font-semibold text-[#1B1C1C]` for section headers.
   - **Values & Body Tier:** `text-sm font-semibold text-[#1B1C1C]` for intermediate metric values; `text-xs font-normal text-gray-500` for descriptions; `text-[11px] font-normal text-gray-400` for micro captions.

2. **Semantic Color Palette Contract:**
   - **Green (`#0F6E56` / Tailwind `text-[#0F6E56]`, `bg-[#E1F5EE]`):** Exclusively reserved for Net Payout (the final partner earnings).
   - **Red (`#A32D2D` / Tailwind `text-[#A32D2D]` / `#BA1A1A`):** Exclusively for deductions (`MDR Fee 0.7%`).
   - **Neutral Gray (`#5F5E5A` / `#1B1C1C`):** For intermediate financial values (`Gross Sales`, `Net Sales`, `Platform Fee`).
   - **Brand Mauve (`#795465`):** For navigation icons, active interactive states, and brand accents, never for financial data classification.

3. **Backend Date Zero-Filling & Trend Accuracy:**
   - In `src/app/api/admin/dashboard/route.ts`, when filtering across any date range (presets or custom dates), the API will generate a continuous daily sequence in Western Indonesia Time (WIB, UTC+7).
   - Any day without transactions is zero-filled (`gross: 0, transactions: 0, ownerNet: 0`).
   - For "All Time", the range spans from the first recorded transaction date to today (or past 30 days if empty), preventing 2-point line stretching across multi-day gaps.

4. **Zero-Dependency / Recharts Visualizations:**
   - Implement zero-fill date array either in API and frontend with responsive chart rendering:
     - **Daily Revenue Trend:** Smooth area/line chart + 10% opacity linear gradient area fill + interactive hover tooltips + X-axis date labels (`DD MMM`) + Y-axis Rupiah reference scales (`(v/1000)k`).
     - **Daily Session Volume:** Vertical Bar Chart (`radius={[4, 4, 0, 0]}`) representing discrete ticket sessions with session counts and X/Y axis reference lines.

5. **DatePickerModal Synchronization:**
   - Fix the state mismatch where `ALL TIME` preset is highlighted but inputs show today's date (`23 Okt 2026`).
   - When `preset === 'all'`, display `"All Time"` on the trigger button and in the active selection pill; date inputs display empty or disabled state with clear placeholder.
   - When a specific preset (`today`, `yesterday`, `this_week`, `this_month`) is selected, date inputs strictly reflect the calculated WIB date boundaries.

6. **Real Period Delta Badge (`period_change_pct`):**
   - In `route.ts`, dynamically calculate comparison against the equivalent previous period (e.g. today vs yesterday, this month vs last month).
   - If comparison period is unavailable or filter is "All Time", omit the badge or display `"All-time total"` rather than hardcoding `+0%`.

---

## Task List

### Phase 1: Foundation & Backend Precision
- [ ] **Task 1: Backend Date Zero-Filling & Period Delta Calculation in `route.ts`**
  - Implement sequential day generator between `startIso` and `endIso` in WIB (UTC+7).
  - Zero-fill missing calendar dates so `dailyTrend` represents every single day.
  - Compute previous period transaction total and calculate real `period_change_pct` (or return `null` when no comparison data exists).
  - Maintain 100% backward compatibility for all existing JSON response keys.
  - *Verification:* Test with mock requests across multi-day filters; verify empty days output `{ gross: 0, transactions: 0 }`.

- [ ] **Task 2: DatePickerModal State Synchronization & Preset Integrity**
  - Fix default state handling in `DatePickerModal.tsx` so `ALL TIME` does not pre-fill today's date in inputs.
  - Trigger button displays `"All Time"` when preset is `all`.
  - Synchronize inputs when quick presets are clicked, and switch preset to `'custom'` on manual input changes.
  - *Verification:* Open modal, toggle between "TODAY", "THIS MONTH", and "ALL TIME"; ensure trigger button and inputs match exactly.

### Checkpoint 1: Foundation
- [ ] API returns continuous zero-filled daily trends and real period delta.
- [ ] Date picker displays accurate preset state without date mismatches.
- [ ] Unit tests pass: `cd smart-kursi-pijat-web && npm test`.

---

### Phase 2: Design & UI/UX Transformation
- [ ] **Task 3: Typography Hierarchy & Semantic Colors in `page.tsx`**
  - Replace universal `font-extrabold`/`font-black` with the 3-tier hierarchy (`font-bold` for Net Payout hero, `font-semibold` for labels/values, `font-medium`/`font-normal` for body/captions).
  - Strip redundant `border-2 border-[#4E635A]/30` from hero card; use clean Sakura Zen border `border border-[#EFEDED]`.
  - Harmonize semantic colors: reserve green strictly for Net Payout; use neutral gray (`#1B1C1C` / `#5F5E5A`) for Gross Sales, Net Sales, and Platform Fee.
  - Add descriptive helper tooltips/subtitles for Transaction Date vs Settlement Date toggle.
  - *Verification:* Visual check against `Screenshot_92.jpg` criteria; confirm clean hierarchy without visual noise.

- [ ] **Task 4: Chart Overhaul — Zero-Filled Revenue Trend Area Chart & Session Volume Bar Chart**
  - Re-implement Daily Revenue Trend with Recharts AreaChart (or SVG): X-axis date labels (`DD MMM`), Y-axis formatted Rupiah reference scales, 10% opacity gradient area fill below line, and interactive hover cards.
  - Re-implement Daily Session Volume as a discrete Bar Chart with rounded corners (`radius={[4, 4, 0, 0]}`), hover session count cards, and horizontal gridlines.
  - Handle edge cases gracefully: empty state, 1-day state, and multi-day spans.
  - *Verification:* Verify charts render all days in range, zero-revenue days stay at baseline, and bar heights match session counts.

### Checkpoint 2: Core UI & Charts
- [ ] Dashboard displays crisp typography with clear visual focal point.
- [ ] Charts display accurate axes, zero-filled intervals, and bar visualization for session volume.
- [ ] Copywriting contract tests continue passing: `npm test`.

---

### Phase 3: Verification & Quality Assurance
- [ ] **Task 5: End-to-End Regression Testing & Documentation Sync**
  - Run full test suite: `npm test` (all 57+ tests passing).
  - Execute Next.js 14 production build: `npm run build` (zero type errors, clean compilation).
  - Generate comprehensive audit report artifact and sync to Windows `C:\Users\rifal\Downloads\SALES_SUMMARY_AUDIT_REPORT.md`.
  - *Verification:* Production build exit code 0; test suite 100% green.

### Checkpoint: Complete
- [ ] All 6 defect areas from `SALES_SUMMARY_UI_ANALYSIS.md` resolved.
- [ ] Verification steps confirmed and documented.
- [ ] Ready for user review.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Zero-filling for wide date ranges (e.g. 1 year) generates hundreds of points in SVG/Recharts | Medium | Cap continuous zero-filling to 60 days max; for larger spans, group by week or month to maintain high performance. |
| Timezone off-by-one errors across midnight (WIB UTC+7 vs UTC) | High | Utilize existing battle-tested `getWibDateKey` and `getWibDateRange` utilities in `src/lib/date-utils.ts`. |
| Existing copywriting unit tests fail if text labels change | High | Retain all exact required English strings (`Sales Overview`, `Net Payout`, `Platform Fee`, `Active Fleet`, `Paid Sessions`, `Daily Revenue Trend`, `Daily Session Volume`). |

---

## Open Questions
- None. Requirements are fully specified in `SALES_SUMMARY_UI_ANALYSIS.md`, `SalesSummaryRevised.tsx`, and `Screenshot_92.jpg`.
