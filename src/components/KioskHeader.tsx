'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { LogOut, X, MapPin } from 'lucide-react';
import SakuraLogo from './SakuraLogo';

interface KioskHeaderProps {
  chairId?: string;
  locationName?: string;
}

export default function KioskHeader({
  chairId: propsChairId,
  locationName: propsLocationName,
}: KioskHeaderProps) {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const pathname = usePathname();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Dynamic Session State
  const [dynamicChairId, setDynamicChairId] = useState<string>('SAKURA-GI-01');
  const [dynamicLocation, setDynamicLocation] = useState<string>('Grand Indonesia');
  const [isPaired, setIsPaired] = useState<boolean>(false);

  useEffect(() => {
    // Check EDC Terminal localStorage paired chair
    const paired = localStorage.getItem('kiosk_paired_chair');
    if (paired) {
      try {
        const parsed = JSON.parse(paired);
        const displayCode = parsed.chair_code || String(parsed.id || 'SAKURA-GI-01');
        setDynamicChairId(displayCode);
        setIsPaired(true);
        if (parsed.location_name) setDynamicLocation(parsed.location_name);
      } catch (e) {
        console.warn('Paired chair read note:', e);
      }
    } else {
      if (propsChairId) setDynamicChairId(propsChairId);
      if (propsLocationName) setDynamicLocation(propsLocationName);
    }
  }, [pathname, propsChairId, propsLocationName]);

  const handleConfirmLogout = () => {
    localStorage.removeItem('kiosk_paired_chair');
    sessionStorage.clear();
    setShowLogoutModal(false);
    // Hard navigate to root / to show login form
    window.location.href = '/';
  };

  // Hide sticky header completely on Admin Dashboard (/admin/*) or Setup page (/setup)
  if (pathname.startsWith('/admin') || pathname === '/setup') {
    return null;
  }

  const isHardwareTest = pathname === '/test-hardware';

  return (
    <>
      <header className="fixed top-0 w-full z-40 bg-[#FBF9F9]/95 backdrop-blur-md shadow-[0_2px_15px_rgba(78,59,49,0.04)] border-b border-[#EFEDED]">
        <div className="h-14 max-w-7xl mx-auto px-3 sm:px-8 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <SakuraLogo size="sm" subtitle="KURSI PIJAT" />

          {/* Right Section: Interactive Location Badge (Logout Button) & Language Dropdown */}
          <div className="flex items-center gap-2">
            {/* Interactive Location Pill Badge -> Opens Logout/Switch Chair Modal */}
            <button
              onClick={() => setShowLogoutModal(true)}
              title="Klik untuk Logout / Ganti Unit EDC"
              className="flex items-center gap-1.5 bg-[#CEE5DA] hover:bg-[#B2D8C3] text-[#4E635A] px-2.5 sm:px-3.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer border border-[#4E635A]/20"
            >
              <span className="material-symbols-outlined text-[15px] sm:text-[16px] text-[#4E635A]">
                {isHardwareTest ? 'build' : 'location_on'}
              </span>
              <span className="truncate max-w-[140px] sm:max-w-[220px]">
                {isHardwareTest ? 'DEV HARDWARE TEST' : `${dynamicLocation} [${dynamicChairId}]`}
              </span>
              <LogOut className="w-3 h-3 text-[#4E635A] ml-0.5 shrink-0" />
            </button>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 hover:bg-[#E9E8E8] px-2 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold text-[#4F4448] border border-[#EFEDED]"
              >
                <span className="material-symbols-outlined text-[17px]">language</span>
                <span className="text-[11px]">{lang}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-1 w-32 bg-white border border-[#D2C3C7] rounded-xl shadow-lg py-1 z-50 text-xs font-medium">
                  <button
                    onClick={() => { setLang('ID'); setShowLangMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#F8C8DC]/30 flex items-center justify-between ${lang === 'ID' ? 'text-[#795465] font-bold bg-[#F8C8DC]/40' : 'text-[#1B1C1C]'}`}
                  >
                    <span>🇮🇩 Indonesia</span>
                    {lang === 'ID' && <span className="w-1.5 h-1.5 rounded-full bg-[#795465]" />}
                  </button>
                  <button
                    onClick={() => { setLang('EN'); setShowLangMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#F8C8DC]/30 flex items-center justify-between ${lang === 'EN' ? 'text-[#795465] font-bold bg-[#F8C8DC]/40' : 'text-[#1B1C1C]'}`}
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

      {/* Logout / Switch Device Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-[#1B1C1C]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EFEDED] rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="absolute right-4 top-4 text-[#4F4448] hover:text-[#1B1C1C] p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-[#FFDAD6] text-[#93000A] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-[#1B1C1C]">Logout Unit Kursi EDC</h3>
              <p className="text-xs text-[#4F4448] leading-relaxed font-medium">
                Apakah Anda yakin ingin logout dari peranti EDC ini?
              </p>
              <div className="bg-[#F5F3F3] border border-[#EFEDED] rounded-xl p-2.5 mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-[#795465]">
                <MapPin className="w-3.5 h-3.5" />
                <span>{dynamicLocation} [{dynamicChairId}]</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleConfirmLogout}
                className="w-full bg-[#93000A] hover:bg-[#780007] text-white font-extrabold py-3 rounded-xl shadow-md text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Ya, Logout & Ganti Unit</span>
              </button>

              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-full bg-[#F5F3F3] hover:bg-[#E9E8E8] text-[#1B1C1C] font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
