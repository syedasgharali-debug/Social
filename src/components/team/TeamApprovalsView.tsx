import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  MessageSquareWarning,
  XCircle,
  Edit3,
  UserPlus,
  Users,
  Trash2,
  X,
  History,
  Lock,
} from 'lucide-react';
import {
  SocialPost,
  TeamMember,
  ContentCategory,
  TeamRole,
  TeamMemberPermissions,
  ApprovalAuditEntry,
} from '../../types';
import { PlatformTag, ContactAvatar } from '../common/PlatformMeta';
import { StatusBadge, EmptyStatePanel } from '../common/DesignPrimitives';

interface TeamApprovalsViewProps {
  workspaceId: string;
  workspaceName: string;
  posts: SocialPost[];
  teamMembers: TeamMember[];
  categories: ContentCategory[];
  approvalAuditLogs: ApprovalAuditEntry[];
  activeRole: TeamRole;
  actorName?: string;
  onUpdatePost: (post: SocialPost) => void;
  onLogApprovalAudit: (entry: ApprovalAuditEntry) => void;
  onEditInStudio: (post: SocialPost) => void;
  onAddTeamMember: (member: TeamMember) => void;
  onUpdateTeamMember: (member: TeamMember) => void;
  onRemoveTeamMember: (id: string) => void;
  onToast: (title: string, description?: string, variant?: 'success' | 'info' | 'warning') => void;
}

const CANONICAL_ROLES: TeamRole[] = ['Owner', 'Admin', 'Editor', 'Client Approver'];

function defaultPermissionsForRole(role: TeamRole): TeamMemberPermissions {
  switch (role) {
    case 'Owner':
    case 'Admin':
    case 'Manager':
      return { canPublish: true, canApprove: true, canManageTeam: true, canConnectProfiles: true };
    case 'Client Approver':
      return { canPublish: false, canApprove: true, canManageTeam: false, canConnectProfiles: false };
    case 'Publisher':
      return { canPublish: true, canApprove: false, canManageTeam: false, canConnectProfiles: false };
    case 'Editor':
    case 'Contributor':
    default:
      return { canPublish: false, canApprove: false, canManageTeam: false, canConnectProfiles: false };
  }
}

