import React from 'react';
import { Globe, LayoutDashboard, ShieldAlert, Sun, Moon, Command } from 'lucide-react';
import { ViewMode, PlanTier } from '../../types';

interface TopModeSwitcherProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  selectedPlan: PlanTier;
  onOpenCommandPalette: () => void;
}

const PLAN_LABELS: Record<PlanTier, string> = {
  bootstrap: 'Bootstrap',
  accelerate: 'Accelerate',
  pro_agency: 'Pro Agency',
  pro50: 'Pro50 Scale',
  pro100: 'Pro100 Scale',
  pro150: 'Pro150 Scale',
};

export function TopModeSwitcher({
  viewMode,
  onChangeViewMode,
  darkMode,
  onToggleDarkMode,
  selectedPlan,
  onOpenCommandPalette,
}: TopModeSwitcherProps) {
  const modes: { id: ViewMode; num: string; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'landing', num: '1', label: 'Public Marketing Website', icon: Globe },
    { id: 'app', num: '2', label: 'User Workspace Dashboard', icon: LayoutDashboard },
    { id: 'admin', num: '3', label: 'Super Admin Control Panel', icon: ShieldAlert },
  ];

  return (
    <div className="h-10 px-4 bg-slate-950/95 dark:bg-[#05080F]/95 backdrop-blur-md text-slate-300 border-b border-slate-800/80 flex items-center justify-between gap-4 text-xs z-[60] shrink-0">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="hidden md:inline-block text-[10px] font-bold uppercase tracking-widest text-slate-500 mr-1 whitespace-nowrap">
          Environment View:
        </span>
        {modes.map((m) => {
          const Icon = m.icon;
          const active = viewMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onChangeViewMode(m.id)}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <span className="font-mono text-[10px] opacity-80">[{m.num}]</span>
              <Icon size={12} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          title="Open Command Palette (Cmd/Ctrl + K)"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors"
        >
          <Command size={11} className="text-indigo-400" />
          <span className="font-mono">⌘K</span>
        </button>
        <span className="hidden md:inline-block text-[11px] font-medium text-slate-400">
          Active Plan: <strong className="text-amber-400">{PLAN_LABELS[selectedPlan] || selectedPlan}</strong>
        </span>
        <button
          onClick={onToggleDarkMode}
          aria-label="Toggle instant dark mode"
          className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center gap-1.5 text-[11px] font-semibold transition-colors"
        >
          {darkMode ? <Sun size={12} className="text-amber-400" /> : <Moon size={12} className="text-indigo-400" />}
          <span>{darkMode ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </div>
  );
}
