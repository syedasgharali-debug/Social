import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  MessageSquareWarning,
  Edit3,
  UserPlus,
  Users,
  Trash2,
  X,
} from 'lucide-react';
import { SocialPost, TeamMember, ContentCategory, TeamRole } from '../../types';
import { PlatformTag, ContactAvatar } from '../common/PlatformMeta';
import { StatusBadge, EmptyStatePanel } from '../common/DesignPrimitives';

interface TeamApprovalsViewProps {
  workspaceId: string;
  workspaceName: string;
  posts: SocialPost[];
  teamMembers: TeamMember[];
  categories: ContentCategory[];
  activeRole: TeamRole;
  onUpdatePost: (post: SocialPost) => void;
  onEditInStudio: (post: SocialPost) => void;
  onAddTeamMember: (member: TeamMember) => void;
  onUpdateTeamMember: (member: TeamMember) => void;
  onRemoveTeamMember: (id: string) => void;
  onToast: (title: string, description?: string) => void;
}

export function TeamApprovalsView({
  workspaceId,
  workspaceName,
  posts,
  teamMembers,
  categories,
  activeRole,
  onUpdatePost,
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

  const [feedbackTargetId, setFeedbackTargetId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'Contributor' as TeamRole,
  });

  const handleApprovePost = (post: SocialPost) => {
    onUpdatePost({
      ...post,
      status: 'scheduled',
      approvalNote: undefined,
    });
    onToast('Post Approved & Scheduled', 'Moved directly into your active publishing calendar.');
  };

  const handleRequestEdits = (post: SocialPost) => {
    onUpdatePost({
      ...post,
      status: 'draft',
      approvalNote: feedbackNote.trim() || 'Please tighten hook and verify CTA before re-submitting.',
    });
    setFeedbackTargetId(null);
    setFeedbackNote('');
    onToast('Returned for Edits', 'Sent back to Drafts with your review note.');
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;
    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      workspaceId,
      name: inviteForm.name.trim(),
      email: inviteForm.email.trim(),
      role: inviteForm.role,
      avatar: '',
      status: 'invited',
    };
    onAddTeamMember(newMember);
    onToast('Invitation Sent', `${newMember.name} invited as ${newMember.role}.`);
    setShowInviteModal(false);
    setInviteForm({ name: '', email: '', role: 'Contributor' });
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-[#090A0D] custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-5">
          <div>
            <p className="text-[11px] font-medium text-[#06B6D4] uppercase tracking-[0.04em]">
              Governance &amp; Publishing Permissions · {activeRole}
            </p>
            <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] mt-1">
              Team &amp; Client Approvals
            </h1>
            <p className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">
              Review queued content for {workspaceName} and manage role-based publishing permissions.
            </p>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 self-start transition-colors"
          >
            <UserPlus size={14} strokeWidth={1.5} /> Invite Team Member
          </button>
        </div>

        {/* Approval Queue */}
        <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em] flex items-center gap-2">
                <ShieldCheck size={15} strokeWidth={1.5} className="text-[#06B6D4]" />
                Pending Approval Queue ({pendingPosts.length})
              </h2>
              <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                Approve posts to schedule automatically or request copy revisions.
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
              description={`Zero posts awaiting approval in ${workspaceName}.`}
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
                          className="px-3.5 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 size={13} strokeWidth={1.5} /> Approve &amp; Schedule
                        </button>
                        <button
                          onClick={() => {
                            setFeedbackTargetId(isGivingFeedback ? null : post.id);
                            setFeedbackNote('');
                          }}
                          className="px-3 py-1.5 border border-orange-500/30 bg-orange-500/10 text-[#F97316] hover:border-orange-500/50 rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <MessageSquareWarning size={13} strokeWidth={1.5} /> Request Edits
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
                          placeholder="Add revision notes for the contributor (e.g. 'Shorten opening hook')..."
                          className="flex-1 px-3 py-2 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                        />
                        <button
                          onClick={() => handleRequestEdits(post)}
                          className="px-4 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium shrink-0 transition-colors"
                        >
                          Return to Drafts
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Team Members Directory */}
        <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em] flex items-center gap-2">
              <Users size={15} strokeWidth={1.5} className="text-[#06B6D4]" /> Workspace Team Members ({wsMembers.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] text-[11px] text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-[0.04em]">
                  <th className="py-2.5 px-4 font-medium">Member</th>
                  <th className="py-2.5 px-4 font-medium">Role</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
                {wsMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <EmptyStatePanel
                        icon={Users}
                        title="No team members invited yet"
                        description="Invite collaborators to review posts and manage approval workflows."
                        actionLabel="Invite Team Member"
                        onAction={() => setShowInviteModal(true)}
                      />
                    </td>
                  </tr>
                ) : (
                  wsMembers.map((member) => (
                    <tr key={member.id} className="h-[44px] hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <ContactAvatar name={member.name} src={member.avatar} size="sm" />
                          <div>
                            <p className="font-medium text-[#111827] dark:text-[#F3F4F6]">{member.name}</p>
                            <p className="text-[11px] font-mono text-[#6B7280]">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          aria-label={`Role for ${member.name}`}
                          value={member.role}
                          onChange={(e) => {
                            onUpdateTeamMember({ ...member, role: e.target.value as TeamRole });
                            onToast('Role Updated', `${member.name} is now ${e.target.value}.`);
                          }}
                          className="px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                        >
                          {(['Owner', 'Manager', 'Publisher', 'Contributor'] as TeamRole[]).map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge tone={member.status === 'active' ? 'emerald' : 'orange'}>
                          {member.status}
                        </StatusBadge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {member.role !== 'Owner' && (
                          <button
                            onClick={() => {
                              onRemoveTeamMember(member.id);
                              onToast('Member Removed');
                            }}
                            className="p-1.5 text-[#6B7280] hover:text-rose-500 rounded-md transition-colors"
                            title="Remove member"
                          >
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Permission Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as TeamRole })}
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                >
                  <option value="Manager">Manager (Approve &amp; Publish)</option>
                  <option value="Publisher">Publisher (Schedule &amp; Reply)</option>
                  <option value="Contributor">Contributor (Requires Approval)</option>
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
