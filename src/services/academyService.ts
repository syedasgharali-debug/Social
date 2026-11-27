import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AcademyCategory, AcademyProgress, AcademyStep, AcademyTutorial } from '../types';

const SESSION_TOKEN_KEY = 'socialifyai_auth_token_v1';
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

export function getYouTubeThumbnailUrl(videoId: string, quality: 'hqdefault' | 'mqdefault' | 'maxresdefault' = 'hqdefault'): string {
  const clean = isValidYouTubeVideoId(videoId) ? videoId.trim() : '';
  return clean ? `https://i.ytimg.com/vi/${clean}/${quality}.jpg` : '';
}

export function getYouTubeEmbedUrl(videoId: string, autoplay = true): string {
  const clean = isValidYouTubeVideoId(videoId) ? videoId.trim() : '';
  if (!clean) return '';
  return `https://www.youtube-nocookie.com/embed/${clean}?rel=0&modestbranding=1${autoplay ? '&autoplay=1' : ''}`;
}

async function resolveBearerToken(overrideToken?: string, forceRefreshFirebase = false): Promise<string | null> {
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

  // Google Sign-In / Firebase Auth session: wait for Firebase auth restoration, then get live signed ID token
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

async function getAuthHeaders(
  overrideToken?: string,
  forceRefreshFirebase = false
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await resolveBearerToken(overrideToken, forceRefreshFirebase);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function requestJson<T>(
  url: string,
  options: { method?: string; body?: unknown; authToken?: string } = {}
): Promise<T> {
  const execute = async (forceRefreshFirebase: boolean) => {
    const headers = await getAuthHeaders(options.authToken, forceRefreshFirebase);
    return fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  };

  let res = await execute(false);

  // If Firebase ID token expired or wasn't ready yet, retry once with a fresh token
  if (res.status === 401 && auth.currentUser) {
    res = await execute(true);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `Academy request failed (HTTP ${res.status})`);
  }
  return json as T;
}

async function mirrorProgressToFirestore(progress: AcademyProgress): Promise<void> {
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
    // Server persistence is primary; Firestore mirror is best-effort for Firebase-verified sessions
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
    return requestJson<AcademyCatalogResponse>(`/api/academy/catalog${qs}`, { authToken });
  },

  async getProgress(authToken?: string): Promise<AcademyProgress> {
    const res = await requestJson<{ progress: AcademyProgress }>('/api/academy/progress', { authToken });
    return res.progress;
  },

  async markWatched(tutorialId: string, authToken?: string): Promise<AcademyProgress> {
    const res = await requestJson<{ ok: boolean; progress: AcademyProgress }>('/api/academy/progress', {
      method: 'PUT',
      authToken,
      body: { action: 'mark_watched', tutorialId },
    });
    void mirrorProgressToFirestore(res.progress);
    return res.progress;
  },

  async toggleCompleted(tutorialId: string, completed?: boolean, authToken?: string): Promise<AcademyProgress> {
    const res = await requestJson<{ ok: boolean; progress: AcademyProgress }>('/api/academy/progress', {
      method: 'PUT',
      authToken,
      body: { action: 'toggle_completed', tutorialId, completed },
    });
    void mirrorProgressToFirestore(res.progress);
    return res.progress;
  },

  // =========================================================================
  // Admin Endpoints
  // =========================================================================
  async fetchYouTubeMetadata(youtubeUrl: string, authToken?: string): Promise<YouTubeMetadataResponse> {
    return requestJson<YouTubeMetadataResponse>('/api/academy/admin/youtube-metadata', {
      method: 'POST',
      authToken,
      body: { youtubeUrl },
    });
  },

  async syncOfficialChannel(authToken?: string): Promise<{
    ok: boolean;
    scannedCount: number;
    importedCount: number;
    imported: AcademyTutorial[];
  }> {
    return requestJson('/api/academy/admin/sync-channel', {
      method: 'POST',
      authToken,
      body: {},
    });
  },

  async createTutorial(payload: AcademyTutorialPayload, authToken?: string): Promise<AcademyTutorial> {
    const res = await requestJson<{ ok: boolean; tutorial: AcademyTutorial }>('/api/academy/admin/tutorials', {
      method: 'POST',
      authToken,
      body: payload,
    });
    return res.tutorial;
  },

  async updateTutorial(
    id: string,
    payload: Partial<AcademyTutorialPayload>,
    authToken?: string
  ): Promise<AcademyTutorial> {
    const res = await requestJson<{ ok: boolean; tutorial: AcademyTutorial }>(
      `/api/academy/admin/tutorials/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        authToken,
        body: payload,
      }
    );
    return res.tutorial;
  },

  async deleteTutorial(id: string, authToken?: string): Promise<void> {
    await requestJson(`/api/academy/admin/tutorials/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      authToken,
    });
  },

  async createCategory(
    payload: { name: string; description: string; order?: number },
    authToken?: string
  ): Promise<AcademyCategory> {
    const res = await requestJson<{ ok: boolean; category: AcademyCategory }>('/api/academy/admin/categories', {
      method: 'POST',
      authToken,
      body: payload,
    });
    return res.category;
  },

  async updateCategory(
    id: string,
    payload: { name?: string; description?: string; order?: number },
    authToken?: string
  ): Promise<AcademyCategory> {
    const res = await requestJson<{ ok: boolean; category: AcademyCategory }>(
      `/api/academy/admin/categories/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        authToken,
        body: payload,
      }
    );
    return res.category;
  },

  async deleteCategory(id: string, authToken?: string): Promise<{ reassignedTo: string }> {
    return requestJson(`/api/academy/admin/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      authToken,
    });
  },
};
