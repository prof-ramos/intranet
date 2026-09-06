<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-06 -->

# Components

Shared React UI components used across the app.

## Key Files

- `GlobalSearch.tsx` — global search component
- `ErrorBoundary.tsx` — reusable client error boundary
- `LogoutButton.tsx` — logout button component
- `NavGroup.tsx` — navigation group with label and links
- `NavLink.tsx` — navigation link with active state
- `NotificationBell.tsx` — UI in-app vigente do sino (com teste)
- `NotificationBellTrigger.tsx` — botão compartilhado (casca, loading e painel)
- `NotificationBellWrapper.tsx` — carrega o Bell só ao abrir o painel (evita actions no grafo de toda página `/app`)
- `NotificationInboxWrapper.tsx`, `NotificationInbox.tsx`, `NotificationInboxSkeleton.tsx` — residual Novu; **não montados** no layout
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
- Do not remount `NotificationInboxWrapper` in the authenticated layout without a new product decision

<!-- MANUAL: -->
