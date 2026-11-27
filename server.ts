import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { createSocialRouter } from './server/socialRoutes';
import { createIntegrationsRouter } from './server/integrationsRoutes';
import { createAcademyRouter } from './server/academyRoutes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});
app.use(express.json({ limit: '5mb' }));

// =============================================================================
// Real Server-Backed Auth (Salted scryptSync + HMAC-SHA256 Session Tokens)
// =============================================================================
const DATA_DIR = path.resolve(__dirname, '.data');
const USERS_FILE = path.join(DATA_DIR, 'auth-users.json');
const WORKSPACES_DIR = path.join(DATA_DIR, 'workspaces');
const PLATFORM_CONFIG_FILE = path.join(DATA_DIR, 'platform-config.json');
const TOKEN_SECRET =
  process.env.AUTH_SESSION_SECRET ||
  crypto.createHash('sha256').update(`socialifyai-session-secret-${__dirname}`).digest('hex');

interface StoredUser {
  uid: string;
  email: string;
  displayName: string;
  companyName?: string;
  role: 'super_admin' | 'customer';
  status?: 'active' | 'suspended';
  plan?: string;
  aiCreditsUsed?: number;
  aiCreditsLimit?: number;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

let memoryUsers: StoredUser[] | null = null;
const memoryWorkspaces = new Map<string, Record<string, unknown>>();
let memoryPlatformConfig: Record<string, unknown> | null = null;

function ensureDataDirs() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(WORKSPACES_DIR)) fs.mkdirSync(WORKSPACES_DIR, { recursive: true });
  } catch {
    // Read-only filesystem fallback uses in-memory storage
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const candidate = crypto.scryptSync(password, salt, 64);
  const existing = Buffer.from(storedHash, 'hex');
  if (candidate.length !== existing.length) return false;
  return crypto.timingSafeEqual(candidate, existing);
}

function createSessionToken(payload: { uid: string; email: string; role: 'super_admin' | 'customer'; exp: number }): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(
  token: string
): { uid: string; email: string; role: 'super_admin' | 'customer'; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!decoded || typeof decoded.exp !== 'number' || Date.now() > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

function saveUsers(users: StoredUser[]) {
  memoryUsers = users;
  ensureDataDirs();
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch {
    // Keep in-memory users if container FS is read-only
  }
}

function loadUsers(): StoredUser[] {
  ensureDataDirs();
  let users: StoredUser[] = memoryUsers ? [...memoryUsers] : [];
  if (users.length === 0) {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        if (Array.isArray(raw)) users = raw;
      }
    } catch {
      users = [];
    }
  }

  // Ensure configured Super Admin account (essadhiif@gmail.com) exists with valid test1213 hash
  const adminEmail = 'essadhiif@gmail.com';
  const existingIdx = users.findIndex((u) => u.email.toLowerCase() === adminEmail);
  let dirty = false;
  if (existingIdx === -1) {
    const salt = crypto.randomBytes(16).toString('hex');
    users.push({
      uid: 'admin-essadhiif',
      email: adminEmail,
      displayName: 'Super Admin',
      companyName: 'socialifyai.com HQ',
      role: 'super_admin',
      salt,
      passwordHash: hashPassword('test1213', salt),
      createdAt: new Date().toISOString(),
    });
    dirty = true;
  } else {
    const adminUser = users[existingIdx];
    const hashValid =
      adminUser.role === 'super_admin' &&
      Boolean(adminUser.salt) &&
      Boolean(adminUser.passwordHash) &&
      verifyPassword('test1213', adminUser.salt, adminUser.passwordHash);
    if (!hashValid) {
      const salt = crypto.randomBytes(16).toString('hex');
      users[existingIdx] = {
        ...adminUser,
        uid: 'admin-essadhiif',
        email: adminEmail,
        role: 'super_admin',
        salt,
        passwordHash: hashPassword('test1213', salt),
      };
      dirty = true;
    }
  }

  memoryUsers = users;
  if (dirty) saveUsers(users);
  return users;
}

function extractBearerUser(req: express.Request): StoredUser | null {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const users = loadUsers();
  return users.find((u) => u.uid === payload.uid) || null;
}

function isStrictSuperAdminUser(u: StoredUser | null): boolean {
  return Boolean(u && u.email.toLowerCase() === 'essadhiif@gmail.com' && u.role === 'super_admin');
}

function readWorkspaceByUid(uid: string): Record<string, unknown> | null {
  ensureDataDirs();
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const filePath = path.join(WORKSPACES_DIR, `${safeUid}.json`);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {
    // fall back to memory cache
  }
  return memoryWorkspaces.get(safeUid) || null;
}

function writeWorkspaceByUid(uid: string, payload: Record<string, unknown>) {
  ensureDataDirs();
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  memoryWorkspaces.set(safeUid, payload);
  const filePath = path.join(WORKSPACES_DIR, `${safeUid}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // In-memory store retains workspace when FS is read-only
  }
}

function toPublicUser(u: StoredUser) {
  const isStrictSuperAdmin = isStrictSuperAdminUser(u);
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    companyName: u.companyName || '',
    role: isStrictSuperAdmin ? ('super_admin' as const) : ('customer' as const),
    status: u.status || 'active',
    plan: u.plan || 'bootstrap',
    isAdmin: isStrictSuperAdmin,
    createdAt: u.createdAt,
  };
}

// Initialize auth user store on boot & mount real OAuth + Integration routers
loadUsers();
app.use('/api/social', createSocialRouter(TOKEN_SECRET));
app.use('/api/academy', createAcademyRouter({
  dataDir: DATA_DIR,
  extractBearerUser,
  isStrictSuperAdminUser,
}));
app.use('/api', createIntegrationsRouter(DATA_DIR));

app.post('/api/auth/signup', (req, res) => {
  const { displayName, email, password, companyName } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(displayName || '').trim();
  const cleanPassword = String(password || '');
  const cleanCompany = String(companyName || '').trim().slice(0, 80);

  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (cleanPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const users = loadUsers();
  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const newUser: StoredUser = {
    uid: `usr_${crypto.randomBytes(8).toString('hex')}`,
    email: cleanEmail,
    displayName: cleanName.slice(0, 120),
    companyName: cleanCompany,
    role: 'customer',
    salt,
    passwordHash: hashPassword(cleanPassword, salt),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  const token = createSessionToken({
    uid: newUser.uid,
    email: newUser.email,
    role: newUser.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(201).json({
    token,
    user: toPublicUser(newUser),
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const rawPassword = String(password || '');
  const trimmedPassword = rawPassword.trim();

  if (!cleanEmail || !trimmedPassword) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const users = loadUsers();
  const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
  const passwordMatches =
    found &&
    (verifyPassword(rawPassword, found.salt, found.passwordHash) ||
      (trimmedPassword !== rawPassword && verifyPassword(trimmedPassword, found.salt, found.passwordHash)));

  if (!found || !passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password. Please check your credentials and try again.' });
  }

  if (found.status === 'suspended' && !isStrictSuperAdminUser(found)) {
    return res.status(403).json({
      error: 'This account has been suspended by an administrator. Contact support@socialifyai.com to restore access.',
    });
  }

  const token = createSessionToken({
    uid: found.uid,
    email: found.email,
    role: found.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    token,
    user: toPublicUser(found),
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = extractBearerUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }
  if (user.status === 'suspended' && !isStrictSuperAdminUser(user)) {
    return res.status(403).json({ error: 'Account suspended. Access revoked.' });
  }
  return res.json({ user: toPublicUser(user) });
});

app.post('/api/auth/logout', (_req, res) => {
  return res.json({ ok: true });
});

// Server-side workspace persistence for Email/Password accounts
app.get('/api/workspace', (req, res) => {
  const user = extractBearerUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.status === 'suspended' && !isStrictSuperAdminUser(user)) {
    return res.status(403).json({ error: 'Account suspended.' });
  }
  const data = readWorkspaceByUid(user.uid);
  if (data) return res.json({ exists: true, data });
  return res.json({ exists: false, data: null });
});

app.put('/api/workspace', (req, res) => {
  const user = extractBearerUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.status === 'suspended' && !isStrictSuperAdminUser(user)) {
    return res.status(403).json({ error: 'Account suspended.' });
  }
  const payload = (req.body || {}) as Record<string, unknown>;
  writeWorkspaceByUid(user.uid, payload);
  return res.json({ ok: true });
});

// Super Admin endpoints: real registered customer accounts, provisioning, suspension, quotas, impersonation & env status
const PLAN_CREDIT_DEFAULTS: Record<string, number> = {
  bootstrap: 5000,
  accelerate: 25000,
  pro_agency: 100000,
  lifetime: 100000,
};

app.get('/api/admin/users', (req, res) => {
  const user = extractBearerUser(req);
  if (!isStrictSuperAdminUser(user)) {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required.' });
  }

  const users = loadUsers().filter((u) => u.role !== 'super_admin');
  const records = users.map((u) => {
    const wsData = readWorkspaceByUid(u.uid);
    const workspaces = Array.isArray(wsData?.workspaces) ? wsData.workspaces : [];
    const connectedProfiles = Array.isArray(wsData?.connectedProfiles) ? wsData.connectedProfiles : [];
    const posts = Array.isArray(wsData?.posts) ? wsData.posts : [];
    const selectedPlan =
      u.plan || (typeof wsData?.selectedPlan === 'string' ? wsData.selectedPlan : 'bootstrap');
    const activeWsId =
      typeof wsData?.activeWorkspaceId === 'string'
        ? wsData.activeWorkspaceId
        : (workspaces[0] as { id?: string } | undefined)?.id || 'ws-default';
    const wsCreditsMap =
      wsData?.workspaceCredits && typeof wsData.workspaceCredits === 'object'
        ? (wsData.workspaceCredits as Record<string, { used?: number; limit?: number }>)
        : {};
    const wsCredit = wsCreditsMap[activeWsId];

    return {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      companyName: u.companyName || `${u.displayName}'s Workspace`,
      createdAt: u.createdAt,
      status: u.status || 'active',
      plan: selectedPlan,
      linkedWorkspaceId: activeWsId,
      workspacesCount: Math.max(1, workspaces.length),
      profilesUsed: connectedProfiles.length,
      aiCreditsUsed:
        typeof u.aiCreditsUsed === 'number'
          ? u.aiCreditsUsed
          : typeof wsCredit?.used === 'number'
          ? wsCredit.used
          : 0,
      aiCreditsLimit:
        typeof u.aiCreditsLimit === 'number'
          ? u.aiCreditsLimit
          : typeof wsCredit?.limit === 'number'
          ? wsCredit.limit
          : PLAN_CREDIT_DEFAULTS[selectedPlan] || 5000,
      scheduledPostsCount: posts.filter(
        (p: { status?: string }) => p.status === 'scheduled' || p.status === 'approved'
      ).length,
    };
  });

  return res.json({ users: records });
});

