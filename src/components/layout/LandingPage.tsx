import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ChevronDown,
  Calendar,
  Inbox,
  BarChart3,
  Layers,
  Youtube,
  FileText,
  Gift,
  TrendingUp,
  Building2,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Command,
  X,
  Mail,
  Menu,
  Search,
  Check,
  Rss,
} from 'lucide-react';
import { PlanTier, Platform } from '../../types';
import { SocialLogo } from '../common/SocialIcons';
import { BrandLogo } from '../BrandLogo';
import { HeroProductStage, HeroStageTab } from './landing/HeroProductStage';
import { WorkflowChapters } from './landing/WorkflowChapters';
import { AgencyAndBentoSections } from './landing/AgencyAndBentoSections';
import { PricingAndSecuritySections } from './landing/PricingAndSecuritySections';

interface LandingPageProps {
  selectedPlan: PlanTier;
  onLaunch: (plan?: PlanTier, workspaceName?: string) => void;
  onToast?: (title: string, description?: string, variant?: 'info' | 'success' | 'warning') => void;
  isSignedIn?: boolean;
  userDisplayName?: string;
  onSignInClick?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const NETWORKS_BAR: { id: Platform; name: string }[] = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'x', name: 'X' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'youtube', name: 'YouTube Shorts' },
  { id: 'pinterest', name: 'Pinterest' },
  { id: 'threads', name: 'Threads' },
  { id: 'bluesky', name: 'Bluesky' },
  { id: 'gbp', name: 'Google Business' },
];

const PRODUCT_MEGA_COLUMNS: {
  category: string;
  items: {
    title: string;
    desc: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    stageTab?: HeroStageTab;
    href?: string;
  }[];
}[] = [
  {
    category: 'Publishing & AI',
    items: [
      {
        title: '10-Network Content Studio',
        desc: 'Compose once with native per-channel formatting.',
        icon: Layers,
        stageTab: 'scheduler',
      },
      {
        title: 'Visual Scheduler & 3×3 Grid',
        desc: 'Evergreen queues and Instagram feed planner.',
        icon: Calendar,
        stageTab: 'scheduler',
      },
      {
        title: 'AI Copilot & Strategy Wizard',
        desc: '7-day pillar planning, hooks, and captions.',
        icon: Sparkles,
        href: '#workflows',
      },
    ],
  },
  {
    category: 'Video & SEO',
    items: [
      {
        title: 'YouTube Multi-Channel Studio',
        desc: 'Scripts, chapters, thumbnails, and Shorts.',
        icon: Youtube,
        stageTab: 'youtube',
      },
      {
        title: 'AI Blog & SEO CMS Engine',
        desc: 'Keyword-to-article with JSON-LD FAQ schema.',
        icon: FileText,
        stageTab: 'seo',
      },
      {
        title: 'CMS Auto-Syndication',
        desc: '1-click WordPress, Webflow & Shopify sync.',
        icon: Rss,
        href: '#workflows',
      },
    ],
  },
  {
    category: 'Growth & CRM',
    items: [
      {
        title: 'Unified Social Inbox',
        desc: 'Sub-120ms triage across DMs & comments.',
        icon: Inbox,
        stageTab: 'inbox',
      },
      {
        title: 'Social CRM Revenue Pipeline',
        desc: 'Attribute conversations directly to LTV.',
        icon: TrendingUp,
        stageTab: 'crm',
      },
      {
        title: 'Viral Contests & Giveaways',
        desc: 'Referral multipliers with SHA-256 draw audits.',
        icon: Gift,
        href: '#workflows',
      },
    ],
  },
  {
    category: 'Agency Operations',
    items: [
      {
        title: 'Isolated Client Workspaces',
        desc: 'Strict workspaceId partitioning per brand.',
        icon: Building2,
        href: '#agency-architecture',
      },
      {
        title: 'White-Label PDF Reports',
        desc: 'Custom logos, brand colors, zero watermarks.',
        icon: BarChart3,
        href: '#agency-architecture',
      },
      {
        title: 'Enterprise Security Controls',
        desc: 'Salted scrypt, HMAC-SHA256 & SSRF guards.',
        icon: ShieldCheck,
        href: '#security',
      },
    ],
  },
];

