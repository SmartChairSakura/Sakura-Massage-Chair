'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PRD_PACKAGE_OPTIONS } from '@/types';
import { useLanguage } from '@/lib/i18n';

export default function DurationSelectPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [customer, setCustomer] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stepper state: default 16 minutes (4 pulses)
  const [durationMinutes, setDurationMinutes] = useState<number>(16);

  useEffect(() => {
    const data = sessionStorage.getItem('current_customer');
    if (data) {
      setCustomer(JSON.parse(data));
    }
  }, []);

  // Conversion math: 4 minutes = 1 pulse = Rp 5,000
  const pulseCount = Math.max(1, Math.round(durationMinutes / 4));
  const totalAmount = pulseCount * 5000;

  const handleIncrement = () => {
    if (durationMinutes < 60) {
      setDurationMinutes((prev) => prev + 4);
    }
  };

  const handleDecrement = () => {
    if (durationMinutes > 4) {
      setDurationMinutes((prev) => prev - 4);
    }
  };

  const calculateEndTime = (minutes: number) => {
    const end = new Date(Date.now() + minutes * 60 * 1000);
    return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCreatePayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payments/create-qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chairId: customer?.chair_id || 'SAKURA-GI-01',
          packageId: `custom-${durationMinutes}m`,
          amount: totalAmount,
          durationMinutes: durationMinutes,
          pulseCount: pulseCount,
          customerPhone: customer?.phone || 'GUEST',
          customerEmail: customer?.email || '',
        }),
      });

      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('current_transaction', JSON.stringify(data.transaction));
        router.push(`/payment/${data.transaction.id}`);
      } else {
        alert('Gagal membuat pembayaran QRIS.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="w-full pt-24 bg-[#FBF9F9] min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-[600px] w-full bg-white rounded-[2rem] p-6 sm:p-10 lg:p-12 shadow-[0_20px_50px_rgba(78,59,49,0.05)] border border-[#EFEDED] relative flex flex-col">
        {/* Recessed Decorative Header */}
        <div className="w-full h-32 sm:h-36 bg-[#EFEDED] rounded-2xl mb-8 overflow-hidden relative flex items-center justify-center shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-r from-[#795465]/10 via-[#F8C8DC]/30 to-[#CEE5DA]/20" />
          <div className="relative z-10 flex flex-col items-center text-center p-4">
            <span className="material-symbols-outlined text-[#795465] text-4xl mb-1">spa</span>
            <span className="text-xs font-bold text-[#6F5A4F] uppercase tracking-widest">Sakura Zen Relaxation Series</span>
          </div>
        </div>

        {/* 5-Step Progress Indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex gap-1.5">
            <div className="w-6 h-1 rounded-full bg-[#795465]/30" />
            <div className="w-10 h-1 rounded-full bg-[#795465] shadow-xs" />
            <div className="w-6 h-1 rounded-full bg-[#EFEDED]" />
            <div className="w-6 h-1 rounded-full bg-[#EFEDED]" />
            <div className="w-6 h-1 rounded-full bg-[#EFEDED]" />
          </div>
          <span className="text-xs text-[#795465] uppercase tracking-widest font-bold ml-2">
            {t.step2Tag} • {t.selectDurationTitle}
          </span>
        </div>

        {/* Main Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-[#1B1C1C] mb-8 text-center tracking-tight">
          {t.selectDurationTitle}
        </h1>

        {/* Manual Counter Section (Stitch Sakura Zen Reference) */}
        <div className="bg-[#F5F3F3] rounded-[2rem] p-8 flex flex-col items-center relative overflow-hidden shadow-inner">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F8C8DC]/40 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#CEE5DA]/40 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

          <div className="flex items-center justify-between w-full max-w-[320px] relative z-10">
            {/* Minus Button */}
            <button
              onClick={handleDecrement}
              disabled={durationMinutes <= 4}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-md flex items-center justify-center text-[#795465] hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[28px]">remove</span>
            </button>

            {/* Display Counter */}
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-baseline gap-1">
                <span className="text-[64px] sm:text-[80px] font-black leading-none text-[#795465] tracking-tight font-mono">
                  {durationMinutes}
                </span>
              </div>
              <span className="text-xs font-bold text-[#4F4448] uppercase tracking-widest mt-1">
                {t.minutes}
              </span>
            </div>

            {/* Plus Button */}
            <button
              onClick={handleIncrement}
              disabled={durationMinutes >= 60}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-md flex items-center justify-center text-[#795465] hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[28px]">add</span>
            </button>
          </div>

          {/* Pulsa & Price Pill */}
          <div className="mt-8 px-6 py-3 bg-white shadow-sm rounded-full flex items-center gap-2 relative z-10 border border-[#EFEDED]">
            <span className="material-symbols-outlined text-[#795465] text-[20px]">bolt</span>
            <span className="text-xs font-bold text-[#4F4448]">
              {pulseCount} {t.pulses} • <span className="font-mono text-[#795465]">Rp {totalAmount.toLocaleString('id-ID')}</span>
            </span>
          </div>

          {/* End Time Subtitle */}
          <div className="mt-3 text-[11px] text-[#4F4448] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#795465]">schedule</span>
            <span>{t.massageEndsAt} {t.todayText} {calculateEndTime(durationMinutes)} WIB</span>
          </div>
        </div>

        {/* Quick Presets Grid */}
        <div className="grid grid-cols-2 gap-3.5 mt-8">
          {PRD_PACKAGE_OPTIONS.map((pkg) => {
            const isSelected = durationMinutes === pkg.durationMinutes;
            return (
              <button
                key={pkg.id}
                onClick={() => setDurationMinutes(pkg.durationMinutes)}
                className={`preset-btn rounded-2xl p-5 flex flex-col items-center justify-center gap-1 transition-all relative cursor-pointer ${
                  isSelected
                    ? 'bg-[#795465] text-white shadow-lg shadow-[#795465]/20 scale-[1.02]'
                    : 'bg-[#F5F3F3] hover:bg-[#E9E8E8] text-[#1B1C1C]'
                }`}
              >
                {pkg.isPopular && (
                  <div className="absolute -top-3 bg-[#E9BACD] text-[#2E1221] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow-xs">
                    {t.mostPopular}
                  </div>
                )}
                <span className="text-lg font-black tracking-tight">{pkg.durationMinutes} Menit</span>
                <span className={`text-xs font-mono font-bold ${isSelected ? 'text-[#E9BACD]' : 'text-[#4F4448]'}`}>
                  Rp {pkg.amount.toLocaleString('id-ID')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Summary Section */}
        <div className="bg-[#F5F3F3] rounded-2xl p-6 sm:p-8 mt-10 flex flex-col gap-3 shadow-inner">
          <div className="flex justify-between items-center text-xs font-semibold text-[#4F4448]">
            <span>{t.serviceFee} ({durationMinutes} Mnt)</span>
            <span className="font-mono text-[#1B1C1C] font-bold">Rp {totalAmount.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-semibold text-[#4F4448]">
            <span>{t.adminFee}</span>
            <span className="text-[#4E635A] bg-[#CEE5DA] px-2.5 py-1 rounded-md font-bold text-[11px]">
              {t.freeText}
            </span>
          </div>
          <div className="h-[1px] w-full bg-[#D2C3C7]/40 my-1" />
          <div className="flex justify-between items-center">
            <span className="text-base font-extrabold text-[#1B1C1C]">{t.totalPayment}</span>
            <span className="text-xl font-black text-[#795465] font-mono">
              Rp {totalAmount.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleCreatePayment}
          disabled={isSubmitting}
          className="w-full mt-8 bg-gradient-to-r from-[#795465] via-[#94677E] to-[#795465] text-white rounded-2xl py-5 px-6 sm:px-8 flex items-center justify-between shadow-[0_10px_30px_rgba(121,84,101,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px]">qr_code_scanner</span>
            <span className="text-lg font-extrabold tracking-wide">
              {isSubmitting ? t.processingQRIS : `${t.payViaQRIS} VIA QRIS`}
            </span>
          </div>
          <span className="text-lg font-mono font-black">
            Rp {totalAmount.toLocaleString('id-ID')}
          </span>
        </button>

        {/* Back Link */}
        <button
          onClick={() => router.back()}
          className="mt-6 text-center text-xs font-semibold text-[#4F4448] hover:text-[#795465] transition-colors cursor-pointer"
        >
          ← {t.backToHome}
        </button>
      </div>
    </main>
  );
}