app.post('/api/admin/users', (req, res) => {
  const admin = extractBearerUser(req);
  if (!isStrictSuperAdminUser(admin)) {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required.' });
  }

  const { displayName, email, password, companyName, plan } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(displayName || '').trim();
  const cleanPassword = String(password || '');
  const cleanCompany = String(companyName || cleanName || '').trim().slice(0, 80);
  const validPlans = new Set(['bootstrap', 'accelerate', 'pro_agency', 'lifetime']);
  const cleanPlan = validPlans.has(String(plan)) ? String(plan) : 'accelerate';

  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ error: 'Display name must be at least 2 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (cleanPassword.length < 6) {
    return res.status(400).json({ error: 'Initial password must be at least 6 characters.' });
  }

  const users = loadUsers();
  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const uid = `usr_${crypto.randomBytes(8).toString('hex')}`;
  const creditLimit = PLAN_CREDIT_DEFAULTS[cleanPlan] || 25000;
  const newUser: StoredUser = {
    uid,
    email: cleanEmail,
    displayName: cleanName.slice(0, 120),
    companyName: cleanCompany,
    role: 'customer',
    status: 'active',
    plan: cleanPlan,
    aiCreditsUsed: 0,
    aiCreditsLimit: creditLimit,
    salt,
    passwordHash: hashPassword(cleanPassword, salt),
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);

  const wsId = `ws_${crypto.randomBytes(4).toString('hex')}`;
  writeWorkspaceByUid(uid, {
    activeWorkspaceId: wsId,
    activeRole: 'Owner',
    selectedPlan: cleanPlan,
    darkMode: true,
    workspaces: [
      {
        id: wsId,
        name: cleanCompany || `${cleanName}'s Workspace`,
        slug: (cleanCompany || cleanName).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'workspace',
        brandColor: '#06B6D4',
        logoInitials: (cleanCompany || cleanName).slice(0, 2).toUpperCase(),
        industry: 'Digital Marketing',
        timezone: 'UTC',
      },
    ],
    workspaceCredits: {
      [wsId]: { used: 0, limit: creditLimit, lastResetAt: new Date().toISOString() },
    },
    connectedProfiles: [],
    teamMembers: [
      {
        id: `tm_${uid}`,
        workspaceId: wsId,
        name: cleanName,
        email: cleanEmail,
        role: 'Owner',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=06B6D4&color=090A0D`,
        status: 'active',
        permissions: { canPublish: true, canApprove: true, canManageTeam: true, canConnectProfiles: true },
      },
    ],
    categories: [],
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
    approvalAuditLogs: [],
  });

  return res.status(201).json({
    ok: true,
    user: {
      uid: newUser.uid,
      email: newUser.email,
      displayName: newUser.displayName,
      companyName: newUser.companyName,
      status: newUser.status,
      plan: newUser.plan,
      linkedWorkspaceId: wsId,
      aiCreditsUsed: 0,
      aiCreditsLimit: creditLimit,
      createdAt: newUser.createdAt,
    },
  });
});

app.patch('/api/admin/users/:uid', (req, res) => {
  const admin = extractBearerUser(req);
  if (!isStrictSuperAdminUser(admin)) {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required.' });
  }

  const targetUid = String(req.params.uid || '').trim();
  const users = loadUsers();
  const idx = users.findIndex((u) => u.uid === targetUid && u.role !== 'super_admin');
  if (idx === -1) {
    return res.status(404).json({ error: 'Customer account not found.' });
  }

  const target = users[idx];
  const { status, plan, aiCreditsUsed, aiCreditsLimit, creditTopUp } = req.body || {};

  if (status === 'active' || status === 'suspended') {
    target.status = status;
  }
  const validPlans = new Set(['bootstrap', 'accelerate', 'pro_agency', 'lifetime']);
  if (typeof plan === 'string' && validPlans.has(plan)) {
    target.plan = plan;
    if (typeof aiCreditsLimit !== 'number' && typeof creditTopUp !== 'number') {
      target.aiCreditsLimit = PLAN_CREDIT_DEFAULTS[plan] || target.aiCreditsLimit || 5000;
    }
  }
  if (typeof aiCreditsUsed === 'number' && aiCreditsUsed >= 0) {
    target.aiCreditsUsed = Math.round(aiCreditsUsed);
  }
  if (typeof aiCreditsLimit === 'number' && aiCreditsLimit > 0) {
    target.aiCreditsLimit = Math.round(aiCreditsLimit);
  }
  if (typeof creditTopUp === 'number' && creditTopUp !== 0) {
    const currentLimit = target.aiCreditsLimit || PLAN_CREDIT_DEFAULTS[target.plan || 'bootstrap'] || 5000;
    target.aiCreditsLimit = Math.max(1000, currentLimit + Math.round(creditTopUp));
  }

  users[idx] = target;
  saveUsers(users);

  // Sync updated plan & credit metering into the tenant's workspace file
  const existingWs = readWorkspaceByUid(targetUid);
  if (existingWs) {
    const activeWsId = String(existingWs.activeWorkspaceId || 'ws-default');
    const prevCredits =
      existingWs.workspaceCredits && typeof existingWs.workspaceCredits === 'object'
        ? { ...(existingWs.workspaceCredits as Record<string, Record<string, unknown>>) }
        : {};
    const currWsCredit = prevCredits[activeWsId] || {};
    prevCredits[activeWsId] = {
      ...currWsCredit,
      used: target.aiCreditsUsed ?? (typeof currWsCredit.used === 'number' ? currWsCredit.used : 0),
      limit: target.aiCreditsLimit ?? (typeof currWsCredit.limit === 'number' ? currWsCredit.limit : 5000),
      lastResetAt:
        aiCreditsUsed === 0 ? new Date().toISOString() : (currWsCredit.lastResetAt as string) || new Date().toISOString(),
    };
    writeWorkspaceByUid(targetUid, {
      ...existingWs,
      selectedPlan: target.plan || existingWs.selectedPlan || 'bootstrap',
      workspaceCredits: prevCredits,
    });
  }

  return res.json({
    ok: true,
    user: {
      uid: target.uid,
      email: target.email,
      displayName: target.displayName,
      companyName: target.companyName,
      status: target.status || 'active',
      plan: target.plan || 'bootstrap',
      aiCreditsUsed: target.aiCreditsUsed ?? 0,
      aiCreditsLimit: target.aiCreditsLimit ?? PLAN_CREDIT_DEFAULTS[target.plan || 'bootstrap'] ?? 5000,
    },
  });
});

app.get('/api/admin/users/:uid/workspace', (req, res) => {
  const admin = extractBearerUser(req);
  if (!isStrictSuperAdminUser(admin)) {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required.' });
  }
  const targetUid = String(req.params.uid || '').trim();
  const target = loadUsers().find((u) => u.uid === targetUid);
  if (!target) {
    return res.status(404).json({ error: 'Target customer account not found.' });
  }
  const data = readWorkspaceByUid(targetUid);
  return res.json({
    exists: Boolean(data),
    user: toPublicUser(target),
    data,
  });
});

app.put('/api/admin/users/:uid/workspace', (req, res) => {
  const admin = extractBearerUser(req);
  if (!isStrictSuperAdminUser(admin)) {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required.' });
  }
  const targetUid = String(req.params.uid || '').trim();
  const target = loadUsers().find((u) => u.uid === targetUid);
  if (!target) {
    return res.status(404).json({ error: 'Target customer account not found.' });
  }
  const payload = (req.body || {}) as Record<string, unknown>;
  writeWorkspaceByUid(targetUid, payload);
  return res.json({ ok: true });
});

app.get('/api/admin/env-status', (req, res) => {
  const admin = extractBearerUser(req);
  if (!isStrictSuperAdminUser(admin)) {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required.' });
  }

  let firebaseProjectConfigured = Boolean(process.env.FIREBASE_PROJECT_ID);
  if (!firebaseProjectConfigured) {
    try {
      const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
      if (fs.existsSync(cfgPath)) {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        firebaseProjectConfigured = Boolean(cfg?.projectId && cfg?.apiKey);
      }
    } catch {
      firebaseProjectConfigured = false;
    }
  }

  const check = (envKey: string) => {
    const val = (process.env[envKey] || '').trim();
    return Boolean(val && !val.startsWith('MY_') && !val.startsWith('your_'));
  };

  const items = [
    {
      key: 'FIREBASE_PROJECT_ID',
      label: 'Firebase Auth & Firestore',
      category: 'Core Infrastructure',
      configured: firebaseProjectConfigured,
      detail: firebaseProjectConfigured ? 'Connected via firebase-applet-config.json' : 'Firebase project config missing',
    },
    {
      key: 'GEMINI_API_KEY',
      label: 'Gemini AI Generation Engine',
      category: 'AI Engine',
      configured: check('GEMINI_API_KEY'),
      detail: check('GEMINI_API_KEY') ? 'Server-side Gemini SDK active' : 'Set GEMINI_API_KEY in server environment',
    },
    {
      key: 'APP_URL',
      label: 'Public App Callback URL',
      category: 'Core Infrastructure',
      configured: check('APP_URL'),
      detail: check('APP_URL') ? 'Explicit OAuth redirect origin set' : 'Using dynamic request Host header',
    },
    {
      key: 'YOUTUBE_CLIENT_ID',
      label: 'YouTube Data API v3 (OAuth)',
      category: 'Social OAuth',
      configured: check('YOUTUBE_CLIENT_ID') && check('YOUTUBE_CLIENT_SECRET'),
      detail: 'Requires YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET',
    },
    {
      key: 'META_APP_ID',
      label: 'Meta Graph API (Instagram & Facebook)',
      category: 'Social OAuth',
      configured: check('META_APP_ID') && check('META_APP_SECRET'),
      detail: 'Requires META_APP_ID + META_APP_SECRET',
    },
    {
      key: 'X_CLIENT_ID',
      label: 'X / Twitter API v2 (OAuth PKCE)',
      category: 'Social OAuth',
      configured: check('X_CLIENT_ID') && check('X_CLIENT_SECRET'),
      detail: 'Requires X_CLIENT_ID + X_CLIENT_SECRET',
    },
    {
      key: 'LINKEDIN_CLIENT_ID',
      label: 'LinkedIn Marketing API (OAuth)',
      category: 'Social OAuth',
      configured: check('LINKEDIN_CLIENT_ID') && check('LINKEDIN_CLIENT_SECRET'),
      detail: 'Requires LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET',
    },
    {
      key: 'TIKTOK_CLIENT_KEY',
      label: 'TikTok Content Posting API',
      category: 'Social OAuth',
      configured: check('TIKTOK_CLIENT_KEY') && check('TIKTOK_CLIENT_SECRET'),
      detail: 'Requires TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET',
    },
    {
      key: 'PINTEREST_APP_ID',
      label: 'Pinterest API v5 (OAuth)',
      category: 'Social OAuth',
      configured: check('PINTEREST_APP_ID') && check('PINTEREST_APP_SECRET'),
      detail: 'Requires PINTEREST_APP_ID + PINTEREST_APP_SECRET',
    },
    {
      key: 'THREADS_APP_ID',
      label: 'Meta Threads API (OAuth)',
      category: 'Social OAuth',
      configured: check('THREADS_APP_ID') && check('THREADS_APP_SECRET'),
      detail: 'Requires THREADS_APP_ID + THREADS_APP_SECRET',
    },
    {
      key: 'GBP_CLIENT_ID',
      label: 'Google Business Profile API',
      category: 'Social OAuth',
      configured: check('GBP_CLIENT_ID') && check('GBP_CLIENT_SECRET'),
      detail: 'Requires GBP_CLIENT_ID + GBP_CLIENT_SECRET',
    },
    {
      key: 'BLUESKY_ATPROTO',
      label: 'Bluesky AT Protocol (App Password)',
      category: 'Social OAuth',
      configured: true,
      detail: 'Live out-of-the-box via bsky.social com.atproto.server.createSession',
    },
    {
      key: 'STRIPE_SECRET_KEY',
      label: 'Stripe Billing & Webhooks',
      category: 'Billing',
      configured: check('STRIPE_SECRET_KEY'),
      detail: 'Requires STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET',
    },
  ];

  return res.json({
    checkedAt: new Date().toISOString(),
    configuredCount: items.filter((i) => i.configured).length,
    totalCount: items.length,
    items,
  });
});

// Global platform governance config (quotas + feature flags): readable by any signed-in user, writable strictly by Super Admin
app.get('/api/platform-config', (req, res) => {
  const user = extractBearerUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  ensureDataDirs();
  try {
    if (fs.existsSync(PLATFORM_CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PLATFORM_CONFIG_FILE, 'utf8'));
      memoryPlatformConfig = parsed;
      return res.json({ exists: true, data: parsed });
    }
  } catch {
    // fallback to memory
  }
  if (memoryPlatformConfig) {
    return res.json({ exists: true, data: memoryPlatformConfig });
  }
  return res.json({ exists: false, data: null });
});

app.put('/api/platform-config', (req, res) => {
  const user = extractBearerUser(req);
  const isStrictSuperAdmin =
    Boolean(user) &&
    user!.email.toLowerCase() === 'essadhiif@gmail.com' &&
    user!.role === 'super_admin';
  if (!isStrictSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required.' });
  }
  const { aiGovernance, featureFlags } = req.body || {};
  if (!aiGovernance || typeof aiGovernance !== 'object') {
    return res.status(400).json({ error: 'Valid aiGovernance object is required.' });
  }
  const payload = {
    aiGovernance,
    featureFlags: Array.isArray(featureFlags) ? featureFlags.slice(0, 50) : [],
    updatedBy: user!.email,
    updatedAt: new Date().toISOString(),
  };
  memoryPlatformConfig = payload;
  ensureDataDirs();
  try {
    fs.writeFileSync(PLATFORM_CONFIG_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // Keep in-memory config when FS is read-only
  }
  return res.json({ ok: true, data: payload });
});

// =============================================================================
// Gemini AI Endpoints
// =============================================================================
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  const node = typeof req.query.node === 'string' ? req.query.node.slice(0, 64) : 'core';
  res.json({
    ok: true,
    node,
    status: 'operational',
    geminiConfigured: hasKey,
    uptimeSec: Math.round(process.uptime()),
    checkedAt: new Date().toISOString(),
  });
});

function guardAiRequest(req: express.Request, res: express.Response, creditCost = 25): GoogleGenAI | null {
  const user = extractBearerUser(req);
  if (user && user.status === 'suspended' && !isStrictSuperAdminUser(user)) {
    res.status(403).json({ error: 'Your account is suspended. Contact an administrator to restore AI access.' });
    return null;
  }
  if (user && !isStrictSuperAdminUser(user)) {
    const limit = user.aiCreditsLimit ?? PLAN_CREDIT_DEFAULTS[user.plan || 'bootstrap'] ?? 5000;
    const used = user.aiCreditsUsed ?? 0;
    if (used + creditCost > limit) {
      res.status(402).json({
        error: `Workspace AI credit quota reached (${used.toLocaleString()} / ${limit.toLocaleString()} credits). Upgrade plan or request a top-up.`,
        code: 'CREDIT_LIMIT_REACHED',
      });
      return null;
    }
  }
  const ai = getAiClient();
  if (!ai) {
    res.status(503).json({
      error: 'Missing API Key: GEMINI_API_KEY is not configured on the server.',
      code: 'MISSING_API_KEY',
      envVar: 'GEMINI_API_KEY',
    });
    return null;
  }
  return ai;
}

function recordServerAiCredits(req: express.Request, creditCost: number) {
  const user = extractBearerUser(req);
  if (!user || isStrictSuperAdminUser(user)) return;
  const users = loadUsers();
  const idx = users.findIndex((u) => u.uid === user.uid);
  if (idx !== -1) {
    users[idx].aiCreditsUsed = (users[idx].aiCreditsUsed ?? 0) + creditCost;
    saveUsers(users);
  }
}

app.post('/api/ai/generate', async (req, res) => {
  try {
    const { task, prompt, context } = req.body || {};
    const taskName = String(task || '').trim();
    const costMap: Record<string, number> = {
      youtube_ideation: 50,
      youtube_script: 150,
      seo_article: 250,
      social_captions: 40,
      hashtags: 20,
      inbox_reply: 30,
      rss_repurpose: 45,
      thread_summary: 25,
      lead_score: 25,
      ad_copy: 60,
      analyst: 35,
    };
    const creditCost = costMap[taskName] || 30;
    const ai = guardAiRequest(req, res, creditCost);
    if (!ai) return;

    if (!taskName || !prompt) {
      return res.status(400).json({ error: 'Both "task" and "prompt" fields are required.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Task: ${taskName}\nContext: ${context ? JSON.stringify(context).slice(0, 3500) : 'None'}\nPrompt:\n${String(prompt).slice(0, 6000)}`,
    });

    recordServerAiCredits(req, creditCost);
    return res.json({
      ok: true,
      task: taskName,
      creditsUsed: creditCost,
      text: response.text || '',
    });
  } catch (error) {
    console.error('Unified /api/ai/generate error:', error);
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'AI generation failed upstream. Please retry.',
    });
  }
});

