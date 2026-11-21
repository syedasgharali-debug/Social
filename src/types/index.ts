export type Platform =
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'x'
  | 'facebook'
  | 'youtube'
  | 'pinterest'
  | 'threads'
  | 'bluesky'
  | 'gbp';

export type Sentiment = 'positive' | 'neutral' | 'urgent' | 'negative';

export type MessageStatus = 'open' | 'snoozed' | 'resolved';

export type TeamRole =
  | 'Owner'
  | 'Admin'
  | 'Editor'
  | 'Client Approver'
  | 'Manager'
  | 'Publisher'
  | 'Contributor';

export type PlanTier =
  | 'bootstrap'
  | 'accelerate'
  | 'pro_agency'
  | 'lifetime'
  | 'pro50'
  | 'pro100'
  | 'pro150';

export type ViewMode = 'landing' | 'app' | 'admin';

export interface Workspace {
  id: string;
  name: string;
  industry: string;
  handle: string;
  plan: PlanTier;
  connectedPlatforms: Platform[];
}

export interface ConnectedProfile {
  id: string;
  workspaceId: string;
  platform: Platform;
  accountName: string;
  handle: string;
  followers: number;
  status: 'connected' | 'needs_reauth' | 'disconnected';
  lastSynced: string;
  authMethod?: 'oauth2' | 'app_password' | 'manual';
  authType?: 'oauth2' | 'atproto' | 'manual';
  displayName?: string;
  connectionId?: string;
  externalId?: string;
  externalAccountId?: string;
  connectedAt?: string;
  tokenExpiresAt?: string;
  scopes?: string[];
  lastTestedAt?: string;
  lastVerifiedAt?: string;
}

export interface TeamMemberPermissions {
  canPublish: boolean;
  canApprove: boolean;
  canManageTeam: boolean;
  canConnectProfiles: boolean;
}

export interface TeamMember {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: TeamRole;
  avatar: string;
  status: 'active' | 'invited';
  permissions?: TeamMemberPermissions;
  invitedAt?: string;
}

export interface ApprovalAuditEntry {
  id: string;
  workspaceId: string;
  postId: string;
  postSnippet?: string;
  action: 'approved' | 'changes_requested' | 'rejected' | 'submitted';
  actor?: string;
  actorName?: string;
  role?: TeamRole;
  actorRole?: TeamRole;
  note?: string;
  timestamp?: string;
  createdAt?: string;
}

export interface ContentCategory {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  evergreenEnabled: boolean;
  postsPerWeek: number;
  timeSlots: { day: string; time: string }[];
}

export interface Interaction {
  id: string;
  type: 'dm' | 'comment' | 'mention' | 'email';
  content: string;
  timestamp: string;
  platform?: Platform;
}

export interface Contact {
  id: string;
  workspaceId: string;
  name: string;
  handle: string;
  title?: string;
  company?: string;
  email: string;
  avatar: string;
  platforms: Platform[];
  leadScore: number;
  ltv: number;
  lifecycleStage: 'Lead' | 'Qualified' | 'Proposal' | 'Customer' | 'Advocate';
  tags: string[];
  interactionHistory: Interaction[];
  notes: string;
  dealId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  isInternalNote?: boolean;
}

export interface Thread {
  id: string;
  workspaceId: string;
  contactId: string;
  platform: Platform;
  type: 'dm' | 'comment' | 'mention';
  status: MessageStatus;
  sentiment: Sentiment;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  messages: Message[];
  summary?: string;
}

export type DealStage = 'new_lead' | 'qualified' | 'proposal_sent' | 'won' | 'lost';

export interface Deal {
  id: string;
  workspaceId: string;
  contactId: string;
  title: string;
  value: number;
  stage: DealStage;
  probability: number;
  expectedCloseDate: string;
}

export type PostStatus = 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'published' | 'rejected';

export interface SocialPost {
  id: string;
  workspaceId: string;
  categoryId?: string;
  platforms: Platform[];
  content: string;
  platformVariations?: Partial<Record<Platform, string>>;
  firstComment?: string;
  media?: string[];
  igGridOrder?: number;
  status: PostStatus;
  approvalNote?: string;
  isEvergreen?: boolean;
  maxShares?: number;
  shareCount?: number;
  scheduledAt: string;
  analytics?: {
    reach: number;
    engagement: number;
    clicks: number;
  };
}

export type AdPlatform = 'tiktok' | 'meta' | 'google';

export interface AdCampaign {
  id: string;
  workspaceId: string;
  name: string;
  platform: AdPlatform;
  status: 'active' | 'paused';
  objective: string;
  audience: string;
  adCopy?: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  roas: number;
  ctr: number;
  conversions: number;
}

export type DraftStatus = 'idea' | 'ai_draft' | 'needs_review' | 'ready';

