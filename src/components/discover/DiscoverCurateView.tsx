import React, { useState, useMemo } from 'react';
import {
  Radar,
  Rss,
  ShoppingBag,
  Search,
  RefreshCw,
  Sparkles,
  Plus,
  Trash2,
  ExternalLink,
  Send,
  Loader2,
  X,
  Check,
  Repeat2,
} from 'lucide-react';
import {
  RssSource,
  CuratedFeedItem,
  EcommerceFeed,
  EcommerceProduct,
  Platform,
  Draft,
  SocialPost,
  ContentCategory,
} from '../../types';
import { aiService } from '../../services/aiService';
import { validatePublicHttpUrl } from '../../utils/urlValidation';
import {
  InspectorDrawer,
  StatusBadge,
  EmptyStatePanel,
} from '../common/DesignPrimitives';

interface DiscoverCurateViewProps {
  workspaceId: string;
  workspaceName: string;
  workspaceIndustry: string;
  categories: ContentCategory[];
  rssSources: RssSource[];
  curatedItems: CuratedFeedItem[];
  ecommerceFeeds: EcommerceFeed[];
  maxRssQuota: number;
  aiCreditsRemaining: number;
  onConsumeCredits: (amount: number, reason: string) => boolean;
  onOpenSettings?: () => void;
  onAddRssSource: (source: RssSource) => void;
  onUpdateRssSource: (source: RssSource) => void;
  onDeleteRssSource: (id: string) => void;
  onAddCuratedItems: (items: CuratedFeedItem[]) => void;
  onMarkCuratedRepurposed: (id: string) => void;
  onAddEcommerceFeed: (feed: EcommerceFeed) => void;
  onUpdateEcommerceFeed: (feed: EcommerceFeed) => void;
  onDeleteEcommerceFeed: (id: string) => void;
  onAddDrafts: (drafts: Draft[]) => void;
  onScheduleSocialPosts: (posts: SocialPost[]) => void;
  onOpenInStudio: (preset: { topic?: string; platforms?: Platform[]; firstComment?: string }) => void;
  onToast: (title: string, description?: string, variant?: 'info' | 'success' | 'warning') => void;
}

const ALL_PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X (Twitter)' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'threads', label: 'Threads' },
  { id: 'bluesky', label: 'Bluesky' },
  { id: 'gbp', label: 'Google Business' },
];

type DiscoverSubTab = 'explorer' | 'rss' | 'ecommerce';

