import React, { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  CheckCircle2,
  FolderPlus,
  X,
  Loader2,
  ExternalLink,
  Download,
} from 'lucide-react';
import { AcademyCategory, AcademyStep, AcademyTutorial } from '../../types';
import {
  academyService,
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
} from '../../services/academyService';

interface AcademyAdminSectionProps {
  authToken?: string;
  onToast: (title: string, desc?: string, variant?: 'info' | 'success' | 'warning') => void;
}

interface TutorialFormState {
  id?: string;
  youtubeUrl: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  thumbnailUrl: string;
  duration: string;
  categoryId: string;
  keywordsText: string;
  learningObjectives: string[];
  steps: AcademyStep[];
  tips: string[];
  order: number;
  published: boolean;
  publishedAt: string;
}

const EMPTY_FORM = (defaultCategoryId: string, nextOrder: number): TutorialFormState => ({
  youtubeUrl: '',
  title: '',
  shortDescription: '',
  fullDescription: '',
  thumbnailUrl: '',
  duration: '',
  categoryId: defaultCategoryId,
  keywordsText: '',
  learningObjectives: [],
  steps: [],
  tips: [],
  order: nextOrder,
  published: true,
  publishedAt: new Date().toISOString(),
});

export const AcademyAdminSection: React.FC<AcademyAdminSectionProps> = ({ authToken, onToast }) => {
  const [loading, setLoading] = useState(true);
  const [tutorials, setTutorials] = useState<AcademyTutorial[]>([]);
  const [categories, setCategories] = useState<AcademyCategory[]>([]);
  const [channelUrl, setChannelUrl] = useState('https://www.youtube.com/@socialifyaicom');
  const [subTab, setSubTab] = useState<'tutorials' | 'categories'>('tutorials');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingChannel, setSyncingChannel] = useState(false);

  // Tutorial Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<TutorialFormState>(EMPTY_FORM('getting-started', 1));
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [savingTutorial, setSavingTutorial] = useState(false);

  // Category Form State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catOrder, setCatOrder] = useState<number>(1);
  const [savingCategory, setSavingCategory] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await academyService.getCatalog(true, authToken);
      setCategories(res.categories || []);
      setTutorials(res.tutorials || []);
      setChannelUrl(res.channelUrl || 'https://www.youtube.com/@socialifyaicom');
    } catch (err) {
      onToast(
        'Failed to Load Academy Catalog',
        err instanceof Error ? err.message : 'Please try again.',
        'warning'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const categoryMap = useMemo(() => {
    const m = new Map<string, AcademyCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const publishedCount = tutorials.filter((t) => t.published).length;
  const draftCount = tutorials.length - publishedCount;

  const filteredTutorials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tutorials;
    return tutorials.filter((t) => {
      const cat = categoryMap.get(t.categoryId)?.name.toLowerCase() || '';
      return (
        t.title.toLowerCase().includes(q) ||
        t.videoId.toLowerCase().includes(q) ||
        cat.includes(q)
      );
    });
  }, [tutorials, searchQuery, categoryMap]);

  const openCreateModal = () => {
    const defaultCat = categories[0]?.id || 'getting-started';
    const nextOrder = tutorials.reduce((max, t) => Math.max(max, t.order), 0) + 1;
    setForm(EMPTY_FORM(defaultCat, nextOrder));
    setModalOpen(true);
  };

  const openEditModal = (t: AcademyTutorial) => {
    setForm({
      id: t.id,
      youtubeUrl: t.youtubeUrl,
      title: t.title,
      shortDescription: t.shortDescription,
      fullDescription: t.fullDescription,
      thumbnailUrl: t.thumbnailUrl,
      duration: t.duration || '',
      categoryId: t.categoryId,
      keywordsText: (t.keywords || []).join(', '),
      learningObjectives: [...(t.learningObjectives || [])],
      steps: (t.steps || []).map((s) => ({ ...s })),
      tips: [...(t.tips || [])],
      order: t.order,
      published: t.published,
      publishedAt: t.publishedAt || new Date().toISOString(),
    });
    setModalOpen(true);
  };

  const extractedVideoId = useMemo(
    () => extractYouTubeVideoId(form.youtubeUrl),
    [form.youtubeUrl]
  );

  const handleFetchMetadata = async () => {
    if (!extractedVideoId) {
      onToast(
        'Invalid YouTube URL',
        'Paste a valid youtube.com/watch?v=..., youtu.be/..., or 11-character video ID.',
        'warning'
      );
      return;
    }
    setFetchingMeta(true);
    try {
      const res = await academyService.fetchYouTubeMetadata(form.youtubeUrl, authToken);
      const m = res.metadata;
      setForm((prev) => ({
        ...prev,
        youtubeUrl: m.youtubeUrl,
        thumbnailUrl: m.thumbnailUrl || getYouTubeThumbnailUrl(m.videoId),
        title: m.title || prev.title,
        shortDescription: m.shortDescription || prev.shortDescription,
        fullDescription: m.fullDescription || prev.fullDescription,
        duration: m.duration || prev.duration,
        publishedAt: m.publishedAt || prev.publishedAt,
        learningObjectives:
          m.learningObjectives && m.learningObjectives.length > 0
            ? m.learningObjectives
            : prev.learningObjectives,
      }));
      onToast(
        'YouTube Metadata Loaded',
        `Extracted video ID ${m.videoId}${m.title ? ` — ${m.title}` : ''}.`,
        'success'
      );
    } catch (err) {
      onToast(
        'Metadata Lookup Failed',
        err instanceof Error ? err.message : 'Unable to fetch video metadata.',
        'warning'
      );
    } finally {
      setFetchingMeta(false);
    }
  };

  const handleSaveTutorial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedVideoId) {
      onToast('Valid YouTube Video Required', 'Enter a valid YouTube URL or video ID.', 'warning');
      return;
    }
    if (!form.title.trim()) {
      onToast('Title Required', 'Enter a tutorial title before saving.', 'warning');
      return;
    }

    setSavingTutorial(true);
    try {
      const payload = {
        youtubeUrl: `https://www.youtube.com/watch?v=${extractedVideoId}`,
        title: form.title.trim(),
        shortDescription: form.shortDescription.trim(),
        fullDescription: form.fullDescription.trim() || form.shortDescription.trim(),
        thumbnailUrl: form.thumbnailUrl.trim() || getYouTubeThumbnailUrl(extractedVideoId),
        duration: form.duration.trim(),
        categoryId: form.categoryId,
        keywords: form.keywordsText
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        learningObjectives: form.learningObjectives.map((x) => x.trim()).filter(Boolean),
        steps: form.steps
          .map((s) => ({ title: s.title.trim(), detail: s.detail.trim() }))
          .filter((s) => s.title || s.detail),
        tips: form.tips.map((x) => x.trim()).filter(Boolean),
        order: Number.isFinite(form.order) ? Math.max(0, Math.floor(form.order)) : tutorials.length + 1,
        published: form.published,
        publishedAt: form.publishedAt || new Date().toISOString(),
      };

      if (form.id) {
        const updated = await academyService.updateTutorial(form.id, payload, authToken);
        setTutorials((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t)).sort((a, b) => a.order - b.order)
        );
        onToast('Tutorial Updated', updated.title, 'success');
      } else {
        const created = await academyService.createTutorial(payload, authToken);
        setTutorials((prev) => [...prev, created].sort((a, b) => a.order - b.order));
        onToast(
          created.published ? 'Tutorial Published' : 'Draft Tutorial Saved',
          created.title,
          'success'
        );
      }
      setModalOpen(false);
    } catch (err) {
      onToast(
        'Save Failed',
        err instanceof Error ? err.message : 'Unable to save tutorial.',
        'warning'
      );
    } finally {
      setSavingTutorial(false);
    }
  };

  const handleTogglePublish = async (t: AcademyTutorial) => {
    try {
      const updated = await academyService.updateTutorial(
        t.id,
        { published: !t.published },
        authToken
      );
      setTutorials((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      onToast(
        updated.published ? 'Tutorial Published' : 'Tutorial Unpublished',
        updated.title,
        'info'
      );
    } catch (err) {
      onToast('Update Failed', err instanceof Error ? err.message : 'Please try again.', 'warning');
    }
  };

  const handleDeleteTutorial = async (t: AcademyTutorial) => {
    try {
      await academyService.deleteTutorial(t.id, authToken);
      setTutorials((prev) => prev.filter((item) => item.id !== t.id));
      onToast('Tutorial Deleted', t.title, 'info');
    } catch (err) {
      onToast('Delete Failed', err instanceof Error ? err.message : 'Please try again.', 'warning');
    }
  };

  const handleSyncOfficialChannel = async () => {
    setSyncingChannel(true);
    try {
      const res = await academyService.syncOfficialChannel(authToken);
      if (res.importedCount > 0) {
        await loadData();
        onToast(
          `Imported ${res.importedCount} New Video${res.importedCount === 1 ? '' : 's'}`,
          'New imports are saved as Drafts so you can assign a category and publish them.',
          'success'
        );
      } else {
        onToast(
          'Channel Already Up to Date',
          `Scanned ${res.scannedCount} videos from @socialifyaicom; no new uploads found.`,
          'info'
        );
      }
    } catch (err) {
      onToast(
        'Channel Sync Failed',
        err instanceof Error ? err.message : 'Unable to sync from YouTube.',
        'warning'
      );
    } finally {
      setSyncingChannel(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      onToast('Category Name Required', 'Enter a category title.', 'warning');
      return;
    }
    setSavingCategory(true);
    try {
      if (editingCatId) {
        const updated = await academyService.updateCategory(
          editingCatId,
          { name: catName.trim(), description: catDescription.trim(), order: catOrder },
          authToken
        );
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)).sort((a, b) => a.order - b.order)
        );
        onToast('Category Updated', updated.name, 'success');
      } else {
        const created = await academyService.createCategory(
          {
            name: catName.trim(),
            description: catDescription.trim(),
            order: catOrder || categories.length + 1,
          },
          authToken
        );
        setCategories((prev) => [...prev, created].sort((a, b) => a.order - b.order));
        onToast('Category Created', created.name, 'success');
      }
      setEditingCatId(null);
      setCatName('');
      setCatDescription('');
      setCatOrder(categories.length + 2);
    } catch (err) {
      onToast(
        'Category Save Failed',
        err instanceof Error ? err.message : 'Unable to save category.',
        'warning'
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: AcademyCategory) => {
    try {
      const res = await academyService.deleteCategory(cat.id, authToken);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setTutorials((prev) =>
        prev.map((t) => (t.categoryId === cat.id ? { ...t, categoryId: res.reassignedTo } : t))
      );
      onToast('Category Deleted', `Tutorials reassigned safely.`, 'info');
    } catch (err) {
      onToast(
        'Cannot Delete Category',
        err instanceof Error ? err.message : 'Unable to delete category.',
        'warning'
      );
    }
  };

  return (
    <section className="rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#E5E7EB] dark:border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} strokeWidth={1.6} className="text-[#06B6D4]" />
            <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
              SocialifyAI Academy Management
            </h2>
          </div>
          <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
            Add, organize, and publish YouTube tutorials and learning categories. Published tutorials appear immediately in every customer dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] border border-[#E5E7EB] dark:border-white/[0.1] text-[12px] font-medium text-[#4B5563] dark:text-[#D1D5DB] hover:border-[#06B6D4]"
          >
            @socialifyaicom
            <ExternalLink size={12} strokeWidth={1.5} />
          </a>

          <button
            type="button"
            disabled={syncingChannel}
            onClick={() => void handleSyncOfficialChannel()}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] border border-[#E5E7EB] dark:border-white/[0.1] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] hover:border-[#06B6D4] disabled:opacity-50"
          >
            {syncingChannel ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} strokeWidth={1.5} />
            )}
            Sync YouTube Channel
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-[7px] bg-[#111827] dark:bg-[#F3F4F6] text-white dark:text-[#090A0D] text-[12px] font-medium hover:opacity-90"
          >
            <Plus size={14} strokeWidth={1.75} />
            Add Tutorial
          </button>
        </div>
      </div>

      {/* Metrics & Sub-Navigation */}
      <div className="px-5 py-3.5 bg-[#F8F9FB] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-[12px]">
          <span className="text-[#4B5563] dark:text-[#9CA3AF]">
            Total: <strong className="font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6]">{tutorials.length}</strong>
          </span>
          <span className="text-[#4B5563] dark:text-[#9CA3AF]">
            Published: <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{publishedCount}</strong>
          </span>
          <span className="text-[#4B5563] dark:text-[#9CA3AF]">
            Drafts: <strong className="font-mono tabular-nums text-[#F97316]">{draftCount}</strong>
          </span>
          <span className="text-[#4B5563] dark:text-[#9CA3AF]">
            Categories: <strong className="font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6]">{categories.length}</strong>
          </span>
        </div>

        <div className="inline-flex items-center p-0.5 rounded-[7px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setSubTab('tutorials')}
            className={`h-7 px-3 rounded-[5px] text-[12px] font-medium ${
              subTab === 'tutorials'
                ? 'bg-[#111827] dark:bg-[#F3F4F6] text-white dark:text-[#090A0D]'
                : 'text-[#6B7280] dark:text-[#9CA3AF]'
            }`}
          >
            Tutorials ({tutorials.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('categories')}
            className={`h-7 px-3 rounded-[5px] text-[12px] font-medium ${
              subTab === 'categories'
                ? 'bg-[#111827] dark:bg-[#F3F4F6] text-white dark:text-[#090A0D]'
                : 'text-[#6B7280] dark:text-[#9CA3AF]'
            }`}
          >
            Categories ({categories.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex items-center justify-center gap-2 text-[12.5px] text-[#6B7280] dark:text-[#9CA3AF]">
          <Loader2 size={16} className="animate-spin text-[#06B6D4]" />
          Loading Academy library…
        </div>
      ) : subTab === 'tutorials' ? (
        <div className="p-5 space-y-4">
          <div className="relative max-w-md">
            <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tutorials by title, video ID, or category…"
              className="w-full h-8 pl-8 pr-3 rounded-[7px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] text-[12px] text-[#111827] dark:text-[#F3F4F6] focus:outline-none focus:border-[#06B6D4]"
            />
          </div>

          <div className="overflow-x-auto border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B7280] dark:text-[#9CA3AF]">
                  <th className="py-2.5 px-3 w-12">Order</th>
                  <th className="py-2.5 px-3">Tutorial</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Video ID</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.06] text-[12.5px]">
                {filteredTutorials.map((t) => {
                  const cat = categoryMap.get(t.categoryId);
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-[#F8F9FB] dark:hover:bg-[#191D26]/60 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono tabular-nums text-[#6B7280] dark:text-[#9CA3AF]">
                        #{t.order}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-3 min-w-[240px]">
                          <img
                            src={t.thumbnailUrl || getYouTubeThumbnailUrl(t.videoId)}
                            alt={t.title}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="w-16 h-9 rounded-[4px] object-cover bg-[#0E1015] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-[#111827] dark:text-[#F3F4F6] line-clamp-1">
                              {t.title}
                            </p>
                            <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] line-clamp-1">
                              {t.duration ? `${t.duration} · ` : ''}
                              {t.learningObjectives.length} objectives · {t.steps.length} verified steps
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#4B5563] dark:text-[#D1D5DB] whitespace-nowrap">
                        {cat?.name || t.categoryId}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11.5px] text-[#6B7280] dark:text-[#9CA3AF] whitespace-nowrap">
                        {t.videoId}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[11.5px] font-medium ${
                            t.published
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-[#F97316]'
                          }`}
                        >
                          {t.published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleTogglePublish(t)}
                            title={t.published ? 'Unpublish tutorial' : 'Publish tutorial'}
                            className="h-7 px-2 rounded-[6px] border border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#D1D5DB] hover:border-[#06B6D4] inline-flex items-center gap-1 text-[11px]"
                          >
                            {t.published ? <EyeOff size={12} /> : <Eye size={12} />}
                            {t.published ? 'Hide' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(t)}
                            title="Edit tutorial"
                            className="h-7 w-7 rounded-[6px] border border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#D1D5DB] hover:border-[#06B6D4] inline-flex items-center justify-center"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteTutorial(t)}
                            title="Delete tutorial"
                            className="h-7 w-7 rounded-[6px] border border-[#E5E7EB] dark:border-white/[0.08] text-rose-500 hover:border-rose-500 inline-flex items-center justify-center"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTutorials.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
                      No tutorials match your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Categories Manager */
        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={(e) => void handleSaveCategory(e)}
            className="lg:col-span-4 p-4 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-3 h-fit"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5">
                <FolderPlus size={14} strokeWidth={1.6} className="text-[#06B6D4]" />
                {editingCatId ? 'Edit Category' : 'Add Category'}
              </h3>
              {editingCatId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCatId(null);
                    setCatName('');
                    setCatDescription('');
                    setCatOrder(categories.length + 1);
                  }}
                  className="text-[11px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                Category Name
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g., AI Copilot & Automation"
                className="w-full h-8 px-2.5 rounded-[6px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.1] text-[12.5px] text-[#111827] dark:text-[#F3F4F6] focus:outline-none focus:border-[#06B6D4]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                Description
              </label>
              <textarea
                rows={2}
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                placeholder="Short summary of what tutorials in this track cover…"
                className="w-full p-2.5 rounded-[6px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.1] text-[12px] text-[#111827] dark:text-[#F3F4F6] focus:outline-none focus:border-[#06B6D4]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                Display Order
              </label>
              <input
                type="number"
                min={0}
                value={catOrder}
                onChange={(e) => setCatOrder(Number(e.target.value) || 0)}
                className="w-24 h-8 px-2.5 rounded-[6px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.1] text-[12px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6]"
              />
            </div>

            <button
              type="submit"
              disabled={savingCategory}
              className="w-full h-8 rounded-[7px] bg-[#111827] dark:bg-[#F3F4F6] text-white dark:text-[#090A0D] text-[12px] font-medium disabled:opacity-50"
            >
              {savingCategory ? 'Saving…' : editingCatId ? 'Update Category' : 'Create Category'}
            </button>
          </form>

          <div className="lg:col-span-8 space-y-2">
            {categories.map((cat) => {
              const count = tutorials.filter((t) => t.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-[8px] border border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                        #{cat.order}
                      </span>
                      <p className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                        {cat.name}
                      </p>
                      <span className="text-[11px] font-mono tabular-nums text-[#06B6D4]">
                        {count} {count === 1 ? 'tutorial' : 'tutorials'}
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setCatName(cat.name);
                        setCatDescription(cat.description);
                        setCatOrder(cat.order);
                      }}
                      className="h-7 w-7 rounded-[6px] border border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#D1D5DB] hover:border-[#06B6D4] inline-flex items-center justify-center"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={categories.length <= 1}
                      onClick={() => void handleDeleteCategory(cat)}
                      className="h-7 w-7 rounded-[6px] border border-[#E5E7EB] dark:border-white/[0.08] text-rose-500 hover:border-rose-500 disabled:opacity-40 inline-flex items-center justify-center"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tutorial Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[10px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12]">
            <div className="sticky top-0 z-10 px-5 py-3.5 bg-[#FFFFFF] dark:bg-[#13161D] border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between">
              <h3 className="text-[14.5px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                {form.id ? 'Edit Academy Tutorial' : 'Add YouTube Tutorial'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveTutorial(e)} className="p-5 space-y-4">
              {/* YouTube URL + Auto-Extract & Fetch */}
              <div className="space-y-1.5">
                <label className="text-[11.5px] font-medium text-[#374151] dark:text-[#D1D5DB]">
                  YouTube Video URL or Video ID
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={form.youtubeUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      const vid = extractYouTubeVideoId(val);
                      setForm((prev) => ({
                        ...prev,
                        youtubeUrl: val,
                        thumbnailUrl: vid ? getYouTubeThumbnailUrl(vid) : prev.thumbnailUrl,
                      }));
                    }}
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    className="flex-1 h-9 px-3 rounded-[7px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] text-[12.5px] text-[#111827] dark:text-[#F3F4F6] focus:outline-none focus:border-[#06B6D4]"
                  />
                  <button
                    type="button"
                    disabled={!extractedVideoId || fetchingMeta}
                    onClick={() => void handleFetchMetadata()}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-[7px] border border-[#06B6D4] text-[#0891B2] dark:text-[#06B6D4] text-[12px] font-medium disabled:opacity-40 shrink-0"
                  >
                    {fetchingMeta ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Fetch Metadata
                  </button>
                </div>
                {extractedVideoId ? (
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src={form.thumbnailUrl || getYouTubeThumbnailUrl(extractedVideoId)}
                      alt="YouTube thumbnail preview"
                      referrerPolicy="no-referrer"
                      className="w-24 h-14 rounded-[5px] object-cover bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]"
                    />
                    <div className="text-[11.5px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      <span>
                        Valid YouTube Video ID: <code className="font-mono">{extractedVideoId}</code>
                      </span>
                    </div>
                  </div>
                ) : form.youtubeUrl.trim() ? (
                  <p className="text-[11.5px] text-[#F97316]">
                    Enter a valid YouTube link (youtube.com or youtu.be) or 11-character video ID.
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11.5px] font-medium text-[#374151] dark:text-[#D1D5DB]">
                    Tutorial Title
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full h-9 px-3 rounded-[7px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] text-[12.5px] text-[#111827] dark:text-[#F3F4F6] focus:outline-none focus:border-[#06B6D4]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11.5px] font-medium text-[#374151] dark:text-[#D1D5DB]">
                    Category
                  </label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                    className="w-full h-9 px-3 rounded-[7px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] text-[12.5px] text-[#111827] dark:text-[#F3F4F6] focus:outline-none focus:border-[#06B6D4]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11.5px] font-medium text-[#374151] dark:text-[#D1D5DB]">
                      Duration (optional)
                    </label>
                    <input
                      type="text"
                      value={form.duration}
                      onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                      placeholder="e.g., 4:35"
                      className="w-full h-9 px-3 rounded-[7px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] text-[12.5px] font-mono text-[#111827] dark:text-[#F3F4F6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11.5px] font-medium text-[#374151] dark:text-[#D1D5DB]">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.order}
                      onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) || 0 }))}
                      className="w-full h-9 px-3 rounded-[7px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] text-[12.5px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11.5px] font-medium text-[#374151] dark:text-[#D1D5DB]">
                  Short Summary (shown on Academy cards)
                </label>
                <textarea
                  rows={2}
                  value={form.shortDescription}
                  onChange={(e) => setForm((p) => ({ ...p, shortDescription: e.target.value }))}
                  className="w-full p-2.5 rounded-[7px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] text-[12.5px] text-[#111827] dark:text-[#F3F4F6] focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11.5px] font-medium text-[#374151] dark:text-[#D1D5DB]">
                  Full Description
                </label>
                <textarea
                  rows={3}
                  value={form.fullDescription}
                  onChange={(e) => setForm((p) => ({ ...p, fullDescription: e.target.value }))}
                  className="w-full p-2.5 rounded-[7px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] text-[12.5px] text-[#111827] dark:text-[#F3F4F6] focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11.5px] font-medium text-[#374151] dark:text-[#D1D5DB]">
                  Search Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.keywordsText}
                  onChange={(e) => setForm((p) => ({ ...p, keywordsText: e.target.value }))}
                  placeholder="inbox, crm, analytics, scheduling"
                  className="w-full h-9 px-3 rounded-[7px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] text-[12.5px] text-[#111827] dark:text-[#F3F4F6]"
                />
              </div>

              {/* Learning Objectives */}
              <div className="space-y-2 pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    What You Will Learn (Learning Objectives)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, learningObjectives: [...p.learningObjectives, ''] }))
                    }
                    className="text-[11.5px] font-medium text-[#06B6D4] hover:underline"
                  >
                    + Add Objective
                  </button>
                </div>
                {form.learningObjectives.map((obj, idx) => (
                  <div key={`obj-${idx}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={obj}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          learningObjectives: p.learningObjectives.map((x, i) =>
                            i === idx ? e.target.value : x
                          ),
                        }))
                      }
                      placeholder="Learning outcome from this video…"
                      className="flex-1 h-8 px-2.5 rounded-[6px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] text-[12px] text-[#111827] dark:text-[#F3F4F6]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          learningObjectives: p.learningObjectives.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-rose-500 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Verified Step-by-Step Instructions */}
              <div className="space-y-2 pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[12px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      Verified Step-by-Step Instructions (Optional)
                    </label>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                      Leave empty if not yet verified; the section stays hidden for customers until steps are added.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        steps: [...p.steps, { title: '', detail: '' }],
                      }))
                    }
                    className="text-[11.5px] font-medium text-[#06B6D4] hover:underline shrink-0"
                  >
                    + Add Step
                  </button>
                </div>
                {form.steps.map((step, idx) => (
                  <div
                    key={`step-${idx}`}
                    className="p-3 rounded-[7px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[#6B7280]">Step {idx + 1}</span>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            steps: p.steps.map((s, i) =>
                              i === idx ? { ...s, title: e.target.value } : s
                            ),
                          }))
                        }
                        placeholder="Step heading"
                        className="flex-1 h-8 px-2.5 rounded-[6px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.1] text-[12px] text-[#111827] dark:text-[#F3F4F6]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            steps: p.steps.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-rose-500 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={step.detail}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          steps: p.steps.map((s, i) =>
                            i === idx ? { ...s, detail: e.target.value } : s
                          ),
                        }))
                      }
                      placeholder="Verified instruction detail…"
                      className="w-full p-2 rounded-[6px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.1] text-[12px] text-[#111827] dark:text-[#F3F4F6]"
                    />
                  </div>
                ))}
              </div>

              {/* Important Tips */}
              <div className="space-y-2 pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Important Tips (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, tips: [...p.tips, ''] }))}
                    className="text-[11.5px] font-medium text-[#06B6D4] hover:underline"
                  >
                    + Add Tip
                  </button>
                </div>
                {form.tips.map((tip, idx) => (
                  <div key={`tip-${idx}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tip}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          tips: p.tips.map((x, i) => (i === idx ? e.target.value : x)),
                        }))
                      }
                      placeholder="Helpful tip for customers…"
                      className="flex-1 h-8 px-2.5 rounded-[6px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] text-[12px] text-[#111827] dark:text-[#F3F4F6]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          tips: p.tips.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-rose-500 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer Controls */}
              <div className="pt-4 border-t border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-[12.5px] font-medium text-[#111827] dark:text-[#F3F4F6] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
                    className="rounded border-[#D1D5DB] text-[#06B6D4] focus:ring-[#06B6D4]"
                  />
                  Publish immediately in Customer Academy
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="h-9 px-4 rounded-[7px] border border-[#E5E7EB] dark:border-white/[0.1] text-[12.5px] font-medium text-[#4B5563] dark:text-[#D1D5DB]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingTutorial || !extractedVideoId}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[7px] bg-[#111827] dark:bg-[#F3F4F6] text-white dark:text-[#090A0D] text-[12.5px] font-medium disabled:opacity-50"
                  >
                    {savingTutorial && <Loader2 size={13} className="animate-spin" />}
                    {form.id ? 'Save Changes' : 'Create Tutorial'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
