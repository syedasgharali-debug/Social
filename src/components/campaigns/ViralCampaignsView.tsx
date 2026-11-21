import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Plus,
  ShieldAlert,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Download,
  UserPlus,
  Code2,
  Gift,
  X,
  CheckCircle2,
  Link2,
  ExternalLink,
} from 'lucide-react';
import {
  ViralCampaign,
  ViralCampaignType,
  CampaignBonusAction,
  CampaignEntry,
  Contact,
  Deal,
  Platform,
} from '../../types';
import {
  InspectorDrawer,
  KpiMetricCard,
  StatusBadge,
  EmptyStatePanel,
} from '../common/DesignPrimitives';

interface ViralCampaignsViewProps {
  workspaceId: string;
  workspaceName: string;
  campaigns: ViralCampaign[];
  maxCampaignsQuota: number;
  onOpenSettings?: () => void;
  onAddCampaign: (campaign: ViralCampaign) => void;
  onUpdateCampaign: (campaign: ViralCampaign) => void;
  onDeleteCampaign: (id: string) => void;
  onSyncEntryToCrm: (contact: Contact, deal?: Deal) => void;
  onToast: (title: string, description?: string, variant?: 'info' | 'success' | 'warning') => void;
}

type CampaignSubTab = 'builder' | 'entries' | 'roi';

const CAMPAIGN_TYPE_LABELS: Record<ViralCampaignType, string> = {
  sweepstakes: 'Sweepstakes Giveaway',
  ugc_contest: 'Photo / Video UGC Contest',
  referral_giveaway: 'Refer-a-Friend Viral Giveaway',
  instant_win: 'Instant-Win Coupon Campaign',
};

const DEFAULT_BONUS_ACTIONS: CampaignBonusAction[] = [
  { id: 'ba-ig', platform: 'instagram', label: 'Follow on Instagram', points: 2, enabled: true },
  { id: 'ba-tt', platform: 'tiktok', label: 'Follow on TikTok', points: 2, enabled: true },
  { id: 'ba-x', platform: 'x', label: 'Follow & Repost on X', points: 2, enabled: true },
  { id: 'ba-yt', platform: 'youtube', label: 'Subscribe on YouTube', points: 3, enabled: true },
  { id: 'ba-ref', platform: 'referral', label: 'Share Unique Referral Link (per friend)', points: 5, enabled: true },
  { id: 'ba-ugc', platform: 'ugc', label: 'Submit Photo / Video UGC Entry', points: 10, enabled: false },
];

