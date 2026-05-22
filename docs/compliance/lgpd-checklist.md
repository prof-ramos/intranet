# Checklist LGPD-ready — ASOF Intranet

> **Versão**: 1.0 (22/05/2026)
> **Escopo**: Código-fonte da intranet ASOF (Next.js 16 / PostgreSQL / Supabase Auth)
> **Base legal**: Lei 13.709/2018 (LGPD) e Resolução CD/ANPD nº 2/2021
> **Classificação**: Conforme = ✅ | Parcial = ⚠️ | Não conforme = ❌ | N/A = ➖

---

## 1. Inventário de Dados (ROPA)

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 1.1 | Mapear todas as operações de tratamento e manter registro do que é coletado, por quem, para quê, onde fica e com quem é compartilhado | Schema `associates` em `src/lib/db/schema/associates.ts` define 29 colunas + 3 por campo sensível (plaintext, ciphertext, hash). Operações implícitas no código, mas sem ROPA formal publicado. | LGPD art. 37 | ⚠️ | Alto | Criar ROPA formal em `docs/compliance/ropa.md` |
| 1.2 | Identificar o controlador, o operador e o encarregado quando aplicável | Não há documentação publicada. Sistema não expõe controlador (ASOF), operador (Supabase) ou encarregado/DPO. | LGPD art. 5º, VI, VII e VIII | ❌ | Alto | Adicionar seção na política de privacidade com DPO/encarregado |
| 1.3 | Registrar a finalidade, a categoria dos titulares, a categoria dos dados e a base legal usada em cada fluxo | `src/lib/associates/lgpd.ts` classifica campos como `sensitive` ou `public`. `ASSOCIATE_EXPORT_FIELDS` anota cada campo. Sem documentação explícita de base legal por fluxo. | LGPD arts. 6º e 7º | ⚠️ | Alto | Documentar base legal para cada operação no ROPA |
| 1.4 | Se o projeto for de pequeno porte, verificar regra simplificada da ANPD | ASOF tem ~763 associados — possivelmente agente de pequeno porte. | Resolução CD/ANPD nº 2/2021 | ❌ | Médio | Verificar enquadramento e adotar modelo simplificado ANPD |

## 2. Base Legal

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 2.1 | Definir base legal para cada tratamento antes de implementar o fluxo | Tratamento de associados usa "execução de contrato" (associação) e "legítimo interesse" (gestão). Não explicitado em código ou docs. | LGPD art. 7º | ⚠️ | Alto | Documentar base legal de cada operação no ROPA |
| 2.2 | Usar consentimento apenas quando adequado, com finalidade determinada e prova da manifestação | Não há mecanismo de consentimento granular. Login via Supabase Auth (consentimento implícito). | LGPD arts. 7º, I e 8º | ⚠️ | Alto | Implementar termo de consentimento no primeiro login |
| 2.3 | Se houver dados sensíveis, confirmar hipótese específica do art. 11 | `birthDate` é dado sensível. `internalNotes` pode conter dados sensíveis. `sourcePayload` idem. | LGPD art. 11 | ⚠️ | Alto | Confirmar base legal específica para birthDate/internalNotes |
| 2.4 | Revisar se o tratamento pode ser enquadrado como legítimo interesse, execução de contrato, obrigação legal | Associação sem fins lucrativos → legítimo interesse para gestão de associados. Obrigação contábil (retenção financeira 5 anos). | LGPD art. 7º | ⚠️ | Médio | Documentar no ROPA |

## 3. Transparência

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 3.1 | Publicar política de privacidade clara e acessível | Não existe rota `/privacidade` ou `/privacy`. Nenhum link no layout, footer ou login. | LGPD art. 6º, VI | ❌ | Alto | Criar página `/privacidade` com LGPD-compliant privacy policy |
| 3.2 | Informar finalidades, forma e duração do tratamento, identificação do controlador e contato do encarregado | `src/lib/logger.ts` redata PII em logs. `src/lib/db/index.ts` define timeouts. Controlador/encarregado não identificado. | LGPD arts. 9º e 41 | ❌ | Alto | Incluir na política de privacidade |
| 3.3 | Explicar compartilhamentos com terceiros e transferências internacionais | Supabase Auth, provavelmente Resend/SendGrid para email. Não documentado. | LGPD arts. 33 e 9º | ❌ | Médio | Listar operadores e subprocessadores na política |
| 3.4 | Evitar linguagem vaga; informação objetiva e compatível com a operação real | N/A — não há política publicada. | LGPD art. 6º, VI | ❌ | Alto | Criar política em linguagem clara |

