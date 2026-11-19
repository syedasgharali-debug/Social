import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Radar,
  Repeat2,
  Flame,
  TrendingUp,
  Link2,
  Calculator,
  Loader2,
  Copy,
  Check,
  PenSquare,
  Calendar,
  ExternalLink,
  Download,
  Trash2,
  Plus,
  Search,
  AlertCircle,
  Globe,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { Platform, SocialPost } from '../../types';
import {
  aiService,
  CompetitorIntelResult,
  RepurposeUrlResult,
  ViralityAuditResult,
  LiveTrendsResult,
} from '../../services/aiService';
import { PLATFORM_META, PlatformTag } from '../common/PlatformMeta';
import { ComposerPreset } from '../studio/ContentStudio';

export type GrowthToolTab = 'competitor' | 'repurposer' | 'hooks' | 'trends' | 'utm' | 'roi';

interface GrowthToolsSuiteProps {
  workspaceId: string;
  workspaceName: string;
  workspaceIndustry: string;
  initialTool?: GrowthToolTab;
  defaultCategoryId?: string;
  onOpenInStudio: (preset: ComposerPreset) => void;
  onSchedulePosts: (posts: SocialPost[]) => void;
  onToast: (title: string, description?: string, variant?: 'success' | 'info' | 'warning') => void;
}

interface SavedUtmLink {
  id: string;
  label: string;
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  fullUrl: string;
  createdAt: string;
}

const TOOL_TABS: {
  id: GrowthToolTab;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: 'competitor', label: 'Competitor Spy', shortDesc: 'Live web & gap analysis', icon: Radar },
  { id: 'repurposer', label: 'URL Repurposer', shortDesc: '1 link to 5 channels', icon: Repeat2 },
  { id: 'hooks', label: 'Viral Hook Lab', shortDesc: 'Copy audit & A/B hooks', icon: Flame },
  { id: 'trends', label: 'Trend Radar', shortDesc: 'Live Google Search pulse', icon: TrendingUp },
  { id: 'utm', label: 'UTM & QR Studio', shortDesc: 'Tracked links & QR PNG/SVG', icon: Link2 },
  { id: 'roi', label: 'ROI & ROAS Calc', shortDesc: 'Paid, ER & creator pricing', icon: Calculator },
];

function csvEscape(val: unknown): string {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildUtmUrl(params: {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
}): string {
  const trimmed = params.baseUrl.trim();
  if (!trimmed) return '';
  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(normalized);
    if (params.source.trim()) u.searchParams.set('utm_source', params.source.trim().toLowerCase().replace(/\s+/g, '_'));
    if (params.medium.trim()) u.searchParams.set('utm_medium', params.medium.trim().toLowerCase().replace(/\s+/g, '_'));
    if (params.campaign.trim()) u.searchParams.set('utm_campaign', params.campaign.trim().toLowerCase().replace(/\s+/g, '_'));
    if (params.content?.trim()) u.searchParams.set('utm_content', params.content.trim().toLowerCase().replace(/\s+/g, '_'));
    if (params.term?.trim()) u.searchParams.set('utm_term', params.term.trim().toLowerCase().replace(/\s+/g, '_'));
    return u.toString();
  } catch {
    return '';
  }
}

