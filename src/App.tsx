import React, { useState, useMemo, useEffect } from 'react';
import { X, CheckCircle2, TrendingUp, Loader2 } from 'lucide-react';
import { Sidebar, CommandBar, NavTabId } from './components/layout/Shell';
import { CommandPalette } from './components/layout/CommandPalette';
import { AuthScreen } from './components/auth/AuthScreen';
import { WorkspaceOverview } from './components/overview/WorkspaceOverview';
import { AiCopilotWizard } from './components/studio/AiCopilotWizard';
import { ContentStudio, ComposerPreset } from './components/studio/ContentStudio';
import { VisualScheduler } from './components/scheduler/VisualScheduler';
import { CategoryQueuesView } from './components/studio/CategoryQueuesView';
import { SocialInbox } from './components/inbox/SocialInbox';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { TeamApprovalsView } from './components/team/TeamApprovalsView';
import { ConnectedProfilesView } from './components/profiles/ConnectedProfilesView';
import { SocialCRM } from './components/crm/SocialCRM';
import { AdManager } from './components/ads/AdManager';
import { LandingPage } from './components/layout/LandingPage';
import { SettingsModal } from './components/layout/SettingsModal';
import { SuperAdminPanel } from './components/admin/SuperAdminPanel';
import { GrowthToolsSuite, GrowthToolTab } from './components/tools/GrowthToolsSuite';
import { YouTubeStudio } from './components/youtube/YouTubeStudio';
import { SeoBlogEngine } from './components/seo/SeoBlogEngine';
import { DiscoverCurateView } from './components/discover/DiscoverCurateView';
import { ViralCampaignsView } from './components/campaigns/ViralCampaignsView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DEFAULT_MODULE_QUOTAS } from './data/defaultState';
import { useAuth } from './contexts/AuthContext';
import { useStorage } from './hooks/useStorage';
import {
  Thread,
  Contact,
  SocialPost,
  Deal,
  AdCampaign,
  Draft,
  ContentCategory,
  DiscoveryAlert,
  PlanTier,
  TenantAccount,
  FeatureFlag,
  ConnectedProfile,
  TeamMember,
  Workspace,
  ApiHealthNode,
  AiGovernanceConfig,
  PromoCode,
  InvoiceRecord,
  YouTubeChannel,
  YouTubeVideoItem,
  SeoArticle,
  CmsConnector,
  RssSource,
  CuratedFeedItem,
  EcommerceFeed,
  ViralCampaign,
} from './types';

