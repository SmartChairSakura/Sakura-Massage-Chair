# Task Breakdown: Sales Summary Dashboard (`/admin/dashboard`) Architecture Overhaul

> **Scope:** Focused exclusively on the **Sales Summary Dashboard (`/admin/dashboard`)** — implementing the 5 specific critique fixes and the 4 Sales Summary visual components (**#1 Hero KPI + Sparkline**, **#2 Linear Area Chart**, **#3 Daily Column Chart**, **#4 Horizontal Waterfall Deduction Chart**). Charts #5–#8 (Location Setting, Chair List, Tickets) are intentionally deferred per user instruction.

---

## Phase 1: Mathematical & Scale Foundation

### Task 1: Create `niceScale`, Peak Detection, and Waterfall Math Utilities (`src/lib/chart-utils.ts`)

**Description:** Create a pure, zero-dependency chart mathematics module (`src/lib/chart-utils.ts`) implementing `niceScale(max, maxTicks, fallbackTop)` (matching the `[1, 2, 2.5, 5, 10] × 10^n` algorithm from `Panduan Chart Kursi Pijat.html`), `formatCompactK(val)` (`0`, `5k`, `10k`, `20k`, `1.5M`), `findPeakIndex(values)` (returns index of highest value `> 0`, or `-1` if all zero), and `buildWaterfallRows(summary)` (computes `from`, `to`, `color`, `text`, and `tooltip` metadata for `Gross Sales`, `MDR Fee (0.7%)`, `Net Sales`, `Platform Fee (5%)`, and `Net Payout (95%)`).

**Acceptance criteria:**
- [x] `niceScale(20085, 5)` returns `{ top: 25000, ticks: [0, 5000, 10000, 15000, 20000, 25000] }` (or clean round intervals `0, 5k, 10k, 15k, 20k, 25k`).
- [x] `niceScale(12, 4)` returns `{ top: 12, ticks: [0, 3, 6, 9, 12] }` or `{ top: 15, ticks: [0, 5, 10, 15] }` with integer steps (`allowDecimals: false`).
- [x] `niceScale(0, 5)` safely returns a non-NaN default scale without dividing by zero (`Math.log10(0)` guarded).
- [x] `buildWaterfallRows` produces 5 ordered rows where `MDR Fee` floats from `net_sales` to `gross_sales` (`#A32D2D`), `Platform Fee` floats from `owner_net` to `net_sales` (`#A32D2D`), and `Net Payout` spans `0` to `owner_net` (`#0F6E56`).

**Verification:**
- [x] Tests pass: `node --test tests/chart-utils.test.mjs`
- [x] Build succeeds: `npm run build`

**Dependencies:** None

**Files likely touched:**
- `src/lib/chart-utils.ts`
- `tests/chart-utils.test.mjs`

**Estimated scope:** Small (2 files)

---

### Checkpoint: After Task 1
- [x] `node --test tests/chart-utils.test.mjs` passes all cases including edge cases (`max = 0`, single-day range, large millions).

---

## Phase 2: Hero KPI, Sparkline (#1), Waterfall (#4) & Semantic Color Discipline

### Task 2: Refactor Hero KPI (`Net Payout`), Add Mini Sparkline (#1), and Fix `Active Fleet` Color Leakage

**Description:** Update the top KPI section in `src/app/admin/dashboard/page.tsx` to enforce strict semantic color rules (`1 color = 1 meaning`):
1. **Hero KPI (`Net Payout`):** Apply `tabular-nums` to the main `Rp` figure, render a compact 44px-height linear SVG sparkline (`stroke="#8A8186"`, `strokeWidth={2}`, terminal ring dot `fill="#795465"` with white 2px ring) of `dailyTrend` gross sales, and hide the percentage badge when `period_change_pct === null` (replacing it with a clean muted caption instead of a fake badge).
2. **`Active Fleet` Card (`9 / 9 Chairs`):** Remove `text-emerald-800` and `bg-[#E1F5EE] text-[#0F6E56]`. Replace with neutral ink `text-[#1B1C1C] tabular-nums` for `9 / 9` and brand mauve surface `bg-[#F5F3F3] text-[#795465]` for the icon badge so emerald green (`#0F6E56`) remains 100% exclusive to `Net Payout`.

**Acceptance criteria:**
- [x] `Net Payout` is the only KPI card on `/admin/dashboard` using emerald green (`#0F6E56` / `#E1F5EE`).
- [x] `Active Fleet` (`9 / 9 Chairs`) uses `text-[#1B1C1C] tabular-nums` and `bg-[#F5F3F3] text-[#795465]` (zero `emerald` or `#0F6E56` classes on Active Fleet).
- [x] A responsive 44px SVG linear sparkline with a terminal `#795465` ring dot is rendered inside the Hero KPI card when `dailyTrend.length > 1`.

**Verification:**
- [x] Tests pass: `node --test tests/dashboard-copywriting.test.mjs`
- [x] Manual/DOM check: Inspect Hero KPI and Active Fleet classes in `src/app/admin/dashboard/page.tsx`.

**Dependencies:** Task 1

**Files likely touched:**
- `src/app/admin/dashboard/page.tsx`

**Estimated scope:** Small (1 file)

---

### Task 3: Implement Interactive Horizontal Waterfall Deduction Chart (#4)

**Description:** Upgrade the financial deduction breakdown in `src/app/admin/dashboard/page.tsx` into a true **Horizontal Waterfall Chart (Chart #4)** matching `Panduan Chart Kursi Pijat.html` (`#c-fall`). Each of the 5 rows (`Gross Sales`, `MDR Fee (0.7%)`, `Net Sales`, `Platform Fee (5%)`, `Net Payout (95%)`) renders:
- Left-aligned/right-aligned clear row label (`Gross Sales`, `MDR Fee (0.7%)`, `Net Sales`, `Platform Fee (5%)`, `Net Payout`).
- A horizontal track with a proportional floating bar (`from%` to `to%` of `gross_sales`, minimum width `3px` so `0.7%` MDR is always visible):
  - `Gross Sales` & `Net Sales`: Neutral `#8A8186`
  - `MDR Fee (0.7%)` & `Platform Fee (5%)`: Deduction Red `#A32D2D` (floating from post-deduction to pre-deduction value, labeled `- Rp ...`)
  - `Net Payout (95%)`: Positive Emerald `#0F6E56` (spanning `0` to `owner_net`, labeled `Rp ...`)
- Right-side bold `tabular-nums` Rupiah value label and light-surface hover tooltip explaining each step (`Total QRIS received`, `Midtrans 0.7% QRIS MDR deduction`, `Net revenue after MDR`, `Platform revenue share`, `Partner net payout`).

**Acceptance criteria:**
- [x] All 5 waterfall steps render with accurate floating offsets (`from` and `to` percentages relative to `gross_sales`).
- [x] Fee deductions (`MDR Fee` and `Platform Fee`) are visually prefixed with `- ` and colored `#A32D2D`; `Net Payout` is colored `#0F6E56`; `Gross Sales` and `Net Sales` are colored `#8A8186`.
- [x] Hovering any waterfall row displays a light-surface tooltip with step details.

**Verification:**
- [x] Tests pass: `node --test tests/chart-utils.test.mjs tests/dashboard-copywriting.test.mjs`
- [x] Build succeeds: `npm run build`

**Dependencies:** Task 1, Task 2

**Files likely touched:**
- `src/app/admin/dashboard/page.tsx`

**Estimated scope:** Small (1 file)

---

### Checkpoint: After Tasks 2–3
- [x] Hero KPI + Sparkline (#1), Active Fleet semantic color cleanup, and Horizontal Waterfall Deduction Chart (#4) compile cleanly and pass all copywriting assertions.

---

## Phase 3: Trend Charts Overhaul (#2 Linear Area & #3 Daily Column), Light Tooltip & Table Toggle

### Task 4: Overhaul `Daily Revenue Trend` to Linear Area Chart (#2) with Light Tooltip, Peak Callout & Accessible Table

**Description:** Refactor **Chart 1 (`Daily Revenue Trend`)** and `CustomTooltip` in `src/app/admin/dashboard/page.tsx`:
1. **Linear Area Curve (`type="linear"`):** Replace `type="monotone"` with `type="linear"`, `stroke="#795465"`, `strokeWidth={2}`, `fill="#795465"`, `fillOpacity={0.10}`.
2. **`niceScale` Y-Axis & Solid Grid:** Compute `revScale = niceScale(maxGross, 5)` and pass `domain={[0, revScale.top]}` and `ticks={revScale.ticks}` to `<YAxis />`. Remove `strokeDasharray="3 3"` from `<CartesianGrid />` so horizontal grid lines are solid thin `#EFEDED`, with a solid baseline `axisLine={{ stroke: '#D8D1D4' }}`.
3. **Peak Value Callout (`Rp ...` + Ring Dot):** Render a highlighted ring dot (`r=4.5`, `fill="#795465"`, `stroke="#FFFFFF"`, `strokeWidth=2`) and a bold `tabular-nums` label (`formatRupiah(peakVal)`) above the peak day (`maxGross > 0`).
4. **Light-Surface Tooltip (`Plus Jakarta Sans` + `tabular-nums`):** Replace dark `bg-[#1B1C1C]` and `font-mono` with `bg-white text-[#1B1C1C] border border-[#D8D1D4] rounded-[10px] px-3 py-2 shadow-[0_8px_24px_rgba(27,28,28,0.12)]`. Show bold Rupiah value (`font-bold tabular-nums text-[#1B1C1C]`), series label (`text-[#5B5257]`), and secondary row with completed sessions (`X Sessions completed` / `X sesi selesai`).
5. **Truthful Subtitle & Collapsible Table (`<details>`):** Change subtitle from *"Daily gross revenue and net payout performance."* to *"Daily gross sales trajectory across the selected period."* and add a `<details className="mt-3 pt-2.5 border-t border-dashed border-[#EFEDED]">` toggle (`Lihat sebagai tabel / View as table`) rendering an accessible HTML `<table>` with `Date`, `Gross Sales`, `Net Payout`, and `Sessions` (`tabular-nums`).

**Acceptance criteria:**
- [x] `<Area />` uses `type="linear"` (zero `type="monotone"` remaining in `src/app/admin/dashboard/page.tsx`).
- [x] `<CartesianGrid />` uses solid `#EFEDED` lines without `strokeDasharray`.
- [x] `CustomTooltip` uses light surface (`bg-white`), `tabular-nums`, no `font-mono`, and displays session count context on the Revenue Trend chart.
- [x] Peak day displays a ring dot and `Rp ...` label above the vertex when `maxGross > 0`.
- [x] Collapsible `<details>` table below the chart displays the exact daily/monthly rows.

**Verification:**
- [x] Tests pass: `node --test tests/dashboard-copywriting.test.mjs`
- [x] Build succeeds: `npm run build`

**Dependencies:** Task 1

**Files likely touched:**
- `src/app/admin/dashboard/page.tsx`

**Estimated scope:** Small (1 file)

---

### Task 5: Overhaul `Daily Session Volume` to Single-Hue Mauve Column Chart (#3) & Add Regression Tests

**Description:** Refactor **Chart 2 (`Daily Session Volume`)** in `src/app/admin/dashboard/page.tsx` and update `tests/dashboard-copywriting.test.mjs`:
1. **Single-Hue Brand Mauve (`#795465`):** Replace `#4E635A` and `#0F6E56` badge/bar colors on `Daily Session Volume` with Brand Mauve (`fill="#795465"`, icon `text-[#795465]`, badge `bg-[#F5F3F3] text-[#795465] border-[#EFEDED]`).
2. **Column Proportions & `niceScale`:** Set `maxBarSize={24}`, `radius={[4, 4, 0, 0]}`, solid `#EFEDED` horizontal gridlines, solid `#D8D1D4` baseline, and `sessScale = niceScale(maxSessions, 4)` integer Y-axis ticks.
3. **Peak Bar Value Label:** Render the peak session count (`12`) directly above the tallest bar (`v === maxSessions && maxSessions > 0`) in bold `tabular-nums` (`11px`, `#1B1C1C`).
4. **Regression Tests:** Add assertions in `tests/dashboard-copywriting.test.mjs` verifying that `src/app/admin/dashboard/page.tsx` uses `type="linear"`, light-surface tooltip (`bg-white`), `tabular-nums`, no `font-mono` in `CustomTooltip`, no `text-emerald-800` on `Active Fleet`, and `maxBarSize={24}`.

**Acceptance criteria:**
- [x] `Daily Session Volume` uses `fill="#795465"` and `maxBarSize={24}` with zero green/emerald leakage.
- [x] Tallest non-zero session bar displays its integer value label directly above the bar top.
- [x] All unit and copywriting tests pass (`node --test tests/*.test.mjs`).
- [x] Next.js production build (`npm run build`) completes with zero errors.

**Verification:**
- [x] Tests pass: `node --test tests/chart-utils.test.mjs tests/dashboard-copywriting.test.mjs`
- [x] Build succeeds: `npm run build`

**Dependencies:** Task 1, Task 4

**Files likely touched:**
- `src/app/admin/dashboard/page.tsx`
- `tests/dashboard-copywriting.test.mjs`

**Estimated scope:** Small (2 files)

---

### Checkpoint: Complete (After Tasks 4–5)
- [x] All 5 critique points from `Panduan Chart Kursi Pijat` resolved.
- [x] All 4 Sales Summary visual components (**#1 Hero + Sparkline**, **#2 Linear Area Chart + Table Toggle**, **#3 Daily Column Chart**, **#4 Horizontal Waterfall Deduction Chart**) implemented and verified.
- [x] `node --test tests/chart-utils.test.mjs tests/dashboard-copywriting.test.mjs` passes 100%.
- [x] `npm run build` succeeds cleanly.
