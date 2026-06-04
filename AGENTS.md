<!-- Generated: 2026-05-26 | Updated: 2026-05-26 -->
<!-- Parent: none (root) -->

# ASOF Intranet — AI Agent Directory

## Purpose

Next.js 16 App Router application for ASOF (associação) internal management — associates, activities (kanban), juridico/consultas, financeiro/mensalidades, oficios, notifications, audit, LGPD compliance. Drizzle ORM + Neon Postgres, Playwright e2e, Vitest unit+integration, Server Actions, self-hosted auth with cookie sessions.

## Key Files

| File | Description |
|------|-------------|
| `CLAUDE.md` | Project instructions for AI agents (read FIRST) |
| `AGENTS.md` | This file — AI agent directory navigation |
| `CONTEXT.md` | Glossary, domain rules, institutional context |
| `TODO-PROD.md` | Go-live checklist and production readiness |
| `package.json` | Dependencies and scripts (dev, build, test, e2e, typecheck, lint, migrate) |
| `next.config.ts` | Next.js 16.2.6 config |
| `drizzle.config.ts` | Drizzle Kit with Neon Postgres |
| `vercel.json` | Vercel deployment config |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | Application source (pages, components, lib, hooks) — see `src/AGENTS.md` |
| `docs/` | ADRs, design docs, runbooks, compliance — see `docs/AGENTS.md` |
| `scripts/` | DB scripts, seed, migrations, PII encryption — see `scripts/AGENTS.md` |
| `e2e/` | Playwright end-to-end tests — see `e2e/AGENTS.md` |
| `drizzle/` | SQL migrations and schema snapshots — see `drizzle/AGENTS.md` |
| `.github/` | CI/CD workflows, branch rules, PR template — see `.github/AGENTS.md` |

---

<!-- BEGIN:nextjs-agent-rules -->

# Contexto Institucional

A ASOF (Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro) é uma associação civil sem fins lucrativos fundada em 1991, com ~763 associados. Representa a carreira de Oficial de Chancelaria do Ministério das Relações Exteriores (Itamaraty/MRE) — servidores de nível superior responsáveis pela gestão administrativa da política externa brasileira.

## Vocabulário do domínio → campos do banco

| Termo                    | Significado                                                                           | Campo DB             |
| ------------------------ | ------------------------------------------------------------------------------------- | -------------------- |
| **Lotação**              | Posto ou órgão onde o servidor está em exercício (ex: "Embaixada em Paris", "SERE")   | `assignment`         |
| **Posto**                | Representação diplomática no exterior (embaixada, consulado) ou a SERE em Brasília    | `assignment`         |
| **Padrão / Classe**      | Nível na carreira: Classe A → B → C → Especial, cada uma com 5 padrões                | `classPattern`       |
| **Situação associativa** | Status do associado na ASOF: `ativo`, `inativo`                                       | `associationStatus`  |
| **Situação funcional**   | Status no serviço público: `ativo`, `aposentado`, `cedido`, `em_licenca`              | `functionalStatus`   |
| **SIAPE**                | Número de matrícula do servidor federal                                               | `siape`              |
| **Contribuição**         | Status de pagamento da anuidade ASOF: `em_dia`, `inadimplente`, `pendente_migracao`   | `contributionStatus` |
| **Mensalidade**          | Registro mensal de pagamento de associado                                             | `monthly_payments`   |
| **Ofício**               | Documento oficial gerado pelo sistema                                                 | `oficios`            |
| **Método de pagamento**  | Forma de quitação da mensalidade: `folha`, `boleto`, `pix`, `transferencia`, `outros` | `paymentMethod`      |
| **Status de pagamento**  | Situação da mensalidade: `pago`, `pendente`, `atrasado`, `isento`, `cancelado`        | `paymentStatus`      |

## Roles do sistema

| Role DB      | Quem é                                                     |
| ------------ | ---------------------------------------------------------- |
| `admin`      | Coordenador administrativo da ASOF (equipe interna)        |
| `diretoria`  | Membros da Diretoria Executiva (presidente, VP, diretores) |
| `secretaria` | Auxiliar administrativo / secretaria                       |

## Contexto geográfico

Associados servem na SERE (Brasília) ou em ~220 postos no exterior. Cerca de 63% estão no exterior. O campo `locationCountry` / `locationCity` indica onde o servidor está lotado. Remoções ocorrem a cada 2–5 anos.

## Dados sensíveis