export function TeamApprovalsView({
  workspaceId,
  workspaceName,
  posts,
  teamMembers,
  categories,
  approvalAuditLogs,
  activeRole,
  actorName = 'Workspace Reviewer',
  onUpdatePost,
  onLogApprovalAudit,
  onEditInStudio,
  onAddTeamMember,
  onUpdateTeamMember,
  onRemoveTeamMember,
  onToast,
}: TeamApprovalsViewProps) {
  const wsPosts = useMemo(
    () => posts.filter((p) => p.workspaceId === workspaceId),
    [posts, workspaceId]
  );
  const pendingPosts = useMemo(
    () => wsPosts.filter((p) => p.status === 'pending_approval'),
    [wsPosts]
  );
  const wsMembers = useMemo(
    () => teamMembers.filter((m) => m.workspaceId === workspaceId),
    [teamMembers, workspaceId]
  );
  const wsCategories = useMemo(
    () => categories.filter((c) => c.workspaceId === workspaceId),
    [categories, workspaceId]
  );
  const wsAuditLogs = useMemo(
    () => approvalAuditLogs.filter((l) => l.workspaceId === workspaceId),
    [approvalAuditLogs, workspaceId]
  );

  const canApprovePosts =
    activeRole === 'Owner' ||
    activeRole === 'Admin' ||
    activeRole === 'Client Approver' ||
    activeRole === 'Manager';
  const canManageTeam = activeRole === 'Owner' || activeRole === 'Admin' || activeRole === 'Manager';

  const [feedbackTargetId, setFeedbackTargetId] = useState<string | null>(null);
  const [feedbackMode, setFeedbackMode] = useState<'changes' | 'reject'>('changes');
  const [feedbackNote, setFeedbackNote] = useState('');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'Editor' as TeamRole,
  });

  const handleApprovePost = (post: SocialPost) => {
    if (!canApprovePosts) {
      onToast(
        'Approval Permission Required',
        `Your active role (${activeRole}) cannot sign off posts. Switch to Owner, Admin, or Client Approver.`,
        'warning'
      );
      return;
    }
    onUpdatePost({
      ...post,
      status: 'scheduled',
      approvalNote: undefined,
    });
    onLogApprovalAudit({
      id: `apv-${Date.now()}`,
      workspaceId,
      postId: post.id,
      postSnippet: post.content.slice(0, 90),
      action: 'approved',
      actorName,
      actorRole: activeRole,
      createdAt: new Date().toISOString(),
    });
    onToast('Post Approved & Scheduled', 'Signed off and moved into the publishing queue.', 'success');
  };

  const handleSubmitDecision = (post: SocialPost) => {
    if (!canApprovePosts) {
      onToast('Approval Permission Required', 'Only Owner, Admin, or Client Approver can review posts.', 'warning');
      return;
    }
    const cleanNote =
      feedbackNote.trim() ||
      (feedbackMode === 'reject'
        ? 'Rejected during governance review.'
        : 'Please tighten the opening hook and verify CTA before re-submitting.');

    onUpdatePost({
      ...post,
      status: feedbackMode === 'reject' ? 'rejected' : 'draft',
      approvalNote: cleanNote,
    });
    onLogApprovalAudit({
      id: `apv-${Date.now()}`,
      workspaceId,
      postId: post.id,
      postSnippet: post.content.slice(0, 90),
      action: feedbackMode === 'reject' ? 'rejected' : 'changes_requested',
      actorName,
      actorRole: activeRole,
      note: cleanNote,
      createdAt: new Date().toISOString(),
    });
    setFeedbackTargetId(null);
    setFeedbackNote('');
    onToast(
      feedbackMode === 'reject' ? 'Post Rejected' : 'Changes Requested',
      feedbackMode === 'reject'
        ? 'Marked rejected and recorded in the approval audit trail.'
        : 'Returned to Drafts with your review comment.',
      feedbackMode === 'reject' ? 'warning' : 'info'
    );
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;
    if (wsMembers.some((m) => m.email.toLowerCase() === inviteForm.email.trim().toLowerCase())) {
      onToast('Already Invited', 'A team member with this email already exists in this workspace.', 'warning');
      return;
    }
    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      workspaceId,
      name: inviteForm.name.trim(),
      email: inviteForm.email.trim().toLowerCase(),
      role: inviteForm.role,
      avatar: '',
      status: 'invited',
      permissions: defaultPermissionsForRole(inviteForm.role),
    };
    onAddTeamMember(newMember);
    onToast('Invitation Saved', `${newMember.name} invited as ${newMember.role}.`, 'success');
    setShowInviteModal(false);
    setInviteForm({ name: '', email: '', role: 'Editor' });
  };

  const handleTogglePermission = (member: TeamMember, key: keyof TeamMemberPermissions) => {
    const current = member.permissions || defaultPermissionsForRole(member.role);
    const updated: TeamMember = {
      ...member,
      permissions: { ...current, [key]: !current[key] },
    };
    onUpdateTeamMember(updated);
    onToast('Permissions Updated', `${member.name} permissions saved.`, 'info');
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-[#090A0D] custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-5">
          <div>
            <p className="text-[11px] font-medium text-[#06B6D4] uppercase tracking-[0.04em]">
              Governance &amp; Role-Based Permissions · Active Role: {activeRole}
            </p>
            <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] mt-1">
              Team &amp; Client Approvals
            </h1>
            <p className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">
              Enforce publishing approval gates, manage workspace roles, and track every sign-off in {workspaceName}.
            </p>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            disabled={!canManageTeam}
            title={!canManageTeam ? 'Only Owner or Admin can invite members' : undefined}
            className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] disabled:opacity-45 text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 self-start transition-colors"
          >
            <UserPlus size={14} strokeWidth={1.5} /> Invite Team Member
          </button>
        </div>

        {/* Role Enforcement Notice */}
        {!canApprovePosts && (
          <div className="px-4 py-3 rounded-[10px] border border-orange-500/30 bg-orange-500/10 flex items-center gap-2.5 text-[12px] text-[#111827] dark:text-[#F3F4F6]">
            <Lock size={14} strokeWidth={1.5} className="text-[#F97316] shrink-0" />
            <span>
              <strong>Approval Gate Enforced:</strong> You are currently acting as{' '}
              <span className="font-mono font-semibold">{activeRole}</span>. Drafts you create require{' '}
              <strong>Admin</strong>, <strong>Owner</strong>, or <strong>Client Approver</strong> sign-off before publishing.
            </span>
          </div>
        )}

        {/* Approval Queue */}
        <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em] flex items-center gap-2">
                <ShieldCheck size={15} strokeWidth={1.5} className="text-[#06B6D4]" />
                Pending Approval Queue ({pendingPosts.length})
              </h2>
              <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                Approve to schedule automatically, request copy revisions with comments, or reject.
              </p>
            </div>
            <StatusBadge tone={pendingPosts.length > 0 ? 'orange' : 'emerald'}>
              {pendingPosts.length} Awaiting Sign-off
            </StatusBadge>
          </div>

          {pendingPosts.length === 0 ? (
            <EmptyStatePanel
              icon={ShieldCheck}
              title="All caught up"
              description={`Zero posts awaiting approval in ${workspaceName}. Switch to Editor in Settings to test the approval gate.`}
            />
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
              {pendingPosts.map((post) => {
                const cat = wsCategories.find((c) => c.id === post.categoryId);
                const isGivingFeedback = feedbackTargetId === post.id;
                return (
                  <div key={post.id} className="p-5 space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        {post.media?.[0] && (
                          <img
                            src={post.media[0]}
                            alt=""
                            className="w-14 h-14 rounded-[8px] object-cover border border-[#E5E7EB] dark:border-white/[0.08] shrink-0"
                          />
                        )}
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {cat && (
                              <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                                <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: cat.color }} />
                                {cat.name}
                              </span>
                            )}
                            {post.platforms.map((pl) => (
                              <PlatformTag key={pl} platform={pl} showFull={false} />
                            ))}
                            <span className="text-[11px] font-mono text-[#6B7280] tabular-nums">
                              Target: {new Date(post.scheduledAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[13px] text-[#111827] dark:text-[#F3F4F6] leading-relaxed">{post.content}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprovePost(post)}
                          disabled={!canApprovePosts}
                          className="px-3.5 py-1.5 bg-[#111827] hover:bg-[#1F2937] disabled:opacity-45 text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 size={13} strokeWidth={1.5} /> Approve
                        </button>
                        <button
                          onClick={() => {
                            if (isGivingFeedback && feedbackMode === 'changes') {
                              setFeedbackTargetId(null);
                            } else {
                              setFeedbackTargetId(post.id);
                              setFeedbackMode('changes');
                              setFeedbackNote('');
                            }
                          }}
                          disabled={!canApprovePosts}
                          className="px-3 py-1.5 border border-orange-500/30 bg-orange-500/10 disabled:opacity-45 text-[#F97316] hover:border-orange-500/50 rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <MessageSquareWarning size={13} strokeWidth={1.5} /> Request Changes
                        </button>
                        <button
                          onClick={() => {
                            if (isGivingFeedback && feedbackMode === 'reject') {
                              setFeedbackTargetId(null);
                            } else {
                              setFeedbackTargetId(post.id);
                              setFeedbackMode('reject');
                              setFeedbackNote('');
                            }
                          }}
                          disabled={!canApprovePosts}
                          className="px-3 py-1.5 border border-rose-500/30 bg-rose-500/10 disabled:opacity-45 text-rose-500 hover:border-rose-500/50 rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <XCircle size={13} strokeWidth={1.5} /> Reject
                        </button>
                        <button
                          onClick={() => onEditInStudio(post)}
                          className="px-3 py-1.5 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1 transition-colors"
                        >
                          <Edit3 size={12} strokeWidth={1.5} /> Edit
                        </button>
                      </div>
                    </div>

                    {isGivingFeedback && (
                      <div className="p-3 bg-[#F8F9FB] dark:bg-[#0E1015] rounded-[10px] border border-[#E5E7EB] dark:border-white/[0.08] flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={feedbackNote}
                          onChange={(e) => setFeedbackNote(e.target.value)}
                          placeholder={
                            feedbackMode === 'reject'
                              ? 'Reason for rejecting this post (recorded in audit trail)...'
                              : 'Add revision notes for the editor (e.g. "Tighten opening hook & add link")...'
                          }
                          className="flex-1 px-3 py-2 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                        />
                        <button
                          onClick={() => handleSubmitDecision(post)}
                          className={`px-4 py-2 rounded-[8px] text-[12px] font-medium shrink-0 transition-colors ${
                            feedbackMode === 'reject'
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D]'
                          }`}
                        >
                          {feedbackMode === 'reject' ? 'Confirm Reject' : 'Return to Drafts'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Team Members Directory with Granular Permissions */}
        <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em] flex items-center gap-2">
              <Users size={15} strokeWidth={1.5} className="text-[#06B6D4]" /> Workspace Team &amp; Permissions ({wsMembers.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] text-[11px] text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-[0.04em]">
                  <th className="py-2.5 px-4 font-medium">Member</th>
                  <th className="py-2.5 px-4 font-medium">Role</th>
                  <th className="py-2.5 px-4 font-medium">Granular Permissions</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
                {wsMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <EmptyStatePanel
                        icon={Users}
                        title="No team members invited yet"
                        description="Invite Editors, Admins, or Client Approvers to manage review workflows."
                        actionLabel="Invite Team Member"
                        onAction={() => setShowInviteModal(true)}
                      />
                    </td>
                  </tr>
                ) : (
                  wsMembers.map((member) => {
                    const perms = member.permissions || defaultPermissionsForRole(member.role);
                    const roleOptions = CANONICAL_ROLES.includes(member.role)
                      ? CANONICAL_ROLES
                      : [member.role, ...CANONICAL_ROLES];
                    return (
                      <tr key={member.id} className="hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <ContactAvatar name={member.name} src={member.avatar} size="sm" />
                            <div>
                              <p className="font-medium text-[#111827] dark:text-[#F3F4F6]">{member.name}</p>
                              <p className="text-[11px] font-mono text-[#6B7280]">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            aria-label={`Role for ${member.name}`}
                            disabled={!canManageTeam}
                            value={member.role}
                            onChange={(e) => {
                              const nextRole = e.target.value as TeamRole;
                              onUpdateTeamMember({
                                ...member,
                                role: nextRole,
                                permissions: defaultPermissionsForRole(nextRole),
                              });
                              onToast('Role Updated', `${member.name} is now ${nextRole}.`, 'success');
                            }}
                            className="px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4] disabled:opacity-50"
                          >
                            {roleOptions.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                ['canPublish', 'Publish'],
                                ['canApprove', 'Approve'],
                                ['canManageTeam', 'Team'],
                                ['canConnectProfiles', 'OAuth'],
                              ] as [keyof TeamMemberPermissions, string][]
                            ).map(([permKey, label]) => {
                              const active = Boolean(perms[permKey]);
                              return (
                                <button
                                  key={permKey}
                                  type="button"
                                  disabled={!canManageTeam || member.role === 'Owner'}
                                  onClick={() => handleTogglePermission(member, permKey)}
                                  className={`px-2 py-0.5 rounded-[5px] text-[11px] font-medium border transition-colors ${
                                    active
                                      ? 'bg-cyan-500/10 border-cyan-500/30 text-[#06B6D4]'
                                      : 'bg-transparent border-[#E5E7EB] dark:border-white/[0.08] text-[#6B7280]'
                                  } disabled:opacity-60`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            disabled={!canManageTeam}
                            onClick={() => {
                              const nextStatus = member.status === 'active' ? 'invited' : 'active';
                              onUpdateTeamMember({ ...member, status: nextStatus });
                              onToast('Member Status Updated', `${member.name} marked ${nextStatus}.`);
                            }}
                            title="Toggle member activation status"
                          >
                            <StatusBadge tone={member.status === 'active' ? 'emerald' : 'orange'}>
                              {member.status}
                            </StatusBadge>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {member.role !== 'Owner' && canManageTeam && (
                            <button
                              onClick={() => {
                                onRemoveTeamMember(member.id);
                                onToast('Access Revoked', `${member.name} removed from ${workspaceName}.`, 'warning');
                              }}
                              className="p-1.5 text-[#6B7280] hover:text-rose-500 rounded-md transition-colors"
                              title="Revoke access"
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approval Audit Log */}
        <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6] flex items-center gap-2">
              <History size={14} strokeWidth={1.5} className="text-[#06B6D4]" /> Approval Audit Trail ({wsAuditLogs.length})
            </h2>
          </div>
          {wsAuditLogs.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-[#6B7280]">
              No approval decisions recorded yet. Approve, request changes, or reject a queued post to populate this log.
            </p>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] text-[12px]">
              {wsAuditLogs.slice(0, 15).map((entry) => (
                <div key={entry.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge
                        tone={
                          entry.action === 'approved'
                            ? 'emerald'
                            : entry.action === 'rejected'
                              ? 'rose'
                              : 'orange'
                        }
                      >
                        {entry.action === 'approved'
                          ? 'Approved'
                          : entry.action === 'rejected'
                            ? 'Rejected'
                            : 'Changes Requested'}
                      </StatusBadge>
                      <span className="font-medium text-[#111827] dark:text-[#F3F4F6] truncate">
                        “{entry.postSnippet}”
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-[11px] text-[#6B7280] mt-1">Note: {entry.note}</p>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-[#6B7280] shrink-0 tabular-nums">
                    {entry.actorName || entry.actor || 'Workspace User'} ({entry.actorRole || entry.role || 'Owner'}) ·{' '}
                    {new Date(entry.createdAt || entry.timestamp || Date.now()).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setShowInviteModal(false)} />
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                Invite Member to {workspaceName}
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] rounded-md"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-3.5 text-[12px]">
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Full Name</label>
                <input
                  required
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="e.g. Jordan Taylor"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Work Email</label>
                <input
                  required
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="jordan@agency.io"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Workspace Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as TeamRole })}
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                >
                  <option value="Admin">Admin (Full publish, approve &amp; team control)</option>
                  <option value="Editor">Editor (Drafts require approval before publishing)</option>
                  <option value="Client Approver">Client Approver (Review, approve &amp; request changes)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] font-medium text-[#4B5563] dark:text-[#9CA3AF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium transition-colors"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
