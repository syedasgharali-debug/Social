import React, { useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  PenSquare,
  ArrowRight,
  Repeat,
  Radar,
  Repeat2,
  Flame,
  TrendingUp,
  Link2,
  Calculator,
  Rocket,
  Layers,
} from 'lucide-react';
import { AppState } from '../../types';
import { NavTabId } from '../layout/Shell';
import { PlatformTag } from '../common/PlatformMeta';
import { GrowthToolTab } from '../tools/GrowthToolsSuite';
import { KpiMetricCard, StatusBadge, EmptyStatePanel } from '../common/DesignPrimitives';

interface WorkspaceOverviewProps {
  state: AppState;
  onNavigate: (tab: NavTabId) => void;
  onOpenGrowthTool?: (tool: GrowthToolTab) => void;
}

export function WorkspaceOverview({ state, onNavigate, onOpenGrowthTool }: WorkspaceOverviewProps) {
  const wsId = state.activeWorkspaceId;
  const activeWs = state.workspaces.find((w) => w.id === wsId) || state.workspaces[0];

  const metrics = useMemo(() => {
    const profiles = state.connectedProfiles.filter(
      (p) => p.workspaceId === wsId && p.status === 'connected'
    );
    const totalFollowers = profiles.reduce((s, p) => s + p.followers, 0);
    const posts = state.posts.filter((p) => p.workspaceId === wsId);
    const scheduledCount = posts.filter(
      (p) => p.status === 'scheduled' || p.status === 'approved'
    ).length;
    const pendingApprovals = posts.filter((p) => p.status === 'pending_approval').length;
    const unreadThreads = state.threads.filter(
      (t) => t.workspaceId === wsId && t.unreadCount > 0
    ).length;
    const categories = state.categories.filter((c) => c.workspaceId === wsId);
    const upcomingPosts = posts
      .filter((p) => p.status !== 'published')
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .slice(0, 5);

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
    <div className="h-full overflow-y-auto p-5 lg:p-6 space-y-5 custom-scrollbar bg-[#F8F9FB] dark:bg-[#090A0D]">
      {/* Compact Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
            <span className="font-mono">{activeWs.handle}</span>
            <span aria-hidden="true">·</span>
            <span>{activeWs.industry}</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] truncate">
            {activeWs.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => (onOpenGrowthTool ? onOpenGrowthTool('competitor') : onNavigate('tools'))}
            className="h-8 px-3 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Rocket size={13} strokeWidth={1.5} className="text-[#6B7280]" /> Growth Tools
          </button>
          <button
            type="button"
            onClick={() => onNavigate('copilot')}
            className="h-8 px-3 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Sparkles size={13} strokeWidth={1.5} className="text-[#06B6D4]" /> AI Strategy
          </button>
          <button
            type="button"
            onClick={() => onNavigate('studio')}
            className="h-8 px-3.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <PenSquare size={13} strokeWidth={1.5} /> Open Content Studio
          </button>
        </div>
      </div>

      {/* 4-Card KPI Strip (12px radius, tabular-nums, zero rainbow icon boxes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiMetricCard
          label="Combined Audience"
          value={metrics.totalFollowers.toLocaleString()}
          sub={`${metrics.connectedCount} active connected profiles`}
          onClick={() => onNavigate('profiles')}
        />
        <KpiMetricCard
          label="Scheduled Queue"
          value={metrics.scheduledCount}
          sub={`${metrics.categories.length} rotating category buckets`}
          onClick={() => onNavigate('scheduler')}
        />
        <KpiMetricCard
          label="Pending Approvals"
          value={metrics.pendingApprovals}
          sub="Awaiting client or manager sign-off"
          alert={metrics.pendingApprovals > 0}
          onClick={() => onNavigate('approvals')}
        />
        <KpiMetricCard
          label="Unread Inbox Threads"
          value={metrics.unreadThreads}
          sub="Direct messages, comments & mentions"
          onClick={() => onNavigate('inbox')}
        />
      </div>

      {/* Upcoming Queue Table + Evergreen Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
              Upcoming Scheduled Posts
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('scheduler')}
              className="text-[12px] font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] flex items-center gap-1 transition-colors"
            >
              Visual Scheduler <ArrowRight size={12} strokeWidth={1.5} />
            </button>
          </div>
          {metrics.upcomingPosts.length === 0 ? (
            <EmptyStatePanel
              icon={Calendar}
              title="No posts scheduled yet"
              description="Compose your first post in Content Studio or build a 7-day publishing plan with AI Strategy."
              actionLabel="Schedule first post"
              onAction={() => onNavigate('studio')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015]">
                    <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                      Channels & Copy
                    </th>
                    <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                      Scheduled
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
                  {metrics.upcomingPosts.map((post) => (
                    <tr
                      key={post.id}
                      onClick={() => onNavigate('scheduler')}
                      className="h-[48px] hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 max-w-md">
                        <div className="flex items-center gap-2 mb-0.5">
                          {post.platforms.slice(0, 3).map((pl) => (
                            <PlatformTag key={pl} platform={pl} showFull={false} />
                          ))}
                        </div>
                        <p className="text-[12px] text-[#111827] dark:text-[#F3F4F6] truncate">
                          {post.content}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          tone={
                            post.status === 'approved' || post.status === 'scheduled'
                              ? 'emerald'
                              : post.status === 'pending_approval'
                                ? 'orange'
                                : 'neutral'
                          }
                        >
                          {post.status.replace('_', ' ')}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-[#6B7280] tabular-nums whitespace-nowrap">
                        {new Date(post.scheduledAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
              Content Categories
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('categories')}
              className="text-[12px] font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors"
            >
              Manage →
            </button>
          </div>
          {metrics.categories.length === 0 ? (
            <EmptyStatePanel
              icon={Layers}
              title="No category queues yet"
              description="Organize evergreen posts into rotating weekly publishing buckets."
              actionLabel="Create category"
              onAction={() => onNavigate('categories')}
            />
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
              {metrics.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="h-[48px] px-4 flex items-center justify-between gap-3 hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] truncate">
                        {cat.name}
                      </p>
                      <p className="text-[11px] font-mono text-[#6B7280] tabular-nums">
                        {cat.postsPerWeek} weekly slots
                      </p>
                    </div>
                  </div>
                  {cat.evergreenEnabled && (
                    <StatusBadge tone="cyan">
                      <Repeat size={10} strokeWidth={1.5} className="mr-1" /> Evergreen
                    </StatusBadge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Growth Toolkit Quick Launch Grid */}
      <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
              Competitive Growth Suite
            </h2>
            <p className="text-[12px] text-[#6B7280]">
              Research, URL repurposing, hook auditing, UTM/QR attribution, and ROAS modeling.
            </p>
          </div>
          <button
            type="button"
            onClick={() => (onOpenGrowthTool ? onOpenGrowthTool('competitor') : onNavigate('tools'))}
            className="text-[12px] font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] flex items-center gap-1 whitespace-nowrap transition-colors"
          >
            Open suite <ArrowRight size={12} strokeWidth={1.5} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E7EB] dark:divide-white/[0.08]">
          {[
            {
              id: 'competitor' as GrowthToolTab,
              title: 'Competitor Spy & Gap Analyzer',
              desc: 'Scrape rival websites and search results to uncover counter-positioning angles.',
              icon: Radar,
            },
            {
              id: 'repurposer' as GrowthToolTab,
              title: 'URL to 5-Channel Repurposer',
              desc: 'Convert any live article into LinkedIn, X Thread, Instagram Carousel & TikTok.',
              icon: Repeat2,
            },
            {
              id: 'hooks' as GrowthToolTab,
              title: 'Viral Hook Lab & Copy Grader',
              desc: 'Score draft captions and test 5 A/B hook frameworks prior to publishing.',
              icon: Flame,
            },
            {
              id: 'trends' as GrowthToolTab,
              title: 'Live Trend & Newsjack Radar',
              desc: 'Track real-time niche developments with cited links and ready-to-publish posts.',
              icon: TrendingUp,
            },
            {
              id: 'utm' as GrowthToolTab,
              title: 'UTM Link Builder & QR Studio',
              desc: 'Generate standardized UTM links, export CSV libraries, and download QR codes.',
              icon: Link2,
            },
            {
              id: 'roi' as GrowthToolTab,
              title: 'Paid ROAS & Creator Rate Calc',
              desc: 'Model break-even CPA, engagement health, and creator sponsorship flat fees.',
              icon: Calculator,
            },
          ].map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => (onOpenGrowthTool ? onOpenGrowthTool(tool.id) : onNavigate('tools'))}
                className="group p-4 text-left hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] transition-colors border-b border-[#E5E7EB] dark:border-white/[0.08]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-2">
                    <Icon
                      size={14}
                      strokeWidth={1.5}
                      className="text-[#6B7280] group-hover:text-[#06B6D4] transition-colors shrink-0"
                    />
                    {tool.title}
                  </span>
                  <ArrowRight
                    size={13}
                    strokeWidth={1.5}
                    className="text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  />
                </div>
                <p className="mt-1.5 text-[12px] text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
                  {tool.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
