'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Check, AlertCircle, KeyRound, ShieldCheck, RefreshCw, X } from 'lucide-react';
import SakuraLogo from '@/components/SakuraLogo';

export default function AdminLoginPage() {
  const router = useRouter();

  // Login Form States
  const [email, setEmail] = useState('admin@sakurazen.id');
  const [password, setPassword] = useState('sakura123');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password / Reset Flow States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1); // 1: Email Input, 2: OTP & New Password
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotDevOtp, setForgotDevOtp] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Load remembered device email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('sakura_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberDevice(true);
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Silakan isi Admin Email dan Password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (data.success) {
        if (rememberDevice) {
          localStorage.setItem('sakura_remembered_email', email.trim());
        } else {
          localStorage.removeItem('sakura_remembered_email');
        }
        router.replace('/admin/dashboard');
      } else {
        setErrorMsg(data.error || 'Login gagal. Periksa kembali kredensial Anda.');
        setIsLoading(false);
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server autentikasi.');
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setForgotMsg('Silakan masukkan Email Admin Anda.');
      return;
    }

    setIsResetting(true);
    setForgotMsg('');
    setForgotDevOtp('');

    try {
      const res = await fetch('/api/admin/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setForgotStep(2);
        setForgotMsg(data.message);
        if (data.devOtp) {
          setForgotDevOtp(data.devOtp);
        }
      } else {
        setForgotMsg(data.error || 'Gagal mengirim kode verifikasi.');
      }
    } catch (err: any) {
      setForgotMsg(`Error: ${err?.message || 'Server error'}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setForgotMsg('Kode OTP, Password Baru, dan Konfirmasi Password wajib diisi.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotMsg('Konfirmasi Password baru tidak cocok.');
      return;
    }

    setIsResetting(true);
    setForgotMsg('');

    try {
      const res = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          otpCode: otpCode.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowForgotModal(false);
        setSuccessMsg(data.message);
        setEmail(resetEmail.trim());
        setPassword(newPassword.trim());
      } else {
        setForgotMsg(data.error || 'Gagal mereset password.');
      }
    } catch (err: any) {
      setForgotMsg(`Error: ${err?.message || 'Server error'}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <main className="w-full min-h-screen bg-[#FBF9F9] flex items-center justify-center p-4 relative overflow-hidden font-[family-name:var(--font-geist-sans)]">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E4E2E2]/30 via-white to-[#FBF9F9] z-0 pointer-events-none" />

      {/* Main Centered Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#EFEDED] shadow-[0px_20px_50px_rgba(78,59,49,0.08)] p-8 sm:p-12 relative z-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
        {/* Sakura Zen Official Logo */}
        <div className="w-full flex justify-center mb-6">
          <SakuraLogo size="lg" showText={false} />
        </div>

        {/* Title Header */}
        <div className="text-center w-full mb-8">
          <h1 className="text-2xl font-extrabold text-[#1B1C1C] tracking-tight mb-1">
            Sakura Zen Backoffice
          </h1>
          <p className="text-xs font-bold text-[#817478] uppercase tracking-wider">
            Secure Administrative Access
          </p>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div className="w-full mb-6 p-4 rounded-xl bg-[#FFDAD6] border border-[#BA1A1A]/20 text-[#93000A] text-xs font-extrabold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="w-full mb-6 p-4 rounded-xl bg-[#CEE5DA] border border-[#4E635A]/20 text-[#4E635A] text-xs font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="w-full flex flex-col gap-5">
          {/* Admin Email Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-extrabold text-[#817478] uppercase tracking-wider">
              Admin Email
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-[#795465] absolute left-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sakurazen.id"
                required
                className="w-full bg-[#F5F3F3] text-[#1B1C1C] font-bold text-xs py-3.5 pl-11 pr-4 rounded-xl border border-[#EFEDED] focus:bg-white focus:border-[#795465] outline-none transition-all placeholder:text-[#817478]"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-extrabold text-[#817478] uppercase tracking-wider">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-[#795465] absolute left-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#F5F3F3] text-[#1B1C1C] font-bold text-xs py-3.5 pl-11 pr-4 rounded-xl border border-[#EFEDED] focus:bg-white focus:border-[#795465] outline-none transition-all placeholder:text-[#817478]"
              />
            </div>
          </div>

          {/* Remember Device & Forgot Password Row */}
          <div className="flex items-center justify-between mt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded text-[#795465] focus:ring-[#795465] border-[#EFEDED]"
              />
              <span className="text-xs font-extrabold text-[#4F4448] group-hover:text-[#1B1C1C] transition-colors">
                Remember device
              </span>
            </label>

            <button
              type="button"
              onClick={() => {
                setResetEmail(email);
                setForgotStep(1);
                setForgotMsg('');
                setShowForgotModal(true);
              }}
              className="text-xs font-extrabold text-[#795465] hover:text-[#684756] transition-colors hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 bg-gradient-to-r from-[#F8C8DC] to-[#795465] hover:from-[#F8C8DC] hover:to-[#684756] text-white font-extrabold text-xs py-4 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In to Backoffice'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Status Bar */}
        <div className="w-full mt-8 pt-6 border-t border-[#EFEDED] flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4E635A] animate-pulse" />
            <span className="text-[10px] font-extrabold text-[#817478] uppercase tracking-wider">
              System Status: Operational
            </span>
          </div>
          <a
            href="mailto:support@sakurazen.id"
            className="text-[11px] font-bold text-[#817478] hover:text-[#795465] transition-colors underline decoration-[#817478]/30 underline-offset-4"
          >
            Contact Technical Support
          </a>
        </div>
      </div>

      {/* Forgot Password / Reset Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFEDED] shadow-2xl w-full max-w-md p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#EFEDED] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F8C8DC] text-[#795465] flex items-center justify-center font-extrabold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-[#1B1C1C]">
                  {forgotStep === 1 ? 'Reset Password Admin' : 'Verifikasi Kode OTP'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 hover:bg-[#EFEDED] rounded-lg text-[#1B1C1C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotMsg && (
              <div className="p-3.5 rounded-xl bg-[#F5F3F3] border border-[#EFEDED] text-xs font-bold text-[#1B1C1C] space-y-1">
                <p>{forgotMsg}</p>
                {forgotDevOtp && (
                  <p className="text-[#795465] font-mono font-extrabold">
                    [Dev OTP Simulator]: <span className="underline">{forgotDevOtp}</span>
                  </p>
                )}
              </div>
            )}

            {forgotStep === 1 ? (
              /* Step 1: Input Email to Request OTP */
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="text-[11px] font-extrabold text-[#817478] uppercase tracking-wider block mb-1">
                    Email Admin Terdaftar:
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="admin@sakurazen.id"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] outline-none focus:border-[#795465]"
                  />
                </div>

                <p className="text-[11px] text-[#817478] font-bold">
                  Kode verifikasi OTP 6-digit akan dikirimkan ke alamat email Gmail terdaftar di atas.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 bg-[#F5F3F3] text-[#1B1C1C] font-extrabold text-xs rounded-xl hover:bg-[#EFEDED]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-5 py-2.5 bg-[#795465] hover:bg-[#684756] text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50"
                  >
                    {isResetting ? 'Mengirim...' : 'Kirim Kode Verifikasi'}
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Input OTP & New Password */
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-extrabold text-[#817478] uppercase tracking-wider block mb-1">
                    Kode Verifikasi OTP (6 Digit):
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="849201"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-mono font-extrabold text-[#795465] tracking-widest outline-none focus:border-[#795465]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-[#817478] uppercase tracking-wider block mb-1">
                    Password Baru:
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] outline-none focus:border-[#795465]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-[#817478] uppercase tracking-wider block mb-1">
                    Konfirmasi Password Baru:
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] outline-none focus:border-[#795465]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs font-bold text-[#795465] hover:underline"
                  >
                    ← Kembalikan Email
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2.5 bg-[#F5F3F3] text-[#1B1C1C] font-extrabold text-xs rounded-xl hover:bg-[#EFEDED]"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isResetting}
                      className="px-5 py-2.5 bg-[#795465] hover:bg-[#684756] text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50"
                    >
                      {isResetting ? 'Mereset...' : 'Reset & Confirm Password'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
