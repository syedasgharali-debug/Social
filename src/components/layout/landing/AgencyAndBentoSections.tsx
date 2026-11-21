import React, { useState } from 'react';
import {
  Building2,
  Check,
  FileDown,
  Command,
  Clock,
  Repeat,
  MessageSquare,
  Link2,
  FileSpreadsheet,
  ShoppingBag,
  Sun,
  Moon,
  Webhook,
  Users,
  Rss,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Platform } from '../../../types';
import { SocialLogo } from '../../common/SocialIcons';

interface AgencyAndBentoSectionsProps {
  darkMode: boolean;
  onToggleDarkMode?: () => void;
  onOpenCommandJump: () => void;
  onToast?: (title: string, description?: string, variant?: 'info' | 'success' | 'warning') => void;
}

const SAMPLE_WORKSPACES = [
  {
    id: 'digixy',
    name: 'The DigiXy Agency',
    type: 'Agency Roster · 14 Client Workspaces',
    profiles: 64,
    pendingApprovals: 3,
    reach: '412.8k',
    growth: '+154%',
    pipeline: '$94.2k',
    topPost: 'B2B Agency Attribution Tear-Down (LinkedIn · 18.4k impressions)',
    platforms: ['linkedin', 'instagram', 'x', 'youtube', 'tiktok'] as Platform[],
    heatmap: [2, 3, 4, 3, 2, 1, 2, 3, 4, 4, 3, 2, 1, 3],
  },
  {
    id: 'personal',
    name: 'Personal Brand',
    type: 'Founder Workspace · 6 Channels',
    profiles: 6,
    pendingApprovals: 1,
    reach: '128.5k',
    growth: '+118%',
    pipeline: '$31.6k',
    topPost: 'How We Built a 10-Network Evergreen Loop (X Thread · 14.2k views)',
    platforms: ['x', 'linkedin', 'bluesky', 'threads', 'youtube'] as Platform[],
    heatmap: [1, 2, 3, 4, 4, 2, 1, 2, 3, 3, 4, 3, 2, 2],
  },
  {
    id: 'urban',
    name: 'Client: Urban Roasters',
    type: 'eCommerce Client · Retail & Local',
    profiles: 10,
    pendingApprovals: 2,
    reach: '246.1k',
    growth: '+172%',
    pipeline: '$52.9k',
    topPost: 'Autumn Single-Origin Cold Brew Launch (Instagram Reels · 42.1k plays)',
    platforms: ['instagram', 'tiktok', 'pinterest', 'facebook', 'gbp'] as Platform[],
    heatmap: [3, 4, 4, 2, 3, 4, 4, 2, 3, 4, 3, 4, 4, 3],
  },
] as const;

type ApprovalStatus = 'Draft' | 'Pending Client Review' | 'Approved';

