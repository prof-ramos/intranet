# Fatos Estáveis do Projeto

> Arquitetura, stack, comandos validados, fluxos de deploy, decisões técnicas confirmadas e restrições operacionais permanentes.

---

## 2026-06-12 — Jules API não tem cancelamento nativo de sessões

- **Tipo**: Restrição técnica
- **Escopo**: Integração externa (Google Jules)
- **Memória**: A API REST Jules v1alpha expõe apenas 5 métodos para sessões: `create`, `get`, `list`, `sendMessage`, `approvePlan`. **Não existem** endpoints `delete`, `cancel` ou `pause`. O único mecanismo para interromper uma sessão é `sendMessage`, que envia um prompt textual ao agente — ele pode ignorar o comando ou tratá-lo como nova tarefa.
- **Evidência**: Sessão 2026-06-12 — 3 sessões ativas, `sendMessage` com "cancel" não as moveu para `COMPLETED`.
- **Regra preventiva**: Para cancelar sessões Jules, usar o web UI em `https://jules.google.com/session/{id}` como primeira opção, não a API.
- **Confiança**: alta

## 2026-06-15 — Padrão de adicionar campos ao associado (pipeline de 7 camadas)

- **Tipo**: Decisão técnica confirmada
- **Escopo**: Campos novos no módulo associates
- **Memória**: Ao adicionar um campo novo ao modelo `associates`, são necessárias atualizações em 7 arquivos em camadas específicas, nesta ordem: (1) `repository.ts` — `UpdateAssociateValues` type + imports de enums, (2) `service.ts` — `EditAssociateDTO`, `getAssociateForEdit()`, `UpdateAssociateInput`, `updateAssociateData()` + validação de enums, (3) `pii-mapping.ts` — se o campo for PII (criptografia triple-column), adicionar ao `PII_FIELDS` e `PiiPatchKeys`, (4) `validation/schemas.ts` — `updateAssociateSchema` com Zod, (5) `actions.ts` — pass-through do form data para o service, (6) `EditarAssociadoForm.tsx` — formulário UI, (7) `[id]/page.tsx` — página de detalhes. Esquecer qualquer camada causa erro de tipo ou runtime.
- **Evidência**: Sessão 2026-06-15 — 17 campos novos adicionados sistematicamente, typecheck passou na primeira tentativa após todas as camadas.
- **Confiança**: alta

## 2026-06-15 — canViewSensitiveFields() sempre retorna true — sistema interno

- **Tipo**: Decisão arquitetural
- **Escopo**: LGPD / visibilidade de dados
- **Memória**: `canViewSensitiveFields()` em `lgpd.ts` foi alterado para sempre retornar `true`. Todos os usuários autenticados (admin, diretoria, secretaria) veem dados completos sem censura. Requisito explícito do usuário: "sistema interno da empresa; eles deverão ter acesso aos dados em sua completude". As funções de máscara (`maskCpf`, `maskSiape`, `maskEmail`, `maskPhone`) permanecem disponíveis para futuros exports a terceiros. A lista de conversão de enums (`sexLabels`, `maritalStatusLabels`, etc.) está nas páginas de detalhes e edição, não em um arquivo central — considerar centralizar se houver mais consumidores.
- **Evidência**: Sessão 2026-06-15 — LGPD notice removida da página de detalhes, dados completos visíveis para todos.
- **Confiança**: alta

## 2026-06-12 — `sendMessage` em sessões AWAITING_USER_FEEDBACK

- **Tipo**: Comportamento observado
- **Escopo**: Integração externa (Google Jules)
- **Memória**: Enviar `sendMessage` para sessões no estado `AWAITING_USER_FEEDBACK` as move para `IN_PROGRESS` (o agente processa o prompt como nova entrada), mas **não** garante que irão para `COMPLETED`. O comportamento depende de como o agente interpreta o prompt.
- **Evidência**: Sessão 2026-06-12 — 2 sessões foram de `AWAITING_USER_FEEDBACK → IN_PROGRESS` após `sendMessage` com "cancel", e permaneceram `IN_PROGRESS` indefinidamente.
- **Regra preventiva**: Não confiar em `sendMessage` com comando de cancelamento para sessões `AWAITING_USER_FEEDBACK`. A resposta do agente é imprevisível.
- **Confiança**: alta

## 2026-06-12 — Fluxo de merge de documentação validado

