/**
 * Pure data visualization utilities for Sakura Zen Sales Summary Dashboard.
 * Implements deterministic `niceScale` Y-axis ticks, compact IDR formatting,
 * peak point detection, and horizontal waterfall geometry with zero-value guards.
 */

export interface NiceScaleOptions {
  integerOnly?: boolean;
  fallbackTop?: number;
}

export interface NiceScaleResult {
  top: number;
  ticks: number[];
  step: number;
}

/**
 * Computes human-friendly round axis ticks (0, 5k, 10k, 15k, 20k) for charts.
 * Guards against `max <= 0`, `NaN`, or `Infinity` to prevent infinite loops.
 */
export function niceScale(
  max: number,
  maxTicks = 5,
  options: NiceScaleOptions = {}
): NiceScaleResult {
  const safeMaxTicks = Math.max(2, Math.floor(maxTicks || 5));
  const integerOnly = Boolean(options.integerOnly);
  const defaultFallback = integerOnly ? 4 : 20000;
  const fallbackTop =
    options.fallbackTop && options.fallbackTop > 0 ? options.fallbackTop : defaultFallback;

  if (!Number.isFinite(max) || max <= 0) {
    const step = integerOnly
      ? Math.max(1, Math.round(fallbackTop / 4))
      : fallbackTop / 4;
    const ticks: number[] = [];
    for (let v = 0; v <= fallbackTop + 1e-9; v += step) {
      ticks.push(Math.round(v * 100) / 100);
    }
    return { top: fallbackTop, ticks, step };
  }

  if (integerOnly && max <= safeMaxTicks) {
    const top = Math.max(2, Math.ceil(max));
    const step = 1;
    const ticks: number[] = [];
    for (let v = 0; v <= top; v += step) {
      ticks.push(v);
    }
    return { top, ticks, step };
  }

  const raw = max / safeMaxTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const multipliers = [1, 2, 2.5, 5, 10];

  let candidateSteps = multipliers.map((m) => m * mag);
  if (integerOnly) {
    candidateSteps = candidateSteps
      .filter((s) => s >= 1 && Math.abs(s - Math.round(s)) < 1e-9)
      .map((s) => Math.round(s));
    if (candidateSteps.length === 0) {
      candidateSteps = [1, 2, 5, 10];
    }
  }

  const step =
    candidateSteps.find((s) => max / s <= safeMaxTicks) ??
    candidateSteps[candidateSteps.length - 1];

  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) {
    ticks.push(integerOnly ? Math.round(v) : Math.round(v * 100) / 100);
  }

  return { top, ticks, step };
}

/**
 * Formats large numbers into compact Y-axis labels ('0', '5k', '20k', '1.5M').
 */
export function formatCompactK(val: number): string {
  if (!Number.isFinite(val) || val === 0) return '0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    const formatted = Number.isInteger(m) ? String(m) : m.toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted}M`;
  }

  if (abs >= 1_000) {
    const k = abs / 1_000;
    const formatted = Number.isInteger(k) ? String(k) : k.toFixed(1).replace(/\.0$/, '');
    return `${sign}${formatted}k`;
  }

  return `${sign}${Math.round(abs)}`;
}

/**
 * Returns the first index of the maximum positive value (> 0) in a series,
 * or -1 if the series is empty or contains only zeros.
 */
export function findPeakIndex(values: number[]): number {
  if (!Array.isArray(values) || values.length === 0) return -1;
  let maxVal = 0;
  let peakIdx = -1;
  for (let i = 0; i < values.length; i++) {
    const v = Number(values[i] || 0);
    if (v > maxVal) {
      maxVal = v;
      peakIdx = i;
    }
  }
  return peakIdx;
}

export interface SparklineGeometry {
  pathD: string;
  endX: number;
  endY: number;
  peakX: number;
  peakY: number;
  peakIndex: number;
  width: number;
  height: number;
}

/**
 * Computes linear SVG path (`M... L...`) and terminal dot coordinates for the
 * 44px Hero KPI Sparkline (Chart #1). Guards against `n <= 1` and `max === 0`.
 */
