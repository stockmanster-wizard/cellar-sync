import React from 'react';

interface HeroBackgroundProps {
  imageSrc: string;
  imageAlt?: string;
  children: React.ReactNode;
  className?: string;
}

export const HeroBackground: React.FC<HeroBackgroundProps> = ({
  imageSrc,
  imageAlt = '',
  children,
  className = '',
}) => {
  return (
    <div
      className={`min-h-screen min-h-[100dvh] w-full bg-stone-950 text-white flex flex-col justify-between p-5 sm:p-8 relative overflow-hidden select-none ${className}`.trim()}
    >
      {/* Full-Screen Wine Cellar Background Image */}
      <img
        src={imageSrc}
        alt={imageAlt}
        className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
        aria-hidden="true"
      />

      {/* Top status bar & header protection scrim */}
      <div
        className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Bottom content legibility gradient */}
      <div
        className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-stone-950 via-stone-950/75 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {children}
    </div>
  );
};
