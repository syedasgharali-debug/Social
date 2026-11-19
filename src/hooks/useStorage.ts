import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { AppState, ToastItem } from '../types';
import { INITIAL_STATE } from '../data/seedData';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { AuthSessionUser } from '../contexts/AuthContext';

const STORAGE_PREFIX = 'socialifyai_state_v5_';

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
      : 'ws-digixy';

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
    if (!saved) return INITIAL_STATE;
    const parsed = JSON.parse(saved);
    if (!parsed || !Array.isArray(parsed.workspaces) || !Array.isArray(parsed.connectedProfiles)) {
      return INITIAL_STATE;
    }
    return {
      ...INITIAL_STATE,
      ...parsed,
      apiHealthNodes: Array.isArray(parsed.apiHealthNodes) ? parsed.apiHealthNodes : INITIAL_STATE.apiHealthNodes,
      aiGovernance: parsed.aiGovernance
        ? { ...INITIAL_STATE.aiGovernance, ...parsed.aiGovernance }
        : INITIAL_STATE.aiGovernance,
      promoCodes: Array.isArray(parsed.promoCodes) ? parsed.promoCodes : INITIAL_STATE.promoCodes,
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : INITIAL_STATE.invoices,
    };
  } catch {
    return INITIAL_STATE;
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
        if (user.provider === 'password' && user.token) {
          const res = await fetch('/api/workspace', {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.exists && json.data && Array.isArray(json.data.workspaces)) {
              merged = {
                ...INITIAL_STATE,
                ...json.data,
                viewMode: merged.viewMode,
              };
            }
          }
        } else if (user.provider === 'google') {
          const wsRef = doc(db, 'users', user.uid, 'workspaces', 'main');
          const wsSnap = await getDoc(wsRef);
          if (wsSnap.exists()) {
            workspaceDocExistsRef.current = true;
            const data = wsSnap.data();
            merged = {
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
            };
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
                merged = {
                  ...merged,
                  tenants: Array.isArray(aData.tenants) ? aData.tenants : merged.tenants,
                  featureFlags: Array.isArray(aData.featureFlags) ? aData.featureFlags : merged.featureFlags,
                  auditLogs: Array.isArray(aData.auditLogs) ? aData.auditLogs : merged.auditLogs,
                  apiHealthNodes: Array.isArray(aData.apiHealthNodes) ? aData.apiHealthNodes : merged.apiHealthNodes,
                  aiGovernance: aData.aiGovernance ? { ...merged.aiGovernance, ...aData.aiGovernance } : merged.aiGovernance,
                  promoCodes: Array.isArray(aData.promoCodes) ? aData.promoCodes : merged.promoCodes,
                  invoices: Array.isArray(aData.invoices) ? aData.invoices : merged.invoices,
                };
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
    const fresh: AppState = { ...INITIAL_STATE, viewMode: 'app' };
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
