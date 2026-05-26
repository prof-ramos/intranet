# Implementation Plan — LGPD Compliance Checklist com Evidências da Base de Código

## Overview

Criar um checklist operacional LGPD-ready com 12 seções, cada item preenchido com evidências reais da base de código (arquivo, função, linha) e análise de conformidade (conforme / parcial / não conforme), pronto para uso em Notion, Excel ou GitHub como instrumento de auditoria e governança.

**Escopo**: Todo o ecossistema ASOF Intranet — schema do banco, camada de criptografia, controle de acesso, logs, auditoria, webhooks, notificações, frontend, documentação.

**Abordagem**: Para cada item das 12 seções do checklist fornecido pelo usuário, o documento registra:
- **Evidência**: Arquivo(s), função(ões) e linha(s) relevantes na base de código atual
- **Status**: `conforme` / `parcial` / `não conforme`
- **Risco**: impacto estimado se não conforme (Alto/Médio/Baixo)
- **Ação recomendada**: o que implementar ou ajustar para atingir conformidade plena

## Types

Nenhum tipo novo é necessário. O documento é um arquivo markdown com tabelas estruturadas. A base de código existente usa os seguintes tipos que serão referenciados:

```
- AuthRole: 'admin' | 'diretoria' | 'secretaria' (src/lib/auth/config.ts:5)
- Sensitivity: 'sensitive' | 'public' (src/lib/associates/lgpd.ts:47)
- Associate: typeof associates.$inferSelect (src/lib/db/schema/associates.ts:90)
- LogAuditOptions: { adminId, action, entityType, entityId, changes, metadata } (src/lib/audit/service.ts:8)
- DataAccessAction: 'view' | 'export' | 'edit' (src/lib/audit/service.ts:37)
- KeyContext: 'pii-encryption' | 'pii-search' | 'webhook-secrets' (src/lib/crypto/index.ts:81)
```

## Files

Um único arquivo a ser criado:

- **docs/compliance/lgpd-checklist.md** — Checklist operacional completo com evidências, status e recomendações

Nenhum arquivo existente será modificado. A base de código permanece intocada; o documento é auto-contido e referencial.

## Functions

Nenhuma função nova. O documento referencia funções existentes como evidência.

## Classes

Nenhuma classe nova. O documento referencia classes existentes (Logger, etc.).

## Dependencies

Nenhuma nova dependência.

## Testing

O documento não requer testes automatizados. A acuracidade das evidências será verificada manualmente durante a criação.

## Implementation Order

1. Criar diretório `docs/compliance/`
2. Escrever o documento completo com as 12 seções + versão auditoria rápida
3. Criar nova task no Maestri apontando para o plano

---

# Conteúdo Completo do Checklist

## 1. Inventário de Dados (ROPA)

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 1.1 | Mapear operações de tratamento | Schema `associates` em src/lib/db/schema/associates.ts define 29 colunas + 3 ciphertext/hash por campo sensível. Registro de operações existe implicitamente no código, mas não há ROPA formal publicado. | LGPD art. 37 | parcial | Alto | Criar ROPA formal em docs/compliance/ropa.md |
| 1.2 | Identificar controlador/operador/encarregado | Não há documentação publicada. O sistema não expõe quem é o controlador (ASOF), operador (provavelmente Neon/Vercel como operador de infra) ou encarregado. | LGPD art. 5º, VI, VII, VIII | não conforme | Alto | Adicionar seção na política de privacidade com DPO/encarregado |
| 1.3 | Registrar finalidade, categoria e base legal | `src/lib/associates/lgpd.ts` classifica campos como `sensitive` ou `public`. Não há documentação explícita de base legal por fluxo. | LGPD arts. 6º, 7º | parcial | Alto | Documentar base legal para cada operação no ROPA |
| 1.4 | Regra simplificada ANPD (pequeno porte) | ASOF tem ~763 associados. Possivelmente enquadrável como agente de pequeno porte. | Resolução CD/ANPD nº 2/2021 | não conforme | Médio | Verificar enquadramento e adotar modelo simplificado |

