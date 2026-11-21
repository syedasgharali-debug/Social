import React, { useState } from 'react';
import { Plus, Repeat, Pause, Play, Clock, Layers, X, ArrowRight } from 'lucide-react';
import { ContentCategory, SocialPost } from '../../types';
import { EmptyStatePanel, StatusBadge } from '../common/DesignPrimitives';

interface CategoryQueuesViewProps {
  workspaceId: string;
  categories: ContentCategory[];
  posts: SocialPost[];
  onAddCategory: (cat: ContentCategory) => void;
  onUpdateCategory: (cat: ContentCategory) => void;
  onComposeInCategory: (categoryId: string, evergreen: boolean) => void;
  onToast: (title: string, description?: string) => void;
}

const PRESET_COLORS = ['#06B6D4', '#0EA5E9', '#F97316', '#10B981', '#111827', '#E11D48'];

export function CategoryQueuesView({
  workspaceId,
  categories,
  posts,
  onAddCategory,
  onUpdateCategory,
  onComposeInCategory,
  onToast,
}: CategoryQueuesViewProps) {
  const wsCategories = categories.filter((c) => c.workspaceId === workspaceId);
  const wsPosts = posts.filter((p) => p.workspaceId === workspaceId);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#06B6D4',
    evergreenEnabled: true,
    postsPerWeek: 3,
    slotDay: 'Tue',
    slotTime: '10:00',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const cat: ContentCategory = {
      id: `cat-${Date.now()}`,
      workspaceId,
      name: form.name.trim(),
      description: form.description.trim() || 'Scheduled category queue.',
      color: form.color,
      isActive: true,
      evergreenEnabled: form.evergreenEnabled,
      postsPerWeek: Number(form.postsPerWeek) || 2,
      timeSlots: [{ day: form.slotDay, time: form.slotTime }],
    };
    onAddCategory(cat);
    onToast('Category Queue Created', `${cat.name} added to weekly schedule.`);
    setShowModal(false);
    setForm({ name: '', description: '', color: '#06B6D4', evergreenEnabled: true, postsPerWeek: 3, slotDay: 'Tue', slotTime: '10:00' });
  };

  const handleAddSlot = (cat: ContentCategory) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const nextDay = days[cat.timeSlots.length % days.length];
    onUpdateCategory({
      ...cat,
      postsPerWeek: cat.postsPerWeek + 1,
      timeSlots: [...cat.timeSlots, { day: nextDay, time: '14:00' }],
    });
    onToast('Weekly Slot Added', `Added ${nextDay} 14:00 to ${cat.name}.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6] flex items-center gap-2">
            <Layers size={16} strokeWidth={1.5} className="text-[#6B7280] dark:text-[#9CA3AF]" /> Content Categories & Evergreen Queues
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
            Organize content into rotating queues, configure weekly time slots, and pause or recycle evergreen buckets anytime.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-lg text-xs font-medium flex items-center gap-1.5 self-start transition-colors"
        >
          <Plus size={14} strokeWidth={1.5} /> New Category Queue
        </button>
      </div>

      {wsCategories.length === 0 ? (
        <EmptyStatePanel
          icon={Layers}
          title="No content categories yet"
          description="Create your first category queue (such as Educational Tips, Case Studies, or Promotions) to schedule rotating weekly slots."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} strokeWidth={1.5} /> New Category Queue
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {wsCategories.map((cat) => {
            const catPosts = wsPosts.filter((p) => p.categoryId === cat.id);
            const evergreenCount = catPosts.filter((p) => p.isEvergreen).length;

            return (
              <div
                key={cat.id}
                className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-xl p-5 flex flex-col justify-between transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: cat.color }} />
                      <h3 className="font-display text-sm font-semibold text-[#111827] dark:text-[#F3F4F6] truncate">
                        {cat.name}
                      </h3>
                    </div>

                    <button
                      onClick={() => {
                        onUpdateCategory({ ...cat, isActive: !cat.isActive });
                        onToast(
                          cat.isActive ? 'Category Paused' : 'Category Resumed',
                          `${cat.name} queue is now ${cat.isActive ? 'paused' : 'active'}.`
                        );
                      }}
                      className="shrink-0"
                      title={cat.isActive ? 'Pause queue' : 'Resume queue'}
                    >
                      <StatusBadge tone={cat.isActive ? 'emerald' : 'neutral'} dot>
                        <span className="inline-flex items-center gap-1">
                          {cat.isActive ? <Pause size={10} strokeWidth={1.5} /> : <Play size={10} strokeWidth={1.5} />}
                          {cat.isActive ? 'Active' : 'Paused'}
                        </span>
                      </StatusBadge>
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                    {cat.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-[#E5E7EB] dark:border-white/[0.08] grid grid-cols-3 gap-2 text-xs tabular-nums">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-medium text-[#6B7280] dark:text-[#9CA3AF]">Posts</p>
                      <p className="mt-0.5 font-mono font-semibold text-[#111827] dark:text-[#F3F4F6]">{catPosts.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-medium text-[#6B7280] dark:text-[#9CA3AF]">Evergreen</p>
                      <p className="mt-0.5 font-mono font-semibold text-cyan-600 dark:text-cyan-400">{evergreenCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-medium text-[#6B7280] dark:text-[#9CA3AF]">Cadence</p>
                      <p className="mt-0.5 font-mono font-semibold text-[#111827] dark:text-[#F3F4F6]">{cat.postsPerWeek}/wk</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-[#6B7280] dark:text-[#9CA3AF] flex items-center gap-1">
                        <Clock size={12} strokeWidth={1.5} /> Weekly Slots
                      </span>
                      <button
                        onClick={() => handleAddSlot(cat)}
                        className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                      >
                        + Add Slot
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.timeSlots.map((slot, idx) => (
                        <span
                          key={`${slot.day}-${slot.time}-${idx}`}
                          className="px-2 py-0.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded text-[11px] font-mono tabular-nums text-[#4B5563] dark:text-[#9CA3AF]"
                        >
                          {slot.day} {slot.time}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      const next = !cat.evergreenEnabled;
                      onUpdateCategory({ ...cat, evergreenEnabled: next });
                      onToast(
                        next ? 'Evergreen Auto-Recycle ON' : 'Single-Run Mode Enabled',
                        `${cat.name} recycling preference updated.`
                      );
                    }}
                    className={`text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                      cat.evergreenEnabled ? 'text-cyan-600 dark:text-cyan-400' : 'text-[#6B7280] dark:text-[#9CA3AF]'
                    }`}
                  >
                    <Repeat size={12} strokeWidth={1.5} />
                    {cat.evergreenEnabled ? 'Evergreen Auto-Recycle ON' : 'Single-Run Only'}
                  </button>

                  <button
                    onClick={() => onComposeInCategory(cat.id, cat.evergreenEnabled)}
                    className="text-xs font-medium text-[#111827] dark:text-[#F3F4F6] hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1 transition-colors"
                  >
                    Add Post <ArrowRight size={12} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="font-display text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">
                Create Category Queue
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1">
                  Category Name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Thought Leadership & Memos"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-[#111827] dark:text-[#F3F4F6] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What belongs in this queue?"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-[#111827] dark:text-[#F3F4F6] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1.5">
                  Calendar Color
                </label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((hex) => (
                    <button
                      type="button"
                      key={hex}
                      onClick={() => setForm({ ...form, color: hex })}
                      className={`w-6 h-6 rounded-md border-2 transition-transform ${
                        form.color === hex ? 'border-[#111827] dark:border-[#FFFFFF] scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1">
                    First Slot Day
                  </label>
                  <select
                    value={form.slotDay}
                    onChange={(e) => setForm({ ...form, slotDay: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-[#111827] dark:text-[#F3F4F6] outline-none"
                  >
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={form.slotTime}
                    onChange={(e) => setForm({ ...form, slotTime: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg font-mono text-[#111827] dark:text-[#F3F4F6] outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 font-medium text-[#4B5563] dark:text-[#9CA3AF] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.evergreenEnabled}
                  onChange={(e) => setForm({ ...form, evergreenEnabled: e.target.checked })}
                  className="accent-[#06B6D4]"
                />
                Enable Evergreen Recycling by default
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-lg font-medium text-[#4B5563] dark:text-[#9CA3AF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-lg font-medium transition-colors"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