## 4. Consentimento e Cookies

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 4.1 | Não carregar cookies não essenciais antes do consentimento | Não há banner de cookies. Supabase Auth usa cookies de sessão (essenciais). Nenhum analytics/marketing identificado. | LGPD arts. 7º, I, 8º e 9º | ⚠️ | Alto | Implementar cookie consent banner para não essenciais |
| 4.2 | Registrar a prova do consentimento e permitir revogação fácil | `src/lib/audit/service.ts` loga auditoria, mas não há tabela de consentimento. Sem UI de revogação. | LGPD art. 8º, §5º | ❌ | Alto | Criar tabela `user_consents` + UI de revogação |
| 4.3 | Separar cookies essenciais de analíticos, marketing e terceiros | Apenas cookies de sessão Supabase (essenciais). Sem categorização formal. | LGPD arts. 6º, I, III e 8º | ⚠️ | Médio | Documentar categorias de cookies |
| 4.4 | Se houver tratamento posterior incompatível com a finalidade original, reavaliar a base legal | Sem evidência de reuso de dados para finalidade diferente. | LGPD art. 6º, I e VII | ✅ | Baixo | N/A |

## 5. Minimização de Dados

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 5.1 | Coletar apenas o mínimo necessário para a finalidade declarada | Schema `associates` tem `sourcePayload` (texto livre) que pode conter dados excessivos de importação. | LGPD art. 6º, III | ⚠️ | Médio | Revisar necessidade de `sourcePayload` em produção |
| 5.2 | Evitar salvar IP, user agent, geolocalização sem justificativa | `src/lib/ip.ts` captura IP (rate limiting, justificado). `login_attempts` salva email em plaintext (não apenas hash). | LGPD arts. 6º, III e 7º | ⚠️ | Médio | Remover coluna `email` plaintext de `login_attempts` após migração |
| 5.3 | Aplicar anonimização, truncamento ou pseudonimização | V2 encryption com HKDF-SHA256 (`src/lib/crypto/index.ts`). Blind indexes HMAC-SHA256. ciphertext + hash em todas as colunas PII. | LGPD art. 5º, XI; art. 6º, III | ✅ | Baixo | N/A |
| 5.4 | Revisar formulários, logs e eventos para remover campos redundantes | `src/lib/sanitize-pii.ts` redata PII em audit logs. `src/lib/logger.ts` redata em logs. `WEBHOOK_SAFE_ASSOCIATE_FIELDS` limita webhooks. | LGPD art. 6º, III | ✅ | Baixo | N/A |

## 6. Dados Sensíveis

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 6.1 | Identificar se há coleta de dado sensível logo no desenho do sistema | `birthDate` no schema. `internalNotes` e `sourcePayload` podem conter. `SENSITIVE_FIELDS` em `lgpd.ts` lista todos explicitamente. | LGPD art. 5º, II | ✅ | Baixo | N/A |
| 6.2 | Exigir base legal específica antes de tratar dado sensível | BirthDate tratado como sensitive mas sem base legal explícita documentada. | LGPD art. 11 | ⚠️ | Alto | Documentar base legal específica para cada dado sensível |
| 6.3 | Restringir acesso, retenção e compartilhamento desses dados | `canViewSensitiveFields()` (`lgpd.ts:74`) limita a admin/diretoria. Encryption at rest AES-256-GCM. Role-based masking no DTO. | LGPD arts. 6º, VII, VIII e 46 | ✅ | Baixo | N/A |
| 6.4 | Se houver dado de criança ou adolescente, adotar cautela reforçada | Não se aplica (associados são servidores públicos maiores de idade). | LGPD art. 14 | ➖ | N/A | N/A |

