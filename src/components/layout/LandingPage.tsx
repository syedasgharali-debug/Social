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
  Zap,
  Award,
  ShieldCheck,
  Layers,
  Repeat,
  Send,
  FileDown,
  Copy,
  X,
  SlidersHorizontal,
  Mail,
  Grid3X3,
  Sun,
  Moon,
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
      'Switching from legacy tools to Pro50 gave our 10 client workspaces White-Label PDF reports and a unified inbox our account managers actually love using every morning.',
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
    a: 'No credit card is required to start. Launch your live workspace immediately, test AI Copilot, Category Queues, and the Unified Inbox across all 10 networks, and upgrade only when ready.',
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
    q: 'How do White-Label PDF Client Reports work on Pro Agency & Scale plans?',
    a: 'Agencies upload their own logo, accent color, and client workspace domain so exported monthly PDF performance summaries carry zero socialifyai.com branding.',
  },
  {
    q: 'Can I scale above 25 social profiles cleanly?',
    a: 'Yes—use the Agency Scale slider in the pricing section to step straight into Pro50 (50 profiles), Pro100 (100 profiles), or Pro150 (150 profiles) with instant team seat and workspace expansion.',
  },
];

const AGENCY_SCALE_TIERS: {
  id: PlanTier;
  name: string;
  monthly: number;
  profiles: number;
  workspaces: number;
  users: string;
}[] = [
  { id: 'pro50', name: 'Pro50', monthly: 179, profiles: 50, workspaces: 10, users: '5 Team Users' },
  { id: 'pro100', name: 'Pro100', monthly: 329, profiles: 100, workspaces: 20, users: '10 Team Users' },
  { id: 'pro150', name: 'Pro150', monthly: 449, profiles: 150, workspaces: 35, users: 'Unlimited Users' },
];

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
    { id: 's1', day: 'Mon 09:00', category: 'Educational', color: '#4F46E5', title: '4-1-1 Content Mix Playbook' },
    { id: 's2', day: 'Tue 14:00', category: 'Product', color: '#0EA5E9', title: 'Bluesky + Threads Auto-Sync' },
    { id: 's3', day: 'Wed 11:30', category: 'RSS Curated', color: '#F59E0B', title: '2026 Social Engagement Study' },
    { id: 's4', day: 'Thu 15:00', category: 'Customer ROI', color: '#10B981', title: 'Northstar 3.8x Meta ROAS' },
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

  // Pricing Calculator & Scale Slider
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [scaleIdx, setScaleIdx] = useState<number>(0);
  const [planModalTier, setPlanModalTier] = useState<PlanTier | null>(null);
  const [workspaceInput, setWorkspaceInput] = useState('Acme Cloud');

  // Testimonial Carousel & FAQ
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSaved, setNewsletterSaved] = useState(false);

  const calcPrice = (monthly: number) => (billing === 'annual' ? Math.round(monthly * 0.84) : monthly);
  const activeScaleTier = AGENCY_SCALE_TIERS[scaleIdx];

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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900">
      {/* 1. Sticky Glass Navbar with Dropdown Mega-Menus */}
      <header
        onMouseLeave={() => setOpenMenu(null)}
        className="sticky top-0 z-50 bg-white/80 dark:bg-[#090D16]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
              <Zap size={17} className="fill-current" />
            </div>
            <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              socialifyai<span className="text-[#4F46E5] dark:text-indigo-400">.com</span>
            </span>
          </button>

          {/* Nav Links & Mega Menus */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300 relative">
            <div className="relative">
              <button
                onMouseEnter={() => setOpenMenu('product')}
                onClick={() => setOpenMenu(openMenu === 'product' ? null : 'product')}
                className="flex items-center gap-1 py-2 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
              >
                Product <ChevronDown size={14} />
              </button>
            </div>

            <div className="relative">
              <button
                onMouseEnter={() => setOpenMenu('solutions')}
                onClick={() => setOpenMenu(openMenu === 'solutions' ? null : 'solutions')}
                className="flex items-center gap-1 py-2 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
              >
                Solutions <ChevronDown size={14} />
              </button>
            </div>

            <a href="#showcase" className="hover:text-slate-900 dark:hover:text-white whitespace-nowrap">
              Features
            </a>

            <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white whitespace-nowrap">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                aria-label="Toggle dark mode"
                className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
              >
                {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
              </button>
            )}
            {!isSignedIn && onSignInClick && (
              <button
                onClick={onSignInClick}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => onLaunch(selectedPlan)}
              className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-md shadow-indigo-600/20 whitespace-nowrap flex items-center gap-1.5"
            >
              {isSignedIn ? `Open Dashboard${userDisplayName ? ` (${userDisplayName.split(' ')[0]})` : ''}` : 'Launch Dashboard'}{' '}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Dropdown Mega-Menu Panel */}
        <AnimatePresence>
          {openMenu && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="absolute left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-2xl"
            >
              <div className="max-w-5xl mx-auto px-6 py-6">
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
                          className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-[#4F46E5] bg-slate-50/70 dark:bg-slate-800/50 text-left transition-colors"
                        >
                          <Icon size={17} className="text-[#4F46E5] dark:text-indigo-400 mb-2" />
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        title: 'Solopreneurs',
                        desc: 'Bootstrap ($29/mo) · Automate 5 social profiles with AI Copilot and evergreen loops.',
                        tier: 'bootstrap' as PlanTier,
                      },
                      {
                        title: 'Small Business',
                        desc: 'Accelerate ($49/mo) · Connect 10 networks, unified CRM inbox & campaign approvals.',
                        tier: 'accelerate' as PlanTier,
                      },
                      {
                        title: 'Agencies',
                        desc: 'Pro Agency & Scale ($99–$449/mo) · Multi-client workspaces & White-Label PDF reports.',
                        tier: 'pro_agency' as PlanTier,
                      },
                    ].map((sol) => (
                      <button
                        key={sol.title}
                        onClick={() => {
                          setOpenMenu(null);
                          setPlanModalTier(sol.tier);
                        }}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#4F46E5] bg-slate-50/70 dark:bg-slate-800/50 text-left transition-colors"
                      >
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{sol.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{sol.desc}</p>
                        <span className="mt-2 inline-block text-[11px] font-semibold text-[#4F46E5] dark:text-indigo-400">
                          Explore Plan →
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
      <section className="relative overflow-hidden pt-14 pb-20 md:pt-20 md:pb-24 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-6"
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#4F46E5] dark:text-indigo-400 mb-4">
              <Sparkles size={14} className="text-amber-500" />
              <span>AI Social Management · Category Queues · SCRM</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.07]">
              Plan, Create & Automate a Month of Content in Under an Hour
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              Surpass manual scheduling spreadsheets. Combine AI Copilot strategy, evergreen category queues across 10 social networks, a unified CRM inbox, and white-label client reporting in one luminous workspace.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                onClick={() => setPlanModalTier('accelerate')}
                className="px-6 py-3.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
              >
                Start 14-Day Free Trial — No Card Required <ArrowRight size={16} />
              </button>
              <button
                onClick={handleJumpToAiDemo}
                className="px-5 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles size={15} className="text-amber-500" /> Try Live AI Post Generator
              </button>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <Award size={16} className="text-amber-500" /> G2 Leader 2026 (4.9/5)
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#4F46E5] dark:text-indigo-400" /> Official API Partner (Meta · LinkedIn · TikTok · Bluesky)
              </span>
            </div>
          </motion.div>

          {/* Right 3D-Tilted Live Preview Widget */}
          <div
            className="lg:col-span-6 [perspective:1200px]"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width - 0.5;
              const y = (e.clientY - rect.top) / rect.height - 0.5;
              setTilt({ rx: -y * 8, ry: x * 10 });
            }}
            onMouseLeave={() => setTilt({ rx: -2, ry: 4 })}
          >
            <motion.div
              animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
              transition={{ type: 'spring', stiffness: 180, damping: 20 }}
              className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-2xl shadow-indigo-950/10 dark:shadow-black/50 p-5 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    Scheduler & AI Copilot Live Preview
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                  30 Days Queued
                </span>
              </div>

              {/* Mini AI Output Card */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#4F46E5] dark:text-indigo-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={12} /> AI Copilot · Educational Queue
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <SocialLogo platform="linkedin" size={14} />
                    <SocialLogo platform="x" size={14} />
                    <SocialLogo platform="bluesky" size={14} />
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  “Stop rewriting captions manually. Assign every pillar to an Evergreen Queue and ship 30 days of omnichannel posts in 42 minutes.”
                </p>
              </div>

              {/* Interactive Mini Weekly Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                {[
                  { day: 'Mon · 09:00', cat: 'Educational', color: '#4F46E5', label: 'SaaS GTM Checklist' },
                  { day: 'Wed · 11:30', cat: 'RSS Curated', color: '#F59E0B', label: '2026 Video Benchmarks' },
                  { day: 'Fri · 15:00', cat: 'Product Demo', color: '#10B981', label: 'Unified Inbox Tour' },
                ].map((slot) => (
                  <div
                    key={slot.day}
                    className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: slot.color }} />
                      <span>{slot.day}</span>
                    </div>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white leading-snug">{slot.label}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{slot.cat}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500">
                  {heroSlotDone ? 'Evergreen auto-queue activated for November!' : 'Click to auto-fill remaining 18 slots'}
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
                  className="px-3 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold transition-colors"
                >
                  {heroSlotDone ? 'Filled 100% ✓' : 'Auto-Fill Month'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. Supported 10-Network Animated Icon Dock */}
      <section className="py-10 bg-white dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
            10 NATIVE INTEGRATIONS · PUBLISH, RECYCLE & TRIAGE IN ONE PLACE
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
            {NETWORKS_DOCK.map((net, i) => (
              <motion.div
                key={net.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -4 }}
                className="bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#4F46E5] rounded-xl p-3 text-center shadow-xs hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 mx-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center mb-2 shadow-2xs">
                  <SocialLogo platform={net.id} size={24} />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{net.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{net.type}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Interactive Feature Showcase (4-Tab Luminous Bento Grid) */}
      <section ref={aiSectionRef} id="showcase" className="py-20 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#4F46E5] dark:text-indigo-400">
              INTERACTIVE PRODUCT TOUR
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Test every flagship workflow live right here.
            </h2>
          </div>

          {/* 4 Interactive Tabs */}
          <div className="mt-8 flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-1.5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm w-fit">
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
                  className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    active
                      ? 'bg-[#4F46E5] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Panels */}
          <div className="mt-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/40">
            {activeTab === 'ai' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-4">
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    Live AI Post & Hashtag Generator
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Type any campaign topic, pick your brand tone, and watch AI Copilot generate platform-ready posts + hashtags instantly.
                  </p>
                  <form onSubmit={handleRunLiveAi} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Topic or Blog URL
                      </label>
                      <textarea
                        rows={3}
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        className="w-full p-3 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['B2B SaaS Launch', 'Agency Client Results', 'Productivity Checklist'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAiTopic(preset)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value)}
                        className="px-3 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                      >
                        <option value="Professional">Professional</option>
                        <option value="Witty">Witty</option>
                        <option value="Casual">Casual</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                      <button
                        type="submit"
                        disabled={aiGenerating}
                        className="flex-1 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Sparkles size={14} /> {aiGenerating ? 'Generating...' : 'Generate Live Post'}
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
                      className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400">
                            {card.label}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(card.text);
                              setCopiedPlatform(card.key);
                              onToast?.('Copied to Clipboard', `${card.label} ready to paste.`);
                              setTimeout(() => setCopiedPlatform(null), 1500);
                            }}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                          >
                            <Copy size={11} /> {copiedPlatform === card.key ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                          {card.text}
                        </p>
                      </div>
                      <p className="mt-3 pt-2 border-t border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        {aiResult.hashtags.join(' ')}
                      </p>
                    </div>
                  ))}
                  <div className="md:col-span-2 p-4 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">Instagram Caption:</strong> {aiResult.instagram}
                    </p>
                    <button
                      onClick={() => onLaunch(selectedPlan)}
                      className="px-3.5 py-2 bg-slate-900 dark:bg-[#4F46E5] text-white rounded-lg text-xs font-semibold shrink-0"
                    >
                      Schedule in Workspace →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scheduler' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                      Category Visual Scheduler & Instagram 3×3 Grid
                    </h3>
                    <p className="text-xs text-slate-500">Click any scheduled card to shift slots or preview Instagram visual harmony.</p>
                  </div>
                  <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setSchedulerSubView('calendar')}
                      className={`px-3 py-1.5 rounded-md ${schedulerSubView === 'calendar' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
                    >
                      Category Calendar
                    </button>
                    <button
                      onClick={() => setSchedulerSubView('ig_grid')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 ${schedulerSubView === 'ig_grid' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
                    >
                      <Grid3X3 size={13} /> Instagram 3×3 Grid
                    </button>
                  </div>
                </div>

                {schedulerSubView === 'calendar' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="flex items-center gap-1.5" style={{ color: slot.color }}>
                              <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: slot.color }} />
                              {slot.category}
                            </span>
                            <span className="text-slate-500 tabular-nums">{slot.day}</span>
                          </div>
                          <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{slot.title}</p>
                        </div>
                        <button
                          onClick={() => handleSwapSchedulerSlot(slot.id)}
                          className="mt-4 w-full py-1.5 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1"
                        >
                          <Repeat size={11} /> Move to Next Slot
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-5 grid grid-cols-3 gap-1.5 max-w-sm mx-auto w-full bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      {[mediaWorkspace, mediaTeamCollab, avatarElena, mediaTeamCollab, mediaWorkspace, avatarSarah, avatarMarcus, mediaWorkspace, avatarJames].map(
                        (img, idx) => (
                          <div key={idx} className="aspect-square rounded-md overflow-hidden border border-slate-200/80 dark:border-slate-700 relative">
                            <img src={img} alt={`Grid tile ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        )
                      )}
                    </div>
                    <div className="lg:col-span-7 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        VISUAL FEED PLANNER
                      </p>
                      <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                        Preview your 3×3 Instagram profile grid before posts go live.
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Balance product shots, founder portraits, and editorial team visuals so your grid stays cohesive across every scheduled Reels cover and carousel.
                      </p>
                      <button
                        onClick={() => onLaunch(selectedPlan)}
                        className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold"
                      >
                        Open Full Calendar Studio →
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
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                        simInboxIdx === idx
                          ? 'border-[#4F46E5] bg-indigo-50/60 dark:bg-indigo-950/40'
                          : 'border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/50'
                      }`}
                    >
                      <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {t.name} · <span className="text-[#4F46E5] dark:text-indigo-400">{t.channel}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{t.messages[t.messages.length - 1]}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-7 bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col justify-between min-h-[260px]">
                  <div className="space-y-2.5 max-h-48 overflow-y-auto">
                    {simThreads[simInboxIdx].messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg text-xs max-w-md ${
                          m.startsWith('You:')
                            ? 'ml-auto bg-[#4F46E5] text-white'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {m}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendSimReply} className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSimReplyInput(
                          `Hi ${simThreads[simInboxIdx].name.split(' ')[0]}! Yes—our Pro Agency tier supports custom branding and multi-client workflows. Want a quick link?`
                        )
                      }
                      className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950 text-[#4F46E5] dark:text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Sparkles size={12} /> AI Draft
                    </button>
                    <input
                      value={simReplyInput}
                      onChange={(e) => setSimReplyInput(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 min-w-[180px] px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Send size={12} /> Send
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    White-Label Agency Analytics & PDF Reports
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Customize your agency header, highlight follower growth & pipeline conversions, and export client-ready PDF briefs in one click.
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      White-Label Agency Name
                    </label>
                    <input
                      value={agencyBrand}
                      onChange={(e) => {
                        setAgencyBrand(e.target.value);
                        setReportExported(false);
                      }}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setReportExported(true);
                      onToast?.('White-Label Report Prepared', `${agencyBrand || 'Agency'} November executive brief ready.`);
                    }}
                    className="px-4 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <FileDown size={14} /> {reportExported ? 'White-Label Report Prepared ✓' : 'Generate Sample PDF Summary'}
                  </button>
                </div>

                <div className="lg:col-span-7 bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#4F46E5] dark:text-indigo-400">
                        MONTHLY CLIENT BRIEF · POWERED BY {agencyBrand.toUpperCase() || 'YOUR AGENCY'}
                      </p>
                      <h4 className="font-display text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        Executive Social ROI Summary — November 2026
                      </h4>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 tabular-nums">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-[11px] text-slate-500">Total Reach</p>
                      <p className="font-display text-xl font-extrabold text-slate-900 dark:text-white">117.4k</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-[11px] text-slate-500">Follower Growth</p>
                      <p className="font-display text-xl font-extrabold text-emerald-600">+146%</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-[11px] text-slate-500">CRM Pipeline</p>
                      <p className="font-display text-xl font-extrabold text-[#4F46E5] dark:text-indigo-400">$73.6k</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Interactive Pricing Calculator & Agency Scale Slider */}
      <section id="pricing" className="py-20 bg-white dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-[#4F46E5] dark:text-indigo-400">
              FLEXIBLE SAAS PRICING
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Transparent plans from solo creators to 150-profile agencies.
            </h2>

            {/* Monthly vs Annual (Save 16%) Animated Toggle */}
            <div className="mt-7 inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  billing === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  billing === 'annual'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>Annual</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">Save 16%</span>
              </button>
            </div>
          </div>

          {/* 3 Core Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                id: 'bootstrap' as PlanTier,
                name: 'Bootstrap',
                desc: 'For solopreneurs & emerging creators.',
                monthly: 29,
                limits: '5 Social Profiles · 1 Workspace · 1 User',
                features: [
                  'Category-based Evergreen Scheduling',
                  'AI Copilot Captions & Hashtag Sets',
                  'Visual Calendar + 3×3 IG Grid Planner',
                  'Unified Inbox across all 10 networks',
                ],
              },
              {
                id: 'accelerate' as PlanTier,
                name: 'Accelerate',
                desc: 'For growing brands & small businesses.',
                monthly: 49,
                popular: true,
                limits: '10 Social Profiles · 1 Workspace · 1 User',
                features: [
                  'Everything in Bootstrap, plus:',
                  'Unlimited Evergreen Queues & RSS Imports',
                  'Full Social CRM Pipeline & Lead Scoring',
                  'Content Discovery Trend Spike Alerts',
                ],
              },
              {
                id: 'pro_agency' as PlanTier,
                name: 'Pro Agency',
                desc: 'For agencies managing multiple client brands.',
                monthly: 99,
                limits: '25 Social Profiles · 5 Workspaces · 3 Users',
                features: [
                  'Everything in Accelerate, plus:',
                  'White-Label PDF Client Reports',
                  'Team Approval Workflows & Internal Notes',
                  'Cross-Platform Ad Manager (Meta, TikTok, Google)',
                ],
              },
            ].map((tier) => {
              const price = calcPrice(tier.monthly);
              return (
                <div
                  key={tier.id}
                  className={`rounded-2xl p-7 flex flex-col justify-between bg-[#F8FAFC] dark:bg-slate-900 ${
                    tier.popular
                      ? 'border-2 border-[#4F46E5] shadow-xl shadow-indigo-600/10'
                      : 'border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">{tier.name}</h3>
                      {tier.popular && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Most Popular
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{tier.desc}</p>

                    <div className="mt-6 flex items-baseline gap-1.5">
                      <span className="font-display text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                        ${price}
                      </span>
                      <span className="text-xs text-slate-500">/ month</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {billing === 'annual' ? `Billed annually ($${price * 12}/yr)` : 'Billed monthly'}
                    </p>

                    <div className="mt-4 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {tier.limits}
                    </div>

                    <ul className="mt-5 space-y-2.5">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <Check size={14} className="text-[#4F46E5] dark:text-indigo-400 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => setPlanModalTier(tier.id)}
                    className={`mt-8 w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                      tier.popular
                        ? 'bg-[#4F46E5] hover:bg-indigo-700 text-white'
                        : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white'
                    }`}
                  >
                    Start 14-Day Trial
                  </button>
                </div>
              );
            })}
          </div>

          {/* Agency Scale Interactive Slider (Pro50 $179 / Pro100 $329 / Pro150 $449) */}
          <div className="mt-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <SlidersHorizontal size={14} /> Agency Scale Calculator
                </div>
                <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  Need more than 25 profiles? Slide to scale.
                </h3>

                <div className="pt-2">
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={1}
                    value={scaleIdx}
                    onChange={(e) => setScaleIdx(Number(e.target.value))}
                    aria-label="Agency Scale Tier Slider"
                    className="w-full accent-[#4F46E5] cursor-pointer"
                  />
                  <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
                    {AGENCY_SCALE_TIERS.map((t, idx) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setScaleIdx(idx)}
                        className={scaleIdx === idx ? 'text-[#4F46E5] dark:text-indigo-400 font-bold' : ''}
                      >
                        {t.name} ({t.profiles} profiles)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col sm:flex-row lg:flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
                      {activeScaleTier.name} Agency Scale
                    </span>
                    <span className="font-display text-3xl font-extrabold text-[#4F46E5] dark:text-indigo-400 tabular-nums">
                      ${calcPrice(activeScaleTier.monthly)}
                      <span className="text-xs font-normal text-slate-500">/mo</span>
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                    {activeScaleTier.profiles} Social Profiles · {activeScaleTier.workspaces} Workspaces · {activeScaleTier.users} · White-Label PDFs
                  </p>
                </div>
                <button
                  onClick={() => setPlanModalTier(activeScaleTier.id)}
                  className="w-full py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Select {activeScaleTier.name} Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Social Proof Metrics + Testimonial Carousel + FAQ Accordion */}
      <section className="py-20 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          {/* Metrics Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: '+146%', label: 'Average follower growth in first 90 days' },
              { value: '8 hrs', label: 'Saved per marketer every week on scheduling' },
              { value: '4.9/5', label: 'Verified customer satisfaction rating (G2)' },
              { value: '10', label: 'Major social & local networks supported natively' },
            ].map((m) => (
              <div
                key={m.value}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs"
              >
                <p className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {m.value}
                </p>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-snug">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial Carousel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4 max-w-3xl">
                <img
                  src={activeTestimonial.avatar}
                  alt={activeTestimonial.name}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5">
                    {activeTestimonial.metric}
                  </p>
                  <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed">
                    “{activeTestimonial.quote}”
                  </p>
                  <p className="mt-3 text-xs font-bold text-slate-900 dark:text-white">
                    {activeTestimonial.name}{' '}
                    <span className="font-normal text-slate-500">· {activeTestimonial.role}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setTestimonialIdx((testimonialIdx - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                  aria-label="Previous testimonial"
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setTestimonialIdx((testimonialIdx + 1) % TESTIMONIALS.length)}
                  aria-label="Next testimonial"
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-center text-slate-900 dark:text-white mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={faq.q}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-sm font-bold text-slate-900 dark:text-white"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[#4F46E5]' : 'text-slate-400'}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
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
      <footer className="bg-slate-950 text-slate-300 pt-14 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-800">
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white">
                  <Zap size={17} className="fill-current" />
                </div>
                <span className="font-display text-lg font-extrabold text-white">
                  socialifyai<span className="text-indigo-400">.com</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Luminous AI social media scheduling, evergreen category queues, unified CRM inbox, and agency reporting across 10 networks.
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
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <button type="submit" className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors">
                  Subscribe
                </button>
              </form>
              {newsletterSaved && (
                <p className="text-xs text-emerald-400">Subscribed to weekly Evergreen & AI Copilot templates.</p>
              )}
            </div>

            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8 text-xs">
              <div>
                <h4 className="font-display font-bold text-white uppercase tracking-wider mb-3">Product</h4>
                <ul className="space-y-2 text-slate-400">
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-white transition-colors">Content Studio</button></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-white transition-colors">AI Copilot</button></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-white transition-colors">Visual Scheduler</button></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-white transition-colors">Unified Inbox</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-display font-bold text-white uppercase tracking-wider mb-3">Solutions</h4>
                <ul className="space-y-2 text-slate-400">
                  <li><a href="#pricing" className="hover:text-white transition-colors">Solopreneurs</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Small Business</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Agencies (Pro50–150)</a></li>
                  <li><a href="#showcase" className="hover:text-white transition-colors">White-Label PDF</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-display font-bold text-white uppercase tracking-wider mb-3">Networks</h4>
                <ul className="space-y-2 text-slate-400">
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-white transition-colors">Instagram & Threads</button></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-white transition-colors">TikTok & YouTube Shorts</button></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-white transition-colors">LinkedIn & X (Twitter)</button></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-white transition-colors">Bluesky & Google Business</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-display font-bold text-white uppercase tracking-wider mb-3">Resources</h4>
                <ul className="space-y-2 text-slate-400">
                  <li><a href="#showcase" className="hover:text-white">Features & AI Copilot</a></li>
                  <li><a href="#pricing" className="hover:text-white">Pricing Calculator</a></li>
                  <li><button onClick={() => onLaunch(selectedPlan)} className="hover:text-white">Launch Workspace</button></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} socialifyai.com. All rights reserved.</p>
            <p>10 Networks · Evergreen Automation · Social CRM</p>
          </div>
        </div>
      </footer>

      {/* Plan Confirmation Modal */}
      {planModalTier && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70" onClick={() => setPlanModalTier(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400">
                  14-DAY FREE TRIAL · NO CARD REQUIRED
                </p>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Launch {planModalTier.replace('_', ' ').toUpperCase()} Workspace
                </h3>
              </div>
              <button onClick={() => setPlanModalTier(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
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
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Workspace Name</label>
                <input
                  value={workspaceInput}
                  onChange={(e) => setWorkspaceInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPlanModalTier(null)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-2.5 bg-[#4F46E5] text-white rounded-lg font-semibold">
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
