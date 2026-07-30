'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

export default function PaymentQrisPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId as string;
  const { t } = useLanguage();

  const [transaction, setTransaction] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(180);
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const data = sessionStorage.getItem('current_transaction');
    if (data) {
      setTransaction(JSON.parse(data));
    }
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyOrderId = () => {
    if (transaction?.idempotency_key) {
      navigator.clipboard.writeText(transaction.idempotency_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckAlreadyPaid = async () => {
    if (!transaction) return;
    setIsVerifying(true);

    try {
      const res = await fetch('/api/webhooks/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: transaction.idempotency_key,
          transactionId: transaction.id,
          status: 'PAID',
        }),
      });

      const data = await res.json();
      if (data.success) {
        const updatedTx = { ...transaction, status: 'PAID' };
        sessionStorage.setItem('current_transaction', JSON.stringify(updatedTx));
        router.push('/payment/success');
      } else {
        alert('Pembayaran belum terdeteksi. Silakan coba beberapa saat lagi.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <main className="w-full pt-24 bg-[#FBF9F9] min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Main Payment Stage (Dual Panel Card) */}
      <div className="w-full max-w-[1040px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(78,59,49,0.05)] border border-[#EFEDED] flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left Context Panel */}
        <div className="w-full md:w-5/12 bg-[#F8C8DC] relative flex flex-col justify-between p-8 md:p-12 overflow-hidden min-h-[380px]">
          <div className="absolute inset-0 bg-gradient-to-b from-[#F8C8DC]/90 via-[#F8C8DC]/70 to-[#F8C8DC]" />
          
          <div className="relative z-10 flex flex-col gap-6">
            {/* 5-Step Progress Indicator */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5 items-center">
                <div className="h-[3px] w-6 rounded-full bg-[#795465]/20" />
                <div className="h-[3px] w-6 rounded-full bg-[#795465]/20" />
                <div className="h-[3px] w-10 rounded-full bg-[#795465] shadow-xs" />
                <div className="h-[3px] w-6 rounded-full bg-[#795465]/20" />
                <div className="h-[3px] w-6 rounded-full bg-[#795465]/20" />
              </div>
              <span className="text-xs text-[#765162] uppercase tracking-widest font-bold">
                {t.step3Tag}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-[#765162] tracking-tight">
                {t.scanQRISTitle}
              </h1>
              <p className="text-xs sm:text-sm text-[#765162]/90 leading-relaxed font-medium">
                {t.scanQRISSubtitle}
              </p>
            </div>
          </div>

          {/* Countdown Timer Block */}
          <div className="relative z-10 mt-12 md:mt-20">
            <div className="inline-flex flex-col gap-1 bg-white/80 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-[#795465]/10">
              <span className="text-[11px] font-bold text-[#4F4448] uppercase tracking-widest">
                Waktu Pembayaran
              </span>
              <div className="flex items-center gap-3 text-[#795465]">
                <span className="material-symbols-outlined text-[28px] animate-pulse">timer</span>
                <span className="text-3xl font-black font-mono tracking-tight">
                  {formatTimer(timeLeft)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Action Panel */}
        <div className="w-full md:w-7/12 bg-white p-8 md:p-12 flex flex-col items-center relative z-10">
          
          {/* Transaction Info Strip */}
          <div className="w-full flex items-center justify-between bg-[#F5F3F3] px-5 py-4 rounded-xl mb-8">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-[#4F4448] uppercase tracking-wider">ID Transaksi</span>
              <span className="text-xs font-bold text-[#1B1C1C] font-mono">
                {transaction?.idempotency_key || orderId}
              </span>
            </div>
            <button
              onClick={handleCopyOrderId}
              className="w-10 h-10 rounded-full bg-[#795465]/10 flex items-center justify-center text-[#795465] hover:bg-[#795465]/20 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {copied ? 'check' : 'content_copy'}
              </span>
            </button>
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-6 rounded-[2rem] shadow-[0_12px_40px_rgba(78,59,49,0.08)] border border-[#EFEDED] mb-8 flex flex-col items-center relative group w-full max-w-[300px]">
            {/* Corner Decorative Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#795465] rounded-tl-[2rem]" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#795465] rounded-tr-[2rem]" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#795465] rounded-bl-[2rem]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#795465] rounded-br-[2rem]" />

            <div className="w-full aspect-square bg-[#F5F3F3] rounded-xl p-3 flex items-center justify-center relative overflow-hidden">
              {transaction?.qr_url ? (
                <img src={transaction.qr_url} alt="QRIS Code" className="w-full h-full object-contain" />
              ) : (
                <div className="text-xs text-[#4F4448] font-semibold">QRIS Code Loading...</div>
              )}
              {/* Scan Line Animation */}
              <div className="absolute top-0 left-0 w-full h-1 bg-[#795465]/60 shadow-[0_0_10px_rgba(121,84,101,0.8)] animate-scan" />
            </div>

            <div className="mt-4 flex items-center justify-center gap-3 w-full bg-[#F5F3F3] rounded-lg py-2">
              <span className="text-xs font-mono font-bold text-[#795465]">NMID: ID2020044532881</span>
              <div className="w-px h-4 bg-[#D2C3C7]" />
              <span className="text-xs font-bold text-[#4F4448]">QRIS & GPN</span>
            </div>
          </div>

          {/* Polling Status Indicator */}
          <div className="flex items-center gap-3 bg-[#CEE5DA]/50 px-6 py-3.5 rounded-full mb-8 w-full justify-center shadow-2xs">
            <span className="material-symbols-outlined text-[#52675E] text-[18px] animate-spin">
              autorenew
            </span>
            <span className="text-xs font-bold text-[#52675E]">{t.listeningPayment}</span>
          </div>

          {/* Footer Action Buttons */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleCheckAlreadyPaid}
              disabled={isVerifying}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#795465] via-[#94677E] to-[#795465] text-white font-extrabold text-sm shadow-lg shadow-[#795465]/20 hover:shadow-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>{isVerifying ? 'Verifikasi...' : t.alreadyPaidBtn}</span>
            </button>

            <button
              onClick={() => router.push('/duration')}
              className="w-full py-3.5 rounded-xl bg-transparent text-[#6F5A4F] font-bold text-xs hover:bg-[#F5F3F3] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>{t.changeDurationBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