## 7. Segurança

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 7.1 | Aplicar medidas técnicas e administrativas para proteger dados | AES-256-GCM encryption (`src/lib/crypto/index.ts`). RLS policies (migrations 0023, 0039, 0044). Connection pool configurado (`max: 10`, `statement_timeout: 30000`). | LGPD art. 46 | ✅ | Baixo | N/A |
| 7.2 | Controlar acessos por perfil, usar MFA, proteger credenciais | `requireAuth()` + `requireRole()` (`src/lib/auth`). Três roles: admin, diretoria, secretaria. | LGPD art. 46 | ⚠️ | Médio | Implementar MFA via Supabase Auth |
| 7.3 | Revisar segredos, tokens, variáveis de ambiente e backups | `src/lib/env.ts` valida variáveis obrigatórias. `ENCRYPTION_MASTER_KEY`, `DATABASE_URL`, etc. `.env.local` ignorado por git. | LGPD art. 46 | ✅ | Baixo | N/A |
| 7.4 | Ter plano de resposta a incidentes e processo de comunicação | Não existe documentado. Event system + webhooks poderiam notificar, mas sem processo formal. | LGPD art. 48 | ❌ | Alto | Criar incident response runbook + canal de notificação ANPD |

## 8. Logs e Observabilidade

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 8.1 | Não registrar dados pessoais em excesso em logs, traces e ferramentas de erro | `src/lib/logger.ts` redata PII (cpf, siape, email, token). `ERROR_MESSAGE_PII_PATTERNS` sanitiza mensagens de erro. | LGPD arts. 6º, III e VII; art. 46 | ✅ | Baixo | N/A |
| 8.2 | Sanitizar cabeçalhos, query strings, payloads e anexos antes de enviar a terceiros | `src/lib/sanitize-pii.ts` usado em audit logs e webhook outbox. Redação em objetos aninhados. | LGPD arts. 6º, III e 46 | ✅ | Baixo | N/A |
| 8.3 | Desativar envio automático de PII para ferramentas externas quando não necessário | Webhook outbox usa `WEBHOOK_SAFE_ASSOCIATE_FIELDS` para evitar PII em eventos (service.ts:192). | LGPD arts. 6º, III e 33 | ✅ | Baixo | N/A |
| 8.4 | Definir prazo de retenção para logs e aplicar descarte controlado | `login_attempts` tem `expiresAt` e cleanup periódico. Audit logs (`audit_logs`) sem política de retenção documentada. | LGPD arts. 6º, III e 15 | ⚠️ | Médio | Definir TTL para `audit_logs` + job de purge |

## 9. Direitos do Titular

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 9.1 | Disponibilizar confirmação, acesso, correção, anonimização, bloqueio, eliminação, portabilidade e revogação | `getAssociateProfile()`, `getAssociateForEdit()`, `updateAssociateData()` em service.ts. Sem UI de "meus dados" para o titular. | LGPD art. 18 | ⚠️ | Alto | Criar portal "Meus Dados" para associado |
| 9.2 | Criar fluxo interno para responder solicitações em tempo razoável | Não existe endpoint dedicado ou processo documentado. | LGPD art. 18 | ❌ | Alto | Criar API route `/api/lgpd/request` + workflow interno |
| 9.3 | Permitir exclusão de dados tratados com consentimento quando aplicável | Apenas inativação via `associationStatus = 'inativo'`. Sem lógica de exclusão/purge. | LGPD art. 18, VI | ❌ | Alto | Implementar soft delete + purge schedule |
| 9.4 | Prever canal simples de contato para o titular | Login usa Supabase Auth. Sem formulário de contato LGPD. | LGPD arts. 9º e 18 | ❌ | Médio | Adicionar formulário de contato LGPD |

## 10. Retenção e Descarte

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 10.1 | Definir prazo de retenção por categoria de dado e finalidade | `login_attempts` retém por 15 min (rate limit). Dados de associados retidos indefinidamente. Sem política formal. | LGPD art. 6º, III e art. 15 | ❌ | Alto | Definir política de retenção por categoria |
| 10.2 | Eliminar dados quando a finalidade for alcançada ou o tratamento não for mais necessário | Sem lógica de purge para associados inativos/desligados. | LGPD art. 15 | ❌ | Alto | Implementar job de purge para dados desnecessários |
| 10.3 | Manter retenção maior apenas quando houver obrigação legal ou regulatória | Associação pode ter obrigação contábil (retenção financeira 5 anos). Não documentado. | LGPD art. 16 | ⚠️ | Médio | Documentar prazos legais aplicáveis |
| 10.4 | Garantir descarte seguro em banco, backups e exportações | Encryption at rest existe. Descarte de backups não documentado. | LGPD art. 46 | ⚠️ | Médio | Incluir descarte de backups na política |

