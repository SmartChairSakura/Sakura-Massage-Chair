'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';

  const [isVerifyingSession, setIsVerifyingSession] = useState(!isLoginPage);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    // Skip verification when user is on login page
    if (isLoginPage) {
      setIsVerifyingSession(false);
      return;
    }

    let isMounted = true;

    const verifyActiveSession = async () => {
      try {
        const res = await fetch('/api/admin/auth/me', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });

        if (!res.ok) {
          throw new Error('Session invalid');
        }

        const data = await res.json();
        if (isMounted) {
          if (data.success && data.user) {
            setHasValidSession(true);
            setIsVerifyingSession(false);
          } else {
            setHasValidSession(false);
            setIsVerifyingSession(false);
            router.replace(`/admin/login?from=${encodeURIComponent(pathname)}`);
          }
        }
      } catch (err) {
        if (isMounted) {
          setHasValidSession(false);
          setIsVerifyingSession(false);
          router.replace(`/admin/login?from=${encodeURIComponent(pathname)}`);
        }
      }
    };

    verifyActiveSession();

    return () => {
      isMounted = false;
    };
  }, [pathname, isLoginPage, router]);

  // If on login page, render children directly without sidebar & header
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Security gate: show clean verification state while authenticating
  if (isVerifyingSession) {
    return (
      <div className="flex min-h-screen bg-[#FBF9F9] items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#795465]/20 border-t-[#795465] rounded-full animate-spin" />
          <span className="text-xs font-bold text-[#817478] uppercase tracking-wider">
            Verifying Security Session...
          </span>
        </div>
      </div>
    );
  }

  // Prevent rendering protected admin UI if unauthenticated
  if (!hasValidSession) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#FBF9F9] font-sans antialiased text-[#1B1C1C]">
      {/* Persistent Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header wrapped in Suspense for LocationSelector useSearchParams */}
        <Suspense fallback={<header className="h-20 bg-white border-b border-[#EFEDED] px-6 flex items-center justify-between shrink-0 shadow-sm"><span className="text-xs font-bold text-[#817478]">Memuat header...</span></header>}>
          <AdminHeader />
        </Suspense>

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
