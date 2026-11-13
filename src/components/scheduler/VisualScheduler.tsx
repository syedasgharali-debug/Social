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
import { PlatformTag } from '../common/PlatformMeta';

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

  // November 2026 calendar cells (Starts on Sunday Nov 1, 2026 -> 30 days)
  const monthDays = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `2026-11-${String(dayNum).padStart(2, '0')}`;
      return { dayNum, dateStr };
    });
  }, []);

  // Week view: Nov 9 - Nov 15, 2026
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
    wsCategories.find((c) => c.id === catId)?.color || '#4F46E5';

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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[#090D16]">
      {/* Header Toolbar */}
      <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
            Visual Content Scheduler
          </h1>
          <p className="text-[11px] text-slate-500">
            Drag & drop posts across dates, preview your 3×3 Instagram Grid, or manage weekly recurring category slots.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
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
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                    view === item.id
                      ? 'bg-white dark:bg-slate-900 text-[#4F46E5] dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={13} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onComposeNew}
            className="px-3.5 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus size={14} /> Schedule Post
          </button>
        </div>
      </div>

      {/* VIEW 1: CALENDAR VIEW (MONTH & WEEK WITH DRAG-AND-DROP) */}
      {view === 'calendar' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                November 2026
              </h2>
              <span className="text-[11px] text-slate-500">
                Tip: Drag any post card onto another date cell to reschedule.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 text-[11px]">
                {wsCategories.slice(0, 4).map((cat) => (
                  <span key={cat.id} className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </span>
                ))}
              </div>

              <div className="inline-flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setCalendarScale('month')}
                  className={`px-3 py-1 rounded-md ${calendarScale === 'month' ? 'bg-[#4F46E5] text-white' : 'text-slate-500'}`}
                >
                  Month
                </button>
                <button
                  onClick={() => setCalendarScale('week')}
                  className={`px-3 py-1 rounded-md ${calendarScale === 'week' ? 'bg-[#4F46E5] text-white' : 'text-slate-500'}`}
                >
                  Week
                </button>
              </div>
            </div>
          </div>

          {calendarScale === 'month' ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="px-3 py-2.5 text-center">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
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
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-inset ring-[#4F46E5]'
                          : isToday
                          ? 'bg-indigo-50/30 dark:bg-indigo-950/20'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-[11px] font-bold tabular-nums ${
                            isToday
                              ? 'px-1.5 py-0.5 rounded bg-[#4F46E5] text-white'
                              : 'text-slate-500'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {dayPosts.length > 0 && (
                          <span className="text-[10px] font-mono text-slate-400">{dayPosts.length}</span>
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
                              className="p-2 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-800/95 hover:border-[#4F46E5] hover:-translate-y-0.5 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all duration-150"
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px]">
                                <span className="font-bold uppercase tracking-tight text-slate-500 flex items-center gap-1 min-w-0 truncate">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: catColor }}
                                  />
                                  {post.platforms.slice(0, 2).join(' · ')}
                                </span>
                                <span
                                  className={`font-semibold shrink-0 ${
                                    post.status === 'pending_approval'
                                      ? 'text-amber-600'
                                      : post.status === 'published'
                                      ? 'text-emerald-600'
                                      : 'text-[#4F46E5] dark:text-indigo-400'
                                  }`}
                                >
                                  {post.status === 'pending_approval' ? 'Pending' : post.status}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
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
            /* Week View */
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
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
                    className={`bg-white dark:bg-slate-900 border rounded-xl p-3 min-h-[380px] flex flex-col ${
                      isOver ? 'border-[#4F46E5] bg-indigo-50/40' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="pb-2 mb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{dayLabel}</span>
                      <span className="text-xs font-mono text-slate-400">Nov {dayNum}</span>
                    </div>
                    <div className="space-y-2.5 flex-1">
                      {dayPosts.map((post) => (
                        <div
                          key={post.id}
                          draggable
                          onDragStart={() => setDraggedPostId(post.id)}
                          onClick={() => onEditInStudio(post)}
                          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-[#F8FAFC] dark:bg-slate-800/80 hover:border-[#4F46E5] hover:-translate-y-0.5 hover:shadow-sm cursor-grab space-y-1.5 transition-all duration-150"
                        >
                          {post.media?.[0] && (
                            <img src={post.media[0]} alt="" className="w-full h-20 object-cover rounded-lg" />
                          )}
                          <p className="text-[10px] font-bold text-[#4F46E5] dark:text-indigo-400 flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-xs shrink-0"
                              style={{ backgroundColor: getCategoryColor(post.categoryId) }}
                            />
                            {getCategoryName(post.categoryId)}
                          </p>
                          <p className="text-[11px] text-slate-800 dark:text-slate-100 line-clamp-3">{post.content}</p>
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
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 flex justify-center">
              {/* Sleek Phone Frame */}
              <div className="w-full max-w-[360px] rounded-[34px] border-[7px] border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                <div className="px-5 py-2.5 flex items-center justify-between text-[10px] font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800">
                  <span>{workspaceHandle}</span>
                  <span>IG Visual Planner</span>
                </div>

                {/* IG Profile Strip */}
                <div className="p-4 flex items-center gap-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-0.5 shrink-0">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center font-display font-extrabold text-sm">
                      IG
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 flex-1 text-center text-xs tabular-nums">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">248</p>
                      <p className="text-[10px] text-slate-400">Posts</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">48.2k</p>
                      <p className="text-[10px] text-slate-400">Followers</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">312</p>
                      <p className="text-[10px] text-slate-400">Following</p>
                    </div>
                  </div>
                </div>

                {/* 3x3 Grid Tiles */}
                <div className="grid grid-cols-3 gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5">
                  {igPosts.map((post, idx) => (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={() => setDraggedIgPostId(post.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleSwapIgGrid(post.id)}
                      className="relative aspect-square bg-slate-200 dark:bg-slate-800 overflow-hidden group cursor-grab active:cursor-grabbing"
                    >
                      {post.media?.[0] ? (
                        <img src={post.media[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full p-2 flex items-center justify-center text-[10px] text-center text-slate-600 dark:text-slate-300 bg-indigo-50 dark:bg-slate-800">
                          {post.content.slice(0, 40)}...
                        </div>
                      )}
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/75 text-white text-[9px] font-mono font-bold">
                        #{idx + 1}
                      </span>
                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between text-white">
                        <p className="text-[10px] line-clamp-3 leading-tight">{post.content}</p>
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => handleShiftIgTile(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 rounded bg-white/20 hover:bg-white/30 disabled:opacity-30"
                            title="Move earlier"
                          >
                            <ArrowLeft size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditInStudio(post)}
                            className="text-[10px] font-bold underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShiftIgTile(idx, 1)}
                            disabled={idx === igPosts.length - 1}
                            className="p-1 rounded bg-white/20 hover:bg-white/30 disabled:opacity-30"
                            title="Move later"
                          >
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  3×3 Aesthetic Grid Sequence ({igPosts.length} Instagram Posts)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Drag and drop tiles directly on the phone preview (or use arrow buttons) to balance colors & grid rhythm before publishing.
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {igPosts.map((post, idx) => (
                  <div key={post.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <GripVertical size={15} className="text-slate-300 shrink-0" />
                      <span className="font-mono text-xs font-bold text-[#4F46E5] w-6 shrink-0">#{idx + 1}</span>
                      {post.media?.[0] && (
                        <img src={post.media[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{post.content}</p>
                        <p className="text-[11px] text-slate-400 tabular-nums">
                          {new Date(post.scheduledAt).toLocaleDateString()} · {post.status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onEditInStudio(post)}
                      className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-[#4F46E5]"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: CHRONOLOGICAL LIST VIEW */}
      {view === 'list' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex flex-wrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl text-xs font-semibold">
              {['all', 'scheduled', 'pending_approval', 'approved', 'published', 'draft'].map((st) => (
                <button
                  key={st}
                  onClick={() => setListStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg capitalize ${
                    listStatusFilter === st
                      ? 'bg-[#4F46E5] text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <select
              value={listCatFilter}
              onChange={(e) => setListCatFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none"
            >
              <option value="all">All Categories</option>
              {wsCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredListPosts.map((post) => (
                <div key={post.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {post.media?.[0] && (
                      <img src={post.media[0]} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: getCategoryColor(post.categoryId) }}
                        />
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {getCategoryName(post.categoryId)}
                        </span>
                        {post.platforms.map((pl: Platform) => (
                          <PlatformTag key={pl} platform={pl} showFull={false} />
                        ))}
                        {post.isEvergreen && (
                          <span className="text-[10px] font-bold text-[#4F46E5] flex items-center gap-0.5">
                            <Repeat size={11} /> Evergreen
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-900 dark:text-white line-clamp-2">{post.content}</p>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {new Date(post.scheduledAt).toLocaleString()} · Status: {post.status.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {post.status === 'pending_approval' && (
                      <button
                        onClick={() => {
                          onUpdatePost({ ...post, status: 'scheduled' });
                          onToast('Post Approved & Scheduled');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1"
                      >
                        <CheckCircle2 size={12} /> Approve
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setRescheduleTarget(post);
                        setRescheduleInput(post.scheduledAt.slice(0, 16));
                      }}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-[#4F46E5]"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => onEditInStudio(post)}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-[#4F46E5] flex items-center gap-1"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => {
                        onDeletePost(post.id);
                        onToast('Post Deleted');
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Delete post"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: WEEKLY RECURRING SCHEDULE MATRIX */}
      {view === 'matrix' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Add Slot Form */}
          <form
            onSubmit={handleAddMatrixSlot}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-wrap items-end gap-4"
          >
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Day of Week</label>
              <select
                value={slotDay}
                onChange={(e) => setSlotDay(e.target.value)}
                className="px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Posting Time</label>
              <input
                type="time"
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
                className="px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono outline-none"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">Assign Content Category</label>
              <select
                value={slotCatId}
                onChange={(e) => setSlotCatId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none"
              >
                {wsCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Recurring Slot
            </button>
          </form>

          {/* 7-Column Weekly Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {DAYS_OF_WEEK.map((day) => {
              const slots = wsCategories
                .flatMap((cat) =>
                  cat.timeSlots
                    .map((s, slotIdx) => ({ cat, slot: s, slotIdx }))
                    .filter((item) => item.slot.day === day)
                )
                .sort((a, b) => a.slot.time.localeCompare(b.slot.time));

              return (
                <div
                  key={day}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 min-h-[280px] flex flex-col"
                >
                  <div className="pb-2 mb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-display text-xs font-bold text-slate-900 dark:text-white">{day}</span>
                    <span className="text-[10px] font-mono text-slate-400">{slots.length} slots</span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {slots.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No slots assigned</p>
                    ) : (
                      slots.map(({ cat, slot, slotIdx }) => (
                        <div
                          key={`${cat.id}-${slotIdx}`}
                          className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-start justify-between gap-2 hover:border-[#4F46E5] transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-xs shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              {slot.time}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate mt-0.5">
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
                            className="text-slate-400 hover:text-rose-600 shrink-0"
                            title="Remove recurring slot"
                          >
                            <X size={13} />
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

      {/* Reschedule Modal for List View */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setRescheduleTarget(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Reschedule Post</h3>
              <button onClick={() => setRescheduleTarget(null)} className="text-slate-400"><X size={16} /></button>
            </div>
            <input
              type="datetime-local"
              value={rescheduleInput}
              onChange={(e) => setRescheduleInput(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
            />
            <button
              onClick={() => {
                onUpdatePost({ ...rescheduleTarget, scheduledAt: new Date(rescheduleInput).toISOString() });
                onToast('Post Rescheduled');
                setRescheduleTarget(null);
              }}
              className="w-full py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold"
            >
              Save New Date & Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
