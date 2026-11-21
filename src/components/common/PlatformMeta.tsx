import React from 'react';
import { Platform } from '../../types';
import { SocialLogo } from './SocialIcons';

export { SocialLogo };

export const ALL_PLATFORMS: Platform[] = [
  'instagram',
  'tiktok',
  'linkedin',
  'x',
  'facebook',
  'youtube',
  'pinterest',
  'threads',
  'bluesky',
  'gbp',
];

export const PLATFORM_META: Record<
  Platform,
  {
    label: string;
    short: string;
    charLimit: number;
    accentHex: string;
    textClass: string;
    bgClass: string;
    bestTime: string;
  }
> = {
  instagram: {
    label: 'Instagram',
    short: 'IG',
    charLimit: 2200,
    accentHex: '#E1306C',
    textClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-50 dark:bg-rose-950/50',
    bestTime: 'Wed 11:30 AM',
  },
  tiktok: {
    label: 'TikTok',
    short: 'TT',
    charLimit: 2200,
    accentHex: '#0F172A',
    textClass: 'text-slate-900 dark:text-slate-100',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    bestTime: 'Fri 05:30 PM',
  },
  linkedin: {
    label: 'LinkedIn',
    short: 'LI',
    charLimit: 3000,
    accentHex: '#0A66C2',
    textClass: 'text-[#0A66C2] dark:text-sky-400',
    bgClass: 'bg-sky-50 dark:bg-sky-950/50',
    bestTime: 'Tue 09:00 AM',
  },
  x: {
    label: 'X (Twitter)',
    short: 'X',
    charLimit: 280,
    accentHex: '#0F172A',
    textClass: 'text-slate-900 dark:text-slate-200',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    bestTime: 'Thu 12:15 PM',
  },
  facebook: {
    label: 'Facebook',
    short: 'FB',
    charLimit: 63206,
    accentHex: '#1877F2',
    textClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-950/50',
    bestTime: 'Wed 01:00 PM',
  },
  youtube: {
    label: 'YouTube Shorts',
    short: 'YT',
    charLimit: 5000,
    accentHex: '#DC2626',
    textClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-950/50',
    bestTime: 'Thu 03:00 PM',
  },
  pinterest: {
    label: 'Pinterest',
    short: 'PI',
    charLimit: 500,
    accentHex: '#BD081C',
    textClass: 'text-red-700 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-950/40',
    bestTime: 'Sat 10:00 AM',
  },
  threads: {
    label: 'Threads',
    short: 'TH',
    charLimit: 500,
    accentHex: '#1E293B',
    textClass: 'text-slate-800 dark:text-slate-200',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    bestTime: 'Tue 04:00 PM',
  },
  bluesky: {
    label: 'Bluesky',
    short: 'BS',
    charLimit: 300,
    accentHex: '#0285FF',
    textClass: 'text-sky-600 dark:text-sky-400',
    bgClass: 'bg-sky-50 dark:bg-sky-950/50',
    bestTime: 'Wed 02:00 PM',
  },
  gbp: {
    label: 'Google Business',
    short: 'GBP',
    charLimit: 1500,
    accentHex: '#1A73E8',
    textClass: 'text-blue-700 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-950/50',
    bestTime: 'Mon 10:00 AM',
  },
};

export function PlatformTag({ platform, showFull = true }: { platform: Platform; showFull?: boolean }) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.linkedin;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF] whitespace-nowrap">
      <SocialLogo platform={platform} size={16} />
      <span>{showFull ? meta.label : meta.short}</span>
    </span>
  );
}

const INITIAL_COLORS = [
  'bg-black/[0.05] text-[#111827] dark:bg-white/[0.08] dark:text-[#F3F4F6]',
  'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  'bg-black/[0.07] text-[#374151] dark:bg-white/[0.1] dark:text-[#D1D5DB]',
];

export function ContactAvatar({
  name,
  src,
  size = 'md',
}: {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [imgFailed, setImgFailed] = React.useState(false);

  const dims = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base',
  }[size];

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const colorIdx = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % INITIAL_COLORS.length;

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${dims} rounded-[8px] object-cover border border-[#E5E7EB] dark:border-white/[0.08] shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${dims} ${INITIAL_COLORS[colorIdx]} rounded-[8px] font-medium flex items-center justify-center border border-[#E5E7EB] dark:border-white/[0.08] shrink-0`}
    >
      {initials || '?'}
    </div>
  );
}
