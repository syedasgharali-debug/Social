import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Plus,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Activity,
  Server,
  CreditCard,
  Users,
  X,
  Cpu,
  RefreshCw,
  Trash2,
  RotateCcw,
  Tag,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  AppState,
  TenantAccount,
  PlanTier,
  FeatureFlag,
  ApiHealthNode,
  AiGovernanceConfig,
  PromoCode,
  InvoiceRecord,
} from '../../types';
import { SEED_AI_GOVERNANCE } from '../../data/seedData';

interface SuperAdminPanelProps {
  state: AppState;
  onUpdateTenant: (tenant: TenantAccount) => void;
  onAddTenant: (tenant: TenantAccount) => void;
  onResetTenantCredits: (tenant: TenantAccount) => void;
  onToggleFlag: (flag: FeatureFlag) => void;
  onUpdateApiNode: (node: ApiHealthNode, actionLabel: string) => void;
  onTestAllApis: () => void;
  onSaveAiGovernance: (config: AiGovernanceConfig) => void;
  onAddPromoCode: (promo: PromoCode) => void;
  onTogglePromoCode: (promo: PromoCode) => void;
  onDeletePromoCode: (id: string) => void;
  onRetryInvoice: (invoice: InvoiceRecord) => void;
  onInspectWorkspace: (workspaceId?: string) => void;
  onToast: (title: string, description?: string) => void;
}

const PLAN_PRICING: Record<PlanTier, { mrr: number; profiles: number; aiLimit: number; label: string }> = {
  bootstrap: { mrr: 29, profiles: 5, aiLimit: 1000, label: 'Bootstrap ($29)' },
  accelerate: { mrr: 49, profiles: 10, aiLimit: 3500, label: 'Accelerate ($49)' },
  pro_agency: { mrr: 99, profiles: 25, aiLimit: 10000, label: 'Pro Agency ($99)' },
  pro50: { mrr: 179, profiles: 50, aiLimit: 15000, label: 'Pro50 ($179)' },
  pro100: { mrr: 329, profiles: 100, aiLimit: 25000, label: 'Pro100 ($329)' },
  pro150: { mrr: 449, profiles: 150, aiLimit: 40000, label: 'Pro150 ($449)' },
};

const MRR_GROWTH_SERIES = [
  { month: 'Jun', mrr: 31400, subscriptions: 980 },
  { month: 'Jul', mrr: 34800, subscriptions: 1090 },
  { month: 'Aug', mrr: 38250, subscriptions: 1185 },
  { month: 'Sep', mrr: 41600, subscriptions: 1270 },
  { month: 'Oct', mrr: 42840, subscriptions: 1345 },
  { month: 'Nov', mrr: 48920, subscriptions: 1420 },
];

const PLAN_COLORS = ['#94A3B8', '#F59E0B', '#4F46E5'];

