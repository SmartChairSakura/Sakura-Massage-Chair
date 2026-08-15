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
  const containerSizes = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Pink Circle (#F8C8DC) with Spa Material Symbol Icon (#795465) */}
      <div
        className={`${containerSizes[size]} rounded-full bg-[#F8C8DC] flex items-center justify-center text-[#795465] shrink-0 shadow-xs`}
      >
        <span className={`material-symbols-outlined ${iconSizes[size]} select-none leading-none`}>
          spa
        </span>
      </div>

      {showText && (
        <div className="flex flex-col justify-center">
          <span className={`${titleSizes[size]} font-extrabold text-[#795465] leading-none tracking-tight`}>
            Sakura Zen
          </span>
          {subtitle && (
            <span className={`${subtitleSizes[size]} font-extrabold text-[#817478] tracking-widest uppercase leading-none mt-1`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
