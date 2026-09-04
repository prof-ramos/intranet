<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# Components

Shared React UI components used across the app.

## Key Files

- `GlobalSearch.tsx` — global search component
- `EmptyState.tsx` — standardized empty-result presentation
- `ErrorBoundary.tsx` — reusable client error boundary
- `LogoutButton.tsx` — logout button component
- `NavGroup.tsx` — navigation group with label and links
- `NavLink.tsx` — navigation link with active state
- `NotificationBell.tsx` — notification bell (with test)
- `NotificationInboxWrapper.tsx` (client boundary), `NotificationInbox.tsx`, `NotificationInboxSkeleton.tsx` — notification center UI
- `PageHeader.tsx` — shared page heading and action layout
- `Sidebar.tsx` — main sidebar navigation component

## Structure

- Flat shared UI at this root
- `auth/` — shared authentication shells, fields and submit controls
- `ui/` — reusable form controls, alerts and KPI presentation
- `webmcp/` — `WebMcpRegistry` / wrapper (progressive enhancement; tools só em `/app`)

## For AI Agents

- Components use Tailwind CSS and DaisyUI, not CSS modules
- Test files are colocated with `.test.ts` or `.test.tsx` suffix
- Preserve accessible names, keyboard behavior and server/client boundaries when extracting shared UI

<!-- MANUAL: -->
