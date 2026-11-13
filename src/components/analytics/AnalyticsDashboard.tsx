import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Sparkles,
  Download,
  TrendingUp,
  ArrowUpRight,
  Send,
  Bell,
  Plus,
  Filter,
  FileText,
  Printer,
  Clock,
  X,
  Check,
} from 'lucide-react';
import { AppState, Platform, DiscoveryAlert } from '../../types';
import { aiService } from '../../services/aiService';
import { ALL_PLATFORMS, PLATFORM_META, PlatformTag } from '../common/PlatformMeta';

interface AnalyticsDashboardProps {
  state: AppState;
  onCreateDraftFromAlert: (alert: DiscoveryAlert) => void;
  onTriggerSpikeAlert: () => void;
  onAcknowledgeAlert: (id: string) => void;
  onToast: (title: string, description?: string) => void;
}

const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HEATMAP_HOURS = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
const HEATMAP_SCORES: number[][] = [
  [34, 88, 72, 61, 79, 44],
  [41, 94, 83, 68, 74, 49],
  [38, 91, 96, 75, 81, 52],
  [45, 86, 89, 84, 77, 56],
  [32, 79, 74, 63, 69, 41],
  [28, 64, 71, 58, 62, 48],
  [25, 59, 68, 54, 73, 61],
];

