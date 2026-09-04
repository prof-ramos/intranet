<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# Authenticated Dashboard

Main app area after login — all routes require auth via `requireAuth()`/`requireRole()`.

## Purpose

Authenticated dashboard — main app area after login. All routes require auth via `requireAuth()`/`requireRole()`.

## Key Files

| File          | Purpose                       |
| ------------- | ----------------------------- |
| `error.tsx`   | Error boundary                |
| `layout.tsx`   | Dashboard layout with sidebar + WebMCP registry |
| `loading.tsx` | Loading state                 |
| `page.tsx`    | Redirects to atividades       |

## Subdirectories

| Directory        | Purpose                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_dashboard/`    | Shared dashboard components — DashboardActivitiesOverview, DashboardIndicators, DashboardSidebar                                                          |
| `associados/`    | Associates CRUD + relatorio/download                                                                                                                      |
| `atividades/`    | Activity kanban board, filters, preferences and creation flow (see `atividades/AGENTS.md`)                                                                |
| `config/`        | Admin config — auditoria, integrations, assignments and users (see `config/AGENTS.md`)                                                                    |
| `etiquetas/`     | Label generation UI and printable output                                                                                                                  |
| `financeiro/`    | Financial management — mensalidades/ (código retido; UI oculta na V2, issue #429)                                                                         |
| `email-triage/`  | Email triage — list/detail (código e crons retidos; UI oculta na V2, issue #429)                                                                          |
| `juridico/`      | Legal consultations — consultas/ ([id]/, nova/)                                                                                                           |
| `notifications/` | Notification center and actions                                                                                                                           |
| `privacidade/`   | Privacy policy page                                                                                                                                       |
| `search/`        | Global search page                                                                                                                                        |
| `secretaria/`    | Secretaria — email generation, mala direta and ofícios (`_components`, `[id]/editar`, `novo`)                                                             |

## For AI Agents

- Server Actions in `actions.ts` files co-located with pages
- Role-based access: `admin`, `diretoria`, `secretaria`
- E2E tests in `e2e/tests/` cover key flows — run `npm run test:e2e`

<!-- MANUAL: -->
