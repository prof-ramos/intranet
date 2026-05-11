# src/app/app/usuarios — Gestão de Usuários Administrativos

Gerenciamento dos usuários do sistema (tabela `admins`). Rota: `/app/usuarios`. Acesso exclusivo para `admin`.

## Arquivos

- `page.tsx` — Server Component; lista todos os admins com nome, e-mail, role, status e badge `mustChangePassword`.
- `actions.ts` — Server Actions: `resetUserPassword`, `toggleUserActive`.
- `UserActionsPanel.tsx` — Client Component com confirmação inline antes de ações destrutivas.

## Regras críticas

- `resetUserPassword`: gera senha temporária via `crypto.randomBytes` (nunca `Math.random`), aplica `bcrypt` com cost ≥ 12, seta `mustChangePassword = true`. Exibe a senha **uma única vez** na UI; não salvar em texto plano nem em logs.
- `toggleUserActive`: admin não pode desativar a própria conta (`targetId === actor.userId` → retornar erro).
- Admin não pode resetar a própria senha por esta rota; usar `/change-password`.
- Roles disponíveis: `admin`, `diretoria`, `secretaria` (definidos em `adminRole` enum no schema).
- Ao adicionar novos usuários, usar o script `scripts/seed-admin.ts` ou criar Server Action `createUser` seguindo o mesmo padrão de bcrypt + `mustChangePassword: true`.

## Schema (`admins`)

Campos relevantes: `id`, `name`, `email`, `password_hash`, `role`, `is_active`, `must_change_password`, `created_at`, `updated_at`.
