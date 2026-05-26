<!-- Parent: ../../../AGENTS.md -->

# Authenticated Dashboard

Main app area after login — all routes require auth via `requireAuth()`/`requireRole()`.

## Purpose

Authenticated dashboard — main app area after login. All routes require auth via `requireAuth()`/`requireRole()`.

## Key Files

| File | Purpose |
|------|---------|
| `error.tsx` | Error boundary |
| `layout.tsx` | Dashboard layout with sidebar |
| `loading.tsx` | Loading state |
| `page.tsx` | Redirects to atividades |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `_dashboard/` | Shared dashboard components — DashboardActivitiesOverview, DashboardIndicators, DashboardSidebar |
| `associados/` | Associates CRUD + relatorio/download |
| `atividades/` | Activity kanban board — `_board/` (ActivityCard, Drawer, FilterBar, QuickAdd, SummaryStrip), `nova/` (AssigneePicker, AssociatePicker, NovaAtividadeForm) |
| `config/` | Admin config — auditoria, integracoes/ (api-keys, ia, webhooks), lotacoes, usuarios |
| `financeiro/` | Financial management — mensalidades/ (FinanceKPis, MonthlyPaymentsTable, actions) |
| `juridico/` | Legal consultations — consultas/ ([id]/, nova/) |
| `notifications/` | Notification center and actions |
| `privacidade/` | Privacy policy page |
| `search/` | Global search page |
| `secretaria/` | Secretaria — documentos/, emails/gerar, oficios/ (_components, [id]/editar, novo/) |

## For AI Agents

- Server Actions in `actions.ts` files co-located with pages
- Role-based access: `admin`, `diretoria`, `secretaria`
- E2E tests in `e2e/tests/` cover key flows — run `npm run test:e2e`