import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  LayoutDashboard,
  Sparkles,
  PenSquare,
  Calendar,
  Layers,
  Inbox,
  BarChart3,
  ShieldCheck,
  Share2,
  Users,
  Megaphone,
  Plus,
  Sun,
  Moon,
  Settings,
  Building2,
  Globe,
  ShieldAlert,
  TrendingUp,
  ArrowRight,
  Command,
  X,
} from 'lucide-react';
import { AppState, ViewMode } from '../../types';
import { NavTabId } from './Shell';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onNavigateTab: (tab: NavTabId, itemId?: string) => void;
  onNewPost: () => void;
  onSwitchWorkspace: (workspaceId: string) => void;
  onChangeViewMode: (mode: ViewMode) => void;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onTriggerTrendSpike: () => void;
  isAdmin?: boolean;
}

interface PaletteItem {
  id: string;
  group: 'Quick Actions' | 'Pages' | 'Workspaces' | 'Workspace Records';
  label: string;
  subtitle: string;
  shortcut?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onSelect: () => void;
}

const PAGE_ITEMS: {
  id: NavTabId;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: 'overview', label: 'Overview', subtitle: 'Workspace KPIs & upcoming queue', icon: LayoutDashboard },
  { id: 'copilot', label: 'AI Copilot', subtitle: '7-day strategy & caption generator', icon: Sparkles },
  { id: 'studio', label: 'Content Studio', subtitle: 'Split-screen multi-network composer', icon: PenSquare },
  { id: 'scheduler', label: 'Visual Scheduler', subtitle: 'Calendar, 3×3 IG Grid & weekly matrix', icon: Calendar },
  { id: 'categories', label: 'Content Categories', subtitle: 'Evergreen queues & weekly slots', icon: Layers },
  { id: 'inbox', label: 'Unified Inbox', subtitle: 'Omnichannel DMs, comments & smart replies', icon: Inbox },
  { id: 'analytics', label: 'Analytics & Reports', subtitle: 'Cross-channel ROI & white-label PDF', icon: BarChart3 },
  { id: 'approvals', label: 'Team & Approvals', subtitle: 'Client sign-off queue & permissions', icon: ShieldCheck },
  { id: 'profiles', label: 'Connected Profiles', subtitle: 'Manage social accounts & OAuth health', icon: Share2 },
  { id: 'crm', label: 'Social CRM', subtitle: 'Kanban deal pipeline & contact drawer', icon: Users },
  { id: 'ads', label: 'Ad Manager', subtitle: 'TikTok, Meta & Google campaign ROAS', icon: Megaphone },
];