export function buildSparklineGeometry(
  values: number[],
  width = 280,
  height = 44
): SparklineGeometry {
  const w = Math.max(120, width);
  const h = Math.max(28, height);
  const padX = 6;
  const padTop = 8;
  const padBottom = 6;
  const usableW = w - padX * 2;
  const usableH = h - padTop - padBottom;

  const safeVals =
    Array.isArray(values) && values.length > 0
      ? values.map((v) => Math.max(0, Number(v || 0)))
      : [0, 0];

  const n = safeVals.length;
  const max = Math.max(...safeVals, 0);

  const getX = (i: number) => {
    if (n <= 1) return w - padX;
    return Math.round((padX + i * (usableW / (n - 1))) * 100) / 100;
  };

  const getY = (v: number) => {
    if (max <= 0) return h - padBottom;
    return Math.round((h - padBottom - (v / max) * usableH) * 100) / 100;
  };

  const pathD =
    n === 1
      ? `M${padX},${getY(safeVals[0])} L${w - padX},${getY(safeVals[0])}`
      : safeVals.map((v, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(v)}`).join(' ');

  const lastIdx = n - 1;
  const peakIdx = findPeakIndex(safeVals);

  return {
    pathD,
    endX: getX(lastIdx),
    endY: getY(safeVals[lastIdx]),
    peakX: peakIdx >= 0 ? getX(peakIdx) : getX(lastIdx),
    peakY: peakIdx >= 0 ? getY(safeVals[peakIdx]) : getY(safeVals[lastIdx]),
    peakIndex: peakIdx,
    width: w,
    height: h,
  };
}

export interface WaterfallSummaryInput {
  gross_sales: number;
  mdr_fee: number;
  net_sales: number;
  system_share: number;
  owner_net: number;
  owner_share_pct: number;
  system_share_pct: number;
}

export interface WaterfallRowItem {
  id: 'gross_sales' | 'mdr_fee' | 'net_sales' | 'platform_fee' | 'net_payout';
  label: string;
  sublabel: string;
  from: number;
  to: number;
  amount: number;
  isDeduction: boolean;
  tone: 'neutral' | 'fee' | 'positive';
  color: string;
  leftPct: number;
  widthPct: number;
  pctOfGross: number;
}

/**
 * Builds the 5-step horizontal waterfall deduction model:
 * Gross Sales (100%) -> MDR Fee (-0.7%) -> Net Sales (99.3%) -> Platform Fee (-5%) -> Net Payout (94.3%)
 */
export function buildWaterfallRows(summary: WaterfallSummaryInput): WaterfallRowItem[] {
  const gross = Math.max(0, Number(summary.gross_sales || 0));
  const mdr = Math.max(0, Number(summary.mdr_fee || 0));
  const netSales = Math.max(0, Number(summary.net_sales || 0));
  const platformFee = Math.max(0, Number(summary.system_share || 0));
  const ownerNet = Math.max(0, Number(summary.owner_net || 0));
  const ownerPct = Number(summary.owner_share_pct ?? 95);
  const systemPct = Number(summary.system_share_pct ?? 5);

  const rawRows: Array<Omit<WaterfallRowItem, 'leftPct' | 'widthPct' | 'pctOfGross'>> = [
    {
      id: 'gross_sales',
      label: 'Gross Sales',
      sublabel: 'Total QRIS masuk',
      from: 0,
      to: gross,
      amount: gross,
      isDeduction: false,
      tone: 'neutral',
      color: '#8A8186',
    },
    {
      id: 'mdr_fee',
      label: 'MDR Fee (0.7%)',
      sublabel: 'Biaya Midtrans QRIS',
      from: netSales,
      to: gross,
      amount: mdr,
      isDeduction: true,
      tone: 'fee',
      color: '#A32D2D',
    },
    {
      id: 'net_sales',
      label: 'Net Sales',
      sublabel: 'Setelah potongan MDR',
      from: 0,
      to: netSales,
      amount: netSales,
      isDeduction: false,
      tone: 'neutral',
      color: '#8A8186',
    },
    {
      id: 'platform_fee',
      label: `Platform Fee (${systemPct}%)`,
      sublabel: 'Bagi hasil sistem',
      from: ownerNet,
      to: netSales,
      amount: platformFee,
      isDeduction: true,
      tone: 'fee',
      color: '#A32D2D',
    },
    {
      id: 'net_payout',
      label: `Net Payout (${ownerPct}%)`,
      sublabel: 'Diterima pemilik cabang',
      from: 0,
      to: ownerNet,
      amount: ownerNet,
      isDeduction: false,
      tone: 'positive',
      color: '#0F6E56',
    },
  ];

  return rawRows.map((row) => {
    if (gross <= 0 || row.amount <= 0) {
      return {
        ...row,
        leftPct: 0,
        widthPct: 0,
        pctOfGross: 0,
      };
    }

    const rawLeft = Math.max(0, Math.min(100, (row.from / gross) * 100));
    const rawWidth = Math.max(0, Math.min(100, ((row.to - row.from) / gross) * 100));
    // Ensure tiny deductions like 0.7% MDR remain visibly renderable (min 1.2% width)
    const widthPct = Math.max(1.2, rawWidth);
    const leftPct = Math.max(0, Math.min(100 - widthPct, rawLeft));
    const pctOfGross = Math.round((row.amount / gross) * 1000) / 10;

    return {
      ...row,
      leftPct,
      widthPct,
      pctOfGross,
    };
  });
}
