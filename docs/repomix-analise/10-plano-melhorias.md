# Plano de Melhorias — ASOF Intranet

> Gerado em: 2026-05-08

## Resumo Executivo

O projeto tem uma base coerente para MVP: Next.js 16 App Router, sessão JWT em cookie, Drizzle/libSQL, schema centralizado e documentação de domínio. O estado atual, porém, ainda mistura protótipo e produção no dashboard, tem autorização por role principalmente na UI, carece de rate limiting no login e possui cobertura de testes muito limitada para uma aplicação que manipula dados LGPD.

Referências Context7 usadas:

- Next.js 16: `proxy.ts` é a convenção atual; `middleware.ts` está depreciado. Cookies em Server Actions devem usar `cookies()` assíncrono e logout deve deletar sessão antes de redirecionar.
- Drizzle ORM: schemas SQLite devem declarar índices próximos aos padrões de consulta; queries e SQL fragments com `sql` preservam parametrização.
- Vitest 4: recomenda configuração explícita de ambientes/projetos, coverage e separação entre testes Node e browser/jsdom quando componentes React precisarem de DOM.

## 🔴 Prioridade Alta (Crítico — resolver em até 2 semanas)

### Implementar autorização server-side por role

- **Problema**: A sidebar oculta links administrativos para `secretaria`, mas não há evidência de guard server-side por role. Origem: `01-arquitetura.md`, `02-seguranca.md`.
- **Impacto**: Usuários podem acessar rotas/actions por URL direta quando elas forem implementadas.
- **Solução recomendada**: Criar `requireRole(allowedRoles)` baseado em `requireAuth()` e aplicar em páginas/actions de usuários, auditoria, configurações e mutações sensíveis.
- **Referência técnica**: Next.js App Router deve proteger dados no servidor; Proxy autentica a requisição, mas não substitui autorização por rota.
- **Esforço estimado**: M.

### Remover senha padrão do seed admin

- **Problema**: `scripts/seed-admin.ts` usa fallback `admin123`. Origem: `02-seguranca.md`.
- **Impacto**: Credencial previsível em ambiente compartilhado ou deploy acidental.
- **Solução recomendada**: Exigir `INITIAL_ADMIN_PASSWORD`, validar força mínima e falhar sem ela.
- **Referência técnica**: Boas práticas de bootstrap administrativo: nunca manter segredo padrão em código.
- **Esforço estimado**: P.

### Adicionar proteção contra brute force no login

- **Problema**: `login` não limita tentativas. Origem: `02-seguranca.md`.
- **Impacto**: Ataques de força bruta contra contas administrativas.
- **Solução recomendada**: Rate limiting por IP/email, backoff progressivo e log de tentativas falhas sem vazar existência de usuário.
- **Referência técnica**: Next.js Server Actions podem executar validação no servidor antes de criar sessão; cookies devem ser manipulados via `cookies()` assíncrono.
- **Esforço estimado**: M.

### Implementar ou remover o fluxo `/change-password`

- **Problema**: `proxy.ts` redireciona para `/change-password`, mas a rota não aparece no XML. Origem: `04-api-docs.md`, `06-arquitetura-docs.md`.
- **Impacto**: Usuário com `mustChangePassword=true` pode cair em rota inexistente.
- **Solução recomendada**: Implementar página/action de troca de senha ou remover temporariamente o redirecionamento e bloquear seed com `mustChangePassword` até existir fluxo.
- **Referência técnica**: Fluxos de sessão em Next.js devem deletar/atualizar cookie antes de redirecionar.
- **Esforço estimado**: M.

## 🟡 Prioridade Média (Importante — resolver em até 1 mês)

### Substituir mocks do dashboard por dados reais ou fixtures isoladas

- **Problema**: `src/app/app/page.tsx` mistura KPIs reais com kanban, alertas e regiões mockados. Origem: `01-arquitetura.md`, `03-performance.md`, `09-qualidade.md`.
- **Impacto**: Risco de leitura operacional incorreta e manutenção difícil.
- **Solução recomendada**: Criar `src/lib/dashboard/queries.ts`; mover mocks para fixtures de teste ou ocultar blocos sem fonte real.
- **Referência técnica**: Server Components podem buscar dados no servidor e renderizar payload mínimo.
- **Esforço estimado**: G.

### Validar query params e entradas externas com Zod

- **Problema**: `page` e `q` são tratados inline; seed faz casts diretos. Origem: `02-seguranca.md`, `08-testes.md`, `09-qualidade.md`.
- **Impacto**: Bugs com `NaN`, entradas inesperadas e importação inconsistente.
- **Solução recomendada**: Criar schemas Zod para login, filtros de associados e seed/importação.
- **Referência técnica**: Zod já está instalado; usar parse centralizado facilita testes.
- **Esforço estimado**: M.

