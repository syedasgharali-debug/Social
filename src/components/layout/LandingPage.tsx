import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Inbox,
  BarChart3,
  Award,
  ShieldCheck,
  Layers,
  Repeat,
  Send,
  FileDown,
  Copy,
  X,
  Mail,
  Grid3X3,
  Sun,
  Moon,
  Infinity as InfinityIcon,
  SlidersHorizontal,
  Minus,
  Plus,
} from 'lucide-react';
import avatarSarah from '../../assets/images/avatar_sarah_1794611198086.jpg';
import avatarMarcus from '../../assets/images/avatar_marcus_1794611199143.jpg';
import avatarElena from '../../assets/images/avatar_elena_1794611198972.jpg';
import avatarJames from '../../assets/images/avatar_james_1794611199572.jpg';
import mediaWorkspace from '../../assets/images/media_workspace_launch_1794611200573.jpg';
import mediaTeamCollab from '../../assets/images/media_team_collab_1794611200467.jpg';
import { PlanTier, Platform } from '../../types';
import { aiService } from '../../services/aiService';
import { SocialLogo } from '../common/SocialIcons';
import { BrandLogo } from '../BrandLogo';

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

const NETWORKS_DOCK: { id: Platform; name: string; type: string }[] = [
  { id: 'instagram', name: 'Instagram', type: 'Reels & 3×3 Grid' },
  { id: 'tiktok', name: 'TikTok', type: 'Short Video & Spark' },
  { id: 'linkedin', name: 'LinkedIn', type: 'Pages & Profiles' },
  { id: 'x', name: 'X (Twitter)', type: 'Threads & Replies' },
  { id: 'facebook', name: 'Facebook', type: 'Pages & Groups' },
  { id: 'youtube', name: 'YouTube Shorts', type: 'Shorts & Comments' },
  { id: 'pinterest', name: 'Pinterest', type: 'Idea Pins & Boards' },
  { id: 'threads', name: 'Threads', type: 'Carousels & Text' },
  { id: 'bluesky', name: 'Bluesky', type: 'AT Protocol Sync' },
  { id: 'gbp', name: 'Google Business', type: 'Updates & Reviews' },
];

const TESTIMONIALS = [
  {
    quote:
      'socialifyai.com cut our monthly content planning from two full days to 45 minutes. Evergreen Category Queues keep our LinkedIn and Instagram consistently growing while DMs route straight to deals.',
    name: 'Sarah Chen',
    role: 'VP of Engineering · TechFlow Systems',
    metric: '+148% organic pipeline',
    avatar: avatarSarah,
  },
  {
    quote:
      'Switching from legacy tools to Agency Scale gave our 10 client workspaces White-Label PDF reports and a unified inbox our account managers actually love using every morning.',
    name: 'Elena Rodriguez',
    role: 'Creative Director · PixelPerfect Agency',
    metric: '9.5 hrs saved weekly',
    avatar: avatarElena,
  },
  {
    quote:
      'Our RevOps team finally connects Bluesky, X, and LinkedIn conversations directly to CRM stages. Median response speed dropped from 11 hours to 22 minutes.',
    name: 'Marcus Wright',
    role: 'Head of RevOps · ScaleGrid Inc',
    metric: '3.4x faster DM triage',
    avatar: avatarMarcus,
  },
  {
    quote:
      'Rolling socialifyai.com out across six portfolio startups gave founders an AI Copilot that sounds authentically human without losing approval governance.',
    name: 'James Wilson',
    role: 'Managing Partner · Vanguard Growth',
    metric: '+162% reach in 90 days',
    avatar: avatarJames,
  },
];

const FAQS = [
  {
    q: 'How does the 14-day free trial work—do I need a credit card?',
    a: 'No credit card is required to start. Launch your live workspace immediately, test AI Copilot, Category Queues, Growth Tools, and the Unified Inbox across all 10 networks, and upgrade only when ready.',
  },
  {
    q: 'How does the $799 Lifetime Plan work—are there any recurring fees?',
    a: 'None at all. You pay $799 once for permanent Lifetime Enterprise access—including unlimited social profiles, unlimited workspaces, unlimited team seats, White-Label PDF reports, full CRM, and all future AI updates forever.',
  },
  {
    q: 'What makes Category-Based Scheduling better than a static calendar?',
    a: 'Instead of manually dragging every single post onto dates forever, you group posts into reusable buckets (Educational, Product, RSS Curated, Customer Wins), assign weekly slots, and let Evergreen posts recycle automatically with expiration caps.',
  },
  {
    q: 'Are Bluesky and Google Business Profile fully supported?',
    a: 'Yes. socialifyai.com supports native publishing, character validation, and inbox monitoring across Instagram, TikTok, LinkedIn, X, Facebook, YouTube Shorts, Pinterest, Threads, Bluesky, and Google Business Profile.',
  },
  {
    q: 'How do White-Label PDF Client Reports work on Agency Scale & Lifetime plans?',
    a: 'Agencies upload their own logo, accent color, and client workspace domain so exported monthly PDF performance summaries carry zero socialifyai.com branding.',
  },
];

