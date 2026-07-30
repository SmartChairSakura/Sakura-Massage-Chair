'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ID' | 'EN';

export const DICTIONARY = {
  ID: {
    brandTitle: 'Kursi Pijat Sakura',
    brandSubtitle: 'Sakura Relaxation Series',
    step1Tag: 'Step 1 dari 5 • Kiosk Standby',
    welcomeTitle: 'Selamat Datang di',
    welcomeSubtitle: 'Nikmati kenyamanan & kesegaran pijat otomatis Sakura. Tekan tombol di bawah untuk memilih durasi pijat Anda.',
    startButton: 'Mulai Sesi Pijat Sakura',
    securityFooter: 'Sistem Kiosk Otomatis & Pembayaran QRIS Instant',
    backToHome: 'Kembali ke Halaman Utama',
    step2Tag: 'Step 2 dari 5',
    selectDurationTitle: 'Pilih Durasi Pijat Sakura',
    customDurationLabel: 'Atur Durasi Pijat (Manual Counter)',
    massageEndsAt: 'Pijat Selesai Pukul:',
    todayText: 'Hari ini',
    quickPresets: 'Pilihan Cepat Preset:',
    chairUnit: 'Unit Kursi:',
    mostPopular: 'Paling Favorit',
    fullMassageService: 'Layanan Pijat Penuh Sakura',
    pulses: 'Pulsa',
    minutes: 'Menit',
    serviceFee: 'Biaya Layanan Pijat',
    adminFee: 'Biaya Admin QRIS:',
    freeText: 'GRATIS (Rp 0)',
    totalPayment: 'Total Pembayaran:',
    payViaQRIS: 'BAYAR',
    processingQRIS: 'Memproses QRIS...',
    walletSupport: 'Mendukung QRIS Bank Indonesia & Seluruh E-Wallet (BCA, OVO, GoPay, Dana, ShopeePay)',
    step3Tag: 'Step 3 dari 5 • Bayar QRIS',
    scanQRISTitle: 'Scan QRIS Dinamis',
    scanQRISSubtitle: 'Buka aplikasi M-Banking / E-Wallet (BCA, OVO, GoPay, Dana, LinkAja) lalu Scan QRIS di bawah.',
    copyText: 'Salin',
    copiedText: 'Tersalin',
    listeningPayment: 'Mendengarkan konfirmasi lunas otomatis...',
    alreadyPaidBtn: 'SAYA SUDAH BAYAR',
    changeDurationBtn: 'KEMBALI (GANTI DURASI)',
    devSimulatorBtn: '[DEV SIMULATOR] Konfirmasi Lunas',
    qrisSecured: 'Keamanan Transaksi Terjamin oleh QRIS Standar Bank Indonesia',
    step4Tag: 'Step 4 dari 5 • Pembayaran Sukses',
    awesomeTitle: 'Awesome!',
    paymentApproved: 'Pembayaran QRIS Berhasil Disetujui!',
    amountPaid: 'Nominal Bayar:',
    massageDuration: 'Durasi Pijat:',
    unitChair: 'Unit Kursi:',
    sendingHexPulse: 'Mengirim sinyal Hex ke PCB Tokuyo...',
    hardwarePulseActive: 'Sinyal Hardware Aktif! Memulai Kursi Pijat...',
    goToSessionBtn: 'Masuk ke Layar Sesi Pijat',
    enjoyMassageFooter: 'Selamat Menikmati Layanan Kursi Pijat Sakura',
    step5Tag: 'Step 5 dari 5 • Sesi Berlangsung',
    activeMassageSession: 'Sesi Pijat Aktif',
    remainingTimeTitle: 'Sisa Waktu Pijat Sakura',
    estimatedEnd: 'Estimasi Selesai:',
    countdownSubtitle: 'Hitung Mundur Sinyal Socket J3 PCB Tokuyo',
    sessionFinished: 'Sesi Pijat Selesai. Mengembalikan ke Layar Utama...',
    cancelSessionBtn: 'HENTIKAN / BATALKAN SESI PIJAT',
    confirmCancelTitle: 'Hentikan Sesi Pijat Sakura?',
    confirmCancelBody: 'Apakah Anda yakin ingin menghentikan sesi pijat saat ini? Sinyal Breaker OFF akan langsung mematikan mesin dan kembali ke layar awal.',
    yesCancelBtn: 'Ya, Hentikan Mesin',
    noKeepGoingBtn: 'Tidak, Lanjutkan Pijat',
    stoppingMachine: 'Mengirim Sinyal Breaker OFF ke Mesin...',
    fleetDashboardTitle: 'Web Dashboard & Fleet Tracker',
    fleetDashboardSubtitle: 'Monitoring 25 Unit Kursi Pijat Sakura & Revenue Analytics',
  },
  EN: {
    brandTitle: 'Sakura Massage Chair',
    brandSubtitle: 'Sakura Relaxation Series',
    step1Tag: 'Step 1 of 5 • Standby Kiosk',
    welcomeTitle: 'Welcome to',
    welcomeSubtitle: 'Enjoy the comfort & freshness of Sakura automated massage. Tap the button below to choose your massage duration.',
    startButton: 'Start Sakura Massage Session',
    securityFooter: 'Automated Kiosk System & Instant QRIS Payment',
    backToHome: 'Back to Main Screen',
    step2Tag: 'Step 2 of 5',
    selectDurationTitle: 'Select Sakura Massage Duration',
    customDurationLabel: 'Adjust Massage Duration (Manual Counter)',
    massageEndsAt: 'Massage ends at:',
    todayText: 'Today',
    quickPresets: 'Quick Preset Options:',
    chairUnit: 'Chair Unit:',
    mostPopular: 'Most Popular',
    fullMassageService: 'Sakura Full Massage Service',
    pulses: 'Pulses',
    minutes: 'Minutes',
    serviceFee: 'Massage Service Fee',
    adminFee: 'QRIS Admin Fee:',
    freeText: 'FREE (Rp 0)',
    totalPayment: 'Total Payment:',
    payViaQRIS: 'PAY',
    processingQRIS: 'Processing QRIS...',
    walletSupport: 'Supports Bank Indonesia QRIS & All E-Wallets (BCA, OVO, GoPay, Dana, ShopeePay)',
    step3Tag: 'Step 3 of 5 • QRIS Payment',
    scanQRISTitle: 'Scan Dynamic QRIS',
    scanQRISSubtitle: 'Open your M-Banking / E-Wallet app (BCA, OVO, GoPay, Dana, LinkAja) and scan the QRIS below.',
    copyText: 'Copy',
    copiedText: 'Copied',
    listeningPayment: 'Listening for automatic payment confirmation...',
    alreadyPaidBtn: 'ALREADY PAID',
    changeDurationBtn: 'BACK (CHANGE DURATION)',
    devSimulatorBtn: '[DEV SIMULATOR] Confirm Paid',
    qrisSecured: 'Transaction Security Guaranteed by Bank Indonesia Standard QRIS',
    step4Tag: 'Step 4 of 5 • Payment Successful',
    awesomeTitle: 'Awesome!',
    paymentApproved: 'QRIS Payment Approved Successfully!',
    amountPaid: 'Amount Paid:',
    massageDuration: 'Massage Duration:',
    unitChair: 'Chair Unit:',
    sendingHexPulse: 'Sending Hex pulse signal to Tokuyo PCB...',
    hardwarePulseActive: 'Hardware Signal Active! Starting Massage Chair...',
    goToSessionBtn: 'Go to Massage Session Screen',
    enjoyMassageFooter: 'Enjoy Your Sakura Massage Experience',
    step5Tag: 'Step 5 of 5 • Live Session',
    activeMassageSession: 'Massage Session Active',
    remainingTimeTitle: 'Sakura Massage Time Remaining',
    estimatedEnd: 'Estimated End Time:',
    countdownSubtitle: 'Countdown Synchronized with Tokuyo PCB Socket J3',
    sessionFinished: 'Massage Session Completed. Returning to Home Screen...',
    cancelSessionBtn: 'STOP / CANCEL MASSAGE SESSION',
    confirmCancelTitle: 'Stop Sakura Massage Session?',
    confirmCancelBody: 'Are you sure you want to stop the current massage session? A Breaker OFF signal will be sent immediately to cut machine power and return to the home screen.',
    yesCancelBtn: 'Yes, Stop Machine',
    noKeepGoingBtn: 'No, Keep Going',
    stoppingMachine: 'Sending Breaker OFF Signal to Machine...',
    fleetDashboardTitle: 'Web Dashboard & Fleet Tracker',
    fleetDashboardSubtitle: 'Monitoring 25 Sakura Massage Chair Units & Revenue Analytics',
  },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof DICTIONARY['ID'];
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ID',
  setLang: () => {},
  t: DICTIONARY.ID,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ID');

  useEffect(() => {
    const saved = localStorage.getItem('app_lang') as Language;
    if (saved === 'ID' || saved === 'EN') {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: DICTIONARY[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
