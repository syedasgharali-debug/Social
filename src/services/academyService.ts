import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AcademyCategory, AcademyProgress, AcademyStep, AcademyTutorial } from '../types';
import {
  DEFAULT_ACADEMY_CATEGORIES,
  DEFAULT_ACADEMY_TUTORIALS,
  OFFICIAL_ACADEMY_CHANNEL_ID,
  OFFICIAL_ACADEMY_CHANNEL_URL,
} from '../data/academySeed';

const SESSION_TOKEN_KEY = 'socialifyai_auth_token_v1';
const LOCAL_CATALOG_KEY = 'socialifyai_academy_catalog_v1';
const LOCAL_PROGRESS_PREFIX = 'socialifyai_academy_progress_v1:';

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const ALLOWED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

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

export function isValidYouTubeVideoId(videoId: string): boolean {
  return VIDEO_ID_REGEX.test(String(videoId || '').trim());
}

export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: 'hqdefault' | 'mqdefault' | 'maxresdefault' = 'hqdefault'
): string {
  const clean = isValidYouTubeVideoId(videoId) ? videoId.trim() : '';
  return clean ? `https://i.ytimg.com/vi/${clean}/${quality}.jpg` : '';
}

export function getYouTubeEmbedUrl(videoId: string, autoplay = true): string {
  const clean = isValidYouTubeVideoId(videoId) ? videoId.trim() : '';
  if (!clean) return '';
  return `https://www.youtube-nocookie.com/embed/${clean}?rel=0&modestbranding=1${autoplay ? '&autoplay=1' : ''}`;
}

function slugify(value: string): string {
  return (
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72) || `cat-${Date.now()}`
  );
}

function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

async function resolveBearerToken(
  overrideToken?: string,
  forceRefreshFirebase = false
): Promise<string | null> {
  if (overrideToken && !overrideToken.startsWith('local_sess_')) {
    return overrideToken;
  }

  try {
    const stored = localStorage.getItem(SESSION_TOKEN_KEY);
    if (stored && !stored.startsWith('local_sess_')) {
      return stored;
    }
  } catch {
    // ignore storage restrictions
  }

  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    const fbUser = auth.currentUser;
    if (fbUser) {
      return await fbUser.getIdToken(forceRefreshFirebase);
    }
  } catch {
    // ignore token fetch error
  }

  return null;
}

class ApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

async function requestExpressApi<T>(
  url: string,
  options: { method?: string; body?: unknown; authToken?: string } = {}
): Promise<T> {
  const execute = async (forceRefreshFirebase: boolean) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = await resolveBearerToken(options.authToken, forceRefreshFirebase);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  };

  let res: Response;
  try {
    res = await execute(false);
    if (res.status === 401 && auth.currentUser) {
      res = await execute(true);
    }
  } catch (err) {
    throw new ApiUnavailableError(err instanceof Error ? err.message : 'Backend unavailable');
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  // Static deployments (e.g. https://www.socialifyai.com/) have no Express /api/academy/* routes
  // and return 404/405 or HTML fallback instead of JSON.
  if (res.status === 404 || res.status === 405 || !isJson) {
    throw new ApiUnavailableError(`Express API route unavailable (HTTP ${res.status})`);
  }

  const json = await res.json().catch(() => ({}));

  // If the client is in a static/local fallback session without a server token, fall back cleanly
  if (res.status === 401 && !auth.currentUser) {
    const stored = (() => {
      try {
        return localStorage.getItem(SESSION_TOKEN_KEY) || '';
      } catch {
        return '';
      }
    })();
    if (stored.startsWith('local_sess_') || (options.authToken || '').startsWith('local_sess_')) {
      throw new ApiUnavailableError('Local fallback session active');
    }
  }

  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `Academy request failed (HTTP ${res.status})`);
  }
  return json as T;
}

// =============================================================================
// Firestore + Local Fallback Persistence (Used Automatically on Static Domains)
// =============================================================================
interface StoredCatalog {
  categories: AcademyCategory[];
  tutorials: AcademyTutorial[];
}

