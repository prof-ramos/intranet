# Arquitetura

Atualizado em 2026-05-30 para incluir o módulo de triagem de e-mails.

## Visao Geral

A intranet ASOF e uma aplicacao Next.js 16 App Router, server-side, com Drizzle ORM e PostgreSQL gerenciado. O repo atual e a fonte canonica de dominio, schema e UI.

## Modulos De Dominio

- `src/app/app/associados` e `src/lib/associates`: associados, lotacao/posto, situacao funcional, situacao associativa e contribuicao.
- `src/app/app/atividades` e `src/lib/activities`: board administrativo, responsaveis, prioridades e prazos.
- `src/app/app/financeiro` e `src/lib/finance`: mensalidades e status de pagamento.
- `src/app/app/juridico` e `src/lib/juridico`: consultas, processos, notas e SLA.
- `src/app/app/secretaria/oficios` e `src/lib/oficios`: oficios, rich text e PDF.
- `src/app/app/notifications` e `src/lib/notifications`: alertas persistidos.
- `src/app/app/config`: usuarios, lotacoes, auditoria, API keys e webhooks outbound.
- `src/app/app/email-triage` e `src/lib/email-triage`: triagem automatica de e-mails com Gemini AI. Busca emails via Gmail API, analisa com IA, persiste resultado, notifica admins.

## Modulo Email Triage

### Fluxo
1. **Gmail API** — busca emails nao lidos de `controller@asof.org.br`
2. **Extracao** — HTML-to-text, decodificacao Base64, anexos
3. **Gemini AI** — classifica categoria, prazo, risco, acao recomendada
4. **Persistencia** — salva em `email_triagens` com audit trail
5. **Correlacao** — cria notas juridicas automaticas quando aplicavel
6. **Labeling** — marca email como triado no Gmail

### Componentes
- `src/lib/email-triage/schema.ts` — Zod schemas e tipos
- `src/lib/email-triage/status.ts` — labels, badges, filtros (13 status)
- `src/lib/email-triage/search-params.ts` — parser de filtros da UI
- `src/lib/email-triage/repository.ts` — queries e mutations do banco
- `src/lib/email-triage/pipeline.ts` — orchestrador do fluxo
- `src/lib/email-triage/gmail.ts` — cliente Gmail API (raw fetch)
- `src/lib/email-triage/analyzer.ts` — PII redaction, HTML-to-text, Gemini analysis
- `src/app/app/email-triage/page.tsx` — list page com filtros e KPIs
- `src/app/app/email-triage/[id]/page.tsx` — detail page com validacao
- `src/app/app/email-triage/actions.ts` — server actions (admin only)
- `src/app/api/v1/email-triage/process/route.ts` — API endpoint (cron)

### Status
| Status | Descricao |
|--------|-----------|
| `novo` | Recem-chegado, nao processado |
| `analisado` | Processado pela IA, sem validacao pendente |
| `aguardando_validacao` | IA sugere validacao humana |
| `validado` | Validado por admin |
| `em_andamento` | Sendo trabalhado |
| `concluido` | Finalizado |
| `vencido` | Prazo expirado (automatizado) |
| `arquivado` | Arquivado |
| `erro_validacao_ia` | Falha na validacao da IA |
| `erro_processamento_anexo` | Falha no processamento |
| `aguardando_reprocessamento` | Aguardando nova tentativa |
| `descartado_por_irrelevancia` | Marcado como irrelevante |
| `pendente_validacao_lgpd` | Pendente de revisao LGPD |

### Regras de Negocio
- Todos veem a list page (`requireAuth()`)
- Só `admin` altera status, observações e prazos (`requireRole(['admin'])`)
- `vencido` é automático: `processBatch()` marca emails com prazo expirado
- Notificação: admins notificados quando `exige_validacao_humana = true`

## Banco

- Schema Drizzle: `src/lib/db/schema`.
- Baseline limpo: `drizzle/postgres/0000_green_glorian.sql`.
- Runtime: `DATABASE_URL`.
- Migrations: `DATABASE_MIGRATION_URL`.
- Guardrail: `scripts/guarded-migrate.ts`.
- Email triage migration: `drizzle/postgres/0007_email_triage_mvp.sql`.

O baseline nao depende de roles, policies, publications ou recursos de plataforma externa. RLS pode voltar depois como hardening, mas nao bloqueia a estreia.

## Autenticacao

- Login valida `admins.email` + `admins.password_hash` com `bcryptjs`.
- Sessao usa cookie `httpOnly` assinado por `SESSION_SECRET`.
- `requireAuth()` revalida o admin no banco.
- `requireRole()` controla autorizacao por `admin`, `diretoria` e `secretaria`.
- `SKIP_AUTH=true` existe apenas para desenvolvimento e e ignorado em producao.

## Notificacoes

Notificacoes sao registros persistidos. O cliente carrega via Server Actions e atualiza periodicamente. Entrega em tempo real nao faz parte do caminho critico do go-live.

O tipo `email_triage_pending` notifica admins quando uma triagem exige validacao humana.

## Documentos E Storage

Metadados de documentos permanecem no PostgreSQL. Arquivos fisicos devem usar storage de objetos privado quando o modulo for ativado operacionalmente. O provedor ainda nao e parte do baseline.

## LGPD

- Dados sensiveis passam por mascaramento, criptografia e indices cegos onde aplicavel.
- Logs devem usar `src/lib/logger.ts` e `src/lib/sanitize-pii.ts`.
- Senhas temporarias, cookies, tokens e segredos nunca devem ser persistidos em logs ou auditoria.
- Email triage: PII (remetente, destinatário) sanitizado em logs via `sanitizePiiValue()`.

## Deploy

1. Provisionar PostgreSQL gerenciado novo.
2. Configurar envs obrigatorias.
3. Aplicar baseline com snapshot/backup e janela aprovada.
4. Rodar seed inicial.
5. Validar gates e smoke manual.
6. Configurar credenciais Gmail (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN).
7. Configurar GEMINI_API_KEY para analysis.

Detalhes operacionais ficam em `docs/runbook.md`; pendencias ficam em `TODO-PROD.md`.