export interface Draft {
  id: string;
  workspaceId: string;
  categoryId?: string;
  topic: string;
  platforms: Platform[];
  content: string;
  status: DraftStatus;
  createdAt: string;
}

export interface DiscoveryAlert {
  id: string;
  workspaceId: string;
  keyword: string;
  niche: string;
  source: string;
  title: string;
  summary: string;
  velocity: string;
  trendScore: number;
  isSpike: boolean;
  acknowledged: boolean;
  publishedAt: string;
}

export interface TenantAccount {
  id: string;
  orgName: string;
  ownerName: string;
  ownerEmail: string;
  plan: PlanTier;
  mrr: number;
  profilesUsed: number;
  profilesLimit: number;
  workspacesCount: number;
  aiCreditsUsed: number;
  aiCreditsLimit: number;
  status: 'active' | 'trial' | 'past_due' | 'suspended';
  joinedAt: string;
  linkedWorkspaceId?: string;
  uid?: string;
}

export interface ApiHealthNode {
  id: string;
  name: string;
  provider: string;
  status: 'operational' | 'degraded';
  latencyMs: number;
  rateLimitUsedPct: number;
  rateLimitLabel: string;
  webhookQueueDepth: number;
  lastTestedAt: string;
}

export interface PlanModuleQuota {
  youtubeChannels: number;
  seoArticlesPerMonth: number;
  rssAutoFeeds: number;
  activeViralCampaigns: number;
}

export interface AiGovernanceConfig {
  defaultModel: 'gemini-4-hydrogen' | 'gemini-2.5-flash' | 'gemini-2.5-pro';
  fallbackModel: string;
  temperature: number;
  costPer1kCreditsUsd: number;
  tierLimits: {
    bootstrap: number;
    accelerate: number;
    pro_agency: number;
  };
  moduleQuotas?: {
    bootstrap: PlanModuleQuota;
    accelerate: PlanModuleQuota;
    pro_agency: PlanModuleQuota;
    lifetime: PlanModuleQuota;
  };
  systemPromptTemplate: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discountPct: number;
  duration: 'once' | '3_months' | 'forever';
  redemptions: number;
  maxRedemptions: number;
  active: boolean;
  createdAt: string;
}

export interface InvoiceRecord {
  id: string;
  stripeId: string;
  customerOrg: string;
  customerEmail: string;
  planLabel: string;
  amount: number;
  promoApplied?: string;
  status: 'paid' | 'past_due' | 'refunded';
  issuedAt: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  rollout: string;
}

export interface AdminAuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: 'info' | 'success' | 'warning';
}

// =============================================================================
// Module 1: AI YouTube Multi-Channel & Video Studio
// =============================================================================
export interface YouTubeChannel {
  id: string;
  workspaceId: string;
  channelName: string;
  handle: string;
  channelId: string;
  niche: string;
  subscribers: number;
  watchHours30d: number;
  dailyUploadQuotaUsed: number;
  dailyUploadQuotaLimit: number;
  defaultPlaylist: string;
  playlists: string[];
  status: 'connected' | 'needs_reauth';
  createdAt: string;
}

export interface YouTubeVideoItem {
  id: string;
  workspaceId: string;
  channelId: string;
  format: 'long_form' | 'short';
  topic: string;
  seoTitles: string[];
  selectedTitle: string;
  description: string;
  script: {
    hook: string;
    body: string;
    cta: string;
  };
  chapters: { timestamp: string; label: string }[];
  tags: string[];
  pinnedComment: string;
  thumbnailPrompt: string;
  thumbnailHeadline: string;
  thumbnailAccent: 'cyan' | 'orange' | 'indigo' | 'emerald';
  thumbnailUrl?: string;
  playlist: string;
  status: 'idea' | 'scripted' | 'queued' | 'scheduled' | 'published';
  scheduledAt?: string;
  crossPostedPlatforms?: Platform[];
  createdAt: string;
}

// =============================================================================
// Module 2: AI SEO Content & Blog CMS Engine
// =============================================================================
export type CmsProvider = 'wordpress' | 'webflow' | 'shopify' | 'ghost' | 'webhook';

export interface CmsConnector {
  id: string;
  workspaceId: string;
  provider: CmsProvider;
  label: string;
  endpointUrl: string;
  authHeaderHint?: string;
  status: 'connected' | 'disconnected';
  autoSyndicateDefault: boolean;
  lastPublishedAt?: string;
  lastHttpStatus?: number;
  lastPublishedUrl?: string;
  lastError?: string;
}

export interface SeoArticleSection {
  heading: string;
  level: 'h2' | 'h3';
  body: string;
  visualAlt?: string;
  visualCaption?: string;
  visualType?: 'infographic' | 'diagram' | 'callout';
}

