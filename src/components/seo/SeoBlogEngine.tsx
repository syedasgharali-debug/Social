import React, { useState, useMemo } from 'react';
import {
  FileText,
  Sparkles,
  Globe,
  Send,
  Download,
  Copy,
  Check,
  Trash2,
  Plus,
  Loader2,
  BarChart3,
  Link2,
  Code2,
  X,
  Image as ImageIcon,
  PanelRightOpen,
} from 'lucide-react';
import {
  SeoArticle,
  CmsConnector,
  CmsProvider,
  SocialPost,
} from '../../types';
import { aiService } from '../../services/aiService';
import { validatePublicHttpUrl } from '../../utils/urlValidation';
import {
  KpiMetricCard,
  InspectorDrawer,
  StatusBadge,
  EmptyStatePanel,
} from '../common/DesignPrimitives';

interface SeoBlogEngineProps {
  workspaceId: string;
  workspaceName: string;
  workspaceIndustry: string;
  articles: SeoArticle[];
  connectors: CmsConnector[];
  maxArticlesQuota: number;
  aiCreditsRemaining: number;
  onConsumeCredits: (amount: number, reason: string) => boolean;
  onOpenSettings?: () => void;
  onAddArticle: (article: SeoArticle) => void;
  onUpdateArticle: (article: SeoArticle) => void;
  onDeleteArticle: (id: string) => void;
  onAddConnector: (connector: CmsConnector) => void;
  onUpdateConnector: (connector: CmsConnector) => void;
  onDeleteConnector: (id: string) => void;
  onScheduleSocialPosts: (posts: SocialPost[]) => void;
  onToast: (title: string, description?: string, variant?: 'info' | 'success' | 'warning') => void;
}

type BlogSubTab = 'editor' | 'connectors' | 'audit';

const PROVIDER_LABELS: Record<CmsProvider, string> = {
  wordpress: 'WordPress REST API',
  webflow: 'Webflow CMS',
  shopify: 'Shopify Blog API',
  ghost: 'Ghost Admin API',
  webhook: 'Custom Webhook / REST',
};

