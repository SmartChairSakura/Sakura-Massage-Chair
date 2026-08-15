'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Armchair, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { TOKUYO_THEME } from '@/lib/theme';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@sakurazen.id');
  const [password, setPassword] = useState('sakura123');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Silakan isi Email/Username dan Password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.replace('/admin/dashboard');
      } else {
        setErrorMsg(data.error || 'Login gagal. Cek kredensial Anda.');
        setIsLoading(false);
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FBF9F9] flex flex-col items-center justify-center p-4">
      {/* Centered Login Container Card */}
      <div className="w-full max-w-md bg-white rounded-[2rem] border border-[#EFEDED] shadow-[0_20px_50px_rgba(78,59,49,0.05)] p-8 sm:p-10">
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-[#795465] text-white flex items-center justify-center mb-4 shadow-lg shadow-[#795465]/20">
            <Armchair className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1B1C1C] tracking-tight">
            Sakura Zen
          </h1>
          <p className="text-xs font-bold text-[#795465] tracking-widest uppercase mt-1">
            Backoffice Control System
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FFDAD6] border border-[#BA1A1A]/20 text-[#93000A] text-xs font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-2">
              Email / Username Admin
            </label>
            <div className="relative">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sakurazen.id"
                required
                className="w-full px-4 py-3.5 pl-11 bg-[#F5F3F3] border border-[#EFEDED] rounded-2xl text-xs font-bold text-[#1B1C1C] placeholder-[#817478] focus:bg-white focus:border-[#795465] outline-none transition-all"
              />
              <Mail className="w-4 h-4 text-[#795465] absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-[#1B1C1C] uppercase tracking-wider block mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3.5 pl-11 bg-[#F5F3F3] border border-[#EFEDED] rounded-2xl text-xs font-bold text-[#1B1C1C] placeholder-[#817478] focus:bg-white focus:border-[#795465] outline-none transition-all"
              />
              <Lock className="w-4 h-4 text-[#795465] absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[#795465] hover:bg-[#684756] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#795465]/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span>Memproses...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-8 text-center text-[10px] text-[#817478] font-bold">
          Smart Kursi Pijat Sakura • Powered by Tokuyo Systems
        </div>
      </div>
    </div>
  );
}
