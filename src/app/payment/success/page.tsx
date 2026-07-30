'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { connectUSBRelay, sendPulsesToTokuyo } from '@/lib/usb-relay';
import { useLanguage } from '@/lib/i18n';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [transaction, setTransaction] = useState<any>(null);
  const [isTriggeringRelay, setIsTriggeringRelay] = useState(false);

  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    const data = sessionStorage.getItem('current_transaction');
    if (data) {
      const tx = JSON.parse(data);
      setTransaction(tx);
      triggerRelayHardware(tx.pulse_count || 4, tx);
    } else {
      triggerRelayHardware(4, null);
    }
  }, []);

  const triggerRelayHardware = async (pulseCount: number, txObj: any) => {
    setIsTriggeringRelay(true);
    try {
      // Connect and open port if paired
      const port = await connectUSBRelay();
      if (port) {
        await sendPulsesToTokuyo(port, pulseCount);
      } else {
        console.warn('USB Relay port not connected or user skipped pairing.');
      }
    } catch (err) {
      console.warn('USB Relay auto-trigger note:', err);
    } finally {
      setIsTriggeringRelay(false);
      // Wait 3.5 seconds to ensure all hex pulses complete before navigating to live session
      setTimeout(() => {
        router.push(`/session/${txObj?.id || transaction?.id || 'SAKURA-SESSION-01'}`);
      }, 3500);
    }
  };

  return (
    <main className="w-full pt-24 bg-[#FBF9F9] min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-[600px] w-full bg-white rounded-[2rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(78,59,49,0.05)] border border-[#EFEDED] relative flex flex-col items-center text-center">
        
        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6 bg-[#CEE5DA]/50 px-4 py-1.5 rounded-full text-xs font-bold text-[#52675E]">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>{t.step4Tag}</span>
        </div>

        {/* Green Checkmark Badge */}
        <div className="w-24 h-24 bg-[#CEE5DA] rounded-full flex items-center justify-center text-[#4E635A] mb-6 shadow-md shadow-[#CEE5DA]/50 animate-bounce">
          <span className="material-symbols-outlined text-5xl">task_alt</span>
        </div>

        <h2 className="text-3xl font-black text-[#1B1C1C] mb-2">{t.awesomeTitle}</h2>
        <p className="text-sm font-bold text-[#4E635A] mb-8">{t.paymentApproved}</p>

        {/* Order Summary Box */}
        <div className="w-full bg-[#F5F3F3] rounded-2xl p-6 mb-8 text-xs font-semibold space-y-3 shadow-inner">
          <div className="flex justify-between items-center text-[#4F4448]">
            <span>{t.amountPaid}</span>
            <span className="text-[#795465] font-mono font-extrabold text-base">
              Rp {transaction?.amount ? transaction.amount.toLocaleString('id-ID') : '20.000'}
            </span>
          </div>
          <div className="flex justify-between items-center text-[#4F4448]">
            <span>{t.massageDuration}</span>
            <span className="text-[#1B1C1C] font-bold">{transaction?.duration_minutes || 16} {t.minutes}</span>
          </div>
          <div className="flex justify-between items-center text-[#4F4448]">
            <span>{t.unitChair}</span>
            <span className="text-[#6F5A4F] font-mono font-bold">{transaction?.chair_id || 'SAKURA-GI-01'}</span>
          </div>
        </div>

        {/* Hardware Relay Status */}
        <div className="w-full bg-[#ECCFC1]/40 border border-[#6F5A4F]/10 rounded-xl p-4 flex items-center justify-center gap-2 text-xs font-bold text-[#6F5A4F] mb-8">
          <span className="material-symbols-outlined text-[20px] animate-spin">
            {isTriggeringRelay ? 'autorenew' : 'bolt'}
          </span>
          <span>{isTriggeringRelay ? t.sendingHexPulse : t.hardwarePulseActive}</span>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={() => router.push(`/session/${transaction?.id || 'SAKURA-SESSION-01'}`)}
          className="w-full bg-gradient-to-r from-[#795465] via-[#94677E] to-[#795465] text-white font-extrabold py-4 rounded-xl shadow-lg shadow-[#795465]/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
        >
          <span>{t.goToSessionBtn}</span>
          <span className="material-symbols-outlined text-2xl">arrow_forward</span>
        </button>
      </div>
    </main>
  );
}
