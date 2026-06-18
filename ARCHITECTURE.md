# Arquitetura

Atualizado em 2026-06-14 para refletir refatoração de atividades, bulk upsert de mensalidades, validação de server actions e correções de segurança.

## Visao Geral

A intranet ASOF e uma aplicacao Next.js 16.2.6 App Router, server-side, com Drizzle ORM e PostgreSQL gerenciado (Neon). O repo atual e a fonte canonica de dominio, schema e UI.

## Modulos De Dominio

- `src/app/app/associados` e `src/lib/associates`: Cadastro de Oficiais, lotacao/posto, situacao funcional, vínculo ASOF e contribuicao. A rota permanece `/app/associados` por compatibilidade historica.
- `src/app/app/atividades` e `src/lib/activities`: board administrativo, responsaveis, prioridades e prazos. Lógica de conclusão extraída para `deriveCompletedAt()` em `transformations.ts`; labels consolidados via `ACTIVITY_PRIORITY_LABELS` em `status.ts`.
- `src/app/app/financeiro` e `src/lib/finance`: mensalidades e status de pagamento. Inicialização de mês usa bulk upsert (`ON CONFLICT DO UPDATE`) ao invés de inserts individuais.
- `src/app/app/juridico` e `src/lib/juridico`: consultas, processos, notas e SLA.
- `src/app/app/secretaria/oficios` e `src/lib/oficios`: oficios, rich text, PDF e assinatura digital via Assinafy.
- `src/app/app/notifications` e `src/lib/notifications`: alertas persistidos.
- `src/app/app/config`: usuarios, lotacoes, auditoria, API keys e webhooks outbound.
- `src/app/app/email-triage` e `src/lib/email-triage`: triagem automatica de e-mails com Gemini AI. Busca emails via Gmail API, analisa com IA, persiste resultado operacional, correlaciona consultas abertas quando seguro e notifica admins.
- `src/lib/assinafy`: cliente Assinafy, webhook handler, repository e service para assinatura digital de ofícios.

## Modulo Email Triage

### Fluxo
1. **Gmail API** — busca emails nao lidos de `controller@asof.org.br`
2. **Extracao** — HTML-to-text, decodificacao Base64, anexos
3. **Gemini AI** — classifica categoria, extrai prazos, resume demandas e organiza evidencias operacionais
4. **Persistencia** — salva em `email_triagens` com audit trail
5. **Correlacao** — cria nota operacional automatica apenas quando houver exatamente uma consulta aberta vinculada ao associado remetente
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
| `aguardando_validacao` | Triagem exige revisao operacional excepcional |
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

---

## Modulo Assinafy (Assinatura Digital)

### Fluxo
1. **Envio para Assinatura** — Admin seleciona ofício (status `gerado` ou `rascunho`), informa email do signatário
2. **Geração PDF** — PDF gerado on-the-fly com fontes Carlito (ABNT) e embutimento completo
3. **Upload Assinafy** — Documento enviado via API Assinafy (`uploadDocument`)
4. **Criação Signatário** — Signatário criado/recuperado via `createSigner` (fallback silencioso para emails existentes)
5. **Assignment** — Solicitação de assinatura criada com `expires_at` 30 dias
6. **Persistência** — `assinafy_signing_url`, `assinafyDocumentId`, `assinafyAssignmentId`, `assinafySignerId` salvos em transação
7. **Webhook** — Assinafy envia callbacks para `/api/webhooks/assinafy` (eventos: `document_signed`, `signer_signed_document`, `document_rejected`, etc.)
8. **Processamento Webhook** — Dentro de transação: atualiza ofício, loga auditoria, emite domain event, notifica admins

### Componentes
- `src/lib/assinafy/client.ts` — Cliente HTTP com extração defensiva de payload e recuperação de signatários
- `src/lib/assinafy/types.ts` — Enums `AssinafyDocumentStatus` (11 estados), tipos de webhook
- `src/lib/assinafy/repository.ts` — `findOficioByAssinafyDocumentId`, `updateAssinafyStatus`, `updateAssinafyFields`
- `src/lib/assinafy/service.ts` — `handleWebhookEvent` (processamento transacional), `sendForSignature` (orquestração envio)
- `src/app/api/webhooks/assinafy/route.ts` — Endpoint público para webhooks Assinafy
- `src/app/app/secretaria/oficios/_components/SendForSignatureModal.tsx` — Modal de envio
- `src/app/app/secretaria/oficios/_components/OficiosTable.tsx` — Botão "Enviar para Assinatura" + badge "Abrir página de assinatura"

