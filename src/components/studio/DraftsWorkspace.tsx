import React, { useState, useMemo } from 'react';
import { Sparkles, Calendar, Trash2, Edit3, Search, X, FileText } from 'lucide-react';
import { Draft, DraftStatus, Platform, ContentCategory } from '../../types';
import { aiService } from '../../services/aiService';
import { ALL_PLATFORMS, PLATFORM_META, PlatformTag } from '../common/PlatformMeta';
import { EmptyStatePanel } from '../common/DesignPrimitives';

interface DraftsWorkspaceProps {
  workspaceId: string;
  drafts: Draft[];
  categories: ContentCategory[];
  onUpdateDraft: (draft: Draft) => void;
  onAddDrafts: (newDrafts: Draft[]) => void;
  onDeleteDraft: (id: string) => void;
  onEditInComposer: (draft: Draft) => void;
  onScheduleDraft: (draft: Draft, scheduledAt: string, categoryId?: string) => void;
  onToast: (title: string, description?: string) => void;
}

const STATUS_LABELS: Record<DraftStatus, string> = {
  idea: 'Idea',
  ai_draft: 'AI Draft',
  needs_review: 'Needs Review',
  ready: 'Ready',
};

export function DraftsWorkspace({
  workspaceId,
  drafts,
  categories,
  onUpdateDraft,
  onAddDrafts,
  onDeleteDraft,
  onEditInComposer,
  onScheduleDraft,
  onToast,
}: DraftsWorkspaceProps) {
  const wsDrafts = drafts.filter((d) => d.workspaceId === workspaceId);
  const wsCategories = categories.filter((c) => c.workspaceId === workspaceId);

  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  // Bulk AI Generator State
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('B2B SaaS Marketing & RevOps Leaders');
  const [tone, setTone] = useState('Professional');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['linkedin', 'x', 'instagram']);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Schedule Modal State
  const [schedulingDraft, setSchedulingDraft] = useState<Draft | null>(null);
  const [scheduleDate, setScheduleDate] = useState('2026-11-19T10:00');
  const [scheduleCatId, setScheduleCatId] = useState<string>(wsCategories[0]?.id || '');

  const filteredDrafts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wsDrafts.filter((d) => {
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchesQ =
        !q || d.topic.toLowerCase().includes(q) || d.content.toLowerCase().includes(q);
      return matchesStatus && matchesQ;
    });
  }, [wsDrafts, statusFilter, search]);

  const handleTogglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((item) => item !== p) : prev) : [...prev, p]
    );
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setBulkLoading(true);
    try {
      const res = await aiService.generateBulkContent(topic.trim(), audience, tone, selectedPlatforms);
      const generated: Draft[] = (res.drafts || []).map((item: { platform: string; content: string }, idx: number) => ({
        id: `dr-${Date.now()}-${idx}`,
        workspaceId,
        categoryId: wsCategories[0]?.id,
        topic: topic.trim(),
        platforms: [(ALL_PLATFORMS.includes(item.platform as Platform) ? item.platform : selectedPlatforms[0]) as Platform],
        content: item.content,
        status: 'ai_draft',
        createdAt: new Date().toISOString(),
      }));
      onAddDrafts(generated);
      onToast('Bulk Drafts Generated', `Created ${generated.length} platform-native drafts.`);
      setTopic('');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Bulk AI Content Studio Bar */}
      <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} strokeWidth={1.5} className="text-cyan-600 dark:text-cyan-400" />
          <h3 className="font-display text-sm font-semibold tracking-[-0.01em] text-[#111827] dark:text-[#F3F4F6]">
            AI Bulk Content & Campaign Generator
          </h3>
        </div>
        <form onSubmit={handleBulkGenerate} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Campaign topic or URL (e.g. Q1 Evergreen Launch)"
              className="md:col-span-1 px-3.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
            />
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Target audience"
              className="px-3.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
            />
            <div className="flex gap-2">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-xs font-medium text-[#111827] dark:text-[#F3F4F6] outline-none"
              >
                <option value="Professional">Professional Tone</option>
                <option value="Witty">Witty & Bold</option>
                <option value="Casual">Casual & Warm</option>
                <option value="Urgent">Direct & Urgent</option>
              </select>
              <button
                type="submit"
                disabled={bulkLoading || !topic.trim()}
                className="px-4 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] disabled:opacity-50 rounded-lg text-xs font-medium shrink-0 transition-colors"
              >
                {bulkLoading ? 'Generating...' : 'Generate 5 Drafts'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-medium text-[#6B7280] dark:text-[#9CA3AF] mr-1">Target Platforms:</span>
            {ALL_PLATFORMS.map((p) => {
              const active = selectedPlatforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleTogglePlatform(p)}
                  className={`px-2.5 py-1 rounded-md border font-medium transition-colors ${
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
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex flex-wrap bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] p-1 rounded-lg text-xs font-medium">
          {(['all', 'idea', 'ai_draft', 'needs_review', 'ready'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md transition-colors tabular-nums ${
                statusFilter === st
                  ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.12]'
                  : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
              }`}
            >
              {st === 'all' ? `All (${wsDrafts.length})` : STATUS_LABELS[st]}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter drafts..."
            className="w-full pl-8 pr-3 py-2 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
          />
        </div>
      </div>

      {/* Draft Cards */}
      {filteredDrafts.length === 0 ? (
        <EmptyStatePanel
          icon={FileText}
          title={wsDrafts.length === 0 ? 'No drafts yet' : 'No matching drafts'}
          description={
            wsDrafts.length === 0
              ? 'Use the AI Bulk Generator above or save work-in-progress posts from the Content Studio to build your draft backlog.'
              : 'Adjust your status filter or search query to view your other saved drafts.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDrafts.map((draft) => (
            <div
              key={draft.id}
              className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-xl p-5 flex flex-col justify-between transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {draft.platforms.map((pl) => (
                      <PlatformTag key={pl} platform={pl} showFull={false} />
                    ))}
                  </div>
                  <select
                    aria-label="Draft Status"
                    value={draft.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as DraftStatus;
                      onUpdateDraft({ ...draft, status: nextStatus });
                      onToast('Draft Status Updated', `${draft.topic} marked as ${STATUS_LABELS[nextStatus]}.`);
                    }}
                    className="text-[11px] font-medium bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded px-2 py-0.5 text-[#111827] dark:text-[#F3F4F6] outline-none"
                  >
                    {(Object.keys(STATUS_LABELS) as DraftStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">{draft.topic}</p>
                <p className="mt-2 text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">{draft.content}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditInComposer(draft)}
                    className="px-2.5 py-1.5 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] rounded-md text-[11px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1 transition-colors"
                  >
                    <Edit3 size={12} strokeWidth={1.5} /> Edit in Composer
                  </button>
                  <button
                    onClick={() => {
                      setSchedulingDraft(draft);
                      setScheduleCatId(draft.categoryId || wsCategories[0]?.id || '');
                    }}
                    className="px-2.5 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <Calendar size={12} strokeWidth={1.5} /> Schedule
                  </button>
                </div>
                <button
                  onClick={() => {
                    onDeleteDraft(draft.id);
                    onToast('Draft Removed');
                  }}
                  aria-label="Delete draft"
                  className="p-1.5 text-[#6B7280] hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Date/Time Picker Modal */}
      {schedulingDraft && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSchedulingDraft(null)} />
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="font-display text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">
                Schedule Draft to Calendar
              </h3>
              <button onClick={() => setSchedulingDraft(null)} className="text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div className="mt-4 space-y-3.5 text-xs">
              <p className="p-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg text-[#4B5563] dark:text-[#9CA3AF] line-clamp-3">
                {schedulingDraft.content}
              </p>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1">
                  Publish Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg font-mono text-[#111827] dark:text-[#F3F4F6] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1">
                  Content Category Queue
                </label>
                <select
                  value={scheduleCatId}
                  onChange={(e) => setScheduleCatId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-[#111827] dark:text-[#F3F4F6] outline-none"
                >
                  {wsCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSchedulingDraft(null)}
                  className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-lg font-medium text-[#4B5563] dark:text-[#9CA3AF]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onScheduleDraft(
                      schedulingDraft,
                      new Date(scheduleDate).toISOString(),
                      scheduleCatId || undefined
                    );
                    setSchedulingDraft(null);
                  }}
                  className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-lg font-medium transition-colors"
                >
                  Confirm Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
