# src/app/login — Rota pública de autenticação

Rota pública (`/login`). Processa o formulário de login contra a tabela `admins` no PostgreSQL via bcrypt + sessão criptografada com `iron-session`.

## Arquivos

- `page.tsx` — Server Component; redireciona para `/app` se já autenticado.
- `actions.ts` — Server Action `login(formData)`: valida credenciais, aplica rate-limit (`login_attempts`), cria sessão. **Não retorna mensagens de erro detalhadas** (evita enumeração de usuários).

## Regras críticas

- Rate-limit é baseado em IP + email; não alterar sem atualizar `src/lib/auth/login-rate-limit.ts` e seu schema `login_attempts`.
- Nunca expor qual campo está errado (email ou senha) nas mensagens de erro.
- Após login bem-sucedido, verificar `mustChangePassword`: se `true`, redirecionar para `/change-password` antes de `/app`.
- Não adicionar OAuth ou providers externos sem rever toda a lógica de sessão em `src/lib/auth/session.ts`.
