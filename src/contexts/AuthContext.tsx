import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  SUPER_ADMIN_EMAILS,
  OperationType,
  handleFirestoreError,
} from '../firebase';
import { PlanTier, TeamRole } from '../types';

const SESSION_TOKEN_KEY = 'socialifyai_auth_token_v1';

export interface AuthSessionUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  companyName?: string;
  isAdmin: boolean;
  provider: 'password' | 'google';
  token?: string;
}

export interface UserProfileRecord {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  selectedPlan: PlanTier;
  activeRole: TeamRole;
}

interface AuthContextValue {
  user: AuthSessionUser | null;
  firebaseUser: User | null;
  profile: UserProfileRecord | null;
  authReady: boolean;
  isAdmin: boolean;
  signingIn: boolean;
  authError: string | null;
  signInWithEmailPassword: (email: string, password: string) => Promise<AuthSessionUser | null>;
  signUpWithEmailPassword: (params: {
    displayName: string;
    email: string;
    password: string;
    companyName?: string;
  }) => Promise<AuthSessionUser | null>;
  signInWithGoogle: () => Promise<AuthSessionUser | null>;
  redirectSignInUser: AuthSessionUser | null;
  clearRedirectSignIn: () => void;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  updateProfilePrefs: (
    updates: Partial<Pick<UserProfileRecord, 'selectedPlan' | 'activeRole' | 'displayName'>>
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function clampString(value: string, max: number, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

function mapFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in window was closed before completing authentication. Try again or use Email & Password.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Your browser blocked the Google popup. Allow popups or sign in with Email & Password below.';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Another sign-in popup is already open. Finish signing in there.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error reaching Google authentication. Check your connection and retry.';
  }
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    return `Google Sign-In needs "${host}" added to Firebase Console → Authentication → Settings → Authorized domains (project gen-lang-client-0915498446).`;
  }
  return error instanceof Error ? error.message : 'Unable to sign in right now. Please try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [passwordSession, setPasswordSession] = useState<AuthSessionUser | null>(null);
  const [googleSession, setGoogleSession] = useState<AuthSessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [redirectSignInUser, setRedirectSignInUser] = useState<AuthSessionUser | null>(null);

  const ensureUserProfile = useCallback(async (fbUser: User): Promise<UserProfileRecord> => {
    const userPath = `users/${fbUser.uid}`;
    const userRef = doc(db, 'users', fbUser.uid);

    const safeDisplayName = clampString(
      fbUser.displayName || fbUser.email?.split('@')[0] || 'Workspace User',
      120,
      'Workspace User'
    );
    const safeEmail = clampString(fbUser.email || '', 254, 'user@socialifyai.com');
    const safePhoto = (fbUser.photoURL || '').slice(0, 2048);

    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          uid: fbUser.uid,
          displayName: typeof data.displayName === 'string' ? data.displayName : safeDisplayName,
          email: typeof data.email === 'string' ? data.email : safeEmail,
          photoURL: typeof data.photoURL === 'string' ? data.photoURL : safePhoto,
          selectedPlan: (data.selectedPlan as PlanTier) || 'accelerate',
          activeRole: (data.activeRole as TeamRole) || 'Owner',
        };
      }

      await setDoc(userRef, {
        uid: fbUser.uid,
        displayName: safeDisplayName,
        email: safeEmail,
        photoURL: safePhoto,
        selectedPlan: 'accelerate' as PlanTier,
        activeRole: 'Owner' as TeamRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        uid: fbUser.uid,
        displayName: safeDisplayName,
        email: safeEmail,
        photoURL: safePhoto,
        selectedPlan: 'accelerate',
        activeRole: 'Owner',
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  }, []);

  const checkFirebaseAdminRole = useCallback(async (fbUser: User): Promise<boolean> => {
    const emailLower = fbUser.email?.toLowerCase() || '';
    if (fbUser.emailVerified && SUPER_ADMIN_EMAILS.includes(emailLower)) {
      return true;
    }
    try {
      const adminSnap = await getDoc(doc(db, 'admins', fbUser.uid));
      return adminSnap.exists();
    } catch {
      return false;
    }
  }, []);

