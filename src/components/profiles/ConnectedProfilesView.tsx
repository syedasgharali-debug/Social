import React, { useState, useMemo } from 'react';
import {
  Share2,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Unlink,
  Link2,
  Trash2,
  X,
} from 'lucide-react';
import { ConnectedProfile, Platform } from '../../types';
import { ALL_PLATFORMS, PLATFORM_META, SocialLogo } from '../common/PlatformMeta';
import { KpiMetricCard, StatusBadge, EmptyStatePanel } from '../common/DesignPrimitives';

interface ConnectedProfilesViewProps {
  workspaceId: string;
  workspaceName: string;
  profiles: ConnectedProfile[];
  onAddProfile: (profile: ConnectedProfile) => void;
  onUpdateProfile: (profile: ConnectedProfile) => void;
  onDeleteProfile: (id: string) => void;
  onToast: (title: string, description?: string) => void;
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

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [form, setForm] = useState({
    platform: 'instagram' as Platform,
    accountName: '',
    handle: '@',
    followers: '0',
  });

  const stats = useMemo(() => {
    const active = wsProfiles.filter((p) => p.status === 'connected');
    const needsReauth = wsProfiles.filter((p) => p.status === 'needs_reauth').length;
    const totalFollowers = active.reduce((s, p) => s + p.followers, 0);
    return { activeCount: active.length, needsReauth, totalFollowers };
  }, [wsProfiles]);

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountName.trim()) return;
    const profile: ConnectedProfile = {
      id: `prof-${Date.now()}`,
      workspaceId,
      platform: form.platform,
      accountName: form.accountName.trim(),
      handle: form.handle.trim() || `@${form.accountName.trim().toLowerCase().replace(/\s+/g, '')}`,
      followers: Math.max(0, Number(form.followers) || 0),
      status: 'connected',
      lastSynced: 'Just now',
    };
    onAddProfile(profile);
    onToast('Social Profile Connected', `${PLATFORM_META[profile.platform].label} (${profile.handle}) linked.`);
    setShowConnectModal(false);
    setForm({ platform: 'instagram', accountName: '', handle: '@', followers: '0' });
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-[#090A0D] custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-5">
          <div>
            <p className="text-[11px] font-medium text-[#06B6D4] uppercase tracking-[0.04em]">
              OAuth Connections &amp; Channel Sync
            </p>
            <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] mt-1">
              Connected Social Profiles
            </h1>
            <p className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">
              OAuth channels and follower sync health scoped to {workspaceName}.
            </p>
          </div>

          <button
            onClick={() => setShowConnectModal(true)}
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
            sub="Active OAuth tokens"
          />
          <KpiMetricCard
            label="Total Reachable Followers"
            value={stats.totalFollowers.toLocaleString()}
            sub="Aggregated across connected profiles"
          />
          <KpiMetricCard
            label="Token Health Alerts"
            value={`${stats.needsReauth} Need Re-auth`}
            sub={stats.needsReauth > 0 ? 'Refresh expired tokens below' : 'All tokens healthy'}
            alert={stats.needsReauth > 0}
          />
        </div>

        {/* Profiles Grid */}
        {wsProfiles.length === 0 ? (
          <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px]">
            <EmptyStatePanel
              icon={Share2}
              title="No social profiles connected yet"
              description="Connect your brand's social accounts to publish posts, sync inbox messages, and track live audience totals."
              actionLabel="Connect First Profile"
              onAction={() => setShowConnectModal(true)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {wsProfiles.map((profile) => {
              const meta = PLATFORM_META[profile.platform];
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
                          {meta.label}
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
                      <p className="text-[10px] uppercase text-[#6B7280] font-medium tracking-[0.04em]">Last Synced</p>
                      <p className="font-mono text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">{profile.lastSynced}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => {
                        onUpdateProfile({
                          ...profile,
                          status: 'connected',
                          lastSynced: 'Just now',
                        });
                        onToast('Token Refreshed & Synced', `${meta.label} (${profile.handle}) is active.`);
                      }}
                      className="px-3 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] rounded-[8px] text-[11px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw size={12} strokeWidth={1.5} /> {profile.status === 'needs_reauth' ? 'Re-authenticate' : 'Sync Now'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const next = profile.status === 'disconnected' ? 'connected' : 'disconnected';
                          onUpdateProfile({ ...profile, status: next });
                          onToast(next === 'connected' ? 'Profile Reconnected' : 'Profile Disconnected');
                        }}
                        className="px-2.5 py-1.5 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] flex items-center gap-1 transition-colors"
                      >
                        {profile.status === 'disconnected' ? <Link2 size={12} strokeWidth={1.5} /> : <Unlink size={12} strokeWidth={1.5} />}
                        {profile.status === 'disconnected' ? 'Connect' : 'Disconnect'}
                      </button>
                      <button
                        onClick={() => {
                          onDeleteProfile(profile.id);
                          onToast('Profile Removed');
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

      {/* Connect Profile Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setShowConnectModal(false)} />
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                Connect Social Network Profile
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] rounded-md"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleConnectSubmit} className="mt-4 space-y-3.5 text-[12px]">
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Network</label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                >
                  {ALL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>{PLATFORM_META[p].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Account Display Name</label>
                <input
                  required
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  placeholder="e.g. DigiXy Official"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Handle / Page Slug</label>
                  <input
                    value={form.handle}
                    onChange={(e) => setForm({ ...form, handle: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Current Followers</label>
                  <input
                    type="number"
                    min="0"
                    value={form.followers}
                    onChange={(e) => setForm({ ...form, followers: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] font-medium text-[#4B5563] dark:text-[#9CA3AF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium transition-colors"
                >
                  Authorize &amp; Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