function readLocalCatalog(): StoredCatalog {
  try {
    const raw = localStorage.getItem(LOCAL_CATALOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredCatalog>;
      if (Array.isArray(parsed.categories) && Array.isArray(parsed.tutorials)) {
        return {
          categories: parsed.categories,
          tutorials: parsed.tutorials,
        };
      }
    }
  } catch {
    // fall through to seed
  }
  return {
    categories: DEFAULT_ACADEMY_CATEGORIES.map((c) => ({ ...c })),
    tutorials: DEFAULT_ACADEMY_TUTORIALS.map((t) => ({ ...t })),
  };
}

function writeLocalCatalog(catalog: StoredCatalog): void {
  try {
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(catalog));
  } catch {
    // ignore storage quota errors
  }
}

async function readCatalogFromFirestoreOrSeed(includeDrafts: boolean): Promise<AcademyCatalogResponse> {
  let categories: AcademyCategory[] = [];
  let tutorials: AcademyTutorial[] = [];

  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    if (auth.currentUser && auth.currentUser.emailVerified) {
      const catSnap = await getDocs(collection(db, 'academyCategories'));
      categories = catSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          name: String(data.name || ''),
          slug: String(data.slug || d.id),
          description: String(data.description || ''),
          order: typeof data.order === 'number' ? data.order : 0,
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });

      const tutQuery = includeDrafts
        ? collection(db, 'academyTutorials')
        : query(collection(db, 'academyTutorials'), where('published', '==', true));
      const tutSnap = await getDocs(tutQuery);
      tutorials = tutSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          videoId: String(data.videoId || ''),
          youtubeUrl: String(data.youtubeUrl || ''),
          title: String(data.title || ''),
          shortDescription: String(data.shortDescription || ''),
          fullDescription: String(data.fullDescription || ''),
          thumbnailUrl: String(data.thumbnailUrl || ''),
          duration: String(data.duration || ''),
          categoryId: String(data.categoryId || 'getting-started'),
          keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
          learningObjectives: Array.isArray(data.learningObjectives)
            ? data.learningObjectives.map(String)
            : [],
          steps: Array.isArray(data.steps)
            ? data.steps.map((s: Record<string, unknown>) => ({
                title: String(s?.title || ''),
                detail: String(s?.detail || ''),
              }))
            : [],
          tips: Array.isArray(data.tips) ? data.tips.map(String) : [],
          order: typeof data.order === 'number' ? data.order : 0,
          published: Boolean(data.published),
          featured: Boolean(data.featured),
          publishedAt: String(data.publishedAt || ''),
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
    }
  } catch {
    // Fall back gracefully to canonical real seed / local catalog
  }

  const localFallback = readLocalCatalog();
  if (categories.length === 0) categories = localFallback.categories;
  if (tutorials.length === 0) {
    tutorials = includeDrafts
      ? localFallback.tutorials
      : localFallback.tutorials.filter((t) => t.published);
  }

  return {
    channelUrl: OFFICIAL_ACADEMY_CHANNEL_URL,
    channelId: OFFICIAL_ACADEMY_CHANNEL_ID,
    categories: [...categories].sort((a, b) => a.order - b.order),
    tutorials: [...tutorials].sort((a, b) => a.order - b.order),
  };
}

function getEffectiveUserId(userId?: string): string {
  return auth.currentUser?.uid || userId || 'anonymous';
}

