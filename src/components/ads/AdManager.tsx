import React, { useState, useMemo } from 'react';
import { Plus, Sparkles, Copy, Trash2, X, Check } from 'lucide-react';
import { AdCampaign, AdPlatform } from '../../types';
import { aiService } from '../../services/aiService';
import { SocialLogo } from '../common/SocialIcons';

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
    <div className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Cross-Platform Ad Manager
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage TikTok, Meta, and Google Ads performance alongside AI ad creative generation.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start shadow-sm shadow-indigo-600/20"
        >
          <Plus size={14} /> Launch Campaign
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
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
          >
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Platform Tabs */}
      <div className="inline-flex flex-wrap bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-1 rounded-lg text-xs font-semibold">
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
            className={`px-4 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              platformTab === tab.id
                ? 'bg-slate-900 dark:bg-[#4F46E5] text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.id !== 'all' && <SocialLogo platform={tab.id} size={14} />}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 font-semibold">Campaign</th>
                <th className="py-3 px-5 font-semibold">Platform</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold text-right">Daily Budget</th>
                <th className="py-3 px-5 font-semibold text-right">Spend</th>
                <th className="py-3 px-5 font-semibold text-right">ROAS</th>
                <th className="py-3 px-5 font-semibold text-right">CTR</th>
                <th className="py-3 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
              {filteredAds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-5 text-center">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      No ad campaigns yet
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Launch your first Meta, TikTok, or Google Ads campaign to track spend, CTR, and ROAS.
                    </p>
                    <button
                      onClick={() => setShowCreate(true)}
                      className="mt-3 px-3.5 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Plus size={13} /> Launch Campaign
                    </button>
                  </td>
                </tr>
              ) : (
                filteredAds.map((ad) => (
                <tr key={ad.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-5 max-w-xs">
                    <p className="font-bold text-slate-900 dark:text-white">{ad.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{ad.adCopy || ad.audience}</p>
                  </td>
                  <td className="py-3.5 px-5 font-semibold uppercase text-slate-700 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <SocialLogo platform={ad.platform} size={16} />
                      <span>{ad.platform === 'meta' ? 'Meta' : ad.platform === 'tiktok' ? 'TikTok' : 'Google'}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <button
                      onClick={() => {
                        const nextStatus = ad.status === 'active' ? 'paused' : 'active';
                        onUpdateAd({ ...ad, status: nextStatus });
                        onToast(`Campaign ${nextStatus === 'active' ? 'Activated' : 'Paused'}`, ad.name);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                        ad.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {ad.status === 'active' ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="py-3.5 px-5 text-right font-semibold text-slate-800 dark:text-slate-200">
                    ${ad.budget}/day
                  </td>
                  <td className="py-3.5 px-5 text-right font-semibold text-slate-900 dark:text-white">
                    ${ad.spend.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-5 text-right font-bold text-[#4F46E5] dark:text-indigo-400">{ad.roas.toFixed(1)}x</td>
                  <td className="py-3.5 px-5 text-right text-slate-700 dark:text-slate-300">{ad.ctr.toFixed(1)}%</td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="inline-flex items-center gap-2">
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
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        title="Delete campaign"
                        onClick={() => {
                          onDeleteAd(ad.id);
                          onToast('Campaign Deleted');
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
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

      {/* Launch Campaign Modal with AI Copy Generator */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/65" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Launch Cross-Platform Ad Campaign
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4 overflow-y-auto text-xs custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Campaign Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Q1 Social CRM Retargeting"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Ad Platform</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value as AdPlatform })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  >
                    <option value="meta">Meta (Facebook & Instagram)</option>
                    <option value="tiktok">TikTok Ads</option>
                    <option value="google">Google Search Ads</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Objective</label>
                  <select
                    value={form.objective}
                    onChange={(e) => setForm({ ...form, objective: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  >
                    <option value="Conversions">Conversions</option>
                    <option value="Leads">Lead Generation</option>
                    <option value="Traffic">Website Traffic</option>
                    <option value="Awareness">Brand Awareness</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Daily Budget ($)</label>
                  <input
                    type="number"
                    min={10}
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none tabular-nums"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Audience</label>
                  <input
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* AI Ad Copy Generator */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#4F46E5]" /> AI Ad Copy & Creative Generator
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateAdCopy}
                    disabled={aiLoading}
                    className="px-3 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-md text-[11px] font-semibold"
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
                        className="text-left p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-lg transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{v.headline}</span>
                          <span className="text-[10px] font-semibold text-[#4F46E5] flex items-center gap-1">
                            <Check size={11} /> Use Copy
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{v.primaryText}</p>
                        <p className="mt-1 text-[10px] text-slate-400">Concept: {v.creativeConcept}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Campaign Ad Copy / Creative Note
                </label>
                <textarea
                  rows={3}
                  value={form.adCopy}
                  onChange={(e) => setForm({ ...form, adCopy: e.target.value })}
                  placeholder="Write ad copy or click one of the AI variations above..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg font-semibold"
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
