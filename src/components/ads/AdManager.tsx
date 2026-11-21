import React, { useState, useMemo } from 'react';
import { Plus, Sparkles, Copy, Trash2, X, Check, Megaphone } from 'lucide-react';
import { AdCampaign, AdPlatform } from '../../types';
import { aiService } from '../../services/aiService';
import { SocialLogo } from '../common/SocialIcons';
import { StatusBadge, EmptyStatePanel } from '../common/DesignPrimitives';

interface AdManagerProps {
  workspaceId: string;
  ads: AdCampaign[];
  onUpdateAd: (ad: AdCampaign) => void;
  onAddAd: (ad: AdCampaign) => void;
  onDeleteAd: (id: string) => void;
  onToast: (title: string, description?: string) => void;
}

export function AdManager({
  workspaceId,
  ads,
  onUpdateAd,
  onAddAd,
  onDeleteAd,
  onToast,
}: AdManagerProps) {
  const wsAds = useMemo(
    () => ads.filter((a) => a.workspaceId === workspaceId),
    [ads, workspaceId]
  );

  const [platformTab, setPlatformTab] = useState<'all' | AdPlatform>('all');
  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    name: '',
    platform: 'meta' as AdPlatform,
    objective: 'Conversions',
    audience: 'B2B Marketing & RevOps Directors',
    budget: 120,
    adCopy: '',
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiVariations, setAiVariations] = useState<
    { headline: string; primaryText: string; cta: string; creativeConcept: string }[]
  >([]);

  const filteredAds = useMemo(
    () => wsAds.filter((a) => platformTab === 'all' || a.platform === platformTab),
    [wsAds, platformTab]
  );

  const kpis = useMemo(() => {
    const activeSet = filteredAds;
    const spend = activeSet.reduce((s, a) => s + a.spend, 0);
    const impressions = activeSet.reduce((s, a) => s + a.impressions, 0);
    const clicks = activeSet.reduce((s, a) => s + a.clicks, 0);
    const conversions = activeSet.reduce((s, a) => s + a.conversions, 0);
    const avgRoas = activeSet.length
      ? (activeSet.reduce((s, a) => s + a.roas, 0) / activeSet.length).toFixed(1)
      : '0.0';
    const avgCpc = clicks > 0 ? (spend / clicks).toFixed(2) : '0.00';

    return { spend, impressions, avgRoas, avgCpc, conversions };
  }, [filteredAds]);

  const handleGenerateAdCopy = async () => {
    setAiLoading(true);
    try {
      const res = await aiService.generateAdCopy(form.platform, form.objective, form.audience);
      setAiVariations(res.variations || []);
      onToast('AI Ad Variations Ready', `Generated 3 ${form.platform.toUpperCase()} ad concepts.`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const created: AdCampaign = {
      id: `a-${Date.now()}`,
      workspaceId,
      name: form.name.trim(),
      platform: form.platform,
      status: 'active',
      objective: form.objective,
      audience: form.audience,
      adCopy: form.adCopy.trim() || `${form.objective} campaign targeting ${form.audience}`,
      budget: Number(form.budget) || 50,
      spend: 0,
      impressions: 0,
      clicks: 0,
      roas: 0,
      ctr: 0,
      conversions: 0,
    };
    onAddAd(created);
    onToast('Ad Campaign Launched', `${created.name} is now active on ${created.platform.toUpperCase()}.`);
    setShowCreate(false);
    setForm({ name: '', platform: 'meta', objective: 'Conversions', audience: 'B2B Marketing & RevOps Directors', budget: 120, adCopy: '' });
    setAiVariations([]);
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-[#090A0D] custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-5">
          <div>
            <p className="text-[11px] font-medium text-[#06B6D4] uppercase tracking-[0.04em]">
              Paid Social &amp; Creative Performance
            </p>
            <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] mt-1">
              Cross-Platform Ad Manager
            </h1>
            <p className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">
              Manage TikTok, Meta, and Google Ads performance alongside AI ad creative generation.
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 self-start transition-colors"
          >
            <Plus size={14} strokeWidth={1.5} /> Launch Campaign
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Ad Spend', value: `$${kpis.spend.toLocaleString()}` },
            { label: 'Blended ROAS', value: `${kpis.avgRoas}x` },
            { label: 'Total Impressions', value: kpis.impressions.toLocaleString() },
            { label: 'Average CPC', value: `$${kpis.avgCpc}` },
            { label: 'Conversions', value: kpis.conversions.toLocaleString() },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-4"
            >
              <p className="text-[12px] font-medium text-[#4B5563] dark:text-[#9CA3AF] truncate">{item.label}</p>
              <p className="mt-1.5 text-[24px] leading-none font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Platform Tabs */}
        <div className="inline-flex flex-wrap items-center gap-1 bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] p-1 rounded-[10px] text-[12px] font-medium">
          {(
            [
              { id: 'all', label: `All Ads (${wsAds.length})` },
              { id: 'tiktok', label: 'TikTok Ads' },
              { id: 'meta', label: 'Meta Ads' },
              { id: 'google', label: 'Google Ads' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPlatformTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-[7px] flex items-center gap-1.5 transition-colors ${
                platformTab === tab.id
                  ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.08]'
                  : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
              }`}
            >
              {tab.id !== 'all' && <SocialLogo platform={tab.id} size={14} />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Campaigns Table */}
        <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] text-[11px] text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-[0.04em]">
                  <th className="py-2.5 px-4 font-medium">Campaign</th>
                  <th className="py-2.5 px-4 font-medium">Platform</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Daily Budget</th>
                  <th className="py-2.5 px-4 font-medium text-right">Spend</th>
                  <th className="py-2.5 px-4 font-medium text-right">ROAS</th>
                  <th className="py-2.5 px-4 font-medium text-right">CTR</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] tabular-nums">
                {filteredAds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <EmptyStatePanel
                        icon={Megaphone}
                        title="No ad campaigns yet"
                        description="Launch your first Meta, TikTok, or Google Ads campaign to track spend, CTR, and ROAS."
                        actionLabel="Launch Campaign"
                        onAction={() => setShowCreate(true)}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredAds.map((ad) => (
                    <tr key={ad.id} className="h-[44px] hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] transition-colors">
                      <td className="py-2.5 px-4 max-w-xs">
                        <p className="font-medium text-[#111827] dark:text-[#F3F4F6] truncate">{ad.name}</p>
                        <p className="text-[11px] text-[#6B7280] truncate">{ad.adCopy || ad.audience}</p>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                        <span className="inline-flex items-center gap-2">
                          <SocialLogo platform={ad.platform} size={16} />
                          <span>{ad.platform === 'meta' ? 'Meta' : ad.platform === 'tiktok' ? 'TikTok' : 'Google'}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus = ad.status === 'active' ? 'paused' : 'active';
                            onUpdateAd({ ...ad, status: nextStatus });
                            onToast(`Campaign ${nextStatus === 'active' ? 'Activated' : 'Paused'}`, ad.name);
                          }}
                          title="Click to toggle status"
                        >
                          <StatusBadge tone={ad.status === 'active' ? 'emerald' : 'neutral'}>
                            {ad.status === 'active' ? 'Active' : 'Paused'}
                          </StatusBadge>
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#4B5563] dark:text-[#9CA3AF]">
                        ${ad.budget}/day
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium text-[#111827] dark:text-[#F3F4F6]">
                        ${ad.spend.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-[#06B6D4]">
                        {ad.roas.toFixed(1)}x
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#4B5563] dark:text-[#9CA3AF]">
                        {ad.ctr.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            title="Duplicate campaign"
                            onClick={() => {
                              onAddAd({
                                ...ad,
                                id: `a-${Date.now()}`,
                                name: `${ad.name} (Copy)`,
                                status: 'paused',
                                spend: 0,
                                impressions: 0,
                                clicks: 0,
                                conversions: 0,
                              });
                              onToast('Campaign Duplicated', `Created paused copy of ${ad.name}.`);
                            }}
                            className="p-1.5 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] rounded-md transition-colors"
                          >
                            <Copy size={14} strokeWidth={1.5} />
                          </button>
                          <button
                            title="Delete campaign"
                            onClick={() => {
                              onDeleteAd(ad.id);
                              onToast('Campaign Deleted');
                            }}
                            className="p-1.5 text-[#6B7280] hover:text-rose-500 rounded-md transition-colors"
                          >
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Launch Campaign Modal with AI Copy Generator */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-2xl bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                Launch Cross-Platform Ad Campaign
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] rounded-md"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-5 space-y-4 overflow-y-auto text-[12px] custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Campaign Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Q1 Social CRM Retargeting"
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Ad Platform</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value as AdPlatform })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  >
                    <option value="meta">Meta (Facebook &amp; Instagram)</option>
                    <option value="tiktok">TikTok Ads</option>
                    <option value="google">Google Search Ads</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Objective</label>
                  <select
                    value={form.objective}
                    onChange={(e) => setForm({ ...form, objective: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  >
                    <option value="Conversions">Conversions</option>
                    <option value="Leads">Lead Generation</option>
                    <option value="Traffic">Website Traffic</option>
                    <option value="Awareness">Brand Awareness</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Daily Budget ($)</label>
                  <input
                    type="number"
                    min={10}
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Target Audience</label>
                  <input
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>

              {/* AI Ad Copy Generator */}
              <div className="p-4 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5">
                    <Sparkles size={14} strokeWidth={1.5} className="text-[#06B6D4]" /> AI Ad Copy &amp; Creative Generator
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateAdCopy}
                    disabled={aiLoading}
                    className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[7px] text-[11px] font-medium transition-colors"
                  >
                    {aiLoading ? 'Generating...' : 'Generate 3 Variations'}
                  </button>
                </div>

                {aiVariations.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    {aiVariations.map((v, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, adCopy: `${v.headline} — ${v.primaryText} [${v.cta}]` });
                          onToast('Ad Copy Applied', `Selected variation #${idx + 1}.`);
                        }}
                        className="text-left p-3 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#06B6D4] rounded-[8px] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">{v.headline}</span>
                          <span className="text-[11px] font-medium text-[#06B6D4] flex items-center gap-1">
                            <Check size={11} strokeWidth={1.75} /> Use Copy
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">{v.primaryText}</p>
                        <p className="mt-1 text-[10px] text-[#6B7280]">Concept: {v.creativeConcept}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                  Campaign Ad Copy / Creative Note
                </label>
                <textarea
                  rows={3}
                  value={form.adCopy}
                  onChange={(e) => setForm({ ...form, adCopy: e.target.value })}
                  placeholder="Write ad copy or click one of the AI variations above..."
                  className="w-full p-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] font-medium text-[#4B5563] dark:text-[#9CA3AF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium transition-colors"
                >
                  Launch Active Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
