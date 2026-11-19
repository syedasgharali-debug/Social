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
    followers: '12400',
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
      followers: Number(form.followers) || 1000,
      status: 'connected',
      lastSynced: 'Just now',
    };
    onAddProfile(profile);
    onToast('Social Profile Connected', `${PLATFORM_META[profile.platform].label} (${profile.handle}) linked.`);
    setShowConnectModal(false);
    setForm({ platform: 'instagram', accountName: '', handle: '@', followers: '12400' });
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Share2 size={22} className="text-[#4F46E5]" /> Connected Social Profiles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            OAuth channels and follower sync health scoped to {workspaceName}.
          </p>
        </div>

        <button
          onClick={() => setShowConnectModal(true)}
          className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start"
        >
          <Plus size={14} /> Connect Social Profile
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Connected Channels</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {stats.activeCount} / {wsProfiles.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Reachable Followers</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold text-[#4F46E5] dark:text-indigo-400 tabular-nums">
            {stats.totalFollowers.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Token Health Alerts</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold text-amber-600 tabular-nums">
            {stats.needsReauth} Need Re-auth
          </p>
        </div>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {wsProfiles.map((profile) => {
          const meta = PLATFORM_META[profile.platform];
          return (
            <div
              key={profile.id}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <SocialLogo platform={profile.platform} size={22} />
                  </div>
                  <div className="min-w-0">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${meta.textClass}`}>
                      {meta.label}
                    </span>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                      {profile.accountName}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono truncate">{profile.handle}</p>
                  </div>
                </div>

                {profile.status === 'connected' ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 size={11} /> Connected
                  </span>
                ) : profile.status === 'needs_reauth' ? (
                  <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle size={11} /> Needs Re-auth
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                    Disconnected
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-800 tabular-nums">
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Audience</p>
                  <p className="font-bold text-slate-900 dark:text-white">{profile.followers.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">Last Synced</p>
                  <p className="font-mono text-slate-600 dark:text-slate-300">{profile.lastSynced}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  onClick={() => {
                    onUpdateProfile({
                      ...profile,
                      status: 'connected',
                      lastSynced: 'Just now',
                      followers: profile.followers + 12,
                    });
                    onToast('Token Refreshed & Synced', `${meta.label} (${profile.handle}) is active.`);
                  }}
                  className="px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                >
                  <RefreshCw size={12} /> {profile.status === 'needs_reauth' ? 'Re-authenticate' : 'Sync Now'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const next = profile.status === 'disconnected' ? 'connected' : 'disconnected';
                      onUpdateProfile({ ...profile, status: next });
                      onToast(next === 'connected' ? 'Profile Reconnected' : 'Profile Disconnected');
                    }}
                    className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1"
                  >
                    {profile.status === 'disconnected' ? <Link2 size={12} /> : <Unlink size={12} />}
                    {profile.status === 'disconnected' ? 'Connect' : 'Disconnect'}
                  </button>
                  <button
                    onClick={() => {
                      onDeleteProfile(profile.id);
                      onToast('Profile Removed');
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                    title="Remove profile"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Profile Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setShowConnectModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Connect Social Network Profile
              </h3>
              <button onClick={() => setShowConnectModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConnectSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Network</label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                >
                  {ALL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>{PLATFORM_META[p].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Account Display Name</label>
                <input
                  required
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  placeholder="e.g. DigiXy Official"
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Handle / Page Slug</label>
                  <input
                    value={form.handle}
                    onChange={(e) => setForm({ ...form, handle: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Current Followers</label>
                  <input
                    type="number"
                    min="0"
                    value={form.followers}
                    onChange={(e) => setForm({ ...form, followers: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-2 bg-[#4F46E5] text-white rounded-lg font-semibold">
                  Authorize & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