type AdminSection = 'all' | 'overview' | 'users' | 'apis' | 'ai' | 'billing';

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = Math.max(1, max - min);
  const coords = points
    .map((val, idx) => {
      const x = (idx / Math.max(1, points.length - 1)) * 72;
      const y = 22 - ((val - min) / span) * 18;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width="74" height="24" viewBox="0 0 74 24" className="shrink-0 overflow-visible" aria-hidden="true">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
}

export function SuperAdminPanel({
  state,
  onUpdateTenant,
  onAddTenant,
  onResetTenantCredits,
  onToggleFlag,
  onUpdateApiNode,
  onTestAllApis,
  onSaveAiGovernance,
  onAddPromoCode,
  onTogglePromoCode,
  onDeletePromoCode,
  onRetryInvoice,
  onInspectWorkspace,
  onToast,
}: SuperAdminPanelProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('all');

  // Module 2: Tenant Filters & Provision Modal
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'past_due' | 'suspended'>('all');
  const [planFilter, setPlanFilter] = useState<PlanTier | 'all'>('all');
  const [showNewTenant, setShowNewTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    orgName: '',
    ownerName: '',
    ownerEmail: '',
    plan: 'accelerate' as PlanTier,
  });

  // Module 4: AI Governance Draft Form
  const [aiDraft, setAiDraft] = useState<AiGovernanceConfig>(state.aiGovernance);

  // Module 5: Promo Form
  const [promoForm, setPromoForm] = useState({
    code: '',
    discountPct: '20',
    duration: 'forever' as PromoCode['duration'],
    maxRedemptions: '250',
  });

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.tenants.filter((t) => {
      const matchesQ =
        !q ||
        t.orgName.toLowerCase().includes(q) ||
        t.ownerName.toLowerCase().includes(q) ||
        t.ownerEmail.toLowerCase().includes(q);
      const matchesSt = statusFilter === 'all' || t.status === statusFilter;
      const matchesPlan = planFilter === 'all' || t.plan === planFilter;
      return matchesQ && matchesSt && matchesPlan;
    });
  }, [state.tenants, search, statusFilter, planFilter]);

  const executiveMetrics = useMemo(() => {
    // Baseline 47,639 + live tenant MRRs (seed tenants active MRR = 1,281 -> totals $48,920)
    const activeTenants = state.tenants.filter((t) => t.status !== 'suspended');
    const tenantMrrSum = activeTenants.reduce((s, t) => s + t.mrr, 0);
    const totalMrr = 47639 + tenantMrrSum;

    // Baseline 1,352 + live workspaces across active tenants (seed = 68 -> totals 1,420)
    const tenantWorkspaces = activeTenants.reduce((s, t) => s + t.workspacesCount, 0);
    const activeWorkspaces = 1352 + tenantWorkspaces;

    const scheduledToday = 18437 + state.posts.length;
    const totalTenantCredits = state.tenants.reduce((s, t) => s + t.aiCreditsUsed, 0);
    const totalAiCredits = 2779740 + totalTenantCredits;
    const suspendedCount = state.tenants.filter((t) => t.status === 'suspended').length;
    const churnRate = (1.8 + suspendedCount * 0.2).toFixed(1);

    const bootstrapCount = 412 + state.tenants.filter((t) => t.plan === 'bootstrap').length;
    const accelerateCount = 584 + state.tenants.filter((t) => t.plan === 'accelerate').length;
    const proAgencyCount =
      424 +
      state.tenants.filter((t) =>
        ['pro_agency', 'pro50', 'pro100', 'pro150'].includes(t.plan)
      ).length;

    return {
      totalMrr,
      activeWorkspaces,
      scheduledToday,
      totalAiCredits,
      churnRate,
      planDistribution: [
        { name: 'Bootstrap ($29)', value: bootstrapCount },
        { name: 'Accelerate ($49)', value: accelerateCount },
        { name: 'Pro Agency & Scale', value: proAgencyCount },
      ],
    };
  }, [state.tenants, state.posts.length]);

  const handlePlanChange = (tenant: TenantAccount, plan: PlanTier) => {
    const meta = PLAN_PRICING[plan];
    onUpdateTenant({
      ...tenant,
      plan,
      mrr: meta.mrr,
      profilesLimit: meta.profiles,
      aiCreditsLimit: meta.aiLimit,
    });
    onToast('Tenant Plan Updated', `${tenant.orgName} switched to ${meta.label}.`);
  };

  const handleStatusToggle = (tenant: TenantAccount) => {
    const nextStatus = tenant.status === 'suspended' ? 'active' : 'suspended';
    onUpdateTenant({ ...tenant, status: nextStatus });
    onToast(
      nextStatus === 'suspended' ? 'Account Suspended' : 'Account Reactivated',
      `${tenant.orgName} is now ${nextStatus}.`
    );
  };

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantForm.orgName.trim() || !tenantForm.ownerEmail.trim()) return;
    const meta = PLAN_PRICING[tenantForm.plan];
    const newTenant: TenantAccount = {
      id: `ten-${Date.now()}`,
      orgName: tenantForm.orgName.trim(),
      ownerName: tenantForm.ownerName.trim() || 'Workspace Owner',
      ownerEmail: tenantForm.ownerEmail.trim(),
      plan: tenantForm.plan,
      mrr: meta.mrr,
      profilesUsed: 2,
      profilesLimit: meta.profiles,
      workspacesCount: 1,
      aiCreditsUsed: 0,
      aiCreditsLimit: meta.aiLimit,
      status: 'active',
      joinedAt: '2026-11-13',
      linkedWorkspaceId: state.workspaces[0]?.id,
    };
    onAddTenant(newTenant);
    onToast('Account Provisioned', `${newTenant.orgName} added on ${meta.label}.`);
    setShowNewTenant(false);
    setTenantForm({ orgName: '', ownerName: '', ownerEmail: '', plan: 'accelerate' });
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.code.trim()) return;
    const cleanCode = promoForm.code.trim().toUpperCase().replace(/\s+/g, '');
    const promo: PromoCode = {
      id: `pc-${Date.now()}`,
      code: cleanCode,
      discountPct: Math.min(90, Math.max(5, Number(promoForm.discountPct) || 20)),
      duration: promoForm.duration,
      redemptions: 0,
      maxRedemptions: Math.max(1, Number(promoForm.maxRedemptions) || 250),
      active: true,
      createdAt: '2026-11-13',
    };
    onAddPromoCode(promo);
    setPromoForm({ code: '', discountPct: '20', duration: 'forever', maxRedemptions: '250' });
    onToast('Promo Code Created', `${promo.code} (${promo.discountPct}% off) is live.`);
  };

  const showBlock = (section: Exclude<AdminSection, 'all'>) =>
    activeSection === 'all' || activeSection === section;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-[#090D16] p-6 md:p-8 custom-scrollbar">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Top Control Plane Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 flex items-center gap-1.5">
              <ShieldCheck size={15} /> Founder & Super Admin Control Plane
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Platform Operations, API Health & AI Governance
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex flex-wrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl text-xs font-semibold">
              {(
                [
                  { id: 'all', label: 'All Modules' },
                  { id: 'overview', label: 'SaaS Overview' },
                  { id: 'users', label: 'Users & Workspaces' },
                  { id: 'apis', label: 'API & Webhooks' },
                  { id: 'ai', label: 'AI Governance' },
                  { id: 'billing', label: 'Billing & Flags' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                    activeSection === tab.id
                      ? 'bg-[#4F46E5] text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowNewTenant(true)}
              className="px-4 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus size={14} /> Provision Account
            </button>
          </div>
        </div>

        {/* MODULE 1: EXECUTIVE SAAS OVERVIEW */}
        {showBlock('overview') && (
          <section className="space-y-5">
            {/* 5 Sparkline KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                {
                  label: 'Monthly Recurring Revenue',
                  value: `$${executiveMetrics.totalMrr.toLocaleString()}`,
                  delta: '+14.2% MoM',
                  deltaColor: 'text-emerald-600 dark:text-emerald-400',
                  spark: [31, 34, 38, 41, 43, 49],
                  sparkHex: '#4F46E5',
                },
                {
                  label: 'Active Workspaces',
                  value: executiveMetrics.activeWorkspaces.toLocaleString(),
                  delta: '+75 this month',
                  deltaColor: 'text-emerald-600 dark:text-emerald-400',
                  spark: [980, 1090, 1185, 1270, 1345, 1420],
                  sparkHex: '#10B981',
                },
                {
                  label: 'Scheduled Posts Today',
                  value: executiveMetrics.scheduledToday.toLocaleString(),
                  delta: '99.94% delivery',
                  deltaColor: 'text-[#4F46E5] dark:text-indigo-400',
                  spark: [12400, 13900, 15100, 16200, 17400, 18450],
                  sparkHex: '#4F46E5',
                },
                {
                  label: 'AI Copilot Credits Used',
                  value: `${(executiveMetrics.totalAiCredits / 1000000).toFixed(2)}M`,
                  delta: '71% of monthly pool',
                  deltaColor: 'text-amber-600 dark:text-amber-400',
                  spark: [1.4, 1.7, 2.0, 2.3, 2.6, 2.84],
                  sparkHex: '#F59E0B',
                },
                {
                  label: 'Logo Churn Rate',
                  value: `${executiveMetrics.churnRate}%`,
                  delta: '-0.4% vs Oct',
                  deltaColor: 'text-emerald-600 dark:text-emerald-400',
                  spark: [2.9, 2.6, 2.4, 2.2, 2.0, 1.8],
                  sparkHex: '#10B981',
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                >
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
                  <div className="mt-2.5 flex items-end justify-between gap-2">
                    <div>
                      <p className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {kpi.value}
                      </p>
                      <p className={`mt-1 text-[11px] font-semibold tabular-nums ${kpi.deltaColor}`}>
                        {kpi.delta}
                      </p>
                    </div>
                    <MiniSparkline points={kpi.spark} color={kpi.sparkHex} />
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue & Subscription Growth + Plan Distribution Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      Revenue & Subscription Growth
                    </h2>
                    <p className="text-xs text-slate-500">
                      6-month MRR trajectory ($48,920 current) and active subscriber expansion
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +14.2% MoM MRR
                  </span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MRR_GROWTH_SERIES}>
                      <defs>
                        <linearGradient id="adminMrrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="mrr"
                        stroke="#4F46E5"
                        strokeWidth={2.5}
                        fill="url(#adminMrrGrad)"
                        name="MRR ($)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col">
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Plan Distribution
                </h2>
                <p className="text-xs text-slate-500 mb-2">Bootstrap vs. Accelerate vs. Pro Agency</p>
                <div className="relative h-52 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={executiveMetrics.planDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {executiveMetrics.planDistribution.map((_entry, idx) => (
                          <Cell key={idx} fill={PLAN_COLORS[idx % PLAN_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-semibold text-slate-400">Workspaces</span>
                    <span className="font-display text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {executiveMetrics.activeWorkspaces.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs tabular-nums">
                  {executiveMetrics.planDistribution.map((tier, idx) => (
                    <div key={tier.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length] }}
                        />
                        {tier.name}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{tier.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* MODULE 2: USER & WORKSPACE MANAGEMENT TABLE */}
        {showBlock('users') && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users size={16} className="text-[#4F46E5]" /> User & Workspace Management ({filteredTenants.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Impersonate dashboards, adjust subscription plans, reset AI quotas, or suspend past-due accounts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search user, agency, or email..."
                    className="pl-8 pr-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#4F46E5]"
                  />
                </div>

                <select
                  aria-label="Filter by account status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'active' | 'trial' | 'past_due' | 'suspended')
                  }
                  className="px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="past_due">Past Due</option>
                  <option value="suspended">Suspended</option>
                </select>

                <select
                  aria-label="Filter by plan tier"
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value as PlanTier | 'all')}
                  className="px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none"
                >
                  <option value="all">All Plans</option>
                  {(Object.keys(PLAN_PRICING) as PlanTier[]).map((tier) => (
                    <option key={tier} value={tier}>
                      {PLAN_PRICING[tier].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <th className="py-3 px-5 font-semibold">Name & Agency</th>
                    <th className="py-3 px-4 font-semibold">Current Plan</th>
                    <th className="py-3 px-4 font-semibold text-right">Profiles</th>
                    <th className="py-3 px-4 font-semibold text-right">Workspaces</th>
                    <th className="py-3 px-4 font-semibold text-right">AI Credits</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-5 font-semibold text-right">Row Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 px-5 text-center text-slate-500">
                        No registered agencies match your current search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-5">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {tenant.ownerName} <span className="text-slate-400 font-normal">·</span> {tenant.orgName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {tenant.ownerEmail} · Joined {tenant.joinedAt}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            aria-label={`Upgrade or change plan for ${tenant.orgName}`}
                            value={tenant.plan}
                            onChange={(e) => handlePlanChange(tenant, e.target.value as PlanTier)}
                            className="px-2.5 py-1.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:border-[#4F46E5]"
                          >
                            {(Object.keys(PLAN_PRICING) as PlanTier[]).map((tier) => (
                              <option key={tier} value={tier}>
                                {PLAN_PRICING[tier].label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                          {tenant.profilesUsed} / {tenant.profilesLimit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                          {tenant.workspacesCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                          {tenant.aiCreditsUsed.toLocaleString()} / {tenant.aiCreditsLimit.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs font-bold ${
                              tenant.status === 'active'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : tenant.status === 'trial'
                                ? 'text-[#4F46E5] dark:text-indigo-400'
                                : tenant.status === 'past_due'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {tenant.status === 'past_due'
                              ? 'Past Due'
                              : tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <div className="inline-flex items-center gap-3 whitespace-nowrap">
                            <button
                              onClick={() => onInspectWorkspace(tenant.linkedWorkspaceId)}
                              className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                            >
                              Impersonate <ExternalLink size={11} />
                            </button>
                            <button
                              onClick={() => onResetTenantCredits(tenant)}
                              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1"
                              title="Reset monthly AI credits to 0"
                            >
                              <RotateCcw size={11} /> Reset AI
                            </button>
                            <button
                              onClick={() => handleStatusToggle(tenant)}
                              className={`text-xs font-semibold ${
                                tenant.status === 'suspended'
                                  ? 'text-emerald-600 hover:underline'
                                  : 'text-rose-600 hover:underline'
                              }`}
                            >
                              {tenant.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* MODULE 3: SOCIAL API & WEBHOOK HEALTH MONITOR */}
        {showBlock('apis') && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Server size={16} className="text-[#4F46E5]" /> Social API & Webhook Health Monitor
                </h2>
                <p className="text-xs text-slate-500">
                  Live gateway latency, rate-limit consumption, and outbound webhook queue depth across all 6 social networks.
                </p>
              </div>
              <button
                onClick={onTestAllApis}
                className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <RefreshCw size={13} /> Ping All Gateways
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {state.apiHealthNodes.map((node) => {
                const isDegraded = node.status === 'degraded';
                return (
                  <div
                    key={node.id}
                    className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                          {node.name}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {node.provider} · Tested {node.lastTestedAt}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold flex items-center gap-1 shrink-0 ${
                          isDegraded
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isDegraded ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                        {isDegraded ? 'Degraded' : 'Operational'}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs tabular-nums">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Gateway Latency</span>
                        <span
                          className={`font-mono font-bold ${
                            node.latencyMs > 300 ? 'text-amber-600' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {node.latencyMs} ms
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-500">Rate Limit Usage</span>
                          <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {node.rateLimitUsedPct}% · {node.rateLimitLabel}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              node.rateLimitUsedPct >= 80
                                ? 'bg-amber-500'
                                : 'bg-[#4F46E5]'
                            }`}
                            style={{ width: `${node.rateLimitUsedPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Webhook Queue Depth</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {node.webhookQueueDepth} pending
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <button
                        onClick={() => {
                          const freshLatency = 95 + Math.floor(Math.random() * 75);
                          onUpdateApiNode(
                            {
                              ...node,
                              status: 'operational',
                              latencyMs: freshLatency,
                              lastTestedAt: 'Just now',
                            },
                            `Tested ${node.name} (${freshLatency}ms)`
                          );
                        }}
                        className="flex-1 py-1.5 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1"
                      >
                        <Activity size={12} /> Test Connection
                      </button>
                      <button
                        onClick={() =>
                          onUpdateApiNode(
                            {
                              ...node,
                              status: 'operational',
                              webhookQueueDepth: 0,
                              rateLimitUsedPct: Math.max(12, node.rateLimitUsedPct - 25),
                              lastTestedAt: 'Just now',
                            },
                            `Flushed webhook queue for ${node.name}`
                          )
                        }
                        className="flex-1 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold"
                      >
                        Flush Queue
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* MODULE 4: AI COPILOT & PROMPT GOVERNANCE */}
        {showBlock('ai') && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveAiGovernance(aiDraft);
              }}
              className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Cpu size={16} className="text-[#4F46E5]" /> AI Copilot & Prompt Governance
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configure default LLM routing, monthly tier credit quotas, and global caption prompt policy.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAiDraft(SEED_AI_GOVERNANCE);
                    onSaveAiGovernance(SEED_AI_GOVERNANCE);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Restore Defaults
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Default Primary Model
                  </label>
                  <select
                    value={aiDraft.defaultModel}
                    onChange={(e) =>
                      setAiDraft({
                        ...aiDraft,
                        defaultModel: e.target.value as AiGovernanceConfig['defaultModel'],
                      })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold outline-none"
                  >
                    <option value="gemini-4-hydrogen">Gemini 4 Hydrogen (Fastest)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Strategy)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Fallback Model
                  </label>
                  <input
                    value={aiDraft.fallbackModel}
                    onChange={(e) => setAiDraft({ ...aiDraft, fallbackModel: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Temperature ({aiDraft.temperature})
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={aiDraft.temperature}
                    onChange={(e) => setAiDraft({ ...aiDraft, temperature: Number(e.target.value) })}
                    className="w-full accent-[#4F46E5] mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Bootstrap Monthly Limit
                  </label>
                  <input
                    type="number"
                    min="100"
                    value={aiDraft.tierLimits.bootstrap}
                    onChange={(e) =>
                      setAiDraft({
                        ...aiDraft,
                        tierLimits: { ...aiDraft.tierLimits, bootstrap: Number(e.target.value) || 1000 },
                      })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Accelerate Monthly Limit
                  </label>
                  <input
                    type="number"
                    min="500"
                    value={aiDraft.tierLimits.accelerate}
                    onChange={(e) =>
                      setAiDraft({
                        ...aiDraft,
                        tierLimits: { ...aiDraft.tierLimits, accelerate: Number(e.target.value) || 3500 },
                      })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Pro Agency Monthly Limit
                  </label>
                  <input
                    type="number"
                    min="1000"
                    value={aiDraft.tierLimits.pro_agency}
                    onChange={(e) =>
                      setAiDraft({
                        ...aiDraft,
                        tierLimits: { ...aiDraft.tierLimits, pro_agency: Number(e.target.value) || 10000 },
                      })
                    }
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Global Caption Generation System Prompt Template
                </label>
                <textarea
                  rows={3}
                  value={aiDraft.systemPromptTemplate}
                  onChange={(e) => setAiDraft({ ...aiDraft, systemPromptTemplate: e.target.value })}
                  className="w-full p-3 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  Save AI Policy & Quotas
                </button>
              </div>
            </form>

            {/* Token Cost Monitor per User */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Token Cost Monitor per Organization
                  </h3>
                  <p className="text-xs text-slate-500">
                    Blended inference cost: ${aiDraft.costPer1kCreditsUsd.toFixed(2)} per 1k credits
                  </p>
                </div>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-80">
                {state.tenants
                  .slice()
                  .sort((a, b) => b.aiCreditsUsed - a.aiCreditsUsed)
                  .map((t) => {
                    const estCost = ((t.aiCreditsUsed / 1000) * aiDraft.costPer1kCreditsUsd).toFixed(2);
                    const pct = Math.min(100, Math.round((t.aiCreditsUsed / Math.max(1, t.aiCreditsLimit)) * 100));
                    return (
                      <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{t.orgName}</p>
                            <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                              ${estCost}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct >= 85 ? 'bg-amber-500' : 'bg-[#4F46E5]'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 tabular-nums shrink-0">
                              {t.aiCreditsUsed.toLocaleString()} ({pct}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        )}

        {/* MODULE 5: BILLING, COUPONS & FEATURE FLAGS */}
        {showBlock('billing') && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Promo Codes */}
              <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Tag size={16} className="text-amber-500" /> Promo Codes & Discounts
                  </h2>
                  <p className="text-xs text-slate-500">Create Stripe-synced coupons and toggle active campaigns.</p>
                </div>

                <form onSubmit={handleCreatePromo} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <input
                    required
                    value={promoForm.code}
                    onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                    placeholder="LAUNCH25"
                    className="px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold uppercase outline-none focus:border-[#4F46E5]"
                  />
                  <input
                    type="number"
                    min="5"
                    max="90"
                    value={promoForm.discountPct}
                    onChange={(e) => setPromoForm({ ...promoForm, discountPct: e.target.value })}
                    placeholder="% Off"
                    className="px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                  <select
                    value={promoForm.duration}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, duration: e.target.value as PromoCode['duration'] })
                    }
                    className="px-2.5 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold outline-none"
                  >
                    <option value="forever">Forever</option>
                    <option value="3_months">3 Months</option>
                    <option value="once">First Invoice</option>
                  </select>
                  <button
                    type="submit"
                    className="py-2 px-3 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg font-semibold"
                  >
                    + Add Code
                  </button>
                </form>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {state.promoCodes.map((promo) => (
                    <div key={promo.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{promo.code}</span>
                          <span className="text-slate-400">·</span>
                          <span className="font-semibold text-[#4F46E5] dark:text-indigo-400">
                            {promo.discountPct}% off ({promo.duration.replace('_', ' ')})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          {promo.redemptions} / {promo.maxRedemptions} redeemed · Created {promo.createdAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onTogglePromoCode(promo)}
                          className={`text-xs font-semibold ${
                            promo.active ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {promo.active ? 'Active' : 'Paused'}
                        </button>
                        <button
                          onClick={() => onDeletePromoCode(promo.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Delete promo code"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Global Feature Flags */}
              <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Global Feature Flags & Platform Switches
                  </h2>
                  <p className="text-xs text-slate-500">
                    Toggle integrations, AI image synthesis, or emergency Maintenance Mode in real time.
                  </p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {state.featureFlags.map((flag) => (
                    <div key={flag.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-xs font-bold ${
                              flag.key === 'maintenance_mode' && flag.enabled
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {flag.label}
                          </p>
                          <span className="font-mono text-[10px] text-slate-400">{flag.rollout}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{flag.description}</p>
                      </div>
                      <button
                        onClick={() => onToggleFlag(flag)}
                        aria-label={`Toggle ${flag.label}`}
                        className={`shrink-0 ${
                          flag.key === 'maintenance_mode' && flag.enabled
                            ? 'text-rose-600'
                            : flag.enabled
                            ? 'text-[#4F46E5] dark:text-indigo-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {flag.enabled ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stripe Invoice Logs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Receipt size={16} className="text-[#4F46E5]" /> Recent Stripe Invoice Logs
                  </h2>
                  <p className="text-xs text-slate-500">Real-time billing ledger, applied coupons, and failed payment retries.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                      <th className="py-3 px-5 font-semibold">Invoice ID</th>
                      <th className="py-3 px-4 font-semibold">Customer</th>
                      <th className="py-3 px-4 font-semibold">Subscription</th>
                      <th className="py-3 px-4 font-semibold">Promo</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-5 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                    {state.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {inv.stripeId}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{inv.customerOrg}</p>
                          <p className="text-[11px] text-slate-500">{inv.customerEmail}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{inv.planLabel}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {inv.promoApplied || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          ${inv.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs font-bold ${
                              inv.status === 'paid'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : inv.status === 'past_due'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {inv.status === 'past_due' ? 'Past Due' : 'Paid'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          {inv.status === 'past_due' ? (
                            <button
                              onClick={() => onRetryInvoice(inv)}
                              className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline"
                            >
                              Retry Charge
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const receipt = `Stripe Invoice Receipt\nID: ${inv.stripeId}\nOrganization: ${inv.customerOrg}\nPlan: ${inv.planLabel}\nAmount Paid: $${inv.amount.toFixed(2)}\nIssued: ${inv.issuedAt}`;
                                const blob = new Blob([receipt], { type: 'text/plain;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${inv.stripeId}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                                onToast('Receipt Downloaded', `${inv.stripeId}.txt saved.`);
                              }}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1"
                            >
                              <Download size={12} /> Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Audit Log */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <CreditCard size={14} className="text-[#4F46E5]" /> Super Admin Audit Ledger
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {state.auditLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">{log.action}</span>
                  <span className="text-slate-500">· {log.target}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {log.actor} · {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Provision Tenant Modal */}
      {showNewTenant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setShowNewTenant(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Provision Customer Organization
              </h3>
              <button onClick={() => setShowNewTenant(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTenant} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Organization Name</label>
                <input
                  required
                  value={tenantForm.orgName}
                  onChange={(e) => setTenantForm({ ...tenantForm, orgName: e.target.value })}
                  placeholder="e.g. Horizon Growth Labs"
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Owner Name</label>
                  <input
                    required
                    value={tenantForm.ownerName}
                    onChange={(e) => setTenantForm({ ...tenantForm, ownerName: e.target.value })}
                    placeholder="Jordan Lee"
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Owner Email</label>
                  <input
                    required
                    type="email"
                    value={tenantForm.ownerEmail}
                    onChange={(e) => setTenantForm({ ...tenantForm, ownerEmail: e.target.value })}
                    placeholder="jordan@horizon.io"
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Subscription Tier</label>
                <select
                  value={tenantForm.plan}
                  onChange={(e) => setTenantForm({ ...tenantForm, plan: e.target.value as PlanTier })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                >
                  {(Object.keys(PLAN_PRICING) as PlanTier[]).map((tier) => (
                    <option key={tier} value={tier}>
                      {PLAN_PRICING[tier].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTenant(false)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-2 bg-[#4F46E5] text-white rounded-lg font-semibold">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
