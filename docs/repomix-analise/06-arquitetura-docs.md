# Documentação de Arquitetura

> Base: `repomix-output.xml` gerado em 2026-05-08.

## Visão de alto nível

A intranet ASOF é uma aplicação Next.js 16 com renderização no servidor e banco SQLite/libSQL. A aplicação oferece uma área autenticada para administração de associados e atividades internas.

Componentes principais:

- Browser acessa rotas App Router.
- `proxy.ts` intercepta rotas protegidas.
- Server Components chamam `requireAuth()` e consultam o banco.
- Server Actions executam mutações de sessão.
- Drizzle ORM acessa SQLite/libSQL.

Fluxo textual:

```text
Usuário -> Next.js Proxy -> App Router -> requireAuth -> Drizzle/libSQL -> SQLite
                       \-> redirect('/login') quando não autenticado
```

## Componentes

### Roteamento

- `/`: redireciona para `/app`.
- `/login`: autenticação.
- `/app`: dashboard autenticado.
- `/app/associados`: listagem autenticada de associados.

### Proxy de autenticação

`proxy.ts` protege:

- `/app/:path*`
- `/change-password`

Ele valida presença e assinatura do JWT, exige `isLoggedIn` e redireciona usuários com `mustChangePassword` para `/change-password`.

### Sessão

`src/lib/auth/session.ts` cria, lê, atualiza e destrói sessão com JWT assinado por `SESSION_SECRET`. O cookie é `httpOnly`, `sameSite: strict` e `secure` em produção.

### Autenticação server-side

`requireAuth()`:

1. Retorna usuário de desenvolvimento se `SKIP_AUTH=true`.
2. Lê sessão.
3. Busca admin no banco.
4. Rejeita usuário inexistente ou inativo.
5. Retorna dados autenticados atuais.

### Banco

Schemas:

- `admins`: usuários administrativos.
- `associates`: associados e dados funcionais.
- `activities`: atividades administrativas.
- `audit_logs`: auditoria planejada.

## Fluxos de dados

### Login

```text
Form /login
  -> login(formData)
  -> db.admins por email
  -> bcrypt.compare
  -> createSession
  -> Set-Cookie asof-session
  -> redirect /app
```

### Acesso a página autenticada

```text
GET /app/associados
  -> proxy valida JWT
  -> page chama requireAuth
  -> requireAuth valida admin ativo
  -> page consulta associates
  -> HTML renderizado no servidor
```

### Listagem de associados

```text
searchParams q/page
  -> filtro associationStatus='ativo'
  -> filtro opcional fullName LIKE
  -> select allowlist de campos
  -> count total
  -> tabela paginada
```

## Decisões de design

- Usar App Router e Server Components para reduzir estado client-side.
- Usar JWT próprio em cookie para evitar dependência inicial de provedor externo.
- Usar Drizzle para tipagem de schema e queries SQL-like.
- Usar SQLite/libSQL para MVP e portabilidade local.
- Manter `npm run dev` em Webpack por estabilidade nesta máquina.
- Usar `proxy.ts`, não `middleware.ts`, conforme Next.js 16.

## Restrições

- O app ainda é MVP: várias navegações estão desenhadas antes das rotas reais.
- A camada de autorização por role precisa sair da UI e ir para servidor.
- Dados sensíveis LGPD exigem política rigorosa de seleção, exportação e log.
- O uso de SQLite/libSQL é adequado ao estágio atual, mas índices e transações precisam acompanhar crescimento.
- O dashboard contém mocks e não deve ser tratado como painel operacional completo.

## Riscos de evolução

- Crescer páginas diretamente com `db` em componentes pode dificultar testes.
- Exportações futuras podem vazar campos sensíveis se reutilizarem `select()` completo.
- Ausência de auditoria efetiva para mutações pode ser problemática para administração associativa.
- Falta de rate limiting no login limita prontidão para produção pública.
