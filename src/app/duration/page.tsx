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

  // Stepper state: default 20 minutes (20 pulses = Rp 20.000)
  const [durationMinutes, setDurationMinutes] = useState<number>(20);

  useEffect(() => {
    const data = sessionStorage.getItem('current_customer');
    if (data) {
      setCustomer(JSON.parse(data));
    }
  }, []);

  // Conversion math: Tokuyo PCB logic (1 pulse = 1 minute, 5 minutes = Rp 5.000)
  const pulseCount = durationMinutes;
  const totalAmount = (durationMinutes / 5) * 5000;

  const handleIncrement = () => {
    if (durationMinutes < 60) {
      setDurationMinutes((prev) => prev + 5);
    }
  };

  const handleDecrement = () => {
    if (durationMinutes > 5) {
      setDurationMinutes((prev) => prev - 5);
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
    <main className="w-full pt-16 bg-[#FBF9F9] min-h-screen flex flex-col items-center justify-between px-3 py-2">
      <div className="max-w-[500px] w-full bg-white rounded-3xl p-5 sm:p-7 shadow-[0_10px_35px_rgba(78,59,49,0.05)] border border-[#EFEDED] relative flex flex-col my-auto">
        
        {/* 5-Step Progress Indicator & Title Header */}
        <div className="flex items-center justify-between mb-3 border-b border-[#EFEDED] pb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1 rounded-full bg-[#795465]/30" />
            <div className="w-8 h-1 rounded-full bg-[#795465] shadow-xs" />
            <div className="w-4 h-1 rounded-full bg-[#EFEDED]" />
            <div className="w-4 h-1 rounded-full bg-[#EFEDED]" />
            <div className="w-4 h-1 rounded-full bg-[#EFEDED]" />
          </div>
          <span className="text-[11px] text-[#795465] uppercase tracking-widest font-extrabold">
            {t.step2Tag} • {t.selectDurationTitle}
          </span>
        </div>

        {/* Manual Counter Section */}
        <div className="bg-[#F5F3F3] rounded-2xl p-4 flex flex-col items-center relative overflow-hidden shadow-inner mb-3">
          <div className="flex items-center justify-between w-full max-w-[280px]">
            {/* Minus Button */}
            <button
              onClick={handleDecrement}
              disabled={durationMinutes <= 5}
              className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-[#795465] hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">remove</span>
            </button>

            {/* Display Counter */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-5xl font-black leading-none text-[#795465] tracking-tight font-mono">
                {durationMinutes}
              </span>
              <span className="text-[10px] font-bold text-[#4F4448] uppercase tracking-widest mt-0.5">
                {t.minutes}
              </span>
            </div>

            {/* Plus Button */}
            <button
              onClick={handleIncrement}
              disabled={durationMinutes >= 60}
              className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-[#795465] hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">add</span>
            </button>
          </div>

          {/* Pulsa & Price Pill */}
          <div className="mt-3 px-4 py-1.5 bg-white shadow-xs rounded-full flex items-center gap-1.5 border border-[#EFEDED]">
            <span className="material-symbols-outlined text-[#795465] text-[16px]">bolt</span>
            <span className="text-[11px] font-bold text-[#4F4448]">
              {pulseCount} {t.pulses} • <span className="font-mono text-[#795465]">Rp {totalAmount.toLocaleString('id-ID')}</span>
            </span>
          </div>

          {/* End Time Subtitle */}
          <div className="mt-1.5 text-[10px] text-[#4F4448] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-[#795465]">schedule</span>
            <span>{t.massageEndsAt} {calculateEndTime(durationMinutes)} WIB</span>
          </div>
        </div>

        {/* Quick Presets Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {PRD_PACKAGE_OPTIONS.map((pkg) => {
            const isSelected = durationMinutes === pkg.durationMinutes;
            return (
              <button
                key={pkg.id}
                onClick={() => setDurationMinutes(pkg.durationMinutes)}
                className={`preset-btn rounded-xl p-2.5 flex flex-col items-center justify-center gap-0.5 transition-all relative cursor-pointer ${
                  isSelected
                    ? 'bg-[#795465] text-white shadow-md shadow-[#795465]/20 scale-[1.01]'
                    : 'bg-[#F5F3F3] hover:bg-[#E9E8E8] text-[#1B1C1C]'
                }`}
              >
                {pkg.isPopular && (
                  <div className="absolute -top-2 bg-[#E9BACD] text-[#2E1221] text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {t.mostPopular}
                  </div>
                )}
                <span className="text-sm font-black tracking-tight">{pkg.durationMinutes} Menit</span>
                <span className={`text-[11px] font-mono font-bold ${isSelected ? 'text-[#E9BACD]' : 'text-[#4F4448]'}`}>
                  Rp {pkg.amount.toLocaleString('id-ID')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Compact Summary Strip */}
        <div className="bg-[#F5F3F3] rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between border border-[#EFEDED]">
          <span className="text-xs font-bold text-[#1B1C1C]">{t.totalPayment}</span>
          <span className="text-lg font-black text-[#795465] font-mono">
            Rp {totalAmount.toLocaleString('id-ID')}
          </span>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleCreatePayment}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-[#795465] via-[#94677E] to-[#795465] text-white rounded-xl py-3.5 px-5 flex items-center justify-between shadow-md shadow-[#795465]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
            <span className="text-sm font-extrabold tracking-wide">
              {isSubmitting ? t.processingQRIS : `${t.payViaQRIS} VIA QRIS`}
            </span>
          </div>
          <span className="text-base font-mono font-black">
            Rp {totalAmount.toLocaleString('id-ID')}
          </span>
        </button>

        {/* Back Link */}
        <button
          onClick={() => router.back()}
          className="mt-2 text-center text-[11px] font-semibold text-[#4F4448] hover:text-[#795465] transition-colors cursor-pointer"
        >
          ← {t.backToHome}
        </button>
      </div>

      <footer className="w-full text-center text-[10px] text-[#4F4448] py-1">
        © 2026 Sakura Zen Wellness • Duration Selector
      </footer>
    </main>
  );
}