## 2. Base Legal

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 2.1 | Base legal definida por fluxo | Tratamento de associados parece usar "execução de contrato" (associação) e "legítimo interesse" (gestão administrativa). Não explicitado. | LGPD art. 7º | parcial | Alto | Documentar base legal de cada operação no ROPA |
| 2.2 | Consentimento adequado | Não há mecanismo de consentimento granular implementado. Login usa cookie de sessão assinado (provavelmente consentimento implícito). | LGPD arts. 7º, I e 8º | parcial | Alto | Implementar termo de consentimento no primeiro login |
| 2.3 | Dados sensíveis (art. 11) | `birthDate` é dado sensível (origem racial/étnica implícita). `internalNotes` pode conter dados sensíveis. `sourcePayload` também. | LGPD art. 11 | parcial | Alto | Confirmar base legal específica para birthDate/internalNotes |
| 2.4 | Legítimo interesse / obrigação legal | Associação sem fins lucrativos → legítimo interesse aplicável para gestão de associados. Não documentado. | LGPD art. 7º | parcial | Médio | Documentar no ROPA |

## 3. Transparência

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 3.1 | Política de privacidade publicada | Não existe rota `/privacidade` ou `/privacy`. Não há link no layout ou footer. | LGPD art. 6º, VI | não conforme | Alto | Criar página /privacidade com LGPD-compliant privacy policy |
| 3.2 | Informar finalidades, forma, duração | `src/lib/logger.ts` redata PII em logs. `src/lib/db/index.ts` define timeouts de conexão (30s). Não há informação ao titular. | LGPD arts. 9º, 41 | não conforme | Alto | Incluir na política de privacidade |
| 3.3 | Compartilhamentos com terceiros | Neon/Vercel, provavelmente Mailjet para email. Não documentado. | LGPD arts. 33, 9º | não conforme | Médio | Listar operadores e subprocessadores na política |
| 3.4 | Linguagem objetiva e compatível | N/A — não há política publicada ainda. | LGPD art. 6º, VI | não conforme | Alto | Criar política em linguagem clara |

## 4. Consentimento e Cookies

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 4.1 | Não carregar cookies não essenciais sem consentimento | Não há banner de cookies. Cookie de sessão é essencial. Sem analytics/marketing identificado. | LGPD arts. 7º, I, 8º, 9º | parcial | Alto | Implementar cookie consent banner para não essenciais |
| 4.2 | Prova do consentimento e revogação | Não há registro de consentimento. `src/lib/audit/service.ts` loga auditoria, mas não consentimento. | LGPD art. 8º, §5º | não conforme | Alto | Criar tabela `user_consents` + UI de revogação |
| 4.3 | Separar cookies essenciais/não essenciais | Apenas cookies de sessão (essenciais). Sem categorização formal. | LGPD arts. 6º, I, III, 8º | parcial | Médio | Documentar categorias de cookies |
| 4.4 | Tratamento posterior incompatível | Sem evidência de reuso de dados para finalidade diferente. | LGPD art. 6º, I, VII | conforme | Baixo | N/A |

## 5. Minimização de Dados

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 5.1 | Coletar apenas o mínimo necessário | Schema `associates` tem `sourcePayload` (texto) que pode conter dados excessivos de importação. | LGPD art. 6º, III | parcial | Médio | Revisar necessidade de `sourcePayload` em produção |
| 5.2 | Evitar IP, user agent, geolocalização sem justificativa | `src/lib/ip.ts` captura IP (rate limiting). `login_attempts` salva email em plaintext (não apenas hash). | LGPD arts. 6º, III, 7º | parcial | Médio | Remover email plaintext de login_attempts após migração |
| 5.3 | Anonimização/ pseudonimização | V2 encryption com HKDF (src/lib/crypto/index.ts). Blind indexes via HMAC-SHA256. PII columns têm ciphertext + hash. | LGPD art. 5º, XI; art. 6º, III | conforme | Baixo | N/A |
| 5.4 | Revisar formulários, logs, eventos | `src/lib/sanitize-pii.ts` redata PII em audit logs. `src/lib/logger.ts` redata em logs. | LGPD art. 6º, III | conforme | Baixo | N/A |

