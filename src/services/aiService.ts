import { Thread, Contact, Platform, AppState, AdPlatform } from '../types';

const SESSION_TOKEN_KEY = 'socialifyai_auth_token_v1';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    if (token && !token.startsWith('local_sess_')) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore storage access issues
  }
  return headers;
}

async function postApi<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Request failed with HTTP ${res.status}`);
  }
  return json as T;
}

async function getApi<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Request failed with HTTP ${res.status}`);
  }
  return json as T;
}

export interface SocialProviderStatus {
  platform: Platform;
  name: string;
  authType: 'oauth2' | 'atproto';
  configured: boolean;
  missingEnvVars: string[];
  redirectUri: string | null;
  setupSteps: string[];
}

export interface SocialOAuthUrlResponse {
  ok: boolean;
  authUrl?: string;
  redirectUri?: string;
  code?: string;
  error?: string;
  missingEnvVars?: string[];
  setupSteps?: string[];
}

export interface AdminEnvStatusItem {
  key: string;
  label: string;
  category: string;
  configured: boolean;
  detail: string;
}

export const aiService = {
  async generateUnified(params: {
    task:
      | 'youtube_ideation'
      | 'youtube_script'
      | 'seo_article'
      | 'social_captions'
      | 'hashtags'
      | 'inbox_reply'
      | 'rss_repurpose'
      | 'thread_summary'
      | 'lead_score'
      | 'ad_copy'
      | 'analyst';
    prompt: string;
    context?: Record<string, unknown>;
  }): Promise<{ ok: boolean; task: string; creditsUsed: number; text: string }> {
    return postApi('/api/ai/generate', params);
  },

  async generateDraftReplies(thread: Thread, contact: Contact) {
    const res = await postApi<{
      fallback: boolean;
      data: { professional: string; friendly: string; concise: string };
    }>('/api/ai/reply-drafts', {
      contactName: contact.name,
      contactTitle: contact.title || contact.company,
      tags: contact.tags,
      messages: thread.messages,
    });
    return { ...res.data, isLive: !res.fallback };
  },

  async summarizeAndTag(thread: Thread) {
    const res = await postApi<{
      fallback: boolean;
      data: {
        summary: string;
        sentiment: 'positive' | 'neutral' | 'urgent' | 'negative';
        intent: 'Lead' | 'Support' | 'Feedback' | 'Other';
        suggestedTags: string[];
        sentimentScore: number;
      };
    }>('/api/ai/summarize-thread', {
      messages: thread.messages,
    });
    return { ...res.data, isLive: !res.fallback };
  },

  async scoreLead(contact: Contact) {
    const res = await postApi<{
      fallback: boolean;
      data: {
        score: number;
        reasoning: string;
        nextBestAction: string;
        followUpMessage: string;
      };
    }>('/api/ai/score-lead', {
      name: contact.name,
      notes: contact.notes,
      tags: contact.tags,
      ltv: contact.ltv,
      lifecycleStage: contact.lifecycleStage,
    });
    return { ...res.data, isLive: !res.fallback };
  },

  async repurposeContent(topic: string, tone: string = 'Professional') {
    const res = await postApi<{
      fallback: boolean;
      data: {
        linkedin: string;
        x: string;
        instagram: string;
        tiktok: string;
        hashtags: string[];
      };
    }>('/api/ai/repurpose', { topic, tone });
    return { ...res.data, isLive: !res.fallback };
  },

  async generateBulkContent(topic: string, audience: string, tone: string, platforms: Platform[]) {
    const res = await postApi<{
      fallback: boolean;
      data: { drafts: { platform: string; content: string }[] };
    }>('/api/ai/bulk-drafts', {
      topic,
      audience,
      tone,
      platforms,
    });
    return { ...res.data, isLive: !res.fallback };
  },

  async generateAdCopy(platform: AdPlatform, objective: string, audience: string) {
    const res = await postApi<{
      fallback: boolean;
      data: {
        variations: { headline: string; primaryText: string; cta: string; creativeConcept: string }[];
      };
    }>('/api/ai/ad-copy', { platform, objective, audience });
    return { ...res.data, isLive: !res.fallback };
  },

  async askAnalyst(data: AppState, query: string): Promise<string> {
    const wsPosts = data.posts.filter((p) => p.workspaceId === data.activeWorkspaceId);
    const wsDeals = data.deals.filter((d) => d.workspaceId === data.activeWorkspaceId);
    const wsAds = data.ads.filter((a) => a.workspaceId === data.activeWorkspaceId);
    const wsThreads = data.threads.filter((t) => t.workspaceId === data.activeWorkspaceId);

    const totalReach = wsPosts.reduce((sum, p) => sum + (p.analytics?.reach || 0), 0);
    const totalEngagement = wsPosts.reduce((sum, p) => sum + (p.analytics?.engagement || 0), 0);
    const pipelineValue = wsDeals.reduce((sum, d) => sum + d.value, 0);
    const wonValue = wsDeals.filter((d) => d.stage === 'won').reduce((sum, d) => sum + d.value, 0);
    const totalAdSpend = wsAds.reduce((sum, a) => sum + a.spend, 0);
    const avgRoas = wsAds.length ? (wsAds.reduce((sum, a) => sum + a.roas, 0) / wsAds.length).toFixed(1) : '0';

    const summary = {
      postsCount: wsPosts.length,
      totalReach,
      totalEngagement,
      pipelineValue,
      wonValue,
      openThreads: wsThreads.filter((t) => t.status === 'open').length,
      totalAdSpend,
      avgRoas,
    };

    const res = await postApi<{ fallback: boolean; data: { answer: string } }>('/api/ai/analyst', {
      summary,
      query,
    });
    return res.data.answer;
  },

  async analyzeCompetitor(params: { yourBrand: string; competitor: string; niche: string }): Promise<{
    isLive: boolean;
    data: CompetitorIntelResult;
  }> {
    const json = await postApi<{ fallback: boolean; data: CompetitorIntelResult }>(
      '/api/tools/competitor-intel',
      params
    );
    return { isLive: !json.fallback, data: json.data };
  },

  async repurposeFromUrlOrText(params: {
    url?: string;
    rawText?: string;
    tone: string;
    ctaGoal: string;
  }): Promise<{ isLive: boolean; data: RepurposeUrlResult }> {
    const json = await postApi<{ fallback: boolean; data: RepurposeUrlResult }>(
      '/api/tools/repurpose-url',
      params
    );
    return { isLive: !json.fallback, data: json.data };
  },

  async auditPostVirality(params: {
    content: string;
    platform: Platform;
    audience: string;
  }): Promise<{ isLive: boolean; data: ViralityAuditResult }> {
    const json = await postApi<{ fallback: boolean; data: ViralityAuditResult }>(
      '/api/tools/virality-audit',
      params
    );
    return { isLive: !json.fallback, data: json.data };
  },

  async discoverLiveTrends(params: {
    niche: string;
    region: string;
    audience: string;
  }): Promise<{ isLive: boolean; data: LiveTrendsResult }> {
    const json = await postApi<{ fallback: boolean; data: LiveTrendsResult }>(
      '/api/tools/live-trends',
      params
    );
    return { isLive: !json.fallback, data: json.data };
  },

  async generateYouTubeIdeation(params: {
    niche: string;
    format: 'long_form' | 'short';
    channelName: string;
  }): Promise<{
    ideas: {
      topic: string;
      format: 'long_form' | 'short';
      hookAngle: string;
      searchIntent: string;
      thumbnailHeadline: string;
    }[];
  }> {
    const json = await postApi<{
      data: {
        ideas: {
          topic: string;
          format: 'long_form' | 'short';
          hookAngle: string;
          searchIntent: string;
          thumbnailHeadline: string;
        }[];
      };
    }>('/api/ai/youtube-studio', { mode: 'ideation', ...params });
    return json.data;
  },

  async generateYouTubePipeline(params: {
    niche: string;
    topic: string;
    format: 'long_form' | 'short';
    tone: string;
    channelName: string;
  }): Promise<{
    seoTitles: string[];
    description: string;
    script: { hook: string; body: string; cta: string };
    chapters: { timestamp: string; label: string }[];
    tags: string[];
    pinnedComment: string;
    thumbnailPrompt: string;
    thumbnailHeadline: string;
  }> {
    const json = await postApi<{
      data: {
        seoTitles: string[];
        description: string;
        script: { hook: string; body: string; cta: string };
        chapters: { timestamp: string; label: string }[];
        tags: string[];
        pinnedComment: string;
        thumbnailPrompt: string;
        thumbnailHeadline: string;
      };
    }>('/api/ai/youtube-studio', { mode: 'pipeline', ...params });
    return json.data;
  },

  async generateSeoArticle(params: {
    targetKeyword: string;
    sourceUrl?: string;
    brandName: string;
    audience: string;
    tone: string;
  }): Promise<{
    title: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    h1: string;
    heroImageAlt: string;
    sections: {
      heading: string;
      level: 'h2' | 'h3';
      body: string;
      visualAlt?: string;
      visualCaption?: string;
      visualType?: 'infographic' | 'diagram' | 'callout';
    }[];
    schemaFaq: { question: string; answer: string }[];
    internalLinks: { anchor: string; suggestedSlug: string; rationale: string }[];
    socialBundle: {
      linkedinCarousel: string;
      xThread: string;
      instagramCaption: string;
      facebookPost: string;
    };
    wordCount: number;
    readabilityScore: number;
    seoScore: number;
  }> {
    const json = await postApi<{
      data: {
        title: string;
        slug: string;
        metaTitle: string;
        metaDescription: string;
        h1: string;
        heroImageAlt: string;
        sections: {
          heading: string;
          level: 'h2' | 'h3';
          body: string;
          visualAlt?: string;
          visualCaption?: string;
          visualType?: 'infographic' | 'diagram' | 'callout';
        }[];
        schemaFaq: { question: string; answer: string }[];
        internalLinks: { anchor: string; suggestedSlug: string; rationale: string }[];
        socialBundle: {
          linkedinCarousel: string;
          xThread: string;
          instagramCaption: string;
          facebookPost: string;
        };
        wordCount: number;
        readabilityScore: number;
        seoScore: number;
      };
    }>('/api/ai/seo-article', params);
    return json.data;
  },

  async publishArticleToCms(params: {
    provider: string;
    endpointUrl: string;
    authCredential?: string;
    webhookSecret?: string;
    article: Record<string, unknown>;
  }): Promise<{
    ok: boolean;
    dispatched: boolean;
    httpStatus: number;
    publishedAt: string;
    publishedUrl?: string;
    endpoint?: string;
    note?: string;
  }> {
    return postApi('/api/cms/publish', params);
  },

  async fetchRssFeed(params: {
    feedUrl: string;
    keywordFilter?: string;
    sourceName?: string;
    sourceType?: string;
  }): Promise<{
    fetchedAt: string;
    sourceName: string;
    totalParsed: number;
    items: { title: string; summary: string; url: string; publishedAt: string }[];
  }> {
    return postApi('/api/feeds/sync', params);
  },

  async exploreViralContent(params: {
    query: string;
    channelFilter: string;
    velocityFilter: string;
  }): Promise<{
    items: {
      id: string;
      sourceName: string;
      channel: 'youtube' | 'x' | 'reddit' | 'news' | 'blog' | 'rss';
      title: string;
      summary: string;
      url: string;
      publishedAt: string;
      velocityLabel: string;
    }[];
  }> {
    return postApi('/api/discover/explore', params);
  },

  async repurposeCuratedItem(params: {
    title: string;
    summary: string;
    url?: string;
    platform: Platform;
    brandVoice: string;
    utmCampaign?: string;
  }): Promise<{ content: string; firstComment: string; trackedUrl: string }> {
    const json = await postApi<{ data: { content: string; firstComment: string; trackedUrl: string } }>(
      '/api/discover/repurpose',
      params
    );
    return json.data;
  },

  // =========================================================================
  // Social OAuth 2.0, Bluesky AT Protocol & Publishing
  // =========================================================================
  async getSocialProviders(): Promise<{ providers: SocialProviderStatus[] }> {
    return getApi('/api/social/providers');
  },

  async getSocialOAuthUrl(platform: Platform, workspaceId: string): Promise<SocialOAuthUrlResponse> {
    const res = await fetch(
      `/api/social/oauth/${encodeURIComponent(platform)}/url?workspaceId=${encodeURIComponent(workspaceId)}`,
      { headers: getAuthHeaders() }
    );
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, authUrl: json.authUrl, redirectUri: json.redirectUri };
    }
    return {
      ok: false,
      code: json.code,
      error: json.error || `OAuth setup required for ${platform}`,
      missingEnvVars: json.missingEnvVars || [],
      setupSteps: json.setupSteps || [],
      redirectUri: json.redirectUri,
    };
  },

  async connectBluesky(params: {
    handle: string;
    appPassword: string;
    workspaceId: string;
  }): Promise<{
    ok: boolean;
    connection: {
      connectionId: string;
      platform: 'bluesky';
      handle: string;
      displayName: string;
      followers: number;
      avatar: string;
      externalAccountId: string;
      scopes: string[];
      connectedAt: string;
      lastVerifiedAt: string;
    };
  }> {
    return postApi('/api/social/bluesky/connect', params);
  },

  async testSocialConnection(params: {
    connectionId?: string;
    platform: Platform;
    handle?: string;
  }): Promise<{ ok: boolean; status: string; latencyMs: number; followers?: number; detail: string; verifiedAt: string }> {
    return postApi('/api/social/test', params);
  },

  async refreshSocialConnection(params: {
    connectionId?: string;
    platform: Platform;
  }): Promise<{ ok: boolean; refreshedAt: string; detail: string }> {
    return postApi('/api/social/refresh', params);
  },

  async disconnectSocialConnection(connectionId: string): Promise<{ ok: boolean }> {
    return postApi('/api/social/disconnect', { connectionId });
  },

  async publishSocialPost(params: {
    connectionId?: string;
    platform: Platform;
    content: string;
    mediaUrl?: string;
  }): Promise<{ ok: boolean; externalPostUrl?: string; externalPostId?: string; publishedAt: string }> {
    return postApi('/api/social/publish', params);
  },

  // =========================================================================
  // Viral Campaign Entry & Conversion Pixel Ingestion
  // =========================================================================
  async submitCampaignEntry(params: {
    campaignId: string;
    workspaceId?: string;
    name: string;
    email: string;
    handle?: string;
    platform?: string;
    referredBy?: string;
    bonusPoints?: number;
    slug?: string;
    utmSource?: string;
    utmCampaign?: string;
  }): Promise<{
    ok: boolean;
    referralCode: string;
    referralLink: string;
    entry: {
      id: string;
      campaignId: string;
      name: string;
      email: string;
      handle: string;
      platform: string;
      referralCode: string;
      entriesPoints: number;
      ipFingerprint: string;
      fraudStatus: 'verified' | 'flagged_duplicate' | 'flagged_bot';
      verificationHash: string;
      submittedAt: string;
    };
  }> {
    return postApi('/api/campaigns/enter', params);
  },

  async sendPixelEvent(params: {
    pixelId: string;
    campaignId?: string;
    workspaceId?: string;
    eventType: 'pageview' | 'signup' | 'purchase';
    revenueUsd?: number;
    referralCode?: string;
    email?: string;
    url?: string;
  }): Promise<{
    ok: boolean;
    event: {
      id: string;
      pixelId: string;
      eventType: string;
      revenueUsd: number;
      ipFingerprint: string;
      recordedAt: string;
    };
    pixelSummary: {
      pixelId: string;
      totalEvents: number;
      signups: number;
      purchases: number;
      totalAttributedRevenueUsd: number;
    };
  }> {
    return postApi('/api/pixel/event', params);
  },

  async getPixelEvents(pixelId: string): Promise<{
    pixelId: string;
    totalEvents: number;
    totalAttributedRevenueUsd: number;
    events: Array<{
      id: string;
      pixelId: string;
      eventType: string;
      revenueUsd: number;
      recordedAt: string;
    }>;
  }> {
    return getApi(`/api/pixel/events/${encodeURIComponent(pixelId)}`);
  },

  // =========================================================================
  // Super Admin Tenant, Workspace Impersonation & Env Status APIs
  // =========================================================================
  async getAdminEnvStatus(): Promise<{
    checkedAt: string;
    configuredCount: number;
    totalCount: number;
    items: AdminEnvStatusItem[];
  }> {
    return getApi('/api/admin/env-status');
  },

  async adminProvisionUser(params: {
    displayName: string;
    email: string;
    password: string;
    companyName: string;
    plan: string;
  }): Promise<{
    ok: boolean;
    user: {
      uid: string;
      email: string;
      displayName: string;
      companyName: string;
      status: 'active' | 'suspended';
      plan: string;
      linkedWorkspaceId: string;
      aiCreditsUsed: number;
      aiCreditsLimit: number;
      createdAt: string;
    };
  }> {
    return postApi('/api/admin/users', params);
  },

  async adminUpdateUser(
    uid: string,
    payload: {
      status?: 'active' | 'suspended';
      plan?: string;
      aiCreditsUsed?: number;
      aiCreditsLimit?: number;
      creditTopUp?: number;
    }
  ): Promise<{
    ok: boolean;
    user: {
      uid: string;
      status: 'active' | 'suspended';
      plan: string;
      aiCreditsUsed: number;
      aiCreditsLimit: number;
    };
  }> {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Failed to update user (${res.status})`);
    return json;
  },

  async adminGetUserWorkspace(uid: string): Promise<{
    exists: boolean;
    user: { uid: string; email: string; displayName: string; companyName?: string };
    data: Partial<AppState> | null;
  }> {
    return getApi(`/api/admin/users/${encodeURIComponent(uid)}/workspace`);
  },

  async adminSaveUserWorkspace(uid: string, data: Partial<AppState>): Promise<{ ok: boolean }> {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/workspace`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Failed to save impersonated workspace (${res.status})`);
    return json;
  },
};

export interface CompetitorIntelResult {
  competitorName: string;
  positioningSummary: string;
  strengths: string[];
  weaknesses: string[];
  contentGaps: {
    topic: string;
    whyItWins: string;
    recommendedFormat: string;
  }[];
  counterPosts: {
    platform: 'linkedin' | 'x' | 'instagram';
    angle: string;
    content: string;
  }[];
  scrapedPage?: {
    url: string;
    title: string;
    description: string;
  } | null;
  sources: { title: string; url: string }[];
}

export interface RepurposeUrlResult {
  sourceTitle: string;
  sourceUrl?: string;
  wordCount: number;
  keyTakeaways: string[];
  linkedinPost: string;
  xThread: string[];
  instagramCarousel: {
    slides: { slideNumber: number; headline: string; body: string }[];
    caption: string;
  };
  tiktokScript: {
    hook: string;
    body: string;
    cta: string;
    estimatedSeconds: number;
  };
  newsletterBlurb: {
    subject: string;
    body: string;
  };
  hashtags: string[];
}

export interface ViralityAuditResult {
  overallScore: number;
  hookScore: number;
  clarityScore: number;
  ctaScore: number;
  verdict: string;
  strengths: string[];
  fixes: string[];
  hookVariants: {
    framework: string;
    hookLine: string;
    fullPost: string;
    whyItWorks: string;
  }[];
  diagnostics: {
    charCount: number;
    charLimit: number;
    wordCount: number;
    lineCount: number;
    hasQuestion: boolean;
    hasNumbers: boolean;
    hookLength: number;
  };
}

export interface LiveTrendsResult {
  niche: string;
  scannedAt: string;
  sources: { title: string; url: string }[];
  trends: {
    headline: string;
    whyNow: string;
    momentum: string;
    suggestedPlatform: 'linkedin' | 'x' | 'instagram' | 'tiktok';
    newsjackAngle: string;
    draftPost: string;
  }[];
}
