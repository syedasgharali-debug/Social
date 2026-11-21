import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Stripe / Attio Slide-Over Inspector Drawer (w-[480px], border-l)
 * Keeps the primary table/board visible behind it while inspecting or editing records.
 */
export function InspectorDrawer({
  open,
  onClose,
  title,
  subtitle,
  headerActions,
  footer,
  widthClass = 'max-w-[480px]',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex justify-end">
      <div
        className="absolute inset-0 bg-black/25 dark:bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${widthClass} h-full bg-[#FFFFFF] dark:bg-[#13161D] border-l border-[#E5E7EB] dark:border-white/[0.08] flex flex-col`}
      >
        <div className="h-12 px-5 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-3 shrink-0 bg-[#F8F9FB] dark:bg-[#0E1015]">
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6] truncate tracking-[-0.01em]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="p-1.5 rounded-md text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">{children}</div>

        {footer && (
          <div className="px-5 py-3 border-t border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

/**
 * Disciplined KPI Strip Card (max 4 per strip, 12px radius, 16px-20px padding, tabular-nums, zero rainbow icon boxes)
 */
export function KpiMetricCard({
  label,
  value,
  sub,
  subtext,
  onClick,
  alert = false,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  subtext?: string;
  onClick?: () => void;
  alert?: boolean;
  accent?: string;
}) {
  const baseClass =
    'text-left bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-4 sm:p-5 transition-colors duration-150';
  const interactiveClass = onClick
    ? 'hover:border-[#D1D5DB] dark:hover:border-white/[0.15] hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] cursor-pointer'
    : '';
  const resolvedSub = sub ?? subtext;
  const valueTone =
    alert || accent === 'orange'
      ? 'text-[#F97316]'
      : accent === 'cyan'
      ? 'text-cyan-600 dark:text-cyan-400'
      : accent === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-[#111827] dark:text-[#F3F4F6]';

  const content = (
    <>
      <p className="text-[12px] font-medium text-[#4B5563] dark:text-[#9CA3AF] truncate">{label}</p>
      <p className={`mt-1.5 text-[26px] leading-none font-semibold tracking-[-0.02em] tabular-nums ${valueTone}`}>
        {value}
      </p>
      {resolvedSub && (
        <p className="mt-2 text-[12px] text-[#6B7280] dark:text-[#6B7280] truncate">{resolvedSub}</p>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${baseClass} ${interactiveClass}`}>
        {content}
      </button>
    );
  }
  return <div className={baseClass}>{content}</div>;
}

/**
 * Muted, low-opacity semantic status badge (Color = Meaning)
 */
export function StatusBadge({
  tone = 'neutral',
  label,
  dot = false,
  children,
}: {
  tone?: 'emerald' | 'cyan' | 'orange' | 'rose' | 'neutral';
  label?: React.ReactNode;
  dot?: boolean;
  children?: React.ReactNode;
}) {
  const toneStyles: Record<string, string> = {
    emerald:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    cyan:
      'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
    orange:
      'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
    rose:
      'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    neutral:
      'bg-black/[0.04] dark:bg-white/[0.05] text-[#4B5563] dark:text-[#9CA3AF] border-[#E5E7EB] dark:border-white/[0.08]',
  };
  const dotColors: Record<string, string> = {
    emerald: 'bg-emerald-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500',
    rose: 'bg-rose-500',
    neutral: 'bg-[#6B7280]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] border text-[11px] font-medium whitespace-nowrap ${toneStyles[tone]}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[tone]}`} />}
      {children ?? label}
    </span>
  );
}

/**
 * Bespoke Single-CTA Empty State Panel
 */
export function EmptyStatePanel({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> | React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
}) {
  const renderIcon = () => {
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComp = icon as React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
      return <IconComp size={18} strokeWidth={1.5} />;
    }
    return null;
  };

  return (
    <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
      <div className="w-10 h-10 rounded-[10px] border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] flex items-center justify-center text-[#6B7280] dark:text-[#9CA3AF]">
        {renderIcon()}
      </div>
      <p className="mt-3 text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6]">{title}</p>
      <p className="mt-1 text-[12px] text-[#4B5563] dark:text-[#9CA3AF] max-w-sm">{description}</p>
      {action ? (
        <div className="mt-4">{action}</div>
      ) : actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-3.5 py-2 rounded-[8px] bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] text-[12px] font-medium transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Monochrome SVG Sparkline for Super Admin & Analytics dense metrics
 */
export function MonochromeSparkline({
  values,
  height = 24,
  width = 84,
}: {
  values: number[];
  height?: number;
  width?: number;
}) {
  const safe = values.length >= 2 ? values : [0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const pts = safe
    .map((v, i) => {
      const x = (i / (safe.length - 1)) * width;
      const y = height - 3 - ((v - min) / range) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="text-[#4B5563] dark:text-[#9CA3AF] shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

/**
 * Layout-Matched Shimmer Skeleton for Stripe-grade tables
 */
export function TableSkeletonRows({ rows = 4, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="h-[44px] px-4 flex items-center gap-4">
          {Array.from({ length: cols }).map((__, cIdx) => (
            <div
              key={cIdx}
              className={`h-3 rounded shimmer-block ${cIdx === 0 ? 'w-1/3' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