### Status Assinafy (enum `assinafy_document_status`)
| Status | Descricao |
|--------|-----------|
| `pending` | Aguardando processamento |
| `uploaded` | Documento carregado |
| `pending_signature` | Aguardando assinatura |
| `partially_signed` | Parcialmente assinado |
| `signed` | Assinado |
| `rejected` | Rejeitado |
| `expired` | Expirado |
| `cancelled` | Cancelado |
| `failed` | Falha |
| `certificated` | Certificado |
| `ready` | Pronto |

### Regras de Negocio
- Apenas ofícios com status `gerado` ou `rascunho` podem ser enviados
- `rascunho` transiciona automaticamente para `gerado` ao enviar
- Guarda de idempotência: `assinafyDocumentId === null` antes de qualquer chamada API
- Guarda "Assinafy não configurado": verifica env vars antes de chamadas
- Webhook é idempotente: mesmo status = early return
- Notificação criada para todos admins ativos dentro da mesma transação
- `assinafy_signing_url` persistida para badge "Abrir página de assinatura" (target=_blank)

### Regras de Negocio
- Todos veem a list page (`requireAuth()`)
- Só `admin` altera status, observações e prazos (`requireRole(['admin'])`)
- `vencido` é automático: `processBatch()` marca emails com prazo expirado.
- `exige_validacao_humana` significa revisao operacional excepcional, nao validacao juridica de merito.
- Conteudo juridico, prazo, risco alto/critico ou confianca baixa/media nao obrigam revisao humana por si so.
- Notificação: admins notificados quando `exige_validacao_humana = true`.
- A IA nao recomenda tese, resposta juridica, arquivamento, conclusao, responsavel juridico ou decisao de merito.

## Banco

- Schema Drizzle: `src/lib/db/schema`.
- Baseline limpo: `drizzle/postgres/0000_green_glorian.sql`.
- Runtime: `DATABASE_URL`.
- Migrations: `DATABASE_MIGRATION_URL`.
- Guardrail: `scripts/guarded-migrate.ts`.
- Email triage migrations: `drizzle/postgres/0007_email_triage_mvp.sql`, `drizzle/postgres/0009_email_triage_notifications.sql` e `drizzle/postgres/0010_relax_email_triage_operational_review.sql`.
- A migration `0010` remove as constraints antigas que obrigavam validacao humana para `juridico`, risco `alto`/`critico` ou confianca diferente de `alta`; permanecem os checks anti-alucinacao de prazo e evidencia.
- Assinafy migrations: `drizzle/postgres/0006_add_assinafy_signing_url.sql`, `drizzle/postgres/0017_expand_domain_events_and_assinafy.sql` (webhook handling), `drizzle/postgres/0018_add_oficio_notification_types.sql` (notification enums), `drizzle/postgres/0019_add_recipient_address_fields.sql`.
- Notification enums: `notification_type` inclui `oficio.status_changed`, `notification_entity_type` inclui `oficio`.

O baseline nao depende de roles, policies, publications ou recursos de plataforma externa. RLS pode voltar depois como hardening, mas nao bloqueia a estreia.

> Para referência completa de tabelas, enums, índices, migrações e convenções, veja [`DATABASE.md`](./DATABASE.md).

## Autenticacao

- Login valida `admins.email` + `admins.password_hash` com `bcryptjs`.
- Sessao usa cookie `httpOnly` assinado por `SESSION_SECRET`.
- `requireAuth()` revalida o admin no banco.
- `requireRole()` controla autorizacao por `admin`, `diretoria` e `secretaria`.
- `SKIP_AUTH=true` existe apenas para desenvolvimento e e ignorado em producao.

