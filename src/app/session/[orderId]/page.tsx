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

      const orderKey = tx.idempotency_key || tx.chair_slip_number || orderId;
      // Auto-sync ticket status in Supabase to 'session_inprocess' when entering session
      if (orderKey) {
        fetch('/api/admin/chairs/ack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chair_slip_id: tx.id || orderId,
            chair_slip_number: orderKey,
            chair_id: tx.chair_id,
            status_event: 'session_inprocess',
          }),
        }).catch((err) => console.warn('[Session] Ack start note:', err));
      }
    }
  }, [orderId]);

  // Live session countdown timer with absolute timestamp target & visibilitychange listener
  useEffect(() => {
    if (!transaction) return;

    const durationMins = transaction.duration_minutes || transaction.duration_in_minutes || 4;
    const orderKey = transaction.idempotency_key || transaction.chair_slip_number || orderId;
    const storageKey = `session_end_time_${orderKey}`;

    let endTime = Number(sessionStorage.getItem(storageKey));
    if (!endTime || isNaN(endTime)) {
      endTime = Date.now() + durationMins * 60 * 1000;
      sessionStorage.setItem(storageKey, String(endTime));
    }

    const calculateRemaining = () => {
      const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setSecondsLeft(diff);
      return diff;
    };

    const handleSessionFinish = () => {
      stopTokuyoChair(null).catch((err) => console.warn('Session finish Breaker OFF note:', err));
      // Call ACK API to record session_end_at in Supabase chair_slips
      fetch('/api/admin/chairs/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chair_slip_id: transaction?.id,
          chair_slip_number: orderKey,
          chair_id: transaction?.chair_id,
          status_event: 'done',
        }),
      }).catch((err) => console.warn('Ack session finish note:', err));

      const timeout = setTimeout(() => {
        sessionStorage.removeItem('current_transaction');
        sessionStorage.removeItem(storageKey);
        router.push('/duration');
      }, 4000);
      return timeout;
    };

    const initialDiff = calculateRemaining();

    if (initialDiff <= 0) {
      const timeout = handleSessionFinish();
      return () => clearTimeout(timeout);
    }

    const interval = setInterval(() => {
      const currentDiff = calculateRemaining();
      if (currentDiff <= 0) {
        clearInterval(interval);
        handleSessionFinish();
      }
    }, 500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentDiff = calculateRemaining();
        if (currentDiff <= 0) {
          clearInterval(interval);
          handleSessionFinish();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [transaction, orderId, router]);

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
      const orderKey = transaction?.idempotency_key || transaction?.chair_slip_number || orderId;
      if (txId) {
        await fetch(`/api/transactions/${txId}/cancel`, {
          method: 'POST',
        }).catch((err) => console.warn('Cancel API fetch note:', err));

        // Record early session end in chair_slips via ACK API
        await fetch('/api/admin/chairs/ack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chair_slip_id: txId,
            chair_slip_number: orderKey,
            chair_id: transaction?.chair_id,
            status_event: 'done',
          }),
        }).catch((err) => console.warn('Cancel ACK note:', err));
      }

      // 2. Send Breaker OFF command to Tokuyo PCB via USB Relay LCUS-1 (0xA0 0x01 0x00 0xA1)
      await stopTokuyoChair(null);
    } catch (err) {
      console.warn('USB Relay Breaker OFF note:', err);
    } finally {
      setIsStopping(false);
      setShowCancelModal(false);
      sessionStorage.removeItem('current_transaction');
      router.push('/duration');
    }
  };

  return (
    <main className="w-full pt-16 bg-[#FBF9F9] min-h-screen flex flex-col justify-between items-center px-3 py-2">
      {/* Main Card Container */}
      <div className="flex flex-col w-full max-w-[500px] bg-white rounded-3xl p-5 sm:p-7 shadow-[0_10px_35px_rgba(78,59,49,0.05)] border border-[#EFEDED] my-auto">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-3 border-b border-[#EFEDED] pb-2.5">
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-[#D2C3C7] rounded-full" />
            <div className="w-4 h-1 bg-[#D2C3C7] rounded-full" />
            <div className="w-4 h-1 bg-[#D2C3C7] rounded-full" />
            <div className="w-4 h-1 bg-[#D2C3C7] rounded-full" />
            <div className="w-8 h-1 bg-[#795465] rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-[#E9BACD] animate-pulse" />
            </div>
          </div>
          <span className="text-[11px] font-extrabold text-[#6F5A4F] tracking-widest uppercase">
            {t.step5Tag}
          </span>
        </div>

        {/* Header Text */}
        <div className="text-center mb-3 flex flex-col items-center gap-1">
          <h1 className="text-xl sm:text-2xl font-black text-[#1B1C1C] tracking-tight">
            {t.remainingTimeTitle}
          </h1>
          <div className="bg-[#CEE5DA]/50 px-3 py-1 rounded-full inline-flex items-center gap-1.5 border border-[#52675E]/10">
            <span className="material-symbols-outlined text-[#4E635A] text-[15px]">schedule</span>
            <span className="text-[11px] font-bold text-[#4E635A]">
              {t.estimatedEnd} Pukul {calculateEndTime(secondsLeft)} WIB
            </span>
          </div>
        </div>

        {/* Timer Circular Display */}
        <div className="flex flex-col items-center justify-center my-3 relative">
          <div className="relative z-10 flex items-center justify-center w-36 h-36 rounded-full bg-white shadow-[0_8px_25px_rgba(186,26,26,0.12)] border-4 border-[#FFDAD6] mb-2">
            <span className="text-4xl font-black text-[#BA1A1A] font-mono tracking-tighter">
              {formatTimer(secondsLeft)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#F5F3F3] px-3 py-1 rounded-lg border border-[#EFEDED]">
            <div className="w-2 h-2 rounded-full bg-[#795465] animate-pulse" />
            <span className="text-[10px] font-semibold text-[#4F4448]">
              {t.countdownSubtitle}
            </span>
          </div>
        </div>

        {/* Chair Status Visual Card */}
        <div className="relative w-full bg-[#F8C8DC]/20 rounded-2xl overflow-hidden mt-3 flex flex-col items-center justify-center p-3 border border-[#EFEDED] max-h-[160px]">
          <TokuyoChairGraphic isActive={secondsLeft > 0} />
        </div>

        {/* Emergency Stop Button */}
        {secondsLeft > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full bg-[#FFDAD6] hover:bg-[#FFDAD6]/80 text-[#93000A] font-extrabold text-xs h-11 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-xs uppercase tracking-wide cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">stop_circle</span>
              <span>{t.cancelSessionBtn}</span>
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal Popup */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-[#1B1C1C]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#FFDAD6] rounded-3xl p-5 sm:p-7 max-w-xs w-full space-y-4 text-center shadow-2xl animate-scale-up">
            <div className="w-14 h-14 bg-[#FFDAD6] border-4 border-[#FFDAD6]/50 text-[#93000A] rounded-full flex items-center justify-center mx-auto shadow-md">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-[#1B1C1C]">{t.confirmCancelTitle}</h3>
              <p className="text-xs text-[#4F4448] leading-relaxed font-medium">
                {t.confirmCancelBody}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleConfirmCancelSession}
                disabled={isStopping}
                className="w-full bg-[#BA1A1A] hover:bg-[#BA1A1A]/90 text-white font-extrabold py-3 rounded-xl shadow-md shadow-[#BA1A1A]/20 flex items-center justify-center gap-1.5 text-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">power_settings_new</span>
                <span>{isStopping ? t.stoppingMachine : t.yesCancelBtn}</span>
              </button>

              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isStopping}
                className="w-full bg-[#F5F3F3] hover:bg-[#E9E8E8] text-[#1B1C1C] font-bold py-3 rounded-xl text-xs transition-all cursor-pointer"
              >
                <span>{t.noKeepGoingBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full text-center text-[10px] text-[#4F4448] py-1">
        Unit ID: <span className="font-mono text-[#1B1C1C] font-bold">{transaction?.chair_id || 'SAKURA-GI-01'}</span> • {t.brandTitle} Kiosk
      </footer>
    </main>
  );
}
