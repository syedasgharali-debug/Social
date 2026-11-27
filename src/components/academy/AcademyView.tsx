import React, { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  Play,
  CheckCircle2,
  Circle,
  Search,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  ListChecks,
  Lightbulb,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { AcademyCategory, AcademyProgress, AcademyTutorial } from '../../types';
import { academyService, getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from '../../services/academyService';

interface AcademyViewProps {
  userId?: string;
  authToken?: string;
  onToast: (title: string, desc?: string, variant?: 'info' | 'success' | 'warning') => void;
}

type StatusFilter = 'all' | 'incomplete' | 'completed';
type SortOption = 'default' | 'newest' | 'oldest';

function formatPublishedDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface ThumbnailFrameProps {
  videoId: string;
  thumbnailUrl?: string;
  title: string;
  duration?: string;
  completed?: boolean;
  size?: 'card' | 'compact' | 'player';
}

const ThumbnailFrame: React.FC<ThumbnailFrameProps> = ({
  videoId,
  thumbnailUrl,
  title,
  duration,
  completed,
  size = 'card',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const src = thumbnailUrl || getYouTubeThumbnailUrl(videoId, 'hqdefault');

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-[#0E1015] select-none">
      {!imgFailed && src ? (
        <img
          src={src}
          alt={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#13161D] text-[#9CA3AF] p-4 text-center">
          <Play size={size === 'compact' ? 18 : 28} strokeWidth={1.5} className="text-[#06B6D4] mb-1.5" />
          <span className="text-[11px] font-medium line-clamp-2 max-w-[85%]">{title}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />

      {size !== 'compact' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`rounded-full bg-[#090A0D]/80 border border-white/25 flex items-center justify-center text-white transition-transform duration-200 group-hover:scale-105 group-hover:bg-[#06B6D4] group-hover:text-[#090A0D] group-hover:border-[#06B6D4] ${
              size === 'player' ? 'w-16 h-16' : 'w-11 h-11'
            }`}
          >
            <Play size={size === 'player' ? 24 : 18} strokeWidth={1.75} className="ml-0.5 fill-current" />
          </div>
        </div>
      )}

      {duration && (
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-[#090A0D]/85 text-[#F3F4F6] text-[10px] font-mono tabular-nums">
          {duration}
        </span>
      )}

      {completed && size === 'card' && (
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[#090A0D]/85 border border-emerald-400/40 text-emerald-400 text-[10px] font-medium">
          <CheckCircle2 size={11} strokeWidth={2} />
          Completed
        </span>
      )}
    </div>
  );
};

export const AcademyView: React.FC<AcademyViewProps> = ({ userId, authToken, onToast }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channelUrl, setChannelUrl] = useState('https://www.youtube.com/@socialifyaicom');
  const [categories, setCategories] = useState<AcademyCategory[]>([]);
  const [tutorials, setTutorials] = useState<AcademyTutorial[]>([]);
  const [progress, setProgress] = useState<AcademyProgress>({
    userId: userId || '',
    completedTutorialIds: [],
    watchedTutorialIds: [],
    recentTutorialIds: [],
    lastWatchedTutorialId: null,
    lastWatchedAt: null,
    updatedAt: '',
  });

  // View state: null = Academy Landing Page; string = Active Tutorial ID
  const [activeTutorialId, setActiveTutorialId] = useState<string | null>(null);
  const [playerActivated, setPlayerActivated] = useState(false);
  const [savingProgressId, setSavingProgressId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  const loadAcademyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, progressRes] = await Promise.all([
        academyService.getCatalog(false, authToken),
        academyService.getProgress(authToken),
      ]);
      setChannelUrl(catalogRes.channelUrl || 'https://www.youtube.com/@socialifyaicom');
      setCategories(catalogRes.categories || []);
      setTutorials(catalogRes.tutorials || []);
      setProgress(progressRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load SocialifyAI Academy tutorials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAcademyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, authToken]);

  // Reset lazy iframe whenever switching to a different tutorial
  useEffect(() => {
    setPlayerActivated(false);
  }, [activeTutorialId]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, AcademyCategory>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const completedSet = useMemo(
    () => new Set(progress.completedTutorialIds || []),
    [progress.completedTutorialIds]
  );

  // Real metrics computed strictly from published tutorials & persisted customer progress
  const publishedTutorialIds = useMemo(() => new Set(tutorials.map((t) => t.id)), [tutorials]);
  const totalCount = tutorials.length;
  const completedCount = useMemo(
    () => (progress.completedTutorialIds || []).filter((id) => publishedTutorialIds.has(id)).length,
    [progress.completedTutorialIds, publishedTutorialIds]
  );
  const remainingCount = Math.max(0, totalCount - completedCount);
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Resume Watching & Recently Watched
  const resumeTutorial = useMemo(() => {
    if (progress.lastWatchedTutorialId) {
      const found = tutorials.find((t) => t.id === progress.lastWatchedTutorialId);
      if (found) return found;
    }
    return tutorials.find((t) => !completedSet.has(t.id)) || tutorials[0] || null;
  }, [progress.lastWatchedTutorialId, tutorials, completedSet]);

  const recentlyWatchedTutorials = useMemo(() => {
    const ids = progress.recentTutorialIds || [];
    return ids
      .map((id) => tutorials.find((t) => t.id === id))
      .filter((t): t is AcademyTutorial => Boolean(t))
      .slice(0, 3);
  }, [progress.recentTutorialIds, tutorials]);

  const recommendedTutorials = useMemo(() => {
    const incomplete = tutorials.filter((t) => !completedSet.has(t.id));
    return (incomplete.length > 0 ? incomplete : tutorials).slice(0, 3);
  }, [tutorials, completedSet]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tutorials) {
      counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
    }
    return counts;
  }, [tutorials]);

  const filteredTutorials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = tutorials.filter((t) => {
      if (selectedCategoryId !== 'all' && t.categoryId !== selectedCategoryId) return false;
      const isDone = completedSet.has(t.id);
      if (statusFilter === 'completed' && !isDone) return false;
      if (statusFilter === 'incomplete' && isDone) return false;
      if (!q) return true;
      const catName = categoryMap.get(t.categoryId)?.name.toLowerCase() || '';
      const haystack = [
        t.title,
        t.shortDescription,
        t.fullDescription,
        catName,
        ...(t.keywords || []),
        ...(t.learningObjectives || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    if (sortBy === 'newest') {
      return [...list].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }
    if (sortBy === 'oldest') {
      return [...list].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
    }
    return [...list].sort((a, b) => a.order - b.order);
  }, [tutorials, selectedCategoryId, statusFilter, searchQuery, sortBy, completedSet, categoryMap]);

  const activeTutorial = useMemo(
    () => (activeTutorialId ? tutorials.find((t) => t.id === activeTutorialId) || null : null),
    [activeTutorialId, tutorials]
  );

  const activeIndex = useMemo(
    () => (activeTutorial ? tutorials.findIndex((t) => t.id === activeTutorial.id) : -1),
    [activeTutorial, tutorials]
  );

  const prevTutorial = activeIndex > 0 ? tutorials[activeIndex - 1] : null;
  const nextTutorial = activeIndex >= 0 && activeIndex < tutorials.length - 1 ? tutorials[activeIndex + 1] : null;

  const relatedTutorials = useMemo(() => {
    if (!activeTutorial) return [];
    const sameCategory = tutorials.filter(
      (t) => t.id !== activeTutorial.id && t.categoryId === activeTutorial.categoryId
    );
    const others = tutorials.filter(
      (t) => t.id !== activeTutorial.id && t.categoryId !== activeTutorial.categoryId
    );
    return [...sameCategory, ...others].slice(0, 3);
  }, [activeTutorial, tutorials]);

  const handleOpenTutorial = async (tutorial: AcademyTutorial, autoPlay = false) => {
    setActiveTutorialId(tutorial.id);
    setPlayerActivated(autoPlay);
    try {
      const updated = await academyService.markWatched(tutorial.id, authToken);
      setProgress(updated);
    } catch {
      // Keep UI responsive even if background watch ping fails
    }
  };

  const handleToggleCompleted = async (tutorial: AcademyTutorial, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentlyDone = completedSet.has(tutorial.id);
    setSavingProgressId(tutorial.id);
    try {
      const updated = await academyService.toggleCompleted(tutorial.id, !currentlyDone, authToken);
      setProgress(updated);
      onToast(
        !currentlyDone ? 'Tutorial Completed' : 'Marked as Incomplete',
        tutorial.title,
        !currentlyDone ? 'success' : 'info'
      );
    } catch (err) {
      onToast(
        'Could Not Save Progress',
        err instanceof Error ? err.message : 'Please try again.',
        'warning'
      );
    } finally {
      setSavingProgressId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-[#F8F9FB] dark:bg-[#090A0D] p-6 lg:p-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-24 text-center">
          <Loader2 size={24} className="animate-spin text-[#06B6D4] mb-3" />
          <p className="text-[13px] font-medium text-[#111827] dark:text-[#F3F4F6]">
            Loading SocialifyAI Academy
          </p>
          <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Fetching official tutorials and your learning progress…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto bg-[#F8F9FB] dark:bg-[#090A0D] p-6 lg:p-8">
        <div className="max-w-xl mx-auto mt-12 p-6 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] text-center">
          <AlertCircle size={24} className="text-[#F97316] mx-auto mb-3" />
          <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
            Unable to Load Academy
          </h2>
          <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] mt-1.5">{error}</p>
          <button
            type="button"
            onClick={() => void loadAcademyData()}
            className="mt-4 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-[7px] bg-[#111827] dark:bg-[#F3F4F6] text-white dark:text-[#090A0D] text-[12px] font-medium"
          >
            <RotateCcw size={13} strokeWidth={1.5} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // INDIVIDUAL TUTORIAL VIEWING EXPERIENCE
  // =========================================================================
  if (activeTutorial) {
    const isCompleted = completedSet.has(activeTutorial.id);
    const activeCategory = categoryMap.get(activeTutorial.categoryId);
    const embedUrl = getYouTubeEmbedUrl(activeTutorial.videoId, true);
    const descriptionLead = activeTutorial.fullDescription
      .split(/\n\s*\n/)[0]
      ?.trim() || activeTutorial.shortDescription;

    return (
      <div className="h-full overflow-y-auto bg-[#F8F9FB] dark:bg-[#090A0D]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
          {/* Top Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5E7EB] dark:border-white/[0.08]">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setActiveTutorialId(null)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] hover:border-[#06B6D4] transition-colors shrink-0"
              >
                <ArrowLeft size={14} strokeWidth={1.5} />
                Back to Academy
              </button>
              <span className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                {activeCategory?.name || 'Tutorial'} · Lesson {activeIndex + 1} of {totalCount}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!prevTutorial}
                onClick={() => prevTutorial && void handleOpenTutorial(prevTutorial, false)}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-[7px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] disabled:opacity-40 hover:border-[#06B6D4] transition-colors"
              >
                <ChevronLeft size={14} strokeWidth={1.5} />
                Previous
              </button>
              <button
                type="button"
                disabled={!nextTutorial}
                onClick={() => nextTutorial && void handleOpenTutorial(nextTutorial, false)}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-[7px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] disabled:opacity-40 hover:border-[#06B6D4] transition-colors"
              >
                Next Tutorial
                <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* 12-Column Learning Layout: Main Video + Playlist Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / MAIN AREA (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Lazy-Loaded Video Player Frame */}
              <div className="rounded-[10px] overflow-hidden border border-[#E5E7EB] dark:border-white/[0.08] bg-[#090A0D]">
                {playerActivated && embedUrl ? (
                  <div className="aspect-video w-full">
                    <iframe
                      key={activeTutorial.videoId}
                      src={embedUrl}
                      title={activeTutorial.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerActivated(true);
                      void academyService.markWatched(activeTutorial.id, authToken).then(setProgress).catch(() => {});
                    }}
                    className="group block w-full text-left focus:outline-none"
                    aria-label={`Play ${activeTutorial.title}`}
                  >
                    <ThumbnailFrame
                      videoId={activeTutorial.videoId}
                      thumbnailUrl={activeTutorial.thumbnailUrl}
                      title={activeTutorial.title}
                      duration={activeTutorial.duration}
                      size="player"
                    />
                  </button>
                )}
              </div>

              {/* Title, Metadata & Completion Controls */}
              <div className="p-5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                      <span className="text-[#06B6D4]">{activeCategory?.name || 'Tutorial'}</span>
                      {activeTutorial.duration && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                            <Clock size={11} strokeWidth={1.5} />
                            {activeTutorial.duration}
                          </span>
                        </>
                      )}
                      {activeTutorial.publishedAt && (
                        <>
                          <span>·</span>
                          <span>Published {formatPublishedDate(activeTutorial.publishedAt)}</span>
                        </>
                      )}
                    </div>
                    <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6] leading-snug">
                      {activeTutorial.title}
                    </h1>
                  </div>

                  <button
                    type="button"
                    disabled={savingProgressId === activeTutorial.id}
                    onClick={(e) => void handleToggleCompleted(activeTutorial, e)}
                    className={`inline-flex items-center justify-center gap-2 h-9 px-4 rounded-[7px] text-[12px] font-medium transition-colors shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-[#111827] dark:bg-[#F3F4F6] text-white dark:text-[#090A0D] hover:opacity-90'
                    }`}
                  >
                    {savingProgressId === activeTutorial.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isCompleted ? (
                      <CheckCircle2 size={14} strokeWidth={1.75} />
                    ) : (
                      <Circle size={14} strokeWidth={1.75} />
                    )}
                    {isCompleted ? 'Completed' : 'Mark as Completed'}
                  </button>
                </div>

                <p className="text-[13px] leading-relaxed text-[#4B5563] dark:text-[#9CA3AF]">
                  {descriptionLead}
                </p>

                <div className="pt-3 border-t border-[#E5E7EB] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-[12px]">
                  <a
                    href={activeTutorial.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#06B6D4] transition-colors"
                  >
                    <ExternalLink size={13} strokeWidth={1.5} />
                    Watch on YouTube
                  </a>

                  {nextTutorial && (
                    <button
                      type="button"
                      onClick={() => void handleOpenTutorial(nextTutorial, false)}
                      className="inline-flex items-center gap-1.5 font-medium text-[#06B6D4] hover:underline"
                    >
                      Up next: {nextTutorial.title}
                      <ChevronRight size={14} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>

              {/* What You Will Learn (Only when populated) */}
              {activeTutorial.learningObjectives && activeTutorial.learningObjectives.length > 0 && (
                <section className="p-5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen size={15} strokeWidth={1.5} className="text-[#06B6D4]" />
                    <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      What You Will Learn
                    </h2>
                  </div>
                  <ul className="space-y-2.5">
                    {activeTutorial.learningObjectives.map((obj, idx) => {
                      const colonIdx = obj.indexOf(':');
                      const hasLead = colonIdx > 0 && colonIdx < 48;
                      return (
                        <li
                          key={`${activeTutorial.id}-obj-${idx}`}
                          className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#4B5563] dark:text-[#9CA3AF]"
                        >
                          <CheckCircle2
                            size={15}
                            strokeWidth={1.6}
                            className="text-[#06B6D4] shrink-0 mt-0.5"
                          />
                          <span>
                            {hasLead ? (
                              <>
                                <strong className="font-medium text-[#111827] dark:text-[#F3F4F6]">
                                  {obj.slice(0, colonIdx + 1)}
                                </strong>
                                {obj.slice(colonIdx + 1)}
                              </>
                            ) : (
                              obj
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Step-by-Step Instructions — STRICTLY rendered ONLY when verified steps exist */}
              {activeTutorial.steps && activeTutorial.steps.length > 0 && (
                <section className="p-5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] space-y-3.5">
                  <div className="flex items-center gap-2">
                    <ListChecks size={15} strokeWidth={1.5} className="text-[#06B6D4]" />
                    <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      Step-by-Step Instructions
                    </h2>
                  </div>
                  <ol className="space-y-3">
                    {activeTutorial.steps.map((step, idx) => (
                      <li
                        key={`${activeTutorial.id}-step-${idx}`}
                        className="flex items-start gap-3 pb-3 last:pb-0 border-b last:border-b-0 border-[#E5E7EB] dark:border-white/[0.06]"
                      >
                        <span className="w-6 h-6 rounded-[6px] bg-[#F3F4F6] dark:bg-[#191D26] border border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-center text-[11px] font-mono tabular-nums font-semibold text-[#111827] dark:text-[#F3F4F6] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-[13px] font-medium text-[#111827] dark:text-[#F3F4F6]">
                            {step.title}
                          </p>
                          {step.detail && (
                            <p className="text-[12.5px] leading-relaxed text-[#4B5563] dark:text-[#9CA3AF]">
                              {step.detail}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Important Tips — ONLY rendered when populated */}
              {activeTutorial.tips && activeTutorial.tips.length > 0 && (
                <section className="p-5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={15} strokeWidth={1.5} className="text-[#F97316]" />
                    <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      Important Tips
                    </h2>
                  </div>
                  <ul className="space-y-2">
                    {activeTutorial.tips.map((tip, idx) => (
                      <li
                        key={`${activeTutorial.id}-tip-${idx}`}
                        className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#4B5563] dark:text-[#9CA3AF]"
                      >
                        <span className="text-[#F97316] font-mono text-[12px] mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Related Tutorials */}
              {relatedTutorials.length > 0 && (
                <section className="space-y-3 pt-2">
                  <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Related Tutorials
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {relatedTutorials.map((rel) => {
                      const relDone = completedSet.has(rel.id);
                      const relCat = categoryMap.get(rel.categoryId);
                      return (
                        <button
                          key={rel.id}
                          type="button"
                          onClick={() => void handleOpenTutorial(rel, false)}
                          className="group text-left rounded-[10px] overflow-hidden bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] transition-colors flex flex-col"
                        >
                          <ThumbnailFrame
                            videoId={rel.videoId}
                            thumbnailUrl={rel.thumbnailUrl}
                            title={rel.title}
                            duration={rel.duration}
                            completed={relDone}
                            size="compact"
                          />
                          <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                            <p className="text-[11px] font-medium text-[#06B6D4] truncate">
                              {relCat?.name || 'Tutorial'}
                            </p>
                            <p className="text-[12.5px] font-medium text-[#111827] dark:text-[#F3F4F6] line-clamp-2 leading-snug">
                              {rel.title}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* RIGHT SIDEBAR: COURSE PLAYLIST (4 cols) */}
            <aside className="lg:col-span-4 lg:sticky lg:top-6 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] overflow-hidden">
              <div className="p-4 border-b border-[#E5E7EB] dark:border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Academy Curriculum
                  </h2>
                  <span className="text-[11px] font-mono tabular-nums text-[#6B7280] dark:text-[#9CA3AF]">
                    {completedCount}/{totalCount} completed
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#E5E7EB] dark:bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full bg-[#06B6D4] transition-all duration-300"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>

              <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.06] max-h-[620px] overflow-y-auto">
                {tutorials.map((tut, index) => {
                  const isCurrent = tut.id === activeTutorial.id;
                  const done = completedSet.has(tut.id);
                  const cat = categoryMap.get(tut.categoryId);
                  return (
                    <button
                      key={tut.id}
                      type="button"
                      onClick={() => void handleOpenTutorial(tut, false)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                        isCurrent
                          ? 'bg-[#06B6D4]/[0.08] dark:bg-[#06B6D4]/[0.12]'
                          : 'hover:bg-[#F8F9FB] dark:hover:bg-[#191D26]'
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {done ? (
                          <CheckCircle2 size={15} strokeWidth={1.75} className="text-emerald-500" />
                        ) : isCurrent ? (
                          <Play size={15} strokeWidth={1.75} className="text-[#06B6D4] fill-[#06B6D4]" />
                        ) : (
                          <span className="w-4 h-4 inline-flex items-center justify-center text-[11px] font-mono tabular-nums text-[#6B7280] dark:text-[#9CA3AF]">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p
                          className={`text-[12.5px] leading-snug line-clamp-2 ${
                            isCurrent
                              ? 'font-semibold text-[#111827] dark:text-[#F3F4F6]'
                              : 'font-medium text-[#374151] dark:text-[#D1D5DB]'
                          }`}
                        >
                          {tut.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                          <span className="truncate">{cat?.name || 'Tutorial'}</span>
                          {tut.duration && (
                            <>
                              <span>·</span>
                              <span className="font-mono tabular-nums shrink-0">{tut.duration}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ACADEMY LANDING PAGE
  // =========================================================================
  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB] dark:bg-[#090A0D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Hero Header */}
        <section className="p-6 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#06B6D4]">
                <GraduationCap size={14} strokeWidth={1.75} />
                <span>SocialifyAI Learning Center</span>
              </div>
              <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.025em] text-[#111827] dark:text-[#F3F4F6] leading-tight">
                Welcome to SocialifyAI Academy
              </h1>
              <p className="text-[13.5px] text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                Everything you need to master SocialifyAI, one tutorial at a time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {resumeTutorial && (
                <button
                  type="button"
                  onClick={() => void handleOpenTutorial(resumeTutorial, true)}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-[7px] bg-[#111827] dark:bg-[#F3F4F6] text-white dark:text-[#090A0D] text-[12.5px] font-medium hover:opacity-90 transition-opacity"
                >
                  <Play size={14} strokeWidth={1.75} className="fill-current" />
                  {progress.lastWatchedTutorialId ? 'Resume Watching' : 'Start First Tutorial'}
                </button>
              )}
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[7px] bg-[#FFFFFF] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] text-[12.5px] font-medium text-[#111827] dark:text-[#F3F4F6] hover:border-[#06B6D4] transition-colors"
              >
                Official YouTube Channel
                <ExternalLink size={13} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Real Overall Progress Bar */}
          <div className="mt-6 pt-5 border-t border-[#E5E7EB] dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-[#111827] dark:text-[#F3F4F6]">
                Overall Learning Progress
              </span>
              <span className="font-mono tabular-nums text-[#4B5563] dark:text-[#9CA3AF]">
                {completedCount} of {totalCount} tutorials completed ({completionPct}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#F3F4F6] dark:bg-white/[0.08] overflow-hidden">
              <div
                className="h-full bg-[#06B6D4] transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </section>

        {/* Real Learning KPI Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08]">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B7280] dark:text-[#9CA3AF]">
              Published Tutorials
            </p>
            <p className="mt-1.5 text-[24px] font-semibold font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6]">
              {totalCount}
            </p>
            <p className="mt-0.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
              Across {categories.length} learning {categories.length === 1 ? 'track' : 'tracks'}
            </p>
          </div>

          <div className="p-4 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08]">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B7280] dark:text-[#9CA3AF]">
              Completed
            </p>
            <p className="mt-1.5 text-[24px] font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {completedCount}
            </p>
            <p className="mt-0.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
              Saved to your account
            </p>
          </div>

          <div className="p-4 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08]">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B7280] dark:text-[#9CA3AF]">
              Remaining
            </p>
            <p className="mt-1.5 text-[24px] font-semibold font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6]">
              {remainingCount}
            </p>
            <p className="mt-0.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
              {remainingCount === 0 && totalCount > 0 ? 'Curriculum complete' : 'Ready to watch'}
            </p>
          </div>

          <div className="p-4 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08]">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B7280] dark:text-[#9CA3AF]">
              Completion Rate
            </p>
            <p className="mt-1.5 text-[24px] font-semibold font-mono tabular-nums text-[#06B6D4]">
              {completionPct}%
            </p>
            <p className="mt-0.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
              {progress.watchedTutorialIds.length} watched so far
            </p>
          </div>
        </section>

        {/* Continue Watching & Recommended Next Strip */}
        {(recentlyWatchedTutorials.length > 0 || recommendedTutorials.length > 0) && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Resume / Recently Watched */}
            <div className="p-5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                  {recentlyWatchedTutorials.length > 0 ? 'Continue Watching' : 'Start Here'}
                </h2>
                <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                  {recentlyWatchedTutorials.length > 0 ? 'Recently viewed' : 'Recommended first step'}
                </span>
              </div>

              {recentlyWatchedTutorials.length > 0 ? (
                <div className="space-y-2.5">
                  {recentlyWatchedTutorials.map((tut) => {
                    const done = completedSet.has(tut.id);
                    const cat = categoryMap.get(tut.categoryId);
                    return (
                      <button
                        key={tut.id}
                        type="button"
                        onClick={() => void handleOpenTutorial(tut, false)}
                        className="w-full text-left p-2.5 rounded-[8px] border border-[#E5E7EB] dark:border-white/[0.07] hover:border-[#06B6D4] transition-colors flex items-center gap-3"
                      >
                        <div className="w-24 shrink-0 rounded-[5px] overflow-hidden">
                          <ThumbnailFrame
                            videoId={tut.videoId}
                            thumbnailUrl={tut.thumbnailUrl}
                            title={tut.title}
                            duration={tut.duration}
                            size="compact"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-[#06B6D4] truncate">
                            {cat?.name || 'Tutorial'}
                          </p>
                          <p className="text-[12.5px] font-medium text-[#111827] dark:text-[#F3F4F6] line-clamp-1 mt-0.5">
                            {tut.title}
                          </p>
                          <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                            {done ? 'Completed · Watch again' : 'In progress · Resume'}
                          </p>
                        </div>
                        <ChevronRight size={15} strokeWidth={1.5} className="text-[#9CA3AF] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ) : resumeTutorial ? (
                <button
                  type="button"
                  onClick={() => void handleOpenTutorial(resumeTutorial, true)}
                  className="group w-full text-left p-3 rounded-[8px] border border-[#E5E7EB] dark:border-white/[0.07] hover:border-[#06B6D4] transition-colors flex flex-col sm:flex-row items-start sm:items-center gap-3.5"
                >
                  <div className="w-full sm:w-36 shrink-0 rounded-[6px] overflow-hidden">
                    <ThumbnailFrame
                      videoId={resumeTutorial.videoId}
                      thumbnailUrl={resumeTutorial.thumbnailUrl}
                      title={resumeTutorial.title}
                      duration={resumeTutorial.duration}
                      size="compact"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="text-[11px] font-medium text-[#06B6D4]">
                      {categoryMap.get(resumeTutorial.categoryId)?.name || 'Getting Started'}
                    </span>
                    <p className="text-[13.5px] font-semibold text-[#111827] dark:text-[#F3F4F6] leading-snug">
                      {resumeTutorial.title}
                    </p>
                    <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] line-clamp-2">
                      {resumeTutorial.shortDescription}
                    </p>
                  </div>
                </button>
              ) : null}
            </div>

            {/* Recommended Next */}
            <div className="p-5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} strokeWidth={1.5} className="text-[#F97316]" />
                  <h2 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Recommended Tutorials
                  </h2>
                </div>
                <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                  {remainingCount > 0 ? 'Next up in curriculum' : 'Core library'}
                </span>
              </div>

              <div className="space-y-2">
                {recommendedTutorials.map((tut) => {
                  const done = completedSet.has(tut.id);
                  const cat = categoryMap.get(tut.categoryId);
                  return (
                    <button
                      key={tut.id}
                      type="button"
                      onClick={() => void handleOpenTutorial(tut, false)}
                      className="w-full text-left px-3 py-2.5 rounded-[8px] border border-[#E5E7EB] dark:border-white/[0.07] hover:border-[#06B6D4] transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {done ? (
                          <CheckCircle2 size={15} strokeWidth={1.75} className="text-emerald-500 shrink-0" />
                        ) : (
                          <Play size={14} strokeWidth={1.75} className="text-[#06B6D4] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium text-[#111827] dark:text-[#F3F4F6] truncate">
                            {tut.title}
                          </p>
                          <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                            {cat?.name || 'Tutorial'}
                            {tut.duration ? ` · ${tut.duration}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-[#06B6D4] shrink-0">Watch</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Search, Category Filters, Status & Sort Toolbar */}
        <section className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={15}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-[#9CA3AF]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tutorials by title, feature, or keyword…"
                className="w-full h-9 pl-9 pr-3 rounded-[7px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] text-[12.5px] text-[#111827] dark:text-[#F3F4F6] placeholder-[#6B7280] focus:outline-none focus:border-[#06B6D4]"
              />
            </div>

            {/* Status Segmented Filter */}
            <div className="inline-flex items-center p-0.5 rounded-[7px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] shrink-0">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'incomplete', label: 'Incomplete' },
                  { id: 'completed', label: 'Completed' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatusFilter(opt.id)}
                  className={`h-8 px-3 rounded-[5px] text-[12px] font-medium transition-colors ${
                    statusFilter === opt.id
                      ? 'bg-[#111827] dark:bg-[#F3F4F6] text-white dark:text-[#090A0D]'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Sort Select */}
            <div className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-[7px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] shrink-0">
              <SlidersHorizontal size={13} strokeWidth={1.5} className="text-[#6B7280] dark:text-[#9CA3AF]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort tutorials"
                className="bg-transparent text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] focus:outline-none cursor-pointer"
              >
                <option value="default" className="bg-[#FFFFFF] dark:bg-[#13161D]">
                  Curriculum Order
                </option>
                <option value="newest" className="bg-[#FFFFFF] dark:bg-[#13161D]">
                  Newest First
                </option>
                <option value="oldest" className="bg-[#FFFFFF] dark:bg-[#13161D]">
                  Oldest First
                </option>
              </select>
            </div>
          </div>

          {/* Dynamic Category Filter Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`h-8 px-3 rounded-[7px] text-[12px] font-medium whitespace-nowrap border transition-colors ${
                selectedCategoryId === 'all'
                  ? 'bg-[#06B6D4]/12 border-[#06B6D4] text-[#0891B2] dark:text-[#06B6D4]'
                  : 'bg-[#FFFFFF] dark:bg-[#13161D] border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
              }`}
            >
              All Tutorials <span className="ml-1 font-mono tabular-nums opacity-75">{totalCount}</span>
            </button>
            {categories.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              const active = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`h-8 px-3 rounded-[7px] text-[12px] font-medium whitespace-nowrap border transition-colors ${
                    active
                      ? 'bg-[#06B6D4]/12 border-[#06B6D4] text-[#0891B2] dark:text-[#06B6D4]'
                      : 'bg-[#FFFFFF] dark:bg-[#13161D] border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                  }`}
                >
                  {cat.name} <span className="ml-1 font-mono tabular-nums opacity-75">{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Tutorial Library Grid */}
        {filteredTutorials.length === 0 ? (
          <div className="p-10 rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] text-center space-y-2.5">
            <GraduationCap size={26} strokeWidth={1.5} className="text-[#9CA3AF] mx-auto" />
            <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
              No matching tutorials found
            </h3>
            <p className="text-[12.5px] text-[#6B7280] dark:text-[#9CA3AF] max-w-md mx-auto">
              Try clearing your search query or switching the category or completion filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId('all');
                setStatusFilter('all');
              }}
              className="mt-2 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-[7px] border border-[#E5E7EB] dark:border-white/[0.1] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] hover:border-[#06B6D4]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTutorials.map((tutorial) => {
              const isDone = completedSet.has(tutorial.id);
              const cat = categoryMap.get(tutorial.categoryId);
              return (
                <article
                  key={tutorial.id}
                  onClick={() => void handleOpenTutorial(tutorial, false)}
                  className="group cursor-pointer rounded-[10px] overflow-hidden bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] transition-colors flex flex-col"
                >
                  <ThumbnailFrame
                    videoId={tutorial.videoId}
                    thumbnailUrl={tutorial.thumbnailUrl}
                    title={tutorial.title}
                    duration={tutorial.duration}
                    completed={isDone}
                    size="card"
                  />

                  <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      {/* Unboxed Metadata Row */}
                      <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
                        <span className="text-[#06B6D4] truncate">{cat?.name || 'Tutorial'}</span>
                        <span className="text-[#6B7280] dark:text-[#9CA3AF] shrink-0">
                          {tutorial.duration || formatPublishedDate(tutorial.publishedAt)}
                        </span>
                      </div>

                      <h3 className="text-[14.5px] font-semibold text-[#111827] dark:text-[#F3F4F6] leading-snug line-clamp-2 group-hover:text-[#06B6D4] transition-colors">
                        {tutorial.title}
                      </h3>

                      <p className="text-[12.5px] text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed line-clamp-2">
                        {tutorial.shortDescription}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#E5E7EB] dark:border-white/[0.06] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleOpenTutorial(tutorial, true);
                        }}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] bg-[#111827] dark:bg-[#F3F4F6] text-white dark:text-[#090A0D] text-[12px] font-medium hover:opacity-90 transition-opacity"
                      >
                        <Play size={12} strokeWidth={1.75} className="fill-current" />
                        Watch Tutorial
                      </button>

                      <button
                        type="button"
                        disabled={savingProgressId === tutorial.id}
                        onClick={(e) => void handleToggleCompleted(tutorial, e)}
                        title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[7px] text-[11.5px] font-medium border transition-colors ${
                          isDone
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'border-[#E5E7EB] dark:border-white/[0.08] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                        }`}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 size={13} strokeWidth={1.75} />
                            Done
                          </>
                        ) : (
                          <>
                            <Circle size={13} strokeWidth={1.75} />
                            Complete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};