export function DiscoverCurateView({
  workspaceId,
  workspaceName,
  workspaceIndustry,
  categories,
  rssSources,
  curatedItems,
  ecommerceFeeds,
  maxRssQuota,
  aiCreditsRemaining,
  onConsumeCredits,
  onOpenSettings,
  onAddRssSource,
  onUpdateRssSource,
  onDeleteRssSource,
  onAddCuratedItems,
  onMarkCuratedRepurposed,
  onAddEcommerceFeed,
  onUpdateEcommerceFeed,
  onDeleteEcommerceFeed,
  onAddDrafts,
  onScheduleSocialPosts,
  onOpenInStudio,
  onToast,
}: DiscoverCurateViewProps) {
  const wsSources = useMemo(
    () => rssSources.filter((s) => s.workspaceId === workspaceId),
    [rssSources, workspaceId]
  );
  const wsItems = useMemo(
    () => curatedItems.filter((i) => i.workspaceId === workspaceId),
    [curatedItems, workspaceId]
  );
  const wsEcom = useMemo(
    () => ecommerceFeeds.filter((e) => e.workspaceId === workspaceId),
    [ecommerceFeeds, workspaceId]
  );
  const wsCategories = useMemo(
    () => categories.filter((c) => c.workspaceId === workspaceId),
    [categories, workspaceId]
  );

  const [subTab, setSubTab] = useState<DiscoverSubTab>('explorer');

  // Explorer controls
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'youtube' | 'x' | 'reddit' | 'news' | 'blog'>('all');
  const [velocityFilter, setVelocityFilter] = useState<'all' | 'Breakout' | 'Rising Fast' | 'High Discussion'>('all');
  const [exploring, setExploring] = useState(false);

  // Repurpose drawer/panel
  const [repurposeTarget, setRepurposeTarget] = useState<{
    id?: string;
    title: string;
    summary: string;
    url: string;
  } | null>(null);
  const [repurposePlatform, setRepurposePlatform] = useState<Platform>('linkedin');
  const [brandVoice, setBrandVoice] = useState('Sharp, practical B2B strategist');
  const [utmCampaign, setUtmCampaign] = useState('curated_growth');
  const [repurposing, setRepurposing] = useState(false);
  const [repurposeResult, setRepurposeResult] = useState<{
    content: string;
    firstComment: string;
    trackedUrl: string;
  } | null>(null);

  // RSS Modal
  const [showRssModal, setShowRssModal] = useState(false);
  const [rssUrlError, setRssUrlError] = useState<string | null>(null);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [rssForm, setRssForm] = useState({
    name: '',
    feedUrl: '',
    sourceType: 'rss' as RssSource['sourceType'],
    keywordFilter: '',
    automationRule: 'auto_draft' as RssSource['automationRule'],
    targetPlatforms: ['linkedin', 'x'] as Platform[],
  });

  // eCommerce Modal & Product Form
  const [showEcomModal, setShowEcomModal] = useState(false);
  const [ecomUrlError, setEcomUrlError] = useState<string | null>(null);
  const [ecomForm, setEcomForm] = useState({
    platform: 'shopify' as 'shopify' | 'woocommerce',
    storeName: '',
    feedUrl: '',
  });
  const [productDraftByFeed, setProductDraftByFeed] = useState<
    Record<string, { title: string; price: string; compareAtPrice: string; url: string; category: string }>
  >({});

  const handleExplore = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim() || workspaceIndustry;
    if (!q) return;
    if (aiCreditsRemaining < 20) {
      onToast(
        'AI Credit Limit Reached',
        `Viral content discovery needs 20 credits (${aiCreditsRemaining} remaining). Upgrade plan in Settings.`,
        'warning'
      );
      return;
    }

    setExploring(true);
    try {
      const res = await aiService.exploreViralContent({
        query: q,
        channelFilter,
        velocityFilter,
      });
      onConsumeCredits(20, 'Viral Content Discovery Scan');
      const mapped: CuratedFeedItem[] = (res.items || []).map((item) => ({
        ...item,
        workspaceId,
      }));
      onAddCuratedItems(mapped);
      onToast('Viral Content Discovered', `Loaded ${mapped.length} live trending items for "${q}" (-20 AI credits).`, 'success');
    } catch (err) {
      onToast('Discovery Failed', err instanceof Error ? err.message : 'Unable to fetch viral items.', 'warning');
    } finally {
      setExploring(false);
    }
  };

  const handleRunRepurpose = async () => {
    if (!repurposeTarget) return;
    if (aiCreditsRemaining < 15) {
      onToast(
        'AI Credit Limit Reached',
        `AI Repurpose & Spin needs 15 credits (${aiCreditsRemaining} remaining). Upgrade plan in Settings.`,
        'warning'
      );
      return;
    }

    setRepurposing(true);
    try {
      const res = await aiService.repurposeCuratedItem({
        title: repurposeTarget.title,
        summary: repurposeTarget.summary,
        url: repurposeTarget.url,
        platform: repurposePlatform,
        brandVoice,
        utmCampaign,
      });
      onConsumeCredits(15, '1-Click AI Repurpose & Spin');
      const ensuredContent =
        res.trackedUrl && !res.content.includes('utm_source=') && !res.firstComment.includes('utm_source=')
          ? `${res.content.trim()}\n\n${res.trackedUrl}`
          : res.content;
      setRepurposeResult({ ...res, content: ensuredContent });
      if (repurposeTarget.id) {
        onMarkCuratedRepurposed(repurposeTarget.id);
      }
      onToast('Spun in Brand Voice', `Generated native ${repurposePlatform.toUpperCase()} copy with UTM link (-15 AI credits).`, 'success');
    } catch (err) {
      onToast('Repurpose Failed', err instanceof Error ? err.message : 'Unable to spin item.', 'warning');
    } finally {
      setRepurposing(false);
    }
  };

  const handleAddRss = (e: React.FormEvent) => {
    e.preventDefault();
    setRssUrlError(null);
    if (!rssForm.name.trim() || !rssForm.feedUrl.trim()) return;
    const urlCheck = validatePublicHttpUrl(rssForm.feedUrl);
    if (!urlCheck.valid || !urlCheck.normalizedUrl) {
      setRssUrlError(urlCheck.error || 'Enter a valid public https:// RSS/Atom URL.');
      return;
    }
    if (wsSources.length >= maxRssQuota) {
      onToast('RSS Feed Quota Reached', `Your plan allows up to ${maxRssQuota} RSS auto-feeds.`, 'warning');
      return;
    }
    const created: RssSource = {
      id: `rss-${Date.now()}`,
      workspaceId,
      name: rssForm.name.trim(),
      feedUrl: urlCheck.normalizedUrl,
      sourceType: rssForm.sourceType,
      keywordFilter: rssForm.keywordFilter.trim(),
      automationRule: rssForm.automationRule,
      targetCategoryId: wsCategories[0]?.id,
      targetPlatforms: rssForm.targetPlatforms.length ? rssForm.targetPlatforms : ['linkedin'],
      active: true,
      itemsImported: 0,
      createdAt: new Date().toISOString(),
    };
    onAddRssSource(created);
    setShowRssModal(false);
    setRssUrlError(null);
    setRssForm({
      name: '',
      feedUrl: '',
      sourceType: 'rss',
      keywordFilter: '',
      automationRule: 'auto_draft',
      targetPlatforms: ['linkedin', 'x'],
    });
    onToast('RSS Source Added', `${created.name} configured with ${created.automationRule.replace('_', ' ')} rule.`, 'success');
  };

  const handleSyncRssSource = async (source: RssSource) => {
    setSyncingSourceId(source.id);
    try {
      const res = await aiService.fetchRssFeed({
        feedUrl: source.feedUrl,
        keywordFilter: source.keywordFilter,
        sourceName: source.name,
        sourceType: source.sourceType,
      });

      const imported: CuratedFeedItem[] = res.items.map((it, idx) => ({
        id: `rss-item-${Date.now()}-${idx}`,
        workspaceId,
        sourceId: source.id,
        sourceName: source.name,
        channel: source.sourceType === 'youtube' ? 'youtube' : source.sourceType === 'reddit' ? 'reddit' : 'rss',
        title: it.title,
        summary: it.summary,
        url: it.url,
        publishedAt: it.publishedAt,
        velocityLabel: 'RSS Import',
      }));

      if (imported.length > 0) {
        onAddCuratedItems(imported);

        if (source.automationRule === 'auto_draft') {
          const drafts: Draft[] = imported.slice(0, 3).map((it, i) => ({
            id: `dr-rss-${Date.now()}-${i}`,
            workspaceId,
            categoryId: source.targetCategoryId,
            topic: it.title,
            platforms: source.targetPlatforms,
            content: `${it.title}\n\n${it.summary}\n\nSource: ${it.url}`,
            status: 'ai_draft',
            createdAt: new Date().toISOString(),
          }));
          onAddDrafts(drafts);
        } else if (source.automationRule === 'evergreen_queue') {
          const posts: SocialPost[] = imported.slice(0, 3).map((it, i) => ({
            id: `p-rss-${Date.now()}-${i}`,
            workspaceId,
            categoryId: source.targetCategoryId,
            platforms: source.targetPlatforms,
            content: `${it.title}\n\n${it.summary}\n\nRead more: ${it.url}`,
            status: 'scheduled',
            isEvergreen: true,
            scheduledAt: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
          }));
          onScheduleSocialPosts(posts);
        }
      }

      onUpdateRssSource({
        ...source,
        itemsImported: source.itemsImported + imported.length,
        lastFetchedAt: res.fetchedAt,
      });
      onToast(
        'RSS Feed Synced',
        `Imported ${imported.length} matching item(s) from ${source.name}${
          source.automationRule !== 'manual' && imported.length > 0
            ? ` and executed "${source.automationRule.replace('_', ' ')}" rule.`
            : '.'
        }`,
        'success'
      );
    } catch (err) {
      onToast('RSS Sync Error', err instanceof Error ? err.message : 'Unable to parse RSS feed.', 'warning');
    } finally {
      setSyncingSourceId(null);
    }
  };

  const handleAddEcommerce = (e: React.FormEvent) => {
    e.preventDefault();
    setEcomUrlError(null);
    if (!ecomForm.storeName.trim() || !ecomForm.feedUrl.trim()) return;
    const urlCheck = validatePublicHttpUrl(ecomForm.feedUrl);
    if (!urlCheck.valid || !urlCheck.normalizedUrl) {
      setEcomUrlError(urlCheck.error || 'Enter a valid public https:// store feed URL.');
      return;
    }
    const created: EcommerceFeed = {
      id: `ecom-${Date.now()}`,
      workspaceId,
      platform: ecomForm.platform,
      storeName: ecomForm.storeName.trim(),
      feedUrl: urlCheck.normalizedUrl,
      status: 'connected',
      products: [],
      lastSyncedAt: new Date().toISOString(),
    };
    onAddEcommerceFeed(created);
    setShowEcomModal(false);
    setEcomUrlError(null);
    setEcomForm({ platform: 'shopify', storeName: '', feedUrl: '' });
    onToast('Store Feed Connected', `${created.storeName} (${created.platform}) linked to workspace.`, 'success');
  };

  const handleAddProductToFeed = (feed: EcommerceFeed) => {
    const draft = productDraftByFeed[feed.id];
    if (!draft?.title?.trim() || !draft?.price?.trim()) return;
    const newProd: EcommerceProduct = {
      id: `prod-${Date.now()}`,
      title: draft.title.trim(),
      price: draft.price.trim(),
      compareAtPrice: draft.compareAtPrice?.trim() || undefined,
      url: draft.url?.trim() || feed.feedUrl,
      category: draft.category?.trim() || 'Featured',
    };
    onUpdateEcommerceFeed({
      ...feed,
      products: [newProd, ...feed.products],
      lastSyncedAt: new Date().toISOString(),
    });
    setProductDraftByFeed((prev) => ({
      ...prev,
      [feed.id]: { title: '', price: '', compareAtPrice: '', url: '', category: '' },
    }));
    onToast('Product Added', `${newProd.title} (${newProd.price}) ready for promotional posts.`, 'success');
  };

  const filteredItems = useMemo(
    () =>
      wsItems.filter((item) => {
        if (channelFilter !== 'all' && item.channel !== channelFilter) return false;
        if (velocityFilter !== 'all' && item.velocityLabel !== velocityFilter) return false;
        return true;
      }),
    [wsItems, channelFilter, velocityFilter]
  );

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-[#090A0D] custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-5">
          <div>
            <p className="text-[11px] font-medium text-[#06B6D4] uppercase tracking-[0.04em]">
              Content Discovery, RSS &amp; Product Automation · {workspaceName}
            </p>
            <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] mt-1">
              Discover &amp; Curate
            </h1>
            <p className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">
              Explore breaking stories across YouTube, X, Reddit, and News, automate RSS/blog imports, sync Shopify/WooCommerce catalogs, and spin posts for all 10 networks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <span className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] font-mono tabular-nums">
              RSS Feeds {wsSources.length}/{maxRssQuota} · AI Credits {aiCreditsRemaining.toLocaleString()} left
            </span>
            <button
              onClick={() => setShowRssModal(true)}
              className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <Plus size={14} strokeWidth={1.5} /> Add RSS Source
            </button>
          </div>
        </div>

        {/* Non-Blocking Plan Quota & AI Credit Banner */}
        {(wsSources.length >= maxRssQuota || aiCreditsRemaining < 20) && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-[12px] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-[12px]">
            <p className="text-[#111827] dark:text-[#F3F4F6] font-medium">
              {wsSources.length >= maxRssQuota
                ? `RSS Auto-Feed quota reached (${wsSources.length}/${maxRssQuota} on your current plan).`
                : `Low AI credit balance (${aiCreditsRemaining} remaining — Discovery needs 20 credits, AI Spin needs 15).`}
            </p>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium whitespace-nowrap transition-colors"
              >
                Manage Plan &amp; Quotas
              </button>
            )}
          </div>
        )}

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px] w-fit">
          {[
            { id: 'explorer' as const, label: `Viral Post Explorer (${wsItems.length})`, icon: Radar },
            { id: 'rss' as const, label: `RSS & Auto-Importer (${wsSources.length})`, icon: Rss },
            { id: 'ecommerce' as const, label: `eCommerce Feeds (${wsEcom.length})`, icon: ShoppingBag },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={`px-3 py-1.5 rounded-[7px] text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  subTab === t.id
                    ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.08]'
                    : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
                }`}
              >
                <Icon size={14} strokeWidth={1.5} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* SUB-TAB 1: VIRAL EXPLORER */}
        {subTab === 'explorer' && (
          <div className="space-y-5">
            <form
              onSubmit={handleExplore}
              className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center text-[12px]"
            >
              <div className="relative flex-1">
                <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search trending topics or hashtags (e.g. ${workspaceIndustry}, #AI, B2B SaaS)...`}
                  className="w-full pl-9 pr-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] placeholder:text-[#6B7280] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as typeof channelFilter)}
                className="px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
              >
                <option value="all">All Sources</option>
                <option value="youtube">YouTube</option>
                <option value="x">X (Twitter)</option>
                <option value="reddit">Reddit</option>
                <option value="news">News</option>
                <option value="blog">Niche Blogs</option>
              </select>
              <select
                value={velocityFilter}
                onChange={(e) => setVelocityFilter(e.target.value as typeof velocityFilter)}
                className="px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
              >
                <option value="all">All Velocities</option>
                <option value="Breakout">Breakout</option>
                <option value="Rising Fast">Rising Fast</option>
                <option value="High Discussion">High Discussion</option>
              </select>
              <button
                type="submit"
                disabled={exploring}
                className="px-4 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-60 transition-colors"
              >
                {exploring ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={1.5} />}
                {exploring ? 'Scanning Live Sources...' : 'Discover Viral Posts'}
              </button>
            </form>

            {exploring ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-4 space-y-3"
                  >
                    <div className="h-3 shimmer-block rounded w-1/2" />
                    <div className="h-5 shimmer-block rounded w-11/12" />
                    <div className="h-12 shimmer-block rounded" />
                    <div className="h-8 shimmer-block rounded" />
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px]">
                <EmptyStatePanel
                  icon={Radar}
                  title="No curated or viral items loaded yet"
                  description="Run a live discovery search above or sync an RSS feed to populate real trending articles, videos, and discussions ready for 1-click Brand Voice repurposing."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[12px] p-4 flex flex-col justify-between gap-3 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-medium text-[#6B7280] dark:text-[#9CA3AF] truncate">
                          <span className="uppercase font-mono text-[#06B6D4] font-semibold">
                            {item.channel}
                          </span>
                          <span className="mx-1.5">·</span>
                          <span>{item.sourceName}</span>
                        </p>
                        <StatusBadge
                          tone={
                            item.velocityLabel === 'Breakout'
                              ? 'orange'
                              : item.velocityLabel === 'Rising Fast'
                              ? 'cyan'
                              : 'neutral'
                          }
                        >
                          {item.velocityLabel}
                        </StatusBadge>
                      </div>
                      <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em] mt-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-[12px] text-[#4B5563] dark:text-[#9CA3AF] mt-1.5 line-clamp-3">
                        {item.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-2 text-[12px]">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#6B7280] hover:text-[#06B6D4] flex items-center gap-1 transition-colors"
                      >
                        Source <ExternalLink size={11} strokeWidth={1.5} />
                      </a>
                      <button
                        onClick={() => {
                          setRepurposeTarget({
                            id: item.id,
                            title: item.title,
                            summary: item.summary,
                            url: item.url,
                          });
                          setRepurposeResult(null);
                        }}
                        className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <Repeat2 size={12} strokeWidth={1.5} /> {item.repurposed ? 'Spin Again' : '1-Click AI Spin'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 2: RSS AUTO-IMPORTER */}
        {subTab === 'rss' && (
          <div className="space-y-4">
            {wsSources.length === 0 ? (
              <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px]">
                <EmptyStatePanel
                  icon={Rss}
                  title="No RSS, YouTube, or blog feeds configured yet"
                  description="Add any public RSS/Atom or YouTube XML feed URL and define keyword rules to auto-draft posts or push items into your Evergreen Queue."
                  actionLabel="Add First RSS Source"
                  onAction={() => setShowRssModal(true)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wsSources.map((src) => (
                  <div
                    key={src.id}
                    className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5 space-y-3 text-[12px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em] truncate">
                          {src.name}
                        </p>
                        <p className="font-mono text-[11px] text-[#6B7280] truncate mt-0.5">{src.feedUrl}</p>
                      </div>
                      <button
                        onClick={() => onDeleteRssSource(src.id)}
                        className="p-1 text-[#6B7280] hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                      <StatusBadge tone="cyan">{src.automationRule.replace('_', ' ')}</StatusBadge>
                      <span>Keyword: {src.keywordFilter || 'All items'}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{src.itemsImported} imported</span>
                    </div>
                    <div className="pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#6B7280] font-mono tabular-nums">
                        {src.lastFetchedAt
                          ? `Last synced ${new Date(src.lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Not synced yet'}
                      </span>
                      <button
                        disabled={syncingSourceId === src.id}
                        onClick={() => handleSyncRssSource(src)}
                        className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[11px] font-medium flex items-center gap-1.5 disabled:opacity-60 transition-colors"
                      >
                        <RefreshCw size={12} strokeWidth={1.5} className={syncingSourceId === src.id ? 'animate-spin' : ''} />
                        {syncingSourceId === src.id ? 'Fetching Feed...' : 'Fetch & Run Rule'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 3: ECOMMERCE PRODUCT FEEDS */}
        {subTab === 'ecommerce' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-[#4B5563] dark:text-[#9CA3AF]">
                Connect Shopify or WooCommerce product feeds to spin dynamic-price promotional posts across social channels.
              </p>
              <button
                onClick={() => setShowEcomModal(true)}
                className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Plus size={14} strokeWidth={1.5} /> Connect Store Feed
              </button>
            </div>

            {wsEcom.length === 0 ? (
              <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px]">
                <EmptyStatePanel
                  icon={ShoppingBag}
                  title="No eCommerce product feeds connected yet"
                  description="Link a Shopify or WooCommerce catalog to auto-generate promotional social posts with live pricing and UTM links."
                  actionLabel="Connect Store Feed"
                  onAction={() => setShowEcomModal(true)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {wsEcom.map((feed) => {
                  const pDraft = productDraftByFeed[feed.id] || {
                    title: '',
                    price: '',
                    compareAtPrice: '',
                    url: '',
                    category: '',
                  };
                  return (
                    <div
                      key={feed.id}
                      className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5 space-y-4 text-[12px]"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                              {feed.storeName}
                            </p>
                            <StatusBadge tone="cyan">{feed.platform}</StatusBadge>
                          </div>
                          <p className="font-mono text-[11px] text-[#6B7280] mt-0.5">{feed.feedUrl}</p>
                        </div>
                        <button
                          onClick={() => onDeleteEcommerceFeed(feed.id)}
                          className="p-1 text-[#6B7280] hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </div>

                      {/* Quick Add Catalog Product */}
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        <input
                          value={pDraft.title}
                          onChange={(e) =>
                            setProductDraftByFeed((prev) => ({ ...prev, [feed.id]: { ...pDraft, title: e.target.value } }))
                          }
                          placeholder="Product name"
                          className="sm:col-span-2 px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                        />
                        <input
                          value={pDraft.price}
                          onChange={(e) =>
                            setProductDraftByFeed((prev) => ({ ...prev, [feed.id]: { ...pDraft, price: e.target.value } }))
                          }
                          placeholder="Price (e.g. $79)"
                          className="px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                        />
                        <input
                          value={pDraft.url}
                          onChange={(e) =>
                            setProductDraftByFeed((prev) => ({ ...prev, [feed.id]: { ...pDraft, url: e.target.value } }))
                          }
                          placeholder="Product URL"
                          className="px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                        />
                        <button
                          onClick={() => handleAddProductToFeed(feed)}
                          className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium transition-colors"
                        >
                          Add Product
                        </button>
                      </div>

                      {feed.products.length === 0 ? (
                        <p className="text-[11px] text-[#6B7280] py-3">
                          No products synced in this feed yet. Add a product above to spin promotional posts.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {feed.products.map((prod) => (
                            <div
                              key={prod.id}
                              className="p-3.5 rounded-[10px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex flex-col justify-between gap-2.5"
                            >
                              <div>
                                <p className="font-medium text-[#111827] dark:text-[#F3F4F6]">{prod.title}</p>
                                <p className="font-mono text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] mt-1 tabular-nums">
                                  {prod.price}{' '}
                                  {prod.compareAtPrice && (
                                    <span className="text-[11px] text-[#6B7280] line-through font-normal">
                                      {prod.compareAtPrice}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setRepurposeTarget({
                                    title: `Promo: ${prod.title} (${prod.price})`,
                                    summary: `Promotional product highlight from ${feed.storeName} priced at ${prod.price}. Highlight value, urgency, and direct link.`,
                                    url: prod.url,
                                  });
                                  setRepurposeResult(null);
                                }}
                                className="w-full py-1.5 border border-[#E5E7EB] dark:border-white/[0.12] hover:border-[#06B6D4] bg-[#FFFFFF] dark:bg-[#13161D] text-[#111827] dark:text-[#F3F4F6] rounded-[7px] text-[11px] font-medium transition-colors"
                              >
                                Generate Promo Post
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 480px 1-Click AI Repurpose & Spin Inspector Drawer */}
      <InspectorDrawer
        open={Boolean(repurposeTarget)}
        onClose={() => setRepurposeTarget(null)}
        title="1-Click AI Repurpose & Spin"
        subtitle={repurposeTarget?.title}
        footer={
          repurposeResult ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenInStudio({
                    topic: repurposeResult.content,
                    platforms: [repurposePlatform],
                    firstComment: repurposeResult.firstComment,
                  });
                  setRepurposeTarget(null);
                }}
                className="px-3 py-1.5 border border-[#E5E7EB] dark:border-white/[0.12] hover:border-[#D1D5DB] dark:hover:border-white/[0.2] rounded-[8px] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] transition-colors"
              >
                Open in Studio
              </button>
              <button
                type="button"
                onClick={() => {
                  onScheduleSocialPosts([
                    {
                      id: `p-cur-${Date.now()}`,
                      workspaceId,
                      platforms: [repurposePlatform],
                      content: repurposeResult.content,
                      firstComment: repurposeResult.firstComment,
                      status: 'scheduled',
                      isEvergreen: true,
                      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                    },
                  ]);
                  setRepurposeTarget(null);
                  onToast('Scheduled Curated Post', `Added to Visual Scheduler for ${repurposePlatform.toUpperCase()}.`, 'success');
                }}
                className="px-3.5 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
              >
                <Send size={13} strokeWidth={1.5} /> Push to Scheduler
              </button>
            </div>
          ) : undefined
        }
      >
        {repurposeTarget && (
          <div className="space-y-4 text-[12px]">
            <div className="p-3 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] space-y-1">
              <p className="font-medium text-[#111827] dark:text-[#F3F4F6]">{repurposeTarget.title}</p>
              <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] line-clamp-3">{repurposeTarget.summary}</p>
              <p className="font-mono text-[10px] text-[#06B6D4] truncate">{repurposeTarget.url}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Target Network</label>
                <select
                  value={repurposePlatform}
                  onChange={(e) => setRepurposePlatform(e.target.value as Platform)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                >
                  {ALL_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Brand Voice</label>
                <input
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">UTM Campaign</label>
                <input
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
            </div>

            <button
              disabled={repurposing}
              onClick={handleRunRepurpose}
              className="w-full py-2.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-60 transition-colors"
            >
              {repurposing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={1.5} />}
              {repurposing ? 'Rewriting in Brand Voice...' : `Spin for ${repurposePlatform.toUpperCase()} (-15 AI Credits)`}
            </button>

            {repurposing && (
              <div className="space-y-2 pt-2">
                <div className="h-4 shimmer-block rounded w-1/3" />
                <div className="h-24 shimmer-block rounded w-full" />
              </div>
            )}

            {repurposeResult && !repurposing && (
              <div className="space-y-3 pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08]">
                <div>
                  <label className="font-medium text-[#111827] dark:text-[#F3F4F6] block mb-1">
                    Generated Native Copy
                  </label>
                  <textarea
                    rows={6}
                    value={repurposeResult.content}
                    onChange={(e) => setRepurposeResult({ ...repurposeResult, content: e.target.value })}
                    className="w-full p-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                {repurposeResult.trackedUrl && (
                  <div className="p-2.5 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                    <p className="text-[10px] font-mono uppercase text-[#6B7280] mb-0.5">Tracked UTM Link</p>
                    <p className="font-mono text-[11px] text-[#06B6D4] break-all">
                      {repurposeResult.trackedUrl}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </InspectorDrawer>

      {/* Add RSS Modal */}
      {showRssModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setShowRssModal(false)} />
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                Add RSS / Content Automation Source
              </h3>
              <button
                onClick={() => setShowRssModal(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] rounded-md"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleAddRss} className="mt-4 space-y-3.5 text-[12px]">
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Source Name *</label>
                <input
                  required
                  value={rssForm.name}
                  onChange={(e) => setRssForm({ ...rssForm, name: e.target.value })}
                  placeholder="e.g. TechCrunch AI Feed"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">RSS / Atom / YouTube XML URL *</label>
                <input
                  required
                  value={rssForm.feedUrl}
                  onChange={(e) => {
                    setRssForm({ ...rssForm, feedUrl: e.target.value });
                    if (rssUrlError) setRssUrlError(null);
                  }}
                  placeholder="https://techcrunch.com/feed/"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
                {rssUrlError && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{rssUrlError}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Source Type</label>
                  <select
                    value={rssForm.sourceType}
                    onChange={(e) => setRssForm({ ...rssForm, sourceType: e.target.value as RssSource['sourceType'] })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  >
                    <option value="rss">RSS / Atom</option>
                    <option value="youtube">YouTube Channel Feed</option>
                    <option value="blog">Industry Blog</option>
                    <option value="reddit">Subreddit RSS</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Automation Rule</label>
                  <select
                    value={rssForm.automationRule}
                    onChange={(e) =>
                      setRssForm({ ...rssForm, automationRule: e.target.value as RssSource['automationRule'] })
                    }
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  >
                    <option value="auto_draft">Auto-Draft Matching Items</option>
                    <option value="evergreen_queue">Add to Evergreen Queue</option>
                    <option value="manual">Manual Curate Only</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                  Keyword Filter (comma-separated, optional)
                </label>
                <input
                  value={rssForm.keywordFilter}
                  onChange={(e) => setRssForm({ ...rssForm, keywordFilter: e.target.value })}
                  placeholder="e.g. AI, automation, marketing"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRssModal(false)}
                  className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] font-medium text-[#4B5563] dark:text-[#9CA3AF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium transition-colors"
                >
                  Save RSS Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add eCommerce Store Modal */}
      {showEcomModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setShowEcomModal(false)} />
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                Connect Shopify / WooCommerce Store
              </h3>
              <button
                onClick={() => setShowEcomModal(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] rounded-md"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleAddEcommerce} className="mt-4 space-y-3.5 text-[12px]">
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Platform</label>
                <select
                  value={ecomForm.platform}
                  onChange={(e) => setEcomForm({ ...ecomForm, platform: e.target.value as 'shopify' | 'woocommerce' })}
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                >
                  <option value="shopify">Shopify Storefront</option>
                  <option value="woocommerce">WooCommerce Catalog</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Store Name *</label>
                <input
                  required
                  value={ecomForm.storeName}
                  onChange={(e) => setEcomForm({ ...ecomForm, storeName: e.target.value })}
                  placeholder="e.g. Acme Merch Store"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Product Feed / Store URL *</label>
                <input
                  required
                  value={ecomForm.feedUrl}
                  onChange={(e) => {
                    setEcomForm({ ...ecomForm, feedUrl: e.target.value });
                    if (ecomUrlError) setEcomUrlError(null);
                  }}
                  placeholder="https://store.yourdomain.com/products.json"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
                {ecomUrlError && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{ecomUrlError}</p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEcomModal(false)}
                  className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] font-medium text-[#4B5563] dark:text-[#9CA3AF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium transition-colors"
                >
                  Connect Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