- **Tipo**: Fluxo operacional validado
- **Escopo**: Git workflow para documentação
- **Memória**: Fluxo de merge de branch de feature com documentação validado: `git checkout main` → `git commit -m "docs: ..."` → `git push origin main` → `git branch -d <feature>` → `git push origin --delete <feature>`. Comandos `uv`, `npm`, `gh` autorizados por default no projeto ASOF/intranet.
- **Evidência**: Sessão 2026-06-12 — merge de 4 arquivos docs/agent-memory/ concluído sem conflitos, branch limpa local e remotamente.
- **Regra preventiva**: Para merge de documentação sem código: seguir o fluxo acima. Git requer aprovação explícita por comando (não está no default).
- **Confiança**: alta

## 2026-06-12 — Cancelamento do modo deep-interview via `omx cancel`

- **Tipo**: Procedimento operacional confirmado
- **Escopo**: Workflow OMX
- **Memória**: Quando o modo `deep-interview` bloqueia implementação e `$cancel` ou `$ultragoal` não funcionam via comando shell, usar `omx cancel` diretamente para sair do modo interview e liberar ferramentas de escrita.
- **Evidência**: Sessão 2026-06-12 — `$cancel` e `$ultragoal` via shell não surtiram efeito; `omx cancel` cancelou `deep-interview` e `skill-active` imediatamente.
- **Regra preventiva**: Para sair do deep-interview quando comandos `$*` falharem, usar `omx cancel` como fallback confiável.
- **Confiança**: alta

## 2026-06-12 — Modelo `kimi-k2.6:cloud` incompatível com Codex + ChatGPT

- **Tipo**: Restrição técnica
- **Escopo**: Configuração do autoreview
- **Memória**: O modelo `kimi-k2.6:cloud` configurado no ambiente não é suportado quando usando Codex com conta ChatGPT. Erro retornado: `The 'kimi-k2.6:cloud' model is not supported when using Codex with a ChatGPT account.`
- **Evidência**: Sessão 2026-06-12 — autoreview falhou com status 400 ao revisar commit `72b74e8`.
- **Regra preventiva**: Se autoreview falhar com erro de modelo incompatível, verificar configuração em `.codex/config.toml` ou env `AUTOREVIEW_MODEL` e usar modelo compatível com ChatGPT (ex: `gpt-4.1`, `gpt-5.1`).
- **Confiança**: alta

## 2026-06-12 — Schema contract test usa valores em português

- **Tipo**: Restrição técnica
- **Escopo**: Testes de integração (schema.integration.test.ts)
- **Memória**: O teste de contrato de banco de dados em `src/lib/db/schema.integration.test.ts` valida enums, colunas e índices contra o PostgreSQL real. Vários enums usam valores em português: `activity_priority` → `['baixa', 'normal', 'alta', 'urgente']`, `activity_status` → `['a_fazer', 'em_andamento', 'aguardando_terceiros', 'concluido']`, `official_letter_status` → `['gerado', 'cancelado', 'rascunho']`, etc. Valores em inglês como `['low', 'medium', 'high', 'urgent']` são **incorretos** e causam falha no CI Database Contract.
- **Evidência**: Sessão 2026-06-12 — CI falhou com `expected [ Array(4) ] to deeply equal [ 'high', 'low', 'medium', 'urgent' ]`.
- **Regra preventiva**: Nunca assumir valores em inglês para enums do banco; sempre verificar o Drizzle schema (`src/lib/db/schema/enums.ts`) ou migrações SQL para os valores corretos.
- **Confiança**: alta

## 2026-06-12 — Domain events emitidos após commit da transação

- **Tipo**: Padrão arquitetural
- **Escopo**: src/lib/finance/service.ts
- **Memória**: Em `autoMarkOverduePaymentsService`, os domain events são coletados dentro da transação mas emitidos **após** o commit (`for (const { event } of events) { await emitDomainEvent(event); }`). O comentário explícito diz "reduce lock window". Já `updateMonthlyPayment` e `cancelMonthlyPayment` chamam `emitDomainEvent({ ... }, tx)` dentro da transação. Ao resolver conflitos de rebase neste arquivo, manter o padrão HEAD (emitir fora da transação) para `autoMarkOverduePaymentsService`.
- **Evidência**: Sessão 2026-06-12 — conflito de rebase resolvido mantendo o padrão HEAD.
- **Regra preventiva**: Não alterar o padrão de emissão de domain events em `autoMarkOverduePaymentsService` sem considerar o comentário sobre lock window.
- **Confiança**: alta

## 2026-06-12 — CI Database Contract roda contra PostgreSQL real

