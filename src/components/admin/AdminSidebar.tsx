'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MapPin,
  TrendingUp,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Armchair,
  Sparkles,
  Layers,
} from 'lucide-react';
import SakuraLogo from '../SakuraLogo';

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActiveRoute = (path: string) => {
    if (path === '/admin/dashboard' && pathname === '/admin/dashboard') return true;
    if (path === '/admin/locations' && (pathname === '/admin/locations')) return true;
    if (path === '/admin/chairs' && (pathname.startsWith('/admin/chairs') || pathname.includes('/chairs'))) return true;
    if (path === '/admin/tickets' && pathname.startsWith('/admin/tickets')) return true;
    return false;
  };

  const navSections = [
    {
      title: 'BACKOFFICE',
      items: [
        {
          name: 'Location Setting',
          href: '/admin/locations',
          icon: MapPin,
        },
        {
          name: 'Chair List',
          href: '/admin/chairs',
          icon: Armchair,
        },
      ],
    },
    {
      title: 'REPORTS & ANALYTICS',
      items: [
        {
          name: 'Sales Summary',
          href: '/admin/dashboard',
          icon: TrendingUp,
        },
        {
          name: 'Tickets',
          href: '/admin/tickets',
          icon: Ticket,
        },
      ],
    },
  ];

  return (
    <aside
      className={`relative flex flex-col transition-all duration-300 ease-in-out border-r border-[#EFEDED] bg-[#FBF9F9] ${
        isCollapsed ? 'w-20' : 'w-64'
      } shrink-0 min-h-screen select-none`}
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-5 border-b border-[#EFEDED] bg-white">
        {!isCollapsed ? (
          <SakuraLogo size="md" subtitle="BACKOFFICE SYSTEM" />
        ) : (
          <SakuraLogo size="sm" showText={false} className="mx-auto" />
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-2">
            {!isCollapsed && (
              <h2 className="px-3 text-[10px] font-extrabold text-[#795465] uppercase tracking-wider">
                {section.title}
              </h2>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActiveRoute(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={isCollapsed ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                      active
                        ? 'bg-[#795465] text-white shadow-md shadow-[#795465]/20'
                        : 'text-[#4F4448] hover:bg-[#EFEDED] hover:text-[#1B1C1C]'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-[#795465]'}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Toggle Button */}
      <div className="p-3 border-t border-[#EFEDED] bg-white flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-[10px] font-bold text-[#817478]">
            v1.36.1 • Sakura Zen
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl text-[#795465] hover:bg-[#EFEDED] transition-colors mx-auto"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}
