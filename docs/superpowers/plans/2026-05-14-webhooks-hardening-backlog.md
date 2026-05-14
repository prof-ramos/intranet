# Webhooks e Integracoes - Backlog de Hardening

> Itens derivados da revisão CodeRabbit e triagem paralela de 2026-05-14. Este documento não substitui o plano principal em `docs/superpowers/plans/2026-05-13-endpoints-webhooks-integracoes.md`; ele registra incrementos arquiteturais que ficaram fora do v1 outbound.

## P0 - Retencao e Purge LGPD

**Modulos impactados:** `src/lib/db/schema/*`, `drizzle/postgres/*`, `src/lib/audit/service.ts`, `src/lib/integrations/webhooks/*`, `src/lib/reports/*`.

**Aceite:**

- Politica de retencao definida por tipo de dado (`domain_events`, `webhook_deliveries`, `audit_logs`, exports).
- Job/script idempotente de purge com modo dry-run.
- Execucao auditada sem PII bruta.
- Testes de contrato DB cobrindo indices, constraints e objetos criados.

## P0 - Rate Limit M2M e Rotacao Persistida de Chaves

**Modulos impactados:** `src/lib/integrations/auth.ts`, `src/lib/integrations/config.ts`, `src/lib/db/schema/integrations.ts`, `src/lib/rate-limit.ts`, UI/admin de integracoes.

**Aceite:**

- Autenticacao usa `integration_api_keys` persistida por hash.
- CRUD admin permite criacao, revogacao e rotacao de chaves.
- Rate limit aplicado por IP e por key.
- `lastUsedAt` atualizado em uso valido.
- CRUD, uso e falhas repetidas sao auditados.

## P0 - Auditoria Obrigatoria de Exportacoes

**Modulos impactados:** `src/app/app/associados/relatorio/download/route.ts`, `src/lib/reports/audit.ts`, `src/lib/reports/export-filters.ts`, `src/lib/reports/csv.ts`.

**Aceite:**

- Falha de auditoria bloqueia exportacao ou entra em fallback explicitamente aprovado.
- Metadados de auditoria nao expoem valores sensiveis.
- Limites por volume e campos sensiveis definidos.
- Testes cobrem auditoria obrigatoria e sanitizacao.

## P1 - DLQ e Auto-disable de Webhooks

**Modulos impactados:** `src/lib/integrations/webhooks/service.ts`, `src/lib/integrations/webhooks/repository.ts`, `src/lib/db/schema/integrations.ts`, `src/app/app/config/integracoes/webhooks/*`.

**Aceite:**

- Entregas esgotadas entram em estado DLQ claro.
- Assinaturas com falhas consecutivas sao auto-desativadas por politica.
- Operadores veem motivo e ultima falha.
- Reativacao e replay sao auditados e testados.

## P1 - Challenge-response Verification

**Modulos impactados:** futura rota em `src/app/api/v1/**`, `src/lib/integrations/auth.ts`, `src/lib/integrations/types.ts`, `src/lib/integrations/webhooks/secrets.ts`.

**Aceite:**

- Handshake valida posse do destino/segredo sem persistir segredo em claro.
- Replay e timestamp invalido falham.
- Resultado e auditado por `requestId`.
- Testes cobrem sucesso, assinatura invalida e expiracao.

## P2 - Semantica do Health Endpoint

**Modulos impactados:** `src/app/api/v1/health/route.ts`, `src/lib/integrations/http.ts`, `API.md`.

**Aceite:**

- Contrato distingue `live`, `readiness`, `auth`, `config` e `capabilities`.
- Status HTTP nao mascara misconfiguracao critica.
- Payload nao revela segredo ou configuracao sensivel.
- Testes cobrem sessao `admin`/`diretoria`, M2M valido e falhas de configuracao.

## Ordem Recomendada

1. Fechar P0 de LGPD, credenciais M2M e rastreabilidade de exportacoes.
2. Estabilizar operacao outbound com DLQ e auto-disable.
3. Formalizar handshake de subscriptions.
4. Refinar health/status sem ampliar superficie funcional.
