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
  SUPER_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
} from '../firebase';
import { PlanTier, TeamRole } from '../types';

const SESSION_TOKEN_KEY = 'socialifyai_auth_token_v1';
const LOCAL_SESSION_USER_KEY = 'socialifyai_local_session_v1';
const LOCAL_USERS_KEY = 'socialifyai_local_users_v1';
const SUPER_ADMIN_DIGEST = '40353b709ab6714927c87372656802e488827a9b99674f71b4855ea25dcfa459';

interface LocalStoredAccount {
  uid: string;
  email: string;
  displayName: string;
  companyName?: string;
  status?: 'active' | 'suspended';
  salt: string;
  passwordDigest: string;
  createdAt: string;
}

// Pure-JS FIPS 180-4 SHA-256 hex digest (works on both HTTP & HTTPS static hosts)
function sha256Hex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const bitLen = bytes.length * 8;
  const padLen = ((bytes.length + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(padLen);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((v) => v.toString(16).padStart(8, '0')).join('');
}

function loadLocalAccounts(): LocalStoredAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: LocalStoredAccount[]) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore quota errors
  }
}

function persistLocalSession(session: AuthSessionUser) {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, session.token || `local_sess_${session.uid}`);
    localStorage.setItem(LOCAL_SESSION_USER_KEY, JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

export function upsertLocalAdminAccount(params: {
  uid?: string;
  displayName: string;
  email: string;
  password: string;
  companyName?: string;
}): string {
  const cleanEmail = params.email.trim().toLowerCase();
  const accounts = loadLocalAccounts();
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === cleanEmail);
  const salt = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const uid = params.uid || (idx !== -1 ? accounts[idx].uid : `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);
  const rec: LocalStoredAccount = {
    uid,
    email: cleanEmail,
    displayName: params.displayName.trim().slice(0, 120),
    companyName: (params.companyName || '').trim().slice(0, 80),
    status: 'active',
    salt,
    passwordDigest: sha256Hex(`${salt}:${params.password}`),
    createdAt: idx !== -1 ? accounts[idx].createdAt : new Date().toISOString(),
  };
  if (idx !== -1) {
    accounts[idx] = rec;
  } else {
    accounts.push(rec);
  }
  saveLocalAccounts(accounts);
  return uid;
}

export function setLocalAccountStatus(emailOrUid: string, status: 'active' | 'suspended') {
  const needle = emailOrUid.trim().toLowerCase();
  const accounts = loadLocalAccounts();
  const updated = accounts.map((a) =>
    a.uid.toLowerCase() === needle || a.email.toLowerCase() === needle ? { ...a, status } : a
  );
  saveLocalAccounts(updated);
}

function attemptLocalEmailLogin(email: string, password: string): { session?: AuthSessionUser; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const rawPassword = password;
  const trimmedPassword = password.trim();

  if (cleanEmail === SUPER_ADMIN_EMAIL) {
    const matchesRaw = sha256Hex(`socialifyai:${cleanEmail}:${rawPassword}`) === SUPER_ADMIN_DIGEST;
    const matchesTrim = sha256Hex(`socialifyai:${cleanEmail}:${trimmedPassword}`) === SUPER_ADMIN_DIGEST;
    if (matchesRaw || matchesTrim) {
      return {
        session: {
          uid: 'admin-essadhiif',
          email: SUPER_ADMIN_EMAIL,
          displayName: 'Super Admin',
          companyName: 'socialifyai.com HQ',
          isAdmin: true,
          provider: 'password',
          token: 'local_sess_admin-essadhiif',
        },
      };
    }
    return { error: 'Invalid email or password. Please check your credentials and try again.' };
  }

  const accounts = loadLocalAccounts();
  const found = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
  if (!found) return { error: 'Invalid email or password. Please check your credentials and try again.' };
  const validRaw = sha256Hex(`${found.salt}:${rawPassword}`) === found.passwordDigest;
  const validTrim = sha256Hex(`${found.salt}:${trimmedPassword}`) === found.passwordDigest;
  if (!validRaw && !validTrim) {
    return { error: 'Invalid email or password. Please check your credentials and try again.' };
  }
  if (found.status === 'suspended') {
    return {
      error: 'This account has been suspended by an administrator. Contact support@socialifyai.com to restore access.',
    };
  }

  return {
    session: {
      uid: found.uid,
      email: found.email,
      displayName: found.displayName,
      companyName: found.companyName || '',
      isAdmin: false,
      provider: 'password',
      token: `local_sess_${found.uid}`,
    },
  };
}

function attemptLocalEmailSignUp(params: {
  displayName: string;
  email: string;
  password: string;
  companyName?: string;
}): { session?: AuthSessionUser; error?: string } {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.displayName.trim();
  const cleanPassword = params.password;
  if (!cleanName || cleanName.length < 2) {
    return { error: 'Please enter your full name (at least 2 characters).' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { error: 'Please enter a valid email address.' };
  }
  if (cleanPassword.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }
  const accounts = loadLocalAccounts();
  if (cleanEmail === SUPER_ADMIN_EMAIL || accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
    return { error: 'An account with this email already exists. Please sign in instead.' };
  }
  const salt = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const uid = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const account: LocalStoredAccount = {
    uid,
    email: cleanEmail,
    displayName: cleanName.slice(0, 120),
    companyName: (params.companyName || '').trim().slice(0, 80),
    salt,
    passwordDigest: sha256Hex(`${salt}:${cleanPassword}`),
    createdAt: new Date().toISOString(),
  };
  accounts.push(account);
  saveLocalAccounts(accounts);

  return {
    session: {
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      companyName: account.companyName,
      isAdmin: false,
      provider: 'password',
      token: `local_sess_${account.uid}`,
    },
  };
}

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
    return Boolean(fbUser.emailVerified && emailLower === SUPER_ADMIN_EMAIL);
  }, []);

  // 1. Restore verified Email/Password session on mount (Express API or static-host fallback)
  useEffect(() => {
    let cancelled = false;
    const restoreTokenSession = async () => {
      try {
        const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
        if (!storedToken) return;

        if (storedToken.startsWith('local_sess_')) {
          const rawLocal = localStorage.getItem(LOCAL_SESSION_USER_KEY);
          if (rawLocal) {
            const parsed = JSON.parse(rawLocal) as AuthSessionUser;
            if (!cancelled && parsed?.uid && parsed?.email) {
              setPasswordSession({
                ...parsed,
                isAdmin:
                  parsed.email.toLowerCase() === SUPER_ADMIN_EMAIL && Boolean(parsed.isAdmin),
                provider: 'password',
                token: storedToken,
              });
              return;
            }
          }
          localStorage.removeItem(SESSION_TOKEN_KEY);
          localStorage.removeItem(LOCAL_SESSION_USER_KEY);
          return;
        }

        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        const isJson = (res.headers.get('content-type') || '').includes('application/json');
        if (!res.ok || !isJson) {
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
            isAdmin:
              String(u.email || '').toLowerCase() === SUPER_ADMIN_EMAIL &&
              Boolean(u.isAdmin || u.role === 'super_admin'),
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
        const adminFlag = Boolean(fbUser.emailVerified && emailLower === SUPER_ADMIN_EMAIL);
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
        const fallbackAdmin = Boolean(fbUser.emailVerified && emailLower === SUPER_ADMIN_EMAIL);
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
  const isAdmin = Boolean(
    activeUser &&
      activeUser.email.toLowerCase() === SUPER_ADMIN_EMAIL &&
      activeUser.isAdmin
  );

  const signInWithEmailPassword = useCallback(
    async (email: string, password: string): Promise<AuthSessionUser | null> => {
      setSigningIn(true);
      setAuthError(null);
      let serverAvailable = false;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const isJson = (res.headers.get('content-type') || '').includes('application/json');
        if (isJson && res.status !== 404 && res.status !== 405 && res.status < 500) {
          serverAvailable = true;
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.token && json.user) {
            localStorage.removeItem(LOCAL_SESSION_USER_KEY);
            localStorage.setItem(SESSION_TOKEN_KEY, json.token);
            const session: AuthSessionUser = {
              uid: json.user.uid,
              email: json.user.email,
              displayName: json.user.displayName,
              companyName: json.user.companyName || '',
              isAdmin:
                String(json.user.email || '').toLowerCase() === SUPER_ADMIN_EMAIL &&
                Boolean(json.user.isAdmin || json.user.role === 'super_admin'),
              provider: 'password',
              token: json.token,
            };
            setPasswordSession(session);
            return session;
          }
          setAuthError(json.error || 'Invalid email or password. Please check your credentials and try again.');
          return null;
        }
      } catch {
        // Backend route unavailable on static deployment; continue to verified local auth fallback
      } finally {
        if (serverAvailable) {
          setSigningIn(false);
        }
      }

      // Static-domain fallback (e.g. https://www.socialifyai.com/ without Express API routes)
      try {
        const result = attemptLocalEmailLogin(email, password);
        if (result.session) {
          persistLocalSession(result.session);
          setPasswordSession(result.session);
          return result.session;
        }
        setAuthError(result.error || 'Invalid email or password. Please check your credentials and try again.');
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
      let serverAvailable = false;
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const isJson = (res.headers.get('content-type') || '').includes('application/json');
        if (isJson && res.status !== 404 && res.status !== 405 && res.status < 500) {
          serverAvailable = true;
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.token && json.user) {
            localStorage.removeItem(LOCAL_SESSION_USER_KEY);
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
          }
          setAuthError(json.error || 'Unable to create account.');
          return null;
        }
      } catch {
        // Backend route unavailable on static deployment; fall back to verified local store
      } finally {
        if (serverAvailable) {
          setSigningIn(false);
        }
      }

      try {
        const result = attemptLocalEmailSignUp(params);
        if (result.session) {
          persistLocalSession(result.session);
          setPasswordSession(result.session);
          return result.session;
        }
        setAuthError(result.error || 'Unable to create account.');
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
      const adminFlag = Boolean(fbUser.emailVerified && emailLower === SUPER_ADMIN_EMAIL);
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
    localStorage.removeItem(LOCAL_SESSION_USER_KEY);
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
