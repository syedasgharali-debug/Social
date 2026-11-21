import React, { useState } from 'react';
import {
  Check,
  Infinity as InfinityIcon,
  SlidersHorizontal,
  Minus,
  Plus,
  ChevronDown,
  ShieldCheck,
  Lock,
  KeyRound,
  Database,
  Webhook,
  FileCheck2,
  Search,
} from 'lucide-react';
import { PlanTier } from '../../../types';

interface PricingAndSecuritySectionsProps {
  onSelectPlan: (tier: PlanTier) => void;
}

const SCALE_TIERS = [
  {
    key: 'pro50' as PlanTier,
    label: 'Pro50',
    profiles: 50,
    workspaces: 10,
    youtubeChannels: 10,
    seoArticles: 60,
    viralCampaigns: 15,
    aiCredits: 15000,
    monthly: 349,
  },
  {
    key: 'pro100' as PlanTier,
    label: 'Pro100',
    profiles: 100,
    workspaces: 25,
    youtubeChannels: 25,
    seoArticles: 150,
    viralCampaigns: 40,
    aiCredits: 35000,
    monthly: 499,
  },
  {
    key: 'pro150' as PlanTier,
    label: 'Pro150 / Lifetime',
    profiles: 150,
    workspaces: 50,
    youtubeChannels: 50,
    seoArticles: 300,
    viralCampaigns: 100,
    aiCredits: 75000,
    monthly: 799,
    isLifetime: true,
  },
];

const FEATURE_MATRIX = [
  {
    category: 'Publishing & AI Studio',
    rows: [
      { feature: 'Connected Social Profiles', bootstrap: '10', accelerate: '25', pro_agency: '75', scale: 'Unlimited' },
      { feature: 'Workspaces & Brands', bootstrap: '1', accelerate: '5', pro_agency: '15', scale: 'Unlimited' },
      { feature: '10-Network Scheduler + 3×3 IG Grid', bootstrap: 'Included', accelerate: 'Included', pro_agency: 'Included', scale: 'Included' },
      { feature: 'Monthly AI Credits', bootstrap: '2,500', accelerate: '8,000', pro_agency: '25,000', scale: 'Unlimited / Custom' },
    ],
  },
  {
    category: 'YouTube Studio & AI SEO CMS',
    rows: [
      { feature: 'Connected YouTube Channels', bootstrap: '2', accelerate: '5', pro_agency: '15', scale: 'Unlimited' },
      { feature: 'AI SEO Articles / Month', bootstrap: '10', accelerate: '35', pro_agency: '120', scale: 'Unlimited' },
      { feature: 'WordPress, Webflow & Shopify Sync', bootstrap: '1 site', accelerate: '5 sites', pro_agency: '15 sites', scale: 'Unlimited' },
      { feature: 'Auto Social Syndication on Publish', bootstrap: 'Included', accelerate: 'Included', pro_agency: 'Included', scale: 'Included' },
    ],
  },
  {
    category: 'Viral Discovery, Contests & CRM',
    rows: [
      { feature: 'Active RSS Auto-Draft Feeds', bootstrap: '5', accelerate: '25', pro_agency: '100', scale: 'Unlimited' },
      { feature: 'Viral Giveaways & SHA-256 Audits', bootstrap: '2 / mo', accelerate: '10 / mo', pro_agency: '30 / mo', scale: 'Unlimited' },
      { feature: 'Unified Inbox & Social CRM Pipeline', bootstrap: 'Standard', accelerate: 'Full CRM', pro_agency: 'Full CRM + LTV', scale: 'Full CRM + LTV' },
    ],
  },
  {
    category: 'Agency & Security Governance',
    rows: [
      { feature: 'Team Seats & Role-Based Approvals', bootstrap: '2 seats', accelerate: '5 seats', pro_agency: '15 seats', scale: 'Unlimited' },
      { feature: 'White-Label Branded PDF Reports', bootstrap: '—', accelerate: '—', pro_agency: 'Included', scale: 'Included + Domain' },
      { feature: 'Strict workspaceId Isolation & Audit Logs', bootstrap: 'Included', accelerate: 'Included', pro_agency: 'Included', scale: 'Included' },
    ],
  },
];

