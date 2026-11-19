import React, { useState } from 'react';

export interface BrandLogoProps {
  /** Height preset matching navbar, footer, and sidebar sizing */
  size?: 'sm' | 'md' | 'lg';
  /** Surface mode: 'auto' adapts to Tailwind .dark class; 'dark' forces dark-background variant */
  surface?: 'auto' | 'light' | 'dark';
  /** Render compact square orbit mark (used when desktop sidebar is collapsed) */
  markOnly?: boolean;
  className?: string;
}

const HEIGHT_CLASS: Record<NonNullable<BrandLogoProps['size']>, string> = {
  sm: 'h-7',
  md: 'h-8',
  lg: 'h-9',
};

export function BrandLogo({
  size = 'md',
  surface = 'auto',
  markOnly = false,
  className = '',
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false);
  const heightCls = HEIGHT_CLASS[size];

  if (failed) {
    return (
      <span
        className={`inline-flex items-center font-display text-base font-extrabold tracking-tight whitespace-nowrap shrink-0 ${
          surface === 'dark' ? 'text-white' : 'text-slate-900 dark:text-white'
        } ${className}`}
      >
        Socialify<span className="text-[#4F46E5] dark:text-indigo-400 ml-0.5">AI</span>
      </span>
    );
  }

  if (markOnly) {
    return (
      <img
        src="/logo-mark.png"
        alt="Socialify AI Logo"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${heightCls} w-auto object-contain shrink-0 select-none ${className}`}
      />
    );
  }

  if (surface === 'dark') {
    return (
      <img
        src="/logo-dark.png"
        alt="Socialify AI Logo"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${heightCls} w-auto object-contain shrink-0 select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${className}`}
      />
    );
  }

  if (surface === 'light') {
    return (
      <img
        src="/logo.png"
        alt="Socialify AI Logo"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${heightCls} w-auto object-contain shrink-0 select-none ${className}`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center shrink-0 select-none ${className}`}>
      <img
        src="/logo.png"
        alt="Socialify AI Logo"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${heightCls} w-auto object-contain block dark:hidden`}
      />
      <img
        src="/logo-dark.png"
        alt="Socialify AI Logo"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${heightCls} w-auto object-contain hidden dark:block drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]`}
      />
    </span>
  );
}
