import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Sparkles,
  Download,
  X,
  MessageSquare,
  Kanban,
  Table as TableIcon,
  ArrowRight,
} from 'lucide-react';
import { Contact, Deal, DealStage, Platform } from '../../types';
import { aiService } from '../../services/aiService';
import { ALL_PLATFORMS, PLATFORM_META, PlatformTag, ContactAvatar } from '../common/PlatformMeta';

interface SocialCRMProps {
  workspaceId: string;
  contacts: Contact[];
  deals: Deal[];
  selectedContactId?: string;
  onUpdateContact: (contact: Contact) => void;
  onAddContact: (contact: Contact) => void;
  onUpdateDeal: (deal: Deal) => void;
  onAddDeal: (deal: Deal) => void;
  onOpenInboxForContact: (contactId: string) => void;
  onToast: (title: string, description?: string) => void;
}

const STAGES: { id: DealStage; label: string; prob: number }[] = [
  { id: 'new_lead', label: 'New Lead', prob: 35 },
  { id: 'qualified', label: 'Qualified', prob: 60 },
  { id: 'proposal_sent', label: 'Proposal Sent', prob: 80 },
  { id: 'won', label: 'Closed Won', prob: 100 },
  { id: 'lost', label: 'Lost', prob: 0 },
];

export function SocialCRM({
  workspaceId,
  contacts,
  deals,
  selectedContactId,
  onUpdateContact,
  onAddContact,
  onUpdateDeal,
  onAddDeal,
  onOpenInboxForContact,
  onToast,
}: SocialCRMProps) {
  const wsContacts = useMemo(
    () => contacts.filter((c) => c.workspaceId === workspaceId),
    [contacts, workspaceId]
  );
  const wsDeals = useMemo(
    () => deals.filter((d) => d.workspaceId === workspaceId),
    [deals, workspaceId]
  );

  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [drawerContactId, setDrawerContactId] = useState<string | null>(selectedContactId || null);
  const [dragDealId, setDragDealId] = useState<string | null>(null);

  const [aiScoreLoading, setAiScoreLoading] = useState(false);
  const [aiLeadInsight, setAiLeadInsight] = useState<{
    score: number;
    reasoning: string;
    nextBestAction: string;
    followUpMessage: string;
  } | null>(null);

  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    handle: '',
    title: '',
    company: '',
    email: '',
    platform: 'linkedin' as Platform,
    ltv: 4800,
    notes: '',
  });

  const [showAddDeal, setShowAddDeal] = useState(false);
  const [dealForm, setDealForm] = useState({
    title: '',
    contactId: wsContacts[0]?.id || '',
    value: 6000,
    stage: 'qualified' as DealStage,
    expectedCloseDate: '2026-12-15',
  });

  useEffect(() => {
    if (selectedContactId) {
      setDrawerContactId(selectedContactId);
      setAiLeadInsight(null);
    }
  }, [selectedContactId]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wsContacts.filter((c) => {
      const matchesQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));
      const matchesStage = stageFilter === 'all' || c.lifecycleStage === stageFilter;
      return matchesQ && matchesStage;
    });
  }, [wsContacts, search, stageFilter]);

  const drawerContact = useMemo(
    () => wsContacts.find((c) => c.id === drawerContactId) || null,
    [wsContacts, drawerContactId]
  );

  const drawerDeal = useMemo(
    () => (drawerContact ? wsDeals.find((d) => d.contactId === drawerContact.id) || null : null),
    [drawerContact, wsDeals]
  );

  const pipelineMetrics = useMemo(() => {
    const total = wsDeals.reduce((sum, d) => sum + d.value, 0);
    const won = wsDeals.filter((d) => d.stage === 'won').reduce((sum, d) => sum + d.value, 0);
    const weighted = wsDeals.reduce((sum, d) => sum + Math.round((d.value * d.probability) / 100), 0);
    return { total, won, weighted };
  }, [wsDeals]);

  const handleMoveDealStage = (deal: Deal, newStage: DealStage) => {
    const meta = STAGES.find((s) => s.id === newStage);
    onUpdateDeal({
      ...deal,
      stage: newStage,
      probability: meta?.prob ?? deal.probability,
    });
    onToast('Deal Stage Updated', `${deal.title} moved to ${meta?.label || newStage}.`);
  };

  const handleRunAiScore = async () => {
    if (!drawerContact) return;
    setAiScoreLoading(true);
    try {
      const res = await aiService.scoreLead(drawerContact);
      setAiLeadInsight(res);
      onUpdateContact({
        ...drawerContact,
        leadScore: res.score,
      });
      onToast('AI Lead Score Updated', `${drawerContact.name} scored ${res.score}/100.`);
    } finally {
      setAiScoreLoading(false);
    }
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim()) return;
    const newContact: Contact = {
      id: `c-${Date.now()}`,
      workspaceId,
      name: contactForm.name.trim(),
      handle: contactForm.handle.trim() || `@${contactForm.name.trim().toLowerCase().replace(/\s+/g, '_')}`,
      title: contactForm.title.trim() || 'Decision Maker',
      company: contactForm.company.trim() || 'Independent',
      email: contactForm.email.trim() || 'contact@company.com',
      avatar: '',
      platforms: [contactForm.platform],
      leadScore: 65,
      ltv: Number(contactForm.ltv) || 0,
      lifecycleStage: 'Lead',
      tags: [PLATFORM_META[contactForm.platform].label, 'New Contact'],
      interactionHistory: [],
      notes: contactForm.notes.trim(),
    };
    onAddContact(newContact);
    onToast('Contact Added', `${newContact.name} saved to Social CRM.`);
    setShowAddContact(false);
    setContactForm({ name: '', handle: '', title: '', company: '', email: '', platform: 'linkedin', ltv: 4800, notes: '' });
  };

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealForm.title.trim()) return;
    const stageMeta = STAGES.find((s) => s.id === dealForm.stage);
    const targetContactId = dealForm.contactId || wsContacts[0]?.id || '';
    const newDeal: Deal = {
      id: `d-${Date.now()}`,
      workspaceId,
      contactId: targetContactId,
      title: dealForm.title.trim(),
      value: Number(dealForm.value) || 0,
      stage: dealForm.stage,
      probability: stageMeta?.prob ?? 50,
      expectedCloseDate: dealForm.expectedCloseDate,
    };
    onAddDeal(newDeal);
    onToast('Deal Created', `${newDeal.title} ($${newDeal.value.toLocaleString()}) added to pipeline.`);
    setShowAddDeal(false);
    setDealForm({ title: '', contactId: wsContacts[0]?.id || '', value: 6000, stage: 'qualified', expectedCloseDate: '2026-12-15' });
  };

  const handleExportContactsCsv = () => {
    const rows = [
      ['Name', 'Handle', 'Company', 'Email', 'Stage', 'Lead Score', 'LTV'],
      ...filteredContacts.map((c) => [c.name, c.handle, c.company || '', c.email, c.lifecycleStage, String(c.leadScore), String(c.ltv)]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'socialifyai-contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
    onToast('Contacts Exported', `Exported ${filteredContacts.length} CRM contacts.`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Top Toolbar */}
      <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-4 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Social CRM & Deal Pipeline</h1>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500 tabular-nums">
              <span>Pipeline: <strong className="text-slate-900 dark:text-white">${pipelineMetrics.total.toLocaleString()}</strong></span>
              <span>· Weighted Forecast: <strong className="text-[#4F46E5] dark:text-indigo-400">${pipelineMetrics.weighted.toLocaleString()}</strong></span>
              <span>· Closed Won: <strong className="text-emerald-600">${pipelineMetrics.won.toLocaleString()}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setView('kanban')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${
                  view === 'kanban' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Kanban size={14} /> Pipeline
              </button>
              <button
                onClick={() => setView('table')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${
                  view === 'table' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <TableIcon size={14} /> Contacts ({wsContacts.length})
              </button>
            </div>

            <button
              onClick={handleExportContactsCsv}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Download size={14} /> Export
            </button>

            <button
              onClick={() => setShowAddContact(true)}
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Contact
            </button>

            <button
              onClick={() => setShowAddDeal(true)}
              className="px-3.5 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
            >
              <Plus size={14} /> New Deal
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts, companies, tags..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#4F46E5]"
            />
          </div>

          {view === 'table' && (
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="all">All Lifecycle Stages</option>
              <option value="Lead">Lead</option>
              <option value="Qualified">Qualified</option>
              <option value="Proposal">Proposal</option>
              <option value="Customer">Customer</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 custom-scrollbar">
        {view === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 min-w-[920px]">
            {STAGES.map((stage) => {
              const stageDeals = wsDeals.filter((d) => {
                if (d.stage !== stage.id) return false;
                if (!search.trim()) return true;
                const contact = wsContacts.find((c) => c.id === d.contactId);
                const q = search.toLowerCase();
                return (
                  d.title.toLowerCase().includes(q) ||
                  (contact?.name || '').toLowerCase().includes(q) ||
                  (contact?.company || '').toLowerCase().includes(q)
                );
              });
              const stageSum = stageDeals.reduce((sum, d) => sum + d.value, 0);

              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragDealId) {
                      const target = wsDeals.find((d) => d.id === dragDealId);
                      if (target && target.stage !== stage.id) {
                        handleMoveDealStage(target, stage.id);
                      }
                      setDragDealId(null);
                    }
                  }}
                  className="bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col min-h-[420px]"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{stage.label}</p>
                      <p className="text-[11px] font-semibold text-slate-500 tabular-nums">
                        {stageDeals.length} deals · ${stageSum.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {stageDeals.map((deal) => {
                      const contact = wsContacts.find((c) => c.id === deal.contactId);
                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={() => setDragDealId(deal.id)}
                          className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 hover:border-[#4F46E5] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer"
                          onClick={() => contact && setDrawerContactId(contact.id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                              ${deal.value.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                              {deal.probability}% prob
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-100">{deal.title}</p>
                          {contact && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <ContactAvatar name={contact.name} src={contact.avatar} size="xs" />
                              <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                {contact.name} · {contact.company}
                              </span>
                            </div>
                          )}
                          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400 tabular-nums">Close {deal.expectedCloseDate}</span>
                            <select
                              aria-label="Move deal stage"
                              value={deal.stage}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleMoveDealStage(deal, e.target.value as DealStage)}
                              className="text-[10px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-700 dark:text-slate-300 outline-none"
                            >
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5 font-semibold">Contact</th>
                    <th className="py-3 px-5 font-semibold">Company</th>
                    <th className="py-3 px-5 font-semibold">Channels</th>
                    <th className="py-3 px-5 font-semibold">Stage</th>
                    <th className="py-3 px-5 font-semibold text-right">Lead Score</th>
                    <th className="py-3 px-5 font-semibold text-right">Est. LTV</th>
                    <th className="py-3 px-5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                  {filteredContacts.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setDrawerContactId(c.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <ContactAvatar name={c.name} src={c.avatar} size="sm" />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                            <p className="text-[11px] text-slate-500">{c.handle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                        <p className="font-medium">{c.company}</p>
                        <p className="text-[11px] text-slate-500">{c.title}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex flex-wrap gap-2">
                          {c.platforms.map((pl) => (
                            <PlatformTag key={pl} platform={pl} showFull={false} />
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">{c.lifecycleStage}</td>
                      <td className="py-3.5 px-5 text-right font-bold text-[#4F46E5] dark:text-indigo-400">{c.leadScore}/100</td>
                      <td className="py-3.5 px-5 text-right font-bold text-slate-900 dark:text-white">${c.ltv.toLocaleString()}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInboxForContact(c.id);
                          }}
                          className="text-[#4F46E5] dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          Message <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Contact Slide-Over Drawer */}
      {drawerContact && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ContactAvatar name={drawerContact.name} src={drawerContact.avatar} size="md" />
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">{drawerContact.name}</h3>
                <p className="text-xs text-slate-500">
                  {drawerContact.title} · {drawerContact.company}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDrawerContactId(null)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            <div className="flex gap-2">
              <button
                onClick={() => onOpenInboxForContact(drawerContact.id)}
                className="flex-1 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <MessageSquare size={14} /> Open in Inbox
              </button>
              <button
                onClick={handleRunAiScore}
                disabled={aiScoreLoading}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-white flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} className="text-[#4F46E5]" />
                {aiScoreLoading ? 'Scoring...' : 'AI Lead Score'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-[10px] font-semibold uppercase text-slate-400">Score</p>
                <p className="mt-1 font-display text-lg font-extrabold text-[#4F46E5] dark:text-indigo-400 tabular-nums">
                  {drawerContact.leadScore}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-[10px] font-semibold uppercase text-slate-400">LTV</p>
                <p className="mt-1 font-display text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                  ${drawerContact.ltv.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-[10px] font-semibold uppercase text-slate-400">Stage</p>
                <select
                  value={drawerContact.lifecycleStage}
                  onChange={(e) => {
                    const nextStage = e.target.value as Contact['lifecycleStage'];
                    onUpdateContact({
                      ...drawerContact,
                      lifecycleStage: nextStage,
                    });
                    onToast('Lifecycle Stage Updated', `${drawerContact.name} moved to ${nextStage}.`);
                  }}
                  className="mt-1 w-full bg-transparent font-bold text-slate-900 dark:text-white outline-none text-xs"
                >
                  <option value="Lead">Lead</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Customer">Customer</option>
                  <option value="Advocate">Advocate</option>
                </select>
              </div>
            </div>

            {aiLeadInsight && (
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-lg space-y-2 text-xs">
                <p className="font-bold text-[#4F46E5] dark:text-indigo-400">AI Lead Intelligence ({aiLeadInsight.score}/100)</p>
                <p className="text-slate-700 dark:text-slate-200">{aiLeadInsight.reasoning}</p>
                <p className="font-semibold text-slate-900 dark:text-white">Next Best Action: {aiLeadInsight.nextBestAction}</p>
                <p className="p-2 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-800 rounded text-[11px] text-slate-600 dark:text-slate-300">
                  Suggested DM: “{aiLeadInsight.followUpMessage}”
                </p>
              </div>
            )}

            {drawerDeal && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{drawerDeal.title}</span>
                  <span className="font-bold text-[#4F46E5] dark:text-indigo-400 tabular-nums">${drawerDeal.value.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Pipeline Stage</span>
                  <select
                    value={drawerDeal.stage}
                    onChange={(e) => handleMoveDealStage(drawerDeal, e.target.value as DealStage)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold outline-none"
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Editable Notes
              </label>
              <textarea
                rows={4}
                value={drawerContact.notes}
                onChange={(e) => onUpdateContact({ ...drawerContact, notes: e.target.value })}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Social Interaction History ({drawerContact.interactionHistory.length})
              </p>
              <div className="space-y-2">
                {drawerContact.interactionHistory.length === 0 ? (
                  <p className="text-xs text-slate-500">No recorded interactions yet.</p>
                ) : (
                  drawerContact.interactionHistory.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold uppercase">{item.platform || 'social'} · {item.type}</span>
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200">{item.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowAddContact(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Add CRM Contact</h3>
              <button onClick={() => setShowAddContact(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateContact} className="mt-4 space-y-3 text-xs">
              <input
                required
                placeholder="Full Name"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  placeholder="Company"
                  value={contactForm.company}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
                <input
                  placeholder="Role / Title"
                  value={contactForm.title}
                  onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  placeholder="@handle"
                  value={contactForm.handle}
                  onChange={(e) => setContactForm({ ...contactForm, handle: e.target.value })}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
                <select
                  value={contactForm.platform}
                  onChange={(e) => setContactForm({ ...contactForm, platform: e.target.value as Platform })}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                >
                  {ALL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_META[p].label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="email"
                placeholder="Email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
              />
              <textarea
                rows={2}
                placeholder="CRM notes..."
                value={contactForm.notes}
                onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
              />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddContact(false)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold">
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg font-semibold">
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Deal Modal */}
      {showAddDeal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setShowAddDeal(false)} />
          <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Create Pipeline Deal</h3>
              <button onClick={() => setShowAddDeal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateDeal} className="mt-4 space-y-3 text-xs">
              <input
                required
                placeholder="Deal Title (e.g. Acme Growth Expansion)"
                value={dealForm.title}
                onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
              />
              <select
                value={dealForm.contactId}
                onChange={(e) => setDealForm({ ...dealForm, contactId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
              >
                {wsContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.company})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  placeholder="Value ($)"
                  value={dealForm.value}
                  onChange={(e) => setDealForm({ ...dealForm, value: Number(e.target.value) })}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none tabular-nums"
                />
                <select
                  value={dealForm.stage}
                  onChange={(e) => setDealForm({ ...dealForm, stage: e.target.value as DealStage })}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                >
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="date"
                value={dealForm.expectedCloseDate}
                onChange={(e) => setDealForm({ ...dealForm, expectedCloseDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
              />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddDeal(false)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold">
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg font-semibold">
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
