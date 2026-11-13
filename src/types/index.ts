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

export type TeamRole = 'Owner' | 'Manager' | 'Publisher' | 'Contributor';

export type PlanTier =
  | 'bootstrap'
  | 'accelerate'
  | 'pro_agency'
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
}

export interface TeamMember {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: TeamRole;
  avatar: string;
  status: 'active' | 'invited';
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

export type PostStatus = 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'published';

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
  tenants: TenantAccount[];
  featureFlags: FeatureFlag[];
  auditLogs: AdminAuditEntry[];
  apiHealthNodes: ApiHealthNode[];
  aiGovernance: AiGovernanceConfig;
  promoCodes: PromoCode[];
  invoices: InvoiceRecord[];
  viewMode: ViewMode;
}
