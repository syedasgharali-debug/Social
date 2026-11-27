import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface AcademyBearerUser {
  uid: string;
  email: string;
  displayName?: string;
}

export interface AcademyCategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyStepRecord {
  title: string;
  detail: string;
}

export interface AcademyTutorialRecord {
  id: string;
  videoId: string;
  youtubeUrl: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  thumbnailUrl: string;
  duration: string;
  categoryId: string;
  keywords: string[];
  learningObjectives: string[];
  steps: AcademyStepRecord[];
  tips: string[];
  order: number;
  published: boolean;
  featured?: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyUserProgressRecord {
  userId: string;
  completedTutorialIds: string[];
  watchedTutorialIds: string[];
  recentTutorialIds: string[];
  lastWatchedTutorialId: string | null;
  lastWatchedAt: string | null;
  updatedAt: string;
}

interface AcademyStoreFile {
  channelUrl: string;
  channelId: string;
  categories: AcademyCategoryRecord[];
  tutorials: AcademyTutorialRecord[];
  progressByUser: Record<string, AcademyUserProgressRecord>;
}

const OFFICIAL_CHANNEL_URL = 'https://www.youtube.com/@socialifyaicom';
const OFFICIAL_CHANNEL_ID = 'UC1vKrFdeglBbjqMMluPj8qg';
const OFFICIAL_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${OFFICIAL_CHANNEL_ID}`;
const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const SUPER_ADMIN_EMAIL = 'essadhiif@gmail.com';

let cachedFirebaseCerts: Record<string, string> | null = null;
let cachedFirebaseCertsExpiresAt = 0;

function getFirebaseProjectId(): string {
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { projectId?: string };
      if (cfg?.projectId) return cfg.projectId;
    }
  } catch {
    // fallback below
  }
  return 'gen-lang-client-0915498446';
}

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedFirebaseCerts && now < cachedFirebaseCertsExpiresAt) {
    return cachedFirebaseCerts;
  }
  const res = await fetch(FIREBASE_CERTS_URL);
  if (!res.ok) {
    if (cachedFirebaseCerts) return cachedFirebaseCerts;
    throw new Error(`Failed to fetch Firebase public keys (${res.status})`);
  }
  const certs = (await res.json()) as Record<string, string>;
  const cc = res.headers.get('cache-control') || '';
  const maxAgeMatch = cc.match(/max-age=(\d+)/i);
  const ttlMs = maxAgeMatch ? Math.max(60, Number(maxAgeMatch[1])) * 1000 : 3600 * 1000;
  cachedFirebaseCerts = certs;
  cachedFirebaseCertsExpiresAt = now + ttlMs;
  return certs;
}

function decodeBase64UrlJson<T>(segment: string): T | null {
  try {
    const pad = segment.length % 4 === 0 ? '' : '='.repeat(4 - (segment.length % 4));
    const b64 = segment.replace(/-/g, '+').replace(/_/g, '/') + pad;
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as T;
  } catch {
    return null;
  }
}

interface VerifiedFirebaseUser extends AcademyBearerUser {
  isFirebaseSuperAdmin: boolean;
}

async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseUser | null> {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;
  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerB64);
  const payload = decodeBase64UrlJson<{
    aud?: string;
    iss?: string;
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    exp?: number;
    iat?: number;
  }>(payloadB64);

  if (!header || !payload || header.alg !== 'RS256' || !header.kid) return null;

  const projectId = getFirebaseProjectId();
  const nowSec = Math.floor(Date.now() / 1000);
  if (
    payload.aud !== projectId ||
    payload.iss !== `https://securetoken.google.com/${projectId}` ||
    typeof payload.sub !== 'string' ||
    !payload.sub ||
    typeof payload.exp !== 'number' ||
    payload.exp <= nowSec ||
    (typeof payload.iat === 'number' && payload.iat > nowSec + 300)
  ) {
    return null;
  }

  try {
    const certs = await getFirebasePublicCerts();
    const cert = certs[header.kid];
    if (!cert) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();

    const pad = sigB64.length % 4 === 0 ? '' : '='.repeat(4 - (sigB64.length % 4));
    const sigBuf = Buffer.from(sigB64.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
    if (!verifier.verify(cert, sigBuf)) return null;

    const email = String(payload.email || '').trim().toLowerCase();
    return {
      uid: payload.sub,
      email,
      displayName: payload.name || email.split('@')[0] || 'User',
      isFirebaseSuperAdmin: Boolean(payload.email_verified === true && email === SUPER_ADMIN_EMAIL),
    };
  } catch {
    return null;
  }
}

const ALLOWED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeVideoId(input: string): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (VIDEO_ID_REGEX.test(raw)) return raw;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_YOUTUBE_HOSTS.has(host)) return null;

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    const seg = parsed.pathname.replace(/^\/+/, '').split('/')[0] || '';
    return VIDEO_ID_REGEX.test(seg) ? seg : null;
  }

  const vParam = parsed.searchParams.get('v');
  if (vParam && VIDEO_ID_REGEX.test(vParam)) return vParam;

  const pathMatch = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})(?:\/|$)/);
  if (pathMatch && VIDEO_ID_REGEX.test(pathMatch[1])) return pathMatch[1];

  return null;
}

function slugify(value: string): string {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || `cat-${Date.now()}`;
}

function sanitizeText(value: unknown, maxLen: number): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLen);
}

function sanitizeStringList(value: unknown, maxItems: number, maxItemLen: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const clean = sanitizeText(item, maxItemLen);
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      result.push(clean);
      if (result.length >= maxItems) break;
    }
  }
  return result;
}

