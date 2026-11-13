import React, { useState, useMemo, useEffect } from 'react';
import { X, CheckCircle2, TrendingUp } from 'lucide-react';
import { TopModeSwitcher } from './components/layout/TopModeSwitcher';
import { Sidebar, CommandBar, NavTabId } from './components/layout/Shell';
import { CommandPalette } from './components/layout/CommandPalette';
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
} from './types';

export default function App() {
  const { state, updateState, resetDemoData, toasts, pushToast, dismissToast } = useStorage();
  const [activeTab, setActiveTab] = useState<NavTabId>('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [focusedThreadId, setFocusedThreadId] = useState<string | undefined>(undefined);
  const [focusedContactId, setFocusedContactId] = useState<string | undefined>(undefined);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [composerPreset, setComposerPreset] = useState<ComposerPreset | null>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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

  const handleLaunchFromLanding = (plan?: PlanTier, workspaceName?: string) => {
    updateState((prev) => ({
      ...prev,
      viewMode: 'app',
      selectedPlan: plan || prev.selectedPlan,
      workspaces: workspaceName
        ? prev.workspaces.map((w, idx) => (idx === 0 ? { ...w, name: workspaceName } : w))
        : prev.workspaces,
    }));
    pushToast(
      'Workspace Launched',
      workspaceName ? `Welcome to "${workspaceName}" dashboard.` : 'Loaded active brand workspace.',
      'success'
    );
  };

  const handleCreateWorkspace = (name: string, industry: string, handle: string) => {
    const newId = `ws-${Date.now()}`;
    const newWs: Workspace = {
      id: newId,
      name,
      industry,
      handle,
      plan: state.selectedPlan,
      connectedPlatforms: ['instagram', 'linkedin', 'x', 'tiktok'],
    };
    const starterCat: ContentCategory = {
      id: `cat-${Date.now()}`,
      workspaceId: newId,
      name: 'Evergreen Tips',
      description: 'Core educational frameworks & evergreen social posts.',
      color: '#4F46E5',
      isActive: true,
      evergreenEnabled: true,
      postsPerWeek: 3,
      timeSlots: [
        { day: 'Mon', time: '09:00' },
        { day: 'Wed', time: '11:30' },
      ],
    };
    const starterProfile: ConnectedProfile = {
      id: `prof-${Date.now()}`,
      workspaceId: newId,
      platform: 'instagram',
      accountName: name,
      handle,
      followers: 1200,
      status: 'connected',
      lastSynced: 'Just now',
    };

    updateState((prev) => ({
      ...prev,
      workspaces: [...prev.workspaces, newWs],
      activeWorkspaceId: newId,
      categories: [...prev.categories, starterCat],
      connectedProfiles: [...prev.connectedProfiles, starterProfile],
    }));
    setFocusedThreadId(undefined);
    setFocusedContactId(undefined);
    setEditingPost(null);
    setActiveTab('overview');
    pushToast('Workspace Created', `Switched to "${name}" with starter queue & profile.`);
  };

  const handleTriggerSpikeAlert = () => {
    const newAlert: DiscoveryAlert = {
      id: `al-${Date.now()}`,
      workspaceId: state.activeWorkspaceId,
      keyword: 'AI Video Repurposing',
      niche: 'Growth Marketing',
      source: 'LinkedIn & ProductHunt Trend Feed',
      title: 'Topic Spike (+194%): Short-form AI Repurposing workflows surge across B2B SaaS',
      summary: 'High-growth teams are turning single product demos into 10-channel evergreen series.',
      velocity: '+194%',
      trendScore: 97,
      isSpike: true,
      acknowledged: false,
      publishedAt: new Date().toISOString(),
    };
    updateState((prev) => ({
      ...prev,
      discoveryAlerts: [newAlert, ...prev.discoveryAlerts],
    }));
    pushToast('Trend Spike Detected (+194%)', newAlert.title, 'warning');
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
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Persistent Top Mode Switcher: [1] Public Site | [2] User Workspace | [3] Super Admin */}
      <TopModeSwitcher
        viewMode={state.viewMode}
        onChangeViewMode={(viewMode) => {
          updateState({ viewMode });
          setMobileDrawerOpen(false);
          const labels = {
            landing: 'Public Marketing Website',
            app: 'User Workspace Dashboard',
            admin: 'Super Admin Control Panel',
          };
          pushToast('Switched View Mode', labels[viewMode], 'info');
        }}
        darkMode={state.darkMode}
        onToggleDarkMode={() => {
          const nextDark = !state.darkMode;
          updateState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
          pushToast(nextDark ? 'Dark Mode Enabled' : 'Light Mode Enabled');
        }}
        selectedPlan={state.selectedPlan}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {state.viewMode === 'landing' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <LandingPage
            selectedPlan={state.selectedPlan}
            onLaunch={handleLaunchFromLanding}
            onToast={(title, desc, variant) => pushToast(title, desc, variant || 'success')}
          />
        </div>
      )}

      {state.viewMode === 'admin' && (
        <SuperAdminPanel
          state={state}
          onUpdateTenant={(tenant: TenantAccount) =>
            updateState((prev) => ({
              ...prev,
              tenants: prev.tenants.map((t) => (t.id === tenant.id ? tenant : t)),
              auditLogs: [
                {
                  id: `log-${Date.now()}`,
                  actor: 'syedasgharkazmii@gmail.com',
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
                  actor: 'syedasgharkazmii@gmail.com',
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
                  actor: 'syedasgharkazmii@gmail.com',
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
                  actor: 'syedasgharkazmii@gmail.com',
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
                  actor: 'syedasgharkazmii@gmail.com',
                  action: 'API Health Action',
                  target: actionLabel,
                  timestamp: new Date().toISOString(),
                },
                ...prev.auditLogs,
              ],
            }));
            pushToast('API Gateway Updated', actionLabel, 'success');
          }}
          onTestAllApis={() => {
            updateState((prev) => ({
              ...prev,
              apiHealthNodes: prev.apiHealthNodes.map((n) => ({
                ...n,
                status: 'operational',
                latencyMs: 92 + Math.floor(Math.random() * 68),
                lastTestedAt: 'Just now',
              })),
              auditLogs: [
                {
                  id: `log-${Date.now()}`,
                  actor: 'syedasgharkazmii@gmail.com',
                  action: 'Pinged All Social APIs',
                  target: '6/6 gateways verified healthy',
                  timestamp: new Date().toISOString(),
                },
                ...prev.auditLogs,
              ],
            }));
            pushToast('All 6 API Gateways Healthy', 'Latency and rate limits verified.', 'success');
          }}
          onSaveAiGovernance={(config: AiGovernanceConfig) => {
            updateState((prev) => ({
              ...prev,
              aiGovernance: config,
              auditLogs: [
                {
                  id: `log-${Date.now()}`,
                  actor: 'syedasgharkazmii@gmail.com',
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
                  actor: 'syedasgharkazmii@gmail.com',
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
                  actor: 'syedasgharkazmii@gmail.com',
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
        />
      )}

      {state.viewMode === 'app' && (
        <div className="flex-1 flex min-h-0 overflow-hidden">
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
          />

          <div className="flex-1 flex flex-col min-w-0 relative">
            <CommandBar
              state={state}
              onQuickCreatePost={() => {
                setEditingPost(null);
                setComposerPreset(null);
                setActiveTab('studio');
              }}
              onSwitchRole={(role) => {
                updateState({ activeRole: role });
                pushToast('Active Role Updated', `Permissions set to ${role}.`);
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
                pushToast('Demo Workspace Restored', 'All seed records have been reset.', 'info');
              }}
              onOpenMobileMenu={() => setMobileDrawerOpen(true)}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            />

            <main className="flex-1 min-h-0 relative">
              {activeTab === 'overview' && (
                <WorkspaceOverview state={state} onNavigate={(tab) => setActiveTab(tab)} />
              )}

              {activeTab === 'copilot' && (
                <AiCopilotWizard
                  workspaceId={state.activeWorkspaceId}
                  categories={state.categories}
                  onPopulatePosts={(newPosts) =>
                    updateState((prev) => ({ ...prev, posts: [...newPosts, ...prev.posts] }))
                  }
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
                  onUpdateDeal={(deal: Deal) =>
                    updateState((prev) => ({
                      ...prev,
                      deals: prev.deals.map((d) => (d.id === deal.id ? deal : d)),
                    }))
                  }
                  onAddDeal={(deal: Deal) =>
                    updateState((prev) => ({ ...prev, deals: [deal, ...prev.deals] }))
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
            </main>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        state={state}
        onUpdateState={updateState}
        onResetDemo={() => {
          resetDemoData();
          pushToast('Demo Workspace Restored', 'All seed records have been reset.', 'info');
        }}
        onToast={(title, desc) => pushToast(title, desc, 'success')}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        state={state}
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
          updateState({ viewMode });
          const labels = {
            landing: 'Public Marketing Website',
            app: 'User Workspace Dashboard',
            admin: 'Super Admin Control Panel',
          };
          pushToast('Switched View Mode', labels[viewMode], 'info');
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
      <div className="fixed bottom-5 right-5 z-[130] space-y-2 max-w-sm w-[calc(100vw-2.5rem)] sm:w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-2xl p-3.5 flex items-start justify-between gap-3 transition-all"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {t.variant === 'warning' ? (
                <TrendingUp size={16} className="text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 size={16} className="text-[#4F46E5] dark:text-indigo-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {t.description}
                  </p>
                )}
              </div>
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
