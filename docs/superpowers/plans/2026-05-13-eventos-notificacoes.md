# Sistema Interno de Eventos e Notificacoes - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Issue:** [#30 - Planejamento: Sistema Interno de Eventos e Notificacoes](https://github.com/prof-ramos/intranet/issues/30)

**Goal:** Deliver internal persisted notifications for relevant intranet events, starting with activity completion, with secure per-user access, unread count, a global notification bell, and a path to Supabase Realtime without weakening LGPD controls.

**Architecture:** Application code emits internal events from server-side mutations. Event handlers create rows in `notifications`. Authenticated users list and mark only their own notifications through server actions. The browser subscribes to `notifications` inserts only after the table has restrictive RLS compatible with the Supabase Auth session.

**Tech Stack:** Next.js 16 App Router, React client components, Drizzle ORM, PostgreSQL/Supabase, Supabase Auth/SSR, Supabase Realtime, Vitest, Playwright.

---

## Planning Corrections

| Topic | Correction for this repo |
|---|---|
| Schema path | Use `src/lib/db/schema/notifications.ts`, not `src/db/schema.ts`. Export it from `src/lib/db/schema/index.ts`. |
| User IDs | `userId` and `actorId` are numeric `admins.id` values. They are not Supabase Auth UUIDs. |
| Event names | Prefer canonical repo names in persisted event types: `activity.completed`, `official_letter.completed` or `official_letter.generated`, and `legal_consultation.answered`. If the issue keeps `task.completed`, `document.completed`, and `request.answered`, map them at the service boundary. |
| Dedupe | A plain `dedupeKey` index does not dedupe. Use a unique partial index on `(user_id, dedupe_key)` where `dedupe_key is not null`. |
| Activity completion | The current board updates status in local React state only. Add a persisted server action before emitting `activity.completed`. |
| Oficios | `oficios` do not have an internal recipient/responsible field today. Define a recipient rule before emitting official-letter notifications. Do not emit from PDF download. |
| Realtime security | Client-side filters are not access control. Realtime requires restrictive RLS/grants tied to the authenticated Supabase user. |
| Remote DB | Do not apply remote migrations until the official Supabase target and migration drift documented in `docs/dbsave.md` are resolved. |

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/db/schema/notifications.ts` | Drizzle table, enums, indexes, row types |
| `drizzle/postgres/0014_add_notifications.sql` | SQL migration for table, indexes, RLS, realtime publication |
| `drizzle/postgres/meta/_journal.json` | Journal entry for migration `0014` |
| `src/lib/db/schema.integration.test.ts` | DB contract for columns, enums, indexes, RLS, migration alignment |
| `src/lib/notifications/repository.ts` | DB operations for list/count/create/mark read |
| `src/lib/notifications/service.ts` | Notification business rules and DTO shaping |
| `src/lib/events.ts` | `emitEvent` and event handler registry |
| `src/app/app/notifications/actions.ts` | Server actions for authenticated list/read/read-all |
| `src/lib/supabase/client.ts` | Browser-safe Supabase client via `createBrowserClient` |
| `src/hooks/useNotifications.ts` | Client hook for initial state, mark-read, realtime subscription |
| `src/components/NotificationBell.tsx` | Bell button, unread badge, dropdown |
| `src/app/app/layout.tsx` | Global authenticated mount point for the bell |
| `src/app/app/associados/page.tsx` | Remove the hardcoded local bell stub |
| `src/lib/activities/*` and `src/app/app/atividades/actions.ts` | Persist activity status changes and emit completion event |
| `src/lib/juridico/*` and `src/app/app/juridico/actions.ts` | Later: emit answered consultation event |
| `src/lib/oficios/*` | Later: emit official-letter event only after recipient rule is defined |

---

## Phase 0: Preflight Decisions

- [ ] Confirm whether persisted event type names should use issue examples (`task.completed`) or repo canonical names (`activity.completed`).
- [ ] Confirm the v1 official-letter recipient rule. If no internal recipient exists, keep oficios out of v1 implementation.
- [ ] Decide if Realtime ships in the same PR or behind a feature flag after RLS verification.
- [ ] Resolve local migration state before generating new SQL: `_journal.json` includes migrations beyond the latest snapshot, so do not run `drizzle-kit generate` blindly.
- [ ] Keep this as multiple small PRs. Recommended order: DB/core, activity mutation/event, notification UI, realtime hardening, then juridico/oficios triggers.

---

## Phase 1: Database Contract

**Files:**
- Create `src/lib/db/schema/notifications.ts`
- Modify `src/lib/db/schema/index.ts`
- Create `drizzle/postgres/0014_add_notifications.sql`
- Modify `drizzle/postgres/meta/_journal.json`
- Modify `src/lib/db/schema.integration.test.ts`

- [ ] Add enums:

```ts
notification_type:
  - 'activity.completed'
  - 'official_letter.completed'
  - 'legal_consultation.answered'

notification_entity_type:
  - 'activity'
  - 'official_letter'
  - 'legal_consultation'
```

- [ ] Add `notifications` table:

```txt
id int8 identity primary key
user_id int8 not null references admins(id)
actor_id int8 null references admins(id) on delete set null
type notification_type not null
title text not null
message text not null
href text null
entity_type notification_entity_type null
entity_id int8 null
read_at timestamptz null
metadata jsonb null
dedupe_key text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

- [ ] Add required indexes:

```sql
create index idx_notifications_user_read_at on notifications (user_id, read_at);
create index idx_notifications_user_created_at on notifications (user_id, created_at desc);
create unique index idx_notifications_user_dedupe_key
  on notifications (user_id, dedupe_key)
  where dedupe_key is not null;
```

- [ ] Enable RLS and create restrictive notification policies. Minimum safe policy for current email-based auth mapping:

```sql
alter table notifications enable row level security;

create policy notifications_select_own
  on notifications
  for select
  to authenticated
  using (
    exists (
      select 1
      from admins
      where admins.id = notifications.user_id
        and admins.is_active = true
        and lower(admins.email) = lower(auth.jwt() ->> 'email')
    )
  );
```

- [ ] Do not grant browser `insert` on `notifications`. Notifications are created by the server through Drizzle.
- [ ] If browser mark-read is done through server actions, no browser `update` grant is needed. If direct Supabase update is ever introduced, add a similarly restrictive `update` policy first.
- [ ] Add `notifications` to `supabase_realtime` publication only after the select policy is present:

```sql
alter publication supabase_realtime add table notifications;
```

- [ ] Update `schema.integration.test.ts` for columns, enums, indexes, and RLS.
- [ ] Add a contract assertion that `idx_notifications_user_dedupe_key` is unique and partial, not just present by name.
- [ ] Run `npm run test:db` after applying the migration locally.

---

## Phase 2: Notification Core

**Files:**
- Create `src/lib/notifications/repository.ts`
- Create `src/lib/notifications/service.ts`
- Create `src/lib/events.ts`
- Create unit tests near the new service files

- [ ] Implement repository functions with a transaction-compatible executor:

```txt
createNotification(input, tx?)
listNotificationsForUser(userId, { limit }, tx?)
countUnreadNotificationsForUser(userId, tx?)
markNotificationRead({ id, userId }, tx?)
markAllNotificationsRead(userId, tx?)
```

- [ ] `markNotificationRead` must update by both `id` and `userId`.
- [ ] `markAllNotificationsRead` must update only rows where `user_id = current user`.
- [ ] `createNotification` must use DB-level dedupe. Use `on conflict do nothing` against the unique `(user_id, dedupe_key)` index, or raw SQL if Drizzle cannot infer the partial unique index cleanly.
- [ ] Implement `emitEvent(type, payload, options?)`.
- [ ] Allow `emitEvent` to receive a transaction executor so multi-table operations stay atomic.
- [ ] Validate numeric IDs; this repo uses bigint columns in `{ mode: 'number' }`.
- [ ] Skip self-notifications by default unless a handler explicitly opts in.
- [ ] Log only metadata-safe fields: type, actorId, recipientId, entityType, entityId. Do not log titles, messages, ofício body, consultation text, CPF, SIAPE, emails, or names.
- [ ] Add unit tests:

```txt
valid event creates one notification
duplicate dedupeKey is idempotent
self-notification is skipped
invalid actor/recipient/entity IDs reject
message/title are not logged
```

---

## Phase 3: Persist Activity Completion

**Files:**
- Modify `src/lib/activities/repository.ts`
- Modify `src/lib/activities/service.ts`
- Modify `src/app/app/atividades/actions.ts`
- Modify `src/app/app/atividades/AtividadesBoard.tsx`

- [ ] Add repository update functions that accept `tx`.
- [ ] Add a server action for activity status updates.
- [ ] In the service layer, detect the transition:

```txt
old.status !== 'concluido' && new.status === 'concluido'
```

- [ ] Wrap activity update and notification creation in `db.transaction()`.
- [ ] Use `createdBy` as the requester/recipient for `activity.completed`.
- [ ] Use current authenticated user as actor.
- [ ] Do not notify when `createdBy === actorId`.
- [ ] Revalidate `/app/atividades` after the mutation.
- [ ] Update `AtividadesBoard` so drag/drop and drawer status changes call the server action. Keep optimistic UI, but rollback or show an error if persistence fails.
- [ ] Add tests:

```txt
transition to concluido emits once
already-concluded update does not emit
moving out of concluido does not emit completion
createdBy receives notification
actor does not receive self-notification
```

---

## Phase 4: Authenticated Notification Actions

**Files:**
- Create `src/app/app/notifications/actions.ts`
- Add tests for ownership checks

- [ ] Add `listNotificationsAction`.
- [ ] Add `markNotificationReadAction`.
- [ ] Add `markAllNotificationsReadAction`.
- [ ] Every action must call `requireAuth()`.
- [ ] No action may accept or trust `userId` from the client.
- [ ] Return compact DTOs only:

```txt
id
type
title
message
href
entityType
entityId
readAt
createdAt
```

- [ ] Validate `href` as an internal `/app/...` path before returning or navigating.
- [ ] Add tests:

```txt
list returns only own notifications
mark-read cannot update another user's notification
read-all only touches current user's rows
unauthenticated requests redirect/fail according to existing auth pattern
```

---

## Phase 5: Notification Bell UI

**Files:**
- Create `src/components/NotificationBell.tsx`
- Create `src/hooks/useNotifications.ts`
- Create `src/lib/supabase/client.ts`
- Modify `src/app/app/layout.tsx`
- Modify `src/app/app/associados/page.tsx`

- [ ] Add browser Supabase helper with `createBrowserClient` from `@supabase/ssr`. Never import server-only Supabase helpers into client components.
- [ ] Mount `NotificationBell` once in `src/app/app/layout.tsx`.
- [ ] Convert the current mobile-only header into a small authenticated app header visible on desktop and mobile, or extract `AppHeader`.
- [ ] Remove the hardcoded notification button from `src/app/app/associados/page.tsx`.
- [ ] `useNotifications` should:

```txt
load initial notifications/count
subscribe to INSERT on notifications for current user
prepend new notifications
update unread count
mark one as read
mark all as read if implemented
handle reconnect/error state
unsubscribe on cleanup
```

- [ ] Use Supabase Realtime filter only as a performance/UX filter:

```ts
filter: `user_id=eq.${currentUserId}`
```

Security still comes from RLS and server actions.

- [ ] UI requirements:

```txt
Bell icon button from lucide-react
badge for unread count
compact dropdown with latest notifications
empty state
loading/error state
Portuguese UI text
aria-label with unread count
aria-expanded
Escape/outside-click close
keyboard-reachable notification items
```

- [ ] On notification click, mark read through the server action and navigate only to validated internal `href`.
- [ ] Verify desktop and mobile layouts; do not let the dropdown be clipped by the drawer/sidebar.

---

## Phase 6: Realtime Security Verification

**Files:**
- Migration from Phase 1
- `src/hooks/useNotifications.ts`
- E2E/browser verification notes

- [ ] Confirm `notifications` is in `supabase_realtime`.
- [ ] Confirm the browser client uses the authenticated Supabase session, not service-role credentials.
- [ ] Confirm Realtime receives a notification for the intended user.
- [ ] Confirm another logged-in user does not receive or read that notification.
- [ ] Confirm local `SKIP_AUTH=true` behavior degrades gracefully because it has no real Supabase browser session.
- [ ] Record any required remote Supabase dashboard/project setting changes in docs before deployment.

---

## Phase 7: Later Event Sources

### Legal Consultation Answered

**Files:**
- `src/lib/juridico/service.ts`
- `src/lib/juridico/repository.ts`
- `src/app/app/juridico/actions.ts`

- [ ] Align action authorization with the juridico layout before adding notifications. The layout excludes `secretaria`; actions should not allow a broader role set.
- [ ] Emit `legal_consultation.answered` only on transition to `respondida`.
- [ ] Decide recipient: likely `createdBy`, unless the domain requires `associateId` or another internal responsible.
- [ ] Do not include consultation body or sensitive text in logs.

### Official Letter Completed

**Files:**
- `src/lib/oficios/service.ts`
- `src/lib/oficios/repository.ts`
- `src/app/app/secretaria/oficios/actions.ts`

- [ ] Do not emit on PDF download.
- [ ] Treat creation as completion only if `gerado` means final issuance.
- [ ] If the workflow needs draft-to-generated, add an explicit transition first.
- [ ] Define recipient before implementation. Current table has `createdBy` and `updatedBy`, but no internal requester/responsible field.

---

## Validation Gates

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run test:db`
- [ ] `npm run test:e2e` once UI/activity flow is implemented
- [ ] Browser smoke: two users, one completes an activity, the creator sees the unread notification without reload, clicks it, and the count decreases.
- [ ] Security smoke: user B cannot list, mark, or receive user A's notifications.

---

## Recommended PR Split

1. **DB and core notifications**
   - Schema, migration, RLS, repository/service, event core, DB contract tests.

2. **Persist activity completion and emit event**
   - Activity update action, transaction, `activity.completed`, service tests.

3. **Notification bell without Realtime**
   - Server-action-backed initial load/read state, global bell, remove local associados stub.

4. **Realtime hardening**
   - Browser Supabase client, subscription, RLS verification, two-user browser test.

5. **Additional event sources**
   - `legal_consultation.answered` and official-letter event only after recipient semantics are settled.

