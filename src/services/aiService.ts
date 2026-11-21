import { Thread, Contact, Platform, AppState, AdPlatform } from '../types';

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<{ fallback: boolean; data?: T }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { fallback: true };
    return await res.json();
  } catch {
    return { fallback: true };
  }
}

export const aiService = {
  async generateDraftReplies(thread: Thread, contact: Contact) {
    const res = await postJson<{ professional: string; friendly: string; concise: string }>('/api/ai/reply-drafts', {
      contactName: contact.name,
      contactTitle: contact.title || contact.company,
      tags: contact.tags,
      messages: thread.messages,
    });

    if (!res.fallback && res.data) {
      return { ...res.data, isLive: true };
    }

    const firstName = contact.name.split(' ')[0];
    const lastText = thread.lastMessage.toLowerCase();
    const isPricing = lastText.includes('pric') || lastText.includes('seat') || lastText.includes('demo') || lastText.includes('quote');

    return {
      isLive: false,
      professional: isPricing
        ? `Hi ${firstName}, thank you for reaching out regarding ${contact.company || 'your team'}. I have prepared our volume breakdown and rollout timeline—would Tuesday at 10:00 AM work for a 15-minute walkthrough?`
        : `Hello ${firstName}, thank you for the message on ${thread.platform}. I have flagged this with our team so we can share the exact documentation and next steps today.`,
      friendly: isPricing
        ? `Hey ${firstName}! So glad the walkthrough resonated with your team at ${contact.company || 'your company'}. Happy to share the multi-seat bundle numbers right here or hop on a quick 15-min call this week!`
        : `Hey ${firstName}! Thanks so much for chiming in—really appreciate you reaching out. Let me grab those details for you and follow right up!`,
      concise: isPricing
        ? `Hi ${firstName} — sending our multi-seat pricing deck over shortly. Want to lock in a 15-min sync tomorrow?`
        : `Thanks ${firstName}! Looking into this now and will update you shortly.`,
    };
  },

  async summarizeAndTag(thread: Thread) {
    const res = await postJson<{
      summary: string;
      sentiment: 'positive' | 'neutral' | 'urgent' | 'negative';
      intent: 'Lead' | 'Support' | 'Feedback' | 'Other';
      suggestedTags: string[];
      sentimentScore: number;
    }>('/api/ai/summarize-thread', {
      messages: thread.messages,
    });

    if (!res.fallback && res.data) {
      return { ...res.data, isLive: true };
    }

    const text = thread.messages.map((m) => m.text).join(' ').toLowerCase();
    const isPricing = text.includes('pricing') || text.includes('seat') || text.includes('trial') || text.includes('agency') || text.includes('demo');
    const isUrgent = text.includes('broken') || text.includes('down') || text.includes('urgent') || text.includes('wait') || text.includes('stuck');

    return {
      isLive: false,
      summary: isPricing
        ? `Inbound ${thread.platform} buyer inquiry requesting multi-seat pricing, approval workflows, or onboarding timeline.`
        : isUrgent
        ? `Time-sensitive customer question on ${thread.platform} requiring immediate engineering/support follow-up.`
        : `Active community engagement on ${thread.platform} showing strong product affinity and feature curiosity.`,
      sentiment: isUrgent ? ('urgent' as const) : isPricing ? ('positive' as const) : thread.sentiment,
      intent: isPricing ? ('Lead' as const) : isUrgent ? ('Support' as const) : ('Feedback' as const),
      suggestedTags: isPricing ? ['High Intent', 'Pricing Inquiry', thread.platform] : isUrgent ? ['Priority Support', 'Escalated'] : ['Community', 'Product Advocate'],
      sentimentScore: isUrgent ? 0.38 : 0.89,
    };
  },

  async scoreLead(contact: Contact) {
    const res = await postJson<{
      score: number;
      reasoning: string;
      nextBestAction: string;
      followUpMessage: string;
    }>('/api/ai/score-lead', {
      name: contact.name,
      notes: contact.notes,
      tags: contact.tags,
      ltv: contact.ltv,
      lifecycleStage: contact.lifecycleStage,
    });

    if (!res.fallback && res.data) {
      return { ...res.data, isLive: true };
    }

    const firstName = contact.name.split(' ')[0];
    const computedScore = Math.min(98, Math.max(42, contact.leadScore + (contact.interactionHistory.length > 0 ? 4 : 0)));

    return {
      isLive: false,
      score: computedScore,
      reasoning: `${contact.name} (${contact.lifecycleStage}) shows ${contact.tags.slice(0, 2).join(' & ')} intent across ${contact.platforms.join(', ')} with $${contact.ltv.toLocaleString()} estimated LTV.`,
      nextBestAction:
        contact.lifecycleStage === 'Proposal' || contact.lifecycleStage === 'Qualified'
          ? 'Share tailored ROI breakdown & book 15-min procurement sign-off call'
          : 'Invite to interactive Evergreen Queue walkthrough & connect in CRM sequence',
      followUpMessage: `Hi ${firstName}, following up on your ${contact.platforms[0] || 'social'} note — I put together a quick 3-step rollout plan tailored for ${contact.company || 'your team'}. Open to a brief look this week?`,
    };
  },

  async repurposeContent(topic: string, tone: string = 'Professional') {
    const res = await postJson<{
      linkedin: string;
      x: string;
      instagram: string;
      tiktok: string;
      hashtags: string[];
    }>('/api/ai/repurpose', { topic, tone });

    if (!res.fallback && res.data) {
      return { ...res.data, isLive: true };
    }

    const cleanTopic = topic.trim() || 'Evergreen social workflows & Social CRM alignment';
    return {
      isLive: false,
      linkedin: `Most revenue teams treat social publishing and CRM pipeline as two separate worlds.\n\nWhen we unified ${cleanTopic} inside one category-driven calendar + inbox:\n• Evergreen posts filled 65% of weekly slots automatically\n• Warm DM inquiries routed straight into qualified pipeline stages\n• Team approvals dropped from 3 days to 20 minutes\n\nWhat is the biggest bottleneck in your social workflow right now?`,
      x: `Stop letting high-performing posts die after 24 hours.\n\nWith ${cleanTopic}:\n1. Bucket content into color-coded queues\n2. Recycle evergreen winners on autopilot\n3. Route every reply straight to your CRM pipeline\n\nShip once. Compound every week.`,
      instagram: `Behind our highest-converting workflow: ${cleanTopic}.\n\nSwipe through how modern teams turn daily comments and DMs into measurable pipeline without burning out on manual scheduling. Save this checklist for Monday's content sprint!`,
      tiktok: `[HOOK 0-3s]: "You spent 4 hours writing that post—why did you only share it once?"\n[BODY 3-20s]: Show how ${cleanTopic} keeps top educational posts rotating on autopilot while capturing every warm lead in one inbox.\n[CTA 20-25s]: "Comment 'QUEUE' if you want our weekly slot template."`,
      hashtags: ['#SocialCRM', '#ContentStrategy', '#EvergreenContent', '#B2BGrowth'],
    };
  },

  async generateBulkContent(topic: string, audience: string, tone: string, platforms: Platform[]) {
    const res = await postJson<{ drafts: { platform: string; content: string }[] }>('/api/ai/bulk-drafts', {
      topic,
      audience,
      tone,
      platforms,
    });

    if (!res.fallback && res.data) {
      return { ...res.data, isLive: true };
    }

    const selected = platforms.length ? platforms : (['linkedin', 'x', 'instagram'] as Platform[]);
    const angles = [
      `Framework breakdown for ${audience}: 3 ways ${topic} eliminates manual busywork (${tone} angle).`,
      `Unpopular opinion for ${audience}: why consistency in ${topic} beats viral one-offs every quarter.`,
      `Step-by-step checklist: How top teams structure ${topic} in under 30 minutes per week.`,
      `Customer lesson: What changed when our team paired ${topic} with unified Social CRM tracking.`,
      `Behind the scenes: The exact 3-step template we use for ${topic} every Monday morning.`,
      `Myth vs. Reality for ${audience}: Stop overcomplicating ${topic} and focus on this 1 metric instead.`,
      `Quick question for ${audience}: Which part of ${topic} takes your team the longest today?`,
    ];

    return {
      isLive: false,
      drafts: angles.map((text, idx) => ({
        platform: selected[idx % selected.length],
        content: text,
      })),
    };
  },

  async generateAdCopy(platform: AdPlatform, objective: string, audience: string) {
    const res = await postJson<{
      variations: { headline: string; primaryText: string; cta: string; creativeConcept: string }[];
    }>('/api/ai/ad-copy', { platform, objective, audience });

    if (!res.fallback && res.data) {
      return { ...res.data, isLive: true };
    }

    return {
      isLive: false,
      variations: [
        {
          headline: `${objective}: Scale ${audience} Pipeline 3x Faster`,
          primaryText: `Replace disconnected schedulers and messy spreadsheets. Automate evergreen queues and capture every high-intent reply inside socialifyai.com.`,
          cta: 'Start Free 14-Day Trial',
          creativeConcept: `${platform.toUpperCase()} split-screen showing an overflowing spreadsheet transforming into a clean Category Queue calendar.`,
        },
        {
          headline: `Built for ${audience} Who Ship Daily`,
          primaryText: `Save 11+ hours a week with AI post variations, approval workflows, and unified DM-to-CRM attribution across 8 networks.`,
          cta: 'Book Live Demo',
          creativeConcept: 'Founder-led 15s vertical walkthrough highlighting 1-click AI reply drafts + deal stage movement.',
        },
        {
          headline: `Turn Comments Into Closed-Won Revenue`,
          primaryText: `Stop missing warm leads in Instagram & LinkedIn comments. Track sentiment, auto-tag prospects, and measure real ROAS.`,
          cta: 'Launch Workspace',
          creativeConcept: 'Clean macro UI card animation tracking a LinkedIn DM becoming a Won deal.',
        },
      ],
    };
  },

  async askAnalyst(data: AppState, query: string) {
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

    const res = await postJson<{ answer: string }>('/api/ai/analyst', { summary, query });
    if (!res.fallback && res.data?.answer) {
      return res.data.answer;
    }

    const q = query.toLowerCase();
    if (q.includes('roas') || q.includes('ad') || q.includes('spend')) {
      if (wsAds.length === 0) {
        return 'No ad campaigns have been created in this workspace yet. Launch a campaign in Ad Manager to track real spend, clicks, and ROAS.';
      }
      return `Across ${wsAds.length} tracked campaign${wsAds.length === 1 ? '' : 's'} ($${totalAdSpend.toLocaleString()} total spend), blended ROAS is ${avgRoas}x.`;
    }
    if (q.includes('pipeline') || q.includes('deal') || q.includes('revenue') || q.includes('crm')) {
      if (wsDeals.length === 0) {
        return 'No CRM deals are recorded in this workspace yet. Add contacts and deals in Social CRM to track pipeline value and closed revenue.';
      }
      return `Active workspace pipeline totals $${pipelineValue.toLocaleString()} across ${wsDeals.length} deal${wsDeals.length === 1 ? '' : 's'}, with $${wonValue.toLocaleString()} Closed-Won and ${wsThreads.filter((t) => t.status === 'open').length} open inbox thread${wsThreads.filter((t) => t.status === 'open').length === 1 ? '' : 's'}.`;
    }
    const publishedCount = wsPosts.filter((p) => p.status === 'published').length;
    if (publishedCount === 0 && wsDeals.length === 0 && wsAds.length === 0) {
      return 'No published posts, ad campaigns, or CRM deals exist in this workspace yet. Connect a profile and publish content to see live performance insights.';
    }
    return `This workspace has ${publishedCount} published post${publishedCount === 1 ? '' : 's'} (${totalReach.toLocaleString()} impressions, ${totalEngagement.toLocaleString()} engagements), $${pipelineValue.toLocaleString()} in CRM pipeline, and ${avgRoas}x blended Ad ROAS.`;
  },

  async analyzeCompetitor(params: { yourBrand: string; competitor: string; niche: string }): Promise<{
    isLive: boolean;
    data: CompetitorIntelResult;
  }> {
    const res = await fetch('/api/tools/competitor-intel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Competitor analysis failed.');
    }
    return { isLive: !json.fallback, data: json.data };
  },

  async repurposeFromUrlOrText(params: {
    url?: string;
    rawText?: string;
    tone: string;
    ctaGoal: string;
  }): Promise<{ isLive: boolean; data: RepurposeUrlResult }> {
    const res = await fetch('/api/tools/repurpose-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Could not repurpose this source.');
    }
    return { isLive: !json.fallback, data: json.data };
  },

  async auditPostVirality(params: {
    content: string;
    platform: Platform;
    audience: string;
  }): Promise<{ isLive: boolean; data: ViralityAuditResult }> {
    const res = await fetch('/api/tools/virality-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Could not audit draft copy.');
    }
    return { isLive: !json.fallback, data: json.data };
  },

  async discoverLiveTrends(params: {
    niche: string;
    region: string;
    audience: string;
  }): Promise<{ isLive: boolean; data: LiveTrendsResult }> {
    const res = await fetch('/api/tools/live-trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Trend radar scan failed.');
    }
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
    const res = await fetch('/api/ai/youtube-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'ideation', ...params }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'YouTube ideation failed.');
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
    const res = await fetch('/api/ai/youtube-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'pipeline', ...params }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'YouTube script pipeline failed.');
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
    const res = await fetch('/api/ai/seo-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'SEO article generation failed.');
    return json.data;
  },

  async publishArticleToCms(params: {
    provider: string;
    endpointUrl: string;
    article: Record<string, unknown>;
  }): Promise<{ ok: boolean; dispatched: boolean; httpStatus: number; publishedAt: string; note?: string }> {
    const res = await fetch('/api/cms/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'CMS publish failed.');
    return json;
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
    const res = await fetch('/api/discover/fetch-rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'RSS import failed.');
    return json;
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
    const res = await fetch('/api/discover/explore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Viral discovery search failed.');
    return json;
  },

  async repurposeCuratedItem(params: {
    title: string;
    summary: string;
    url?: string;
    platform: Platform;
    brandVoice: string;
    utmCampaign?: string;
  }): Promise<{ content: string; firstComment: string; trackedUrl: string }> {
    const res = await fetch('/api/discover/repurpose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'AI repurpose failed.');
    return json.data;
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

