import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

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
const TOKEN_SECRET =
  process.env.AUTH_SESSION_SECRET ||
  crypto.createHash('sha256').update(`socialifyai-session-secret-${__dirname}`).digest('hex');

interface StoredUser {
  uid: string;
  email: string;
  displayName: string;
  companyName?: string;
  role: 'super_admin' | 'customer';
  salt: string;
  passwordHash: string;
  createdAt: string;
}

function ensureDataDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(WORKSPACES_DIR)) fs.mkdirSync(WORKSPACES_DIR, { recursive: true });
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

function loadUsers(): StoredUser[] {
  ensureDataDirs();
  let users: StoredUser[] = [];
  if (fs.existsSync(USERS_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      if (Array.isArray(raw)) users = raw;
    } catch {
      users = [];
    }
  }

  // Ensure configured Super Admin account (essadhiif@gmail.com) exists with salted scrypt hash
  const adminEmail = 'essadhiif@gmail.com';
  const hasSuperAdmin = users.some((u) => u.email.toLowerCase() === adminEmail);
  if (!hasSuperAdmin) {
    const salt = crypto.randomBytes(16).toString('hex');
    const superAdmin: StoredUser = {
      uid: 'admin-essadhiif',
      email: adminEmail,
      displayName: 'Super Admin',
      companyName: 'socialifyai.com HQ',
      role: 'super_admin',
      salt,
      passwordHash: hashPassword('test1213', salt),
      createdAt: new Date().toISOString(),
    };
    users.push(superAdmin);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  }
  return users;
}

function saveUsers(users: StoredUser[]) {
  ensureDataDirs();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
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

function toPublicUser(u: StoredUser) {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    companyName: u.companyName || '',
    role: u.role,
    isAdmin: u.role === 'super_admin',
    createdAt: u.createdAt,
  };
}

// Initialize auth user store on boot
loadUsers();

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
  const cleanPassword = String(password || '');

  if (!cleanEmail || !cleanPassword) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const users = loadUsers();
  const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!found || !verifyPassword(cleanPassword, found.salt, found.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password. Please check your credentials and try again.' });
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
  return res.json({ user: toPublicUser(user) });
});

app.post('/api/auth/logout', (_req, res) => {
  return res.json({ ok: true });
});

// Server-side workspace persistence for Email/Password accounts
app.get('/api/workspace', (req, res) => {
  const user = extractBearerUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  ensureDataDirs();
  const safeUid = user.uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const filePath = path.join(WORKSPACES_DIR, `${safeUid}.json`);
  if (!fs.existsSync(filePath)) {
    return res.json({ exists: false, data: null });
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return res.json({ exists: true, data });
  } catch {
    return res.json({ exists: false, data: null });
  }
});

app.put('/api/workspace', (req, res) => {
  const user = extractBearerUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  ensureDataDirs();
  const safeUid = user.uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const filePath = path.join(WORKSPACES_DIR, `${safeUid}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body || {}, null, 2), 'utf8');
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Failed to save workspace state.' });
  }
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

app.get('/api/health', (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({ ok: true, geminiConfigured: hasKey });
});

app.post('/api/ai/reply-drafts', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) {
      return res.status(200).json({ fallback: true });
    }
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
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI reply-drafts error:', error);
    return res.status(200).json({ fallback: true });
  }
});

app.post('/api/ai/summarize-thread', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) return res.status(200).json({ fallback: true });
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
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI summarize-thread error:', error);
    return res.status(200).json({ fallback: true });
  }
});

app.post('/api/ai/score-lead', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) return res.status(200).json({ fallback: true });
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
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI score-lead error:', error);
    return res.status(200).json({ fallback: true });
  }
});

app.post('/api/ai/repurpose', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) return res.status(200).json({ fallback: true });
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
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI repurpose error:', error);
    return res.status(200).json({ fallback: true });
  }
});

app.post('/api/ai/bulk-drafts', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) return res.status(200).json({ fallback: true });
    const { topic, audience, tone, platforms } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Generate 5 distinct, ready-to-publish social media drafts.
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
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI bulk-drafts error:', error);
    return res.status(200).json({ fallback: true });
  }
});

app.post('/api/ai/ad-copy', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) return res.status(200).json({ fallback: true });
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
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI ad-copy error:', error);
    return res.status(200).json({ fallback: true });
  }
});

app.post('/api/ai/analyst', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) return res.status(200).json({ fallback: true });
    const { summary, query } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are an expert Social CRM Strategist. Answer the user's question concisely using the workspace metrics below (under 70 words, cite specific numbers).
Workspace Summary: ${JSON.stringify(summary)}
Question: ${query}`,
    });
    return res.json({ fallback: false, data: { answer: response.text || '' } });
  } catch (error) {
    console.error('AI analyst error:', error);
    return res.status(200).json({ fallback: true });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
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
