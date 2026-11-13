import React, { useState, useMemo } from 'react';
import {
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
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Bell,
  Sun,
  Moon,
  Zap,
  Globe,
  CheckCircle2,
  Building2,
  TrendingUp,
  Plus,
  X,
  RotateCcw,
  Menu,
  Command,
} from 'lucide-react';
import { AppState, TeamRole, DiscoveryAlert } from '../../types';
import { ContactAvatar } from '../common/PlatformMeta';

export type NavTabId =
  | 'overview'
  | 'copilot'
  | 'studio'
  | 'scheduler'
  | 'categories'
  | 'inbox'
  | 'analytics'
  | 'approvals'
  | 'profiles'
  | 'crm'
  | 'ads';

interface SidebarProps {
  state: AppState;
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  unreadInboxCount: number;
  pendingApprovalCount: number;
  onSwitchWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string, industry: string, handle: string) => void;
  onOpenSettings: () => void;
  onBackToLanding: () => void;
}

export function Sidebar({
  state,
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  onCloseMobile,
  unreadInboxCount,
  pendingApprovalCount,
  onSwitchWorkspace,
  onCreateWorkspace,
  onOpenSettings,
  onBackToLanding,
}: SidebarProps) {
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [wsForm, setWsForm] = useState({ name: '', industry: 'B2B Marketing', handle: '@' });

  const activeWorkspace =
    state.workspaces.find((w) => w.id === state.activeWorkspaceId) || state.workspaces[0];

  const navItems: {
    id: NavTabId;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    badge?: number;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'copilot', label: 'AI Copilot', icon: Sparkles },
    { id: 'studio', label: 'Content Studio', icon: PenSquare },
    { id: 'scheduler', label: 'Visual Scheduler', icon: Calendar },
    { id: 'categories', label: 'Content Categories', icon: Layers },
    { id: 'inbox', label: 'Unified Inbox', icon: Inbox, badge: unreadInboxCount },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'approvals', label: 'Team & Approvals', icon: ShieldCheck, badge: pendingApprovalCount },
    { id: 'profiles', label: 'Connected Profiles', icon: Share2 },
    { id: 'crm', label: 'Social CRM', icon: Users },
    { id: 'ads', label: 'Ad Manager', icon: Megaphone },
  ];

  const handleSubmitWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsForm.name.trim()) return;
    onCreateWorkspace(
      wsForm.name.trim(),
      wsForm.industry.trim() || 'Digital Brand',
      wsForm.handle.trim() || `@${wsForm.name.trim().toLowerCase().replace(/\s+/g, '')}`
    );
    setShowCreateWsModal(false);
    setWsDropdownOpen(false);
    setWsForm({ name: '', industry: 'B2B Marketing', handle: '@' });
  };

  const effectiveCollapsed = collapsed && !mobileOpen;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`${
          mobileOpen
            ? 'fixed inset-y-0 left-0 z-[80] w-[272px] flex shadow-2xl'
            : 'hidden md:flex'
        } ${
          !mobileOpen && (collapsed ? 'md:w-[72px]' : 'md:w-[252px]')
        } shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800/80 flex-col justify-between transition-all duration-200 z-40`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Brand Header */}
          <div className="h-16 px-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-600/25">
                <Zap size={16} className="fill-current" />
              </div>
              {!effectiveCollapsed && (
                <div className="min-w-0">
                  <p className="font-display text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    socialifyai<span className="text-[#4F46E5] dark:text-indigo-400">.com</span>
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400">
                    {state.selectedPlan.replace('_', ' ')}
                  </p>
                </div>
              )}
            </div>
            {mobileOpen ? (
              <button
                onClick={onCloseMobile}
                aria-label="Close navigation drawer"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
              >
                <X size={18} />
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden md:flex p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            )}
          </div>

          {/* Workspace Switcher Dropdown */}
          {!effectiveCollapsed && (
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 relative">
              <button
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-[#4F46E5] rounded-lg flex items-center justify-between gap-2 text-left transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 size={14} className="text-[#4F46E5] dark:text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {activeWorkspace.name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{activeWorkspace.handle}</p>
                  </div>
                </div>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>

              {wsDropdownOpen && (
                <div className="absolute left-3 right-3 top-full mt-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="p-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="space-y-0.5 pb-1.5">
                      {state.workspaces.map((ws) => (
                        <button
                          key={ws.id}
                          onClick={() => {
                            onSwitchWorkspace(ws.id);
                            setWsDropdownOpen(false);
                            onCloseMobile();
                          }}
                          className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between ${
                            ws.id === state.activeWorkspaceId
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{ws.name}</span>
                          {ws.id === state.activeWorkspaceId && <CheckCircle2 size={12} />}
                        </button>
                      ))}
                    </div>
                    <div className="pt-1.5">
                      <button
                        onClick={() => {
                          setWsDropdownOpen(false);
                          setShowCreateWsModal(true);
                        }}
                        className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1.5"
                      >
                        <Plus size={13} /> Create New Workspace
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nav Links */}
          <nav className="p-3 space-y-0.5 overflow-y-auto flex-1 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    onCloseMobile();
                  }}
                  title={effectiveCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon size={16} />
                    {!effectiveCollapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!effectiveCollapsed && typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="font-mono text-[10px] font-bold text-[#4F46E5] dark:text-indigo-400 tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Footer Controls */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1 shrink-0">
          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Settings size={15} />
            {!effectiveCollapsed && <span>Workspace Settings</span>}
          </button>
          <button
            onClick={() => {
              onBackToLanding();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Globe size={15} />
            {!effectiveCollapsed && <span>Public Landing Site</span>}
          </button>
        </div>
      </aside>

      {/* Create New Workspace Modal */}
      {showCreateWsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setShowCreateWsModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Create New Brand Workspace
              </h3>
              <button onClick={() => setShowCreateWsModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitWorkspace} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Workspace / Client Name
                </label>
                <input
                  required
                  value={wsForm.name}
                  onChange={(e) => setWsForm({ ...wsForm, name: e.target.value })}
                  placeholder="e.g. Client: Velox Fitness"
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Industry</label>
                  <input
                    value={wsForm.industry}
                    onChange={(e) => setWsForm({ ...wsForm, industry: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Primary Handle</label>
                  <input
                    value={wsForm.handle}
                    onChange={(e) => setWsForm({ ...wsForm, handle: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateWsModal(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-2 bg-[#4F46E5] text-white rounded-lg font-semibold">
                  Create & Switch Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

interface CommandBarProps {
  state: AppState;
  onQuickCreatePost: () => void;
  onSwitchRole: (role: TeamRole) => void;
  onToggleDarkMode: () => void;
  onNavigateResult: (tab: NavTabId, itemId?: string) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onSimulateSpikeAlert: () => void;
  onOpenSettings: () => void;
  onResetDemo: () => void;
  onOpenMobileMenu: () => void;
  onOpenCommandPalette: () => void;
}

export function CommandBar({
  state,
  onQuickCreatePost,
  onSwitchRole,
  onToggleDarkMode,
  onNavigateResult,
  onAcknowledgeAlert,
  onSimulateSpikeAlert,
  onOpenSettings,
  onResetDemo,
  onOpenMobileMenu,
  onOpenCommandPalette,
}: CommandBarProps) {
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const wsAlerts = useMemo(
    () => state.discoveryAlerts.filter((a) => a.workspaceId === state.activeWorkspaceId),
    [state.discoveryAlerts, state.activeWorkspaceId]
  );

  const unreadSpikes = wsAlerts.filter((a) => !a.acknowledged).length;

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const wsId = state.activeWorkspaceId;
    const results: { type: string; tab: NavTabId; id: string; title: string; subtitle: string }[] = [];

    state.posts
      .filter((p) => p.workspaceId === wsId && p.content.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((p) => results.push({ type: 'Scheduled Post', tab: 'scheduler', id: p.id, title: `${p.status.toUpperCase()} Post`, subtitle: p.content }));

    state.threads
      .filter((t) => t.workspaceId === wsId && t.lastMessage.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((t) => results.push({ type: 'Inbox Thread', tab: 'inbox', id: t.id, title: `${t.platform.toUpperCase()} Thread`, subtitle: t.lastMessage }));

    state.contacts
      .filter((c) => c.workspaceId === wsId && (c.name.toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q)))
      .slice(0, 3)
      .forEach((c) => results.push({ type: 'CRM Contact', tab: 'crm', id: c.id, title: c.name, subtitle: `${c.title || ''} · ${c.company || c.handle}` }));

    state.connectedProfiles
      .filter((p) => p.workspaceId === wsId && (p.accountName.toLowerCase().includes(q) || p.platform.toLowerCase().includes(q)))
      .slice(0, 2)
      .forEach((p) => results.push({ type: 'Social Profile', tab: 'profiles', id: p.id, title: p.accountName, subtitle: `${p.platform.toUpperCase()} · ${p.handle}` }));

    return results;
  }, [query, state]);

  return (
    <header className="h-16 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 flex items-center justify-between gap-3 md:gap-4 shrink-0 relative z-30">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {/* Mobile Navigation Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#4F46E5] shrink-0"
        >
          <Menu size={18} />
        </button>

        {/* Global Search + ⌘K Command Palette Trigger */}
        <div className="relative flex-1 min-w-0 max-w-xl">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, DMs, CRM contacts, or press ⌘K..."
            className="w-full pl-9 pr-20 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#4F46E5] transition-colors"
          />
          <button
            type="button"
            onClick={onOpenCommandPalette}
            title="Open Command Palette (Cmd/Ctrl + K)"
            className="hidden sm:flex items-center gap-1 absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-semibold text-slate-500 hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors"
          >
            <Command size={10} /> K
          </button>

          {searchFocused && query.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
              {searchResults.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-500">No matches found in active workspace.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.map((res) => (
                    <button
                      key={`${res.type}-${res.id}`}
                      onMouseDown={() => {
                        onNavigateResult(res.tab, res.id);
                        setQuery('');
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{res.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{res.subtitle}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400 shrink-0">
                        {res.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onQuickCreatePost}
          className="px-3.5 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 whitespace-nowrap"
        >
          <Plus size={14} /> Create Post
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setAlertsOpen(!alertsOpen);
              setProfileMenuOpen(false);
            }}
            aria-label="Notifications"
            className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Bell size={16} />
            {unreadSpikes > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadSpikes}
              </span>
            )}
          </button>

          {alertsOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-amber-500" /> Workspace Notifications
                  </p>
                  <p className="text-[11px] text-slate-500">Trend spikes & approval pings</p>
                </div>
                <button
                  onClick={() => {
                    onSimulateSpikeAlert();
                    setAlertsOpen(false);
                  }}
                  className="text-[11px] font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline"
                >
                  Scan Trends
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {wsAlerts.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500">All caught up for this workspace.</p>
                ) : (
                  wsAlerts.map((al: DiscoveryAlert) => (
                    <div key={al.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          {al.keyword} · {al.velocity}
                        </span>
                        <span className="text-slate-400">{al.source}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">{al.title}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          onClick={() => {
                            onNavigateResult('copilot');
                            setAlertsOpen(false);
                          }}
                          className="text-[11px] font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline"
                        >
                          Generate Strategy →
                        </button>
                        {!al.acknowledged && (
                          <button
                            onClick={() => onAcknowledgeAlert(al.id)}
                            className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onToggleDarkMode}
          aria-label="Toggle dark theme"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          {state.darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileMenuOpen(!profileMenuOpen);
              setAlertsOpen(false);
            }}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800"
          >
            <ContactAvatar name="Alex Rivera" size="sm" />
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">Alex Rivera</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{state.activeRole}</p>
            </div>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs">
              <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white">Switch Active Role</p>
                <div className="mt-1.5 grid grid-cols-2 gap-1">
                  {(['Owner', 'Manager', 'Publisher', 'Contributor'] as TeamRole[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        onSwitchRole(role);
                        setProfileMenuOpen(false);
                      }}
                      className={`px-2 py-1 rounded text-[11px] font-semibold text-left ${
                        state.activeRole === role
                          ? 'bg-[#4F46E5] text-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1.5 space-y-0.5">
                <button
                  onClick={() => {
                    onOpenSettings();
                    setProfileMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                >
                  <Settings size={13} /> Workspace Settings
                </button>
                <button
                  onClick={() => {
                    onResetDemo();
                    setProfileMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-left hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2 text-rose-600"
                >
                  <RotateCcw size={13} /> Reset Demo Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
