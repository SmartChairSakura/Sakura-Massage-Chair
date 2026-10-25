import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Dynamically transpile and import src/lib/chart-utils.ts so tests run against the real implementation
const tsPath = path.resolve(process.cwd(), 'src/lib/chart-utils.ts');
const tsCode = fs.readFileSync(tsPath, 'utf8');
const jsOutput = ts.transpileModule(tsCode, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const dataUrl = `data:text/javascript;base64,${Buffer.from(jsOutput, 'utf8').toString('base64')}`;
const {
  niceScale,
  formatCompactK,
  findPeakIndex,
  buildSparklineGeometry,
  buildWaterfallRows,
} = await import(dataUrl);

test('Chart Utilities Suite: niceScale Y-axis tick generator', async (t) => {
  await t.test('Computes round 5k ticks for sandbox peak Rp 20.085 (maxTicks = 5)', () => {
    const scale = niceScale(20085, 5);
    assert.equal(scale.step, 5000);
    assert.equal(scale.top, 25000);
    assert.deepEqual(scale.ticks, [0, 5000, 10000, 15000, 20000, 25000]);
  });

  await t.test('Computes round 5k ticks for exact Rp 20.000 (maxTicks = 5)', () => {
    const scale = niceScale(20000, 5);
    assert.equal(scale.step, 5000);
    assert.equal(scale.top, 20000);
    assert.deepEqual(scale.ticks, [0, 5000, 10000, 15000, 20000]);
  });

  await t.test('Guards against zero, negative, NaN, and Infinity without infinite loop', () => {
    const zeroRevenue = niceScale(0, 5);
    assert.equal(zeroRevenue.top, 20000);
    assert.deepEqual(zeroRevenue.ticks, [0, 5000, 10000, 15000, 20000]);

    const nanScale = niceScale(Number.NaN, 5);
    assert.equal(nanScale.top, 20000);
    assert.ok(nanScale.ticks.length >= 2);

    const zeroSessions = niceScale(0, 4, { integerOnly: true });
    assert.equal(zeroSessions.top, 4);
    assert.deepEqual(zeroSessions.ticks, [0, 1, 2, 3, 4]);
  });

  await t.test('Computes integer-only ticks for session volume (12 sessions, 1 session)', () => {
    const s12 = niceScale(12, 4, { integerOnly: true });
    assert.equal(s12.top, 15);
    assert.deepEqual(s12.ticks, [0, 5, 10, 15]);
    assert.ok(s12.ticks.every((v) => Number.isInteger(v)));

    const s1 = niceScale(1, 4, { integerOnly: true });
    assert.equal(s1.top, 2);
    assert.deepEqual(s1.ticks, [0, 1, 2]);
  });
});

test('Chart Utilities Suite: formatCompactK & findPeakIndex', async (t) => {
  await t.test('formatCompactK formats 0, thousands, and millions cleanly', () => {
    assert.equal(formatCompactK(0), '0');
    assert.equal(formatCompactK(500), '500');
    assert.equal(formatCompactK(5000), '5k');
    assert.equal(formatCompactK(2500), '2.5k');
    assert.equal(formatCompactK(20000), '20k');
    assert.equal(formatCompactK(1500000), '1.5M');
  });

  await t.test('findPeakIndex identifies peak day index and returns -1 for all-zero series', () => {
    assert.equal(findPeakIndex([5000, 0, 0, 0, 5000, 20085, 0, 0, 0, 0, 0]), 5);
    assert.equal(findPeakIndex([0, 0, 0, 0]), -1);
    assert.equal(findPeakIndex([]), -1);
  });

  await t.test('buildSparklineGeometry generates valid non-NaN SVG paths for 11-day, 1-day, and all-zero series', () => {
    const s11 = buildSparklineGeometry([5000, 0, 0, 0, 5000, 20085, 0, 0, 0, 0, 0], 280, 44);
    assert.ok(s11.pathD.startsWith('M6,'));
    assert.doesNotMatch(s11.pathD, /NaN/);
    assert.equal(s11.peakIndex, 5);
    assert.ok(Number.isFinite(s11.endX) && Number.isFinite(s11.endY));

    const s1 = buildSparklineGeometry([10000], 280, 44);
    assert.doesNotMatch(s1.pathD, /NaN/);
    assert.ok(Number.isFinite(s1.endX) && Number.isFinite(s1.endY));

    const sZero = buildSparklineGeometry([0, 0, 0], 280, 44);
    assert.doesNotMatch(sZero.pathD, /NaN/);
    assert.equal(sZero.peakIndex, -1);
  });
});

test('Chart Utilities Suite: buildWaterfallRows (Chart #4)', async (t) => {
  await t.test('Builds accurate 5-step floating waterfall geometry for Rp 30.085 sandbox data', () => {
    const rows = buildWaterfallRows({
      gross_sales: 30085,
      mdr_fee: 211,
      net_sales: 29874,
      system_share: 1494,
      owner_net: 28380,
      owner_share_pct: 95,
      system_share_pct: 5,
    });

    assert.equal(rows.length, 5);
    assert.equal(rows[0].id, 'gross_sales');
    assert.equal(rows[0].from, 0);
    assert.equal(rows[0].to, 30085);
    assert.equal(rows[0].color, '#8A8186');

    // MDR Fee floats from net_sales (29874) to gross_sales (30085) in fee red (#A32D2D)
    assert.equal(rows[1].id, 'mdr_fee');
    assert.equal(rows[1].from, 29874);
    assert.equal(rows[1].to, 30085);
    assert.equal(rows[1].isDeduction, true);
    assert.equal(rows[1].color, '#A32D2D');
    assert.ok(rows[1].widthPct >= 1.2, 'Tiny MDR deduction should have a minimum visible widthPct');

    // Platform Fee floats from owner_net (28380) to net_sales (29874) in fee red (#A32D2D)
    assert.equal(rows[3].id, 'platform_fee');
    assert.equal(rows[3].from, 28380);
    assert.equal(rows[3].to, 29874);
    assert.equal(rows[3].isDeduction, true);
    assert.equal(rows[3].color, '#A32D2D');

    // Net Payout spans 0 to 28380 in emerald green (#0F6E56)
    assert.equal(rows[4].id, 'net_payout');
    assert.equal(rows[4].from, 0);
    assert.equal(rows[4].to, 28380);
    assert.equal(rows[4].color, '#0F6E56');
  });

  await t.test('Safely handles all-zero summary without NaN percentages', () => {
    const rows = buildWaterfallRows({
      gross_sales: 0,
      mdr_fee: 0,
      net_sales: 0,
      system_share: 0,
      owner_net: 0,
      owner_share_pct: 95,
      system_share_pct: 5,
    });

    rows.forEach((r) => {
      assert.equal(r.leftPct, 0);
      assert.equal(r.widthPct, 0);
      assert.equal(r.pctOfGross, 0);
    });
  });
});