const SOLUTIONS_ITEMS: {
  title: string;
  desc: string;
  tier: PlanTier;
  meta: string;
}[] = [
  {
    title: 'Agencies & Multi-Brand',
    desc: 'Run 15–150+ client profiles with workspace isolation, client approvals, and branded PDF reports.',
    tier: 'pro_agency',
    meta: 'Pro Agency · $349/mo',
  },
  {
    title: 'SaaS & B2B Teams',
    desc: 'Unify LinkedIn, X, Bluesky, AI SEO blogging, and Social CRM deal attribution in one workspace.',
    tier: 'accelerate',
    meta: 'Accelerate · $199/mo',
  },
  {
    title: 'Creators & Media',
    desc: 'Automate multi-channel YouTube scripts, Shorts cross-posting, and evergreen category loops.',
    tier: 'bootstrap',
    meta: 'Bootstrap · $99/mo',
  },
  {
    title: 'eCommerce Brands',
    desc: 'Connect Shopify/WooCommerce catalogs, Instagram 3×3 grids, and SHA-256 verified viral giveaways.',
    tier: 'lifetime',
    meta: 'Lifetime · $799 one-time',
  },
];

const CONSOLIDATED_TOOLS = [
  { name: 'Social Scheduler (10 Networks)', legacyCost: 99, detail: 'Visual calendar, queues & 3×3 IG grid' },
  { name: 'YouTube Automation Suite', legacyCost: 79, detail: 'Multi-channel scripts, chapters & thumbnails' },
  { name: 'AI SEO Blog CMS', legacyCost: 89, detail: 'H1–H3 drafts, JSON-LD FAQ & WP/Webflow sync' },
  { name: 'Viral Contest & Giveaway Tool', legacyCost: 149, detail: 'Referral multipliers, fraud filter & SHA-256' },
  { name: 'Social CRM & Unified Inbox', legacyCost: 79, detail: 'DM triage, lead scoring & pipeline attribution' },
];

const PLAN_LABELS: Record<PlanTier, { name: string; priceTag: string; isLifetime?: boolean }> = {
  bootstrap: { name: 'Bootstrap (Starter)', priceTag: '$99/mo' },
  accelerate: { name: 'Accelerate (Growth)', priceTag: '$199/mo' },
  pro_agency: { name: 'Pro Agency', priceTag: '$349/mo' },
  lifetime: { name: 'Lifetime Enterprise', priceTag: '$799 One-Time (Lifetime)', isLifetime: true },
  pro50: { name: 'Agency Scale Pro50', priceTag: '$349/mo' },
  pro100: { name: 'Agency Scale Pro100', priceTag: '$499/mo' },
  pro150: { name: 'Lifetime Enterprise (Pro150)', priceTag: '$799 One-Time (Lifetime)', isLifetime: true },
};

