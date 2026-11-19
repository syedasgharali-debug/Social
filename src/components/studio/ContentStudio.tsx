import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Smile,
  ImagePlus,
  Palette,
  MessageSquare,
  Calendar,
  Layers,
  Send,
  FileText,
  Smartphone,
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  Bookmark,
  ThumbsUp,
  MoreHorizontal,
  Check,
  Wand2,
  Hash,
  X,
  Upload,
} from 'lucide-react';
import {
  SocialPost,
  Draft,
  ContentCategory,
  Platform,
  TeamRole,
} from '../../types';
import { ALL_PLATFORMS, PLATFORM_META, PlatformTag, SocialLogo } from '../common/PlatformMeta';
import { CANVA_TEMPLATES, MEDIA_LIBRARY } from '../../data/seedData';
import { aiService } from '../../services/aiService';
import { DraftsWorkspace } from './DraftsWorkspace';

export interface ComposerPreset {
  categoryId?: string;
  evergreen?: boolean;
  topic?: string;
  platforms?: Platform[];
  firstComment?: string;
}

interface ContentStudioProps {
  workspaceId: string;
  workspaceName: string;
  workspaceHandle: string;
  activeRole: TeamRole;
  posts: SocialPost[];
  drafts: Draft[];
  categories: ContentCategory[];
  editingPost?: SocialPost | null;
  initialPreset?: ComposerPreset | null;
  onClearEditingPost: () => void;
  onAddPost: (post: SocialPost) => void;
  onUpdatePost: (post: SocialPost) => void;
  onUpdateDraft: (draft: Draft) => void;
  onAddDrafts: (newDrafts: Draft[]) => void;
  onDeleteDraft: (id: string) => void;
  onScheduleDraft: (draft: Draft, scheduledAt: string, categoryId?: string) => void;
  onGoToScheduler: () => void;
  onToast: (title: string, description?: string) => void;
}

const QUICK_EMOJIS = ['🚀', '🔥', '✨', '💡', '📈', '🎯', '💬', '👏', '⚡', '✅', '📸', '🔗', '🤝', '🎉', '🧠', '💼'];

const COMPOSER_PLATFORMS: Platform[] = [
  'instagram',
  'linkedin',
  'x',
  'tiktok',
  'facebook',
  'threads',
  'youtube',
  'pinterest',
  'bluesky',
  'gbp',
];

