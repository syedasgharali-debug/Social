import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  ArrowLeft,
  Globe,
  Sun,
  Moon,
  LogOut,
  Rss,
  Code2,
  GraduationCap,
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
  PlanModuleQuota,
  PromoCode,
  InvoiceRecord,
} from '../../types';
import { DEFAULT_AI_GOVERNANCE, DEFAULT_MODULE_QUOTAS } from '../../data/defaultState';
import { SocialLogo, SocialBrandKey } from '../common/SocialIcons';
import { BrandLogo } from '../BrandLogo';
import {
  InspectorDrawer,
  StatusBadge,
  MonochromeSparkline,
  EmptyStatePanel,
} from '../common/DesignPrimitives';
import { aiService, AdminEnvStatusItem } from '../../services/aiService';
import { upsertLocalAdminAccount, setLocalAccountStatus } from '../../contexts/AuthContext';
import { AcademyAdminSection } from './AcademyAdminSection';

function resolveApiBrand(nodeName: string): SocialBrandKey {
  const lower = nodeName.toLowerCase();
  if (lower.includes('meta') || lower.includes('facebook') || lower.includes('instagram')) return 'meta';
  if (lower.includes('tiktok')) return 'tiktok';
  if (lower.includes('linkedin')) return 'linkedin';
  if (lower.includes('youtube')) return 'youtube';
  if (lower.includes('pinterest')) return 'pinterest';
  if (lower.includes('bluesky')) return 'bluesky';
  if (lower.includes('threads')) return 'threads';
  if (lower.includes('google')) return 'gbp';
  return 'x';
}

function renderApiNodeIcon(node: ApiHealthNode) {
  const lower = `${node.id} ${node.name}`.toLowerCase();
  if (lower.includes('cms') || lower.includes('wordpress') || lower.includes('webhook')) {
    return <Globe size={18} className="text-cyan-500" />;
  }
  if (lower.includes('rss') || lower.includes('crawler')) {
    return <Rss size={18} className="text-orange-500" />;
  }
  if (lower.includes('pixel') || lower.includes('campaign')) {
    return <Code2 size={18} className="text-emerald-500" />;
  }
  return <SocialLogo platform={resolveApiBrand(node.name)} size={20} />;
}

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
  onImpersonateTenant?: (tenant: TenantAccount) => void;
  onToast: (title: string, description?: string, variant?: 'success' | 'info' | 'warning') => void;
  onBackToWorkspace?: () => void;
  onBackToLanding?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onSignOut?: () => void;
  authToken?: string;
}

interface RegisteredUserRecord {
  uid: string;
  email: string;
  displayName: string;
  companyName?: string;
  createdAt: string;
  status?: 'active' | 'suspended';
  plan?: string;
  linkedWorkspaceId?: string;
  workspacesCount?: number;
  profilesUsed?: number;
  aiCreditsUsed?: number;
  aiCreditsLimit?: number;
  scheduledPostsCount?: number;
}

const ACTIVE_PLAN_TIERS: PlanTier[] = ['bootstrap', 'accelerate', 'pro_agency', 'lifetime'];

const PLAN_PRICING: Record<PlanTier, { mrr: number; profiles: number; aiLimit: number; label: string }> = {
  bootstrap: { mrr: 99, profiles: 10, aiLimit: 5000, label: 'Starter ($99/mo)' },
  accelerate: { mrr: 199, profiles: 25, aiLimit: 15000, label: 'Growth ($199/mo)' },
  pro_agency: { mrr: 349, profiles: 75, aiLimit: 40000, label: 'Agency Scale ($349/mo)' },
  lifetime: { mrr: 799, profiles: 999, aiLimit: 100000, label: 'Lifetime ($799 one-time)' },
  pro50: { mrr: 349, profiles: 75, aiLimit: 40000, label: 'Agency Scale ($349/mo)' },
  pro100: { mrr: 349, profiles: 75, aiLimit: 40000, label: 'Agency Scale ($349/mo)' },
  pro150: { mrr: 799, profiles: 999, aiLimit: 100000, label: 'Lifetime ($799 one-time)' },
};

const PLAN_COLORS = ['#6B7280', '#9CA3AF', '#06B6D4', '#10B981'];

type AdminSection = 'all' | 'overview' | 'users' | 'apis' | 'ai' | 'billing' | 'academy';

