'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

interface KioskHeaderProps {
  chairId?: string;
  locationName?: string;
}

export default function KioskHeader({
  chairId: propsChairId,
  locationName: propsLocationName,
}: KioskHeaderProps) {
  const { lang, setLang, t } = useLanguage();
  const pathname = usePathname();
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Dynamic Session State
  const [dynamicChairId, setDynamicChairId] = useState<string>('SAKURA-GI-01');
  const [dynamicLocation, setDynamicLocation] = useState<string>('Grand Indonesia');

  useEffect(() => {
    if (propsChairId) {
      setDynamicChairId(propsChairId);
    }
    if (propsLocationName) {
      setDynamicLocation(propsLocationName);
    }

    if (!propsChairId || !propsLocationName) {
      try {
        const txData = sessionStorage.getItem('current_transaction');
        const custData = sessionStorage.getItem('current_customer');

        if (txData) {
          const tx = JSON.parse(txData);
          if (tx.chair_id) setDynamicChairId(tx.chair_id);
          if (tx.location_name) setDynamicLocation(tx.location_name);
        } else if (custData) {
          const cust = JSON.parse(custData);
          if (cust.chair_id) setDynamicChairId(cust.chair_id);
          if (cust.location_name) setDynamicLocation(cust.location_name);
        }
      } catch (e) {
        console.warn('Header session read note:', e);
      }
    }
  }, [pathname, propsChairId, propsLocationName]);

  // Hide sticky header completely on Admin Dashboard (/admin)
  if (pathname === '/admin') {
    return null;
  }

  const isHardwareTest = pathname === '/test-hardware';

  return (
    <header className="fixed top-0 w-full z-50 bg-[#FBF9F9]/90 backdrop-blur-md shadow-[0_4px_30px_rgba(78,59,49,0.03)] border-b border-[#EFEDED]">
      <div className="h-20 max-w-7xl mx-auto px-6 sm:px-12 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F8C8DC] flex items-center justify-center text-[#795465] shadow-xs">
            <span className="material-symbols-outlined text-2xl">spa</span>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl leading-none text-[#795465] tracking-tight">
              Sakura Zen
            </span>
            <span className="text-[11px] font-bold text-[#4F4448] uppercase tracking-widest mt-0.5">
              Kursi Pijat
            </span>
          </div>
        </div>

        {/* Right Section: Location Badge & Language Dropdown */}
        <div className="flex items-center gap-4">
          {/* Location / Context Badge */}
          <div className="hidden sm:flex items-center gap-2 bg-[#CEE5DA] px-4 py-2 rounded-full text-xs font-bold text-[#52675E]">
            <span className="material-symbols-outlined text-[18px]">
              {isHardwareTest ? 'build' : 'location_on'}
            </span>
            <span>
              {isHardwareTest ? 'DEV HARDWARE TEST' : `${dynamicLocation} [${dynamicChairId}]`}
            </span>
          </div>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 hover:bg-[#E9E8E8] p-2 rounded-xl transition-colors cursor-pointer text-xs font-semibold text-[#4F4448]"
            >
              <span className="material-symbols-outlined text-[20px]">language</span>
              <span>{lang}</span>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-[#D2C3C7] rounded-xl shadow-lg py-1 z-50 text-xs font-medium">
                <button
                  onClick={() => { setLang('ID'); setShowLangMenu(false); }}
                  className={`w-full text-left px-3 py-2 hover:bg-[#F8C8DC]/30 flex items-center justify-between ${lang === 'ID' ? 'text-[#795465] font-bold bg-[#F8C8DC]/40' : 'text-[#1B1C1C]'}`}
                >
                  <span>🇮🇩 Indonesia</span>
                  {lang === 'ID' && <span className="w-1.5 h-1.5 rounded-full bg-[#795465]" />}
                </button>
                <button
                  onClick={() => { setLang('EN'); setShowLangMenu(false); }}
                  className={`w-full text-left px-3 py-2 hover:bg-[#F8C8DC]/30 flex items-center justify-between ${lang === 'EN' ? 'text-[#795465] font-bold bg-[#F8C8DC]/40' : 'text-[#1B1C1C]'}`}
                >
                  <span>🇬🇧 English</span>
                  {lang === 'EN' && <span className="w-1.5 h-1.5 rounded-full bg-[#795465]" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
