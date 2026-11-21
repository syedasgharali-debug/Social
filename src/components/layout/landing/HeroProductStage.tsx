import React, { useState } from 'react';
import {
  Calendar,
  Youtube,
  FileText,
  Inbox,
  TrendingUp,
  Grid3X3,
  Repeat,
  Play,
  Sparkles,
  Check,
  Send,
  ArrowRight,
  Monitor,
  Smartphone,
  Globe,
  Link2,
  DollarSign,
} from 'lucide-react';
import { Platform } from '../../../types';
import { SocialLogo } from '../../common/SocialIcons';
import avatarSarah from '../../../assets/images/avatar_sarah_1794611198086.jpg';
import avatarMarcus from '../../../assets/images/avatar_marcus_1794611199143.jpg';
import avatarElena from '../../../assets/images/avatar_elena_1794611198972.jpg';
import avatarJames from '../../../assets/images/avatar_james_1794611199572.jpg';
import mediaWorkspace from '../../../assets/images/media_workspace_launch_1794611200573.jpg';
import mediaTeamCollab from '../../../assets/images/media_team_collab_1794611200467.jpg';

export type HeroStageTab = 'scheduler' | 'youtube' | 'seo' | 'inbox' | 'crm';

interface HeroProductStageProps {
  activeTab: HeroStageTab;
  onTabChange: (tab: HeroStageTab) => void;
  onLaunch: () => void;
  onToast?: (title: string, description?: string, variant?: 'info' | 'success' | 'warning') => void;
}

const STAGE_TABS: {
  id: HeroStageTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}[] = [
  { id: 'scheduler', label: 'Visual Scheduler & 3×3 Grid', shortLabel: 'Scheduler', icon: Calendar },
  { id: 'youtube', label: 'YouTube Multi-Channel Studio', shortLabel: 'YouTube Studio', icon: Youtube },
  { id: 'seo', label: 'AI Blog & CMS Syndicator', shortLabel: 'AI Blog & SEO', icon: FileText },
  { id: 'inbox', label: 'Unified Social Inbox', shortLabel: 'Social Inbox', icon: Inbox },
  { id: 'crm', label: 'Social CRM Pipeline', shortLabel: 'Social CRM', icon: TrendingUp },
];

const SEO_PRESETS: Record<
  string,
  {
    keyword: string;
    title: string;
    slug: string;
    score: number;
    headings: string[];
    faq: string;
    posts: { platform: Platform; network: string; snippet: string }[];
  }
