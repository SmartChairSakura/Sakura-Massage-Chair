import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const WEB_ROOT = path.resolve(process.cwd());

function readFile(relativePath) {
  return fs.readFileSync(path.join(WEB_ROOT, relativePath), 'utf8');
}

test('Chair List, Edit Chair, & Firmware OTA UI/UX Audit Verification Suite (18 Audit Checks)', async (t) => {
  const chairsPage = readFile('src/app/admin/chairs/page.tsx');
  const scopedChairsPage = readFile('src/app/admin/locations/[locationId]/chairs/page.tsx');
  const locationsPage = readFile('src/app/admin/locations/page.tsx');
  const locationSelector = readFile('src/components/admin/LocationSelector.tsx');
  const chairsApi = readFile('src/app/api/admin/chairs/route.ts');
  const otaUploadApi = readFile('src/app/api/admin/chairs/firmware/upload/route.ts');

  await t.test('1. Terminal PIN Security: Masked in table & API list, Audited Reveal, Random Generation, No "DEFAULT: 123456" leak (Section 7.1 & 12.1)', () => {
    // API GET strips raw pin and returns pin_masked
    assert.match(chairsApi, /const\s*\{\s*pin:\s*rawPin,\s*\.\.\.rest\s*\}\s*=\s*c/);
    assert.match(chairsApi, /pin_masked:\s*'••••••'/);
    assert.match(chairsApi, /action\s*===\s*'REVEAL_PIN'/);
    assert.match(chairsApi, /function generateRandomPin/);

    // Page masks PIN in table and uses PinField without "DEFAULT: 123456"
    assert.doesNotMatch(chairsPage, /DEFAULT:\s*123456/i, 'Must not leak DEFAULT: 123456 in modal label');
    assert.doesNotMatch(chairsPage, /useState\('123456'\)/, 'Must not prefill static 123456 PIN in state');
    assert.match(chairsPage, /function PinField/);
    assert.match(chairsPage, /inputMode="numeric"/);
    assert.match(chairsPage, /pattern="\\d\{6\}"/);
    assert.match(chairsPage, /aria-pressed=\{show\}/);
    assert.match(chairsPage, /••••••/);
  });

  await t.test('2. Safe Firmware OTA Flow: Non-ALL default, Canary/Staged Strategy, SemVer > Installed, 1.5MB & SHA-256 Check, Typed DEPLOY Gate, Specific CTA (Section 7.2 & 12.4)', () => {
    assert.doesNotMatch(
      chairsPage,
      /const\s*\[otaTargetChairId,\s*setOtaTargetChairId\]\s*=\s*useState\('ALL'\)/,
      'OTA target must not default to ALL fleet-wide broadcast'
    );
    assert.match(
      chairsPage,
      /const\s*\[otaTargetChairId,\s*setOtaTargetChairId\]\s*=\s*useState\(''\)/
    );
    assert.match(chairsPage, /useState<'canary'\s*\|\s*'staged'\s*\|\s*'all'>\('canary'\)/);
    assert.ok(chairsPage.includes('const SEMVER_REGEX = /^\\d+\\.\\d+\\.\\d+$/;'));
    assert.match(chairsPage, /function compareSemver/);
    assert.match(chairsPage, /const MAX_FIRMWARE_BYTES = 1_572_864/);
    assert.match(chairsPage, /crypto\.subtle\.digest\('SHA-256'/);
    assert.match(chairsPage, /Replace file/);
    assert.match(chairsPage, /otaTypedConfirm\.trim\(\)\s*===\s*'DEPLOY'/);
    assert.match(
      chairsPage,
      /Deploy \$\{otaVersion\.trim\(\) \|\| '0\.0\.0'\} to \$\{formatChairCount/
    );

    // Server-side validation in upload route
    assert.match(otaUploadApi, /MAX_FIRMWARE_BYTES = 1_572_864/);
    assert.match(otaUploadApi, /createHash\('sha256'\)/);
    assert.match(otaUploadApi, /strategy === 'canary'/);
    assert.match(otaUploadApi, /strategy === 'staged'/);
  });

  await t.test('3. Cancel Pending OTA & Rollback Support (Section 7.2 & 12.3)', () => {
    assert.match(chairsPage, /Waiting standby/);
    assert.match(chairsPage, /handleCancelOta/);
    assert.match(chairsPage, /handleRollbackOta/);
    assert.match(chairsApi, /action === 'CANCEL_OTA'/);
    assert.match(chairsApi, /action === 'ROLLBACK_OTA'/);
  });

  await t.test('4. Unified Single Chair List Route & Header LocationSelector URL Sync (Section 7.3 & 12.5)', () => {
    assert.match(scopedChairsPage, /redirect\(`\/admin\/chairs\?location=\$\{encodeURIComponent\(params\.locationId\)\}`\)/);
    assert.match(locationsPage, /href=\{`\/admin\/chairs\?location=\$\{loc\.id\}`\}/);
    assert.match(
      locationSelector,
      /searchParams\.get\('location'\)\s*\|\|\s*searchParams\.get\('location_id'\)\s*\|\|\s*'ALL'/
    );
  });

  await t.test('5. Orthogonal Table Filters: Status & Firmware AppSelects without Duplicate Location Dropdown (Section 7.4)', () => {
    assert.match(chairsPage, /aria-label="Filter by device status"/);
    assert.match(chairsPage, /aria-label="Filter by firmware status"/);
    assert.doesNotMatch(
      chairsPage,
      /aria-label="Filter chairs by location"/,
      'Must not duplicate global LocationSelector in table toolbar'
    );
  });

  await t.test('6. Palette & Contrast Compliance: Zero #1B1C1C Black Buttons, Secondary Deploy Button, High-Contrast Tokens (Section 3 & 4)', () => {
    assert.doesNotMatch(chairsPage, /bg-\[#1B1C1C\]/, 'Must not use off-palette #1B1C1C black buttons');
    assert.doesNotMatch(chairsPage, /#B79A5F/i, 'Must not use low-contrast #B79A5F amber text');
    assert.doesNotMatch(chairsPage, /#AF98A3/i, 'Must not use low-contrast #AF98A3 disabled text');
    assert.match(chairsPage, /bg-\(--warn-bg\)/);
    assert.match(chairsPage, /text-\(--warn\)/);
    assert.match(chairsPage, /border-\(--border-field\)/);
  });

  await t.test('7. Typography, Concise Labels, & Icon Discipline (Section 5, 6, & 9)', () => {
    assert.doesNotMatch(chairsPage, /font-extrabold/, 'Must not use font-extrabold');
    assert.doesNotMatch(chairsPage, /font-black/, 'Must not use font-black');
    assert.doesNotMatch(chairsPage, /\+\s*Add Chair/, 'Must not have double plus in Add Chair button');
    assert.doesNotMatch(chairsPage, /Hardware Model:/i, 'Labels must not use colons');
    assert.doesNotMatch(chairsPage, /Chair Code \(Unique\):/i, 'Labels must not be ALL-CAPS with colons');
    assert.doesNotMatch(chairsPage, /New Firmware Version:/i);
    assert.match(chairsPage, /label="Chair code"/);
    assert.match(chairsPage, /label="Model"/);
    assert.match(chairsPage, /label="Name"/);
    assert.match(chairsPage, /label="Branch location"/);
    assert.match(chairsPage, /label="Terminal PIN"/);
    assert.match(chairsPage, /label="Target"/);
    assert.match(chairsPage, /label="Version"/);
    assert.match(chairsPage, /label="Firmware file \(\.bin\)"/);
    assert.match(chairsPage, /label="Release notes \(optional\)"/);
  });

  await t.test('8. 5-State Device Status Vocabulary & Relative Heartbeat Last Seen (Section 7.5 & 12.2)', () => {
    assert.match(chairsPage, /label:\s*'Online'/);
    assert.match(chairsPage, /label:\s*'In use'/);
    assert.match(chairsPage, /label:\s*'Offline'/);
    assert.match(chairsPage, /label:\s*'Updating'/);
    assert.match(chairsPage, /label:\s*'Error'/);
    assert.match(chairsPage, /Intl\.RelativeTimeFormat/);
    assert.match(chairsPage, /Last seen \{formatRelativeHeartbeat/);
  });

  await t.test('9. Natural Alphanumeric Sorting, Unique Alias Validation, Typo Normalization, & Reversible Archive Undo (Section 7.5, 7.6, & 8)', () => {
    assert.match(chairsPage, /numeric:\s*true/);
    assert.match(chairsPage, /aria-sort=/);
    assert.match(chairsPage, /duplicateAliasError/);
    assert.match(chairsApi, /Stagging IoT/);
    assert.match(chairsPage, /handleArchiveChair/);
    assert.match(chairsPage, /handleRestoreChair/);
    assert.match(chairsPage, /isBranchTransferring/);
    assert.match(chairsPage, /Discard unsaved changes\?/);
    assert.match(chairsPage, /Linked to physical hardware and cannot be changed\./);
  });

  await t.test('10. Keyboard-Accessible .bin File Input & Resilient Empty State (Section 10 & 11)', () => {
    assert.match(chairsPage, /id="ota-bin-file-input"/);
    assert.match(chairsPage, /htmlFor="ota-bin-file-input"/);
    assert.match(chairsPage, /Choose \.bin file or drop it here/);
    assert.match(chairsPage, /Add first chair/);
  });
});
