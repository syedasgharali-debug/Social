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
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#090A0D] flex flex-col justify-between p-6">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} /> Back to socialifyai.com
        </button>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
          <Lock size={11} strokeWidth={1.5} /> Encrypted Auth Session
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
              className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4] rounded-lg"
            >
              <BrandLogo size="lg" surface="auto" />
            </button>
            <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
              AI Social Media Suite &amp; Social CRM
            </p>
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6] leading-tight">
              {mode === 'login'
                ? 'Welcome back to your social command center.'
                : 'Start automating 30 days of content in minutes.'}
            </h1>
            <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed max-w-lg">
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
                className="flex items-center gap-2 text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF]"
              >
                <CheckCircle2 size={14} strokeWidth={1.5} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Authentic 10-Network Strip */}
          <div className="pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-3">
              Publish &amp; Engage Across 10 Networks
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {TRUSTED_NETWORKS.map((platform) => (
                <div
                  key={platform}
                  className="w-9 h-9 rounded-lg bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-center"
                  title={platform.toUpperCase()}
                >
                  <SocialLogo platform={platform} size={18} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sign In / Sign Up Card */}
        <div className="lg:col-span-6">
          <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-xl p-6 sm:p-8 space-y-5">
            {/* Segmented Mode Tabs */}
            <div className="grid grid-cols-2 p-1 bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`py-2 rounded-md transition-colors ${
                  mode === 'login'
                    ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.12]'
                    : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`py-2 rounded-md transition-colors ${
                  mode === 'signup'
                    ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.12]'
                    : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
                }`}
              >
                Create Account
              </button>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">
                {mode === 'login' ? 'Sign in to socialifyai.com' : 'Create your socialifyai.com account'}
              </h2>
              <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                {mode === 'login'
                  ? 'Enter your email and password to open your dashboard.'
                  : 'Fill in your details below — no credit card required.'}
              </p>
            </div>

            {displayError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
                <AlertCircle size={15} strokeWidth={1.5} className="shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{displayError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    onClearError();
                  }}
                  className="hover:opacity-80 font-semibold shrink-0"
                >
                  ×
                </button>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={14} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-sm text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={14} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-sm text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
                    >
                      {showPassword ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full py-2.5 px-4 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signingIn ? (
                    <>
                      <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={14} strokeWidth={1.5} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                      <input
                        type="text"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Sarah Chen"
                        className="w-full pl-9 pr-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                      Brand / Agency <span className="normal-case font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Building2 size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Studio"
                        className="w-full pl-9 pr-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-9 pr-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-9 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
                    >
                      {showPassword ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
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
                                : 'bg-[#E5E7EB] dark:bg-white/[0.08]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full py-2.5 px-4 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signingIn ? (
                    <>
                      <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Free Account</span>
                      <ArrowRight size={14} strokeWidth={1.5} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-[#E5E7EB] dark:border-white/[0.08]" />
              <span className="px-3 text-[11px] font-medium text-[#6B7280] dark:text-[#9CA3AF]">or continue with</span>
              <div className="flex-1 border-t border-[#E5E7EB] dark:border-white/[0.08]" />
            </div>

            {/* Google Sign-In Option */}
            <button
              type="button"
              disabled={signingIn}
              onClick={onSignInWithGoogle}
              className="w-full py-2.5 px-4 bg-[#F8F9FB] dark:bg-[#0E1015] hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-lg transition-colors flex items-center justify-center gap-2.5 text-xs font-medium text-[#111827] dark:text-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SocialLogo platform="google_auth" size={16} />
              <span>Continue with Google</span>
            </button>

            <div className="pt-2 text-center text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
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
                    className="font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] flex items-center gap-2 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
              <ShieldCheck size={14} strokeWidth={1.5} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Salted password hashing &amp; Firebase-secured cloud workspace sync.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl w-full mx-auto text-center text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
        © {new Date().getFullYear()} socialifyai.com · All rights reserved.
      </div>
    </div>
  );
}
