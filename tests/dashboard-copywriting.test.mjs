import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const WEB_ROOT = path.resolve(process.cwd());

function readFile(relativePath) {
  const fullPath = path.join(WEB_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

test('TDD Copywriting Suite: Admin Navigation & Shell', async (t) => {
  await t.test('LocationSelector should use "All Locations" and no "Semua Lokasi"', () => {
    const content = readFile('src/components/admin/LocationSelector.tsx');
    assert.match(content, /All Locations/);
    assert.doesNotMatch(content, /Semua Lokasi/);
  });

  await t.test('AdminHeader should use clean English labels', () => {
    const content = readFile('src/components/admin/AdminHeader.tsx');
    assert.match(content, /Sign Out/);
    assert.doesNotMatch(content, /Keluar \/ Logout/);
  });
});

test('TDD Copywriting Suite: Sales Summary Dashboard (/admin/dashboard)', async (t) => {
  const content = readFile('src/app/admin/dashboard/page.tsx');

  await t.test('Subtitle should have zero fluff', () => {
    assert.match(content, /Real-time QRIS revenue, payment processing fees, and partner payouts\./);
    assert.doesNotMatch(content, /Ringkasan omset penjualan QRIS/);
  });

  await t.test('Date range presets should be in English', () => {
    const modalContent = readFile('src/components/admin/DatePickerModal.tsx');
    assert.match(modalContent, /label:\s*'TODAY'/);
    assert.match(modalContent, /label:\s*'THIS MONTH'/);
    assert.match(modalContent, /label:\s*'ALL TIME'/);
    assert.doesNotMatch(modalContent, /label:\s*'HARI INI'/);
    assert.doesNotMatch(modalContent, /label:\s*'BULAN INI'/);
  });

  await t.test('Date type toggles should use clear business terminology', () => {
    assert.match(content, /Transaction Date/);
    assert.match(content, /Settlement Date/);
  });

  await t.test('Hero financial card should use Net Payout and clean platform fees', () => {
    assert.match(content, /Net Payout/);
    assert.match(content, /Platform Fee/);
    assert.doesNotMatch(content, /Pendapatan Bersih Pemilik Lahan/);
    assert.doesNotMatch(content, /\[-\] MDR/);
    assert.doesNotMatch(content, /\[=\] Net Sales/);
  });

  await t.test('Fleet & transaction capacity cards should be scan-friendly', () => {
    assert.match(content, /Active Fleet/);
    assert.match(content, /Paid Sessions/);
    assert.doesNotMatch(content, /Unit Kursi Siap Operasional/);
    assert.doesNotMatch(content, /Sesi Pijat QRIS Sukses/);
  });

  await t.test('Chart titles should be modern English and scan-friendly', () => {
    assert.match(content, /Daily Revenue Trend/);
    assert.match(content, /Daily Session Volume/);
    assert.doesNotMatch(content, /Grafik Tren Omset Harian/);
    assert.doesNotMatch(content, /Grafik Tren Total Qty Tiket/);
  });
});

test('TDD Copywriting Suite: Location Management (/admin/locations)', async (t) => {
  const content = readFile('src/app/admin/locations/page.tsx');

  await t.test('Header & CTA should be action-oriented', () => {
    assert.match(content, /Add Location/);
    assert.match(content, /Locations & Revenue Sharing/);
    assert.doesNotMatch(content, /\+ NEW LOCATION/);
  });

  await t.test('Table headers should be English', () => {
    assert.match(content, /Branch Name/);
    assert.match(content, /Site Code/);
    assert.match(content, /Fleet Size/);
    assert.match(content, /Actions/);
    assert.doesNotMatch(content, /Nama Lokasi/);
    assert.doesNotMatch(content, /Kode Unik/);
    assert.doesNotMatch(content, /Armada Kursi/);
  });
});

test('TDD Copywriting Suite: Chair Fleet Management (/admin/chairs)', async (t) => {
  const content = readFile('src/app/admin/chairs/page.tsx');

  await t.test('Header & CTA should use Add Chair', () => {
    assert.match(content, /Add Chair/);
    assert.doesNotMatch(content, /\+ TAMBAH UNIT KURSI/);
  });

  await t.test('Table headers should be English', () => {
    assert.match(content, /Chair Code/);
    assert.match(content, /Hardware Model/);
    assert.match(content, /Unit Name/);
    assert.match(content, /Branch Location/);
    assert.match(content, /Terminal PIN/);
    assert.doesNotMatch(content, /Kode Unit \/ Username EDC/);
    assert.doesNotMatch(content, /Lokasi Cabang/);
    assert.doesNotMatch(content, /PIN EDC/);
  });
});

test('TDD Copywriting Suite: Tickets & Audit (/admin/tickets)', async (t) => {
  const content = readFile('src/app/admin/tickets/page.tsx');

  await t.test('Action CTA and Table Headers should be English', () => {
    assert.match(content, /Export to CSV/);
    assert.match(content, /Slip Number/);
    assert.match(content, /Date & Time/);
    assert.match(content, /Customer/);
    assert.doesNotMatch(content, /Ticket Number \/ Slip/);
    assert.doesNotMatch(content, /Waktu Transaksi/);
    assert.doesNotMatch(content, /Pelanggan/);
  });
});

test('TDD Copywriting Suite: Backend Responses & Middleware', async (t) => {
  await t.test('Middleware should return clean English unauthorized message', () => {
    const middlewareContent = readFile('src/middleware.ts');
    assert.match(middlewareContent, /Unauthorized\. Please sign in to continue\./);
    assert.doesNotMatch(middlewareContent, /Akses ditolak, silakan login/);
  });

  await t.test('Auth API should return English validation and errors', () => {
    const authContent = readFile('src/app/api/admin/auth/login/route.ts');
    assert.match(authContent, /Email or username and password are required\./);
    assert.match(authContent, /Invalid email or password\./);
    assert.doesNotMatch(authContent, /Email\/Username dan Password wajib diisi/);
  });

  await t.test('Chairs API should return English messages', () => {
    const chairsApiContent = readFile('src/app/api/admin/chairs/route.ts');
    assert.match(chairsApiContent, /Chair code and PIN are required\./);
    assert.match(chairsApiContent, /Chair successfully saved\./);
    assert.doesNotMatch(chairsApiContent, /Kode Unit dan PIN wajib diisi/);
    assert.doesNotMatch(chairsApiContent, /Unit kursi berhasil disimpan/);
  });

  await t.test('Locations API should return English messages', () => {
    const locApiContent = readFile('src/app/api/admin/locations/route.ts');
    assert.match(locApiContent, /Total revenue share must equal exactly 100%\./);
    assert.match(locApiContent, /saved successfully\./);
    assert.doesNotMatch(locApiContent, /Total persentase Hak Owner \+ Bagi Hasil System harus 100%/);
  });
});

test('TDD Copywriting Suite: User Management (/admin/users)', async (t) => {
  const content = readFile('src/app/admin/users/page.tsx');

  await t.test('Header & CTA should use + Add User', () => {
    assert.match(content, /\+ Add User/);
    assert.doesNotMatch(content, /CREATE USER/);
  });

  await t.test('Search placeholder and empty state should be in English', () => {
    assert.match(content, /Search by name, email, or phone\.\.\./);
    assert.match(content, /No users found\./);
    assert.doesNotMatch(content, /Cari nama, email, atau no handphone/);
    assert.doesNotMatch(content, /Tidak ada data pengguna yang ditemukan/);
  });

  await t.test('Modals should use English button labels', () => {
    assert.match(content, /Register New User/);
    assert.doesNotMatch(content, /Tambah User Account Baru/);
    assert.doesNotMatch(content, /Batal/);
  });
});

test('TDD Copywriting Suite: Admin Authentication (/admin/login)', async (t) => {
  const content = readFile('src/app/admin/login/page.tsx');

  await t.test('Login CTA should be Sign In', () => {
    assert.match(content, /Sign In/);
    assert.match(content, /Forgot Password\?/);
  });

  await t.test('Validation and alerts should be in English', () => {
    assert.doesNotMatch(content, /Silakan isi Admin Email/);
    assert.doesNotMatch(content, /Gagal terhubung ke server autentikasi/);
  });

  await t.test('Forgot password modal should be in English', () => {
    assert.match(content, /Reset Admin Password/);
    assert.doesNotMatch(content, /Reset Password Admin/);
    assert.doesNotMatch(content, /Kirim Kode Verifikasi/);
    assert.doesNotMatch(content, /Batal/);
  });
});

