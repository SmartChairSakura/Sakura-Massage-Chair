'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, AlertCircle, KeyRound, ShieldCheck, X, Eye, EyeOff } from 'lucide-react';
import SakuraLogo from '@/components/SakuraLogo';

export default function AdminLoginPage() {
  const router = useRouter();

  // Login Form States (Clean initial states for security)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password / Reset Flow States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1); // 1: Email Input, 2: OTP & New Password
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotIsError, setForgotIsError] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Load remembered device email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('sakura_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberDevice(true);
    }
  }, []);

  // Keyboard accessibility: Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForgotModal) {
        setShowForgotModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForgotModal]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your admin email and password.');
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
        setIsRedirecting(true);
        router.replace('/admin/dashboard');
      } else {
        setErrorMsg(data.error || 'Login failed. Please check your credentials.');
        setIsLoading(false);
      }
    } catch (err) {
      setErrorMsg('Unable to connect to the authentication server.');
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setForgotIsError(true);
      setForgotMsg('Please enter your registered admin email.');
      return;
    }

    setIsResetting(true);
    setForgotMsg('');
    setForgotIsError(false);

    try {
      const res = await fetch('/api/admin/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setForgotStep(2);
        setForgotIsError(false);
        setForgotMsg(data.message);
      } else {
        setForgotIsError(true);
        setForgotMsg(data.error || 'Failed to send verification code.');
      }
    } catch (err: any) {
      setForgotIsError(true);
      setForgotMsg(`Error: ${err?.message || 'Server error'}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setForgotIsError(true);
      setForgotMsg('Verification code, new password, and confirmation are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotIsError(true);
      setForgotMsg('Password confirmation does not match.');
      return;
    }

    setIsResetting(true);
    setForgotMsg('');
    setForgotIsError(false);

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
        setForgotIsError(true);
        setForgotMsg(data.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setForgotIsError(true);
      setForgotMsg(`Error: ${err?.message || 'Server error'}`);
    } finally {
      setIsResetting(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="fixed inset-0 z-50 bg-[#FBF9F9] flex overflow-hidden animate-in fade-in duration-300 font-sans">
        {/* Skeleton Sidebar */}
        <aside className="w-64 bg-white border-r border-[#EFEDED] p-5 hidden md:flex flex-col gap-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F8C8DC]/60 animate-pulse shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-[#EFEDED] rounded-md w-24 animate-pulse" />
              <div className="h-2.5 bg-[#F5F3F3] rounded-md w-16 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2.5 pt-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-[#F5F3F3] animate-pulse" />
            ))}
          </div>
        </aside>

        {/* Skeleton Dashboard Main Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Skeleton Header */}
          <header className="h-20 bg-white border-b border-[#EFEDED] px-8 flex items-center justify-between shrink-0 shadow-xs">
            <div className="h-5 bg-[#EFEDED] rounded-md w-40 animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F8C8DC]/50 animate-pulse" />
              <div className="h-4 bg-[#EFEDED] rounded-md w-28 animate-pulse" />
            </div>
          </header>

          {/* Skeleton Dashboard Content */}
          <main className="p-6 sm:p-8 space-y-6 flex-1 overflow-hidden">
            {/* Top Bar Shimmer */}
            <div className="flex items-center justify-between pb-2">
              <div className="space-y-2">
                <div className="h-6 bg-[#EFEDED] rounded-lg w-48 animate-pulse" />
                <div className="h-3 bg-[#F5F3F3] rounded w-64 animate-pulse" />
              </div>
              <div className="h-9 bg-[#EFEDED] rounded-xl w-32 animate-pulse" />
            </div>

            {/* Metric KPI Cards with Shimmer Glow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-white border border-[#EFEDED] p-5 space-y-3 shadow-xs relative overflow-hidden"
                >
                  <div className="h-3 bg-[#F5F3F3] rounded w-24 animate-pulse" />
                  <div className="h-7 bg-[#EFEDED] rounded-lg w-32 animate-pulse" />
                  <div className="h-2.5 bg-[#F5F3F3] rounded w-20 animate-pulse" />
                </div>
              ))}
            </div>

            {/* Chart Skeleton Card */}
            <div className="h-80 rounded-2xl bg-white border border-[#EFEDED] p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-[#EFEDED] rounded-md w-44 animate-pulse" />
                <div className="h-4 bg-[#F5F3F3] rounded-md w-28 animate-pulse" />
              </div>
              <div className="h-64 bg-gradient-to-b from-[#FBF9F9] to-[#F5F3F3] rounded-xl animate-pulse flex items-end p-4 gap-3">
                {[40, 65, 30, 85, 55, 95, 70, 45, 90, 60, 80, 50].map((h, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${h}%` }}
                    className="flex-1 bg-[#EFEDED] rounded-t-md animate-pulse opacity-60"
                  />
                ))}
              </div>
            </div>
          </main>
        </div>

        {/* Center Floating Glassmorphism Transition Badge */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-md border border-[#EFEDED] shadow-[0px_20px_50px_rgba(121,84,101,0.2)] rounded-2xl px-8 py-5 flex items-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="w-6 h-6 border-3 border-[#795465]/20 border-t-[#795465] rounded-full animate-spin shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-[#1B1C1C] tracking-tight">
                Entering Sakura Zen Backoffice...
              </span>
              <span className="text-[10px] font-bold text-[#817478]">
                Loading dashboard data
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <p className="text-xs font-bold text-[#817478]">
            Sign in to your account.
          </p>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div
            role="alert"
            className="w-full mb-6 p-4 rounded-xl bg-[#FFDAD6] border border-[#BA1A1A]/20 text-[#93000A] text-xs font-extrabold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="w-full mb-6 p-4 rounded-xl bg-[#CEE5DA] border border-[#4E635A]/20 text-[#4E635A] text-xs font-extrabold flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="w-full flex flex-col gap-5">
          {/* Email Address Input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="admin-email"
              className="text-[11px] font-extrabold text-[#817478] uppercase tracking-wider"
            >
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-[#795465] absolute left-3.5 pointer-events-none" />
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                autoComplete="email"
                className="w-full bg-[#F5F3F3] text-[#1B1C1C] font-bold text-xs py-3.5 pl-11 pr-4 rounded-xl border border-[#EFEDED] focus:bg-white focus:border-[#795465] outline-none transition-all placeholder:text-[#817478]"
              />
            </div>
          </div>

          {/* Password Input with Visibility Toggle */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="admin-password"
              className="text-[11px] font-extrabold text-[#817478] uppercase tracking-wider"
            >
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-[#795465] absolute left-3.5 pointer-events-none" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-[#F5F3F3] text-[#1B1C1C] font-bold text-xs py-3.5 pl-11 pr-11 rounded-xl border border-[#EFEDED] focus:bg-white focus:border-[#795465] outline-none transition-all placeholder:text-[#817478]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 text-[#817478] hover:text-[#795465] transition-colors focus:outline-none"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Device & Forgot Password Row */}
          <div className="flex items-center justify-between mt-1">
            <label htmlFor="remember-device" className="flex items-center gap-2 cursor-pointer group">
              <input
                id="remember-device"
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded text-[#795465] focus:ring-[#795465] border-[#EFEDED] accent-[#795465]"
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

          {/* Submit Button (WCAG 2.1 AA Compliant solid Plum background with > 5:1 contrast) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 bg-[#795465] hover:bg-[#684756] active:bg-[#583a48] text-white font-extrabold text-xs py-4 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Support Link */}
        <div className="w-full mt-8 pt-6 border-t border-[#EFEDED] flex flex-col items-center">
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl border border-[#EFEDED] shadow-[0px_25px_60px_-15px_rgba(121,84,101,0.25)] w-full max-w-md p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
            <div className="flex items-center justify-between border-b border-[#EFEDED] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F8C8DC] text-[#795465] flex items-center justify-center font-extrabold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 id="forgot-modal-title" className="text-sm font-extrabold text-[#1B1C1C]">
                  {forgotStep === 1 ? 'Reset Admin Password' : 'Verify One-Time Code'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close dialog"
                className="p-1 hover:bg-[#EFEDED] rounded-lg text-[#1B1C1C] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotMsg && (
              <div
                role={forgotIsError ? 'alert' : 'status'}
                className={`p-3.5 rounded-xl border text-xs font-bold space-y-1 ${
                  forgotIsError
                    ? 'bg-[#FFDAD6] border-[#BA1A1A]/20 text-[#93000A]'
                    : 'bg-[#CEE5DA] border-[#4E635A]/20 text-[#4E635A]'
                }`}
              >
                <p>{forgotMsg}</p>
              </div>
            )}

            {forgotStep === 1 ? (
              /* Step 1: Input Email to Request OTP */
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="text-[11px] font-extrabold text-[#817478] uppercase tracking-wider block mb-1"
                  >
                    Registered Email Address:
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] outline-none focus:border-[#795465]"
                  />
                </div>

                <p className="text-[11px] text-[#817478] font-bold">
                  A 6-digit verification code will be sent to your registered email address.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 bg-[#F5F3F3] text-[#1B1C1C] font-extrabold text-xs rounded-xl hover:bg-[#EFEDED] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-5 py-2.5 bg-[#795465] hover:bg-[#684756] text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50 transition-colors"
                  >
                    {isResetting ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Input OTP & New Password (Hardened against browser credential manager autofill) */
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4" autoComplete="off">
                <div>
                  <label
                    htmlFor="otp-code"
                    className="text-[11px] font-extrabold text-[#817478] uppercase tracking-wider block mb-1"
                  >
                    Verification Code (6 Digits):
                  </label>
                  <input
                    id="otp-code"
                    name="security_otp_code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="849201"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-mono font-extrabold text-[#795465] tracking-widest outline-none focus:border-[#795465]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-password"
                    className="text-[11px] font-extrabold text-[#817478] uppercase tracking-wider block mb-1"
                  >
                    New Password:
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="new-password"
                      name="new_password_field"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-3.5 py-2.5 pr-10 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] outline-none focus:border-[#795465]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      className="absolute right-3 text-[#817478] hover:text-[#795465] transition-colors focus:outline-none"
                    >
                      {showNewPassword ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="text-[11px] font-extrabold text-[#817478] uppercase tracking-wider block mb-1"
                  >
                    Confirm New Password:
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="confirm-password"
                      name="confirm_password_field"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-3.5 py-2.5 pr-10 bg-[#F5F3F3] border border-[#EFEDED] rounded-xl text-xs font-bold text-[#1B1C1C] outline-none focus:border-[#795465]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute right-3 text-[#817478] hover:text-[#795465] transition-colors focus:outline-none"
                    >
                      {showConfirmPassword ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotMsg('');
                    }}
                    className="text-xs font-bold text-[#795465] hover:underline"
                  >
                    ← Change Email
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2.5 bg-[#F5F3F3] text-[#1B1C1C] font-extrabold text-xs rounded-xl hover:bg-[#EFEDED] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isResetting}
                      className="px-5 py-2.5 bg-[#795465] hover:bg-[#684756] text-white font-extrabold text-xs rounded-xl shadow-md disabled:opacity-50 transition-colors"
                    >
                      {isResetting ? 'Resetting...' : 'Reset Password'}
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
