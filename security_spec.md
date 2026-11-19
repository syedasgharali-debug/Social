# Security Specification — socialifyai.com Firestore Rules

## 1. Data Invariants
1. **User PII Isolation**: `/users/{userId}` contains private PII (`email`, `displayName`, `photoURL`). Only the verified authenticated owner (`request.auth.uid == userId && request.auth.token.email_verified == true`) or a verified Super Admin may read or mutate it.
2. **Master Gate Relational Sync**: Every subcollection document under `/users/{userId}/workspaces/{workspaceDocId}` cannot exist or be accessed unless its parent `/users/{userId}` exists and matches `request.auth.uid`.
3. **Immutable Ownership & Timestamps**: `uid`, `ownerId`, and `createdAt` are immutable after document creation. `createdAt == request.time` on create; `updatedAt == request.time` on update.
4. **Anti-Privilege-Escalation**: Users can never write to `/admins/{adminId}` or `/adminState/{configId}` and cannot inject ghost RBAC keys like `isAdmin: true` into `/users/{userId}`.
5. **Bounded Collections & Strings**: Every string enforces `.size()` bounds; every array enforces `.size() <= MAX` and validates element types where non-empty.
6. **Verified Email Enforcement**: All standard reads/writes and admin email checks strictly enforce `request.auth.token.email_verified == true`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on User Create**: Writing `isAdmin: true` inside `/users/{uid}` -> MUST BE DENIED.
2. **Identity Spoofing on User Create**: User A attempting to create `/users/userB` with `uid: "userB"` -> MUST BE DENIED.
3. **Unverified Email Admin Spoof**: Attacker matching admin email with `email_verified: false` accessing `/adminState/global` -> MUST BE DENIED.
4. **Cross-User PII Read**: Authenticated User A attempting `get` on `/users/userB` -> MUST BE DENIED.
5. **Blanket User List Scraping**: Authenticated non-admin attempting `list` on `/users` without owning documents -> MUST BE DENIED.
6. **Orphaned Workspace Write**: Creating `/users/userA/workspaces/main` when parent `/users/userA` does not exist -> MUST BE DENIED.
7. **Timestamp Forgery**: Creating `/users/userA` with a backdated client timestamp (`createdAt != request.time`) -> MUST BE DENIED.
8. **Immutable Field Tampering**: Updating `/users/userA` and modifying `uid` or `createdAt` -> MUST BE DENIED.
9. **Resource Exhaustion / ID Poisoning**: Attempting `create` at `/users/userA/workspaces/<150-char-invalid-id!@#>` -> MUST BE DENIED.
10. **Array Overflow DoS**: Writing 350 posts (`posts.size() > 300`) into `/users/userA/workspaces/main` -> MUST BE DENIED.
11. **Value Poisoning on Update**: Updating `selectedPlan` on `/users/userA` to `"unlimited_free"` (not in enum) -> MUST BE DENIED.
12. **Privilege Escalation to Admin State**: Standard verified user attempting to read or write `/adminState/global` or `/admins/{uid}` -> MUST BE DENIED.