## 11. Terceiros e Transferências

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 11.1 | Listar todos os operadores, subprocessadores e serviços externos | Supabase (Auth + PostgreSQL). Possivelmente Resend/SendGrid (email). Vercel (deploy). Não documentado. | LGPD arts. 5º, VII e 39 | ❌ | Alto | Listar todos os serviços externos |
| 11.2 | Verificar se há transferência internacional e a hipótese legal correspondente | Supabase pode ter servidores nos EUA. ~63% dos associados estão no exterior (dados acessados do Brasil). | LGPD arts. 33 a 36 | ❌ | Alto | Verificar localização Supabase + cláusulas contratuais padrão |
| 11.3 | Confirmar se terceiros tratam dados apenas sob instrução do controlador | Sem DPA (Data Processing Agreement) documentado com Supabase ou outros operadores. | LGPD art. 39 | ❌ | Alto | Exigir DPA de todos os operadores |
| 11.4 | Registrar compartilhamentos e sua base legal | `src/lib/integrations/` gerencia webhooks. `WEBHOOK_SAFE_ASSOCIATE_FIELDS` evita PII em eventos. | LGPD arts. 9º e 37 | ⚠️ | Médio | Documentar todos os compartilhamentos |

## 12. Governança e Prova

| # | Item | Evidência | Base Legal | Status | Risco | Ação Recomendada |
|---|---|---|---|---|---|---|
| 12.1 | Manter documentação de políticas, decisões e evidências de adequação | Este checklist é o primeiro passo. ADRs em `docs/adr/` documentam decisões arquiteturais (ex: ADR-001 RLS, 003 PDF). | LGPD art. 6º, X | ⚠️ | Médio | Manter ROPA + policy docs atualizados |
| 12.2 | Registrar riscos, medidas de mitigação e revisões periódicas | `vuln-report-2026-05-22.md` na raiz (relatório de vulnerabilidade). Sem revisão periódica formal de LGPD. | LGPD art. 6º, VIII e X | ⚠️ | Médio | Agendar revisão trimestral de LGPD |
| 12.3 | Criar checklist por release ou por auditoria de terceiro | Este documento serve como baseline. Deve ser incluído no CI/CD check. | LGPD art. 37 | ⚠️ | Médio | Adicionar step de verificação LGPD no CI |
| 12.4 | Quando aplicável, seguir orientações e modelos da ANPD para simplificação | Resolução CD/ANPD nº 2/2021. Modelo de registro divulgado pela ANPD. | — | ❌ | Médio | Adotar template ANPD para ROPA simplificado |

---

## Resumo Executivo — Auditoria Rápida

| # | Pergunta | Status | Risco |
|---|---|---|---|
| 1 | Existe inventário de dados e ROPA? | ⚠️ | Alto |
| 2 | Existe base legal por tratamento? | ⚠️ | Alto |
| 3 | Existe política de privacidade publicada? | ❌ | **Alto** |
| 4 | O banner de cookies bloqueia scripts até consentimento? | ❌ | **Alto** |
| 5 | O sistema minimiza coleta e logs? | ✅ | Baixo |
| 6 | Há fluxo de direitos do titular? | ❌ | **Alto** |
| 7 | Há retenção e descarte definidos? | ❌ | **Alto** |
| 8 | Há controles de terceiros e transferências? | ❌ | **Alto** |
| 9 | Há medidas de segurança e resposta a incidentes? | ⚠️ | Alto |
| 10 | Há documentação para demonstrar conformidade? | ⚠️ | Médio |

### Totais

- **Conforme (✅)**: 8 itens
- **Parcial (⚠️)**: 14 itens
- **Não conforme (❌)**: 14 itens
- **N/A (➖)**: 1 item

### Gaps Críticos (Ação Imediata)

1. **Política de privacidade publicada** — LGPD art. 9º (❌)
2. **Banner de cookies com opt-in** — LGPD arts. 7º, I e 8º (❌)
3. **Fluxo de direitos do titular (art. 18)** — acesso, correção, exclusão (❌)
4. **Plano de resposta a incidentes** — LGPD art. 48 (❌)
5. **Política de retenção e descarte** — LGPD arts. 15 e 16 (❌)
6. **DPA com operadores (Supabase)** — LGPD arts. 33 e 39 (❌)
7. **Transferência internacional** — LGPD arts. 33-36 (❌)

---

*Documento gerado em 22/05/2026. Base de código auditada: commit `4276a6d4ff651f605b8b3d14e60c77ce0a0e31eb`*