export function ContentStudio({
  workspaceId,
  workspaceName,
  workspaceHandle,
  activeRole,
  posts,
  drafts,
  categories,
  editingPost,
  initialPreset,
  onClearEditingPost,
  onAddPost,
  onUpdatePost,
  onUpdateDraft,
  onAddDrafts,
  onDeleteDraft,
  onScheduleDraft,
  onGoToScheduler,
  onToast,
}: ContentStudioProps) {
  const wsCategories = categories.filter((c) => c.workspaceId === workspaceId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [studioMode, setStudioMode] = useState<'composer' | 'drafts'>('composer');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'linkedin', 'x']);
  const [categoryId, setCategoryId] = useState<string>(wsCategories[0]?.id || '');
  const [masterCaption, setMasterCaption] = useState<string>(
    '5 high-leverage habits transforming B2B social teams in 2027:\n\n1. Batch 30 days by category\n2. Recycle evergreen winners\n3. Route warm DMs straight to CRM pipeline'
  );
  const [customizePerNetwork, setCustomizePerNetwork] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<'master' | 'instagram' | 'linkedin' | 'x'>('master');
  const [platformVariations, setPlatformVariations] = useState<Partial<Record<Platform, string>>>({});
  const [firstCommentEnabled, setFirstCommentEnabled] = useState(true);
  const [firstComment, setFirstComment] = useState('#SocialCRM #ContentStrategy #EvergreenMarketing #GrowthOps');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([CANVA_TEMPLATES[0].image]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSchedulePopover, setShowSchedulePopover] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('2026-11-18T09:30');
  const [isEvergreen, setIsEvergreen] = useState(true);

  const [previewPlatform, setPreviewPlatform] = useState<'instagram' | 'linkedin' | 'x'>('instagram');
  const [igFormat, setIgFormat] = useState<'feed' | 'reels'>('feed');
  const [aiBusy, setAiBusy] = useState(false);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');

  useEffect(() => {
    if (!wsCategories.some((c) => c.id === categoryId)) {
      setCategoryId(wsCategories[0]?.id || '');
    }
  }, [workspaceId, wsCategories, categoryId]);

  useEffect(() => {
    if (editingPost) {
      setStudioMode('composer');
      setSelectedPlatforms(editingPost.platforms.length ? editingPost.platforms : ['instagram', 'linkedin']);
      setCategoryId(editingPost.categoryId || wsCategories[0]?.id || '');
      setMasterCaption(editingPost.content);
      setPlatformVariations(editingPost.platformVariations || {});
      setCustomizePerNetwork(Boolean(editingPost.platformVariations && Object.keys(editingPost.platformVariations).length > 0));
      setFirstComment(editingPost.firstComment || '');
      setFirstCommentEnabled(Boolean(editingPost.firstComment));
      setSelectedMedia(editingPost.media || []);
      setIsEvergreen(Boolean(editingPost.isEvergreen));
      if (editingPost.scheduledAt) {
        setScheduleDateTime(editingPost.scheduledAt.slice(0, 16));
      }
    }
  }, [editingPost]);

  useEffect(() => {
    if (initialPreset) {
      setStudioMode('composer');
      if (initialPreset.categoryId) setCategoryId(initialPreset.categoryId);
      if (typeof initialPreset.evergreen === 'boolean') setIsEvergreen(initialPreset.evergreen);
      if (initialPreset.topic) setMasterCaption(initialPreset.topic);
      if (initialPreset.platforms && initialPreset.platforms.length > 0) {
        setSelectedPlatforms(initialPreset.platforms);
        const firstPreviewable = initialPreset.platforms.find(
          (p): p is 'instagram' | 'linkedin' | 'x' => p === 'instagram' || p === 'linkedin' || p === 'x'
        );
        if (firstPreviewable) setPreviewPlatform(firstPreviewable);
      }
      if (typeof initialPreset.firstComment === 'string') {
        setFirstComment(initialPreset.firstComment);
        setFirstCommentEnabled(initialPreset.firstComment.trim().length > 0);
      }
    }
  }, [initialPreset]);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((item) => item !== p) : prev) : [...prev, p]
    );
  };

  const activeCaptionValue =
    customizePerNetwork && activeEditorTab !== 'master'
      ? platformVariations[activeEditorTab] ?? masterCaption
      : masterCaption;

  const updateActiveCaption = (nextVal: string) => {
    if (customizePerNetwork && activeEditorTab !== 'master') {
      setPlatformVariations((prev) => ({ ...prev, [activeEditorTab]: nextVal }));
    } else {
      setMasterCaption(nextVal);
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    updateActiveCaption(`${activeCaptionValue}${activeCaptionValue.endsWith(' ') || !activeCaptionValue ? '' : ' '}${emoji}`);
    setShowEmojiPicker(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedMedia([reader.result]);
        onToast('Media Attached', `Uploaded "${file.name}" to composer.`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAiGenerate = async () => {
    setAiBusy(true);
    try {
      const seedTopic = aiPromptInput.trim() || masterCaption.slice(0, 120) || 'Evergreen Social CRM Workflows';
      const res = await aiService.repurposeContent(seedTopic, 'Professional');
      setMasterCaption(res.linkedin);
      setPlatformVariations({
        instagram: res.instagram,
        linkedin: res.linkedin,
        x: res.x,
        tiktok: res.tiktok,
      });
      if (res.hashtags?.length) {
        setFirstComment(res.hashtags.join(' '));
        setFirstCommentEnabled(true);
      }
      setCustomizePerNetwork(true);
      onToast('AI Copilot Drafted Content', 'Generated tailored copy for Master, Instagram, LinkedIn & X.');
    } finally {
      setAiBusy(false);
    }
  };

  const handleRewriteTone = async (tone: 'Punchy' | 'Professional' | 'Viral') => {
    setShowToneMenu(false);
    setAiBusy(true);
    try {
      const baseText = activeCaptionValue.trim() || 'Consistent social publishing + CRM lead tracking';
      const res = await aiService.repurposeContent(baseText, tone);

      if (tone === 'Punchy') {
        const punched =
          activeEditorTab === 'x'
            ? res.x
            : `Stop scrolling.\n\n${baseText.split('\n')[0]}\n\n→ Batch by category\n→ Recycle evergreen winners\n→ Turn replies into pipeline.\n\nShip smarter this week.`;
        updateActiveCaption(punched);
      } else if (tone === 'Viral') {
        const viral = `Unpopular opinion: Most teams fail on social because they publish once and forget.\n\nHere is what top 1% teams do instead:\n\n${res.x}\n\nSave this before your next content sprint.`;
        updateActiveCaption(viral);
      } else {
        updateActiveCaption(res.linkedin);
      }
      onToast(`Rewritten in ${tone} Tone`);
    } finally {
      setAiBusy(false);
    }
  };

  const handleAutoHashtags = () => {
    const catName = wsCategories.find((c) => c.id === categoryId)?.name.replace(/\s+/g, '') || 'GrowthStrategy';
    const tags = `#${catName} #SocialCRM #ContentMarketing #B2BSaaS #EvergreenQueue`;
    if (firstCommentEnabled) {
      setFirstComment((prev) => (prev.includes('#SocialCRM') ? prev : `${prev ? `${prev} ` : ''}${tags}`));
      onToast('Hashtag Collection Added', 'Appended 5 niche hashtags to your First Comment.');
    } else {
      updateActiveCaption(`${activeCaptionValue}\n\n${tags}`);
      onToast('Hashtag Collection Added', 'Appended 5 niche hashtags to your caption.');
    }
  };

  const buildAndSavePost = (targetStatus: SocialPost['status'], evergreenOverride?: boolean, scheduledAtOverride?: string) => {
    if (!masterCaption.trim()) {
      onToast('Caption Required', 'Write a post caption or generate one with AI first.');
      return;
    }

    const activeCategory = wsCategories.find((c) => c.id === categoryId);
    const nextIso = scheduledAtOverride || new Date(scheduleDateTime).toISOString();
    const highestIgOrder = posts
      .filter((p) => p.workspaceId === workspaceId && typeof p.igGridOrder === 'number')
      .reduce((max, p) => Math.max(max, p.igGridOrder || 0), 0);

    const payload: SocialPost = {
      id: editingPost?.id || `p-${Date.now()}`,
      workspaceId,
      categoryId: categoryId || undefined,
      platforms: selectedPlatforms,
      content: masterCaption.trim(),
      platformVariations: customizePerNetwork ? platformVariations : undefined,
      firstComment: firstCommentEnabled && firstComment.trim() ? firstComment.trim() : undefined,
      media: selectedMedia.length ? selectedMedia : undefined,
      igGridOrder:
        editingPost?.igGridOrder ??
        (selectedPlatforms.includes('instagram') ? highestIgOrder + 1 : undefined),
      status: targetStatus,
      isEvergreen: evergreenOverride ?? isEvergreen,
      maxShares: activeCategory?.evergreenEnabled ? 10 : undefined,
      shareCount: editingPost?.shareCount ?? 0,
      scheduledAt: nextIso,
    };

    if (editingPost) {
      onUpdatePost(payload);
      onClearEditingPost();
      onToast('Post Updated', `Saved changes (${targetStatus.replace('_', ' ')}).`);
    } else {
      onAddPost(payload);
      if (targetStatus === 'draft') {
        onToast('Saved as Draft', 'Post stored in your workspace drafts & scheduler list.');
      } else if (targetStatus === 'pending_approval') {
        onToast('Sent for Client Approval', 'Moved to Team & Approvals queue for sign-off.');
      } else if (evergreenOverride) {
        onToast(
          'Added to Category Queue',
          `Queued inside ${activeCategory?.name || 'Evergreen'} rotation.`
        );
      } else {
        onToast('Post Scheduled', `Locked in for ${new Date(nextIso).toLocaleString()}.`);
      }
    }
    setShowSchedulePopover(false);
  };

  const getPreviewText = (pl: 'instagram' | 'linkedin' | 'x') => {
    const raw = (customizePerNetwork && platformVariations[pl]) || masterCaption || 'Write your caption on the left...';
    if (pl === 'x' && raw.length > 280) return `${raw.slice(0, 277)}...`;
    return raw;
  };

  const activeCategoryObj = wsCategories.find((c) => c.id === categoryId);
  const currentCharLimit =
    activeEditorTab === 'x' ? 280 : activeEditorTab === 'instagram' ? 2200 : 3000;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[#090D16]">
      {/* Studio Top Bar */}
      <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Content Studio & Post Composer
              {editingPost && (
                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase">
                  Editing Post
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-500">
              Compose once, tailor copy per network, preview pixel-accurate mobile feeds, and queue to categories.
            </p>
          </div>
          {editingPost && (
            <button
              onClick={onClearEditingPost}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white underline"
            >
              Exit Edit Mode
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setStudioMode('composer')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                studioMode === 'composer'
                  ? 'bg-white dark:bg-slate-900 text-[#4F46E5] dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Split-Screen Composer
            </button>
            <button
              onClick={() => setStudioMode('drafts')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                studioMode === 'drafts'
                  ? 'bg-white dark:bg-slate-900 text-[#4F46E5] dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Drafts & Bulk AI ({drafts.filter((d) => d.workspaceId === workspaceId).length})
            </button>
          </div>
        </div>
      </div>

      {studioMode === 'drafts' ? (
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <DraftsWorkspace
            workspaceId={workspaceId}
            drafts={drafts}
            categories={categories}
            onUpdateDraft={onUpdateDraft}
            onAddDrafts={onAddDrafts}
            onDeleteDraft={onDeleteDraft}
            onEditInComposer={(draft) => {
              setSelectedPlatforms(draft.platforms);
              if (draft.categoryId) setCategoryId(draft.categoryId);
              setMasterCaption(draft.content);
              setAiPromptInput(draft.topic);
              setStudioMode('composer');
              onToast('Loaded Draft into Composer');
            }}
            onScheduleDraft={(draft, dt, catId) => {
              onScheduleDraft(draft, dt, catId);
              onGoToScheduler();
            }}
            onToast={onToast}
          />
        </div>
      ) : (
        /* Split-Screen Composer */
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT COLUMN: Editor Controls */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              {/* Target Social Profile Selector Pills */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    1. Target Social Profiles ({selectedPlatforms.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedPlatforms(['instagram', 'linkedin', 'x', 'tiktok', 'facebook', 'threads'])}
                    className="text-[11px] font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline"
                  >
                    Select Core 6
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMPOSER_PLATFORMS.map((p) => {
                    const active = selectedPlatforms.includes(p);
                    const meta = PLATFORM_META[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          active
                            ? 'border-[#4F46E5] bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <SocialLogo platform={p} size={15} />
                        {meta.label}
                        {active && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Category & Evergreen Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    2. Content Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#4F46E5]"
                  >
                    {wsCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.postsPerWeek}/wk)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Queue Recycling
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEvergreen(!isEvergreen)}
                    className={`w-full px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors ${
                      isEvergreen
                        ? 'border-[#4F46E5] bg-indigo-50/70 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <span>{isEvergreen ? 'Evergreen Auto-Recycle ON' : 'Single-Run Post Only'}</span>
                    <Layers size={14} />
                  </button>
                </div>
              </div>

              {/* AI Assistant Bar */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F46E5] dark:text-indigo-400 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" /> AI Copilot Assistant Bar
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAiGenerate}
                      disabled={aiBusy}
                      className="px-2.5 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-60 text-white rounded-md text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Wand2 size={12} /> {aiBusy ? 'Working...' : 'Generate with AI'}
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowToneMenu(!showToneMenu)}
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Rewrite Tone ▾
                      </button>
                      {showToneMenu && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-1 z-30">
                          {(['Punchy', 'Professional', 'Viral'] as const).map((tone) => (
                            <button
                              key={tone}
                              type="button"
                              onClick={() => handleRewriteTone(tone)}
                              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-xs font-semibold text-slate-700 dark:text-slate-200"
                            >
                              {tone} Tone
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAutoHashtags}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                    >
                      <Hash size={12} /> Auto-Generate Hashtag Collection
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !customizePerNetwork;
                        setCustomizePerNetwork(next);
                        if (next && activeEditorTab === 'master') setActiveEditorTab('instagram');
                        if (!next) setActiveEditorTab('master');
                      }}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                        customizePerNetwork
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      Customize per Network
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={aiPromptInput}
                  onChange={(e) => setAiPromptInput(e.target.value)}
                  placeholder="Optional topic or URL for AI (e.g. 'How our agency saves 10h/wk with category queues')..."
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#4F46E5]"
                />
              </div>

              {/* Per-Network Tabs when enabled */}
              {customizePerNetwork && (
                <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                  {(
                    [
                      { id: 'master', label: 'Master Caption' },
                      { id: 'instagram', label: 'Instagram Version' },
                      { id: 'linkedin', label: 'LinkedIn Version' },
                      { id: 'x', label: 'X (280 char)' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveEditorTab(tab.id);
                        if (tab.id !== 'master') setPreviewPlatform(tab.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        activeEditorTab === tab.id
                          ? 'bg-[#4F46E5] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Caption Editor + Emoji Picker */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    3. {activeEditorTab === 'master' ? 'Master Post Caption' : `${PLATFORM_META[activeEditorTab].label} Tailored Caption`}
                  </label>
                  <span
                    className={`text-[11px] font-mono tabular-nums ${
                      activeCaptionValue.length > currentCharLimit ? 'text-rose-600 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {activeCaptionValue.length} / {currentCharLimit} chars
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={activeCaptionValue}
                  onChange={(e) => updateActiveCaption(e.target.value)}
                  placeholder="Write your post copy here..."
                  className="w-full p-3.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 leading-relaxed outline-none focus:border-[#4F46E5]"
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                    >
                      <Smile size={14} className="text-amber-500" /> Emoji Picker
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2.5 grid grid-cols-8 gap-1 z-40">
                        {QUICK_EMOJIS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => handleInsertEmoji(em)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-base"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setFirstCommentEnabled(!firstCommentEnabled)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                        firstCommentEnabled
                          ? 'border-[#4F46E5] bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <MessageSquare size={13} /> First Comment {firstCommentEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {activeCategoryObj && (
                    <span className="text-[11px] font-semibold flex items-center gap-1.5 text-slate-500">
                      <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: activeCategoryObj.color }} />
                      {activeCategoryObj.name}
                    </span>
                  )}
                </div>
              </div>

              {/* First Comment Input */}
              {firstCommentEnabled && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Auto-Posted First Comment (Hashtags / CTA Link)
                  </label>
                  <input
                    type="text"
                    value={firstComment}
                    onChange={(e) => setFirstComment(e.target.value)}
                    placeholder="Add hashtags or CTA link to post automatically as the first comment..."
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#4F46E5]"
                  />
                </div>
              )}

              {/* Media Uploader & Canva-style Template Picker */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    4. Visual Media & Canva-Style Templates
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                    >
                      <Upload size={13} /> Upload Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTemplateModal(true)}
                      className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Palette size={13} /> Canva-Style Template Picker
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {selectedMedia.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-[#4F46E5] shrink-0">
                      <img src={url} alt="Attached media" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSelectedMedia([])}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center"
                        title="Remove image"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  {MEDIA_LIBRARY.map((item) => {
                    const isPicked = selectedMedia.includes(item.url);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setSelectedMedia([item.url])}
                        className={`relative w-20 h-20 rounded-xl overflow-hidden border transition-all shrink-0 ${
                          isPicked
                            ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/30'
                            : 'border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100'
                        }`}
                        title={`Use ${item.label}`}
                      >
                        <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-slate-950/70 text-[9px] text-white font-semibold px-1 py-0.5 truncate">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 relative">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => buildAndSavePost('draft')}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                >
                  <FileText size={13} /> Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => buildAndSavePost('pending_approval')}
                  className="px-3.5 py-2 border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send size={13} /> Send for Client Approval
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    buildAndSavePost(
                      activeRole === 'Contributor' ? 'pending_approval' : 'scheduled',
                      true
                    )
                  }
                  className="px-3.5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Layers size={13} /> Add to Category Queue
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSchedulePopover(!showSchedulePopover)}
                    className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
                  >
                    <Calendar size={13} /> Schedule Specific Date/Time
                  </button>

                  {showSchedulePopover && (
                    <div className="absolute right-0 bottom-full mb-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 space-y-3 z-50">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Pick Publish Date & Time</p>
                        <button onClick={() => setShowSchedulePopover(false)} className="text-slate-400">
                          <X size={14} />
                        </button>
                      </div>
                      <input
                        type="datetime-local"
                        value={scheduleDateTime}
                        onChange={(e) => setScheduleDateTime(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          buildAndSavePost(
                            activeRole === 'Contributor' ? 'pending_approval' : 'scheduled',
                            isEvergreen,
                            new Date(scheduleDateTime).toISOString()
                          )
                        }
                        className="w-full py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Confirm Schedule
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Pixel-Accurate Live Mobile Previews */}
          <div className="w-full lg:w-[430px] xl:w-[460px] shrink-0 bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col overflow-y-auto p-6 custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <Smartphone size={15} className="text-[#4F46E5]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Live Mobile Feed Preview
                </span>
              </div>
              <div className="inline-flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg text-[11px] font-semibold">
                {(['instagram', 'linkedin', 'x'] as const).map((pl) => (
                  <button
                    key={pl}
                    type="button"
                    onClick={() => setPreviewPlatform(pl)}
                    className={`px-2.5 py-1 rounded-md capitalize flex items-center gap-1.5 transition-colors ${
                      previewPlatform === pl
                        ? 'bg-[#4F46E5] text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <SocialLogo platform={pl} size={13} />
                    <span>{pl === 'x' ? 'X' : pl}</span>
                  </button>
                ))}
              </div>
            </div>

            {previewPlatform === 'instagram' && (
              <div className="mb-3 flex items-center justify-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setIgFormat('feed')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    igFormat === 'feed'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-500'
                  }`}
                >
                  IG Feed Post
                </button>
                <button
                  type="button"
                  onClick={() => setIgFormat('reels')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    igFormat === 'reels'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-500'
                  }`}
                >
                  IG Reels 9:16
                </button>
              </div>
            )}

            {/* Mobile Frame */}
            <div className="mx-auto w-full max-w-[340px] rounded-[28px] border-[6px] border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
              {/* Status bar */}
              <div className="px-5 py-2 flex items-center justify-between text-[10px] font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <span>9:41</span>
                <span className="w-16 h-3 rounded-full bg-slate-900 dark:bg-slate-800" />
                <span>5G · 100%</span>
              </div>

              {/* Instagram Preview */}
              {previewPlatform === 'instagram' && (
                <div className="text-slate-900 dark:text-slate-100">
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-0.5">
                        <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-[10px] font-extrabold">
                          {workspaceName.slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-none">{workspaceHandle.replace('@', '')}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Sponsored · {igFormat === 'reels' ? 'Reels' : 'Original'}</p>
                      </div>
                    </div>
                    <MoreHorizontal size={15} className="text-slate-400" />
                  </div>

                  {/* Media */}
                  <div className={`relative bg-slate-100 dark:bg-slate-800 ${igFormat === 'reels' ? 'aspect-[4/5]' : 'aspect-square'} overflow-hidden`}>
                    {selectedMedia[0] ? (
                      <img src={selectedMedia[0]} alt="IG preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                        <ImagePlus size={24} className="mb-1" /> Attach visual media
                      </div>
                    )}
                    {igFormat === 'reels' && (
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950/80 to-transparent text-white">
                        <p className="text-[11px] font-bold">{workspaceHandle}</p>
                        <p className="text-[11px] line-clamp-2 opacity-90">{getPreviewText('instagram')}</p>
                      </div>
                    )}
                  </div>

                  {/* IG Footer */}
                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Heart size={18} />
                        <MessageCircle size={18} />
                        <Send size={17} />
                      </div>
                      <Bookmark size={18} />
                    </div>
                    <p className="text-[11px] font-bold">1,284 likes</p>
                    {igFormat === 'feed' && (
                      <p className="text-xs leading-snug whitespace-pre-line">
                        <span className="font-bold mr-1.5">{workspaceHandle.replace('@', '')}</span>
                        {getPreviewText('instagram')}
                      </p>
                    )}
                    {firstCommentEnabled && firstComment.trim() && (
                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">First comment:</span>
                        <span className="text-[#4F46E5] dark:text-indigo-400">{firstComment}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* LinkedIn Preview */}
              {previewPlatform === 'linkedin' && (
                <div className="p-3.5 space-y-3 text-slate-900 dark:text-slate-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#0A66C2] text-white font-display font-bold flex items-center justify-center text-xs">
                        {workspaceName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{workspaceName}</p>
                        <p className="text-[10px] text-slate-500">31,400 followers · 1m · 🌐</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#0A66C2]">+ Follow</span>
                  </div>

                  <p className="text-xs leading-relaxed whitespace-pre-line">{getPreviewText('linkedin')}</p>

                  {selectedMedia[0] && (
                    <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-[16/10]">
                      <img src={selectedMedia[0]} alt="LinkedIn media" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {firstCommentEnabled && firstComment.trim() && (
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="font-bold">Pinned 1st Comment:</span> {firstComment}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-around text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1"><ThumbsUp size={13} /> Like</span>
                    <span className="flex items-center gap-1"><MessageCircle size={13} /> Comment</span>
                    <span className="flex items-center gap-1"><Repeat2 size={13} /> Repost</span>
                    <span className="flex items-center gap-1"><Send size={13} /> Send</span>
                  </div>
                </div>
              )}

              {/* X Preview */}
              {previewPlatform === 'x' && (
                <div className="p-4 space-y-3 text-slate-900 dark:text-slate-100">
                  <div className="flex gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-[#4F46E5] text-white font-display font-bold flex items-center justify-center text-xs shrink-0">
                      {workspaceName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-bold truncate">{workspaceName}</span>
                        <span className="text-sky-500">✓</span>
                        <span className="text-slate-400 truncate">{workspaceHandle} · 1m</span>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-line">{getPreviewText('x')}</p>
                      {selectedMedia[0] && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-[16/9]">
                          <img src={selectedMedia[0]} alt="X media" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {firstCommentEnabled && firstComment.trim() && (
                        <div className="pl-2.5 border-l-2 border-[#4F46E5] text-[11px] text-slate-500">
                          Thread reply: {firstComment}
                        </div>
                      )}
                      <div className="pt-1 flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1"><MessageCircle size={13} /> 18</span>
                        <span className="flex items-center gap-1"><Repeat2 size={13} /> 42</span>
                        <span className="flex items-center gap-1"><Heart size={13} /> 219</span>
                        <Share size={13} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {selectedPlatforms.map((pl) => (
                <PlatformTag key={pl} platform={pl} showFull={false} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Canva-Style Template Picker Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setShowTemplateModal(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette size={16} className="text-amber-500" /> Canva-Style Brand Template Picker
                </h3>
                <p className="text-xs text-slate-500">Apply a ready-to-publish visual layout + matched caption hook.</p>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CANVA_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedMedia([tpl.image]);
                    setMasterCaption(tpl.captionSeed);
                    setShowTemplateModal(false);
                    onToast('Template Applied', `Loaded "${tpl.title}" design & caption hook.`);
                  }}
                  className="text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] overflow-hidden bg-[#F8FAFC] dark:bg-slate-800 transition-all group"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={tpl.image}
                      alt={tpl.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{tpl.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{tpl.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
