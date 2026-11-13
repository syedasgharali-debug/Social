import React from 'react';
import { Platform } from '../../types';

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
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight ${meta.textClass}`}>
      <span
        className="w-2 h-2 rounded-xs shrink-0"
        style={{ backgroundColor: meta.accentHex }}
      />
      <span>{showFull ? meta.label : meta.short}</span>
    </span>
  );
}

const INITIAL_COLORS = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
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
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-lg',
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
        onError={() => setImgFailed(true)}
        className={`${dims} rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${dims} ${INITIAL_COLORS[colorIdx]} rounded-lg font-display font-bold flex items-center justify-center border border-slate-200/80 dark:border-slate-700 shrink-0`}
    >
      {initials || '?'}
    </div>
  );
}
