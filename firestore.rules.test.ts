/**
 * Security Rules Verification Suite — socialifyai.com
 * Verifies that all 12 "Dirty Dozen" adversarial payloads are rejected with PERMISSION_DENIED.
 *
 * Run against Firebase Emulator Suite when @firebase/rules-unit-testing is available:
 *   firebase emulators:exec "npx tsx firestore.rules.test.ts"
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  actor: { uid: string; email: string; email_verified: boolean } | null;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on User Create (isAdmin: true)',
    actor: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    operation: 'create',
    path: '/users/user_alice',
    payload: {
      uid: 'user_alice',
      displayName: 'Alice',
      email: 'alice@example.com',
      photoURL: '',
      selectedPlan: 'accelerate',
      activeRole: 'Owner',
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Identity Spoofing on User Create',
    actor: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    operation: 'create',
    path: '/users/user_bob',
    payload: {
      uid: 'user_bob',
      displayName: 'Bob',
      email: 'bob@example.com',
      photoURL: '',
      selectedPlan: 'bootstrap',
      activeRole: 'Owner',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Admin Spoof',
    actor: { uid: 'attacker_uid', email: 'syedasgharkazmii@gmail.com', email_verified: false },
    operation: 'get',
    path: '/adminState/global',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-User PII Read',
    actor: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    operation: 'get',
    path: '/users/user_bob',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Blanket User List Scraping',
    actor: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    operation: 'list',
    path: '/users',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned Workspace Write (Parent /users/user_ghost missing)',
    actor: { uid: 'user_ghost', email: 'ghost@example.com', email_verified: true },
    operation: 'create',
    path: '/users/user_ghost/workspaces/main',
    payload: {
      ownerId: 'user_ghost',
      activeWorkspaceId: 'ws-1',
      activeRole: 'Owner',
      selectedPlan: 'accelerate',
      darkMode: false,
      workspaces: [],
      categories: [],
      connectedProfiles: [],
      teamMembers: [],
      contacts: [],
      threads: [],
      deals: [],
      posts: [],
      ads: [],
      drafts: [],
      discoveryAlerts: [],
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Timestamp Forgery on User Create',
    actor: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    operation: 'create',
    path: '/users/user_alice',
    payload: {
      uid: 'user_alice',
      displayName: 'Alice',
      email: 'alice@example.com',
      photoURL: '',
      selectedPlan: 'accelerate',
      activeRole: 'Owner',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable Field Tampering (uid mutation on update)',
    actor: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    operation: 'update',
    path: '/users/user_alice',
    payload: {
      uid: 'user_bob',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Resource Exhaustion / ID Poisoning',
    actor: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    operation: 'create',
    path: `/users/user_alice/workspaces/${'bad!id$'.repeat(30)}`,
    payload: { ownerId: 'user_alice' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Array Overflow DoS (> 300 posts)',
    actor: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    operation: 'update',
    path: '/users/user_alice/workspaces/main',
    payload: {
      posts: Array.from({ length: 305 }, (_, i) => ({ id: `p-${i}` })),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value Poisoning on Plan Enum',
    actor: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    operation: 'update',
    path: '/users/user_alice',
    payload: {
      selectedPlan: 'unlimited_free_hack',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Privilege Escalation to Admin State & Registry',
    actor: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    operation: 'create',
    path: '/admins/user_alice',
    payload: {
      uid: 'user_alice',
      email: 'alice@example.com',
    },
    expected: 'PERMISSION_DENIED',
  },
];