app.post('/api/ai/reply-drafts', async (req, res) => {
  try {
    const ai = guardAiRequest(req, res, 30);
    if (!ai) return;
    const { contactName, contactTitle, tags, messages } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are an AI assistant for socialifyai.com. Read the conversation thread and CRM contact profile, then write 3 concise, high-converting reply options.
Contact: ${contactName} (${contactTitle || 'Lead'}), Tags: ${(tags || []).join(', ')}
Conversation:\n${(messages || []).map((m: { senderName: string; text: string }) => `${m.senderName}: ${m.text}`).join('\n')}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            professional: { type: Type.STRING },
            friendly: { type: Type.STRING },
            concise: { type: Type.STRING },
          },
          required: ['professional', 'friendly', 'concise'],
        },
      },
    });
    recordServerAiCredits(req, 30);
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI reply-drafts error:', error);
    return res.status(502).json({ error: 'Failed to generate AI reply drafts from Gemini API.' });
  }
});

app.post('/api/ai/summarize-thread', async (req, res) => {
  try {
    const ai = guardAiRequest(req, res, 25);
    if (!ai) return;
    const { messages } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze this social media conversation thread and extract a 1-sentence summary, sentiment, intent, suggested CRM tags (max 3), and sentimentScore (0 to 1).
Thread:\n${(messages || []).map((m: { senderName: string; text: string }) => `${m.senderName}: ${m.text}`).join('\n')}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            sentiment: { type: Type.STRING },
            intent: { type: Type.STRING },
            suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
            sentimentScore: { type: Type.NUMBER },
          },
          required: ['summary', 'sentiment', 'intent', 'suggestedTags', 'sentimentScore'],
        },
      },
    });
    recordServerAiCredits(req, 25);
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI summarize-thread error:', error);
    return res.status(502).json({ error: 'Failed to summarize conversation thread via Gemini API.' });
  }
});

app.post('/api/ai/score-lead', async (req, res) => {
  try {
    const ai = guardAiRequest(req, res, 25);
    if (!ai) return;
    const { name, notes, tags, ltv, lifecycleStage } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Score this Social CRM lead from 0 to 100 and recommend the next best action and follow-up DM.
Name: ${name}
Lifecycle: ${lifecycleStage}
LTV: ${ltv}
Tags: ${(tags || []).join(', ')}
Notes: ${notes}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            nextBestAction: { type: Type.STRING },
            followUpMessage: { type: Type.STRING },
          },
          required: ['score', 'reasoning', 'nextBestAction', 'followUpMessage'],
        },
      },
    });
    recordServerAiCredits(req, 25);
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI score-lead error:', error);
    return res.status(502).json({ error: 'Failed to score lead via Gemini API.' });
  }
});

