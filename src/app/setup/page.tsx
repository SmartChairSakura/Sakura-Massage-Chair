'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Armchair, KeyRound, ShieldCheck, MapPin, Lock, LogOut, CheckCircle2, ArrowRight } from 'lucide-react';
import { TOKUYO_THEME } from '@/lib/theme';

export default function SetupKioskPage() {
  const router = useRouter();
  const [chairId, setChairId] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pairedChair, setPairedChair] = useState<any>(null);

  useEffect(() => {
    // Check if EDC terminal is already paired
    const saved = localStorage.getItem('kiosk_paired_chair');
    if (saved) {
      try {
        setPairedChair(JSON.parse(saved));
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const handleLoginPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chairId.trim() || !pin.trim()) {
      setErrorMsg('Silakan isi ID Kursi dan PIN Password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/chairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOGIN',
          id: chairId.trim().toUpperCase(),
          pin: pin.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.chair) {
        // Lock this EDC terminal to this chair ID
        localStorage.setItem('kiosk_paired_chair', JSON.stringify(data.chair));
        setPairedChair(data.chair);
        router.push('/');
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

  const handleUnpair = () => {
    if (confirm('Apakah Anda yakin ingin logout dari unit kursi ini?')) {
      localStorage.removeItem('kiosk_paired_chair');
      setPairedChair(null);
      setChairId('');
      setPin('');
      setErrorMsg('');
    }
  };

  return (
    <main className={`min-h-screen flex flex-col justify-between p-4 sm:p-8 ${TOKUYO_THEME.bgBase}`}>
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white border border-[#EFEDED] rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(78,59,49,0.06)] relative overflow-hidden">
          
          {/* Header Tag */}
          <div className="flex items-center justify-between border-b border-[#EFEDED] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#F8C8DC] text-[#795465] rounded-2xl shadow-xs">
                <Armchair className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-[#1B1C1C]">Setup Kiosk EDC</h1>
                <p className="text-xs text-[#4F4448] font-medium">Otorisasi & Pairing Perangkat Terminal</p>
              </div>
            </div>
            <span className="bg-[#CEE5DA] text-[#4E635A] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              System Pairing
            </span>
          </div>

          {/* Already Paired State Card */}
          {pairedChair ? (
            <div className="space-y-5">
              <div className="bg-[#CEE5DA]/40 border border-[#CEE5DA] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#4E635A]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Perangkat EDC Terhubung & Aktif</span>
                  </div>
                  <span className="bg-white text-[#795465] font-mono text-xs font-black px-2.5 py-1 rounded-lg shadow-xs">
                    {pairedChair.id}
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="text-base font-black text-[#1B1C1C]">{pairedChair.name}</div>
                  <div className="text-xs text-[#4F4448] font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#795465]" />
                    <span>{pairedChair.location_name}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-gradient-to-r from-[#795465] to-[#94677E] text-white rounded-xl py-3.5 font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Masuk ke Halaman Utama Kiosk</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleUnpair}
                  className="w-full bg-[#F5F3F3] hover:bg-[#FFDAD6] text-[#4F4448] hover:text-[#93000A] rounded-xl py-3 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout / Ganti Unit Kursi</span>
                </button>
              </div>
            </div>
          ) : (
            /* Login Form State */
            <form onSubmit={handleLoginPairing} className="space-y-4">
              <div className="text-xs text-[#4F4448] font-medium bg-[#F5F3F3] p-3.5 rounded-2xl border border-[#EFEDED] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#795465] shrink-0 mt-0.5" />
                <span>Masukkan <strong>ID Kursi</strong> (misal <code>SAKURA-GI-01</code>) dan <strong>PIN Password</strong> yang telah terdaftar di Admin Dashboard.</span>
              </div>

              {errorMsg && (
                <div className="bg-[#FFDAD6] text-[#93000A] text-xs font-bold p-3 rounded-xl border border-[#FFB4AB]">
                  {errorMsg}
                </div>
              )}

              {/* ID Chair Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block">
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
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block">
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#795465] via-[#94677E] to-[#795465] text-white rounded-xl py-3.5 font-extrabold text-xs shadow-md shadow-[#795465]/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isSubmitting ? 'Memverifikasi...' : 'Login & Kunci Unit EDC'}</span>
              </button>
            </form>
          )}

          {/* Quick Help Link */}
          <div className="pt-2 text-center border-t border-[#EFEDED]">
            <button
              onClick={() => router.push('/admin')}
              className="text-[11px] text-[#4F4448] hover:text-[#795465] font-semibold transition-colors cursor-pointer"
            >
              Ke Admin Dashboard →
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