export function AnalyticsDashboard({
  state,
  onCreateDraftFromAlert,
  onTriggerSpikeAlert,
  onAcknowledgeAlert,
  onToast,
}: AnalyticsDashboardProps) {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [aiQuery, setAiQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [selectedHeatCell, setSelectedHeatCell] = useState<{ day: string; hour: string; score: number }>({
    day: 'Wed',
    hour: '12:00',
    score: 96,
  });

  // Branded PDF Report Builder Modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const activeWorkspace =
    state.workspaces.find((w) => w.id === state.activeWorkspaceId) || state.workspaces[0];
  const [reportBrandName, setReportBrandName] = useState(activeWorkspace.name);
  const [reportClientName, setReportClientName] = useState('Executive Marketing Stakeholder');
  const [reportAccent, setReportAccent] = useState('#4F46E5');
  const [reportSections, setReportSections] = useState({
    followers: true,
    engagement: true,
    heatmap: true,
    topPosts: true,
  });

  const wsId = state.activeWorkspaceId;

  const wsPosts = useMemo(
    () =>
      state.posts.filter(
        (p) =>
          p.workspaceId === wsId &&
          (platformFilter === 'all' || p.platforms.includes(platformFilter))
      ),
    [state.posts, wsId, platformFilter]
  );

  const wsProfiles = useMemo(
    () =>
      state.connectedProfiles.filter(
        (p) =>
          p.workspaceId === wsId &&
          p.status === 'connected' &&
          (platformFilter === 'all' || p.platform === platformFilter)
      ),
    [state.connectedProfiles, wsId, platformFilter]
  );

  const wsDeals = useMemo(() => state.deals.filter((d) => d.workspaceId === wsId), [state.deals, wsId]);
  const wsAds = useMemo(() => state.ads.filter((a) => a.workspaceId === wsId), [state.ads, wsId]);
  const wsAlerts = useMemo(
    () => state.discoveryAlerts.filter((a) => a.workspaceId === wsId),
    [state.discoveryAlerts, wsId]
  );

  const rangeMultiplier = range === '7d' ? 0.34 : range === '30d' ? 1 : 2.65;

  const kpis = useMemo(() => {
    const baseFollowers = wsProfiles.reduce((s, p) => s + p.followers, 0);
    const published = wsPosts.filter((p) => p.status === 'published');
    const baseReach = published.reduce((acc, p) => acc + (p.analytics?.reach || 0), 0);
    const baseEngagement = published.reduce((acc, p) => acc + (p.analytics?.engagement || 0), 0);
    const baseClicks = published.reduce((acc, p) => acc + (p.analytics?.clicks || 0), 0);

    const reach = Math.round((baseReach || 38000) * rangeMultiplier);
    const engagement = Math.round((baseEngagement || 2400) * rangeMultiplier);
    const engRate = reach > 0 ? ((engagement / reach) * 100).toFixed(2) : '0.00';
    const pipelineValue = wsDeals.reduce((acc, d) => acc + d.value, 0);
    const wonValue = wsDeals.filter((d) => d.stage === 'won').reduce((acc, d) => acc + d.value, 0);
    const avgRoas = wsAds.length
      ? (wsAds.reduce((acc, a) => acc + a.roas, 0) / wsAds.length).toFixed(1)
      : '3.4';

    return {
      totalFollowers: baseFollowers || 42500,
      followerGain: Math.round((baseFollowers || 42500) * (range === '7d' ? 0.018 : range === '30d' ? 0.064 : 0.162)),
      reach,
      engagement,
      clicks: Math.round((baseClicks || 940) * rangeMultiplier),
      engRate,
      pipelineValue,
      wonValue,
      avgRoas,
    };
  }, [wsProfiles, wsPosts, wsDeals, wsAds, rangeMultiplier, range]);

  const followerSeries = useMemo(() => {
    const start = Math.max(1000, kpis.totalFollowers - kpis.followerGain);
    const labels =
      range === '7d'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : range === '30d'
        ? ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5']
        : ['Aug', 'Sep', 'Oct', 'Nov'];

    return labels.map((label, idx) => {
      const progress = (idx + 1) / labels.length;
      return {
        label,
        followers: Math.round(start + kpis.followerGain * Math.pow(progress, 0.92)),
      };
    });
  }, [kpis.totalFollowers, kpis.followerGain, range]);

  const engagementSeries = useMemo(() => {
    const labels =
      range === '7d'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : range === '30d'
        ? ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4']
        : ['Sep', 'Oct', 'Nov'];

    return labels.map((label, idx) => {
      const impressions = Math.round((kpis.reach / labels.length) * (0.82 + (idx % 3) * 0.16));
      const engagements = Math.round((kpis.engagement / labels.length) * (0.78 + (idx % 3) * 0.21));
      const engRate = Number(((engagements / Math.max(1, impressions)) * 100).toFixed(2));
      return {
        label,
        impressions,
        engagements,
        engRate,
      };
    });
  }, [kpis.reach, kpis.engagement, range]);

  const topPosts = useMemo(() => {
    return wsPosts
      .filter((p) => p.status === 'published' || p.analytics)
      .sort((a, b) => (b.analytics?.reach || 0) - (a.analytics?.reach || 0));
  }, [wsPosts]);

  const handleAskAnalyst = async (customQuery?: string) => {
    const q = (customQuery ?? aiQuery).trim();
    if (!q) return;
    setAiQuery(q);
    setAiLoading(true);
    try {
      const answer = await aiService.askAnalyst(state, q);
      setAiAnswer(answer);
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportCsv = () => {
    const rows = [
      ['Metric', 'Value', 'Timeframe', 'Network Filter'],
      ['Total Followers', String(kpis.totalFollowers), range, platformFilter],
      ['Follower Growth', `+${kpis.followerGain}`, range, platformFilter],
      ['Impressions', String(kpis.reach), range, platformFilter],
      ['Engagement Rate', `${kpis.engRate}%`, range, platformFilter],
      ['CRM Pipeline', `$${kpis.pipelineValue}`, range, platformFilter],
      ['Best Posting Window', `${selectedHeatCell.day} ${selectedHeatCell.hour}`, range, platformFilter],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `socialifyai-analytics-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Analytics CSV Exported', `Downloaded ${range} summary.`);
  };

  const handleDownloadBrandedReport = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${reportBrandName} - White-Label Social Report</title>
    <style>body{font-family:system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#0f172a}
    .hdr{border-bottom:4px solid ${reportAccent};padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-end}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
    .card{border:1px solid #e2e8f0;border-radius:10px;padding:14px}
    .val{font-size:22px;font-weight:800;color:${reportAccent};margin-top:6px}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left}
    </style></head><body>
    <div class="hdr"><div><p style="font-size:11px;font-weight:700;color:${reportAccent};text-transform:uppercase">${reportBrandName}</p>
    <h1 style="margin:4px 0 0;font-size:24px">Social Performance Report (${range.toUpperCase()})</h1></div>
    <p style="font-size:12px;color:#64748b">Prepared for: <strong>${reportClientName}</strong></p></div>
    <div class="grid">
      <div class="card"><div>Audience</div><div class="val">${kpis.totalFollowers.toLocaleString()}</div></div>
      <div class="card"><div>Impressions</div><div class="val">${kpis.reach.toLocaleString()}</div></div>
      <div class="card"><div>Engagement Rate</div><div class="val">${kpis.engRate}%</div></div>
      <div class="card"><div>Best Window</div><div class="val">${selectedHeatCell.day} ${selectedHeatCell.hour}</div></div>
    </div>
    <h3>Top Performing Posts</h3>
    <table><thead><tr><th>Post</th><th>Reach</th><th>Engagements</th><th>Clicks</th></tr></thead><tbody>
    ${topPosts
      .slice(0, 5)
      .map(
        (p) =>
          `<tr><td>${p.content.slice(0, 80)}...</td><td>${(p.analytics?.reach || 0).toLocaleString()}</td><td>${(
            p.analytics?.engagement || 0
          ).toLocaleString()}</td><td>${(p.analytics?.clicks || 0).toLocaleString()}</td></tr>`
      )
      .join('')}
    </tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportBrandName.toLowerCase().replace(/\s+/g, '-')}-white-label-report.html`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Branded Report Downloaded', `Saved white-label report for ${reportClientName}.`);
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Analytics & White-Label Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track follower growth, engagement rate, impressions, optimal posting windows, and client PDF exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
            <Filter size={13} className="text-slate-400" />
            <select
              aria-label="Filter analytics by social platform"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">All 10 Networks</option>
              {ALL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_META[p].label}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  range === r
                    ? 'bg-[#4F46E5] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
          >
            <Download size={14} /> CSV
          </button>

          <button
            onClick={() => {
              setReportBrandName(activeWorkspace.name);
              setShowPdfModal(true);
            }}
            className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
          >
            <FileText size={14} /> Export Branded PDF Report
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Audience',
            value: kpis.totalFollowers.toLocaleString(),
            sub: `+${kpis.followerGain.toLocaleString()} new followers (${range})`,
          },
          {
            label: `Total Impressions (${range})`,
            value: kpis.reach.toLocaleString(),
            sub: `${kpis.clicks.toLocaleString()} attributed link clicks`,
          },
          {
            label: 'Avg. Engagement Rate',
            value: `${kpis.engRate}%`,
            sub: `${kpis.engagement.toLocaleString()} likes, comments & saves`,
          },
          {
            label: 'CRM Pipeline Attributed',
            value: `$${kpis.pipelineValue.toLocaleString()}`,
            sub: `$${kpis.wonValue.toLocaleString()} won · ${kpis.avgRoas}x Ad ROAS`,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {card.value}
            </p>
            <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Recharts Row: Follower Growth + Engagement Rate & Impressions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Follower Growth</h3>
              <p className="text-xs text-slate-500">Net audience expansion ({range})</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 tabular-nums">
              <ArrowUpRight size={14} /> +{kpis.followerGain.toLocaleString()}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={followerSeries}>
                <defs>
                  <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={['dataMin - 500', 'dataMax + 500']}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  fill="url(#followerGrad)"
                  name="Followers"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Impressions & Engagement Rate (%)
              </h3>
              <p className="text-xs text-slate-500">Bar volume = Impressions · Amber curve = Engagement Rate</p>
            </div>
            <span className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 tabular-nums">
              Avg {kpis.engRate}% ER
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={engagementSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#F59E0B' }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip />
                <Bar yAxisId="left" dataKey="impressions" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Impressions" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="engRate"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#F59E0B' }}
                  name="Engagement Rate %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Best Times to Post Heatmap + AI Analyst / Discovery Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Best Times to Post Heatmap */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock size={15} className="text-[#4F46E5]" /> Best Times to Post Heatmap
              </h3>
              <p className="text-xs text-slate-500">Click any time slot to inspect engagement index</p>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-[11px] font-bold text-[#4F46E5] dark:text-indigo-300 tabular-nums">
              Peak: {selectedHeatCell.day} {selectedHeatCell.hour} ({selectedHeatCell.score}/100)
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[420px] space-y-1.5">
              <div className="grid grid-cols-7 gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                <div />
                {HEATMAP_HOURS.map((hr) => (
                  <div key={hr} className="text-center font-mono">{hr}</div>
                ))}
              </div>
              {HEATMAP_DAYS.map((day, dIdx) => (
                <div key={day} className="grid grid-cols-7 gap-1.5 items-center">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{day}</span>
                  {HEATMAP_HOURS.map((hr, hIdx) => {
                    const score = HEATMAP_SCORES[dIdx][hIdx];
                    const isPeak = score >= 90;
                    const isSelected = selectedHeatCell.day === day && selectedHeatCell.hour === hr;
                    const bgClass =
                      score >= 90
                        ? 'bg-amber-500 text-white'
                        : score >= 75
                        ? 'bg-[#4F46E5] text-white'
                        : score >= 55
                        ? 'bg-indigo-200 dark:bg-indigo-900/70 text-indigo-950 dark:text-indigo-100'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500';
                    return (
                      <button
                        key={hr}
                        type="button"
                        onClick={() => setSelectedHeatCell({ day, hour: hr, score })}
                        title={`${day} ${hr}: Engagement Score ${score}/100`}
                        className={`h-9 rounded-lg text-[11px] font-mono font-bold transition-transform hover:scale-[1.03] ${bgClass} ${
                          isSelected ? 'ring-2 ring-slate-900 dark:ring-white' : ''
                        }`}
                      >
                        {score}
                        {isPeak ? '★' : ''}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Analyst & Discovery Spike Alerts */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-[#4F46E5]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Performance Analyst</h3>
              </div>
              <div className="flex gap-1.5">
                {['Summarize ROAS', 'Pipeline ROI'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleAskAnalyst(preset)}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAnalyst();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask about ROAS, pipeline, or best performing posts..."
                className="flex-1 px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#4F46E5]"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="px-3.5 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Send size={12} /> {aiLoading ? '...' : 'Ask'}
              </button>
            </form>
            {aiAnswer && (
              <p className="mt-3 p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                {aiAnswer}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bell size={14} className="text-amber-500" /> Content Discovery Alerts
              </h3>
              <button
                onClick={onTriggerSpikeAlert}
                className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-md text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1"
              >
                <TrendingUp size={12} /> Monitor Spikes
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
              {wsAlerts.map((alert) => (
                <div key={alert.id} className="p-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      {alert.keyword} ({alert.velocity})
                    </p>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{alert.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onCreateDraftFromAlert(alert)}
                      className="px-2.5 py-1 bg-[#4F46E5] text-white rounded text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Plus size={11} /> Draft
                    </button>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => onAcknowledgeAlert(alert.id)}
                        className="text-[10px] text-slate-400 hover:text-slate-700"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Posts Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Performing Posts</h3>
            <p className="text-xs text-slate-500">Ranked by organic reach, engagements, and click-through rate</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 font-semibold">Post Content</th>
                <th className="py-3 px-5 font-semibold">Networks</th>
                <th className="py-3 px-5 font-semibold text-right">Impressions</th>
                <th className="py-3 px-5 font-semibold text-right">Engagements</th>
                <th className="py-3 px-5 font-semibold text-right">ER %</th>
                <th className="py-3 px-5 font-semibold text-right">Link Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
              {topPosts.map((post) => {
                const reach = post.analytics?.reach || 0;
                const eng = post.analytics?.engagement || 0;
                const er = reach > 0 ? ((eng / reach) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={post.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-5 max-w-md">
                      <div className="flex items-center gap-3">
                        {post.media?.[0] && (
                          <img src={post.media[0]} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        )}
                        <span className="font-medium text-slate-900 dark:text-white line-clamp-2">
                          {post.content}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex flex-wrap gap-2">
                        {post.platforms.map((pl) => (
                          <PlatformTag key={pl} platform={pl} showFull={false} />
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right font-semibold text-slate-900 dark:text-white">
                      {reach.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right font-semibold text-slate-900 dark:text-white">
                      {eng.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {er}%
                    </td>
                    <td className="py-3.5 px-5 text-right font-semibold text-[#4F46E5] dark:text-indigo-400">
                      {(post.analytics?.clicks || 0).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Branded PDF Report Preview Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/65" onClick={() => setShowPdfModal(false)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  White-Label Branded PDF Report Builder
                </h3>
                <p className="text-xs text-slate-500">Customize client branding & sections before exporting.</p>
              </div>
              <button onClick={() => setShowPdfModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar">
              {/* Customizer Controls */}
              <div className="lg:col-span-4 space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Agency / Brand Header</label>
                  <input
                    value={reportBrandName}
                    onChange={(e) => setReportBrandName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Client / Recipient Name</label>
                  <input
                    value={reportClientName}
                    onChange={(e) => setReportClientName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Brand Accent Color</label>
                  <div className="flex gap-2">
                    {['#4F46E5', '#0F172A', '#0EA5E9', '#10B981', '#D97706'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setReportAccent(hex)}
                        className={`w-7 h-7 rounded-md border-2 ${
                          reportAccent === hex ? 'border-slate-900 dark:border-white scale-105' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Included Report Modules</p>
                  {(
                    [
                      { key: 'followers', label: 'Follower Growth Summary' },
                      { key: 'engagement', label: 'Impressions & Engagement Rate' },
                      { key: 'heatmap', label: 'Optimal Posting Window' },
                      { key: 'topPosts', label: 'Top Performing Posts Table' },
                    ] as const
                  ).map((sec) => (
                    <label key={sec.key} className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={reportSections[sec.key]}
                        onChange={(e) =>
                          setReportSections({ ...reportSections, [sec.key]: e.target.checked })
                        }
                      />
                      <span>{sec.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Live A4 Sheet Preview */}
              <div className="lg:col-span-8 bg-slate-100 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="bg-white text-slate-900 rounded-lg shadow-lg p-6 space-y-5">
                  <div
                    className="pb-4 flex items-end justify-between border-b-4"
                    style={{ borderBottomColor: reportAccent }}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: reportAccent }}>
                        {reportBrandName}
                      </p>
                      <h4 className="font-display text-xl font-extrabold mt-0.5">
                        Social Performance Executive Report
                      </h4>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <p>Period: {range.toUpperCase()}</p>
                      <p>For: {reportClientName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                    {reportSections.followers && (
                      <div className="p-3 rounded-lg border border-slate-200">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Total Audience</p>
                        <p className="text-lg font-extrabold mt-1" style={{ color: reportAccent }}>
                          {kpis.totalFollowers.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {reportSections.engagement && (
                      <>
                        <div className="p-3 rounded-lg border border-slate-200">
                          <p className="text-[10px] uppercase text-slate-400 font-bold">Impressions</p>
                          <p className="text-lg font-extrabold mt-1" style={{ color: reportAccent }}>
                            {kpis.reach.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-200">
                          <p className="text-[10px] uppercase text-slate-400 font-bold">Eng. Rate</p>
                          <p className="text-lg font-extrabold mt-1" style={{ color: reportAccent }}>
                            {kpis.engRate}%
                          </p>
                        </div>
                      </>
                    )}
                    {reportSections.heatmap && (
                      <div className="p-3 rounded-lg border border-slate-200">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Peak Window</p>
                        <p className="text-lg font-extrabold mt-1" style={{ color: reportAccent }}>
                          {selectedHeatCell.day} {selectedHeatCell.hour}
                        </p>
                      </div>
                    )}
                  </div>

                  {reportSections.topPosts && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Top Performing Posts Snapshot
                      </p>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg text-[11px]">
                        {topPosts.slice(0, 4).map((p) => (
                          <div key={p.id} className="px-3 py-2 flex items-center justify-between gap-3">
                            <span className="truncate font-medium">{p.content}</span>
                            <span className="font-mono font-bold shrink-0">
                              {(p.analytics?.reach || 0).toLocaleString()} reach
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDownloadBrandedReport}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Download size={13} /> Download Branded Report
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  onToast('Print / Save PDF Opened', 'Choose "Save as PDF" in your browser print dialog.');
                }}
                className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer size={13} /> Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