## Server Actions

- `defineFormAction()` em `src/lib/server-actions/define-form-action.ts` — factory com tipagem forte e validação Zod v4 para server actions.
- Validação de input centralizada: cada action declara schema Zod e recebe dados já validados e tipados.
- 15+ actions migradas para o padrão (atividades, financeiro, ofícios, config, notificações, etc.).
- Utilitários em `src/lib/server-actions/utils.ts` — helpers de parsing e transformação.

## Error Boundaries

- Componente base `src/components/ErrorBoundary.tsx` — factory `createErrorBoundary` com logging via `toSafeErrorLog` (PII-safe)
- 18 boundaries consolidados: `app/error.tsx`, `app/change-password/error.tsx`, `app/app/error.tsx`, `app/app/config/error.tsx`, `app/app/associados/error.tsx`, `app/app/atividades/error.tsx`, `app/app/financeiro/error.tsx`, `app/app/financeiro/mensalidades/error.tsx`, `app/app/juridico/error.tsx`, `app/app/juridico/consultas/error.tsx`, `app/app/juridico/consultas/nova/error.tsx`, `app/app/juridico/consultas/[id]/error.tsx`, `app/app/secretaria/error.tsx`, `app/app/secretaria/oficios/error.tsx`, `app/app/secretaria/documentos/error.tsx`, `app/app/email-triage/error.tsx`, `app/app/search/error.tsx`, `app/app/privacidade/error.tsx`, `app/app/etiquetas/error.tsx`
- `not-found.tsx` em rotas dinâmicas: `app/app/associados/[id]/not-found.tsx`, `app/app/secretaria/oficios/[id]/editar/not-found.tsx`

## Notificacoes

Notificacoes sao registros persistidos. O cliente carrega via Server Actions e atualiza periodicamente. Entrega em tempo real nao faz parte do caminho critico do go-live.

Tipos de notificação:
- `email_triage_pending` — triagem exige revisao operacional
- `oficio.status_changed` — status de ofício alterado via webhook Assinafy (notifica todos admins ativos)
- `activity.completed`, `legal_consultation.answered`, `activity.assigned`, `legal_consultation.sla_warning` — existentes

## Documentos E Storage

Metadados de documentos permanecem no PostgreSQL. Arquivos fisicos devem usar storage de objetos privado quando o modulo for ativado operacionalmente. O provedor ainda nao e parte do baseline.

## LGPD

- Dados sensiveis passam por mascaramento, criptografia e indices cegos onde aplicavel.
- Logs devem usar `src/lib/logger.ts` e `src/lib/sanitize-pii.ts`.
- Senhas temporarias, cookies, tokens e segredos nunca devem ser persistidos em logs ou auditoria.
- Email triage: PII (remetente, destinatário) sanitizado em logs via `sanitizePiiValue()`.

## Segurança

- SQL injection: queries do repository de atividades validam e sanitizam parâmetros; `defineFormAction()` aplica validação Zod antes de chegar ao banco.
- SSRF: URLs de webhook outbound são validadas contra IPs privados/reservados e hostnames locais.
- N+1 queries: `identifyLawyerId` e `domainMaterializer` corrigidos para batch de queries em vez de loops individuais.
- `assigneeName`/`associateName` sanitizados como PII em logs e webhooks.

## Deploy

1. Provisionar PostgreSQL gerenciado novo.
2. Configurar envs obrigatorias.
3. Aplicar baseline com snapshot/backup e janela aprovada.
4. Rodar seed inicial.
5. Validar gates e smoke manual.
6. Configurar credenciais Gmail (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN).
7. Configurar GEMINI_API_KEY para analysis.
8. Configurar Assinafy (ASSINAFY_API_KEY, ASSINAFY_ACCOUNT_ID, ASSINAFY_BASE_URL, ASSINAFY_WEBHOOK_SECRET) — opcional, para assinatura digital.
9. Configurar webhook Assinafy na plataforma apontando para `https://intranet.asof.com.br/api/webhooks/assinafy`.

Detalhes operacionais ficam em `docs/runbook.md`; pendencias ficam em `TODO-PROD.md`.
