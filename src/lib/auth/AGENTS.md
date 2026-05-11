# src/lib/auth — Autenticação e Autorização

Núcleo de segurança da aplicação. Todos os arquivos aqui têm cobertura de testes obrigatória.

## Arquivos

| Arquivo | Função |
|---|---|
| `config.ts` | Tipos `AuthUser`, `SessionData`, roles, `SESSION_COOKIE_NAME`, lógica de dev bypass (`SKIP_AUTH`) |
| `session.ts` | Criação, leitura e atualização da sessão `iron-session` criptografada (`SESSION_SECRET`) |
| `require-auth.ts` | `requireAuth()` — lança redirect para `/login` se não autenticado; retorna `AuthUser` |
| `authorization.ts` | `requireRole(roles[])` — chama `requireAuth()` e verifica role; redireciona para `/app` se não autorizado |
| `password.ts` | `validateNewPassword()` — regras: ≥12 chars, maiúscula, minúscula, número, símbolo |
| `login-rate-limit.ts` | Rate-limit baseado em IP+email usando tabela `login_attempts` no PostgreSQL |
| `actions.ts` | Re-exportação pública das actions de auth (ex: `logout`) |

## Regras críticas

- `SESSION_SECRET` deve ter ≥ 32 chars; nunca hardcoded — lido de `env.SESSION_SECRET`.
- O cookie de sessão usa `__Host-` prefix (`__Host-asof-session`): exige `Secure`, `Path=/`, sem `Domain`. Não remover esse prefix.
- `SKIP_AUTH=true` só funciona em `NODE_ENV !== 'production'`. Nunca contornar essa verificação.
- `requireAuth()` e `requireRole()` devem ser chamados no topo de toda Server Action ou Server Component que acesse dados protegidos.
- Não adicionar providers de autenticação externos sem rever a estrutura de `SessionData` e o schema `admins`.
