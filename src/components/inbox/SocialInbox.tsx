import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  StickyNote,
  ExternalLink,
  RotateCcw,
  Inbox,
  Mail,
  MessageCircle,
  AtSign,
  Eye,
  PanelRightOpen,
  Building2,
  Tag,
  Briefcase,
} from 'lucide-react';
import { Thread, Contact, Deal, Platform, MessageStatus } from '../../types';
import { aiService } from '../../services/aiService';
import { ALL_PLATFORMS, PLATFORM_META, PlatformTag, ContactAvatar, SocialLogo } from '../common/PlatformMeta';
import { InspectorDrawer, StatusBadge, EmptyStatePanel } from '../common/DesignPrimitives';

interface SocialInboxProps {
  workspaceId: string;
  threads: Thread[];
  contacts: Contact[];
  deals: Deal[];
  selectedThreadId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onUpdateThread: (thread: Thread) => void;
  onUpdateContact: (contact: Contact) => void;
  onOpenContactInCrm: (contactId: string) => void;
  onToast: (title: string, description?: string, variant?: 'success' | 'info' | 'warning') => void;
}

type InboxBucket = 'all' | 'unread' | 'dm' | 'comment' | 'mention';

export function SocialInbox({
  workspaceId,
  threads,
  contacts,
  deals,
  selectedThreadId,
  currentUserName = 'You',
  currentUserAvatar = '',
  onUpdateThread,
  onUpdateContact,
  onOpenContactInCrm,
  onToast,
}: SocialInboxProps) {
  const wsThreads = useMemo(
    () => threads.filter((t) => t.workspaceId === workspaceId),
    [threads, workspaceId]
  );

  const [activeThreadId, setActiveThreadId] = useState<string>(selectedThreadId || wsThreads[0]?.id || '');
  const [bucketFilter, setBucketFilter] = useState<InboxBucket>('all');
  const [statusFilter, setStatusFilter] = useState<MessageStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [aiReplies, setAiReplies] = useState<{ professional: string; friendly: string; concise: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (selectedThreadId && wsThreads.some((t) => t.id === selectedThreadId)) {
      setActiveThreadId(selectedThreadId);
    } else if (!wsThreads.some((t) => t.id === activeThreadId)) {
      setActiveThreadId(wsThreads[0]?.id || '');
    }
  }, [selectedThreadId, wsThreads, activeThreadId]);

  const bucketCounts = useMemo(
    () => ({
      all: wsThreads.length,
      unread: wsThreads.filter((t) => t.unreadCount > 0).length,
      dm: wsThreads.filter((t) => t.type === 'dm').length,
      comment: wsThreads.filter((t) => t.type === 'comment').length,
      mention: wsThreads.filter((t) => t.type === 'mention').length,
    }),
    [wsThreads]
  );

  const filteredThreads = useMemo(() => {
    return wsThreads.filter((t) => {
      const contact = contacts.find((c) => c.id === t.contactId);
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.lastMessage.toLowerCase().includes(q) ||
        (contact?.name || '').toLowerCase().includes(q) ||
        (contact?.company || '').toLowerCase().includes(q);
      const matchesBucket =
        bucketFilter === 'all' ||
        (bucketFilter === 'unread' ? t.unreadCount > 0 : t.type === bucketFilter);
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesPlatform = platformFilter === 'all' || t.platform === platformFilter;
      return matchesSearch && matchesBucket && matchesStatus && matchesPlatform;
    });
  }, [wsThreads, contacts, searchQuery, bucketFilter, statusFilter, platformFilter]);

  const activeThread = useMemo(
    () => wsThreads.find((t) => t.id === activeThreadId) || filteredThreads[0] || null,
    [wsThreads, activeThreadId, filteredThreads]
  );

  const activeContact = useMemo(
    () => (activeThread ? contacts.find((c) => c.id === activeThread.contactId) || null : null),
    [activeThread, contacts]
  );

  const linkedDeal = useMemo(
    () => (activeContact ? deals.find((d) => d.contactId === activeContact.id) || null : null),
    [activeContact, deals]
  );

  const handleSelectThread = (thread: Thread) => {
    setActiveThreadId(thread.id);
    setAiReplies(null);
    if (thread.unreadCount > 0) {
      onUpdateThread({ ...thread, unreadCount: 0 });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !activeContact || !replyText.trim()) return;

    const now = new Date().toISOString();
    const newMsg = {
      id: `m-${Date.now()}`,
      senderId: 'me',
      senderName: isInternalNote ? `Internal Team Note · ${currentUserName}` : currentUserName,
      senderAvatar: currentUserAvatar,
      text: replyText.trim(),
      timestamp: now,
      isMe: true,
      isInternalNote,
    };

    onUpdateThread({
      ...activeThread,
      messages: [...activeThread.messages, newMsg],
      lastMessage: isInternalNote ? activeThread.lastMessage : replyText.trim(),
      lastTimestamp: now,
      unreadCount: 0,
    });

    if (!isInternalNote) {
      onUpdateContact({
        ...activeContact,
        interactionHistory: [
          {
            id: `ih-${Date.now()}`,
            type: activeThread.type,
            content: `Replied: "${replyText.trim()}"`,
            timestamp: now,
            platform: activeThread.platform,
          },
          ...activeContact.interactionHistory,
        ],
      });
    }

    onToast(
      isInternalNote ? 'Internal Team Note Saved' : `Sent via ${PLATFORM_META[activeThread.platform].label}`
    );
    setReplyText('');
    setAiReplies(null);
  };

  const handleGenerateAiReplies = async () => {
    if (!activeThread || !activeContact) return;
    setAiLoading(true);
    try {
      const res = await aiService.generateDraftReplies(activeThread, activeContact);
      setAiReplies({
        professional: res.professional,
        friendly: res.friendly,
        concise: res.concise,
      });
    } catch (err) {
      onToast(
        'AI Replies Unavailable',
        err instanceof Error ? err.message : 'Unable to generate reply suggestions.',
        'warning'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSummarizeAndTag = async () => {
    if (!activeThread || !activeContact) return;
    setSummaryLoading(true);
    try {
      const res = await aiService.summarizeAndTag(activeThread);
      const mergedTags = Array.from(new Set([...activeContact.tags, ...res.suggestedTags])).slice(0, 6);
      onUpdateThread({
        ...activeThread,
        summary: `${res.summary} (Intent: ${res.intent} · ${Math.round(res.sentimentScore * 100)}%)`,
        sentiment: res.sentiment,
      });
      onUpdateContact({
        ...activeContact,
        tags: mergedTags,
      });
      onToast('AI Summary & CRM Tags Applied', `${res.intent} intent detected.`);
    } catch (err) {
      onToast(
        'AI Summary Unavailable',
        err instanceof Error ? err.message : 'Unable to summarize thread right now.',
        'warning'
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="h-full flex bg-[#F8F9FB] dark:bg-[#090A0D] overflow-hidden">
      {/* PANE 1: FILTER SIDEBAR */}
      <aside className="hidden md:flex w-52 border-r border-[#E5E7EB] dark:border-white/[0.08] bg-[#F3F4F6] dark:bg-[#0E1015] flex-col p-3 space-y-5 shrink-0 overflow-y-auto custom-scrollbar">
        <div>
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#6B7280] dark:text-[#6B7280] mb-1.5">
            Inbox Streams
          </p>
          <div className="space-y-0.5 text-[12px] font-medium">
            {(
              [
                { id: 'all', label: 'All Messages', count: bucketCounts.all, icon: Inbox },
                { id: 'unread', label: 'Unread', count: bucketCounts.unread, icon: Eye },
                { id: 'dm', label: 'Direct Messages', count: bucketCounts.dm, icon: Mail },
                { id: 'comment', label: 'Post Comments', count: bucketCounts.comment, icon: MessageCircle },
                { id: 'mention', label: 'Mentions', count: bucketCounts.mention, icon: AtSign },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = bucketFilter === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setBucketFilter(item.id)}
                  className={`w-full px-2.5 py-1.5 rounded-md flex items-center justify-between transition-colors ${
                    active
                      ? 'bg-black/[0.06] dark:bg-white/[0.07] text-[#111827] dark:text-[#F3F4F6]'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={13} strokeWidth={1.5} className={active ? 'text-[#06B6D4]' : ''} />
                    {item.label}
                  </span>
                  <span className="font-mono text-[10px] text-[#6B7280] tabular-nums">{item.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#6B7280] mb-1.5">
            Filter by Network
          </p>
          <div className="space-y-0.5 text-[12px] font-medium">
            <button
              onClick={() => setPlatformFilter('all')}
              className={`w-full px-2.5 py-1.5 rounded-md flex items-center justify-between transition-colors ${
                platformFilter === 'all'
                  ? 'bg-[#111827] text-white dark:bg-white dark:text-[#090A0D]'
                  : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
              }`}
            >
              <span>All Networks</span>
              <span className="font-mono text-[10px] tabular-nums">{wsThreads.length}</span>
            </button>
            {ALL_PLATFORMS.filter((p) =>
              ['instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'threads', 'bluesky'].includes(p)
            ).map((p) => {
              const count = wsThreads.filter((t) => t.platform === p).length;
              const active = platformFilter === p;
              return (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`w-full px-2.5 py-1.5 rounded-md flex items-center justify-between transition-colors ${
                    active
                      ? 'bg-black/[0.06] dark:bg-white/[0.07] text-[#111827] dark:text-[#F3F4F6]'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <SocialLogo platform={p} size={14} />
                    {PLATFORM_META[p].label}
                  </span>
                  <span className="font-mono text-[10px] text-[#6B7280] tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#6B7280] mb-1.5">
            Queue Status
          </p>
          <div className="grid grid-cols-2 gap-1 text-[11px] font-medium">
            {(['all', 'open', 'snoozed', 'resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`py-1.5 rounded-md capitalize border transition-colors ${
                  statusFilter === st
                    ? 'border-[#06B6D4] bg-[#06B6D4]/10 text-[#0891B2] dark:text-[#22D3EE]'
                    : 'border-[#E5E7EB] dark:border-white/[0.08] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* PANE 2: CONVERSATION THREAD LIST */}
      <div className="w-80 lg:w-88 border-r border-[#E5E7EB] dark:border-white/[0.08] bg-white dark:bg-[#13161D] flex flex-col shrink-0">
        <div className="p-3.5 border-b border-[#E5E7EB] dark:border-white/[0.08] space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
              Conversations
            </h2>
            <span className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
              {filteredThreads.length} showing
            </span>
          </div>
          <div className="relative">
            <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search person, company, or message..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg text-[12px] text-[#111827] dark:text-[#F3F4F6] placeholder-[#9CA3AF] outline-none focus:border-[#06B6D4]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-white/[0.06] custom-scrollbar">
          {filteredThreads.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
              No conversations match the selected filters.
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const contact = contacts.find((c) => c.id === thread.contactId);
              const selected = activeThread?.id === thread.id;
              return (
                <button
                  key={thread.id}
                  onClick={() => handleSelectThread(thread)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 border-l-2 ${
                    selected
                      ? 'bg-black/[0.03] dark:bg-white/[0.05] border-l-[#06B6D4]'
                      : 'border-l-transparent hover:bg-[#F8F9FB] dark:hover:bg-[#191D26]'
                  }`}
                >
                  <ContactAvatar name={contact?.name || 'Unknown'} src={contact?.avatar} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-[#111827] dark:text-[#F3F4F6] truncate">
                        {contact?.name || 'Unknown'}
                      </p>
                      {thread.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#06B6D4] text-[#090A0D] font-mono text-[10px] font-semibold tabular-nums">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                      <PlatformTag platform={thread.platform} showFull={false} />
                      <span className="font-mono text-[10px]">· {thread.type.toUpperCase()}</span>
                      {thread.sentiment === 'urgent' && (
                        <span className="text-[#F97316] font-semibold">· Urgent</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[12px] text-[#4B5563] dark:text-[#9CA3AF] line-clamp-2 leading-snug">
                      {thread.lastMessage}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* PANE 3: ACTIVE CHAT REPLY PANE */}
      {activeThread && activeContact ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FB] dark:bg-[#090A0D]">
          {/* Active Header */}
          <div className="px-5 py-3 bg-white dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ContactAvatar name={activeContact.name} src={activeContact.avatar} size="sm" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6] truncate">
                    {activeContact.name}
                  </h3>
                  <PlatformTag platform={activeThread.platform} />
                  <span className="text-[11px] font-mono font-medium text-[#0891B2] dark:text-[#22D3EE] tabular-nums">
                    Lead {activeContact.leadScore}/100
                  </span>
                  {linkedDeal && (
                    <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                      · ${linkedDeal.value.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                  {activeContact.title} · {activeContact.company} · {activeContact.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setInspectorOpen(true)}
                className="px-2.5 py-1.5 border border-[#E5E7EB] dark:border-white/[0.1] hover:border-[#D1D5DB] dark:hover:border-white/[0.2] bg-white dark:bg-[#13161D] rounded-lg text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5"
              >
                <PanelRightOpen size={13} strokeWidth={1.5} /> Inspect
              </button>
              <button
                onClick={handleSummarizeAndTag}
                disabled={summaryLoading}
                className="px-2.5 py-1.5 bg-[#06B6D4]/10 hover:bg-[#06B6D4]/15 border border-[#06B6D4]/25 rounded-lg text-[12px] font-medium text-[#0891B2] dark:text-[#22D3EE] flex items-center gap-1.5 disabled:opacity-60"
              >
                <Sparkles size={13} strokeWidth={1.5} /> {summaryLoading ? 'Analyzing...' : 'Summarize & Tag'}
              </button>

              {activeThread.status !== 'snoozed' && (
                <button
                  onClick={() => {
                    onUpdateThread({ ...activeThread, status: 'snoozed', unreadCount: 0 });
                    onToast('Thread Snoozed');
                  }}
                  className="px-2.5 py-1.5 border border-[#E5E7EB] dark:border-white/[0.1] rounded-lg text-[12px] font-medium text-[#4B5563] dark:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-white/[0.06] flex items-center gap-1"
                >
                  <Clock size={12} strokeWidth={1.5} /> Snooze
                </button>
              )}

              {activeThread.status !== 'resolved' ? (
                <button
                  onClick={() => {
                    onUpdateThread({ ...activeThread, status: 'resolved', unreadCount: 0 });
                    onToast('Thread Marked Resolved');
                  }}
                  className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 rounded-lg text-[12px] font-medium flex items-center gap-1"
                >
                  <CheckCircle2 size={12} strokeWidth={1.5} /> Resolve
                </button>
              ) : (
                <button
                  onClick={() => {
                    onUpdateThread({ ...activeThread, status: 'open' });
                    onToast('Thread Reopened');
                  }}
                  className="px-2.5 py-1.5 border border-[#E5E7EB] dark:border-white/[0.1] rounded-lg text-[12px] font-medium text-[#4B5563] dark:text-[#D1D5DB] flex items-center gap-1"
                >
                  <RotateCcw size={12} strokeWidth={1.5} /> Reopen
                </button>
              )}
            </div>
          </div>

          {/* AI Summary Strip */}
          {activeThread.summary && (
            <div className="px-5 py-2 bg-[#06B6D4]/[0.06] border-b border-[#06B6D4]/20 text-[12px] text-[#111827] dark:text-[#E5E7EB]">
              <span className="font-semibold text-[#0891B2] dark:text-[#22D3EE] mr-2">AI Summary:</span>
              {activeThread.summary}
            </div>
          )}

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3.5 custom-scrollbar">
            {activeThread.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-lg rounded-[12px] px-4 py-2.5 text-[12px] leading-relaxed border ${
                    msg.isInternalNote
                      ? 'bg-[#F97316]/[0.08] border-[#F97316]/30 text-[#9A3412] dark:text-[#FDBA74]'
                      : msg.isMe
                      ? 'bg-[#111827] dark:bg-white border-[#111827] dark:border-white text-white dark:text-[#090A0D]'
                      : 'bg-white dark:bg-[#13161D] border-[#E5E7EB] dark:border-white/[0.08] text-[#111827] dark:text-[#F3F4F6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-70">
                    <span className="font-medium">{msg.senderName}</span>
                    <span className="font-mono tabular-nums">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply & AI Smart Reply Composer */}
          <div className="p-4 bg-white dark:bg-[#0E1015] border-t border-[#E5E7EB] dark:border-white/[0.08] space-y-3">
            {aiReplies && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {(
                  [
                    { key: 'professional', label: 'Professional' },
                    { key: 'friendly', label: 'Friendly' },
                    { key: 'concise', label: 'Concise' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setReplyText(aiReplies[opt.key])}
                    className="text-left p-2.5 bg-[#F8F9FB] dark:bg-[#13161D] hover:border-[#06B6D4] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px] transition-colors"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#0891B2] dark:text-[#22D3EE]">
                      {opt.label} Smart Reply
                    </p>
                    <p className="mt-1 text-[11px] text-[#4B5563] dark:text-[#D1D5DB] line-clamp-2">
                      {aiReplies[opt.key]}
                    </p>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="space-y-2.5">
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  isInternalNote
                    ? 'Write an internal team note (visible only to your agency/team)...'
                    : `Reply to ${activeContact.name} on ${PLATFORM_META[activeThread.platform].label}...`
                }
                className={`w-full px-3.5 py-2.5 rounded-[10px] border text-[12px] outline-none resize-none text-[#111827] dark:text-[#F3F4F6] ${
                  isInternalNote
                    ? 'bg-[#F97316]/[0.06] border-[#F97316]/35'
                    : 'bg-[#F8F9FB] dark:bg-[#13161D] border-[#E5E7EB] dark:border-white/[0.08] focus:border-[#06B6D4]'
                }`}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateAiReplies}
                    disabled={aiLoading}
                    className="px-2.5 py-1.5 bg-[#06B6D4]/10 hover:bg-[#06B6D4]/15 border border-[#06B6D4]/25 text-[#0891B2] dark:text-[#22D3EE] rounded-lg text-[12px] font-medium flex items-center gap-1.5"
                  >
                    <Sparkles size={13} strokeWidth={1.5} />
                    {aiLoading ? 'Generating...' : 'AI Smart Reply'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsInternalNote(!isInternalNote)}
                    className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium border flex items-center gap-1.5 transition-colors ${
                      isInternalNote
                        ? 'bg-[#F97316]/10 border-[#F97316]/30 text-[#C2410C] dark:text-[#FB923C]'
                        : 'bg-white dark:bg-[#13161D] border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#D1D5DB]'
                    }`}
                  >
                    <StickyNote size={13} strokeWidth={1.5} /> {isInternalNote ? 'Internal Team Note' : 'Public Reply'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="px-3.5 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] disabled:opacity-40 rounded-lg text-[12px] font-semibold flex items-center gap-1.5"
                >
                  <Send size={13} strokeWidth={1.5} /> {isInternalNote ? 'Save Team Note' : 'Send Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyStatePanel
            icon={Inbox}
            title="No conversation selected"
            description="Select a message thread from the left column to review context and reply."
          />
        </div>
      )}

      {/* THREAD & CONTACT INSPECTOR DRAWER */}
      <InspectorDrawer
        open={inspectorOpen && Boolean(activeContact && activeThread)}
        onClose={() => setInspectorOpen(false)}
        title={activeContact?.name || 'Thread Context'}
        subtitle={activeContact ? `${activeContact.title || 'Contact'} · ${activeContact.company || 'Independent'}` : undefined}
        headerActions={
          activeContact && (
            <button
              type="button"
              onClick={() => {
                setInspectorOpen(false);
                onOpenContactInCrm(activeContact.id);
              }}
              className="px-2.5 py-1 border border-[#E5E7EB] dark:border-white/[0.1] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] hover:border-[#06B6D4] flex items-center gap-1"
            >
              Open CRM <ExternalLink size={11} strokeWidth={1.5} />
            </button>
          )
        }
      >
        {activeContact && activeThread && (
          <div className="space-y-5 text-[12px]">
            <div className="grid grid-cols-3 gap-2.5 tabular-nums">
              <div className="p-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px]">
                <p className="text-[11px] text-[#6B7280]">Lead Score</p>
                <p className="mt-1 text-[18px] font-semibold text-[#0891B2] dark:text-[#22D3EE]">
                  {activeContact.leadScore}
                </p>
              </div>
              <div className="p-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px]">
                <p className="text-[11px] text-[#6B7280]">Est. LTV</p>
                <p className="mt-1 text-[18px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                  ${activeContact.ltv.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px]">
                <p className="text-[11px] text-[#6B7280]">Status</p>
                <div className="mt-1.5">
                  <StatusBadge
                    tone={
                      activeThread.status === 'resolved'
                        ? 'emerald'
                        : activeThread.status === 'snoozed'
                        ? 'orange'
                        : 'cyan'
                    }
                  >
                    {activeThread.status}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px] space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280] flex items-center gap-1.5">
                <Building2 size={12} strokeWidth={1.5} /> Account Details
              </p>
              <div className="space-y-1 text-[#4B5563] dark:text-[#D1D5DB]">
                <p><span className="text-[#6B7280]">Email:</span> {activeContact.email}</p>
                <p className="font-mono text-[11px]"><span className="font-sans text-[12px] text-[#6B7280]">Handle:</span> {activeContact.handle}</p>
                <p><span className="text-[#6B7280]">Lifecycle:</span> {activeContact.lifecycleStage}</p>
              </div>
            </div>

            {linkedDeal && (
              <div className="p-3.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px] space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280] flex items-center gap-1.5">
                  <Briefcase size={12} strokeWidth={1.5} /> Linked Deal
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">{linkedDeal.title}</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ${linkedDeal.value.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-[#6B7280] tabular-nums">
                  {linkedDeal.stage.replace('_', ' ')} · {linkedDeal.probability}% · Close {linkedDeal.expectedCloseDate}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280] flex items-center gap-1.5">
                <Tag size={12} strokeWidth={1.5} /> CRM Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {activeContact.tags.length === 0 ? (
                  <span className="text-[#6B7280]">No tags applied yet.</span>
                ) : (
                  activeContact.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-[#F3F4F6] dark:bg-white/[0.06] border border-[#E5E7EB] dark:border-white/[0.08] text-[11px] text-[#4B5563] dark:text-[#D1D5DB]"
                    >
                      {tag}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B7280]">
                Recent Interactions ({activeContact.interactionHistory.length})
              </p>
              <div className="space-y-2">
                {activeContact.interactionHistory.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-white dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#6B7280] mb-1">
                      <span className="uppercase font-medium">{item.type}</span>
                      <span className="font-mono tabular-nums">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[#4B5563] dark:text-[#D1D5DB]">{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </InspectorDrawer>
    </div>
  );
}
