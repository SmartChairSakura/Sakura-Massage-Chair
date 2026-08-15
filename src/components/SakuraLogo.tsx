import React from 'react';

interface SakuraLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

export default function SakuraLogo({
  size = 'md',
  showText = true,
  subtitle = 'KURSI PIJAT',
  className = '',
}: SakuraLogoProps) {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
  };

  const flowerSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Pink Circle Lotus Icon */}
      <div
        className={`${iconSizes[size]} rounded-full bg-[#F8C8DC] flex items-center justify-center shrink-0 shadow-sm`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#795465"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={flowerSizes[size]}
        >
          {/* 3-Petal Lotus / Sakura Flower Icon */}
          <path d="M12 2C9.5 6 9 9.5 12 14C15 9.5 14.5 6 12 2Z" fill="#795465" fillOpacity="0.2" />
          <path d="M12 14C7.5 11.5 4 13 2 17C6.5 18 10 16 12 14Z" fill="#795465" fillOpacity="0.2" />
          <path d="M12 14C16.5 11.5 20 13 22 17C17.5 18 14 16 12 14Z" fill="#795465" fillOpacity="0.2" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`${titleSizes[size]} font-extrabold text-[#795465] leading-tight tracking-tight`}>
            Sakura Zen
          </span>
          {subtitle && (
            <span className="text-[10px] font-extrabold text-[#817478] tracking-widest uppercase leading-none mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