CPF, SIAPE, email, endereço e dados funcionais são informações protegidas pela LGPD. Não expor em logs, respostas de API públicas ou mensagens de erro.

Em auditorias de segurança, documentar falsos positivos relevantes para evitar redescoberta em rodadas futuras.

Os campos `assigneeName`/`associateName` em `BoardActivity` são fallbacks de renderização otimista (usados antes de o mapa `peopleById` ser atualizado); não são a fonte canônica de nomes. O mapa `peopleById` é autoritativo. Não remover esses campos sob o argumento de desnormalização de PII.

<!-- END:nextjs-agent-rules -->

---

## Convensões de Desenvolvimento

### Tooling

- Use `npm` para este projeto; tem `package-lock.json`.
- Para Python, use `uv`: `uv run`, `uv add`, `uv sync`.
- Use Context7 automaticamente para queries sobre bibliotecas/frameworks/APIs externas. Não confie no conhecimento de treinamento.

### Banco de dados

- Neon Postgres (`intranet-db`, `ep-empty-cake-ac26vl6w`, sa-east-1).
- Pooled (`DATABASE_URL`) para runtime, direct (`DATABASE_MIGRATION_URL`) para migrations.
- Conexão: `max: 10`, `max_lifetime: 1800`, `statement_timeout: 30000`, `application_name: 'asof-intranet'`.
- Multi-tabela: sempre `db.transaction()`.
- Enums para todos os campos de status/tipo; nunca `text`.
- Indexes: parciais para `WHERE` condicionais, GIN trigram para `LIKE '%term%'`, compostos `(filter, order)`. Prefixo `idx_` nos custom.
- Migrations: nomear com zero-padding + descrição (e.g. `0009_quality_improvements.sql`). Atualizar `meta/_journal.json`.
- Não usar `Record<string, unknown>` em funções de update; usar interfaces tipadas.
- Para referência completa de tabelas, enums, índices e migrações, veja [`DATABASE.md`](./DATABASE.md).

### Auth

- Server-side própria: `SESSION_SECRET`, `admins.password_hash`, cookie `httpOnly` assinado.
- `requireAuth()` / `requireRole()` para proteção de rotas.
- Dev local: `SKIP_AUTH=true` + `DEV_USER_ID`, `DEV_USER_ROLE` em `.env.local`.

### PII e LGPD

- Usuários autenticados da intranet têm visibilidade operacional integral de PII; não reintroduzir máscara por role sem nova decisão de produto.
- Preferir `encryptPii()` para novas rotas de escrita e `piiBlindIndex()` para busca quando a camada suportar; dados plaintext legados/importados são risco operacional aceito e devem ser tratados com controle de acesso ao Neon, auditoria e backups protegidos.
- `sanitizePii()` para logs — plaintext nunca em logs, erros ou respostas de API.
- Ver ADR 006 para desfiação/anonimização.

### Testing

- Unitários: Vitest, `src/**/*.test.{ts,tsx}`.
- Integração: `vitest.integration.config.ts` contra PostgreSQL real.
- E2E: Playwright, `http://127.0.0.1:3001` (não 3000), database `asof_test` criado por `e2e/global-setup.ts`.
- `npm run test:db` — schema contract contra PostgreSQL ao vivo.
- `npm run test:e2e` nunca contra `http://localhost:3000`; apontar para `3001` com `NEXT_E2E=1`.

### Gotchas

- Next.js `16.2.6` — não fazer downgrade. Verificar `node_modules/next/dist/docs/` antes de mudar APIs.
- `next.config.ts` fixa `turbopack.root` para evitar resolução de Tailwind pelo diretório pai.
- Dev server pesado em 8 GB RAM: usar `scripts/run-dev-60s.sh` para diagnósticos.
- Após mudanças em dependências, Next ou Tailwind: rodar `lint` + `typecheck` + `test` + `build`.

### Documentação

| Documento | Conteúdo |
|-----------|----------|
| `CONTEXT.md` | Glossário e regras de negócio |
| `README.md` | Quick start |
| `TODO-PROD.md` | Checklist de go-live |
| `docs/runbook.md` | Runbook operacional |
| `docs/adr/` | ADRs 001-012 |
| `API.md` | Superfície HTTP pública |
| `PAGES.md` | Páginas e funcionalidades |
| `ARCHITECTURE.md` | Diagrama, deployment, glossário |
| `DESIGN.md` | Design system |
| `CONTRIBUTING.md` | Convenções de contribuição |
