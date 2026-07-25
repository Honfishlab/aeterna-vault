import React, { useState } from 'react';

const logoImage = '/aeterna-logo.png';

interface AeternaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showTitle?: boolean;
  showSubtitle?: boolean;
  className?: string;
  variant?: 'aeterna' | 'atema';
  onClick?: () => void;
}

export const AeternaLogo: React.FC<AeternaLogoProps> = ({
  size = 'md',
  showTitle = true,
  showSubtitle = true,
  className = '',
  onClick
}) => {
  const [imgError, setImgError] = useState(false);

  // Size mappings
  const containerSizes = {
    sm: 'w-10 h-10 sm:w-12 sm:h-12',
    md: 'w-16 h-16 sm:w-20 sm:h-20',
    lg: 'w-24 h-24 sm:w-28 sm:h-28',
    xl: 'w-36 h-36 sm:w-44 sm:h-44',
    hero: 'w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72'
  };

  const titleSizes = {
    sm: 'text-xs tracking-[0.2em]',
    md: 'text-base sm:text-lg tracking-[0.25em]',
    lg: 'text-2xl sm:text-3xl tracking-[0.3em]',
    xl: 'text-3xl sm:text-4xl tracking-[0.3em]',
    hero: 'text-4xl sm:text-6xl tracking-[0.35em]'
  };

  const subtitleSizes = {
    sm: 'text-[7px] tracking-[0.2em]',
    md: 'text-[9px] tracking-[0.25em]',
    lg: 'text-[11px] tracking-[0.3em]',
    xl: 'text-[12px] tracking-[0.3em]',
    hero: 'text-xs sm:text-sm tracking-[0.35em]'
  };

  return (
    <div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center text-center select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      
      {/* Emblem Graphic Container */}
      <div className={`relative ${containerSizes[size]} flex items-center justify-center`}>
        
        {/* Outer Celestial Glow Effect */}
        <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#DFB260]/40 via-[#7336b4]/30 to-[#F5D77F]/40 blur-xl animate-pulse pointer-events-none"></div>
        
        {/* Logo Image or SVG Fallback */}
        {!imgError ? (
          <img 
            src={logoImage} 
            alt="Aeterna Vault Logo" 
            onError={() => setImgError(true)}
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_20px_rgba(223,178,96,0.6)] rounded-full transition-transform duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full relative z-10 rounded-full bg-gradient-to-br from-[#1C1032] via-[#2A184A] to-[#120B21] border-2 border-[#DFB260] flex items-center justify-center p-2 shadow-[0_0_25px_rgba(223,178,96,0.5)] transition-transform duration-300 group-hover:scale-105">
            <svg viewBox="0 0 100 100" className="w-full h-full text-[#F5D77F] fill-current drop-shadow-[0_0_8px_rgba(245,215,127,0.8)]">
              {/* Outer Hourglass / Infinity Ring */}
              <circle cx="50" cy="50" r="44" fill="none" stroke="#DFB260" strokeWidth="2" strokeDasharray="3 3" />
              <path d="M 30,25 C 30,45 70,55 70,75 C 70,80 30,80 30,75 C 30,55 70,45 70,25 Z" fill="none" stroke="#FFF2A8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="50" cy="50" r="6" fill="#DFB260" />
              <circle cx="50" cy="30" r="2" fill="#FFF2A8" />
              <circle cx="50" cy="70" r="2" fill="#FFF2A8" />
            </svg>
          </div>
        )}
      </div>

      {/* Brand Title & Subtitle Typography */}
      {showTitle && (
        <div className="mt-2 sm:mt-3 space-y-1">
          <h1 className={`font-cinzel font-bold uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#FFF8D0] via-[#F5D77F] to-[#B88E4C] ${titleSizes[size]} drop-shadow-[0_2px_12px_rgba(223,178,96,0.4)] group-hover:text-[#FFF8D0]`}>
            AETERNA VAULT
          </h1>

          {showSubtitle && (
            <p className={`font-cinzel uppercase text-[#C8B1E4]/90 font-semibold tracking-widest ${subtitleSizes[size]} drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]`}>
              DESIGNED FOR GENERATIONS OVER TIME
            </p>
          )}
        </div>
      )}

    </div>
  );
};


