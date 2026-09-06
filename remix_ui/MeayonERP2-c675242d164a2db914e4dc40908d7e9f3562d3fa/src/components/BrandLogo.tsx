import React from 'react';
import { useApp } from '../context/AppContext';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
  showText?: boolean;
  theme?: 'light' | 'dark' | 'glass';
  className?: string;
  horizontal?: boolean;
  customLogoUrl?: string;
  companyNameAr?: string;
  companyNameEn?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  theme = 'light',
  className = '',
  horizontal = false,
  customLogoUrl: propCustomLogoUrl,
  companyNameAr: propCompanyNameAr,
  companyNameEn: propCompanyNameEn,
}) => {
  const [imageError, setImageError] = React.useState(false);
  let appBrandConfig: any = null;
  try {
    const appContext = useApp();
    appBrandConfig = appContext?.brandConfig;
  } catch {
    // Graceful fallback if rendered outside AppProvider
  }

  const effectiveLogoUrl = propCustomLogoUrl ?? appBrandConfig?.customLogoUrl;
  const effectiveNameAr = propCompanyNameAr ?? appBrandConfig?.companyNameAr ?? 'ميون مقاولات ولوجستيات';
  const effectiveNameEn = propCompanyNameEn ?? appBrandConfig?.companyNameEn ?? 'MYON CONTRACTING & LOGISTICS';

  // Reset imageError state if URL changes
  React.useEffect(() => {
    setImageError(false);
  }, [effectiveLogoUrl]);

  const sizeMap = {
    sm: { icon: 48, textAr: 'text-xs', textEn: 'text-[9px]' },
    md: { icon: 64, textAr: 'text-sm font-bold', textEn: 'text-[10px]' },
    lg: { icon: 96, textAr: 'text-base font-bold', textEn: 'text-xs' },
    xl: { icon: 120, textAr: 'text-xl font-bold', textEn: 'text-sm' },
    '2xl': { icon: 140, textAr: 'text-2xl font-black', textEn: 'text-base' },
    hero: { icon: 180, textAr: 'text-3xl font-black', textEn: 'text-lg' },
  };

  const currentSize = sizeMap[size];
  const isDark = theme === 'dark';

  // Precision spiral pattern with 3 rings of rounded capsule rays
  const renderSpiralPills = () => {
    const pills = [];
    const rings = [
      { count: 18, radius: 24, length: 14, width: 6, rotOffset: 25 },
      { count: 24, radius: 46, length: 20, width: 8, rotOffset: 50 },
      { count: 28, radius: 72, length: 28, width: 11, rotOffset: 75 },
    ];

    let key = 0;
    rings.forEach((ring) => {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i * 360) / ring.count + ring.rotOffset;
        const rad = (angle * Math.PI) / 180;
        const cosAngle = Math.cos(rad);
        const sinAngle = Math.sin(rad);
        const x = 110 + ring.radius * cosAngle * 1.05;
        const y = 100 + ring.radius * sinAngle * 0.85;

        const colorRatio = (i / ring.count + ring.rotOffset / 360) % 1;
        const fillId = colorRatio < 0.35 ? 'orangeGrad' : colorRatio < 0.7 ? 'brandDarkGrad' : 'amberOrangeGrad';

        pills.push(
          <rect
            key={`pill-${key++}`}
            x={x - ring.width / 2}
            y={y - ring.length / 2}
            width={ring.width}
            height={ring.length}
            rx={ring.width / 2}
            transform={`rotate(${angle + 40}, ${x}, ${y})`}
            fill={`url(#${fillId})`}
            opacity={0.92 + (i % 3) * 0.03}
          />
        );
      }
    });

    return pills;
  };

  return (
    <div
      className={`inline-flex ${
        horizontal ? 'flex-row items-center gap-3' : 'flex-col items-center justify-center gap-2'
      } bg-transparent ${className}`}
      id="brand-logo-container"
    >
      {effectiveLogoUrl && !imageError ? (
        <div
          style={{ width: currentSize.icon, height: currentSize.icon }}
          className="relative flex items-center justify-center bg-transparent shrink-0"
        >
          <img
            src={effectiveLogoUrl}
            alt={effectiveNameEn}
            className="h-full w-full object-contain bg-transparent"
            referrerPolicy="no-referrer"
            onError={() => {
              setImageError(true);
            }}
          />
        </div>
      ) : (
        <svg
          width={currentSize.icon}
          height={currentSize.icon}
          viewBox="0 0 220 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 transition-transform duration-300 hover:scale-105"
        >
          <defs>
            <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#F05627" />
            </linearGradient>
            <linearGradient id="brandDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2A2A2A" />
              <stop offset="50%" stopColor="#1A1A1A" />
              <stop offset="100%" stopColor="#F05627" />
            </linearGradient>
            <linearGradient id="amberOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="50%" stopColor="#F05627" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F05627" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F05627" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="110" cy="100" r="85" fill="url(#centerGlow)" />
          <g id="vortex-spiral-group">{renderSpiralPills()}</g>
        </svg>
      )}

      {showText && (
        <div
          className={`flex flex-col ${
            horizontal ? 'items-start text-right' : 'items-center text-center'
          } leading-tight`}
        >
          <span
            className={`${currentSize.textAr} font-bold tracking-tight ${
              isDark ? 'text-orange-200' : 'text-neutral-900'
            }`}
            style={{ fontFamily: "'Noto Kufi Arabic', 'Tajawal', sans-serif" }}
          >
            {effectiveNameAr}
          </span>
          <span
            className={`${currentSize.textEn} tracking-widest uppercase font-semibold ${
              isDark ? 'text-orange-400' : 'text-[#F05627]'
            }`}
            style={{ letterSpacing: '0.12em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {effectiveNameEn}
          </span>
        </div>
      )}
    </div>
  );
};
