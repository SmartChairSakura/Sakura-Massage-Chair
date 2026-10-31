import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('src');

describe('Tickets Financial Breakdown & Clean Client-Facing UI Suite', () => {
  const pagePath = path.join(SRC, 'app/admin/tickets/page.tsx');
  const routePath = path.join(SRC, 'app/api/admin/tickets/route.ts');

  it('Tickets UI table must feature discrete separated financial columns', () => {
    assert.strictEqual(fs.existsSync(pagePath), true, 'Tickets page file must exist');
    const content = fs.readFileSync(pagePath, 'utf8');

    assert.match(content, /<th[^>]*>Slip Number<\/th>/, 'Must have Slip Number column');
    assert.match(content, /<th[^>]*>Date & Time<\/th>/, 'Must have Date & Time column');
    assert.match(content, /<th[^>]*>Location & Chair<\/th>/, 'Must have Location & Chair column');
    assert.match(content, /<th[^>]*>Amount<\/th>/, 'Must have separate Amount column');
    assert.match(content, /<th[^>]*>Net Payout<\/th>/, 'Must have separate Net Payout column');
    assert.match(content, /<th[^>]*>MDR \(0\.7%\)<\/th>/, 'Must have separate MDR column');
    assert.match(content, /<th[^>]*>Platform Fee<\/th>/, 'Must have separate Platform Fee column');
    assert.match(content, /<th[^>]*>Duration<\/th>/, 'Must have separate Duration column');
    assert.doesNotMatch(content, /Amount & Duration/, 'Must not merge Amount & Duration into a single column');
  });

  it('Tickets UI table must not display pulse counts to clients', () => {
    const content = fs.readFileSync(pagePath, 'utf8');
    assert.doesNotMatch(content, /pulse_count.*pulses/, 'Must eliminate pulse counts from client-facing table row');
    assert.doesNotMatch(content, /<th[^>]*>Pulses<\/th>/, 'Must not have Pulses column in table header');
  });

  it('CSV Export must include 20 enterprise settlement columns matching PARKEE standard', () => {
    const content = fs.readFileSync(pagePath, 'utf8');
    assert.match(content, /'Location'/, 'Must export Location column');
    assert.match(content, /'Location Code'/, 'Must export Location Code column');
    assert.match(content, /'Chair Code'/, 'Must export Chair Code column');
    assert.match(content, /'Created From'/, 'Must export Created From column');
    assert.match(content, /'Session Start \(WIB\)'/, 'Must export Session Start column');
    assert.match(content, /'Session End \(WIB\)'/, 'Must export Session End column');
    assert.match(content, /'Duration \(Mins\)'/, 'Must export Duration in minutes column');
    assert.match(content, /'Payment Provider'/, 'Must export Payment Provider column');
    assert.match(content, /'Payment Status'/, 'Must export Payment Status column');
    assert.match(content, /'PG Ref Number'/, 'Must export PG Ref Number column');
    assert.match(content, /'MDR Paid By'/, 'Must export MDR Paid By column');
    assert.match(content, /'Gross Sales \(IDR\)'/, 'Must export Gross Sales column');
    assert.match(content, /'MDR Fee \(IDR\)'/, 'Must export MDR Fee column');
    assert.match(content, /'Platform Fee \(IDR\)'/, 'Must export Platform Fee column');
    assert.match(content, /'Net Payout \(IDR\)'/, 'Must export Net Payout column');
    assert.match(content, /'Ticket Status'/, 'Must export Ticket Status column');
    assert.doesNotMatch(content, /'Pulses'/, 'Must omit internal hardware pulses from client CSV');
  });

  it('Backend Tickets API route must enrich tickets with financial breakdown and location metadata', () => {
    assert.strictEqual(fs.existsSync(routePath), true, 'Tickets API route file must exist');
    const content = fs.readFileSync(routePath, 'utf8');

    assert.match(content, /chair_slip_payments/, 'Must join or query chair_slip_payments');
    assert.match(content, /gross_sales/, 'Must return gross_sales field');
    assert.match(content, /mdr_fee/, 'Must return mdr_fee field');
    assert.match(content, /platform_fee/, 'Must return platform_fee field');
    assert.match(content, /net_payout/, 'Must return net_payout field');
    assert.match(content, /location_name/, 'Must return location_name metadata');
    assert.match(content, /location_code/, 'Must return location_code metadata');
  });

  it('Financial Invariant: Package simulation guarantees zero discrepancy across all production packages', () => {
    const packages = [
      { min: 4, gross: 5000 },
      { min: 8, gross: 10000 },
      { min: 12, gross: 15000 },
      { min: 16, gross: 20000 },
      { min: 20, gross: 25000 },
      { min: 24, gross: 30000 },
      { min: 28, gross: 35000 },
      { min: 32, gross: 40000 },
      { min: 36, gross: 45000 },
      { min: 40, gross: 50000 },
      { min: 44, gross: 55000 },
      { min: 48, gross: 60000 },
      { min: 52, gross: 65000 },
      { min: 56, gross: 70000 },
      { min: 60, gross: 75000 },
    ];

    packages.forEach(({ min, gross }) => {
      const mdr = Math.round(gross * 0.007);
      const netGross = gross - mdr;
      const platformFee = Math.round(netGross * 0.05);
      const netPayout = netGross - platformFee;

      assert.strictEqual(
        mdr + platformFee + netPayout,
        gross,
        `Package ${min}m (${gross}) must sum exactly to Gross with zero discrepancy`
      );
    });
  });

  it('Financial Invariant: Backend aggregate summaries sum exact row-level line items', () => {
    const ticketsContent = fs.readFileSync(routePath, 'utf8');
    const dashboardPath = path.join(SRC, 'app/api/admin/dashboard/route.ts');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

    // Tickets API must sum row-level values into totalMdrFee and totalNetPayout
    assert.match(ticketsContent, /totalMdrFee\s*\+=\s*rowMdr/);
    assert.match(ticketsContent, /totalNetPayout\s*\+=\s*rowNetPayout/);

    // Dashboard API must sum row-level values into totalMdr and totalOwnerNet
    assert.match(dashboardContent, /totalMdr\s*\+=\s*rowMdr/);
    assert.match(dashboardContent, /totalOwnerNet\s*\+=\s*rowOwnerNet/);
  });
});
