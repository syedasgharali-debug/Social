import React, { useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  Inbox,
  ShieldCheck,
  PenSquare,
  Users,
  ArrowRight,
  Repeat,
} from 'lucide-react';
import { AppState } from '../../types';
import { NavTabId } from '../layout/Shell';
import { PlatformTag } from '../common/PlatformMeta';

interface WorkspaceOverviewProps {
  state: AppState;
  onNavigate: (tab: NavTabId) => void;
}

export function WorkspaceOverview({ state, onNavigate }: WorkspaceOverviewProps) {
  const wsId = state.activeWorkspaceId;
  const activeWs = state.workspaces.find((w) => w.id === wsId) || state.workspaces[0];

  const metrics = useMemo(() => {
    const profiles = state.connectedProfiles.filter((p) => p.workspaceId === wsId && p.status === 'connected');
    const totalFollowers = profiles.reduce((s, p) => s + p.followers, 0);
    const posts = state.posts.filter((p) => p.workspaceId === wsId);
    const scheduledCount = posts.filter((p) => p.status === 'scheduled' || p.status === 'approved').length;
    const pendingApprovals = posts.filter((p) => p.status === 'pending_approval').length;
    const unreadThreads = state.threads.filter((t) => t.workspaceId === wsId && t.unreadCount > 0).length;
    const categories = state.categories.filter((c) => c.workspaceId === wsId);
    const upcomingPosts = posts
      .filter((p) => p.status !== 'published')
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .slice(0, 4);

    return {
      totalFollowers,
      connectedCount: profiles.length,
      scheduledCount,
      pendingApprovals,
      unreadThreads,
      categories,
      upcomingPosts,
    };
  }, [state, wsId]);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#4F46E5] dark:text-indigo-400">
            WORKSPACE COMMAND CENTER · {activeWs.handle}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {activeWs.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{activeWs.industry}</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onNavigate('copilot')}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-lg text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-1.5"
          >
            <Sparkles size={14} className="text-amber-500" /> AI Strategy Wizard
          </button>
          <button
            onClick={() => onNavigate('studio')}
            className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <PenSquare size={14} /> Open Content Studio
          </button>
        </div>
      </div>

      {/* Executive KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Combined Audience',
            value: metrics.totalFollowers.toLocaleString(),
            sub: `${metrics.connectedCount} active social profiles`,
            icon: Users,
            tab: 'profiles' as NavTabId,
          },
          {
            label: 'Scheduled Queue',
            value: String(metrics.scheduledCount),
            sub: `${metrics.categories.length} category buckets active`,
            icon: Calendar,
            tab: 'scheduler' as NavTabId,
          },
          {
            label: 'Pending Approvals',
            value: String(metrics.pendingApprovals),
            sub: 'Awaiting client or manager sign-off',
            icon: ShieldCheck,
            tab: 'approvals' as NavTabId,
          },
          {
            label: 'Unread Inbox Threads',
            value: String(metrics.unreadThreads),
            sub: 'DMs, comments & mentions',
            icon: Inbox,
            tab: 'inbox' as NavTabId,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => onNavigate(card.tab)}
              className="text-left bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 hover:border-[#4F46E5] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <Icon size={16} className="text-[#4F46E5] dark:text-indigo-400" />
              </div>
              <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {card.value}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">{card.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Upcoming Queue + Content Categories Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Next Upcoming Scheduled Posts
            </h2>
            <button
              onClick={() => onNavigate('scheduler')}
              className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Open Visual Scheduler <ArrowRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {metrics.upcomingPosts.length === 0 ? (
              <p className="p-5 text-xs text-slate-500">No upcoming posts yet—launch AI Copilot to generate 7 days in seconds.</p>
            ) : (
              metrics.upcomingPosts.map((post) => (
                <div key={post.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {post.platforms.slice(0, 3).map((pl) => (
                        <PlatformTag key={pl} platform={pl} showFull={false} />
                      ))}
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">
                        · {post.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2">{post.content}</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0 tabular-nums">
                    {new Date(post.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Active Content Categories
            </h2>
            <button
              onClick={() => onNavigate('categories')}
              className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline"
            >
              Manage →
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {metrics.categories.map((cat) => (
              <div key={cat.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{cat.name}</p>
                    <p className="text-[11px] text-slate-500 tabular-nums">{cat.postsPerWeek} weekly slots</p>
                  </div>
                </div>
                {cat.evergreenEnabled && (
                  <span className="text-[11px] font-semibold text-[#4F46E5] dark:text-indigo-400 flex items-center gap-1 shrink-0">
                    <Repeat size={12} /> Evergreen
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