export interface SeoArticle {
  id: string;
  workspaceId: string;
  targetKeyword: string;
  sourceUrl?: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  sections: SeoArticleSection[];
  heroImageAlt: string;
  heroVisualAccent: 'cyan' | 'orange' | 'indigo';
  schemaFaq: { question: string; answer: string }[];
  internalLinks: { anchor: string; suggestedSlug: string; rationale: string }[];
  wordCount: number;
  readabilityScore: number;
  seoScore: number;
  estimatedMonthlyTraffic: number;
  status: 'draft' | 'published';
  publishedCms?: CmsProvider;
  autoSyndicateSocial: boolean;
  syndicatedPostIds?: string[];
  socialBundle?: {
    linkedinCarousel: string;
    xThread: string;
    instagramCaption: string;
    facebookPost: string;
  };
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Module 3: Viral Content Discovery & RSS Automation
// =============================================================================
export interface RssSource {
  id: string;
  workspaceId: string;
  name: string;
  feedUrl: string;
  sourceType: 'rss' | 'youtube' | 'blog' | 'reddit';
  keywordFilter: string;
  automationRule: 'manual' | 'auto_draft' | 'evergreen_queue';
  targetCategoryId?: string;
  targetPlatforms: Platform[];
  active: boolean;
  itemsImported: number;
  lastFetchedAt?: string;
  createdAt: string;
}

export interface CuratedFeedItem {
  id: string;
  workspaceId: string;
  sourceId?: string;
  sourceName: string;
  channel: 'youtube' | 'x' | 'reddit' | 'news' | 'blog' | 'rss';
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  velocityLabel: string;
  repurposed?: boolean;
}

export interface EcommerceProduct {
  id: string;
  title: string;
  price: string;
  compareAtPrice?: string;
  url: string;
  category: string;
}

export interface EcommerceFeed {
  id: string;
  workspaceId: string;
  platform: 'shopify' | 'woocommerce';
  storeName: string;
  feedUrl: string;
  status: 'connected' | 'paused';
  products: EcommerceProduct[];
  lastSyncedAt?: string;
}

// =============================================================================
// Module 4: Viral Campaigns, Contests & ROI Tracker
// =============================================================================
export type ViralCampaignType = 'sweepstakes' | 'ugc_contest' | 'referral_giveaway' | 'instant_win';

export interface CampaignBonusAction {
  id: string;
  platform: Platform | 'referral' | 'ugc';
  label: string;
  points: number;
  enabled: boolean;
}

export interface CampaignEntry {
  id: string;
  name: string;
  email: string;
  handle: string;
  platform: Platform;
  entriesPoints: number;
  referralsCount: number;
  completedActions: string[];
  ugcUrl?: string;
  ipFingerprint: string;
  fraudStatus: 'verified' | 'flagged_duplicate' | 'flagged_bot';
  syncedToCrm: boolean;
  estimatedLtv: number;
  submittedAt: string;
}

export interface CampaignWinner {
  entryId: string;
  name: string;
  email: string;
  pickedAt: string;
  verificationHash: string;
}

export interface ViralCampaign {
  id: string;
  workspaceId: string;
  name: string;
  type: ViralCampaignType;
  status: 'draft' | 'live' | 'ended';
  prizeTitle: string;
  prizeValueUsd: number;
  description: string;
  accentColor: 'cyan' | 'orange' | 'indigo';
  startDate: string;
  endDate: string;
  embedMode: 'hosted' | 'embeddable';
  slug: string;
  bonusActions: CampaignBonusAction[];
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  pixelId: string;
  attributedRevenueUsd: number;
  entries: CampaignEntry[];
  winners: CampaignWinner[];
  createdAt: string;
}

export interface AppState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeRole: TeamRole;
  selectedPlan: PlanTier;
  darkMode: boolean;
  categories: ContentCategory[];
  connectedProfiles: ConnectedProfile[];
  teamMembers: TeamMember[];
  contacts: Contact[];
  threads: Thread[];
  deals: Deal[];
  posts: SocialPost[];
  ads: AdCampaign[];
  drafts: Draft[];
  discoveryAlerts: DiscoveryAlert[];
  youtubeChannels: YouTubeChannel[];
  youtubeVideos: YouTubeVideoItem[];
  seoArticles: SeoArticle[];
  cmsConnectors: CmsConnector[];
  rssSources: RssSource[];
  curatedItems: CuratedFeedItem[];
  ecommerceFeeds: EcommerceFeed[];
  viralCampaigns: ViralCampaign[];
  workspaceCredits: Record<string, number>;
  approvalAuditLogs?: ApprovalAuditEntry[];
  tenants: TenantAccount[];
  featureFlags: FeatureFlag[];
  auditLogs: AdminAuditEntry[];
  apiHealthNodes: ApiHealthNode[];
  aiGovernance: AiGovernanceConfig;
  promoCodes: PromoCode[];
  invoices: InvoiceRecord[];
  viewMode: ViewMode;
}
