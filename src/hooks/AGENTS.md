<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-06 -->

# Hooks

Shared React hooks.

## Key Files

- `notifications-normalize.ts` — notification data normalization (with test)
- `use-notifications.ts` — polling hook for persisted notifications (consumed by NotificationBell in the authenticated layout)
- `use-escape-key.ts` — hook for closing overlays/modals on Escape

## For AI Agents

- Hooks follow React 19 patterns
- Tests in `.test.ts` files
- Keep browser subscriptions and timers cleaned up; notification polling must not multiply across renders

<!-- MANUAL: -->
