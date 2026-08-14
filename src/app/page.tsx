'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Armchair, KeyRound, ShieldCheck, Lock, ArrowRight } from 'lucide-react';
import { TOKUYO_THEME } from '@/lib/theme';
import TokuyoChairGraphic from '@/components/TokuyoChairGraphic';

export default function RootKioskPage() {
  const router = useRouter();

  // Login Form State (When Device is Unpaired)
  const [chairId, setChairId] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingPairing, setIsCheckingPairing] = useState(true);

  useEffect(() => {
    // 1. Check if device is already paired to a Chair ID
    const saved = localStorage.getItem('kiosk_paired_chair');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.id) {
          // Set customer session & redirect directly to duration page!
          sessionStorage.setItem(
            'current_customer',
            JSON.stringify({
              phone: 'GUEST',
              email: '',
              chair_id: parsed.id,
              location_name: parsed.location_name || 'Lokasi Kiosk',
            })
          );
          router.replace('/duration');
          return;
        }
      } catch (e) {
        console.warn('Paired chair read error:', e);
      }
    }
    setIsCheckingPairing(false);
  }, [router]);

  const handleDeviceLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = chairId.trim().toUpperCase();
    const cleanPin = pin.trim();

    if (!cleanId || !cleanPin) {
      setErrorMsg('Silakan isi ID Kursi dan PIN Password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    // Verify login against DB via API (single source of truth)
    try {
      const res = await fetch('/api/admin/chairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOGIN',
          id: cleanId,
          chair_code: cleanId,
          pin: cleanPin,
        }),
      });

      const data = await res.json();
      if (data.success && data.chair) {
        localStorage.setItem('kiosk_paired_chair', JSON.stringify(data.chair));
        sessionStorage.setItem(
          'current_customer',
          JSON.stringify({
            phone: 'GUEST',
            email: '',
            chair_id: data.chair.id,
            location_name: data.chair.location_name || 'Lokasi Kiosk',
          })
        );
        router.replace('/duration');
      } else {
        setErrorMsg(data.error || 'Login gagal. Cek ID Kursi dan PIN.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingPairing) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${TOKUYO_THEME.bgBase}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-[#795465] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-[#795465]">Memuat Kiosk Sakura...</span>
        </div>
      </main>
    );
  }

  return (
    <main className={`w-full pt-12 min-h-screen flex flex-col justify-between items-center px-3 py-2 ${TOKUYO_THEME.bgBase}`}>
      <div className="flex flex-col w-full max-w-[460px] items-center justify-center my-auto">
        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(78,59,49,0.06)] border border-[#EFEDED] flex flex-col items-center">
          
          {/* Header Badge */}
          <div className="flex items-center justify-between w-full border-b border-[#EFEDED] pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#F8C8DC] text-[#795465] rounded-2xl shadow-xs">
                <Armchair className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h1 className="text-lg font-black text-[#1B1C1C] leading-none">Login Kiosk EDC</h1>
                <p className="text-[11px] text-[#4F4448] font-medium mt-0.5">Otorisasi Unit Kursi Pijat</p>
              </div>
            </div>
            <span className="bg-[#CEE5DA] text-[#4E635A] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Setup Terminal
            </span>
          </div>

          {/* Graphic Illustration */}
          <div className="w-full bg-[#F5F3F3] rounded-2xl p-3 mb-4 flex items-center justify-center max-h-[110px] shadow-inner">
            <TokuyoChairGraphic isActive={false} />
          </div>

          {/* Info Banner */}
          <div className="w-full text-xs text-[#4F4448] font-medium bg-[#F5F3F3] p-3 rounded-2xl border border-[#EFEDED] flex items-start gap-2 mb-4 text-left">
            <ShieldCheck className="w-4 h-4 text-[#795465] shrink-0 mt-0.5" />
            <span>Masukkan <strong>ID Kursi</strong> (misal <code>SAKURA-GI-01</code>) & <strong>PIN Password</strong> untuk mengaktifkan Kiosk EDC ini.</span>
          </div>

          {errorMsg && (
            <div className="w-full bg-[#FFDAD6] text-[#93000A] text-xs font-bold p-3 rounded-xl border border-[#FFB4AB] mb-4 text-left">
              {errorMsg}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleDeviceLogin} className="w-full space-y-3 text-left">
            {/* ID Chair Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block">
                ID Kursi / Username EDC:
              </label>
              <div className="relative">
                <Armchair className="w-4 h-4 text-[#795465] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chairId}
                  onChange={(e) => setChairId(e.target.value.toUpperCase())}
                  placeholder="Contoh: SAKURA-GI-01"
                  className="w-full bg-[#F5F3F3] border border-[#EFEDED] rounded-xl pl-10 pr-4 py-3 text-xs font-mono font-bold text-[#1B1C1C] focus:outline-none focus:border-[#795465] transition-colors"
                />
              </div>
            </div>

            {/* PIN Password Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-[#1B1C1C] uppercase tracking-wider block">
                PIN Otorisasi EDC (Default 123456):
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#795465] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan 6 Digit PIN"
                  className="w-full bg-[#F5F3F3] border border-[#EFEDED] rounded-xl pl-10 pr-4 py-3 text-xs font-mono font-bold text-[#1B1C1C] focus:outline-none focus:border-[#795465] transition-colors"
                />
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#795465] via-[#94677E] to-[#795465] text-white rounded-xl py-3.5 font-extrabold text-xs shadow-md shadow-[#795465]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isSubmitting ? 'Memverifikasi...' : 'Login & Mulai Tampilan Kiosk'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <footer className="w-full text-center text-[10px] text-[#4F4448] py-1">
        © 2026 Sakura Zen Wellness • Smart Kiosk
      </footer>
    </main>
  );
}