const ADMIN_SECTION_LABELS: Record<AdminSection, string> = {
  all: 'All Modules',
  overview: 'SaaS Overview',
  users: 'Users & Workspaces',
  apis: 'API & Webhooks',
  ai: 'AI Governance',
  billing: 'Billing & Flags',
  academy: 'Academy',
};

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
  onImpersonateTenant,
  onToast,
  onBackToWorkspace,
  onBackToLanding,
  darkMode = false,
  onToggleDarkMode,
  onSignOut,
  authToken,
}: SuperAdminPanelProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('all');
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserRecord[]>([]);
  const [testingNodeId, setTestingNodeId] = useState<string | null>(null);
  const [inspectedTenantId, setInspectedTenantId] = useState<string | null>(null);
  const [showEnvDrawer, setShowEnvDrawer] = useState(false);
  const [envStatusLoading, setEnvStatusLoading] = useState(false);
  const [envStatusItems, setEnvStatusItems] = useState<AdminEnvStatusItem[]>([]);
  const [envCheckedAt, setEnvCheckedAt] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);

  const loadEnvStatus = useCallback(async () => {
    setEnvStatusLoading(true);
    try {
      const res = await aiService.getAdminEnvStatus();
      setEnvStatusItems(res.items || []);
      setEnvCheckedAt(res.checkedAt || new Date().toISOString());
    } catch (err) {
      onToast(
        'Env Status Unavailable',
        err instanceof Error ? err.message : 'Backend API is required to inspect server environment status.',
        'warning'
      );
    } finally {
      setEnvStatusLoading(false);
    }
  }, [onToast]);

  const loadRegisteredUsers = useCallback(async () => {
    const collected: RegisteredUserRecord[] = [];
    const seen = new Set<string>();

    if (authToken && !authToken.startsWith('local_sess_')) {
      try {
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const isJson = (res.headers.get('content-type') || '').includes('application/json');
        if (res.ok && isJson) {
          const data = await res.json();
          if (Array.isArray(data.users)) {
            for (const u of data.users as RegisteredUserRecord[]) {
              const key = u.email.toLowerCase();
              if (!seen.has(key)) {
                seen.add(key);
                collected.push(u);
              }
            }
          }
        }
      } catch {
        // Fallback to local registry below
      }
    }

    try {
      const raw = localStorage.getItem('socialifyai_local_users_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const u of parsed) {
            if (!u?.email || u.role === 'super_admin') continue;
            const key = String(u.email).toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              collected.push({
                uid: u.uid || `local-${key}`,
                email: u.email,
                displayName: u.displayName || u.email.split('@')[0],
                companyName: u.companyName || `${u.displayName || 'Customer'}'s Workspace`,
                createdAt: u.createdAt || new Date().toISOString(),
                plan: 'bootstrap',
                workspacesCount: 1,
                profilesUsed: 0,
                scheduledPostsCount: 0,
              });
            }
          }
        }
      }
    } catch {
      // ignore storage errors
    }

    setRegisteredUsers(collected);
  }, [authToken]);

  useEffect(() => {
    loadRegisteredUsers();
  }, [loadRegisteredUsers]);

  // Module 2: Tenant Filters & Provision Modal
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'past_due' | 'suspended'>('all');
  const [planFilter, setPlanFilter] = useState<PlanTier | 'all'>('all');
  const [showNewTenant, setShowNewTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    orgName: '',
    ownerName: '',
    ownerEmail: '',
    initialPassword: '',
    plan: 'accelerate' as PlanTier,
  });

  // Module 4: AI Governance & Module Quotas Draft Form
  const [aiDraft, setAiDraft] = useState<AiGovernanceConfig>(() => ({
    ...state.aiGovernance,
    moduleQuotas: state.aiGovernance.moduleQuotas || DEFAULT_MODULE_QUOTAS,
  }));

  useEffect(() => {
    setAiDraft({
      ...state.aiGovernance,
      moduleQuotas: state.aiGovernance.moduleQuotas || DEFAULT_MODULE_QUOTAS,
    });
  }, [state.aiGovernance]);

  const updateModuleQuota = (
    tier: 'bootstrap' | 'accelerate' | 'pro_agency' | 'lifetime',
    field: keyof PlanModuleQuota,
    value: number
  ) => {
    setAiDraft((prev) => {
      const base = prev.moduleQuotas || DEFAULT_MODULE_QUOTAS;
      return {
        ...prev,
        moduleQuotas: {
          ...base,
          [tier]: {
            ...base[tier],
            [field]: Math.max(1, value || 1),
          },
        },
      };
    });
  };

  // Module 5: Promo Form
  const [promoForm, setPromoForm] = useState({
    code: '',
    discountPct: '20',
    duration: 'forever' as PromoCode['duration'],
    maxRedemptions: '250',
  });

  // Merge manually managed tenants with real signed-up users (deduped by email)
  const allTenants = useMemo<TenantAccount[]>(() => {
    const byEmail = new Set(state.tenants.map((t) => t.ownerEmail.toLowerCase()));
    const synced: TenantAccount[] = [];
    for (const u of registeredUsers) {
      if (byEmail.has(u.email.toLowerCase())) continue;
      const planKey: PlanTier =
        u.plan && u.plan in PLAN_PRICING ? (u.plan as PlanTier) : 'bootstrap';
      const meta = PLAN_PRICING[planKey];
      synced.push({
        id: `reg-${u.uid}`,
        uid: u.uid,
        orgName: u.companyName || `${u.displayName}'s Workspace`,
        ownerName: u.displayName,
        ownerEmail: u.email,
        plan: planKey,
        mrr: meta.mrr,
        profilesUsed: u.profilesUsed || 0,
        profilesLimit: meta.profiles,
        workspacesCount: u.workspacesCount || 1,
        aiCreditsUsed: u.aiCreditsUsed ?? 0,
        aiCreditsLimit: u.aiCreditsLimit ?? meta.aiLimit,
        status: u.status === 'suspended' ? 'suspended' : 'active',
        joinedAt: (u.createdAt || new Date().toISOString()).slice(0, 10),
        linkedWorkspaceId: u.linkedWorkspaceId || state.workspaces[0]?.id,
      });
    }
    return [...state.tenants, ...synced];
  }, [state.tenants, registeredUsers, state.workspaces]);

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTenants.filter((t) => {
      const matchesQ =
        !q ||
        t.orgName.toLowerCase().includes(q) ||
        t.ownerName.toLowerCase().includes(q) ||
        t.ownerEmail.toLowerCase().includes(q);
      const matchesSt = statusFilter === 'all' || t.status === statusFilter;
      const matchesPlan = planFilter === 'all' || t.plan === planFilter;
      return matchesQ && matchesSt && matchesPlan;
    });
  }, [allTenants, search, statusFilter, planFilter]);

  const executiveMetrics = useMemo(() => {
    const activeTenants = allTenants.filter((t) => t.status !== 'suspended');
    const totalMrr = activeTenants.reduce((s, t) => s + t.mrr, 0);
    const activeWorkspaces = activeTenants.reduce((s, t) => s + t.workspacesCount, 0);

    const regScheduled = registeredUsers.reduce((s, u) => s + (u.scheduledPostsCount || 0), 0);
    const localScheduled = state.posts.filter(
      (p) => p.status === 'scheduled' || p.status === 'approved'
    ).length;
    const scheduledPosts = localScheduled + regScheduled;
    const publishedPosts = state.posts.filter((p) => p.status === 'published').length;

    const totalAiCredits = allTenants.reduce((s, t) => s + t.aiCreditsUsed, 0);
    const totalAiLimit = allTenants.reduce((s, t) => s + t.aiCreditsLimit, 0);
    const suspendedCount = allTenants.filter((t) => t.status === 'suspended').length;
    const churnRate =
      allTenants.length > 0 ? ((suspendedCount / allTenants.length) * 100).toFixed(1) : '0.0';

    const starterCount = allTenants.filter((t) => t.plan === 'bootstrap').length;
    const growthCount = allTenants.filter((t) => t.plan === 'accelerate').length;
    const agencyCount = allTenants.filter((t) =>
      ['pro_agency', 'pro50', 'pro100'].includes(t.plan)
    ).length;
    const lifetimeCount = allTenants.filter((t) =>
      ['lifetime', 'pro150'].includes(t.plan)
    ).length;

    // Build chronological MRR series strictly from real tenant joinedAt months
    const monthBuckets = new Map<string, { mrr: number; subscriptions: number }>();
    for (const t of activeTenants) {
      const ym = (t.joinedAt || '').slice(0, 7) || new Date().toISOString().slice(0, 7);
      const prev = monthBuckets.get(ym) || { mrr: 0, subscriptions: 0 };
      monthBuckets.set(ym, { mrr: prev.mrr + t.mrr, subscriptions: prev.subscriptions + 1 });
    }
    const sortedMonths = Array.from(monthBuckets.keys()).sort();
    let cumulativeMrr = 0;
    let cumulativeSubs = 0;
    const revenueSeries = sortedMonths.map((ym) => {
      const entry = monthBuckets.get(ym)!;
      cumulativeMrr += entry.mrr;
      cumulativeSubs += entry.subscriptions;
      const [year, month] = ym.split('-');
      const label = new Date(Number(year), Math.max(0, Number(month) - 1), 1).toLocaleDateString(
        'en-US',
        { month: 'short', year: '2-digit' }
      );
      return { month: label, mrr: cumulativeMrr, subscriptions: cumulativeSubs };
    });

    return {
      totalMrr,
      activeWorkspaces,
      activeAccounts: activeTenants.length,
      totalAccounts: allTenants.length,
      scheduledPosts,
      publishedPosts,
      totalAiCredits,
      totalAiLimit,
      suspendedCount,
      churnRate,
      revenueSeries,
      planDistribution: [
        { name: 'Starter ($99/mo)', value: starterCount },
        { name: 'Growth ($199/mo)', value: growthCount },
        { name: 'Agency Scale ($349/mo)', value: agencyCount },
        { name: 'Lifetime ($799)', value: lifetimeCount },
      ],
    };
  }, [allTenants, registeredUsers, state.posts]);

  const upsertTenant = (updated: TenantAccount) => {
    const existsInState = state.tenants.some((t) => t.id === updated.id);
    if (existsInState) {
      onUpdateTenant(updated);
    } else {
      onAddTenant(updated);
    }
  };

  const resolveTenantUid = (tenant: TenantAccount): string | null => {
    if (tenant.uid) return tenant.uid;
    if (tenant.id.startsWith('reg-')) return tenant.id.slice(4);
    const match = registeredUsers.find(
      (u) => u.email.toLowerCase() === tenant.ownerEmail.toLowerCase()
    );
    return match?.uid || null;
  };

  const handlePlanChange = async (tenant: TenantAccount, plan: PlanTier) => {
    const meta = PLAN_PRICING[plan];
    const uid = resolveTenantUid(tenant);
    if (uid) {
      await aiService.adminUpdateUser(uid, { plan, aiCreditsLimit: meta.aiLimit }).catch(() => {});
    }
    upsertTenant({
      ...tenant,
      uid: uid || tenant.uid,
      plan,
      mrr: meta.mrr,
      profilesLimit: meta.profiles,
      aiCreditsLimit: meta.aiLimit,
    });
    onToast('Tenant Plan Updated', `${tenant.orgName} switched to ${meta.label}.`, 'success');
  };

  const handleTopUpCredits = async (tenant: TenantAccount, delta: number) => {
    const uid = resolveTenantUid(tenant);
    const nextLimit = Math.max(1000, tenant.aiCreditsLimit + delta);
    if (uid) {
      await aiService.adminUpdateUser(uid, { aiCreditsLimit: nextLimit }).catch(() => {});
    }
    upsertTenant({
      ...tenant,
      uid: uid || tenant.uid,
      aiCreditsLimit: nextLimit,
    });
    onToast(
      'AI Credits Topped Up',
      `${tenant.orgName} quota increased by +${delta.toLocaleString()} (limit: ${nextLimit.toLocaleString()}).`,
      'success'
    );
  };

  const handleResetCreditsPersisted = async (tenant: TenantAccount) => {
    const uid = resolveTenantUid(tenant);
    if (uid) {
      await aiService.adminUpdateUser(uid, { aiCreditsUsed: 0 }).catch(() => {});
    }
    onResetTenantCredits({ ...tenant, uid: uid || tenant.uid });
  };

  const handleStatusToggle = async (tenant: TenantAccount) => {
    const nextStatus = tenant.status === 'suspended' ? 'active' : 'suspended';
    const uid = resolveTenantUid(tenant);
    if (uid) {
      await aiService.adminUpdateUser(uid, { status: nextStatus }).catch(() => {});
    }
    setLocalAccountStatus(uid || tenant.ownerEmail, nextStatus);
    upsertTenant({ ...tenant, uid: uid || tenant.uid, status: nextStatus });
    onToast(
      nextStatus === 'suspended' ? 'Account Suspended' : 'Account Reactivated',
      nextStatus === 'suspended'
        ? `${tenant.orgName} login and AI API access blocked.`
        : `${tenant.orgName} restored to active status.`,
      nextStatus === 'suspended' ? 'warning' : 'success'
    );
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantForm.orgName.trim() || !tenantForm.ownerEmail.trim()) return;
    if (tenantForm.initialPassword.length < 6) {
      onToast('Password Too Short', 'Initial password must be at least 6 characters.', 'warning');
      return;
    }

    setProvisioning(true);
    const meta = PLAN_PRICING[tenantForm.plan];
    let createdUid = '';
    let linkedWsId = state.workspaces[0]?.id;

    try {
      const resp = await aiService.adminProvisionUser({
        displayName: tenantForm.ownerName.trim() || 'Workspace Owner',
        email: tenantForm.ownerEmail.trim().toLowerCase(),
        password: tenantForm.initialPassword,
        companyName: tenantForm.orgName.trim(),
        plan: tenantForm.plan,
      });
      createdUid = resp.user.uid;
      linkedWsId = resp.user.linkedWorkspaceId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('already exists')) {
        onToast('Duplicate Account', msg, 'warning');
        setProvisioning(false);
        return;
      }
      // Static-host fallback so provisioned user can still sign in locally
      createdUid = upsertLocalAdminAccount({
        displayName: tenantForm.ownerName.trim() || 'Workspace Owner',
        email: tenantForm.ownerEmail.trim().toLowerCase(),
        password: tenantForm.initialPassword,
        companyName: tenantForm.orgName.trim(),
      });
    }

    const newTenant: TenantAccount = {
      id: `reg-${createdUid}`,
      uid: createdUid,
      orgName: tenantForm.orgName.trim(),
      ownerName: tenantForm.ownerName.trim() || 'Workspace Owner',
      ownerEmail: tenantForm.ownerEmail.trim().toLowerCase(),
      plan: tenantForm.plan,
      mrr: meta.mrr,
      profilesUsed: 0,
      profilesLimit: meta.profiles,
      workspacesCount: 1,
      aiCreditsUsed: 0,
      aiCreditsLimit: meta.aiLimit,
      status: 'active',
      joinedAt: new Date().toISOString().slice(0, 10),
      linkedWorkspaceId: linkedWsId,
    };
    onAddTenant(newTenant);
    await loadRegisteredUsers();
    onToast(
      'Account Provisioned',
      `${newTenant.ownerEmail} can now sign in at /login on ${meta.label}.`,
      'success'
    );
    setProvisioning(false);
    setShowNewTenant(false);
    setTenantForm({
      orgName: '',
      ownerName: '',
      ownerEmail: '',
      initialPassword: '',
      plan: 'accelerate',
    });
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
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onAddPromoCode(promo);
    setPromoForm({ code: '', discountPct: '20', duration: 'forever', maxRedemptions: '250' });
    onToast('Promo Code Created', `${promo.code} (${promo.discountPct}% off) is live.`);
  };

  const handleTestSingleApiNode = async (node: ApiHealthNode) => {
    setTestingNodeId(node.id);
    const start = performance.now();
    let healthy = true;
    try {
      const res = await fetch(`/api/health?node=${encodeURIComponent(node.id)}`, { cache: 'no-store' });
      healthy = res.ok;
    } catch {
      healthy = false;
    }
    const elapsedMs = Math.max(1, Math.round(performance.now() - start));
    setTestingNodeId(null);
    onUpdateApiNode(
      {
        ...node,
        status: healthy ? 'operational' : 'degraded',
        latencyMs: elapsedMs,
        lastTestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      `Tested ${node.name} (${elapsedMs}ms · ${healthy ? 'Operational' : 'Degraded'})`
    );
  };

  const showBlock = (section: Exclude<AdminSection, 'all'>) =>
    activeSection === 'all' || activeSection === section;

  const inspectedTenant = useMemo(
    () => allTenants.find((t) => t.id === inspectedTenantId) || null,
    [allTenants, inspectedTenantId]
  );

  const mrrSparkValues = useMemo(() => {
    if (executiveMetrics.revenueSeries.length >= 2) {
      return executiveMetrics.revenueSeries.map((r) => r.mrr);
    }
    return [0, executiveMetrics.totalMrr];
  }, [executiveMetrics]);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-[#F8F9FB] dark:bg-[#090A0D]">
      {/* 248px Fixed Super Admin Sidebar */}
      <aside className="hidden lg:flex w-[248px] shrink-0 bg-[#F3F4F6] dark:bg-[#0E1015] border-r border-[#E5E7EB] dark:border-white/[0.08] flex-col justify-between">
        <div className="flex flex-col min-h-0">
          <div className="h-12 px-3.5 border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-2">
            <BrandLogo size="sm" surface="auto" />
            <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/10 text-[#06B6D4] border border-cyan-500/20">
              ADMIN
            </span>
          </div>

          <nav className="p-2.5 space-y-0.5">
            <p className="px-2.5 py-1 text-[11px] font-medium text-[#6B7280]">Control Plane</p>
            {(
              [
                { id: 'all', label: 'All Modules', icon: ShieldCheck },
                { id: 'overview', label: 'SaaS Overview', icon: Activity },
                { id: 'users', label: 'Users & Workspaces', icon: Users },
                { id: 'apis', label: 'API & Webhooks', icon: Server },
                { id: 'ai', label: 'AI Governance', icon: Cpu },
                { id: 'billing', label: 'Billing & Flags', icon: CreditCard },
                { id: 'academy', label: 'Academy', icon: GraduationCap },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[7px] text-[13px] transition-colors ${
                    active
                      ? 'bg-black/[0.06] dark:bg-white/[0.06] text-[#111827] dark:text-[#F3F4F6] font-medium'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[#06B6D4]"
                    />
                  )}
                  <Icon size={15} strokeWidth={1.5} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-2.5 border-t border-[#E5E7EB] dark:border-white/[0.08] space-y-1">
          {onBackToWorkspace && (
            <button
              type="button"
              onClick={onBackToWorkspace}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[7px] text-[13px] text-[#4B5563] dark:text-[#9CA3AF] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors"
            >
              <ArrowLeft size={14} strokeWidth={1.5} /> Workspace Dashboard
            </button>
          )}
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[7px] text-[13px] text-[#6B7280] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors"
            >
              <Globe size={14} strokeWidth={1.5} /> socialifyai.com
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 48px Top Utility Bar */}
        <header className="h-12 px-4 md:px-5 bg-[#FFFFFF] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-between gap-3 shrink-0 z-30">
          <div className="flex items-center gap-2 text-[13px] min-w-0">
            <span className="lg:hidden">
              <BrandLogo size="sm" surface="auto" markOnly />
            </span>
            <span className="text-[#6B7280] whitespace-nowrap">Super Admin</span>
            <span className="text-[#D1D5DB] dark:text-white/[0.15]" aria-hidden="true">/</span>
            <span className="font-medium text-[#111827] dark:text-[#F3F4F6] truncate">
              {ADMIN_SECTION_LABELS[activeSection]}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowEnvDrawer(true);
                loadEnvStatus();
              }}
              className="h-8 px-2.5 rounded-[7px] border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#13161D] hover:border-[#06B6D4] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <Server size={13} strokeWidth={1.5} className="text-[#06B6D4]" />
              <span className="hidden sm:inline">System &amp; API Status</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNewTenant(true)}
              className="h-8 px-3 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[7px] text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <Plus size={14} strokeWidth={1.75} /> Provision Account
            </button>
            {onBackToWorkspace && (
              <button
                type="button"
                onClick={onBackToWorkspace}
                className="lg:hidden h-8 px-2.5 rounded-[7px] border border-[#E5E7EB] dark:border-white/[0.08] text-[12px] font-medium text-[#4B5563] dark:text-[#9CA3AF] flex items-center gap-1"
              >
                <ArrowLeft size={13} strokeWidth={1.5} /> Workspace
              </button>
            )}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                aria-label="Toggle theme"
                className="h-8 w-8 rounded-[7px] border border-[#E5E7EB] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#13161D] text-[#4B5563] dark:text-[#9CA3AF] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] flex items-center justify-center transition-colors"
              >
                {darkMode ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
              </button>
            )}
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="h-8 px-2.5 rounded-[7px] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-rose-500/30 text-[#4B5563] dark:text-[#9CA3AF] hover:text-rose-600 dark:hover:text-rose-400 text-[12px] font-medium flex items-center gap-1.5 transition-colors"
              >
                <LogOut size={13} strokeWidth={1.5} /> <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile/Tablet Section Tabs */}
        <div className="lg:hidden px-4 py-2 bg-[#FFFFFF] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08] flex items-center gap-1 overflow-x-auto">
          {(Object.keys(ADMIN_SECTION_LABELS) as AdminSection[]).map((tabId) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveSection(tabId)}
              className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                activeSection === tabId
                  ? 'bg-black/[0.06] dark:bg-white/[0.08] text-[#111827] dark:text-[#F3F4F6]'
                  : 'text-[#6B7280]'
              }`}
            >
              {ADMIN_SECTION_LABELS[tabId]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 lg:p-6 custom-scrollbar">
        <div className="max-w-[1440px] mx-auto space-y-5">
          {/* Compact Page Heading */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em]">
                Platform Operations &amp; Governance
              </h1>
              <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
                Live tenant subscriptions, gateway latency telemetry, AI credit metering, and billing controls.
              </p>
            </div>
            <div className="text-[11px] font-mono text-[#6B7280] tabular-nums">
              {executiveMetrics.activeAccounts} active / {executiveMetrics.totalAccounts} total accounts · {executiveMetrics.churnRate}% suspended
            </div>
          </div>

        {/* MODULE 1: EXECUTIVE SAAS OVERVIEW */}
        {showBlock('overview') && (
          <section className="space-y-5">
            {/* Disciplined 4-Card KPI Strip with Monochrome Sparklines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[
                {
                  label: 'Monthly Recurring Revenue',
                  value: `$${executiveMetrics.totalMrr.toLocaleString()}`,
                  sub: `${executiveMetrics.activeAccounts} active · ${executiveMetrics.churnRate}% suspended`,
                  spark: mrrSparkValues,
                },
                {
                  label: 'Active Workspaces',
                  value: executiveMetrics.activeWorkspaces.toLocaleString(),
                  sub: `${executiveMetrics.totalAccounts} registered org${executiveMetrics.totalAccounts === 1 ? '' : 's'}`,
                  spark: [0, Math.max(0, executiveMetrics.activeWorkspaces - 1), executiveMetrics.activeWorkspaces],
                },
                {
                  label: 'Scheduled Posts',
                  value: executiveMetrics.scheduledPosts.toLocaleString(),
                  sub: `${executiveMetrics.publishedPosts} published total`,
                  spark: [0, executiveMetrics.publishedPosts, executiveMetrics.scheduledPosts],
                },
                {
                  label: 'AI Credits Used',
                  value: executiveMetrics.totalAiCredits.toLocaleString(),
                  sub: `${
                    executiveMetrics.totalAiLimit > 0
                      ? Math.round((executiveMetrics.totalAiCredits / executiveMetrics.totalAiLimit) * 100)
                      : 0
                  }% of ${executiveMetrics.totalAiLimit.toLocaleString()} quota`,
                  spark: [0, Math.round(executiveMetrics.totalAiCredits * 0.6), executiveMetrics.totalAiCredits],
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-4 sm:p-5 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                      {kpi.label}
                    </p>
                    <MonochromeSparkline values={kpi.spark} width={56} height={20} />
                  </div>
                  <p className="mt-2 text-[26px] leading-none font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] tabular-nums">
                    {kpi.value}
                  </p>
                  <p className="mt-2 text-[12px] text-[#6B7280] tabular-nums truncate">
                    {kpi.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* Revenue & Subscription Growth + Plan Distribution Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      Revenue &amp; Subscription Growth
                    </h2>
                    <p className="text-[12px] text-[#6B7280]">
                      Cumulative MRR computed from registered active customer accounts
                    </p>
                  </div>
                  <span className="font-mono text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                    Current: ${executiveMetrics.totalMrr.toLocaleString()}
                  </span>
                </div>
                {executiveMetrics.revenueSeries.length === 0 ? (
                  <EmptyStatePanel
                    icon={CreditCard}
                    title="No subscription revenue data yet"
                    description="Monthly revenue charts populate automatically as customers sign up or accounts are provisioned."
                    actionLabel="Provision first account"
                    onAction={() => setShowNewTenant(true)}
                  />
                ) : (
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={executiveMetrics.revenueSeries}>
                        <defs>
                          <linearGradient id="adminMrrGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.18} />
                            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.16)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="mrr"
                          stroke="#06B6D4"
                          strokeWidth={2}
                          fill="url(#adminMrrGrad)"
                          name="Cumulative MRR ($)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5 flex flex-col">
                <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                  Plan Distribution
                </h2>
                <p className="text-[12px] text-[#6B7280] mb-2">Starter · Growth · Agency Scale · Lifetime</p>
                {executiveMetrics.totalAccounts === 0 ? (
                  <EmptyStatePanel
                    icon={Users}
                    title="No active plans yet"
                    description="Plan breakdown appears once customer accounts exist."
                  />
                ) : (
                  <>
                    <div className="relative h-48 flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={executiveMetrics.planDistribution.filter((d) => d.value > 0)}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={74}
                            paddingAngle={2}
                          >
                            {executiveMetrics.planDistribution
                              .filter((d) => d.value > 0)
                              .map((entry) => {
                                const origIdx = executiveMetrics.planDistribution.findIndex(
                                  (p) => p.name === entry.name
                                );
                                return (
                                  <Cell
                                    key={entry.name}
                                    fill={PLAN_COLORS[origIdx % PLAN_COLORS.length]}
                                  />
                                );
                              })}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-medium text-[#6B7280]">Accounts</span>
                        <span className="text-[20px] font-semibold text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                          {executiveMetrics.totalAccounts.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] space-y-1.5 text-[12px] tabular-nums">
                      {executiveMetrics.planDistribution.map((tier, idx) => (
                        <div key={tier.name} className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-[#4B5563] dark:text-[#9CA3AF]">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length] }}
                            />
                            {tier.name}
                          </span>
                          <span className="font-mono font-medium text-[#111827] dark:text-[#F3F4F6]">
                            {tier.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* MODULE 2: USER & WORKSPACE MANAGEMENT TABLE */}
        {showBlock('users') && (
          <section className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#E5E7EB] dark:border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                  Users &amp; Workspaces ({filteredTenants.length})
                </h2>
                <p className="text-[12px] text-[#6B7280]">
                  Click any organization row to open the slide-over inspector, adjust plans, or reset AI quotas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search user, org, or email..."
                    className="h-8 pl-8 pr-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[7px] text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>

                <select
                  aria-label="Filter by account status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'active' | 'trial' | 'past_due' | 'suspended')
                  }
                  className="h-8 px-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[7px] text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="past_due">Past Due</option>
                  <option value="suspended">Suspended</option>
                </select>

                <select
                  aria-label="Filter by plan tier"
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value as PlanTier | 'all')}
                  className="h-8 px-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[7px] text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                >
                  <option value="all">All plans</option>
                  {ACTIVE_PLAN_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {PLAN_PRICING[tier].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015]">
                    <th className="py-2.5 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Organization</th>
                    <th className="py-2.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Plan</th>
                    <th className="py-2.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] text-right">Profiles</th>
                    <th className="py-2.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] text-right">Workspaces</th>
                    <th className="py-2.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] text-right">AI Credits</th>
                    <th className="py-2.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Status</th>
                    <th className="py-2.5 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] text-[12px] tabular-nums">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyStatePanel
                          icon={Users}
                          title={allTenants.length === 0 ? 'No customer accounts registered yet' : 'No matching accounts'}
                          description={
                            allTenants.length === 0
                              ? 'New signups and provisioned accounts will appear in this operational table.'
                              : 'Adjust your search query or filters to view matching organizations.'
                          }
                          actionLabel={allTenants.length === 0 ? 'Provision account' : undefined}
                          onAction={allTenants.length === 0 ? () => setShowNewTenant(true) : undefined}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr
                        key={tenant.id}
                        onClick={() => setInspectedTenantId(tenant.id)}
                        className="group h-[48px] hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-4">
                          <p className="font-medium text-[#111827] dark:text-[#F3F4F6]">
                            {tenant.ownerName} <span className="text-[#6B7280] font-normal">·</span> {tenant.orgName}
                          </p>
                          <p className="text-[11px] font-mono text-[#6B7280]">
                            {tenant.ownerEmail} · {tenant.joinedAt}
                          </p>
                        </td>
                        <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            aria-label={`Change plan for ${tenant.orgName}`}
                            value={tenant.plan}
                            onChange={(e) => handlePlanChange(tenant, e.target.value as PlanTier)}
                            className="h-7 px-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[6px] text-[11px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                          >
                            {ACTIVE_PLAN_TIERS.map((tier) => (
                              <option key={tier} value={tier}>
                                {PLAN_PRICING[tier].label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#4B5563] dark:text-[#9CA3AF]">
                          {tenant.profilesUsed}/{tenant.profilesLimit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#4B5563] dark:text-[#9CA3AF]">
                          {tenant.workspacesCount}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#4B5563] dark:text-[#9CA3AF]">
                          {tenant.aiCreditsUsed.toLocaleString()} / {tenant.aiCreditsLimit.toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          <StatusBadge
                            tone={
                              tenant.status === 'active'
                                ? 'emerald'
                                : tenant.status === 'trial'
                                  ? 'cyan'
                                  : tenant.status === 'past_due'
                                    ? 'orange'
                                    : 'rose'
                            }
                          >
                            {tenant.status === 'past_due'
                              ? 'Past Due'
                              : tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                          </StatusBadge>
                        </td>
                        <td className="py-2 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2.5 opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                onImpersonateTenant
                                  ? onImpersonateTenant(tenant)
                                  : onInspectWorkspace(tenant.linkedWorkspaceId)
                              }
                              className="text-[11px] font-medium text-[#06B6D4] hover:underline inline-flex items-center gap-1"
                            >
                              Impersonate <ExternalLink size={11} strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetCreditsPersisted(tenant)}
                              className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] inline-flex items-center gap-1"
                              title="Reset monthly AI credits to 0"
                            >
                              <RotateCcw size={11} strokeWidth={1.5} /> Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(tenant)}
                              className={`text-[11px] font-medium ${
                                tenant.status === 'suspended'
                                  ? 'text-emerald-600 dark:text-emerald-400 hover:underline'
                                  : 'text-rose-600 dark:text-rose-400 hover:underline'
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
          <section className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                  API Gateways &amp; Integration Health
                </h2>
                <p className="text-[12px] text-[#6B7280]">
                  Gateway latency, rate-limit consumption, and webhook queue depth across connected services.
                </p>
              </div>
              <button
                type="button"
                onClick={onTestAllApis}
                className="h-8 px-3 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[7px] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <RefreshCw size={13} strokeWidth={1.5} /> Ping all gateways
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {state.apiHealthNodes.map((node) => {
                const isDegraded = node.status === 'degraded';
                return (
                  <div
                    key={node.id}
                    className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-4 flex flex-col justify-between gap-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                          {renderApiNodeIcon(node)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6] truncate">
                            {node.name}
                          </h3>
                          <p className="text-[11px] text-[#6B7280] truncate">
                            {node.provider} · Tested {node.lastTestedAt}
                          </p>
                        </div>
                      </div>
                      <StatusBadge tone={isDegraded ? 'orange' : 'emerald'}>
                        {isDegraded ? 'Degraded' : 'Operational'}
                      </StatusBadge>
                    </div>

                    <div className="space-y-2.5 text-[12px] tabular-nums">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Latency</span>
                        <span
                          className={`font-mono font-medium ${
                            node.latencyMs > 300
                              ? 'text-[#F97316]'
                              : 'text-[#111827] dark:text-[#F3F4F6]'
                          }`}
                        >
                          {node.latencyMs > 0 ? `${node.latencyMs} ms` : '—'}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[#6B7280]">Rate limit</span>
                          <span className="font-mono text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                            {node.rateLimitUsedPct}% · {node.rateLimitLabel}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-[width] duration-200 ${
                              node.rateLimitUsedPct >= 80 ? 'bg-[#F97316]' : 'bg-[#06B6D4]'
                            }`}
                            style={{ width: `${node.rateLimitUsedPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Webhook queue</span>
                        <span className="font-mono text-[#111827] dark:text-[#F3F4F6]">
                          {node.webhookQueueDepth} pending
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] flex items-center gap-2">
                      <button
                        type="button"
                        disabled={testingNodeId === node.id}
                        onClick={() => handleTestSingleApiNode(node)}
                        className="flex-1 h-7 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-[7px] text-[11px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center justify-center gap-1 disabled:opacity-50 transition-colors"
                      >
                        <Activity size={12} strokeWidth={1.5} /> {testingNodeId === node.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateApiNode(
                            {
                              ...node,
                              status: 'operational',
                              webhookQueueDepth: 0,
                              lastTestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            },
                            `Flushed webhook queue for ${node.name}`
                          )
                        }
                        className="flex-1 h-7 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[7px] text-[11px] font-medium transition-colors"
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
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveAiGovernance(aiDraft);
              }}
              className="lg:col-span-7 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3">
                <div>
                  <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    AI Copilot &amp; Prompt Governance
                  </h2>
                  <p className="text-[12px] text-[#6B7280]">
                    Configure LLM routing, monthly tier credit quotas, and per-module limits.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAiDraft(DEFAULT_AI_GOVERNANCE);
                    onSaveAiGovernance(DEFAULT_AI_GOVERNANCE);
                  }}
                  className="text-[12px] font-medium text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] transition-colors"
                >
                  Restore defaults
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                    Primary Model
                  </label>
                  <select
                    value={aiDraft.defaultModel}
                    onChange={(e) =>
                      setAiDraft({
                        ...aiDraft,
                        defaultModel: e.target.value as AiGovernanceConfig['defaultModel'],
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[7px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  >
                    <option value="gemini-4-hydrogen">Gemini 4 Hydrogen (Fastest)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Strategy)</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                    Fallback Model
                  </label>
                  <input
                    value={aiDraft.fallbackModel}
                    onChange={(e) => setAiDraft({ ...aiDraft, fallbackModel: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[7px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1 tabular-nums">
                    Temperature ({aiDraft.temperature})
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={aiDraft.temperature}
                    onChange={(e) => setAiDraft({ ...aiDraft, temperature: Number(e.target.value) })}
                    className="w-full accent-[#06B6D4] mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                    Starter ($99) Limit
                  </label>
                  <input
                    type="number"
                    min="100"
                    value={aiDraft.tierLimits.bootstrap}
                    onChange={(e) =>
                      setAiDraft({
                        ...aiDraft,
                        tierLimits: { ...aiDraft.tierLimits, bootstrap: Number(e.target.value) || 5000 },
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[7px] font-mono text-[#111827] dark:text-[#F3F4F6] tabular-nums outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                    Growth ($199) Limit
                  </label>
                  <input
                    type="number"
                    min="500"
                    value={aiDraft.tierLimits.accelerate}
                    onChange={(e) =>
                      setAiDraft({
                        ...aiDraft,
                        tierLimits: { ...aiDraft.tierLimits, accelerate: Number(e.target.value) || 15000 },
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[7px] font-mono text-[#111827] dark:text-[#F3F4F6] tabular-nums outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                    Agency ($349) &amp; Lifetime
                  </label>
                  <input
                    type="number"
                    min="1000"
                    value={aiDraft.tierLimits.pro_agency}
                    onChange={(e) =>
                      setAiDraft({
                        ...aiDraft,
                        tierLimits: { ...aiDraft.tierLimits, pro_agency: Number(e.target.value) || 40000 },
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[7px] font-mono text-[#111827] dark:text-[#F3F4F6] tabular-nums outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>

              {/* Per-Plan Enterprise Module & Integration Quotas */}
              <div className="pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] space-y-2.5 text-[12px]">
                <div>
                  <p className="font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Per-Plan Module Quotas
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    Enforce workspace limits across YouTube Channels, AI SEO Articles/mo, RSS Auto-Feeds, and Viral Campaigns.
                  </p>
                </div>
                <div className="overflow-x-auto border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px]">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="bg-[#F8F9FB] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08] text-[#6B7280]">
                        <th className="py-2 px-3 font-medium uppercase tracking-wider">Plan Tier</th>
                        <th className="py-2 px-2 font-medium uppercase tracking-wider">YT Channels</th>
                        <th className="py-2 px-2 font-medium uppercase tracking-wider">SEO/mo</th>
                        <th className="py-2 px-2 font-medium uppercase tracking-wider">RSS Feeds</th>
                        <th className="py-2 px-2 font-medium uppercase tracking-wider">Campaigns</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
                      {(
                        [
                          { key: 'bootstrap', label: 'Starter ($99)' },
                          { key: 'accelerate', label: 'Growth / Accelerate ($199)' },
                          { key: 'pro_agency', label: 'Agency Scale / Pro ($349)' },
                          { key: 'lifetime', label: 'Lifetime ($799)' },
                        ] as const
                      ).map((tier) => {
                        const quotas = (aiDraft.moduleQuotas || DEFAULT_MODULE_QUOTAS)[tier.key];
                        return (
                          <tr key={tier.key} className="h-[40px]">
                            <td className="py-1.5 px-3 font-medium text-[#111827] dark:text-[#F3F4F6] whitespace-nowrap">
                              {tier.label}
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                min="1"
                                value={quotas.youtubeChannels}
                                onChange={(e) =>
                                  updateModuleQuota(tier.key, 'youtubeChannels', Number(e.target.value))
                                }
                                className="w-20 px-2 py-1 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[6px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                min="1"
                                value={quotas.seoArticlesPerMonth}
                                onChange={(e) =>
                                  updateModuleQuota(tier.key, 'seoArticlesPerMonth', Number(e.target.value))
                                }
                                className="w-20 px-2 py-1 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[6px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                min="1"
                                value={quotas.rssAutoFeeds}
                                onChange={(e) =>
                                  updateModuleQuota(tier.key, 'rssAutoFeeds', Number(e.target.value))
                                }
                                className="w-20 px-2 py-1 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[6px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="number"
                                min="1"
                                value={quotas.activeViralCampaigns}
                                onChange={(e) =>
                                  updateModuleQuota(tier.key, 'activeViralCampaigns', Number(e.target.value))
                                }
                                className="w-20 px-2 py-1 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[6px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-[12px]">
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                  Global Caption System Prompt Template
                </label>
                <textarea
                  rows={3}
                  value={aiDraft.systemPromptTemplate}
                  onChange={(e) => setAiDraft({ ...aiDraft, systemPromptTemplate: e.target.value })}
                  className="w-full p-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="h-8 px-4 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] text-[12px] font-medium transition-colors"
                >
                  Save AI Policy &amp; Quotas
                </button>
              </div>
            </form>

            {/* Token Cost Monitor per Organization */}
            <div className="lg:col-span-5 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden flex flex-col">
              <div className="px-4 py-3.5 border-b border-[#E5E7EB] dark:border-white/[0.08]">
                <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                  Token Cost Monitor
                </h3>
                <p className="text-[12px] text-[#6B7280] font-mono tabular-nums">
                  ${aiDraft.costPer1kCreditsUsd.toFixed(2)} blended cost / 1k credits
                </p>
              </div>
              <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] overflow-y-auto max-h-96">
                {allTenants.length === 0 ? (
                  <EmptyStatePanel
                    icon={Cpu}
                    title="No usage recorded yet"
                    description="Organization-level AI credit consumption appears as customers run generations."
                  />
                ) : (
                  allTenants
                    .slice()
                    .sort((a, b) => b.aiCreditsUsed - a.aiCreditsUsed)
                    .map((t) => {
                      const estCost = ((t.aiCreditsUsed / 1000) * aiDraft.costPer1kCreditsUsd).toFixed(2);
                      const pct = Math.min(100, Math.round((t.aiCreditsUsed / Math.max(1, t.aiCreditsLimit)) * 100));
                      return (
                        <div key={t.id} className="px-4 py-3 text-[12px]">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-[#111827] dark:text-[#F3F4F6] truncate">{t.orgName}</p>
                            <span className="font-mono font-medium text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                              ${estCost}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2.5">
                            <div className="flex-1 h-1.5 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct >= 85 ? 'bg-[#F97316]' : 'bg-[#06B6D4]'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-[#6B7280] tabular-nums shrink-0">
                              {t.aiCreditsUsed.toLocaleString()} ({pct}%)
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </section>
        )}

        {/* MODULE 5: BILLING, COUPONS & FEATURE FLAGS */}
        {showBlock('billing') && (
          <section className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Promo Codes */}
              <div className="lg:col-span-6 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] p-5 space-y-4">
                <div>
                  <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Promo Codes &amp; Discounts
                  </h2>
                  <p className="text-[12px] text-[#6B7280]">Create Stripe-synced coupons and toggle active campaigns.</p>
                </div>

                <form onSubmit={handleCreatePromo} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[12px]">
                  <input
                    required
                    value={promoForm.code}
                    onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                    placeholder="LAUNCH25"
                    className="h-8 px-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[7px] font-mono uppercase text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                  <input
                    type="number"
                    min="5"
                    max="90"
                    value={promoForm.discountPct}
                    onChange={(e) => setPromoForm({ ...promoForm, discountPct: e.target.value })}
                    placeholder="% Off"
                    className="h-8 px-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[7px] font-mono tabular-nums text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                  <select
                    value={promoForm.duration}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, duration: e.target.value as PromoCode['duration'] })
                    }
                    className="h-8 px-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[7px] text-[#111827] dark:text-[#F3F4F6] outline-none"
                  >
                    <option value="forever">Forever</option>
                    <option value="3_months">3 Months</option>
                    <option value="once">First Invoice</option>
                  </select>
                  <button
                    type="submit"
                    className="h-8 px-3 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[7px] font-medium transition-colors"
                  >
                    Add Code
                  </button>
                </form>

                <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] text-[12px]">
                  {state.promoCodes.length === 0 ? (
                    <p className="py-6 text-center text-[#6B7280]">
                      No promo codes created yet.
                    </p>
                  ) : (
                    state.promoCodes.map((promo) => (
                      <div key={promo.id} className="h-[48px] flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-[#111827] dark:text-[#F3F4F6]">{promo.code}</span>
                            <span className="text-[#6B7280]">·</span>
                            <span className="font-mono text-[#06B6D4] tabular-nums">
                              {promo.discountPct}% off ({promo.duration.replace('_', ' ')})
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-[#6B7280] tabular-nums">
                            {promo.redemptions}/{promo.maxRedemptions} redeemed · {promo.createdAt}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onTogglePromoCode(promo)}
                            className="cursor-pointer"
                          >
                            <StatusBadge tone={promo.active ? 'emerald' : 'neutral'}>
                              {promo.active ? 'Active' : 'Paused'}
                            </StatusBadge>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeletePromoCode(promo.id)}
                            className="p-1 text-[#6B7280] hover:text-rose-500"
                            title="Delete promo code"
                          >
                            <Trash2 size={13} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Global Feature Flags */}
              <div className="lg:col-span-6 bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#E5E7EB] dark:border-white/[0.08]">
                  <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                    Global Feature Flags
                  </h2>
                  <p className="text-[12px] text-[#6B7280]">
                    Toggle integrations, AI image synthesis, or Maintenance Mode in real time.
                  </p>
                </div>
                <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
                  {state.featureFlags.map((flag) => (
                    <div key={flag.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-[12px] font-medium ${
                              flag.key === 'maintenance_mode' && flag.enabled
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-[#111827] dark:text-[#F3F4F6]'
                            }`}
                          >
                            {flag.label}
                          </p>
                          <span className="font-mono text-[10px] text-[#6B7280]">{flag.rollout}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#6B7280]">{flag.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleFlag(flag)}
                        aria-label={`Toggle ${flag.label}`}
                        className={`shrink-0 ${
                          flag.key === 'maintenance_mode' && flag.enabled
                            ? 'text-rose-500'
                            : flag.enabled
                              ? 'text-[#06B6D4]'
                              : 'text-[#6B7280]'
                        }`}
                      >
                        {flag.enabled ? <ToggleRight size={24} strokeWidth={1.5} /> : <ToggleLeft size={24} strokeWidth={1.5} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stripe Invoice Logs */}
            <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
              <div className="px-4 py-3.5 border-b border-[#E5E7EB] dark:border-white/[0.08]">
                <h2 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                  Stripe Invoice Ledger
                </h2>
                <p className="text-[12px] text-[#6B7280]">Billing history, applied coupons, and payment retries.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] dark:border-white/[0.08] bg-[#F8F9FB] dark:bg-[#0E1015]">
                      <th className="py-2.5 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Invoice ID</th>
                      <th className="py-2.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Customer</th>
                      <th className="py-2.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Subscription</th>
                      <th className="py-2.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Promo</th>
                      <th className="py-2.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] text-right">Amount</th>
                      <th className="py-2.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Status</th>
                      <th className="py-2.5 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] text-[12px] tabular-nums">
                    {state.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 px-4 text-center text-[#6B7280]">
                          No invoices recorded yet. Live billing events will appear here.
                        </td>
                      </tr>
                    ) : (
                      state.invoices.map((inv) => (
                        <tr key={inv.id} className="h-[44px] hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] transition-colors">
                          <td className="py-2 px-4 font-mono text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                            {inv.stripeId}
                          </td>
                          <td className="py-2 px-3">
                            <p className="font-medium text-[#111827] dark:text-[#F3F4F6]">{inv.customerOrg}</p>
                            <p className="text-[11px] font-mono text-[#6B7280]">{inv.customerEmail}</p>
                          </td>
                          <td className="py-2 px-3 text-[#4B5563] dark:text-[#9CA3AF]">{inv.planLabel}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-[#6B7280]">
                            {inv.promoApplied || '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium text-[#111827] dark:text-[#F3F4F6]">
                            ${inv.amount.toFixed(2)}
                          </td>
                          <td className="py-2 px-3">
                            <StatusBadge tone={inv.status === 'paid' ? 'emerald' : 'orange'}>
                              {inv.status === 'past_due' ? 'Past Due' : 'Paid'}
                            </StatusBadge>
                          </td>
                          <td className="py-2 px-4 text-right">
                            {inv.status === 'past_due' ? (
                              <button
                                type="button"
                                onClick={() => onRetryInvoice(inv)}
                                className="text-[11px] font-medium text-[#06B6D4] hover:underline"
                              >
                                Retry Charge
                              </button>
                            ) : (
                              <button
                                type="button"
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
                                className="text-[11px] font-medium text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] inline-flex items-center gap-1"
                              >
                                <Download size={12} strokeWidth={1.5} /> Receipt
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
          </section>
        )}

        {showBlock('academy') && (
          <AcademyAdminSection authToken={authToken} onToast={onToast} />
        )}

        {/* Audit Ledger */}
        <div className="bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[12px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
            <h2 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
              Super Admin Audit Ledger
            </h2>
          </div>
          <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] text-[12px]">
            {state.auditLogs.length === 0 ? (
              <p className="py-6 text-center text-[#6B7280]">
                No admin actions recorded yet. Actions taken in this control plane are logged automatically.
              </p>
            ) : (
              state.auditLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-[#111827] dark:text-[#F3F4F6]">{log.action}</span>
                    <span className="text-[#6B7280] truncate">· {log.target}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#6B7280] tabular-nums">
                    {log.actor} · {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
        </div>
      </div>

      {/* Slide-Over Tenant Inspector Drawer (480px) */}
      <InspectorDrawer
        open={Boolean(inspectedTenant)}
        onClose={() => setInspectedTenantId(null)}
        title={inspectedTenant?.orgName || 'Organization'}
        subtitle={inspectedTenant ? `${inspectedTenant.ownerName} · ${inspectedTenant.ownerEmail}` : undefined}
        footer={
          inspectedTenant ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleStatusToggle(inspectedTenant)}
                className={`h-8 px-3 rounded-[7px] border text-[12px] font-medium transition-colors ${
                  inspectedTenant.status === 'suspended'
                    ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                    : 'border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                }`}
              >
                {inspectedTenant.status === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onImpersonateTenant) {
                    onImpersonateTenant(inspectedTenant);
                  } else {
                    onInspectWorkspace(inspectedTenant.linkedWorkspaceId);
                  }
                  setInspectedTenantId(null);
                }}
                className="h-8 px-3.5 rounded-[7px] bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] text-[12px] font-medium inline-flex items-center gap-1.5"
              >
                Impersonate Workspace <ExternalLink size={12} strokeWidth={1.5} />
              </button>
            </div>
          ) : undefined
        }
      >
        {inspectedTenant && (
          <div className="space-y-5 text-[12px]">
            <div className="flex items-center justify-between">
              <StatusBadge
                tone={
                  inspectedTenant.status === 'active'
                    ? 'emerald'
                    : inspectedTenant.status === 'trial'
                      ? 'cyan'
                      : inspectedTenant.status === 'past_due'
                        ? 'orange'
                        : 'rose'
                }
              >
                {inspectedTenant.status === 'past_due'
                  ? 'Past Due'
                  : inspectedTenant.status.charAt(0).toUpperCase() + inspectedTenant.status.slice(1)}
              </StatusBadge>
              <span className="font-mono text-[11px] text-[#6B7280] tabular-nums">
                Joined {inspectedTenant.joinedAt}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                <p className="text-[11px] text-[#6B7280]">Monthly Revenue</p>
                <p className="mt-1 text-[18px] font-semibold font-mono text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                  ${inspectedTenant.mrr.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-[8px] bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08]">
                <p className="text-[11px] text-[#6B7280]">Workspaces</p>
                <p className="mt-1 text-[18px] font-semibold font-mono text-[#111827] dark:text-[#F3F4F6] tabular-nums">
                  {inspectedTenant.workspacesCount}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block">
                Subscription Plan Tier
              </label>
              <select
                value={inspectedTenant.plan}
                onChange={(e) => handlePlanChange(inspectedTenant, e.target.value as PlanTier)}
                className="w-full h-9 px-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
              >
                {ACTIVE_PLAN_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {PLAN_PRICING[tier].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08]">
              <div>
                <div className="flex items-center justify-between mb-1.5 tabular-nums">
                  <span className="text-[#4B5563] dark:text-[#9CA3AF]">Connected Profiles</span>
                  <span className="font-mono text-[#111827] dark:text-[#F3F4F6]">
                    {inspectedTenant.profilesUsed} / {inspectedTenant.profilesLimit}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#06B6D4]"
                    style={{
                      width: `${Math.min(100, Math.round((inspectedTenant.profilesUsed / Math.max(1, inspectedTenant.profilesLimit)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 tabular-nums">
                  <span className="text-[#4B5563] dark:text-[#9CA3AF]">AI Credit Quota</span>
                  <span className="font-mono text-[#111827] dark:text-[#F3F4F6]">
                    {inspectedTenant.aiCreditsUsed.toLocaleString()} / {inspectedTenant.aiCreditsLimit.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#06B6D4]"
                    style={{
                      width: `${Math.min(100, Math.round((inspectedTenant.aiCreditsUsed / Math.max(1, inspectedTenant.aiCreditsLimit)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleResetCreditsPersisted(inspectedTenant)}
                    className="text-[11px] font-medium text-[#06B6D4] hover:underline inline-flex items-center gap-1"
                  >
                    <RotateCcw size={11} strokeWidth={1.5} /> Reset used to 0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTopUpCredits(inspectedTenant, 5000)}
                    className="text-[11px] font-medium text-emerald-500 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={11} strokeWidth={1.75} /> Top-up +5,000 credits
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </InspectorDrawer>

      {/* Slide-Over System & API Configuration Status Drawer (Read-Only Env Diagnostics) */}
      <InspectorDrawer
        open={showEnvDrawer}
        onClose={() => setShowEnvDrawer(false)}
        title="System & API Configuration Status"
        subtitle={
          envCheckedAt
            ? `Read-only server environment diagnostics · Checked ${new Date(envCheckedAt).toLocaleTimeString()}`
            : 'Read-only server environment diagnostics (secret values are never exposed)'
        }
        footer={
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#6B7280] font-mono tabular-nums">
              {envStatusItems.filter((i) => i.configured).length} / {envStatusItems.length} configured
            </span>
            <button
              type="button"
              onClick={loadEnvStatus}
              disabled={envStatusLoading}
              className="h-8 px-3 rounded-[7px] border border-[#E5E7EB] dark:border-white/[0.1] text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] inline-flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={envStatusLoading ? 'animate-spin' : ''} /> Re-check Status
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-[12px]">
          <p className="text-[11px] text-[#6B7280] leading-relaxed">
            Configure missing provider keys in your deployment environment variables (see <code className="font-mono">.env.example</code>). Secret keys are kept strictly server-side and never rendered in the browser.
          </p>
          {envStatusLoading && envStatusItems.length === 0 ? (
            <div className="py-10 text-center text-[#6B7280]">Checking server environment variables...</div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] border border-[#E5E7EB] dark:border-white/[0.08] rounded-[10px] overflow-hidden">
              {envStatusItems.map((item) => (
                <div key={item.key} className="px-3.5 py-2.5 flex items-start justify-between gap-3 bg-[#FFFFFF] dark:bg-[#13161D]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#111827] dark:text-[#F3F4F6]">{item.label}</span>
                      <span className="text-[10px] text-[#6B7280]">{item.category}</span>
                    </div>
                    <p className="font-mono text-[10px] text-[#6B7280] mt-0.5">{item.key}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{item.detail}</p>
                  </div>
                  <StatusBadge tone={item.configured ? 'emerald' : 'orange'}>
                    {item.configured ? 'Configured' : 'Awaiting Key'}
                  </StatusBadge>
                </div>
              ))}
            </div>
          )}
        </div>
      </InspectorDrawer>

      {/* Focused Creation Modal: Provision Tenant */}
      {showNewTenant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45" onClick={() => setShowNewTenant(false)} />
          <div className="relative w-full max-w-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-[12px] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                Provision organization
              </h3>
              <button
                type="button"
                onClick={() => setShowNewTenant(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleCreateTenant} className="mt-4 space-y-3.5 text-[12px]">
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Organization Name</label>
                <input
                  required
                  value={tenantForm.orgName}
                  onChange={(e) => setTenantForm({ ...tenantForm, orgName: e.target.value })}
                  placeholder="e.g. Horizon Growth Labs"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Owner Name</label>
                  <input
                    required
                    value={tenantForm.ownerName}
                    onChange={(e) => setTenantForm({ ...tenantForm, ownerName: e.target.value })}
                    placeholder="Jordan Lee"
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Owner Email</label>
                  <input
                    required
                    type="email"
                    value={tenantForm.ownerEmail}
                    onChange={(e) => setTenantForm({ ...tenantForm, ownerEmail: e.target.value })}
                    placeholder="jordan@horizon.io"
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">
                  Initial Account Password
                </label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={tenantForm.initialPassword}
                  onChange={(e) => setTenantForm({ ...tenantForm, initialPassword: e.target.value })}
                  placeholder="Minimum 6 characters (usable immediately at /login)"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] rounded-[8px] font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div>
                <label className="font-medium text-[#4B5563] dark:text-[#9CA3AF] block mb-1">Subscription Tier</label>
                <select
                  value={tenantForm.plan}
                  onChange={(e) => setTenantForm({ ...tenantForm, plan: e.target.value as PlanTier })}
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.1] rounded-[8px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                >
                  {ACTIVE_PLAN_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {PLAN_PRICING[tier].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTenant(false)}
                  className="px-3.5 py-2 border border-[#E5E7EB] dark:border-white/[0.1] rounded-[8px] font-medium text-[#4B5563] dark:text-[#9CA3AF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisioning}
                  className="px-4 py-2 bg-[#111827] hover:bg-[#1F2937] disabled:opacity-50 text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-[8px] font-medium transition-colors"
                >
                  {provisioning ? 'Provisioning...' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
