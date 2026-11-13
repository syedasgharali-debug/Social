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
    <div className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck size={22} className="text-[#4F46E5]" /> Team & Client Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review queued content for {workspaceName} and manage role-based publishing permissions (Active Role: {activeRole}).
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start"
        >
          <UserPlus size={14} /> Invite Team Member
        </button>
      </div>

      {/* Approval Queue */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Pending Approval Queue ({pendingPosts.length})
            </h2>
            <p className="text-xs text-slate-500">Approve posts to schedule automatically or request copy revisions.</p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-bold tabular-nums">
            {pendingPosts.length} Awaiting Sign-off
          </span>
        </div>

        {pendingPosts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            All caught up! Zero posts awaiting approval in {workspaceName}.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
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
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      )}
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {cat && (
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: cat.color }} />
                              {cat.name}
                            </span>
                          )}
                          {post.platforms.map((pl) => (
                            <PlatformTag key={pl} platform={pl} showFull={false} />
                          ))}
                          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                            Target: {new Date(post.scheduledAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed">{post.content}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApprovePost(post)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={13} /> Approve & Schedule
                      </button>
                      <button
                        onClick={() => {
                          setFeedbackTargetId(isGivingFeedback ? null : post.id);
                          setFeedbackNote('');
                        }}
                        className="px-3 py-2 border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <MessageSquareWarning size={13} /> Request Edits
                      </button>
                      <button
                        onClick={() => onEditInStudio(post)}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                    </div>
                  </div>

                  {isGivingFeedback && (
                    <div className="p-3.5 bg-[#F8FAFC] dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={feedbackNote}
                        onChange={(e) => setFeedbackNote(e.target.value)}
                        placeholder="Add revision notes for the contributor (e.g. 'Shorten opening hook')..."
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#4F46E5]"
                      />
                      <button
                        onClick={() => handleRequestEdits(post)}
                        className="px-4 py-2 bg-slate-900 dark:bg-[#4F46E5] text-white rounded-lg text-xs font-semibold shrink-0"
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={15} className="text-[#4F46E5]" /> Workspace Team Members ({wsMembers.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 font-semibold">Member</th>
                <th className="py-3 px-5 font-semibold">Role</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {wsMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <ContactAvatar name={member.name} src={member.avatar} size="sm" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{member.name}</p>
                        <p className="text-[11px] text-slate-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <select
                      aria-label={`Role for ${member.name}`}
                      value={member.role}
                      onChange={(e) => {
                        onUpdateTeamMember({ ...member, role: e.target.value as TeamRole });
                        onToast('Role Updated', `${member.name} is now ${e.target.value}.`);
                      }}
                      className="px-2.5 py-1.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none"
                    >
                      {(['Owner', 'Manager', 'Publisher', 'Contributor'] as TeamRole[]).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3.5 px-5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        member.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {member.role !== 'Owner' && (
                      <button
                        onClick={() => {
                          onRemoveTeamMember(member.id);
                          onToast('Member Removed');
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setShowInviteModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Invite Member to {workspaceName}
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Full Name</label>
                <input
                  required
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="e.g. Jordan Taylor"
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Work Email</label>
                <input
                  required
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="jordan@agency.io"
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Permission Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as TeamRole })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                >
                  <option value="Manager">Manager (Approve & Publish)</option>
                  <option value="Publisher">Publisher (Schedule & Reply)</option>
                  <option value="Contributor">Contributor (Requires Approval)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-2 bg-[#4F46E5] text-white rounded-lg font-semibold">
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