const PLAN_LABELS: Record<PlanTier, { name: string; priceTag: string; isLifetime?: boolean }> = {
  bootstrap: { name: 'Starter', priceTag: '$99/mo' },
  accelerate: { name: 'Growth', priceTag: '$199/mo' },
  pro_agency: { name: 'Agency Scale', priceTag: '$349/mo' },
  lifetime: { name: 'Lifetime Enterprise', priceTag: '$799 One-Time (Lifetime)', isLifetime: true },
  pro50: { name: 'Agency Scale', priceTag: '$349/mo' },
  pro100: { name: 'Agency Scale', priceTag: '$349/mo' },
  pro150: { name: 'Lifetime Enterprise', priceTag: '$799 One-Time (Lifetime)', isLifetime: true },
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

  // Hero 3D tilt state
  const [tilt, setTilt] = useState({ rx: -2, ry: 4 });
  const [heroSlotDone, setHeroSlotDone] = useState(false);

  // 4-Tab Showcase state
  const [activeTab, setActiveTab] = useState<'ai' | 'scheduler' | 'inbox' | 'reports'>('ai');
  const aiSectionRef = useRef<HTMLDivElement | null>(null);

  // Tab 1: Live AI Copilot Mini-Demo
  const [aiTopic, setAiTopic] = useState('How B2B teams automate a month of omnichannel content with Evergreen Queues');
  const [aiTone, setAiTone] = useState('Professional');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{
    linkedin: string;
    x: string;
    instagram: string;
    hashtags: string[];
  }>({
    linkedin:
      'Most marketing teams burn 10+ hours every week rebuilding social calendars from scratch.\n\nBy splitting content into Evergreen Categories + Product Launches, your top 20% educational frameworks compound every week while AI Copilot adapts hooks for LinkedIn, X, Bluesky, and Reels automatically.',
    x: 'Stop letting your best posts vanish in 24 hours.\n\n1. Group content into color-coded queues\n2. Auto-recycle evergreen winners\n3. Route every DM straight into CRM deals\n\nPlan 30 days in 45 minutes.',
    instagram:
      'A month of content planned before your morning coffee finishes. Swipe our 4-bucket Category Queue blueprint!',
    hashtags: ['#SocialMediaAutomation', '#EvergreenContent', '#AICopilot', '#AgencyWorkflow'],
  });
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  // Tab 2: Scheduler & Instagram 3x3 Grid
  const [schedulerSubView, setSchedulerSubView] = useState<'calendar' | 'ig_grid'>('calendar');
  const [slots, setSlots] = useState([
    { id: 's1', day: 'Mon 09:00', category: 'Educational', color: '#06B6D4', title: '4-1-1 Content Mix Playbook' },
    { id: 's2', day: 'Tue 14:00', category: 'Product', color: '#10B981', title: 'Bluesky + Threads Auto-Sync' },
    { id: 's3', day: 'Wed 11:30', category: 'RSS Curated', color: '#F97316', title: '2026 Social Engagement Study' },
    { id: 's4', day: 'Thu 15:00', category: 'Customer ROI', color: '#64748B', title: 'Northstar 3.8x Meta ROAS' },
  ]);

  // Tab 3: Simulated Inbox Reply
  const [simInboxIdx, setSimInboxIdx] = useState(0);
  const [simThreads, setSimThreads] = useState([
    {
      name: 'Sarah Chen',
      channel: 'LinkedIn DM',
      avatar: avatarSarah,
      messages: ['Can your Pro Agency plan manage 25 client profiles with approval workflows?'],
    },
    {
      name: 'Elena Rodriguez',
      channel: 'Instagram Comment',
      avatar: avatarElena,
      messages: ['The 3×3 Grid Planner saved our studio hours this morning!'],
    },
    {
      name: 'James Wilson',
      channel: 'Bluesky Mention',
      avatar: avatarJames,
      messages: ['Testing socialifyai.com across 6 startups—does White-Label PDF export support custom logos?'],
    },
  ]);
  const [simReplyInput, setSimReplyInput] = useState('');

  // Tab 4: White-Label Report Builder
  const [agencyBrand, setAgencyBrand] = useState('Apex Digital Studio');
  const [reportExported, setReportExported] = useState(false);

  // Pricing Calculator & Agency Scale Sliders
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [calcProfiles, setCalcProfiles] = useState<number>(50);
  const [calcWorkspaces, setCalcWorkspaces] = useState<number>(8);
  const [calcSeats, setCalcSeats] = useState<number>(6);
  const [planModalTier, setPlanModalTier] = useState<PlanTier | null>(null);
  const [workspaceInput, setWorkspaceInput] = useState('Acme Cloud');

  // Testimonial Carousel & FAQ
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSaved, setNewsletterSaved] = useState(false);

  const calcPrice = (monthly: number) => (billing === 'annual' ? Math.round(monthly * 0.84) : monthly);

  // Live Agency Scale Calculator computation ($99 Starter -> $199 Growth -> $349 Agency Scale -> $799 Lifetime)
  const scaleRecommendation = (() => {
    if (calcProfiles <= 10 && calcWorkspaces <= 1 && calcSeats <= 2) {
      const unitMonthly = calcPrice(99);
      const yearCost = unitMonthly * 12;
      return {
        id: 'bootstrap' as PlanTier,
        name: 'Starter',
        isLifetime: false,
        displayPrice: unitMonthly,
        priceLabel: `$${unitMonthly}/mo`,
        limitsSummary: 'Up to 10 Social Profiles · 1 Workspace · 2 Team Users',
        yearCost,
        lifetimeSavings: Math.max(0, yearCost - 799),
        breakEvenMonths: (799 / unitMonthly).toFixed(1),
      };
    }
    if (calcProfiles <= 25 && calcWorkspaces <= 5 && calcSeats <= 5) {
      const unitMonthly = calcPrice(199);
      const yearCost = unitMonthly * 12;
      return {
        id: 'accelerate' as PlanTier,
        name: 'Growth',
        isLifetime: false,
        displayPrice: unitMonthly,
        priceLabel: `$${unitMonthly}/mo`,
        limitsSummary: 'Up to 25 Social Profiles · 5 Workspaces · 5 Team Users',
        yearCost,
        lifetimeSavings: Math.max(0, yearCost - 799),
        breakEvenMonths: (799 / unitMonthly).toFixed(1),
      };
    }
    if (calcProfiles <= 75 && calcWorkspaces <= 15 && calcSeats <= 15) {
      const unitMonthly = calcPrice(349);
      const yearCost = unitMonthly * 12;
      return {
        id: 'pro_agency' as PlanTier,
        name: 'Agency Scale',
        isLifetime: false,
        displayPrice: unitMonthly,
        priceLabel: `$${unitMonthly}/mo`,
        limitsSummary: 'Up to 75 Social Profiles · 15 Workspaces · 15 Team Users · White-Label PDFs',
        yearCost,
        lifetimeSavings: Math.max(0, yearCost - 799),
        breakEvenMonths: (799 / unitMonthly).toFixed(1),
      };
    }
    const equivAgencyMonthly = calcPrice(349);
    const equivYearCost = equivAgencyMonthly * 12;
    return {
      id: 'lifetime' as PlanTier,
      name: 'Lifetime Deal',
      isLifetime: true,
      displayPrice: 799,
      priceLabel: '$799 one-time',
      limitsSummary: 'Unlimited Social Profiles · Unlimited Workspaces · Unlimited Users · White-Label PDFs',
      yearCost: 799,
      lifetimeSavings: Math.max(0, equivYearCost - 799),
      breakEvenMonths: (799 / equivAgencyMonthly).toFixed(1),
    };
  })();

  const handleRunLiveAi = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setAiGenerating(true);
    try {
      const res = await aiService.repurposeContent(aiTopic, aiTone);
      setAiResult({
        linkedin: res.linkedin,
        x: res.x,
        instagram: res.instagram,
        hashtags: res.hashtags,
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleJumpToAiDemo = () => {
    setActiveTab('ai');
    aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSwapSchedulerSlot = (id: string) => {
    const nextOrder = ['Mon 09:00', 'Tue 14:00', 'Wed 11:30', 'Thu 15:00', 'Fri 10:00'];
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const currIdx = nextOrder.indexOf(s.day);
        return { ...s, day: nextOrder[(currIdx + 1) % nextOrder.length] };
      })
    );
    onToast?.('Scheduler Slot Shifted', 'Moved card to next available weekly queue slot.');
  };

  const handleSendSimReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simReplyInput.trim()) return;
    setSimThreads((prev) =>
      prev.map((t, i) =>
        i === simInboxIdx ? { ...t, messages: [...t.messages, `You: ${simReplyInput.trim()}`] } : t
      )
    );
    onToast?.('Reply Sent', `Delivered to ${simThreads[simInboxIdx].name} (${simThreads[simInboxIdx].channel}).`);
    setSimReplyInput('');
  };

  const activeTestimonial = TESTIMONIALS[testimonialIdx];

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#090A0D] text-[#111827] dark:text-[#F3F4F6] selection:bg-cyan-500/20 selection:text-cyan-900 dark:selection:text-cyan-200">
      {/* 1. Sticky Hairline Navbar with Dropdown Mega-Menus */}
      <header
        onMouseLeave={() => setOpenMenu(null)}
        className="sticky top-0 z-50 bg-[#FFFFFF] dark:bg-[#090A0D] border-b border-[#E5E7EB] dark:border-white/[0.08]"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
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
            <BrandLogo size="lg" surface="auto" />
          </a>

          {/* Nav Links & Mega Menus */}
          <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-[#4B5563] dark:text-[#9CA3AF] relative">
            <div className="relative">
              <button
                onMouseEnter={() => setOpenMenu('product')}
                onClick={() => setOpenMenu(openMenu === 'product' ? null : 'product')}
                className="flex items-center gap-1 py-2 hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors whitespace-nowrap"
              >
                Product <ChevronDown size={14} strokeWidth={1.5} />
              </button>
            </div>

            <div className="relative">
              <button
                onMouseEnter={() => setOpenMenu('solutions')}
                onClick={() => setOpenMenu(openMenu === 'solutions' ? null : 'solutions')}
                className="flex items-center gap-1 py-2 hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors whitespace-nowrap"
              >
                Solutions <ChevronDown size={14} strokeWidth={1.5} />
              </button>
            </div>

            <a href="#showcase" className="hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors whitespace-nowrap">
              Features
            </a>

            <a href="#pricing" className="hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors whitespace-nowrap">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                aria-label="Toggle dark mode"
                className="p-2 border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#13161D] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] text-[#4B5563] dark:text-[#9CA3AF] rounded-md transition-colors"
              >
                {darkMode ? <Sun size={15} strokeWidth={1.5} className="text-[#F97316]" /> : <Moon size={15} strokeWidth={1.5} />}
              </button>
            )}
            {!isSignedIn && onSignInClick && (
              <button
                onClick={onSignInClick}
                className="px-3.5 py-2 border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#13161D] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] text-[#111827] dark:text-[#F3F4F6] text-xs font-medium rounded-md transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => onLaunch(selectedPlan)}
              className="px-4 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              {isSignedIn ? `Open Dashboard${userDisplayName ? ` (${userDisplayName.split(' ')[0]})` : ''}` : 'Launch Dashboard'}{' '}
              <ArrowRight size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Dropdown Mega-Menu Panel */}
        <AnimatePresence>
          {openMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="absolute left-0 right-0 bg-[#FFFFFF] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08]"
            >
              <div className="max-w-5xl mx-auto px-6 py-5">
                {openMenu === 'product' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {[
                      { title: 'Content Studio', desc: 'Compose & preview across 10 channels.', tab: 'scheduler' as const, icon: Layers },
                      { title: 'AI Copilot', desc: 'Instant captions, hooks & strategy.', tab: 'ai' as const, icon: Sparkles },
                      { title: 'Visual Scheduler', desc: 'Evergreen queues & 3×3 IG grid.', tab: 'scheduler' as const, icon: Calendar },
                      { title: 'Unified Inbox', desc: 'Triage DMs & turn replies into deals.', tab: 'inbox' as const, icon: Inbox },
                      { title: 'Analytics', desc: 'White-label PDF client reports.', tab: 'reports' as const, icon: BarChart3 },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.title}
                          onClick={() => {
                            setActiveTab(item.tab);
                            setOpenMenu(null);
                            aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className="p-3.5 rounded-lg border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] dark:hover:border-cyan-500/50 bg-[#F8F9FB] dark:bg-[#13161D] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] text-left transition-colors"
                        >
                          <Icon size={16} strokeWidth={1.5} className="text-[#4B5563] dark:text-[#9CA3AF] mb-2" />
                          <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">{item.title}</p>
                          <p className="mt-0.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{item.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        title: 'Founders & Creators',
                        desc: 'Starter ($99/mo) · Automate 10 social profiles with AI Copilot, Growth Tools & evergreen loops.',
                        tier: 'bootstrap' as PlanTier,
                      },
                      {
                        title: 'Growth Teams',
                        desc: 'Growth ($199/mo) · Connect 25 profiles, full Social CRM pipeline, Competitor Spy & Trend Radar.',
                        tier: 'accelerate' as PlanTier,
                      },
                      {
                        title: 'Agencies & Lifetime',
                        desc: 'Agency Scale ($349/mo) or Lifetime ($799 one-time) · Unlimited workspaces & White-Label PDFs forever.',
                        tier: 'lifetime' as PlanTier,
                      },
                    ].map((sol) => (
                      <button
                        key={sol.title}
                        onClick={() => {
                          setOpenMenu(null);
                          setPlanModalTier(sol.tier);
                        }}
                        className="p-4 rounded-lg border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] dark:hover:border-cyan-500/50 bg-[#F8F9FB] dark:bg-[#13161D] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] text-left transition-colors"
                      >
                        <p className="text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">{sol.title}</p>
                        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">{sol.desc}</p>
                        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                          Explore Plan <ArrowRight size={11} strokeWidth={1.5} />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. Hero Section + Interactive 3D-Tilted Live Preview Widget */}
      <section className="relative overflow-hidden pt-14 pb-20 md:pt-20 md:pb-24 border-b border-[#E5E7EB] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Copy */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-6"
          >
            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-400 mb-4">
              <Sparkles size={13} strokeWidth={1.5} />
              <span>AI Social Management · Category Queues · SCRM</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] text-[#111827] dark:text-[#F3F4F6] leading-[1.06]">
              Plan, Create & Automate a Month of Content in Under an Hour
            </h1>

            <p className="mt-5 text-[15px] sm:text-base text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed max-w-xl">
              Surpass manual scheduling spreadsheets. Combine AI Copilot strategy, evergreen category queues across 10 social networks, a unified CRM inbox, and white-label client reporting in one precision workspace.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setPlanModalTier('accelerate')}
                className="px-5 py-3 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-md text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Start 14-Day Free Trial — No Card Required <ArrowRight size={15} strokeWidth={1.5} />
              </button>
              <button
                onClick={handleJumpToAiDemo}
                className="px-5 py-3 bg-[#FFFFFF] dark:bg-[#13161D] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles size={14} strokeWidth={1.5} className="text-cyan-600 dark:text-cyan-400" /> Try Live AI Post Generator
              </button>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 pt-6 border-t border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center gap-6 text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF]">
              <span className="flex items-center gap-2">
                <Award size={15} strokeWidth={1.5} className="text-[#F97316]" /> G2 Leader 2026 (4.9/5)
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck size={15} strokeWidth={1.5} className="text-cyan-600 dark:text-cyan-400" /> Official API Partner (Meta · LinkedIn · TikTok · Bluesky)
              </span>
            </div>
          </motion.div>

          {/* Right 3D-Tilted Live Preview Widget */}
          <div
            className="lg:col-span-6 [perspective:1200px] p-3 rounded-xl border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F3F4F6] dark:bg-[#0E1015] canvas-dot-grid"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width - 0.5;
              const y = (e.clientY - rect.top) / rect.height - 0.5;
              setTilt({ rx: -y * 6, ry: x * 8 });
            }}
            onMouseLeave={() => setTilt({ rx: -2, ry: 4 })}
          >
            <motion.div
              animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-lg p-5 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D1D5DB] dark:bg-white/20" />
                  <span className="w-2 h-2 rounded-full bg-[#D1D5DB] dark:bg-white/20" />
                  <span className="w-2 h-2 rounded-full bg-[#D1D5DB] dark:bg-white/20" />
                  <span className="ml-1.5 text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Scheduler & AI Copilot Live Preview
                  </span>
                </div>
                <span className="text-[11px] font-mono font-medium text-cyan-600 dark:text-cyan-400 tabular-nums">
                  30 DAYS QUEUED
                </span>
              </div>

              {/* Mini AI Output Card */}
              <div className="p-3.5 rounded-md bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={12} strokeWidth={1.5} /> AI Copilot · Educational Queue
                  </span>
                  <span className="flex items-center gap-1.5 text-[#6B7280]">
                    <SocialLogo platform="linkedin" size={14} />
                    <SocialLogo platform="x" size={14} />
                    <SocialLogo platform="bluesky" size={14} />
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
                  “Stop rewriting captions manually. Assign every pillar to an Evergreen Queue and ship 30 days of omnichannel posts in 42 minutes.”
                </p>
              </div>

              {/* Interactive Mini Weekly Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                {[
                  { day: 'Mon · 09:00', cat: 'Educational', color: '#06B6D4', label: 'SaaS GTM Checklist' },
                  { day: 'Wed · 11:30', cat: 'RSS Curated', color: '#F97316', label: '2026 Video Benchmarks' },
                  { day: 'Fri · 15:00', cat: 'Product Demo', color: '#10B981', label: 'Unified Inbox Tour' },
                ].map((slot) => (
                  <div
                    key={slot.day}
                    className="p-3 rounded-md bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]"
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                      <span className="w-1.5 h-1.5 rounded-xs shrink-0" style={{ backgroundColor: slot.color }} />
                      <span>{slot.day}</span>
                    </div>
                    <p className="mt-1.5 font-semibold text-[#111827] dark:text-[#F3F4F6] leading-snug">{slot.label}</p>
                    <p className="mt-1 text-[10px] text-[#6B7280]">{slot.cat}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08]">
                <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                  {heroSlotDone ? 'Evergreen auto-queue activated for November.' : 'Click to auto-fill remaining 18 slots'}
                </span>
                <button
                  onClick={() => {
                    const next = !heroSlotDone;
                    setHeroSlotDone(next);
                    onToast?.(
                      next ? 'Evergreen Auto-Fill Activated' : 'Preview Reset',
                      next ? '18 November slots populated across Educational & Product queues.' : undefined
                    );
                  }}
                  className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-md text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                >
                  {heroSlotDone ? (
                    <>
                      <Check size={12} strokeWidth={2} /> Filled 100%
                    </>
                  ) : (
                    'Auto-Fill Month'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. Supported 10-Network Animated Icon Dock */}
      <section className="py-10 bg-[#FFFFFF] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[11px] font-mono uppercase tracking-[0.14em] text-[#6B7280] dark:text-[#9CA3AF] mb-6">
            10 NATIVE INTEGRATIONS · PUBLISH, RECYCLE & TRIAGE IN ONE PLACE
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
            {NETWORKS_DOCK.map((net, i) => (
              <motion.div
                key={net.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.025 }}
                whileHover={{ y: -2 }}
                className="bg-[#F8F9FB] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] dark:hover:border-cyan-500/50 rounded-lg p-3 text-center transition-colors"
              >
                <div className="w-9 h-9 mx-auto rounded-md bg-[#FFFFFF] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-center mb-2">
                  <SocialLogo platform={net.id} size={20} />
                </div>
                <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6] truncate">{net.name}</p>
                <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] truncate mt-0.5">{net.type}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Interactive Feature Showcase (4-Tab Precision Bento) */}
      <section ref={aiSectionRef} id="showcase" className="py-20 border-b border-[#E5E7EB] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-400">
              INTERACTIVE PRODUCT TOUR
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">
              Test every flagship workflow live right here.
            </h2>
          </div>

          {/* 4 Interactive Tabs */}
          <div className="mt-8 flex flex-wrap gap-1.5 bg-[#FFFFFF] dark:bg-[#0E1015] p-1 border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg w-fit">
            {(
              [
                { id: 'ai', label: '1. AI Copilot & Strategy Builder', icon: Sparkles },
                { id: 'scheduler', label: '2. Category Visual Scheduler', icon: Calendar },
                { id: 'inbox', label: '3. Unified Social Inbox', icon: Inbox },
                { id: 'reports', label: '4. White-Label PDF Reports', icon: BarChart3 },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-md text-xs font-medium flex items-center gap-2 transition-colors ${
                    active
                      ? 'bg-[#111827] text-white dark:bg-[#FFFFFF] dark:text-[#090A0D]'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26]'
                  }`}
                >
                  <Icon size={14} strokeWidth={1.5} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Panels */}
          <div className="mt-6 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-6 md:p-8">
            {activeTab === 'ai' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-4">
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">
                    Live AI Post & Hashtag Generator
                  </h3>
                  <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                    Type any campaign topic, pick your brand tone, and watch AI Copilot generate platform-ready posts + hashtags instantly.
                  </p>
                  <form onSubmit={handleRunLiveAi} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1.5">
                        Topic or Blog URL
                      </label>
                      <textarea
                        rows={3}
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        className="w-full p-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-xs text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['B2B SaaS Launch', 'Agency Client Results', 'Productivity Checklist'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAiTopic(preset)}
                          className="px-2.5 py-1 bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] rounded-md text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value)}
                        className="px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-xs font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                      >
                        <option value="Professional">Professional</option>
                        <option value="Witty">Witty</option>
                        <option value="Casual">Casual</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                      <button
                        type="submit"
                        disabled={aiGenerating}
                        className="flex-1 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                      >
                        <Sparkles size={13} strokeWidth={1.5} /> {aiGenerating ? 'Generating...' : 'Generate Live Post'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'linkedin', label: 'LinkedIn Executive Post', text: aiResult.linkedin },
                    { key: 'x', label: 'X / Bluesky Hook', text: aiResult.x },
                  ].map((card) => (
                    <div
                      key={card.key}
                      className="p-4 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                            {card.label}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(card.text);
                              setCopiedPlatform(card.key);
                              onToast?.('Copied to Clipboard', `${card.label} ready to paste.`);
                              setTimeout(() => setCopiedPlatform(null), 1500);
                            }}
                            className="text-[11px] font-medium text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] flex items-center gap-1 transition-colors"
                          >
                            <Copy size={11} strokeWidth={1.5} /> {copiedPlatform === card.key ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] whitespace-pre-line leading-relaxed">
                          {card.text}
                        </p>
                      </div>
                      <p className="mt-3 pt-2.5 border-t border-[#E5E7EB] dark:border-white/[0.08] text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                        {aiResult.hashtags.join(' ')}
                      </p>
                    </div>
                  ))}
                  <div className="md:col-span-2 p-4 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                      <strong className="text-[#111827] dark:text-[#F3F4F6] font-semibold">Instagram Caption:</strong> {aiResult.instagram}
                    </p>
                    <button
                      onClick={() => onLaunch(selectedPlan)}
                      className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-md text-xs font-semibold shrink-0 inline-flex items-center gap-1.5 transition-colors"
                    >
                      Schedule in Workspace <ArrowRight size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scheduler' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">
                      Category Visual Scheduler & Instagram 3×3 Grid
                    </h3>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Click any scheduled card to shift slots or preview Instagram visual harmony.</p>
                  </div>
                  <div className="inline-flex bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] p-1 rounded-md text-xs font-medium">
                    <button
                      onClick={() => setSchedulerSubView('calendar')}
                      className={`px-3 py-1.5 rounded-sm transition-colors ${schedulerSubView === 'calendar' ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]' : 'text-[#6B7280] dark:text-[#9CA3AF]'}`}
                    >
                      Category Calendar
                    </button>
                    <button
                      onClick={() => setSchedulerSubView('ig_grid')}
                      className={`px-3 py-1.5 rounded-sm flex items-center gap-1.5 transition-colors ${schedulerSubView === 'ig_grid' ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]' : 'text-[#6B7280] dark:text-[#9CA3AF]'}`}
                    >
                      <Grid3X3 size={13} strokeWidth={1.5} /> Instagram 3×3 Grid
                    </button>
                  </div>
                </div>

                {schedulerSubView === 'calendar' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-4 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="flex items-center gap-1.5 font-medium" style={{ color: slot.color }}>
                              <span className="w-1.5 h-1.5 rounded-xs" style={{ backgroundColor: slot.color }} />
                              {slot.category}
                            </span>
                            <span className="text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">{slot.day}</span>
                          </div>
                          <p className="mt-2.5 text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">{slot.title}</p>
                        </div>
                        <button
                          onClick={() => handleSwapSchedulerSlot(slot.id)}
                          className="mt-4 w-full py-1.5 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] dark:hover:border-cyan-500/50 rounded-md text-[11px] font-medium text-[#4B5563] dark:text-[#D1D5DB] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Repeat size={11} strokeWidth={1.5} /> Move to Next Slot
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-5 grid grid-cols-3 gap-1.5 max-w-sm mx-auto w-full bg-[#F3F4F6] dark:bg-[#0E1015] p-2 rounded-lg border border-[#E5E7EB] dark:border-white/[0.08]">
                      {[mediaWorkspace, mediaTeamCollab, avatarElena, mediaTeamCollab, mediaWorkspace, avatarSarah, avatarMarcus, mediaWorkspace, avatarJames].map(
                        (img, idx) => (
                          <div key={idx} className="aspect-square rounded-sm overflow-hidden border border-[#E5E7EB] dark:border-white/[0.08] relative">
                            <img src={img} alt={`Grid tile ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        )
                      )}
                    </div>
                    <div className="lg:col-span-7 space-y-3">
                      <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-400">
                        VISUAL FEED PLANNER
                      </p>
                      <h4 className="text-lg font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">
                        Preview your 3×3 Instagram profile grid before posts go live.
                      </h4>
                      <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                        Balance product shots, founder portraits, and editorial team visuals so your grid stays cohesive across every scheduled Reels cover and carousel.
                      </p>
                      <button
                        onClick={() => onLaunch(selectedPlan)}
                        className="px-4 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        Open Full Calendar Studio <ArrowRight size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'inbox' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-2">
                  {simThreads.map((t, idx) => (
                    <button
                      key={t.name}
                      onClick={() => setSimInboxIdx(idx)}
                      className={`w-full p-3.5 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                        simInboxIdx === idx
                          ? 'border-[#06B6D4] bg-cyan-500/[0.05] dark:bg-cyan-500/[0.08]'
                          : 'border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] hover:border-[#D1D5DB] dark:hover:border-white/[0.15]'
                      }`}
                    >
                      <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-md object-cover border border-[#E5E7EB] dark:border-white/[0.08]" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                          {t.name} · <span className="text-cyan-600 dark:text-cyan-400 font-medium">{t.channel}</span>
                        </p>
                        <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{t.messages[t.messages.length - 1]}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-7 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-5 flex flex-col justify-between min-h-[260px]">
                  <div className="space-y-2.5 max-h-48 overflow-y-auto">
                    {simThreads[simInboxIdx].messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-md text-xs max-w-md ${
                          m.startsWith('You:')
                            ? 'ml-auto bg-[#111827] text-white dark:bg-[#FFFFFF] dark:text-[#090A0D]'
                            : 'bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] text-[#111827] dark:text-[#F3F4F6]'
                        }`}
                      >
                        {m}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendSimReply} className="mt-4 pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSimReplyInput(
                          `Hi ${simThreads[simInboxIdx].name.split(' ')[0]}! Yes—our Pro Agency tier supports custom branding and multi-client workflows. Want a quick link?`
                        )
                      }
                      className="px-3 py-2 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] text-cyan-600 dark:text-cyan-400 rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Sparkles size={12} strokeWidth={1.5} /> AI Draft
                    </button>
                    <input
                      value={simReplyInput}
                      onChange={(e) => setSimReplyInput(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 min-w-[180px] px-3 py-2 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-xs text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Send size={12} strokeWidth={1.5} /> Send
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">
                    White-Label Agency Analytics & PDF Reports
                  </h3>
                  <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                    Customize your agency header, highlight follower growth & pipeline conversions, and export client-ready PDF briefs in one click.
                  </p>
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1.5">
                      White-Label Agency Name
                    </label>
                    <input
                      value={agencyBrand}
                      onChange={(e) => {
                        setAgencyBrand(e.target.value);
                        setReportExported(false);
                      }}
                      className="w-full px-3.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-xs text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setReportExported(true);
                      onToast?.('White-Label Report Prepared', `${agencyBrand || 'Agency'} November executive brief ready.`);
                    }}
                    className="px-4 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {reportExported ? (
                      <>
                        <Check size={14} strokeWidth={1.75} /> White-Label Report Prepared
                      </>
                    ) : (
                      <>
                        <FileDown size={14} strokeWidth={1.5} /> Generate Sample PDF Summary
                      </>
                    )}
                  </button>
                </div>

                <div className="lg:col-span-7 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-400">
                        MONTHLY CLIENT BRIEF · POWERED BY {agencyBrand.toUpperCase() || 'YOUR AGENCY'}
                      </p>
                      <h4 className="text-base font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6] mt-1">
                        Executive Social ROI Summary — November 2026
                      </h4>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 tabular-nums">
                    <div className="p-3.5 bg-[#FFFFFF] dark:bg-[#13161D] rounded-md border border-[#E5E7EB] dark:border-white/[0.08]">
                      <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Total Reach</p>
                      <p className="font-mono text-xl font-semibold text-[#111827] dark:text-[#F3F4F6] mt-1">117.4k</p>
                    </div>
                    <div className="p-3.5 bg-[#FFFFFF] dark:bg-[#13161D] rounded-md border border-[#E5E7EB] dark:border-white/[0.08]">
                      <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Follower Growth</p>
                      <p className="font-mono text-xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">+146%</p>
                    </div>
                    <div className="p-3.5 bg-[#FFFFFF] dark:bg-[#13161D] rounded-md border border-[#E5E7EB] dark:border-white/[0.08]">
                      <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">CRM Pipeline</p>
                      <p className="font-mono text-xl font-semibold text-cyan-600 dark:text-cyan-400 mt-1">$73.6k</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Pricing Plans ($99 Starter to $799 Lifetime) */}
      <section id="pricing" className="py-20 bg-[#FFFFFF] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-400">
              TRANSPARENT PRICING · STARTING AT $99
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">
              Plans from $99/mo up to $799 Lifetime Access.
            </h2>
            <p className="mt-3 text-sm text-[#4B5563] dark:text-[#9CA3AF]">
              Start on a flexible monthly plan or lock in unlimited agency &amp; AI features forever with a single $799 one-time payment.
            </p>

            {/* Monthly vs Annual (Save 16%) Toggle */}
            <div className="mt-7 inline-flex items-center p-1 bg-[#F3F4F6] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-4 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                  billing === 'monthly'
                    ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                    : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`px-4 py-1.5 rounded-sm text-xs font-medium transition-colors flex items-center gap-2 ${
                  billing === 'annual'
                    ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                    : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                }`}
              >
                <span>Annual</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono text-[11px]">Save 16%</span>
              </button>
            </div>
          </div>

          {/* 4-Tier Pricing Grid: $99 -> $199 -> $349 -> $799 Lifetime */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              {
                id: 'bootstrap' as PlanTier,
                name: 'Starter',
                desc: 'For creators & lean brand teams launching omnichannel automation.',
                monthly: 99,
                isLifetime: false,
                limits: '10 Social Profiles · 1 Workspace · 2 Users',
                features: [
                  'Category-based Evergreen Scheduling',
                  'AI Copilot Captions, Hooks & Hashtags',
                  'Visual Calendar + 3×3 IG Grid Planner',
                  'Unified Inbox across all 10 networks',
                  'UTM Builder & ROI / ROAS Calculator',
                ],
                cta: 'Start 14-Day Trial',
              },
              {
                id: 'accelerate' as PlanTier,
                name: 'Growth',
                desc: 'For scaling businesses turning social conversations into revenue.',
                monthly: 199,
                popular: true,
                isLifetime: false,
                limits: '25 Social Profiles · 5 Workspaces · 5 Users',
                features: [
                  'Everything in Starter, plus:',
                  'Full Social CRM Pipeline & Lead Scoring',
                  'AI Competitor Spy & Live Trend Radar',
                  '1→10 Content Repurposer & Hook Lab',
                  'Unlimited Evergreen Queues & RSS Imports',
                ],
                cta: 'Start 14-Day Trial',
              },
              {
                id: 'pro_agency' as PlanTier,
                name: 'Agency Scale',
                desc: 'For agencies managing high-volume multi-client rosters.',
                monthly: 349,
                isLifetime: false,
                limits: '75 Social Profiles · 15 Workspaces · 15 Users',
                features: [
                  'Everything in Growth, plus:',
                  'White-Label PDF Client Reports',
                  'Team Approval Workflows & Audit Logs',
                  'Cross-Platform Ad Manager (Meta, TikTok, Google)',
                  'Priority API Quotas & Dedicated Support',
                ],
                cta: 'Start 14-Day Trial',
              },
              {
                id: 'lifetime' as PlanTier,
                name: 'Lifetime Deal',
                desc: 'Pay once, own Socialify AI forever. Zero recurring subscriptions.',
                monthly: 799,
                isLifetime: true,
                limits: 'Unlimited Profiles · Unlimited Workspaces · Unlimited Users',
                features: [
                  'Everything in Agency Scale — Forever',
                  'Single $799 One-Time Payment (No Monthly Bills)',
                  'Unlimited Team Seats & Client Portals',
                  'Custom White-Label Domain & Branding',
                  'All Future AI Tools & Upgrades Included',
                ],
                cta: 'Claim Lifetime — $799',
              },
            ].map((tier) => {
              const displayPrice = tier.isLifetime ? tier.monthly : calcPrice(tier.monthly);
              return (
                <div
                  key={tier.id}
                  className={`rounded-lg p-6 flex flex-col justify-between transition-colors ${
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
                          tier.isLifetime ? 'text-[#F3F4F6]' : 'text-[#111827] dark:text-[#F3F4F6]'
                        }`}
                      >
                        {tier.isLifetime && <InfinityIcon size={17} strokeWidth={1.5} className="text-[#06B6D4] shrink-0" />}
                        {tier.name}
                      </h3>
                      {tier.popular && (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                          Most Popular
                        </span>
                      )}
                      {tier.isLifetime && (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#F97316]">
                          Pay Once
                        </span>
                      )}
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
                      <span className={`text-xs font-mono ${tier.isLifetime ? 'text-cyan-400' : 'text-[#6B7280] dark:text-[#9CA3AF]'}`}>
                        {tier.isLifetime ? '/ lifetime' : '/ month'}
                      </span>
                    </div>
                    <p className={`mt-1 text-[11px] ${tier.isLifetime ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                      {tier.isLifetime
                        ? 'One-time payment · Never pay again'
                        : billing === 'annual'
                        ? `Billed annually ($${displayPrice * 12}/yr)`
                        : 'Billed monthly · Cancel anytime'}
                    </p>

                    <div
                      className={`mt-4 p-2.5 rounded-md text-[11px] font-medium leading-snug ${
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
                    onClick={() => setPlanModalTier(tier.id)}
                    className={`mt-8 w-full py-2.5 rounded-md text-xs font-semibold transition-colors ${
                      tier.isLifetime
                        ? 'bg-[#FFFFFF] hover:bg-[#E5E7EB] text-[#090A0D]'
                        : tier.popular
                        ? 'bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D]'
                        : 'bg-[#FFFFFF] dark:bg-[#191D26] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.12]'
                    }`}
                  >
                    {tier.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Interactive Agency Scale & Lifetime Savings Calculator */}
          <div className="mt-10 bg-[#F8F9FB] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[#F97316]">
                    <SlidersHorizontal size={13} strokeWidth={1.5} /> Agency Scale Calculator
                  </div>
                  <h3 className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">
                    Need more than 25 profiles? Slide to scale.
                  </h3>
                  <p className="mt-1 text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                    Drag any slider or click a preset below to match your exact profile, workspace, and team size.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '10 Profiles (Starter)', p: 10, w: 1, s: 2 },
                    { label: '25 Profiles (Growth)', p: 25, w: 5, s: 5 },
                    { label: '75 Profiles (Agency)', p: 75, w: 15, s: 12 },
                    { label: '150+ Profiles (Lifetime)', p: 150, w: 25, s: 25 },
                  ].map((preset) => {
                    const isSelected =
                      calcProfiles === preset.p && calcWorkspaces === preset.w && calcSeats === preset.s;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setCalcProfiles(preset.p);
                          setCalcWorkspaces(preset.w);
                          setCalcSeats(preset.s);
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-[#111827] border-[#111827] text-white dark:bg-[#FFFFFF] dark:border-[#FFFFFF] dark:text-[#090A0D]'
                            : 'bg-[#FFFFFF] dark:bg-[#0E1015] border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#9CA3AF] hover:border-[#06B6D4] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Slider 1: Social Profiles */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#111827] dark:text-[#F3F4F6]">Social Profiles</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Decrease social profiles"
                        onClick={() => setCalcProfiles((v) => Math.max(5, v - 5))}
                        className="w-6 h-6 rounded-sm border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#0E1015] flex items-center justify-center hover:border-[#06B6D4] transition-colors"
                      >
                        <Minus size={12} strokeWidth={1.5} />
                      </button>
                      <span className="min-w-[68px] text-center font-mono font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">
                        {calcProfiles >= 250 ? '250+' : calcProfiles}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase social profiles"
                        onClick={() => setCalcProfiles((v) => Math.min(250, v + 5))}
                        className="w-6 h-6 rounded-sm border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#0E1015] flex items-center justify-center hover:border-[#06B6D4] transition-colors"
                      >
                        <Plus size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={250}
                    step={5}
                    value={calcProfiles}
                    onChange={(e) => setCalcProfiles(Number(e.target.value))}
                    onInput={(e) => setCalcProfiles(Number((e.target as HTMLInputElement).value))}
                    aria-label="Social profiles slider"
                    className="w-full h-1.5 rounded-full accent-[#06B6D4] cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-[#6B7280] tabular-nums">
                    <span>5</span>
                    <span>25</span>
                    <span>75</span>
                    <span>150</span>
                    <span>250+</span>
                  </div>
                </div>

                {/* Slider 2 & 3: Workspaces & Team Seats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#111827] dark:text-[#F3F4F6]">Client Workspaces</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Decrease client workspaces"
                          onClick={() => setCalcWorkspaces((v) => Math.max(1, v - 1))}
                          className="w-6 h-6 rounded-sm border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#0E1015] flex items-center justify-center hover:border-[#06B6D4] transition-colors"
                        >
                          <Minus size={12} strokeWidth={1.5} />
                        </button>
                        <span className="min-w-[36px] text-center font-mono font-semibold text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                          {calcWorkspaces >= 30 ? '30+' : calcWorkspaces}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase client workspaces"
                          onClick={() => setCalcWorkspaces((v) => Math.min(30, v + 1))}
                          className="w-6 h-6 rounded-sm border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#0E1015] flex items-center justify-center hover:border-[#06B6D4] transition-colors"
                        >
                          <Plus size={12} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={calcWorkspaces}
                      onChange={(e) => setCalcWorkspaces(Number(e.target.value))}
                      onInput={(e) => setCalcWorkspaces(Number((e.target as HTMLInputElement).value))}
                      aria-label="Client workspaces slider"
                      className="w-full h-1.5 rounded-full accent-[#06B6D4] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#111827] dark:text-[#F3F4F6]">Team Seats</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Decrease team seats"
                          onClick={() => setCalcSeats((v) => Math.max(1, v - 1))}
                          className="w-6 h-6 rounded-sm border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#0E1015] flex items-center justify-center hover:border-[#06B6D4] transition-colors"
                        >
                          <Minus size={12} strokeWidth={1.5} />
                        </button>
                        <span className="min-w-[36px] text-center font-mono font-semibold text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                          {calcSeats >= 30 ? '30+' : calcSeats}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase team seats"
                          onClick={() => setCalcSeats((v) => Math.min(30, v + 1))}
                          className="w-6 h-6 rounded-sm border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#0E1015] flex items-center justify-center hover:border-[#06B6D4] transition-colors"
                        >
                          <Plus size={12} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={calcSeats}
                      onChange={(e) => setCalcSeats(Number(e.target.value))}
                      onInput={(e) => setCalcSeats(Number((e.target as HTMLInputElement).value))}
                      aria-label="Team seats slider"
                      className="w-full h-1.5 rounded-full accent-[#06B6D4] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Result Card */}
              <div
                className={`lg:col-span-5 rounded-lg p-6 space-y-4 border ${
                  scaleRecommendation.isLifetime
                    ? 'bg-[#090A0D] text-[#F3F4F6] border-[#06B6D4]'
                    : 'bg-[#FFFFFF] dark:bg-[#0E1015] border-[#E5E7EB] dark:border-white/[0.08]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-[10px] font-mono uppercase tracking-[0.14em] ${
                        scaleRecommendation.isLifetime ? 'text-[#F97316]' : 'text-cyan-600 dark:text-cyan-400'
                      }`}
                    >
                      Recommended Plan
                    </p>
                    <h4
                      className={`text-xl font-semibold tracking-[-0.02em] flex items-center gap-1.5 mt-1 ${
                        scaleRecommendation.isLifetime ? 'text-[#FFFFFF]' : 'text-[#111827] dark:text-[#F3F4F6]'
                      }`}
                    >
                      {scaleRecommendation.isLifetime && <InfinityIcon size={17} strokeWidth={1.5} className="text-[#06B6D4]" />}
                      {scaleRecommendation.name}
                    </h4>
                  </div>
                  <div className="text-right tabular-nums">
                    <span
                      className={`font-mono text-3xl font-semibold ${
                        scaleRecommendation.isLifetime ? 'text-[#06B6D4]' : 'text-[#111827] dark:text-[#F3F4F6]'
                      }`}
                    >
                      ${scaleRecommendation.displayPrice}
                    </span>
                    <span
                      className={`text-[11px] font-mono block ${
                        scaleRecommendation.isLifetime ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
                      }`}
                    >
                      {scaleRecommendation.isLifetime ? 'one-time lifetime' : `/ month (${billing})`}
                    </span>
                  </div>
                </div>

                <p
                  className={`text-xs leading-relaxed ${
                    scaleRecommendation.isLifetime ? 'text-[#9CA3AF]' : 'text-[#4B5563] dark:text-[#9CA3AF]'
                  }`}
                >
                  {scaleRecommendation.limitsSummary}
                </p>

                {/* Live Savings Breakdown */}
                <div
                  className={`p-3.5 rounded-md text-xs space-y-1.5 tabular-nums ${
                    scaleRecommendation.isLifetime
                      ? 'bg-[#13161D] border border-white/[0.08]'
                      : 'bg-[#F8F9FB] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08]'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className={scaleRecommendation.isLifetime ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}>
                      Your Configuration
                    </span>
                    <span className="font-mono font-medium">
                      {calcProfiles} profiles · {calcWorkspaces} ws · {calcSeats} seats
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={scaleRecommendation.isLifetime ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}>
                      {scaleRecommendation.isLifetime ? 'Lifetime Payment (Year 1+)' : '12-Month Subscription Total'}
                    </span>
                    <span className="font-mono font-semibold">${scaleRecommendation.yearCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      $799 Lifetime Break-Even
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                      {scaleRecommendation.breakEvenMonths} mo · Save ${scaleRecommendation.lifetimeSavings.toLocaleString()}/yr
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPlanModalTier(scaleRecommendation.id)}
                    className={`w-full py-2.5 rounded-md text-xs font-semibold transition-colors ${
                      scaleRecommendation.isLifetime
                        ? 'bg-[#FFFFFF] hover:bg-[#E5E7EB] text-[#090A0D]'
                        : 'bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D]'
                    }`}
                  >
                    Select {scaleRecommendation.name} ({scaleRecommendation.priceLabel})
                  </button>
                  {!scaleRecommendation.isLifetime && (
                    <button
                      type="button"
                      onClick={() => setPlanModalTier('lifetime')}
                      className="w-full py-2 rounded-md border border-[#F97316]/40 bg-orange-500/[0.06] hover:bg-orange-500/[0.12] text-[#F97316] text-xs font-medium transition-colors"
                    >
                      Or Lock In $799 Lifetime Deal (Save ${scaleRecommendation.lifetimeSavings.toLocaleString()} in Year 1)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Social Proof Metrics + Testimonial Carousel + FAQ Accordion */}
      <section className="py-20 border-b border-[#E5E7EB] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          {/* Metrics Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { value: '+146%', label: 'Average follower growth in first 90 days' },
              { value: '8 hrs', label: 'Saved per marketer every week on scheduling' },
              { value: '4.9/5', label: 'Verified customer satisfaction rating (G2)' },
              { value: '10', label: 'Major social & local networks supported natively' },
            ].map((m) => (
              <div
                key={m.value}
                className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-6"
              >
                <p className="font-mono text-3xl sm:text-4xl font-semibold text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                  {m.value}
                </p>
                <p className="mt-2 text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-snug">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial Carousel */}
          <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4 max-w-3xl">
                <img
                  src={activeTestimonial.avatar}
                  alt={activeTestimonial.name}
                  className="w-12 h-12 rounded-md object-cover border border-[#E5E7EB] dark:border-white/[0.08] shrink-0"
                />
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-400 mb-1.5">
                    {activeTestimonial.metric}
                  </p>
                  <p className="text-sm sm:text-[15px] text-[#111827] dark:text-[#F3F4F6] leading-relaxed">
                    “{activeTestimonial.quote}”
                  </p>
                  <p className="mt-3 text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    {activeTestimonial.name}{' '}
                    <span className="font-normal text-[#6B7280] dark:text-[#9CA3AF]">· {activeTestimonial.role}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setTestimonialIdx((testimonialIdx - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                  aria-label="Previous testimonial"
                  className="p-2 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] text-[#4B5563] dark:text-[#9CA3AF] transition-colors"
                >
                  <ChevronLeft size={16} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setTestimonialIdx((testimonialIdx + 1) % TESTIMONIALS.length)}
                  aria-label="Next testimonial"
                  className="p-2 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] text-[#4B5563] dark:text-[#9CA3AF] transition-colors"
                >
                  <ChevronRight size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-center text-[#111827] dark:text-[#F3F4F6] mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-2.5">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={faq.q}
                    className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        size={16}
                        strokeWidth={1.5}
                        className={`shrink-0 transition-transform ${isOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : 'text-[#6B7280]'}`}
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
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Column Footer */}
      <footer className="bg-[#0E1015] text-[#9CA3AF] pt-14 pb-10 border-t border-white/[0.08]">
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
                Precision AI social media scheduling, evergreen category queues, unified CRM inbox, and agency reporting across 10 networks.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newsletterEmail.trim()) return;
                  setNewsletterSaved(true);
                  onToast?.('Subscribed to Newsletter', `Weekly AI & Evergreen templates sent to ${newsletterEmail.trim()}.`);
                  setNewsletterEmail('');
                }}
                className="flex gap-2 max-w-sm"
              >
                <div className="relative flex-1">
                  <Mail size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-8 pr-3 py-2 bg-[#13161D] border border-white/[0.08] rounded-md text-xs text-[#F3F4F6] placeholder:text-[#6B7280] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <button type="submit" className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#E5E7EB] text-[#090A0D] rounded-md text-xs font-semibold transition-colors">
                  Subscribe
                </button>
              </form>
              {newsletterSaved && (
                <p className="text-xs text-emerald-400">Subscribed to weekly Evergreen & AI Copilot templates.</p>
              )}
            </div>

            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8 text-xs">
              <div>
                <h4 className="font-mono text-[11px] font-semibold text-[#F3F4F6] uppercase tracking-[0.14em] mb-3">Product</h4>
                <ul className="space-y-2 text-[#9CA3AF]">
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-[#F3F4F6] transition-colors">Content Studio</button></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-[#F3F4F6] transition-colors">AI Copilot</button></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-[#F3F4F6] transition-colors">Visual Scheduler</button></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-[#F3F4F6] transition-colors">Unified Inbox</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-mono text-[11px] font-semibold text-[#F3F4F6] uppercase tracking-[0.14em] mb-3">Solutions</h4>
                <ul className="space-y-2 text-[#9CA3AF]">
                  <li><a href="#pricing" className="hover:text-[#F3F4F6] transition-colors">Starter ($99/mo)</a></li>
                  <li><a href="#pricing" className="hover:text-[#F3F4F6] transition-colors">Growth ($199/mo)</a></li>
                  <li><a href="#pricing" className="hover:text-[#F3F4F6] transition-colors">Agency &amp; Lifetime ($799)</a></li>
                  <li><a href="#showcase" className="hover:text-[#F3F4F6] transition-colors">White-Label PDF</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-mono text-[11px] font-semibold text-[#F3F4F6] uppercase tracking-[0.14em] mb-3">Networks</h4>
                <ul className="space-y-2 text-[#9CA3AF]">
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-[#F3F4F6] transition-colors">Instagram & Threads</button></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-[#F3F4F6] transition-colors">TikTok & YouTube Shorts</button></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-[#F3F4F6] transition-colors">LinkedIn & X (Twitter)</button></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-[#F3F4F6] transition-colors">Bluesky & Google Business</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-mono text-[11px] font-semibold text-[#F3F4F6] uppercase tracking-[0.14em] mb-3">Resources</h4>
                <ul className="space-y-2 text-[#9CA3AF]">
                  <li><a href="#showcase" className="hover:text-[#F3F4F6] transition-colors">Features & AI Copilot</a></li>
                  <li><a href="#pricing" className="hover:text-[#F3F4F6] transition-colors">Pricing Calculator</a></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-[#F3F4F6] transition-colors">Launch Workspace</button></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
            <p>© {new Date().getFullYear()} socialifyai.com. All rights reserved.</p>
            <p>10 Networks · Evergreen Automation · Social CRM</p>
          </div>
        </div>
      </footer>

      {/* Plan Confirmation Modal */}
      {planModalTier && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#090A0D]/75" onClick={() => setPlanModalTier(null)} />
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
                onClick={() => setPlanModalTier(null)}
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
                  Confirm & Launch Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
