<!-- Parent: ../../AGENTS.md -->

# Components

Shared React UI components used across the app.

## Key Files

- `GlobalSearch.tsx` — global search component
- `LogoutButton.tsx` — logout button component
- `NavGroup.tsx` — navigation group with label and links
- `NavLink.tsx` — navigation link with active state
- `NotificationBell.tsx` — legacy in-app bell (with test; not mounted in layout; Novu inbox used when configured)
- `Sidebar.tsx` — main sidebar navigation component

## Structure

- Flat shared UI at this root
- `webmcp/` — `WebMcpRegistry` / wrapper (progressive enhancement; tools só em `/app`)

## For AI Agents

- Components use Tailwind CSS and DaisyUI, not CSS modules
- Test files co-located with `.test.ts` suffix