- **Tipo**: Restrição técnica
- **Escopo**: Pipeline CI
- **Memória**: O job `Database Contract` no CI cria um PostgreSQL 16 em container, aplica todas as migrações e roda `src/lib/db/schema.integration.test.ts` validando tables, columns, enums e indexes. Qualquer divergência entre o Drizzle schema e as expectativas do teste causa falha. O teste NÃO usa banco mock — é um teste de contrato contra schema real.
- **Evidência**: Sessão 2026-06-12 — CI falhou quando expectedColumns/expectedEnums/expectedIndexes não bateram com o banco.
- **Regra preventiva**: Ao mudar migrações ou schemas Drizzle, sempre atualizar `schema.integration.test.ts` correspondente. Nunca assumir que o teste está correto sem validar contra o banco real.
- **Confiança**: alta

## 2026-06-15 — Neon via Vercel Storage Integration

- **Tipo**: Restrição técnica
- **Escopo**: Banco de dados Neon PostgreSQL
- **Memória**: O projeto usa Neon PostgreSQL conectado via Vercel Storage Integration (não via Neon Console standalone). Org ID: `org-red-mode-09715915`. Project ID: `long-leaf-97822199` (`intranet-db`). Endpoint produção: `ep-empty-cake-ac26vl6w`, região `sa-east-1`. A CLI `neonctl` requer `org_id` no header da API para projetos Vercel-managed (HTTP 400 sem ele). Solução: usar `neonctl link --org-id org-red-mode-09715915 --project-id long-leaf-97822199 --no-checks` para configurar contexto, ou usar API REST direta via Node.js com `?org_id=org-red-mode-09715915`.
- **Evidência**: Sessão 2026-06-15 — `neonctl projects list` sem org_id → HTTP 400; `neonctl link` funcionou com flags explícitos.
- **Regra preventiva**: Para operar neonctl com projetos Vercel-managed, sempre usar `neonctl link` com `--org-id` e `--project-id` explícitos. Se a CLI interativa travar em prompt, usar API REST via Node.js.
- **Confiança**: alta

## 2026-06-15 — Neon Free Tier suporta branching

- **Tipo**: Fato corrigido
- **Escopo**: Neon PostgreSQL Free Tier
- **Memória**: O Free Tier do Neon suporta branching (incluindo schema-only branches). A limitação real é PITR de 6h (não 24h), compute 0.25 CU, e scale-to-zero. Branch `dev/migration-test` (`br-fancy-mud-ac20oabm`) criada com sucesso.
- **Evidência**: Sessão 2026-06-15 — `neonctl branch create --name "dev/migration-test" --schema-only` → sucesso.
- **Regra preventiva**: Neon Free Tier suporta branching. Não assumir que "Free = sem branching". Limitação real: PITR 6h, compute 0.25 CU.
- **Confiança**: alta

## 2026-06-15 — Schema-only branches não copiam dados do drizzle journal

- **Tipo**: Restrição técnica
- **Escopo**: Neon branching + Drizzle ORM migrations
- **Memória**: Ao criar uma branch schema-only (`--schema-only`), o Neon copia o DDL (todas as tabelas existem) mas NÃO copia os dados da tabela `drizzle.__drizzle_migrations`. O journal fica vazio, fazendo `drizzle-kit migrate` tentar reaplicar todas as migrations (falha: tabelas já existem). É necessário popular o journal manualmente com os hashes das migrations existentes. Campo `created_at` é `bigint` (epoch ms), NÃO timestamp.
- **Evidência**: Sessão 2026-06-15 — `drizzle.__drizzle_migrations` tinha 0 entries após branch; `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (...)` com `created_at` bigint resolveu.
- **Regra preventiva**: Ao usar schema-only branches com Drizzle, sempre popular `drizzle.__drizzle_migrations` com os hashes existentes. Hashes obtidos via `shasum -a 256 drizzle/postgres/0*.sql`. Campo `created_at` é bigint.
- **Confiança**: alta

## 2026-06-15 — JSON web como fonte única para migração de dados legados

- **Tipo**: Decisão técnica confirmada
- **Escopo**: Migração de dados legados
- **Memória**: O arquivo `data/asof-prod-dump/chancelaria_web_indexed.json` (1.750 registros, 39 colunas) contém dados mergeados de `asof` + `asof_priv` extraídos via Chrome DevTools. É a fonte única e suficiente para a migração de associados — não é necessário restaurar MySQL 5.7, Docker, ou acessar VPS. 28 de 39 colunas mapeiam diretamente para o schema Drizzle `associates`. 16 colunas Drizzle faltam e precisam de migração de schema.
- **Evidência**: Sessão 2026-06-15 — análise de cobertura mostrou 99.7% para Nome, 93% para SIAPE, 82.1% para CPF; 10 campos web sem destino Drizzle (CEOC, CAOC, Naturalidade, Bairro, Dependentes, etc.).
- **Regra preventiva**: Para migração de associados, usar `chancelaria_web_indexed.json` como fonte primária. Não tentar restaurar MySQL ou acessar VPS.
- **Confiança**: alta

