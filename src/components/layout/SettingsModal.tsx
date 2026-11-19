import React from 'react';
import { X, Building2, ShieldCheck, RotateCcw, Download, Check, LogOut } from 'lucide-react';
import { AppState, Platform, TeamRole, PlanTier } from '../../types';
import { ALL_PLATFORMS, PLATFORM_META, SocialLogo, ContactAvatar } from '../common/PlatformMeta';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  userProfile?: { displayName: string; email: string; photoURL?: string };
  onSignOut?: () => void;
  onUpdateState: (updater: Partial<AppState> | ((prev: AppState) => AppState)) => void;
  onResetDemo: () => void;
  onToast: (title: string, description?: string) => void;
}

const ROLE_PERMISSIONS: Record<TeamRole, string> = {
  Owner: 'Full access: manage workspaces, billing plans, approval overrides, and CRM exports.',
  Manager: 'Approve pending posts, pause category queues, manage ad budgets, and edit deals.',
  Publisher: 'Create drafts, schedule approved posts, and triage Unified Inbox threads.',
  Contributor: 'Create drafts and submit posts into Pending Approval for Manager sign-off.',
};

export function SettingsModal({
  isOpen,
  onClose,
  state,
  userProfile,
  onSignOut,
  onUpdateState,
  onResetDemo,
  onToast,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const activeWorkspace = state.workspaces.find((w) => w.id === state.activeWorkspaceId) || state.workspaces[0];

  const togglePlatform = (platform: Platform) => {
    const exists = activeWorkspace.connectedPlatforms.includes(platform);
    const updatedPlatforms = exists
      ? activeWorkspace.connectedPlatforms.filter((p) => p !== platform)
      : [...activeWorkspace.connectedPlatforms, platform];

    onUpdateState({
      workspaces: state.workspaces.map((w) =>
        w.id === activeWorkspace.id ? { ...w, connectedPlatforms: updatedPlatforms } : w
      ),
    });
    const label = PLATFORM_META[platform].label;
    onToast(
      exists ? `${label} Disconnected` : `${label} Connected`,
      `${activeWorkspace.name} now syncs ${updatedPlatforms.length} active channels.`
    );
  };

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `socialifyai-${activeWorkspace.name.toLowerCase().replace(/\s+/g, '-')}-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('JSON Backup Exported', `Downloaded snapshot for ${activeWorkspace.name}.`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 size={18} className="text-[#4F46E5]" />
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Workspace & Team Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {userProfile && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ContactAvatar name={userProfile.displayName} src={userProfile.photoURL} size="md" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{userProfile.displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{userProfile.email} · Verified Firebase Session</p>
                </div>
              </div>
              {onSignOut && (
                <button
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  <LogOut size={13} /> Sign Out
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                Active Workspace Name
              </label>
              <input
                type="text"
                value={activeWorkspace.name}
                onChange={(e) =>
                  onUpdateState({
                    workspaces: state.workspaces.map((w) =>
                      w.id === activeWorkspace.id ? { ...w, name: e.target.value } : w
                    ),
                  })
                }
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                Active Subscription Tier
              </label>
              <select
                value={state.selectedPlan}
                onChange={(e) => {
                  const nextPlan = e.target.value as PlanTier;
                  onUpdateState({ selectedPlan: nextPlan });
                  onToast('Subscription Plan Updated', `Workspace upgraded to ${nextPlan.replace('_', ' ').toUpperCase()}.`);
                }}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
              >
                <option value="bootstrap">Starter ($99/mo · 10 profiles)</option>
                <option value="accelerate">Growth ($199/mo · 25 profiles)</option>
                <option value="pro_agency">Agency Scale ($349/mo · 75 profiles)</option>
                <option value="lifetime">Lifetime Enterprise ($799 one-time · Unlimited)</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Connected Social Channels ({activeWorkspace.connectedPlatforms.length} / {ALL_PLATFORMS.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ALL_PLATFORMS.map((platform) => {
                const connected = activeWorkspace.connectedPlatforms.includes(platform);
                const meta = PLATFORM_META[platform];
                return (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={`px-2.5 py-2 rounded-lg border text-[11px] font-semibold flex items-center justify-between gap-1.5 transition-all ${
                      connected
                        ? 'border-[#4F46E5] bg-indigo-50/70 dark:bg-indigo-950/50 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <SocialLogo platform={platform} size={15} />
                      <span className="truncate">{meta.label}</span>
                    </span>
                    {connected && <Check size={12} className="text-[#4F46E5] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Team Role & Approval Permissions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(['Owner', 'Manager', 'Publisher', 'Contributor'] as TeamRole[]).map((role) => {
                const active = state.activeRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => {
                      onUpdateState({ activeRole: role });
                      onToast('Active Role Updated', `Permissions switched to ${role}.`);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      active
                        ? 'border-[#4F46E5] bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{role}</span>
                      {active && <ShieldCheck size={14} className="text-[#4F46E5]" />}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 leading-snug">{ROLE_PERMISSIONS[role]}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportBackup}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Download size={14} /> Export JSON Backup
              </button>
              <button
                onClick={() => {
                  onResetDemo();
                  onClose();
                }}
                className="px-3.5 py-2 border border-rose-200 dark:border-rose-900 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-1.5"
              >
                <RotateCcw size={14} /> Reset Workspace Data
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