const BRAND_ACCENTS = [
  { label: 'Cyan', hex: '#06B6D4' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Emerald', hex: '#10B981' },
  { label: 'Slate', hex: '#64748B' },
];

export function AgencyAndBentoSections({
  darkMode,
  onToggleDarkMode,
  onOpenCommandJump,
  onToast,
}: AgencyAndBentoSectionsProps) {
  const [wsIdx, setWsIdx] = useState(0);
  const [approvals, setApprovals] = useState<
    { id: string; title: string; network: Platform; status: ApprovalStatus }[]
  >([
    { id: 'a1', title: 'Q4 Product Release Carousel', network: 'instagram', status: 'Pending Client Review' },
    { id: 'a2', title: 'CEO Revenue Attribution Thread', network: 'linkedin', status: 'Draft' },
    { id: 'a3', title: 'YouTube Shorts Feature Walkthrough', network: 'youtube', status: 'Approved' },
  ]);
  const [whiteLabelName, setWhiteLabelName] = useState('The DigiXy Agency');
  const [accentHex, setAccentHex] = useState('#06B6D4');
  const [pdfExported, setPdfExported] = useState(false);

  const activeWs = SAMPLE_WORKSPACES[wsIdx];

  const cycleApproval = (id: string) => {
    const order: ApprovalStatus[] = ['Draft', 'Pending Client Review', 'Approved'];
    setApprovals((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = order[(order.indexOf(item.status) + 1) % order.length];
        onToast?.('Approval Status Updated', `${item.title} moved to ${next}.`);
        return { ...item, status: next };
      })
    );
  };

  return (
    <>
      {/* SECTION 5: AGENCY & MULTI-WORKSPACE ARCHITECTURE SHOWCASE */}
      <section
        id="agency-architecture"
        className="py-20 bg-[#0E1015] text-[#F3F4F6] border-b border-white/[0.08]"
      >
        <div className="max-w-7xl mx-auto px-6 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-mono text-cyan-400">
                Built for Agencies & Multi-Brand Operators
              </p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#FFFFFF] text-balance">
                Isolated client workspaces, approval gates, and white-label PDF reports.
              </h2>
              <p className="mt-3 text-sm text-[#9CA3AF] leading-relaxed">
                Switch between client accounts without ever risking cross-posting errors. Give clients scoped approval access and export branded executive PDFs with zero vendor watermarks.
              </p>
            </div>

            {/* Interactive Workspace Switcher */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-[#13161D] border border-white/[0.08] w-fit">
              {SAMPLE_WORKSPACES.map((ws, idx) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    setWsIdx(idx);
                    setWhiteLabelName(ws.name);
                    setPdfExported(false);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    wsIdx === idx
                      ? 'bg-[#FFFFFF] text-[#090A0D]'
                      : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                  }`}
                >
                  <Building2 size={12} strokeWidth={1.5} />
                  {ws.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Workspace Scope + Role-Based Client Approvals */}
            <div className="lg:col-span-5 rounded-xl bg-[#13161D] border border-white/[0.08] p-6 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/[0.08]">
                  <div>
                    <p className="text-[11px] font-mono text-cyan-400">ACTIVE WORKSPACE SCOPE</p>
                    <h3 className="text-lg font-semibold text-[#FFFFFF] mt-0.5">{activeWs.name}</h3>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{activeWs.type}</p>
                  </div>
                  <span className="font-mono text-xs text-[#9CA3AF] tabular-nums">
                    {activeWs.profiles} profiles
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {activeWs.platforms.map((p) => (
                    <span
                      key={p}
                      className="w-7 h-7 rounded-md bg-[#0E1015] border border-white/[0.08] flex items-center justify-center"
                    >
                      <SocialLogo platform={p} size={14} />
                    </span>
                  ))}
                  <span className="text-[11px] font-mono text-[#6B7280] ml-1">
                    Strict workspaceId isolation
                  </span>
                </div>

                {/* Role-Based Client Approvals */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#F3F4F6]">Role-Based Client Approvals</span>
                    <span className="text-[11px] font-mono text-[#6B7280]">Click row to cycle state</span>
                  </div>
                  {approvals.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => cycleApproval(item.id)}
                      className="w-full p-3 rounded-lg bg-[#0E1015] border border-white/[0.08] hover:border-white/[0.18] flex items-center justify-between gap-3 text-left transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SocialLogo platform={item.network} size={14} />
                        <span className="text-xs text-[#F3F4F6] truncate">{item.title}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border shrink-0 ${
                          item.status === 'Approved'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : item.status === 'Pending Client Review'
                            ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                            : 'border-white/[0.1] bg-white/[0.04] text-[#9CA3AF]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
                <span>Roles: Owner · Manager · Publisher · Client Reviewer</span>
                <button
                  type="button"
                  onClick={() =>
                    setApprovals([
                      { id: 'a1', title: 'Q4 Product Release Carousel', network: 'instagram', status: 'Pending Client Review' },
                      { id: 'a2', title: 'CEO Revenue Attribution Thread', network: 'linkedin', status: 'Draft' },
                      { id: 'a3', title: 'YouTube Shorts Feature Walkthrough', network: 'youtube', status: 'Approved' },
                    ])
                  }
                  className="inline-flex items-center gap-1 hover:text-white transition-colors"
                >
                  <RotateCcw size={11} strokeWidth={1.5} /> Reset
                </button>
              </div>
            </div>

            {/* Right: Interactive White-Label Branded PDF Client Report Preview */}
            <div className="lg:col-span-7 rounded-xl bg-[#13161D] border border-white/[0.08] p-6 space-y-5 flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                <div className="flex-1 min-w-[200px]">
                  <label
                    htmlFor="agency-wl-name"
                    className="block text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider mb-1"
                  >
                    White-Label Report Header Name
                  </label>
                  <input
                    id="agency-wl-name"
                    value={whiteLabelName}
                    onChange={(e) => {
                      setWhiteLabelName(e.target.value);
                      setPdfExported(false);
                    }}
                    className="w-full px-3 py-1.5 rounded-md bg-[#0E1015] border border-white/[0.1] text-xs text-[#FFFFFF] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                    Accent Color
                  </span>
                  <div className="flex items-center gap-1.5">
                    {BRAND_ACCENTS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        aria-label={`Set report accent ${c.label}`}
                        onClick={() => setAccentHex(c.hex)}
                        className={`w-6 h-6 rounded-sm border transition-transform ${
                          accentHex === c.hex ? 'border-white scale-105' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Live PDF Document Preview */}
              <div className="rounded-lg bg-[#090A0D] border border-white/[0.1] p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: accentHex }}>
                      EXECUTIVE PERFORMANCE REPORT · {(whiteLabelName || 'YOUR AGENCY').toUpperCase()}
                    </p>
                    <h4 className="text-base font-semibold text-[#FFFFFF] mt-1">
                      {activeWs.name} — Monthly Social & Pipeline Brief
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-[#6B7280] shrink-0">PDF · 0% Vendor Branding</span>
                </div>

                <div className="grid grid-cols-3 gap-3 font-mono tabular-nums">
                  <div className="p-3 rounded-md bg-[#13161D] border border-white/[0.08]">
                    <span className="text-[10px] text-[#9CA3AF] block">Total Reach</span>
                    <span className="text-lg font-semibold text-[#FFFFFF] mt-0.5 block">{activeWs.reach}</span>
                  </div>
                  <div className="p-3 rounded-md bg-[#13161D] border border-white/[0.08]">
                    <span className="text-[10px] text-[#9CA3AF] block">Audience Growth</span>
                    <span className="text-lg font-semibold text-emerald-400 mt-0.5 block">{activeWs.growth}</span>
                  </div>
                  <div className="p-3 rounded-md bg-[#13161D] border border-white/[0.08]">
                    <span className="text-[10px] text-[#9CA3AF] block">CRM Pipeline</span>
                    <span className="text-lg font-semibold mt-0.5 block" style={{ color: accentHex }}>
                      {activeWs.pipeline}
                    </span>
                  </div>
                </div>

                {/* Engagement Heatmap */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#9CA3AF]">
                    <span>14-Day Engagement Heatmap</span>
                    <span>Peak Window: Tue / Thu 10:00–14:00</span>
                  </div>
                  <div className="grid grid-cols-14 gap-1">
                    {activeWs.heatmap.map((level, i) => (
                      <div
                        key={i}
                        className="h-5 rounded-xs border border-white/[0.05]"
                        style={{
                          backgroundColor: accentHex,
                          opacity: level === 1 ? 0.18 : level === 2 ? 0.4 : level === 3 ? 0.68 : 0.95,
                        }}
                        title={`Day ${i + 1}: Engagement tier ${level}/4`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-[#9CA3AF] truncate">
                    Top Asset: <strong className="text-[#F3F4F6] font-medium">{activeWs.topPost}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfExported(true);
                      onToast?.(
                        'White-Label PDF Generated',
                        `${whiteLabelName || 'Agency'} brief prepared for ${activeWs.name}.`
                      );
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#FFFFFF] hover:bg-[#E5E7EB] text-[#090A0D] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {pdfExported ? (
                      <>
                        <Check size={13} strokeWidth={2} /> PDF Prepared
                      </>
                    ) : (
                      <>
                        <FileDown size={13} strokeWidth={1.5} /> Export Branded PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: PRECISION BENTO GRID (12 CORE CAPABILITIES) */}
      <section className="py-20 border-b border-[#E5E7EB] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
              Precision Utilities · Built for Daily Operators
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#111827] dark:text-[#F3F4F6] text-balance">
              Twelve operational details you actually rely on.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-[#E5E7EB] dark:border-white/[0.08] rounded-xl overflow-hidden">
            {[
              {
                title: '⌘K Command Palette',
                desc: 'Jump to any module, workspace, or draft from the keyboard in milliseconds.',
                icon: Command,
                meta: 'Press ⌘K now',
                action: onOpenCommandJump,
              },
              {
                title: 'Best-Time-to-Post Heatmap',
                desc: 'Audience activity windows computed per connected profile so posts avoid dead hours.',
                icon: Clock,
                meta: 'Per-network windows',
              },
              {
                title: 'Evergreen Category Queues',
                desc: 'Group high-performing pillars into recyclable weekly slots with expiration caps.',
                icon: Repeat,
                meta: 'Zero calendar decay',
              },
              {
                title: 'First-Comment Automation',
                desc: 'Auto-post links, CTAs, or hashtag clusters in the first comment on LinkedIn & IG.',
                icon: MessageSquare,
                meta: 'Reach-safe links',
              },
              {
                title: 'UTM & Conversion Pixels',
                desc: 'Append structured campaign parameters automatically and track revenue attribution.',
                icon: Link2,
                meta: 'Auto-parameterized',
              },
              {
                title: 'Bulk CSV & HTML Exports',
                desc: 'Export scheduled calendars, SEO articles, and CRM ledgers in clean portable formats.',
                icon: FileSpreadsheet,
                meta: 'Zero lock-in',
              },
              {
                title: 'Shopify & WooCommerce Sync',
                desc: 'Pull catalog drops directly into social carousels and SEO product roundups.',
                icon: ShoppingBag,
                meta: 'Catalog webhooks',
              },
              {
                title: 'Instant Light & Dark Mode',
                desc: 'Calibrated Obsidian dark and Crisp Paper light surfaces with WCAG AA contrast.',
                icon: darkMode ? Sun : Moon,
                meta: darkMode ? 'Switch to Light' : 'Switch to Dark',
                action: onToggleDarkMode,
              },
              {
                title: 'SSRF-Safe Custom Webhooks',
                desc: 'Trigger Slack, Make, or custom backend jobs on publish, lead score, or contest entry.',
                icon: Webhook,
                meta: 'Signed payloads',
              },
              {
                title: 'Role-Based Seat Permissions',
                desc: 'Scope Owners, Managers, Publishers, and Client Reviewers down to individual workspaces.',
                icon: Users,
                meta: 'Granular RBAC',
              },
              {
                title: 'RSS Auto-Syndication',
                desc: 'Monitor blogs, podcasts, and changelogs to queue drafted commentary automatically.',
                icon: Rss,
                meta: '24/7 feed watcher',
              },
              {
                title: '10-Network Character Guard',
                desc: 'Real-time length, aspect-ratio, and hashtag compliance across all 10 APIs.',
                icon: ShieldCheck,
                meta: 'Pre-flight validation',
              },
            ].map((item) => {
              const Icon = item.icon;
              const inner = (
                <div className="h-full p-5 bg-[#FFFFFF] dark:bg-[#111319] hover:bg-[#F8F9FB] dark:hover:bg-[#161922] border-r border-b border-[#E5E7EB] dark:border-white/[0.08] flex flex-col justify-between gap-4 transition-colors text-left">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Icon size={16} strokeWidth={1.5} className="text-[#4B5563] dark:text-[#9CA3AF]" />
                      <span
                        className={`text-[10px] font-mono ${
                          item.action ? 'text-cyan-600 dark:text-cyan-400' : 'text-[#6B7280]'
                        }`}
                      >
                        {item.meta}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );

              return item.action ? (
                <button key={item.title} type="button" onClick={item.action} className="w-full h-full">
                  {inner}
                </button>
              ) : (
                <div key={item.title} className="h-full">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
