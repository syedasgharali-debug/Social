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
} from 'lucide-react';
import { Thread, Contact, Deal, Platform, MessageStatus } from '../../types';
import { aiService } from '../../services/aiService';
import { ALL_PLATFORMS, PLATFORM_META, PlatformTag, ContactAvatar } from '../common/PlatformMeta';

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
  onToast: (title: string, description?: string) => void;
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
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="h-full flex bg-white dark:bg-slate-900 overflow-hidden">
      {/* PANE 1: FILTER SIDEBAR */}
      <aside className="hidden md:flex w-56 border-r border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950/60 flex-col p-3.5 space-y-5 shrink-0 overflow-y-auto custom-scrollbar">
        <div>
          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Inbox Streams
          </p>
          <div className="space-y-0.5 text-xs font-semibold">
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
                  className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={14} />
                    {item.label}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums">{item.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Filter by Network
          </p>
          <div className="space-y-0.5 text-xs font-semibold">
            <button
              onClick={() => setPlatformFilter('all')}
              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                platformFilter === 'all'
                  ? 'bg-slate-900 dark:bg-[#4F46E5] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>All Networks</span>
              <span className="font-mono text-[10px]">{wsThreads.length}</span>
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
                  className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-xs"
                      style={{ backgroundColor: PLATFORM_META[p].accentHex }}
                    />
                    {PLATFORM_META[p].label}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Queue Status
          </p>
          <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold">
            {(['all', 'open', 'snoozed', 'resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`py-1.5 rounded-md capitalize border ${
                  statusFilter === st
                    ? 'border-[#4F46E5] bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* PANE 2: CONVERSATION THREAD LIST */}
      <div className="w-80 lg:w-88 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Conversations
            </h2>
            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
              {filteredThreads.length} showing
            </span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search person, company, or message..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#4F46E5]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
          {filteredThreads.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
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
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                    selected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-2 border-l-[#4F46E5]'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <ContactAvatar name={contact?.name || 'Unknown'} src={contact?.avatar} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {contact?.name || 'Unknown'}
                      </p>
                      {thread.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#4F46E5] text-white font-mono text-[10px] font-bold tabular-nums">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <PlatformTag platform={thread.platform} showFull={false} />
                      <span>· {thread.type.toUpperCase()}</span>
                      {thread.sentiment === 'urgent' && (
                        <span className="text-amber-600 font-bold">· Urgent</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-snug">
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
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-[#090D16]">
          {/* Active Header + Inline CRM Context */}
          <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ContactAvatar name={activeContact.name} src={activeContact.avatar} size="sm" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {activeContact.name}
                  </h3>
                  <PlatformTag platform={activeThread.platform} />
                  <span className="text-[11px] font-mono font-bold text-[#4F46E5] dark:text-indigo-400">
                    Lead {activeContact.leadScore}/100
                  </span>
                  {linkedDeal && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      · Deal ${linkedDeal.value.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {activeContact.title} · {activeContact.company} · {activeContact.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onOpenContactInCrm(activeContact.id)}
                className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
              >
                CRM Profile <ExternalLink size={12} />
              </button>
              <button
                onClick={handleSummarizeAndTag}
                disabled={summaryLoading}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg text-xs font-semibold text-[#4F46E5] dark:text-indigo-300 flex items-center gap-1.5"
              >
                <Sparkles size={13} /> {summaryLoading ? 'Analyzing...' : 'Summarize & Tag'}
              </button>

              {activeThread.status !== 'snoozed' && (
                <button
                  onClick={() => {
                    onUpdateThread({ ...activeThread, status: 'snoozed', unreadCount: 0 });
                    onToast('Thread Snoozed');
                  }}
                  className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1"
                >
                  <Clock size={12} /> Snooze
                </button>
              )}

              {activeThread.status !== 'resolved' ? (
                <button
                  onClick={() => {
                    onUpdateThread({ ...activeThread, status: 'resolved', unreadCount: 0 });
                    onToast('Thread Marked Resolved');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <CheckCircle2 size={12} /> Resolve
                </button>
              ) : (
                <button
                  onClick={() => {
                    onUpdateThread({ ...activeThread, status: 'open' });
                    onToast('Thread Reopened');
                  }}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Reopen
                </button>
              )}
            </div>
          </div>

          {/* AI Summary Strip */}
          {activeThread.summary && (
            <div className="px-6 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-200/70 dark:border-indigo-900 text-xs text-slate-800 dark:text-slate-200">
              <span className="font-bold text-[#4F46E5] mr-2">AI Summary:</span>
              {activeThread.summary}
            </div>
          )}

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {activeThread.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-lg rounded-2xl px-4 py-3 text-xs leading-relaxed border ${
                    msg.isInternalNote
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                      : msg.isMe
                      ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-75">
                    <span className="font-semibold">{msg.senderName}</span>
                    <span className="tabular-nums">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply & AI Smart Reply Composer */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3">
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
                    className="text-left p-2.5 bg-[#F8FAFC] dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#4F46E5]">
                      {opt.label} Smart Reply
                    </p>
                    <p className="mt-1 text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2">
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
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none resize-none ${
                  isInternalNote
                    ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                    : 'bg-[#F8FAFC] dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-[#4F46E5]'
                }`}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateAiReplies}
                    disabled={aiLoading}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-[#4F46E5] dark:text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Sparkles size={13} className="text-amber-500" />
                    {aiLoading ? 'Generating...' : 'AI Smart Reply'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsInternalNote(!isInternalNote)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                      isInternalNote
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <StickyNote size={13} /> {isInternalNote ? 'Internal Team Note' : 'Public Reply'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send size={13} /> {isInternalNote ? 'Save Team Note' : 'Send Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
          Select a conversation thread to reply.
        </div>
      )}
    </div>
  );
}