export function GrowthToolsSuite({
  workspaceId,
  workspaceName,
  workspaceIndustry,
  initialTool = 'competitor',
  defaultCategoryId,
  onOpenInStudio,
  onSchedulePosts,
  onToast,
}: GrowthToolsSuiteProps) {
  const [activeTool, setActiveTool] = useState<GrowthToolTab>(initialTool);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTool(initialTool);
  }, [initialTool]);

  const copyText = async (id: string, text: string, toastLabel = 'Copied to Clipboard') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      onToast(toastLabel, 'Ready to paste anywhere.');
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      onToast('Copy Failed', 'Browser blocked clipboard access.', 'warning');
    }
  };

  const scheduleSinglePost = (content: string, platforms: Platform[], firstComment?: string) => {
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(10, 0, 0, 0);
    const post: SocialPost = {
      id: `p-tool-${Date.now()}`,
      workspaceId,
      categoryId: defaultCategoryId,
      platforms,
      content,
      firstComment,
      status: 'scheduled',
      isEvergreen: true,
      scheduledAt: tomorrow.toISOString(),
    };
    onSchedulePosts([post]);
    onToast('Scheduled to Calendar', `Queued for ${tomorrow.toLocaleDateString()} on ${platforms.map((p) => PLATFORM_META[p].label).join(', ')}.`);
  };

  // =========================================================================
  // Tool 1: Competitor Spy & Gap Analyzer
  // =========================================================================
  const [compInput, setCompInput] = useState('buffer.com');
  const [compBrand, setCompBrand] = useState(workspaceName);
  const [compNiche, setCompNiche] = useState(workspaceIndustry || 'B2B SaaS & Social Growth');
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const [compResult, setCompResult] = useState<{ isLive: boolean; data: CompetitorIntelResult } | null>(null);

  useEffect(() => {
    setCompBrand(workspaceName);
    if (workspaceIndustry) setCompNiche(workspaceIndustry);
  }, [workspaceName, workspaceIndustry]);

  const handleRunCompetitorSpy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compInput.trim()) return;
    setCompLoading(true);
    setCompError(null);
    try {
      const result = await aiService.analyzeCompetitor({
        yourBrand: compBrand.trim() || workspaceName,
        competitor: compInput.trim(),
        niche: compNiche.trim() || workspaceIndustry,
      });
      setCompResult(result);
      onToast(
        'Competitor Intelligence Ready',
        `Analyzed ${result.data.competitorName} with ${result.data.counterPosts.length} counter-posts.`
      );
    } catch (err) {
      setCompError(err instanceof Error ? err.message : 'Competitor analysis failed.');
    } finally {
      setCompLoading(false);
    }
  };

  // =========================================================================
  // Tool 2: URL / Article -> Omnichannel Repurposer
  // =========================================================================
  const [repUrl, setRepUrl] = useState('');
  const [repRawText, setRepRawText] = useState('');
  const [repTone, setRepTone] = useState('Authoritative & Crisp');
  const [repCta, setRepCta] = useState('Invite comments and inbound DMs');
  const [repLoading, setRepLoading] = useState(false);
  const [repError, setRepError] = useState<string | null>(null);
  const [repResult, setRepResult] = useState<{ isLive: boolean; data: RepurposeUrlResult } | null>(null);
  const [repChannelView, setRepChannelView] = useState<'linkedin' | 'x' | 'instagram' | 'tiktok' | 'newsletter'>('linkedin');

  const handleRunRepurpose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repUrl.trim() && repRawText.trim().length < 25) {
      setRepError('Enter a public URL or paste at least 25 characters of article/transcript text.');
      return;
    }
    setRepLoading(true);
    setRepError(null);
    try {
      const result = await aiService.repurposeFromUrlOrText({
        url: repUrl.trim() || undefined,
        rawText: repRawText.trim() || undefined,
        tone: repTone,
        ctaGoal: repCta,
      });
      setRepResult(result);
      setRepChannelView('linkedin');
      onToast('Repurposing Pack Generated', `Extracted 5 channel-native assets from "${result.data.sourceTitle}".`);
    } catch (err) {
      setRepError(err instanceof Error ? err.message : 'Repurposing failed.');
    } finally {
      setRepLoading(false);
    }
  };

  const handleScheduleFullRepurposePack = () => {
    if (!repResult) return;
    const d = repResult.data;
    const hashtagsLine = d.hashtags.join(' ');
    const baseMs = Date.now() + 86400000;
    const batch: SocialPost[] = [
      {
        id: `p-rep-li-${Date.now()}`,
        workspaceId,
        categoryId: defaultCategoryId,
        platforms: ['linkedin'],
        content: d.linkedinPost,
        firstComment: hashtagsLine,
        status: 'scheduled',
        isEvergreen: true,
        scheduledAt: new Date(baseMs).toISOString(),
      },
      {
        id: `p-rep-x-${Date.now() + 1}`,
        workspaceId,
        categoryId: defaultCategoryId,
        platforms: ['x'],
        content: d.xThread.join('\n\n'),
        status: 'scheduled',
        isEvergreen: true,
        scheduledAt: new Date(baseMs + 86400000).toISOString(),
      },
      {
        id: `p-rep-ig-${Date.now() + 2}`,
        workspaceId,
        categoryId: defaultCategoryId,
        platforms: ['instagram'],
        content: `${d.instagramCarousel.caption}\n\n${d.instagramCarousel.slides.map((s) => `Slide ${s.slideNumber}: ${s.headline}`).join('\n')}`,
        firstComment: hashtagsLine,
        status: 'scheduled',
        isEvergreen: true,
        scheduledAt: new Date(baseMs + 2 * 86400000).toISOString(),
      },
      {
        id: `p-rep-tt-${Date.now() + 3}`,
        workspaceId,
        categoryId: defaultCategoryId,
        platforms: ['tiktok'],
        content: `[HOOK] ${d.tiktokScript.hook}\n\n[BODY] ${d.tiktokScript.body}\n\n[CTA] ${d.tiktokScript.cta}`,
        firstComment: hashtagsLine,
        status: 'scheduled',
        isEvergreen: false,
        scheduledAt: new Date(baseMs + 3 * 86400000).toISOString(),
      },
    ];
    onSchedulePosts(batch);
    onToast('4-Day Campaign Scheduled', 'Added LinkedIn, X Thread, Instagram Carousel & TikTok script to your calendar.');
  };

  // =========================================================================
  // Tool 3: Viral Hook Lab & Post Grader
  // =========================================================================
  const [hookDraft, setHookDraft] = useState(
    'We spent 6 months posting every day without a CRM connected to our social inbox.\n\nWe got plenty of likes, but almost zero visibility into which posts actually drove sales calls. Once we started tracking DMs and comments straight into our pipeline, 34% of our new monthly revenue came directly from organic posts.\n\nHow are you tracking revenue from your social channels right now?'
  );
  const [hookPlatform, setHookPlatform] = useState<Platform>('linkedin');
  const [hookAudience, setHookAudience] = useState('SaaS Founders & Marketing Leaders');
  const [hookLoading, setHookLoading] = useState(false);
  const [hookError, setHookError] = useState<string | null>(null);
  const [hookResult, setHookResult] = useState<{ isLive: boolean; data: ViralityAuditResult } | null>(null);

  const liveDraftTelemetry = useMemo(() => {
    const trimmed = hookDraft.trim();
    const lines = trimmed ? trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean) : [];
    const firstLine = lines[0] || '';
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
    const limits: Partial<Record<Platform, number>> = {
      x: 280,
      threads: 500,
      linkedin: 3000,
      instagram: 2200,
      tiktok: 2200,
    };
    const limit = limits[hookPlatform] || 2200;
    return {
      chars: trimmed.length,
      limit,
      overLimit: trimmed.length > limit,
      words,
      lines: lines.length,
      hookChars: firstLine.length,
      hasQuestion: /\?/.test(trimmed),
      hasNumbers: /\d/.test(trimmed),
    };
  }, [hookDraft, hookPlatform]);

  const handleRunViralityAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hookDraft.trim().length < 15) {
      setHookError('Paste at least 15 characters of draft copy to audit.');
      return;
    }
    setHookLoading(true);
    setHookError(null);
    try {
      const result = await aiService.auditPostVirality({
        content: hookDraft.trim(),
        platform: hookPlatform,
        audience: hookAudience.trim() || 'B2B Buyers',
      });
      setHookResult(result);
      onToast('Copy Audit Complete', `Scored ${result.data.overallScore}/100 with 5 A/B hook rewrites.`);
    } catch (err) {
      setHookError(err instanceof Error ? err.message : 'Virality audit failed.');
    } finally {
      setHookLoading(false);
    }
  };

  // =========================================================================
  // Tool 4: Live Trend & Newsjacking Radar
  // =========================================================================
  const [trendNiche, setTrendNiche] = useState(workspaceIndustry || 'AI & Social Media Marketing');
  const [trendRegion, setTrendRegion] = useState('Global');
  const [trendAudience, setTrendAudience] = useState('Founders, Agencies & Growth Teams');
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [trendResult, setTrendResult] = useState<{ isLive: boolean; data: LiveTrendsResult } | null>(null);

  const runTrendScan = async (overrideNiche?: string) => {
    const queryNiche = (overrideNiche ?? trendNiche).trim();
    if (!queryNiche) return;
    if (overrideNiche) setTrendNiche(overrideNiche);
    setTrendLoading(true);
    setTrendError(null);
    try {
      const result = await aiService.discoverLiveTrends({
        niche: queryNiche,
        region: trendRegion,
        audience: trendAudience.trim() || 'Marketing Leaders',
      });
      setTrendResult(result);
      onToast('Live Trend Radar Updated', `Found ${result.data.trends.length} timely newsjacking angles for "${queryNiche}".`);
    } catch (err) {
      setTrendError(err instanceof Error ? err.message : 'Trend scan failed.');
    } finally {
      setTrendLoading(false);
    }
  };

  // =========================================================================
  // Tool 5: UTM Campaign Link Builder & Scannable QR Studio
  // =========================================================================
  const utmStorageKey = `socialifyai_utm_links_${workspaceId}`;
  const [utmBaseUrl, setUtmBaseUrl] = useState('https://www.socialifyai.com/pricing');
  const [utmLabel, setUtmLabel] = useState('Q4 LinkedIn Launch Link');
  const [utmSource, setUtmSource] = useState('linkedin');
  const [utmMedium, setUtmMedium] = useState('organic_social');
  const [utmCampaign, setUtmCampaign] = useState('q4_product_launch');
  const [utmContent, setUtmContent] = useState('carousel_cta');
  const [utmTerm, setUtmTerm] = useState('');
  const [qrColor, setQrColor] = useState('#0F172A');
  const [qrPngDataUrl, setQrPngDataUrl] = useState<string>('');
  const [qrSvgMarkup, setQrSvgMarkup] = useState<string>('');
  const [utmSearch, setUtmSearch] = useState('');
  const [savedLinks, setSavedLinks] = useState<SavedUtmLink[]>(() => {
    try {
      const raw = localStorage.getItem(utmStorageKey);
      return raw ? (JSON.parse(raw) as SavedUtmLink[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(utmStorageKey);
      setSavedLinks(raw ? (JSON.parse(raw) as SavedUtmLink[]) : []);
    } catch {
      setSavedLinks([]);
    }
  }, [utmStorageKey]);

  const builtUtmUrl = useMemo(
    () =>
      buildUtmUrl({
        baseUrl: utmBaseUrl,
        source: utmSource,
        medium: utmMedium,
        campaign: utmCampaign,
        content: utmContent,
        term: utmTerm,
      }),
    [utmBaseUrl, utmSource, utmMedium, utmCampaign, utmContent, utmTerm]
  );

  useEffect(() => {
    let cancelled = false;
    if (!builtUtmUrl) {
      setQrPngDataUrl('');
      setQrSvgMarkup('');
      return;
    }
    Promise.all([
      QRCode.toDataURL(builtUtmUrl, {
        width: 512,
        margin: 2,
        color: { dark: qrColor, light: '#FFFFFF' },
      }),
      QRCode.toString(builtUtmUrl, {
        type: 'svg',
        margin: 2,
        color: { dark: qrColor, light: '#FFFFFF' },
      }),
    ])
      .then(([pngUrl, svgStr]) => {
        if (!cancelled) {
          setQrPngDataUrl(pngUrl);
          setQrSvgMarkup(svgStr);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrPngDataUrl('');
          setQrSvgMarkup('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [builtUtmUrl, qrColor]);

  const persistLinks = (next: SavedUtmLink[]) => {
    setSavedLinks(next);
    try {
      localStorage.setItem(utmStorageKey, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  };

  const handleSaveUtmLink = () => {
    if (!builtUtmUrl) {
      onToast('Invalid URL', 'Enter a valid destination URL first.', 'warning');
      return;
    }
    const entry: SavedUtmLink = {
      id: `utm-${Date.now()}`,
      label: utmLabel.trim() || `${utmSource || 'campaign'} link`,
      baseUrl: utmBaseUrl.trim(),
      source: utmSource.trim(),
      medium: utmMedium.trim(),
      campaign: utmCampaign.trim(),
      content: utmContent.trim() || undefined,
      term: utmTerm.trim() || undefined,
      fullUrl: builtUtmUrl,
      createdAt: new Date().toISOString(),
    };
    persistLinks([entry, ...savedLinks]);
    onToast('Tracked Link Saved', `Added "${entry.label}" to your workspace UTM library.`);
  };

  const handleDownloadQrPng = () => {
    if (!qrPngDataUrl) return;
    const a = document.createElement('a');
    a.href = qrPngDataUrl;
    a.download = `${(utmCampaign || 'socialifyai-qr').replace(/[^a-z0-9-_]/gi, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onToast('QR Code Downloaded', 'Saved 512×512 PNG ready for print or slides.');
  };

  const handleDownloadQrSvg = () => {
    if (!qrSvgMarkup) return;
    const blob = new Blob([qrSvgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(utmCampaign || 'socialifyai-qr').replace(/[^a-z0-9-_]/gi, '_')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast('Vector QR Downloaded', 'Saved lossless SVG file.');
  };

  const handleExportUtmCsv = () => {
    if (savedLinks.length === 0) return;
    const header = ['Label', 'Source', 'Medium', 'Campaign', 'Content', 'Term', 'Full Tracked URL', 'Created At'];
    const rows = savedLinks.map((l) => [
      l.label,
      l.source,
      l.medium,
      l.campaign,
      l.content || '',
      l.term || '',
      l.fullUrl,
      l.createdAt,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `socialifyai-utm-links-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast('UTM Library Exported', `Downloaded ${savedLinks.length} tracked links as CSV.`);
  };

  const filteredUtmLinks = useMemo(() => {
    const q = utmSearch.trim().toLowerCase();
    if (!q) return savedLinks;
    return savedLinks.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.campaign.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q) ||
        l.fullUrl.toLowerCase().includes(q)
    );
  }, [savedLinks, utmSearch]);

  // =========================================================================
  // Tool 6: Social ROI, Ad ROAS & Creator Rate Calculator
  // =========================================================================
  const [calcTab, setCalcTab] = useState<'roas' | 'engagement' | 'creator'>('roas');

  // Paid ROAS state
  const [adSpend, setAdSpend] = useState(5000);
  const [cpc, setCpc] = useState(1.65);
  const [cvrPct, setCvrPct] = useState(3.4);
  const [aov, setAov] = useState(240);
  const [marginPct, setMarginPct] = useState(65);

  const roasMetrics = useMemo(() => {
    const clicks = cpc > 0 ? Math.round(adSpend / cpc) : 0;
    const conversions = clicks * (cvrPct / 100);
    const revenue = conversions * aov;
    const roas = adSpend > 0 ? revenue / adSpend : 0;
    const cpa = conversions > 0 ? adSpend / conversions : 0;
    const breakEvenRoas = marginPct > 0 ? 100 / marginPct : 0;
    const breakEvenCpa = aov * (marginPct / 100);
    const grossProfit = revenue * (marginPct / 100);
    const netProfit = grossProfit - adSpend;
    return { clicks, conversions, revenue, roas, cpa, breakEvenRoas, breakEvenCpa, netProfit };
  }, [adSpend, cpc, cvrPct, aov, marginPct]);

  // Engagement Rate state
  const [erFollowers, setErFollowers] = useState(18500);
  const [erReach, setErReach] = useState(12400);
  const [erLikes, setErLikes] = useState(490);
  const [erComments, setErComments] = useState(64);
  const [erShares, setErShares] = useState(82);
  const [erSaves, setErSaves] = useState(145);

  const erMetrics = useMemo(() => {
    const totalEng = erLikes + erComments + erShares + erSaves;
    const erByFollowers = erFollowers > 0 ? (totalEng / erFollowers) * 100 : 0;
    const erByReach = erReach > 0 ? (totalEng / erReach) * 100 : 0;
    const viralityRatio = totalEng > 0 ? ((erShares + erSaves) / totalEng) * 100 : 0;
    const verdict =
      erByReach >= 6
        ? 'Top 10% Breakout Performance'
        : erByReach >= 3.5
        ? 'Strong Above-Average Reach Health'
        : erByReach >= 1.8
        ? 'Healthy Industry Baseline'
        : 'Needs Stronger Hook or Save CTA';
    return { totalEng, erByFollowers, erByReach, viralityRatio, verdict };
  }, [erFollowers, erReach, erLikes, erComments, erShares, erSaves]);

  // Creator Rate state
  const [creatorViews, setCreatorViews] = useState(45000);
  const [creatorCpm, setCreatorCpm] = useState(32);
  const [creatorUsageRights, setCreatorUsageRights] = useState(true);
  const [creatorExclusivity, setCreatorExclusivity] = useState(false);

  const creatorMetrics = useMemo(() => {
    const base = (creatorViews / 1000) * creatorCpm;
    const multiplier = 1 + (creatorUsageRights ? 0.35 : 0) + (creatorExclusivity ? 0.25 : 0);
    const target = Math.round(base * multiplier);
    const low = Math.round(target * 0.8);
    const high = Math.round(target * 1.25);
    const effCpm = creatorViews > 0 ? target / (creatorViews / 1000) : 0;
    return { target, low, high, effCpm };
  }, [creatorViews, creatorCpm, creatorUsageRights, creatorExclusivity]);

  const handleCopyCalculatorSummary = () => {
    let summary = '';
    if (calcTab === 'roas') {
      summary = `Paid Social ROAS Forecast (${workspaceName})\n• Monthly Spend: $${adSpend.toLocaleString()} | CPC: $${cpc.toFixed(2)} | CVR: ${cvrPct}% | AOV: $${aov}\n• Est. Clicks: ${roasMetrics.clicks.toLocaleString()} | Est. Conversions: ${roasMetrics.conversions.toFixed(1)}\n• Est. Revenue: $${Math.round(roasMetrics.revenue).toLocaleString()} | Blended ROAS: ${roasMetrics.roas.toFixed(2)}x (Break-even: ${roasMetrics.breakEvenRoas.toFixed(2)}x)\n• Actual CPA: $${roasMetrics.cpa.toFixed(2)} (Break-even CPA: $${roasMetrics.breakEvenCpa.toFixed(2)})\n• Projected Net Profit: ${roasMetrics.netProfit >= 0 ? '+' : '-'}$${Math.abs(Math.round(roasMetrics.netProfit)).toLocaleString()}`;
    } else if (calcTab === 'engagement') {
      summary = `Engagement Rate Audit (${workspaceName})\n• Total Engagements: ${erMetrics.totalEng.toLocaleString()} (Likes ${erLikes}, Comments ${erComments}, Shares ${erShares}, Saves ${erSaves})\n• ER by Reach: ${erMetrics.erByReach.toFixed(2)}% | ER by Followers: ${erMetrics.erByFollowers.toFixed(2)}%\n• Save + Share Amplification: ${erMetrics.viralityRatio.toFixed(1)}%\n• Verdict: ${erMetrics.verdict}`;
    } else {
      summary = `Creator Sponsorship Valuation (${workspaceName})\n• Avg Views: ${creatorViews.toLocaleString()} | Base CPM: $${creatorCpm}\n• Add-ons: ${creatorUsageRights ? 'Paid Whitelisting (+35%)' : 'Organic Only'}${creatorExclusivity ? ' · 30d Exclusivity (+25%)' : ''}\n• Fair Deal Target: $${creatorMetrics.target.toLocaleString()} (Range: $${creatorMetrics.low.toLocaleString()} – $${creatorMetrics.high.toLocaleString()})\n• Effective CPM: $${creatorMetrics.effCpm.toFixed(2)}`;
    }
    copyText('calc-summary', summary, 'Client Summary Copied');
  };

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <p className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400">
              {workspaceName} · Growth Intelligence Toolkit
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Competitive Growth Tools
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Research competitors with live web search, repurpose any article URL across 5 channels, grade post hooks, track live trends, generate scannable QR UTM links, and forecast real ad ROAS.
            </p>
          </div>
        </div>

        {/* Segmented Tool Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {TOOL_TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTool(t.id)}
                className={`text-left px-3.5 py-3 rounded-xl border transition-colors ${
                  active
                    ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#4F46E5]/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={15} className={active ? 'text-white' : 'text-[#4F46E5] dark:text-indigo-400'} />
                  <span className="text-xs font-bold whitespace-nowrap truncate">{t.label}</span>
                </div>
                <p className={`mt-1 text-[11px] truncate ${active ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {t.shortDesc}
                </p>
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* TOOL 1: COMPETITOR SPY & GAP ANALYZER                             */}
        {/* ================================================================= */}
        {activeTool === 'competitor' && (
          <div className="space-y-6">
            <form
              onSubmit={handleRunCompetitorSpy}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Competitor Spy & Content Gap Analyzer
                  </h2>
                  <p className="text-xs text-slate-500">
                    Scrapes the competitor&apos;s live page and runs Google Search research to uncover messaging gaps and counter-positioning posts.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Competitor Name or Website URL
                  </label>
                  <input
                    required
                    value={compInput}
                    onChange={(e) => setCompInput(e.target.value)}
                    placeholder="e.g. buffer.com, hootsuite.com, or brand name"
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Your Brand Name
                  </label>
                  <input
                    value={compBrand}
                    onChange={(e) => setCompBrand(e.target.value)}
                    placeholder="Your brand or client name"
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Market Niche
                  </label>
                  <input
                    value={compNiche}
                    onChange={(e) => setCompNiche(e.target.value)}
                    placeholder="e.g. B2B SaaS, D2C Skincare, Agency"
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              {compError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{compError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Quick targets:</span>
                  {['buffer.com', 'hootsuite.com', 'sproutsocial.com', 'later.com'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCompInput(preset)}
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#4F46E5] dark:hover:text-indigo-400 underline underline-offset-2"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={compLoading}
                  className="px-5 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  {compLoading ? <Loader2 size={14} className="animate-spin" /> : <Radar size={14} />}
                  {compLoading ? 'Scanning Live Web & Gaps...' : 'Analyze Competitor'}
                </button>
              </div>
            </form>

            {compResult && (
              <div className="space-y-6">
                {/* Summary Banner */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Target Analyzed · {compResult.isLive ? 'Live Web & Search Grounded' : 'Structured Baseline'}
                      </p>
                      <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                        {compResult.data.competitorName}
                      </h3>
                    </div>
                    {compResult.data.scrapedPage && (
                      <a
                        href={compResult.data.scrapedPage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Globe size={13} /> Live Site Scraped <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {compResult.data.positioningSummary}
                  </p>

                  {/* Strengths vs Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2.5">
                        Where They Are Strong
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        {compResult.data.strengths.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="font-mono text-slate-400 tabular-nums">{idx + 1}.</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-2.5">
                        Weaknesses & Blind Spots You Can Exploit
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        {compResult.data.weaknesses.map((w, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="font-mono text-rose-500 tabular-nums">{idx + 1}.</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Content Gaps Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      Untapped Content Gaps to Own
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {compResult.data.contentGaps.map((gap, idx) => (
                      <div key={idx} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{gap.topic}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {gap.whyItWins} · Recommended: <span className="font-semibold text-slate-700 dark:text-slate-200">{gap.recommendedFormat}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenInStudio({
                              topic: `${gap.topic}\n\n${gap.whyItWins}`,
                              categoryId: defaultCategoryId,
                              evergreen: true,
                            })
                          }
                          className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <PenSquare size={13} /> Draft in Studio
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ready-to-Publish Counter Posts */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      Ready-to-Publish Counter-Positioning Posts
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {compResult.data.counterPosts.map((post, idx) => (
                      <div key={idx} className="p-6 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 text-xs">
                            <PlatformTag platform={post.platform} />
                            <span className="text-slate-400">·</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{post.angle}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyText(`cp-${idx}`, post.content)}
                              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-[#4F46E5] flex items-center gap-1.5"
                            >
                              {copiedId === `cp-${idx}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onOpenInStudio({
                                  topic: post.content,
                                  platforms: [post.platform],
                                  categoryId: defaultCategoryId,
                                  evergreen: true,
                                })
                              }
                              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#4F46E5] flex items-center gap-1.5"
                            >
                              <PenSquare size={13} /> Open in Studio
                            </button>
                            <button
                              type="button"
                              onClick={() => scheduleSinglePost(post.content, [post.platform])}
                              className="px-3 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                            >
                              <Calendar size={13} /> Schedule
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                          {post.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grounded Citations */}
                {compResult.data.sources.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2.5">
                      Verified Research Sources
                    </h4>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                      {compResult.data.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#4F46E5] dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span className="truncate max-w-[260px]">{src.title}</span>
                          <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TOOL 2: URL / ARTICLE -> OMNICHANNEL REPURPOSER                   */}
        {/* ================================================================= */}
        {activeTool === 'repurposer' && (
          <div className="space-y-6">
            <form
              onSubmit={handleRunRepurpose}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
            >
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  URL & Long-Form to Omnichannel Repurposer
                </h2>
                <p className="text-xs text-slate-500">
                  Fetches any live public blog post, case study, or landing page (or uses your pasted notes/transcript) and turns it into LinkedIn, X Thread, Instagram Carousel, TikTok Script, and Newsletter assets.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Public Article or Landing Page URL (optional if pasting text below)
                  </label>
                  <input
                    value={repUrl}
                    onChange={(e) => setRepUrl(e.target.value)}
                    placeholder="https://example.com/blog/your-article"
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Voice & Tone
                  </label>
                  <select
                    value={repTone}
                    onChange={(e) => setRepTone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                  >
                    <option value="Authoritative & Crisp">Authoritative & Crisp</option>
                    <option value="Founder Storytelling">Founder Storytelling</option>
                    <option value="Contrarian & Bold">Contrarian & Bold</option>
                    <option value="Educational Step-by-Step">Educational Step-by-Step</option>
                    <option value="Conversational & Friendly">Conversational & Friendly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Or Paste Raw Article Copy / Podcast Transcript / Notes
                </label>
                <textarea
                  rows={4}
                  value={repRawText}
                  onChange={(e) => setRepRawText(e.target.value)}
                  placeholder="Paste an article, newsletter draft, YouTube transcript, or product release notes..."
                  className="w-full p-3.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Call-to-Action Goal
                  </label>
                  <input
                    value={repCta}
                    onChange={(e) => setRepCta(e.target.value)}
                    placeholder="e.g. Drive comments, book demos, newsletter signups"
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={repLoading}
                  className="px-5 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  {repLoading ? <Loader2 size={14} className="animate-spin" /> : <Repeat2 size={14} />}
                  {repLoading ? 'Fetching & Repurposing...' : 'Generate 5-Channel Pack'}
                </button>
              </div>

              {repError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{repError}</span>
                </div>
              )}
            </form>

            {repResult && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {/* Extracted Source Header */}
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 tabular-nums">
                      Source Extracted · {repResult.data.wordCount.toLocaleString()} words analyzed
                      {repResult.data.sourceUrl ? ` · ${new URL(repResult.data.sourceUrl).hostname}` : ''}
                    </p>
                    <h3 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white truncate">
                      {repResult.data.sourceTitle}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleScheduleFullRepurposePack}
                    className="px-4 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Calendar size={14} /> Schedule Full 4-Channel Campaign
                  </button>
                </div>

                {/* Key Takeaways Strip */}
                <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">Extracted Key Takeaways</p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    {repResult.data.keyTakeaways.map((k, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono text-[#4F46E5] dark:text-indigo-400 tabular-nums">0{idx + 1}.</span>
                        <span>{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Channel Switcher */}
                <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  {[
                    { id: 'linkedin' as const, label: 'LinkedIn Post' },
                    { id: 'x' as const, label: `X Thread (${repResult.data.xThread.length} tweets)` },
                    { id: 'instagram' as const, label: `IG Carousel (${repResult.data.instagramCarousel.slides.length} slides)` },
                    { id: 'tiktok' as const, label: `TikTok / Reels (${repResult.data.tiktokScript.estimatedSeconds}s)` },
                    { id: 'newsletter' as const, label: 'Newsletter Blurb' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setRepChannelView(tab.id)}
                      className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                        repChannelView === tab.id
                          ? 'border-[#4F46E5] text-[#4F46E5] dark:text-indigo-400'
                          : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Active Channel Output */}
                <div className="p-6 space-y-4">
                  {repChannelView === 'linkedin' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 tabular-nums">
                          {repResult.data.linkedinPost.length} characters · Optimized for LinkedIn feed spacing
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyText('rep-li', repResult.data.linkedinPost)}
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            {copiedId === 'rep-li' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenInStudio({
                                topic: repResult.data.linkedinPost,
                                platforms: ['linkedin'],
                                firstComment: repResult.data.hashtags.join(' '),
                                categoryId: defaultCategoryId,
                                evergreen: true,
                              })
                            }
                            className="px-3 py-1.5 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            <PenSquare size={13} /> Open in Studio
                          </button>
                        </div>
                      </div>
                      <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed">
                        {repResult.data.linkedinPost}
                      </div>
                    </div>
                  )}

                  {repChannelView === 'x' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 tabular-nums">
                          {repResult.data.xThread.length} tweets · Live 280-character compliance check
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyText('rep-x', repResult.data.xThread.join('\n\n'))}
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            {copiedId === 'rep-x' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            Copy Thread
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenInStudio({
                                topic: repResult.data.xThread.join('\n\n'),
                                platforms: ['x'],
                                categoryId: defaultCategoryId,
                                evergreen: true,
                              })
                            }
                            className="px-3 py-1.5 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            <PenSquare size={13} /> Open in Studio
                          </button>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                        {repResult.data.xThread.map((tweet, idx) => (
                          <div key={idx} className="p-4 flex items-start justify-between gap-4">
                            <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed">{tweet}</p>
                            <span
                              className={`font-mono text-[11px] shrink-0 tabular-nums ${
                                tweet.length > 280 ? 'text-rose-600 font-bold' : 'text-slate-400'
                              }`}
                            >
                              {tweet.length}/280
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {repChannelView === 'instagram' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">Slide-by-slide carousel deck + caption</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                'rep-ig',
                                `${repResult.data.instagramCarousel.caption}\n\n${repResult.data.instagramCarousel.slides
                                  .map((s) => `Slide ${s.slideNumber}: ${s.headline} — ${s.body}`)
                                  .join('\n')}`
                              )
                            }
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            {copiedId === 'rep-ig' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            Copy Carousel
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenInStudio({
                                topic: repResult.data.instagramCarousel.caption,
                                platforms: ['instagram'],
                                firstComment: repResult.data.hashtags.join(' '),
                                categoryId: defaultCategoryId,
                                evergreen: true,
                              })
                            }
                            className="px-3 py-1.5 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            <PenSquare size={13} /> Open Caption in Studio
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {repResult.data.instagramCarousel.slides.map((s) => (
                          <div
                            key={s.slideNumber}
                            className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg space-y-1.5"
                          >
                            <p className="font-mono text-[11px] font-bold text-[#4F46E5] dark:text-indigo-400 tabular-nums">
                              Slide 0{s.slideNumber}
                            </p>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{s.headline}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{s.body}</p>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 whitespace-pre-line">
                        {repResult.data.instagramCarousel.caption}
                      </div>
                    </div>
                  )}

                  {repChannelView === 'tiktok' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 tabular-nums">
                          Estimated spoken duration: {repResult.data.tiktokScript.estimatedSeconds} seconds
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                'rep-tt',
                                `[HOOK 0-3s] ${repResult.data.tiktokScript.hook}\n\n[BODY] ${repResult.data.tiktokScript.body}\n\n[CTA] ${repResult.data.tiktokScript.cta}`
                              )
                            }
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            {copiedId === 'rep-tt' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            Copy Script
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenInStudio({
                                topic: `[HOOK] ${repResult.data.tiktokScript.hook}\n\n[BODY] ${repResult.data.tiktokScript.body}\n\n[CTA] ${repResult.data.tiktokScript.cta}`,
                                platforms: ['tiktok'],
                                firstComment: repResult.data.hashtags.join(' '),
                                categoryId: defaultCategoryId,
                                evergreen: false,
                              })
                            }
                            className="px-3 py-1.5 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            <PenSquare size={13} /> Open in Studio
                          </button>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                        <div className="p-4">
                          <p className="font-bold text-slate-900 dark:text-white mb-1">0–3s Visual & Spoken Hook</p>
                          <p className="text-slate-700 dark:text-slate-200">{repResult.data.tiktokScript.hook}</p>
                        </div>
                        <div className="p-4">
                          <p className="font-bold text-slate-900 dark:text-white mb-1">Main Delivery Beats</p>
                          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{repResult.data.tiktokScript.body}</p>
                        </div>
                        <div className="p-4">
                          <p className="font-bold text-slate-900 dark:text-white mb-1">Closing Call-to-Action</p>
                          <p className="text-slate-700 dark:text-slate-200">{repResult.data.tiktokScript.cta}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {repChannelView === 'newsletter' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Email digest ready</span>
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              'rep-nl',
                              `Subject: ${repResult.data.newsletterBlurb.subject}\n\n${repResult.data.newsletterBlurb.body}`
                            )
                          }
                          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                        >
                          {copiedId === 'rep-nl' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          Copy Email Blurb
                        </button>
                      </div>
                      <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2 text-xs">
                        <p className="font-bold text-slate-900 dark:text-white">
                          Subject: {repResult.data.newsletterBlurb.subject}
                        </p>
                        <p className="text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                          {repResult.data.newsletterBlurb.body}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Hashtags Row (unboxed text per zero-pill discipline) */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <p className="text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-900 dark:text-white mr-2">Suggested hashtags:</span>
                      {repResult.data.hashtags.join('  ')}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyText('rep-tags', repResult.data.hashtags.join(' '), 'Hashtags Copied')}
                      className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline"
                    >
                      Copy Hashtags
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TOOL 3: VIRAL HOOK LAB & POST GRADER                              */}
        {/* ================================================================= */}
        {activeTool === 'hooks' && (
          <div className="space-y-6">
            <form
              onSubmit={handleRunViralityAudit}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Viral Hook Lab & Post Virality Grader
                  </h2>
                  <p className="text-xs text-slate-500">
                    Grades your draft copy before publishing and generates 5 proven A/B hook rewrites (Contrarian, Data, Story, Curiosity, Direct Pain).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Target Network
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['linkedin', 'x', 'instagram', 'tiktok', 'threads'] as Platform[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setHookPlatform(p)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                          hookPlatform === p
                            ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                            : 'bg-[#F8FAFC] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {PLATFORM_META[p].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Target Audience
                  </label>
                  <input
                    value={hookAudience}
                    onChange={(e) => setHookAudience(e.target.value)}
                    placeholder="e.g. Agency owners, DTC founders, HR leaders"
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Draft Post Copy
                </label>
                <textarea
                  rows={5}
                  value={hookDraft}
                  onChange={(e) => setHookDraft(e.target.value)}
                  placeholder="Paste your draft caption or post here..."
                  className="w-full p-3.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] leading-relaxed"
                />
              </div>

              {/* Real-time deterministic telemetry */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs tabular-nums">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500">
                  <span className={liveDraftTelemetry.overLimit ? 'text-rose-600 font-bold' : ''}>
                    Length: <strong className="text-slate-800 dark:text-slate-200">{liveDraftTelemetry.chars}</strong>/{liveDraftTelemetry.limit}
                  </span>
                  <span>·</span>
                  <span>
                    Words: <strong className="text-slate-800 dark:text-slate-200">{liveDraftTelemetry.words}</strong>
                  </span>
                  <span>·</span>
                  <span className={liveDraftTelemetry.hookChars > 110 ? 'text-amber-600 font-semibold' : ''}>
                    Line 1 Hook: <strong>{liveDraftTelemetry.hookChars}</strong> chars
                  </span>
                  <span>·</span>
                  <span>Numbers: {liveDraftTelemetry.hasNumbers ? 'Yes' : 'No'}</span>
                  <span>·</span>
                  <span>CTA Question: {liveDraftTelemetry.hasQuestion ? 'Yes' : 'No'}</span>
                </div>

                <button
                  type="submit"
                  disabled={hookLoading}
                  className="px-5 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  {hookLoading ? <Loader2 size={14} className="animate-spin" /> : <Flame size={14} />}
                  {hookLoading ? 'Grading & Writing A/B Hooks...' : 'Audit Post & Generate 5 Hooks'}
                </button>
              </div>

              {hookError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{hookError}</span>
                </div>
              )}
            </form>

            {hookResult && (
              <div className="space-y-6">
                {/* Score Summary & Line Fixes */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-slate-100 dark:border-slate-800 tabular-nums">
                    {[
                      { label: 'Overall Score', value: hookResult.data.overallScore },
                      { label: 'Hook Stopping Power', value: hookResult.data.hookScore },
                      { label: 'Clarity & Skimmability', value: hookResult.data.clarityScore },
                      { label: 'CTA & Reply Pull', value: hookResult.data.ctaScore },
                    ].map((metric) => (
                      <div key={metric.label} className="space-y-1.5">
                        <p className="text-xs text-slate-500">{metric.label}</p>
                        <p className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                          {metric.value}
                          <span className="text-xs font-normal text-slate-400">/100</span>
                        </p>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              metric.value >= 78
                                ? 'bg-emerald-500'
                                : metric.value >= 60
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(4, metric.value))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Editor Verdict: <span className="font-normal text-slate-600 dark:text-slate-300">{hookResult.data.verdict}</span>
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-2">What&apos;s Working</p>
                      <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                        {hookResult.data.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold text-amber-700 dark:text-amber-400 mb-2">High-Leverage Fixes</p>
                      <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                        {hookResult.data.fixes.map((f, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="font-mono text-amber-600 tabular-nums">{i + 1}.</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 5 A/B Hook Variants */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      5 A/B Hook Rewrites Ready to Test
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {hookResult.data.hookVariants.map((variant, idx) => (
                      <div key={idx} className="p-6 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs">
                            <span className="font-mono font-bold text-[#4F46E5] dark:text-indigo-400 mr-2 tabular-nums">
                              0{idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">{variant.framework}</span>
                            <span className="text-slate-400 mx-2">·</span>
                            <span className="text-slate-500">{variant.whyItWorks}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => copyText(`hv-${idx}`, variant.fullPost)}
                              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                            >
                              {copiedId === `hv-${idx}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onOpenInStudio({
                                  topic: variant.fullPost,
                                  platforms: [hookPlatform],
                                  categoryId: defaultCategoryId,
                                  evergreen: true,
                                })
                              }
                              className="px-3 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                            >
                              <PenSquare size={13} /> Apply in Studio
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed bg-[#F8FAFC] dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200/80 dark:border-slate-700/70">
                          {variant.fullPost}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TOOL 4: LIVE TREND & NEWSJACKING RADAR                            */}
        {/* ================================================================= */}
        {activeTool === 'trends' && (
          <div className="space-y-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runTrendScan();
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
            >
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Live Trend & Newsjacking Radar
                </h2>
                <p className="text-xs text-slate-500">
                  Scans current news and industry momentum via Google Search, cites live sources, and drafts timely hot-take posts you can ship today.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Industry, Topic, or Keyword
                  </label>
                  <input
                    required
                    value={trendNiche}
                    onChange={(e) => setTrendNiche(e.target.value)}
                    placeholder="e.g. AI Agents, E-Commerce Ads, Fintech"
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Region Focus
                  </label>
                  <select
                    value={trendRegion}
                    onChange={(e) => setTrendRegion(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                  >
                    <option value="Global">Global</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Europe">Europe</option>
                    <option value="Middle East">Middle East</option>
                    <option value="Asia-Pacific">Asia-Pacific</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Target Audience
                  </label>
                  <input
                    value={trendAudience}
                    onChange={(e) => setTrendAudience(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Instant scans:</span>
                  {['AI Marketing Tools', 'Short-Form Video Ads', 'B2B SaaS Growth', 'E-Commerce Conversion'].map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => runTrendScan(preset)}
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#4F46E5] dark:hover:text-indigo-400 underline underline-offset-2"
                      >
                        {preset}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="submit"
                  disabled={trendLoading}
                  className="px-5 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  {trendLoading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                  {trendLoading ? 'Scanning Live Trends...' : 'Scan Live Trends'}
                </button>
              </div>

              {trendError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{trendError}</span>
                </div>
              )}
            </form>

            {trendResult && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                        Trending Angles for &ldquo;{trendResult.data.niche}&rdquo;
                      </h3>
                      <p className="text-[11px] text-slate-500 tabular-nums">
                        {trendResult.isLive ? 'Live Google Search Grounded' : 'Strategic Playbook'} · Scanned{' '}
                        {new Date(trendResult.data.scannedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {trendResult.data.trends.map((item, idx) => (
                      <div key={idx} className="p-6 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-bold text-amber-600 dark:text-amber-400">{item.momentum}</span>
                              <span className="text-slate-400">·</span>
                              <PlatformTag platform={item.suggestedPlatform} />
                            </div>
                            <h4 className="font-display text-base font-bold text-slate-900 dark:text-white">
                              {item.headline}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300">{item.whyNow}</p>
                            <p className="text-xs text-slate-500">
                              <strong className="text-slate-700 dark:text-slate-200">Recommended Angle:</strong>{' '}
                              {item.newsjackAngle}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => copyText(`tr-${idx}`, item.draftPost)}
                              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                            >
                              {copiedId === `tr-${idx}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onOpenInStudio({
                                  topic: item.draftPost,
                                  platforms: [item.suggestedPlatform],
                                  categoryId: defaultCategoryId,
                                  evergreen: false,
                                })
                              }
                              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                            >
                              <PenSquare size={13} /> Open in Studio
                            </button>
                            <button
                              type="button"
                              onClick={() => scheduleSinglePost(item.draftPost, [item.suggestedPlatform])}
                              className="px-3 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                            >
                              <Calendar size={13} /> Schedule
                            </button>
                          </div>
                        </div>

                        <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 rounded-lg text-xs text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed">
                          {item.draftPost}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {trendResult.data.sources.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2.5">Live Source Citations</h4>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                      {trendResult.data.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#4F46E5] dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span className="truncate max-w-[260px]">{src.title}</span>
                          <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TOOL 5: UTM CAMPAIGN BUILDER & SCANNABLE QR STUDIO                */}
        {/* ================================================================= */}
        {activeTool === 'utm' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* UTM Form */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      UTM Campaign Link Builder
                    </h2>
                    <p className="text-xs text-slate-500">
                      Standardize campaign attribution links across every social channel, bio link, ad set, and offline QR code.
                    </p>
                  </div>
                </div>

                {/* Quick Channel Presets */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500">Channel presets:</span>
                  {[
                    { label: 'LinkedIn Organic', source: 'linkedin', medium: 'organic_social', content: 'feed_post' },
                    { label: 'Instagram Bio', source: 'instagram', medium: 'bio_link', content: 'profile_cta' },
                    { label: 'Meta Paid Ad', source: 'facebook', medium: 'paid_social', content: 'video_ad_v1' },
                    { label: 'X Thread', source: 'x', medium: 'organic_social', content: 'thread_footer' },
                    { label: 'Print / Event QR', source: 'event_booth', medium: 'qr_code', content: 'banner_stand' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setUtmSource(p.source);
                        setUtmMedium(p.medium);
                        setUtmContent(p.content);
                      }}
                      className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] text-slate-700 dark:text-slate-300 font-semibold transition-colors whitespace-nowrap"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Destination URL
                    </label>
                    <input
                      value={utmBaseUrl}
                      onChange={(e) => setUtmBaseUrl(e.target.value)}
                      placeholder="https://www.yourdomain.com/landing-page"
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Internal Label
                    </label>
                    <input
                      value={utmLabel}
                      onChange={(e) => setUtmLabel(e.target.value)}
                      placeholder="e.g. Spring Webinar LinkedIn"
                      className="w-full px-3.5 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      utm_source (Channel)
                    </label>
                    <input
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                      placeholder="linkedin, instagram, newsletter"
                      className="w-full px-3.5 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      utm_medium (Traffic Type)
                    </label>
                    <input
                      value={utmMedium}
                      onChange={(e) => setUtmMedium(e.target.value)}
                      placeholder="organic_social, paid_social, qr_code"
                      className="w-full px-3.5 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      utm_campaign (Campaign Name)
                    </label>
                    <input
                      value={utmCampaign}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                      placeholder="q4_launch, webinar_nov"
                      className="w-full px-3.5 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      utm_content (Optional Creative / CTA)
                    </label>
                    <input
                      value={utmContent}
                      onChange={(e) => setUtmContent(e.target.value)}
                      placeholder="carousel_cta, bio_button"
                      className="w-full px-3.5 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      utm_term (Optional Keyword)
                    </label>
                    <input
                      value={utmTerm}
                      onChange={(e) => setUtmTerm(e.target.value)}
                      placeholder="social_crm"
                      className="w-full px-3.5 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                </div>

                {/* Live Constructed URL */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Generated Tracked URL</p>
                  <div className="p-3 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-800 dark:text-indigo-300 break-all">
                    {builtUtmUrl || 'Enter a valid destination URL above to generate a tracked link.'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!builtUtmUrl}
                      onClick={() => copyText('utm-live', builtUtmUrl, 'Tracked URL Copied')}
                      className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      {copiedId === 'utm-live' ? <Check size={13} /> : <Copy size={13} />}
                      Copy Tracked URL
                    </button>
                    <button
                      type="button"
                      disabled={!builtUtmUrl}
                      onClick={handleSaveUtmLink}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] disabled:opacity-50 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                    >
                      <Plus size={13} /> Save to Workspace Library
                    </button>
                    <button
                      type="button"
                      disabled={!builtUtmUrl}
                      onClick={() =>
                        onOpenInStudio({
                          topic: `Check out our latest update here:\n${builtUtmUrl}`,
                          categoryId: defaultCategoryId,
                          evergreen: false,
                        })
                      }
                      className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] disabled:opacity-50 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                    >
                      <PenSquare size={13} /> Insert in Studio
                    </button>
                  </div>
                </div>
              </div>

              {/* Scannable QR Preview Card */}
              <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Live Scannable QR Code
                  </h3>
                  <p className="text-xs text-slate-500">Encoded directly from your tracked UTM link.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-center min-h-[220px]">
                  {qrPngDataUrl ? (
                    <img
                      src={qrPngDataUrl}
                      alt={`Scannable QR code for ${utmLabel || builtUtmUrl}`}
                      className="w-48 h-48 object-contain"
                    />
                  ) : (
                    <p className="text-xs text-slate-400 text-center">Enter a valid URL to render a QR code.</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">QR Ink Color</span>
                  <div className="flex items-center gap-1.5">
                    {['#0F172A', '#4F46E5', '#047857', '#BE123C'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setQrColor(hex)}
                        aria-label={`Set QR color ${hex}`}
                        className={`w-5 h-5 rounded-full border-2 ${
                          qrColor === hex ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!qrPngDataUrl}
                    onClick={handleDownloadQrPng}
                    className="px-3 py-2 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Download size={13} /> PNG (512px)
                  </button>
                  <button
                    type="button"
                    disabled={!qrSvgMarkup}
                    onClick={handleDownloadQrSvg}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] disabled:opacity-50 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <Download size={13} /> Vector SVG
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Workspace UTM Library */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Workspace UTM Link Library ({savedLinks.length})
                  </h3>
                  <p className="text-xs text-slate-500">Saved locally per workspace for repeatable campaign tracking.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={utmSearch}
                      onChange={(e) => setUtmSearch(e.target.value)}
                      placeholder="Filter links..."
                      className="pl-8 pr-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savedLinks.length === 0}
                    onClick={handleExportUtmCsv}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] disabled:opacity-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <FileSpreadsheet size={13} /> Export CSV
                  </button>
                </div>
              </div>

              {filteredUtmLinks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  {savedLinks.length === 0
                    ? 'No saved UTM links yet. Build a tracked link above and click "Save to Workspace Library".'
                    : 'No saved links match your search.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 bg-slate-50/70 dark:bg-slate-950/40">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Campaign Label</th>
                        <th className="px-4 py-3 font-semibold">Source / Medium</th>
                        <th className="px-4 py-3 font-semibold">Tracked URL</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredUtmLinks.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-6 py-3">
                            <p className="font-bold text-slate-900 dark:text-white">{item.label}</p>
                            <p className="text-[11px] text-slate-400 tabular-nums">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {item.source || '-'} / {item.medium || '-'}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="font-mono text-[11px] text-[#4F46E5] dark:text-indigo-400 truncate" title={item.fullUrl}>
                              {item.fullUrl}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => copyText(item.id, item.fullUrl, 'UTM URL Copied')}
                                className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md font-semibold hover:border-[#4F46E5]"
                              >
                                {copiedId === item.id ? 'Copied' : 'Copy'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUtmBaseUrl(item.baseUrl);
                                  setUtmLabel(item.label);
                                  setUtmSource(item.source);
                                  setUtmMedium(item.medium);
                                  setUtmCampaign(item.campaign);
                                  setUtmContent(item.content || '');
                                  setUtmTerm(item.term || '');
                                  onToast('Loaded into QR Studio', item.label);
                                }}
                                className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md font-semibold hover:border-[#4F46E5]"
                              >
                                Load QR
                              </button>
                              <button
                                type="button"
                                aria-label="Delete UTM link"
                                onClick={() => persistLinks(savedLinks.filter((l) => l.id !== item.id))}
                                className="p-1.5 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TOOL 6: SOCIAL ROI, AD ROAS & CREATOR RATE CALCULATOR             */}
        {/* ================================================================= */}
        {activeTool === 'roi' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {[
                  { id: 'roas' as const, label: 'Paid Ad ROAS & Break-Even' },
                  { id: 'engagement' as const, label: 'Engagement Rate Audit' },
                  { id: 'creator' as const, label: 'Creator Sponsorship Rate' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCalcTab(tab.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      calcTab === tab.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCopyCalculatorSummary}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
              >
                {copiedId === 'calc-summary' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                Copy Client Report Summary
              </button>
            </div>

            {calcTab === 'roas' && (
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 flex justify-between mb-1">
                      <span>Monthly Paid Social Spend ($)</span>
                      <span className="font-mono tabular-nums">${adSpend.toLocaleString()}</span>
                    </label>
                    <input
                      type="number"
                      min={100}
                      step={100}
                      value={adSpend}
                      onChange={(e) => setAdSpend(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Avg CPC ($)</label>
                      <input
                        type="number"
                        min={0.05}
                        step={0.05}
                        value={cpc}
                        onChange={(e) => setCpc(Math.max(0.01, Number(e.target.value) || 0.01))}
                        className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Landing Page CVR (%)
                      </label>
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={cvrPct}
                        onChange={(e) => setCvrPct(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Average Order / Deal Value ($)
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={10}
                        value={aov}
                        onChange={(e) => setAov(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Gross Margin (%)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        value={marginPct}
                        onChange={(e) => setMarginPct(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                        className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 tabular-nums">
                    <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <p className="text-[11px] text-slate-500">Projected ROAS</p>
                      <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                        {roasMetrics.roas.toFixed(2)}x
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Break-even: {roasMetrics.breakEvenRoas.toFixed(2)}x
                      </p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <p className="text-[11px] text-slate-500">Estimated Revenue</p>
                      <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                        ${Math.round(roasMetrics.revenue).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {roasMetrics.conversions.toFixed(1)} conversions
                      </p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <p className="text-[11px] text-slate-500">Net Profit After Ad Spend</p>
                      <p
                        className={`mt-1 font-display text-2xl font-extrabold ${
                          roasMetrics.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {roasMetrics.netProfit >= 0 ? '+' : '-'}${Math.abs(Math.round(roasMetrics.netProfit)).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {roasMetrics.netProfit >= 0 ? 'Profitable Unit Economics' : 'Below Break-Even'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs tabular-nums">
                    <div>
                      <p className="text-slate-500">Implied Clicks</p>
                      <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                        {roasMetrics.clicks.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Actual CPA</p>
                      <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                        ${roasMetrics.cpa.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Max Break-Even CPA</p>
                      <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                        ${roasMetrics.breakEvenCpa.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {calcTab === 'engagement' && (
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-xs">
                  {[
                    { label: 'Total Followers', value: erFollowers, setter: setErFollowers },
                    { label: 'Post Reach / Impressions', value: erReach, setter: setErReach },
                    { label: 'Likes / Reactions', value: erLikes, setter: setErLikes },
                    { label: 'Comments', value: erComments, setter: setErComments },
                    { label: 'Shares / Reposts', value: erShares, setter: setErShares },
                    { label: 'Saves / Bookmarks', value: erSaves, setter: setErSaves },
                  ].map((field) => (
                    <div key={field.label}>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">{field.label}</label>
                      <input
                        type="number"
                        min={0}
                        value={field.value}
                        onChange={(e) => field.setter(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
                    <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <p className="text-[11px] text-slate-500">Engagement Rate (by Reach)</p>
                      <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                        {erMetrics.erByReach.toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <p className="text-[11px] text-slate-500">Engagement Rate (Followers)</p>
                      <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                        {erMetrics.erByFollowers.toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <p className="text-[11px] text-slate-500">Save + Share Virality Ratio</p>
                      <p className="mt-1 font-display text-2xl font-extrabold text-[#4F46E5] dark:text-indigo-400">
                        {erMetrics.viralityRatio.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Benchmark Verdict: <strong className="text-slate-900 dark:text-white">{erMetrics.verdict}</strong> · Total Recorded Engagements:{' '}
                    <span className="font-mono font-bold tabular-nums">{erMetrics.totalEng.toLocaleString()}</span>
                  </p>
                </div>
              </div>
            )}

            {calcTab === 'creator' && (
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Average Views per Post / Video
                    </label>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={creatorViews}
                      onChange={(e) => setCreatorViews(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Niche Base CPM Tier
                    </label>
                    <select
                      value={creatorCpm}
                      onChange={(e) => setCreatorCpm(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold outline-none focus:border-[#4F46E5]"
                    >
                      <option value={45}>B2B SaaS / Finance / Investing ($45 CPM)</option>
                      <option value={32}>Tech / Productivity / Marketing ($32 CPM)</option>
                      <option value={22}>E-Commerce / DTC / Beauty ($22 CPM)</option>
                      <option value={14}>General Lifestyle / Entertainment ($14 CPM)</option>
                    </select>
                  </div>
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={creatorUsageRights}
                        onChange={(e) => setCreatorUsageRights(e.target.checked)}
                        className="accent-[#4F46E5]"
                      />
                      <span>Include 90-Day Paid Ad Whitelisting Rights (+35%)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={creatorExclusivity}
                        onChange={(e) => setCreatorExclusivity(e.target.checked)}
                        className="accent-[#4F46E5]"
                      />
                      <span>Include 30-Day Category Exclusivity (+25%)</span>
                    </label>
                  </div>
                </div>

                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4 items-start tabular-nums">
                  <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-[11px] text-slate-500">Fair Target Flat Rate</p>
                    <p className="mt-1 font-display text-2xl font-extrabold text-[#4F46E5] dark:text-indigo-400">
                      ${creatorMetrics.target.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-[11px] text-slate-500">Negotiation Range</p>
                    <p className="mt-1 font-display text-lg font-extrabold text-slate-900 dark:text-white">
                      ${creatorMetrics.low.toLocaleString()} – ${creatorMetrics.high.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-[11px] text-slate-500">Effective CPM</p>
                    <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                      ${creatorMetrics.effCpm.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
