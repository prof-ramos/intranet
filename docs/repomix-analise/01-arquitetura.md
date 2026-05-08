# Revisão de Arquitetura

> Base: `repomix-output.xml` gerado em 2026-05-08.

## Visão geral

O projeto é uma intranet em Next.js 16 App Router, com área autenticada em `src/app/app`, login em `src/app/login`, UI compartilhada em `src/components`, autenticação própria em `src/lib/auth` e persistência SQLite/libSQL via Drizzle em `src/lib/db`. A arquitetura é simples e adequada ao estágio atual: poucas rotas, Server Components para páginas de dados, Server Actions para login/logout e `proxy.ts` para proteção de rotas.

## Pontos fortes

- A separação por camadas está clara: `src/lib/auth` concentra sessão, roles e bypass local; `src/lib/db/schema` concentra o modelo Drizzle; `src/components` guarda chrome de navegação reutilizável.
- O uso de Server Components em `src/app/app/page.tsx` e `src/app/app/associados/page.tsx` reduz código client-side e mantém consultas no servidor.
- `proxy.ts` já segue a convenção do Next.js 16, substituindo `middleware.ts`, e usa `matcher` para proteger `/app/:path*` e `/change-password`.
- O domínio ASOF está documentado em `AGENTS.md`, `README.md`, `ARCHITECTURE.md` e `docs/PRD.md`, o que reduz ambiguidade entre termos como lotação, posto, SIAPE e situação associativa.

## Problemas arquiteturais

### Dashboard mistura protótipo e produção

`src/app/app/page.tsx` combina consultas reais (`getStripe`) com grandes estruturas `mockKanban`, `mockAlerts` e `mockRegioes`. Isso torna difícil saber quais partes refletem dados oficiais e quais são placeholders. Para uma intranet com dados sensíveis, mocks dentro de uma rota autenticada de produção aumentam risco de decisão operacional errada.

Recomendação: extrair um módulo de serviço para dados reais do dashboard e isolar mocks em fixtures de teste ou stories. Enquanto não houver backend, marcar explicitamente a UI como protótipo ou ocultar blocos sem fonte real.

### Autorização por role ainda está na UI

`src/components/Sidebar.tsx` esconde links de `usuarios` e `auditoria` quando `user.role === 'secretaria'`, mas a revisão do XML não mostra rotas implementadas com checagem server-side equivalente. A regra visual ajuda usabilidade, mas não é uma fronteira de segurança.

Recomendação: criar helpers como `requireRole(['admin', 'diretoria'])` e aplicá-los nas páginas/actions protegidas, além de manter a navegação condicional.

### Modelo de domínio parcial

O schema atual cobre `admins`, `associates`, `activities` e `audit_logs`, mas há telas apontando para recursos ainda não implementados (`/app/atividades`, `/app/usuarios`, `/app/auditoria`, `/app/config`). Isso é normal em MVP, mas as rotas planejadas deveriam ter contratos mínimos para evitar divergência entre UI, schema e permissões.

Recomendação: criar uma matriz `rota -> fonte de dados -> roles -> status` no guia de arquitetura ou transformar links não implementados em páginas stub protegidas.

### Acesso ao banco é global e direto

As páginas importam `db` e schemas diretamente. Em um app pequeno isso é aceitável, mas a lógica de consultas já começa a se repetir e misturar com renderização.

Recomendação: introduzir repositórios ou funções de consulta por domínio apenas quando houver segunda rota usando as mesmas regras. Exemplos iniciais: `getAssociatesPage`, `getDashboardStats`, `getCurrentAdmin`.

## Melhorias de escalabilidade

- Definir índices adicionais para filtros frequentes: `associationStatus`, `contributionStatus`, `activities.status`, `activities.dueDate` e combinações usadas nos KPIs.
- Separar dados sensíveis dos campos exibidos por padrão. A página de associados já seleciona colunas específicas, mas o modelo contém CPF, SIAPE, endereço e notas internas; futuras APIs devem manter allowlists.
- Padronizar validação de entrada com Zod em Server Actions e filtros de página. Hoje `q` e `page` são tratados inline em `src/app/app/associados/page.tsx`.
- Criar uma camada de autorização server-side antes de expandir rotas administrativas.

## Áreas que seguem boas práticas

- `requireAuth` usa `cache()` para evitar múltiplas consultas ao usuário no mesmo render.
- `session.ts` define cookie `httpOnly`, `sameSite: 'strict'` e `secure` em produção.
- `login` executa `bcrypt.compare` com hash dummy para reduzir enumeração temporal de usuário.
- Drizzle está com schemas tipados e migrações geradas em `drizzle/`.
- `next.config.ts` fixa `turbopack.root`, decisão relevante para o histórico de resolução incorreta de Tailwind neste workspace.
