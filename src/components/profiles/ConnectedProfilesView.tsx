import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Share2,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Unlink,
  Trash2,
  X,
  ExternalLink,
  KeyRound,
  Copy,
  Check,
  Activity,
  Loader2,
} from 'lucide-react';
import { ConnectedProfile, Platform } from '../../types';
import { ALL_PLATFORMS, PLATFORM_META, SocialLogo } from '../common/PlatformMeta';
import { KpiMetricCard, StatusBadge, EmptyStatePanel } from '../common/DesignPrimitives';
import { aiService, SocialProviderStatus } from '../../services/aiService';

interface ConnectedProfilesViewProps {
  workspaceId: string;
  workspaceName: string;
  profiles: ConnectedProfile[];
  onAddProfile: (profile: ConnectedProfile) => void;
  onUpdateProfile: (profile: ConnectedProfile) => void;
  onDeleteProfile: (id: string) => void;
  onToast: (title: string, description?: string, variant?: 'success' | 'info' | 'warning') => void;
}

interface MissingKeyChecklist {
  platform: Platform;
  error: string;
  missingEnvVars: string[];
  redirectUri?: string;
  setupSteps: string[];
}

export function ConnectedProfilesView({
  workspaceId,
  workspaceName,
  profiles,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  onToast,
}: ConnectedProfilesViewProps) {
  const wsProfiles = useMemo(
    () => profiles.filter((p) => p.workspaceId === workspaceId),
    [profiles, workspaceId]
  );

  const [providers, setProviders] = useState<SocialProviderStatus[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('bluesky');
  const [connecting, setConnecting] = useState(false);
  const [missingKeyInfo, setMissingKeyInfo] = useState<MissingKeyChecklist | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  // Bluesky live AT Protocol credentials (sent over HTTPS, never stored in Firestore)
  const [bskyHandle, setBskyHandle] = useState('');
  const [bskyAppPassword, setBskyAppPassword] = useState('');

  // Per-card async loading & live test diagnostics
  const [busyCardId, setBusyCardId] = useState<string | null>(null);
  const [cardDiagnostics, setCardDiagnostics] = useState<Record<string, { latencyMs: number; detail: string; ok: boolean }>>({});

  useEffect(() => {
    let active = true;
    aiService
      .getSocialProviders()
      .then((res) => {
        if (active && Array.isArray(res.providers)) setProviders(res.providers);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Listen for real OAuth 2.0 popup postMessage callbacks from /api/social/oauth/:platform/callback
  const handleOAuthMessage = useCallback(
    (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data as {
        type?: string;
        ok?: boolean;
        error?: string;
        connection?: {
          connectionId: string;
          platform: Platform;
          workspaceId?: string;
          handle: string;
          displayName: string;
          followers: number;
          externalAccountId?: string;
          scopes?: string[];
          connectedAt?: string;
          lastVerifiedAt?: string;
        };
      };
      if (!msg || msg.type !== 'SOCIAL_OAUTH_RESULT') return;

      if (!msg.ok || !msg.connection) {
        onToast('OAuth Authorization Failed', msg.error || 'Provider rejected authorization.', 'warning');
        return;
      }

      const c = msg.connection;
      const newProfile: ConnectedProfile = {
        id: `prof-${Date.now()}`,
        workspaceId: c.workspaceId || workspaceId,
        platform: c.platform,
        accountName: c.displayName || c.handle,
        displayName: c.displayName || c.handle,
        handle: c.handle,
        followers: c.followers || 0,
        status: 'connected',
        lastSynced: 'Just now',
        authType: 'oauth2',
        connectionId: c.connectionId,
        externalAccountId: c.externalAccountId,
        scopes: c.scopes,
        connectedAt: c.connectedAt || new Date().toISOString(),
        lastVerifiedAt: c.lastVerifiedAt || new Date().toISOString(),
      };
      onAddProfile(newProfile);
      setShowConnectModal(false);
      onToast(
        `${PLATFORM_META[c.platform].label} Connected`,
        `${newProfile.handle} authorized via OAuth 2.0.`,
        'success'
      );
    },
    [workspaceId, onAddProfile, onToast]
  );

  useEffect(() => {
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [handleOAuthMessage]);

  const stats = useMemo(() => {
    const active = wsProfiles.filter((p) => p.status === 'connected');
    const needsReauth = wsProfiles.filter((p) => p.status === 'needs_reauth').length;
    const totalFollowers = active.reduce((s, p) => s + p.followers, 0);
    return { activeCount: active.length, needsReauth, totalFollowers };
  }, [wsProfiles]);

  const providerMap = useMemo(() => {
    const map: Partial<Record<Platform, SocialProviderStatus>> = {};
    for (const p of providers) map[p.platform] = p;
    return map;
  }, [providers]);

  const handleStartOAuth = async (platform: Platform) => {
    setConnecting(true);
    setMissingKeyInfo(null);
    try {
      const resp = await aiService.getSocialOAuthUrl(platform, workspaceId);
      if (resp.ok && resp.authUrl) {
        const popup = window.open(
          resp.authUrl,
          `socialify_oauth_${platform}`,
          'width=600,height=720,noopener=no'
        );
        if (!popup) {
          onToast('Popup Blocked', 'Allow browser popups to complete OAuth 2.0 sign-in.', 'warning');
        } else {
          onToast('OAuth Window Opened', `Complete authorization in the ${PLATFORM_META[platform].label} popup.`, 'info');
        }
      } else {
        setMissingKeyInfo({
          platform,
          error: resp.error || `Missing API Key for ${PLATFORM_META[platform].label}`,
          missingEnvVars: resp.missingEnvVars || [],
          redirectUri: resp.redirectUri,
          setupSteps: resp.setupSteps || [],
        });
      }
    } catch (err) {
      onToast(
        'OAuth Initialization Error',
        err instanceof Error ? err.message : 'Unable to start OAuth flow.',
        'warning'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleBlueskyConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bskyHandle.trim() || !bskyAppPassword.trim()) return;
    setConnecting(true);
    try {
      const res = await aiService.connectBluesky({
        handle: bskyHandle.trim(),
        appPassword: bskyAppPassword.trim(),
        workspaceId,
      });
      const c = res.connection;
      const profile: ConnectedProfile = {
        id: `prof-${Date.now()}`,
        workspaceId,
        platform: 'bluesky',
        accountName: c.displayName || c.handle,
        displayName: c.displayName || c.handle,
        handle: c.handle,
        followers: c.followers,
        status: 'connected',
        lastSynced: 'Just now',
        authType: 'atproto',
        connectionId: c.connectionId,
        externalAccountId: c.externalAccountId,
        scopes: c.scopes,
        connectedAt: c.connectedAt,
        lastVerifiedAt: c.lastVerifiedAt,
      };
      onAddProfile(profile);
      setBskyHandle('');
      setBskyAppPassword('');
      setShowConnectModal(false);
      onToast(
        'Bluesky Connected Live',
        `Authenticated ${profile.handle} (${profile.followers.toLocaleString()} followers).`,
        'success'
      );
    } catch (err) {
      onToast(
        'Bluesky Authentication Failed',
        err instanceof Error ? err.message : 'Check your Bluesky handle and App Password.',
        'warning'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleTestConnection = async (profile: ConnectedProfile) => {
    setBusyCardId(profile.id);
    try {
      const result = await aiService.testSocialConnection({
        connectionId: profile.connectionId || profile.id,
        platform: profile.platform,
        handle: profile.handle,
      });
      setCardDiagnostics((prev) => ({
        ...prev,
        [profile.id]: { latencyMs: result.latencyMs, detail: result.detail, ok: result.ok },
      }));
      onUpdateProfile({
        ...profile,
        status: result.ok ? 'connected' : 'needs_reauth',
        followers: typeof result.followers === 'number' ? result.followers : profile.followers,
        lastSynced: 'Just now',
        lastVerifiedAt: result.verifiedAt,
      });
      onToast(
        result.ok ? 'Connection Verified' : 'Re-authentication Needed',
        `${PLATFORM_META[profile.platform].label}: ${result.detail} (${result.latencyMs}ms)`,
        result.ok ? 'success' : 'warning'
      );
    } catch (err) {
      setCardDiagnostics((prev) => ({
        ...prev,
        [profile.id]: {
          latencyMs: 0,
          detail: err instanceof Error ? err.message : 'Connection test failed',
          ok: false,
        },
      }));
      onToast(
        'Connection Test Failed',
        err instanceof Error ? err.message : 'Could not verify token with provider.',
        'warning'
      );
    } finally {
      setBusyCardId(null);
    }
  };

  const handleRefreshToken = async (profile: ConnectedProfile) => {
    setBusyCardId(profile.id);
    try {
      const result = await aiService.refreshSocialConnection({
        connectionId: profile.connectionId || profile.id,
        platform: profile.platform,
      });
      onUpdateProfile({
        ...profile,
        status: 'connected',
        lastSynced: 'Just now',
        lastVerifiedAt: result.refreshedAt,
      });
      onToast('Token Refreshed', result.detail, 'success');
    } catch (err) {
      onUpdateProfile({ ...profile, status: 'needs_reauth' });
      onToast(
        'Token Refresh Failed',
        err instanceof Error ? err.message : 'Re-connect this account to obtain a fresh OAuth token.',
        'warning'
      );
    } finally {
      setBusyCardId(null);
    }
  };

  const handleDisconnect = async (profile: ConnectedProfile) => {
    setBusyCardId(profile.id);
    try {
      await aiService.disconnectSocialConnection(profile.connectionId || profile.id).catch(() => {});
      onUpdateProfile({ ...profile, status: 'disconnected' });
      onToast('Profile Disconnected', `${PLATFORM_META[profile.platform].label} (${profile.handle}) token revoked.`, 'info');
    } finally {
      setBusyCardId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-[#090A0D] custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-5">
          <div>
            <p className="text-[11px] font-medium text-[#06B6D4] uppercase tracking-[0.04em]">
              OAuth 2.0 &amp; AT Protocol Channel Connections
            </p>
            <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] mt-1">
              Connected Social Profiles
            </h1>
            <p className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">
              Real OAuth 2.0 &amp; Bluesky AT Protocol connections scoped to {workspaceName}.
            </p>
          </div>

          <button
            onClick={() => {
              setMissingKeyInfo(null);
              setShowConnectModal(true);
            }}
            className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 self-start transition-colors"
          >
            <Plus size={14} strokeWidth={1.5} /> Connect Social Profile
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiMetricCard
            label="Connected Channels"
            value={`${stats.activeCount} / ${wsProfiles.length}`}
            sub="Verified OAuth / AT Protocol tokens"
          />
          <KpiMetricCard
            label="Total Reachable Followers"
            value={stats.totalFollowers.toLocaleString()}
            sub="Synced from connected accounts"
          />
          <KpiMetricCard
            label="Token Health Alerts"
            value={`${stats.needsReauth} Need Re-auth`}
            sub={stats.needsReauth > 0 ? 'Refresh or re-authorize below' : 'All connected tokens healthy'}
            alert={stats.needsReauth > 0}
          />
        </div>

        {/* Profiles Grid */}
        {wsProfiles.length === 0 ? (
          <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px]">
            <EmptyStatePanel
              icon={Share2}
              title="No social profiles connected yet"
              description="Connect a Bluesky account live via App Password or authorize YouTube, Meta, X, LinkedIn, TikTok, Pinterest, Threads, or Google Business Profile via OAuth 2.0."
              actionLabel="Connect First Profile"
              onAction={() => {
                setMissingKeyInfo(null);
                setShowConnectModal(true);
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {wsProfiles.map((profile) => {
              const meta = PLATFORM_META[profile.platform];
              const isBusy = busyCardId === profile.id;
              const diag = cardDiagnostics[profile.id];
              return (
                <div
                  key={profile.id}
                  className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[12px] p-5 flex flex-col justify-between gap-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-[10px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                        <SocialLogo platform={profile.platform} size={20} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-mono uppercase tracking-[0.04em] text-[#6B7280] dark:text-[#9CA3AF]">
                          {meta.label} · {profile.authType === 'atproto' ? 'AT Proto' : 'OAuth 2.0'}
                        </span>
                        <h3 className="text-[15px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em] mt-0.5 truncate">
                          {profile.accountName}
                        </h3>
                        <p className="text-[12px] text-[#6B7280] font-mono truncate">{profile.handle}</p>
                      </div>
                    </div>

                    {profile.status === 'connected' ? (
                      <StatusBadge tone="emerald">
                        <CheckCircle2 size={11} strokeWidth={1.5} className="mr-1" /> Connected
                      </StatusBadge>
                    ) : profile.status === 'needs_reauth' ? (
                      <StatusBadge tone="orange">
                        <AlertTriangle size={11} strokeWidth={1.5} className="mr-1" /> Needs Re-auth
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">Disconnected</StatusBadge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[12px] pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] tabular-nums">
                    <div>
                      <p className="text-[10px] uppercase text-[#6B7280] font-medium tracking-[0.04em]">Audience</p>
                      <p className="font-mono font-semibold text-[#111827] dark:text-[#F3F4F6] mt-0.5">
                        {profile.followers.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-[#6B7280] font-medium tracking-[0.04em]">Last Verified</p>
                      <p className="font-mono text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">{profile.lastSynced}</p>
                    </div>
                  </div>

                  {diag && (
                    <div
                      className={`px-3 py-2 rounded-[8px] text-[11px] border ${
                        diag.ok
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : 'bg-orange-500/5 border-orange-500/25 text-orange-700 dark:text-orange-300'
                      }`}
                    >
                      <span className="font-mono">{diag.latencyMs > 0 ? `${diag.latencyMs}ms · ` : ''}</span>
                      {diag.detail}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={isBusy}
                        onClick={() => handleTestConnection(profile)}
                        className="px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] rounded-[8px] text-[11px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} strokeWidth={1.5} />}
                        Test
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => handleRefreshToken(profile)}
                        className="px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] rounded-[8px] text-[11px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={12} strokeWidth={1.5} /> Refresh
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {profile.status !== 'disconnected' && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleDisconnect(profile)}
                          className="px-2.5 py-1.5 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-orange-500/40 rounded-[8px] text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF] flex items-center gap-1 transition-colors"
                        >
                          <Unlink size={12} strokeWidth={1.5} /> Disconnect
                        </button>
                      )}
                      <button
                        onClick={() => {
                          aiService.disconnectSocialConnection(profile.connectionId || profile.id).catch(() => {});
                          onDeleteProfile(profile.id);
                          onToast('Profile Removed', `${meta.label} (${profile.handle}) deleted.`);
                        }}
                        className="p-1.5 text-[#6B7280] hover:text-rose-500 rounded-md transition-colors"
                        title="Remove profile"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Connect Profile Modal (Real OAuth 2.0 + Bluesky AT Protocol + Missing API Key Setup Checklist) */}
      {showConnectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 dark:bg-black/65" onClick={() => setShowConnectModal(false)} />
          <div className="relative w-full max-w-lg bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.1] rounded-[12px] p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                Connect Social Channel to {workspaceName}
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] rounded-md"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Network Selector Grid */}
            <div className="mt-4">
              <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider block mb-2">
                Select Network
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_PLATFORMS.map((p) => {
                  const status = providerMap[p];
                  const active = selectedPlatform === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setSelectedPlatform(p);
                        setMissingKeyInfo(null);
                      }}
                      className={`p-2.5 rounded-[8px] border text-left flex items-center justify-between gap-2 transition-colors ${
                        active
                          ? 'border-[#06B6D4] bg-cyan-500/10'
                          : 'border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] hover:border-[#D1D5DB] dark:hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SocialLogo platform={p} size={16} />
                        <span className="text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] truncate">
                          {PLATFORM_META[p].label}
                        </span>
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          status?.configured || p === 'bluesky' ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                        title={status?.configured || p === 'bluesky' ? 'Ready to connect' : 'OAuth keys required'}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bluesky Live AT Protocol Form */}
            {selectedPlatform === 'bluesky' ? (
              <form onSubmit={handleBlueskyConnect} className="mt-4 space-y-3.5 text-[12px] pt-4 border-t border-[#E5E7EB] dark:border-white/[0.08]">
                <div className="p-3 rounded-[8px] bg-cyan-500/5 border border-cyan-500/20 text-[#4B5563] dark:text-[#9CA3AF]">
                  <p className="font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5">
                    <KeyRound size={13} className="text-[#06B6D4]" /> Live Bluesky AT Protocol Sign-In
                  </p>
                  <p className="mt-1 text-[11px]">
                    Authenticates directly against <span className="font-mono">bsky.social</span>. Generate an App Password in Bluesky Settings → Privacy &amp; Security → App Passwords.
                  </p>
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Bluesky Handle</label>
                  <input
                    required
                    value={bskyHandle}
                    onChange={(e) => setBskyHandle(e.target.value)}
                    placeholder="yourbrand.bsky.social"
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">App Password</label>
                  <input
                    required
                    type="password"
                    value={bskyAppPassword}
                    onChange={(e) => setBskyAppPassword(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-medium text-[#4B5563] dark:text-[#9CA3AF]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={connecting}
                    className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] disabled:opacity-50 text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium flex items-center justify-center gap-1.5"
                  >
                    {connecting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {connecting ? 'Authenticating...' : 'Authenticate Bluesky'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 pt-4 border-t border-[#E5E7EB] dark:border-white/[0.08] space-y-3.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SocialLogo platform={selectedPlatform} size={18} />
                    <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      {PLATFORM_META[selectedPlatform].label} OAuth 2.0
                    </span>
                  </div>
                  <StatusBadge tone={providerMap[selectedPlatform]?.configured ? 'emerald' : 'orange'}>
                    {providerMap[selectedPlatform]?.configured ? 'Credentials Configured' : 'API Key Required'}
                  </StatusBadge>
                </div>

                {missingKeyInfo && missingKeyInfo.platform === selectedPlatform && (
                  <div className="p-3.5 rounded-[10px] border border-orange-500/30 bg-orange-500/10 space-y-2.5">
                    <p className="font-semibold text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-[#F97316]" />
                      {missingKeyInfo.error}
                    </p>
                    {missingKeyInfo.missingEnvVars.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {missingKeyInfo.missingEnvVars.map((envName) => (
                          <span
                            key={envName}
                            className="px-2 py-0.5 rounded bg-[#FFFFFF] dark:bg-[#0E1015] border border-orange-500/30 font-mono text-[11px] text-[#F97316]"
                          >
                            {envName}
                          </span>
                        ))}
                      </div>
                    )}
                    {missingKeyInfo.redirectUri && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                          Authorized OAuth Redirect URI:
                        </p>
                        <div className="flex items-center gap-1.5">
                          <code className="flex-1 px-2.5 py-1.5 rounded bg-[#FFFFFF] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] font-mono text-[10px] text-[#111827] dark:text-[#F3F4F6] truncate">
                            {missingKeyInfo.redirectUri}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(missingKeyInfo.redirectUri || '');
                              setCopiedUri(true);
                              setTimeout(() => setCopiedUri(false), 1800);
                            }}
                            className="px-2 py-1.5 rounded border border-[#E5E7EB] dark:border-white/[0.1] bg-[#FFFFFF] dark:bg-[#13161D] text-[#111827] dark:text-[#F3F4F6]"
                          >
                            {copiedUri ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    )}
                    {missingKeyInfo.setupSteps.length > 0 && (
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                        {missingKeyInfo.setupSteps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-medium text-[#4B5563] dark:text-[#9CA3AF]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={connecting}
                    onClick={() => handleStartOAuth(selectedPlatform)}
                    className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] disabled:opacity-50 text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium flex items-center justify-center gap-1.5"
                  >
                    {connecting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ExternalLink size={14} strokeWidth={1.5} />
                    )}
                    {connecting ? 'Checking Provider...' : `Authorize ${PLATFORM_META[selectedPlatform].label}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