> = {
  b2b: {
    keyword: 'multi-channel b2b content automation',
    title: 'Multi-Channel B2B Content Automation: The 2026 Operating Blueprint',
    slug: '/blog/multi-channel-b2b-content-automation',
    score: 96,
    headings: [
      'H1: Multi-Channel B2B Content Automation Blueprint',
      'H2: Structuring Evergreen Category Queues Across 10 Networks',
      'H2: Attributing LinkedIn & X Conversations to Closed Pipeline',
      'H3: JSON-LD FAQ Schema & Automated CMS Syndication',
    ],
    faq: 'How does automated social syndication improve organic search indexing?',
    posts: [
      {
        platform: 'linkedin',
        network: 'LinkedIn',
        snippet:
          'We audited 42 B2B teams publishing across 10 networks. The top quartile writes one flagship article, then syndicates 4 tailored hooks automatically.',
      },
      {
        platform: 'x',
        network: 'X Thread',
        snippet:
          '1/ Stop rebuilding your content calendar every Monday. Here is the 4-queue system that turns one SEO post into 12 days of distribution:',
      },
      {
        platform: 'threads',
        network: 'Threads',
        snippet:
          'Publish to WordPress, Webflow, or Shopify once. Auto-queue tailored takeaways for Threads, LinkedIn, and Bluesky in the same step.',
      },
      {
        platform: 'bluesky',
        network: 'Bluesky',
        snippet:
          'New field guide: how lean agencies manage 50+ profiles without spreadsheet drift. Read the full breakdown + schema checklist.',
      },
    ],
  },
  agency: {
    keyword: 'white-label social media reporting for agencies',
    title: 'White-Label Social Media Reporting: Retaining Agency Clients Beyond Month 6',
    slug: '/blog/white-label-social-media-reporting-agencies',
    score: 94,
    headings: [
      'H1: White-Label Social Media Reporting for Scaling Agencies',
      'H2: Replacing Static Screenshots with Revenue-Attributed PDF Briefs',
      'H2: Workspace Isolation & Role-Based Client Approval Gates',
      'H3: Automated Monthly Delivery Benchmarks',
    ],
    faq: 'Can agencies apply custom logos, domains, and brand accents per client workspace?',
    posts: [
      {
        platform: 'linkedin',
        network: 'LinkedIn',
        snippet:
          'Client churn rarely happens because of creative quality. It happens when reporting stops at vanity impressions instead of pipeline value.',
      },
      {
        platform: 'x',
        network: 'X Thread',
        snippet:
          '1/ Every agency operator should export client reports with zero vendor watermarks and direct DM-to-deal revenue attribution.',
      },
      {
        platform: 'threads',
        network: 'Threads',
        snippet:
          'One workspace per client. Separate approvals, custom PDF headers, and zero cross-account posting mistakes.',
      },
      {
        platform: 'bluesky',
        network: 'Bluesky',
        snippet:
          'Published our 2026 Agency Operations Guide covering multi-workspace isolation and automated monthly client reporting.',
      },
    ],
  },
};

