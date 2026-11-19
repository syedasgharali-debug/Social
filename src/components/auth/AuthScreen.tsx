import React, { useState, useMemo } from 'react';
import {
  Zap,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { SocialLogo } from '../common/SocialIcons';
import { BrandLogo } from '../BrandLogo';
import { Platform } from '../../types';

interface AuthScreenProps {
  initialMode?: 'login' | 'signup';
  onSignInEmail: (email: string, password: string) => Promise<void>;
  onSignUpEmail: (params: {
    displayName: string;
    email: string;
    password: string;
    companyName?: string;
  }) => Promise<void>;
  onSignInWithGoogle: () => Promise<void>;
  signingIn: boolean;
  authError: string | null;
  onClearError: () => void;
  onBackToLanding: () => void;
}

const TRUSTED_NETWORKS: Platform[] = [
  'instagram',
  'tiktok',
  'linkedin',
  'x',
  'facebook',
  'youtube',
  'pinterest',
  'threads',
  'bluesky',
  'gbp',
];

export function AuthScreen({
  initialMode = 'login',
  onSignInEmail,
  onSignUpEmail,
  onSignInWithGoogle,
  signingIn,
  authError,
  onClearError,
  onBackToLanding,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Sign In form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up form state
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordStrength = useMemo(() => {
    const pw = signupPassword;
    if (!pw) return { score: 0, label: '', color: 'bg-slate-200 dark:bg-slate-800' };
    let score = 1;
    if (pw.length >= 8) score += 1;
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  }, [signupPassword]);

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setLocalError(null);
    onClearError();
    setShowPassword(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearError();

    if (!loginEmail.trim() || !loginPassword) {
      setLocalError('Please enter both your email address and password.');
      return;
    }
    await onSignInEmail(loginEmail.trim(), loginPassword);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearError();

    if (fullName.trim().length < 2) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail.trim())) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (signupPassword.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter to confirm.');
      return;
    }

    await onSignUpEmail({
      displayName: fullName.trim(),
      email: signupEmail.trim(),
      password: signupPassword,
      companyName: companyName.trim() || undefined,
    });
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col justify-between p-6">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to socialifyai.com
        </button>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-1 rounded-md">
          <Lock size={11} /> Encrypted Auth Session
        </div>
      </div>

      {/* Main Auth Grid */}
      <div className="max-w-5xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Value Panel */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onBackToLanding}
              aria-label="Socialify AI Home"
              className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] rounded-lg"
            >
              <BrandLogo size="lg" surface="auto" />
            </button>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              AI Social Media Suite &amp; Social CRM
            </p>
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              {mode === 'login'
                ? 'Welcome back to your social command center.'
                : 'Start automating 30 days of content in minutes.'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
              {mode === 'login'
                ? 'Sign in with your account credentials to access your brand workspaces, evergreen queues, unified inbox, and analytics.'
                : 'Create your free account to unlock AI Copilot strategy generation, category queues, unified inbox, and cross-channel Social CRM.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {[
              '14-day full-access workspace included',
              'Multi-workspace team & client approvals',
              '10 native social network integrations',
              'Persistent cloud-saved workspaces',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <CheckCircle2 size={15} className="text-[#4F46E5] dark:text-indigo-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Authentic 10-Network Strip */}
          <div className="pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Publish & Engage Across 10 Networks
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {TRUSTED_NETWORKS.map((platform) => (
                <div
                  key={platform}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shadow-xs hover:-translate-y-0.5 transition-transform"
                  title={platform.toUpperCase()}
                >
                  <SocialLogo platform={platform} size={20} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sign In / Sign Up Card */}
        <div className="lg:col-span-6">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-7 sm:p-8 shadow-2xl shadow-slate-900/5 space-y-5">
            {/* Segmented Mode Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`py-2.5 rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`py-2.5 rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>

            <div>
              <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">
                {mode === 'login' ? 'Sign in to socialifyai.com' : 'Create your socialifyai.com account'}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {mode === 'login'
                  ? 'Enter your email and password to open your dashboard.'
                  : 'Fill in your details below — no credit card required.'}
              </p>
            </div>

            {displayError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                <span className="flex-1 leading-relaxed">{displayError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    onClearError();
                  }}
                  className="text-rose-500 hover:text-rose-700 font-bold shrink-0"
                >
                  ×
                </button>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full py-3 px-4 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {signingIn ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Sarah Chen"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Brand / Agency <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Studio"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-9 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {signupPassword && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-3 gap-1">
                        {[1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`h-1 rounded-full ${
                              passwordStrength.score >= step
                                ? passwordStrength.color
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full py-3 px-4 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {signingIn ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Free Account</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
              <span className="px-3 text-[11px] font-medium text-slate-400">or continue with</span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
            </div>

            {/* Google Sign-In Option */}
            <button
              type="button"
              disabled={signingIn}
              onClick={onSignInWithGoogle}
              className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2.5 text-xs font-bold text-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <SocialLogo platform="google_auth" size={18} />
              <span>Continue with Google</span>
            </button>

            <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-bold text-[#4F46E5] dark:text-indigo-400 hover:underline"
                  >
                    Create one free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-[#4F46E5] dark:text-indigo-400 hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Salted password hashing & Firebase-secured cloud workspace sync.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl w-full mx-auto text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} socialifyai.com · All rights reserved.
      </div>
    </div>
  );
}