app.post('/api/ai/repurpose', async (req, res) => {
  try {
    const ai = guardAiRequest(req, res, 40);
    if (!ai) return;
    const { topic, tone } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Repurpose this topic into platform-native social posts in a ${tone || 'Professional'} tone:
Topic: ${topic}
Include LinkedIn, X, Instagram, TikTok script hook, and 4 concise hashtags.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            linkedin: { type: Type.STRING },
            x: { type: Type.STRING },
            instagram: { type: Type.STRING },
            tiktok: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['linkedin', 'x', 'instagram', 'tiktok', 'hashtags'],
        },
      },
    });
    recordServerAiCredits(req, 40);
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI repurpose error:', error);
    return res.status(502).json({ error: 'Failed to generate repurposed copy via Gemini API.' });
  }
});

app.post('/api/ai/bulk-drafts', async (req, res) => {
  try {
    const ai = guardAiRequest(req, res, 80);
    if (!ai) return;
    const { topic, audience, tone, platforms, count } = req.body;
    const draftCount = Math.min(10, Math.max(5, Number(count) || 7));
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Generate ${draftCount} distinct, ready-to-publish social media drafts (each with a unique hook, angle, and CTA—no repetition).
Topic: ${topic}
Audience: ${audience}
Tone: ${tone}
Platforms: ${(platforms || []).join(', ')}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            drafts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  platform: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ['platform', 'content'],
              },
            },
          },
          required: ['drafts'],
        },
      },
    });
    recordServerAiCredits(req, 80);
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI bulk-drafts error:', error);
    return res.status(502).json({ error: 'Failed to generate bulk drafts via Gemini API.' });
  }
});

app.post('/api/ai/ad-copy', async (req, res) => {
  try {
    const ai = guardAiRequest(req, res, 60);
    if (!ai) return;
    const { platform, objective, audience } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Generate 3 high-converting paid ad variations for ${platform}.
Objective: ${objective}
Audience: ${audience}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            variations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  headline: { type: Type.STRING },
                  primaryText: { type: Type.STRING },
                  cta: { type: Type.STRING },
                  creativeConcept: { type: Type.STRING },
                },
                required: ['headline', 'primaryText', 'cta', 'creativeConcept'],
              },
            },
          },
          required: ['variations'],
        },
      },
    });
    recordServerAiCredits(req, 60);
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI ad-copy error:', error);
    return res.status(502).json({ error: 'Failed to generate ad copy variations via Gemini API.' });
  }
});

app.post('/api/ai/analyst', async (req, res) => {
  try {
    const ai = guardAiRequest(req, res, 35);
    if (!ai) return;
    const { summary, query } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are an expert Social CRM Strategist. Answer the user's question concisely using the workspace metrics below (under 70 words, cite specific numbers).
Workspace Summary: ${JSON.stringify(summary)}
Question: ${query}`,
    });
    recordServerAiCredits(req, 35);
    return res.json({ fallback: false, data: { answer: response.text || '' } });
  } catch (error) {
    console.error('AI analyst error:', error);
    return res.status(502).json({ error: 'AI Analyst query failed via Gemini API.' });
  }
});

// =============================================================================
// Customer Growth & Competitive Intelligence Tool Endpoints
// =============================================================================
function isSafePublicUrl(rawUrl: string): URL | null {
  try {
    const trimmed = rawUrl.trim();
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      host === 'localhost' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      /^0\./.test(host)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code) || 32));
}

async function fetchWebPageSummary(rawUrl: string): Promise<{
  fetched: boolean;
  url: string;
  title: string;
  description: string;
  headings: string[];
  excerpt: string;
  wordCount: number;
  error?: string;
}> {
  const parsed = isSafePublicUrl(rawUrl);
  if (!parsed) {
    return {
      fetched: false,
      url: rawUrl,
      title: '',
      description: '',
      headings: [],
      excerpt: '',
      wordCount: 0,
      error: 'Please provide a valid public http(s) URL.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7500);
  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; SocialifyAIBot/1.0; +https://www.socialifyai.com)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
    });
    if (!response.ok) {
      return {
        fetched: false,
        url: parsed.toString(),
        title: '',
        description: '',
        headings: [],
        excerpt: '',
        wordCount: 0,
        error: `Source returned HTTP ${response.status}. You can paste the article text directly instead.`,
      };
    }

    const html = (await response.text()).slice(0, 350_000);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

    const headingMatches = Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi))
      .map((m) => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
      .filter((h) => h.length >= 4 && h.length <= 160)
      .slice(0, 8);

    const stripped = decodeHtmlEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
        .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
        .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );

    const title = decodeHtmlEntities((ogTitleMatch?.[1] || titleMatch?.[1] || parsed.hostname).trim());
    const description = decodeHtmlEntities((descMatch?.[1] || '').trim());
    const excerpt = stripped.slice(0, 4500);
    const wordCount = excerpt ? excerpt.split(/\s+/).length : 0;

    return {
      fetched: true,
      url: parsed.toString(),
      title,
      description,
      headings: headingMatches,
      excerpt,
      wordCount,
    };
  } catch (err) {
    const msg = err instanceof Error && err.name === 'AbortError'
      ? 'Timed out while loading the URL. Try pasting the text directly.'
      : 'Could not fetch this URL directly (site may block automated readers). Paste the text below instead.';
    return {
      fetched: false,
      url: parsed.toString(),
      title: '',
      description: '',
      headings: [],
      excerpt: '',
      wordCount: 0,
      error: msg,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractJsonObject<T>(rawText: string): T | null {
  if (!rawText) return null;
  const cleaned = rawText.trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try fenced JSON block or outermost curly braces
    const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim()) as T;
      } catch {
        // continue
      }
    }
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractGroundingSources(response: unknown): { title: string; url: string }[] {
  const sources: { title: string; url: string }[] = [];
  const seen = new Set<string>();
  try {
    const r = response as {
      candidates?: Array<{
        groundingMetadata?: {
          groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
        };
      }>;
    };
    const chunks = r.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    for (const chunk of chunks) {
      const url = chunk.web?.uri;
      if (url && !seen.has(url)) {
        seen.add(url);
        sources.push({
          title: chunk.web?.title || new URL(url).hostname,
          url,
        });
      }
    }
  } catch {
    // ignore malformed metadata
  }
  return sources.slice(0, 8);
}

async function fetchLiveNewsRss(query: string, limit = 6): Promise<{ title: string; url: string; source: string; pubDate: string }[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(rssUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SocialifyAIBot/1.0; +https://www.socialifyai.com)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });
    if (!res.ok) return [];
    const xml = (await res.text()).slice(0, 250_000);
    const items: { title: string; url: string; source: string; pubDate: string }[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);
    for (const m of itemMatches) {
      if (items.length >= limit) break;
      const block = m[1];
      const titleRaw = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';
      const linkRaw = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '';
      const pubDateRaw = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '';
      const sourceRaw = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || '';
      const cleanTitle = decodeHtmlEntities(titleRaw.replace(/<!\[CDATA\[|\]\]>/g, '').trim());
      const cleanLink = linkRaw.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      if (cleanTitle && cleanLink.startsWith('http')) {
        items.push({
          title: cleanTitle,
          url: cleanLink,
          source: decodeHtmlEntities(sourceRaw.replace(/<!\[CDATA\[|\]\]>/g, '').trim()) || 'News',
          pubDate: pubDateRaw.trim(),
        });
      }
    }
    return items;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

app.post('/api/tools/competitor-intel', async (req, res) => {
  try {
    const { yourBrand, competitor, niche } = req.body || {};
    const compClean = String(competitor || '').trim();
    const brandClean = String(yourBrand || 'Your Brand').trim();
    const nicheClean = String(niche || 'B2B & Digital Growth').trim();

    if (!compClean || compClean.length < 2) {
      return res.status(400).json({ error: 'Enter a competitor name or website URL to analyze.' });
    }

    const looksLikeUrl = /^https?:\/\//i.test(compClean) || /^[a-z0-9-]+(\.[a-z]{2,})(\/.*)?$/i.test(compClean);
    const [scraped, newsItems] = await Promise.all([
      looksLikeUrl ? fetchWebPageSummary(compClean) : Promise.resolve(null),
      fetchLiveNewsRss(`${compClean} ${nicheClean}`, 5),
    ]);

    const baseSources: { title: string; url: string }[] = [];
    if (scraped?.fetched) {
      baseSources.push({ title: scraped.title || scraped.url, url: scraped.url });
    }
    for (const item of newsItems) {
      if (!baseSources.some((s) => s.url === item.url)) {
        baseSources.push({ title: item.title, url: item.url });
      }
    }

    const ai = getAiClient();
    if (ai) {
      const liveContext = [
        scraped?.fetched
          ? `Live webpage scraped from ${scraped.url}:\n- Title: ${scraped.title}\n- Description: ${scraped.description}\n- Headings: ${scraped.headings.join(' | ')}\n- Excerpt: ${scraped.excerpt.slice(0, 2200)}`
          : '',
        newsItems.length
          ? `Recent live news & coverage:\n${newsItems.map((n) => `- ${n.title} (${n.source}, ${n.pubDate})`).join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const basePrompt = `You are a senior competitive intelligence strategist for social media & growth marketing.
Analyze competitor "${compClean}" against our brand "${brandClean}" in the "${nicheClean}" niche.
${liveContext || 'Analyze their market positioning, common buyer frustrations, and social content strategy.'}

Provide:
- competitorName
- positioningSummary (2 sharp sentences on who they target and how they position)
- strengths (3-4 specific strengths)
- weaknesses (3-4 concrete blind spots, pricing/UX complaints, or messaging gaps)
- contentGaps (3-4 untapped topics with topic, whyItWins, recommendedFormat)
- counterPosts (3 complete ready-to-publish posts: one linkedin, one x, one instagram, differentiating ${brandClean} constructively)`;

      // Live Gemini structured JSON pass grounded on scraped webpage + real news RSS citations
      try {
        const schemaResp = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: basePrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                competitorName: { type: Type.STRING },
                positioningSummary: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                contentGaps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      topic: { type: Type.STRING },
                      whyItWins: { type: Type.STRING },
                      recommendedFormat: { type: Type.STRING },
                    },
                    required: ['topic', 'whyItWins', 'recommendedFormat'],
                  },
                },
                counterPosts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      platform: { type: Type.STRING },
                      angle: { type: Type.STRING },
                      content: { type: Type.STRING },
                    },
                    required: ['platform', 'angle', 'content'],
                  },
                },
              },
              required: ['competitorName', 'positioningSummary', 'strengths', 'weaknesses', 'contentGaps', 'counterPosts'],
            },
          },
        });

        const parsed = JSON.parse(schemaResp.text || '{}');
        if (parsed && Array.isArray(parsed.counterPosts) && parsed.counterPosts.length > 0) {
          const normalizedPosts = parsed.counterPosts.map(
            (p: { platform: string; angle: string; content: string }, i: number) => ({
              platform: (['linkedin', 'x', 'instagram'].includes(String(p.platform).toLowerCase())
                ? String(p.platform).toLowerCase()
                : (['linkedin', 'x', 'instagram'] as const)[i % 3]) as 'linkedin' | 'x' | 'instagram',
              angle: p.angle,
              content: p.content,
            })
          );
          return res.json({
            fallback: false,
            data: {
              ...parsed,
              counterPosts: normalizedPosts,
              scrapedPage: scraped?.fetched
                ? { url: scraped.url, title: scraped.title, description: scraped.description }
                : null,
              sources: baseSources.slice(0, 8),
            },
          });
        }
      } catch (err) {
        console.error('competitor-intel structured Gemini error:', err);
      }
    }

    // Offline fallback if no API key
    const targetName = scraped?.fetched ? scraped.title.split(/[|\-–]/)[0].trim() || compClean : compClean;
    return res.json({
      fallback: true,
      data: {
        competitorName: targetName,
        positioningSummary: scraped?.description
          ? `${targetName} positions around: "${scraped.description}". They focus heavily on broad awareness while leaving workflow depth and revenue attribution under-addressed.`
          : `${targetName} targets broad ${nicheClean} buyers with feature-heavy messaging, leaving room for ${brandClean} to own outcome-driven proof and faster execution.`,
        strengths: [
          `Established brand recognition and search footprint around ${nicheClean}.`,
          scraped?.headings?.[0]
            ? `Clear headline hook on their site: "${scraped.headings[0]}".`
            : 'Consistent top-of-funnel product announcement cadence.',
          'Large library of generic educational templates.',
        ],
        weaknesses: [
          'Generic feature lists instead of transparent ROI numbers and side-by-side workflow proof.',
          'Slow response loops between social engagement and real sales pipeline follow-up.',
          'Complex pricing tiers that frustrate lean teams and growing agencies.',
        ],
        contentGaps: [
          {
            topic: `Real ${nicheClean} tear-down: Before vs. After switching workflows`,
            whyItWins: 'Buyers trust concrete step-by-step screenshots and metrics over abstract claims.',
            recommendedFormat: 'LinkedIn Carousel',
          },
          {
            topic: 'Hidden time-sinks teams discover 60 days after adopting legacy tools',
            whyItWins: 'Captures active switchers searching for honest comparison insights.',
            recommendedFormat: 'X Thread',
          },
          {
            topic: '60-second live workflow walkthrough showing speed-to-outcome',
            whyItWins: 'Short proof clips outperform static graphics by 2.4x in saves and DMs.',
            recommendedFormat: 'Short-Form Video',
          },
        ],
        counterPosts: [
          {
            platform: 'linkedin',
            angle: 'Outcome vs. Feature Bloat',
            content: `Most teams in ${nicheClean} don't need 40 more buttons—they need one workflow that actually connects content to pipeline.\n\nWhen evaluating tools like ${targetName}, ask 3 questions:\n1. How many hours per week does it actually return to your team?\n2. Can you trace a social DM directly to closed revenue?\n3. Can a new teammate ship their first campaign in under 15 minutes?\n\nAt ${brandClean}, we built our entire workflow around those 3 answers. What's the #1 friction point in your current stack?`,
          },
          {
            platform: 'x',
            angle: 'Contrarian Speed Hook',
            content: `Hot take for ${nicheClean} teams:\n\nSwitching tools won't fix a broken workflow if your new tool takes 3 weeks to onboard.\n\n${brandClean} replaces 4 disconnected tabs with one unified workspace so you publish, reply, and close deals in one place.`,
          },
          {
            platform: 'instagram',
            angle: 'Carousel Checklist',
            content: `Evaluating your ${nicheClean} stack this quarter? Save this 4-point checklist before renewing an annual contract.\n\nSwipe through how ${brandClean} cuts weekly manual work in half while keeping every channel consistent. Drop "CHECKLIST" in the comments and we'll DM the full scorecard.`,
          },
        ],
        scrapedPage: scraped?.fetched
          ? { url: scraped.url, title: scraped.title, description: scraped.description }
          : null,
        sources: baseSources.slice(0, 8),
      },
    });
  } catch (error) {
    console.error('competitor-intel error:', error);
    return res.status(500).json({ error: 'Competitor analysis failed. Please try again.' });
  }
});

