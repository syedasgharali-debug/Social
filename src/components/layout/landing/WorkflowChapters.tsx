import React, { useState } from 'react';
import {
  Check,
  Smartphone,
  Monitor,
  Sparkles,
  Youtube,
  Globe,
  Rss,
  Gift,
  ShieldCheck,
  Inbox,
  TrendingUp,
  ArrowRight,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { Platform } from '../../../types';
import { SocialLogo } from '../../common/SocialIcons';
import mediaWorkspace from '../../../assets/images/media_workspace_launch_1794611200573.jpg';
import mediaTeamCollab from '../../../assets/images/media_team_collab_1794611200467.jpg';
import avatarSarah from '../../../assets/images/avatar_sarah_1794611198086.jpg';

interface WorkflowChaptersProps {
  onLaunch: () => void;
  onToast?: (title: string, description?: string, variant?: 'info' | 'success' | 'warning') => void;
}

const NETWORK_TAILORING: Record<
  'instagram' | 'linkedin' | 'x' | 'tiktok',
  { name: string; format: string; limit: string; copy: string }
> = {
  instagram: {
    name: 'Instagram',
    format: 'Carousel · 1080×1350',
    limit: '184 / 2,200 chars',
    copy: 'Slide 1: Replace five fragmented marketing tools with one operating system.\nSlide 2: Connect 10 social networks + YouTube + CMS in under 4 minutes.',
  },
  linkedin: {
    name: 'LinkedIn',
    format: 'Long-Form Document',
    limit: '312 / 3,000 chars',
    copy: 'Marketing teams lose 8+ hours weekly copying captions across schedulers, spreadsheets, and CRM notes.\n\nWe unified publishing, YouTube multi-channel automation, SEO blogging, and DM pipeline attribution inside one isolated workspace.',
  },
  x: {
    name: 'X Thread',
    format: '3-Part Thread',
    limit: '198 / 280 chars',
    copy: '1/ Every DM and comment is a warm pipeline signal.\n\nWhen your scheduler and Social CRM share the same database, zero high-intent leads slip through.',
  },
  tiktok: {
    name: 'TikTok / Shorts',
    format: '9:16 Vertical Script',
    limit: '142 / 2,200 chars',
    copy: 'Hook (0–3s): Stop paying $495/month for five separate creator tools. Here is the 10-network workspace that replaces all of them.',
  },
};

export function WorkflowChapters({ onLaunch, onToast }: WorkflowChaptersProps) {
  // Chapter 01 state
  const [studioNet, setStudioNet] = useState<'instagram' | 'linkedin' | 'x' | 'tiktok'>('linkedin');
  const [deviceView, setDeviceView] = useState<'mobile' | 'desktop'>('mobile');
  const [wizardOpen, setWizardOpen] = useState(false);

  // Chapter 02 state
  const [cmsTarget, setCmsTarget] = useState<'WordPress' | 'Webflow' | 'Shopify'>('Webflow');
  const [ytPlaylistAuto, setYtPlaylistAuto] = useState(true);
  const [cmsSynced, setCmsSynced] = useState(false);

  // Chapter 03 state
  const [rssAutoDraft, setRssAutoDraft] = useState(true);
  const [contestEntries, setContestEntries] = useState(1);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [drawHash, setDrawHash] = useState<string | null>(null);

  // Chapter 04 state
  const [crmStageIdx, setCrmStageIdx] = useState(2);
  const crmStages = ['New Lead', 'Qualified', 'Proposal Sent', 'Closed Won'];

  const handleContestAction = (id: string, pts: number) => {
    if (completedActions.includes(id)) return;
    setCompletedActions((prev) => [...prev, id]);
    setContestEntries((prev) => prev + pts);
  };

  const handleVerifyDraw = () => {
    const hash = 'sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    setDrawHash(hash);
    onToast?.('Cryptographic Audit Verified', 'Winner seed logged with immutable SHA-256 checksum.');
  };

  return (
    <section id="workflows" className="py-20 border-b border-[#E5E7EB] dark:border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-6 space-y-24">
        <div className="max-w-2xl">
          <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
            End-to-End Platform Architecture
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#111827] dark:text-[#F3F4F6] text-balance">
            Four tightly coupled engines. Zero context switching.
          </h2>
          <p className="mt-3 text-sm sm:text-[15px] text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
            Every workflow shares one brand voice, one workspace permission model, and one attribution ledger.
          </p>
        </div>

        {/* CHAPTER 01 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-5">
            <p className="text-xs font-mono text-[#6B7280] dark:text-[#9CA3AF]">
              Chapter 01 · Content Studio & Visual Grid
            </p>
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#111827] dark:text-[#F3F4F6]">
              Compose once, tailor natively for every network.
            </h3>
            <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
              Draft in a single master composer with automatic character guards, per-channel formatting, real device frames, and a visual 3×3 Instagram aesthetic grid.
            </p>
            <ul className="space-y-2.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
              {[
                'Per-network copy overrides for Instagram, LinkedIn, X Threads, and TikTok/Shorts',
                'Live mobile & desktop frame switcher before scheduling',
                'Draggable 3×3 Instagram Grid aesthetic planner synced to calendar slots',
                '7-day AI Strategy Wizard that maps pillars directly into Evergreen Queues',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check size={14} strokeWidth={1.75} className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onLaunch}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111827] dark:text-[#F3F4F6] hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              Open Content Studio <ArrowRight size={13} strokeWidth={1.5} />
            </button>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#111319] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['linkedin', 'instagram', 'x', 'tiktok'] as const).map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setStudioNet(net)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                      studioNet === net
                        ? 'bg-[#111827] border-[#111827] text-white dark:bg-[#FFFFFF] dark:border-[#FFFFFF] dark:text-[#090A0D]'
                        : 'bg-[#F8F9FB] dark:bg-[#0E1015] border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#9CA3AF]'
                    }`}
                  >
                    <SocialLogo platform={net as Platform} size={13} />
                    {NETWORK_TAILORING[net].name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-0.5 rounded-md bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setDeviceView('mobile')}
                  aria-label="Mobile preview"
                  className={`p-1.5 rounded-sm ${
                    deviceView === 'mobile'
                      ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                      : 'text-[#6B7280]'
                  }`}
                >
                  <Smartphone size={13} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceView('desktop')}
                  aria-label="Desktop preview"
                  className={`p-1.5 rounded-sm ${
                    deviceView === 'desktop'
                      ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                      : 'text-[#6B7280]'
                  }`}
                >
                  <Monitor size={13} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div
                className={`${
                  deviceView === 'mobile' ? 'md:col-span-6' : 'md:col-span-8'
                } rounded-lg border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] p-4 space-y-3`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-[#6B7280] tabular-nums">
                  <span>{NETWORK_TAILORING[studioNet].format}</span>
                  <span className="text-cyan-600 dark:text-cyan-400">{NETWORK_TAILORING[studioNet].limit}</span>
                </div>
                <p className="text-xs text-[#111827] dark:text-[#F3F4F6] whitespace-pre-line leading-relaxed">
                  {NETWORK_TAILORING[studioNet].copy}
                </p>
                <div className="aspect-[16/9] rounded-md overflow-hidden border border-[#E5E7EB] dark:border-white/[0.08]">
                  <img
                    src={studioNet === 'instagram' ? mediaTeamCollab : mediaWorkspace}
                    alt="Tailored post preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div
                className={`${
                  deviceView === 'mobile' ? 'md:col-span-6' : 'md:col-span-4'
                } space-y-3`}
              >
                <div className="p-3.5 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      7-Day AI Strategy Wizard
                    </span>
                    <button
                      type="button"
                      onClick={() => setWizardOpen((v) => !v)}
                      className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      {wizardOpen ? 'Hide Plan' : 'Preview 7 Days'}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6B7280] leading-relaxed">
                    Generates balanced Educational, Proof, and Product slots with optimal send windows.
                  </p>
                  {wizardOpen && (
                    <div className="pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08] space-y-1 text-[11px] font-mono tabular-nums text-[#4B5563] dark:text-[#D1D5DB]">
                      <div className="flex justify-between"><span>Mon 09:00</span><span>Authority Thread</span></div>
                      <div className="flex justify-between"><span>Wed 11:30</span><span>Customer ROI Reel</span></div>
                      <div className="flex justify-between"><span>Fri 14:00</span><span>Product Tear-Down</span></div>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] text-[11px] font-mono text-[#6B7280] space-y-1.5 tabular-nums">
                  <div className="flex justify-between">
                    <span>First Comment</span>
                    <span className="text-emerald-600 dark:text-emerald-400">Scheduled +2m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UTM Tagging</span>
                    <span className="text-[#111827] dark:text-[#F3F4F6]">Auto-Applied</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CHAPTER 02 (Alternating) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1 rounded-xl border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#111319] p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* YouTube Multi-Channel Quota Panel */}
              <div className="p-4 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    <Youtube size={14} strokeWidth={1.5} className="text-[#F97316]" /> Multi-Channel Quota
                  </span>
                  <span className="text-[10px] font-mono text-[#6B7280] tabular-nums">3 Channels Active</span>
                </div>
                <div className="space-y-2.5 text-[11px] font-mono tabular-nums">
                  {[
                    { name: 'Main Product Channel', pct: 68, quota: '4/6 uploads' },
                    { name: 'Founder Shorts Hub', pct: 85, quota: '17/20 shorts' },
                    { name: 'Agency Tutorials', pct: 40, quota: '2/5 uploads' },
                  ].map((ch) => (
                    <div key={ch.name} className="space-y-1">
                      <div className="flex justify-between text-[#4B5563] dark:text-[#D1D5DB]">
                        <span className="truncate">{ch.name}</span>
                        <span>{ch.quota}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#E5E7EB] dark:bg-white/[0.08] overflow-hidden">
                        <div className="h-full bg-[#06B6D4]" style={{ width: `${ch.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setYtPlaylistAuto((v) => !v)}
                  className="w-full py-1.5 px-2.5 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#13161D] flex items-center justify-between text-[11px] text-[#4B5563] dark:text-[#D1D5DB]"
                >
                  <span>Auto-add to Evergreen Playlist</span>
                  <span className={ytPlaylistAuto ? 'font-mono text-emerald-600 dark:text-emerald-400' : 'font-mono text-[#6B7280]'}>
                    {ytPlaylistAuto ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* AI SEO CMS Publisher Panel */}
              <div className="p-4 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    <Globe size={14} strokeWidth={1.5} className="text-cyan-600 dark:text-cyan-400" /> AI SEO CMS Engine
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">JSON-LD Ready</span>
                </div>

                <div className="flex items-center gap-1">
                  {(['WordPress', 'Webflow', 'Shopify'] as const).map((cms) => (
                    <button
                      key={cms}
                      type="button"
                      onClick={() => {
                        setCmsTarget(cms);
                        setCmsSynced(false);
                      }}
                      className={`flex-1 py-1 rounded-sm text-[11px] font-medium border transition-colors ${
                        cmsTarget === cms
                          ? 'bg-[#111827] border-[#111827] text-white dark:bg-[#FFFFFF] dark:border-[#FFFFFF] dark:text-[#090A0D]'
                          : 'bg-[#FFFFFF] dark:bg-[#13161D] border-[#E5E7EB] dark:border-white/[0.08] text-[#6B7280]'
                      }`}
                    >
                      {cms}
                    </button>
                  ))}
                </div>

                <div className="p-2.5 rounded-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] text-[11px] space-y-1 font-mono text-[#4B5563] dark:text-[#9CA3AF]">
                  <p className="text-[#111827] dark:text-[#F3F4F6] font-semibold">H1 · 2026 Agency Stack Audit</p>
                  <p>Internal Links: 6 verified</p>
                  <p>FAQ Schema: 4 structured pairs</p>
                  <p>Social Queue: 4 posts linked</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCmsSynced(true);
                    onToast?.(`Published to ${cmsTarget}`, 'Article live with JSON-LD schema and social syndication queued.');
                  }}
                  className="w-full py-1.5 rounded-md bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] text-xs font-semibold transition-colors"
                >
                  {cmsSynced ? `Synced to ${cmsTarget}` : `1-Click Publish to ${cmsTarget}`}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2 space-y-5">
            <p className="text-xs font-mono text-[#6B7280] dark:text-[#9CA3AF]">
              Chapter 02 · YouTube Multi-Channel & AI SEO CMS
            </p>
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#111827] dark:text-[#F3F4F6]">
              Scale long-form video and search authority from one desk.
            </h3>
            <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
              Manage multiple YouTube channels with daily quota tracking, automated scripts and chapters, alongside a full Keyword-to-Article SEO engine connected straight to your CMS.
            </p>
            <ul className="space-y-2.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
              {[
                'Multi-channel YouTube switching for long-form uploads and Shorts',
                'One-click SEO titles, timestamps, tags, and pinned first comments',
                'Structured H1–H3 blog generation with JSON-LD FAQ schema and internal links',
                'Direct 1-click publishing to WordPress, Webflow, and Shopify with auto-syndication',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check size={14} strokeWidth={1.75} className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CHAPTER 03 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-5">
            <p className="text-xs font-mono text-[#6B7280] dark:text-[#9CA3AF]">
              Chapter 03 · Viral Discovery, RSS & Contests
            </p>
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#111827] dark:text-[#F3F4F6]">
              Curate breakout topics and run verifiable viral giveaways.
            </h3>
            <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
              Turn industry RSS feeds into scheduled commentary automatically, and drive exponential list growth with referral multiplier contests backed by cryptographic draw audits.
            </p>
            <ul className="space-y-2.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
              {[
                'Live RSS & topic feeds with automated AI spin-and-draft routing',
                'Multi-action viral giveaway widgets with referral bonus multipliers',
                'Automated duplicate IP & disposable email fraud filtering',
                'Verifiable SHA-256 winner selection audit logs for compliance',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check size={14} strokeWidth={1.75} className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#111319] p-5 space-y-4">
            {/* RSS Rule Bar */}
            <div className="p-3.5 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Rss size={15} strokeWidth={1.5} className="text-[#F97316]" />
                <div>
                  <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    RSS Auto-Draft Rule · Tech & SaaS Feeds
                  </p>
                  <p className="text-[11px] text-[#6B7280] font-mono">
                    4 feeds monitored · Auto-summarize into LinkedIn & X drafts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRssAutoDraft((v) => !v)}
                className={`px-3 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                  rssAutoDraft
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-[#E5E7EB] dark:border-white/[0.08] text-[#6B7280]'
                }`}
              >
                {rssAutoDraft ? 'Auto-Draft Active' : 'Paused'}
              </button>
            </div>

            {/* Playable Viral Giveaway & Referral Widget */}
            <div className="p-4 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gift size={15} strokeWidth={1.5} className="text-cyan-600 dark:text-cyan-400" />
                  <span className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Playable Giveaway Widget · Annual Creator Kit
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">
                  Your Entries: {contestEntries}×
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'follow', label: 'Follow on X & LinkedIn', pts: 3 },
                  { id: 'share', label: 'Share Referral Link', pts: 5 },
                  { id: 'yt', label: 'Subscribe on YouTube', pts: 10 },
                ].map((act) => {
                  const done = completedActions.includes(act.id);
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => handleContestAction(act.id, act.pts)}
                      className={`p-3 rounded-md border text-left transition-colors ${
                        done
                          ? 'border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-400'
                          : 'border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#13161D] hover:border-[#06B6D4] text-[#111827] dark:text-[#F3F4F6]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                        <span>+{act.pts} Entries</span>
                        {done ? <Check size={12} strokeWidth={2} /> : <Sparkles size={11} strokeWidth={1.5} />}
                      </div>
                      <p className="mt-1 text-xs font-medium">{act.label}</p>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2.5 border-t border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 text-[#6B7280] font-mono">
                  <ShieldCheck size={13} strokeWidth={1.5} className="text-emerald-600 dark:text-emerald-400" />
                  Fraud Filter: 99.4% clean · 14 bots blocked
                </span>
                <button
                  type="button"
                  onClick={handleVerifyDraw}
                  className="px-3 py-1.5 rounded-md bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] font-mono text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={11} strokeWidth={1.5} /> Verify SHA-256 Draw
                </button>
              </div>

              {drawHash && (
                <div className="p-2.5 rounded-md bg-[#FFFFFF] dark:bg-[#13161D] border border-cyan-500/30 flex items-center justify-between gap-2 text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                  <span className="truncate">{drawHash}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(drawHash);
                      onToast?.('Audit Hash Copied', 'SHA-256 winner verification checksum copied.');
                    }}
                    className="shrink-0 hover:underline flex items-center gap-1"
                  >
                    <Copy size={11} strokeWidth={1.5} /> Copy
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CHAPTER 04 (Alternating) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1 rounded-xl border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#111319] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <img
                  src={avatarSarah}
                  alt="Sarah Chen"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-md object-cover border border-[#E5E7EB] dark:border-white/[0.08]"
                />
                <div>
                  <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Sarah Chen · TechFlow Systems
                  </p>
                  <p className="text-[11px] font-mono text-[#6B7280]">
                    Origin: LinkedIn Comment → Scored Contact (94/100)
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                $4,800 LTV
              </span>
            </div>

            {/* Interactive 4-Step Pipeline Flow */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {crmStages.map((stage, idx) => {
                const isReached = idx <= crmStageIdx;
                const isCurrent = idx === crmStageIdx;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setCrmStageIdx(idx)}
                    className={`p-3 rounded-md border text-left transition-colors ${
                      isCurrent
                        ? 'border-[#06B6D4] bg-cyan-500/[0.07] text-[#111827] dark:text-[#F3F4F6]'
                        : isReached
                        ? 'border-emerald-500/30 bg-emerald-500/[0.05] text-[#111827] dark:text-[#F3F4F6]'
                        : 'border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] text-[#6B7280]'
                    }`}
                  >
                    <p className="text-[10px] font-mono tabular-nums">0{idx + 1}</p>
                    <p className="text-xs font-semibold mt-0.5">{stage}</p>
                  </button>
                );
              })}
            </div>

            {/* Channel LTV Attribution Breakdown */}
            <div className="p-3.5 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#6B7280]">
                <span className="flex items-center gap-1.5">
                  <TrendingUp size={12} strokeWidth={1.5} className="text-cyan-600 dark:text-cyan-400" />
                  Channel Attribution Ledger
                </span>
                <span>Current Stage: {crmStages[crmStageIdx]}</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 pt-1 font-mono text-xs tabular-nums">
                <div className="p-2.5 rounded-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08]">
                  <span className="text-[10px] text-[#6B7280] block">LinkedIn DMs</span>
                  <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">$38,400</span>
                </div>
                <div className="p-2.5 rounded-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08]">
                  <span className="text-[10px] text-[#6B7280] block">X & Bluesky</span>
                  <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">$19,200</span>
                </div>
                <div className="p-2.5 rounded-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08]">
                  <span className="text-[10px] text-[#6B7280] block">IG Comments</span>
                  <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">$16,000</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2 space-y-5">
            <p className="text-xs font-mono text-[#6B7280] dark:text-[#9CA3AF]">
              Chapter 04 · Unified Inbox & Revenue CRM
            </p>
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#111827] dark:text-[#F3F4F6]">
              Prove exactly which posts and DMs closed revenue.
            </h3>
            <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
              Every reply, comment, and mention across 10 networks lands in one triage queue. Convert warm prospects into scored CRM contacts and track deal value through Closed Won.
            </p>
            <ul className="space-y-2.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
              {[
                'Unified inbox aggregating DMs, comments, and mentions in under 120ms',
                'AI Smart Replies tailored to your workspace knowledge and tone',
                '5-stage Kanban CRM pipeline synced directly to social interaction logs',
                'Channel-level LTV attribution for executive and client reporting',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check size={14} strokeWidth={1.75} className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onLaunch}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111827] dark:text-[#F3F4F6] hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              <Inbox size={13} strokeWidth={1.5} /> Inspect Unified Inbox & CRM <ArrowRight size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
