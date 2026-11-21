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
  Globe,
} from 'lucide-react';
import {
  SocialPost,
  Draft,
  ContentCategory,
  Platform,
  TeamRole,
} from '../../types';
import { ALL_PLATFORMS, PLATFORM_META, PlatformTag, SocialLogo } from '../common/PlatformMeta';
import { CANVA_TEMPLATES, MEDIA_LIBRARY } from '../../data/defaultState';
import { aiService } from '../../services/aiService';
import { DraftsWorkspace } from './DraftsWorkspace';
import { StatusBadge } from '../common/DesignPrimitives';

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
    <div className="h-full flex flex-col overflow-hidden bg-[#F8F9FB] dark:bg-[#090A0D]">
      {/* Studio Top Bar */}
      <div className="px-6 py-3 bg-white dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[16px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] flex items-center gap-2">
              Content Studio &amp; Post Composer
              {editingPost && <StatusBadge label="Editing Post" tone="orange" />}
            </h1>
            <p className="text-[12px] text-[#4B5563] dark:text-[#9CA3AF]">
              Compose once, tailor copy per network, preview pixel-accurate mobile feeds, and queue to categories.
            </p>
          </div>
          {editingPost && (
            <button
              onClick={onClearEditingPost}
              className="text-[12px] font-medium text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] underline"
            >
              Exit Edit Mode
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex bg-[#F3F4F6] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] p-0.5 rounded-md text-[12px] font-medium">
            <button
              onClick={() => setStudioMode('composer')}
              className={`px-3 py-1 rounded transition-colors ${
                studioMode === 'composer'
                  ? 'bg-white dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.08]'
                  : 'text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
              }`}
            >
              Split-Screen Composer
            </button>
            <button
              onClick={() => setStudioMode('drafts')}
              className={`px-3 py-1 rounded transition-colors ${
                studioMode === 'drafts'
                  ? 'bg-white dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.08]'
                  : 'text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
              }`}
            >
              Drafts &amp; Bulk AI ({drafts.filter((d) => d.workspaceId === workspaceId).length})
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
          <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-[#E5E7EB] dark:border-white/[0.08] bg-white dark:bg-[#13161D]">
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              {/* Target Social Profile Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
                    1. Target Social Profiles ({selectedPlatforms.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedPlatforms(['instagram', 'linkedin', 'x', 'tiktok', 'facebook', 'threads'])}
                    className="text-[11px] font-medium text-[#06B6D4] hover:underline"
                  >
                    Select Core 6
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COMPOSER_PLATFORMS.map((p) => {
                    const active = selectedPlatforms.includes(p);
                    const meta = PLATFORM_META[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`px-2.5 py-1.5 rounded-md border text-[12px] font-medium flex items-center gap-1.5 transition-colors ${
                          active
                            ? 'border-[#06B6D4] bg-[#F8F9FB] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                            : 'border-[#E5E7EB] dark:border-white/[0.08] bg-white dark:bg-[#0E1015] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                        }`}
                      >
                        <SocialLogo platform={p} size={14} />
                        {meta.label}
                        {active && <Check size={12} className="text-[#06B6D4]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Category & Evergreen Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1.5">
                    2. Content Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  >
                    {wsCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.postsPerWeek}/wk)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1.5">
                    Queue Recycling
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEvergreen(!isEvergreen)}
                    className={`w-full px-3 py-2 rounded-md border text-[12px] font-medium flex items-center justify-between transition-colors ${
                      isEvergreen
                        ? 'border-[#06B6D4] bg-[#F8F9FB] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                        : 'border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] text-[#6B7280]'
                    }`}
                  >
                    <span>{isEvergreen ? 'Evergreen Auto-Recycle ON' : 'Single-Run Post Only'}</span>
                    <Layers size={14} strokeWidth={1.5} className={isEvergreen ? 'text-[#06B6D4]' : ''} />
                  </button>
                </div>
              </div>

              {/* AI Assistant Bar */}
              <div className="p-3.5 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#06B6D4] flex items-center gap-1.5">
                    <Sparkles size={13} strokeWidth={1.5} /> AI Copilot Bar
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAiGenerate}
                      disabled={aiBusy}
                      className="px-2.5 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] disabled:opacity-60 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <Wand2 size={12} strokeWidth={1.5} className="text-[#06B6D4]" /> {aiBusy ? 'Working...' : 'Generate with AI'}
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowToneMenu(!showToneMenu)}
                        className="px-2.5 py-1.5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-md text-[11px] font-medium text-[#111827] dark:text-[#F3F4F6] transition-colors"
                      >
                        Rewrite Tone ▾
                      </button>
                      {showToneMenu && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-lg p-1 z-30">
                          {(['Punchy', 'Professional', 'Viral'] as const).map((tone) => (
                            <button
                              key={tone}
                              type="button"
                              onClick={() => handleRewriteTone(tone)}
                              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6]"
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
                      className="px-2.5 py-1.5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-md text-[11px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1 transition-colors"
                    >
                      <Hash size={12} strokeWidth={1.5} /> Auto Hashtags
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !customizePerNetwork;
                        setCustomizePerNetwork(next);
                        if (next && activeEditorTab === 'master') setActiveEditorTab('instagram');
                        if (!next) setActiveEditorTab('master');
                      }}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                        customizePerNetwork
                          ? 'border-[#06B6D4] bg-cyan-500/10 text-[#06B6D4]'
                          : 'bg-white dark:bg-[#13161D] border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#9CA3AF]'
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
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>

              {/* Per-Network Tabs when enabled */}
              {customizePerNetwork && (
                <div className="flex flex-wrap gap-1.5 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-2">
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
                      className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
                        activeEditorTab === tab.id
                          ? 'border-[#06B6D4] bg-[#F8F9FB] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                          : 'border-transparent bg-[#F3F4F6] dark:bg-[#0E1015] text-[#6B7280]'
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
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
                    3. {activeEditorTab === 'master' ? 'Master Post Caption' : `${PLATFORM_META[activeEditorTab].label} Tailored Caption`}
                  </label>
                  <span
                    className={`text-[11px] font-mono tabular-nums ${
                      activeCaptionValue.length > currentCharLimit ? 'text-rose-500 font-semibold' : 'text-[#6B7280]'
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
                  className="w-full p-3.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg text-[13px] text-[#111827] dark:text-[#F3F4F6] leading-relaxed outline-none focus:border-[#06B6D4]"
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 transition-colors"
                    >
                      <Smile size={14} strokeWidth={1.5} /> Insert Emoji
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-lg p-2.5 grid grid-cols-8 gap-1 z-40">
                        {QUICK_EMOJIS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => handleInsertEmoji(em)}
                            className="p-1.5 rounded hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] text-base"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setFirstCommentEnabled(!firstCommentEnabled)}
                      className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium border flex items-center gap-1.5 transition-colors ${
                        firstCommentEnabled
                          ? 'border-[#06B6D4] bg-[#F8F9FB] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                          : 'border-[#E5E7EB] dark:border-white/[0.08] text-[#6B7280]'
                      }`}
                    >
                      <MessageSquare size={13} strokeWidth={1.5} /> First Comment {firstCommentEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {activeCategoryObj && (
                    <span className="text-[11px] font-medium flex items-center gap-1.5 text-[#6B7280]">
                      <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: activeCategoryObj.color }} />
                      {activeCategoryObj.name}
                    </span>
                  )}
                </div>
              </div>

              {/* First Comment Input */}
              {firstCommentEnabled && (
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">
                    Auto-Posted First Comment (Hashtags / CTA Link)
                  </label>
                  <input
                    type="text"
                    value={firstComment}
                    onChange={(e) => setFirstComment(e.target.value)}
                    placeholder="Add hashtags or CTA link to post automatically as the first comment..."
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
              )}

              {/* Media Uploader & Template Picker */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
                    4. Visual Media &amp; Brand Templates
                  </label>
                  <div className="flex items-center gap-1.5">
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
                      className="px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 transition-colors"
                    >
                      <Upload size={13} strokeWidth={1.5} /> Upload Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTemplateModal(true)}
                      className="px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 transition-colors"
                    >
                      <Palette size={13} strokeWidth={1.5} /> Template Picker
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {selectedMedia.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-[#06B6D4] shrink-0">
                      <img src={url} alt="Attached media" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSelectedMedia([])}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#090A0D]/80 text-white flex items-center justify-center"
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
                        className={`relative w-20 h-20 rounded-lg overflow-hidden border transition-all shrink-0 ${
                          isPicked
                            ? 'border-[#06B6D4]'
                            : 'border-[#E5E7EB] dark:border-white/[0.08] opacity-80 hover:opacity-100'
                        }`}
                        title={`Use ${item.label}`}
                      >
                        <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-[#090A0D]/80 text-[9px] text-white font-medium px-1 py-0.5 truncate">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="px-6 py-3.5 bg-[#F8F9FB] dark:bg-[#0E1015] border-t border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2 shrink-0 relative">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => buildAndSavePost('draft')}
                  className="px-3 py-1.5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 transition-colors"
                >
                  <FileText size={13} strokeWidth={1.5} /> Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => buildAndSavePost('pending_approval')}
                  className="px-3 py-1.5 border border-orange-500/30 bg-orange-500/[0.06] hover:bg-orange-500/[0.12] text-[#F97316] rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Send size={13} strokeWidth={1.5} /> Send for Approval
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
                  className="px-3 py-1.5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] text-[#111827] dark:text-[#F3F4F6] rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Layers size={13} strokeWidth={1.5} /> Add to Queue
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSchedulePopover(!showSchedulePopover)}
                    className="px-3.5 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Calendar size={13} strokeWidth={1.5} /> Schedule Date/Time
                  </button>

                  {showSchedulePopover && (
                    <div className="absolute right-0 bottom-full mb-2 w-72 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-xl p-4 space-y-3 z-50">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-semibold text-[#111827] dark:text-[#F3F4F6]">Pick Publish Date &amp; Time</p>
                        <button onClick={() => setShowSchedulePopover(false)} className="text-[#6B7280]">
                          <X size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                      <input
                        type="datetime-local"
                        value={scheduleDateTime}
                        onChange={(e) => setScheduleDateTime(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
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
                        className="w-full py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md text-[12px] font-medium transition-colors"
                      >
                        Confirm Schedule
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Pixel-Accurate Live Mobile Previews on Dot-Grid Canvas */}
          <div className="canvas-dot-grid w-full lg:w-[430px] xl:w-[460px] shrink-0 bg-[#F8F9FB] dark:bg-[#090A0D] flex flex-col overflow-y-auto p-6 custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <Smartphone size={14} strokeWidth={1.5} className="text-[#06B6D4]" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
                  Live Feed Preview
                </span>
              </div>
              <div className="inline-flex bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] p-0.5 rounded-md text-[11px] font-medium">
                {(['instagram', 'linkedin', 'x'] as const).map((pl) => (
                  <button
                    key={pl}
                    type="button"
                    onClick={() => setPreviewPlatform(pl)}
                    className={`px-2.5 py-1 rounded capitalize flex items-center gap-1.5 transition-colors ${
                      previewPlatform === pl
                        ? 'bg-[#111827] text-white dark:bg-white dark:text-[#090A0D]'
                        : 'text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                    }`}
                  >
                    <SocialLogo platform={pl} size={13} />
                    <span>{pl === 'x' ? 'X' : pl}</span>
                  </button>
                ))}
              </div>
            </div>

            {previewPlatform === 'instagram' && (
              <div className="mb-3 flex items-center justify-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setIgFormat('feed')}
                  className={`px-2.5 py-1 rounded-md font-medium border transition-colors ${
                    igFormat === 'feed'
                      ? 'bg-[#111827] text-white dark:bg-white dark:text-[#090A0D] border-transparent'
                      : 'bg-white dark:bg-[#13161D] text-[#6B7280] border-[#E5E7EB] dark:border-white/[0.08]'
                  }`}
                >
                  IG Feed Post
                </button>
                <button
                  type="button"
                  onClick={() => setIgFormat('reels')}
                  className={`px-2.5 py-1 rounded-md font-medium border transition-colors ${
                    igFormat === 'reels'
                      ? 'bg-[#111827] text-white dark:bg-white dark:text-[#090A0D] border-transparent'
                      : 'bg-white dark:bg-[#13161D] text-[#6B7280] border-[#E5E7EB] dark:border-white/[0.08]'
                  }`}
                >
                  IG Reels 9:16
                </button>
              </div>
            )}

            {/* Mobile Frame */}
            <div className="mx-auto w-full max-w-[340px] rounded-[24px] border-4 border-[#111827] dark:border-white/[0.15] bg-white dark:bg-[#13161D] overflow-hidden">
              {/* Status bar */}
              <div className="px-5 py-2 flex items-center justify-between text-[10px] font-mono text-[#111827] dark:text-[#F3F4F6] bg-white dark:bg-[#13161D] border-b border-[#E5E7EB] dark:border-white/[0.08]">
                <span>9:41</span>
                <span className="w-14 h-2.5 rounded-full bg-[#111827] dark:bg-white/[0.15]" />
                <span>5G</span>
              </div>

              {/* Instagram Preview */}
              {previewPlatform === 'instagram' && (
                <div className="text-[#111827] dark:text-[#F3F4F6]">
                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full border-2 border-[#06B6D4] flex items-center justify-center text-[10px] font-semibold bg-[#F8F9FB] dark:bg-[#0E1015]">
                        {workspaceName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold leading-none">{workspaceHandle.replace('@', '')}</p>
                        <p className="text-[10px] text-[#6B7280] mt-0.5">{igFormat === 'reels' ? 'Reels Preview' : 'Original Post'}</p>
                      </div>
                    </div>
                    <MoreHorizontal size={15} className="text-[#6B7280]" />
                  </div>

                  {/* Media */}
                  <div className={`relative bg-[#F3F4F6] dark:bg-[#0E1015] ${igFormat === 'reels' ? 'aspect-[4/5]' : 'aspect-square'} overflow-hidden`}>
                    {selectedMedia[0] ? (
                      <img src={selectedMedia[0]} alt="IG preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#6B7280] text-[12px]">
                        <ImagePlus size={22} strokeWidth={1.5} className="mb-1" /> Attach visual media
                      </div>
                    )}
                    {igFormat === 'reels' && (
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-[#090A0D]/80 text-white">
                        <p className="text-[11px] font-semibold">{workspaceHandle}</p>
                        <p className="text-[11px] line-clamp-2 opacity-90">{getPreviewText('instagram')}</p>
                      </div>
                    )}
                  </div>

                  {/* IG Footer */}
                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Heart size={17} strokeWidth={1.5} />
                        <MessageCircle size={17} strokeWidth={1.5} />
                        <Send size={16} strokeWidth={1.5} />
                      </div>
                      <Bookmark size={17} strokeWidth={1.5} />
                    </div>
                    <p className="text-[11px] font-mono text-[#6B7280]">Draft preview</p>
                    {igFormat === 'feed' && (
                      <p className="text-[12px] leading-snug whitespace-pre-line">
                        <span className="font-semibold mr-1.5">{workspaceHandle.replace('@', '')}</span>
                        {getPreviewText('instagram')}
                      </p>
                    )}
                    {firstCommentEnabled && firstComment.trim() && (
                      <div className="pt-1.5 border-t border-[#E5E7EB] dark:border-white/[0.08] text-[11px] text-[#6B7280]">
                        <span className="font-medium text-[#111827] dark:text-[#F3F4F6] mr-1">First comment:</span>
                        <span className="text-[#06B6D4]">{firstComment}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* LinkedIn Preview */}
              {previewPlatform === 'linkedin' && (
                <div className="p-3.5 space-y-3 text-[#111827] dark:text-[#F3F4F6]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-[#0A66C2] text-white font-semibold flex items-center justify-center text-[11px]">
                        {workspaceName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold">{workspaceName}</p>
                        <p className="text-[10px] text-[#6B7280] flex items-center gap-1">
                          <span>Company Page · Just now</span>
                          <Globe size={10} strokeWidth={1.5} />
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#0A66C2]">+ Follow</span>
                  </div>

                  <p className="text-[12px] leading-relaxed whitespace-pre-line">{getPreviewText('linkedin')}</p>

                  {selectedMedia[0] && (
                    <div className="rounded-md overflow-hidden border border-[#E5E7EB] dark:border-white/[0.08] aspect-[16/10]">
                      <img src={selectedMedia[0]} alt="LinkedIn media" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {firstCommentEnabled && firstComment.trim() && (
                    <div className="p-2 rounded-md bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                      <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">Pinned 1st Comment:</span> {firstComment}
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-around text-[11px] font-medium text-[#6B7280]">
                    <span className="flex items-center gap-1"><ThumbsUp size={13} strokeWidth={1.5} /> Like</span>
                    <span className="flex items-center gap-1"><MessageCircle size={13} strokeWidth={1.5} /> Comment</span>
                    <span className="flex items-center gap-1"><Repeat2 size={13} strokeWidth={1.5} /> Repost</span>
                    <span className="flex items-center gap-1"><Send size={13} strokeWidth={1.5} /> Send</span>
                  </div>
                </div>
              )}

              {/* X Preview */}
              {previewPlatform === 'x' && (
                <div className="p-4 space-y-3 text-[#111827] dark:text-[#F3F4F6]">
                  <div className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#111827] dark:bg-[#191D26] border border-[#E5E7EB] dark:border-white/[0.12] text-white font-semibold flex items-center justify-center text-[11px] shrink-0">
                      {workspaceName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <span className="font-semibold truncate">{workspaceName}</span>
                        <span className="text-[#6B7280] font-mono text-[11px] truncate">{workspaceHandle} · Now</span>
                      </div>
                      <p className="text-[12px] leading-relaxed whitespace-pre-line">{getPreviewText('x')}</p>
                      {selectedMedia[0] && (
                        <div className="rounded-lg overflow-hidden border border-[#E5E7EB] dark:border-white/[0.08] aspect-[16/9]">
                          <img src={selectedMedia[0]} alt="X media" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {firstCommentEnabled && firstComment.trim() && (
                        <div className="pl-2.5 border-l-2 border-[#06B6D4] text-[11px] text-[#6B7280]">
                          Thread reply: {firstComment}
                        </div>
                      )}
                      <div className="pt-1 flex items-center justify-between text-[#6B7280] text-[11px]">
                        <MessageCircle size={13} strokeWidth={1.5} />
                        <Repeat2 size={13} strokeWidth={1.5} />
                        <Heart size={13} strokeWidth={1.5} />
                        <Share size={13} strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {selectedPlatforms.map((pl) => (
                <PlatformTag key={pl} platform={pl} showFull={false} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Brand Template Picker Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTemplateModal(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <div>
                <h3 className="text-[15px] font-semibold text-[#111827] dark:text-[#F3F4F6] flex items-center gap-2">
                  <Palette size={15} strokeWidth={1.5} className="text-[#06B6D4]" /> Brand Template Picker
                </h3>
                <p className="text-[12px] text-[#4B5563] dark:text-[#9CA3AF]">
                  Apply a ready-to-publish visual layout and matched caption hook.
                </p>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
                  className="text-left rounded-lg border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] overflow-hidden bg-[#F8F9FB] dark:bg-[#0E1015] transition-colors group"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={tpl.image}
                      alt={tpl.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-[12px] font-semibold text-[#111827] dark:text-[#F3F4F6]">{tpl.title}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{tpl.subtitle}</p>
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
