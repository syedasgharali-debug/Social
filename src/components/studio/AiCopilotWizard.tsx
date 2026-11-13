import React, { useState } from 'react';
import { Sparkles, Check, Calendar, ArrowRight, RefreshCw } from 'lucide-react';
import { ContentCategory, Platform, SocialPost } from '../../types';
import { MEDIA_LIBRARY } from '../../data/seedData';
import { PLATFORM_META, PlatformTag } from '../common/PlatformMeta';
import { aiService } from '../../services/aiService';

interface AiCopilotWizardProps {
  workspaceId: string;
  categories: ContentCategory[];
  onPopulatePosts: (newPosts: SocialPost[]) => void;
  onGoToScheduler: () => void;
  onToast: (title: string, description?: string) => void;
}

interface GeneratedDayPost {
  dayOffset: number;
  dayLabel: string;
  categoryName: string;
  categoryId?: string;
  platforms: Platform[];
  content: string;
}

export function AiCopilotWizard({
  workspaceId,
  categories,
  onPopulatePosts,
  onGoToScheduler,
  onToast,
}: AiCopilotWizardProps) {
  const wsCategories = categories.filter((c) => c.workspaceId === workspaceId);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [brandInput, setBrandInput] = useState('https://digixy.io — B2B Social Growth Agency');
  const [goal, setGoal] = useState('Inbound Lead Generation');
  const [audience, setAudience] = useState('Founders, CMOs & RevOps Leaders');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['linkedin', 'instagram', 'x']);
  const [loading, setLoading] = useState(false);

  const [ratios, setRatios] = useState([
    { label: 'Evergreen Tips', pct: 40, color: '#4F46E5' },
    { label: 'Behind the Scenes', pct: 25, color: '#10B981' },
    { label: 'Curated News', pct: 20, color: '#F59E0B' },
    { label: 'Promotions', pct: 15, color: '#0EA5E9' },
  ]);
  const [weekPlan, setWeekPlan] = useState<GeneratedDayPost[]>([]);
  const [populated, setPopulated] = useState(false);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((item) => item !== p) : prev) : [...prev, p]
    );
  };

  const handleGenerateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandInput.trim()) return;
    setLoading(true);
    setPopulated(false);
    try {
      const bulk = await aiService.generateBulkContent(
        `${brandInput} (${goal})`,
        audience,
        'Professional',
        selectedPlatforms
      );

      if (goal === 'Product Launch') {
        setRatios([
          { label: 'Promotions', pct: 35, color: '#0EA5E9' },
          { label: 'Evergreen Tips', pct: 30, color: '#4F46E5' },
          { label: 'Behind the Scenes', pct: 20, color: '#10B981' },
          { label: 'Curated News', pct: 15, color: '#F59E0B' },
        ]);
      } else {
        setRatios([
          { label: 'Evergreen Tips', pct: 40, color: '#4F46E5' },
          { label: 'Behind the Scenes', pct: 25, color: '#10B981' },
          { label: 'Curated News', pct: 20, color: '#F59E0B' },
          { label: 'Promotions', pct: 15, color: '#0EA5E9' },
        ]);
      }

      const dayNames = ['Day 1 (Mon)', 'Day 2 (Tue)', 'Day 3 (Wed)', 'Day 4 (Thu)', 'Day 5 (Fri)', 'Day 6 (Sat)', 'Day 7 (Sun)'];
      const generatedDays: GeneratedDayPost[] = dayNames.map((dayLabel, idx) => {
        const cat = wsCategories[idx % Math.max(1, wsCategories.length)];
        const draftSource = bulk.drafts?.[idx % Math.max(1, bulk.drafts.length)];
        return {
          dayOffset: idx + 1,
          dayLabel,
          categoryName: cat?.name || 'Evergreen Tips',
          categoryId: cat?.id,
          platforms: selectedPlatforms.slice(0, 2),
          content:
            draftSource?.content ||
            `[${goal}] ${brandInput}: Actionable insight #${idx + 1} tailored for ${audience}.`,
        };
      });

      setWeekPlan(generatedDays);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handlePopulateCalendar = () => {
    const baseDate = new Date('2026-11-16T09:00:00Z').getTime();
    const createdPosts: SocialPost[] = weekPlan.map((item, idx) => ({
      id: `p-ai-${Date.now()}-${idx}`,
      workspaceId,
      categoryId: item.categoryId,
      platforms: item.platforms,
      content: item.content,
      media: idx % 2 === 0 ? [MEDIA_LIBRARY[idx % MEDIA_LIBRARY.length].url] : undefined,
      status: 'scheduled',
      isEvergreen: !item.categoryName.toLowerCase().includes('promo'),
      maxShares: 6,
      shareCount: 0,
      scheduledAt: new Date(baseDate + idx * 86400000).toISOString(),
    }));

    onPopulatePosts(createdPosts);
    setPopulated(true);
    setStep(3);
    onToast('7-Day Strategy Populated', `Added ${createdPosts.length} posts to your Visual Scheduler.`);
  };

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header & Stepper */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#4F46E5] dark:text-indigo-400 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" /> AI COPILOT STRATEGY WIZARD
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
              Generate a custom 7-day strategy & auto-fill your calendar
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            {[
              { n: 1 as const, label: '1. Brand & Goal' },
              { n: 2 as const, label: '2. Category Ratios' },
              { n: 3 as const, label: '3. Populate Calendar' },
            ].map((s) => (
              <button
                key={s.n}
                onClick={() => (s.n === 1 || weekPlan.length > 0) && setStep(s.n)}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  step === s.n
                    ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 1: Brand & Goal Input */}
        {step === 1 && (
          <form
            onSubmit={handleGenerateStrategy}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-5 shadow-sm"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Brand URL or Niche Description
                </label>
                <input
                  required
                  value={brandInput}
                  onChange={(e) => setBrandInput(e.target.value)}
                  placeholder="https://yourbrand.com — describe your offer..."
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Primary Campaign Goal
                </label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-[#4F46E5]"
                >
                  <option value="Inbound Lead Generation">Inbound Lead Generation</option>
                  <option value="Brand Awareness">Brand Awareness & Reach</option>
                  <option value="Community Engagement">Community Engagement</option>
                  <option value="Product Launch">Product Launch Sprint</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Target Ideal Customer Profile (ICP)
              </label>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Distribution Channels
              </label>
              <div className="flex flex-wrap gap-2">
                {(['linkedin', 'instagram', 'x', 'tiktok', 'facebook', 'threads', 'bluesky'] as Platform[]).map((p) => {
                  const active = selectedPlatforms.includes(p);
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        active
                          ? 'border-[#4F46E5] bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      {PLATFORM_META[p].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20"
              >
                <Sparkles size={15} /> {loading ? 'Building 7-Day Strategy...' : 'Generate 7-Day Content Strategy'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2 & 3: Recommended Category Ratios & 7-Day Lineup */}
        {(step === 2 || step === 3) && (
          <div className="space-y-6">
            {/* Category Ratio Recommendation */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Recommended Content Category Mix ({goal})
                  </h2>
                  <p className="text-xs text-slate-500">Balanced for compounding evergreen reach without audience fatigue.</p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Adjust Inputs
                </button>
              </div>

              <div className="h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                {ratios.map((r) => (
                  <div key={r.label} style={{ width: `${r.pct}%`, backgroundColor: r.color }} title={`${r.label}: ${r.pct}%`} />
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                {ratios.map((r) => (
                  <div key={r.label} className="flex items-center justify-between p-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                      <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: r.color }} />
                      {r.label}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 7-Day Post Cards */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Generated 7-Day Post Schedule (Editable)
                  </h3>
                  <p className="text-xs text-slate-500">Edit any copy inline, then populate your calendar in one click.</p>
                </div>

                {!populated ? (
                  <button
                    onClick={handlePopulateCalendar}
                    className="px-5 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Calendar size={14} /> One-Click Populate Calendar (7 Posts)
                  </button>
                ) : (
                  <button
                    onClick={onGoToScheduler}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Check size={14} /> Populated! Open Visual Scheduler <ArrowRight size={14} />
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {weekPlan.map((day, idx) => (
                  <div key={day.dayLabel} className="p-5 flex flex-col md:flex-row gap-4">
                    <div className="w-44 shrink-0 space-y-1.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{day.dayLabel}</p>
                      <p className="text-[11px] font-semibold text-[#4F46E5] dark:text-indigo-400">{day.categoryName}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {day.platforms.map((pl) => (
                          <PlatformTag key={pl} platform={pl} showFull={false} />
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={day.content}
                      onChange={(e) =>
                        setWeekPlan((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, content: e.target.value } : item))
                        )
                      }
                      className="flex-1 p-3 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
