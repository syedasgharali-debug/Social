import { useState, useEffect, useCallback } from 'react';
import { AppState, ToastItem } from '../types';
import { INITIAL_STATE } from '../data/seedData';

const STORAGE_KEY = 'pulsecrm_state_v4';

export function useStorage() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return INITIAL_STATE;
      const parsed = JSON.parse(saved);
      if (
        !parsed ||
        !Array.isArray(parsed.workspaces) ||
        !Array.isArray(parsed.connectedProfiles) ||
        !Array.isArray(parsed.teamMembers)
      ) {
        return INITIAL_STATE;
      }
      const mergedTenants = Array.isArray(parsed.tenants)
        ? parsed.tenants.map((t: Record<string, unknown>, idx: number) => ({
            ...INITIAL_STATE.tenants[idx % INITIAL_STATE.tenants.length],
            ...t,
          }))
        : INITIAL_STATE.tenants;

      return {
        ...INITIAL_STATE,
        ...parsed,
        tenants: mergedTenants,
        apiHealthNodes: Array.isArray(parsed.apiHealthNodes) ? parsed.apiHealthNodes : INITIAL_STATE.apiHealthNodes,
        aiGovernance: parsed.aiGovernance ? { ...INITIAL_STATE.aiGovernance, ...parsed.aiGovernance } : INITIAL_STATE.aiGovernance,
        promoCodes: Array.isArray(parsed.promoCodes) ? parsed.promoCodes : INITIAL_STATE.promoCodes,
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : INITIAL_STATE.invoices,
      };
    } catch {
      return INITIAL_STATE;
    }
  });

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.darkMode]);

  const updateState = useCallback(
    (updater: Partial<AppState> | ((prev: AppState) => AppState)) => {
      setState((prev) => {
        if (typeof updater === 'function') {
          return updater(prev);
        }
        return { ...prev, ...updater };
      });
    },
    []
  );

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ ...INITIAL_STATE, viewMode: 'app' });
  }, []);

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

  return { state, updateState, resetDemoData, toasts, pushToast, dismissToast };
}
