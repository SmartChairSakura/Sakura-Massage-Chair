'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/lib/supabase-client';

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

  // Supabase Realtime Subscription for Payment Status Update
  useEffect(() => {
    if (!orderId && !transaction?.idempotency_key) return;

    const channel = supabase
      .channel('public:transactions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
        },
        (payload: any) => {
          const updatedTx = payload.new;
          if (
            (updatedTx.id === orderId || updatedTx.idempotency_key === transaction?.idempotency_key) &&
            updatedTx.status === 'PAID'
          ) {
            console.log('[Supabase Realtime] Received PAID event for transaction:', updatedTx.id);
            sessionStorage.setItem('current_transaction', JSON.stringify(updatedTx));
            router.push('/payment/success');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, transaction?.idempotency_key, router]);

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
    <main className="w-full pt-16 bg-[#FBF9F9] min-h-screen flex flex-col items-center justify-between px-3 py-2">
      <div className="w-full max-w-[480px] bg-white rounded-3xl p-5 shadow-[0_10px_35px_rgba(78,59,49,0.05)] border border-[#EFEDED] flex flex-col items-center my-auto">
        
        {/* Step Indicator & Timer Bar */}
        <div className="w-full flex items-center justify-between bg-[#F8C8DC]/30 p-2.5 rounded-2xl mb-3 border border-[#795465]/10">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-extrabold text-[#795465] uppercase tracking-wider">
              {t.step3Tag}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full shadow-2xs text-[#795465]">
            <span className="material-symbols-outlined text-[16px] animate-pulse">timer</span>
            <span className="text-xs font-black font-mono tracking-tight">
              {formatTimer(timeLeft)}
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-black text-[#1B1C1C] mb-1 tracking-tight text-center">
          {t.scanQRISTitle}
        </h1>
        <p className="text-xs text-[#4F4448] text-center mb-3 font-medium">
          {t.scanQRISSubtitle}
        </p>

        {/* Transaction ID Strip */}
        <div className="w-full flex items-center justify-between bg-[#F5F3F3] px-3.5 py-2 rounded-xl mb-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-[#4F4448] uppercase tracking-wider">ID Transaksi</span>
            <span className="text-[11px] font-bold text-[#1B1C1C] font-mono truncate max-w-[200px]">
              {transaction?.idempotency_key || orderId}
            </span>
          </div>
          <button
            onClick={handleCopyOrderId}
            className="w-8 h-8 rounded-full bg-[#795465]/10 flex items-center justify-center text-[#795465] hover:bg-[#795465]/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-[#EFEDED] mb-3 flex flex-col items-center relative group w-full max-w-[220px]">
          <div className="w-full aspect-square bg-[#F5F3F3] rounded-xl p-2 flex items-center justify-center relative overflow-hidden">
            {transaction?.qr_url ? (
              <img src={transaction.qr_url} alt="QRIS Code" className="w-full h-full object-contain" />
            ) : (
              <div className="text-xs text-[#4F4448] font-semibold">QRIS Code Loading...</div>
            )}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#795465]/60 shadow-[0_0_10px_rgba(121,84,101,0.8)] animate-scan" />
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 w-full bg-[#F5F3F3] rounded-md py-1">
            <span className="text-[10px] font-mono font-bold text-[#795465]">NMID: ID2020044532881</span>
            <div className="w-px h-3 bg-[#D2C3C7]" />
            <span className="text-[10px] font-bold text-[#4F4448]">QRIS & GPN</span>
          </div>
        </div>

        {/* Polling Status Indicator */}
        <div className="flex items-center gap-2 bg-[#CEE5DA]/50 px-4 py-1.5 rounded-full mb-3 w-full justify-center">
          <span className="material-symbols-outlined text-[#52675E] text-[15px] animate-spin">
            autorenew
          </span>
          <span className="text-[11px] font-bold text-[#52675E]">{t.listeningPayment}</span>
        </div>

        {/* Footer Action Buttons */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={handleCheckAlreadyPaid}
            disabled={isVerifying}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#795465] via-[#94677E] to-[#795465] text-white font-extrabold text-xs shadow-md shadow-[#795465]/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{isVerifying ? 'Verifikasi...' : t.alreadyPaidBtn}</span>
          </button>

          <button
            onClick={() => router.push('/duration')}
            className="w-full py-2 rounded-xl bg-transparent text-[#6F5A4F] font-bold text-[11px] hover:bg-[#F5F3F3] transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>{t.changeDurationBtn}</span>
          </button>
        </div>
      </div>

      <footer className="w-full text-center text-[10px] text-[#4F4448] py-1">
        © 2026 Sakura Zen Wellness • Payment Gateway
      </footer>
    </main>
  );
}