const FAQS = [
  {
    q: 'How does the 14-day free trial work—do I need a credit card?',
    a: 'No credit card is required to start. Launch your live workspace immediately, test all 10 social networks, YouTube Studio, AI Blog & SEO, Viral Contests, and the Social CRM, and upgrade only when ready.',
  },
  {
    q: 'How does the $799 Lifetime Enterprise plan work—are there any recurring fees?',
    a: 'Zero recurring fees. You pay $799 once for permanent Lifetime Enterprise access, including unlimited social profiles, unlimited workspaces, unlimited team seats, white-label PDF reports, and all future platform updates.',
  },
  {
    q: 'Can we migrate existing schedules and RSS feeds from Buffer, Hootsuite, or Sprout?',
    a: 'Yes. Import queued posts via Bulk CSV upload, connect your existing RSS feeds in seconds, and authorize all 10 social APIs per workspace without losing scheduled publishing cadence.',
  },
  {
    q: 'How are client seats and approval permissions isolated across agency workspaces?',
    a: 'Every workspace is strictly scoped by a unique workspaceId at the database and security rule layer. Client Reviewers can approve or request changes only within their assigned workspace—never seeing internal drafts or other client brands.',
  },
  {
    q: 'How do White-Label Branded PDF Reports work for agencies?',
    a: 'Upload your agency logo, set your brand accent color, and configure custom report headers per workspace. Exported monthly executive PDFs include engagement heatmaps, top assets, and CRM pipeline attribution with zero Socialify AI branding.',
  },
  {
    q: 'Which CMS platforms and YouTube formats are supported natively?',
    a: 'YouTube Studio supports multi-channel long-form uploads, YouTube Shorts, automated chapters, tags, and evergreen playlists. The AI SEO CMS connects to WordPress, Webflow, and Shopify with JSON-LD FAQ schema and automatic social syndication.',
  },
  {
    q: 'How are AI credits metered across YouTube scripts, SEO articles, and inbox replies?',
    a: 'Every workspace tracks live AI credit usage directly in the sidebar ledger and persists updates to Firestore. Credits deduct transparently per generation with configurable plan quotas managed from Super Admin.',
  },
  {
    q: 'How are giveaway draws audited and webhooks protected against SSRF?',
    a: 'Viral giveaway winners are selected using verifiable SHA-256 cryptographic hashes paired with IP/email fraud filtering. Outbound webhooks validate destination hosts against private IP ranges and sign payloads using HMAC-SHA256.',
  },
];