export function SeoBlogEngine({
  workspaceId,
  workspaceName,
  workspaceIndustry,
  articles,
  connectors,
  maxArticlesQuota,
  aiCreditsRemaining,
  onConsumeCredits,
  onOpenSettings,
  onAddArticle,
  onUpdateArticle,
  onDeleteArticle,
  onAddConnector,
  onUpdateConnector,
  onDeleteConnector,
  onScheduleSocialPosts,
  onToast,
}: SeoBlogEngineProps) {
  const wsArticles = useMemo(
    () => articles.filter((a) => a.workspaceId === workspaceId),
    [articles, workspaceId]
  );
  const wsConnectors = useMemo(
    () => connectors.filter((c) => c.workspaceId === workspaceId),
    [connectors, workspaceId]
  );

  const [subTab, setSubTab] = useState<BlogSubTab>('editor');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceUrlError, setSourceUrlError] = useState<string | null>(null);
  const [audience, setAudience] = useState('SaaS Founders & Marketing Leaders');
  const [tone, setTone] = useState('Authoritative Editorial');
  const [autoSyndicate, setAutoSyndicate] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string>(() => wsArticles[0]?.id || '');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [showInspector, setShowInspector] = useState(false);
  const [inspectorSection, setInspectorSection] = useState<'seo' | 'schema' | 'social'>('seo');

  const [showConnectorModal, setShowConnectorModal] = useState(false);
  const [connectorUrlError, setConnectorUrlError] = useState<string | null>(null);
  const [connectorForm, setConnectorForm] = useState({
    provider: 'wordpress' as CmsProvider,
    label: '',
    endpointUrl: '',
    autoSyndicateDefault: true,
  });

  const activeArticle = useMemo(
    () => wsArticles.find((a) => a.id === selectedArticleId) || wsArticles[0] || null,
    [wsArticles, selectedArticleId]
  );

  const copyText = (key: string, text: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
    onToast('Copied', label, 'info');
  };

  const handleGenerateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSourceUrlError(null);
    if (!targetKeyword.trim()) {
      onToast('Keyword Required', 'Enter a target SEO keyword to draft your article.', 'warning');
      return;
    }
    if (sourceUrl.trim()) {
      const check = validatePublicHttpUrl(sourceUrl);
      if (!check.valid) {
        setSourceUrlError(check.error || 'Enter a valid public https:// URL.');
        return;
      }
    }
    if (wsArticles.length >= maxArticlesQuota) {
      onToast(
        'Monthly Article Quota Reached',
        `Your plan allows up to ${maxArticlesQuota} SEO articles per workspace.`,
        'warning'
      );
      return;
    }
    if (aiCreditsRemaining < 60) {
      onToast(
        'AI Credit Limit Reached',
        `SEO article generation needs 60 credits (${aiCreditsRemaining} remaining). Upgrade plan in Settings.`,
        'warning'
      );
      return;
    }

    setGenerating(true);
    try {
      const data = await aiService.generateSeoArticle({
        targetKeyword: targetKeyword.trim(),
        sourceUrl: sourceUrl.trim() || undefined,
        brandName: workspaceName,
        audience: audience.trim() || workspaceIndustry,
        tone,
      });

      onConsumeCredits(60, 'AI SEO Blog Article Generation');
      const now = new Date().toISOString();
      const created: SeoArticle = {
        id: `seo-${Date.now()}`,
        workspaceId,
        targetKeyword: targetKeyword.trim(),
        sourceUrl: sourceUrl.trim() || undefined,
        title: data.title,
        slug: data.slug,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        h1: data.h1,
        sections: data.sections,
        heroImageAlt: data.heroImageAlt,
        heroVisualAccent: 'cyan',
        schemaFaq: data.schemaFaq,
        internalLinks: data.internalLinks,
        wordCount: data.wordCount,
        readabilityScore: data.readabilityScore,
        seoScore: data.seoScore,
        estimatedMonthlyTraffic: 0,
        status: 'draft',
        autoSyndicateSocial: autoSyndicate,
        socialBundle: data.socialBundle,
        createdAt: now,
        updatedAt: now,
      };
      onAddArticle(created);
      setSelectedArticleId(created.id);
      setTargetKeyword('');
      setSourceUrl('');
      onToast('SEO Article Generated', `"${created.title}" (${created.wordCount} words · -60 AI credits).`, 'success');
    } catch (err) {
      onToast('Generation Failed', err instanceof Error ? err.message : 'Unable to draft article.', 'warning');
    } finally {
      setGenerating(false);
    }
  };

  const buildFaqJsonLd = (article: SeoArticle) =>
    JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: article.schemaFaq.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
      null,
      2
    );

  const createSyndicationPosts = (article: SeoArticle): SocialPost[] => {
    const bundle = article.socialBundle;
    const baseTime = Date.now() + 3600 * 1000 * 4;
    const stamp = Date.now();
    return [
      {
        id: `p-seo-li-${stamp}`,
        workspaceId,
        platforms: ['linkedin'],
        content: bundle?.linkedinCarousel || `${article.title}\n\n${article.metaDescription}`,
        status: 'scheduled',
        isEvergreen: true,
        scheduledAt: new Date(baseTime).toISOString(),
      },
      {
        id: `p-seo-x-${stamp + 1}`,
        workspaceId,
        platforms: ['x'],
        content: bundle?.xThread || `${article.title}\n\nKey takeaway: ${article.metaDescription}`,
        status: 'scheduled',
        isEvergreen: true,
        scheduledAt: new Date(baseTime + 3600 * 1000 * 6).toISOString(),
      },
      {
        id: `p-seo-ig-${stamp + 2}`,
        workspaceId,
        platforms: ['instagram'],
        content: bundle?.instagramCaption || `${article.h1}\n\n${article.metaDescription}`,
        status: 'scheduled',
        isEvergreen: true,
        scheduledAt: new Date(baseTime + 3600 * 1000 * 18).toISOString(),
      },
      {
        id: `p-seo-fb-${stamp + 3}`,
        workspaceId,
        platforms: ['facebook'],
        content: bundle?.facebookPost || `${article.title}\n\n${article.metaDescription}`,
        status: 'scheduled',
        isEvergreen: true,
        scheduledAt: new Date(baseTime + 3600 * 1000 * 24).toISOString(),
      },
    ];
  };

  const handleManualSyndicate = (article: SeoArticle) => {
    const posts = createSyndicationPosts(article);
    onScheduleSocialPosts(posts);
    onUpdateArticle({
      ...article,
      syndicatedPostIds: Array.from(new Set([...(article.syndicatedPostIds || []), ...posts.map((p) => p.id)])),
      updatedAt: new Date().toISOString(),
    });
    onToast(
      'Syndicated to Visual Scheduler',
      `Scheduled 4 social posts (LinkedIn, X, Instagram, Facebook) for "${article.title}".`,
      'success'
    );
  };

  const handlePublishArticle = async (article: SeoArticle, connector?: CmsConnector) => {
    setPublishing(true);
    try {
      const targetConnector = connector || wsConnectors.find((c) => c.status === 'connected');
      if (targetConnector) {
        const res = await aiService.publishArticleToCms({
          provider: targetConnector.provider,
          endpointUrl: targetConnector.endpointUrl,
          article: {
            title: article.title,
            slug: article.slug,
            metaTitle: article.metaTitle,
            metaDescription: article.metaDescription,
            h1: article.h1,
            sections: article.sections,
            schemaFaq: article.schemaFaq,
          },
        });
        onUpdateConnector({ ...targetConnector, lastPublishedAt: res.publishedAt });
      }

      let syndicatedPostIds = article.syndicatedPostIds || [];
      let syndicatedCount = 0;
      if (article.autoSyndicateSocial) {
        const posts = createSyndicationPosts(article);
        onScheduleSocialPosts(posts);
        syndicatedPostIds = Array.from(new Set([...syndicatedPostIds, ...posts.map((p) => p.id)]));
        syndicatedCount = posts.length;
      }

      onUpdateArticle({
        ...article,
        status: 'published',
        publishedCms: targetConnector?.provider || 'webhook',
        syndicatedPostIds,
        updatedAt: new Date().toISOString(),
      });

      onToast(
        'Article Published',
        `${targetConnector ? `Sent to ${targetConnector.label}` : 'Marked published'}${
          syndicatedCount > 0 ? ` and auto-syndicated ${syndicatedCount} posts to Visual Scheduler.` : '.'
        }`,
        'success'
      );
    } catch (err) {
      onToast('Publish Error', err instanceof Error ? err.message : 'CMS dispatch failed.', 'warning');
    } finally {
      setPublishing(false);
    }
  };

  const handleAddConnector = (e: React.FormEvent) => {
    e.preventDefault();
    setConnectorUrlError(null);
    if (!connectorForm.label.trim() || !connectorForm.endpointUrl.trim()) return;
    const validation = validatePublicHttpUrl(connectorForm.endpointUrl);
    if (!validation.valid || !validation.normalizedUrl) {
      setConnectorUrlError(validation.error || 'Enter a valid public https:// endpoint URL.');
      onToast('Invalid CMS Endpoint URL', validation.error || 'Blocked private or malformed URL.', 'warning');
      return;
    }
    const created: CmsConnector = {
      id: `cms-${Date.now()}`,
      workspaceId,
      provider: connectorForm.provider,
      label: connectorForm.label.trim(),
      endpointUrl: validation.normalizedUrl,
      status: 'connected',
      autoSyndicateDefault: connectorForm.autoSyndicateDefault,
    };
    onAddConnector(created);
    setShowConnectorModal(false);
    setConnectorUrlError(null);
    setConnectorForm({ provider: 'wordpress', label: '', endpointUrl: '', autoSyndicateDefault: true });
    onToast('CMS Connector Added', `${created.label} (${PROVIDER_LABELS[created.provider]}) connected.`, 'success');
  };

  const escapeHtml = (val: string) =>
    val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const handleExportHtml = (article: SeoArticle) => {
    const safeJsonLd = buildFaqJsonLd(article).replace(/<\/script/gi, '<\\/script');
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(article.metaTitle)}</title>
  <meta name="description" content="${escapeHtml(article.metaDescription)}" />
  <script type="application/ld+json">${safeJsonLd}</script>
