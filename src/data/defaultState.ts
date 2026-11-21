import avatarSarah from '../assets/images/avatar_sarah_1794611198086.jpg';
import avatarElena from '../assets/images/avatar_elena_1794611198972.jpg';
import avatarJames from '../assets/images/avatar_james_1794611199572.jpg';
import mediaWorkspace from '../assets/images/media_workspace_launch_1794611200573.jpg';
import mediaTeamCollab from '../assets/images/media_team_collab_1794611200467.jpg';
import {
  AppState,
  Workspace,
  FeatureFlag,
  ApiHealthNode,
  AiGovernanceConfig,
} from '../types';

export const MEDIA_LIBRARY = [
  { id: 'ml-1', label: 'SaaS Product Desk', tag: 'Product Launch', url: mediaWorkspace },
  { id: 'ml-2', label: 'Growth Sprint Room', tag: 'Team & Case Study', url: mediaTeamCollab },
  { id: 'ml-3', label: 'Founder Portrait', tag: 'Thought Leadership', url: avatarJames },
  { id: 'ml-4', label: 'Creative Studio Lead', tag: 'Behind the Scenes', url: avatarElena },
];

export const CANVA_TEMPLATES = [
  {
    id: 'tpl-1',
    title: '5-Step Carousel Cover',
    subtitle: 'Clean Slate + Electric Indigo Frame',
    image: mediaWorkspace,
    captionSeed:
      '5 high-leverage habits transforming B2B social teams:\n\n1. Batch 30 days by category\n2. Recycle evergreen winners\n3. Answer every DM inside 30 mins\n4. Track replies to closed revenue\n5. Automate first-comment hashtags',
  },
  {
    id: 'tpl-2',
    title: 'Client ROI Case Study',
    subtitle: 'Editorial Team Metrics Card',
    image: mediaTeamCollab,
    captionSeed:
      'Share your latest customer before-and-after results here—highlight the specific workflow shift, timeline, and measurable outcome.',
  },
  {
    id: 'tpl-3',
    title: 'Founder Hot Take Quote',
    subtitle: 'Portrait Highlight Template',
    image: avatarSarah,
    captionSeed:
      'Unpopular opinion: Consistency beats virality every quarter. Build an evergreen category system that ships even during your busiest week.',
  },
];

export const DEFAULT_WORKSPACE: Workspace = {
  id: 'ws-main',
  name: 'My Workspace',
  industry: 'Social Media & Marketing',
  handle: '@mybrand',
  plan: 'bootstrap',
  connectedPlatforms: [],
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: 'ff-1',
    key: 'enable_bluesky_integration',
    label: 'Enable Bluesky Integration',
    description: 'Expose AT Protocol Bluesky publishing & inbox syncing across workspaces.',
    enabled: true,
    rollout: 'GA',
  },
  {
    id: 'ff-2',
    key: 'enable_ai_image_generator',
    label: 'Enable AI Image Generator',
    description: 'Allow users to synthesize social post creatives directly inside Content Studio.',
    enabled: true,
    rollout: 'Agency+',
  },
  {
    id: 'ff-3',
    key: 'ai_copilot_v4',
    label: 'AI Copilot & 7-Day Strategy Wizard',
    description: 'Server-side Gemini caption repurposing & calendar auto-population.',
    enabled: true,
    rollout: 'GA',
  },
  {
    id: 'ff-4',
    key: 'whitelabel_pdf_engine',
    label: 'White-Label PDF Client Reports',
    description: 'Custom agency PDF exports for Agency Scale and Lifetime plans.',
    enabled: true,
    rollout: 'Agency+',
  },
  {
    id: 'ff-5',
    key: 'maintenance_mode',
    label: 'Maintenance Mode',
    description: 'Temporarily pause outbound scheduled publishing queues during maintenance.',
    enabled: false,
    rollout: 'Emergency Switch',
  },
];