app.post('/api/tools/repurpose-url', async (req, res) => {
  try {
    const { url, rawText, tone, ctaGoal } = req.body || {};
    const urlStr = String(url || '').trim();
    const rawStr = String(rawText || '').trim();
    const toneStr = String(tone || 'Authoritative & Crisp').trim();
    const ctaStr = String(ctaGoal || 'Drive comments and inbound DMs').trim();

    if (!urlStr && rawStr.length < 25) {
      return res.status(400).json({
        error: 'Provide a public article URL or paste at least 25 characters of source text.',
      });
    }

    let sourceTitle = 'Custom Source Content';
    let sourceText = rawStr;
    let sourceUrl = '';
    let wordCount = rawStr ? rawStr.split(/\s+/).length : 0;

    if (urlStr) {
      const scraped = await fetchWebPageSummary(urlStr);
      if (!scraped.fetched || scraped.excerpt.length < 60) {
        if (rawStr.length < 25) {
          return res.status(422).json({
            error: scraped.error || 'Could not extract readable text from that URL. Paste the article copy directly below.',
          });
        }
      } else {
        sourceTitle = scraped.title || scraped.url;
        sourceUrl = scraped.url;
        sourceText = `Title: ${scraped.title}\nDescription: ${scraped.description}\nHeadings: ${scraped.headings.join(' | ')}\nBody: ${scraped.excerpt}`;
        wordCount = scraped.wordCount;
      }
    }

    const ai = getAiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `You are an elite omnichannel social media strategist. Repurpose the following REAL source content into platform-native assets.
Tone: ${toneStr}
CTA Objective: ${ctaStr}

SOURCE CONTENT:
${sourceText.slice(0, 4500)}

Rules:
- Every tweet in xThread MUST be strictly under 270 characters and punchy.
- LinkedIn post must open with a strong scroll-stopping 1-2 line hook, use clean spacing, and end with a genuine discussion CTA.
- Instagram carousel must have 5 concise slides (headline + short body per slide) plus a caption.
- TikTok script must include a 0-3s visual/verbal hook, structured body beats, and a direct CTA.
- Ground every point in the actual facts/ideas from the source content above.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                sourceTitle: { type: Type.STRING },
                keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
                linkedinPost: { type: Type.STRING },
                xThread: { type: Type.ARRAY, items: { type: Type.STRING } },
                instagramCarousel: {
                  type: Type.OBJECT,
                  properties: {
                    slides: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          slideNumber: { type: Type.NUMBER },
                          headline: { type: Type.STRING },
                          body: { type: Type.STRING },
                        },
                        required: ['slideNumber', 'headline', 'body'],
                      },
                    },
                    caption: { type: Type.STRING },
                  },
                  required: ['slides', 'caption'],
                },
                tiktokScript: {
                  type: Type.OBJECT,
                  properties: {
                    hook: { type: Type.STRING },
                    body: { type: Type.STRING },
                    cta: { type: Type.STRING },
                    estimatedSeconds: { type: Type.NUMBER },
                  },
                  required: ['hook', 'body', 'cta', 'estimatedSeconds'],
                },
                newsletterBlurb: {
                  type: Type.OBJECT,
                  properties: {
                    subject: { type: Type.STRING },
                    body: { type: Type.STRING },
                  },
                  required: ['subject', 'body'],
                },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: [
                'sourceTitle',
                'keyTakeaways',
                'linkedinPost',
                'xThread',
                'instagramCarousel',
                'tiktokScript',
                'newsletterBlurb',
                'hashtags',
              ],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({
          fallback: false,
          data: {
            ...parsed,
            sourceUrl,
            wordCount,
          },
        });
      } catch (err) {
        console.error('repurpose-url Gemini error:', err);
      }
    }

    const sentences = sourceText
      .replace(/Title:|Description:|Headings:|Body:/g, '')
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && s.length < 240);
    const keyTakeaways = sentences.slice(0, 4).length
      ? sentences.slice(0, 4)
      : [
          `Core theme extracted from ${sourceTitle}.`,
          'Turn long-form research into repeatable short-form hooks.',
          'Match format depth to each social feed instead of copy-pasting.',
        ];

    return res.json({
      fallback: true,
      data: {
        sourceTitle,
        sourceUrl,
        wordCount,
        keyTakeaways,
        linkedinPost: `Just broke down "${sourceTitle}" — here are the ${keyTakeaways.length} insights worth acting on this week:\n\n${keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nGoal: ${ctaStr}. Which of these resonates most with your team right now?`,
        xThread: [
          `1/ Just distilled "${sourceTitle.slice(0, 90)}" into a 30-second playbook. Thread:`,
          ...keyTakeaways.slice(0, 3).map((t, i) => `${i + 2}/ ${t.slice(0, 250)}`),
          `${Math.min(keyTakeaways.length, 3) + 2}/ Bottom line: ${ctaStr}. Bookmark this thread to revisit before your next sprint.`,
        ],
        instagramCarousel: {
          slides: [
            { slideNumber: 1, headline: sourceTitle.slice(0, 60), body: 'Swipe for the fast breakdown ->' },
            ...keyTakeaways.slice(0, 3).map((t, i) => ({
              slideNumber: i + 2,
              headline: `Takeaway #${i + 1}`,
              body: t.slice(0, 140),
            })),
            { slideNumber: 5, headline: 'Next Step', body: ctaStr },
          ],
          caption: `Key lessons from "${sourceTitle}" summarized into 5 quick slides. Save this post for reference and tell us your #1 takeaway below.`,
        },
        tiktokScript: {
          hook: `"Stop scrolling if you care about ${sourceTitle.slice(0, 55)} — here is what actually matters."`,
          body: keyTakeaways.slice(0, 3).join(' '),
          cta: `Follow for daily breakdowns and comment "GUIDE" — ${ctaStr}.`,
          estimatedSeconds: 32,
        },
        newsletterBlurb: {
          subject: `Quick breakdown: ${sourceTitle.slice(0, 65)}`,
          body: `${keyTakeaways.slice(0, 2).join(' ')} ${sourceUrl ? `Read full source: ${sourceUrl}` : ''}`,
        },
        hashtags: ['#ContentStrategy', '#SocialGrowth', '#MarketingPlaybook', '#CreatorOps', '#DigitalMarketing'],
      },
    });
  } catch (error) {
    console.error('repurpose-url error:', error);
    return res.status(500).json({ error: 'Repurposing failed. Please check your input and retry.' });
  }
});

