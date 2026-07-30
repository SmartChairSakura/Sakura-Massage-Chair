'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TokuyoChairGraphic from '@/components/TokuyoChairGraphic';
import { useLanguage } from '@/lib/i18n';
import { stopTokuyoChair } from '@/lib/usb-relay';

export default function LiveOngoingSessionPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId as string;
  const { t } = useLanguage();

  const [transaction, setTransaction] = useState<any>(null);
  const [secondsLeft, setSecondsLeft] = useState(16 * 60);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    const data = sessionStorage.getItem('current_transaction');
    if (data) {
      const tx = JSON.parse(data);
      setTransaction(tx);
      setSecondsLeft((tx.duration_minutes || 16) * 60);
    }
  }, []);

  // Live session countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) {
      const timeout = setTimeout(() => {
        sessionStorage.clear();
        router.push('/');
      }, 5000);
      return () => clearTimeout(timeout);
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, router]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculateEndTime = (remainingSeconds: number) => {
    const end = new Date(Date.now() + remainingSeconds * 1000);
    return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleConfirmCancelSession = async () => {
    setIsStopping(true);
    try {
      // 1. Call Backend API to update status to CANCELLED in Supabase
      const txId = transaction?.id || orderId;
      if (txId) {
        await fetch(`/api/transactions/${txId}/cancel`, {
          method: 'POST',
        }).catch((err) => console.warn('Cancel API fetch note:', err));
      }

      // 2. Send Breaker OFF command to Tokuyo PCB via USB Relay LCUS-1 (0xA0 0x01 0x00 0xA1)
      if (typeof window !== 'undefined' && 'serial' in navigator) {
        const ports = await navigator.serial.getPorts();
        if (ports.length > 0) {
          const port = ports[0];
          await stopTokuyoChair(port); // Breaker OFF
        }
      }
    } catch (err) {
      console.warn('USB Relay Breaker OFF note:', err);
    } finally {
      setIsStopping(false);
      setShowCancelModal(false);
      sessionStorage.clear();
      router.push('/');
    }
  };

  return (
    <main className="w-full pt-20 bg-[#FBF9F9] min-h-screen relative overflow-hidden flex flex-col justify-between">
      
      {/* Subtle Sakura Floating Petal Background */}
      <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none opacity-25">
        <svg className="absolute w-6 h-6 text-[#FFD8E7] top-[10%] left-[5%] animate-float" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2C15,2 18,5 18,9C18,13 12,22 12,22C12,22 6,13 6,9C6,5 9,2 12,2Z" />
        </svg>
        <svg className="absolute w-5 h-5 text-[#795465] top-[25%] right-[15%] animate-float" style={{ animationDelay: '1s' }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2C15,2 18,5 18,9C18,13 12,22 12,22C12,22 6,13 6,9C6,5 9,2 12,2Z" />
        </svg>
        <svg className="absolute w-8 h-8 text-[#E9BACD] top-[60%] left-[10%] animate-float" style={{ animationDelay: '2s' }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2C15,2 18,5 18,9C18,13 12,22 12,22C12,22 6,13 6,9C6,5 9,2 12,2Z" />
        </svg>
      </div>

      {/* Main Card Container */}
      <div className="relative z-10 flex flex-col w-full max-w-[600px] mx-auto bg-white rounded-[32px] p-6 sm:p-10 my-6 shadow-[0_20px_50px_rgba(78,59,49,0.05)] border border-[#EFEDED]">
        
        {/* Step Indicator */}
        <div className="flex flex-col items-center justify-center mb-6 gap-2">
          <div className="flex items-center gap-1">
            <div className="w-6 h-1 bg-[#D2C3C7] rounded-full" />
            <div className="w-6 h-1 bg-[#D2C3C7] rounded-full" />
            <div className="w-6 h-1 bg-[#D2C3C7] rounded-full" />
            <div className="w-6 h-1 bg-[#D2C3C7] rounded-full" />
            <div className="w-10 h-1 bg-[#795465] rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-[#E9BACD] animate-pulse" />
            </div>
          </div>
          <span className="text-xs font-bold text-[#6F5A4F] tracking-widest uppercase mt-1">
            {t.step5Tag}
          </span>
        </div>

        {/* Header Text */}
        <div className="text-center mb-6 flex flex-col items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-[#1B1C1C] tracking-tight">
            {t.remainingTimeTitle}
          </h1>
          <div className="bg-[#CEE5DA]/50 px-4 py-1.5 rounded-full inline-flex items-center gap-2 mt-1 border border-[#52675E]/10">
            <span className="material-symbols-outlined text-[#4E635A] text-[18px]">schedule</span>
            <span className="text-xs font-bold text-[#4E635A]">
              {t.estimatedEnd} Pukul {calculateEndTime(secondsLeft)} WIB
            </span>
          </div>
        </div>

        {/* Timer Circular Display (Stitch Sakura Zen Reference) */}
        <div className="flex flex-col items-center justify-center my-6 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-60 h-60 rounded-full bg-[#FFDAD6]/30 absolute animate-pulse-ring" />
            <div className="w-52 h-52 rounded-full bg-[#FFDAD6]/50 absolute animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
          </div>
          <div className="relative z-10 flex items-center justify-center w-48 h-48 rounded-full bg-white shadow-[0_10px_30px_rgba(186,26,26,0.12)] border-4 border-[#FFDAD6] mb-4">
            <span className="text-5xl sm:text-6xl font-black text-[#BA1A1A] font-mono tracking-tighter">
              {formatTimer(secondsLeft)}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#F5F3F3] px-4 py-2 rounded-xl border border-[#EFEDED]">
            <div className="w-2 h-2 rounded-full bg-[#795465] animate-pulse" />
            <span className="text-xs font-semibold text-[#4F4448]">
              {t.countdownSubtitle}
            </span>
          </div>
        </div>

        {/* Chair Status Visual Card */}
        <div className="relative w-full bg-[#F8C8DC]/20 rounded-[24px] overflow-hidden mt-6 flex flex-col items-center justify-center p-6 border border-[#EFEDED]">
          <TokuyoChairGraphic isActive={secondsLeft > 0} />

          {/* Status Overlay Box & Equalizer animation */}
          <div className="w-full mt-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-[#EFEDED] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#CEE5DA] flex items-center justify-center text-[#4E635A]">
                <span className="material-symbols-outlined text-xl">waves</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-[#4F4448] uppercase tracking-wider">Status Pijatan</span>
                <span className="text-xs font-extrabold text-[#4E635A]">Pengurut Airbag & Roller Active</span>
              </div>
            </div>

            {/* Equalizer Audio Bar Animation */}
            <div className="flex items-end gap-1 h-6">
              <div className="w-1.5 bg-[#795465] rounded-t-sm animate-pulse" style={{ height: '60%' }} />
              <div className="w-1.5 bg-[#795465] rounded-t-sm animate-pulse" style={{ height: '100%', animationDelay: '0.2s' }} />
              <div className="w-1.5 bg-[#795465] rounded-t-sm animate-pulse" style={{ height: '40%', animationDelay: '0.4s' }} />
              <div className="w-1.5 bg-[#795465] rounded-t-sm animate-pulse" style={{ height: '80%', animationDelay: '0.1s' }} />
            </div>
          </div>
        </div>

        {/* Emergency Stop Button */}
        {secondsLeft > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full bg-[#FFDAD6] hover:bg-[#FFDAD6]/80 text-[#93000A] font-extrabold text-sm h-[54px] rounded-[16px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm uppercase tracking-wide cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">stop_circle</span>
              <span>{t.cancelSessionBtn}</span>
            </button>
            <p className="text-center text-[11px] text-[#4F4448]/70 mt-2 font-medium">
              Menekan tombol ini akan menghentikan alat secara darurat.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal Popup */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-[#1B1C1C]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#FFDAD6] rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 text-center shadow-2xl animate-scale-up">
            <div className="w-16 h-16 bg-[#FFDAD6] border-4 border-[#FFDAD6]/50 text-[#93000A] rounded-full flex items-center justify-center mx-auto shadow-md">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#1B1C1C]">{t.confirmCancelTitle}</h3>
              <p className="text-xs text-[#4F4448] leading-relaxed font-medium">
                {t.confirmCancelBody}
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleConfirmCancelSession}
                disabled={isStopping}
                className="w-full bg-[#BA1A1A] hover:bg-[#BA1A1A]/90 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-[#BA1A1A]/20 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">power_settings_new</span>
                <span>{isStopping ? t.stoppingMachine : t.yesCancelBtn}</span>
              </button>

              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isStopping}
                className="w-full bg-[#F5F3F3] hover:bg-[#E9E8E8] text-[#1B1C1C] font-bold py-3.5 rounded-2xl text-xs transition-all cursor-pointer"
              >
                <span>{t.noKeepGoingBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full bg-white border-t border-[#EFEDED] py-4 text-center text-xs text-[#4F4448]">
        Unit ID: <span className="font-mono text-[#1B1C1C] font-bold">{transaction?.chair_id || 'SAKURA-GI-01'}</span> • {t.brandTitle} Kiosk
      </footer>
    </main>
  );
}