export const DEFAULT_API_HEALTH: ApiHealthNode[] = [
  {
    id: 'api-meta',
    name: 'Meta Graph API (IG / FB)',
    provider: 'v21.0 Graph',
    status: 'operational',
    latencyMs: 0,
    rateLimitUsedPct: 0,
    rateLimitLabel: 'No live traffic',
    webhookQueueDepth: 0,
    lastTestedAt: 'Not tested',
  },
  {
    id: 'api-tiktok',
    name: 'TikTok Business API',
    provider: 'Content Posting v2',
    status: 'operational',
    latencyMs: 0,
    rateLimitUsedPct: 0,
    rateLimitLabel: 'No live traffic',
    webhookQueueDepth: 0,
    lastTestedAt: 'Not tested',
  },
  {
    id: 'api-linkedin',
    name: 'LinkedIn Marketing API',
    provider: 'REST API',
    status: 'operational',
    latencyMs: 0,
    rateLimitUsedPct: 0,
    rateLimitLabel: 'No live traffic',
    webhookQueueDepth: 0,
    lastTestedAt: 'Not tested',
  },
  {
    id: 'api-x',
    name: 'X API v2',
    provider: 'OAuth 2.0',
    status: 'operational',
    latencyMs: 0,
    rateLimitUsedPct: 0,
    rateLimitLabel: 'No live traffic',
    webhookQueueDepth: 0,
    lastTestedAt: 'Not tested',
  },
  {
    id: 'api-youtube',
    name: 'YouTube Data API v3',
    provider: 'v3 Channels & Shorts Upload',
    status: 'operational',
    latencyMs: 0,
    rateLimitUsedPct: 0,
    rateLimitLabel: 'No live traffic',
    webhookQueueDepth: 0,
    lastTestedAt: 'Not tested',
  },
  {
    id: 'api-pinterest',
    name: 'Pinterest API v5',
    provider: 'Pins & Boards v5',
    status: 'operational',
    latencyMs: 0,
    rateLimitUsedPct: 0,
    rateLimitLabel: 'No live traffic',
    webhookQueueDepth: 0,
    lastTestedAt: 'Not tested',
  },
  {
    id: 'api-cms-webhooks',
    name: 'WordPress / CMS Webhooks',
    provider: 'WP · Webflow · Shopify · Ghost',
    status: 'operational',
    latencyMs: 0,
    rateLimitUsedPct: 0,
    rateLimitLabel: 'No live traffic',
    webhookQueueDepth: 0,
    lastTestedAt: 'Not tested',
  },
  {
    id: 'api-rss-crawler',
    name: 'RSS & Trend Crawler',
    provider: 'XML / Atom / News Parser',
    status: 'operational',
    latencyMs: 0,
    rateLimitUsedPct: 0,
    rateLimitLabel: 'No live traffic',
    webhookQueueDepth: 0,
    lastTestedAt: 'Not tested',
  },
  {
    id: 'api-campaign-pixel',
    name: 'Campaign Pixel Ingestion',
    provider: 'UTM & Conversion Collector',
    status: 'operational',
    latencyMs: 0,
    rateLimitUsedPct: 0,
    rateLimitLabel: 'No live traffic',
    webhookQueueDepth: 0,
    lastTestedAt: 'Not tested',
  },
];

export const DEFAULT_MODULE_QUOTAS = {
  bootstrap: {
    youtubeChannels: 2,
    seoArticlesPerMonth: 10,
    rssAutoFeeds: 5,
    activeViralCampaigns: 2,
  },
  accelerate: {
    youtubeChannels: 5,
    seoArticlesPerMonth: 35,
    rssAutoFeeds: 20,
    activeViralCampaigns: 10,
  },
  pro_agency: {
    youtubeChannels: 25,
    seoArticlesPerMonth: 120,
    rssAutoFeeds: 100,
    activeViralCampaigns: 50,
  },
  lifetime: {
    youtubeChannels: 100,
    seoArticlesPerMonth: 500,
    rssAutoFeeds: 250,
    activeViralCampaigns: 150,
  },
};

export const DEFAULT_AI_GOVERNANCE: AiGovernanceConfig = {
  defaultModel: 'gemini-4-hydrogen',
  fallbackModel: 'gemini-2.5-flash',
  temperature: 0.65,
  costPer1kCreditsUsd: 0.42,
  tierLimits: {
    bootstrap: 5000,
    accelerate: 15000,
    pro_agency: 40000,
  },
  moduleQuotas: DEFAULT_MODULE_QUOTAS,
  systemPromptTemplate:
    'You are a principal B2B & creator social strategist. Write concise, high-retention native posts tailored to each network constraint, avoiding clickbait filler and preserving brand voice.',
};

export const DEFAULT_STATE: AppState = {
  workspaces: [DEFAULT_WORKSPACE],
  activeWorkspaceId: DEFAULT_WORKSPACE.id,
  activeRole: 'Owner',
  selectedPlan: 'bootstrap',
  darkMode: false,
  categories: [],
  connectedProfiles: [],
  teamMembers: [],
  contacts: [],
  threads: [],
  deals: [],
  posts: [],
  ads: [],
  drafts: [],
  discoveryAlerts: [],
  youtubeChannels: [],
  youtubeVideos: [],
  seoArticles: [],
  cmsConnectors: [],
  rssSources: [],
  curatedItems: [],
  ecommerceFeeds: [],
  viralCampaigns: [],
  workspaceCredits: {},
  tenants: [],
  featureFlags: DEFAULT_FEATURE_FLAGS,
  auditLogs: [],
  apiHealthNodes: DEFAULT_API_HEALTH,
  aiGovernance: DEFAULT_AI_GOVERNANCE,
  promoCodes: [],
  invoices: [],
  viewMode: 'landing',
};