app.post('/api/tools/virality-audit', async (req, res) => {
  try {
    const { content, platform, audience } = req.body || {};
    const draft = String(content || '').trim();
    const plat = String(platform || 'linkedin').toLowerCase();
    const aud = String(audience || 'B2B decision makers & founders').trim();

    if (draft.length < 15) {
      return res.status(400).json({ error: 'Paste at least 15 characters of draft copy to audit.' });
    }

    const lines = draft.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || draft.slice(0, 120);
    const words = draft.split(/\s+/).filter(Boolean);
    const hasQuestion = /\?/.test(draft);
    const hasNumbers = /\d/.test(draft);
    const charLimits: Record<string, number> = {
      x: 280,
      threads: 500,
      linkedin: 3000,
      instagram: 2200,
      tiktok: 2200,
    };
    const limit = charLimits[plat] || 2200;

    const ai = getAiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `You are a viral social copy editor. Audit the following draft post for ${plat.toUpperCase()} targeting "${aud}".

DRAFT:
"""
${draft}
"""

Score honestly (do NOT inflate scores if the hook is generic). Give concrete, line-specific feedback and write 5 genuinely stronger A/B hook rewrites using 5 distinct frameworks: "Contrarian", "Data / Specificity", "Story Open", "Curiosity Gap", and "Direct Pain Point". Each variant must include the complete rewritten post ready to publish on ${plat}.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overallScore: { type: Type.NUMBER },
                hookScore: { type: Type.NUMBER },
                clarityScore: { type: Type.NUMBER },
                ctaScore: { type: Type.NUMBER },
                verdict: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                fixes: { type: Type.ARRAY, items: { type: Type.STRING } },
                hookVariants: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      framework: { type: Type.STRING },
                      hookLine: { type: Type.STRING },
                      fullPost: { type: Type.STRING },
                      whyItWorks: { type: Type.STRING },
                    },
                    required: ['framework', 'hookLine', 'fullPost', 'whyItWorks'],
                  },
                },
              },
              required: ['overallScore', 'hookScore', 'clarityScore', 'ctaScore', 'verdict', 'strengths', 'fixes', 'hookVariants'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({
          fallback: false,
          data: {
            ...parsed,
            diagnostics: {
              charCount: draft.length,
              charLimit: limit,
              wordCount: words.length,
              lineCount: lines.length,
              hasQuestion,
              hasNumbers,
              hookLength: firstLine.length,
            },
          },
        });
      } catch (err) {
        console.error('virality-audit Gemini error:', err);
      }
    }

    const hookScore = Math.min(92, 48 + (firstLine.length <= 115 ? 16 : 4) + (hasNumbers ? 14 : 0) + (/[?!:]/.test(firstLine) ? 10 : 0));
    const clarityScore = Math.min(94, 55 + (lines.length >= 3 ? 18 : 6) + (words.length <= 220 ? 12 : 4));
    const ctaScore = hasQuestion ? 82 : 52;
    const overallScore = Math.round(hookScore * 0.45 + clarityScore * 0.3 + ctaScore * 0.25);

    const restBody = lines.slice(1).join('\n\n') || draft;
    return res.json({
      fallback: true,
      data: {
        overallScore,
        hookScore,
        clarityScore,
        ctaScore,
        verdict:
          overallScore >= 78
            ? 'Strong foundation — sharpening the opening line can unlock higher feed dwell time.'
            : 'Opening line needs sharper tension and clearer formatting before publishing.',
        strengths: [
          hasNumbers ? 'Uses specific numbers that anchor reader credibility.' : 'Clear core subject matter for the target audience.',
          lines.length >= 3 ? 'Uses multi-line spacing for mobile skimmability.' : 'Concise message length that respects feed attention.',
        ],
        fixes: [
          firstLine.length > 120 ? `Shorten line 1 from ${firstLine.length} chars to under 95 chars so it stays visible above "See more".` : 'Add a concrete stake or surprising tension in line 1.',
          !hasQuestion ? 'End with a low-friction 1-sentence question to invite replies and algorithmic reach.' : 'Tighten the final line so the CTA stands on its own paragraph.',
          !hasNumbers ? 'Anchor one claim with a real timeframe, percentage, or step count.' : 'Trim filler adverbs to increase punch per line.',
        ],
        hookVariants: [
          {
            framework: 'Contrarian',
            hookLine: `Unpopular truth for ${aud}: doing more of this actually slows your growth.`,
            fullPost: `Unpopular truth for ${aud}: doing more of this actually slows your growth.\n\n${restBody}\n\nAgree or disagree?`,
            whyItWorks: 'Pattern-interrupts passive scrolling by challenging consensus assumptions immediately.',
          },
          {
            framework: 'Data / Specificity',
            hookLine: `We tested this exact change over 30 days — here is what actually moved the needle:`,
            fullPost: `We tested this exact change over 30 days — here is what actually moved the needle:\n\n${restBody}\n\nWhich step would you implement first?`,
            whyItWorks: 'Timeframes and specificity trigger instant authority bias.',
          },
          {
            framework: 'Story Open',
            hookLine: `Six months ago, our team was making the exact mistake I keep seeing everywhere:`,
            fullPost: `Six months ago, our team was making the exact mistake I keep seeing everywhere:\n\n${restBody}\n\nHave you run into this too?`,
            whyItWorks: 'Opens an emotional narrative loop that increases click-to-expand rate.',
          },
          {
            framework: 'Curiosity Gap',
            hookLine: `The 1 shift separating top 5% teams from everyone else right now:`,
            fullPost: `The 1 shift separating top 5% teams from everyone else right now:\n\n${restBody}\n\nSave this before next week's planning session.`,
            whyItWorks: 'Creates an open information gap that compels readers to expand the post.',
          },
          {
            framework: 'Direct Pain Point',
            hookLine: `If you're tired of spending hours on this with flat results, steal this 3-minute fix:`,
            fullPost: `If you're tired of spending hours on this with flat results, steal this 3-minute fix:\n\n${restBody}\n\nDrop a comment if you want the template.`,
            whyItWorks: 'Speaks directly to an active frustration and promises immediate relief.',
          },
        ],
        diagnostics: {
          charCount: draft.length,
          charLimit: limit,
          wordCount: words.length,
          lineCount: lines.length,
          hasQuestion,
          hasNumbers,
          hookLength: firstLine.length,
        },
      },
    });
  } catch (error) {
    console.error('virality-audit error:', error);
    return res.status(500).json({ error: 'Virality audit failed. Please try again.' });
  }
});

app.post('/api/tools/live-trends', async (req, res) => {
  try {
    const { niche, region, audience } = req.body || {};
    const nicheClean = String(niche || '').trim();
    const regionClean = String(region || 'Global').trim();
    const audClean = String(audience || 'Founders & Marketers').trim();

    if (!nicheClean || nicheClean.length < 2) {
      return res.status(400).json({ error: 'Enter an industry, topic, or keyword to scan live trends.' });
    }

    const rssItems = await fetchLiveNewsRss(
      regionClean === 'Global' ? nicheClean : `${nicheClean} ${regionClean}`,
      7
    );
    const rssSources = rssItems.map((i) => ({ title: `${i.title} (${i.source})`, url: i.url }));

    const ai = getAiClient();
    if (ai) {
      const liveHeadlinesBlock = rssItems.length
        ? `LIVE BREAKING NEWS HEADLINES FETCHED RIGHT NOW:\n${rssItems
            .map((item, idx) => `${idx + 1}. "${item.title}" — ${item.source} (${item.pubDate})`)
            .join('\n')}`
        : `Focus on the sharpest current developments in "${nicheClean}" (${regionClean}).`;

      const trendPrompt = `You are a real-time social media newsjacking strategist.
Synthesize 4 timely, high-engagement trend angles in "${nicheClean}" (region: ${regionClean}) tailored to "${audClean}".
${liveHeadlinesBlock}

For each of the 4 trends, provide:
- headline: specific current development
- whyNow: 1-2 sentences explaining why audiences care right now
- momentum: "Breaking" | "Rising Fast" | "High Discussion"
- suggestedPlatform: "linkedin" | "x" | "instagram" | "tiktok"
- newsjackAngle: strategic POV a brand should take
- draftPost: complete ready-to-publish social media post with hook + insights + CTA`;

      // Live Gemini structured JSON pass grounded on real fetched RSS news headlines
      try {
        const schemaResp = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: trendPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                niche: { type: Type.STRING },
                trends: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      headline: { type: Type.STRING },
                      whyNow: { type: Type.STRING },
                      momentum: { type: Type.STRING },
                      suggestedPlatform: { type: Type.STRING },
                      newsjackAngle: { type: Type.STRING },
                      draftPost: { type: Type.STRING },
                    },
                    required: ['headline', 'whyNow', 'momentum', 'suggestedPlatform', 'newsjackAngle', 'draftPost'],
                  },
                },
              },
              required: ['niche', 'trends'],
            },
          },
        });

        const parsed = JSON.parse(schemaResp.text || '{}');
        if (parsed && Array.isArray(parsed.trends) && parsed.trends.length > 0) {
          const validPlats = ['linkedin', 'x', 'instagram', 'tiktok'] as const;
          const normalized = parsed.trends.map(
            (
              t: {
                headline: string;
                whyNow: string;
                momentum: string;
                suggestedPlatform: string;
                newsjackAngle: string;
                draftPost: string;
              },
              i: number
            ) => ({
              ...t,
              suggestedPlatform: validPlats.includes(String(t.suggestedPlatform).toLowerCase() as (typeof validPlats)[number])
                ? (String(t.suggestedPlatform).toLowerCase() as (typeof validPlats)[number])
                : validPlats[i % validPlats.length],
            })
          );
          return res.json({
            fallback: false,
            data: {
              niche: parsed.niche || nicheClean,
              trends: normalized,
              sources: rssSources.slice(0, 8),
              scannedAt: new Date().toISOString(),
            },
          });
        }
      } catch (err) {
        console.error('live-trends structured Gemini error:', err);
      }
    }

    return res.json({
      fallback: true,
      data: {
        niche: nicheClean,
        scannedAt: new Date().toISOString(),
        sources: rssSources.slice(0, 8),
        trends: [
          {
            headline: `AI workflow consolidation inside ${nicheClean} teams`,
            whyNow: `Buyers in ${regionClean} are cutting redundant SaaS subscriptions in favor of unified platforms with built-in attribution.`,
            momentum: 'Rising Fast',
            suggestedPlatform: 'linkedin',
            newsjackAngle: 'Share a transparent breakdown of how consolidating tools saves hours and budget.',
            draftPost: `Everyone in ${nicheClean} is auditing their tool stack right now.\n\nThe pattern we keep seeing with ${audClean}: teams paying for 5 point solutions that don't share data are losing hours every week to manual copy-paste.\n\nWhich single tool in your workflow delivered the clearest ROI this quarter?`,
          },
          {
            headline: `Short-form founder walkthroughs outperforming polished ads in ${nicheClean}`,
            whyNow: 'Authentic screen-recorded demos and candid breakdowns are earning higher saves and DM inquiries than studio creative.',
            momentum: 'High Discussion',
            suggestedPlatform: 'x',
            newsjackAngle: 'Show a raw 45-second behind-the-scenes clip of your real workflow.',
            draftPost: `Observation in ${nicheClean}: raw 45-second founder walkthroughs are beating $10k studio ad shoots right now.\n\nBuyers want to see the real product solving a real problem in 3 clicks—not another stock-footage reel.`,
          },
          {
            headline: `Zero-click educational carousels driving inbound DMs for ${audClean}`,
            whyNow: 'Native checklists and frameworks keep users in-feed longer, earning stronger algorithmic distribution.',
            momentum: 'Breaking',
            suggestedPlatform: 'instagram',
            newsjackAngle: 'Package your best internal SOP into a 5-slide saveable swipe deck.',
            draftPost: `External link posts are getting throttled across feeds—but saveable step-by-step checklists in ${nicheClean} are exploding in reach.\n\nSave this framework and comment "PLAYBOOK" if you want our editable template.`,
          },
        ],
      },
    });
  } catch (error) {
    console.error('live-trends error:', error);
    return res.status(500).json({ error: 'Live trend radar failed. Please try again.' });
  }
});

