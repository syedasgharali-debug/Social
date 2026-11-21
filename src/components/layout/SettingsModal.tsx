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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] dark:bg-[#13161D] rounded-xl border border-[#E5E7EB] dark:border-white/[0.12] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={16} strokeWidth={1.5} className="text-[#6B7280] dark:text-[#9CA3AF]" />
            <h3 className="font-display text-sm font-semibold tracking-[-0.01em] text-[#111827] dark:text-[#F3F4F6]">
              Workspace & Team Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#191D26] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {userProfile && (
            <div className="p-3.5 rounded-lg bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ContactAvatar name={userProfile.displayName} src={userProfile.photoURL} size="md" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6] truncate">{userProfile.displayName}</p>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{userProfile.email} · Verified Firebase Session</p>
                </div>
              </div>
              {onSignOut && (
                <button
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <LogOut size={13} strokeWidth={1.5} /> Sign Out
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1.5">
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
                className="w-full px-3.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block mb-1.5">
                Active Subscription Tier
              </label>
              <select
                value={state.selectedPlan}
                onChange={(e) => {
                  const nextPlan = e.target.value as PlanTier;
                  onUpdateState({ selectedPlan: nextPlan });
                  onToast('Subscription Plan Updated', `Workspace upgraded to ${nextPlan.replace('_', ' ').toUpperCase()}.`);
                }}
                className="w-full px-3.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4] rounded-lg text-xs text-[#111827] dark:text-[#F3F4F6] outline-none transition-colors"
              >
                <option value="bootstrap">Starter ($99/mo · 10 profiles)</option>
                <option value="accelerate">Growth ($199/mo · 25 profiles)</option>
                <option value="pro_agency">Agency Scale ($349/mo · 75 profiles)</option>
                <option value="lifetime">Lifetime Enterprise ($799 one-time · Unlimited)</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-2.5 tabular-nums">
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
                    className={`px-2.5 py-2 rounded-lg border text-[11px] font-medium flex items-center justify-between gap-1.5 transition-colors ${
                      connected
                        ? 'border-[#06B6D4] bg-cyan-500/10 text-[#111827] dark:text-[#F3F4F6]'
                        : 'border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] text-[#6B7280] dark:text-[#9CA3AF] hover:border-[#D1D5DB] dark:hover:border-white/[0.15]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <SocialLogo platform={platform} size={14} />
                      <span className="truncate">{meta.label}</span>
                    </span>
                    {connected && <Check size={12} strokeWidth={1.5} className="text-cyan-600 dark:text-cyan-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-2.5">
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
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      active
                        ? 'border-[#06B6D4] bg-cyan-500/10'
                        : 'border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] hover:border-[#D1D5DB] dark:hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">{role}</span>
                      {active && <ShieldCheck size={14} strokeWidth={1.5} className="text-cyan-600 dark:text-cyan-400" />}
                    </div>
                    <p className="mt-1 text-[11px] text-[#6B7280] dark:text-[#9CA3AF] leading-snug">{ROLE_PERMISSIONS[role]}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportBackup}
                className="px-3.5 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-lg text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] flex items-center gap-1.5 transition-colors"
              >
                <Download size={13} strokeWidth={1.5} /> Export JSON Backup
              </button>
              <button
                onClick={() => {
                  onResetDemo();
                  onClose();
                }}
                className="px-3.5 py-2 border border-rose-500/30 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={13} strokeWidth={1.5} /> Reset Workspace Data
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-lg text-xs font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
