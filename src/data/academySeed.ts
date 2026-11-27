import { AcademyCategory, AcademyTutorial } from '../types';

export const OFFICIAL_ACADEMY_CHANNEL_URL = 'https://www.youtube.com/@socialifyaicom';
export const OFFICIAL_ACADEMY_CHANNEL_ID = 'UC1vKrFdeglBbjqMMluPj8qg';

const SEED_TS = '2026-11-27T20:30:00.000Z';

export const DEFAULT_ACADEMY_CATEGORIES: AcademyCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    slug: 'getting-started',
    description:
      'Core platform tours covering SocialifyAI features and navigating your workspace dashboard.',
    order: 1,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'account-team-setup',
    name: 'Account & Team Setup',
    slug: 'account-team-setup',
    description:
      'Connecting social profiles, inviting teammates, and configuring role-based access permissions.',
    order: 2,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'youtube-content',
    name: 'YouTube & Content Workflows',
    slug: 'youtube-content',
    description:
      'Understanding YouTube Studio, Content Manager (CMS), and external social content workflows.',
    order: 3,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'inbox-crm',
    name: 'Unified Inbox & Social CRM',
    slug: 'inbox-crm',
    description:
      'Triaging comments, DMs, and mentions while tracking Social CRM analytics and response metrics.',
    order: 4,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'ads-campaigns',
    name: 'Ads & Campaigns',
    slug: 'ads-campaigns',
    description:
      'Launching, organizing, and tracking paid social campaigns inside the integrated Ads Manager.',
    order: 5,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
];

// Official published tutorials from https://www.youtube.com/@socialifyaicom
export const DEFAULT_ACADEMY_TUTORIALS: AcademyTutorial[] = [
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
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
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
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
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
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
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
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
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
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
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
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
];
