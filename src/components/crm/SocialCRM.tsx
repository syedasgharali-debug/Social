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
  BarChart3,
  Pencil,
  Trash2,
  Check,
  Copy,
  Calendar,
  Tag,
  Send,
  Briefcase,
  Building2,
  Mail,
  ArrowUpDown,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Contact, Deal, DealStage, Interaction, Platform } from '../../types';
import { aiService } from '../../services/aiService';
import { ALL_PLATFORMS, PLATFORM_META, SocialLogo, ContactAvatar } from '../common/PlatformMeta';

interface SocialCRMProps {
  workspaceId: string;
  contacts: Contact[];
  deals: Deal[];
  selectedContactId?: string;
  onUpdateContact: (contact: Contact) => void;
  onAddContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onBulkUpdateContacts: (ids: string[], updater: (contact: Contact) => Contact) => void;
  onUpdateDeal: (deal: Deal) => void;
  onAddDeal: (deal: Deal) => void;
  onDeleteDeal: (id: string) => void;
  onOpenInboxForContact: (contactId: string) => void;
  onToast: (title: string, description?: string) => void;
}

const STAGES: { id: DealStage; label: string; prob: number; accent: string; dot: string }[] = [
  { id: 'new_lead', label: 'New Lead', prob: 35, accent: 'text-slate-700 dark:text-slate-200', dot: 'bg-slate-400' },
  { id: 'qualified', label: 'Qualified', prob: 60, accent: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
  { id: 'proposal_sent', label: 'Proposal Sent', prob: 80, accent: 'text-[#4F46E5] dark:text-indigo-400', dot: 'bg-[#4F46E5]' },
  { id: 'won', label: 'Closed Won', prob: 100, accent: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  { id: 'lost', label: 'Lost', prob: 0, accent: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
];

const LIFECYCLE_STAGES: Contact['lifecycleStage'][] = [
  'Lead',
  'Qualified',
  'Proposal',
  'Customer',
  'Advocate',
];

function csvEscape(value: string | number | undefined | null): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function defaultCloseDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  return d.toISOString().slice(0, 10);
}

function isOverdue(deal: Deal): boolean {
  if (deal.stage === 'won' || deal.stage === 'lost') return false;
  if (!deal.expectedCloseDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return deal.expectedCloseDate < today;
}

export function SocialCRM({
  workspaceId,
  contacts,
  deals,
  selectedContactId,
  onUpdateContact,
  onAddContact,
  onDeleteContact,
  onBulkUpdateContacts,
  onUpdateDeal,
  onAddDeal,
  onDeleteDeal,
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

  const [view, setView] = useState<'kanban' | 'table' | 'analytics'>('kanban');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [sortBy, setSortBy] = useState<'leadScore' | 'ltv' | 'dealValue' | 'name'>('leadScore');

  const [drawerContactId, setDrawerContactId] = useState<string | null>(selectedContactId || null);
  const [dragDealId, setDragDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  // Bulk selection state (Contacts table)
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [bulkTagInput, setBulkTagInput] = useState('');

  // Drawer inline edit + tag + interaction logger state
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [confirmDeleteContactId, setConfirmDeleteContactId] = useState<string | null>(null);
  const [editContactForm, setEditContactForm] = useState({
    name: '',
    handle: '',
    title: '',
    company: '',
    email: '',
    ltv: 0,
    leadScore: 50,
    platforms: ['linkedin'] as Platform[],
  });
  const [newTagInput, setNewTagInput] = useState('');
  const [activityType, setActivityType] = useState<Interaction['type']>('dm');
  const [activityPlatform, setActivityPlatform] = useState<Platform>('linkedin');
  const [activityContent, setActivityContent] = useState('');

  // AI Lead Intelligence state
  const [aiScoreLoading, setAiScoreLoading] = useState(false);
  const [aiLeadInsight, setAiLeadInsight] = useState<{
    score: number;
    reasoning: string;
    nextBestAction: string;
    followUpMessage: string;
  } | null>(null);
  const [copiedDm, setCopiedDm] = useState(false);

  // Add Contact modal state
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    handle: '',
    title: '',
    company: '',
    email: '',
    platforms: ['linkedin'] as Platform[],
    lifecycleStage: 'Lead' as Contact['lifecycleStage'],
    ltv: 4800,
    notes: '',
  });

  // Create / Edit Deal modal state
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [dealForm, setDealForm] = useState({
    title: '',
    contactId: '',
    value: 6000,
    stage: 'qualified' as DealStage,
    probability: 60,
    expectedCloseDate: defaultCloseDate(),
  });

  // Keep workspace-scoped selection & drawer clean on workspace switch
  useEffect(() => {
    setSelectedContactIds([]);
    setConfirmDeleteContactId(null);
    setIsEditingContact(false);
    setAiLeadInsight(null);
    if (drawerContactId && !wsContacts.some((c) => c.id === drawerContactId)) {
      setDrawerContactId(null);
    }
  }, [workspaceId, wsContacts, drawerContactId]);

  useEffect(() => {
    if (selectedContactId && wsContacts.some((c) => c.id === selectedContactId)) {
      setDrawerContactId(selectedContactId);
      setAiLeadInsight(null);
      setIsEditingContact(false);
    }
  }, [selectedContactId, wsContacts]);

  // Helper: map contactId -> all deals for that contact
  const dealsByContactId = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const d of wsDeals) {
      const list = map.get(d.contactId) || [];
      list.push(d);
      map.set(d.contactId, list);
    }
    return map;
  }, [wsDeals]);

  const drawerContact = useMemo(
    () => wsContacts.find((c) => c.id === drawerContactId) || null,
    [wsContacts, drawerContactId]
  );

  const drawerDeals = useMemo(
    () => (drawerContact ? dealsByContactId.get(drawerContact.id) || [] : []),
    [drawerContact, dealsByContactId]
  );

  // Sync edit form whenever opening or switching drawer contact
  useEffect(() => {
    if (!drawerContact) return;
    setEditContactForm({
      name: drawerContact.name,
      handle: drawerContact.handle,
      title: drawerContact.title || '',
      company: drawerContact.company || '',
      email: drawerContact.email,
      ltv: drawerContact.ltv,
      leadScore: drawerContact.leadScore,
      platforms: drawerContact.platforms.length > 0 ? drawerContact.platforms : ['linkedin'],
    });
    setActivityPlatform(drawerContact.platforms[0] || 'linkedin');
    setConfirmDeleteContactId(null);
  }, [drawerContact]);

  // Mathematically accurate CRM pipeline metrics
  const pipelineMetrics = useMemo(() => {
    const openDeals = wsDeals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');
    const wonDeals = wsDeals.filter((d) => d.stage === 'won');
    const lostDeals = wsDeals.filter((d) => d.stage === 'lost');

    const openPipeline = openDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedForecast = openDeals.reduce(
      (sum, d) => sum + Math.round((d.value * d.probability) / 100),
      0
    );
    const closedWon = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const decidedCount = wonDeals.length + lostDeals.length;
    const winRate =
      decidedCount > 0
        ? Math.round((wonDeals.length / decidedCount) * 100)
        : wsDeals.length > 0
        ? Math.round((wonDeals.length / wsDeals.length) * 100)
        : 0;
    const activeDealsCount = openDeals.length + wonDeals.length;
    const avgDealSize =
      activeDealsCount > 0 ? Math.round((openPipeline + closedWon) / activeDealsCount) : 0;

    return {
      openPipeline,
      weightedForecast,
      closedWon,
      winRate,
      avgDealSize,
      openCount: openDeals.length,
      wonCount: wonDeals.length,
      lostCount: lostDeals.length,
    };
  }, [wsDeals]);

  // Filtered & sorted contacts
  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = wsContacts.filter((c) => {
      const matchesQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.title || '').toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));
      const matchesStage = stageFilter === 'all' || c.lifecycleStage === stageFilter;
      const matchesPlatform =
        platformFilter === 'all' || c.platforms.includes(platformFilter);
      return matchesQ && matchesStage && matchesPlatform;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'ltv') return b.ltv - a.ltv;
      if (sortBy === 'dealValue') {
        const aVal = (dealsByContactId.get(a.id) || []).reduce((s, d) => s + d.value, 0);
        const bVal = (dealsByContactId.get(b.id) || []).reduce((s, d) => s + d.value, 0);
        return bVal - aVal;
      }
      return b.leadScore - a.leadScore;
    });
  }, [wsContacts, search, stageFilter, platformFilter, sortBy, dealsByContactId]);

  // Filtered deals (Kanban)
  const filteredDeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wsDeals.filter((d) => {
      const contact = wsContacts.find((c) => c.id === d.contactId);
      const matchesPlatform =
        platformFilter === 'all' ||
        Boolean(contact?.platforms.includes(platformFilter));
      if (!matchesPlatform) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        (contact?.name || '').toLowerCase().includes(q) ||
        (contact?.company || '').toLowerCase().includes(q) ||
        (contact?.email || '').toLowerCase().includes(q) ||
        (contact?.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [wsDeals, wsContacts, search, platformFilter]);

  // Revenue attribution by social channel (Analytics view)
  const channelAttribution = useMemo(() => {
    const stats = new Map<
      Platform,
      { platform: Platform; dealsCount: number; openValue: number; wonValue: number; contactsCount: number }
    >();

    for (const c of wsContacts) {
      for (const p of c.platforms) {
        const existing = stats.get(p) || {
          platform: p,
          dealsCount: 0,
          openValue: 0,
          wonValue: 0,
          contactsCount: 0,
        };
        existing.contactsCount += 1;
        stats.set(p, existing);
      }
    }

    for (const d of wsDeals) {
      const contact = wsContacts.find((c) => c.id === d.contactId);
      const primaryPlatform = contact?.platforms[0];
      if (!primaryPlatform) continue;
      const existing = stats.get(primaryPlatform) || {
        platform: primaryPlatform,
        dealsCount: 0,
        openValue: 0,
        wonValue: 0,
        contactsCount: 0,
      };
      existing.dealsCount += 1;
      if (d.stage === 'won') {
        existing.wonValue += d.value;
      } else if (d.stage !== 'lost') {
        existing.openValue += d.value;
      }
      stats.set(primaryPlatform, existing);
    }

    return Array.from(stats.values()).sort(
      (a, b) => b.wonValue + b.openValue - (a.wonValue + a.openValue)
    );
  }, [wsContacts, wsDeals]);

  // Synchronized deal stage move + automatic contact lifecycle sync
  const handleMoveDealStage = (deal: Deal, newStage: DealStage) => {
    const meta = STAGES.find((s) => s.id === newStage);
    const updatedDeal: Deal = {
      ...deal,
      stage: newStage,
      probability: meta?.prob ?? deal.probability,
    };
    onUpdateDeal(updatedDeal);

    // Sync linked contact lifecycle & LTV cleanly so pipeline and contacts never diverge
    const linkedContact = wsContacts.find((c) => c.id === deal.contactId);
    if (linkedContact) {
      let nextLifecycle = linkedContact.lifecycleStage;
      let nextLtv = linkedContact.ltv;

      if (newStage === 'won') {
        nextLifecycle = linkedContact.lifecycleStage === 'Advocate' ? 'Advocate' : 'Customer';
        const wonSum = wsDeals
          .map((d) => (d.id === deal.id ? updatedDeal : d))
          .filter((d) => d.contactId === linkedContact.id && d.stage === 'won')
          .reduce((sum, d) => sum + d.value, 0);
        if (wonSum > nextLtv) nextLtv = wonSum;
      } else if (newStage === 'proposal_sent' && (nextLifecycle === 'Lead' || nextLifecycle === 'Qualified')) {
        nextLifecycle = 'Proposal';
      } else if (newStage === 'qualified' && nextLifecycle === 'Lead') {
        nextLifecycle = 'Qualified';
      }

      if (nextLifecycle !== linkedContact.lifecycleStage || nextLtv !== linkedContact.ltv) {
        onUpdateContact({
          ...linkedContact,
          lifecycleStage: nextLifecycle,
          ltv: nextLtv,
        });
      }
    }

    onToast(
      'Deal Stage Updated',
      `${deal.title} moved to ${meta?.label || newStage}${
        newStage === 'won' && linkedContact ? ` · ${linkedContact.name} promoted to Customer` : ''
      }.`
    );
  };

  const openNewDealModal = (presetStage: DealStage = 'qualified', presetContactId?: string) => {
    const stageMeta = STAGES.find((s) => s.id === presetStage);
    setEditingDeal(null);
    setDealForm({
      title: '',
      contactId: presetContactId || wsContacts[0]?.id || '',
      value: 6000,
      stage: presetStage,
      probability: stageMeta?.prob ?? 60,
      expectedCloseDate: defaultCloseDate(),
    });
    setShowDealModal(true);
  };

  const openEditDealModal = (deal: Deal) => {
    setEditingDeal(deal);
    setDealForm({
      title: deal.title,
      contactId: deal.contactId,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      expectedCloseDate: deal.expectedCloseDate,
    });
    setShowDealModal(true);
  };

  const handleSaveDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealForm.title.trim()) return;

    const targetContactId = dealForm.contactId || wsContacts[0]?.id || '';
    if (editingDeal) {
      const updated: Deal = {
        ...editingDeal,
        title: dealForm.title.trim(),
        contactId: targetContactId,
        value: Math.max(0, Number(dealForm.value) || 0),
        stage: dealForm.stage,
        probability: Math.min(100, Math.max(0, Number(dealForm.probability) || 0)),
        expectedCloseDate: dealForm.expectedCloseDate || defaultCloseDate(),
      };
      onUpdateDeal(updated);
      if (updated.stage !== editingDeal.stage && updated.stage === 'won') {
        const linkedContact = wsContacts.find((c) => c.id === updated.contactId);
        if (linkedContact && linkedContact.lifecycleStage !== 'Customer' && linkedContact.lifecycleStage !== 'Advocate') {
          onUpdateContact({
            ...linkedContact,
            lifecycleStage: 'Customer',
            ltv: Math.max(linkedContact.ltv, updated.value),
          });
        }
      }
      onToast('Deal Updated', `Saved changes to "${updated.title}" ($${updated.value.toLocaleString()}).`);
    } else {
      const newDeal: Deal = {
        id: `d-${Date.now()}`,
        workspaceId,
        contactId: targetContactId,
        title: dealForm.title.trim(),
        value: Math.max(0, Number(dealForm.value) || 0),
        stage: dealForm.stage,
        probability: Math.min(100, Math.max(0, Number(dealForm.probability) || 0)),
        expectedCloseDate: dealForm.expectedCloseDate || defaultCloseDate(),
      };
      onAddDeal(newDeal);
      if (newDeal.stage === 'won') {
        const linkedContact = wsContacts.find((c) => c.id === newDeal.contactId);
        if (linkedContact) {
          onUpdateContact({
            ...linkedContact,
            lifecycleStage: linkedContact.lifecycleStage === 'Advocate' ? 'Advocate' : 'Customer',
            ltv: Math.max(linkedContact.ltv, newDeal.value),
          });
        }
      }
      onToast('Deal Created', `${newDeal.title} ($${newDeal.value.toLocaleString()}) added to pipeline.`);
    }

    setShowDealModal(false);
    setEditingDeal(null);
  };

  const handleDeleteDealConfirm = (deal: Deal) => {
    onDeleteDeal(deal.id);
    if (editingDeal?.id === deal.id) {
      setShowDealModal(false);
      setEditingDeal(null);
    }
    onToast('Deal Removed', `"${deal.title}" deleted from pipeline.`);
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim()) return;
    const activePlatforms = contactForm.platforms.length > 0 ? contactForm.platforms : (['linkedin'] as Platform[]);
    const cleanHandle =
      contactForm.handle.trim() ||
      `@${contactForm.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    const newContact: Contact = {
      id: `c-${Date.now()}`,
      workspaceId,
      name: contactForm.name.trim(),
      handle: cleanHandle.startsWith('@') ? cleanHandle : `@${cleanHandle}`,
      title: contactForm.title.trim() || 'Decision Maker',
      company: contactForm.company.trim() || 'Independent',
      email: contactForm.email.trim() || `${contactForm.name.trim().toLowerCase().replace(/\s+/g, '.')}@company.com`,
      avatar: '',
      platforms: activePlatforms,
      leadScore: 68,
      ltv: Math.max(0, Number(contactForm.ltv) || 0),
      lifecycleStage: contactForm.lifecycleStage,
      tags: [PLATFORM_META[activePlatforms[0]].label],
      interactionHistory: [
        {
          id: `ih-${Date.now()}`,
          type: 'dm',
          platform: activePlatforms[0],
          content: 'Contact added to Social CRM directory.',
          timestamp: new Date().toISOString(),
        },
      ],
      notes: contactForm.notes.trim(),
    };
    onAddContact(newContact);
    setDrawerContactId(newContact.id);
    onToast('Contact Added', `${newContact.name} saved to Social CRM.`);
    setShowAddContact(false);
    setContactForm({
      name: '',
      handle: '',
      title: '',
      company: '',
      email: '',
      platforms: ['linkedin'],
      lifecycleStage: 'Lead',
      ltv: 4800,
      notes: '',
    });
  };

  const handleSaveContactProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerContact || !editContactForm.name.trim()) return;
    const updated: Contact = {
      ...drawerContact,
      name: editContactForm.name.trim(),
      handle: editContactForm.handle.trim() || drawerContact.handle,
      title: editContactForm.title.trim(),
      company: editContactForm.company.trim(),
      email: editContactForm.email.trim() || drawerContact.email,
      ltv: Math.max(0, Number(editContactForm.ltv) || 0),
      leadScore: Math.min(100, Math.max(0, Number(editContactForm.leadScore) || 0)),
      platforms: editContactForm.platforms.length > 0 ? editContactForm.platforms : ['linkedin'],
    };
    onUpdateContact(updated);
    setIsEditingContact(false);
    onToast('Contact Updated', `Saved profile changes for ${updated.name}.`);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerContact || !newTagInput.trim()) return;
    const tag = newTagInput.trim();
    if (drawerContact.tags.includes(tag)) {
      setNewTagInput('');
      return;
    }
    onUpdateContact({
      ...drawerContact,
      tags: [...drawerContact.tags, tag],
    });
    setNewTagInput('');
    onToast('Tag Added', `Tagged ${drawerContact.name} with "${tag}".`);
  };

  const handleRemoveTag = (tag: string) => {
    if (!drawerContact) return;
    onUpdateContact({
      ...drawerContact,
      tags: drawerContact.tags.filter((t) => t !== tag),
    });
  };

  const handleLogActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerContact || !activityContent.trim()) return;
    const entry: Interaction = {
      id: `ih-${Date.now()}`,
      type: activityType,
      platform: activityPlatform,
      content: activityContent.trim(),
      timestamp: new Date().toISOString(),
    };
    onUpdateContact({
      ...drawerContact,
      interactionHistory: [entry, ...drawerContact.interactionHistory],
    });
    setActivityContent('');
    onToast('Activity Logged', `Recorded ${activityType.toUpperCase()} for ${drawerContact.name}.`);
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

  const handleCopyFollowUp = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedDm(true);
    setTimeout(() => setCopiedDm(false), 1800);
    onToast('Follow-Up Copied', 'Suggested outreach copied to clipboard.');
  };

  // Bulk operations for Contacts table
  const allFilteredSelected =
    filteredContacts.length > 0 && filteredContacts.every((c) => selectedContactIds.includes(c.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filteredContacts.map((c) => c.id));
    }
  };

  const toggleSelectContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkStageUpdate = (nextStage: Contact['lifecycleStage']) => {
    if (selectedContactIds.length === 0) return;
    onBulkUpdateContacts(selectedContactIds, (c) => ({ ...c, lifecycleStage: nextStage }));
    onToast('Bulk Stage Updated', `Moved ${selectedContactIds.length} contacts to ${nextStage}.`);
    setSelectedContactIds([]);
  };

  const handleBulkAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = bulkTagInput.trim();
    if (!tag || selectedContactIds.length === 0) return;
    onBulkUpdateContacts(selectedContactIds, (c) => ({
      ...c,
      tags: c.tags.includes(tag) ? c.tags : [...c.tags, tag],
    }));
    onToast('Bulk Tag Applied', `Added "${tag}" to ${selectedContactIds.length} contacts.`);
    setBulkTagInput('');
    setSelectedContactIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedContactIds.length === 0) return;
    const count = selectedContactIds.length;
    selectedContactIds.forEach((id) => onDeleteContact(id));
    if (drawerContactId && selectedContactIds.includes(drawerContactId)) {
      setDrawerContactId(null);
    }
    setSelectedContactIds([]);
    onToast('Contacts Deleted', `Removed ${count} contacts and their associated deals.`);
  };

  const handleExportCsv = () => {
    if (view === 'kanban' || view === 'analytics') {
      const rows: (string | number)[][] = [
        ['Deal Title', 'Contact', 'Company', 'Stage', 'Value ($)', 'Probability (%)', 'Weighted ($)', 'Expected Close'],
        ...filteredDeals.map((d) => {
          const contact = wsContacts.find((c) => c.id === d.contactId);
          const stageLabel = STAGES.find((s) => s.id === d.stage)?.label || d.stage;
          return [
            d.title,
            contact?.name || 'Unassigned',
            contact?.company || '',
            stageLabel,
            d.value,
            d.probability,
            Math.round((d.value * d.probability) / 100),
            d.expectedCloseDate,
          ];
        }),
      ];
      downloadCsv('socialifyai-pipeline-deals.csv', rows);
      onToast('Pipeline Exported', `Downloaded ${filteredDeals.length} deals as CSV.`);
      return;
    }

    const targets =
      selectedContactIds.length > 0
        ? filteredContacts.filter((c) => selectedContactIds.includes(c.id))
        : filteredContacts;
    const rows: (string | number)[][] = [
      ['Name', 'Handle', 'Company', 'Title', 'Email', 'Channels', 'Stage', 'Lead Score', 'Est. LTV ($)', 'Tags'],
      ...targets.map((c) => [
        c.name,
        c.handle,
        c.company || '',
        c.title || '',
        c.email,
        c.platforms.map((p) => PLATFORM_META[p].label).join('; '),
        c.lifecycleStage,
        c.leadScore,
        c.ltv,
        c.tags.join('; '),
      ]),
    ];
    downloadCsv('socialifyai-crm-contacts.csv', rows);
    onToast('Contacts Exported', `Downloaded ${targets.length} contacts as CSV.`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative bg-[#F8FAFC] dark:bg-[#090D16]">
      {/* Executive CRM Header & KPI Strip */}
      <div className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-4 shrink-0">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Social CRM &amp; Revenue Pipeline
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Track social conversations to closed revenue across every connected channel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setView('kanban')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  view === 'kanban'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Kanban size={14} /> Pipeline ({wsDeals.length})
              </button>
              <button
                type="button"
                onClick={() => setView('table')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  view === 'table'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TableIcon size={14} /> Contacts ({wsContacts.length})
              </button>
              <button
                type="button"
                onClick={() => setView('analytics')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  view === 'analytics'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 size={14} /> Forecast
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>

            <button
              type="button"
              onClick={() => setShowAddContact(true)}
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 rounded-lg text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} /> Add Contact
            </button>

            <button
              type="button"
              onClick={() => openNewDealModal('qualified')}
              className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <Plus size={14} /> New Deal
            </button>
          </div>
        </div>

        {/* Clean 4-Metric Pipeline Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="px-4 py-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Open Pipeline</p>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <p className="font-display text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                ${pipelineMetrics.openPipeline.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 tabular-nums">{pipelineMetrics.openCount} active</span>
            </div>
          </div>

          <div className="px-4 py-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Weighted Forecast</p>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <p className="font-display text-xl font-bold text-[#4F46E5] dark:text-indigo-400 tabular-nums">
                ${pipelineMetrics.weightedForecast.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500">prob-adjusted</span>
            </div>
          </div>

          <div className="px-4 py-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Closed Won</p>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <p className="font-display text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                ${pipelineMetrics.closedWon.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 tabular-nums">{pipelineMetrics.wonCount} won</span>
            </div>
          </div>

          <div className="px-4 py-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Win Rate &amp; Avg Deal</p>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <p className="font-display text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {pipelineMetrics.winRate}%
              </p>
              <span className="text-[11px] text-slate-500 tabular-nums">
                avg ${pipelineMetrics.avgDealSize.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Unified Search & Filter Row */}
        {view !== 'analytics' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  view === 'kanban'
                    ? 'Search deals, contacts, companies, tags...'
                    : 'Search contacts, email, handle, company, tags...'
                }
                className="w-full pl-9 pr-8 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-[#4F46E5]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <select
              aria-label="Filter by social channel"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
              className="px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-[#4F46E5]"
            >
              <option value="all">All Channels</option>
              {ALL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_META[p].label}
                </option>
              ))}
            </select>

            {view === 'table' && (
              <>
                <select
                  aria-label="Filter by lifecycle stage"
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-[#4F46E5]"
                >
                  <option value="all">All Lifecycle Stages</option>
                  {LIFECYCLE_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                  <ArrowUpDown size={13} className="text-slate-400" />
                  <select
                    aria-label="Sort contacts"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-transparent font-medium outline-none text-slate-800 dark:text-slate-200"
                  >
                    <option value="leadScore">Sort: Lead Score</option>
                    <option value="ltv">Sort: Est. LTV</option>
                    <option value="dealValue">Sort: Deal Pipeline</option>
                    <option value="name">Sort: Name (A–Z)</option>
                  </select>
                </div>
              </>
            )}

            {(search || platformFilter !== 'all' || stageFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPlatformFilter('all');
                  setStageFilter('all');
                }}
                className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline px-1.5"
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 overflow-auto p-6 custom-scrollbar">
        {/* VIEW 1: KANBAN PIPELINE */}
        {view === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 min-w-[960px]">
            {STAGES.map((stage) => {
              const stageDeals = filteredDeals.filter((d) => d.stage === stage.id);
              const stageSum = stageDeals.reduce((sum, d) => sum + d.value, 0);
              const stageWeighted = stageDeals.reduce(
                (sum, d) => sum + Math.round((d.value * d.probability) / 100),
                0
              );
              const isDropTarget = dragOverStage === stage.id;

              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverStage !== stage.id) setDragOverStage(stage.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverStage === stage.id) setDragOverStage(null);
                  }}
                  onDrop={() => {
                    if (dragDealId) {
                      const target = wsDeals.find((d) => d.id === dragDealId);
                      if (target && target.stage !== stage.id) {
                        handleMoveDealStage(target, stage.id);
                      }
                    }
                    setDragDealId(null);
                    setDragOverStage(null);
                  }}
                  className={`rounded-xl p-3.5 flex flex-col min-h-[460px] border transition-colors ${
                    isDropTarget
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-[#4F46E5] border-dashed'
                      : 'bg-slate-100/75 dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{stage.label}</p>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                        {stageDeals.length} {stageDeals.length === 1 ? 'deal' : 'deals'} · ${stageSum.toLocaleString()}
                      </p>
                      {stage.id !== 'won' && stage.id !== 'lost' && stageSum > 0 && (
                        <p className="text-[10px] text-slate-400 tabular-nums">
                          Weighted ${stageWeighted.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openNewDealModal(stage.id)}
                      title={`Add deal to ${stage.label}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#4F46E5] hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Stage Cards */}
                  <div className="space-y-2.5 flex-1">
                    {stageDeals.length === 0 ? (
                      <div className="h-24 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-[11px] text-slate-400">
                        Drop deal here
                      </div>
                    ) : (
                      stageDeals.map((deal) => {
                        const contact = wsContacts.find((c) => c.id === deal.contactId);
                        const overdue = isOverdue(deal);
                        return (
                          <div
                            key={deal.id}
                            draggable
                            onDragStart={() => setDragDealId(deal.id)}
                            onDragEnd={() => {
                              setDragDealId(null);
                              setDragOverStage(null);
                            }}
                            onClick={() => {
                              if (contact) {
                                setDrawerContactId(contact.id);
                                setIsEditingContact(false);
                                setAiLeadInsight(null);
                              } else {
                                openEditDealModal(deal);
                              }
                            }}
                            className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3.5 hover:border-[#4F46E5] hover:shadow-md transition-all cursor-pointer group ${
                              dragDealId === deal.id ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                                {deal.title}
                              </p>
                              <button
                                type="button"
                                aria-label="Edit deal"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDealModal(deal);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-[#4F46E5] hover:bg-slate-100 dark:hover:bg-slate-800 opacity-70 group-hover:opacity-100 shrink-0"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>

                            <div className="mt-1.5 flex items-baseline justify-between gap-2 tabular-nums">
                              <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                                ${deal.value.toLocaleString()}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {deal.probability}% prob
                              </span>
                            </div>

                            {contact ? (
                              <div className="mt-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <ContactAvatar name={contact.name} src={contact.avatar} size="xs" />
                                  <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                    {contact.name} · {contact.company}
                                  </span>
                                </div>
                                {contact.platforms[0] && (
                                  <SocialLogo platform={contact.platforms[0]} size={13} className="shrink-0" />
                                )}
                              </div>
                            ) : (
                              <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                                Unassigned contact · click to link
                              </p>
                            )}

                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                              <span
                                className={`text-[10px] tabular-nums flex items-center gap-1 ${
                                  overdue ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400'
                                }`}
                              >
                                <Calendar size={10} />
                                {overdue ? `Overdue ${deal.expectedCloseDate}` : deal.expectedCloseDate}
                              </span>
                              <select
                                aria-label="Move deal stage"
                                value={deal.stage}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleMoveDealStage(deal, e.target.value as DealStage)}
                                className="text-[10px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-700 dark:text-slate-300 outline-none focus:border-[#4F46E5]"
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
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: CONTACTS DIRECTORY */}
        {view === 'table' && (
          <div className="space-y-3">
            {/* Bulk Action Toolbar */}
            {selectedContactIds.length > 0 && (
              <div className="px-4 py-2.5 bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#4F46E5] dark:text-indigo-300 tabular-nums">
                    {selectedContactIds.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedContactIds([])}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Bulk update lifecycle stage"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkStageUpdate(e.target.value as Contact['lifecycleStage']);
                        e.target.value = '';
                      }
                    }}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="" disabled>
                      Move Stage...
                    </option>
                    {LIFECYCLE_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>

                  <form onSubmit={handleBulkAddTag} className="flex items-center gap-1">
                    <input
                      type="text"
                      value={bulkTagInput}
                      onChange={(e) => setBulkTagInput(e.target.value)}
                      placeholder="Add tag..."
                      className="w-28 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Apply
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                  >
                    Export Selected
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-3 pl-4 pr-2 w-10">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all contacts"
                          className="rounded border-slate-300 accent-[#4F46E5]"
                        />
                      </th>
                      <th className="py-3 px-4 font-semibold">Contact</th>
                      <th className="py-3 px-4 font-semibold">Company &amp; Role</th>
                      <th className="py-3 px-4 font-semibold">Channels</th>
                      <th className="py-3 px-4 font-semibold">Lifecycle Stage</th>
                      <th className="py-3 px-4 font-semibold text-right">Deals</th>
                      <th className="py-3 px-4 font-semibold text-right">Lead Score</th>
                      <th className="py-3 px-4 font-semibold text-right">Est. LTV</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                    {filteredContacts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-500">
                          No contacts match your current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredContacts.map((c) => {
                        const cDeals = dealsByContactId.get(c.id) || [];
                        const cDealValue = cDeals.reduce((sum, d) => sum + d.value, 0);
                        const checked = selectedContactIds.includes(c.id);
                        return (
                          <tr
                            key={c.id}
                            onClick={() => {
                              setDrawerContactId(c.id);
                              setIsEditingContact(false);
                              setAiLeadInsight(null);
                            }}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                              checked ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                            }`}
                          >
                            <td
                              className="py-3.5 pl-4 pr-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelectContact(c.id)}
                                aria-label={`Select ${c.name}`}
                                className="rounded border-slate-300 accent-[#4F46E5]"
                              />
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <ContactAvatar name={c.name} src={c.avatar} size="sm" />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 dark:text-white truncate">{c.name}</p>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {c.handle} · {c.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                              <p className="font-medium">{c.company || '—'}</p>
                              <p className="text-[11px] text-slate-500">{c.title || '—'}</p>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                {c.platforms.map((pl) => (
                                  <span key={pl} title={PLATFORM_META[pl].label}>
                                    <SocialLogo platform={pl} size={16} />
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td
                              className="py-3.5 px-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <select
                                aria-label={`Stage for ${c.name}`}
                                value={c.lifecycleStage}
                                onChange={(e) => {
                                  const nextStage = e.target.value as Contact['lifecycleStage'];
                                  onUpdateContact({ ...c, lifecycleStage: nextStage });
                                  onToast('Lifecycle Updated', `${c.name} moved to ${nextStage}.`);
                                }}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-[#4F46E5]"
                              >
                                {LIFECYCLE_STAGES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {cDeals.length > 0 ? (
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    ${cDealValue.toLocaleString()}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {cDeals.length} {cDeals.length === 1 ? 'deal' : 'deals'}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      c.leadScore >= 80
                                        ? 'bg-emerald-500'
                                        : c.leadScore >= 60
                                        ? 'bg-[#4F46E5]'
                                        : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${Math.min(100, c.leadScore)}%` }}
                                  />
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white w-7 text-right">
                                  {c.leadScore}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                              ${c.ltv.toLocaleString()}
                            </td>
                            <td
                              className="py-3.5 px-4 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onOpenInboxForContact(c.id)}
                                  title="Open in Unified Inbox"
                                  className="px-2 py-1 rounded-md text-[#4F46E5] dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-semibold"
                                >
                                  Inbox
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openNewDealModal('qualified', c.id)}
                                  title="Create Deal for Contact"
                                  className="px-2 py-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                >
                                  + Deal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDrawerContactId(c.id);
                                    setIsEditingContact(true);
                                  }}
                                  aria-label={`Edit ${c.name}`}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  <Pencil size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: FORECAST & SOCIAL ATTRIBUTION ANALYTICS */}
        {view === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Stage Funnel & Forecast */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Stage Breakdown &amp; Weighted Forecast
                  </h2>
                  <p className="text-xs text-slate-500">
                    Gross pipeline vs. probability-adjusted expected revenue per stage
                  </p>
                </div>
                <TrendingUp size={18} className="text-[#4F46E5]" />
              </div>

              <div className="space-y-4">
                {STAGES.map((stage) => {
                  const stageDeals = wsDeals.filter((d) => d.stage === stage.id);
                  const gross = stageDeals.reduce((sum, d) => sum + d.value, 0);
                  const weighted = stageDeals.reduce(
                    (sum, d) => sum + Math.round((d.value * d.probability) / 100),
                    0
                  );
                  const maxVal = Math.max(
                    1,
                    ...STAGES.map((s) =>
                      wsDeals.filter((d) => d.stage === s.id).reduce((sum, d) => sum + d.value, 0)
                    )
                  );
                  const pct = Math.round((gross / maxVal) * 100);

                  return (
                    <div key={stage.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                          <span className="font-semibold text-slate-900 dark:text-white">{stage.label}</span>
                          <span className="text-slate-400">· {stageDeals.length} deals</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-white">
                            ${gross.toLocaleString()}
                          </span>
                          <span className="text-slate-400 ml-2 text-[11px]">
                            (${weighted.toLocaleString()} weighted)
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${stage.dot}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Social Channel Revenue Attribution */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Social Channel Attribution
                </h2>
                <p className="text-xs text-slate-500">
                  Pipeline and closed revenue originated by social network
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {channelAttribution.length === 0 ? (
                  <p className="py-8 text-xs text-slate-500 text-center">
                    Add contacts and deals to view channel attribution.
                  </p>
                ) : (
                  channelAttribution.map((row) => (
                    <div
                      key={row.platform}
                      className="py-3 flex items-center justify-between gap-3 text-xs tabular-nums"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SocialLogo platform={row.platform} size={18} />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {PLATFORM_META[row.platform].label}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {row.contactsCount} contacts · {row.dealsCount} deals
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">
                          ${(row.openValue + row.wonValue).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          ${row.wonValue.toLocaleString()} won
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Closing Deals */}
            <div className="lg:col-span-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Upcoming Closing Deals
                  </h2>
                  <p className="text-xs text-slate-500">
                    Active deals ordered by expected close date with one-click close or edit
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openNewDealModal('proposal_sent')}
                  className="px-3 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus size={13} /> Add Deal
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-2.5 pr-4 font-semibold">Deal</th>
                      <th className="py-2.5 px-4 font-semibold">Contact</th>
                      <th className="py-2.5 px-4 font-semibold">Stage</th>
                      <th className="py-2.5 px-4 font-semibold">Close Date</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Value</th>
                      <th className="py-2.5 pl-4 font-semibold text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {wsDeals
                      .filter((d) => d.stage !== 'won' && d.stage !== 'lost')
                      .sort((a, b) => a.expectedCloseDate.localeCompare(b.expectedCloseDate))
                      .map((deal) => {
                        const contact = wsContacts.find((c) => c.id === deal.contactId);
                        const stageMeta = STAGES.find((s) => s.id === deal.stage);
                        const overdue = isOverdue(deal);
                        return (
                          <tr key={deal.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-3 pr-4 font-bold text-slate-900 dark:text-white">
                              {deal.title}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                              {contact ? `${contact.name} · ${contact.company}` : 'Unassigned'}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-200">
                              {stageMeta?.label} ({deal.probability}%)
                            </td>
                            <td className={`py-3 px-4 ${overdue ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
                              {deal.expectedCloseDate} {overdue ? '(Overdue)' : ''}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                              ${deal.value.toLocaleString()}
                            </td>
                            <td className="py-3 pl-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditDealModal(deal)}
                                  className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveDealStage(deal, 'won')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 size={11} /> Mark Won
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONTACT & DEALS SLIDE-OVER DRAWER */}
      {drawerContact && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="flex-1 bg-slate-950/40 backdrop-blur-[1px]"
            onClick={() => {
              setDrawerContactId(null);
              setIsEditingContact(false);
            }}
          />
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <ContactAvatar name={drawerContact.name} src={drawerContact.avatar} size="md" />
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                    {drawerContact.name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {drawerContact.title} · {drawerContact.company}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditingContact((prev) => !prev)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
                    isEditingContact
                      ? 'border-[#4F46E5] bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Pencil size={12} /> {isEditingContact ? 'Cancel' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerContactId(null);
                    setIsEditingContact(false);
                  }}
                  aria-label="Close contact drawer"
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Inline Edit Contact Form */}
              {isEditingContact ? (
                <form onSubmit={handleSaveContactProfile} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Full Name</label>
                      <input
                        required
                        value={editContactForm.name}
                        onChange={(e) => setEditContactForm({ ...editContactForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Company</label>
                      <input
                        value={editContactForm.company}
                        onChange={(e) => setEditContactForm({ ...editContactForm, company: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Role / Title</label>
                      <input
                        value={editContactForm.title}
                        onChange={(e) => setEditContactForm({ ...editContactForm, title: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={editContactForm.email}
                        onChange={(e) => setEditContactForm({ ...editContactForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Social Handle</label>
                      <input
                        value={editContactForm.handle}
                        onChange={(e) => setEditContactForm({ ...editContactForm, handle: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Est. LTV ($)</label>
                      <input
                        type="number"
                        min={0}
                        value={editContactForm.ltv}
                        onChange={(e) => setEditContactForm({ ...editContactForm, ltv: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none tabular-nums focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Lead Score (0–100)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editContactForm.leadScore}
                        onChange={(e) => setEditContactForm({ ...editContactForm, leadScore: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none tabular-nums focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      Connected Social Channels
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {ALL_PLATFORMS.map((pl) => {
                        const active = editContactForm.platforms.includes(pl);
                        return (
                          <button
                            key={pl}
                            type="button"
                            onClick={() => {
                              const next = active
                                ? editContactForm.platforms.filter((p) => p !== pl)
                                : [...editContactForm.platforms, pl];
                              setEditContactForm({
                                ...editContactForm,
                                platforms: next.length > 0 ? next : [pl],
                              });
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                              active
                                ? 'border-[#4F46E5] bg-indigo-50/70 dark:bg-indigo-950/50 text-slate-900 dark:text-white'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <SocialLogo platform={pl} size={13} />
                            <span className="truncate">{PLATFORM_META[pl].label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    {confirmDeleteContactId === drawerContact.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const name = drawerContact.name;
                            onDeleteContact(drawerContact.id);
                            setDrawerContactId(null);
                            setIsEditingContact(false);
                            onToast('Contact Deleted', `Removed ${name} and associated deals.`);
                          }}
                          className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteContactId(null)}
                          className="px-2.5 py-2 text-slate-500 hover:text-slate-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteContactId(drawerContact.id)}
                        className="px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-semibold flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Delete Contact
                      </button>
                    )}

                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg font-semibold"
                    >
                      Save Profile
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Quick Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenInboxForContact(drawerContact.id)}
                      className="flex-1 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageSquare size={14} /> Open in Inbox
                    </button>
                    <button
                      type="button"
                      onClick={handleRunAiScore}
                      disabled={aiScoreLoading}
                      className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                    >
                      <Sparkles size={14} className="text-[#4F46E5]" />
                      {aiScoreLoading ? 'Scoring...' : 'AI Lead Score'}
                    </button>
                  </div>

                  {/* Contact Details Line */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400" /> {drawerContact.email}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400" /> {drawerContact.company || 'Independent'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {drawerContact.platforms.map((pl) => (
                        <SocialLogo key={pl} platform={pl} size={14} />
                      ))}
                      <span>{drawerContact.handle}</span>
                    </span>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2.5 text-xs">
                    <div className="p-3 bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800 rounded-lg">
                      <p className="text-[11px] font-medium text-slate-500">Lead Score</p>
                      <p className="mt-1 font-display text-lg font-bold text-[#4F46E5] dark:text-indigo-400 tabular-nums">
                        {drawerContact.leadScore}/100
                      </p>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800 rounded-lg">
                      <p className="text-[11px] font-medium text-slate-500">Est. LTV</p>
                      <p className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                        ${drawerContact.ltv.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800 rounded-lg">
                      <p className="text-[11px] font-medium text-slate-500">Stage</p>
                      <select
                        value={drawerContact.lifecycleStage}
                        onChange={(e) => {
                          const nextStage = e.target.value as Contact['lifecycleStage'];
                          onUpdateContact({
                            ...drawerContact,
                            lifecycleStage: nextStage,
                          });
                          onToast('Lifecycle Updated', `${drawerContact.name} moved to ${nextStage}.`);
                        }}
                        className="mt-1 w-full bg-transparent font-bold text-slate-900 dark:text-white outline-none text-xs"
                      >
                        {LIFECYCLE_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* AI Lead Intelligence Output */}
                  {aiLeadInsight && (
                    <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-xl space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-[#4F46E5] dark:text-indigo-300">
                          AI Lead Intelligence · {aiLeadInsight.score}/100
                        </p>
                        <button
                          type="button"
                          onClick={() => setAiLeadInsight(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{aiLeadInsight.reasoning}</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Next best action: {aiLeadInsight.nextBestAction}
                      </p>
                      <div className="p-3 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-800 rounded-lg space-y-2">
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          “{aiLeadInsight.followUpMessage}”
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyFollowUp(aiLeadInsight.followUpMessage)}
                            className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1"
                          >
                            {copiedDm ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                            {copiedDm ? 'Copied' : 'Copy DM'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleCopyFollowUp(aiLeadInsight.followUpMessage);
                              onOpenInboxForContact(drawerContact.id);
                            }}
                            className="px-2.5 py-1 bg-[#4F46E5] text-white rounded-md text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <Send size={11} /> Copy &amp; Open Inbox
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Linked Deals Section (Shows ALL Deals for Contact) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Briefcase size={13} className="text-[#4F46E5]" /> Linked Deals ({drawerDeals.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => openNewDealModal('qualified', drawerContact.id)}
                        className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Deal
                      </button>
                    </div>

                    {drawerDeals.length === 0 ? (
                      <div className="p-3.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                        <span>No deals attached to {drawerContact.name} yet.</span>
                        <button
                          type="button"
                          onClick={() => openNewDealModal('qualified', drawerContact.id)}
                          className="font-semibold text-[#4F46E5] hover:underline"
                        >
                          Create one
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {drawerDeals.map((d) => (
                          <div
                            key={d.id}
                            className="p-3.5 bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-lg space-y-2 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">{d.title}</p>
                                <p className="text-[11px] text-slate-500 tabular-nums">
                                  Close {d.expectedCloseDate} · {d.probability}% prob
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#4F46E5] dark:text-indigo-400 tabular-nums mr-1">
                                  ${d.value.toLocaleString()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openEditDealModal(d)}
                                  aria-label="Edit deal"
                                  className="p-1 rounded text-slate-400 hover:text-[#4F46E5]"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDealConfirm(d)}
                                  aria-label="Delete deal"
                                  className="p-1 rounded text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-700">
                              <span className="text-[11px] text-slate-500">Pipeline stage</span>
                              <select
                                value={d.stage}
                                onChange={(e) => handleMoveDealStage(d, e.target.value as DealStage)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-semibold outline-none focus:border-[#4F46E5]"
                              >
                                {STAGES.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tags Manager */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Tag size={13} className="text-slate-400" /> Contact Tags
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {drawerContact.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md font-medium"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            aria-label={`Remove ${tag}`}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <form onSubmit={handleAddTag} className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="+ Add tag"
                          className="w-24 px-2 py-1 bg-transparent border-b border-slate-300 dark:border-slate-700 text-xs outline-none focus:border-[#4F46E5]"
                        />
                      </form>
                    </div>
                  </div>

                  {/* Editable CRM Notes */}
                  <div>
                    <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1.5">
                      CRM Notes
                    </label>
                    <textarea
                      rows={3}
                      value={drawerContact.notes}
                      onChange={(e) => onUpdateContact({ ...drawerContact, notes: e.target.value })}
                      placeholder="Add account context, budget signals, or renewal dates..."
                      className="w-full p-3 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-[#4F46E5]"
                    />
                  </div>

                  {/* Log New Activity + Social Interaction History */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Activity Timeline ({drawerContact.interactionHistory.length})
                    </p>

                    <form
                      onSubmit={handleLogActivity}
                      className="p-3 bg-[#F8FAFC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2 text-xs"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          aria-label="Interaction type"
                          value={activityType}
                          onChange={(e) => setActivityType(e.target.value as Interaction['type'])}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none"
                        >
                          <option value="dm">Direct Message</option>
                          <option value="email">Email Touchpoint</option>
                          <option value="comment">Post Comment</option>
                          <option value="mention">Brand Mention</option>
                        </select>
                        <select
                          aria-label="Interaction platform"
                          value={activityPlatform}
                          onChange={(e) => setActivityPlatform(e.target.value as Platform)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none"
                        >
                          {ALL_PLATFORMS.map((pl) => (
                            <option key={pl} value={pl}>
                              {PLATFORM_META[pl].label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={activityContent}
                          onChange={(e) => setActivityContent(e.target.value)}
                          placeholder="Log a call summary, DM, or touchpoint..."
                          className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-[#4F46E5]"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-md font-semibold shrink-0"
                        >
                          Log
                        </button>
                      </div>
                    </form>

                    <div className="space-y-2">
                      {drawerContact.interactionHistory.length === 0 ? (
                        <p className="text-xs text-slate-500">No recorded interactions yet.</p>
                      ) : (
                        drawerContact.interactionHistory.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs"
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                                {item.platform && <SocialLogo platform={item.platform} size={13} />}
                                {item.platform ? PLATFORM_META[item.platform].label : 'Social'} · {item.type.toUpperCase()}
                              </span>
                              <span className="tabular-nums">
                                {new Date(item.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{item.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD CONTACT MODAL */}
      {showAddContact && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setShowAddContact(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Add CRM Contact
              </h3>
              <button
                type="button"
                onClick={() => setShowAddContact(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateContact} className="mt-4 space-y-3 text-xs">
              <input
                required
                placeholder="Full Name *"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  placeholder="Company"
                  value={contactForm.company}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                />
                <input
                  placeholder="Role / Title"
                  value={contactForm.title}
                  onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="email"
                  placeholder="Work Email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                />
                <input
                  placeholder="@handle"
                  value={contactForm.handle}
                  onChange={(e) => setContactForm({ ...contactForm, handle: e.target.value })}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={contactForm.lifecycleStage}
                  onChange={(e) =>
                    setContactForm({
                      ...contactForm,
                      lifecycleStage: e.target.value as Contact['lifecycleStage'],
                    })
                  }
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                >
                  {LIFECYCLE_STAGES.map((st) => (
                    <option key={st} value={st}>
                      Stage: {st}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  placeholder="Estimated LTV ($)"
                  value={contactForm.ltv}
                  onChange={(e) => setContactForm({ ...contactForm, ltv: Number(e.target.value) })}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none tabular-nums focus:border-[#4F46E5]"
                />
              </div>
              <div>
                <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Social Channels</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {ALL_PLATFORMS.map((pl) => {
                    const selected = contactForm.platforms.includes(pl);
                    return (
                      <button
                        key={pl}
                        type="button"
                        onClick={() => {
                          const next = selected
                            ? contactForm.platforms.filter((p) => p !== pl)
                            : [...contactForm.platforms, pl];
                          setContactForm({
                            ...contactForm,
                            platforms: next.length > 0 ? next : [pl],
                          });
                        }}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 ${
                          selected
                            ? 'border-[#4F46E5] bg-indigo-50/70 dark:bg-indigo-950/50 text-slate-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <SocialLogo platform={pl} size={13} />
                        <span className="truncate">{PLATFORM_META[pl].short}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <textarea
                rows={2}
                placeholder="CRM notes..."
                value={contactForm.notes}
                onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT DEAL MODAL */}
      {showDealModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => {
              setShowDealModal(false);
              setEditingDeal(null);
            }}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {editingDeal ? 'Edit Pipeline Deal' : 'Create Pipeline Deal'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowDealModal(false);
                  setEditingDeal(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDeal} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Deal Title</label>
                <input
                  required
                  placeholder="e.g. Acme Growth Annual Plan"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Linked Contact</label>
                {wsContacts.length === 0 ? (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5">
                      <AlertCircle size={13} /> No contacts in this workspace yet.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDealModal(false);
                        setShowAddContact(true);
                      }}
                      className="font-bold underline shrink-0"
                    >
                      Add Contact
                    </button>
                  </div>
                ) : (
                  <select
                    value={dealForm.contactId}
                    onChange={(e) => setDealForm({ ...dealForm, contactId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                  >
                    {wsContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company || c.handle})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Deal Value ($)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={dealForm.value}
                    onChange={(e) => setDealForm({ ...dealForm, value: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none tabular-nums focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Probability (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={dealForm.probability}
                    onChange={(e) => setDealForm({ ...dealForm, probability: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none tabular-nums focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Stage</label>
                  <select
                    value={dealForm.stage}
                    onChange={(e) => {
                      const nextStage = e.target.value as DealStage;
                      const stageMeta = STAGES.find((s) => s.id === nextStage);
                      setDealForm({
                        ...dealForm,
                        stage: nextStage,
                        probability: stageMeta?.prob ?? dealForm.probability,
                      });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Expected Close</label>
                  <input
                    type="date"
                    value={dealForm.expectedCloseDate}
                    onChange={(e) => setDealForm({ ...dealForm, expectedCloseDate: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                {editingDeal && (
                  <button
                    type="button"
                    onClick={() => handleDeleteDealConfirm(editingDeal)}
                    className="px-3 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-semibold inline-flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
                <div className="flex gap-2 flex-1 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDealModal(false);
                      setEditingDeal(null);
                    }}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg font-semibold"
                  >
                    {editingDeal ? 'Save Changes' : 'Create Deal'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
