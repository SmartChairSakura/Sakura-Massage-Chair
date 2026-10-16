'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { User, LogOut, ChevronRight, Home } from 'lucide-react';
import LocationSelector from './LocationSelector';

interface UserSession {
  name: string;
  role: 'SUPER_ADMIN' | 'MANAGEMENT' | 'OWNER';
  location_name?: string | null;
}

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    fetch('/api/admin/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setSession({
            name: data.user.name || 'Admin Sakura',
            role: data.user.role || 'SUPER_ADMIN',
            location_name: data.user.location_name,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Generate breadcrumb items
  const getBreadcrumbs = () => {
    if (pathname.startsWith('/admin/users')) {
      return [
        { label: 'Home', href: '/admin/dashboard' },
        { label: 'Backoffice', href: '/admin/users' },
        { label: 'User Management', href: '/admin/users' },
      ];
    }
    if (pathname.startsWith('/admin/locations')) {
      return [
        { label: 'Home', href: '/admin/dashboard' },
        { label: 'Backoffice', href: '/admin/locations' },
        { label: 'Location Setting', href: '/admin/locations' },
      ];
    }
    if (pathname.startsWith('/admin/chairs')) {
      return [
        { label: 'Home', href: '/admin/dashboard' },
        { label: 'Backoffice', href: '/admin/chairs' },
        { label: 'Chair List', href: '/admin/chairs' },
      ];
    }
    if (pathname.startsWith('/admin/tickets')) {
      return [
        { label: 'Home', href: '/admin/dashboard' },
        { label: 'Reports & Analytics', href: '/admin/tickets' },
        { label: 'Tickets', href: '/admin/tickets' },
      ];
    }
    return [
      { label: 'Home', href: '/admin/dashboard' },
      { label: 'Reports & Analytics', href: '/admin/dashboard' },
      { label: 'Sales Summary', href: '/admin/dashboard' },
    ];
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/login', { method: 'DELETE' });
    } catch (e) {
      console.warn('Logout error:', e);
    }
    router.replace('/admin/login');
  };

  const isManagement = session?.role === 'MANAGEMENT' || session?.role === 'OWNER';

  return (
    <header className="h-20 bg-white border-b border-[#EFEDED] px-6 flex items-center justify-between shrink-0 shadow-sm">
      {/* Left: Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-[#817478]">
        <Home className="w-3.5 h-3.5 text-[#795465]" />
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="w-3 h-3 text-[#D2C3C7]" />}
            <span
              className={
                i === breadcrumbs.length - 1
                  ? 'font-extrabold text-[#1B1C1C]'
                  : 'font-medium text-[#4F4448]'
              }
            >
              {b.label}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Right Actions & Location Selector */}
      <div className="flex items-center gap-4">
        {/* Global Location Selector */}
        <LocationSelector />

        {/* Admin Profile & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-[#EFEDED]">
          <div className="w-9 h-9 rounded-xl bg-[#F8C8DC] text-[#795465] flex items-center justify-center font-extrabold text-xs shadow-inner">
            <User className="w-4 h-4 text-[#795465]" />
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-extrabold text-[#1B1C1C] leading-none">
              {session?.name || 'Admin Sakura'}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  isManagement
                    ? 'bg-[#F8C8DC] text-[#795465]'
                    : 'bg-[#795465] text-white'
                }`}
              >
                {isManagement ? 'Management' : 'Super Admin'}
              </span>
              {session?.location_name && (
                <span className="text-[10px] text-[#817478] truncate max-w-[120px]">
                  • {session.location_name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-[#FFDAD6] text-[#BA1A1A] rounded-xl transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