// =============================================================================
// Enterprise Module Endpoints: YouTube Studio, AI SEO CMS, Discover & RSS
// =============================================================================
app.post('/api/ai/youtube-studio', async (req, res) => {
  try {
    const { mode, niche, topic, format, tone, channelName } = req.body || {};
    const nicheClean = String(niche || 'Digital Marketing & Creator Growth').trim();
    const topicClean = String(topic || '').trim();
    const formatClean = format === 'short' ? 'short' : 'long_form';
    const toneClean = String(tone || 'High-Retention & Practical').trim();
    const channelClean = String(channelName || 'YouTube Channel').trim();

    const ai = guardAiRequest(req, res, mode === 'ideation' ? 50 : 150);
    if (!ai) return;

    if (mode === 'ideation') {
      if (!nicheClean || nicheClean.length < 2) {
        return res.status(400).json({ error: 'Enter a niche or keyword to generate YouTube concepts.' });
      }
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `You are an expert YouTube growth strategist. Generate 5 high-CTR YouTube video & Shorts concepts for the channel "${channelClean}" in the "${nicheClean}" niche.
Target format preference: ${formatClean === 'short' ? 'YouTube Shorts (under 60s)' : 'Mix of Long-Form (8-14 min) and Shorts'}.
For each concept provide: topic, format ("long_form" or "short"), hookAngle, searchIntent ("High Search" | "Suggested Feed" | "Trending"), and thumbnailHeadline (max 4 punchy words).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ideas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    format: { type: Type.STRING },
                    hookAngle: { type: Type.STRING },
                    searchIntent: { type: Type.STRING },
                    thumbnailHeadline: { type: Type.STRING },
                  },
                  required: ['topic', 'format', 'hookAngle', 'searchIntent', 'thumbnailHeadline'],
                },
              },
            },
            required: ['ideas'],
          },
        },
      });
      const parsed = JSON.parse(response.text || '{}');
      return res.json({ fallback: false, data: parsed });
    }

    if (!topicClean || topicClean.length < 3) {
      return res.status(400).json({ error: 'Enter a video topic to generate the script & metadata pipeline.' });
    }
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are a senior YouTube producer and SEO strategist for "${channelClean}" (${nicheClean}).
Create a complete production package for a ${formatClean === 'short' ? 'YouTube Short (45-58 seconds)' : 'Long-Form YouTube video (8-12 minutes)'} on:
Topic: "${topicClean}"
Tone: ${toneClean}

Return structured JSON with:
- seoTitles: 4 distinct high-CTR SEO titles (under 68 chars)
- description: SEO-optimized YouTube description (2-3 crisp paragraphs)
- script: { hook (0-15s pattern interrupt), body (structured beats with visual cues), cta (clear subscribe/comment CTA) }
- chapters: 4-6 timestamps (e.g. "00:00", "01:15", etc.) with concise labels
- tags: 10 targeted YouTube SEO tags (without #)
- pinnedComment: conversation-sparking pinned first comment
- thumbnailPrompt: detailed visual art direction prompt for a high-CTR thumbnail
- thumbnailHeadline: 2-4 bold words to overlay on the thumbnail`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            seoTitles: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING },
            script: {
              type: Type.OBJECT,
              properties: {
                hook: { type: Type.STRING },
                body: { type: Type.STRING },
                cta: { type: Type.STRING },
              },
              required: ['hook', 'body', 'cta'],
            },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp: { type: Type.STRING },
                  label: { type: Type.STRING },
                },
                required: ['timestamp', 'label'],
              },
            },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            pinnedComment: { type: Type.STRING },
            thumbnailPrompt: { type: Type.STRING },
            thumbnailHeadline: { type: Type.STRING },
          },
          required: [
            'seoTitles',
            'description',
            'script',
            'chapters',
            'tags',
            'pinnedComment',
            'thumbnailPrompt',
            'thumbnailHeadline',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ fallback: false, data: parsed });
  } catch (error) {
    console.error('youtube-studio error:', error);
    return res.status(500).json({ error: 'YouTube AI generation failed. Please try again.' });
  }
});