export function HeroProductStage({
  activeTab,
  onTabChange,
  onLaunch,
  onToast,
}: HeroProductStageProps) {
  // Tab 1: Scheduler & 3x3 IG Grid
  const [schedMode, setSchedMode] = useState<'queue' | 'grid'>('queue');
  const [queueCards, setQueueCards] = useState([
    {
      id: 'q1',
      day: 'Mon 09:00',
      category: 'Educational',
      color: '#06B6D4',
      title: '10-Network Distribution Matrix',
      platforms: ['linkedin', 'x', 'bluesky'] as Platform[],
    },
    {
      id: 'q2',
      day: 'Tue 14:30',
      category: 'Product Release',
      color: '#10B981',
      title: 'YouTube Shorts Auto-Chapters Walkthrough',
      platforms: ['youtube', 'tiktok', 'instagram'] as Platform[],
    },
    {
      id: 'q3',
      day: 'Wed 11:00',
      category: 'SEO Syndication',
      color: '#F97316',
      title: 'Q4 B2B Benchmark Study Highlights',
      platforms: ['linkedin', 'threads', 'facebook'] as Platform[],
    },
    {
      id: 'q4',
      day: 'Thu 16:00',
      category: 'Customer Proof',
      color: '#64748B',
      title: 'How Northstar Cut Reporting Time by 78%',
      platforms: ['instagram', 'linkedin', 'gbp'] as Platform[],
    },
  ]);
  const [igTiles, setIgTiles] = useState([
    { id: 't1', img: mediaWorkspace, label: '01 · Launch Reel' },
    { id: 't2', img: mediaTeamCollab, label: '02 · Studio BTS' },
    { id: 't3', img: avatarElena, label: '03 · Founder Q&A' },
    { id: 't4', img: avatarSarah, label: '04 · Product Carousel' },
    { id: 't5', img: mediaWorkspace, label: '05 · Case Study' },
    { id: 't6', img: avatarMarcus, label: '06 · RevOps Playbook' },
    { id: 't7', img: mediaTeamCollab, label: '07 · Live Demo' },
    { id: 't8', img: avatarJames, label: '08 · Agency Guide' },
    { id: 't9', img: mediaWorkspace, label: '09 · Weekly Digest' },
  ]);

  // Tab 2: YouTube Multi-Channel Studio
  const [ytChannel, setYtChannel] = useState<'main' | 'shorts'>('main');
  const [ytPreviewMode, setYtPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Tab 3: AI Blog & SEO Syndicator
  const [seoPresetKey, setSeoPresetKey] = useState<'b2b' | 'agency'>('b2b');
  const [seoPublished, setSeoPublished] = useState(false);

  // Tab 4: Unified Inbox
  const [inboxIdx, setInboxIdx] = useState(0);
  const [inboxThreads, setInboxThreads] = useState([
    {
      id: 'in1',
      name: 'Sarah Chen',
      role: 'VP Marketing · TechFlow',
      platform: 'linkedin' as Platform,
      channelLabel: 'LinkedIn DM',
      avatar: avatarSarah,
      messages: [
        {
          sender: 'Sarah Chen',
          text: 'Does Socialify AI isolate client workspaces and support white-label PDF exports for 12 brands?',
          isMe: false,
          time: '09:14',
        },
      ],
      chips: [
        'Yes — each client gets an isolated workspaceId, custom approval workflow, and branded PDF reports.',
        'Happy to spin up a 14-day agency sandbox with 12 workspaces pre-configured today.',
      ],
    },
    {
      id: 'in2',
      name: 'Marcus Wright',
      role: 'Head of RevOps · ScaleGrid',
      platform: 'x' as Platform,
      channelLabel: 'X Mention',
      avatar: avatarMarcus,
      messages: [
        {
          sender: 'Marcus Wright',
          text: 'Testing your unified inbox sync across X, Bluesky, and LinkedIn. Can we attribute DMs directly to deal stages?',
          isMe: false,
          time: '09:22',
        },
      ],
      chips: [
        'Every DM and comment converts to a scored CRM contact linked directly to your 5-stage pipeline.',
        'Confirmed — median inbox sync runs under 120ms with full attribution to Closed Won LTV.',
      ],
    },
    {
      id: 'in3',
      name: 'Elena Rodriguez',
      role: 'Director · PixelPerfect',
      platform: 'instagram' as Platform,
      channelLabel: 'Instagram Comment',
      avatar: avatarElena,
      messages: [
        {
          sender: 'Elena Rodriguez',
          text: 'Love the 3×3 visual grid planner. Can our clients approve Reels before they go live?',
          isMe: false,
          time: '09:31',
        },
      ],
      chips: [
        'Yes — role-based client approvals hold posts in Pending Client Review until signed off.',
        'Clients can approve or request edits from their scoped workspace without seeing internal drafts.',
      ],
    },
  ]);
  const [replyDraft, setReplyDraft] = useState('');

  // Tab 5: Social CRM Pipeline
  const [crmDeals, setCrmDeals] = useState([
    {
      id: 'd1',
      contact: 'Sarah Chen',
      company: 'TechFlow Systems',
      source: 'LinkedIn DM',
      platform: 'linkedin' as Platform,
      value: 4800,
      stage: 'Closed Won' as 'New Lead' | 'Qualified' | 'Proposal Sent' | 'Closed Won',
      score: 96,
    },
    {
      id: 'd2',
      contact: 'Marcus Wright',
      company: 'ScaleGrid Inc',
      source: 'X Thread Reply',
      platform: 'x' as Platform,
      value: 3200,
      stage: 'Proposal Sent' as 'New Lead' | 'Qualified' | 'Proposal Sent' | 'Closed Won',
      score: 88,
    },
    {
      id: 'd3',
      contact: 'Elena Rodriguez',
      company: 'PixelPerfect Studio',
      source: 'Instagram Comment',
      platform: 'instagram' as Platform,
      value: 2400,
      stage: 'Qualified' as 'New Lead' | 'Qualified' | 'Proposal Sent' | 'Closed Won',
      score: 82,
    },
    {
      id: 'd4',
      contact: 'James Wilson',
      company: 'Vanguard Growth',
      source: 'Bluesky Mention',
      platform: 'bluesky' as Platform,
      value: 1950,
      stage: 'New Lead' as 'New Lead' | 'Qualified' | 'Proposal Sent' | 'Closed Won',
      score: 74,
    },
  ]);

  const shiftQueueSlot = (id: string) => {
    const order = ['Mon 09:00', 'Tue 14:30', 'Wed 11:00', 'Thu 16:00', 'Fri 10:30'];
    setQueueCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const idx = order.indexOf(c.day);
        return { ...c, day: order[(idx + 1) % order.length] };
      })
    );
    onToast?.('Slot Rescheduled', 'Queue entry shifted to the next available weekly window.');
  };

  const rotateGridTile = (idx: number) => {
    setIgTiles((prev) => {
      const next = [...prev];
      const swapWith = (idx + 1) % next.length;
      const tmp = next[idx];
      next[idx] = next[swapWith];
      next[swapWith] = tmp;
      return next;
    });
  };

  const handleSendInboxReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyDraft.trim()) return;
    setInboxThreads((prev) =>
      prev.map((t, idx) =>
        idx === inboxIdx
          ? {
              ...t,
              messages: [
                ...t.messages,
                { sender: 'You', text: replyDraft.trim(), isMe: true, time: 'Just now' },
              ],
            }
          : t
      )
    );
    onToast?.('Reply Dispatched', `Delivered to ${inboxThreads[inboxIdx].name} via ${inboxThreads[inboxIdx].channelLabel}.`);
    setReplyDraft('');
  };

  const advanceDealStage = (dealId: string) => {
    const stages: ('New Lead' | 'Qualified' | 'Proposal Sent' | 'Closed Won')[] = [
      'New Lead',
      'Qualified',
      'Proposal Sent',
      'Closed Won',
    ];
    setCrmDeals((prev) =>
      prev.map((d) => {
        if (d.id !== dealId) return d;
        const nextIdx = (stages.indexOf(d.stage) + 1) % stages.length;
        return { ...d, stage: stages[nextIdx] };
      })
    );
  };

  const activeSeo = SEO_PRESETS[seoPresetKey];
  const activeThread = inboxThreads[inboxIdx];
  const closedWonTotal = crmDeals
    .filter((d) => d.stage === 'Closed Won')
    .reduce((acc, d) => acc + d.value, 0);
  const pipelineTotal = crmDeals.reduce((acc, d) => acc + d.value, 0);

  return (
    <div
      id="interactive-sandbox"
      className="mt-12 max-w-6xl mx-auto rounded-xl border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F3F4F6] dark:bg-[#0E1015] p-2 sm:p-3 canvas-dot-grid"
    >
      <div className="rounded-lg border border-[#E5E7EB] dark:border-white/[0.1] bg-[#FFFFFF] dark:bg-[#111319] overflow-hidden">
        {/* Application Window Chrome + 5-Module Switcher */}
        <div className="px-4 py-3 border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D1D5DB] dark:bg-white/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#D1D5DB] dark:bg-white/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#D1D5DB] dark:bg-white/15" />
            <span className="ml-2 text-xs font-mono text-[#6B7280] dark:text-[#9CA3AF] whitespace-nowrap">
              app.socialifyai.com / workspace-live
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Interactive product modules"
            className="flex items-center gap-1 overflow-x-auto pb-0.5 lg:pb-0 custom-scrollbar"
          >
            {STAGE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#111827] text-white dark:bg-[#FFFFFF] dark:text-[#090A0D]'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon size={13} strokeWidth={1.5} />
                  <span className="hidden xl:inline">{tab.label}</span>
                  <span className="xl:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Stage Body */}
        <div className="p-5 sm:p-6 min-h-[390px]">
          {/* TAB 1: VISUAL SCHEDULER & 3x3 INSTAGRAM GRID */}
          {activeTab === 'scheduler' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                    Module 01 · Evergreen Publishing & Visual Grid
                  </p>
                  <h3 className="text-base font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6] mt-0.5">
                    Category Queue Scheduler & 3×3 Instagram Grid Planner
                  </h3>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-md bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setSchedMode('queue')}
                    className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors whitespace-nowrap ${
                      schedMode === 'queue'
                        ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                        : 'text-[#6B7280] dark:text-[#9CA3AF]'
                    }`}
                  >
                    Weekly Queue
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchedMode('grid')}
                    className={`px-3 py-1 rounded-sm text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      schedMode === 'grid'
                        ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                        : 'text-[#6B7280] dark:text-[#9CA3AF]'
                    }`}
                  >
                    <Grid3X3 size={12} strokeWidth={1.5} /> 3×3 Instagram Grid
                  </button>
                </div>
              </div>

              {schedMode === 'queue' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {queueCards.map((card) => (
                    <div
                      key={card.id}
                      className="p-4 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                          <span className="flex items-center gap-1.5 font-medium" style={{ color: card.color }}>
                            <span className="w-1.5 h-1.5 rounded-xs" style={{ backgroundColor: card.color }} />
                            {card.category}
                          </span>
                          <span className="text-[#6B7280] tabular-nums">{card.day}</span>
                        </div>
                        <p className="mt-2.5 text-sm font-semibold text-[#111827] dark:text-[#F3F4F6] leading-snug">
                          {card.title}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5">
                          {card.platforms.map((p) => (
                            <span
                              key={p}
                              className="w-6 h-6 rounded-sm bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-center"
                            >
                              <SocialLogo platform={p} size={13} />
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => shiftQueueSlot(card.id)}
                        className="w-full py-1.5 rounded-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] text-[11px] font-medium text-[#4B5563] dark:text-[#D1D5DB] flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Repeat size={11} strokeWidth={1.5} /> Shift to Next Slot
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-5 grid grid-cols-3 gap-1.5 max-w-xs mx-auto w-full p-2 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                    {igTiles.map((tile, idx) => (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => rotateGridTile(idx)}
                        title="Click to swap position with next tile"
                        className="group relative aspect-square rounded-sm overflow-hidden border border-[#E5E7EB] dark:border-white/[0.08] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]"
                      >
                        <img
                          src={tile.img}
                          alt={tile.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-white truncate">
                          {tile.label}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="lg:col-span-7 space-y-3">
                    <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                      Interactive Feed Harmony · Click any tile to swap order
                    </p>
                    <h4 className="text-lg font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">
                      Preview exact Instagram profile geometry before publishing.
                    </h4>
                    <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                      Verify Reels covers, product carousels, and editorial portraits side-by-side in a 3×3 grid. Reordering tiles automatically updates scheduled timestamps in your calendar queue.
                    </p>
                    <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                      <span>9 Scheduled Tiles</span>
                      <span>·</span>
                      <span>Auto First-Comment Active</span>
                      <span>·</span>
                      <span>Aspect Ratio Verified</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: YOUTUBE MULTI-CHANNEL & SCRIPT STUDIO */}
          {activeTab === 'youtube' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                    Module 02 · Multi-Channel Video Pipeline
                  </p>
                  <div className="flex items-center gap-1 p-0.5 rounded-md bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setYtChannel('main')}
                      className={`px-2.5 py-1 rounded-sm text-[11px] font-medium transition-colors ${
                        ytChannel === 'main'
                          ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                          : 'text-[#6B7280]'
                      }`}
                    >
                      Main Channel
                    </button>
                    <button
                      type="button"
                      onClick={() => setYtChannel('shorts')}
                      className={`px-2.5 py-1 rounded-sm text-[11px] font-medium transition-colors ${
                        ytChannel === 'shorts'
                          ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                          : 'text-[#6B7280]'
                      }`}
                    >
                      Shorts Hub
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      {ytChannel === 'main' ? 'Socialify Tech (Long-Form)' : 'Founder Growth Shorts'}
                    </span>
                    <span className="text-[11px] font-mono text-[#6B7280] tabular-nums">
                      {ytChannel === 'main' ? '48.2k subs · 4/6 quota' : '19.6k subs · 12/20 quota'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08] space-y-2">
                    <p className="text-[11px] font-mono text-[#6B7280]">Generated Hook (00:00–00:18)</p>
                    <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
                      {ytChannel === 'main'
                        ? '“Most agencies pay $495/month across five disconnected social tools. In the next 6 minutes, we consolidate publishing, YouTube, SEO, and CRM into a single workspace.”'
                        : '“Stop letting your best long-form video die after 48 hours. Here is the 3-step Shorts + LinkedIn snippet workflow.”'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08]">
                    <p className="text-[11px] font-mono text-[#6B7280] mb-1.5">Auto-Generated Chapters</p>
                    <div className="space-y-1 text-[11px] font-mono tabular-nums text-[#4B5563] dark:text-[#9CA3AF]">
                      <div className="flex justify-between">
                        <span>00:00 · Tool Consolidation Audit</span>
                        <span className="text-cyan-600 dark:text-cyan-400">Hook</span>
                      </div>
                      <div className="flex justify-between">
                        <span>01:24 · Evergreen Category Queues</span>
                        <span>Body</span>
                      </div>
                      <div className="flex justify-between">
                        <span>03:40 · Auto-Chapters & Cross-Posting</span>
                        <span>Demo</span>
                      </div>
                      <div className="flex justify-between">
                        <span>05:15 · CRM Attribution Walkthrough</span>
                        <span className="text-[#F97316]">CTA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                    Thumbnail & Title Feed Preview
                  </span>
                  <div className="flex items-center gap-1 p-0.5 rounded-md bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setYtPreviewMode('desktop')}
                      className={`px-2.5 py-1 rounded-sm text-[11px] font-medium flex items-center gap-1 ${
                        ytPreviewMode === 'desktop'
                          ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                          : 'text-[#6B7280]'
                      }`}
                    >
                      <Monitor size={11} strokeWidth={1.5} /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setYtPreviewMode('mobile')}
                      className={`px-2.5 py-1 rounded-sm text-[11px] font-medium flex items-center gap-1 ${
                        ytPreviewMode === 'mobile'
                          ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                          : 'text-[#6B7280]'
                      }`}
                    >
                      <Smartphone size={11} strokeWidth={1.5} /> Mobile
                    </button>
                  </div>
                </div>

                <div
                  className={`mx-auto rounded-lg border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] p-4 transition-all ${
                    ytPreviewMode === 'mobile' ? 'max-w-[300px]' : 'w-full'
                  }`}
                >
                  <div className="relative aspect-video rounded-md overflow-hidden border border-[#E5E7EB] dark:border-white/[0.08] bg-[#090A0D]">
                    <img
                      src={ytChannel === 'main' ? mediaWorkspace : mediaTeamCollab}
                      alt="YouTube thumbnail preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-black/45 p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                        {ytChannel === 'main' ? 'A/B Variant B · High Contrast' : 'Shorts 9:16 Cover Crop'}
                      </span>
                      <div>
                        <p className="text-sm sm:text-base font-semibold text-white leading-tight max-w-xs">
                          {ytChannel === 'main'
                            ? 'Replace 5 Marketing Tools With 1 Operating System'
                            : '1 Video → 10 Social Channels in 4 Minutes'}
                        </p>
                      </div>
                    </div>
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-sm bg-black/85 text-white font-mono text-[10px] tabular-nums">
                      {ytChannel === 'main' ? '06:18' : '00:54'}
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="w-10 h-10 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white">
                        <Play size={16} strokeWidth={1.5} />
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                        {ytChannel === 'main'
                          ? 'How B2B Agencies Consolidate Social, YouTube & SEO in 2026'
                          : 'Auto-Sync YouTube Shorts to LinkedIn, X & Reels'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#6B7280] font-mono tabular-nums">
                        {ytChannel === 'main' ? 'Socialify Tech · Playlist: Agency Playbooks' : 'Founder Shorts · Auto-Crosspost Enabled'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI BLOG & CMS AUTO-SYNDICATOR */}
          {activeTab === 'seo' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                    Module 03 · Keyword-to-Article & Syndication
                  </p>
                  <div className="flex items-center gap-1">
                    {(['b2b', 'agency'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setSeoPresetKey(k);
                          setSeoPublished(false);
                        }}
                        className={`px-2.5 py-1 rounded-sm text-[11px] font-medium border transition-colors ${
                          seoPresetKey === k
                            ? 'bg-[#111827] border-[#111827] text-white dark:bg-[#FFFFFF] dark:border-[#FFFFFF] dark:text-[#090A0D]'
                            : 'border-[#E5E7EB] dark:border-white/[0.08] text-[#6B7280]'
                        }`}
                      >
                        {k === 'b2b' ? 'B2B Keyword' : 'Agency Keyword'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[#6B7280]">Target Keyword</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                      SEO Structure {activeSeo.score}/100
                    </span>
                  </div>
                  <p className="text-xs font-mono px-2.5 py-1.5 rounded-sm bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] text-[#111827] dark:text-[#F3F4F6]">
                    {activeSeo.keyword}
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {activeSeo.headings.map((h) => (
                      <p key={h} className="text-[11px] font-mono text-[#4B5563] dark:text-[#D1D5DB] truncate">
                        {h}
                      </p>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-2 text-[11px] text-[#6B7280]">
                    <span className="flex items-center gap-1 truncate">
                      <Globe size={12} strokeWidth={1.5} /> {activeSeo.slug}
                    </span>
                    <span className="flex items-center gap-1 shrink-0 font-mono text-cyan-600 dark:text-cyan-400">
                      <Link2 size={11} strokeWidth={1.5} /> JSON-LD FAQ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSeoPublished(true);
                      onToast?.(
                        'CMS Publish + Syndication Queued',
                        'Article pushed to WordPress/Webflow and 4 social posts scheduled.'
                      );
                    }}
                    className="w-full py-2 rounded-md bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {seoPublished ? (
                      <>
                        <Check size={13} strokeWidth={2} /> Published to CMS & 4 Networks Queued
                      </>
                    ) : (
                      <>
                        Publish to CMS & Auto-Syndicate 4 Posts <ArrowRight size={13} strokeWidth={1.5} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeSeo.posts.map((post) => (
                  <div
                    key={post.network}
                    className="p-3.5 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                        <SocialLogo platform={post.platform} size={14} />
                        {post.network}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                        {seoPublished ? 'Queued' : 'Auto-Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                      {post.snippet}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: UNIFIED SOCIAL INBOX */}
          {activeTab === 'inbox' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-5 space-y-2">
                <p className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 mb-2">
                  Module 04 · Sub-120ms Multi-Network Triage
                </p>
                {inboxThreads.map((t, idx) => {
                  const selected = idx === inboxIdx;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setInboxIdx(idx);
                        setReplyDraft('');
                      }}
                      className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                        selected
                          ? 'border-[#06B6D4] bg-cyan-500/[0.05] dark:bg-cyan-500/[0.08]'
                          : 'border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] hover:border-[#D1D5DB] dark:hover:border-white/[0.15]'
                      }`}
                    >
                      <img
                        src={t.avatar}
                        alt={t.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-md object-cover border border-[#E5E7EB] dark:border-white/[0.08] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6] truncate">
                            {t.name}
                          </p>
                          <span className="flex items-center gap-1 text-[10px] font-mono text-[#6B7280] shrink-0">
                            <SocialLogo platform={t.platform} size={11} /> {t.channelLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate mt-0.5">
                          {t.messages[t.messages.length - 1].text}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="lg:col-span-7 rounded-lg border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] p-4 flex flex-col justify-between min-h-[290px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB] dark:border-white/[0.08]">
                    <div>
                      <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                        {activeThread.name}
                      </p>
                      <p className="text-[11px] text-[#6B7280]">{activeThread.role}</p>
                    </div>
                    <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                      CRM Contact Linked
                    </span>
                  </div>

                  <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                    {activeThread.messages.map((m, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-md text-xs max-w-md ${
                          m.isMe
                            ? 'ml-auto bg-[#111827] text-white dark:bg-[#FFFFFF] dark:text-[#090A0D]'
                            : 'bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] text-[#111827] dark:text-[#F3F4F6]'
                        }`}
                      >
                        <p>{m.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] space-y-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {activeThread.chips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReplyDraft(chip)}
                        className="px-2.5 py-1 rounded-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] text-[11px] text-[#4B5563] dark:text-[#D1D5DB] text-left flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles size={11} strokeWidth={1.5} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span className="truncate max-w-[260px]">AI Smart Reply {idx + 1}</span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSendInboxReply} className="flex gap-2">
                    <input
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder="Click an AI Smart Reply chip above or type a response..."
                      className="flex-1 px-3 py-2 rounded-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] text-xs text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-md bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      <Send size={12} strokeWidth={1.5} /> Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SOCIAL CRM REVENUE PIPELINE */}
          {activeTab === 'crm' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                    Module 05 · Attribution from DM to Closed Revenue
                  </p>
                  <h3 className="text-base font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6] mt-0.5">
                    Click any deal card to advance pipeline stage & recalculate LTV
                  </h3>
                </div>
                <div className="flex items-center gap-5 font-mono text-xs tabular-nums">
                  <div>
                    <span className="text-[#6B7280] block text-[10px]">ACTIVE PIPELINE</span>
                    <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      ${pipelineTotal.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[10px]">CLOSED WON LTV</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ${closedWonTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(['New Lead', 'Qualified', 'Proposal Sent', 'Closed Won'] as const).map((stage) => {
                  const stageDeals = crmDeals.filter((d) => d.stage === stage);
                  const stageVal = stageDeals.reduce((sum, d) => sum + d.value, 0);
                  return (
                    <div
                      key={stage}
                      className="p-3 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-2.5 min-h-[210px]"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-white/[0.08]">
                        <span
                          className={`text-[11px] font-semibold ${
                            stage === 'Closed Won'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-[#111827] dark:text-[#F3F4F6]'
                          }`}
                        >
                          {stage}
                        </span>
                        <span className="text-[11px] font-mono text-[#6B7280] tabular-nums">
                          ${stageVal.toLocaleString()}
                        </span>
                      </div>

                      {stageDeals.map((deal) => (
                        <button
                          key={deal.id}
                          type="button"
                          onClick={() => advanceDealStage(deal.id)}
                          className="w-full p-3 rounded-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] text-left transition-colors space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6] truncate">
                              {deal.contact}
                            </span>
                            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums flex items-center">
                              <DollarSign size={11} strokeWidth={1.75} />
                              {deal.value.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6B7280] truncate">{deal.company}</p>
                          <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-[#6B7280] tabular-nums">
                            <span className="flex items-center gap-1">
                              <SocialLogo platform={deal.platform} size={11} /> {deal.source}
                            </span>
                            <span className="text-cyan-600 dark:text-cyan-400">Score {deal.score}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Window Footer Action Strip */}
        <div className="px-5 py-3 border-t border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-[#6B7280] dark:text-[#9CA3AF]">
            Interactive preview running live workspace state · Zero external embeds
          </span>
          <button
            type="button"
            onClick={onLaunch}
            className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium inline-flex items-center gap-1 whitespace-nowrap"
          >
            Open Full Production Workspace <ArrowRight size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
