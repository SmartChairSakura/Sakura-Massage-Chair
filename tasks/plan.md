# Implementation Plan: Sales Summary Dashboard (`/admin/dashboard`) Chart & Visual Architecture Overhaul

## Overview
Refactor the **Sales Summary Dashboard (`/admin/dashboard`)** in `smart-kursi-pijat-web` to align with the data visualization and semantic UI/UX architecture defined in `Panduan Chart Kursi Pijat.md` and `Panduan Chart Kursi Pijat.html` (Charts **#1 Hero KPI + Sparkline**, **#2 Linear Area Chart**, **#3 Daily Column Chart**, and **#4 Horizontal Waterfall Deduction Chart**, while deferring Charts #5–#8 for other pages). This overhaul eliminates misleading smooth spline curves on discrete daily data, replaces dark monospace tooltips with light-surface `Plus Jakarta Sans` (`tabular-nums`) tooltips, enforces strict semantic color discipline (`#0F6E56` green exclusively for Net Payout, `#A32D2D` red exclusively for fee deductions, `#795465` mauve for primary data series), adds a deterministic `niceScale` Y-axis tick generator with peak-value callouts, and embeds a floating horizontal Waterfall chart + collapsible accessible data table.

---

## Architecture Decisions

1. **Deterministic `niceScale(max, maxTicks)` Tick Calculation (`src/lib/chart-utils.ts`):**
   - **Problem:** Recharts' default auto-domain produces awkward, non-round Y-axis labels (e.g., `6k, 11k, 17k` or `0, 5.5k, 11k, 16.5k`).
   - **Decision:** Extract a pure, unit-tested `niceScale(maxValue, maxTicks)` utility in `src/lib/chart-utils.ts` that computes human-friendly step intervals (`1, 2, 2.5, 5, 10 × 10^n`) and returns `{ top, ticks, step }`. Pass `domain={[0, scale.top]}` and `ticks={scale.ticks}` directly to `<YAxis />` on both the Revenue Area Chart and Session Column Chart.

2. **Linear Interpolation (`type="linear"`) & Peak Data Point Callout:**
   - **Problem:** Daily revenue is aggregated per discrete calendar day (WIB). Using `type="monotone"` fabricates smooth curved slopes between days, implying intra-day continuity where zero transactions occurred.
   - **Decision:** Switch `<Area type="linear" />` with a subtle flat fill (`fill="#795465" fillOpacity={0.10}`), solid 1px horizontal grid lines (`stroke="#EFEDED"` without `strokeDasharray`), a crisp baseline (`axisLine={{ stroke: '#D8D1D4' }}`), and a custom dot/label renderer that highlights only the peak day (`max > 0`) with a ring dot (`r=4.5`, `stroke="#FFFFFF"`, `strokeWidth=2`) and a bold `tabular-nums` currency label above it.

3. **Light-Surface Tooltip with `Plus Jakarta Sans` & `tabular-nums`:**
   - **Problem:** The existing `CustomTooltip` uses `bg-[#1B1C1C] text-white` and `font-mono`, creating harsh visual contrast on white cards and breaking typographic consistency.
   - **Decision:** Redesign `CustomTooltip` on a light surface (`bg-white text-[#1B1C1C] border border-[#D8D1D4] rounded-[10px] px-3 py-2 shadow-[0_8px_24px_rgba(27,28,28,0.12)]`), inheriting `Plus Jakarta Sans` (`tabular-nums`). In the Revenue Trend chart, the tooltip also displays the day's completed session count (`X Sessions`) as secondary context.

4. **Strict Semantic Color Discipline (`1 Color = 1 Meaning`):**
   - **Green (`#0F6E56` / `#E1F5EE`):** Reserved strictly for **Net Payout** (the partner's final take-home amount) and positive period comparison delta.
   - **Red (`#A32D2D` / `#FCEBEB`):** Reserved strictly for **Fee Deductions** (`MDR Fee 0.7%` and `Platform Fee 5%`) and negative period comparison delta.
   - **Brand Mauve (`#795465`) & Neutral Ink (`#1B1C1C`, `#5B5257`, `#8A8186`):** Used for all operational metrics (`Active Fleet 9 / 9 Chairs`, `Paid Sessions`, `Daily Revenue Trend`, and `Daily Session Volume`). All emerald green classes (`text-emerald-800`, `bg-[#E1F5EE]`, `fill="#4E635A"`) are removed from `Active Fleet` and `Daily Session Volume`.

5. **Hero KPI Sparkline (#1) & Horizontal Waterfall Deduction Chart (#4):**
   - **Hero KPI + Sparkline:** Keep `Net Payout (95%)` as the single Hero metric on the page (`tabular-nums`), hide the percentage delta badge when `period_change_pct === null` (showing a clean muted caption instead), and embed a compact 44px linear SVG sparkline (`stroke="#8A8186"`, terminal ring dot `#795465`) representing the daily trend.
   - **Horizontal Waterfall Deduction Chart:** Replace/upgrade the static 4-box footer inside the Hero card with an interactive SVG/HTML Horizontal Floating Bar Waterfall (`Gross Sales` `[0 → 100%]` in `#8A8186` → `MDR Fee (0.7%)` `[net_sales → gross_sales]` in `#A32D2D` → `Net Sales` `[0 → net_sales]` in `#8A8186` → `Platform Fee (5%)` `[owner_net → net_sales]` in `#A32D2D` → `Net Payout (95%)` `[0 → owner_net]` in `#0F6E56`), while preserving all copywriting strings tested by `tests/dashboard-copywriting.test.mjs`.

---

## Dependency Graph

```
src/lib/chart-utils.ts (niceScale, formatCompactK, computeWaterfallRows, findPeakIndex)
    │
    ├── tests/chart-utils.test.mjs (Unit tests for niceScale, waterfall math, peak index)
    │
    └── src/app/admin/dashboard/page.tsx
            ├── Task 2: Semantic Color Cleanup (Active Fleet + KPI Cards + Hero Sparkline #1)
            ├── Task 3: Horizontal Waterfall Deduction Chart (#4)
            ├── Task 4: Linear Area Revenue Chart (#2) + Light Tooltip + Collapsible Table
            └── Task 5: Discrete Daily Session Column Chart (#3) + TDD Copywriting & Build Verification
```

---

## Task List

### Phase 1: Mathematical & Scale Foundation
- [x] **Task 1:** Create `src/lib/chart-utils.ts` (`niceScale`, `formatCompactIDR`, `computeWaterfallSteps`, `findPeakIndex`) and unit test suite `tests/chart-utils.test.mjs`.

### Checkpoint 1: Foundation Verified
- [x] `node --test tests/chart-utils.test.mjs` passes 100%.

### Phase 2: Hero KPI, Sparkline (#1), Waterfall (#4) & Semantic Color Discipline
- [x] **Task 2:** Refactor Hero KPI (`Net Payout`), add 44px Linear Sparkline (**Chart #1**), hide uncomputed delta badges cleanly, and remove green leakage from `Active Fleet` (`9 / 9 Chairs`).
- [x] **Task 3:** Implement the interactive Horizontal Waterfall Deduction Chart (**Chart #4**: `Gross Sales` → `MDR Fee (0.7%)` → `Net Sales` → `Platform Fee (5%)` → `Net Payout`) with floating bars and light-surface hover tooltips.

### Checkpoint 2: Hero & Waterfall Verified
- [x] `Net Payout`, `Gross Sales`, `MDR Fee`, `Net Sales`, `Platform Fee`, `Active Fleet`, and `Paid Sessions` render with strict semantic colors and pass copywriting assertions.

### Phase 3: Trend Charts Overhaul (#2 Linear Area & #3 Daily Column) + Light Tooltip + Table Toggle
- [x] **Task 4:** Overhaul **Chart #2 (`Daily Revenue Trend`)** to `type="linear"`, `niceScale` Y-axis ticks, solid `#EFEDED` gridlines, peak ring dot + `Rp` label, Light-Surface `Plus Jakarta Sans` (`tabular-nums`) Tooltip with session count context, truthful subtitle, and collapsible `<details><summary>View as table</summary>` accessible table.
- [x] **Task 5:** Overhaul **Chart #3 (`Daily Session Volume`)** to single-hue Brand Mauve (`#795465`), `maxBarSize={24}`, `niceScale` integer Y-axis ticks, peak count label above highest bar, and update TDD regression tests in `tests/dashboard-copywriting.test.mjs`.

### Checkpoint 3: Complete & Verified
- [x] All unit & copywriting tests pass (`npm test` / `node --test`).
- [x] Production build (`npm run build`) succeeds with zero TypeScript or Next.js errors.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **All-zero date ranges (`max = 0`) causing division by zero in `niceScale` or Sparkline/Waterfall** | High | Guard `max <= 0` in `niceScale` (fallback to `{ top: 20000, ticks: [0, 5000, 10000, 15000, 20000] }` for currency and `{ top: 4, ticks: [0, 1, 2, 3, 4] }` for sessions) and render flat baseline in Sparkline/Waterfall when `gross_sales === 0`. |
| **Breaking existing TDD copywriting regexes in `tests/dashboard-copywriting.test.mjs`** | Medium | Preserve exact required English tokens (`Sales Overview`, `Real-time QRIS revenue, payment processing fees, and partner payouts.`, `Transaction Date`, `Settlement Date`, `Net Payout`, `Platform Fee`, `Active Fleet`, `Paid Sessions`, `Daily Revenue Trend`, `Daily Session Volume`). |
| **Tiny deduction bars (`MDR 0.7%`) becoming invisible in Horizontal Waterfall** | Medium | Enforce `Math.max(3, barWidthPx)` minimum pixel width on SVG/HTML floating waterfall bars (matching `Math.max(2, X(r.to) - x0)` in `Panduan Chart Kursi Pijat.html`). |
| **Peak value label clipping at the top of the SVG chart canvas** | Low | Increase Recharts `margin={{ top: 24, right: 16, left: 0, bottom: 4 }}` so the peak label (`y - 12`) never clips above the top gridline. |

---

## Open Questions
- None blocking; all specifications and visual parameters are explicitly defined in `Panduan Chart Kursi Pijat.md` and `Panduan Chart Kursi Pijat.html`.