export default function App() {
  const {
    user,
    profile,
    authReady,
    isAdmin,
    signingIn,
    authError,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    signInWithGoogle,
    redirectSignInUser,
    clearRedirectSignIn,
    logout,
    clearAuthError,
    updateProfilePrefs,
  } = useAuth();

  const { state, updateState, resetDemoData, toasts, pushToast, dismissToast, cloudLoading } = useStorage(
    user,
    authReady,
    Boolean(profile),
    isAdmin
  );

  const [activeTab, setActiveTab] = useState<NavTabId>('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [focusedThreadId, setFocusedThreadId] = useState<string | undefined>(undefined);
  const [focusedContactId, setFocusedContactId] = useState<string | undefined>(undefined);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [composerPreset, setComposerPreset] = useState<ComposerPreset | null>(null);
  const [activeGrowthTool, setActiveGrowthTool] = useState<GrowthToolTab>('competitor');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');

  const currentUserProfile = useMemo(
    () =>
      user
        ? {
            displayName: profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Workspace User',
            email: profile?.email || user.email || '',
            photoURL: profile?.photoURL || user.photoURL || undefined,
          }
        : null,
    [user, profile]
  );

  const actorEmail = currentUserProfile?.email || 'essadhiif@gmail.com';

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (user) {
          setIsCommandPaletteOpen((prev) => !prev);
        }
      } else if (e.key === 'Escape') {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [user]);

  useEffect(() => {
    if (!redirectSignInUser) return;
    const targetView = redirectSignInUser.isAdmin ? 'admin' : 'app';
    updateState((prev) => ({ ...prev, viewMode: targetView }));
    pushToast(
      redirectSignInUser.isAdmin
        ? 'Welcome, Super Admin'
        : `Welcome, ${redirectSignInUser.displayName?.split(' ')[0] || 'back'}`,
      `Signed in with Google as ${redirectSignInUser.email}`,
      'success'
    );
    clearRedirectSignIn();
  }, [redirectSignInUser, clearRedirectSignIn, updateState, pushToast]);

  // Strictly enforce that any non-Super-Admin customer can never enter admin viewMode
  useEffect(() => {
    if (user && !isAdmin && state.viewMode === 'admin') {
      updateState({ viewMode: 'app' });
    }
  }, [user, isAdmin, state.viewMode, updateState]);

  const activeWorkspace = useMemo(
    () => state.workspaces.find((w) => w.id === state.activeWorkspaceId) || state.workspaces[0],
    [state.workspaces, state.activeWorkspaceId]
  );

  const unreadInboxCount = useMemo(
    () =>
      state.threads
        .filter((t) => t.workspaceId === state.activeWorkspaceId && t.status === 'open')
        .reduce((sum, t) => sum + (t.unreadCount > 0 ? 1 : 0), 0),
    [state.threads, state.activeWorkspaceId]
  );

  const pendingApprovalCount = useMemo(
    () =>
      state.posts.filter(
        (p) => p.workspaceId === state.activeWorkspaceId && p.status === 'pending_approval'
      ).length,
    [state.posts, state.activeWorkspaceId]
  );

  // Unified workspace plan quotas & AI credit meter
  const activePlanKey = useMemo<'bootstrap' | 'accelerate' | 'pro_agency' | 'lifetime'>(() => {
    const plan = activeWorkspace?.plan || state.selectedPlan;
    if (plan === 'lifetime' || plan === 'pro150') return 'lifetime';
    if (plan === 'pro_agency' || plan === 'pro50' || plan === 'pro100') return 'pro_agency';
    if (plan === 'accelerate') return 'accelerate';
    return 'bootstrap';
  }, [activeWorkspace?.plan, state.selectedPlan]);

  const activeModuleQuotas = useMemo(() => {
    const map = state.aiGovernance?.moduleQuotas || DEFAULT_MODULE_QUOTAS;
    return map[activePlanKey] || DEFAULT_MODULE_QUOTAS.bootstrap;
  }, [state.aiGovernance?.moduleQuotas, activePlanKey]);

  const aiCreditsLimit = useMemo(() => {
    if (activePlanKey === 'lifetime') return 100000;
    const limits = state.aiGovernance?.tierLimits;
    if (activePlanKey === 'pro_agency') return limits?.pro_agency || 40000;
    if (activePlanKey === 'accelerate') return limits?.accelerate || 15000;
    return limits?.bootstrap || 5000;
  }, [activePlanKey, state.aiGovernance?.tierLimits]);

  const aiCreditsUsed = (state.workspaceCredits || {})[state.activeWorkspaceId] || 0;
  const aiCreditsRemaining = Math.max(0, aiCreditsLimit - aiCreditsUsed);

  const handleConsumeCredits = (amount: number, reason: string): boolean => {
    if (aiCreditsRemaining < amount) {
      pushToast(
        'AI Credit Limit Reached',
        `This action needs ${amount} credits (${aiCreditsRemaining} remaining). Upgrade plan or reset in Settings.`,
        'warning'
      );
      return false;
    }
    updateState((prev) => {
      const current = (prev.workspaceCredits || {})[prev.activeWorkspaceId] || 0;
      return {
        ...prev,
        workspaceCredits: {
          ...(prev.workspaceCredits || {}),
          [prev.activeWorkspaceId]: current + amount,
        },
      };
    });
    if (reason) {
      // Credit deduction recorded cleanly on workspace state
    }
    return true;
  };

  const handleSyncEntryToCrm = (contact: Contact, deal?: Deal) => {
    updateState((prev) => {
      const emailLower = (contact.email || '').trim().toLowerCase();
      const handleLower = contact.handle.trim().toLowerCase();
      const existing = prev.contacts.find(
        (c) =>
          c.workspaceId === contact.workspaceId &&
          ((emailLower && (c.email || '').trim().toLowerCase() === emailLower) ||
            (handleLower && c.handle.trim().toLowerCase() === handleLower))
      );

      if (existing) {
        const mergedContact: Contact = {
          ...existing,
          name: existing.name || contact.name,
          email: existing.email || contact.email,
          platforms: Array.from(new Set([...existing.platforms, ...contact.platforms])),
          leadScore: Math.max(existing.leadScore, contact.leadScore),
          ltv: Math.max(existing.ltv, contact.ltv),
          lifecycleStage:
            existing.lifecycleStage === 'Customer' || existing.lifecycleStage === 'Advocate'
              ? existing.lifecycleStage
              : contact.lifecycleStage,
          tags: Array.from(new Set([...existing.tags, ...contact.tags])),
          interactionHistory: [...contact.interactionHistory, ...existing.interactionHistory].slice(0, 50),
          notes: existing.notes
            ? `${existing.notes}\n${contact.notes}`
            : contact.notes,
        };
        const linkedDeal = deal ? { ...deal, contactId: existing.id } : undefined;
        return {
          ...prev,
          contacts: prev.contacts.map((c) => (c.id === existing.id ? mergedContact : c)),
          deals: linkedDeal ? [linkedDeal, ...prev.deals] : prev.deals,
        };
      }

      return {
        ...prev,
        contacts: [contact, ...prev.contacts],
        deals: deal ? [deal, ...prev.deals] : prev.deals,
      };
    });
  };

  const handleEmailSignIn = async (email: string, password: string) => {
    const signedInUser = await signInWithEmailPassword(email, password);
    if (signedInUser) {
      const targetView = signedInUser.isAdmin ? 'admin' : 'app';
      updateState((prev) => ({ ...prev, viewMode: targetView }));
      pushToast(
        signedInUser.isAdmin
          ? 'Welcome, Super Admin'
          : `Welcome back, ${signedInUser.displayName.split(' ')[0]}`,
        signedInUser.isAdmin
          ? `Signed in to Super Admin Control Panel (${signedInUser.email}).`
          : `Opened your customer workspace (${signedInUser.email}).`,
        'success'
      );
    }
  };

  const handleEmailSignUp = async (params: {
    displayName: string;
    email: string;
    password: string;
    companyName?: string;
  }) => {
    const signedInUser = await signUpWithEmailPassword(params);
    if (signedInUser) {
      const brandName = params.companyName?.trim();
      updateState((prev) => ({
        ...prev,
        viewMode: 'app',
        workspaces: brandName
          ? prev.workspaces.map((w, idx) => (idx === 0 ? { ...w, name: brandName } : w))
          : prev.workspaces,
      }));
      pushToast(
        'Account Created',
        `Welcome to socialifyai.com, ${signedInUser.displayName.split(' ')[0]}! Your workspace is ready.`,
        'success'
      );
    }
  };

  const handleGoogleSignIn = async () => {
    const signedInUser = await signInWithGoogle();
    if (signedInUser) {
      const targetView = signedInUser.isAdmin ? 'admin' : 'app';
      updateState((prev) => ({ ...prev, viewMode: targetView }));
      pushToast(
        signedInUser.isAdmin
          ? 'Welcome, Super Admin'
          : `Welcome, ${signedInUser.displayName?.split(' ')[0] || 'back'}`,
        `Signed in as ${signedInUser.email}`,
        'success'
      );
    }
  };

  const handleSignOut = async () => {
    await logout();
    setIsCommandPaletteOpen(false);
    setIsSettingsOpen(false);
    setMobileDrawerOpen(false);
    setAuthInitialMode('login');
    updateState((prev) => ({ ...prev, viewMode: 'landing' }));
    pushToast('Signed Out', 'Your session has been closed securely.', 'info');
  };

  const handleLaunchFromLanding = (plan?: PlanTier, workspaceName?: string) => {
    if (!user) {
      setAuthInitialMode('signup');
    }
    const targetView = user ? (user.isAdmin ? 'admin' : 'app') : 'app';
    updateState((prev) => ({
      ...prev,
      viewMode: targetView,
      selectedPlan: plan || prev.selectedPlan,
      workspaces: workspaceName
        ? prev.workspaces.map((w, idx) => (idx === 0 ? { ...w, name: workspaceName } : w))
        : prev.workspaces,
    }));
    if (user && plan) {
      updateProfilePrefs({ selectedPlan: plan }).catch(() => {});
    }
    if (user) {
      pushToast(
        user.isAdmin ? 'Super Admin Panel Ready' : 'Workspace Launched',
        workspaceName ? `Welcome to "${workspaceName}" dashboard.` : 'Loaded your active dashboard.',
        'success'
      );
    } else {
      pushToast('Create Account or Sign In', 'Sign up or log in to access your workspace.', 'info');
    }
  };

  const handleCreateWorkspace = (name: string, industry: string, handle: string) => {
    const newId = `ws-${Date.now()}`;
    const newWs: Workspace = {
      id: newId,
      name,
      industry,
      handle,
      plan: state.selectedPlan,
      connectedPlatforms: [],
    };

    updateState((prev) => ({
      ...prev,
      workspaces: [...prev.workspaces, newWs],
      activeWorkspaceId: newId,
    }));
    setFocusedThreadId(undefined);
    setFocusedContactId(undefined);
    setEditingPost(null);
    setActiveTab('overview');
    pushToast('Workspace Created', `Switched to "${name}". Connect your social profiles to begin.`);
  };

  const handleTriggerSpikeAlert = () => {
    setActiveGrowthTool('trends');
    setActiveTab('tools');
    pushToast('Live Trend Radar Opened', 'Scan real-time news in your niche to generate fresh ideas.');
  };

  const handleCreateDraftFromAlert = (alert: DiscoveryAlert) => {
    const draft: Draft = {
      id: `dr-${Date.now()}`,
      workspaceId: state.activeWorkspaceId,
      categoryId: state.categories.find((c) => c.workspaceId === state.activeWorkspaceId)?.id,
      topic: alert.keyword,
      platforms: ['linkedin', 'x', 'instagram'],
      content: `${alert.title}\n\nKey takeaway: ${alert.summary} What shift are you seeing in your ${alert.niche} stack this quarter?`,
      status: 'ai_draft',
      createdAt: new Date().toISOString(),
    };
    updateState((prev) => ({
      ...prev,
      drafts: [draft, ...prev.drafts],
      discoveryAlerts: prev.discoveryAlerts.map((a) =>
        a.id === alert.id ? { ...a, acknowledged: true } : a
      ),
    }));
    setComposerPreset({ topic: draft.content, categoryId: draft.categoryId, evergreen: true });
    setActiveTab('studio');
    pushToast('Loaded Spike into Studio', `"${alert.keyword}" ready to customize & schedule.`);
  };

  const handleOpenInboxForContact = (contactId: string) => {
    const existing = state.threads.find(
      (t) => t.workspaceId === state.activeWorkspaceId && t.contactId === contactId
    );
    if (existing) {
      setFocusedThreadId(existing.id);
      setActiveTab('inbox');
      return;
    }
    const contact = state.contacts.find((c) => c.id === contactId);
    if (!contact) return;
    const newThread: Thread = {
      id: `t-${Date.now()}`,
      workspaceId: state.activeWorkspaceId,
      contactId,
      platform: contact.platforms[0] || 'linkedin',
      type: 'dm',
      status: 'open',
      sentiment: 'neutral',
      lastMessage: 'Started direct outreach thread from CRM.',
      lastTimestamp: new Date().toISOString(),
      unreadCount: 0,
      messages: [],
    };
    updateState((prev) => ({ ...prev, threads: [newThread, ...prev.threads] }));
    setFocusedThreadId(newThread.id);
    setActiveTab('inbox');
  };

  const handleNavigateSearchResult = (tab: NavTabId, itemId?: string) => {
    if (tab === 'inbox' && itemId) setFocusedThreadId(itemId);
    if (tab === 'crm' && itemId) setFocusedContactId(itemId);
    if (tab === 'tools' && itemId) {
      const validTools: GrowthToolTab[] = ['competitor', 'repurposer', 'hooks', 'trends', 'utm', 'roi'];
      if (validTools.includes(itemId as GrowthToolTab)) {
        setActiveGrowthTool(itemId as GrowthToolTab);
      }
    }
    setActiveTab(tab);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#090A0D] flex flex-col items-center justify-center gap-3 text-[#4B5563] dark:text-[#9CA3AF]">
        <Loader2 size={24} strokeWidth={1.5} className="animate-spin text-[#06B6D4]" />
        <p className="text-xs font-mono tracking-wide">Connecting to socialifyai.com...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FB] dark:bg-[#090A0D] text-[#111827] dark:text-[#F3F4F6] overflow-hidden font-sans selection:bg-cyan-500/20 selection:text-cyan-900 dark:selection:text-cyan-200">
      {state.viewMode === 'landing' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <LandingPage
            selectedPlan={state.selectedPlan}
            onLaunch={handleLaunchFromLanding}
            onToast={(title, desc, variant) => pushToast(title, desc, variant || 'success')}
            isSignedIn={Boolean(user)}
            userDisplayName={currentUserProfile?.displayName}
            onSignInClick={() => {
              setAuthInitialMode('login');
              updateState({ viewMode: 'app' });
            }}
            darkMode={state.darkMode}
            onToggleDarkMode={() => {
              const nextDark = !state.darkMode;
              updateState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
              pushToast(nextDark ? 'Dark Mode Enabled' : 'Light Mode Enabled');
            }}
          />
        </div>
      )}

      {state.viewMode !== 'landing' && !user && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AuthScreen
            key={authInitialMode}
            initialMode={authInitialMode}
            onSignInEmail={handleEmailSignIn}
            onSignUpEmail={handleEmailSignUp}
            onSignInWithGoogle={handleGoogleSignIn}
            signingIn={signingIn}
            authError={authError}
            onClearError={clearAuthError}
            onBackToLanding={() => updateState({ viewMode: 'landing' })}
          />
        </div>
      )}

      {state.viewMode === 'admin' && user && isAdmin && (
        <SuperAdminPanel
          state={state}
          onUpdateTenant={(tenant: TenantAccount) =>
            updateState((prev) => ({
              ...prev,
              tenants: prev.tenants.map((t) => (t.id === tenant.id ? tenant : t)),
              auditLogs: [
                {
                  id: `log-${Date.now()}`,
                  actor: actorEmail,
                  action: 'Updated Tenant Account',
                  target: `${tenant.orgName} (${tenant.plan} · ${tenant.status})`,
                  timestamp: new Date().toISOString(),
                },
                ...prev.auditLogs,
              ],
            }))
          }
          onAddTenant={(tenant: TenantAccount) =>
            updateState((prev) => ({
              ...prev,
              tenants: [tenant, ...prev.tenants],
              auditLogs: [
                {
                  id: `log-${Date.now()}`,
                  actor: actorEmail,
                  action: 'Provisioned Account',
                  target: `${tenant.orgName} (${tenant.plan})`,
                  timestamp: new Date().toISOString(),
                },
                ...prev.auditLogs,
              ],
            }))
          }
          onResetTenantCredits={(tenant: TenantAccount) => {
            updateState((prev) => ({
              ...prev,
              tenants: prev.tenants.map((t) =>
                t.id === tenant.id ? { ...t, aiCreditsUsed: 0 } : t
              ),
              auditLogs: [
                {
                  id: `log-${Date.now()}`,
                  actor: actorEmail,
                  action: 'Reset AI Credits',
                  target: `${tenant.orgName} (0 / ${tenant.aiCreditsLimit.toLocaleString()})`,
                  timestamp: new Date().toISOString(),
                },
                ...prev.auditLogs,
              ],
            }));
            pushToast('AI Credits Reset', `Cleared monthly AI usage for ${tenant.orgName}.`, 'success');
          }}
          onToggleFlag={(flag: FeatureFlag) => {
            const nextEnabled = !flag.enabled;
            updateState((prev) => ({
              ...prev,
              featureFlags: prev.featureFlags.map((f) =>
                f.id === flag.id ? { ...f, enabled: nextEnabled } : f
              ),
              auditLogs: [
                {
                  id: `log-${Date.now()}`,
                  actor: actorEmail,
                  action: nextEnabled ? 'Enabled Feature Flag' : 'Disabled Feature Flag',
                  target: flag.label,
                  timestamp: new Date().toISOString(),
                },
                ...prev.auditLogs,
              ],
            }));
            pushToast(
              nextEnabled ? 'Feature Flag Enabled' : 'Feature Flag Disabled',
              flag.label,
              nextEnabled ? 'success' : 'warning'
            );
          }}
          onUpdateApiNode={(node: ApiHealthNode, actionLabel: string) => {
            updateState((prev) => ({
              ...prev,
              apiHealthNodes: prev.apiHealthNodes.map((n) => (n.id === node.id ? node : n)),
              auditLogs: [
                {
                  id: `log-${Date.now()}`,
                  actor: actorEmail,
                  action: 'API Health Action',
                  target: actionLabel,
                  timestamp: new Date().toISOString(),
                },
                ...prev.auditLogs,
              ],
            }));
            pushToast('API Gateway Updated', actionLabel, 'success');
          }}
          onTestAllApis={async () => {
            const start = performance.now();
            let healthy = true;
            try {
              const res = await fetch('/api/health?node=all', { cache: 'no-store' });
              healthy = res.ok;
            } catch {
              healthy = false;
            }
            const elapsedMs = Math.max(1, Math.round(performance.now() - start));
            const testedLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            updateState((prev) => ({
              ...prev,
              apiHealthNodes: prev.apiHealthNodes.map((n) => ({
                ...n,
                status: healthy ? 'operational' : 'degraded',
                latencyMs: elapsedMs,
                lastTestedAt: testedLabel,
              })),
              auditLogs: [
                {
                  id: `log-${Date.now()}`,
                  actor: actorEmail,
                  action: 'Pinged API Gateways',
                  target: `${healthy ? 'Operational' : 'Degraded'} (${elapsedMs}ms round-trip)`,
                  timestamp: new Date().toISOString(),
                },
                ...prev.auditLogs,
              ],
            }));
            pushToast(
              healthy ? 'API Health Check Passed' : 'API Health Check Degraded',
              `Measured ${elapsedMs}ms server round-trip.`,
              healthy ? 'success' : 'warning'
            );
          }}
          onSaveAiGovernance={(config: AiGovernanceConfig) => {
            updateState((prev) => ({
              ...prev,
              aiGovernance: config,
              auditLogs: [
                {
                  id: `log-${Date.now()}`,
                  actor: actorEmail,
                  action: 'Updated AI Governance',
                  target: `Default model: ${config.defaultModel}`,
                  timestamp: new Date().toISOString(),
                },
                ...prev.auditLogs,
              ],
            }));
            pushToast('AI Governance Saved', `Active model set to ${config.defaultModel}.`, 'success');
          }}
          onAddPromoCode={(promo: PromoCode) =>
            updateState((prev) => ({
              ...prev,
              promoCodes: [promo, ...prev.promoCodes],
              auditLogs: [
                {
                  id: `log-${Date.now()}`,
                  actor: actorEmail,
                  action: 'Created Promo Code',
                  target: `${promo.code} (${promo.discountPct}% off)`,
                  timestamp: new Date().toISOString(),
                },
                ...prev.auditLogs,
              ],
            }))
          }
          onTogglePromoCode={(promo: PromoCode) => {
            const next = !promo.active;
            updateState((prev) => ({
              ...prev,
              promoCodes: prev.promoCodes.map((p) =>
                p.id === promo.id ? { ...p, active: next } : p
              ),
            }));
            pushToast(next ? 'Promo Activated' : 'Promo Paused', promo.code);
          }}
          onDeletePromoCode={(id: string) => {
            updateState((prev) => ({
              ...prev,
              promoCodes: prev.promoCodes.filter((p) => p.id !== id),
            }));
            pushToast('Promo Code Deleted');
          }}
          onRetryInvoice={(invoice: InvoiceRecord) => {
            updateState((prev) => ({
              ...prev,
              invoices: prev.invoices.map((inv) =>
                inv.id === invoice.id ? { ...inv, status: 'paid' } : inv
              ),
              auditLogs: [
                {
                  id: `log-${Date.now()}`,
                  actor: actorEmail,
                  action: 'Retried Stripe Charge',
                  target: `${invoice.stripeId} ($${invoice.amount.toFixed(2)}) succeeded`,
                  timestamp: new Date().toISOString(),
                },
                ...prev.auditLogs,
              ],
            }));
            pushToast('Stripe Charge Succeeded', `${invoice.customerOrg} invoice marked Paid.`, 'success');
          }}
          onInspectWorkspace={(workspaceId) => {
            const targetWs = state.workspaces.find((w) => w.id === workspaceId) || state.workspaces[0];
            updateState((prev) => ({
              ...prev,
              viewMode: 'app',
              activeWorkspaceId: workspaceId || prev.activeWorkspaceId,
            }));
            pushToast('Impersonating Tenant Dashboard', `Opened ${targetWs?.name || 'tenant'} workspace.`);
          }}
          onToast={(title, desc) => pushToast(title, desc, 'success')}
          onBackToWorkspace={() => updateState({ viewMode: 'app' })}
          onBackToLanding={() => updateState({ viewMode: 'landing' })}
          darkMode={state.darkMode}
          onToggleDarkMode={() => {
            const nextDark = !state.darkMode;
            updateState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
            pushToast(nextDark ? 'Dark Mode Enabled' : 'Light Mode Enabled');
          }}
          onSignOut={handleSignOut}
          authToken={user.token}
        />
      )}

      {(state.viewMode === 'app' || (state.viewMode === 'admin' && !isAdmin)) && user && currentUserProfile && (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {cloudLoading && (
            <div className="absolute top-2 right-5 z-50 px-2.5 py-1 rounded-[7px] bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] flex items-center gap-2 text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
              <Loader2 size={12} className="animate-spin text-[#06B6D4]" />
              <span>Syncing workspace</span>
            </div>
          )}
          <Sidebar
            state={state}
            activeTab={activeTab}
            setActiveTab={(tab) => setActiveTab(tab)}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            mobileOpen={mobileDrawerOpen}
            onCloseMobile={() => setMobileDrawerOpen(false)}
            unreadInboxCount={unreadInboxCount}
            pendingApprovalCount={pendingApprovalCount}
            onSwitchWorkspace={(workspaceId) => {
              updateState({ activeWorkspaceId: workspaceId });
              setFocusedThreadId(undefined);
              setFocusedContactId(undefined);
              setEditingPost(null);
              const ws = state.workspaces.find((w) => w.id === workspaceId);
              pushToast('Workspace Switched', `Scoped all modules to ${ws?.name || 'workspace'}.`);
            }}
            onCreateWorkspace={handleCreateWorkspace}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onBackToLanding={() => updateState({ viewMode: 'landing' })}
            isAdmin={isAdmin}
            onOpenAdmin={isAdmin ? () => updateState({ viewMode: 'admin' }) : undefined}
            aiCreditsUsed={aiCreditsUsed}
            aiCreditsLimit={aiCreditsLimit}
          />

          <div className="flex-1 flex flex-col min-w-0 relative bg-[#F8F9FB] dark:bg-[#090A0D]">
            <CommandBar
              state={state}
              activeTab={activeTab}
              userProfile={currentUserProfile}
              onSignOut={handleSignOut}
              onQuickCreatePost={() => {
                setEditingPost(null);
                setComposerPreset(null);
                setActiveTab('studio');
              }}
              onSwitchRole={(role) => {
                updateState({ activeRole: role });
                updateProfilePrefs({ activeRole: role }).catch(() => {});
                pushToast('Active Role Updated', `Permissions set to ${role}.`);
              }}
              onSwitchWorkspace={(workspaceId) => {
                updateState({ activeWorkspaceId: workspaceId });
                setFocusedThreadId(undefined);
                setFocusedContactId(undefined);
                setEditingPost(null);
                const ws = state.workspaces.find((w) => w.id === workspaceId);
                pushToast('Workspace Switched', `Scoped all modules to ${ws?.name || 'workspace'}.`);
              }}
              onToggleDarkMode={() => {
                const nextDark = !state.darkMode;
                updateState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
                pushToast(nextDark ? 'Dark Mode Enabled' : 'Light Mode Enabled');
              }}
              onNavigateResult={handleNavigateSearchResult}
              onAcknowledgeAlert={(alertId) => {
                updateState((prev) => ({
                  ...prev,
                  discoveryAlerts: prev.discoveryAlerts.map((a) =>
                    a.id === alertId ? { ...a, acknowledged: true } : a
                  ),
                }));
                pushToast('Alert Marked Read');
              }}
              onSimulateSpikeAlert={handleTriggerSpikeAlert}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onResetDemo={() => {
                resetDemoData();
                pushToast('Workspace Restored', 'All default workspace records have been reset.', 'info');
              }}
              onOpenMobileMenu={() => setMobileDrawerOpen(true)}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            />

            <main className="flex-1 min-h-0 relative">
              <ErrorBoundary key={`${activeTab}-${state.activeWorkspaceId}`}>
              {activeTab === 'overview' && (
                <WorkspaceOverview
                  state={state}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onOpenGrowthTool={(tool) => {
                    setActiveGrowthTool(tool);
                    setActiveTab('tools');
                  }}
                />
              )}

              {activeTab === 'youtube' && (
                <YouTubeStudio
                  key={state.activeWorkspaceId}
                  workspaceId={state.activeWorkspaceId}
                  workspaceName={activeWorkspace.name}
                  workspaceIndustry={activeWorkspace.industry}
                  channels={state.youtubeChannels || []}
                  videos={state.youtubeVideos || []}
                  maxChannelsQuota={activeModuleQuotas.youtubeChannels}
                  aiCreditsRemaining={aiCreditsRemaining}
                  onConsumeCredits={handleConsumeCredits}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onAddChannel={(channel: YouTubeChannel) =>
                    updateState((prev) => ({
                      ...prev,
                      youtubeChannels: [channel, ...(prev.youtubeChannels || [])],
                    }))
                  }
                  onUpdateChannel={(channel: YouTubeChannel) =>
                    updateState((prev) => ({
                      ...prev,
                      youtubeChannels: (prev.youtubeChannels || []).map((c) =>
                        c.id === channel.id ? channel : c
                      ),
                    }))
                  }
                  onDeleteChannel={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      youtubeChannels: (prev.youtubeChannels || []).filter((c) => c.id !== id),
                    }))
                  }
                  onAddVideo={(video: YouTubeVideoItem) =>
                    updateState((prev) => ({
                      ...prev,
                      youtubeVideos: [video, ...(prev.youtubeVideos || [])],
                    }))
                  }
                  onUpdateVideo={(video: YouTubeVideoItem) =>
                    updateState((prev) => ({
                      ...prev,
                      youtubeVideos: (prev.youtubeVideos || []).map((v) =>
                        v.id === video.id ? video : v
                      ),
                    }))
                  }
                  onDeleteVideo={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      youtubeVideos: (prev.youtubeVideos || []).filter((v) => v.id !== id),
                    }))
                  }
                  onScheduleSocialPosts={(newPosts: SocialPost[], navigateToScheduler = false) => {
                    updateState((prev) => ({ ...prev, posts: [...newPosts, ...prev.posts] }));
                    if (navigateToScheduler) {
                      setActiveTab('scheduler');
                    }
                  }}
                  onToast={(title, desc, variant) => pushToast(title, desc, variant || 'success')}
                />
              )}

              {activeTab === 'seo_blog' && (
                <SeoBlogEngine
                  key={state.activeWorkspaceId}
                  workspaceId={state.activeWorkspaceId}
                  workspaceName={activeWorkspace.name}
                  workspaceIndustry={activeWorkspace.industry}
                  articles={state.seoArticles || []}
                  connectors={state.cmsConnectors || []}
                  maxArticlesQuota={activeModuleQuotas.seoArticlesPerMonth}
                  aiCreditsRemaining={aiCreditsRemaining}
                  onConsumeCredits={handleConsumeCredits}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onAddArticle={(article: SeoArticle) =>
                    updateState((prev) => ({
                      ...prev,
                      seoArticles: [article, ...(prev.seoArticles || [])],
                    }))
                  }
                  onUpdateArticle={(article: SeoArticle) =>
                    updateState((prev) => ({
                      ...prev,
                      seoArticles: (prev.seoArticles || []).map((a) =>
                        a.id === article.id ? article : a
                      ),
                    }))
                  }
                  onDeleteArticle={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      seoArticles: (prev.seoArticles || []).filter((a) => a.id !== id),
                    }))
                  }
                  onAddConnector={(connector: CmsConnector) =>
                    updateState((prev) => ({
                      ...prev,
                      cmsConnectors: [connector, ...(prev.cmsConnectors || [])],
                    }))
                  }
                  onUpdateConnector={(connector: CmsConnector) =>
                    updateState((prev) => ({
                      ...prev,
                      cmsConnectors: (prev.cmsConnectors || []).map((c) =>
                        c.id === connector.id ? connector : c
                      ),
                    }))
                  }
                  onDeleteConnector={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      cmsConnectors: (prev.cmsConnectors || []).filter((c) => c.id !== id),
                    }))
                  }
                  onScheduleSocialPosts={(newPosts: SocialPost[]) => {
                    updateState((prev) => ({ ...prev, posts: [...newPosts, ...prev.posts] }));
                  }}
                  onToast={(title, desc, variant) => pushToast(title, desc, variant || 'success')}
                />
              )}

              {activeTab === 'discover' && (
                <DiscoverCurateView
                  key={state.activeWorkspaceId}
                  workspaceId={state.activeWorkspaceId}
                  workspaceName={activeWorkspace.name}
                  workspaceIndustry={activeWorkspace.industry}
                  categories={state.categories}
                  rssSources={state.rssSources || []}
                  curatedItems={state.curatedItems || []}
                  ecommerceFeeds={state.ecommerceFeeds || []}
                  maxRssQuota={activeModuleQuotas.rssAutoFeeds}
                  aiCreditsRemaining={aiCreditsRemaining}
                  onConsumeCredits={handleConsumeCredits}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onAddRssSource={(source: RssSource) =>
                    updateState((prev) => ({
                      ...prev,
                      rssSources: [source, ...(prev.rssSources || [])],
                    }))
                  }
                  onUpdateRssSource={(source: RssSource) =>
                    updateState((prev) => ({
                      ...prev,
                      rssSources: (prev.rssSources || []).map((s) =>
                        s.id === source.id ? source : s
                      ),
                    }))
                  }
                  onDeleteRssSource={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      rssSources: (prev.rssSources || []).filter((s) => s.id !== id),
                    }))
                  }
                  onAddCuratedItems={(items: CuratedFeedItem[]) =>
                    updateState((prev) => {
                      const existingUrls = new Set(
                        (prev.curatedItems || [])
                          .filter((i) => i.workspaceId === prev.activeWorkspaceId)
                          .map((i) => i.url)
                      );
                      const fresh = items.filter((item) => !existingUrls.has(item.url));
                      return {
                        ...prev,
                        curatedItems: [...fresh, ...(prev.curatedItems || [])].slice(0, 120),
                      };
                    })
                  }
                  onMarkCuratedRepurposed={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      curatedItems: (prev.curatedItems || []).map((item) =>
                        item.id === id ? { ...item, repurposed: true } : item
                      ),
                    }))
                  }
                  onAddEcommerceFeed={(feed: EcommerceFeed) =>
                    updateState((prev) => ({
                      ...prev,
                      ecommerceFeeds: [feed, ...(prev.ecommerceFeeds || [])],
                    }))
                  }
                  onUpdateEcommerceFeed={(feed: EcommerceFeed) =>
                    updateState((prev) => ({
                      ...prev,
                      ecommerceFeeds: (prev.ecommerceFeeds || []).map((f) =>
                        f.id === feed.id ? feed : f
                      ),
                    }))
                  }
                  onDeleteEcommerceFeed={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      ecommerceFeeds: (prev.ecommerceFeeds || []).filter((f) => f.id !== id),
                    }))
                  }
                  onAddDrafts={(newDrafts: Draft[]) =>
                    updateState((prev) => ({ ...prev, drafts: [...newDrafts, ...prev.drafts] }))
                  }
                  onScheduleSocialPosts={(newPosts: SocialPost[]) => {
                    updateState((prev) => ({ ...prev, posts: [...newPosts, ...prev.posts] }));
                  }}
                  onOpenInStudio={(preset) => {
                    setEditingPost(null);
                    setComposerPreset(preset);
                    setActiveTab('studio');
                    pushToast('Loaded into Content Studio', 'Customize copy, preview per channel, or schedule.');
                  }}
                  onToast={(title, desc, variant) => pushToast(title, desc, variant || 'success')}
                />
              )}

              {activeTab === 'campaigns' && (
                <ViralCampaignsView
                  key={state.activeWorkspaceId}
                  workspaceId={state.activeWorkspaceId}
                  workspaceName={activeWorkspace.name}
                  campaigns={state.viralCampaigns || []}
                  maxCampaignsQuota={activeModuleQuotas.activeViralCampaigns}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onAddCampaign={(campaign: ViralCampaign) =>
                    updateState((prev) => ({
                      ...prev,
                      viralCampaigns: [campaign, ...(prev.viralCampaigns || [])],
                    }))
                  }
                  onUpdateCampaign={(campaign: ViralCampaign) =>
                    updateState((prev) => ({
                      ...prev,
                      viralCampaigns: (prev.viralCampaigns || []).map((c) =>
                        c.id === campaign.id ? campaign : c
                      ),
                    }))
                  }
                  onDeleteCampaign={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      viralCampaigns: (prev.viralCampaigns || []).filter((c) => c.id !== id),
                    }))
                  }
                  onSyncEntryToCrm={handleSyncEntryToCrm}
                  onToast={(title, desc, variant) => pushToast(title, desc, variant || 'success')}
                />
              )}

              {activeTab === 'tools' && (
                <GrowthToolsSuite
                  workspaceId={state.activeWorkspaceId}
                  workspaceName={activeWorkspace.name}
                  workspaceIndustry={activeWorkspace.industry}
                  initialTool={activeGrowthTool}
                  defaultCategoryId={
                    state.categories.find((c) => c.workspaceId === state.activeWorkspaceId)?.id
                  }
                  onOpenInStudio={(preset) => {
                    setEditingPost(null);
                    setComposerPreset(preset);
                    setActiveTab('studio');
                    pushToast('Loaded into Content Studio', 'Customize copy, preview per channel, or schedule.');
                  }}
                  onSchedulePosts={(newPosts) => {
                    updateState((prev) => ({ ...prev, posts: [...newPosts, ...prev.posts] }));
                    setActiveTab('scheduler');
                  }}
                  onToast={(title, desc, variant) => pushToast(title, desc, variant || 'success')}
                />
              )}

              {activeTab === 'copilot' && (
                <AiCopilotWizard
                  workspaceId={state.activeWorkspaceId}
                  workspaceName={activeWorkspace.name}
                  workspaceIndustry={activeWorkspace.industry}
                  categories={state.categories}
                  onPopulatePosts={(newPosts) =>
                    updateState((prev) => ({ ...prev, posts: [...newPosts, ...prev.posts] }))
                  }
                  onOpenInStudio={(preset) => {
                    setEditingPost(null);
                    setComposerPreset(preset);
                    setActiveTab('studio');
                  }}
                  onGoToScheduler={() => setActiveTab('scheduler')}
                  onToast={(title, desc) => pushToast(title, desc, 'success')}
                />
              )}

              {activeTab === 'studio' && (
                <ContentStudio
                  workspaceId={state.activeWorkspaceId}
                  workspaceName={activeWorkspace.name}
                  workspaceHandle={activeWorkspace.handle}
                  activeRole={state.activeRole}
                  posts={state.posts}
                  drafts={state.drafts}
                  categories={state.categories}
                  editingPost={editingPost}
                  initialPreset={composerPreset}
                  onClearEditingPost={() => setEditingPost(null)}
                  onAddPost={(post: SocialPost) =>
                    updateState((prev) => ({ ...prev, posts: [post, ...prev.posts] }))
                  }
                  onUpdatePost={(post: SocialPost) =>
                    updateState((prev) => ({
                      ...prev,
                      posts: prev.posts.map((p) => (p.id === post.id ? post : p)),
                    }))
                  }
                  onUpdateDraft={(draft: Draft) =>
                    updateState((prev) => ({
                      ...prev,
                      drafts: prev.drafts.map((d) => (d.id === draft.id ? draft : d)),
                    }))
                  }
                  onAddDrafts={(newDrafts: Draft[]) =>
                    updateState((prev) => ({ ...prev, drafts: [...newDrafts, ...prev.drafts] }))
                  }
                  onDeleteDraft={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      drafts: prev.drafts.filter((d) => d.id !== id),
                    }))
                  }
                  onScheduleDraft={(draft: Draft, scheduledAt: string, categoryId?: string) => {
                    const newPost: SocialPost = {
                      id: `p-${Date.now()}`,
                      workspaceId: state.activeWorkspaceId,
                      categoryId: categoryId || draft.categoryId,
                      platforms: draft.platforms,
                      content: draft.content,
                      status: state.activeRole === 'Contributor' ? 'pending_approval' : 'scheduled',
                      isEvergreen: true,
                      scheduledAt,
                    };
                    updateState((prev) => ({
                      ...prev,
                      posts: [newPost, ...prev.posts],
                      drafts: prev.drafts.filter((d) => d.id !== draft.id),
                    }));
                    pushToast('Draft Scheduled', `Scheduled for ${new Date(scheduledAt).toLocaleString()}.`, 'success');
                  }}
                  onGoToScheduler={() => setActiveTab('scheduler')}
                  onToast={(title, desc) => pushToast(title, desc, 'success')}
                />
              )}

              {activeTab === 'scheduler' && (
                <VisualScheduler
                  workspaceId={state.activeWorkspaceId}
                  workspaceHandle={activeWorkspace.handle}
                  posts={state.posts}
                  categories={state.categories}
                  onUpdatePost={(post: SocialPost) =>
                    updateState((prev) => ({
                      ...prev,
                      posts: prev.posts.map((p) => (p.id === post.id ? post : p)),
                    }))
                  }
                  onDeletePost={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      posts: prev.posts.filter((p) => p.id !== id),
                    }))
                  }
                  onUpdateCategory={(cat: ContentCategory) =>
                    updateState((prev) => ({
                      ...prev,
                      categories: prev.categories.map((c) => (c.id === cat.id ? cat : c)),
                    }))
                  }
                  onEditInStudio={(post: SocialPost) => {
                    setEditingPost(post);
                    setActiveTab('studio');
                  }}
                  onComposeNew={() => {
                    setEditingPost(null);
                    setActiveTab('studio');
                  }}
                  onToast={(title, desc) => pushToast(title, desc, 'success')}
                />
              )}

              {activeTab === 'categories' && (
                <div className="h-full overflow-y-auto p-6 custom-scrollbar">
                  <CategoryQueuesView
                    workspaceId={state.activeWorkspaceId}
                    categories={state.categories}
                    posts={state.posts}
                    onAddCategory={(cat: ContentCategory) =>
                      updateState((prev) => ({ ...prev, categories: [...prev.categories, cat] }))
                    }
                    onUpdateCategory={(cat: ContentCategory) =>
                      updateState((prev) => ({
                        ...prev,
                        categories: prev.categories.map((c) => (c.id === cat.id ? cat : c)),
                      }))
                    }
                    onComposeInCategory={(catId, evergreen) => {
                      setEditingPost(null);
                      setComposerPreset({ categoryId: catId, evergreen });
                      setActiveTab('studio');
                    }}
                    onToast={(title, desc) => pushToast(title, desc, 'success')}
                  />
                </div>
              )}

              {activeTab === 'inbox' && (
                <SocialInbox
                  workspaceId={state.activeWorkspaceId}
                  threads={state.threads}
                  contacts={state.contacts}
                  deals={state.deals}
                  selectedThreadId={focusedThreadId}
                  currentUserName={currentUserProfile.displayName}
                  currentUserAvatar={currentUserProfile.photoURL}
                  onUpdateThread={(thread: Thread) =>
                    updateState((prev) => ({
                      ...prev,
                      threads: prev.threads.map((t) => (t.id === thread.id ? thread : t)),
                    }))
                  }
                  onUpdateContact={(contact: Contact) =>
                    updateState((prev) => ({
                      ...prev,
                      contacts: prev.contacts.map((c) => (c.id === contact.id ? contact : c)),
                    }))
                  }
                  onOpenContactInCrm={(contactId) => {
                    setFocusedContactId(contactId);
                    setActiveTab('crm');
                  }}
                  onToast={(title, desc) => pushToast(title, desc, 'success')}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsDashboard
                  state={state}
                  onCreateDraftFromAlert={handleCreateDraftFromAlert}
                  onTriggerSpikeAlert={handleTriggerSpikeAlert}
                  onAcknowledgeAlert={(id) =>
                    updateState((prev) => ({
                      ...prev,
                      discoveryAlerts: prev.discoveryAlerts.map((a) =>
                        a.id === id ? { ...a, acknowledged: true } : a
                      ),
                    }))
                  }
                  onToast={(title, desc) => pushToast(title, desc, 'success')}
                />
              )}

              {activeTab === 'approvals' && (
                <TeamApprovalsView
                  workspaceId={state.activeWorkspaceId}
                  workspaceName={activeWorkspace.name}
                  posts={state.posts}
                  teamMembers={state.teamMembers}
                  categories={state.categories}
                  activeRole={state.activeRole}
                  onUpdatePost={(post: SocialPost) =>
                    updateState((prev) => ({
                      ...prev,
                      posts: prev.posts.map((p) => (p.id === post.id ? post : p)),
                    }))
                  }
                  onEditInStudio={(post: SocialPost) => {
                    setEditingPost(post);
                    setActiveTab('studio');
                  }}
                  onAddTeamMember={(member: TeamMember) =>
                    updateState((prev) => ({ ...prev, teamMembers: [...prev.teamMembers, member] }))
                  }
                  onUpdateTeamMember={(member: TeamMember) =>
                    updateState((prev) => ({
                      ...prev,
                      teamMembers: prev.teamMembers.map((m) => (m.id === member.id ? member : m)),
                    }))
                  }
                  onRemoveTeamMember={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      teamMembers: prev.teamMembers.filter((m) => m.id !== id),
                    }))
                  }
                  onToast={(title, desc) => pushToast(title, desc, 'success')}
                />
              )}

              {activeTab === 'profiles' && (
                <ConnectedProfilesView
                  workspaceId={state.activeWorkspaceId}
                  workspaceName={activeWorkspace.name}
                  profiles={state.connectedProfiles}
                  onAddProfile={(profile: ConnectedProfile) =>
                    updateState((prev) => ({
                      ...prev,
                      connectedProfiles: [profile, ...prev.connectedProfiles],
                    }))
                  }
                  onUpdateProfile={(profile: ConnectedProfile) =>
                    updateState((prev) => ({
                      ...prev,
                      connectedProfiles: prev.connectedProfiles.map((p) =>
                        p.id === profile.id ? profile : p
                      ),
                    }))
                  }
                  onDeleteProfile={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      connectedProfiles: prev.connectedProfiles.filter((p) => p.id !== id),
                    }))
                  }
                  onToast={(title, desc) => pushToast(title, desc, 'success')}
                />
              )}

              {activeTab === 'crm' && (
                <SocialCRM
                  workspaceId={state.activeWorkspaceId}
                  contacts={state.contacts}
                  deals={state.deals}
                  selectedContactId={focusedContactId}
                  onUpdateContact={(contact: Contact) =>
                    updateState((prev) => ({
                      ...prev,
                      contacts: prev.contacts.map((c) => (c.id === contact.id ? contact : c)),
                    }))
                  }
                  onAddContact={(contact: Contact) =>
                    updateState((prev) => ({ ...prev, contacts: [contact, ...prev.contacts] }))
                  }
                  onDeleteContact={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      contacts: prev.contacts.filter((c) => c.id !== id),
                      deals: prev.deals.filter((d) => d.contactId !== id),
                      threads: prev.threads.filter((t) => t.contactId !== id),
                    }))
                  }
                  onBulkUpdateContacts={(updatedIds: string[], updater: (c: Contact) => Contact) =>
                    updateState((prev) => ({
                      ...prev,
                      contacts: prev.contacts.map((c) => (updatedIds.includes(c.id) ? updater(c) : c)),
                    }))
                  }
                  onUpdateDeal={(deal: Deal) =>
                    updateState((prev) => ({
                      ...prev,
                      deals: prev.deals.map((d) => (d.id === deal.id ? deal : d)),
                    }))
                  }
                  onAddDeal={(deal: Deal) =>
                    updateState((prev) => ({ ...prev, deals: [deal, ...prev.deals] }))
                  }
                  onDeleteDeal={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      deals: prev.deals.filter((d) => d.id !== id),
                    }))
                  }
                  onOpenInboxForContact={handleOpenInboxForContact}
                  onToast={(title, desc) => pushToast(title, desc, 'success')}
                />
              )}

              {activeTab === 'ads' && (
                <AdManager
                  workspaceId={state.activeWorkspaceId}
                  ads={state.ads}
                  onUpdateAd={(ad: AdCampaign) =>
                    updateState((prev) => ({
                      ...prev,
                      ads: prev.ads.map((a) => (a.id === ad.id ? ad : a)),
                    }))
                  }
                  onAddAd={(ad: AdCampaign) =>
                    updateState((prev) => ({ ...prev, ads: [ad, ...prev.ads] }))
                  }
                  onDeleteAd={(id: string) =>
                    updateState((prev) => ({
                      ...prev,
                      ads: prev.ads.filter((a) => a.id !== id),
                    }))
                  }
                  onToast={(title, desc) => pushToast(title, desc, 'success')}
                />
              )}
              </ErrorBoundary>
            </main>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        state={state}
        userProfile={currentUserProfile || undefined}
        onSignOut={handleSignOut}
        onUpdateState={updateState}
        onResetDemo={() => {
          resetDemoData();
          pushToast('Workspace Data Restored', 'All seed records have been reset.', 'info');
        }}
        onToast={(title, desc) => pushToast(title, desc, 'success')}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        state={state}
        isAdmin={isAdmin}
        onNavigateTab={(tab, itemId) => {
          if (state.viewMode !== 'app') {
            updateState({ viewMode: 'app' });
          }
          handleNavigateSearchResult(tab, itemId);
          setMobileDrawerOpen(false);
        }}
        onNewPost={() => {
          if (state.viewMode !== 'app') {
            updateState({ viewMode: 'app' });
          }
          setEditingPost(null);
          setComposerPreset(null);
          setActiveTab('studio');
          setMobileDrawerOpen(false);
          pushToast('Content Studio Ready', 'Opened fresh multi-network post composer.');
        }}
        onSwitchWorkspace={(workspaceId) => {
          updateState({ viewMode: 'app', activeWorkspaceId: workspaceId });
          setFocusedThreadId(undefined);
          setFocusedContactId(undefined);
          setEditingPost(null);
          const ws = state.workspaces.find((w) => w.id === workspaceId);
          pushToast('Workspace Switched', `Scoped all modules to ${ws?.name || 'workspace'}.`);
        }}
        onChangeViewMode={(viewMode) => {
          const safeViewMode = viewMode === 'admin' && !isAdmin ? 'app' : viewMode;
          updateState({ viewMode: safeViewMode });
          const labels = {
            landing: 'Public Marketing Website',
            app: 'User Workspace Dashboard',
            admin: 'Super Admin Control Panel',
          };
          pushToast('Switched View Mode', labels[safeViewMode], 'info');
        }}
        onToggleDarkMode={() => {
          const nextDark = !state.darkMode;
          updateState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
          pushToast(nextDark ? 'Dark Mode Enabled' : 'Light Mode Enabled');
        }}
        onOpenSettings={() => {
          if (state.viewMode !== 'app') {
            updateState({ viewMode: 'app' });
          }
          setIsSettingsOpen(true);
        }}
        onTriggerTrendSpike={() => {
          if (state.viewMode !== 'app') {
            updateState({ viewMode: 'app' });
          }
          handleTriggerSpikeAlert();
          setActiveTab('analytics');
        }}
      />

      {/* Live Toast Stack */}
      <div className="fixed bottom-4 right-4 z-[130] space-y-2 max-w-sm w-[calc(100vw-2rem)] sm:w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-[10px] p-3 flex items-start justify-between gap-3 transition-all"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {t.variant === 'warning' ? (
                <TrendingUp size={15} strokeWidth={1.5} className="text-[#F97316] shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 size={15} strokeWidth={1.5} className="text-[#06B6D4] shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6]">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF] leading-snug">
                    {t.description}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6] shrink-0"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