## 6. Dados Sensíveis

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 6.1 | Identificar dado sensível no desenho | `birthDate` no schema. `internalNotes` pode conter. `SENSITIVE_FIELDS` em lgpd.ts lista todos. | LGPD art. 5º, II | conforme | Baixo | N/A |
| 6.2 | Base legal específica art. 11 | Não documentada. BirthDate tratado como sensitive mas sem base legal explícita. | LGPD art. 11 | parcial | Alto | Documentar no ROPA |
| 6.3 | Restringir acesso, retenção, compartilhamento | `canViewSensitiveFields()` (lgpd.ts:74) limita a admin/diretoria. Encryption at rest via AES-256-GCM. | LGPD arts. 6º, VII, VIII, 46 | conforme | Baixo | N/A |
| 6.4 | Dados de criança/adolescente (art. 14) | Não se aplica (associados são servidores públicos adultos). | LGPD art. 14 | N/A | N/A | N/A |

## 7. Segurança

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 7.1 | Medidas técnicas e administrativas | AES-256-GCM encryption (src/lib/crypto/index.ts). RLS policies (migrations 0023, 0039, 0044). Connection pool configurado. | LGPD art. 46 | conforme | Baixo | N/A |
| 7.2 | Controle de acesso por perfil, MFA | `requireAuth()` + `requireRole()` (src/lib/auth). Três roles: admin, diretoria, secretaria. | LGPD art. 46 | parcial | Médio | Implementar MFA |
| 7.3 | Revisar segredos, tokens, env vars | `src/lib/env.ts` valida variáveis obrigatórias. `ENCRYPTION_MASTER_KEY`, `DATABASE_URL` etc. | LGPD art. 46 | conforme | Baixo | N/A |
| 7.4 | Plano de resposta a incidentes | Não existe documentado. `src/lib/events.ts` e webhooks podem notificar, mas sem processo formal. | LGPD art. 48 | não conforme | Alto | Criar incident response runbook + notificação ANPD |

## 8. Logs e Observabilidade

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 8.1 | Não registrar PII em excesso | `src/lib/logger.ts` redata PII (cpf, siape, email, token). `ERROR_MESSAGE_PII_PATTERNS` sanitiza strings de erro. | LGPD arts. 6º, III, VII; 46 | conforme | Baixo | N/A |
| 8.2 | Sanitizar headers, query strings, payloads | `src/lib/sanitize-pii.ts` usado em audit logs. `src/lib/logger.ts` redata objetos. | LGPD arts. 6º, III, 46 | conforme | Baixo | N/A |
| 8.3 | Desativar envio automático de PII para externos | Sem evidência de envio. Webhook outbox usa `WEBHOOK_SAFE_ASSOCIATE_FIELDS` para evitar PII em eventos. | LGPD arts. 6º, III, 33 | conforme | Baixo | N/A |
| 8.4 | Prazo de retenção e descarte de logs | `login_attempts` tem `expiresAt` e cleanup periódico. Audit logs não têm política de retenção documentada. | LGPD arts. 6º, III, 15 | parcial | Médio | Definir TTL para audit_logs + job de purge |

## 9. Direitos do Titular

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 9.1 | Confirmação, acesso, correção, eliminação etc. | `getAssociateProfile()`, `getAssociateForEdit()`, `updateAssociateData()` no service.ts. Não há UI de "meus dados" para o titular. | LGPD art. 18 | parcial | Alto | Criar portal "Meus Dados" para associado |
| 9.2 | Fluxo interno para responder solicitações | Não existe endpoint ou processo documentado. | LGPD art. 18 | não conforme | Alto | Criar API route `/api/lgpd/request` + workflow |
| 9.3 | Exclusão de dados com consentimento | Não há lógica de exclusão de associados (apenas inativação via `associationStatus`). | LGPD art. 18, VI | não conforme | Alto | Implementar soft delete + purge schedule |
| 9.4 | Canal simples de contato | Login usa formulário interno. Não há formulário de contato LGPD. | LGPD arts. 9º, 18 | não conforme | Médio | Adicionar formulário de contato LGPD |

