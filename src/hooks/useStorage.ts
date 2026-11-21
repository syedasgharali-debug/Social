import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { AppState, ToastItem } from '../types';
import { DEFAULT_STATE, DEFAULT_WORKSPACE, DEFAULT_API_HEALTH } from '../data/defaultState';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { AuthSessionUser } from '../contexts/AuthContext';

const STORAGE_PREFIX = 'socialifyai_state_v6_';

const LEGACY_SEED_WORKSPACE_IDS = new Set(['ws-digixy', 'ws-personal', 'ws-roasters']);
const LEGACY_SEED_PROFILE_IDS = new Set([
  'prof-1', 'prof-2', 'prof-3', 'prof-4', 'prof-5', 'prof-6', 'prof-7',
  'prof-8', 'prof-9', 'prof-10', 'prof-11', 'prof-12', 'prof-13', 'prof-14',
]);
const LEGACY_SEED_TEAM_IDS = new Set(['tm-1', 'tm-2', 'tm-3', 'tm-4', 'tm-5', 'tm-6', 'tm-7']);
const LEGACY_SEED_CATEGORY_IDS = new Set([
  'cat-edu', 'cat-prod', 'cat-cur', 'cat-bts', 'cat-proof',
  'cat-st-1', 'cat-st-2', 'cat-roast-1', 'cat-roast-2',
]);
const LEGACY_SEED_CONTACT_IDS = new Set(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
const LEGACY_SEED_THREAD_IDS = new Set(['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8']);
const LEGACY_SEED_DEAL_IDS = new Set(['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8']);
const LEGACY_SEED_POST_IDS = new Set(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13']);
const LEGACY_SEED_AD_IDS = new Set(['a1', 'a2', 'a3']);
const LEGACY_SEED_DRAFT_IDS = new Set(['dr1', 'dr2', 'dr3']);
const LEGACY_SEED_ALERT_IDS = new Set(['al-1', 'al-2']);
const LEGACY_SEED_TENANT_IDS = new Set(['ten-1', 'ten-2', 'ten-3', 'ten-4', 'ten-5', 'ten-6', 'ten-7', 'ten-8']);
const LEGACY_SEED_PROMO_IDS = new Set(['pc-1', 'pc-2', 'pc-3']);
const LEGACY_SEED_INVOICE_IDS = new Set(['inv-1', 'inv-2', 'inv-3', 'inv-4', 'inv-5']);
const LEGACY_SEED_AUDIT_IDS = new Set(['log-1', 'log-2', 'log-3']);

function sanitizeLegacySeedData(state: AppState): AppState {
  const realWorkspaces = state.workspaces.filter((w) => !LEGACY_SEED_WORKSPACE_IDS.has(w.id));
  const workspaces = realWorkspaces.length > 0 ? realWorkspaces : [DEFAULT_WORKSPACE];
  const activeWorkspaceId = workspaces.some((w) => w.id === state.activeWorkspaceId)
    ? state.activeWorkspaceId
    : workspaces[0].id;

  const hasLegacyApiNumbers = state.apiHealthNodes.some(
    (n) =>
      n.rateLimitLabel.includes('84.2k / 200k') ||
      n.rateLimitLabel.includes('19.0k / 50k') ||
      n.rateLimitLabel.includes('54.0k / 100k')
  );

  const existingNodeIds = new Set(state.apiHealthNodes.map((n) => n.id));
  const mergedApiNodes = hasLegacyApiNumbers
    ? DEFAULT_API_HEALTH
    : [
        ...state.apiHealthNodes,
        ...DEFAULT_API_HEALTH.filter((n) => !existingNodeIds.has(n.id)),
      ];

  return {
    ...state,
    workspaces,
    activeWorkspaceId,
    connectedProfiles: state.connectedProfiles.filter((p) => !LEGACY_SEED_PROFILE_IDS.has(p.id)),
    teamMembers: state.teamMembers.filter((m) => !LEGACY_SEED_TEAM_IDS.has(m.id)),
    categories: state.categories.filter((c) => !LEGACY_SEED_CATEGORY_IDS.has(c.id)),
    contacts: state.contacts.filter((c) => !LEGACY_SEED_CONTACT_IDS.has(c.id)),
    threads: state.threads.filter((t) => !LEGACY_SEED_THREAD_IDS.has(t.id)),
    deals: state.deals.filter((d) => !LEGACY_SEED_DEAL_IDS.has(d.id)),
    posts: state.posts.filter((p) => !LEGACY_SEED_POST_IDS.has(p.id)),
    ads: state.ads.filter((a) => !LEGACY_SEED_AD_IDS.has(a.id)),
    drafts: state.drafts.filter((d) => !LEGACY_SEED_DRAFT_IDS.has(d.id)),
    discoveryAlerts: state.discoveryAlerts.filter((a) => !LEGACY_SEED_ALERT_IDS.has(a.id)),
    youtubeChannels: Array.isArray(state.youtubeChannels) ? state.youtubeChannels : [],
    youtubeVideos: Array.isArray(state.youtubeVideos) ? state.youtubeVideos : [],
    seoArticles: Array.isArray(state.seoArticles) ? state.seoArticles : [],
    cmsConnectors: Array.isArray(state.cmsConnectors) ? state.cmsConnectors : [],
    rssSources: Array.isArray(state.rssSources) ? state.rssSources : [],
    curatedItems: Array.isArray(state.curatedItems) ? state.curatedItems : [],
    ecommerceFeeds: Array.isArray(state.ecommerceFeeds) ? state.ecommerceFeeds : [],
    viralCampaigns: Array.isArray(state.viralCampaigns) ? state.viralCampaigns : [],
    workspaceCredits:
      state.workspaceCredits && typeof state.workspaceCredits === 'object'
        ? state.workspaceCredits
        : {},
    tenants: state.tenants.filter((t) => !LEGACY_SEED_TENANT_IDS.has(t.id)),
    promoCodes: state.promoCodes.filter((p) => !LEGACY_SEED_PROMO_IDS.has(p.id)),
    invoices: state.invoices.filter((i) => !LEGACY_SEED_INVOICE_IDS.has(i.id)),
    auditLogs: state.auditLogs.filter((l) => !LEGACY_SEED_AUDIT_IDS.has(l.id)),
    apiHealthNodes: mergedApiNodes,
  };
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

function buildWorkspacePayload(state: AppState, ownerId: string, isCreate: boolean) {
  const safeActiveWsId =
    state.activeWorkspaceId && /^[a-zA-Z0-9_-]{1,128}$/.test(state.activeWorkspaceId)
      ? state.activeWorkspaceId
      : DEFAULT_WORKSPACE.id;

  const base = stripUndefined({
    activeWorkspaceId: safeActiveWsId,
    activeRole: state.activeRole,
    selectedPlan: state.selectedPlan,
    darkMode: Boolean(state.darkMode),
    workspaces: state.workspaces.slice(0, 25),
    categories: state.categories.slice(0, 50),
    connectedProfiles: state.connectedProfiles.slice(0, 150),
    teamMembers: state.teamMembers.slice(0, 50),
    contacts: state.contacts.slice(0, 200),
    threads: state.threads.slice(0, 200),
    deals: state.deals.slice(0, 200),
    posts: state.posts.slice(0, 300),
    ads: state.ads.slice(0, 100),
    drafts: state.drafts.slice(0, 200),
    discoveryAlerts: state.discoveryAlerts.slice(0, 100),
    youtubeChannels: (state.youtubeChannels || []).slice(0, 100),
    youtubeVideos: (state.youtubeVideos || []).slice(0, 200),
    seoArticles: (state.seoArticles || []).slice(0, 150),
    cmsConnectors: (state.cmsConnectors || []).slice(0, 50),
    rssSources: (state.rssSources || []).slice(0, 150),
    curatedItems: (state.curatedItems || []).slice(0, 200),
    ecommerceFeeds: (state.ecommerceFeeds || []).slice(0, 50),
    viralCampaigns: (state.viralCampaigns || []).slice(0, 100),
    workspaceCredits: state.workspaceCredits || {},
  });

  if (isCreate) {
    return {
      ownerId,
      ...base,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  return {
    ...base,
    updatedAt: serverTimestamp(),
  };
}

function buildAdminPayload(state: AppState, uid: string, isCreate: boolean) {
  const base = stripUndefined({
    updatedBy: uid,
    tenants: state.tenants.slice(0, 200),
    featureFlags: state.featureFlags.slice(0, 50),
    auditLogs: state.auditLogs.slice(0, 200),
    apiHealthNodes: state.apiHealthNodes.slice(0, 30),
    aiGovernance: state.aiGovernance,
    promoCodes: state.promoCodes.slice(0, 100),
    invoices: state.invoices.slice(0, 200),
  });

  if (isCreate) {
    return {
      ...base,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  return {
    ...base,
    updatedAt: serverTimestamp(),
  };
}

function buildPlatformConfigPayload(state: AppState, uid: string, isCreate: boolean) {
  const base = stripUndefined({
    updatedBy: uid,
    aiGovernance: state.aiGovernance,
    featureFlags: state.featureFlags.slice(0, 50),
  });

  if (isCreate) {
    return {
      ...base,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  return {
    ...base,
    updatedAt: serverTimestamp(),
  };
}

function mergeAiGovernance(
  base: AppState['aiGovernance'],
  incoming?: Partial<AppState['aiGovernance']> | null
): AppState['aiGovernance'] {
  if (!incoming || typeof incoming !== 'object') return base;
  return {
    ...base,
    ...incoming,
    tierLimits: {
      ...base.tierLimits,
      ...(incoming.tierLimits || {}),
    },
    moduleQuotas: {
      ...DEFAULT_STATE.aiGovernance.moduleQuotas!,
      ...(base.moduleQuotas || {}),
      ...(incoming.moduleQuotas || {}),
    },
  };
}

function readLocalCache(uid: string | null): AppState {
  const key = `${STORAGE_PREFIX}${uid || 'guest'}`;
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return DEFAULT_STATE;
    const parsed = JSON.parse(saved);
    if (!parsed || !Array.isArray(parsed.workspaces) || !Array.isArray(parsed.connectedProfiles)) {
      return DEFAULT_STATE;
    }
    return sanitizeLegacySeedData({
      ...DEFAULT_STATE,
      ...parsed,
      apiHealthNodes: Array.isArray(parsed.apiHealthNodes) ? parsed.apiHealthNodes : DEFAULT_STATE.apiHealthNodes,
      aiGovernance: mergeAiGovernance(DEFAULT_STATE.aiGovernance, parsed.aiGovernance),
      promoCodes: Array.isArray(parsed.promoCodes) ? parsed.promoCodes : DEFAULT_STATE.promoCodes,
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : DEFAULT_STATE.invoices,
    });
  } catch {
    return DEFAULT_STATE;
  }
}

export function useStorage(
  user: AuthSessionUser | null,
  authReady: boolean,
  googleProfileReady: boolean,
  isAdmin: boolean
) {
  const [state, setState] = useState<AppState>(() => readLocalCache(null));
  const [cloudLoading, setCloudLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const workspaceDocExistsRef = useRef(false);
  const adminDocExistsRef = useRef(false);
  const platformConfigExistsRef = useRef(false);
  const isHydratingRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const adminTimerRef = useRef<number | null>(null);
  const loadedUidRef = useRef<string | null>(null);
  const latestStateRef = useRef<AppState>(state);
  const hasPendingWorkspaceSaveRef = useRef(false);
  const hasPendingAdminSaveRef = useRef(false);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.darkMode]);

  useEffect(() => {
    // Guard against overwriting an authenticated user's persisted cache with stale guest state before hydration finishes
    if (user && (loadedUidRef.current !== user.uid || isHydratingRef.current)) {
      return;
    }
    const key = `${STORAGE_PREFIX}${user?.uid || 'guest'}`;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state, user]);

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      loadedUidRef.current = null;
      workspaceDocExistsRef.current = false;
      adminDocExistsRef.current = false;
      platformConfigExistsRef.current = false;
      setCloudLoading(false);
      return;
    }

    if (user.provider === 'google' && !googleProfileReady) return;
    if (loadedUidRef.current === user.uid) return;
    loadedUidRef.current = user.uid;

    let cancelled = false;
    const loadFromBackend = async () => {
      setCloudLoading(true);
      isHydratingRef.current = true;
      const cached = readLocalCache(user.uid);
      let merged: AppState = { ...cached };

      try {
        if (user.provider === 'password' && user.token && !user.token.startsWith('local_sess_')) {
          const [wsRes, cfgRes] = await Promise.all([
            fetch('/api/workspace', {
              headers: { Authorization: `Bearer ${user.token}` },
            }).catch(() => null),
            fetch('/api/platform-config', {
              headers: { Authorization: `Bearer ${user.token}` },
            }).catch(() => null),
          ]);

          if (wsRes && wsRes.ok && (wsRes.headers.get('content-type') || '').includes('application/json')) {
            const json = await wsRes.json();
            if (json.exists && json.data && Array.isArray(json.data.workspaces)) {
              merged = sanitizeLegacySeedData({
                ...DEFAULT_STATE,
                ...json.data,
                aiGovernance: mergeAiGovernance(DEFAULT_STATE.aiGovernance, json.data.aiGovernance),
                viewMode: merged.viewMode,
              });
            }
          }

          if (cfgRes && cfgRes.ok && (cfgRes.headers.get('content-type') || '').includes('application/json')) {
            const cfgJson = await cfgRes.json();
            if (cfgJson.exists && cfgJson.data) {
              merged = {
                ...merged,
                aiGovernance: mergeAiGovernance(merged.aiGovernance, cfgJson.data.aiGovernance),
                featureFlags:
                  Array.isArray(cfgJson.data.featureFlags) && cfgJson.data.featureFlags.length > 0
                    ? cfgJson.data.featureFlags
                    : merged.featureFlags,
              };
            }
          }
        } else if (user.provider === 'google') {
          const wsRef = doc(db, 'users', user.uid, 'workspaces', 'main');
          const wsSnap = await getDoc(wsRef);
          if (wsSnap.exists()) {
            workspaceDocExistsRef.current = true;
            const data = wsSnap.data();
            merged = sanitizeLegacySeedData({
              ...merged,
              activeWorkspaceId: typeof data.activeWorkspaceId === 'string' ? data.activeWorkspaceId : merged.activeWorkspaceId,
              activeRole: data.activeRole || merged.activeRole,
              selectedPlan: data.selectedPlan || merged.selectedPlan,
              darkMode: typeof data.darkMode === 'boolean' ? data.darkMode : merged.darkMode,
              workspaces: Array.isArray(data.workspaces) && data.workspaces.length > 0 ? data.workspaces : merged.workspaces,
              categories: Array.isArray(data.categories) ? data.categories : merged.categories,
              connectedProfiles: Array.isArray(data.connectedProfiles) ? data.connectedProfiles : merged.connectedProfiles,
              teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : merged.teamMembers,
              contacts: Array.isArray(data.contacts) ? data.contacts : merged.contacts,
              threads: Array.isArray(data.threads) ? data.threads : merged.threads,
              deals: Array.isArray(data.deals) ? data.deals : merged.deals,
              posts: Array.isArray(data.posts) ? data.posts : merged.posts,
              ads: Array.isArray(data.ads) ? data.ads : merged.ads,
              drafts: Array.isArray(data.drafts) ? data.drafts : merged.drafts,
              discoveryAlerts: Array.isArray(data.discoveryAlerts) ? data.discoveryAlerts : merged.discoveryAlerts,
              youtubeChannels: Array.isArray(data.youtubeChannels) ? data.youtubeChannels : merged.youtubeChannels,
              youtubeVideos: Array.isArray(data.youtubeVideos) ? data.youtubeVideos : merged.youtubeVideos,
              seoArticles: Array.isArray(data.seoArticles) ? data.seoArticles : merged.seoArticles,
              cmsConnectors: Array.isArray(data.cmsConnectors) ? data.cmsConnectors : merged.cmsConnectors,
              rssSources: Array.isArray(data.rssSources) ? data.rssSources : merged.rssSources,
              curatedItems: Array.isArray(data.curatedItems) ? data.curatedItems : merged.curatedItems,
              ecommerceFeeds: Array.isArray(data.ecommerceFeeds) ? data.ecommerceFeeds : merged.ecommerceFeeds,
              viralCampaigns: Array.isArray(data.viralCampaigns) ? data.viralCampaigns : merged.viralCampaigns,
              workspaceCredits:
                data.workspaceCredits && typeof data.workspaceCredits === 'object'
                  ? data.workspaceCredits
                  : merged.workspaceCredits,
            });
          } else {
            await setDoc(wsRef, buildWorkspacePayload(merged, user.uid, true));
            workspaceDocExistsRef.current = true;
          }

          // Load global non-PII platform quotas & feature flags for every verified user
          try {
            const cfgRef = doc(db, 'platformConfig', 'governance');
            const cfgSnap = await getDoc(cfgRef);
            if (cfgSnap.exists()) {
              platformConfigExistsRef.current = true;
              const cData = cfgSnap.data();
              merged = {
                ...merged,
                aiGovernance: mergeAiGovernance(merged.aiGovernance, cData.aiGovernance),
                featureFlags:
                  Array.isArray(cData.featureFlags) && cData.featureFlags.length > 0
                    ? cData.featureFlags
                    : merged.featureFlags,
              };
            }
          } catch {
            // Fall back cleanly to default quotas if platformConfig hasn't been initialized yet
          }

          if (isAdmin) {
            const adminPath = 'adminState/global';
            const adminRef = doc(db, 'adminState', 'global');
            try {
              const adminSnap = await getDoc(adminRef);
              if (adminSnap.exists()) {
                adminDocExistsRef.current = true;
                const aData = adminSnap.data();
                merged = sanitizeLegacySeedData({
                  ...merged,
                  tenants: Array.isArray(aData.tenants) ? aData.tenants : merged.tenants,
                  featureFlags: Array.isArray(aData.featureFlags) ? aData.featureFlags : merged.featureFlags,
                  auditLogs: Array.isArray(aData.auditLogs) ? aData.auditLogs : merged.auditLogs,
                  apiHealthNodes: Array.isArray(aData.apiHealthNodes) ? aData.apiHealthNodes : merged.apiHealthNodes,
                  aiGovernance: mergeAiGovernance(merged.aiGovernance, aData.aiGovernance),
                  promoCodes: Array.isArray(aData.promoCodes) ? aData.promoCodes : merged.promoCodes,
                  invoices: Array.isArray(aData.invoices) ? aData.invoices : merged.invoices,
                });
              } else {
                await setDoc(adminRef, buildAdminPayload(merged, user.uid, true));
                adminDocExistsRef.current = true;
              }
            } catch (err) {
              handleFirestoreError(err, OperationType.GET, adminPath);
            }
          }
        }

        if (!cancelled) {
          setState((prev) => ({
            ...merged,
            viewMode: prev.viewMode,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Workspace sync load error:', error);
        }
      } finally {
        if (!cancelled) {
          isHydratingRef.current = false;
          setCloudLoading(false);
        }
      }
    };

    loadFromBackend();

    return () => {
      cancelled = true;
    };
  }, [user, authReady, googleProfileReady, isAdmin]);

  const persistWorkspaceNow = useCallback(
    async (nextState: AppState, keepalive = false) => {
      if (!user) return;
      if (user.provider === 'google' && !googleProfileReady) return;
      hasPendingWorkspaceSaveRef.current = false;

      if (user.provider === 'password' && user.token) {
        if (user.token.startsWith('local_sess_')) return;
        await fetch('/api/workspace', {
          method: 'PUT',
          keepalive,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify(stripUndefined(nextState)),
        }).catch(() => {});

        if (isAdmin) {
          await fetch('/api/platform-config', {
            method: 'PUT',
            keepalive,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify(
              stripUndefined({
                aiGovernance: nextState.aiGovernance,
                featureFlags: nextState.featureFlags,
              })
            ),
          }).catch(() => {});
        }
        return;
      }

      if (user.provider === 'google') {
        const wsPath = `users/${user.uid}/workspaces/main`;
        const wsRef = doc(db, 'users', user.uid, 'workspaces', 'main');
        try {
          if (workspaceDocExistsRef.current) {
            await updateDoc(wsRef, buildWorkspacePayload(nextState, user.uid, false));
          } else {
            await setDoc(wsRef, buildWorkspacePayload(nextState, user.uid, true));
            workspaceDocExistsRef.current = true;
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, wsPath);
        }
      }
    },
    [user, googleProfileReady, isAdmin]
  );

  const persistAdminNow = useCallback(
    async (nextState: AppState) => {
      if (!user || user.provider !== 'google' || !isAdmin) return;
      hasPendingAdminSaveRef.current = false;

      const adminPath = 'adminState/global';
      const adminRef = doc(db, 'adminState', 'global');
      try {
        if (adminDocExistsRef.current) {
          await updateDoc(adminRef, buildAdminPayload(nextState, user.uid, false));
        } else {
          await setDoc(adminRef, buildAdminPayload(nextState, user.uid, true));
          adminDocExistsRef.current = true;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, adminPath);
      }

      const cfgPath = 'platformConfig/governance';
      const cfgRef = doc(db, 'platformConfig', 'governance');
      try {
        if (platformConfigExistsRef.current) {
          await updateDoc(cfgRef, buildPlatformConfigPayload(nextState, user.uid, false));
        } else {
          await setDoc(cfgRef, buildPlatformConfigPayload(nextState, user.uid, true));
          platformConfigExistsRef.current = true;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, cfgPath);
      }
    },
    [user, isAdmin]
  );

  // Flush any pending debounced saves on tab close or page reload so rapid reloads never lose edits
  useEffect(() => {
    const flushOnExit = () => {
      if (hasPendingWorkspaceSaveRef.current) {
        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        persistWorkspaceNow(latestStateRef.current, true);
      }
      if (hasPendingAdminSaveRef.current) {
        if (adminTimerRef.current) {
          window.clearTimeout(adminTimerRef.current);
          adminTimerRef.current = null;
        }
        persistAdminNow(latestStateRef.current);
      }
    };
    window.addEventListener('pagehide', flushOnExit);
    window.addEventListener('beforeunload', flushOnExit);
    return () => {
      window.removeEventListener('pagehide', flushOnExit);
      window.removeEventListener('beforeunload', flushOnExit);
    };
  }, [persistWorkspaceNow, persistAdminNow]);

  const scheduleWorkspaceSave = useCallback(
    (nextState: AppState) => {
      if (!user || isHydratingRef.current) return;
      if (user.provider === 'google' && !googleProfileReady) return;

      // Write immediately to localStorage for instant zero-loss reload resilience
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${user.uid}`, JSON.stringify(nextState));
      } catch {
        // Ignore storage quota errors
      }

      hasPendingWorkspaceSaveRef.current = true;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        persistWorkspaceNow(nextState, false);
      }, 200);

      if (user.provider === 'google' && isAdmin) {
        hasPendingAdminSaveRef.current = true;
        if (adminTimerRef.current) {
          window.clearTimeout(adminTimerRef.current);
        }
        adminTimerRef.current = window.setTimeout(() => {
          adminTimerRef.current = null;
          persistAdminNow(nextState);
        }, 350);
      }
    },
    [user, googleProfileReady, isAdmin, persistWorkspaceNow, persistAdminNow]
  );

  const updateState = useCallback(
    (updater: Partial<AppState> | ((prev: AppState) => AppState)) => {
      setState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        latestStateRef.current = next;
        scheduleWorkspaceSave(next);
        return next;
      });
    },
    [scheduleWorkspaceSave]
  );

  const resetDemoData = useCallback(() => {
    const fresh: AppState = { ...DEFAULT_STATE, viewMode: 'app' };
    setState(fresh);
    latestStateRef.current = fresh;
    scheduleWorkspaceSave(fresh);
  }, [scheduleWorkspaceSave]);

  const pushToast = useCallback(
    (title: string, description?: string, variant: ToastItem['variant'] = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { state, updateState, resetDemoData, toasts, pushToast, dismissToast, cloudLoading };
}