### Melhorar índices e ordenação de consultas

- **Problema**: Listagem usa `limit`/`offset` sem `orderBy`; KPIs filtram campos sem índices dedicados. Origem: `03-performance.md`, `07-dependencias.md`.
- **Impacto**: Paginação instável e degradação conforme a base crescer.
- **Solução recomendada**: Adicionar `orderBy`; criar índices para `associationStatus`, `contributionStatus`, `activities.status`, `activities.dueDate` e composições confirmadas por uso real.
- **Referência Context7**: Drizzle recomenda declarar índices nos schemas SQLite e gerar SQL via Drizzle Kit.
- **Esforço estimado**: M.

### Criar testes de auth, sessão e proxy

- **Problema**: Cobertura atual é smoke + config de auth. Origem: `08-testes.md`.
- **Impacto**: Mudanças em login/sessão podem quebrar segurança sem detecção.
- **Solução recomendada**: Cobrir login, cookie/JWT, `requireAuth`, `proxy.ts` e futuro `requireRole`.
- **Referência Context7**: Vitest 4 suporta projetos/ambientes separados, coverage V8 e configuração explícita de include/exclude.
- **Esforço estimado**: M.

### Definir política LGPD para seleção/exportação/logs

- **Problema**: O schema contém CPF, SIAPE, telefone, endereço, email e notas internas. Origem: `02-seguranca.md`, `06-arquitetura-docs.md`.
- **Impacto**: Alto risco de vazamento acidental em futuras telas/exportações.
- **Solução recomendada**: DTOs por caso de uso, allowlist de colunas, logs redigidos e auditoria de exportações.
- **Referência técnica**: Minimização de dados e controle de acesso por finalidade.
- **Esforço estimado**: G.

## 🟢 Prioridade Baixa (Melhoria incremental — backlog)

### Renomear pacote e padronizar formatação

- **Problema**: `package.json` usa `tmp_app`; há inconsistência visual de aspas/formatação. Origem: `09-qualidade.md`.
- **Impacto**: Ruído em logs, artefatos e manutenção.
- **Solução recomendada**: Renomear para `asof-intranet`; adicionar scripts `format` e `format:check`.
- **Referência técnica**: Prettier já está instalado.
- **Esforço estimado**: P.

### Criar stubs ou remover links para rotas inexistentes

- **Problema**: Sidebar aponta para rotas que não aparecem implementadas no XML. Origem: `04-api-docs.md`, `09-qualidade.md`.
- **Impacto**: Navegação quebrada durante MVP.
- **Solução recomendada**: Criar páginas stub autenticadas com status claro ou ocultar links até implementação.
- **Referência técnica**: App Router facilita stubs por segmento.
- **Esforço estimado**: P.

### Adicionar testes de componentes e E2E mínimo

- **Problema**: Componentes de navegação/modal e fluxo autenticado não têm teste. Origem: `08-testes.md`.
- **Impacto**: Regressões visuais/funcionais passam despercebidas.
- **Solução recomendada**: Usar Vitest com jsdom/browser para componentes e Playwright para login -> dashboard -> associados.
- **Referência Context7**: Vitest 4 permite separar projeto Node e browser/jsdom.
- **Esforço estimado**: M.

### Avaliar busca full-text

- **Problema**: `LIKE '%q%'` não escala bem para busca de nomes. Origem: `03-performance.md`.
- **Impacto**: Lentidão conforme a base e campos pesquisáveis crescerem.
- **Solução recomendada**: Medir primeiro; depois avaliar FTS5/libSQL search para nome, lotação, email e SIAPE com controles LGPD.
- **Referência técnica**: Drizzle permite SQL parametrizado quando a API declarativa não cobrir o caso.
- **Esforço estimado**: G.

## Métricas de Sucesso

- Todas as rotas/actions administrativas usam guard server-side de role.
- Seed admin não funciona sem senha explícita e forte.
- Login tem rate limiting validado em teste.
- `/change-password` funciona para usuário com `mustChangePassword=true`.
- `npm run lint`, `npm run test` e `npm run build` passam no fluxo de CI/local.
- Cobertura inclui auth, sessão, proxy, parsing de filtros e queries principais.
- Nenhuma tela/exportação usa `select()` completo de `associates`.
- Dashboard não exibe dados mockados sem marcação explícita.
- Paginação de associados tem ordenação estável e parâmetros inválidos não geram offset inválido.