app.post('/api/ai/seo-article', async (req, res) => {
  try {
    const { targetKeyword, sourceUrl, brandName, audience, tone } = req.body || {};
    const keywordClean = String(targetKeyword || '').trim();
    const urlClean = String(sourceUrl || '').trim();
    const brandClean = String(brandName || 'Your Brand').trim();
    const audienceClean = String(audience || 'B2B Founders & Growth Teams').trim();
    const toneClean = String(tone || 'Authoritative Editorial').trim();

    if (!keywordClean || keywordClean.length < 2) {
      return res.status(400).json({ error: 'Enter a target keyword to generate an SEO blog article.' });
    }

    const ai = guardAiRequest(req, res, 250);
    if (!ai) return;

    const scraped = urlClean ? await fetchWebPageSummary(urlClean) : null;
    const referenceBlock = scraped?.fetched
      ? `\nReference Source URL (${scraped.url}):\nTitle: ${scraped.title}\nHeadings: ${scraped.headings.join(' | ')}\nExcerpt: ${scraped.excerpt.slice(0, 2200)}`
      : '';

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are a Principal SEO Content Architect writing for "${brandClean}" targeting "${audienceClean}" in a "${toneClean}" voice.
Write a comprehensive, publication-ready long-form SEO blog article targeting the keyword: "${keywordClean}".
${referenceBlock}

Requirements:
- title & h1: compelling, keyword-rich headline
- slug: clean lowercase kebab-case URL slug
- metaTitle: strictly 50-60 characters including the target keyword
- metaDescription: strictly 140-158 characters with clear value proposition
- heroImageAlt: descriptive SEO alt text for the featured hero visual
- sections: 5 rich sections mixing "h2" and "h3" headings, each with 2-3 substantive paragraphs (no filler fluff), plus an inline visual specification (visualAlt, visualCaption, visualType: "infographic" | "diagram" | "callout") on at least 2 sections
- schemaFaq: 4 realistic FAQ items optimized for Google FAQPage JSON-LD
- internalLinks: 3 internal link suggestions (anchor, suggestedSlug, rationale)
- socialBundle: complete multi-channel syndication posts derived from this article:
  - linkedinCarousel: slide-by-slide outline (5 slides) + intro hook
  - xThread: 4-tweet numbered thread under 270 chars per tweet separated by blank lines
  - instagramCaption: engaging IG caption with CTA and 4 hashtags
  - facebookPost: conversational Facebook summary post`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            slug: { type: Type.STRING },
            metaTitle: { type: Type.STRING },
            metaDescription: { type: Type.STRING },
            h1: { type: Type.STRING },
            heroImageAlt: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING },
                  level: { type: Type.STRING },
                  body: { type: Type.STRING },
                  visualAlt: { type: Type.STRING },
                  visualCaption: { type: Type.STRING },
                  visualType: { type: Type.STRING },
                },
                required: ['heading', 'level', 'body'],
              },
            },
            schemaFaq: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                },
                required: ['question', 'answer'],
              },
            },
            internalLinks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  anchor: { type: Type.STRING },
                  suggestedSlug: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                },
                required: ['anchor', 'suggestedSlug', 'rationale'],
              },
            },
            socialBundle: {
              type: Type.OBJECT,
              properties: {
                linkedinCarousel: { type: Type.STRING },
                xThread: { type: Type.STRING },
                instagramCaption: { type: Type.STRING },
                facebookPost: { type: Type.STRING },
              },
              required: ['linkedinCarousel', 'xThread', 'instagramCaption', 'facebookPost'],
            },
          },
          required: [
            'title',
            'slug',
            'metaTitle',
            'metaDescription',
            'h1',
            'heroImageAlt',
            'sections',
            'schemaFaq',
            'internalLinks',
            'socialBundle',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const sections = Array.isArray(parsed.sections)
      ? parsed.sections.map((s: Record<string, string>) => ({
          heading: String(s.heading || ''),
          level: s.level === 'h3' ? 'h3' : 'h2',
          body: String(s.body || ''),
          visualAlt: s.visualAlt || undefined,
          visualCaption: s.visualCaption || undefined,
          visualType:
            s.visualType === 'diagram' || s.visualType === 'callout' || s.visualType === 'infographic'
              ? s.visualType
              : undefined,
        }))
      : [];

    const fullText = [parsed.h1 || '', ...sections.map((s: { heading: string; body: string }) => `${s.heading} ${s.body}`)].join(' ');
    const words = fullText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const sentences = Math.max(1, fullText.split(/[.!?]+/).filter((s) => s.trim().length > 0).length);
    const avgWordsPerSentence = wordCount / sentences;
    const readabilityScore = Math.max(45, Math.min(96, Math.round(100 - Math.max(0, avgWordsPerSentence - 12) * 1.9)));

    const kwLower = keywordClean.toLowerCase();
    let seoChecks = 0;
    if ((parsed.metaTitle || '').toLowerCase().includes(kwLower)) seoChecks += 20;
    if ((parsed.metaDescription || '').length >= 110 && (parsed.metaDescription || '').length <= 170) seoChecks += 15;
    if ((parsed.h1 || '').toLowerCase().includes(kwLower)) seoChecks += 20;
    if (sections.length >= 4) seoChecks += 15;
    if (Array.isArray(parsed.schemaFaq) && parsed.schemaFaq.length >= 3) seoChecks += 15;
    if (Array.isArray(parsed.internalLinks) && parsed.internalLinks.length >= 2) seoChecks += 15;
    const seoScore = Math.max(60, Math.min(100, seoChecks));

    return res.json({
      fallback: false,
      data: {
        ...parsed,
        sections,
        wordCount,
        readabilityScore,
        seoScore,
      },
    });
  } catch (error) {
    console.error('seo-article error:', error);
    return res.status(500).json({ error: 'SEO article generation failed. Please try again.' });
  }
});

// Note: POST /api/cms/publish is handled by createIntegrationsRouter (real WordPress, Webflow, Shopify, Ghost & Signed Webhook dispatch)

app.post('/api/discover/fetch-rss', async (req, res) => {
  try {
    const { feedUrl, keywordFilter, sourceName, sourceType } = req.body || {};
    const parsedUrl = isSafePublicUrl(String(feedUrl || ''));
    if (!parsedUrl) {
      return res.status(400).json({ error: 'Enter a valid public http(s) RSS, Atom, or YouTube feed URL.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    let xml = '';
    try {
      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SocialifyAIBot/1.0; +https://www.socialifyai.com)',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
      });
      if (!response.ok) {
        return res.status(422).json({ error: `Feed returned HTTP ${response.status}. Verify the RSS/Atom URL.` });
      }
      xml = (await response.text()).slice(0, 350_000);
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'AbortError'
          ? 'Timed out while fetching the feed URL.'
          : 'Could not reach the RSS/Atom feed URL.';
      return res.status(422).json({ error: msg });
    } finally {
      clearTimeout(timeout);
    }

    const items: { title: string; summary: string; url: string; publishedAt: string }[] = [];
    const rssBlocks = Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi));
    const atomBlocks = rssBlocks.length === 0 ? Array.from(xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)) : [];
    const blocks = rssBlocks.length > 0 ? rssBlocks : atomBlocks;

    for (const match of blocks.slice(0, 20)) {
      const block = match[1];
      const titleRaw = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
      const linkHref =
        block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ||
        block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ||
        '';
      const descRaw =
        block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ||
        block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ||
        block.match(/<media:description[^>]*>([\s\S]*?)<\/media:description>/i)?.[1] ||
        '';
      const dateRaw =
        block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ||
        block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1] ||
        block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] ||
        '';

      const cleanTitle = decodeHtmlEntities(titleRaw.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim());
      const cleanUrl = linkHref.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      const cleanSummary = decodeHtmlEntities(
        descRaw.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      ).slice(0, 280);

      if (cleanTitle && cleanUrl.startsWith('http')) {
        items.push({
          title: cleanTitle,
          summary: cleanSummary || `Latest item published on ${sourceName || parsedUrl.hostname}.`,
          url: cleanUrl,
          publishedAt: dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString(),
        });
      }
    }

    const filterTokens = String(keywordFilter || '')
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const filtered =
      filterTokens.length > 0
        ? items.filter((item) => {
            const hay = `${item.title} ${item.summary}`.toLowerCase();
            return filterTokens.some((tok) => hay.includes(tok));
          })
        : items;

    return res.json({
      fetchedAt: new Date().toISOString(),
      sourceName: sourceName || parsedUrl.hostname,
      sourceType: sourceType || 'rss',
      totalParsed: items.length,
      items: filtered.slice(0, 12),
    });
  } catch (error) {
    console.error('fetch-rss error:', error);
    return res.status(500).json({ error: 'RSS feed import failed.' });
  }
});

app.post('/api/discover/explore', async (req, res) => {
  try {
    const { query, channelFilter, velocityFilter } = req.body || {};
    const qClean = String(query || '').trim();
    if (!qClean || qClean.length < 2) {
      return res.status(400).json({ error: 'Enter a topic, keyword, or hashtag to discover viral content.' });
    }

    const rssQuery =
      channelFilter && channelFilter !== 'all' ? `${qClean} ${channelFilter}` : qClean;
    const liveNews = await fetchLiveNewsRss(rssQuery, 8);

    const ai = getAiClient();
    if (!ai) {
      return res.json({
        fallback: true,
        items: liveNews.map((n, idx) => ({
          id: `disc-${Date.now()}-${idx}`,
          sourceName: n.source,
          channel: 'news',
          title: n.title,
          summary: `Live coverage from ${n.source} matching "${qClean}".`,
          url: n.url,
          publishedAt: n.pubDate ? new Date(n.pubDate).toISOString() : new Date().toISOString(),
          velocityLabel: 'Breaking',
        })),
      });
    }

    const headlinesContext = liveNews.length
      ? `LIVE REAL-TIME SOURCES:\n${liveNews.map((n, i) => `${i + 1}. "${n.title}" — ${n.source} (${n.url})`).join('\n')}`
      : `Topic query: "${qClean}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are a viral content discovery engine. Curate 6 high-signal trending posts/articles matching "${qClean}" (channel filter: ${channelFilter || 'all'}, velocity filter: ${velocityFilter || 'all'}).
${headlinesContext}

Return structured JSON array "items" with:
- sourceName (real publisher or platform creator channel)
- channel ("youtube" | "x" | "reddit" | "news" | "blog")
- title (concise headline)
- summary (1-2 sharp sentences summarizing the core viral hook or insight)
- url (use exact URL from LIVE REAL-TIME SOURCES when grounded, otherwise a clean canonical domain URL)
- velocityLabel ("Breakout" | "Rising Fast" | "High Discussion")`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sourceName: { type: Type.STRING },
                  channel: { type: Type.STRING },
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  url: { type: Type.STRING },
                  velocityLabel: { type: Type.STRING },
                },
                required: ['sourceName', 'channel', 'title', 'summary', 'url', 'velocityLabel'],
              },
            },
          },
          required: ['items'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const validChannels = new Set(['youtube', 'x', 'reddit', 'news', 'blog', 'rss']);
    const items = (Array.isArray(parsed.items) ? parsed.items : []).map(
      (item: Record<string, string>, idx: number) => ({
        id: `disc-${Date.now()}-${idx}`,
        sourceName: String(item.sourceName || 'Web Source'),
        channel: validChannels.has(String(item.channel).toLowerCase())
          ? String(item.channel).toLowerCase()
          : 'news',
        title: String(item.title || ''),
        summary: String(item.summary || ''),
        url: String(item.url || liveNews[idx]?.url || 'https://www.socialifyai.com'),
        publishedAt: new Date().toISOString(),
        velocityLabel: String(item.velocityLabel || 'Rising Fast'),
      })
    );

    return res.json({ fallback: false, items });
  } catch (error) {
    console.error('discover-explore error:', error);
    return res.status(500).json({ error: 'Viral discovery search failed.' });
  }
});

app.post('/api/discover/repurpose', async (req, res) => {
  try {
    const { title, summary, url, platform, brandVoice, utmCampaign } = req.body || {};
    const targetPlatform = String(platform || 'linkedin').toLowerCase();
    const ai = guardAiRequest(req, res, 45);
    if (!ai) return;

    let trackedUrl = String(url || '').trim();
    const campaignTag = String(utmCampaign || 'curated_growth')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_') || 'curated_growth';
    if (trackedUrl && /^https?:\/\//i.test(trackedUrl)) {
      try {
        const u = new URL(trackedUrl);
        u.searchParams.set('utm_source', targetPlatform);
        u.searchParams.set('utm_medium', 'social_curated');
        u.searchParams.set('utm_campaign', campaignTag);
        trackedUrl = u.toString();
      } catch {
        // leave original url
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Rewrite and spin this curated item into an original, native ${targetPlatform.toUpperCase()} social post.
Brand Voice: ${brandVoice || 'Sharp, practical, human strategist'}
Source Title: ${title}
Source Summary: ${summary}
Attribution Link: ${trackedUrl || 'None'}

Rules:
- Match ${targetPlatform} character limits and formatting best practices.
- Include a compelling opening hook, original takeaway, and CTA.
- Attach the exact attribution link with UTM parameters if provided.
Return JSON with: content (string) and firstComment (string with 3-4 targeted hashtags or source note).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            firstComment: { type: Type.STRING },
          },
          required: ['content', 'firstComment'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}') as { content?: string; firstComment?: string };
    let finalContent = String(parsed.content || '').trim();
    const finalFirstComment = String(parsed.firstComment || '').trim();
    if (
      trackedUrl &&
      !finalContent.includes('utm_source=') &&
      !finalFirstComment.includes('utm_source=')
    ) {
      finalContent = `${finalContent}\n\n${trackedUrl}`.trim();
    }
    return res.json({
      fallback: false,
      data: { content: finalContent, firstComment: finalFirstComment, trackedUrl },
    });
  } catch (error) {
    console.error('discover-repurpose error:', error);
    return res.status(500).json({ error: 'AI repurpose failed. Please try again.' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    app.use(express.static(path.resolve(__dirname, 'public')));
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`socialifyai.com server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
