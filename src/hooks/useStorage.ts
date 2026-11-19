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
    tenants: state.tenants.filter((t) => !LEGACY_SEED_TENANT_IDS.has(t.id)),
    promoCodes: state.promoCodes.filter((p) => !LEGACY_SEED_PROMO_IDS.has(p.id)),
    invoices: state.invoices.filter((i) => !LEGACY_SEED_INVOICE_IDS.has(i.id)),
    auditLogs: state.auditLogs.filter((l) => !LEGACY_SEED_AUDIT_IDS.has(l.id)),
    apiHealthNodes: hasLegacyApiNumbers ? DEFAULT_API_HEALTH : state.apiHealthNodes,
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
      aiGovernance: parsed.aiGovernance
        ? { ...DEFAULT_STATE.aiGovernance, ...parsed.aiGovernance }
        : DEFAULT_STATE.aiGovernance,
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
  const isHydratingRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const adminTimerRef = useRef<number | null>(null);
  const loadedUidRef = useRef<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (state.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.darkMode]);

  useEffect(() => {
    const key = `${STORAGE_PREFIX}${user?.uid || 'guest'}`;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state, user?.uid]);

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      loadedUidRef.current = null;
      workspaceDocExistsRef.current = false;
      adminDocExistsRef.current = false;
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
          const res = await fetch('/api/workspace', {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          const isJson = (res.headers.get('content-type') || '').includes('application/json');
          if (res.ok && isJson) {
            const json = await res.json();
            if (json.exists && json.data && Array.isArray(json.data.workspaces)) {
              merged = sanitizeLegacySeedData({
                ...DEFAULT_STATE,
                ...json.data,
                viewMode: merged.viewMode,
              });
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
            });
          } else {
            await setDoc(wsRef, buildWorkspacePayload(merged, user.uid, true));
            workspaceDocExistsRef.current = true;
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
                  aiGovernance: aData.aiGovernance ? { ...merged.aiGovernance, ...aData.aiGovernance } : merged.aiGovernance,
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

  const scheduleWorkspaceSave = useCallback(
    (nextState: AppState) => {
      if (!user || isHydratingRef.current) return;
      if (user.provider === 'google' && !googleProfileReady) return;

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(async () => {
        if (user.provider === 'password' && user.token) {
          if (user.token.startsWith('local_sess_')) return;
          await fetch('/api/workspace', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify(stripUndefined(nextState)),
          }).catch(() => {});
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
      }, 450);

      if (user.provider === 'google' && isAdmin) {
        if (adminTimerRef.current) {
          window.clearTimeout(adminTimerRef.current);
        }
        adminTimerRef.current = window.setTimeout(async () => {
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
        }, 650);
      }
    },
    [user, googleProfileReady, isAdmin]
  );

  const updateState = useCallback(
    (updater: Partial<AppState> | ((prev: AppState) => AppState)) => {
      setState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        scheduleWorkspaceSave(next);
        return next;
      });
    },
    [scheduleWorkspaceSave]
  );

  const resetDemoData = useCallback(() => {
    const fresh: AppState = { ...DEFAULT_STATE, viewMode: 'app' };
    setState(fresh);
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