export function CommandPalette({
  isOpen,
  onClose,
  state,
  onNavigateTab,
  onNewPost,
  onSwitchWorkspace,
  onChangeViewMode,
  onToggleDarkMode,
  onOpenSettings,
  onTriggerTrendSpike,
  isAdmin = false,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const list: PaletteItem[] = [
      {
        id: 'act-new-post',
        group: 'Quick Actions',
        label: 'New Post in Content Studio',
        subtitle: 'Compose multi-network post with live mobile preview',
        shortcut: 'N',
        icon: Plus,
        onSelect: onNewPost,
      },
      {
        id: 'act-ai-strategy',
        group: 'Quick Actions',
        label: 'Generate 7-Day AI Strategy',
        subtitle: 'Launch AI Copilot Wizard for active workspace',
        icon: Sparkles,
        onSelect: () => onNavigateTab('copilot'),
      },
      {
        id: 'act-trend-spike',
        group: 'Quick Actions',
        label: 'Scan Discovery Trend Spikes',
        subtitle: 'Detect breaking viral topics in your niche',
        icon: TrendingUp,
        onSelect: onTriggerTrendSpike,
      },
      {
        id: 'act-theme',
        group: 'Quick Actions',
        label: state.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        subtitle: 'Toggle Luminous Bento theme across all views',
        icon: state.darkMode ? Sun : Moon,
        onSelect: onToggleDarkMode,
      },
      {
        id: 'act-settings',
        group: 'Quick Actions',
        label: 'Open Workspace Settings',
        subtitle: 'Connected channels, roles, plan tier & JSON backup',
        icon: Settings,
        onSelect: onOpenSettings,
      },
      {
        id: 'act-mode-app',
        group: 'Quick Actions',
        label: 'Open User Workspace Dashboard',
        subtitle: 'Switch to environment view [2]',
        icon: LayoutDashboard,
        onSelect: () => onChangeViewMode('app'),
      },
      ...(isAdmin
        ? [
            {
              id: 'act-mode-admin',
              group: 'Quick Actions' as const,
              label: 'Open Super Admin Control Panel',
              subtitle: 'Founder operations, API health & billing governance',
              icon: ShieldAlert,
              onSelect: () => onChangeViewMode('admin'),
            },
          ]
        : []),
      {
        id: 'act-mode-landing',
        group: 'Quick Actions',
        label: 'View Public Marketing Website',
        subtitle: 'Switch to public SaaS landing page [1]',
        icon: Globe,
        onSelect: () => onChangeViewMode('landing'),
      },
      ...PAGE_ITEMS.map((p) => ({
        id: `page-${p.id}`,
        group: 'Pages' as const,
        label: p.label,
        subtitle: p.subtitle,
        icon: p.icon,
        onSelect: () => onNavigateTab(p.id),
      })),
      ...state.workspaces.map((ws) => ({
        id: `ws-${ws.id}`,
        group: 'Workspaces' as const,
        label: `Switch to ${ws.name}`,
        subtitle: `${ws.handle} · ${ws.industry}${ws.id === state.activeWorkspaceId ? ' (Active)' : ''}`,
        icon: Building2,
        onSelect: () => onSwitchWorkspace(ws.id),
      })),
    ];

    if (q.length > 0) {
      const wsId = state.activeWorkspaceId;
      state.contacts
        .filter(
          (c) =>
            c.workspaceId === wsId &&
            (c.name.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q))
        )
        .slice(0, 3)
        .forEach((c) =>
          list.push({
            id: `rec-c-${c.id}`,
            group: 'Workspace Records',
            label: c.name,
            subtitle: `CRM Contact · ${c.company || c.handle}`,
            icon: Users,
            onSelect: () => onNavigateTab('crm', c.id),
          })
        );

      state.threads
        .filter((t) => t.workspaceId === wsId && t.lastMessage.toLowerCase().includes(q))
        .slice(0, 3)
        .forEach((t) =>
          list.push({
            id: `rec-t-${t.id}`,
            group: 'Workspace Records',
            label: `${t.platform.toUpperCase()} Thread`,
            subtitle: t.lastMessage,
            icon: Inbox,
            onSelect: () => onNavigateTab('inbox', t.id),
          })
        );

      state.posts
        .filter((p) => p.workspaceId === wsId && p.content.toLowerCase().includes(q))
        .slice(0, 3)
        .forEach((p) =>
          list.push({
            id: `rec-p-${p.id}`,
            group: 'Workspace Records',
            label: `${p.status.replace('_', ' ').toUpperCase()} Post`,
            subtitle: p.content,
            icon: Calendar,
            onSelect: () => onNavigateTab('scheduler', p.id),
          })
        );
    }

    if (!q) return list;
    return list.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [
    query,
    state,
    onNavigateTab,
    onNewPost,
    onSwitchWorkspace,
    onChangeViewMode,
    onToggleDarkMode,
    onOpenSettings,
    onTriggerTrendSpike,
  ]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length ? (prev - 1 + items.length) % items.length : 0));
      } else if (e.key === 'Enter' && items[selectedIndex]) {
        e.preventDefault();
        items[selectedIndex].onSelect();
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, selectedIndex, onClose]);

  if (!isOpen) return null;

  const groups: PaletteItem['group'][] = ['Quick Actions', 'Pages', 'Workspaces', 'Workspace Records'];

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[10vh] p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          <Search size={17} className="text-[#4F46E5] dark:text-indigo-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to any page, trigger New Post, switch workspace, or search CRM..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            ESC
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Grouped Command List */}
        <div className="max-h-[58vh] overflow-y-auto p-2 custom-scrollbar">
          {items.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching pages, actions, or workspace records found for “{query}”.
            </div>
          ) : (
            groups.map((groupName) => {
              const groupItems = items.filter((item) => item.group === groupName);
              if (groupItems.length === 0) return null;
              return (
                <div key={groupName} className="mb-2 last:mb-0">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {groupName}
                  </p>
                  <div className="space-y-0.5">
                    {groupItems.map((item) => {
                      const globalIdx = items.findIndex((i) => i.id === item.id);
                      const isSelected = globalIdx === selectedIndex;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          onClick={() => {
                            item.onSelect();
                            onClose();
                          }}
                          className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left transition-colors ${
                            isSelected
                              ? 'bg-[#4F46E5] text-white shadow-sm'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-white/15 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-[#4F46E5] dark:text-indigo-400'
                              }`}
                            >
                              <Icon size={15} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{item.label}</p>
                              <p
                                className={`text-[11px] truncate ${
                                  isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {item.subtitle}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.shortcut && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                {item.shortcut}
                              </span>
                            )}
                            <ArrowRight
                              size={13}
                              className={isSelected ? 'text-white opacity-90' : 'text-slate-400 opacity-0'}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-950/70 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                ↵
              </kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
            <Command size={11} /> + K anywhere
          </span>
        </div>
      </div>
    </div>
  );
}
