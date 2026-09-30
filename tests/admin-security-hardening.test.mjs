import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('src');

describe('Security Hardening: Login Dump Text & Credentials Elimination', () => {
  it('Login page should NOT contain hardcoded prefilled admin credentials in useState', () => {
    const loginSrc = fs.readFileSync(path.join(SRC, 'app/admin/login/page.tsx'), 'utf8');
    assert.strictEqual(loginSrc.includes("useState('admin@sakurazen.id')"), false, 'Must not prefill admin email');
    assert.strictEqual(loginSrc.includes("useState('sakura123')"), false, 'Must not prefill password');
    assert.strictEqual(loginSrc.includes("useState(true)"), false, 'Remember device should not default to true');
  });

  it('Login page should use neutral Email Address label and name@company.com placeholder', () => {
    const loginSrc = fs.readFileSync(path.join(SRC, 'app/admin/login/page.tsx'), 'utf8');
    assert.strictEqual(loginSrc.includes('Email Address'), true, 'Should use Email Address label');
    assert.strictEqual(loginSrc.includes('placeholder="name@company.com"'), true, 'Should use neutral placeholder');
    assert.strictEqual(loginSrc.includes('placeholder="admin@sakurazen.id"'), false, 'Should not show admin placeholder');
  });

  it('Forgot password modal should not leak simulation OTP in production', () => {
    const loginSrc = fs.readFileSync(path.join(SRC, 'app/admin/login/page.tsx'), 'utf8');
    assert.strictEqual(loginSrc.includes('[Dev OTP Simulator]'), false, 'Dev OTP Simulator text must not be rendered');
  });
});

describe('Security Hardening: Middleware & Session Guard', () => {
  it('Middleware must enforce no-cache and no-store headers on admin routes and redirects', () => {
    const middlewareSrc = fs.readFileSync(path.join(SRC, 'middleware.ts'), 'utf8');
    assert.strictEqual(middlewareSrc.includes('no-store, no-cache, must-revalidate, private'), true);
    assert.strictEqual(middlewareSrc.includes("'/admin'"), true, 'Must explicitly match /admin');
  });

  it('AdminLayout must contain client-side session auth verification guard', () => {
    const layoutSrc = fs.readFileSync(path.join(SRC, 'app/admin/layout.tsx'), 'utf8');
    assert.strictEqual(layoutSrc.includes('/api/admin/auth/me'), true, 'Must verify active session');
    assert.strictEqual(layoutSrc.includes('router.replace'), true, 'Must redirect unauthenticated users to login');
    assert.strictEqual(layoutSrc.includes('Verifying Security Session'), true, 'Must show secure loader instead of rendering UI shell prematurely');
  });

  it('Session cookie should have 24 hours maxAge and JWT expiration set to 24h', () => {
    const loginRouteSrc = fs.readFileSync(path.join(SRC, 'app/api/admin/auth/login/route.ts'), 'utf8');
    assert.strictEqual(loginRouteSrc.includes('maxAge: 60 * 60 * 24,'), true, 'Cookie maxAge must be 24h');

    const jwtSrc = fs.readFileSync(path.join(SRC, 'lib/jwt-edge.ts'), 'utf8');
    assert.strictEqual(jwtSrc.includes(".setExpirationTime('24h')"), true, 'JWT lifetime must be 24h');
  });

  it('All protected admin API routes must implement getAdminSession defense-in-depth', () => {
    const apiFiles = [
      'app/api/admin/dashboard/route.ts',
      'app/api/admin/chairs/route.ts',
      'app/api/admin/locations/route.ts',
      'app/api/admin/tickets/route.ts',
      'app/api/admin/users/route.ts',
    ];

    for (const file of apiFiles) {
      const src = fs.readFileSync(path.join(SRC, file), 'utf8');
      assert.strictEqual(
        src.includes('getAdminSession'),
        true,
        `${file} must verify active admin session`
      );
    }
  });
});