## 2026-06-15 — Server Actions são schema-first

- **Tipo**: Padrão arquitetural
- **Escopo**: `src/lib/server-actions/define-form-action.ts` e callers em `src/app/**/actions.ts`
- **Memória**: Server Actions com entrada devem declarar schema Zod no helper (`defineServerAction` ou `defineFormStateAction`). Actions sem entrada devem usar `defineNoInputServerAction`. O fallback cru para `FormData`/payload sem schema foi removido no PR #201.
- **Evidência**: PR #201, merge commit `a543e9c`; commits do PR `2864305` e `45d495c` tornaram schemas obrigatórios e migraram os callers.
- **Regra preventiva**: Não adicionar overload opcional `schema?:`, não passar `Record<string, unknown>` cru para services e não reintroduzir parsing manual antes do schema. Para campos de formulário repetidos, lembrar que `formDataToRecord()` usa `FormData.getAll()` e preserva arrays.
- **Confiança**: alta

## 2026-06-15 — GROUP BY com expressão CASE no Drizzle: colunas internas devem ser explícitas no `.groupBy()`

- **Tipo**: Restrição técnica / SQL semantics
- **Escopo**: Drizzle ORM queries com `.groupBy()` e expressões `sql\`case\`` no `.select()`
- **Memória**: A query `_getTopRegions` usava `correctedCountry` (uma expressão `sql\`case\``) no `.select()` e `.groupBy(correctedCountry)`. A expressão CASE internamente referencia `assignments.type` e `associates.locationCountry`. PostgreSQL exige que toda coluna não-agregada no SELECT também apareça no GROUP BY. O erro `42803` ocorreu porque Drizzle traduziu `.groupBy(correctedCountry)` para o SQL da expressão inteira, mas PostgreSQL ainda exige as colunas de base explícitas no GROUP BY clause.
- **Evidência**: Sessão 2026-06-15 — E2E dashboard falhou com `PostgresError 42803: column "associates.location_country" must appear in GROUP BY`. Corrigido com `.groupBy(correctedCountry, assignments.type, associates.locationCountry)`.
- **Regra preventiva**: Ao usar expressões SQL `sql\`case\`` ou similares no `.select()` com `.groupBy()`, verificar se a expressão referencia colunas de outras tabelas. Se sim, adicionar explicitamente cada coluna não-agregada ao `.groupBy()`. Não confiar que Drizzle infira automaticamente.
- **Confiança**: alta

## 2026-06-15 — E2E dev server log como fonte primária de diagnóstico

- **Tipo**: Procedimento operacional validado
- **Escopo**: Debugging de falhas E2E
- **Memória**: Erros E2E "Erro ao salvar" e "Algo deu errado" não mostram a causa raiz nos screenshots nem nos testes. O arquivo `.next-e2e/e2e-dev-server.log` contém o stack trace e a query SQL exata que falhou (ex: `PostgresError 22007` com params). Leitura direta do log revelou a causa em segundos, enquanto o Playwright screenshot só mostrava "Erro ao salvar" genérico.
- **Evidência**: Sessão 2026-06-15 — 2 erros E2E diagnosticados via `grep "PostgresError" .next-e2e/e2e-dev-server.log`, não via testes.
- **Regra preventiva**: Ao debugar falhas E2E, **sempre** consultar `.next-e2e/e2e-dev-server.log` como primeira fonte. `grep -E "PostgresError|Error \["` no log é mais rápido que re-executar testes com prints.
- **Confiança**: alta

## 2026-06-15 — Playwright browser pode não estar instalado no ambiente local

- **Tipo**: Limitação do ambiente
- **Escopo**: Execução de E2E tests localmente
- **Memória**: Primeira execução E2E (`npm run test:e2e`) falhou silenciosamente com `8 failed` e mensagem "Looks like Playwright was just installed or updated. Please run `npx playwright install`". O Chromium headless não estava presente no ambiente.
- **Evidência**: Sessão 2026-06-15 — `npx playwright install chromium` baixou 92.4 MiB e os testes passaram em seguida.
- **Regra preventiva**: Se E2E falhar com mensagem de browser não encontrado, instalar com `npx playwright install chromium`. Não assumir que o ambiente já tem os browsers baixados.
- **Confiança**: alta
