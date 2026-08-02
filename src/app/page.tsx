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
    <main className="w-full pt-16 bg-[#FBF9F9] min-h-screen flex flex-col justify-between items-center px-3 py-2">
      <div className="flex flex-col w-full max-w-[500px] items-center justify-center my-auto">
        {/* Main Kiosk Card */}
        <div className="w-full bg-white rounded-3xl p-5 sm:p-7 shadow-[0_10px_35px_rgba(78,59,49,0.05)] border border-[#EFEDED] flex flex-col items-center text-center">
          
          {/* Status Header Pills */}
          <div className="flex items-center justify-center gap-2 w-full mb-3">
            <div className="flex items-center gap-1.5 bg-[#EFEDED]/60 px-3 py-1 rounded-full border border-[#795465]/10">
              <span className="material-symbols-outlined text-[#795465] text-[15px]">auto_awesome</span>
              <span className="text-[11px] font-extrabold text-[#795465] uppercase tracking-wider">
                {t.step1Tag}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#ECCFC1]/40 px-3 py-1 rounded-full border border-[#6F5A4F]/10">
              <span className="material-symbols-outlined text-[#6F5A4F] text-[15px]">location_on</span>
              <span className="text-[11px] font-extrabold text-[#6F5A4F] tracking-wider">SAKURA-GI-01</span>
            </div>
          </div>

          {/* Logo Housing */}
          <div className="w-12 h-12 rounded-full bg-[#F8C8DC] flex items-center justify-center mb-3 shadow-xs">
            <span className="material-symbols-outlined text-[#795465] text-2xl">spa</span>
          </div>

          {/* Greeting Title */}
          <h1 className="text-xl sm:text-2xl font-black text-[#1B1C1C] mb-1.5 tracking-tight leading-snug">
            {t.welcomeTitle} <span className="text-[#795465]">{t.brandTitle}</span>
          </h1>

          {/* Subtext */}
          <p className="text-xs text-[#4F4448] max-w-xs mx-auto mb-3 leading-relaxed font-medium">
            {t.welcomeSubtitle}
          </p>

          {/* Chair Illustration Container */}
          <div className="w-full bg-[#F5F3F3] rounded-2xl p-4 mb-4 flex items-center justify-center relative overflow-hidden shadow-inner max-h-[160px]">
            <TokuyoChairGraphic isActive={false} />
          </div>

          {/* Primary CTA Button */}
          <button
            onClick={handleStart}
            className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#e63946] via-[#795465] to-[#795465] p-[2px] shadow-md hover:shadow-lg transition-all duration-300 active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#e63946] to-[#795465] w-full h-full py-3.5 rounded-[10px]">
              <span className="text-base text-white font-extrabold tracking-wide">{t.startButton}</span>
              <span className="material-symbols-outlined text-white transition-transform group-hover:translate-x-1 text-xl">
                arrow_forward
              </span>
            </div>
          </button>

          {/* Trust Footer */}
          <div className="flex items-center justify-center gap-1.5 mt-3 text-[#4E635A]">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span className="text-[11px] font-semibold text-[#4F4448]/80">{t.securityFooter}</span>
          </div>
        </div>
      </div>

      <footer className="w-full text-center text-[10px] text-[#4F4448] py-1">
        © 2026 Sakura Zen Wellness • Smart Kiosk
      </footer>
    </main>
  );
}
