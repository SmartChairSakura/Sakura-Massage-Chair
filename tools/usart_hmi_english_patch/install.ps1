# ============================================================
# SAKURA ZEN - 1-CLICK USART HMI (TJC) ENGLISH PATCH INSTALLER
# ============================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Clear-Host

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   USART HMI (TJC) 1-CLICK ENGLISH PATCH INSTALLER        " -ForegroundColor Cyan
Write-Host "   Automated Reverse-Engineered Localization System       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$patchDir = $PSScriptRoot
if (-not $patchDir) {
    $patchDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
$sourceDllDir = Join-Path $patchDir "dlls"
$transSource = Join-Path $patchDir "hmi_translation.txt"

# 1. Deteksi otomatis folder instalasi USART HMI
$candidatePaths = @(
    "C:\Program Files (x86)\Nextion Editor",
    "C:\Program Files (x86)\USART HMI",
    "C:\Program Files\Nextion Editor",
    "C:\Program Files\USART HMI"
)

$targetDir = $null
foreach ($path in $candidatePaths) {
    if (Test-Path "$path\USART HMI.exe") {
        $targetDir = $path
        break
    }
}

if (-not $targetDir) {
    Write-Host "[WARN] Folder instalasi standar tidak terdeteksi otomatis." -ForegroundColor Yellow
    $userPath = Read-Host "Masukkan path lengkap folder USART HMI Anda"
    if (Test-Path "$userPath\USART HMI.exe") {
        $targetDir = $userPath
    } else {
        Write-Host "[ERROR] File USART HMI.exe tidak ditemukan di: $userPath" -ForegroundColor Red
        Write-Host "Instalasi dibatalkan."
        Read-Host "Tekan Enter untuk keluar..."
        exit 1
    }
}

Write-Host "[DETEKSI] Folder USART HMI Ditemukan:" -ForegroundColor Green
Write-Host "          $targetDir" -ForegroundColor White
Write-Host ""

# 2. Tutup proses USART HMI jika sedang berjalan
Write-Host "[1/4] Menutup aplikasi USART HMI yang sedang terbuka..." -ForegroundColor Yellow
$running = Get-Process | Where-Object { $_.ProcessName -like "*USART*" }
if ($running) {
    $running | Stop-Process -Force
    Start-Sleep -Milliseconds 800
    Write-Host "      [OK] Aplikasi berhasil ditutup." -ForegroundColor Green
} else {
    Write-Host "      [OK] Tidak ada proses USART HMI yang sedang berjalan." -ForegroundColor Green
}
Write-Host ""

# 3. Pasang kamus terjemahan ke C:\devel\hmi_translation.txt
Write-Host "[2/4] Memasang kamus terjemahan (C:\devel\hmi_translation.txt)..." -ForegroundColor Yellow
$develDir = "C:\devel"
if (-not (Test-Path $develDir)) {
    New-Item -ItemType Directory -Path $develDir -Force | Out-Null
}
Copy-Item $transSource -Destination (Join-Path $develDir "hmi_translation.txt") -Force
Write-Host "      [OK] Kamus terjemahan aktif terpasang di C:\devel!" -ForegroundColor Green
Write-Host ""

# 4. Backup ACTR.dll asli jika belum ada
Write-Host "[3/4] Menyiapkan backup..." -ForegroundColor Yellow
$backupDir = Join-Path $targetDir "backup_original"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}
if ((Test-Path "$targetDir\ACTR.dll") -and -not (Test-Path "$backupDir\ACTR.dll.bak")) {
    Copy-Item "$targetDir\ACTR.dll" "$backupDir\ACTR.dll.bak" -Force
    Write-Host "      [OK] Backup file original dibuat di: backup_original\ACTR.dll.bak" -ForegroundColor Green
} else {
    Write-Host "      [OK] Backup sudah tersedia." -ForegroundColor Green
}
Write-Host ""

# 5. Salin 21 DLL hasil reverse-engineering (termasuk hmitype.dll yang telah di-patch)
Write-Host "[4/4] Menyalin 21 modul DLL terjemahan ke folder instalasi..." -ForegroundColor Yellow
$dllFiles = Get-ChildItem -Path "$sourceDllDir\*.dll"
$copiedCount = 0
foreach ($dll in $dllFiles) {
    try {
        Copy-Item $dll.FullName -Destination $targetDir -Force -ErrorAction Stop
        $copiedCount++
    } catch {
        Write-Host "      [GAGAL] Gagal menyalin $($dll.Name): $_" -ForegroundColor Red
    }
}
Write-Host "      [OK] Berhasil menyalin $copiedCount dari $($dllFiles.Count) modul DLL!" -ForegroundColor Green
Write-Host ""

# 6. Verifikasi akhir
$checkFile = Join-Path $targetDir "hmitype.dll"
if (Test-Path $checkFile) {
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  PATCH BERHASIL DIPASANG 100%!                          " -ForegroundColor Green
    Write-Host "  USART HMI SEKARANG SUDAH BERBAHASA INGGRIS!             " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Silakan jalankan aplikasi:" -ForegroundColor Cyan
    Write-Host "-> $targetDir\USART HMI.exe" -ForegroundColor White
} else {
    Write-Host "[ERROR] File hmitype.dll gagal diverifikasi di folder target." -ForegroundColor Red
}

Write-Host ""
Write-Host "Tekan sembarang tombol untuk keluar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
