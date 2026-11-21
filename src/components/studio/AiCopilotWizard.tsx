import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Calendar, ArrowRight, RefreshCw, PenSquare } from 'lucide-react';
import { ContentCategory, Platform, SocialPost } from '../../types';
import { MEDIA_LIBRARY } from '../../data/defaultState';
import { PLATFORM_META, PlatformTag } from '../common/PlatformMeta';
import { aiService } from '../../services/aiService';
import { ComposerPreset } from './ContentStudio';

interface AiCopilotWizardProps {
  workspaceId: string;
  workspaceName?: string;
  workspaceIndustry?: string;
  categories: ContentCategory[];
  onPopulatePosts: (newPosts: SocialPost[]) => void;
  onOpenInStudio?: (preset: ComposerPreset) => void;
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
  workspaceName = 'Your Brand',
  workspaceIndustry = 'B2B Digital Growth',
  categories,
  onPopulatePosts,
  onOpenInStudio,
  onGoToScheduler,
  onToast,
}: AiCopilotWizardProps) {
  const wsCategories = categories.filter((c) => c.workspaceId === workspaceId);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [brandInput, setBrandInput] = useState(`${workspaceName} — ${workspaceIndustry}`);
  const [goal, setGoal] = useState('Inbound Lead Generation');
  const [audience, setAudience] = useState('Founders, CMOs & RevOps Leaders');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['linkedin', 'instagram', 'x']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBrandInput(`${workspaceName} — ${workspaceIndustry}`);
  }, [workspaceName, workspaceIndustry]);

  const [ratios, setRatios] = useState([
    { label: 'Evergreen Tips', pct: 40, color: '#06B6D4' },
    { label: 'Behind the Scenes', pct: 25, color: '#10B981' },
    { label: 'Curated News', pct: 20, color: '#F97316' },
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
          { label: 'Evergreen Tips', pct: 30, color: '#06B6D4' },
          { label: 'Behind the Scenes', pct: 20, color: '#10B981' },
          { label: 'Curated News', pct: 15, color: '#F97316' },
        ]);
      } else {
        setRatios([
          { label: 'Evergreen Tips', pct: 40, color: '#06B6D4' },
          { label: 'Behind the Scenes', pct: 25, color: '#10B981' },
          { label: 'Curated News', pct: 20, color: '#F97316' },
          { label: 'Promotions', pct: 15, color: '#0EA5E9' },
        ]);
      }

      const tomorrow = new Date(Date.now() + 86400000);
      tomorrow.setHours(9, 0, 0, 0);
      const generatedDays: GeneratedDayPost[] = Array.from({ length: 7 }).map((_, idx) => {
        const slotDate = new Date(tomorrow.getTime() + idx * 86400000);
        const dayLabel = `Day ${idx + 1} (${slotDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })})`;
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
    const startTomorrow = new Date(Date.now() + 86400000);
    startTomorrow.setHours(9, 30, 0, 0);
    const baseDate = startTomorrow.getTime();
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
    onToast('7-Day Strategy Populated', `Added ${createdPosts.length} posts starting tomorrow to your Visual Scheduler.`);
  };

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header & Stepper */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
              <Sparkles size={13} strokeWidth={1.5} /> AI Copilot Strategy Wizard
            </p>
            <h1 className="mt-1 font-display text-xl font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">
              Generate a custom 7-day strategy & auto-fill your calendar
            </h1>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg text-xs font-medium self-start">
            {[
              { n: 1 as const, label: '1. Brand & Goal' },
              { n: 2 as const, label: '2. Category Ratios' },
              { n: 3 as const, label: '3. Populate Calendar' },
            ].map((s) => (
              <button
                key={s.n}
                onClick={() => (s.n === 1 || weekPlan.length > 0) && setStep(s.n)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  step === s.n
                    ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.12]'
                    : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
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
            className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-xl p-6 space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1.5">
                  Brand URL or Niche Description
                </label>
                <input
                  required
                  value={brandInput}
                  onChange={(e) => setBrandInput(e.target.value)}
                  placeholder="https://yourbrand.com — describe your offer..."
                  className="w-full px-3.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] dark:focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1.5">
                  Primary Campaign Goal
                </label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] dark:focus:border-[#06B6D4] rounded-lg text-xs font-medium text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
                >
                  <option value="Inbound Lead Generation">Inbound Lead Generation</option>
                  <option value="Brand Awareness">Brand Awareness & Reach</option>
                  <option value="Community Engagement">Community Engagement</option>
                  <option value="Product Launch">Product Launch Sprint</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1.5">
                Target Ideal Customer Profile (ICP)
              </label>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] dark:focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-2">
                Distribution Channels
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['linkedin', 'instagram', 'x', 'tiktok', 'facebook', 'threads', 'bluesky'] as Platform[]).map((p) => {
                  const active = selectedPlatforms.includes(p);
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        active
                          ? 'border-[#06B6D4] bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                          : 'border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] text-[#6B7280] dark:text-[#9CA3AF] hover:border-[#D1D5DB] dark:hover:border-white/[0.15]'
                      }`}
                    >
                      {PLATFORM_META[p].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-[#E5E7EB] dark:border-white/[0.08]">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] disabled:opacity-50 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
              >
                <Sparkles size={14} strokeWidth={1.5} /> {loading ? 'Building 7-Day Strategy...' : 'Generate 7-Day Content Strategy'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2 & 3: Recommended Category Ratios & 7-Day Lineup */}
        {(step === 2 || step === 3) && (
          <div className="space-y-5">
            {/* Category Ratio Recommendation */}
            <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display text-sm font-semibold tracking-[-0.01em] text-[#111827] dark:text-[#F3F4F6]">
                    Recommended Content Category Mix ({goal})
                  </h2>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                    Balanced for compounding evergreen reach without audience fatigue.
                  </p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="px-2.5 py-1.5 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-lg text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={12} strokeWidth={1.5} /> Adjust Inputs
                </button>
              </div>

              <div className="h-2 rounded-full overflow-hidden flex bg-[#F3F4F6] dark:bg-[#0E1015]">
                {ratios.map((r) => (
                  <div key={r.label} style={{ width: `${r.pct}%`, backgroundColor: r.color }} title={`${r.label}: ${r.pct}%`} />
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                {ratios.map((r) => (
                  <div key={r.label} className="flex items-center justify-between p-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] rounded-lg border border-[#E5E7EB] dark:border-white/[0.08]">
                    <span className="flex items-center gap-2 font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                      <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: r.color }} />
                      {r.label}
                    </span>
                    <span className="font-mono font-semibold text-[#111827] dark:text-[#F3F4F6]">{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 7-Day Post Cards */}
            <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm font-semibold tracking-[-0.01em] text-[#111827] dark:text-[#F3F4F6]">
                    Generated 7-Day Post Schedule (Editable)
                  </h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                    Edit any copy inline, then populate your calendar in one click.
                  </p>
                </div>

                {!populated ? (
                  <button
                    onClick={handlePopulateCalendar}
                    className="px-4 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Calendar size={13} strokeWidth={1.5} /> One-Click Populate Calendar (7 Posts)
                  </button>
                ) : (
                  <button
                    onClick={onGoToScheduler}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Check size={13} strokeWidth={1.5} /> Populated — Open Visual Scheduler <ArrowRight size={13} strokeWidth={1.5} />
                  </button>
                )}
              </div>

              <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
                {weekPlan.map((day, idx) => (
                  <div key={day.dayLabel} className="p-4 flex flex-col md:flex-row gap-4 hover:bg-[#F8F9FB] dark:hover:bg-[#191D26]/50 transition-colors">
                    <div className="w-48 shrink-0 space-y-1.5">
                      <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6] tabular-nums">{day.dayLabel}</p>
                      <p className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400">{day.categoryName}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {day.platforms.map((pl) => (
                          <PlatformTag key={pl} platform={pl} showFull={false} />
                        ))}
                      </div>
                      {onOpenInStudio && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenInStudio({
                              topic: day.content,
                              platforms: day.platforms,
                              categoryId: day.categoryId,
                              evergreen: true,
                            })
                          }
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#6B7280] dark:text-[#9CA3AF] hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                        >
                          <PenSquare size={11} strokeWidth={1.5} /> Edit in Studio
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={day.content}
                      onChange={(e) =>
                        setWeekPlan((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, content: e.target.value } : item))
                        )
                      }
                      className="flex-1 p-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] dark:focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
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
