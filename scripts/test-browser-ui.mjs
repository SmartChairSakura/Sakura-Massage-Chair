import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { SignJWT } from 'jose';

const ARTIFACT_DIR = '/home/rifpamks/.gemini/antigravity-cli/brain/7902fc13-9558-4fc2-9ace-e265cef8e896/screenshots';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'sakura_zen_backoffice_jwt_secret_key_2026_production_secure_795465';
const JWT_SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

async function getAdminToken() {
  return await new SignJWT({
    id: 'e696ca0b-930c-4ec7-8e6c-389f41d996cb',
    email: 'boss@sakura.com',
    username: 'bossbesar',
    name: 'Boss Besar',
    role: 'SUPER_ADMIN',
    location_id: null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET_KEY);
}

async function runBrowserTests() {
  console.log('--- Starting Chrome DevTools Browser Testing ---');
  const token = await getAdminToken();

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--headless=new'],
  });

  const page = await browser.newPage();

  // Set session cookie
  await page.setCookie({
    name: 'sakura_admin_session',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  });

  // TEST 1: Desktop Viewport (1920x1080) - Dashboard with DatePicker Open
  console.log('1. Testing Desktop Dashboard (1920 x 1080)...');
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3333/admin/dashboard', { waitUntil: 'networkidle0' });

  // Check initial desktop overflow
  const desktopDashboardPre = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
  }));
  console.log('Desktop Dashboard initial overflow:', desktopDashboardPre);

  // Click DatePicker button to open popover
  const dateBtn = await page.waitForSelector('button[title="Open Date Filter"]');
  await dateBtn.click();
  await new Promise((r) => setTimeout(r, 400));

  // Measure popover position and overflow
  const desktopDashboardModal = await page.evaluate(() => {
    const modal = document.querySelector('div[class*="shadow-2xl"]');
    if (!modal) return null;
    const rect = modal.getBoundingClientRect();
    return {
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      windowWidth: window.innerWidth,
      isCutOffRight: rect.right > window.innerWidth,
      isCutOffLeft: rect.left < 0,
      documentScrollWidth: document.documentElement.scrollWidth,
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  console.log('Desktop Dashboard Modal Bounds:', desktopDashboardModal);

  const desktopDashboardPath = path.join(ARTIFACT_DIR, 'desktop_dashboard_datepicker_open.png');
  await page.screenshot({ path: desktopDashboardPath });
  console.log('Captured screenshot:', desktopDashboardPath);

  // TEST 2: Desktop Viewport (1920x1080) - Tickets with DatePicker Open
  console.log('2. Testing Desktop Tickets (1920 x 1080)...');
  await page.goto('http://localhost:3333/admin/tickets', { waitUntil: 'networkidle0' });

  const ticketDateBtn = await page.waitForSelector('button[title="Open Date Filter"]');
  await ticketDateBtn.click();
  await new Promise((r) => setTimeout(r, 400));

  const desktopTicketsModal = await page.evaluate(() => {
    const modal = document.querySelector('div[class*="shadow-2xl"]');
    if (!modal) return null;
    const rect = modal.getBoundingClientRect();
    return {
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      windowWidth: window.innerWidth,
      isCutOffRight: rect.right > window.innerWidth,
      isCutOffLeft: rect.left < 0,
      documentScrollWidth: document.documentElement.scrollWidth,
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  console.log('Desktop Tickets Modal Bounds:', desktopTicketsModal);

  const desktopTicketsPath = path.join(ARTIFACT_DIR, 'desktop_tickets_datepicker_open.png');
  await page.screenshot({ path: desktopTicketsPath });
  console.log('Captured screenshot:', desktopTicketsPath);

  // TEST 3: Mobile Phone Viewport (iPhone 14 standard: 390 x 844) - Dashboard
  console.log('3. Testing Mobile Phone Dashboard (390 x 844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3333/admin/dashboard', { waitUntil: 'networkidle0' });

  const mobileDateBtn = await page.waitForSelector('button[title="Open Date Filter"]');
  await mobileDateBtn.click();
  await new Promise((r) => setTimeout(r, 400));

  const mobileDashboardModal = await page.evaluate(() => {
    const modal = document.querySelector('div[class*="shadow-2xl"]');
    if (!modal) return null;
    const rect = modal.getBoundingClientRect();
    return {
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      windowWidth: window.innerWidth,
      isCutOffRight: rect.right > window.innerWidth,
      isCutOffLeft: rect.left < 0,
      documentScrollWidth: document.documentElement.scrollWidth,
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  console.log('Mobile Dashboard Modal Bounds:', mobileDashboardModal);

  const mobileDashboardPath = path.join(ARTIFACT_DIR, 'mobile_dashboard_datepicker_open.png');
  await page.screenshot({ path: mobileDashboardPath });
  console.log('Captured screenshot:', mobileDashboardPath);

  // TEST 4: Mobile Phone Viewport (390 x 844) - Tickets
  console.log('4. Testing Mobile Phone Tickets (390 x 844)...');
  await page.goto('http://localhost:3333/admin/tickets', { waitUntil: 'networkidle0' });

  const mobileTicketDateBtn = await page.waitForSelector('button[title="Open Date Filter"]');
  await mobileTicketDateBtn.click();
  await new Promise((r) => setTimeout(r, 400));

  const mobileTicketsModal = await page.evaluate(() => {
    const modal = document.querySelector('div[class*="shadow-2xl"]');
    if (!modal) return null;
    const rect = modal.getBoundingClientRect();
    return {
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      windowWidth: window.innerWidth,
      isCutOffRight: rect.right > window.innerWidth,
      isCutOffLeft: rect.left < 0,
      documentScrollWidth: document.documentElement.scrollWidth,
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  console.log('Mobile Tickets Modal Bounds:', mobileTicketsModal);

  const mobileTicketsPath = path.join(ARTIFACT_DIR, 'mobile_tickets_datepicker_open.png');
  await page.screenshot({ path: mobileTicketsPath });
  console.log('Captured screenshot:', mobileTicketsPath);

  await browser.close();

  const finalSummary = {
    timestamp: new Date().toISOString(),
    desktop: {
      dashboard: desktopDashboardModal,
      tickets: desktopTicketsModal,
    },
    mobile: {
      dashboard: mobileDashboardModal,
      tickets: mobileTicketsModal,
    },
    screenshots: {
      desktopDashboard: desktopDashboardPath,
      desktopTickets: desktopTicketsPath,
      mobileDashboard: mobileDashboardPath,
      mobileTickets: mobileTicketsPath,
    },
  };

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'test_results.json'), JSON.stringify(finalSummary, null, 2));
  console.log('--- DevTools Verification Complete. Results saved to test_results.json ---');
}

runBrowserTests().catch((err) => {
  console.error('Browser testing failed:', err);
  process.exit(1);
});