  // 1. Restore server-verified Email/Password session on mount
  useEffect(() => {
    let cancelled = false;
    const restoreTokenSession = async () => {
      try {
        const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
        if (!storedToken) return;
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!res.ok) {
          localStorage.removeItem(SESSION_TOKEN_KEY);
          return;
        }
        const json = await res.json();
        if (!cancelled && json?.user) {
          const u = json.user;
          const session: AuthSessionUser = {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            companyName: u.companyName || '',
            isAdmin: Boolean(u.isAdmin || u.role === 'super_admin'),
            provider: 'password',
            token: storedToken,
          };
          setPasswordSession(session);
        }
      } catch {
        // Ignore network failure during initial check
      } finally {
        if (!cancelled) setTokenReady(true);
      }
    };
    restoreTokenSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Complete any pending Google Sign-In redirect result (e.g. mobile / popup-blocked on socialifyai.com)
  useEffect(() => {
    let cancelled = false;
    getRedirectResult(auth)
      .then((result) => {
        if (cancelled || !result?.user) return;
        const fbUser = result.user;
        localStorage.removeItem(SESSION_TOKEN_KEY);
        setPasswordSession(null);
        const emailLower = fbUser.email?.toLowerCase() || '';
        const adminFlag = Boolean(fbUser.emailVerified && SUPER_ADMIN_EMAILS.includes(emailLower));
        const session: AuthSessionUser = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          photoURL: fbUser.photoURL || undefined,
          isAdmin: adminFlag,
          provider: 'google',
        };
        setGoogleSession(session);
        setRedirectSignInUser(session);
      })
      .catch((error) => {
        if (!cancelled) {
          setAuthError(mapFirebaseAuthError(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 3. Listen to Firebase Auth state (Google Sign-In)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setGoogleSession(null);
        setProfile(null);
        setFirebaseReady(true);
        return;
      }

      try {
        const [loadedProfile, adminFlag] = await Promise.all([
          ensureUserProfile(fbUser),
          checkFirebaseAdminRole(fbUser),
        ]);
        setProfile(loadedProfile);
        setGoogleSession({
          uid: fbUser.uid,
          email: loadedProfile.email,
          displayName: loadedProfile.displayName,
          photoURL: loadedProfile.photoURL || undefined,
          isAdmin: adminFlag,
          provider: 'google',
        });
      } catch (err) {
        console.error('Failed to sync Google profile:', err);
        const emailLower = fbUser.email?.toLowerCase() || '';
        const fallbackAdmin = Boolean(fbUser.emailVerified && SUPER_ADMIN_EMAILS.includes(emailLower));
        setProfile({
          uid: fbUser.uid,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email: fbUser.email || '',
          photoURL: fbUser.photoURL || '',
          selectedPlan: 'accelerate',
          activeRole: 'Owner',
        });
        setGoogleSession({
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          photoURL: fbUser.photoURL || undefined,
          isAdmin: fallbackAdmin,
          provider: 'google',
        });
      } finally {
        setFirebaseReady(true);
      }
    });

    return () => unsubscribe();
  }, [ensureUserProfile, checkFirebaseAdminRole]);

  const activeUser = passwordSession || googleSession;
  const authReady = firebaseReady && tokenReady;
  const isAdmin = Boolean(activeUser?.isAdmin);

  const signInWithEmailPassword = useCallback(
    async (email: string, password: string): Promise<AuthSessionUser | null> => {
      setSigningIn(true);
      setAuthError(null);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.token || !json.user) {
          setAuthError(json.error || 'Invalid email or password.');
          return null;
        }
        localStorage.setItem(SESSION_TOKEN_KEY, json.token);
        const session: AuthSessionUser = {
          uid: json.user.uid,
          email: json.user.email,
          displayName: json.user.displayName,
          companyName: json.user.companyName || '',
          isAdmin: Boolean(json.user.isAdmin || json.user.role === 'super_admin'),
          provider: 'password',
          token: json.token,
        };
        setPasswordSession(session);
        return session;
      } catch {
        setAuthError('Unable to connect to authentication server. Please try again.');
        return null;
      } finally {
        setSigningIn(false);
      }
    },
    []
  );

  const signUpWithEmailPassword = useCallback(
    async (params: {
      displayName: string;
      email: string;
      password: string;
      companyName?: string;
    }): Promise<AuthSessionUser | null> => {
      setSigningIn(true);
      setAuthError(null);
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.token || !json.user) {
          setAuthError(json.error || 'Unable to create account.');
          return null;
        }
        localStorage.setItem(SESSION_TOKEN_KEY, json.token);
        const session: AuthSessionUser = {
          uid: json.user.uid,
          email: json.user.email,
          displayName: json.user.displayName,
          companyName: json.user.companyName || params.companyName || '',
          isAdmin: false,
          provider: 'password',
          token: json.token,
        };
        setPasswordSession(session);
        return session;
      } catch {
        setAuthError('Unable to connect to authentication server. Please try again.');
        return null;
      } finally {
        setSigningIn(false);
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthSessionUser | null> => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      localStorage.removeItem(SESSION_TOKEN_KEY);
      setPasswordSession(null);
      const fbUser = result.user;
      const emailLower = fbUser.email?.toLowerCase() || '';
      const adminFlag = Boolean(fbUser.emailVerified && SUPER_ADMIN_EMAILS.includes(emailLower));
      const session: AuthSessionUser = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        photoURL: fbUser.photoURL || undefined,
        isAdmin: adminFlag,
        provider: 'google',
      };
      // Set session immediately so dashboard transition never stalls waiting for async profile sync
      setGoogleSession(session);
      return session;
    } catch (error) {
      const code = (error as { code?: string })?.code || '';
      const isTopLevelWindow = typeof window !== 'undefined' && window.self === window.top;
      if (
        isTopLevelWindow &&
        (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment')
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return null;
        } catch (redirectError) {
          setAuthError(mapFirebaseAuthError(redirectError));
          return null;
        }
      }
      setAuthError(mapFirebaseAuthError(error));
      return null;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const clearRedirectSignIn = useCallback(() => setRedirectSignInUser(null), []);

  const logout = useCallback(async () => {
    setAuthError(null);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    setPasswordSession(null);
    setGoogleSession(null);
    setProfile(null);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    if (auth.currentUser) {
      await signOut(auth).catch(() => {});
    }
  }, []);

  const updateProfilePrefs = useCallback(
    async (updates: Partial<Pick<UserProfileRecord, 'selectedPlan' | 'activeRole' | 'displayName'>>) => {
      if (!firebaseUser) return;
      const userPath = `users/${firebaseUser.uid}`;
      const payload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (updates.selectedPlan) payload.selectedPlan = updates.selectedPlan;
      if (updates.activeRole) payload.activeRole = updates.activeRole;
      if (updates.displayName) payload.displayName = clampString(updates.displayName, 120, 'Workspace User');

      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), payload);
        setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, userPath);
      }
    },
    [firebaseUser]
  );

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        firebaseUser,
        profile,
        authReady,
        isAdmin,
        signingIn,
        authError,
        signInWithEmailPassword,
        signUpWithEmailPassword,
        signInWithGoogle,
        redirectSignInUser,
        clearRedirectSignIn,
        logout,
        clearAuthError,
        updateProfilePrefs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