function sanitizeSteps(value: unknown): AcademyStepRecord[] {
  if (!Array.isArray(value)) return [];
  const steps: AcademyStepRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const title = sanitizeText(obj.title, 160);
    const detail = sanitizeText(obj.detail, 1200);
    if (title || detail) {
      steps.push({ title: title || `Step ${steps.length + 1}`, detail });
      if (steps.length >= 30) break;
    }
  }
  return steps;
}

function decodeXmlEntities(str: string): string {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function formatIsoDuration(iso: string): string {
  const m = String(iso || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return '';
  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  const sec = Number(m[3] || 0);
  if (!h && !min && !sec) return '';
  const secStr = String(sec).padStart(2, '0');
  if (h > 0) {
    return `${h}:${String(min).padStart(2, '0')}:${secStr}`;
  }
  return `${min}:${secStr}`;
}

function extractObjectivesFromDescription(description: string): string[] {
  const lines = description
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const markerIdx = lines.findIndex((l) => /^in this video/i.test(l));
  if (markerIdx === -1) return [];
  return lines
    .slice(markerIdx + 1)
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter((l) => l.length > 8 && l.length <= 320)
    .slice(0, 8);
}

function getDefaultAcademyStore(): AcademyStoreFile {
  const seedTs = '2026-11-27T20:30:00.000Z';

  const categories: AcademyCategoryRecord[] = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      slug: 'getting-started',
      description: 'Core platform tours covering SocialifyAI features and navigating your workspace dashboard.',
      order: 1,
      createdAt: seedTs,
      updatedAt: seedTs,
    },
    {
      id: 'account-team-setup',
      name: 'Account & Team Setup',
      slug: 'account-team-setup',
      description: 'Connecting social profiles, inviting teammates, and configuring role-based access permissions.',
      order: 2,
      createdAt: seedTs,
      updatedAt: seedTs,
    },
    {
      id: 'youtube-content',
      name: 'YouTube & Content Workflows',
      slug: 'youtube-content',
      description: 'Understanding YouTube Studio, Content Manager (CMS), and external social content workflows.',
      order: 3,
      createdAt: seedTs,
      updatedAt: seedTs,
    },
    {
      id: 'inbox-crm',
      name: 'Unified Inbox & Social CRM',
      slug: 'inbox-crm',
      description: 'Triaging comments, DMs, and mentions while tracking Social CRM analytics and response metrics.',
      order: 4,
      createdAt: seedTs,
      updatedAt: seedTs,
    },
    {
      id: 'ads-campaigns',
      name: 'Ads & Campaigns',
      slug: 'ads-campaigns',
      description: 'Launching, organizing, and tracking paid social campaigns inside the integrated Ads Manager.',
      order: 5,
      createdAt: seedTs,
      updatedAt: seedTs,
    },
  ];

  // Authentic official tutorials directly from https://www.youtube.com/@socialifyaicom
  const tutorials: AcademyTutorialRecord[] = [
    {
      id: 'tut-u0_zAIO4b0c',
      videoId: 'u0_zAIO4b0c',
      youtubeUrl: 'https://www.youtube.com/watch?v=u0_zAIO4b0c',
      title: 'Explore Socialifyais AI Powered Social Media Features',
      shortDescription:
        'See how SocialifyAI brings AI social media publishing and Unified Social CRM Inbox together into one practical daily workflow.',
      fullDescription:
        "Managing social channels and keeping up with comments, mentions, and DMs gets messy fast—especially when real leads get buried in the noise. In this video, we walk through how SocialifyAI brings AI social media management and Social CRM together into a single, practical workflow.\n\nIn this video:\n\nAI Content & Publishing: Drafting platform-tailored posts, keeping brand voice consistent, and organizing your content calendar\n\nUnified Social CRM Inbox: Triaging messages, spotting high-intent replies, and routing conversations without dropping threads\n\nPerformance & Next Steps: Reviewing what resonates so your next batch of content and outreach is sharper",
      thumbnailUrl: 'https://i.ytimg.com/vi/u0_zAIO4b0c/hqdefault.jpg',
      duration: '',
      categoryId: 'getting-started',
      keywords: ['ai', 'social media', 'social crm', 'publishing', 'content calendar', 'inbox', 'overview'],
      learningObjectives: [
        'AI Content & Publishing: Drafting platform-tailored posts, keeping brand voice consistent, and organizing your content calendar',
        'Unified Social CRM Inbox: Triaging messages, spotting high-intent replies, and routing conversations without dropping threads',
        'Performance & Next Steps: Reviewing what resonates so your next batch of content and outreach is sharper',
      ],
      steps: [],
      tips: [],
      order: 1,
      published: true,
      featured: true,
      publishedAt: '2026-11-27T20:16:40+00:00',
      createdAt: seedTs,
      updatedAt: seedTs,
    },
    {
      id: 'tut-Y45VLnR-XkM',
      videoId: 'Y45VLnR-XkM',
      youtubeUrl: 'https://www.youtube.com/watch?v=Y45VLnR-XkM',
      title: 'Navigate and Understand Dashboard Overview Features',
      shortDescription:
        'Get oriented inside your SocialifyAI workspace—locate connected channels, performance snapshots, and daily Social CRM shortcuts.',
      fullDescription:
        "Getting oriented inside a new workspace shouldn't slow you down. In this walkthrough, we show you how to navigate and understand the Dashboard Overview features inside SocialifyAI—so you can track performance, monitor audience conversations, and jump straight into your daily social media and Social CRM tasks.\n\nIn this video, we cover:\n\nDashboard layout & navigation: Where to find your connected channels, quick actions, and workspace views\n\nKey metrics & performance snapshots: Reading engagement, reach, and audience activity at a glance\n\nSocial CRM & workflow shortcuts: Checking incoming messages, upcoming scheduled posts, and priority follow-ups from one screen",
      thumbnailUrl: 'https://i.ytimg.com/vi/Y45VLnR-XkM/hqdefault.jpg',
      duration: '',
      categoryId: 'getting-started',
      keywords: ['dashboard', 'overview', 'navigation', 'metrics', 'workspace', 'shortcuts', 'onboarding'],
      learningObjectives: [
        'Dashboard layout & navigation: Where to find your connected channels, quick actions, and workspace views',
        'Key metrics & performance snapshots: Reading engagement, reach, and audience activity at a glance',
        'Social CRM & workflow shortcuts: Checking incoming messages, upcoming scheduled posts, and priority follow-ups from one screen',
      ],
      steps: [],
      tips: [],
      order: 2,
      published: true,
      featured: false,
      publishedAt: '2026-11-27T20:21:32+00:00',
      createdAt: seedTs,
      updatedAt: seedTs,
    },
    {
      id: 'tut-H7NcOt3ud1I',
      videoId: 'H7NcOt3ud1I',
      youtubeUrl: 'https://www.youtube.com/watch?v=H7NcOt3ud1I',
      title: 'Manage Team Roles and Connect Social Profiles in Socialifyai',
      shortDescription:
        'Link social accounts securely, invite teammates without sharing passwords, and assign role-based permissions across workspaces.',
      fullDescription:
        'Setting up your workspace the right way from day one keeps your team fast and your brand accounts secure. In this walkthrough, we show you how to manage team roles and connect social profiles in SocialifyAI—so every teammate gets the exact permissions they need while your channels stay organized in one hub.\n\nIn this video, we cover:\n\nConnecting social profiles: Linking your social accounts cleanly, checking connection permissions, and managing multiple brands or workspaces\n\nInviting team members: Adding teammates without sharing raw social logins or passwords\n\nManaging team roles & access: Assigning role-based permissions for admins, editors, community managers, and viewers\n\nBest practices: Keeping approval flows clean and reviewing connected account health',
      thumbnailUrl: 'https://i.ytimg.com/vi/H7NcOt3ud1I/hqdefault.jpg',
      duration: '',
      categoryId: 'account-team-setup',
      keywords: ['team', 'roles', 'permissions', 'connect profiles', 'social accounts', 'approvals', 'security'],
      learningObjectives: [
        'Connecting social profiles: Linking your social accounts cleanly, checking connection permissions, and managing multiple brands or workspaces',
        'Inviting team members: Adding teammates without sharing raw social logins or passwords',
        'Managing team roles & access: Assigning role-based permissions for admins, editors, community managers, and viewers',
        'Best practices: Keeping approval flows clean and reviewing connected account health',
      ],
      steps: [],
      tips: [],
      order: 3,
      published: true,
      featured: false,
      publishedAt: '2026-11-27T20:27:06+00:00',
      createdAt: seedTs,
      updatedAt: seedTs,
    },
    {
      id: 'tut-FxW1fAjKgk4',
      videoId: 'FxW1fAjKgk4',
      youtubeUrl: 'https://www.youtube.com/watch?v=FxW1fAjKgk4',
      title: 'Exploring YouTube Studio Features and CMS Integration',
      shortDescription:
        'Understand YouTube Studio essentials, YouTube Content Manager (CMS), and how external CMS and SocialifyAI workflows complement them.',
      fullDescription:
        "Understanding the difference between YouTube Studio, YouTube Content Manager (CMS), and external website or social workflows can save your team hours of confusion. In this video, we break down what YouTube Studio handles out of the box, when enterprise YouTube CMS tools apply, and how external content and social platforms fit into the picture.\n\nIn this video, we cover:\n\nYouTube Studio essentials: Uploads, scheduling, retention analytics, monetization, and standard copyright checks\n\nYouTube Content Manager (CMS): Multi-channel governance, Content ID rights policies, asset management, and bulk/API tools\n\nExternal CMS & Social Workflows: How website CMS platforms and AI social media/Social CRM tools like SocialifyAI complement YouTube's native tools",
      thumbnailUrl: 'https://i.ytimg.com/vi/FxW1fAjKgk4/hqdefault.jpg',
      duration: '',
      categoryId: 'youtube-content',
      keywords: ['youtube', 'youtube studio', 'cms', 'content manager', 'multi-channel', 'video', 'integration'],
      learningObjectives: [
        'YouTube Studio essentials: Uploads, scheduling, retention analytics, monetization, and standard copyright checks',
        'YouTube Content Manager (CMS): Multi-channel governance, Content ID rights policies, asset management, and bulk/API tools',
        "External CMS & Social Workflows: How website CMS platforms and AI social media/Social CRM tools like SocialifyAI complement YouTube's native tools",
      ],
      steps: [],
      tips: [],
      order: 4,
      published: true,
      featured: false,
      publishedAt: '2026-11-27T20:18:57+00:00',
      createdAt: seedTs,
      updatedAt: seedTs,
    },
    {
      id: 'tut-Bub4WlG07Ec',
      videoId: 'Bub4WlG07Ec',
      youtubeUrl: 'https://www.youtube.com/watch?v=Bub4WlG07Ec',
      title: 'Managing Unified Inbox and CRM Analytics Overview',
      shortDescription:
        'Triage comments, DMs, and mentions faster, use AI-assisted replies, and monitor Social CRM response and pipeline analytics.',
      fullDescription:
        'Keeping up with comments, DMs, and brand mentions across every channel is tough—and knowing which conversations actually drive results is even harder. In this video, we walk through managing the Unified Inbox and CRM Analytics Overview inside SocialifyAI so your team can triage messages faster, track conversation history, and measure engagement that turns into real relationships.\n\nIn this video, we cover:\n\nUnified Inbox management: Filtering comments, DMs, and mentions by channel, unread status, and urgency in one queue\n\nContext, tagging & assisted replies: Viewing contact history, labeling threads by intent (Lead, Support, Feedback), assigning owners, and using AI-assisted replies\n\nCRM Analytics Overview: Tracking conversation volume, first-response and resolution times, sentiment trends, and pipeline conversion signals\n\nDaily workflow routine: A simple triage, batch-reply, and weekly analytics review habit',
      thumbnailUrl: 'https://i.ytimg.com/vi/Bub4WlG07Ec/hqdefault.jpg',
      duration: '',
      categoryId: 'inbox-crm',
      keywords: ['inbox', 'unified inbox', 'crm', 'analytics', 'dms', 'comments', 'mentions', 'replies', 'sentiment'],
      learningObjectives: [
        'Unified Inbox management: Filtering comments, DMs, and mentions by channel, unread status, and urgency in one queue',
        'Context, tagging & assisted replies: Viewing contact history, labeling threads by intent (Lead, Support, Feedback), assigning owners, and using AI-assisted replies',
        'CRM Analytics Overview: Tracking conversation volume, first-response and resolution times, sentiment trends, and pipeline conversion signals',
        'Daily workflow routine: A simple triage, batch-reply, and weekly analytics review habit',
      ],
      steps: [],
      tips: [],
      order: 5,
      published: true,
      featured: false,
      publishedAt: '2026-11-27T20:25:12+00:00',
      createdAt: seedTs,
      updatedAt: seedTs,
    },
    {
      id: 'tut-NPwto0zyksg',
      videoId: 'NPwto0zyksg',
      youtubeUrl: 'https://www.youtube.com/watch?v=NPwto0zyksg',
      title: 'Manage Campaigns Using Integrated Ads Manager Platform',
      shortDescription:
        'Organize cross-channel ad campaigns, monitor spend and ROI in real time, and follow up on ad leads directly in Social CRM.',
      fullDescription:
        "Running paid social campaigns across multiple ad accounts shouldn't mean jumping between endless tabs and disconnected spreadsheets. In this walkthrough, we show you how to manage campaigns using the integrated Ads Manager platform inside SocialifyAI—so you can launch, monitor, and optimize your ads alongside your organic content and Social CRM leads.\n\nIn this video, we cover:\n\nCampaign overview & setup: Organizing ad campaigns, budgets, schedules, and objectives from one unified workspace\n\nCross-channel ad management: Monitoring active ads, creatives, and audience targeting without switching platforms\n\nPerformance & ROI tracking: Reading spend, impressions, clicks, and conversion metrics in real time\n\nConnecting ads with Social CRM: Following up on ad comments, DMs, and incoming leads directly from your inbox",
      thumbnailUrl: 'https://i.ytimg.com/vi/NPwto0zyksg/hqdefault.jpg',
      duration: '',
      categoryId: 'ads-campaigns',
      keywords: ['ads', 'ads manager', 'campaigns', 'paid social', 'roi', 'budgets', 'leads', 'social crm'],
      learningObjectives: [
        'Campaign overview & setup: Organizing ad campaigns, budgets, schedules, and objectives from one unified workspace',
        'Cross-channel ad management: Monitoring active ads, creatives, and audience targeting without switching platforms',
        'Performance & ROI tracking: Reading spend, impressions, clicks, and conversion metrics in real time',
        'Connecting ads with Social CRM: Following up on ad comments, DMs, and incoming leads directly from your inbox',
      ],
      steps: [],
      tips: [],
      order: 6,
      published: true,
      featured: false,
      publishedAt: '2026-11-27T20:28:49+00:00',
      createdAt: seedTs,
      updatedAt: seedTs,
    },
  ];

  return {
    channelUrl: OFFICIAL_CHANNEL_URL,
    channelId: OFFICIAL_CHANNEL_ID,
    categories,
    tutorials,
    progressByUser: {},
  };
}