export function LandingPage({
  selectedPlan,
  onLaunch,
  onToast,
  isSignedIn = false,
  userDisplayName,
  onSignInClick,
  darkMode = false,
  onToggleDarkMode,
}: LandingPageProps) {
  const [openMenu, setOpenMenu] = useState<'product' | 'solutions' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroStageTab, setHeroStageTab] = useState<HeroStageTab>('scheduler');
  const [quickJumpOpen, setQuickJumpOpen] = useState(false);
  const [quickJumpQuery, setQuickJumpQuery] = useState('');
  const [planModalTier, setPlanModalTier] = useState<PlanTier | null>(null);
  const [workspaceInput, setWorkspaceInput] = useState('Acme Cloud');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSaved, setNewsletterSaved] = useState(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const sandboxRef = useRef<HTMLDivElement | null>(null);

  // Cmd+K / Ctrl+K shortcut for Quick Jump
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickJumpOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setQuickJumpOpen(false);
        setOpenMenu(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const scrollToId = (id: string) => {
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const jumpToStageTab = (tab: HeroStageTab) => {
    setHeroStageTab(tab);
    setOpenMenu(null);
    setMobileMenuOpen(false);
    setQuickJumpOpen(false);
    sandboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const quickJumpTargets = [
    { label: 'Visual Scheduler & 3×3 IG Grid', group: 'Sandbox', action: () => jumpToStageTab('scheduler') },
    { label: 'YouTube Multi-Channel Studio', group: 'Sandbox', action: () => jumpToStageTab('youtube') },
    { label: 'AI Blog & SEO CMS Syndicator', group: 'Sandbox', action: () => jumpToStageTab('seo') },
    { label: 'Unified Social Inbox', group: 'Sandbox', action: () => jumpToStageTab('inbox') },
    { label: 'Social CRM Revenue Pipeline', group: 'Sandbox', action: () => jumpToStageTab('crm') },
    { label: 'Tool Consolidation & ROI Strip', group: 'Section', action: () => { setQuickJumpOpen(false); scrollToId('#consolidation'); } },
    { label: 'Workflow Deep-Dives (4 Chapters)', group: 'Section', action: () => { setQuickJumpOpen(false); scrollToId('#workflows'); } },
    { label: 'Agency Workspaces & White-Label PDF', group: 'Section', action: () => { setQuickJumpOpen(false); scrollToId('#agency-architecture'); } },
    { label: 'Pricing & Agency Scale Calculator', group: 'Section', action: () => { setQuickJumpOpen(false); scrollToId('#pricing'); } },
    { label: 'Enterprise Security & FAQ', group: 'Section', action: () => { setQuickJumpOpen(false); scrollToId('#security'); } },
    { label: 'Launch Production Workspace', group: 'Action', action: () => { setQuickJumpOpen(false); onLaunch(selectedPlan); } },
  ].filter(
    (item) =>
      !quickJumpQuery.trim() ||
      item.label.toLowerCase().includes(quickJumpQuery.toLowerCase()) ||
      item.group.toLowerCase().includes(quickJumpQuery.toLowerCase())
  );

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newsletterEmail.trim();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setNewsletterError('Enter a valid work email address.');
      return;
    }
    setNewsletterError(null);
    setNewsletterSaved(true);
    onToast?.('Subscribed to Release Notes', `Product updates will be sent to ${cleaned}.`);
    setNewsletterEmail('');
  };

  const totalLegacyCost = CONSOLIDATED_TOOLS.reduce((sum, item) => sum + item.legacyCost, 0);

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#090A0D] text-[#111827] dark:text-[#F3F4F6] selection:bg-cyan-500/20 selection:text-cyan-900 dark:selection:text-cyan-200">
      {/* SECTION 1: STICKY ARCHITECTURAL HEADER (h-14) */}
      <header
        onMouseLeave={() => setOpenMenu(null)}
        className="sticky top-0 z-50 bg-[#FFFFFF] dark:bg-[#090A0D] border-b border-[#E5E7EB] dark:border-white/[0.08]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4 sm:gap-8">
          {/* Brand Zone */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              if (window.location.pathname !== '/') {
                window.history.pushState({}, '', '/');
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="Socialify AI Home"
            className="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4] rounded-md"
          >
            <BrandLogo size="md" surface="auto" />
          </a>

          {/* Primary Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
            <button
              type="button"
              onMouseEnter={() => setOpenMenu('product')}
              onClick={() => setOpenMenu(openMenu === 'product' ? null : 'product')}
              className="flex items-center gap-1 py-2 hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0"
            >
              Product <ChevronDown size={13} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onMouseEnter={() => setOpenMenu('solutions')}
              onClick={() => setOpenMenu(openMenu === 'solutions' ? null : 'solutions')}
              className="flex items-center gap-1 py-2 hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0"
            >
              Solutions <ChevronDown size={13} strokeWidth={1.5} />
            </button>
            <a
              href="#pricing"
              className="hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0"
            >
              Pricing
            </a>
            <a
              href="#security"
              className="hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0"
            >
              Security
            </a>
          </nav>

          {/* Right Utility Bar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setQuickJumpOpen(true)}
              aria-label="Quick Jump"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#111319] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF] transition-colors whitespace-nowrap shrink-0"
            >
              <Command size={12} strokeWidth={1.5} />
              <span>⌘K</span>
            </button>

            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                aria-label="Toggle theme"
                className="p-2 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#111319] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] text-[#4B5563] dark:text-[#9CA3AF] transition-colors shrink-0"
              >
                {darkMode ? (
                  <Sun size={14} strokeWidth={1.5} className="text-[#F97316]" />
                ) : (
                  <Moon size={14} strokeWidth={1.5} />
                )}
              </button>
            )}

            {!isSignedIn && onSignInClick && (
              <button
                type="button"
                onClick={onSignInClick}
                className="hidden sm:inline-flex px-3 py-1.5 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#111319] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}

            <button
              type="button"
              onClick={() => (isSignedIn ? onLaunch(selectedPlan) : setPlanModalTier('accelerate'))}
              className="px-3.5 py-1.5 rounded-md bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              {isSignedIn
                ? `Dashboard${userDisplayName ? ` (${userDisplayName.split(' ')[0]})` : ''}`
                : 'Start Free Trial'}
              <ArrowRight size={13} strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#9CA3AF]"
            >
              {mobileMenuOpen ? <X size={16} strokeWidth={1.5} /> : <Menu size={16} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Desktop Mega-Menu Panel */}
        <AnimatePresence>
          {openMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="hidden lg:block absolute left-0 right-0 bg-[#FFFFFF] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08]"
            >
              <div className="max-w-7xl mx-auto px-6 py-6">
                {openMenu === 'product' ? (
                  <div className="grid grid-cols-4 gap-6">
                    {PRODUCT_MEGA_COLUMNS.map((col) => (
                      <div key={col.category} className="space-y-3">
                        <p className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF]">
                          {col.category}
                        </p>
                        <div className="space-y-1.5">
                          {col.items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.title}
                                type="button"
                                onClick={() => {
                                  setOpenMenu(null);
                                  if (item.stageTab) {
                                    jumpToStageTab(item.stageTab);
                                  } else if (item.href) {
                                    scrollToId(item.href);
                                  }
                                }}
                                className="w-full p-2.5 rounded-lg border border-transparent hover:border-[#E5E7EB] dark:hover:border-white/[0.08] hover:bg-[#F8F9FB] dark:hover:bg-[#13161D] text-left flex items-start gap-2.5 transition-colors"
                              >
                                <Icon
                                  size={15}
                                  strokeWidth={1.5}
                                  className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5"
                                />
                                <div>
                                  <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                                    {item.title}
                                  </p>
                                  <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                                    {item.desc}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    {SOLUTIONS_ITEMS.map((sol) => (
                      <button
                        key={sol.title}
                        type="button"
                        onClick={() => {
                          setOpenMenu(null);
                          setPlanModalTier(sol.tier);
                        }}
                        className="p-4 rounded-lg border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] bg-[#F8F9FB] dark:bg-[#111319] text-left flex flex-col justify-between gap-3 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">
                            {sol.title}
                          </p>
                          <p className="mt-1.5 text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                            {sol.desc}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                          <span>{sol.meta}</span>
                          <ArrowRight size={12} strokeWidth={1.5} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#0E1015] px-4 py-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => jumpToStageTab('scheduler')}
                className="p-2.5 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] text-left font-medium"
              >
                Interactive Sandbox
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToId('#workflows');
                }}
                className="p-2.5 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] text-left font-medium"
              >
                Workflows
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToId('#pricing');
                }}
                className="p-2.5 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] text-left font-medium"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToId('#security');
                }}
                className="p-2.5 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] text-left font-medium"
              >
                Security & FAQ
              </button>
            </div>
            {!isSignedIn && onSignInClick && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignInClick();
                }}
                className="w-full py-2 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] font-medium"
              >
                Sign In to Existing Workspace
              </button>
            )}
          </div>
        )}
      </header>

      {/* SECTION 2: HIGH-IMPACT HERO + 10-NETWORK BAR + INTERACTIVE 5-MODULE STAGE */}
      <section className="relative pt-14 pb-20 sm:pt-20 sm:pb-24 border-b border-[#E5E7EB] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-[11px] font-mono tracking-[0.08em] text-cyan-600 dark:text-cyan-400">
              SocialifyAI v2.0 · Publishing, YouTube Studio, AI SEO &amp; Social CRM
            </p>

            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-[-0.035em] leading-[1.04] text-[#111827] dark:text-[#FFFFFF] text-balance">
              One operating system for social publishing, video, SEO, and pipeline revenue.
            </h1>

            <p className="mt-5 text-[15px] sm:text-base text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed max-w-2xl mx-auto">
              Schedule across 10 networks, run multi-channel YouTube &amp; AI blog workflows, launch viral referral campaigns, and attribute every DM or comment directly to closed CRM revenue.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPlanModalTier('accelerate')}
                className="w-full sm:w-auto px-6 py-3 rounded-md bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                Launch Workspace — Free <ArrowRight size={15} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => jumpToStageTab('scheduler')}
                className="w-full sm:w-auto px-6 py-3 rounded-md bg-[#FFFFFF] dark:bg-[#111319] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                Explore Interactive Sandbox
              </button>
            </div>

            <p className="mt-4 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              No credit card required · Full 10-network access · White-label ready
            </p>
          </div>

          {/* 10-Network Official SVG Bar */}
          <div className="mt-10 pt-8 border-t border-[#E5E7EB] dark:border-white/[0.08]">
            <p className="text-center text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF] mb-4">
              Native API publishing, analytics, and inbox sync across 10 networks
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
              {NETWORKS_BAR.map((net) => (
                <div
                  key={net.id}
                  className="group flex items-center justify-center gap-2 py-2.5 px-2 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#111319] hover:border-[#06B6D4] transition-colors"
                >
                  <span className="grayscale opacity-75 group-hover:grayscale-0 group-hover:opacity-100 transition-all shrink-0">
                    <SocialLogo platform={net.id} size={16} />
                  </span>
                  <span className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF] group-hover:text-[#111827] dark:group-hover:text-[#F3F4F6] truncate">
                    {net.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive 5-Module Product Stage */}
          <div ref={sandboxRef}>
            <HeroProductStage
              activeTab={heroStageTab}
              onTabChange={setHeroStageTab}
              onLaunch={() => onLaunch(selectedPlan)}
              onToast={onToast}
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: TOOL CONSOLIDATION & ROI COMPARISON STRIP */}
      <section
        id="consolidation"
        className="py-20 bg-[#FFFFFF] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08]"
      >
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-mono text-[#F97316]">
                Tool Consolidation &amp; Stack Economics
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#111827] dark:text-[#F3F4F6] text-balance">
                Replace 5 fragmented subscriptions with one unified workspace.
              </h2>
              <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                Instead of paying five separate vendors and losing attribution between spreadsheets, consolidate publishing, YouTube, SEO blogging, viral contests, and Social CRM inside one system.
              </p>
              <div className="pt-2 flex flex-wrap items-baseline gap-4 font-mono tabular-nums">
                <div>
                  <span className="text-[11px] text-[#6B7280] block">FRAGMENTED STACK</span>
                  <span className="text-2xl font-semibold text-[#6B7280] line-through">
                    ${totalLegacyCost}/mo
                  </span>
                </div>
                <span className="text-[#6B7280]">→</span>
                <div>
                  <span className="text-[11px] text-cyan-600 dark:text-cyan-400 block">SOCIALIFYAI UNIFIED</span>
                  <span className="text-2xl font-semibold text-[#111827] dark:text-[#FFFFFF]">
                    From $99/mo
                  </span>
                  <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                    or $799 Lifetime
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-xl border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#111319] overflow-hidden">
              <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
                {CONSOLIDATED_TOOLS.map((tool) => (
                  <div
                    key={tool.name}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#111827] dark:text-[#F3F4F6]">{tool.name}</p>
                      <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">{tool.detail}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums">
                      <span className="text-[#6B7280] line-through">${tool.legacyCost}/mo</span>
                      <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 font-medium">
                        <Check size={12} strokeWidth={2} /> Included
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4 Concrete Operational Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { value: '10', label: 'Native Networks', note: 'Direct publishing, queues & inbox sync' },
              { value: '4.2×', label: 'Faster Content-to-Publish', note: 'Single draft tailored across every channel' },
              { value: '100%', label: 'Workspace Isolation', note: 'Strict workspaceId partitioning per brand' },
              { value: '<120ms', label: 'Unified Inbox Sync', note: 'Real-time comment & DM pipeline routing' },
            ].map((metric) => (
              <div
                key={metric.label}
                className="p-5 rounded-xl bg-[#F8F9FB] dark:bg-[#111319] border border-[#E5E7EB] dark:border-white/[0.08]"
              >
                <p className="font-mono text-3xl font-semibold tracking-tight text-[#111827] dark:text-[#FFFFFF] tabular-nums">
                  {metric.value}
                </p>
                <p className="mt-1.5 text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                  {metric.label}
                </p>
                <p className="mt-0.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{metric.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: 4 ALTERNATING INTERACTIVE WORKFLOW CHAPTERS */}
      <WorkflowChapters onLaunch={() => onLaunch(selectedPlan)} onToast={onToast} />

      {/* SECTION 5 (AGENCY SHOWCASE) & SECTION 6 (12-CAPABILITY BENTO GRID) */}
      <AgencyAndBentoSections
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        onOpenCommandJump={() => setQuickJumpOpen(true)}
        onToast={onToast}
      />

      {/* SECTION 7 (PRICING & AGENCY SCALE SLIDER) & SECTION 8 (SECURITY & FAQ) */}
      <PricingAndSecuritySections onSelectPlan={(tier) => setPlanModalTier(tier)} />

      {/* SECTION 9: HIGH-CONTRAST CLOSING CONVERSION BANNER & STRUCTURED 4-COLUMN FOOTER */}
      <section className="py-20 bg-[#FFFFFF] dark:bg-[#090A0D] border-b border-[#E5E7EB] dark:border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/[0.1] bg-[#0E1015] text-[#F3F4F6] p-8 sm:p-12 text-center canvas-dot-grid">
            <p className="text-xs font-mono text-cyan-400">
              Production-Ready Workspace · Deploy in 60 Seconds
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#FFFFFF] max-w-2xl mx-auto text-balance">
              Consolidate your social, video, SEO, and revenue workflow today.
            </h2>
            <p className="mt-3 text-sm text-[#9CA3AF] max-w-xl mx-auto leading-relaxed">
              Launch a live workspace with zero credit card required, or lock in unlimited capacity permanently with the $799 Lifetime Enterprise license.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPlanModalTier('accelerate')}
                className="w-full sm:w-auto px-6 py-3 rounded-md bg-[#FFFFFF] hover:bg-[#E5E7EB] text-[#090A0D] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                Launch Workspace — Free <ArrowRight size={15} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => setPlanModalTier('lifetime')}
                className="w-full sm:w-auto px-6 py-3 rounded-md bg-[#13161D] hover:bg-[#191D26] text-[#F3F4F6] border border-white/[0.12] hover:border-[#06B6D4] text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                Claim $799 Lifetime Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#090A0D] text-[#9CA3AF] pt-14 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-white/[0.08]">
            <div className="lg:col-span-4 space-y-4">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  if (window.location.pathname !== '/') {
                    window.history.pushState({}, '', '/');
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label="Socialify AI Home"
                className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4] rounded-md"
              >
                <BrandLogo size="md" surface="dark" />
              </a>
              <p className="text-xs text-[#9CA3AF] leading-relaxed max-w-sm">
                Unified operating system for 10-network social publishing, YouTube multi-channel automation, AI SEO blogging, viral contests, and Social CRM attribution.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-2 max-w-sm" noValidate>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail
                      size={13}
                      strokeWidth={1.5}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                    />
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => {
                        setNewsletterEmail(e.target.value);
                        setNewsletterError(null);
                      }}
                      placeholder="you@company.com"
                      aria-label="Work email for product updates"
                      className="w-full pl-8 pr-3 py-2 bg-[#13161D] border border-white/[0.08] rounded-md text-xs text-[#F3F4F6] placeholder:text-[#6B7280] outline-none focus:border-[#06B6D4]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#E5E7EB] text-[#090A0D] rounded-md text-xs font-semibold transition-colors shrink-0"
                  >
                    Subscribe
                  </button>
                </div>
                {newsletterError && <p className="text-[11px] text-[#F97316]">{newsletterError}</p>}
                {newsletterSaved && !newsletterError && (
                  <p className="text-[11px] text-emerald-400">Subscribed to monthly product changelog.</p>
                )}
              </form>
            </div>

            {/* Structured 4-Column Footer */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8 text-xs">
              <div>
                <h4 className="font-mono text-[11px] font-semibold text-[#F3F4F6] uppercase tracking-[0.12em] mb-3">
                  Product
                </h4>
                <ul className="space-y-2">
                  <li>
                    <button
                      type="button"
                      onClick={() => jumpToStageTab('scheduler')}
                      className="hover:text-[#F3F4F6] transition-colors"
                    >
                      Interactive Sandbox
                    </button>
                  </li>
                  <li>
                    <a href="#consolidation" className="hover:text-[#F3F4F6] transition-colors">
                      ROI Comparison
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="hover:text-[#F3F4F6] transition-colors">
                      Pricing &amp; Lifetime
                    </a>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onLaunch(selectedPlan)}
                      className="hover:text-[#F3F4F6] transition-colors"
                    >
                      Launch Dashboard
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-mono text-[11px] font-semibold text-[#F3F4F6] uppercase tracking-[0.12em] mb-3">
                  Modules
                </h4>
                <ul className="space-y-2">
                  <li>
                    <button
                      type="button"
                      onClick={() => jumpToStageTab('scheduler')}
                      className="hover:text-[#F3F4F6] transition-colors"
                    >
                      Visual Scheduler
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => jumpToStageTab('youtube')}
                      className="hover:text-[#F3F4F6] transition-colors"
                    >
                      YouTube Studio
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => jumpToStageTab('seo')}
                      className="hover:text-[#F3F4F6] transition-colors"
                    >
                      AI Blog &amp; SEO CMS
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => jumpToStageTab('crm')}
                      className="hover:text-[#F3F4F6] transition-colors"
                    >
                      Inbox &amp; Social CRM
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-mono text-[11px] font-semibold text-[#F3F4F6] uppercase tracking-[0.12em] mb-3">
                  Solutions
                </h4>
                <ul className="space-y-2">
                  <li>
                    <a href="#agency-architecture" className="hover:text-[#F3F4F6] transition-colors">
                      Agencies &amp; Multi-Brand
                    </a>
                  </li>
                  <li>
                    <a href="#workflows" className="hover:text-[#F3F4F6] transition-colors">
                      SaaS &amp; B2B Teams
                    </a>
                  </li>
                  <li>
                    <a href="#workflows" className="hover:text-[#F3F4F6] transition-colors">
                      Creators &amp; Media
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="hover:text-[#F3F4F6] transition-colors">
                      eCommerce Brands
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-mono text-[11px] font-semibold text-[#F3F4F6] uppercase tracking-[0.12em] mb-3">
                  Security &amp; Legal
                </h4>
                <ul className="space-y-2">
                  <li>
                    <a href="#security" className="hover:text-[#F3F4F6] transition-colors">
                      Tenant Isolation
                    </a>
                  </li>
                  <li>
                    <a href="#security" className="hover:text-[#F3F4F6] transition-colors">
                      SHA-256 Draw Audits
                    </a>
                  </li>
                  <li>
                    <a href="#security" className="hover:text-[#F3F4F6] transition-colors">
                      OAuth &amp; Webhooks
                    </a>
                  </li>
                  <li>
                    <a href="#security" className="hover:text-[#F3F4F6] transition-colors">
                      FAQ &amp; Compliance
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
            <p>© {new Date().getFullYear()} socialifyai.com. All rights reserved.</p>
            <p className="font-mono text-[11px]">
              10 Networks · YouTube Studio · AI SEO CMS · Social CRM
            </p>
          </div>
        </div>
      </footer>

      {/* ⌘K QUICK JUMP MODAL */}
      {quickJumpOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 p-4">
          <div
            className="absolute inset-0 bg-[#090A0D]/75"
            onClick={() => setQuickJumpOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-lg border border-[#E5E7EB] dark:border-white/[0.12] bg-[#FFFFFF] dark:bg-[#111319] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center gap-2.5">
              <Search size={14} strokeWidth={1.5} className="text-[#6B7280]" />
              <input
                autoFocus
                value={quickJumpQuery}
                onChange={(e) => setQuickJumpQuery(e.target.value)}
                placeholder="Jump to module, pricing, security, or launch workspace..."
                className="flex-1 bg-transparent text-xs text-[#111827] dark:text-[#F3F4F6] placeholder:text-[#6B7280] outline-none"
              />
              <button
                type="button"
                onClick={() => setQuickJumpOpen(false)}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm border border-[#E5E7EB] dark:border-white/[0.1] text-[#6B7280]"
              >
                ESC
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-white/[0.06]">
              {quickJumpTargets.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] flex items-center justify-between gap-3 transition-colors"
                >
                  <span className="text-xs font-medium text-[#111827] dark:text-[#F3F4F6]">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono text-[#6B7280]">{item.group}</span>
                </button>
              ))}
              {quickJumpTargets.length === 0 && (
                <div className="p-6 text-center text-xs text-[#6B7280]">No matching destinations.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PLAN CONFIRMATION MODAL */}
      {planModalTier && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#090A0D]/75"
            onClick={() => setPlanModalTier(null)}
          />
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#13161D] rounded-lg border border-[#E5E7EB] dark:border-white/[0.12] p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-400">
                  {PLAN_LABELS[planModalTier]?.isLifetime
                    ? 'ONE-TIME LIFETIME LICENSE · $799 FOREVER'
                    : `14-DAY FREE TRIAL · ${PLAN_LABELS[planModalTier]?.priceTag || '$99/mo'}`}
                </p>
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6] mt-0.5">
                  Launch {PLAN_LABELS[planModalTier]?.name || planModalTier} Workspace
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPlanModalTier(null)}
                aria-label="Close modal"
                className="p-1 rounded-md text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onLaunch(planModalTier, workspaceInput.trim() || undefined);
                setPlanModalTier(null);
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1.5">
                  Workspace Name
                </label>
                <input
                  value={workspaceInput}
                  onChange={(e) => setWorkspaceInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPlanModalTier(null)}
                  className="flex-1 py-2.5 border border-[#E5E7EB] dark:border-white/[0.08] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] text-[#4B5563] dark:text-[#9CA3AF] rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-md font-semibold transition-colors"
                >
                  Confirm &amp; Launch Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