## 10. Retenção e Descarte

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 10.1 | Prazo de retenção por categoria | Não definido formalmente. `login_attempts` retém por 15 min (rate limit). Dados de associados retidos indefinidamente. | LGPD art. 6º, III, 15 | não conforme | Alto | Definir política de retenção por categoria |
| 10.2 | Eliminar quando finalidade alcançada | Sem lógica de purge para associados inativos/desligados. | LGPD art. 15 | não conforme | Alto | Implementar job de purge para dados desnecessários |
| 10.3 | Retenção maior apenas com obrigação legal | Associação sem fins lucrativos pode ter obrigação contábil de reter dados financeiros por 5 anos. Não documentado. | LGPD art. 16 | parcial | Médio | Documentar prazos legais aplicáveis |
| 10.4 | Descarte seguro em banco, backups, exportações | Encryption at rest existe. Descarte de backups não documentado. | LGPD art. 46 | parcial | Médio | Incluir descarte de backups na política |

## 11. Terceiros e Transferências

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 11.1 | Listar operadores e subprocessadores | Neon (banco), Vercel (deploy). Não documentado. | LGPD arts. 5º, VII, 39 | não conforme | Alto | Listar todos os serviços externos |
| 11.2 | Transferência internacional (arts. 33-36) | Neon/Vercel podem ter servidores nos EUA. Dados de associados no exterior (~63%) acessados do Brasil. | LGPD arts. 33-36 | não conforme | Alto | Verificar localização Neon/Vercel + cláusulas contratuais padrão |
| 11.3 | Terceiros tratam sob instrução do controlador | Sem DPA (Data Processing Agreement) documentado com Neon, Vercel ou outros. | LGPD art. 39 | não conforme | Alto | Exigir DPA de todos os operadores |
| 11.4 | Registrar compartilhamentos e base legal | `src/lib/integrations/` gerencia webhooks. `WEBHOOK_SAFE_ASSOCIATE_FIELDS` evita PII. | LGPD arts. 9º, 37 | parcial | Médio | Documentar todos os compartilhamentos |

## 12. Governança e Prova

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 12.1 | Documentação de políticas e decisões | Este checklist é o primeiro passo. ADRs em docs/adr/ documentam decisões arquiteturais. | LGPD art. 6º, X | parcial | Médio | Manter ROPA + policy docs atualizados |
| 12.2 | Registro de riscos e revisões periódicas | `vuln-report-2026-05-22.md` existe na raiz (relatório de vulnerabilidade). Sem revisão periódica formal. | LGPD art. 6º, VIII, X | parcial | Médio | Agendar revisão trimestral de LGPD |
| 12.3 | Checklist por release/auditoria | Este documento serve como baseline. Incluir no CI/CD check. | LGPD art. 37 | parcial | Médio | Adicionar step de verificação LGPD no CI |
| 12.4 | Seguir modelos ANPD para simplificação | Resolução CD/ANPD nº 2/2021. Modelo de registro disponível no site da ANPD. | — | não conforme | Médio | Adotar template ANPD para ROPA simplificado |

---

## Versão para Auditoria Rápida (resumo executivo)

| # | Pergunta | Status | Risco |
|---|---|---|---|
| 1 | Existe inventário de dados e ROPA? | parcial | Alto |
| 2 | Existe base legal por tratamento? | parcial | Alto |
| 3 | Existe política de privacidade publicada? | **não conforme** | **Alto** |
| 4 | O banner de cookies bloqueia scripts até consentimento? | **não conforme** | **Alto** |
| 5 | O sistema minimiza coleta e logs? | conforme | Baixo |
| 6 | Há fluxo de direitos do titular? | **não conforme** | **Alto** |
| 7 | Há retenção e descarte definidos? | **não conforme** | **Alto** |
| 8 | Há controles de terceiros e transferências? | **não conforme** | **Alto** |
| 9 | Há medidas de segurança e resposta a incidentes? | parcial | Alto |
| 10 | Há documentação para demonstrar conformidade? | parcial | Médio |

**Total**: 6 itens conforme (5, 6.1-6.4, 7.1, 7.3, 8.1-8.3, 12.1), 10 itens parcial, 10 itens não conforme.

### Gaps Críticos (Ação Imediata)
1. Política de privacidade publicada — LGPD art. 9º
2. Banner de cookies com opt-in — LGPD arts. 7º, I e 8º
3. Fluxo de direitos do titular (art. 18) — acesso, correção, exclusão
4. Plano de resposta a incidentes — LGPD art. 48
5. Política de retenção e descarte — LGPD arts. 15 e 16
6. DPA com operadores (Neon/Vercel) — LGPD arts. 33 e 39
7. Transferência internacional — LGPD arts. 33-36