import React, { useState, useMemo } from 'react';
import {
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
  Send,
  Bell,
  Plus,
  Filter,
  FileText,
  Printer,
  Clock,
  X,
  Users,
  BarChart3,
} from 'lucide-react';
import { AppState, Platform, DiscoveryAlert } from '../../types';
import { aiService } from '../../services/aiService';
import { ALL_PLATFORMS, PLATFORM_META, PlatformTag } from '../common/PlatformMeta';
import { KpiMetricCard, StatusBadge, EmptyStatePanel } from '../common/DesignPrimitives';

interface AnalyticsDashboardProps {
  state: AppState;
  onCreateDraftFromAlert: (alert: DiscoveryAlert) => void;
  onTriggerSpikeAlert: () => void;
  onAcknowledgeAlert: (id: string) => void;
  onToast: (title: string, description?: string, variant?: 'success' | 'info' | 'warning') => void;
}

const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HEATMAP_HOURS = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];

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

  const [selectedHeatCell, setSelectedHeatCell] = useState<{ day: string; hour: string; score: number } | null>(null);

  // Branded PDF Report Builder Modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const activeWorkspace =
    state.workspaces.find((w) => w.id === state.activeWorkspaceId) || state.workspaces[0];
  const [reportBrandName, setReportBrandName] = useState(activeWorkspace.name);
  const [reportClientName, setReportClientName] = useState('Executive Marketing Stakeholder');
  const [reportAccent, setReportAccent] = useState('#06B6D4');
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

  const publishedInRange = useMemo(() => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return wsPosts
      .filter((p) => p.status === 'published')
      .filter((p) => {
        const ts = Date.parse(p.scheduledAt);
        return Number.isNaN(ts) || ts >= cutoff;
      });
  }, [wsPosts, range]);

  const kpis = useMemo(() => {
    const totalFollowers = wsProfiles.reduce((s, p) => s + p.followers, 0);
    const reach = publishedInRange.reduce((acc, p) => acc + (p.analytics?.reach || 0), 0);
    const engagement = publishedInRange.reduce((acc, p) => acc + (p.analytics?.engagement || 0), 0);
    const clicks = publishedInRange.reduce((acc, p) => acc + (p.analytics?.clicks || 0), 0);
    const engRate = reach > 0 ? ((engagement / reach) * 100).toFixed(2) : '0.00';
    const pipelineValue = wsDeals.reduce((acc, d) => acc + d.value, 0);
    const wonValue = wsDeals.filter((d) => d.stage === 'won').reduce((acc, d) => acc + d.value, 0);
    const avgRoas = wsAds.length
      ? (wsAds.reduce((acc, a) => acc + a.roas, 0) / wsAds.length).toFixed(1)
      : '0.0';

    return {
      totalFollowers,
      connectedCount: wsProfiles.length,
      publishedCount: publishedInRange.length,
      reach,
      engagement,
      clicks,
      engRate,
      pipelineValue,
      wonValue,
      avgRoas,
    };
  }, [wsProfiles, publishedInRange, wsDeals, wsAds]);

  // Real audience breakdown across connected profiles (zero fabricated trend lines)
  const audienceByProfile = useMemo(() => {
    return wsProfiles.map((p) => ({
      label: p.accountName.length > 14 ? `${p.accountName.slice(0, 14)}…` : p.accountName,
      followers: p.followers,
      platform: PLATFORM_META[p.platform].label,
    }));
  }, [wsProfiles]);

  // Real impressions & engagement from published posts in range
  const engagementSeries = useMemo(() => {
    return publishedInRange
      .slice()
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .map((post, idx) => {
        const impressions = post.analytics?.reach || 0;
        const engagements = post.analytics?.engagement || 0;
        const engRate = impressions > 0 ? Number(((engagements / impressions) * 100).toFixed(2)) : 0;
        const parsed = new Date(post.scheduledAt);
        const label = Number.isNaN(parsed.getTime())
          ? `Post ${idx + 1}`
          : parsed.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return {
          label,
          impressions,
          engagements,
          engRate,
        };
      });
  }, [publishedInRange]);

  // Dynamic posting-window heatmap computed strictly from published posts with engagement
  const heatmapData = useMemo(() => {
    const grid: number[][] = HEATMAP_DAYS.map(() => HEATMAP_HOURS.map(() => 0));
    const counts: number[][] = HEATMAP_DAYS.map(() => HEATMAP_HOURS.map(() => 0));
    let maxVal = 0;

    for (const post of publishedInRange) {
      const dt = new Date(post.scheduledAt);
      if (Number.isNaN(dt.getTime())) continue;
      const dIdx = (dt.getDay() + 6) % 7; // Mon=0 .. Sun=6
      const hr = dt.getHours();
      const hIdx = Math.min(HEATMAP_HOURS.length - 1, Math.max(0, Math.floor((hr - 4) / 3)));
      const weight = (post.analytics?.engagement || 0) + (post.analytics?.clicks || 0) || 1;
      grid[dIdx][hIdx] += weight;
      counts[dIdx][hIdx] += 1;
    }

    const avgGrid = grid.map((row, dIdx) =>
      row.map((total, hIdx) => {
        const avg = counts[dIdx][hIdx] > 0 ? total / counts[dIdx][hIdx] : 0;
        if (avg > maxVal) maxVal = avg;
        return avg;
      })
    );

    const normalized = avgGrid.map((row) =>
      row.map((val) => (maxVal > 0 ? Math.round((val / maxVal) * 100) : 0))
    );

    let peak: { day: string; hour: string; score: number } | null = null;
    if (maxVal > 0) {
      normalized.forEach((row, dIdx) => {
        row.forEach((score, hIdx) => {
          if (!peak || score > peak.score) {
            peak = { day: HEATMAP_DAYS[dIdx], hour: HEATMAP_HOURS[hIdx], score };
          }
        });
      });
    }

    return { scores: normalized, hasData: maxVal > 0, peak };
  }, [publishedInRange]);

  const activeHeatCell = selectedHeatCell || heatmapData.peak;

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
    } catch (err) {
      onToast(
        'AI Analyst Unavailable',
        err instanceof Error ? err.message : 'Unable to analyze workspace metrics right now.',
        'warning'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportCsv = () => {
    const rows = [
      ['Metric', 'Value', 'Timeframe', 'Network Filter'],
      ['Total Followers', String(kpis.totalFollowers), range, platformFilter],
      ['Connected Profiles', String(kpis.connectedCount), range, platformFilter],
      ['Published Posts', String(kpis.publishedCount), range, platformFilter],
      ['Impressions', String(kpis.reach), range, platformFilter],
      ['Engagement Rate', `${kpis.engRate}%`, range, platformFilter],
      ['CRM Pipeline', `$${kpis.pipelineValue}`, range, platformFilter],
      ['Best Posting Window', activeHeatCell ? `${activeHeatCell.day} ${activeHeatCell.hour}` : 'N/A', range, platformFilter],
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
      <div class="card"><div>Best Window</div><div class="val">${activeHeatCell ? `${activeHeatCell.day} ${activeHeatCell.hour}` : 'N/A'}</div></div>
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
    <div className="h-full overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-[#090A0D] custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-5">
          <div>
            <p className="text-[11px] font-medium text-[#06B6D4] uppercase tracking-[0.04em]">
              Cross-Channel Intelligence &amp; White-Label Exports
            </p>
            <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] mt-1">
              Analytics &amp; White-Label Reports
            </h1>
            <p className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF] mt-1">
              Track follower growth, engagement rate, impressions, optimal posting windows, and client PDF exports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] px-3 py-1.5">
              <Filter size={13} strokeWidth={1.5} className="text-[#6B7280]" />
              <select
                aria-label="Filter analytics by social platform"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
                className="bg-transparent text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none cursor-pointer"
              >
                <option value="all">All 10 Networks</option>
                {ALL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_META[p].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="inline-flex bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] p-0.5">
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium font-mono transition-colors ${
                    range === r
                      ? 'bg-[#FFFFFF] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.08]'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCsv}
              className="px-3 py-2 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 transition-colors"
            >
              <Download size={13} strokeWidth={1.5} /> CSV
            </button>

            <button
              onClick={() => {
                setReportBrandName(activeWorkspace.name);
                setShowPdfModal(true);
              }}
              className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <FileText size={13} strokeWidth={1.5} /> Export Branded PDF Report
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiMetricCard
            label="Total Audience"
            value={kpis.totalFollowers.toLocaleString()}
            sub={
              kpis.connectedCount > 0
                ? `Across ${kpis.connectedCount} connected profile${kpis.connectedCount === 1 ? '' : 's'}`
                : 'No social profiles connected yet'
            }
          />
          <KpiMetricCard
            label={`Total Impressions (${range})`}
            value={kpis.reach.toLocaleString()}
            sub={`${kpis.clicks.toLocaleString()} link clicks · ${kpis.publishedCount} published post${kpis.publishedCount === 1 ? '' : 's'}`}
          />
          <KpiMetricCard
            label="Avg. Engagement Rate"
            value={`${kpis.engRate}%`}
            sub={`${kpis.engagement.toLocaleString()} likes, comments & saves`}
          />
          <KpiMetricCard
            label="CRM Pipeline Attributed"
            value={`$${kpis.pipelineValue.toLocaleString()}`}
            sub={`$${kpis.wonValue.toLocaleString()} won · ${kpis.avgRoas}x Ad ROAS`}
          />
        </div>

        {/* Recharts Row: Connected Audience + Post Impressions & Engagement Rate */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                  Audience by Profile
                </h3>
                <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">Live followers from connected accounts</p>
              </div>
              <span className="text-[12px] font-mono font-medium text-[#4B5563] dark:text-[#9CA3AF] tabular-nums">
                {kpis.totalFollowers.toLocaleString()} total
              </span>
            </div>
            {audienceByProfile.length === 0 ? (
              <div className="border border-dashed border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px]">
                <EmptyStatePanel
                  icon={Users}
                  title="Connect an account to see live analytics"
                  description="Once you connect your social profiles, audience totals and per-channel follower breakdowns appear here."
                />
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={audienceByProfile}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.18)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#13161D',
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#F3F4F6',
                      }}
                    />
                    <Bar dataKey="followers" fill="#06B6D4" radius={[4, 4, 0, 0]} name="Followers" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                  Impressions &amp; Engagement Rate (%)
                </h3>
                <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
                  Cyan bars = Impressions · Orange line = Engagement Rate
                </p>
              </div>
              <StatusBadge tone="cyan">Avg {kpis.engRate}% ER</StatusBadge>
            </div>
            {engagementSeries.length === 0 ? (
              <div className="border border-dashed border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px]">
                <EmptyStatePanel
                  icon={BarChart3}
                  title="No published post metrics in this range"
                  description="Publish posts from Content Studio or Visual Scheduler to track real impressions, clicks, and engagement rates."
                />
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={engagementSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.18)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#F97316' }}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#13161D',
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#F3F4F6',
                      }}
                    />
                    <Bar yAxisId="left" dataKey="impressions" fill="#06B6D4" radius={[4, 4, 0, 0]} name="Impressions" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="engRate"
                      stroke="#F97316"
                      strokeWidth={2}
                      dot={{ r: 3.5, fill: '#F97316' }}
                      name="Engagement Rate %"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Best Times to Post Heatmap + AI Analyst / Discovery Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Best Times to Post Heatmap */}
          <div className="lg:col-span-6 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em] flex items-center gap-1.5">
                  <Clock size={15} strokeWidth={1.5} className="text-[#06B6D4]" /> Best Times to Post Heatmap
                </h3>
                <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
                  Calculated dynamically from your published post engagement
                </p>
              </div>
              {activeHeatCell && (
                <StatusBadge tone="cyan">
                  Peak: {activeHeatCell.day} {activeHeatCell.hour} ({activeHeatCell.score}/100)
                </StatusBadge>
              )}
            </div>

            {!heatmapData.hasData ? (
              <div className="border border-dashed border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px]">
                <EmptyStatePanel
                  icon={Clock}
                  title="No posting window data yet"
                  description="Publish posts across different days and times to compute your real optimal posting heatmap."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[420px] space-y-1.5">
                  <div className="grid grid-cols-7 gap-1.5 text-[10px] font-mono uppercase text-[#6B7280]">
                    <div />
                    {HEATMAP_HOURS.map((hr) => (
                      <div key={hr} className="text-center">{hr}</div>
                    ))}
                  </div>
                  {HEATMAP_DAYS.map((day, dIdx) => (
                    <div key={day} className="grid grid-cols-7 gap-1.5 items-center">
                      <span className="text-[12px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">{day}</span>
                      {HEATMAP_HOURS.map((hr, hIdx) => {
                        const score = heatmapData.scores[dIdx][hIdx];
                        const isPeak = score >= 90;
                        const isSelected = activeHeatCell?.day === day && activeHeatCell?.hour === hr;
                        const bgClass = isPeak
                          ? 'bg-[#F97316] text-white'
                          : score >= 75
                          ? 'bg-[#06B6D4] text-[#090A0D]'
                          : score >= 55
                          ? 'bg-[#06B6D4]/25 text-[#111827] dark:text-[#F3F4F6]'
                          : 'bg-[#F3F4F6] dark:bg-[#0E1015] text-[#6B7280] border border-[#E5E7EB] dark:border-white/[0.06]';
                        return (
                          <button
                            key={hr}
                            type="button"
                            onClick={() => setSelectedHeatCell({ day, hour: hr, score })}
                            title={`${day} ${hr}: Engagement Score ${score}/100`}
                            className={`h-9 rounded-[6px] text-[11px] font-mono font-semibold tabular-nums transition-colors ${bgClass} ${
                              isSelected ? 'ring-2 ring-[#111827] dark:ring-[#F3F4F6]' : ''
                            }`}
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Analyst & Discovery Spike Alerts */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} strokeWidth={1.5} className="text-[#06B6D4]" />
                  <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                    AI Performance Analyst
                  </h3>
                </div>
                <div className="flex gap-1.5">
                  {['Summarize ROAS', 'Pipeline ROI'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleAskAnalyst(preset)}
                      className="px-2.5 py-1 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[6px] text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF] transition-colors"
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
                  className="flex-1 px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[12px] text-[#111827] dark:text-[#F3F4F6] placeholder:text-[#6B7280] outline-none focus:border-[#06B6D4]"
                />
                <button
                  type="submit"
                  disabled={aiLoading}
                  className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Send size={12} strokeWidth={1.5} /> {aiLoading ? '...' : 'Ask'}
                </button>
              </form>
              {aiAnswer && (
                <p className="mt-3 p-3 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#06B6D4]/25 text-[12px] text-[#111827] dark:text-[#F3F4F6] leading-relaxed">
                  {aiAnswer}
                </p>
              )}
            </div>

            <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5">
                  <Bell size={14} strokeWidth={1.5} className="text-[#F97316]" /> Content Discovery Alerts
                </h3>
                <button
                  onClick={onTriggerSpikeAlert}
                  className="px-2.5 py-1 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#F97316]/50 rounded-[6px] text-[11px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1 transition-colors"
                >
                  <TrendingUp size={12} strokeWidth={1.5} className="text-[#F97316]" /> Monitor Spikes
                </button>
              </div>
              <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] max-h-48 overflow-y-auto">
                {wsAlerts.length === 0 ? (
                  <div className="p-6 text-center text-[12px] text-[#6B7280]">
                    No discovery alerts yet. Use Live Trend Radar to scan real-time news in your niche.
                  </div>
                ) : (
                  wsAlerts.map((alert) => (
                    <div key={alert.id} className="p-3.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-mono font-medium text-[#F97316]">
                          {alert.keyword} ({alert.velocity})
                        </p>
                        <p className="text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] mt-0.5">{alert.title}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onCreateDraftFromAlert(alert)}
                          className="px-2.5 py-1 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[6px] text-[11px] font-medium flex items-center gap-1 transition-colors"
                        >
                          <Plus size={11} strokeWidth={1.5} /> Draft
                        </button>
                        {!alert.acknowledged && (
                          <button
                            onClick={() => onAcknowledgeAlert(alert.id)}
                            className="text-[11px] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Posts Table */}
        <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                Top Performing Posts
              </h3>
              <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
                Ranked by organic reach, engagements, and click-through rate
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] text-[11px] text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-[0.04em]">
                  <th className="py-2.5 px-4 font-medium">Post Content</th>
                  <th className="py-2.5 px-4 font-medium">Networks</th>
                  <th className="py-2.5 px-4 font-medium text-right">Impressions</th>
                  <th className="py-2.5 px-4 font-medium text-right">Engagements</th>
                  <th className="py-2.5 px-4 font-medium text-right">ER %</th>
                  <th className="py-2.5 px-4 font-medium text-right">Link Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] tabular-nums">
                {topPosts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <EmptyStatePanel
                        icon={BarChart3}
                        title="No published posts yet"
                        description="Published posts with recorded analytics will appear here."
                      />
                    </td>
                  </tr>
                ) : (
                  topPosts.map((post) => {
                    const reach = post.analytics?.reach || 0;
                    const eng = post.analytics?.engagement || 0;
                    const er = reach > 0 ? ((eng / reach) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={post.id} className="h-[44px] hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] transition-colors">
                        <td className="py-2.5 px-4 max-w-md">
                          <div className="flex items-center gap-3">
                            {post.media?.[0] && (
                              <img src={post.media[0]} alt="" className="w-8 h-8 rounded-[6px] object-cover shrink-0 border border-[#E5E7EB] dark:border-white/[0.08]" />
                            )}
                            <span className="font-medium text-[#111827] dark:text-[#F3F4F6] line-clamp-2">
                              {post.content}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {post.platforms.map((pl) => (
                              <PlatformTag key={pl} platform={pl} showFull={false} />
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-[#111827] dark:text-[#F3F4F6]">
                          {reach.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-[#111827] dark:text-[#F3F4F6]">
                          {eng.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {er}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-[#06B6D4]">
                          {(post.analytics?.clicks || 0).toLocaleString()}
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

      {/* Export Branded PDF Report Preview Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => setShowPdfModal(false)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                  White-Label Branded PDF Report Builder
                </h3>
                <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
                  Customize client branding &amp; sections before exporting.
                </p>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] rounded-md"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 custom-scrollbar">
              {/* Customizer Controls */}
              <div className="lg:col-span-4 space-y-4 text-[12px]">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Agency / Brand Header</label>
                  <input
                    value={reportBrandName}
                    onChange={(e) => setReportBrandName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Client / Recipient Name</label>
                  <input
                    value={reportClientName}
                    onChange={(e) => setReportClientName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1.5">Brand Accent Color</label>
                  <div className="flex gap-2">
                    {['#06B6D4', '#111827', '#0EA5E9', '#10B981', '#F97316'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setReportAccent(hex)}
                        className={`w-7 h-7 rounded-[6px] border-2 ${
                          reportAccent === hex ? 'border-[#111827] dark:border-[#FFFFFF] scale-105' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <p className="font-medium text-[#4B5563] dark:text-[#9CA3AF]">Included Report Modules</p>
                  {(
                    [
                      { key: 'followers', label: 'Follower Growth Summary' },
                      { key: 'engagement', label: 'Impressions & Engagement Rate' },
                      { key: 'heatmap', label: 'Optimal Posting Window' },
                      { key: 'topPosts', label: 'Top Performing Posts Table' },
                    ] as const
                  ).map((sec) => (
                    <label key={sec.key} className="flex items-center gap-2 cursor-pointer text-[#111827] dark:text-[#F3F4F6]">
                      <input
                        type="checkbox"
                        checked={reportSections[sec.key]}
                        onChange={(e) =>
                          setReportSections({ ...reportSections, [sec.key]: e.target.checked })
                        }
                        className="accent-[#06B6D4]"
                      />
                      <span>{sec.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Live A4 Sheet Preview */}
              <div className="lg:col-span-8 canvas-dot-grid bg-[#F8F9FB] dark:bg-[#090A0D] p-5 rounded-[12px] border border-[#E5E7EB] dark:border-white/[0.08]">
                <div className="bg-[#FFFFFF] text-[#111827] rounded-[10px] border border-[#E5E7EB] p-6 space-y-5">
                  <div
                    className="pb-4 flex items-end justify-between border-b-2"
                    style={{ borderBottomColor: reportAccent }}
                  >
                    <div>
                      <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.06em]" style={{ color: reportAccent }}>
                        {reportBrandName}
                      </p>
                      <h4 className="text-[18px] font-semibold tracking-[-0.02em] mt-0.5">
                        Social Performance Executive Report
                      </h4>
                    </div>
                    <div className="text-right text-[11px] text-[#6B7280] font-mono">
                      <p>Period: {range.toUpperCase()}</p>
                      <p>For: {reportClientName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] tabular-nums">
                    {reportSections.followers && (
                      <div className="p-3 rounded-[8px] border border-[#E5E7EB]">
                        <p className="text-[10px] uppercase text-[#6B7280] font-medium">Total Audience</p>
                        <p className="text-[18px] font-semibold font-mono mt-1" style={{ color: reportAccent }}>
                          {kpis.totalFollowers.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {reportSections.engagement && (
                      <>
                        <div className="p-3 rounded-[8px] border border-[#E5E7EB]">
                          <p className="text-[10px] uppercase text-[#6B7280] font-medium">Impressions</p>
                          <p className="text-[18px] font-semibold font-mono mt-1" style={{ color: reportAccent }}>
                            {kpis.reach.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 rounded-[8px] border border-[#E5E7EB]">
                          <p className="text-[10px] uppercase text-[#6B7280] font-medium">Eng. Rate</p>
                          <p className="text-[18px] font-semibold font-mono mt-1" style={{ color: reportAccent }}>
                            {kpis.engRate}%
                          </p>
                        </div>
                      </>
                    )}
                    {reportSections.heatmap && (
                      <div className="p-3 rounded-[8px] border border-[#E5E7EB]">
                        <p className="text-[10px] uppercase text-[#6B7280] font-medium">Peak Window</p>
                        <p className="text-[18px] font-semibold font-mono mt-1" style={{ color: reportAccent }}>
                          {activeHeatCell ? `${activeHeatCell.day} ${activeHeatCell.hour}` : 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>

                  {reportSections.topPosts && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B7280] mb-2">
                        Top Performing Posts Snapshot
                      </p>
                      <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-[8px] text-[11px]">
                        {topPosts.length === 0 ? (
                          <p className="px-3 py-4 text-center text-[#6B7280]">No published posts recorded yet.</p>
                        ) : (
                          topPosts.slice(0, 4).map((p) => (
                            <div key={p.id} className="px-3 py-2 flex items-center justify-between gap-3">
                              <span className="truncate font-medium">{p.content}</span>
                              <span className="font-mono font-semibold shrink-0 tabular-nums">
                                {(p.analytics?.reach || 0).toLocaleString()} reach
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015] flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="px-3.5 py-2 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[8px] text-[12px] font-medium text-[#4B5563] dark:text-[#9CA3AF] transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDownloadBrandedReport}
                className="px-3.5 py-2 border border-[#E5E7EB] dark:border-white/[0.12] hover:border-[#06B6D4] bg-[#FFFFFF] dark:bg-[#13161D] text-[#111827] dark:text-[#F3F4F6] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
              >
                <Download size={13} strokeWidth={1.5} /> Download Branded Report
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  onToast('Print / Save PDF Opened', 'Choose "Save as PDF" in your browser print dialog.');
                }}
                className="px-3.5 py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
              >
                <Printer size={13} strokeWidth={1.5} /> Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