</head>
<body>
  <article>
    <h1>${escapeHtml(article.h1)}</h1>
    ${article.sections
      .map(
        (s) =>
          `<${s.level}>${escapeHtml(s.heading)}</${s.level}>\n    <p>${escapeHtml(s.body).replace(/\n+/g, '</p><p>')}</p>${
            s.visualAlt ? `\n    <figure><figcaption>${escapeHtml(s.visualCaption || s.visualAlt)}</figcaption></figure>` : ''
          }`
      )
      .join('\n    ')}
  </article>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.slug || 'seo-article'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('HTML Exported', `Saved ${article.slug}.html with embedded FAQ JSON-LD.`, 'success');
  };

  const handleExportAuditCsv = () => {
    const rows = [
      ['Title', 'Target Keyword', 'Slug', 'Status', 'CMS', 'Words', 'SEO Score', 'Readability', 'Est Monthly Traffic'].join(','),
      ...wsArticles.map((a) =>
        [
          `"${a.title.replace(/"/g, '""')}"`,
          `"${a.targetKeyword.replace(/"/g, '""')}"`,
          a.slug,
          a.status,
          a.publishedCms || '',
          a.wordCount,
          a.seoScore,
          a.readabilityScore,
          a.estimatedMonthlyTraffic,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-audit-${workspaceId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Audit Exported', `Downloaded CSV for ${wsArticles.length} SEO articles.`, 'success');
  };

  const publishedCount = wsArticles.filter((a) => a.status === 'published').length;
  const totalWords = wsArticles.reduce((s, a) => s + a.wordCount, 0);
  const avgSeoScore = wsArticles.length
    ? Math.round(wsArticles.reduce((s, a) => s + a.seoScore, 0) / wsArticles.length)
    : 0;
  const avgReadability = wsArticles.length
    ? Math.round(wsArticles.reduce((s, a) => s + a.readabilityScore, 0) / wsArticles.length)
    : 0;

  const filteredAudit = wsArticles.filter((a) => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return true;
    return a.title.toLowerCase().includes(q) || a.targetKeyword.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q);
  });

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-[#090A0D] custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#06B6D4]">
              SEO &amp; Editorial CMS · {workspaceName}
            </p>
            <h1 className="text-xl font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] mt-1">
              AI Blog &amp; SEO Engine
            </h1>
            <p className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
              Draft structured H1–H3 articles with FAQ JSON-LD schema, direct CMS dispatch, and automatic social syndication.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[12px] text-[#4B5563] dark:text-[#9CA3AF] font-mono tabular-nums mr-1">
              {wsArticles.length}/{maxArticlesQuota} articles · {aiCreditsRemaining.toLocaleString()} credits
            </span>
            {activeArticle && subTab === 'editor' && (
              <button
                type="button"
                onClick={() => setShowInspector(true)}
                className="px-3 py-1.5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <PanelRightOpen size={14} strokeWidth={1.5} /> Inspect Schema &amp; Social
              </button>
            )}
            <button
              onClick={() => setShowConnectorModal(true)}
              className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <Globe size={14} strokeWidth={1.5} /> Connect CMS
            </button>
          </div>
        </div>

        {/* Non-Blocking Plan Quota & AI Credit Banner */}
        {(wsArticles.length >= maxArticlesQuota || aiCreditsRemaining < 60) && (
          <div className="bg-orange-500/[0.06] dark:bg-orange-500/[0.08] border border-orange-500/30 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[12px]">
            <p className="text-[#111827] dark:text-[#F3F4F6] font-medium">
              {wsArticles.length >= maxArticlesQuota
                ? `Monthly SEO article quota reached (${wsArticles.length}/${maxArticlesQuota} on your current plan).`
                : `Low AI credit balance (${aiCreditsRemaining} remaining — SEO Article generation needs 60 credits).`}
            </p>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="px-3 py-1 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-md font-medium whitespace-nowrap transition-colors"
              >
                Manage Plan &amp; Quotas
              </button>
            )}
          </div>
        )}

        {/* Real Computed Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiMetricCard
            label="Published Articles"
            value={publishedCount}
            subtext={`${wsArticles.length} total drafted`}
          />
          <KpiMetricCard
            label="Total Word Volume"
            value={totalWords.toLocaleString()}
            subtext="Computed from saved articles"
          />
          <KpiMetricCard
            label="Avg On-Page SEO"
            value={`${avgSeoScore}/100`}
            subtext="Meta, H1, Schema & Links"
            accent="cyan"
          />
          <KpiMetricCard
            label="Avg Readability"
            value={`${avgReadability}/100`}
            subtext="Flesch-derived clarity"
            accent="default"
          />
        </div>

        {/* Sub-Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3">
          <div className="flex items-center gap-1 p-0.5 bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md">
            {[
              { id: 'editor' as const, label: 'Article Workspace', icon: FileText },
              { id: 'connectors' as const, label: `CMS Connectors (${wsConnectors.length})`, icon: Globe },
              { id: 'audit' as const, label: 'Content Audit', icon: BarChart3 },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id)}
                  className={`px-3 py-1.5 rounded text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    subTab === t.id
                      ? 'bg-white dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.08]'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
                  }`}
                >
                  <Icon size={13} strokeWidth={1.5} /> {t.label}
                </button>
              );
            })}
          </div>

          {wsArticles.length > 0 && subTab === 'editor' && (
            <select
              value={activeArticle?.id || ''}
              onChange={(e) => setSelectedArticleId(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] max-w-xs outline-none focus:border-[#06B6D4]"
            >
              {wsArticles.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.status.toUpperCase()}] {a.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* SUB-TAB 1: GENERATOR & ARTICLE WORKSPACE */}
        {subTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Form */}
            <form
              onSubmit={handleGenerateArticle}
              className="lg:col-span-4 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-5 space-y-4 h-fit text-[12px]"
            >
              <div>
                <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                  Keyword-to-Article Engine
                </h2>
                <p className="text-[12px] text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                  Generates H1–H3 copy, FAQ JSON-LD, internal link targets, and 4 social posts (60 credits).
                </p>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block mb-1.5">
                  Target SEO Keyword *
                </label>
                <input
                  required
                  value={targetKeyword}
                  onChange={(e) => setTargetKeyword(e.target.value)}
                  placeholder="e.g. b2b social media automation workflow"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[13px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block mb-1.5">
                  Reference URL (Optional)
                </label>
                <input
                  value={sourceUrl}
                  onChange={(e) => {
                    setSourceUrl(e.target.value);
                    if (sourceUrlError) setSourceUrlError(null);
                  }}
                  placeholder="https://example.com/benchmark-study"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-mono text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
                {sourceUrlError && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{sourceUrlError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block mb-1.5">
                    Audience
                  </label>
                  <input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block mb-1.5">
                    Voice
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  >
                    <option>Authoritative Editorial</option>
                    <option>Technical Deep-Dive</option>
                    <option>Conversational Founder</option>
                    <option>Conversion Copywriter</option>
                  </select>
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-md bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyndicate}
                  onChange={(e) => setAutoSyndicate(e.target.checked)}
                  className="mt-0.5 accent-[#06B6D4]"
                />
                <span>
                  <span className="font-medium text-[#111827] dark:text-[#F3F4F6] block">
                    Auto-Syndicate on Publish
                  </span>
                  <span className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                    Queues LinkedIn carousel, X thread, Instagram caption, and Facebook post into Visual Scheduler.
                  </span>
                </span>
              </label>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md text-[12px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-60 transition-colors"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={1.5} className="text-[#06B6D4]" />}
                {generating ? 'Drafting Long-Form Article...' : 'Generate SEO Article'}
              </button>
            </form>

            {/* Right Article Document Workspace */}
            <div className="lg:col-span-8">
              {generating ? (
                <div className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-6 space-y-5">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[#06B6D4]">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Drafting H1–H3 article, inline infographic specs, FAQ JSON-LD &amp; social syndication bundle...</span>
                  </div>
                  <div className="shimmer-block h-8 rounded w-4/5" />
                  <div className="shimmer-block h-36 rounded-lg" />
                  <div className="space-y-3">
                    <div className="shimmer-block h-4 rounded w-1/3" />
                    <div className="shimmer-block h-20 rounded-md" />
                    <div className="shimmer-block h-20 rounded-md" />
                  </div>
                </div>
              ) : !activeArticle ? (
                <EmptyStatePanel
                  icon={<FileText size={22} strokeWidth={1.5} />}
                  title="No SEO articles drafted yet"
                  description="Enter a target keyword on the left to generate a structured H1–H3 article with FAQ schema, internal links, and social syndication posts."
                />
              ) : (
                <div className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg overflow-hidden">
                  {/* Document Toolbar */}
                  <div className="px-6 py-4 bg-[#F8F9FB] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={activeArticle.status}
                        tone={activeArticle.status === 'published' ? 'emerald' : 'neutral'}
                      />
                      <span className="text-[11px] font-mono text-[#4B5563] dark:text-[#9CA3AF] tabular-nums truncate">
                        /{activeArticle.slug} · {activeArticle.wordCount} words · SEO {activeArticle.seoScore}/100 · Readability {activeArticle.readabilityScore}/100
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        disabled={publishing}
                        onClick={() => handlePublishArticle(activeArticle)}
                        className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md text-[12px] font-medium flex items-center gap-1.5 disabled:opacity-60 transition-colors"
                      >
                        {publishing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} strokeWidth={1.5} />}
                        {activeArticle.status === 'published' ? 'Republish' : 'Publish to CMS'}
                      </button>
                      <button
                        onClick={() => handleExportHtml(activeArticle)}
                        className="px-2.5 py-1.5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1 transition-colors"
                      >
                        <Download size={13} strokeWidth={1.5} /> HTML
                      </button>
                      <button
                        onClick={() => onDeleteArticle(activeArticle.id)}
                        title="Delete article"
                        className="p-1.5 text-[#6B7280] hover:text-rose-500 border border-[#E5E7EB] dark:border-white/[0.08] rounded-md transition-colors"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Clean Document Reading Column (max-w-3xl) */}
                  <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
                    {/* Flat Editorial Hero Header Card */}
                    <div className="rounded-lg overflow-hidden border border-[#E5E7EB] dark:border-white/[0.08]">
                      <div
                        className={`p-6 bg-[#0E1015] text-[#F3F4F6] border-l-[3px] flex flex-col justify-between min-h-[148px] ${
                          activeArticle.heroVisualAccent === 'orange'
                            ? 'border-l-[#F97316]'
                            : activeArticle.heroVisualAccent === 'indigo'
                            ? 'border-l-[#9CA3AF]'
                            : 'border-l-[#06B6D4]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
                          <span className="uppercase tracking-wider">
                            FEATURED HERO · {workspaceName}
                          </span>
                          <div className="flex items-center gap-1">
                            {([
                              { key: 'cyan', label: 'Cyan' },
                              { key: 'orange', label: 'Orange' },
                              { key: 'indigo', label: 'Slate' },
                            ] as const).map((accent) => (
                              <button
                                key={accent.key}
                                type="button"
                                onClick={() => onUpdateArticle({ ...activeArticle, heroVisualAccent: accent.key })}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                  activeArticle.heroVisualAccent === accent.key
                                    ? 'bg-white text-[#090A0D] font-semibold'
                                    : 'bg-white/[0.08] text-[#9CA3AF] hover:text-white'
                                }`}
                              >
                                {accent.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <h2 className="text-xl font-semibold text-white tracking-[-0.02em] leading-snug mt-4">
                          {activeArticle.h1}
                        </h2>
                        <p className="text-[11px] font-mono text-[#9CA3AF] mt-2">
                          keyword: {activeArticle.targetKeyword}
                        </p>
                      </div>
                      <div className="px-4 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border-t border-[#E5E7EB] dark:border-white/[0.08] flex items-center gap-2 text-[12px]">
                        <ImageIcon size={13} strokeWidth={1.5} className="text-[#06B6D4] shrink-0" />
                        <span className="text-[11px] font-mono text-[#6B7280] shrink-0">alt=</span>
                        <input
                          value={activeArticle.heroImageAlt}
                          onChange={(e) => onUpdateArticle({ ...activeArticle, heroImageAlt: e.target.value })}
                          className="flex-1 bg-transparent text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none"
                        />
                      </div>
                    </div>

                    {/* SERP Meta Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
                      <div>
                        <label className="text-[11px] font-mono text-[#6B7280] block mb-1">
                          Meta Title ({activeArticle.metaTitle.length} chars)
                        </label>
                        <input
                          value={activeArticle.metaTitle}
                          onChange={(e) => onUpdateArticle({ ...activeArticle, metaTitle: e.target.value })}
                          className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-[#6B7280] block mb-1">
                          Meta Description ({activeArticle.metaDescription.length} chars)
                        </label>
                        <input
                          value={activeArticle.metaDescription}
                          onChange={(e) => onUpdateArticle({ ...activeArticle, metaDescription: e.target.value })}
                          className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                        />
                      </div>
                    </div>

                    {/* Article Body Sections + Inline Infographic Embeds */}
                    <div className="space-y-5">
                      {activeArticle.sections.map((sec, idx) => (
                        <div key={idx} className="space-y-2 border-t border-[#E5E7EB] dark:border-white/[0.08] pt-5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-semibold text-[#06B6D4] uppercase">
                              {sec.level}
                            </span>
                            <h3 className="text-[15px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                              {sec.heading}
                            </h3>
                          </div>
                          <p className="text-[13.5px] text-[#374151] dark:text-[#D1D5DB] leading-[1.7] whitespace-pre-line">
                            {sec.body}
                          </p>
                          {sec.visualCaption && (
                            <div className="p-3.5 rounded-md bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                              <p className="text-[10px] font-mono uppercase tracking-wider text-[#06B6D4]">
                                Embedded {sec.visualType || 'infographic'} Visual
                              </p>
                              <p className="text-[13px] font-medium text-[#111827] dark:text-[#F3F4F6] mt-1">
                                {sec.visualCaption}
                              </p>
                              {sec.visualAlt && (
                                <p className="text-[11px] font-mono text-[#6B7280] mt-0.5">alt=&quot;{sec.visualAlt}&quot;</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Compact Footer Strip to Open Inspector or Syndicate Immediately */}
                    <div className="pt-5 border-t border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-[12px]">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activeArticle.autoSyndicateSocial}
                            onChange={(e) =>
                              onUpdateArticle({
                                ...activeArticle,
                                autoSyndicateSocial: e.target.checked,
                                updatedAt: new Date().toISOString(),
                              })
                            }
                            className="accent-[#06B6D4]"
                          />
                          <span className="font-medium text-[#111827] dark:text-[#F3F4F6]">
                            Auto-Syndicate on Publish
                          </span>
                        </label>
                        {activeArticle.syndicatedPostIds && activeArticle.syndicatedPostIds.length > 0 && (
                          <StatusBadge
                            label={`${activeArticle.syndicatedPostIds.length} queued`}
                            tone="emerald"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setInspectorSection('schema');
                            setShowInspector(true);
                          }}
                          className="px-3 py-1.5 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 transition-colors"
                        >
                          <Code2 size={13} strokeWidth={1.5} /> FAQ Schema ({activeArticle.schemaFaq.length}) &amp; Links ({activeArticle.internalLinks.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleManualSyndicate(activeArticle)}
                          className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Send size={12} strokeWidth={1.5} /> Syndicate 4 Posts Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 2: CMS CONNECTORS */}
        {subTab === 'connectors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF]">
                Configure direct publishing targets for WordPress, Webflow, Shopify, Ghost, or custom REST webhooks.
              </p>
              <button
                onClick={() => setShowConnectorModal(true)}
                className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Plus size={14} strokeWidth={1.5} /> Add CMS Endpoint
              </button>
            </div>

            {wsConnectors.length === 0 ? (
              <EmptyStatePanel
                icon={<Globe size={22} strokeWidth={1.5} />}
                title="No CMS endpoints connected yet"
                description="Connect WordPress, Webflow, Shopify, Ghost, or a custom REST webhook for 1-click publishing."
                actionLabel="Connect CMS Endpoint"
                onAction={() => setShowConnectorModal(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {wsConnectors.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-4 space-y-3 text-[12px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#111827] dark:text-[#F3F4F6]">{c.label}</p>
                        <p className="text-[11px] font-mono text-[#06B6D4] mt-0.5">{PROVIDER_LABELS[c.provider]}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge label={c.status} tone={c.status === 'connected' ? 'emerald' : 'neutral'} />
                        <button
                          onClick={() => onDeleteConnector(c.id)}
                          className="text-[#6B7280] hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                    <p className="font-mono text-[11px] text-[#4B5563] dark:text-[#9CA3AF] truncate">{c.endpointUrl}</p>
                    <div className="flex items-center justify-between pt-2.5 border-t border-[#E5E7EB] dark:border-white/[0.08] text-[11px]">
                      <span className="text-[#6B7280] font-mono">
                        {c.lastPublishedAt
                          ? `Pushed ${new Date(c.lastPublishedAt).toLocaleDateString()}`
                          : 'Never pushed'}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateConnector({
                            ...c,
                            status: c.status === 'connected' ? 'disconnected' : 'connected',
                          })
                        }
                        className="font-medium text-[#06B6D4] hover:underline"
                      >
                        {c.status === 'connected' ? 'Pause' : 'Reconnect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 3: CONTENT AUDIT & RANK TRACKER */}
        {subTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <input
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Filter articles by title, keyword, or slug..."
                className="w-full sm:w-80 px-3 py-1.5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
              />
              <button
                onClick={handleExportAuditCsv}
                className="px-3 py-1.5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 transition-colors"
              >
                <Download size={13} strokeWidth={1.5} /> Export Audit CSV
              </button>
            </div>

            <div className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead className="sticky top-0 bg-[#F8F9FB] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08]">
                  <tr className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
                    <th className="py-2.5 px-4 font-medium">Article &amp; Keyword</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium text-right">Words</th>
                    <th className="py-2.5 px-4 font-medium text-right">SEO</th>
                    <th className="py-2.5 px-4 font-medium text-right">Readability</th>
                    <th className="py-2.5 px-4 font-medium text-right">Est. Monthly Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.06] tabular-nums">
                  {filteredAudit.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#6B7280]">
                        No SEO articles recorded in this workspace yet.
                      </td>
                    </tr>
                  ) : (
                    filteredAudit.map((art) => (
                      <tr key={art.id} className="h-12 hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] transition-colors">
                        <td className="py-2.5 px-4">
                          <button
                            onClick={() => {
                              setSelectedArticleId(art.id);
                              setSubTab('editor');
                            }}
                            className="font-medium text-[#111827] dark:text-[#F3F4F6] hover:text-[#06B6D4] text-left transition-colors"
                          >
                            {art.title}
                          </button>
                          <p className="text-[11px] font-mono text-[#6B7280]">
                            {art.targetKeyword} · /{art.slug}
                          </p>
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusBadge
                            label={art.publishedCms ? `${art.status} · ${art.publishedCms}` : art.status}
                            tone={art.status === 'published' ? 'emerald' : 'neutral'}
                          />
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-[#111827] dark:text-[#F3F4F6]">
                          {art.wordCount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-[#06B6D4] font-semibold">
                          {art.seoScore}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-[#4B5563] dark:text-[#9CA3AF]">
                          {art.readabilityScore}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <input
                            type="number"
                            min={0}
                            value={art.estimatedMonthlyTraffic}
                            onChange={(e) =>
                              onUpdateArticle({
                                ...art,
                                estimatedMonthlyTraffic: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-24 text-right px-2 py-1 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded font-mono text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 480px Slide-Over SEO Schema, Internal Links & Syndication Inspector Drawer */}
      <InspectorDrawer
        open={showInspector && Boolean(activeArticle)}
        onClose={() => setShowInspector(false)}
        title="SEO Schema & Syndication Inspector"
        subtitle={activeArticle ? `/${activeArticle.slug}` : undefined}
        footer={
          activeArticle ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => copyText('faq', buildFaqJsonLd(activeArticle), 'FAQ JSON-LD Schema')}
                className="px-3 py-1.5 border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5"
              >
                {copiedKey === 'faq' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                Copy JSON-LD
              </button>
              <button
                type="button"
                onClick={() => handleManualSyndicate(activeArticle)}
                className="px-3.5 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md text-[12px] font-medium flex items-center gap-1.5"
              >
                <Send size={12} strokeWidth={1.5} /> Push 4 Social Posts
              </button>
            </div>
          ) : undefined
        }
      >
        {activeArticle && (
          <div className="space-y-4 text-[12px]">
            {/* Drawer Segmented Switch */}
            <div className="flex items-center gap-1 p-0.5 bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md">
              {[
                { id: 'seo' as const, label: `Internal Links (${activeArticle.internalLinks.length})` },
                { id: 'schema' as const, label: `FAQ Schema (${activeArticle.schemaFaq.length})` },
                { id: 'social' as const, label: 'Social Bundle (4)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInspectorSection(tab.id)}
                  className={`flex-1 py-1.5 px-2 rounded text-[11px] font-medium transition-colors ${
                    inspectorSection === tab.id
                      ? 'bg-white dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.08]'
                      : 'text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {inspectorSection === 'seo' && (
              <div className="space-y-2.5">
                <p className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                  <Link2 size={13} strokeWidth={1.5} className="text-[#06B6D4]" /> Recommended Internal Links
                </p>
                {activeArticle.internalLinks.map((lnk, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-md bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]"
                  >
                    <p className="font-medium text-[#111827] dark:text-[#F3F4F6]">
                      &quot;{lnk.anchor}&quot; → <span className="font-mono text-[#06B6D4]">{lnk.suggestedSlug}</span>
                    </p>
                    <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">{lnk.rationale}</p>
                  </div>
                ))}
              </div>
            )}

            {inspectorSection === 'schema' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {activeArticle.schemaFaq.map((f, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-md bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]"
                    >
                      <p className="font-medium text-[#111827] dark:text-[#F3F4F6]">{f.question}</p>
                      <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">{f.answer}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] mb-1.5">
                    Raw FAQPage JSON-LD
                  </p>
                  <pre className="p-3 rounded-md bg-[#0E1015] border border-white/[0.08] text-[11px] font-mono text-[#9CA3AF] overflow-x-auto max-h-56 custom-scrollbar">
                    {buildFaqJsonLd(activeArticle)}
                  </pre>
                </div>
              </div>
            )}

            {inspectorSection === 'social' && (
              <div className="space-y-2.5">
                {activeArticle.socialBundle ? (
                  [
                    { label: 'LinkedIn Carousel Outline', text: activeArticle.socialBundle.linkedinCarousel },
                    { label: 'X Thread', text: activeArticle.socialBundle.xThread },
                    { label: 'Instagram Caption', text: activeArticle.socialBundle.instagramCaption },
                    { label: 'Facebook Post', text: activeArticle.socialBundle.facebookPost },
                  ].map((ch) => (
                    <div
                      key={ch.label}
                      className="p-3 rounded-md bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-[#06B6D4]">
                          {ch.label}
                        </p>
                        <button
                          type="button"
                          onClick={() => copyText(ch.label, ch.text, ch.label)}
                          className="text-[11px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
                        >
                          {copiedKey === ch.label ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-[12px] text-[#374151] dark:text-[#D1D5DB] whitespace-pre-line leading-relaxed">
                        {ch.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[#6B7280]">No social bundle generated for this article.</p>
                )}
              </div>
            )}
          </div>
        )}
      </InspectorDrawer>

      {/* Add CMS Connector Modal */}
      {showConnectorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConnectorModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="text-[15px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                Connect Publishing CMS
              </h3>
              <button onClick={() => setShowConnectorModal(false)} className="text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleAddConnector} className="mt-4 space-y-3.5 text-[12px]">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                  CMS Platform
                </label>
                <select
                  value={connectorForm.provider}
                  onChange={(e) => setConnectorForm({ ...connectorForm, provider: e.target.value as CmsProvider })}
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                >
                  {(Object.keys(PROVIDER_LABELS) as CmsProvider[]).map((k) => (
                    <option key={k} value={k}>
                      {PROVIDER_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                  Connection Name
                </label>
                <input
                  required
                  value={connectorForm.label}
                  onChange={(e) => setConnectorForm({ ...connectorForm, label: e.target.value })}
                  placeholder="e.g. Company Production Blog"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                  REST / Webhook Endpoint URL
                </label>
                <input
                  required
                  value={connectorForm.endpointUrl}
                  onChange={(e) => {
                    setConnectorForm({ ...connectorForm, endpointUrl: e.target.value });
                    if (connectorUrlError) setConnectorUrlError(null);
                  }}
                  placeholder="https://yourdomain.com/wp-json/wp/v2/posts"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
                {connectorUrlError && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{connectorUrlError}</p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectorModal(false)}
                  className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-medium text-[#4B5563] dark:text-[#9CA3AF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md font-medium transition-colors"
                >
                  Save CMS Connector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
