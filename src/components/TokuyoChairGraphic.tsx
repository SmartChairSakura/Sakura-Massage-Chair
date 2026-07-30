'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface TokuyoChairGraphicProps {
  isActive?: boolean;
  className?: string;
}

export default function TokuyoChairGraphic({ isActive = false, className = '' }: TokuyoChairGraphicProps) {
  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Active Pulse Glow Background */}
      {isActive && (
        <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" />
      )}

      {/* Tokuyo Chair SVG Graphic */}
      <div className={`relative z-10 transition-transform duration-500 ${isActive ? 'scale-105 animate-bounce-slow' : ''}`}>
        <svg
          viewBox="0 0 200 220"
          className="w-44 h-48 drop-shadow-xl"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Black Outer Shell / Chair Base */}
          <path
            d="M40 70 C40 30, 160 30, 160 70 L175 160 C180 185, 165 200, 140 200 L60 200 C35 200, 20 185, 25 160 Z"
            fill="#1E293B"
            stroke="#0F172A"
            strokeWidth="3"
          />

          {/* Cognac Leather Backrest (Tokuyo Warm Orange) */}
          <path
            d="M55 60 C55 35, 145 35, 145 60 L148 130 C148 140, 138 148, 128 148 L72 148 C62 148, 52 140, 52 130 Z"
            fill="#D97706"
          />

          {/* Headrest Cushion */}
          <rect x="70" y="42" width="60" height="28" rx="8" fill="#EA580C" stroke="#B45309" strokeWidth="2" />
          
          {/* Tokuyo Gold Logo Text */}
          <text x="100" y="58" textAnchor="middle" fill="#FDE68A" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
            TOKUYO
          </text>

          {/* Seat Cushion & Lateral Lumbar Supports */}
          <rect x="62" y="100" width="76" height="42" rx="10" fill="#EA580C" />
          <path d="M52 80 C50 110, 60 135, 66 135 C70 135, 68 110, 66 80 Z" fill="#C2410C" />
          <path d="M148 80 C150 110, 140 135, 134 135 C130 135, 132 110, 134 80 Z" fill="#C2410C" />

          {/* Armrest Pillars */}
          <rect x="34" y="90" width="22" height="60" rx="11" fill="#D97706" stroke="#92400E" strokeWidth="2" />
          <rect x="144" y="90" width="22" height="60" rx="11" fill="#D97706" stroke="#92400E" strokeWidth="2" />

          {/* Leg Rest & Calf Massagers */}
          <path d="M64 152 L78 194 C80 198, 92 198, 94 194 L100 152 Z" fill="#EA580C" stroke="#B45309" strokeWidth="1.5" />
          <path d="M100 152 L106 194 C108 198, 120 198, 122 194 L136 152 Z" fill="#EA580C" stroke="#B45309" strokeWidth="1.5" />

          {/* Active Roller Indicator LED Line */}
          {isActive && (
            <>
              <circle cx="85" cy="88" r="4" fill="#FEF08A" className="animate-ping" />
              <circle cx="115" cy="88" r="4" fill="#FEF08A" className="animate-ping" />
              <circle cx="85" cy="118" r="4" fill="#FEF08A" className="animate-ping" />
              <circle cx="115" cy="118" r="4" fill="#FEF08A" className="animate-ping" />
            </>
          )}
        </svg>
      </div>

      {/* Active Vibration Badge */}
      {isActive && (
        <div className="mt-3 inline-flex items-center gap-1.5 bg-orange-100 border border-orange-300 text-orange-900 px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
          <span>Pengurut Airbag & Roller Active</span>
        </div>
      )}
    </div>
  );
}
