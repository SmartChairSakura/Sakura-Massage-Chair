'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import TokuyoChairGraphic from '@/components/TokuyoChairGraphic';
import { useLanguage } from '@/lib/i18n';

export default function StandbyRegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const handleStart = () => {
    sessionStorage.setItem(
      'current_customer',
      JSON.stringify({
        phone: 'GUEST',
        email: '',
        chair_id: 'SAKURA-GI-01',
        location_name: 'Grand Indonesia',
      })
    );

    router.push('/duration');
  };

  return (
    <main className="w-full pt-20 bg-[#FBF9F9] min-h-screen flex flex-col justify-between">
      <div className="flex flex-col w-full items-center justify-center flex-1 py-12 px-4 relative overflow-hidden">
        {/* Ambient Background Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#795465]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ECCFC1]/20 rounded-full blur-[100px] pointer-events-none" />

        {/* Main Kiosk Card */}
        <div className="w-full max-w-[600px] bg-white rounded-[2rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(78,59,49,0.05)] relative z-10 flex flex-col items-center text-center border border-[#EFEDED]">
          {/* Status Header Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full mb-10">
            <div className="flex items-center gap-2 bg-[#EFEDED]/60 px-4 py-2 rounded-full border border-[#795465]/10 shadow-2xs">
              <span className="material-symbols-outlined text-[#795465] text-[18px]">auto_awesome</span>
              <span className="text-xs font-bold text-[#795465] uppercase tracking-wider">
                {t.step1Tag}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-[#ECCFC1]/40 px-4 py-2 rounded-full border border-[#6F5A4F]/10 shadow-2xs">
              <span className="material-symbols-outlined text-[#6F5A4F] text-[18px]">location_on</span>
              <span className="text-xs font-bold text-[#6F5A4F] tracking-wider">SAKURA-GI-01</span>
            </div>
          </div>

          {/* Logo Housing */}
          <div className="w-16 h-16 rounded-full bg-[#F8C8DC] flex items-center justify-center mb-6 shadow-sm">
            <span className="material-symbols-outlined text-[#795465] text-3xl">spa</span>
          </div>

          {/* Greeting */}
          <h1 className="text-3xl sm:text-4xl font-black text-[#1B1C1C] mb-4 tracking-tight leading-tight">
            {t.welcomeTitle}<br />
            <span className="text-[#795465]">{t.brandTitle}</span>
          </h1>

          {/* Subtext */}
          <p className="text-sm sm:text-base text-[#4F4448] max-w-md mx-auto mb-10 leading-relaxed font-normal">
            {t.welcomeSubtitle}
          </p>

          {/* Chair Illustration Container (Recessed Soft Box) */}
          <div className="w-full bg-[#F5F3F3] rounded-2xl p-8 mb-10 flex items-center justify-center relative overflow-hidden group shadow-inner">
            <TokuyoChairGraphic isActive={false} />
          </div>

          {/* Primary CTA Button */}
          <button
            onClick={handleStart}
            className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#e63946] via-[#795465] to-[#795465] p-[2px] shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#e63946] to-[#795465] w-full h-full py-4 rounded-[14px]">
              <span className="text-lg text-white font-extrabold tracking-wide">{t.startButton}</span>
              <span className="material-symbols-outlined text-white transition-transform group-hover:translate-x-1 text-2xl">
                arrow_forward
              </span>
            </div>
          </button>

          {/* Trust Footer */}
          <div className="flex items-center justify-center gap-2 mt-8 text-[#4E635A]">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span className="text-xs font-semibold text-[#4F4448]/80">{t.securityFooter}</span>
          </div>
        </div>
      </div>

      <footer className="w-full bg-white border-t border-[#EFEDED] py-6 text-center text-xs text-[#4F4448]">
        © 2026 Sakura Zen Wellness • Powered by Web Serial IoT & Cloud
      </footer>
    </main>
  );
}
