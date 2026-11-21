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
  Rocket,
  Radar,
  Repeat2,
  Youtube,
  FileText,
  Rss,
  Trophy,
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
  { id: 'youtube', label: 'YouTube Studio', subtitle: 'Multi-channel scripts, SEO chapters, thumbnail studio & playlist queue', icon: Youtube },
  { id: 'seo_blog', label: 'AI Blog & SEO', subtitle: 'Keyword-to-article generator, CMS connectors & social syndication', icon: FileText },
  { id: 'discover', label: 'Discover & Curate', subtitle: 'Viral trend explorer, RSS auto-importer, AI repurposer & product feeds', icon: Rss },
  { id: 'campaigns', label: 'Campaigns & Contests', subtitle: 'Viral giveaways, UGC contests, winner picker & conversion ROI tracker', icon: Trophy },
  { id: 'tools', label: 'Growth Tools', subtitle: 'Competitor Spy, URL Repurposer, Hook Lab, Trends, UTM/QR & ROI', icon: Rocket },
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
        id: 'act-youtube-pipeline',
        group: 'Quick Actions',
        label: 'Generate YouTube Script & SEO Metadata',
        subtitle: 'Open YouTube Multi-Channel Studio & Thumbnail A/B Preview',
        icon: Youtube,
        onSelect: () => onNavigateTab('youtube'),
      },
      {
        id: 'act-seo-article',
        group: 'Quick Actions',
        label: 'Write AI SEO Blog Article & Auto-Syndicate',
        subtitle: 'Generate H1–H3 article with FAQ schema & push to CMS + Scheduler',
        icon: FileText,
        onSelect: () => onNavigateTab('seo_blog'),
      },
      {
        id: 'act-viral-campaign',
        group: 'Quick Actions',
        label: 'Launch Viral Giveaway or UGC Contest',
        subtitle: 'Build referral giveaway, verify entries & sync leads to Social CRM',
        icon: Trophy,
        onSelect: () => onNavigateTab('campaigns'),
      },
      {
        id: 'act-competitor-spy',
        group: 'Quick Actions',
        label: 'Run Competitor Spy & Gap Analyzer',
        subtitle: 'Scrape competitor URL & uncover counter-positioning content gaps',
        icon: Radar,
        onSelect: () => onNavigateTab('tools', 'competitor'),
      },
      {
        id: 'act-url-repurpose',
        group: 'Quick Actions',
        label: 'Repurpose Article URL to 5 Channels',
        subtitle: 'Turn any live webpage into LinkedIn, X Thread, IG Carousel & TikTok',
        icon: Repeat2,
        onSelect: () => onNavigateTab('tools', 'repurposer'),
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
        label: 'Open Workspace Dashboard',
        subtitle: 'Jump to your active customer workspace',
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
        subtitle: 'Open socialifyai.com home page',
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

      (state.youtubeVideos || [])
        .filter((v) => v.workspaceId === wsId && (v.selectedTitle.toLowerCase().includes(q) || v.topic.toLowerCase().includes(q)))
        .slice(0, 2)
        .forEach((v) =>
          list.push({
            id: `rec-yt-${v.id}`,
            group: 'Workspace Records',
            label: v.selectedTitle,
            subtitle: `YouTube ${v.format} · ${v.status}`,
            icon: Youtube,
            onSelect: () => onNavigateTab('youtube', v.id),
          })
        );

      (state.seoArticles || [])
        .filter((a) => a.workspaceId === wsId && (a.title.toLowerCase().includes(q) || a.targetKeyword.toLowerCase().includes(q)))
        .slice(0, 2)
        .forEach((a) =>
          list.push({
            id: `rec-seo-${a.id}`,
            group: 'Workspace Records',
            label: a.title,
            subtitle: `SEO Article · ${a.targetKeyword}`,
            icon: FileText,
            onSelect: () => onNavigateTab('seo_blog', a.id),
          })
        );

      (state.viralCampaigns || [])
        .filter((c) => c.workspaceId === wsId && (c.name.toLowerCase().includes(q) || c.prizeTitle.toLowerCase().includes(q)))
        .slice(0, 2)
        .forEach((c) =>
          list.push({
            id: `rec-camp-${c.id}`,
            group: 'Workspace Records',
            label: c.name,
            subtitle: `Viral Campaign · ${c.entries.length} entries`,
            icon: Trophy,
            onSelect: () => onNavigateTab('campaigns', c.id),
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
    isAdmin,
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
    <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] p-4">
      <div
        className="absolute inset-0 bg-black/45 transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-[12px] overflow-hidden">
        {/* Search Input */}
        <div className="h-12 px-4 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center gap-3">
          <Search size={15} strokeWidth={1.5} className="text-[#06B6D4] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to module, run action, switch workspace, or search records..."
            className="flex-1 bg-transparent text-[13px] text-[#111827] dark:text-[#F3F4F6] placeholder:text-[#6B7280] outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#191D26] border border-[#E5E7EB] dark:border-white/[0.1] text-[10px] font-mono text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
          >
            ESC
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* Grouped Command List */}
        <div className="max-h-[56vh] overflow-y-auto p-1.5 custom-scrollbar">
          {items.length === 0 ? (
            <div className="py-12 text-center text-[12px] text-[#6B7280]">
              No matching pages, actions, or workspace records found for “{query}”.
            </div>
          ) : (
            groups.map((groupName) => {
              const groupItems = items.filter((item) => item.group === groupName);
              if (groupItems.length === 0) return null;
              return (
                <div key={groupName} className="mb-1.5 last:mb-0">
                  <p className="px-2.5 py-1.5 text-[11px] font-medium text-[#6B7280]">
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
                          className={`w-full px-2.5 py-2 rounded-[8px] flex items-center justify-between gap-3 text-left transition-colors ${
                            isSelected
                              ? 'bg-black/[0.06] dark:bg-white/[0.08] text-[#111827] dark:text-[#F3F4F6]'
                              : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-[6px] border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-[#FFFFFF] dark:bg-[#191D26] border-[#D1D5DB] dark:border-white/[0.15] text-[#06B6D4]'
                                  : 'bg-[#F8F9FB] dark:bg-[#0E1015] border-[#E5E7EB] dark:border-white/[0.08] text-[#6B7280]'
                              }`}
                            >
                              <Icon size={14} className="shrink-0" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] truncate">
                                {item.label}
                              </p>
                              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.shortcut && (
                              <span className="px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#191D26] border border-[#E5E7EB] dark:border-white/[0.08] text-[10px] font-mono text-[#6B7280]">
                                {item.shortcut}
                              </span>
                            )}
                            <ArrowRight
                              size={13}
                              className={isSelected ? 'text-[#06B6D4] opacity-100' : 'opacity-0'}
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
        <div className="px-4 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border-t border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6B7280]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.1] font-mono text-[10px]">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.1] font-mono text-[10px]">
                ↵
              </kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1 font-mono text-[10px] text-[#6B7280]">
            <Command size={11} /> + K anywhere
          </span>
        </div>
      </div>
    </div>
  );
}