function readLocalProgress(userId: string): AcademyProgress {
  try {
    const raw = localStorage.getItem(`${LOCAL_PROGRESS_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AcademyProgress>;
      return {
        userId,
        completedTutorialIds: Array.isArray(parsed.completedTutorialIds)
          ? parsed.completedTutorialIds.map(String)
          : [],
        watchedTutorialIds: Array.isArray(parsed.watchedTutorialIds)
          ? parsed.watchedTutorialIds.map(String)
          : [],
        recentTutorialIds: Array.isArray(parsed.recentTutorialIds)
          ? parsed.recentTutorialIds.map(String)
          : [],
        lastWatchedTutorialId: parsed.lastWatchedTutorialId || null,
        lastWatchedAt: parsed.lastWatchedAt || null,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    userId,
    completedTutorialIds: [],
    watchedTutorialIds: [],
    recentTutorialIds: [],
    lastWatchedTutorialId: null,
    lastWatchedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

function writeLocalProgress(progress: AcademyProgress): void {
  try {
    localStorage.setItem(`${LOCAL_PROGRESS_PREFIX}${progress.userId}`, JSON.stringify(progress));
  } catch {
    // ignore storage errors
  }
}

async function readProgressFromFirestoreOrLocal(userId?: string): Promise<AcademyProgress> {
  const uid = getEffectiveUserId(userId);
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    const fbUser = auth.currentUser;
    if (fbUser && fbUser.emailVerified) {
      const snap = await getDoc(doc(db, 'users', fbUser.uid, 'academyProgress', 'main'));
      if (snap.exists()) {
        const data = snap.data();
        const progress: AcademyProgress = {
          userId: fbUser.uid,
          completedTutorialIds: Array.isArray(data.completedTutorialIds)
            ? data.completedTutorialIds.map(String)
            : [],
          watchedTutorialIds: Array.isArray(data.watchedTutorialIds)
            ? data.watchedTutorialIds.map(String)
            : [],
          recentTutorialIds: Array.isArray(data.recentTutorialIds)
            ? data.recentTutorialIds.map(String)
            : [],
          lastWatchedTutorialId:
            typeof data.lastWatchedTutorialId === 'string' ? data.lastWatchedTutorialId : null,
          lastWatchedAt: typeof data.lastWatchedAt === 'string' ? data.lastWatchedAt : null,
          updatedAt: toIsoString(data.updatedAt),
        };
        writeLocalProgress(progress);
        return progress;
      }
    }
  } catch {
    // fall back to local progress
  }
  return readLocalProgress(uid);
}

async function mirrorProgressToFirestore(progress: AcademyProgress): Promise<void> {
  writeLocalProgress(progress);
  try {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.emailVerified) return;
    const progressRef = doc(db, 'users', fbUser.uid, 'academyProgress', 'main');
    const existingSnap = await getDoc(progressRef);
    const payload = {
      userId: fbUser.uid,
      completedTutorialIds: progress.completedTutorialIds.slice(0, 500),
      watchedTutorialIds: progress.watchedTutorialIds.slice(0, 500),
      recentTutorialIds: progress.recentTutorialIds.slice(0, 50),
      lastWatchedTutorialId: progress.lastWatchedTutorialId || null,
      lastWatchedAt: progress.lastWatchedAt || null,
      updatedAt: serverTimestamp(),
      ...(existingSnap.exists() ? {} : { createdAt: serverTimestamp() }),
    };
    await setDoc(progressRef, payload, { merge: true });
  } catch {
    // Firestore mirror is best-effort
  }
}

async function mirrorTutorialToFirestore(tutorial: AcademyTutorial, isNew: boolean): Promise<void> {
  try {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.emailVerified) return;
    const ref = doc(db, 'academyTutorials', tutorial.id);
    const existing = isNew ? null : await getDoc(ref);
    await setDoc(
      ref,
      {
        id: tutorial.id,
        videoId: tutorial.videoId,
        youtubeUrl: tutorial.youtubeUrl,
        title: tutorial.title,
        shortDescription: tutorial.shortDescription,
        fullDescription: tutorial.fullDescription,
        thumbnailUrl: tutorial.thumbnailUrl,
        duration: tutorial.duration,
        categoryId: tutorial.categoryId,
        keywords: tutorial.keywords,
        learningObjectives: tutorial.learningObjectives,
        steps: tutorial.steps,
        tips: tutorial.tips,
        order: tutorial.order,
        published: tutorial.published,
        featured: Boolean(tutorial.featured),
        publishedAt: tutorial.publishedAt,
        updatedAt: serverTimestamp(),
        ...(existing && existing.exists() ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true }
    );
  } catch {
    // Best-effort Firestore write
  }
}

async function mirrorCategoryToFirestore(category: AcademyCategory, isNew: boolean): Promise<void> {
  try {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.emailVerified) return;
    const ref = doc(db, 'academyCategories', category.id);
    const existing = isNew ? null : await getDoc(ref);
    await setDoc(
      ref,
      {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        order: category.order,
        updatedAt: serverTimestamp(),
        ...(existing && existing.exists() ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true }
    );
  } catch {
    // Best-effort Firestore write
  }
}

export interface AcademyCatalogResponse {
  channelUrl: string;
  channelId: string;
  categories: AcademyCategory[];
  tutorials: AcademyTutorial[];
}

export interface YouTubeMetadataResponse {
  ok: boolean;
  source: 'youtube_data_api' | 'oembed' | 'basic';
  metadata: {
    videoId: string;
    youtubeUrl: string;
    title: string;
    shortDescription: string;
    fullDescription: string;
    thumbnailUrl: string;
    duration: string;
    publishedAt: string;
    learningObjectives: string[];
  };
}

export interface AcademyTutorialPayload {
  youtubeUrl: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  thumbnailUrl?: string;
  duration?: string;
  categoryId: string;
  keywords: string[];
  learningObjectives: string[];
  steps: AcademyStep[];
  tips: string[];
  order?: number;
  published: boolean;
  featured?: boolean;
  publishedAt?: string;
}

export const academyService = {
  async getCatalog(includeDrafts = false, authToken?: string): Promise<AcademyCatalogResponse> {
    const qs = includeDrafts ? '?includeDrafts=1' : '';
    try {
      return await requestExpressApi<AcademyCatalogResponse>(`/api/academy/catalog${qs}`, {
        authToken,
      });
    } catch (err) {
      if (err instanceof ApiUnavailableError) {
        return readCatalogFromFirestoreOrSeed(includeDrafts);
      }
      throw err;
    }
  },

  async getProgress(authToken?: string, userId?: string): Promise<AcademyProgress> {
    try {
      const res = await requestExpressApi<{ progress: AcademyProgress }>('/api/academy/progress', {
        authToken,
      });
      writeLocalProgress(res.progress);
      return res.progress;
    } catch (err) {
      if (err instanceof ApiUnavailableError) {
        return readProgressFromFirestoreOrLocal(userId);
      }
      throw err;
    }
  },

  async markWatched(
    tutorialId: string,
    authToken?: string,
    userId?: string
  ): Promise<AcademyProgress> {
    try {
      const res = await requestExpressApi<{ ok: boolean; progress: AcademyProgress }>(
        '/api/academy/progress',
        {
          method: 'PUT',
          authToken,
          body: { action: 'mark_watched', tutorialId },
        }
      );
      void mirrorProgressToFirestore(res.progress);
      return res.progress;
    } catch (err) {
      if (!(err instanceof ApiUnavailableError)) throw err;
      const current = await readProgressFromFirestoreOrLocal(userId);
      const now = new Date().toISOString();
      const watched = current.watchedTutorialIds.includes(tutorialId)
        ? current.watchedTutorialIds
        : [...current.watchedTutorialIds, tutorialId];
      const recent = [
        tutorialId,
        ...current.recentTutorialIds.filter((id) => id !== tutorialId),
      ].slice(0, 12);
      const updated: AcademyProgress = {
        ...current,
        watchedTutorialIds: watched,
        recentTutorialIds: recent,
        lastWatchedTutorialId: tutorialId,
        lastWatchedAt: now,
        updatedAt: now,
      };
      await mirrorProgressToFirestore(updated);
      return updated;
    }
  },

  async toggleCompleted(
    tutorialId: string,
    completed?: boolean,
    authToken?: string,
    userId?: string
  ): Promise<AcademyProgress> {
    try {
      const res = await requestExpressApi<{ ok: boolean; progress: AcademyProgress }>(
        '/api/academy/progress',
        {
          method: 'PUT',
          authToken,
          body: { action: 'toggle_completed', tutorialId, completed },
        }
      );
      void mirrorProgressToFirestore(res.progress);
      return res.progress;
    } catch (err) {
      if (!(err instanceof ApiUnavailableError)) throw err;
      const current = await readProgressFromFirestoreOrLocal(userId);
      const now = new Date().toISOString();
      const nextDone =
        typeof completed === 'boolean'
          ? completed
          : !current.completedTutorialIds.includes(tutorialId);
      let completedIds = [...current.completedTutorialIds];
      let watchedIds = [...current.watchedTutorialIds];
      let recentIds = [...current.recentTutorialIds];
      let lastWatchedId = current.lastWatchedTutorialId;
      let lastWatchedAt = current.lastWatchedAt;

      if (nextDone) {
        if (!completedIds.includes(tutorialId)) completedIds.push(tutorialId);
        if (!watchedIds.includes(tutorialId)) watchedIds.push(tutorialId);
        recentIds = [tutorialId, ...recentIds.filter((id) => id !== tutorialId)].slice(0, 12);
        lastWatchedId = tutorialId;
        lastWatchedAt = now;
      } else {
        completedIds = completedIds.filter((id) => id !== tutorialId);
      }

      const updated: AcademyProgress = {
        ...current,
        completedTutorialIds: completedIds,
        watchedTutorialIds: watchedIds,
        recentTutorialIds: recentIds,
        lastWatchedTutorialId: lastWatchedId,
        lastWatchedAt,
        updatedAt: now,
      };
      await mirrorProgressToFirestore(updated);
      return updated;
    }
  },

  // =========================================================================
  // Admin Endpoints (Express API with Automatic Firestore + Static Fallback)
  // =========================================================================
  async fetchYouTubeMetadata(
    youtubeUrl: string,
    authToken?: string
  ): Promise<YouTubeMetadataResponse> {
    try {
      return await requestExpressApi<YouTubeMetadataResponse>(
        '/api/academy/admin/youtube-metadata',
        {
          method: 'POST',
          authToken,
          body: { youtubeUrl },
        }
      );
    } catch (err) {
      if (!(err instanceof ApiUnavailableError)) throw err;
      const videoId = extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Please enter a valid YouTube URL or 11-character YouTube Video ID.');
      }
      const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
      let title = '';
      let thumbnailUrl = getYouTubeThumbnailUrl(videoId);
      let source: 'oembed' | 'basic' = 'basic';
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`
        );
        if (res.ok) {
          const oe = (await res.json()) as { title?: string; thumbnail_url?: string };
          if (oe.title) {
            title = oe.title.slice(0, 200);
            source = 'oembed';
          }
          if (oe.thumbnail_url && oe.thumbnail_url.startsWith('https://')) {
            thumbnailUrl = oe.thumbnail_url;
          }
        }
      } catch {
        // Basic validated metadata fallback
      }
      return {
        ok: true,
        source,
        metadata: {
          videoId,
          youtubeUrl: canonicalUrl,
          title,
          shortDescription: '',
          fullDescription: '',
          thumbnailUrl,
          duration: '',
          publishedAt: new Date().toISOString(),
          learningObjectives: [],
        },
      };
    }
  },

  async syncOfficialChannel(authToken?: string): Promise<{
    ok: boolean;
    scannedCount: number;
    importedCount: number;
    imported: AcademyTutorial[];
  }> {
    try {
      return await requestExpressApi('/api/academy/admin/sync-channel', {
        method: 'POST',
        authToken,
        body: {},
      });
    } catch (err) {
      if (!(err instanceof ApiUnavailableError)) throw err;
      const catalog = readLocalCatalog();
      const existing = new Set(catalog.tutorials.map((t) => t.videoId));
      const missing = DEFAULT_ACADEMY_TUTORIALS.filter((t) => !existing.has(t.videoId));
      if (missing.length > 0) {
        catalog.tutorials.push(...missing);
        writeLocalCatalog(catalog);
        for (const t of missing) {
          void mirrorTutorialToFirestore(t, true);
        }
      }
      return {
        ok: true,
        scannedCount: DEFAULT_ACADEMY_TUTORIALS.length,
        importedCount: missing.length,
        imported: missing,
      };
    }
  },

  async createTutorial(
    payload: AcademyTutorialPayload,
    authToken?: string
  ): Promise<AcademyTutorial> {
    try {
      const res = await requestExpressApi<{ ok: boolean; tutorial: AcademyTutorial }>(
        '/api/academy/admin/tutorials',
        {
          method: 'POST',
          authToken,
          body: payload,
        }
      );
      void mirrorTutorialToFirestore(res.tutorial, true);
      return res.tutorial;
    } catch (err) {
      if (!(err instanceof ApiUnavailableError)) throw err;
      const videoId = extractYouTubeVideoId(payload.youtubeUrl);
      if (!videoId) throw new Error('A valid YouTube URL or 11-character video ID is required.');
      const catalog = readLocalCatalog();
      const now = new Date().toISOString();
      const created: AcademyTutorial = {
        id: `tut-${videoId}-${Date.now().toString(36)}`,
        videoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        title: payload.title.trim(),
        shortDescription: payload.shortDescription.trim(),
        fullDescription: payload.fullDescription.trim() || payload.shortDescription.trim(),
        thumbnailUrl: payload.thumbnailUrl?.trim() || getYouTubeThumbnailUrl(videoId),
        duration: (payload.duration || '').trim(),
        categoryId: payload.categoryId,
        keywords: payload.keywords || [],
        learningObjectives: payload.learningObjectives || [],
        steps: payload.steps || [],
        tips: payload.tips || [],
        order:
          typeof payload.order === 'number'
            ? payload.order
            : catalog.tutorials.reduce((m, t) => Math.max(m, t.order), 0) + 1,
        published: payload.published !== false,
        featured: Boolean(payload.featured),
        publishedAt: payload.publishedAt || now,
        createdAt: now,
        updatedAt: now,
      };
      catalog.tutorials.push(created);
      writeLocalCatalog(catalog);
      await mirrorTutorialToFirestore(created, true);
      return created;
    }
  },

  async updateTutorial(
    id: string,
    payload: Partial<AcademyTutorialPayload>,
    authToken?: string
  ): Promise<AcademyTutorial> {
    try {
      const res = await requestExpressApi<{ ok: boolean; tutorial: AcademyTutorial }>(
        `/api/academy/admin/tutorials/${encodeURIComponent(id)}`,
        {
          method: 'PUT',
          authToken,
          body: payload,
        }
      );
      void mirrorTutorialToFirestore(res.tutorial, false);
      return res.tutorial;
    } catch (err) {
      if (!(err instanceof ApiUnavailableError)) throw err;
      const catalog = readLocalCatalog();
      const idx = catalog.tutorials.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error('Tutorial not found.');
      const existing = catalog.tutorials[idx];
      const videoId = payload.youtubeUrl
        ? extractYouTubeVideoId(payload.youtubeUrl) || existing.videoId
        : existing.videoId;
      const updated: AcademyTutorial = {
        ...existing,
        ...payload,
        videoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: payload.thumbnailUrl || existing.thumbnailUrl || getYouTubeThumbnailUrl(videoId),
        updatedAt: new Date().toISOString(),
      };
      catalog.tutorials[idx] = updated;
      writeLocalCatalog(catalog);
      await mirrorTutorialToFirestore(updated, false);
      return updated;
    }
  },

  async deleteTutorial(id: string, authToken?: string): Promise<void> {
    try {
      await requestExpressApi(`/api/academy/admin/tutorials/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        authToken,
      });
    } catch (err) {
      if (!(err instanceof ApiUnavailableError)) throw err;
      const catalog = readLocalCatalog();
      catalog.tutorials = catalog.tutorials.filter((t) => t.id !== id);
      writeLocalCatalog(catalog);
    }
    try {
      if (auth.currentUser && auth.currentUser.emailVerified) {
        await deleteDoc(doc(db, 'academyTutorials', id));
      }
    } catch {
      // ignore if doc wasn't in Firestore
    }
  },

  async createCategory(
    payload: { name: string; description: string; order?: number },
    authToken?: string
  ): Promise<AcademyCategory> {
    try {
      const res = await requestExpressApi<{ ok: boolean; category: AcademyCategory }>(
        '/api/academy/admin/categories',
        {
          method: 'POST',
          authToken,
          body: payload,
        }
      );
      void mirrorCategoryToFirestore(res.category, true);
      return res.category;
    } catch (err) {
      if (!(err instanceof ApiUnavailableError)) throw err;
      const catalog = readLocalCatalog();
      const baseSlug = slugify(payload.name);
      let id = baseSlug;
      let suffix = 2;
      while (catalog.categories.some((c) => c.id === id)) {
        id = `${baseSlug}-${suffix++}`;
      }
      const now = new Date().toISOString();
      const created: AcademyCategory = {
        id,
        name: payload.name.trim(),
        slug: id,
        description: payload.description.trim(),
        order:
          typeof payload.order === 'number'
            ? payload.order
            : catalog.categories.reduce((m, c) => Math.max(m, c.order), 0) + 1,
        createdAt: now,
        updatedAt: now,
      };
      catalog.categories.push(created);
      writeLocalCatalog(catalog);
      await mirrorCategoryToFirestore(created, true);
      return created;
    }
  },

  async updateCategory(
    id: string,
    payload: { name?: string; description?: string; order?: number },
    authToken?: string
  ): Promise<AcademyCategory> {
    try {
      const res = await requestExpressApi<{ ok: boolean; category: AcademyCategory }>(
        `/api/academy/admin/categories/${encodeURIComponent(id)}`,
        {
          method: 'PUT',
          authToken,
          body: payload,
        }
      );
      void mirrorCategoryToFirestore(res.category, false);
      return res.category;
    } catch (err) {
      if (!(err instanceof ApiUnavailableError)) throw err;
      const catalog = readLocalCatalog();
      const idx = catalog.categories.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error('Category not found.');
      const updated: AcademyCategory = {
        ...catalog.categories[idx],
        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
        ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
        ...(payload.order !== undefined ? { order: payload.order } : {}),
        updatedAt: new Date().toISOString(),
      };
      catalog.categories[idx] = updated;
      writeLocalCatalog(catalog);
      await mirrorCategoryToFirestore(updated, false);
      return updated;
    }
  },

  async deleteCategory(id: string, authToken?: string): Promise<{ reassignedTo: string }> {
    try {
      const res = await requestExpressApi<{ reassignedTo: string }>(
        `/api/academy/admin/categories/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          authToken,
        }
      );
      try {
        if (auth.currentUser && auth.currentUser.emailVerified) {
          await deleteDoc(doc(db, 'academyCategories', id));
        }
      } catch {
        // ignore
      }
      return res;
    } catch (err) {
      if (!(err instanceof ApiUnavailableError)) throw err;
      const catalog = readLocalCatalog();
      if (catalog.categories.length <= 1) {
        throw new Error('At least one Academy category must remain.');
      }
      const remaining = catalog.categories.filter((c) => c.id !== id).sort((a, b) => a.order - b.order);
      const reassignedTo = remaining[0].id;
      catalog.categories = remaining;
      catalog.tutorials = catalog.tutorials.map((t) =>
        t.categoryId === id ? { ...t, categoryId: reassignedTo } : t
      );
      writeLocalCatalog(catalog);
      try {
        if (auth.currentUser && auth.currentUser.emailVerified) {
          await deleteDoc(doc(db, 'academyCategories', id));
        }
      } catch {
        // ignore
      }
      return { reassignedTo };
    }
  },
};