export function PricingAndSecuritySections({ onSelectPlan }: PricingAndSecuritySectionsProps) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [scaleIdx, setScaleIdx] = useState<number>(0); // 0 = Pro50, 1 = Pro100, 2 = Pro150/Lifetime
  const [showCompareTable, setShowCompareTable] = useState<boolean>(false);
  const [faqQuery, setFaqQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const calcPrice = (monthly: number) => (billing === 'annual' ? Math.round(monthly * 0.84) : monthly);
  const activeScale = SCALE_TIERS[scaleIdx];
  const activeScaleDisplayPrice = activeScale.isLifetime
    ? activeScale.monthly
    : calcPrice(activeScale.monthly);
  const yearSubscriptionCost = activeScale.isLifetime ? 799 : activeScaleDisplayPrice * 12;
  const lifetimeSavings = activeScale.isLifetime
    ? calcPrice(349) * 12 - 799
    : Math.max(0, yearSubscriptionCost - 799);

  const filteredFaqs = FAQS.filter(
    (item) =>
      !faqQuery.trim() ||
      item.q.toLowerCase().includes(faqQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(faqQuery.toLowerCase())
  );

  return (
    <>
      {/* SECTION 7: INTERACTIVE PRICING & AGENCY SCALE CALCULATOR */}
      <section
        id="pricing"
        className="py-20 bg-[#FFFFFF] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08]"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
              Transparent Pricing · Starting at $99/mo up to $799 Lifetime
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#111827] dark:text-[#F3F4F6] text-balance">
              Predictable plans from lean teams to multi-brand agencies.
            </h2>
            <p className="mt-3 text-sm text-[#4B5563] dark:text-[#9CA3AF]">
              Start with a 14-day free trial or lock in unlimited workspaces, channels, and AI tools forever with a single $799 Lifetime license.
            </p>

            {/* Monthly vs Annual Toggle */}
            <div className="mt-7 inline-flex items-center p-1 bg-[#F3F4F6] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`px-4 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                  billing === 'monthly'
                    ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                    : 'text-[#6B7280] dark:text-[#9CA3AF]'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling('annual')}
                className={`px-4 py-1.5 rounded-sm text-xs font-medium transition-colors flex items-center gap-2 ${
                  billing === 'annual'
                    ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                    : 'text-[#6B7280] dark:text-[#9CA3AF]'
                }`}
              >
                <span>Annual</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono text-[11px]">Save 16%</span>
              </button>
            </div>
          </div>

          {/* 4-Tier Plan Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              {
                id: 'bootstrap' as PlanTier,
                name: 'Bootstrap',
                subtitle: 'Starter',
                desc: 'For creators & lean brand teams automating 10 social profiles.',
                monthly: 99,
                isLifetime: false,
                limits: '10 Profiles · 1 Workspace · 2 YouTube · 10 SEO/mo',
                features: [
                  '10-Network Scheduler + 3×3 IG Grid',
                  'Evergreen Category Queues & AI Copilot',
                  'YouTube Script & Metadata Studio (2 ch)',
                  'AI SEO Blog Engine (10 articles/mo)',
                  'Unified Social Inbox & UTM Builder',
                ],
                cta: 'Start 14-Day Trial',
              },
              {
                id: 'accelerate' as PlanTier,
                name: 'Accelerate',
                subtitle: 'Growth',
                desc: 'For B2B & growth teams tying social conversations to CRM deals.',
                monthly: 199,
                popular: true,
                isLifetime: false,
                limits: '25 Profiles · 5 Workspaces · 5 YouTube · 35 SEO/mo',
                features: [
                  'Everything in Bootstrap, plus:',
                  'Full 5-Stage Social CRM & LTV Attribution',
                  'Viral Giveaways with SHA-256 Audits',
                  'RSS Auto-Drafting & Competitor Spy',
                  '5 CMS Connectors (WP, Webflow, Shopify)',
                ],
                cta: 'Start 14-Day Trial',
              },
              {
                id: 'pro_agency' as PlanTier,
                name: 'Pro Agency',
                subtitle: 'Multi-Client',
                desc: 'For agencies managing high-volume client rosters & approvals.',
                monthly: 349,
                isLifetime: false,
                limits: '75 Profiles · 15 Workspaces · 15 YouTube · 120 SEO/mo',
                features: [
                  'Everything in Accelerate, plus:',
                  'White-Label Branded PDF Client Reports',
                  'Role-Based Client Approval Workflows',
                  'Cross-Platform Ad Manager & Audit Logs',
                  'Priority API Quotas & 25k AI Credits/mo',
                ],
                cta: 'Start 14-Day Trial',
              },
              {
                id: 'lifetime' as PlanTier,
                name: 'Lifetime Deal',
                subtitle: 'Enterprise',
                desc: 'Pay once, own Socialify AI forever. Zero monthly subscriptions.',
                monthly: 799,
                isLifetime: true,
                limits: 'Unlimited Profiles · Unlimited Workspaces · Unlimited Seats',
                features: [
                  'Everything in Pro Agency — Forever',
                  'Single $799 One-Time Payment',
                  'Unlimited YouTube Channels & SEO CMS',
                  'Custom White-Label Domain & Branding',
                  'All Future AI Modules Included',
                ],
                cta: 'Claim Lifetime — $799',
              },
            ].map((tier) => {
              const displayPrice = tier.isLifetime ? tier.monthly : calcPrice(tier.monthly);
              return (
                <div
                  key={tier.id}
                  className={`rounded-xl p-6 flex flex-col justify-between transition-colors ${
                    tier.isLifetime
                      ? 'bg-[#090A0D] text-[#F3F4F6] border border-[#06B6D4]'
                      : tier.popular
                      ? 'bg-[#F8F9FB] dark:bg-[#13161D] border border-[#06B6D4]'
                      : 'bg-[#F8F9FB] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`text-lg font-semibold tracking-[-0.02em] flex items-center gap-1.5 ${
                          tier.isLifetime ? 'text-[#FFFFFF]' : 'text-[#111827] dark:text-[#F3F4F6]'
                        }`}
                      >
                        {tier.isLifetime && <InfinityIcon size={17} strokeWidth={1.5} className="text-[#06B6D4] shrink-0" />}
                        {tier.name}
                      </h3>
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider ${
                          tier.isLifetime
                            ? 'text-[#F97316]'
                            : tier.popular
                            ? 'text-cyan-600 dark:text-cyan-400'
                            : 'text-[#6B7280]'
                        }`}
                      >
                        {tier.popular ? 'Most Popular' : tier.isLifetime ? 'Pay Once' : tier.subtitle}
                      </span>
                    </div>
                    <p
                      className={`mt-1.5 text-xs leading-relaxed ${
                        tier.isLifetime ? 'text-[#9CA3AF]' : 'text-[#4B5563] dark:text-[#9CA3AF]'
                      }`}
                    >
                      {tier.desc}
                    </p>

                    <div className="mt-6 flex items-baseline gap-1.5">
                      <span
                        className={`font-mono text-4xl font-semibold tracking-tight tabular-nums ${
                          tier.isLifetime ? 'text-[#FFFFFF]' : 'text-[#111827] dark:text-[#F3F4F6]'
                        }`}
                      >
                        ${displayPrice}
                      </span>
                      <span
                        className={`text-xs font-mono ${
                          tier.isLifetime ? 'text-cyan-400' : 'text-[#6B7280] dark:text-[#9CA3AF]'
                        }`}
                      >
                        {tier.isLifetime ? '/ lifetime' : '/ month'}
                      </span>
                    </div>
                    <p className={`mt-1 text-[11px] ${tier.isLifetime ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                      {tier.isLifetime
                        ? 'One-time license · Zero recurring bills'
                        : billing === 'annual'
                        ? `Billed annually ($${displayPrice * 12}/yr)`
                        : 'Billed monthly · Cancel anytime'}
                    </p>

                    <div
                      className={`mt-4 p-2.5 rounded-md text-[11px] font-mono leading-snug ${
                        tier.isLifetime
                          ? 'bg-[#13161D] border border-white/[0.08] text-cyan-400'
                          : 'bg-[#FFFFFF] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] text-[#111827] dark:text-[#D1D5DB]'
                      }`}
                    >
                      {tier.limits}
                    </div>

                    <ul className="mt-5 space-y-2.5">
                      {tier.features.map((f) => (
                        <li
                          key={f}
                          className={`flex items-start gap-2 text-xs ${
                            tier.isLifetime ? 'text-[#D1D5DB]' : 'text-[#4B5563] dark:text-[#9CA3AF]'
                          }`}
                        >
                          <Check
                            size={14}
                            strokeWidth={1.75}
                            className={`shrink-0 mt-0.5 ${
                              tier.isLifetime ? 'text-[#06B6D4]' : 'text-cyan-600 dark:text-cyan-400'
                            }`}
                          />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectPlan(tier.id)}
                    className={`mt-8 w-full py-2.5 rounded-md text-xs font-semibold transition-colors ${
                      tier.isLifetime
                        ? 'bg-[#FFFFFF] hover:bg-[#E5E7EB] text-[#090A0D]'
                        : tier.popular
                        ? 'bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D]'
                        : 'bg-[#FFFFFF] dark:bg-[#191D26] hover:bg-[#F3F4F6] dark:hover:bg-[#232834] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.12]'
                    }`}
                  >
                    {tier.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Interactive Agency Scale Slider (Pro50 / Pro100 / Pro150) */}
          <div className="mt-10 rounded-xl bg-[#F8F9FB] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#F97316]">
                    <SlidersHorizontal size={13} strokeWidth={1.5} /> Agency Scale Slider (Pro50 · Pro100 · Pro150)
                  </div>
                  <h3 className="mt-1.5 text-2xl font-semibold tracking-[-0.025em] text-[#111827] dark:text-[#F3F4F6]">
                    Scale workspaces, YouTube channels, SEO volume, and AI credits.
                  </h3>
                  <p className="mt-1 text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                    Slide or step across Pro50, Pro100, and Pro150 Lifetime tiers to see real-time capacity allocations.
                  </p>
                </div>

                {/* Tier Stepper + Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {SCALE_TIERS.map((tier, idx) => (
                        <button
                          key={tier.key}
                          type="button"
                          onClick={() => setScaleIdx(idx)}
                          className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
                            scaleIdx === idx
                              ? 'bg-[#111827] border-[#111827] text-white dark:bg-[#FFFFFF] dark:border-[#FFFFFF] dark:text-[#090A0D]'
                              : 'bg-[#FFFFFF] dark:bg-[#0E1015] border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#9CA3AF] hover:border-[#06B6D4]'
                          }`}
                        >
                          {tier.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Decrease scale tier"
                        onClick={() => setScaleIdx((v) => Math.max(0, v - 1))}
                        className="w-7 h-7 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#0E1015] flex items-center justify-center hover:border-[#06B6D4]"
                      >
                        <Minus size={12} strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        aria-label="Increase scale tier"
                        onClick={() => setScaleIdx((v) => Math.min(SCALE_TIERS.length - 1, v + 1))}
                        className="w-7 h-7 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#0E1015] flex items-center justify-center hover:border-[#06B6D4]"
                      >
                        <Plus size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={1}
                    value={scaleIdx}
                    onChange={(e) => setScaleIdx(Number(e.target.value))}
                    onInput={(e) => setScaleIdx(Number((e.target as HTMLInputElement).value))}
                    aria-label="Agency scale tier slider"
                    className="w-full h-1.5 rounded-full accent-[#06B6D4] cursor-pointer"
                  />
                </div>

                {/* Live Tabular Allocations */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono tabular-nums">
                  {[
                    { label: 'Social Profiles', value: activeScale.isLifetime ? 'Unlimited (150+)' : activeScale.profiles },
                    { label: 'Client Workspaces', value: activeScale.isLifetime ? 'Unlimited (50+)' : activeScale.workspaces },
                    { label: 'YouTube Channels', value: activeScale.isLifetime ? 'Unlimited' : activeScale.youtubeChannels },
                    { label: 'SEO Articles / mo', value: activeScale.isLifetime ? 'Unlimited' : activeScale.seoArticles },
                    { label: 'Viral Campaigns', value: activeScale.isLifetime ? 'Unlimited' : activeScale.viralCampaigns },
                    { label: 'AI Credits / mo', value: activeScale.aiCredits.toLocaleString() },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="p-3 rounded-lg bg-[#FFFFFF] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]"
                    >
                      <span className="text-[10px] text-[#6B7280] block">{stat.label}</span>
                      <span className="text-sm font-semibold text-[#111827] dark:text-[#F3F4F6] mt-0.5 block">
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculated Result Card */}
              <div
                className={`lg:col-span-5 rounded-xl p-6 space-y-4 border ${
                  activeScale.isLifetime
                    ? 'bg-[#090A0D] text-[#F3F4F6] border-[#06B6D4]'
                    : 'bg-[#FFFFFF] dark:bg-[#0E1015] border-[#E5E7EB] dark:border-white/[0.08]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-[10px] font-mono uppercase tracking-[0.14em] ${
                        activeScale.isLifetime ? 'text-[#F97316]' : 'text-cyan-600 dark:text-cyan-400'
                      }`}
                    >
                      Selected Agency Tier
                    </p>
                    <h4
                      className={`text-xl font-semibold tracking-[-0.02em] mt-1 ${
                        activeScale.isLifetime ? 'text-[#FFFFFF]' : 'text-[#111827] dark:text-[#F3F4F6]'
                      }`}
                    >
                      {activeScale.label}
                    </h4>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span
                      className={`text-3xl font-semibold ${
                        activeScale.isLifetime ? 'text-[#06B6D4]' : 'text-[#111827] dark:text-[#F3F4F6]'
                      }`}
                    >
                      ${activeScaleDisplayPrice}
                    </span>
                    <span className={`text-[11px] block ${activeScale.isLifetime ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                      {activeScale.isLifetime ? 'one-time lifetime' : `/ month (${billing})`}
                    </span>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-md text-xs space-y-1.5 font-mono tabular-nums ${
                    activeScale.isLifetime
                      ? 'bg-[#13161D] border border-white/[0.08]'
                      : 'bg-[#F8F9FB] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08]'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className={activeScale.isLifetime ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}>
                      Year 1 Total Cost
                    </span>
                    <span className="font-semibold">${yearSubscriptionCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-[#E5E7EB] dark:border-white/[0.08]">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      $799 Lifetime Savings
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Save ${lifetimeSavings.toLocaleString()}/yr
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPlan(activeScale.isLifetime ? 'lifetime' : activeScale.key)}
                  className={`w-full py-2.5 rounded-md text-xs font-semibold transition-colors ${
                    activeScale.isLifetime
                      ? 'bg-[#FFFFFF] hover:bg-[#E5E7EB] text-[#090A0D]'
                      : 'bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D]'
                  }`}
                >
                  Launch {activeScale.label} Workspace
                </button>
              </div>
            </div>
          </div>

          {/* Expandable Full Feature Comparison Table */}
          <div className="mt-8">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowCompareTable((v) => !v)}
                className="px-4 py-2 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#13161D] hover:border-[#06B6D4] text-xs font-medium text-[#111827] dark:text-[#F3F4F6] inline-flex items-center gap-2 transition-colors"
              >
                <span>{showCompareTable ? 'Hide Full Feature Comparison' : 'Compare All Modules Across Plans'}</span>
                <ChevronDown
                  size={14}
                  strokeWidth={1.5}
                  className={`transition-transform ${showCompareTable ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {showCompareTable && (
              <div className="mt-6 overflow-x-auto rounded-xl border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#111319]">
                <table className="w-full text-left border-collapse min-w-[680px]">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] text-xs font-mono">
                      <th className="py-3.5 px-4 font-semibold text-[#111827] dark:text-[#F3F4F6]">Capability</th>
                      <th className="py-3.5 px-4 font-semibold text-[#4B5563] dark:text-[#9CA3AF]">Bootstrap ($99)</th>
                      <th className="py-3.5 px-4 font-semibold text-cyan-600 dark:text-cyan-400">Accelerate ($199)</th>
                      <th className="py-3.5 px-4 font-semibold text-[#4B5563] dark:text-[#9CA3AF]">Pro Agency ($349)</th>
                      <th className="py-3.5 px-4 font-semibold text-[#F97316]">Scale / Lifetime ($799)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] text-xs">
                    {FEATURE_MATRIX.map((group) => (
                      <React.Fragment key={group.category}>
                        <tr className="bg-[#F8F9FB]/70 dark:bg-[#0E1015]/60">
                          <td
                            colSpan={5}
                            className="py-2.5 px-4 text-[11px] font-mono uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]"
                          >
                            {group.category}
                          </td>
                        </tr>
                        {group.rows.map((row) => (
                          <tr
                            key={row.feature}
                            className="hover:bg-[#F8F9FB] dark:hover:bg-[#161922] transition-colors"
                          >
                            <td className="py-3 px-4 font-medium text-[#111827] dark:text-[#F3F4F6]">
                              {row.feature}
                            </td>
                            <td className="py-3 px-4 font-mono text-[#4B5563] dark:text-[#9CA3AF] tabular-nums">
                              {row.bootstrap}
                            </td>
                            <td className="py-3 px-4 font-mono text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                              {row.accelerate}
                            </td>
                            <td className="py-3 px-4 font-mono text-[#4B5563] dark:text-[#9CA3AF] tabular-nums">
                              {row.pro_agency}
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-cyan-600 dark:text-cyan-400 tabular-nums">
                              {row.scale}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 8: ENTERPRISE SECURITY, TRUST & COMPREHENSIVE FAQ */}
      <section id="security" className="py-20 border-b border-[#E5E7EB] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6 space-y-20">
          {/* Security Architecture Grid */}
          <div>
            <div className="max-w-2xl mb-10">
              <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                Security & Tenant Governance
              </p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#111827] dark:text-[#F3F4F6] text-balance">
                Engineered for multi-tenant isolation from day one.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                {
                  icon: Lock,
                  title: 'Salted scrypt & HMAC-SHA256',
                  desc: 'Hardened credential hashing and signed session verification across admin and user realms.',
                },
                {
                  icon: KeyRound,
                  title: 'Hardened Google OAuth',
                  desc: 'Scoped OAuth handshakes with zero client-secret exposure and immediate token revocation.',
                },
                {
                  icon: Database,
                  title: 'Strict workspaceId Isolation',
                  desc: 'Firestore rules enforce document-level workspace partitioning across every collection.',
                },
                {
                  icon: Webhook,
                  title: 'SSRF-Protected Webhooks',
                  desc: 'Outbound URL validation blocks internal/loopback CIDRs before payload dispatch.',
                },
                {
                  icon: FileCheck2,
                  title: 'Cryptographic Campaign Audits',
                  desc: 'Verifiable SHA-256 draw receipts and anti-bot fraud checks for viral contests.',
                },
              ].map((sec) => {
                const Icon = sec.icon;
                return (
                  <div
                    key={sec.title}
                    className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#111319] border border-[#E5E7EB] dark:border-white/[0.08] space-y-2.5"
                  >
                    <Icon size={16} strokeWidth={1.5} className="text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      {sec.title}
                    </h3>
                    <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                      {sec.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Searchable 8-Question FAQ Accordion */}
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-xs font-mono text-[#6B7280] dark:text-[#9CA3AF]">
                Frequently Asked Questions
              </p>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#111827] dark:text-[#F3F4F6]">
                Technical & billing answers
              </h2>
              <div className="mt-5 relative max-w-md mx-auto">
                <Search
                  size={14}
                  strokeWidth={1.5}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]"
                />
                <input
                  value={faqQuery}
                  onChange={(e) => setFaqQuery(e.target.value)}
                  placeholder="Search migrations, white-label PDFs, YouTube, AI credits..."
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-[#FFFFFF] dark:bg-[#111319] border border-[#E5E7EB] dark:border-white/[0.08] text-xs text-[#111827] dark:text-[#F3F4F6] placeholder:text-[#6B7280] outline-none focus:border-[#06B6D4]"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={faq.q}
                    className="bg-[#FFFFFF] dark:bg-[#111319] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-sm font-medium text-[#111827] dark:text-[#F3F4F6]"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        size={16}
                        strokeWidth={1.5}
                        className={`shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : 'text-[#6B7280]'
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFaqs.length === 0 && (
                <div className="p-8 rounded-lg border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#111319] text-center space-y-2">
                  <ShieldCheck size={18} strokeWidth={1.5} className="mx-auto text-[#6B7280]" />
                  <p className="text-xs text-[#6B7280]">No questions matched “{faqQuery}”.</p>
                  <button
                    type="button"
                    onClick={() => setFaqQuery('')}
                    className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
