import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const WEB_ROOT = path.resolve(process.cwd());

function readFile(relativePath) {
  return fs.readFileSync(path.join(WEB_ROOT, relativePath), 'utf8');
}

test('Location Setting UI/UX & WCAG 2.2 AA Audit Verification Suite', async (t) => {
  const locPage = readFile('src/app/admin/locations/page.tsx');
  const globalsCss = readFile('src/app/globals.css');
  const rootLayout = readFile('src/app/layout.tsx');
  const adminHeader = readFile('src/components/admin/AdminHeader.tsx');
  const adminSidebar = readFile('src/components/admin/AdminSidebar.tsx');
  const themedSelect = readFile('src/components/admin/ThemedSelect.tsx');
  const locIdApi = readFile('src/app/api/admin/locations/[id]/route.ts');

  await t.test('1. WCAG 2.2 AA Color & Surface Tokens in globals.css (Section 3)', () => {
    assert.match(globalsCss, /--border-field:\s*#8F8589/i, 'Input border must have >= 3:1 contrast (#8F8589)');
    assert.match(globalsCss, /--text-muted:\s*#6B6064/i, 'Muted text must have >= 4.5:1 contrast (#6B6064)');
    assert.match(globalsCss, /--text-placeholder:\s*#7A6F73/i, 'Placeholder must have >= 4.5:1 contrast (#7A6F73)');
    assert.match(globalsCss, /--brand-soft:\s*#F6E9EF/i);
    assert.match(globalsCss, /--ok:\s*#0F6E56/i);
    assert.match(globalsCss, /--warn:\s*#8A5A00/i);
    assert.match(globalsCss, /--error:\s*#A32D2D/i);
    assert.match(globalsCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  await t.test('2. Typography Pairing: Plus Jakarta Sans (400/500/600) + JetBrains Mono for Site Code (Section 4)', () => {
    assert.match(rootLayout, /JetBrains_Mono/);
    assert.match(rootLayout, /--font-mono/);
    assert.doesNotMatch(locPage, /font-extrabold/, 'Location Setting page must not use font-extrabold');
    assert.doesNotMatch(locPage, /font-black/, 'Location Setting page must not use font-black');
    assert.doesNotMatch(adminHeader, /font-extrabold/);
    assert.doesNotMatch(adminSidebar, /font-extrabold/);
  });

  await t.test('3. Icons & Concise Labels: No double plus (+), no colons (:), no decorative section icons (Section 5 & 10)', () => {
    assert.doesNotMatch(locPage, /\+\s*Add Location/, 'Must not have double plus in Add Location button');
    assert.doesNotMatch(locPage, /\+\s*ADD REVENUE SHARE ROW/i, 'Must not have double plus in Add party button');
    assert.match(locPage, /<span>Add Location<\/span>/);
    assert.match(locPage, /<span>Add party<\/span>/);
    assert.doesNotMatch(locPage, /Branch Name:/i, 'Field labels must be sentence case without colons');
    assert.doesNotMatch(locPage, /Income Entity:/i, 'Field labels must use concise Recipient without colons');
    assert.match(locPage, /label="Branch name"/);
    assert.match(locPage, /label="Site code"/);
    assert.match(locPage, /label="Recipient"/);
    assert.match(locPage, /label="Party name"/);
    assert.match(locPage, /label="Share"/);
  });

  await t.test('4. Non-Clipped Modal Shell & Accessible Dialog Attributes (Section 7.1 & 8)', () => {
    assert.match(locPage, /role="dialog"/);
    assert.match(locPage, /aria-modal="true"/);
    assert.match(locPage, /aria-labelledby="loc-modal-title"/);
    assert.match(locPage, /max-h-\[90dvh\]/);
    // Header and footer must be shrink-0 outside the scrollable form body
    assert.match(locPage, /<header className="flex shrink-0/);
    assert.match(locPage, /<footer className="flex shrink-0/);
  });

  await t.test('5. Short Recipient Options & 3-State Accessible Revenue Share Total Badge (Section 7.3)', () => {
    assert.match(locPage, /value:\s*'OWNER',\s*label:\s*'Owner'/);
    assert.match(locPage, /value:\s*'SYSTEM',\s*label:\s*'Platform'/);
    assert.match(locPage, /value:\s*'PARTNER',\s*label:\s*'Partner'/);
    assert.match(locPage, /value:\s*'OTHER',\s*label:\s*'Other'/);
    assert.match(locPage, /aria-live="polite"/);
    assert.match(locPage, /Total 100%/);
    assert.match(locPage, /remaining \{pctDiff\}%/);
    assert.match(locPage, /excess \{-pctDiff\}%/);
  });

  await t.test('6. Location List UX: Hidden Global Selector, Separated Status vs Fleet Size & Pluralization (Section 6)', () => {
    assert.match(adminHeader, /const hideLocationSelector = pathname === '\/admin\/locations'/);
    assert.match(locPage, /function formatChairCount/);
    assert.match(locPage, /`\$\{n\} chair\$\{n === 1 \? '' : 's'\}`/);
    assert.doesNotMatch(locPage, /Online \(\{loc\.online_chair_count/, 'Status column must not conflate fleet online count with location status');
    assert.match(locPage, /<span>Active<\/span>/);
    assert.match(locPage, /<span>Inactive<\/span>/);
  });

  await t.test('7. Reversible Interactions: Row Undo (6s), Location Soft-Delete Undo (8s), Dirty Close Guard (Section 11)', () => {
    assert.match(locPage, /Discard unsaved changes\?/);
    assert.match(locPage, /Keep editing/);
    assert.match(locPage, /handleUndoRemoveRow/);
    assert.match(locPage, /handleUndoDeleteLocation/);
    assert.match(locIdApi, /if \(body\.deleted_at !== undefined\) updatePayload\.deleted_at = body\.deleted_at/);
  });

  await t.test('8. Global AppSelect (ThemedSelect.tsx) Rollout: Zero Native <select> Elements Across Entire Web App', () => {
    assert.match(themedSelect, /@radix-ui\/react-select/);
    assert.match(themedSelect, /export function AppSelect/);

    const filesToVerify = [
      'src/components/admin/LocationSelector.tsx',
      'src/app/admin/locations/page.tsx',
      'src/app/admin/chairs/page.tsx',
      'src/app/admin/tickets/page.tsx',
      'src/app/admin/users/page.tsx',
    ];

    for (const file of filesToVerify) {
      const content = readFile(file);
      assert.doesNotMatch(content, /<select[\s>]/, `${file} must use AppSelect instead of native <select>`);
      assert.match(content, /AppSelect/, `${file} must import and render AppSelect`);
    }
  });
});
