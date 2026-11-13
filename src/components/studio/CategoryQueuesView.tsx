import React, { useState } from 'react';
import { Plus, Repeat, Pause, Play, Clock, Layers, X, ArrowRight } from 'lucide-react';
import { ContentCategory, SocialPost } from '../../types';

interface CategoryQueuesViewProps {
  workspaceId: string;
  categories: ContentCategory[];
  posts: SocialPost[];
  onAddCategory: (cat: ContentCategory) => void;
  onUpdateCategory: (cat: ContentCategory) => void;
  onComposeInCategory: (categoryId: string, evergreen: boolean) => void;
  onToast: (title: string, description?: string) => void;
}

const PRESET_COLORS = ['#4F46E5', '#0EA5E9', '#F59E0B', '#10B981', '#6366F1', '#E11D48'];

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
    color: '#4F46E5',
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
    setForm({ name: '', description: '', color: '#4F46E5', evergreenEnabled: true, postsPerWeek: 3, slotDay: 'Tue', slotTime: '10:00' });
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers size={18} className="text-[#4F46E5]" /> Content Categories & Evergreen Queues
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize content into rotating queues, configure weekly time slots, and pause or recycle evergreen buckets anytime.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start shadow-sm shadow-indigo-600/20"
        >
          <Plus size={14} /> New Category Queue
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {wsCategories.map((cat) => {
          const catPosts = wsPosts.filter((p) => p.categoryId === cat.id);
          const evergreenCount = catPosts.filter((p) => p.isEvergreen).length;

          return (
            <div
              key={cat.id}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: cat.color }} />
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
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
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 shrink-0 ${
                      cat.isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {cat.isActive ? <Pause size={11} /> : <Play size={11} />}
                    {cat.isActive ? 'Active' : 'Paused'}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {cat.description}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-xs tabular-nums">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-slate-400">Posts</p>
                    <p className="font-bold text-slate-900 dark:text-white">{catPosts.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-slate-400">Evergreen</p>
                    <p className="font-bold text-[#4F46E5] dark:text-indigo-400">{evergreenCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-slate-400">Cadence</p>
                    <p className="font-bold text-slate-900 dark:text-white">{cat.postsPerWeek}/wk</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-500 flex items-center gap-1">
                      <Clock size={12} /> Weekly Slots
                    </span>
                    <button
                      onClick={() => handleAddSlot(cat)}
                      className="text-[#4F46E5] dark:text-indigo-400 hover:underline font-semibold"
                    >
                      + Add Slot
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.timeSlots.map((slot, idx) => (
                      <span
                        key={`${slot.day}-${slot.time}-${idx}`}
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300"
                      >
                        {slot.day} {slot.time}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    const next = !cat.evergreenEnabled;
                    onUpdateCategory({ ...cat, evergreenEnabled: next });
                    onToast(
                      next ? 'Evergreen Auto-Recycle ON' : 'Single-Run Mode Enabled',
                      `${cat.name} recycling preference updated.`
                    );
                  }}
                  className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                    cat.evergreenEnabled ? 'text-[#4F46E5] dark:text-indigo-400' : 'text-slate-400'
                  }`}
                >
                  <Repeat size={13} />
                  {cat.evergreenEnabled ? 'Evergreen Auto-Recycle ON' : 'Single-Run Only'}
                </button>

                <button
                  onClick={() => onComposeInCategory(cat.id, cat.evergreenEnabled)}
                  className="text-xs font-semibold text-slate-900 dark:text-white hover:text-[#4F46E5] flex items-center gap-1"
                >
                  Add Post <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Create Category Queue
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Category Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Thought Leadership & Memos"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What belongs in this queue?"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Calendar Color</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((hex) => (
                    <button
                      type="button"
                      key={hex}
                      onClick={() => setForm({ ...form, color: hex })}
                      className={`w-7 h-7 rounded-md border-2 ${
                        form.color === hex ? 'border-slate-900 dark:border-white scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">First Slot Day</label>
                  <select
                    value={form.slotDay}
                    onChange={(e) => setForm({ ...form, slotDay: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  >
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Time</label>
                  <input
                    type="time"
                    value={form.slotTime}
                    onChange={(e) => setForm({ ...form, slotTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.evergreenEnabled}
                  onChange={(e) => setForm({ ...form, evergreenEnabled: e.target.checked })}
                />
                Enable Evergreen Recycling by default
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold">
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg font-semibold">
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
