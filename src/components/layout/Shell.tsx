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
  Check,
  Building2,
  TrendingUp,
  Plus,
  X,
  RotateCcw,
  Menu,
  Command,
  LogOut,
  Rocket,
  Youtube,
  FileText,
  Rss,
  Trophy,
  GraduationCap,
} from 'lucide-react';
import { AppState, TeamRole, DiscoveryAlert } from '../../types';
import { ContactAvatar } from '../common/PlatformMeta';
import { BrandLogo } from '../BrandLogo';

export type NavTabId =
  | 'overview'
  | 'youtube'
  | 'seo_blog'
  | 'discover'
  | 'campaigns'
  | 'tools'
  | 'copilot'
  | 'studio'
  | 'scheduler'
  | 'categories'
  | 'inbox'
  | 'analytics'
  | 'approvals'
  | 'profiles'
  | 'crm'
  | 'ads'
  | 'academy';

export const NAV_TAB_LABELS: Record<NavTabId, { group: string; label: string }> = {
  overview: { group: 'Workspace', label: 'Overview' },
  youtube: { group: 'AI Content & Channels', label: 'YouTube Studio' },
  seo_blog: { group: 'AI Content & Channels', label: 'AI Blog & SEO' },
  discover: { group: 'AI Content & Channels', label: 'Discover & Curate' },
  copilot: { group: 'AI Content & Channels', label: 'AI Copilot' },
  studio: { group: 'AI Content & Channels', label: 'Content Studio' },
  scheduler: { group: 'AI Content & Channels', label: 'Visual Scheduler' },
  categories: { group: 'AI Content & Channels', label: 'Content Categories' },
  campaigns: { group: 'Growth & Campaigns', label: 'Campaigns & Contests' },
  tools: { group: 'Growth & Campaigns', label: 'Growth Tools' },
  ads: { group: 'Growth & Campaigns', label: 'Ad Manager' },
  inbox: { group: 'Engagement & CRM', label: 'Unified Inbox' },
  crm: { group: 'Engagement & CRM', label: 'Social CRM' },
  analytics: { group: 'Engagement & CRM', label: 'Analytics & Reports' },
  approvals: { group: 'Operations', label: 'Team & Approvals' },
  profiles: { group: 'Operations', label: 'Connected Profiles' },
  academy: { group: 'Learning', label: 'Academy' },
};

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
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  aiCreditsUsed?: number;
  aiCreditsLimit?: number;
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
  isAdmin = false,
  onOpenAdmin,
  aiCreditsUsed = 0,
  aiCreditsLimit = 5000,
}: SidebarProps) {
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [wsForm, setWsForm] = useState({ name: '', industry: 'B2B Marketing', handle: '@' });

  const activeWorkspace =
    state.workspaces.find((w) => w.id === state.activeWorkspaceId) || state.workspaces[0];

  const creditsPct = Math.min(
    100,
    Math.round((aiCreditsUsed / Math.max(1, aiCreditsLimit)) * 100)
  );

  const navGroups: {
    group: string;
    items: {
      id: NavTabId;
      label: string;
      icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
      badge?: number;
    }[];
  }[] = [
    {
      group: 'Workspace',
      items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }],
    },
    {
      group: 'AI Content & Channels',
      items: [
        { id: 'youtube', label: 'YouTube Studio', icon: Youtube },
        { id: 'seo_blog', label: 'AI Blog & SEO', icon: FileText },
        { id: 'discover', label: 'Discover & Curate', icon: Rss },
        { id: 'copilot', label: 'AI Copilot', icon: Sparkles },
        { id: 'studio', label: 'Content Studio', icon: PenSquare },
        { id: 'scheduler', label: 'Visual Scheduler', icon: Calendar },
        { id: 'categories', label: 'Content Categories', icon: Layers },
      ],
    },
    {
      group: 'Growth & Campaigns',
      items: [
        { id: 'campaigns', label: 'Campaigns & Contests', icon: Trophy },
        { id: 'tools', label: 'Growth Tools', icon: Rocket },
        { id: 'ads', label: 'Ad Manager', icon: Megaphone },
      ],
    },
    {
      group: 'Engagement & CRM',
      items: [
        { id: 'inbox', label: 'Unified Inbox', icon: Inbox, badge: unreadInboxCount },
        { id: 'crm', label: 'Social CRM', icon: Users },
        { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
      ],
    },
    {
      group: 'Operations',
      items: [
        { id: 'approvals', label: 'Team & Approvals', icon: ShieldCheck, badge: pendingApprovalCount },
        { id: 'profiles', label: 'Connected Profiles', icon: Share2 },
      ],
    },
    {
      group: 'Learning',
      items: [
        { id: 'academy', label: 'Academy', icon: GraduationCap },
      ],
    },
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
          className="fixed inset-0 z-[70] bg-black/50 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`${
          mobileOpen
            ? 'fixed inset-y-0 left-0 z-[80] w-[248px] flex'
            : 'hidden md:flex'
        } ${
          !mobileOpen && (collapsed ? 'md:w-[60px]' : 'md:w-[248px]')
        } shrink-0 bg-[#F3F4F6] dark:bg-[#0E1015] border-r border-[#E5E7EB] dark:border-white/[0.08] flex-col justify-between transition-[width] duration-150 z-40`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* 48px Brand Header aligned to Top Utility Bar */}
          <div className="h-12 px-3 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('overview');
                onCloseMobile();
              }}
              aria-label="Go to Dashboard Overview"
              className="flex items-center min-w-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#06B6D4] rounded-md"
            >
              <BrandLogo size="sm" surface="auto" markOnly={effectiveCollapsed} />
            </button>
            {mobileOpen ? (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation drawer"
                className="p-1.5 rounded-md text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] md:hidden"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden md:flex p-1 rounded-md text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
              >
                {collapsed ? (
                  <ChevronRight size={15} strokeWidth={1.5} />
                ) : (
                  <ChevronLeft size={15} strokeWidth={1.5} />
                )}
              </button>
            )}
          </div>

          {/* Compact Workspace Switcher */}
          {!effectiveCollapsed && (
            <div className="px-2.5 py-2 border-b border-[#E5E7EB] dark:border-white/[0.08] relative">
              <button
                type="button"
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="w-full px-2.5 py-1.5 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] flex items-center justify-between gap-2 text-left transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2
                    size={14}
                    strokeWidth={1.5}
                    className="text-[#4B5563] dark:text-[#9CA3AF] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] truncate leading-tight">
                      {activeWorkspace.name}
                    </p>
                    <p className="text-[10px] font-mono text-[#6B7280] truncate">
                      {activeWorkspace.handle}
                    </p>
                  </div>
                </div>
                <ChevronDown size={13} strokeWidth={1.5} className="text-[#6B7280] shrink-0" />
              </button>

              {wsDropdownOpen && (
                <div className="absolute left-2.5 right-2.5 top-full mt-1 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-[10px] overflow-hidden z-50">
                  <div className="p-1 divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
                    <div className="space-y-0.5 pb-1">
                      {state.workspaces.map((ws) => (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => {
                            onSwitchWorkspace(ws.id);
                            setWsDropdownOpen(false);
                            onCloseMobile();
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-[6px] text-left text-[12px] flex items-center justify-between transition-colors ${
                            ws.id === state.activeWorkspaceId
                              ? 'bg-black/[0.05] dark:bg-white/[0.08] text-[#111827] dark:text-[#F3F4F6] font-medium'
                              : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                          }`}
                        >
                          <span className="truncate">{ws.name}</span>
                          {ws.id === state.activeWorkspaceId && (
                            <Check size={13} strokeWidth={1.5} className="text-[#06B6D4] shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setWsDropdownOpen(false);
                          setShowCreateWsModal(true);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-[6px] text-left text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-1.5 transition-colors"
                      >
                        <Plus size={13} strokeWidth={1.5} /> New workspace
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compact Linear-Style Grouped Navigation */}
          <nav className="px-2 py-2.5 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
            {navGroups.map((section) => (
              <div key={section.group} className="space-y-0.5">
                {!effectiveCollapsed && (
                  <p className="px-2.5 pb-1 text-[11px] font-medium text-[#6B7280] dark:text-[#6B7280]">
                    {section.group}
                  </p>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        onCloseMobile();
                      }}
                      title={effectiveCollapsed ? item.label : undefined}
                      className={`group relative w-full flex items-center justify-between px-2.5 py-1.5 rounded-[7px] text-[13px] transition-colors duration-150 ${
                        active
                          ? 'bg-black/[0.06] dark:bg-white/[0.06] text-[#111827] dark:text-[#F3F4F6] font-medium'
                          : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-[#111827] dark:hover:text-[#F3F4F6] font-normal'
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[#06B6D4]"
                        />
                      )}
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={15}
                          strokeWidth={1.5}
                          className={
                            active
                              ? 'text-[#111827] dark:text-[#F3F4F6] shrink-0'
                              : 'text-[#6B7280] dark:text-[#6B7280] group-hover:text-[#111827] dark:group-hover:text-[#D1D5DB] shrink-0'
                          }
                        />
                        {!effectiveCollapsed && <span className="truncate">{item.label}</span>}
                      </span>
                      {!effectiveCollapsed && typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="font-mono text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF] tabular-nums">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer AI Credits Meter + Quiet Utility Links */}
        <div className="p-2.5 border-t border-[#E5E7EB] dark:border-white/[0.08] space-y-1 shrink-0">
          {!effectiveCollapsed && (
            <div className="px-2.5 py-2 rounded-[8px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] space-y-1.5 mb-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-[#4B5563] dark:text-[#9CA3AF] flex items-center gap-1.5">
                  <Zap
                    size={12}
                    strokeWidth={1.5}
                    className={creditsPct >= 85 ? 'text-[#F97316]' : 'text-[#06B6D4]'}
                  />
                  AI Credits
                </span>
                <span className="font-mono font-medium text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                  {aiCreditsUsed.toLocaleString()} / {aiCreditsLimit.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-200 ${
                    creditsPct >= 85 ? 'bg-[#F97316]' : 'bg-[#06B6D4]'
                  }`}
                  style={{ width: `${creditsPct}%` }}
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[7px] text-[13px] text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors"
          >
            <Settings size={15} strokeWidth={1.5} />
            {!effectiveCollapsed && <span>Settings</span>}
          </button>
          {isAdmin && onOpenAdmin && (
            <button
              type="button"
              onClick={() => {
                onOpenAdmin();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[7px] text-[13px] font-medium text-[#06B6D4] hover:bg-cyan-500/10 transition-colors"
            >
              <ShieldCheck size={15} strokeWidth={1.5} />
              {!effectiveCollapsed && <span>Super Admin Console</span>}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onBackToLanding();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[7px] text-[13px] text-[#6B7280] dark:text-[#6B7280] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors"
          >
            <Globe size={15} strokeWidth={1.5} />
            {!effectiveCollapsed && <span>socialifyai.com</span>}
          </button>
        </div>
      </aside>

      {/* Focused Creation Modal: Create New Workspace */}
      {showCreateWsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={() => setShowCreateWsModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-[12px] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                Create workspace
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateWsModal(false)}
                className="p-1 rounded-md text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleSubmitWorkspace} className="mt-4 space-y-3.5 text-[12px]">
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                  Workspace / Client Name
                </label>
                <input
                  required
                  value={wsForm.name}
                  onChange={(e) => setWsForm({ ...wsForm, name: e.target.value })}
                  placeholder="e.g. Velox Fitness"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                    Industry
                  </label>
                  <input
                    value={wsForm.industry}
                    onChange={(e) => setWsForm({ ...wsForm, industry: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                    Primary Handle
                  </label>
                  <input
                    value={wsForm.handle}
                    onChange={(e) => setWsForm({ ...wsForm, handle: e.target.value })}
                    className="w-full px-3 py-2 font-mono bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateWsModal(false)}
                  className="px-3.5 py-2 border border-[#E5E7EB] dark:border-white/[0.1] rounded-[8px] font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium transition-colors"
                >
                  Create workspace
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
  activeTab: NavTabId;
  userProfile: { displayName: string; email: string; photoURL?: string };
  onSignOut: () => void;
  onQuickCreatePost: () => void;
  onSwitchRole: (role: TeamRole) => void;
  onSwitchWorkspace: (workspaceId: string) => void;
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
  activeTab,
  userProfile,
  onSignOut,
  onQuickCreatePost,
  onSwitchRole,
  onSwitchWorkspace,
  onToggleDarkMode,
  onNavigateResult,
  onAcknowledgeAlert,
  onSimulateSpikeAlert,
  onOpenSettings,
  onResetDemo,
  onOpenMobileMenu,
  onOpenCommandPalette,
}: CommandBarProps) {
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [topWsOpen, setTopWsOpen] = useState(false);

  const activeWorkspace =
    state.workspaces.find((w) => w.id === state.activeWorkspaceId) || state.workspaces[0];
  const currentNavMeta = NAV_TAB_LABELS[activeTab] || { group: 'Workspace', label: 'Overview' };

  const wsAlerts = useMemo(
    () => state.discoveryAlerts.filter((a) => a.workspaceId === state.activeWorkspaceId),
    [state.discoveryAlerts, state.activeWorkspaceId]
  );

  const unreadSpikes = wsAlerts.filter((a) => !a.acknowledged).length;

  return (
    <header className="h-12 bg-[#FFFFFF] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08] px-4 md:px-5 flex items-center justify-between gap-3 shrink-0 relative z-30">
      {/* Left: Mobile Trigger + Breadcrumb Path & Inline Workspace Switcher */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="md:hidden p-1.5 rounded-[7px] border border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] shrink-0"
        >
          <Menu size={16} strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={() => onNavigateResult('overview')}
          aria-label="Go to Dashboard Overview"
          className="md:hidden flex items-center shrink-0"
        >
          <BrandLogo size="sm" surface="auto" markOnly />
        </button>

        {/* Breadcrumb Trail with Inline Workspace Switcher */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[13px] min-w-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTopWsOpen((v) => !v);
                setAlertsOpen(false);
                setProfileMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors whitespace-nowrap"
            >
              <span className="truncate max-w-[160px] font-medium">{activeWorkspace.name}</span>
              <ChevronDown size={12} strokeWidth={1.5} className="text-[#6B7280] shrink-0" />
            </button>

            {topWsOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-[10px] p-1 z-50">
                <p className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">
                  Switch workspace
                </p>
                {state.workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => {
                      onSwitchWorkspace(ws.id);
                      setTopWsOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-[6px] text-left text-[12px] flex items-center justify-between gap-2 transition-colors ${
                      ws.id === state.activeWorkspaceId
                        ? 'bg-black/[0.05] dark:bg-white/[0.08] text-[#111827] dark:text-[#F3F4F6] font-medium'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {ws.id === state.activeWorkspaceId && (
                      <Check size={13} strokeWidth={1.5} className="text-[#06B6D4] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-[#D1D5DB] dark:text-white/[0.15]" aria-hidden="true">
            /
          </span>
          <span className="text-[#6B7280] dark:text-[#6B7280] hidden lg:inline whitespace-nowrap">
            {currentNavMeta.group}
          </span>
          <span
            className="text-[#D1D5DB] dark:text-white/[0.15] hidden lg:inline"
            aria-hidden="true"
          >
            /
          </span>
          <span className="font-medium text-[#111827] dark:text-[#F3F4F6] truncate whitespace-nowrap">
            {currentNavMeta.label}
          </span>
        </nav>
      </div>

      {/* Right Utility Controls: ⌘K Trigger, Primary CTA, Notifications, Theme, Profile */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          title="Open Command Palette (Cmd/Ctrl + K)"
          className="flex items-center gap-2 h-8 px-2.5 rounded-[7px] bg-[#F8F9FB] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] text-[12px] text-[#6B7280] dark:text-[#9CA3AF] transition-colors whitespace-nowrap"
        >
          <Search size={13} strokeWidth={1.5} />
          <span className="hidden md:inline">Search or jump...</span>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#FFFFFF] dark:bg-[#191D26] border border-[#E5E7EB] dark:border-white/[0.1] font-mono text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
            <Command size={9} strokeWidth={1.5} />K
          </kbd>
        </button>

        <button
          type="button"
          onClick={onQuickCreatePost}
          className="h-8 px-3 rounded-[7px] bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] text-[12px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus size={14} strokeWidth={1.75} />
          <span className="hidden sm:inline">New Post</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setAlertsOpen(!alertsOpen);
              setProfileMenuOpen(false);
              setTopWsOpen(false);
            }}
            aria-label="Notifications"
            className="relative h-8 w-8 rounded-[7px] border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#13161D] text-[#4B5563] dark:text-[#9CA3AF] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] hover:text-[#111827] dark:hover:text-[#F3F4F6] flex items-center justify-center transition-colors"
          >
            <Bell size={14} strokeWidth={1.5} />
            {unreadSpikes > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[#F97316] text-white text-[9px] font-mono font-semibold flex items-center justify-center tabular-nums">
                {unreadSpikes}
              </span>
            )}
          </button>

          {alertsOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-88 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-[10px] overflow-hidden z-50">
              <div className="px-4 py-2.5 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between bg-[#F8F9FB] dark:bg-[#0E1015]">
                <div>
                  <p className="text-[12px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Notifications
                  </p>
                  <p className="text-[11px] text-[#6B7280]">Trend alerts & approval pings</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSimulateSpikeAlert();
                    setAlertsOpen(false);
                  }}
                  className="text-[11px] font-medium text-[#06B6D4] hover:underline"
                >
                  Scan trends
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
                {wsAlerts.length === 0 ? (
                  <p className="p-4 text-[12px] text-[#6B7280]">
                    No unread notifications for this workspace.
                  </p>
                ) : (
                  wsAlerts.map((al: DiscoveryAlert) => (
                    <div
                      key={al.id}
                      className="p-3.5 hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-mono font-medium text-[#F97316] tabular-nums">
                          {al.keyword} · {al.velocity}
                        </span>
                        <span className="text-[#6B7280]">{al.source}</span>
                      </div>
                      <p className="mt-1 text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6]">
                        {al.title}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateResult('copilot');
                            setAlertsOpen(false);
                          }}
                          className="text-[11px] font-medium text-[#06B6D4] hover:underline"
                        >
                          Generate strategy →
                        </button>
                        {!al.acknowledged && (
                          <button
                            type="button"
                            onClick={() => onAcknowledgeAlert(al.id)}
                            className="text-[11px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
                          >
                            Mark read
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

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label="Toggle theme"
          className="h-8 w-8 rounded-[7px] border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#13161D] text-[#4B5563] dark:text-[#9CA3AF] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] hover:text-[#111827] dark:hover:text-[#F3F4F6] flex items-center justify-center transition-colors"
        >
          {state.darkMode ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
        </button>

        {/* Profile Menu */}
        <div className="relative pl-1.5 border-l border-[#E5E7EB] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setProfileMenuOpen(!profileMenuOpen);
              setAlertsOpen(false);
              setTopWsOpen(false);
            }}
            className="flex items-center gap-2 py-0.5 px-1 rounded-[7px] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
          >
            <ContactAvatar name={userProfile.displayName} src={userProfile.photoURL} size="xs" />
            <span className="hidden lg:inline text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] max-w-[110px] truncate">
              {userProfile.displayName}
            </span>
            <ChevronDown size={12} strokeWidth={1.5} className="text-[#6B7280]" />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-[10px] p-1.5 z-50 text-[12px]">
              <div className="px-2.5 py-2 border-b border-[#E5E7EB] dark:border-white/[0.08]">
                <p className="font-medium text-[#111827] dark:text-[#F3F4F6] truncate">
                  {userProfile.displayName}
                </p>
                <p className="text-[11px] font-mono text-[#6B7280] truncate">{userProfile.email}</p>
              </div>
              <div className="px-2.5 py-2 border-b border-[#E5E7EB] dark:border-white/[0.08]">
                <p className="text-[11px] font-medium text-[#6B7280] mb-1.5">Active role</p>
                <div className="grid grid-cols-2 gap-1">
                  {(['Owner', 'Admin', 'Editor', 'Client Approver'] as TeamRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        onSwitchRole(role);
                        setProfileMenuOpen(false);
                      }}
                      className={`px-2 py-1 rounded-[6px] text-[11px] font-medium text-left transition-colors ${
                        state.activeRole === role
                          ? 'bg-[#111827] text-white dark:bg-[#FFFFFF] dark:text-[#090A0D]'
                          : 'bg-[#F3F4F6] dark:bg-[#191D26] text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
                    setProfileMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-[6px] text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2 text-[#111827] dark:text-[#F3F4F6]"
                >
                  <Settings size={13} strokeWidth={1.5} /> Workspace settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetDemo();
                    setProfileMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-[6px] text-left hover:bg-orange-500/10 flex items-center gap-2 text-[#F97316]"
                >
                  <RotateCcw size={13} strokeWidth={1.5} /> Reset workspace data
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-[6px] text-left hover:bg-rose-500/10 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium"
                >
                  <LogOut size={13} strokeWidth={1.5} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
