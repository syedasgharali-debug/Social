import React, { useState, useMemo } from 'react';
import { Sparkles, Calendar, Trash2, Edit3, Search, X } from 'lucide-react';
import { Draft, DraftStatus, Platform, ContentCategory } from '../../types';
import { aiService } from '../../services/aiService';
import { ALL_PLATFORMS, PLATFORM_META, PlatformTag } from '../common/PlatformMeta';

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
    <div className="space-y-6">
      {/* Bulk AI Content Studio Bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-[#4F46E5]" />
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
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
              className="md:col-span-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#4F46E5]"
            />
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Target audience"
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#4F46E5]"
            />
            <div className="flex gap-2">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none"
              >
                <option value="Professional">Professional Tone</option>
                <option value="Witty">Witty & Bold</option>
                <option value="Casual">Casual & Warm</option>
                <option value="Urgent">Direct & Urgent</option>
              </select>
              <button
                type="submit"
                disabled={bulkLoading || !topic.trim()}
                className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shrink-0"
              >
                {bulkLoading ? 'Generating...' : 'Generate 5 Drafts'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="font-semibold text-slate-500">Target Platforms:</span>
            {ALL_PLATFORMS.map((p) => {
              const active = selectedPlatforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleTogglePlatform(p)}
                  className={`px-2.5 py-1 rounded-md border font-semibold transition-colors ${
                    active
                      ? 'border-[#4F46E5] bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
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
        <div className="inline-flex flex-wrap bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-1 rounded-lg text-xs font-semibold">
          {(['all', 'idea', 'ai_draft', 'needs_review', 'ready'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 dark:bg-[#4F46E5] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st === 'all' ? `All (${wsDrafts.length})` : STATUS_LABELS[st]}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter drafts..."
            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-[#4F46E5]"
          />
        </div>
      </div>

      {/* Draft Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredDrafts.map((draft) => (
          <div
            key={draft.id}
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex flex-wrap gap-2">
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
                  className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-slate-700 dark:text-slate-200 outline-none"
                >
                  {(Object.keys(STATUS_LABELS) as DraftStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABELS[st]}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">{draft.topic}</p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{draft.content}</p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEditInComposer(draft)}
                  className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                >
                  <Edit3 size={12} /> Edit in Composer
                </button>
                <button
                  onClick={() => {
                    setSchedulingDraft(draft);
                    setScheduleCatId(draft.categoryId || wsCategories[0]?.id || '');
                  }}
                  className="px-2.5 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1"
                >
                  <Calendar size={12} /> Schedule
                </button>
              </div>
              <button
                onClick={() => {
                  onDeleteDraft(draft.id);
                  onToast('Draft Removed');
                }}
                aria-label="Delete draft"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Schedule Date/Time Picker Modal */}
      {schedulingDraft && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setSchedulingDraft(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Schedule Draft to Calendar
              </h3>
              <button onClick={() => setSchedulingDraft(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3.5 text-xs">
              <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 line-clamp-3">
                {schedulingDraft.content}
              </p>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Publish Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Content Category Queue
                </label>
                <select
                  value={scheduleCatId}
                  onChange={(e) => setScheduleCatId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
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
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
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
                  className="flex-[2] py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg font-semibold"
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
