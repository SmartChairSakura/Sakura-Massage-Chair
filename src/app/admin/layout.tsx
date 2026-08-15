'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // If on login page, render children directly without sidebar & header
  if (pathname === '/admin/login') {
    return <>{children}</>;
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
