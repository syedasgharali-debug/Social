import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Grid3X3,
  List,
  Clock,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  Repeat,
  X,
} from 'lucide-react';
import { SocialPost, ContentCategory, Platform } from '../../types';
import { PlatformTag, SocialLogo } from '../common/PlatformMeta';
import { StatusBadge, EmptyStatePanel } from '../common/DesignPrimitives';

interface VisualSchedulerProps {
  workspaceId: string;
  workspaceHandle: string;
  posts: SocialPost[];
  categories: ContentCategory[];
  onUpdatePost: (post: SocialPost) => void;
  onDeletePost: (id: string) => void;
  onUpdateCategory: (cat: ContentCategory) => void;
  onEditInStudio: (post: SocialPost) => void;
  onComposeNew: () => void;
  onToast: (title: string, description?: string) => void;
}

type SchedulerView = 'calendar' | 'ig_grid' | 'list' | 'matrix';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function VisualScheduler({
  workspaceId,
  workspaceHandle,
  posts,
  categories,
  onUpdatePost,
  onDeletePost,
  onUpdateCategory,
  onEditInStudio,
  onComposeNew,
  onToast,
}: VisualSchedulerProps) {
  const wsPosts = useMemo(
    () => posts.filter((p) => p.workspaceId === workspaceId),
    [posts, workspaceId]
  );
  const wsCategories = useMemo(
    () => categories.filter((c) => c.workspaceId === workspaceId),
    [categories, workspaceId]
  );

  const [view, setView] = useState<SchedulerView>('calendar');
  const [calendarScale, setCalendarScale] = useState<'month' | 'week'>('month');
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [draggedIgPostId, setDraggedIgPostId] = useState<string | null>(null);
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);

  const [listStatusFilter, setListStatusFilter] = useState<string>('all');
  const [listCatFilter, setListCatFilter] = useState<string>('all');
  const [rescheduleTarget, setRescheduleTarget] = useState<SocialPost | null>(null);
  const [rescheduleInput, setRescheduleInput] = useState('');

  // Matrix add slot state
  const [slotDay, setSlotDay] = useState('Mon');
  const [slotTime, setSlotTime] = useState('09:00');
  const [slotCatId, setSlotCatId] = useState(wsCategories[0]?.id || '');

  const monthDays = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `2026-11-${String(dayNum).padStart(2, '0')}`;
      return { dayNum, dateStr };
    });
  }, []);

  const weekDays = useMemo(() => {
    return [9, 10, 11, 12, 13, 14, 15].map((dayNum, idx) => ({
      dayNum,
      dayLabel: DAYS_OF_WEEK[idx],
      dateStr: `2026-11-${String(dayNum).padStart(2, '0')}`,
    }));
  }, []);

  const igPosts = useMemo(() => {
    return wsPosts
      .filter((p) => p.platforms.includes('instagram'))
      .sort((a, b) => (a.igGridOrder ?? 99) - (b.igGridOrder ?? 99))
      .slice(0, 9);
  }, [wsPosts]);

  const filteredListPosts = useMemo(() => {
    return wsPosts
      .filter((p) => {
        const matchStatus = listStatusFilter === 'all' || p.status === listStatusFilter;
        const matchCat = listCatFilter === 'all' || p.categoryId === listCatFilter;
        return matchStatus && matchCat;
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }, [wsPosts, listStatusFilter, listCatFilter]);

  const getCategoryColor = (catId?: string) =>
    wsCategories.find((c) => c.id === catId)?.color || '#06B6D4';

  const getCategoryName = (catId?: string) =>
    wsCategories.find((c) => c.id === catId)?.name || 'General';

  const handleDropOnDate = (dateStr: string) => {
    setDragOverDateKey(null);
    if (!draggedPostId) return;
    const post = wsPosts.find((p) => p.id === draggedPostId);
    if (!post) return;
    const timePart = post.scheduledAt.includes('T') ? post.scheduledAt.split('T')[1] : '09:00:00Z';
    const nextIso = `${dateStr}T${timePart}`;
    onUpdatePost({ ...post, scheduledAt: nextIso });
    onToast('Post Rescheduled', `Moved to ${dateStr} via drag-and-drop.`);
    setDraggedPostId(null);
  };

  const handleSwapIgGrid = (targetPostId: string) => {
    if (!draggedIgPostId || draggedIgPostId === targetPostId) return;
    const ordered = [...igPosts];
    const fromIdx = ordered.findIndex((p) => p.id === draggedIgPostId);
    const toIdx = ordered.findIndex((p) => p.id === targetPostId);
    if (fromIdx < 0 || toIdx < 0) return;

    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);

    ordered.forEach((p, idx) => {
      onUpdatePost({ ...p, igGridOrder: idx + 1 });
    });
    onToast('Instagram Grid Reordered', 'Updated 3×3 aesthetic preview sequence.');
    setDraggedIgPostId(null);
  };

  const handleShiftIgTile = (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= igPosts.length) return;
    const ordered = [...igPosts];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(targetIdx, 0, moved);
    ordered.forEach((p, idx) => {
      onUpdatePost({ ...p, igGridOrder: idx + 1 });
    });
    onToast('Grid Position Updated');
  };

  const handleAddMatrixSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCat = wsCategories.find((c) => c.id === (slotCatId || wsCategories[0]?.id));
    if (!targetCat) return;
    onUpdateCategory({
      ...targetCat,
      postsPerWeek: targetCat.postsPerWeek + 1,
      timeSlots: [...targetCat.timeSlots, { day: slotDay, time: slotTime }],
    });
    onToast('Recurring Slot Added', `${slotDay} ${slotTime} → ${targetCat.name}`);
  };

  const statusTone = (status: SocialPost['status']) => {
    if (status === 'published') return 'emerald' as const;
    if (status === 'pending_approval') return 'orange' as const;
    if (status === 'scheduled' || status === 'approved') return 'cyan' as const;
    return 'neutral' as const;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F8F9FB] dark:bg-[#090A0D]">
      {/* Header Toolbar */}
      <div className="px-6 py-4 bg-white dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-[18px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em]">
            Visual Content Scheduler
          </h1>
          <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
            Drag posts across dates, sequence your 3×3 Instagram Grid, or configure weekly recurring category slots.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-[#F3F4F6] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] p-0.5 rounded-lg text-[12px] font-medium">
            {(
              [
                { id: 'calendar', label: 'Calendar', icon: Calendar },
                { id: 'ig_grid', label: 'IG 3×3 Grid', icon: Grid3X3 },
                { id: 'list', label: 'List View', icon: List },
                { id: 'matrix', label: 'Weekly Matrix', icon: Clock },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                    view === item.id
                      ? 'bg-white dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.1]'
                      : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
                  }`}
                >
                  <Icon size={13} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onComposeNew}
            className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus size={13} strokeWidth={1.75} /> Schedule Post
          </button>
        </div>
      </div>

      {/* VIEW 1: CALENDAR VIEW */}
      {view === 'calendar' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                November 2026
              </h2>
              <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                Drag any post card onto a date cell to reschedule.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 text-[11px]">
                {wsCategories.slice(0, 4).map((cat) => (
                  <span key={cat.id} className="flex items-center gap-1.5 font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </span>
                ))}
              </div>

              <div className="inline-flex bg-[#F3F4F6] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] p-0.5 rounded-lg text-[11px] font-medium">
                <button
                  onClick={() => setCalendarScale('month')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    calendarScale === 'month'
                      ? 'bg-white dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.1]'
                      : 'text-[#6B7280] dark:text-[#9CA3AF] border border-transparent'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setCalendarScale('week')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    calendarScale === 'week'
                      ? 'bg-white dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.1]'
                      : 'text-[#6B7280] dark:text-[#9CA3AF] border border-transparent'
                  }`}
                >
                  Week
                </button>
              </div>
            </div>
          </div>

          {calendarScale === 'month' ? (
            <div className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
              <div className="grid grid-cols-7 border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-[#9CA3AF] divide-x divide-[#E5E7EB] dark:divide-white/[0.08]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="px-3 py-2 text-center">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
                {monthDays.map(({ dayNum, dateStr }) => {
                  const dayPosts = wsPosts.filter((p) => p.scheduledAt.startsWith(dateStr));
                  const isToday = dayNum === 13;
                  const isOver = dragOverDateKey === dateStr;
                  return (
                    <div
                      key={dateStr}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverDateKey(dateStr);
                      }}
                      onDragLeave={() => setDragOverDateKey(null)}
                      onDrop={() => handleDropOnDate(dateStr)}
                      className={`min-h-[126px] p-2 transition-colors ${
                        isOver
                          ? 'bg-[#06B6D4]/[0.07] ring-1 ring-inset ring-[#06B6D4]'
                          : isToday
                          ? 'bg-[#06B6D4]/[0.03]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-[11px] font-mono font-semibold tabular-nums ${
                            isToday
                              ? 'px-1.5 py-0.5 rounded bg-[#06B6D4] text-[#090A0D]'
                              : 'text-[#6B7280] dark:text-[#9CA3AF]'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {dayPosts.length > 0 && (
                          <span className="text-[10px] font-mono text-[#9CA3AF] dark:text-[#6B7280] tabular-nums">
                            {dayPosts.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {dayPosts.map((post) => {
                          const catColor = getCategoryColor(post.categoryId);
                          return (
                            <div
                              key={post.id}
                              draggable
                              onDragStart={() => setDraggedPostId(post.id)}
                              onClick={() => onEditInStudio(post)}
                              className="p-2 rounded-lg border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] hover:border-[#06B6D4] cursor-grab active:cursor-grabbing transition-colors"
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px]">
                                <span className="flex items-center gap-1 min-w-0">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: catColor }}
                                  />
                                  <span className="inline-flex items-center gap-1">
                                    {post.platforms.slice(0, 3).map((pl) => (
                                      <SocialLogo key={pl} platform={pl} size={14} />
                                    ))}
                                  </span>
                                </span>
                                <span
                                  className={`font-medium shrink-0 ${
                                    post.status === 'pending_approval'
                                      ? 'text-[#F97316]'
                                      : post.status === 'published'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-[#0891B2] dark:text-[#22D3EE]'
                                  }`}
                                >
                                  {post.status === 'pending_approval' ? 'Pending' : post.status}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-[#111827] dark:text-[#E5E7EB] line-clamp-2 leading-snug">
                                {post.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-7 rounded-[12px] border border-[#E5E7EB] dark:border-white/[0.08] bg-white dark:bg-[#13161D] divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB] dark:divide-white/[0.08] overflow-hidden">
              {weekDays.map(({ dayNum, dayLabel, dateStr }) => {
                const dayPosts = wsPosts.filter((p) => p.scheduledAt.startsWith(dateStr));
                const isOver = dragOverDateKey === dateStr;
                return (
                  <div
                    key={dateStr}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverDateKey(dateStr);
                    }}
                    onDragLeave={() => setDragOverDateKey(null)}
                    onDrop={() => handleDropOnDate(dateStr)}
                    className={`p-3 min-h-[380px] flex flex-col transition-colors ${
                      isOver ? 'bg-[#06B6D4]/[0.07] ring-1 ring-inset ring-[#06B6D4]' : ''
                    }`}
                  >
                    <div className="pb-2 mb-2.5 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#111827] dark:text-[#F3F4F6]">{dayLabel}</span>
                      <span className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">Nov {dayNum}</span>
                    </div>
                    <div className="space-y-2 flex-1">
                      {dayPosts.map((post) => (
                        <div
                          key={post.id}
                          draggable
                          onDragStart={() => setDraggedPostId(post.id)}
                          onClick={() => onEditInStudio(post)}
                          className="p-2.5 rounded-lg border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] hover:border-[#06B6D4] cursor-grab space-y-1.5 transition-colors"
                        >
                          {post.media?.[0] && (
                            <img src={post.media[0]} alt="" className="w-full h-20 object-cover rounded-md" />
                          )}
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[10px] font-medium text-[#4B5563] dark:text-[#9CA3AF] flex items-center gap-1.5 truncate">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: getCategoryColor(post.categoryId) }}
                              />
                              {getCategoryName(post.categoryId)}
                            </p>
                            <div className="flex items-center gap-1">
                              {post.platforms.slice(0, 2).map((pl) => (
                                <SocialLogo key={pl} platform={pl} size={14} />
                              ))}
                            </div>
                          </div>
                          <p className="text-[11px] text-[#111827] dark:text-[#F3F4F6] line-clamp-3">{post.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: INSTAGRAM 3x3 VISUAL GRID VIEW */}
      {view === 'ig_grid' && (
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 flex justify-center p-6 rounded-[12px] border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F3F4F6]/60 dark:bg-[#0E1015] canvas-dot-grid">
              <div className="w-full max-w-[340px] rounded-[28px] border-[5px] border-[#111827] dark:border-white/[0.15] bg-white dark:bg-[#13161D] overflow-hidden">
                <div className="px-4 py-2.5 flex items-center justify-between text-[11px] font-medium text-[#111827] dark:text-[#F3F4F6] border-b border-[#E5E7EB] dark:border-white/[0.08]">
                  <span className="font-mono">{workspaceHandle}</span>
                  <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">IG Visual Planner</span>
                </div>

                {/* Real Workspace Metrics */}
                <div className="p-4 flex items-center gap-4 border-b border-[#E5E7EB] dark:border-white/[0.08]">
                  <div className="w-12 h-12 rounded-full border border-[#E5E7EB] dark:border-white/[0.15] bg-[#F8F9FB] dark:bg-[#0E1015] flex items-center justify-center shrink-0">
                    <SocialLogo platform="instagram" size={20} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 flex-1 text-center text-[12px] tabular-nums">
                    <div>
                      <p className="font-semibold text-[#111827] dark:text-[#F3F4F6]">{igPosts.length}</p>
                      <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">IG Queue</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#111827] dark:text-[#F3F4F6]">{wsPosts.length}</p>
                      <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">Total Posts</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#111827] dark:text-[#F3F4F6]">{wsCategories.length}</p>
                      <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">Categories</p>
                    </div>
                  </div>
                </div>

                {igPosts.length === 0 ? (
                  <div className="p-8 text-center text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
                    No Instagram posts queued yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-0.5 bg-[#E5E7EB] dark:bg-white/[0.08] p-0.5">
                    {igPosts.map((post, idx) => (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={() => setDraggedIgPostId(post.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleSwapIgGrid(post.id)}
                        className="relative aspect-square bg-[#F3F4F6] dark:bg-[#0E1015] overflow-hidden group cursor-grab active:cursor-grabbing"
                      >
                        {post.media?.[0] ? (
                          <img src={post.media[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full p-2 flex items-center justify-center text-[10px] text-center text-[#4B5563] dark:text-[#9CA3AF]">
                            {post.content.slice(0, 40)}...
                          </div>
                        )}
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-mono font-semibold tabular-nums">
                          #{idx + 1}
                        </span>
                        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between text-white">
                          <p className="text-[10px] line-clamp-3 leading-tight">{post.content}</p>
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => handleShiftIgTile(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded bg-white/15 hover:bg-white/25 disabled:opacity-30"
                              title="Move earlier"
                            >
                              <ArrowLeft size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditInStudio(post)}
                              className="text-[10px] font-semibold underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleShiftIgTile(idx, 1)}
                              disabled={idx === igPosts.length - 1}
                              className="p-1 rounded bg-white/15 hover:bg-white/25 disabled:opacity-30"
                              title="Move later"
                            >
                              <ArrowRight size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5 space-y-4">
              <div>
                <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em] tabular-nums">
                  3×3 Aesthetic Grid Sequence ({igPosts.length} Instagram Posts)
                </h2>
                <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                  Drag tiles directly on the phone preview or use arrows to balance visual rhythm before publishing.
                </p>
              </div>

              {igPosts.length === 0 ? (
                <EmptyStatePanel
                  icon={Grid3X3}
                  title="No Instagram posts scheduled"
                  description="Create an Instagram post in Content Studio to preview and sequence your 3×3 grid."
                  actionLabel="Schedule Post"
                  onAction={onComposeNew}
                />
              ) : (
                <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.06]">
                  {igPosts.map((post, idx) => (
                    <div key={post.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <GripVertical size={14} strokeWidth={1.5} className="text-[#9CA3AF] shrink-0" />
                        <span className="font-mono text-[11px] font-semibold text-[#0891B2] dark:text-[#22D3EE] w-6 shrink-0 tabular-nums">
                          #{idx + 1}
                        </span>
                        {post.media?.[0] && (
                          <img src={post.media[0]} alt="" className="w-9 h-9 rounded-md object-cover shrink-0 border border-[#E5E7EB] dark:border-white/[0.08]" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] truncate">{post.content}</p>
                          <p className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                            {new Date(post.scheduledAt).toLocaleDateString()} · {post.status.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onEditInStudio(post)}
                        className="px-2.5 py-1 border border-[#E5E7EB] dark:border-white/[0.1] rounded-md text-[11px] font-medium text-[#4B5563] dark:text-[#D1D5DB] hover:border-[#06B6D4]"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: CHRONOLOGICAL LIST VIEW */}
      {view === 'list' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex flex-wrap bg-[#F3F4F6] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] p-0.5 rounded-lg text-[11px] font-medium">
              {['all', 'scheduled', 'pending_approval', 'approved', 'published', 'draft'].map((st) => (
                <button
                  key={st}
                  onClick={() => setListStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                    listStatusFilter === st
                      ? 'bg-white dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.1]'
                      : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <select
              value={listCatFilter}
              onChange={(e) => setListCatFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
            >
              <option value="all">All Categories</option>
              {wsCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
            {filteredListPosts.length === 0 ? (
              <div className="p-6">
                <EmptyStatePanel
                  icon={Calendar}
                  title="No posts match your filter"
                  description="Schedule a new post or switch status filters to view queued items."
                  actionLabel="Schedule Post"
                  onAction={onComposeNew}
                />
              </div>
            ) : (
              <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.06]">
                {filteredListPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {post.media?.[0] && (
                        <img
                          src={post.media[0]}
                          alt=""
                          className="w-11 h-11 rounded-lg object-cover border border-[#E5E7EB] dark:border-white/[0.08] shrink-0"
                        />
                      )}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: getCategoryColor(post.categoryId) }}
                          />
                          <span className="text-[11px] font-medium text-[#4B5563] dark:text-[#D1D5DB]">
                            {getCategoryName(post.categoryId)}
                          </span>
                          {post.platforms.map((pl: Platform) => (
                            <PlatformTag key={pl} platform={pl} showFull={false} />
                          ))}
                          <StatusBadge tone={statusTone(post.status)}>
                            {post.status.replace('_', ' ')}
                          </StatusBadge>
                          {post.isEvergreen && (
                            <span className="text-[10px] font-medium text-[#0891B2] dark:text-[#22D3EE] flex items-center gap-0.5">
                              <Repeat size={11} strokeWidth={1.5} /> Evergreen
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] line-clamp-2">
                          {post.content}
                        </p>
                        <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] font-mono tabular-nums">
                          {new Date(post.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {post.status === 'pending_approval' && (
                        <button
                          onClick={() => {
                            onUpdatePost({ ...post, status: 'scheduled' });
                            onToast('Post Approved & Scheduled');
                          }}
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 rounded-lg text-[11px] font-medium flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} strokeWidth={1.5} /> Approve
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setRescheduleTarget(post);
                          setRescheduleInput(post.scheduledAt.slice(0, 16));
                        }}
                        className="px-2.5 py-1.5 border border-[#E5E7EB] dark:border-white/[0.1] rounded-lg text-[11px] font-medium text-[#4B5563] dark:text-[#D1D5DB] hover:border-[#06B6D4]"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => onEditInStudio(post)}
                        className="px-2.5 py-1.5 border border-[#E5E7EB] dark:border-white/[0.1] rounded-lg text-[11px] font-medium text-[#4B5563] dark:text-[#D1D5DB] hover:border-[#06B6D4] flex items-center gap-1"
                      >
                        <Edit3 size={12} strokeWidth={1.5} /> Edit
                      </button>
                      <button
                        onClick={() => {
                          onDeletePost(post.id);
                          onToast('Post Deleted');
                        }}
                        className="p-1.5 text-[#9CA3AF] hover:text-rose-500 rounded-lg"
                        title="Delete post"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: WEEKLY RECURRING SCHEDULE MATRIX */}
      {view === 'matrix' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          <form
            onSubmit={handleAddMatrixSlot}
            className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-4 flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-[#9CA3AF] block mb-1">
                Day of Week
              </label>
              <select
                value={slotDay}
                onChange={(e) => setSlotDay(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] rounded-lg text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-[#9CA3AF] block mb-1">
                Posting Time
              </label>
              <input
                type="time"
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] rounded-lg text-[12px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280] dark:text-[#9CA3AF] block mb-1">
                Assign Content Category
              </label>
              <select
                value={slotCatId}
                onChange={(e) => setSlotCatId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] rounded-lg text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
              >
                {wsCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-lg text-[12px] font-semibold flex items-center gap-1.5"
            >
              <Plus size={13} strokeWidth={1.75} /> Add Recurring Slot
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-7 rounded-[12px] border border-[#E5E7EB] dark:border-white/[0.08] bg-white dark:bg-[#13161D] divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB] dark:divide-white/[0.08] overflow-hidden">
            {DAYS_OF_WEEK.map((day) => {
              const slots = wsCategories
                .flatMap((cat) =>
                  cat.timeSlots
                    .map((s, slotIdx) => ({ cat, slot: s, slotIdx }))
                    .filter((item) => item.slot.day === day)
                )
                .sort((a, b) => a.slot.time.localeCompare(b.slot.time));

              return (
                <div key={day} className="p-3 min-h-[280px] flex flex-col">
                  <div className="pb-2 mb-2.5 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#111827] dark:text-[#F3F4F6]">{day}</span>
                    <span className="text-[10px] font-mono text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                      {slots.length} slots
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {slots.length === 0 ? (
                      <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">No slots assigned</p>
                    ) : (
                      slots.map(({ cat, slot, slotIdx }) => (
                        <div
                          key={`${cat.id}-${slotIdx}`}
                          className="p-2.5 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex items-start justify-between gap-2 hover:border-[#06B6D4] transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-mono font-semibold text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 tabular-nums">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              {slot.time}
                            </p>
                            <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] truncate mt-0.5">
                              {cat.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateCategory({
                                ...cat,
                                postsPerWeek: Math.max(0, cat.postsPerWeek - 1),
                                timeSlots: cat.timeSlots.filter((_, i) => i !== slotIdx),
                              });
                              onToast('Slot Removed', `${day} ${slot.time} removed from ${cat.name}.`);
                            }}
                            className="text-[#9CA3AF] hover:text-rose-500 shrink-0"
                            title="Remove recurring slot"
                          >
                            <X size={13} strokeWidth={1.5} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRescheduleTarget(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.1] rounded-[12px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">Reschedule Post</h3>
              <button
                onClick={() => setRescheduleTarget(null)}
                className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <input
              type="datetime-local"
              value={rescheduleInput}
              onChange={(e) => setRescheduleInput(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] rounded-lg text-[12px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
            />
            <button
              onClick={() => {
                onUpdatePost({ ...rescheduleTarget, scheduledAt: new Date(rescheduleInput).toISOString() });
                onToast('Post Rescheduled');
                setRescheduleTarget(null);
              }}
              className="w-full py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-lg text-[12px] font-semibold"
            >
              Save New Date &amp; Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
