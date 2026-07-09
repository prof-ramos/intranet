# ADR 019: Exportação de Dados LGPD em `/app/privacidade` — Manual com SLA no Dia 1

## Status

Aceito (2026-07-09)

## Contexto

A página `/app/privacidade` expõe o **Direito de Acesso e Portabilidade** (LGPD Art. 18, II e V) via o botão "Baixar meus dados". A action `requestDataDownload` (`src/app/app/privacidade/actions.ts`) **não gera exportação**: apenas cria uma Atividade no Kanban com tags `LGPD` / `Acesso`, prioridade `alta`, e notifica admins/secretaria (`type: 'lgpd_request'`). A UI promete que "a Secretaria irá compilar um relatório estruturado… e os enviará para o seu e-mail cadastrado" — ou seja, o fluxo operacional já é manual, mas **não há SLA formalizado nem log de entrega**.

O Direito ao Esquecimento na mesma página já segue o padrão de **triagem humana** do ADR 006 (Activity + revisão da Secretaria; SLA de 15 dias corridos). O export de dados é o espelho do lado "acesso/portabilidade" e ainda não tem decisão arquitetural explícita.

### Building blocks já existentes

| Artefato                                                                                                                   | Papel no export                                                        |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/lib/associates/lgpd.ts` — `ASSOCIATE_EXPORT_FIELDS`, `SENSITIVE_FIELDS` / `PUBLIC_FIELDS`, `filterExportFieldsByRole` | Allowlist de campos e classificação PII para o payload do titular      |
| `src/lib/reports/csv.ts` — `generateCsv`, `ALL_FIELDS`, `toCsvCell`                                                        | CSV pt-BR, labels de enum, prevenção de injeção de fórmula             |
| `src/lib/reports/queries.ts` — `getAssociatesForReport`                                                                    | Query com descriptografia PII (ciphertext fallback) e limite de linhas |
| `src/lib/reports/audit.ts` — `auditReportDownload`                                                                         | Auditoria de download de relatório (precedente de log sem plaintext)   |
| `requestDataDownload` + Kanban + notificações                                                                              | Canal de solicitação e triagem já em produção                          |

### Dependência de storage

- **ADR 008**: módulo Documentos / storage de objetos **fora do dia 1**.
- **ADR 012**: Papra como candidato DMS pós-estreia (POC); não é gate de go-live. Direção operacional posterior: POC Papra **não** é caminho ativo (`TODO-PROD.md`, fechamento #263).
- Plano advisor 025 (spike de backend de storage) fechado como obsoleto face aos ADRs 008/012; storage privado com URL assinada **não está provisionado**.

Qualquer opção que dependa de arquivo temporário + link assinado **não é implementável no dia 1** sem reabrir a frente de storage.

## Decisão

**Option B — Manual com SLA formalizado** é a decisão para o **dia 1 pós go-live** (e enquanto storage de objetos não existir).

1. Manter `requestDataDownload` como **sinal de intenção** (Activity + notificação), sem gerar arquivo automaticamente.
2. Formalizar **SLA de entrega: 15 dias corridos** a partir da criação da Activity (alinhado ao ADR 006 e a um prazo razoável sob LGPD Art. 18).
3. Escopo operacional do pacote entregue ao titular (mínimo):
   - Cadastro do oficial/associado: campos de `ASSOCIATE_EXPORT_FIELDS` (plaintext no ponto de entrega, montado a partir de decrypt controlado).
   - Histórico de contribuições / mensalidades vinculadas ao titular (quando existirem).
   - Demais registros claramente vinculados ao titular e listados no runbook de triagem (dependentes, convênios, ofícios em que seja parte, etc.), conforme checklist da Secretaria.
4. Canal de entrega: e-mail cadastrado (ou canal seguro já usado pela Secretaria), **sem** hospedar o arquivo na intranet no dia 1.
5. Ao concluir, a Secretaria encerra a Activity com registro de entrega no `description` / comentário de conclusão (data, canal, formato — sem colar PII no log de auditoria do sistema).
6. **Option A (export assíncrono automatizado)** fica **adiada** até existir storage privado com retenção/expiração de link e um plano de build dedicado.

### SLA e estados operacionais (dia 1)

Sem migração de schema no dia 1. Estados são **operacionais no Kanban**:

| Estado                 | Como representar                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `requested`            | Activity criada em `a_fazer`, tags `LGPD` + `Acesso`                                                                          |
| `in_progress`          | Activity movida para `em_andamento`                                                                                           |
| `delivered`            | Activity `concluido` + nota de entrega (data/canal/formato)                                                                   |
| `refused` / impossível | Raro no acesso; se aplicável, `concluido` com fundamentação (ex.: titular sem dados cadastrais linkados ao admin solicitante) |

SLA: **15 dias corridos** da criação da Activity até `delivered` (ou resposta fundamentada). Mesma ordem de grandeza do ADR 006 para triagem LGPD.

### Fronteira de PII (obrigatória em qualquer opção)

- Descriptografar **somente** no momento da montagem do pacote de export (boundary de decrypt).
- Nunca logar plaintext de PII (`sanitizePii` / logger estruturado).
- Não gravar o CSV/JSON exportado no banco transacional nem em storage sem política de retenção.
- Auditoria registra _que_ o export foi solicitado/entregue (actor, activityId, timestamp), não o conteúdo.

## Opções avaliadas

### Option A — Export assíncrono automatizado

**Fluxo**: clique → job (cron / fila) → decrypt PII → CSV/JSON via `lgpd.ts` + `reports/csv.ts` → arquivo em storage privado → URL assinada com TTL → e-mail ao titular.

| Critério                                   | Avaliação                                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Cumprimento Art. 18 (acesso/portabilidade) | Forte — titular recebe o pacote sem dependência humana no caminho feliz                                               |
| Infra no dia 1                             | **Bloqueada** — exige storage + signed URL (ADR 008); job runner e política de retenção do artefato ainda não existem |
| Risco LGPD do artefato                     | Alto se TTL/expurgo falharem; arquivo exportado é PII concentrada                                                     |
| Esforço                                    | L (storage + job + e-mail + audit + expurgo + testes)                                                                 |
| Reuso de código                            | Alto (`ASSOCIATE_EXPORT_FIELDS`, `generateCsv`, queries com decrypt)                                                  |

**Rejeitada para o dia 1** por dependência de storage não provisionado (STOP do plan 026 / ADR 008). Permanece caminho preferido **após** storage estável e ADR/plano de build próprios.

### Option B — Manual com SLA (escolhida)

**Fluxo**: clique → Activity + notify (já existe) → Secretaria monta pacote com relatórios internos / CSV de associados filtrado ao titular → entrega por e-mail seguro → encerra Activity.

| Critério               | Avaliação                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cumprimento Art. 18    | Adequado se o SLA for cumprido e o pacote for completo                                                                                                 |
| Infra no dia 1         | Nenhuma nova; reutiliza Kanban, notificações e `reports/*`                                                                                             |
| Risco LGPD do artefato | Menor na app (sem blob persistido); risco operacional no canal de e-mail da Secretaria                                                                 |
| Esforço                | S–M (documentar SLA, checklist, eventual status na UI)                                                                                                 |
| Escala                 | Fraca se o volume de pedidos crescer; aceitável para ~usuários internos da diretoria/secretaria e pedidos esporádicos de titulares via fluxo assistido |

**Escolhida** porque: (1) alinha com ADR 006; (2) storage não está pronto; (3) building blocks de relatório já permitem montagem manual sem feature nova; (4) volume esperado no dia 1 é baixo.

### Opções rejeitadas / fora de escopo agora

- **Download síncrono no browser no clique**: ainda exige decrypt + geração na request do servidor e decide quem é o "titular" mapeado ao `session.userId` (admin ≠ associate). Escopo de identidade titular↔admin não está modelado para self-service puro de associado final; a página hoje é da área autenticada de operadores.
- **Persistir CSV em coluna Postgres / base64**: contorna storage de objetos mas cria retenção de PII concentrada no DB sem expurgo; rejeitado.
- **Automatizar sem signed link (só e-mail com anexo via Mailjet)**: viável depois como meio-termo, mas ainda é build de job + política de e-mail com PII; não é o caminho mínimo do dia 1.

## Consequências

### Positivas

- Go-live não depende de storage, filas nem signed URLs para cumprir o direito de acesso de forma operacional.
- Uma única linha de política LGPD: **triagem humana + SLA 15 dias** para acesso (este ADR) e esquecimento (ADR 006).
- Building blocks (`lgpd.ts`, `reports/csv.ts`, `queries.ts`) permanecem a base do pacote manual e do futuro Option A.
- Escopo de produto explícito: a action continua sendo request signal; não há falsa promessa de "download instantâneo" na arquitetura (a UI deve continuar a linguagem de "solicitação / Secretaria envia").

### Negativas / trade-offs

- Cumprimento depende de disciplina operacional da Secretaria.
- Sem campo de status dedicado, métricas de SLA exigem inspeção de Activities com tags `LGPD`+`Acesso`.
- Se o volume de pedidos subir, o processo manual vira gargalo — gatilho para reavaliar Option A.
- O mapeamento "admin autenticado → registro de associado titular" para self-service completo de oficiais **não** é resolvido aqui; no dia 1 o fluxo é o de operadores internos processando o pedido.

### Assunções de retenção do artefato exportado

- **Dia 1 (Option B)**: a intranet **não** retém o arquivo exportado. A cópia vive apenas no canal de entrega (e-mail) e na estação da Secretaria sob política interna de limpeza (apagar após confirmação de envio). Retenção institucional do _dado de origem_ continua regida pelo cadastro e pelo ADR 006.
- **Futuro (Option A)**: retenção sugerida do blob temporário — **TTL do link assinado ≤ 7 dias**; expurgo do objeto no storage no mesmo prazo ou imediatamente após primeiro download bem-sucedido; log apenas de metadados. Valores finais devem constar no ADR/plano de build do Option A.

## Próximos passos

### Imediato (pós-aceite deste ADR — sem feature grande)

1. Documentar no runbook / checklist LGPD o **procedimento de triagem de acesso** (como montar o pacote com `ASSOCIATE_EXPORT_FIELDS` + relatórios financeiros, prazo de 15 dias, texto de conclusão da Activity).
2. Treinar Secretaria no mesmo pacote do ADR 006 (acesso + exclusão).
3. Opcional UX leve (fora deste spike se não for trivial): texto na UI citando o prazo de até 15 dias corridos; **não** alterar a semântica de `requestDataDownload` sem plano de build.

### Follow-up de build (issue/plano separado — **não** neste spike)

Quando storage privado estiver decidido e provisionado (frente Documentos / objeto store):

1. Plano de build **Option A**: job assíncrono, decrypt no boundary, CSV/JSON via `lgpd.ts` + `reports/csv.ts`, storage + signed URL com TTL, e-mail, audit, expurgo.
2. Modelar identidade do titular (associate ↔ solicitante) se o self-service for para oficiais, não só operadores.
3. Estados `requested` → `in_progress` → `delivered` em schema ou metadata da Activity, com métrica de SLA.
4. Testes: unit do montador de pacote; integração sem logar PII; e2e do pedido até "link disponível".

### Fora de escopo deste ADR

- Implementar o export automatizado.
- Alterar `requestDataDownload` além do que um plano de build futuro especificar.
- Escolher provider de storage (permanece ADR 008 / frente Documentos).

## Referências

- LGPD Art. 18 (acesso, portabilidade) e Art. 16 (exceções de retenção — contexto do ADR 006).
- ADR 006 — revisão manual para exclusão/retenção LGPD.
- ADR 008 — Documentos/storage fora do dia 1.
- ADR 012 — Papra como candidato DMS (histórico; não gate de export dia 1).
- `src/app/app/privacidade/actions.ts` — `requestDataDownload`.
- `src/lib/associates/lgpd.ts` — campos exportáveis e classificação.
- `src/lib/reports/csv.ts`, `src/lib/reports/queries.ts` — geração CSV e decrypt.
- Issue de origem: [#264](https://github.com/prof-ramos/intranet/issues/264) (plan 026).