export function createAcademyRouter<TUser extends AcademyBearerUser = AcademyBearerUser>(deps: {
  dataDir: string;
  extractBearerUser: (req: Request) => TUser | null;
  isStrictSuperAdminUser: (user: TUser | null) => boolean;
}): Router {
  const router = Router();
  const storePath = path.join(deps.dataDir, 'academy.json');

  function ensureStore(): AcademyStoreFile {
    try {
      if (fs.existsSync(storePath)) {
        const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8')) as Partial<AcademyStoreFile>;
        if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.tutorials)) {
          return {
            channelUrl: parsed.channelUrl || OFFICIAL_CHANNEL_URL,
            channelId: parsed.channelId || OFFICIAL_CHANNEL_ID,
            categories: parsed.categories,
            tutorials: parsed.tutorials,
            progressByUser: parsed.progressByUser && typeof parsed.progressByUser === 'object' ? parsed.progressByUser : {},
          };
        }
      }
    } catch {
      // fall through to seed
    }
    const seeded = getDefaultAcademyStore();
    saveStore(seeded);
    return seeded;
  }

  function saveStore(data: AcademyStoreFile): void {
    try {
      if (!fs.existsSync(deps.dataDir)) {
        fs.mkdirSync(deps.dataDir, { recursive: true });
      }
      fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist academy store:', err);
    }
  }

  interface ResolvedAcademyUser {
    uid: string;
    email: string;
    displayName?: string;
    isAdmin: boolean;
  }

  async function resolveAuthUser(req: Request): Promise<ResolvedAcademyUser | null> {
    const serverUser = deps.extractBearerUser(req);
    if (serverUser) {
      return {
        uid: serverUser.uid,
        email: serverUser.email,
        displayName: serverUser.displayName,
        isAdmin: deps.isStrictSuperAdminUser(serverUser),
      };
    }

    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const rawToken = authHeader.slice(7).trim();
      if (rawToken.split('.').length === 3) {
        const fbUser = await verifyFirebaseIdToken(rawToken);
        if (fbUser) {
          return {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            isAdmin: fbUser.isFirebaseSuperAdmin,
          };
        }
      }
    }

    return null;
  }

  async function requireAuth(req: Request, res: Response): Promise<ResolvedAcademyUser | null> {
    const user = await resolveAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required to access SocialifyAI Academy.' });
      return null;
    }
    return user;
  }

  async function requireSuperAdmin(req: Request, res: Response): Promise<ResolvedAcademyUser | null> {
    const user = await resolveAuthUser(req);
    if (!user || !user.isAdmin) {
      res.status(403).json({ error: 'Super Admin authorization required to manage Academy tutorials.' });
      return null;
    }
    return user;
  }

  // =========================================================================
  // GET /api/academy/catalog
  // Authenticated users get published tutorials + categories; Super Admins
  // can pass ?includeDrafts=1 to manage unpublished items as well.
  // =========================================================================
  router.get('/catalog', async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const store = ensureStore();
    const wantsDrafts = req.query.includeDrafts === '1' || req.query.includeDrafts === 'true';
    const canSeeDrafts = wantsDrafts && user.isAdmin;

    const categories = [...store.categories].sort((a, b) => a.order - b.order);
    const tutorials = store.tutorials
      .filter((t) => (canSeeDrafts ? true : t.published))
      .sort((a, b) => a.order - b.order);

    return res.json({
      channelUrl: store.channelUrl,
      channelId: store.channelId,
      categories,
      tutorials,
    });
  });

  // =========================================================================
  // GET /api/academy/progress — Authenticated user's own progress only
  // =========================================================================
  router.get('/progress', async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const store = ensureStore();
    const existing = store.progressByUser[user.uid];
    const progress: AcademyUserProgressRecord = existing || {
      userId: user.uid,
      completedTutorialIds: [],
      watchedTutorialIds: [],
      recentTutorialIds: [],
      lastWatchedTutorialId: null,
      lastWatchedAt: null,
      updatedAt: new Date().toISOString(),
    };

    return res.json({ progress });
  });

  // =========================================================================
  // PUT /api/academy/progress — Update authenticated user's own progress
  // =========================================================================
  router.put('/progress', async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;

    const store = ensureStore();
    const validTutorialIds = new Set(store.tutorials.map((t) => t.id));
    const current: AcademyUserProgressRecord = store.progressByUser[user.uid] || {
      userId: user.uid,
      completedTutorialIds: [],
      watchedTutorialIds: [],
      recentTutorialIds: [],
      lastWatchedTutorialId: null,
      lastWatchedAt: null,
      updatedAt: new Date().toISOString(),
    };

    const body = (req.body || {}) as Record<string, unknown>;
    const now = new Date().toISOString();

    let completed = [...current.completedTutorialIds];
    let watched = [...current.watchedTutorialIds];
    let recent = [...current.recentTutorialIds];
    let lastWatchedTutorialId = current.lastWatchedTutorialId;
    let lastWatchedAt = current.lastWatchedAt;

    // Support atomic action updates or full validated arrays
    if (typeof body.action === 'string' && typeof body.tutorialId === 'string') {
      const tid = body.tutorialId.trim();
      if (!validTutorialIds.has(tid)) {
        return res.status(400).json({ error: 'Unknown tutorial ID.' });
      }
      if (body.action === 'mark_watched') {
        if (!watched.includes(tid)) watched.push(tid);
        recent = [tid, ...recent.filter((id) => id !== tid)].slice(0, 12);
        lastWatchedTutorialId = tid;
        lastWatchedAt = now;
      } else if (body.action === 'toggle_completed') {
        const nextDone = typeof body.completed === 'boolean' ? body.completed : !completed.includes(tid);
        if (nextDone) {
          if (!completed.includes(tid)) completed.push(tid);
          if (!watched.includes(tid)) watched.push(tid);
          recent = [tid, ...recent.filter((id) => id !== tid)].slice(0, 12);
          lastWatchedTutorialId = tid;
          lastWatchedAt = now;
        } else {
          completed = completed.filter((id) => id !== tid);
        }
      } else {
        return res.status(400).json({ error: 'Unsupported progress action.' });
      }
    } else {
      if (Array.isArray(body.completedTutorialIds)) {
        completed = Array.from(
          new Set(body.completedTutorialIds.map((id) => String(id)).filter((id) => validTutorialIds.has(id)))
        ).slice(0, 500);
      }
      if (Array.isArray(body.watchedTutorialIds)) {
        watched = Array.from(
          new Set(body.watchedTutorialIds.map((id) => String(id)).filter((id) => validTutorialIds.has(id)))
        ).slice(0, 500);
      }
      if (Array.isArray(body.recentTutorialIds)) {
        recent = Array.from(
          new Set(body.recentTutorialIds.map((id) => String(id)).filter((id) => validTutorialIds.has(id)))
        ).slice(0, 20);
      }
      if (body.lastWatchedTutorialId === null) {
        lastWatchedTutorialId = null;
        lastWatchedAt = null;
      } else if (typeof body.lastWatchedTutorialId === 'string' && validTutorialIds.has(body.lastWatchedTutorialId)) {
        lastWatchedTutorialId = body.lastWatchedTutorialId;
        lastWatchedAt = typeof body.lastWatchedAt === 'string' ? body.lastWatchedAt.slice(0, 64) : now;
      }
    }

    const updated: AcademyUserProgressRecord = {
      userId: user.uid,
      completedTutorialIds: completed,
      watchedTutorialIds: watched,
      recentTutorialIds: recent,
      lastWatchedTutorialId,
      lastWatchedAt,
      updatedAt: now,
    };

    store.progressByUser[user.uid] = updated;
    saveStore(store);

    return res.json({ ok: true, progress: updated });
  });

  // =========================================================================
  // ADMIN: POST /api/academy/admin/youtube-metadata
  // Validates YouTube URL strictly, extracts 11-char ID, and fetches real
  // metadata via YOUTUBE_API_KEY (if configured) or YouTube oEmbed.
  // =========================================================================
  router.post('/admin/youtube-metadata', async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) return;

    const rawUrl = String(req.body?.youtubeUrl || req.body?.videoId || '').trim();
    const videoId = extractYouTubeVideoId(rawUrl);
    if (!videoId) {
      return res.status(400).json({
        error: 'Please enter a valid YouTube video URL (youtube.com or youtu.be) or 11-character YouTube Video ID.',
      });
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const defaultThumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    let title = '';
    let description = '';
    let duration = '';
    let publishedAt = new Date().toISOString();
    let thumbnailUrl = defaultThumb;
    let source: 'youtube_data_api' | 'oembed' | 'basic' = 'basic';

    const apiKey = (process.env.YOUTUBE_API_KEY || '').trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      if (apiKey) {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;
        const apiRes = await fetch(apiUrl, { signal: controller.signal });
        if (apiRes.ok) {
          const json = (await apiRes.json()) as {
            items?: Array<{
              snippet?: {
                title?: string;
                description?: string;
                publishedAt?: string;
                thumbnails?: { high?: { url?: string }; maxres?: { url?: string } };
              };
              contentDetails?: { duration?: string };
            }>;
          };
          const item = json.items?.[0];
          if (item?.snippet) {
            title = sanitizeText(item.snippet.title || '', 200);
            description = sanitizeText(item.snippet.description || '', 8000);
            publishedAt = item.snippet.publishedAt || publishedAt;
            thumbnailUrl = item.snippet.thumbnails?.high?.url || defaultThumb;
            duration = formatIsoDuration(item.contentDetails?.duration || '');
            source = 'youtube_data_api';
          }
        }
      }

      if (!title) {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
        const oeRes = await fetch(oembedUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'SocialifyAI-Academy/1.0' },
        });
        if (oeRes.ok) {
          const oe = (await oeRes.json()) as { title?: string; thumbnail_url?: string };
          if (oe.title) {
            title = sanitizeText(oe.title, 200);
            source = 'oembed';
          }
          if (oe.thumbnail_url && oe.thumbnail_url.startsWith('https://')) {
            thumbnailUrl = oe.thumbnail_url;
          }
        }
      }
    } catch {
      // Return validated basic metadata if external YouTube endpoint times out
    } finally {
      clearTimeout(timeout);
    }

    const learningObjectives = description ? extractObjectivesFromDescription(description) : [];
    const firstParagraph = description.split(/\n\s*\n/)[0]?.trim() || '';

    return res.json({
      ok: true,
      source,
      metadata: {
        videoId,
        youtubeUrl: canonicalUrl,
        title,
        shortDescription: sanitizeText(firstParagraph, 360),
        fullDescription: description,
        thumbnailUrl,
        duration,
        publishedAt,
        learningObjectives,
      },
    });
  });

  // =========================================================================
  // ADMIN: POST /api/academy/admin/sync-channel
  // Checks official @socialifyaicom YouTube RSS feed for newly uploaded videos.
  // =========================================================================
  router.post('/admin/sync-channel', async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) return;

    const store = ensureStore();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const feedRes = await fetch(OFFICIAL_FEED_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+667',
        },
      });

      if (!feedRes.ok) {
        return res.status(502).json({ error: `Could not reach YouTube channel feed (HTTP ${feedRes.status}).` });
      }

      const xml = await feedRes.text();
      const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
      const existingVideoIds = new Set(store.tutorials.map((t) => t.videoId));
      const defaultCategoryId = store.categories[0]?.id || 'getting-started';
      let nextOrder = store.tutorials.reduce((max, t) => Math.max(max, t.order), 0) + 1;
      const now = new Date().toISOString();
      const imported: AcademyTutorialRecord[] = [];

      for (const entry of entries) {
        const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1]?.trim() || '';
        if (!VIDEO_ID_REGEX.test(videoId) || existingVideoIds.has(videoId)) continue;

        const title = decodeXmlEntities((entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim();
        const publishedAt = (entry.match(/<published>([^<]+)<\/published>/) || [])[1]?.trim() || now;
        const fullDescription = decodeXmlEntities(
          (entry.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || ''
        ).trim();
        const firstPara = fullDescription.split(/\n\s*\n/)[0]?.trim() || title;

        const created: AcademyTutorialRecord = {
          id: `tut-${videoId}`,
          videoId,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          title: sanitizeText(title || `Video ${videoId}`, 200),
          shortDescription: sanitizeText(firstPara, 360),
          fullDescription: sanitizeText(fullDescription, 8000),
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration: '',
          categoryId: defaultCategoryId,
          keywords: title
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((w) => w.length >= 3)
            .slice(0, 10),
          learningObjectives: extractObjectivesFromDescription(fullDescription),
          steps: [],
          tips: [],
          order: nextOrder++,
          published: false, // New imports default to draft until admin assigns category & publishes
          featured: false,
          publishedAt,
          createdAt: now,
          updatedAt: now,
        };

        store.tutorials.push(created);
        existingVideoIds.add(videoId);
        imported.push(created);
      }

      if (imported.length > 0) {
        saveStore(store);
      }

      return res.json({
        ok: true,
        scannedCount: entries.length,
        importedCount: imported.length,
        imported,
      });
    } catch {
      return res.status(502).json({ error: 'Unable to fetch the YouTube channel feed right now.' });
    } finally {
      clearTimeout(timeout);
    }
  });

  // =========================================================================
  // ADMIN: Tutorial CRUD
  // =========================================================================
  router.post('/admin/tutorials', async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) return;

    const store = ensureStore();
    const body = (req.body || {}) as Record<string, unknown>;
    const videoId = extractYouTubeVideoId(String(body.youtubeUrl || body.videoId || ''));
    if (!videoId) {
      return res.status(400).json({ error: 'A valid YouTube URL or 11-character video ID is required.' });
    }

    const title = sanitizeText(body.title, 200);
    if (!title) {
      return res.status(400).json({ error: 'Tutorial title is required.' });
    }

    const categoryId = sanitizeText(body.categoryId, 128);
    if (!store.categories.some((c) => c.id === categoryId)) {
      return res.status(400).json({ error: 'Please select a valid tutorial category.' });
    }

    const now = new Date().toISOString();
    const nextOrder =
      typeof body.order === 'number' && Number.isFinite(body.order) && body.order >= 0
        ? Math.floor(body.order)
        : store.tutorials.reduce((max, t) => Math.max(max, t.order), 0) + 1;

    const fullDescription = sanitizeText(body.fullDescription || body.shortDescription, 8000);
    const shortDescription = sanitizeText(
      body.shortDescription || fullDescription.split(/\n\s*\n/)[0] || '',
      500
    );

    const rawThumb = sanitizeText(body.thumbnailUrl, 512);
    const safeThumb =
      rawThumb && /^https:\/\/(?:i\d?\.ytimg\.com|img\.youtube\.com)\//.test(rawThumb)
        ? rawThumb
        : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const tutorial: AcademyTutorialRecord = {
      id: `tut-${videoId}-${Date.now().toString(36)}`,
      videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      shortDescription,
      fullDescription,
      thumbnailUrl: safeThumb,
      duration: sanitizeText(body.duration, 24),
      categoryId,
      keywords: sanitizeStringList(body.keywords, 30, 48),
      learningObjectives: sanitizeStringList(body.learningObjectives, 20, 320),
      steps: sanitizeSteps(body.steps),
      tips: sanitizeStringList(body.tips, 20, 320),
      order: nextOrder,
      published: body.published !== false,
      featured: Boolean(body.featured),
      publishedAt: sanitizeText(body.publishedAt, 64) || now,
      createdAt: now,
      updatedAt: now,
    };

    store.tutorials.push(tutorial);
    saveStore(store);

    return res.status(201).json({ ok: true, tutorial });
  });

  router.put('/admin/tutorials/:id', async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) return;

    const store = ensureStore();
    const id = String(req.params.id || '').trim();
    const idx = store.tutorials.findIndex((t) => t.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Tutorial not found.' });
    }

    const existing = store.tutorials[idx];
    const body = (req.body || {}) as Record<string, unknown>;

    let videoId = existing.videoId;
    if (body.youtubeUrl !== undefined || body.videoId !== undefined) {
      const extracted = extractYouTubeVideoId(String(body.youtubeUrl || body.videoId || ''));
      if (!extracted) {
        return res.status(400).json({ error: 'Invalid YouTube video URL or video ID.' });
      }
      videoId = extracted;
    }

    const categoryId = body.categoryId !== undefined ? sanitizeText(body.categoryId, 128) : existing.categoryId;
    if (!store.categories.some((c) => c.id === categoryId)) {
      return res.status(400).json({ error: 'Selected category does not exist.' });
    }

    const title = body.title !== undefined ? sanitizeText(body.title, 200) : existing.title;
    if (!title) {
      return res.status(400).json({ error: 'Tutorial title cannot be empty.' });
    }

    const rawThumb = body.thumbnailUrl !== undefined ? sanitizeText(body.thumbnailUrl, 512) : existing.thumbnailUrl;
    const safeThumb =
      rawThumb && /^https:\/\/(?:i\d?\.ytimg\.com|img\.youtube\.com)\//.test(rawThumb)
        ? rawThumb
        : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const updated: AcademyTutorialRecord = {
      ...existing,
      videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      shortDescription:
        body.shortDescription !== undefined ? sanitizeText(body.shortDescription, 500) : existing.shortDescription,
      fullDescription:
        body.fullDescription !== undefined ? sanitizeText(body.fullDescription, 8000) : existing.fullDescription,
      thumbnailUrl: videoId !== existing.videoId && body.thumbnailUrl === undefined
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : safeThumb,
      duration: body.duration !== undefined ? sanitizeText(body.duration, 24) : existing.duration,
      categoryId,
      keywords: body.keywords !== undefined ? sanitizeStringList(body.keywords, 30, 48) : existing.keywords,
      learningObjectives:
        body.learningObjectives !== undefined
          ? sanitizeStringList(body.learningObjectives, 20, 320)
          : existing.learningObjectives,
      steps: body.steps !== undefined ? sanitizeSteps(body.steps) : existing.steps,
      tips: body.tips !== undefined ? sanitizeStringList(body.tips, 20, 320) : existing.tips,
      order:
        typeof body.order === 'number' && Number.isFinite(body.order) && body.order >= 0
          ? Math.floor(body.order)
          : existing.order,
      published: typeof body.published === 'boolean' ? body.published : existing.published,
      featured: typeof body.featured === 'boolean' ? body.featured : existing.featured,
      publishedAt: body.publishedAt !== undefined ? sanitizeText(body.publishedAt, 64) || existing.publishedAt : existing.publishedAt,
      updatedAt: new Date().toISOString(),
    };

    store.tutorials[idx] = updated;
    saveStore(store);

    return res.json({ ok: true, tutorial: updated });
  });

  router.delete('/admin/tutorials/:id', async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) return;

    const store = ensureStore();
    const id = String(req.params.id || '').trim();
    const before = store.tutorials.length;
    store.tutorials = store.tutorials.filter((t) => t.id !== id);
    if (store.tutorials.length === before) {
      return res.status(404).json({ error: 'Tutorial not found.' });
    }

    // Clean deleted tutorial ID out of user progress records
    for (const uid of Object.keys(store.progressByUser)) {
      const p = store.progressByUser[uid];
      p.completedTutorialIds = p.completedTutorialIds.filter((tid) => tid !== id);
      p.watchedTutorialIds = p.watchedTutorialIds.filter((tid) => tid !== id);
      p.recentTutorialIds = p.recentTutorialIds.filter((tid) => tid !== id);
      if (p.lastWatchedTutorialId === id) {
        p.lastWatchedTutorialId = p.recentTutorialIds[0] || null;
      }
    }

    saveStore(store);
    return res.json({ ok: true, deletedId: id });
  });

  // =========================================================================
  // ADMIN: Category CRUD
  // =========================================================================
  router.post('/admin/categories', async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) return;

    const store = ensureStore();
    const body = (req.body || {}) as Record<string, unknown>;
    const name = sanitizeText(body.name, 80);
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const baseSlug = slugify(String(body.slug || name));
    let id = baseSlug;
    let suffix = 2;
    while (store.categories.some((c) => c.id === id)) {
      id = `${baseSlug}-${suffix++}`;
    }

    const now = new Date().toISOString();
    const order =
      typeof body.order === 'number' && Number.isFinite(body.order) && body.order >= 0
        ? Math.floor(body.order)
        : store.categories.reduce((max, c) => Math.max(max, c.order), 0) + 1;

    const category: AcademyCategoryRecord = {
      id,
      name,
      slug: id,
      description: sanitizeText(body.description, 400),
      order,
      createdAt: now,
      updatedAt: now,
    };

    store.categories.push(category);
    saveStore(store);
    return res.status(201).json({ ok: true, category });
  });

  router.put('/admin/categories/:id', async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) return;

    const store = ensureStore();
    const id = String(req.params.id || '').trim();
    const idx = store.categories.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const existing = store.categories[idx];
    const body = (req.body || {}) as Record<string, unknown>;
    const name = body.name !== undefined ? sanitizeText(body.name, 80) : existing.name;
    if (!name) {
      return res.status(400).json({ error: 'Category name cannot be empty.' });
    }

    const updated: AcademyCategoryRecord = {
      ...existing,
      name,
      description: body.description !== undefined ? sanitizeText(body.description, 400) : existing.description,
      order:
        typeof body.order === 'number' && Number.isFinite(body.order) && body.order >= 0
          ? Math.floor(body.order)
          : existing.order,
      updatedAt: new Date().toISOString(),
    };

    store.categories[idx] = updated;
    saveStore(store);
    return res.json({ ok: true, category: updated });
  });

  router.delete('/admin/categories/:id', async (req, res) => {
    if (!(await requireSuperAdmin(req, res))) return;

    const store = ensureStore();
    const id = String(req.params.id || '').trim();
    if (store.categories.length <= 1) {
      return res.status(400).json({ error: 'At least one Academy category must remain.' });
    }

    const remaining = store.categories.filter((c) => c.id !== id);
    if (remaining.length === store.categories.length) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const fallbackCategoryId = remaining.sort((a, b) => a.order - b.order)[0].id;
    store.categories = remaining;
    store.tutorials = store.tutorials.map((t) =>
      t.categoryId === id ? { ...t, categoryId: fallbackCategoryId, updatedAt: new Date().toISOString() } : t
    );

    saveStore(store);
    return res.json({ ok: true, deletedId: id, reassignedTo: fallbackCategoryId });
  });

  return router;
}