export function ViralCampaignsView({
  workspaceId,
  workspaceName,
  campaigns,
  maxCampaignsQuota,
  onOpenSettings,
  onAddCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  onSyncEntryToCrm,
  onToast,
}: ViralCampaignsViewProps) {
  const wsCampaigns = useMemo(
    () => campaigns.filter((c) => c.workspaceId === workspaceId),
    [campaigns, workspaceId]
  );

  const [subTab, setSubTab] = useState<CampaignSubTab>('builder');
  const [selectedId, setSelectedId] = useState<string>(() => wsCampaigns[0]?.id || '');
  const activeCampaign = useMemo(
    () => wsCampaigns.find((c) => c.id === selectedId) || wsCampaigns[0] || null,
    [wsCampaigns, selectedId]
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [inspectedEntryId, setInspectedEntryId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const inspectedEntry = useMemo(
    () => activeCampaign?.entries.find((e) => e.id === inspectedEntryId) || null,
    [activeCampaign, inspectedEntryId]
  );

  // Interactive Live Preview widget state
  const [previewName, setPreviewName] = useState('');
  const [previewEmail, setPreviewEmail] = useState('');
  const [previewHandle, setPreviewHandle] = useState('');
  const [previewCheckedIds, setPreviewCheckedIds] = useState<string[]>([]);
  const [previewReceipt, setPreviewReceipt] = useState<{
    name: string;
    points: number;
    referralLink: string;
    fraudStatus: CampaignEntry['fraudStatus'];
  } | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'referral_giveaway' as ViralCampaignType,
    prizeTitle: '',
    prizeValueUsd: '500',
    description: '',
    embedMode: 'hosted' as 'hosted' | 'embeddable',
    accentColor: 'cyan' as 'cyan' | 'orange' | 'indigo',
    endDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().slice(0, 10);
    })(),
  });

  const [entryForm, setEntryForm] = useState({
    name: '',
    email: '',
    handle: '@',
    platform: 'instagram' as Platform,
    referralsCount: '0',
    ugcUrl: '',
    estimatedLtv: '250',
    ipFingerprint: '',
  });

  const copyText = (key: string, text: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
    onToast('Copied', label, 'info');
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.prizeTitle.trim()) return;
    if (wsCampaigns.length >= maxCampaignsQuota) {
      onToast(
        'Campaign Quota Reached',
        `Your plan allows up to ${maxCampaignsQuota} viral campaigns per workspace.`,
        'warning'
      );
      return;
    }
    const slug = form.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);

    const created: ViralCampaign = {
      id: `vc-${Date.now()}`,
      workspaceId,
      name: form.name.trim(),
      type: form.type,
      status: 'live',
      prizeTitle: form.prizeTitle.trim(),
      prizeValueUsd: Math.max(0, Number(form.prizeValueUsd) || 0),
      description:
        form.description.trim() ||
        `Enter to win ${form.prizeTitle.trim()} and earn bonus entries by sharing your unique referral link.`,
      accentColor: form.accentColor,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: form.endDate,
      embedMode: form.embedMode,
      slug: slug || `campaign-${Date.now()}`,
      bonusActions: DEFAULT_BONUS_ACTIONS.map((a) => ({
        ...a,
        enabled: a.id === 'ba-ugc' ? form.type === 'ugc_contest' : a.enabled,
      })),
      utmSource: 'socialify_viral',
      utmMedium: form.type,
      utmCampaign: slug || 'giveaway',
      pixelId: `PX-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      attributedRevenueUsd: 0,
      entries: [],
      winners: [],
      createdAt: new Date().toISOString(),
    };
    onAddCampaign(created);
    setSelectedId(created.id);
    setShowCreateModal(false);
    setForm({
      ...form,
      name: '',
      prizeTitle: '',
      description: '',
    });
    onToast('Campaign Created', `"${created.name}" is live with conversion pixel ${created.pixelId}.`, 'success');
  };

  const DISPOSABLE_EMAIL_RE = /mailinator|tempmail|10minutemail|guerrillamail|yopmail|trashmail|throwawaymail|sharklasers/i;

  const handleRecordEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign || !entryForm.name.trim() || !entryForm.email.trim()) return;
    const emailNorm = entryForm.email.trim().toLowerCase();
    const fp = entryForm.ipFingerprint.trim() || `fp-${Math.random().toString(36).slice(2, 8)}`;

    const duplicateEmail = activeCampaign.entries.some((en) => en.email.toLowerCase() === emailNorm);
    const duplicateFpCount = activeCampaign.entries.filter((en) => en.ipFingerprint === fp).length;
    const isDisposable = DISPOSABLE_EMAIL_RE.test(emailNorm);

    const fraudStatus: CampaignEntry['fraudStatus'] = isDisposable || duplicateFpCount >= 2
      ? 'flagged_bot'
      : duplicateEmail
      ? 'flagged_duplicate'
      : 'verified';

    const enabledActions = activeCampaign.bonusActions.filter((a) => a.enabled);
    const refs = Math.max(0, Number(entryForm.referralsCount) || 0);
    const basePoints = enabledActions.reduce((s, a) => s + (a.platform === 'referral' ? a.points * refs : a.points), 1);

    const newEntry: CampaignEntry = {
      id: `ent-${Date.now()}`,
      name: entryForm.name.trim(),
      email: emailNorm,
      handle: entryForm.handle.trim() || `@${entryForm.name.trim().toLowerCase().replace(/\s+/g, '')}`,
      platform: entryForm.platform,
      entriesPoints: basePoints,
      referralsCount: refs,
      completedActions: enabledActions.map((a) => a.label),
      ugcUrl: entryForm.ugcUrl.trim() || undefined,
      ipFingerprint: fp,
      fraudStatus,
      syncedToCrm: false,
      estimatedLtv: Math.max(0, Number(entryForm.estimatedLtv) || 0),
      submittedAt: new Date().toISOString(),
    };

    onUpdateCampaign({
      ...activeCampaign,
      entries: [newEntry, ...activeCampaign.entries],
    });
    setShowEntryModal(false);
    setEntryForm({
      name: '',
      email: '',
      handle: '@',
      platform: 'instagram',
      referralsCount: '0',
      ugcUrl: '',
      estimatedLtv: '250',
      ipFingerprint: '',
    });
    onToast(
      fraudStatus === 'verified' ? 'Verified Entry Logged' : 'Entry Flagged by Fraud Guard',
      `${newEntry.name} (${newEntry.entriesPoints} pts) recorded.`,
      fraudStatus === 'verified' ? 'success' : 'warning'
    );
  };

  const handleSubmitPreviewEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign || !previewName.trim() || !previewEmail.trim()) return;
    const emailNorm = previewEmail.trim().toLowerCase();
    const fp = `fp-web-${Math.random().toString(36).slice(2, 8)}`;

    const duplicateEmail = activeCampaign.entries.some((en) => en.email.toLowerCase() === emailNorm);
    const isDisposable = DISPOSABLE_EMAIL_RE.test(emailNorm);
    const fraudStatus: CampaignEntry['fraudStatus'] = isDisposable
      ? 'flagged_bot'
      : duplicateEmail
      ? 'flagged_duplicate'
      : 'verified';

    const completed = activeCampaign.bonusActions.filter(
      (a) => a.enabled && previewCheckedIds.includes(a.id)
    );
    const totalPoints = 1 + completed.reduce((sum, a) => sum + a.points, 0);
    const refCode = `${previewName.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'fan'}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    const newEntry: CampaignEntry = {
      id: `ent-${Date.now()}`,
      name: previewName.trim(),
      email: emailNorm,
      handle: previewHandle.trim().startsWith('@')
        ? previewHandle.trim()
        : `@${(previewHandle.trim() || previewName.trim()).toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
      platform: 'instagram',
      entriesPoints: totalPoints,
      referralsCount: 0,
      completedActions: completed.map((a) => a.label),
      ipFingerprint: fp,
      fraudStatus,
      syncedToCrm: false,
      estimatedLtv: 250,
      submittedAt: new Date().toISOString(),
    };

    onUpdateCampaign({
      ...activeCampaign,
      entries: [newEntry, ...activeCampaign.entries],
    });

    const referralLink = `https://www.socialifyai.com/c/${activeCampaign.slug}?ref=${refCode}&utm_source=${encodeURIComponent(
      activeCampaign.utmSource
    )}&utm_medium=referral&utm_campaign=${encodeURIComponent(activeCampaign.utmCampaign)}`;

    setPreviewReceipt({
      name: newEntry.name,
      points: totalPoints,
      referralLink,
      fraudStatus,
    });
    setPreviewName('');
    setPreviewEmail('');
    setPreviewHandle('');
    setPreviewCheckedIds([]);
    onToast(
      fraudStatus === 'verified' ? 'Interactive Entry Recorded' : 'Entry Recorded (Flagged)',
      `${newEntry.name} earned ${totalPoints} entry points and generated unique referral code ${refCode}.`,
      fraudStatus === 'verified' ? 'success' : 'warning'
    );
  };

  const handleRunFraudAudit = () => {
    if (!activeCampaign) return;
    const seenEmails = new Set<string>();
    const fpCounts = new Map<string, number>();
    let flaggedCount = 0;

    const audited = activeCampaign.entries.map((entry) => {
      const emailKey = entry.email.toLowerCase();
      const fpCount = (fpCounts.get(entry.ipFingerprint) || 0) + 1;
      fpCounts.set(entry.ipFingerprint, fpCount);
      const disposable = DISPOSABLE_EMAIL_RE.test(emailKey);

      let status: CampaignEntry['fraudStatus'] = 'verified';
      if (disposable || fpCount > 2) {
        status = 'flagged_bot';
        flaggedCount += 1;
      } else if (seenEmails.has(emailKey)) {
        status = 'flagged_duplicate';
        flaggedCount += 1;
      }
      seenEmails.add(emailKey);
      return { ...entry, fraudStatus: status };
    });

    onUpdateCampaign({ ...activeCampaign, entries: audited });
    onToast(
      'Fraud Audit Complete',
      flaggedCount > 0
        ? `Flagged ${flaggedCount} duplicate or bot entries across ${audited.length} submissions.`
        : `All ${audited.length} entries passed verification checks.`,
      flaggedCount > 0 ? 'warning' : 'success'
    );
  };

  const handlePickCryptoWinner = async () => {
    if (!activeCampaign) return;
    const eligible = activeCampaign.entries.filter(
      (e) =>
        e.fraudStatus === 'verified' &&
        !activeCampaign.winners.some((w) => w.entryId === e.id)
    );
    if (eligible.length === 0) {
      onToast('No Eligible Entries', 'Record at least one verified, non-winning entry before picking a winner.', 'warning');
      return;
    }

    const totalWeight = eligible.reduce((s, e) => s + Math.max(1, e.entriesPoints), 0);
    const randArray = new Uint32Array(1);
    window.crypto.getRandomValues(randArray);
    let ticket = randArray[0] % totalWeight;
    let chosen = eligible[0];
    for (const entry of eligible) {
      ticket -= Math.max(1, entry.entriesPoints);
      if (ticket < 0) {
        chosen = entry;
        break;
      }
    }

    const pickedAt = new Date().toISOString();
    const rawProof = `${activeCampaign.id}|${chosen.id}|${chosen.email}|${pickedAt}|${randArray[0]}`;
    let verificationHash = `CSPRNG-${randArray[0].toString(16).toUpperCase()}`;
    try {
      const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawProof));
      verificationHash = Array.from(new Uint8Array(digest))
        .slice(0, 8)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    } catch {
      // Fallback to CSPRNG hex token
    }

    onUpdateCampaign({
      ...activeCampaign,
      winners: [
        {
          entryId: chosen.id,
          name: chosen.name,
          email: chosen.email,
          pickedAt,
          verificationHash,
        },
        ...activeCampaign.winners,
      ],
    });
    onToast(
      'Cryptographic Winner Selected',
      `${chosen.name} (${chosen.email}) · Proof Hash #${verificationHash}`,
      'success'
    );
  };

  const handlePushToCrm = (entry: CampaignEntry) => {
    if (!activeCampaign) return;
    const isAdvocate = Boolean(entry.ugcUrl) || entry.referralsCount >= 2;
    const contactId = `c-vc-${Date.now()}`;
    const contact: Contact = {
      id: contactId,
      workspaceId,
      name: entry.name,
      handle: entry.handle,
      email: entry.email,
      avatar: '',
      platforms: [entry.platform],
      leadScore: Math.min(98, 55 + entry.entriesPoints * 2),
      ltv: entry.estimatedLtv,
      lifecycleStage: isAdvocate ? 'Advocate' : 'Lead',
      tags: ['Viral Campaign', activeCampaign.utmCampaign, isAdvocate ? 'UGC / Referrer' : 'Contest Lead'],
      interactionHistory: [
        {
          id: `int-${Date.now()}`,
          type: 'mention',
          content: `Entered "${activeCampaign.name}" (${entry.entriesPoints} pts, ${entry.referralsCount} referrals)${
            entry.ugcUrl ? ` · UGC: ${entry.ugcUrl}` : ''
          }`,
          timestamp: entry.submittedAt,
          platform: entry.platform,
        },
      ],
      notes: `Synced from Viral Campaign "${activeCampaign.name}" (Pixel ${activeCampaign.pixelId}).`,
    };

    const deal: Deal | undefined =
      entry.estimatedLtv > 0
        ? {
            id: `d-vc-${Date.now()}`,
            workspaceId,
            contactId,
            title: `${entry.name} — ${activeCampaign.name}`,
            value: entry.estimatedLtv,
            stage: 'new_lead',
            probability: isAdvocate ? 45 : 25,
            expectedCloseDate: activeCampaign.endDate,
          }
        : undefined;

    onSyncEntryToCrm(contact, deal);
    onUpdateCampaign({
      ...activeCampaign,
      entries: activeCampaign.entries.map((e) => (e.id === entry.id ? { ...e, syncedToCrm: true } : e)),
    });
    onToast(
      'Synced to Social CRM',
      `${entry.name} added as ${contact.lifecycleStage} with $${entry.estimatedLtv.toLocaleString()} LTV attribution.`,
      'success'
    );
  };

  const handleExportWinnersCsv = () => {
    if (!activeCampaign) return;
    const rows = [
      ['Campaign', 'Winner Name', 'Email', 'Picked At', 'Verification Hash'].join(','),
      ...activeCampaign.winners.map((w) =>
        [
          `"${activeCampaign.name.replace(/"/g, '""')}"`,
          `"${w.name.replace(/"/g, '""')}"`,
          w.email,
          w.pickedAt,
          w.verificationHash,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCampaign.slug}-winners.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Winner Log Exported', `Downloaded cryptographic audit CSV (${activeCampaign.winners.length} winners).`, 'success');
  };

  const totalVerifiedEntries = wsCampaigns.reduce(
    (s, c) => s + c.entries.filter((e) => e.fraudStatus === 'verified').length,
    0
  );
  const totalFlagged = wsCampaigns.reduce(
    (s, c) => s + c.entries.filter((e) => e.fraudStatus !== 'verified').length,
    0
  );
  const totalAttributedRevenue = wsCampaigns.reduce((s, c) => s + c.attributedRevenueUsd, 0);
  const totalPrizeSpend = wsCampaigns.reduce((s, c) => s + c.prizeValueUsd, 0);
  const blendedRoi = totalPrizeSpend > 0 ? (totalAttributedRevenue / totalPrizeSpend).toFixed(2) : '0.00';

  const trackedCampaignUrl = activeCampaign
    ? `https://www.socialifyai.com/c/${activeCampaign.slug}?utm_source=${encodeURIComponent(
        activeCampaign.utmSource
      )}&utm_medium=${encodeURIComponent(activeCampaign.utmMedium)}&utm_campaign=${encodeURIComponent(
        activeCampaign.utmCampaign
      )}`
    : '';

  const pixelSnippet = activeCampaign
    ? `<script async src="https://www.socialifyai.com/pixel.js" data-pixel="${activeCampaign.pixelId}" data-workspace="${workspaceId}" data-campaign="${activeCampaign.slug}"></script>`
    : '';

  const embedSnippet = activeCampaign
    ? `<iframe src="${trackedCampaignUrl}" width="100%" height="620" style="border:0;border-radius:16px;" loading="lazy"></iframe>`
    : '';

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-[#090A0D] custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-5">
          <div>
            <p className="text-[11px] font-medium text-[#06B6D4] uppercase tracking-[0.04em]">
              Viral Giveaways, UGC Contests &amp; Revenue Attribution · {workspaceName}
            </p>
            <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] mt-1">
              Campaigns &amp; Contests
            </h1>
            <p className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">
              Build hosted or embeddable sweepstakes, referral giveaways, and UGC contests with bot filtering, cryptographic winner draws, conversion pixels, and 1-click CRM sync.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <span className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] font-mono tabular-nums">
              Campaigns {wsCampaigns.length}/{maxCampaignsQuota}
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <Plus size={14} strokeWidth={1.5} /> New Viral Campaign
            </button>
          </div>
        </div>

        {/* Non-Blocking Campaign Quota Banner */}
        {wsCampaigns.length >= maxCampaignsQuota && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-[12px] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-[12px]">
            <p className="text-[#111827] dark:text-[#F3F4F6] font-medium">
              Active viral campaign quota reached (<span className="font-mono tabular-nums text-[#F97316]">{wsCampaigns.length}/{maxCampaignsQuota}</span> on your current plan).
            </p>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium whitespace-nowrap transition-colors"
              >
                Manage Plan &amp; Quotas
              </button>
            )}
          </div>
        )}

        {/* Real Computed KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiMetricCard
            label="Active Campaigns"
            value={wsCampaigns.filter((c) => c.status === 'live').length}
            sub={`${wsCampaigns.length} total created`}
          />
          <KpiMetricCard
            label="Verified Participants"
            value={totalVerifiedEntries.toLocaleString()}
            sub={`${totalFlagged} flagged bots/dupes`}
            alert={totalFlagged > 0}
          />
          <KpiMetricCard
            label="Attributed Revenue"
            value={`$${totalAttributedRevenue.toLocaleString()}`}
            sub="Tracked via conversion pixels"
          />
          <KpiMetricCard
            label="Campaign ROI Multiple"
            value={`${blendedRoi}x`}
            sub={`vs. $${totalPrizeSpend.toLocaleString()} prize pool`}
          />
        </div>

        {/* Sub-Tabs + Active Campaign Picker */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px]">
            {[
              { id: 'builder' as const, label: 'Campaign Builder & Bonus Engine', icon: Gift },
              { id: 'entries' as const, label: 'Fraud Guard & Winner Picker', icon: Trophy },
              { id: 'roi' as const, label: 'UTM, Conversion Pixel & CRM ROI', icon: Code2 },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id)}
                  className={`px-3 py-1.5 rounded-[7px] text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    subTab === t.id
                      ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.08]'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
                  }`}
                >
                  <Icon size={14} strokeWidth={1.5} /> {t.label}
                </button>
              );
            })}
          </div>

          {wsCampaigns.length > 0 && (
            <div className="flex items-center gap-2 text-[12px]">
              <select
                value={activeCampaign?.id || ''}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setInspectedEntryId(null);
                }}
                className="px-3 py-1.5 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] font-medium text-[#111827] dark:text-[#F3F4F6] max-w-xs outline-none focus:border-[#06B6D4]"
              >
                {wsCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.status.toUpperCase()}] {c.name}
                  </option>
                ))}
              </select>
              {activeCampaign && (
                <button
                  onClick={() => onDeleteCampaign(activeCampaign.id)}
                  title="Delete campaign"
                  className="p-1.5 text-[#6B7280] hover:text-rose-500 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-rose-500/40 rounded-[8px] transition-colors"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Empty State if no campaign exists */}
        {!activeCampaign ? (
          <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px]">
            <EmptyStatePanel
              icon={Trophy}
              title="No viral campaigns or contests created yet"
              description="Launch your first Sweepstakes, UGC Photo/Video Contest, Refer-a-Friend Giveaway, or Instant-Win Coupon campaign to capture leads and sync them straight into Social CRM."
              actionLabel="Launch First Campaign"
              onAction={() => setShowCreateModal(true)}
            />
          </div>
        ) : (
          <>
            {/* SUB-TAB 1: BUILDER & BONUS ENTRY ENGINE */}
            {subTab === 'builder' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5 space-y-5 text-[12px]">
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3.5">
                    <div>
                      <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                        Viral Referral &amp; Bonus Entry Engine
                      </h3>
                      <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                        Configure point weights for social follows, YouTube subscribes, referrals, and UGC submissions.
                      </p>
                    </div>
                    <select
                      value={activeCampaign.status}
                      onChange={(e) =>
                        onUpdateCampaign({
                          ...activeCampaign,
                          status: e.target.value as ViralCampaign['status'],
                        })
                      }
                      className="px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-medium capitalize text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                    >
                      <option value="draft">Draft</option>
                      <option value="live">Live</option>
                      <option value="ended">Ended</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    {activeCampaign.bonusActions.map((act) => (
                      <div
                        key={act.id}
                        className="px-3 py-2.5 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-3"
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={act.enabled}
                            onChange={(e) =>
                              onUpdateCampaign({
                                ...activeCampaign,
                                bonusActions: activeCampaign.bonusActions.map((a) =>
                                  a.id === act.id ? { ...a, enabled: e.target.checked } : a
                                ),
                              })
                            }
                            className="accent-[#06B6D4]"
                          />
                          <span className="font-medium text-[#111827] dark:text-[#F3F4F6] truncate">{act.label}</span>
                        </label>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] text-[#6B7280]">Entries:</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={act.points}
                            onChange={(e) =>
                              onUpdateCampaign({
                                ...activeCampaign,
                                bonusActions: activeCampaign.bonusActions.map((a) =>
                                  a.id === act.id ? { ...a, points: Math.max(1, Number(e.target.value) || 1) } : a
                                ),
                              })
                            }
                            className="w-16 px-2 py-1 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[6px] font-mono tabular-nums text-right text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08]">
                    <div>
                      <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                        Deployment Mode
                      </label>
                      <select
                        value={activeCampaign.embedMode}
                        onChange={(e) =>
                          onUpdateCampaign({
                            ...activeCampaign,
                            embedMode: e.target.value as 'hosted' | 'embeddable',
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                      >
                        <option value="hosted">Hosted Landing Page</option>
                        <option value="embeddable">Embeddable Website Widget</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                        Prize Valuation ($)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={activeCampaign.prizeValueUsd}
                        onChange={(e) =>
                          onUpdateCampaign({
                            ...activeCampaign,
                            prizeValueUsd: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Interactive Hosted / Embed Widget Preview */}
                <div className="lg:col-span-5 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-[0.04em]">
                        Live {activeCampaign.embedMode === 'hosted' ? 'Hosted Page' : 'Embeddable Widget'} Preview
                      </p>
                      <span className="text-[11px] font-mono font-semibold text-[#06B6D4] tabular-nums">
                        {1 +
                          activeCampaign.bonusActions
                            .filter((a) => a.enabled && previewCheckedIds.includes(a.id))
                            .reduce((s, a) => s + a.points, 0)}{' '}
                        entry pts
                      </span>
                    </div>
                    <div className="canvas-dot-grid rounded-[12px] p-4 border border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#090A0D]">
                      <div className="rounded-[10px] overflow-hidden border border-white/[0.08] bg-[#0E1015] text-[#F3F4F6] p-5 space-y-4">
                        <div>
                          <p className="text-[11px] font-mono text-[#06B6D4]">
                            {CAMPAIGN_TYPE_LABELS[activeCampaign.type]} · Ends {activeCampaign.endDate}
                          </p>
                          <h4 className="text-[16px] font-semibold tracking-[-0.02em] mt-1">{activeCampaign.prizeTitle}</h4>
                          <p className="text-[12px] text-[#9CA3AF] mt-1">{activeCampaign.description}</p>
                        </div>

                        {previewReceipt ? (
                          <div className="p-3.5 rounded-[8px] bg-[#13161D] border border-[#06B6D4]/30 space-y-2.5 text-[12px]">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 size={14} strokeWidth={1.5} /> Entry Confirmed ({previewReceipt.points} pts)
                              </span>
                              <StatusBadge tone={previewReceipt.fraudStatus === 'verified' ? 'emerald' : 'orange'}>
                                {previewReceipt.fraudStatus === 'verified' ? 'Verified' : 'Flagged'}
                              </StatusBadge>
                            </div>
                            <p className="text-[11px] text-[#9CA3AF]">
                              Share your unique referral link to earn bonus entries:
                            </p>
                            <div className="flex items-center gap-1.5">
                              <input
                                readOnly
                                value={previewReceipt.referralLink}
                                className="flex-1 px-2.5 py-1.5 bg-[#090A0D] border border-white/[0.08] rounded-[6px] text-[11px] font-mono text-[#06B6D4] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => copyText('ref-link', previewReceipt.referralLink, 'Unique Referral Link')}
                                className="px-2.5 py-1.5 bg-[#FFFFFF] hover:bg-[#E5E7EB] text-[#090A0D] rounded-[6px] font-medium text-[11px] shrink-0 transition-colors"
                              >
                                {copiedKey === 'ref-link' ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPreviewReceipt(null)}
                              className="text-[11px] text-[#9CA3AF] hover:text-[#F3F4F6] underline"
                            >
                              Test another participant entry
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleSubmitPreviewEntry} className="space-y-3">
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-mono uppercase text-[#6B7280] tracking-[0.04em]">
                                Click bonus actions to test points (1 base + bonuses)
                              </p>
                              {activeCampaign.bonusActions
                                .filter((a) => a.enabled)
                                .map((act) => {
                                  const checked = previewCheckedIds.includes(act.id);
                                  return (
                                    <button
                                      key={act.id}
                                      type="button"
                                      onClick={() =>
                                        setPreviewCheckedIds((prev) =>
                                          prev.includes(act.id)
                                            ? prev.filter((id) => id !== act.id)
                                            : [...prev, act.id]
                                        )
                                      }
                                      className={`w-full px-3 py-2 rounded-[8px] border flex items-center justify-between text-[12px] transition-colors ${
                                        checked
                                          ? 'bg-[#06B6D4]/10 border-[#06B6D4]/50 text-[#F3F4F6]'
                                          : 'bg-[#13161D] border-white/[0.08] text-[#9CA3AF] hover:border-white/[0.15] hover:text-[#F3F4F6]'
                                      }`}
                                    >
                                      <span className="flex items-center gap-2 truncate">
                                        <span
                                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                                            checked
                                              ? 'bg-[#06B6D4] border-[#06B6D4] text-[#090A0D]'
                                              : 'border-white/20'
                                          }`}
                                        >
                                          {checked && <Check size={10} strokeWidth={2} />}
                                        </span>
                                        <span className="truncate">{act.label}</span>
                                      </span>
                                      <span className="font-mono font-semibold text-[#06B6D4] tabular-nums shrink-0 ml-2">
                                        +{act.points}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 text-[12px]">
                              <input
                                required
                                value={previewName}
                                onChange={(e) => setPreviewName(e.target.value)}
                                placeholder="Your name *"
                                className="px-2.5 py-2 rounded-[8px] bg-[#13161D] border border-white/[0.08] text-[#F3F4F6] placeholder:text-[#6B7280] outline-none focus:border-[#06B6D4]"
                              />
                              <input
                                required
                                type="email"
                                value={previewEmail}
                                onChange={(e) => setPreviewEmail(e.target.value)}
                                placeholder="Email address *"
                                className="px-2.5 py-2 rounded-[8px] bg-[#13161D] border border-white/[0.08] text-[#F3F4F6] placeholder:text-[#6B7280] outline-none focus:border-[#06B6D4]"
                              />
                            </div>
                            <input
                              value={previewHandle}
                              onChange={(e) => setPreviewHandle(e.target.value)}
                              placeholder="Social handle (optional, e.g. @alex)"
                              className="w-full px-2.5 py-2 rounded-[8px] bg-[#13161D] border border-white/[0.08] text-[12px] text-[#F3F4F6] placeholder:text-[#6B7280] outline-none focus:border-[#06B6D4]"
                            />
                            <button
                              type="submit"
                              className="w-full py-2.5 bg-[#FFFFFF] hover:bg-[#E5E7EB] text-[#090A0D] rounded-[8px] text-[12px] font-medium transition-colors"
                            >
                              Submit Entry &amp; Generate Referral Link
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[12px]">
                    <button
                      onClick={() => copyText('hosted', trackedCampaignUrl, 'Hosted Campaign URL')}
                      className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedKey === 'hosted' ? <Check size={13} strokeWidth={1.5} /> : <Link2 size={13} strokeWidth={1.5} />} Copy Link
                    </button>
                    <button
                      onClick={() => copyText('embed', embedSnippet, 'Embeddable Widget HTML')}
                      className="flex-1 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedKey === 'embed' ? <Check size={13} strokeWidth={1.5} /> : <Code2 size={13} strokeWidth={1.5} />} Copy Embed
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: FRAUD DETECTION & CRYPTOGRAPHIC WINNER PICKER */}
            {subTab === 'entries' && (
              <div className="space-y-5">
                <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-4 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowEntryModal(true)}
                      className="px-3.5 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] bg-[#F8F9FB] dark:bg-[#0E1015] text-[#111827] dark:text-[#F3F4F6] rounded-[8px] font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={14} strokeWidth={1.5} /> Record Entry
                    </button>
                    <button
                      onClick={handleRunFraudAudit}
                      className="px-3.5 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] bg-[#FFFFFF] dark:bg-[#13161D] text-[#111827] dark:text-[#F3F4F6] rounded-[8px] font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <ShieldAlert size={14} strokeWidth={1.5} className="text-[#F97316]" /> Run Bot &amp; Duplicate Audit
                    </button>
                    <button
                      onClick={handlePickCryptoWinner}
                      className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles size={14} strokeWidth={1.5} /> Pick Cryptographic Winner
                    </button>
                  </div>
                  <button
                    onClick={handleExportWinnersCsv}
                    className="px-3 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] rounded-[8px] font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Download size={13} strokeWidth={1.5} /> Export Winner Log CSV
                  </button>
                </div>

                {/* Winner Ledger */}
                {activeCampaign.winners.length > 0 && (
                  <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#06B6D4]/30 rounded-[12px] p-4 space-y-2">
                    <p className="text-[12px] font-semibold text-[#06B6D4]">
                      Verified Winner Selection Log (CSPRNG + SHA-256 Proof)
                    </p>
                    <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] text-[12px]">
                      {activeCampaign.winners.map((w) => (
                        <div key={w.verificationHash} className="py-2 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-medium text-[#111827] dark:text-[#F3F4F6]">{w.name}</span>
                            <span className="text-[#6B7280] ml-2">{w.email}</span>
                          </div>
                          <span className="font-mono text-[11px] text-[#4B5563] dark:text-[#9CA3AF] tabular-nums">
                            Hash #{w.verificationHash} · {new Date(w.pickedAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entries Table */}
                <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[12px]">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] text-[11px] text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-[0.04em]">
                        <th className="py-2.5 px-4 font-medium">Participant</th>
                        <th className="py-2.5 px-4 font-medium">Channel</th>
                        <th className="py-2.5 px-4 font-medium text-right">Points</th>
                        <th className="py-2.5 px-4 font-medium text-right">Referrals</th>
                        <th className="py-2.5 px-4 font-medium">Fraud Check</th>
                        <th className="py-2.5 px-4 font-medium text-right">CRM Pipeline Sync</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] tabular-nums">
                      {activeCampaign.entries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <EmptyStatePanel
                              icon={Trophy}
                              title="No participants recorded yet"
                              description="Log an entry or share your hosted campaign link to begin tracking verified participants and referrals."
                              actionLabel="Record Participant"
                              onAction={() => setShowEntryModal(true)}
                            />
                          </td>
                        </tr>
                      ) : (
                        activeCampaign.entries.map((entry) => (
                          <tr
                            key={entry.id}
                            onClick={() => setInspectedEntryId(entry.id)}
                            className="h-[44px] hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] cursor-pointer transition-colors"
                          >
                            <td className="py-2 px-4">
                              <p className="font-medium text-[#111827] dark:text-[#F3F4F6]">{entry.name}</p>
                              <p className="text-[11px] text-[#6B7280] font-mono">
                                {entry.email} · {entry.handle}
                              </p>
                            </td>
                            <td className="py-2 px-4 uppercase font-mono text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                              {entry.platform}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-semibold text-[#111827] dark:text-[#F3F4F6]">
                              {entry.entriesPoints}
                            </td>
                            <td className="py-2 px-4 text-right font-mono text-[#4B5563] dark:text-[#9CA3AF]">
                              {entry.referralsCount}
                            </td>
                            <td className="py-2 px-4">
                              <StatusBadge
                                tone={
                                  entry.fraudStatus === 'verified'
                                    ? 'emerald'
                                    : entry.fraudStatus === 'flagged_duplicate'
                                    ? 'orange'
                                    : 'rose'
                                }
                              >
                                {entry.fraudStatus === 'verified'
                                  ? 'Verified'
                                  : entry.fraudStatus === 'flagged_duplicate'
                                  ? 'Duplicate Email'
                                  : 'Bot / Fingerprint Flag'}
                              </StatusBadge>
                            </td>
                            <td
                              className="py-2 px-4 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {entry.syncedToCrm ? (
                                <StatusBadge tone="emerald">Synced to CRM</StatusBadge>
                              ) : (
                                <button
                                  onClick={() => handlePushToCrm(entry)}
                                  className="px-2.5 py-1 border border-[#E5E7EB] dark:border-white/[0.12] hover:border-[#06B6D4] text-[#111827] dark:text-[#F3F4F6] rounded-[6px] text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                                >
                                  <UserPlus size={11} strokeWidth={1.5} /> Sync to CRM
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
            )}

            {/* SUB-TAB 3: UTM, CONVERSION PIXEL & ROI TRACKER */}
            {subTab === 'roi' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-[12px]">
                <div className="lg:col-span-7 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5 space-y-4">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                      UTM Attribution &amp; Conversion Tracking Pixel
                    </h3>
                    <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                      Install this pixel on your signup confirmation or checkout thank-you page to attribute checkout revenue directly to this viral campaign.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1 font-mono text-[11px]">utm_source</label>
                      <input
                        value={activeCampaign.utmSource}
                        onChange={(e) => onUpdateCampaign({ ...activeCampaign, utmSource: e.target.value })}
                        className="w-full px-2.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1 font-mono text-[11px]">utm_medium</label>
                      <input
                        value={activeCampaign.utmMedium}
                        onChange={(e) => onUpdateCampaign({ ...activeCampaign, utmMedium: e.target.value })}
                        className="w-full px-2.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1 font-mono text-[11px]">utm_campaign</label>
                      <input
                        value={activeCampaign.utmCampaign}
                        onChange={(e) => onUpdateCampaign({ ...activeCampaign, utmCampaign: e.target.value })}
                        className="w-full px-2.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[#111827] dark:text-[#F3F4F6]">Tracked Campaign URL</span>
                      <button
                        onClick={() => copyText('utm-url', trackedCampaignUrl, 'Tracked UTM URL')}
                        className="text-[11px] font-medium text-[#06B6D4] flex items-center gap-1 hover:underline"
                      >
                        {copiedKey === 'utm-url' ? <Check size={12} strokeWidth={1.5} /> : <Copy size={12} strokeWidth={1.5} />} Copy URL
                      </button>
                    </div>
                    <pre className="p-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[11px] overflow-x-auto text-[#06B6D4]">
                      {trackedCampaignUrl}
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[#111827] dark:text-[#F3F4F6]">
                        Conversion Pixel Snippet (<span className="font-mono">{activeCampaign.pixelId}</span>)
                      </span>
                      <button
                        onClick={() => copyText('pixel', pixelSnippet, 'Conversion Pixel Script')}
                        className="text-[11px] font-medium text-[#06B6D4] flex items-center gap-1 hover:underline"
                      >
                        {copiedKey === 'pixel' ? <Check size={12} strokeWidth={1.5} /> : <Copy size={12} strokeWidth={1.5} />} Copy Script
                      </button>
                    </div>
                    <pre className="p-3 bg-[#090A0D] text-[#E5E7EB] border border-white/[0.08] rounded-[8px] font-mono text-[11px] overflow-x-auto">
                      {pixelSnippet}
                    </pre>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5 space-y-4">
                  <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                    True Social ROI Attribution
                  </h3>
                  <div>
                    <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                      Recorded Attributed Checkout Revenue ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={activeCampaign.attributedRevenueUsd}
                      onChange={(e) =>
                        onUpdateCampaign({
                          ...activeCampaign,
                          attributedRevenueUsd: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[14px] font-semibold tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                    />
                  </div>
                  <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] pt-2 tabular-nums">
                    <div className="py-2.5 flex justify-between">
                      <span className="text-[#6B7280] dark:text-[#9CA3AF]">Prize Cost</span>
                      <span className="font-mono font-semibold text-[#111827] dark:text-[#F3F4F6]">${activeCampaign.prizeValueUsd.toLocaleString()}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-[#6B7280] dark:text-[#9CA3AF]">Verified Leads Captured</span>
                      <span className="font-mono font-semibold text-[#111827] dark:text-[#F3F4F6]">
                        {activeCampaign.entries.filter((e) => e.fraudStatus === 'verified').length}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-[#6B7280] dark:text-[#9CA3AF]">Leads Synced to Social CRM</span>
                      <span className="font-mono font-semibold text-[#06B6D4]">
                        {activeCampaign.entries.filter((e) => e.syncedToCrm).length}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-[#6B7280] dark:text-[#9CA3AF]">Net Campaign ROI</span>
                      <span className="font-mono font-semibold text-[#111827] dark:text-[#F3F4F6]">
                        {activeCampaign.prizeValueUsd > 0
                          ? `${(activeCampaign.attributedRevenueUsd / activeCampaign.prizeValueUsd).toFixed(2)}x`
                          : '0.00x'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 480px Participant & Referral Inspector Drawer */}
      <InspectorDrawer
        open={Boolean(inspectedEntry)}
        onClose={() => setInspectedEntryId(null)}
        title={inspectedEntry?.name || 'Participant Inspector'}
        subtitle={inspectedEntry ? `${inspectedEntry.email} · ${inspectedEntry.handle}` : undefined}
        footer={
          inspectedEntry ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-[#6B7280] tabular-nums">
                Submitted {new Date(inspectedEntry.submittedAt).toLocaleDateString()}
              </span>
              {inspectedEntry.syncedToCrm ? (
                <StatusBadge tone="emerald">Synced to Social CRM</StatusBadge>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePushToCrm(inspectedEntry)}
                  className="px-3.5 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <UserPlus size={13} strokeWidth={1.5} /> Sync to Social CRM
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {inspectedEntry && (
          <div className="space-y-5 text-[12px]">
            <div className="grid grid-cols-3 gap-3 tabular-nums">
              <div className="p-3 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                <p className="text-[11px] text-[#6B7280]">Total Points</p>
                <p className="mt-1 text-[18px] font-semibold font-mono text-[#111827] dark:text-[#F3F4F6]">
                  {inspectedEntry.entriesPoints}
                </p>
              </div>
              <div className="p-3 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                <p className="text-[11px] text-[#6B7280]">Referrals</p>
                <p className="mt-1 text-[18px] font-semibold font-mono text-[#06B6D4]">
                  {inspectedEntry.referralsCount}
                </p>
              </div>
              <div className="p-3 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                <p className="text-[11px] text-[#6B7280]">Est. LTV</p>
                <p className="mt-1 text-[18px] font-semibold font-mono text-[#111827] dark:text-[#F3F4F6]">
                  ${inspectedEntry.estimatedLtv.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] border-y border-[#E5E7EB] dark:border-white/[0.08]">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280]">Fraud Verification</span>
                <StatusBadge
                  tone={
                    inspectedEntry.fraudStatus === 'verified'
                      ? 'emerald'
                      : inspectedEntry.fraudStatus === 'flagged_duplicate'
                      ? 'orange'
                      : 'rose'
                  }
                >
                  {inspectedEntry.fraudStatus === 'verified'
                    ? 'Verified'
                    : inspectedEntry.fraudStatus === 'flagged_duplicate'
                    ? 'Duplicate Email'
                    : 'Bot / Fingerprint Flag'}
                </StatusBadge>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280]">Entry Channel</span>
                <span className="font-mono uppercase text-[#111827] dark:text-[#F3F4F6]">{inspectedEntry.platform}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280]">IP Fingerprint</span>
                <span className="font-mono text-[#4B5563] dark:text-[#9CA3AF]">{inspectedEntry.ipFingerprint}</span>
              </div>
            </div>

            {inspectedEntry.ugcUrl && (
              <div>
                <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.04em] mb-1.5">
                  UGC Submission
                </p>
                <a
                  href={inspectedEntry.ugcUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] text-[#06B6D4] font-mono text-[11px] hover:border-[#06B6D4]/40 transition-colors"
                >
                  <span className="truncate">{inspectedEntry.ugcUrl}</span>
                  <ExternalLink size={12} strokeWidth={1.5} className="shrink-0 ml-2" />
                </a>
              </div>
            )}

            <div>
              <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.04em] mb-2">
                Completed Bonus Actions ({inspectedEntry.completedActions.length})
              </p>
              {inspectedEntry.completedActions.length === 0 ? (
                <p className="text-[#6B7280]">Base entry only (no bonus actions checked).</p>
              ) : (
                <ul className="space-y-1.5">
                  {inspectedEntry.completedActions.map((label, i) => (
                    <li
                      key={`${label}-${i}`}
                      className="px-3 py-2 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex items-center gap-2 text-[#111827] dark:text-[#F3F4F6]"
                    >
                      <Check size={12} strokeWidth={1.75} className="text-emerald-500 shrink-0" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </InspectorDrawer>

      {/* Create Viral Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                Create Viral Campaign
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] rounded-md"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleCreateCampaign} className="mt-4 space-y-3.5 text-[12px]">
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Campaign Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Q4 Creator Bundle Giveaway"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Campaign Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as ViralCampaignType })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  >
                    {(Object.keys(CAMPAIGN_TYPE_LABELS) as ViralCampaignType[]).map((k) => (
                      <option key={k} value={k}>
                        {CAMPAIGN_TYPE_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Grand Prize Title *</label>
                  <input
                    required
                    value={form.prizeTitle}
                    onChange={(e) => setForm({ ...form, prizeTitle: e.target.value })}
                    placeholder="e.g. 1-Year Pro License + Mac Mini"
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Value ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.prizeValueUsd}
                    onChange={(e) => setForm({ ...form, prizeValueUsd: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe how participants enter and earn bonus referral entries..."
                  className="w-full p-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] font-medium text-[#4B5563] dark:text-[#9CA3AF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium transition-colors"
                >
                  Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Entry Modal */}
      {showEntryModal && activeCampaign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setShowEntryModal(false)} />
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                Record Campaign Participant
              </h3>
              <button
                onClick={() => setShowEntryModal(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] rounded-md"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleRecordEntry} className="mt-4 space-y-3 text-[12px]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Full Name *</label>
                  <input
                    required
                    value={entryForm.name}
                    onChange={(e) => setEntryForm({ ...entryForm, name: e.target.value })}
                    placeholder="Jordan Blake"
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={entryForm.email}
                    onChange={(e) => setEntryForm({ ...entryForm, email: e.target.value })}
                    placeholder="jordan@company.com"
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Social Handle</label>
                  <input
                    value={entryForm.handle}
                    onChange={(e) => setEntryForm({ ...entryForm, handle: e.target.value })}
                    placeholder="@jordanblake"
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Entry Channel</label>
                  <select
                    value={entryForm.platform}
                    onChange={(e) => setEntryForm({ ...entryForm, platform: e.target.value as Platform })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="x">X (Twitter)</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Verified Referrals</label>
                  <input
                    type="number"
                    min={0}
                    value={entryForm.referralsCount}
                    onChange={(e) => setEntryForm({ ...entryForm, referralsCount: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Estimated LTV ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={entryForm.estimatedLtv}
                    onChange={(e) => setEntryForm({ ...entryForm, estimatedLtv: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                  Optional UGC Submission Link
                </label>
                <input
                  value={entryForm.ugcUrl}
                  onChange={(e) => setEntryForm({ ...entryForm, ugcUrl: e.target.value })}
                  placeholder="https://instagram.com/reel/..."
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] font-medium text-[#4B5563] dark:text-[#9CA3AF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium transition-colors"
                >
                  Log Verified Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
