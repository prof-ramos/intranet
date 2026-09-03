# Feedback do Agente — Erros e Ajustes de Conduta

> Registro de erros cometidos pelo agente, falhas de interpretação, comandos inadequados e ajustes de conduta para evitar repetição.

---

## 2026-09-03 — neonctl OAuth pessoal ≠ acesso à org Vercel-managed

- **Tipo**: Armadilha operacional / caminho errado insistido
- **Escopo**: Neon produção, migrations, connection-string
- **Memória**: Conta OAuth pessoal (`gabriel@proframos.com`) **não é membro** de `org-red-mode-09715915`. `neonctl connection-string` / `projects list` locais falham ou pedem org inacessível. Caminho certo: workflows GHA (`Migrate Production`, reconcile/clear) com secret `NEON_API_KEY` (escopo do projeto). Não insistir em OAuth local nem pedir ao usuário colar callback URL com `code=` no chat.
- **Evidência**: Sessão 2026-09-03 — migrate 0033; workflows `.github/workflows/migrate-production.yml` etc.; runs GHA de clear + migrate.
- **Regra preventiva**: Antes de qualquer op Neon prod, checar se o operador local é membro da org. Se não, só GHA + `NEON_API_KEY`. Nunca logar connection string; nunca reutilizar `code=` de OAuth colado em chat.
- **Confiança**: alta

## 2026-09-03 — Placeholders `<role>` no zsh viram redirecionamento

- **Tipo**: Erro de comando shell
- **Escopo**: neonctl / qualquer CLI no zsh
- **Memória**: Documentação com `--role-name <role>` copiada literalmente: zsh interpreta `<role>` como redirecionamento (`no such file or directory: role`).
- **Evidência**: Sessão 2026-09-03 — tentativa de `neonctl connection-string --role-name <role>`.
- **Regra preventiva**: Nunca passar placeholders com `< >` em comandos shell. Omitir `--role-name` (default da branch) ou usar nome literal listado por `neonctl roles list`.
- **Confiança**: alta

## 2026-09-03 — Testes de webhook sem mock de `isPublicWebhookUrl` = DNS ao vivo

- **Tipo**: Flake / dependência de rede em unitário
- **Escopo**: `subscriptions.test.ts`, `actions.test.ts` (webhooks)
- **Memória**: Suite unitária falhava em 5 testes com “HTTPS público…” porque `isPublicWebhookUrl` faz `dns.lookup` real em `https://example.com/webhook`. `validation.test.ts` já mockava DNS; os outros dois arquivos não. Fix: `vi.mock` de `isPublicWebhookUrl` → `true` (PR #439).
- **Evidência**: Issue #436; PRs #438 (dup) / #439 (mergeado).
- **Regra preventiva**: Qualquer teste que cria/atualiza subscription com URL pública deve mockar `isPublicWebhookUrl` (ou `dns/promises`). Não depender de DNS/rede em unitários.
- **Confiança**: alta

## 2026-09-03 — `postgres` `sql.begin`: `TransactionSql` ≠ `Sql` (quebra typecheck/preview)

- **Tipo**: Armadilha de tipos TypeScript
- **Escopo**: scripts com `postgres` (js), Vercel preview build
- **Memória**: Helper tipado como `(sql: postgres.Sql) => …` chamado com `tx` de `sql.begin` falha `TS2345` (`TransactionSql` não assignable a `Sql`). Preview Vercel em `df0b023` vermelho por typecheck, não por runtime Neon. Fix: UPDATEs/INSERTs **inline** no callback de `begin` (PR #446).
- **Evidência**: Sessão 2026-09-03 — `scripts/clear-duplicate-identity-hashes.ts`.
- **Regra preventiva**: Não passar `tx` de `sql.begin` para funções tipadas como `postgres.Sql`. Preferir SQL inline no callback ou aceitar união/`TransactionSql`.
- **Confiança**: alta

## 2026-09-03 — `array_agg(bigint)` chega como string; sort lexicográfico escolhe keepId errado

- **Tipo**: Bug silencioso de dados
- **Escopo**: clear de hashes duplicados / scripts ops
- **Memória**: IDs de `array_agg(id)` podem vir como `string`. Sem `Number()`, ordenação lexicográfica (“10” < “2”) escolhe o `keepId` errado ao limpar duplicatas.
- **Evidência**: Sessão 2026-09-03 — coerce em `planClearDuplicateIdentityHashes` + teste.
- **Regra preventiva**: Sempre `Number()` / validar inteiro positivo antes de sort/min em IDs vindos do driver postgres.
- **Confiança**: alta

## 2026-09-03 — Reconcile de identidades com `eligibleCount: 0` ≠ caminho para unique index

- **Tipo**: Diagnóstico incompleto / ferramenta errada
- **Escopo**: migration 0033, `reconcile-associate-identities.ts`
- **Memória**: Report de reconcile mostrou componentes ambíguos e `eligibleCount: 0` — apply automático de merge **impossível**. Bloqueio da 0033 era só unicidade de hash; resolver com **clear** dos hashes duplicados (manter menor `id`, NULL nos demais; unique partial/NULL-friendly), não forçar merge cadastral.
- **Evidência**: Workflows reconcile + `clear-duplicate-identity-hashes`; migrate 0033 sucesso após clear.
- **Regra preventiva**: Se 0033 aborta por duplicata de hash e reconcile não tem eligible, usar clear-hashes (com auditoria), não insistir em apply reconcile. Clear ≠ merge de registros (backlog de produto separado).
- **Confiança**: alta

## 2026-09-03 — Fechar PR duplicado precisa autorização explícita (Smart Mode)

- **Tipo**: Ajuste de conduta / shared-state
- **Escopo**: `gh pr close`, comentários em PRs
- **Memória**: Plano operacional listava “fechar #438 como duplicado”, mas Smart Mode bloqueou o close até autorização explícita do usuário. Pedido genérico de “próximos passos” não basta para writes em estado compartilhado.
- **Evidência**: Sessão 2026-09-03 — close #438.
- **Regra preventiva**: Antes de `gh pr close/merge` ou comentários que alteram triagem, obter ok explícito (ou “do all” / autorização ampla do plano). Não assumir que o plano anexado sozinho libera o write.
- **Confiança**: alta

## 2026-09-03 — Clear de hash deixa ciphertext; edição recria o unique

- **Tipo**: Lacuna de produto / efeito colateral de ops
- **Escopo**: `clear-duplicate-identity-hashes.ts`, `buildPiiPatch`, unique 0033
- **Memória**: O clear zera só `cpf_hash`/`siape_hash`/`primary_email_hash`. Ciphertext permanece. No edit, a UI descriptografa, o form reenvia o CPF e `buildPiiPatch` regrava o hash → unique explode (“Já existe um oficial cadastrado com este CPF”). Busca por CPF/SIAPE também não acha o “perdedor”.
- **Evidência**: Code review 2026-09-03 pós-#445/#446; `updateAssociateData` não pré-checa hash excluindo o próprio `id` — depende do unique + `rethrowIdentityUniqueViolation`.
- **Regra preventiva**: Após clear, não tratar o cadastro “órfão de hash” como pesquisável/editável sem plano. Follow-up: limpar ciphertext+hash juntos **ou** UI/serviço que evite rehash do duplicata. Clear ≠ merge.
- **Confiança**: alta

## 2026-09-03 — Script de clear sem guard de host remoto

- **Tipo**: Armadilha operacional / falta de fail-closed
- **Escopo**: `scripts/clear-duplicate-identity-hashes.ts --apply`
- **Memória**: Seed tem `ALLOW_REMOTE_DEV_SEED`; `guarded-migrate` tem `ALLOW_PRODUCTION_MIGRATIONS`. O clear `--apply` aceita qualquer `DATABASE_MIGRATION_URL`. `.env.local` apontando para Neon + apply local muta produção.
- **Evidência**: Code review 2026-09-03; workflow GHA é o caminho canônico, o script CLI não replica o guard.
- **Regra preventiva**: Não rodar `--apply` fora do workflow. Se precisar local, exigir confirmação/host allowlist no mesmo espírito do seed. Workflow pinava org literal mas `NEON_PROJECT_ID` vem de `vars` — confirmar `long-leaf-97822199` antes de migrate/clear.
- **Confiança**: alta

## 2026-09-03 — Audit log do clear aponta para o keepId, não para quem perdeu o hash

- **Tipo**: Trilha de auditoria enganosa
- **Escopo**: `associate_identity_hash_cleared` em `clear-duplicate-identity-hashes.ts`
- **Memória**: `entity_id` = `keepId` (sobrevivente). Consulta por `entity_id` do oficial cujo hash foi NULL não mostra o evento; `clearIds` ficam só em `metadata`.
- **Evidência**: Code review 2026-09-03.
- **Regra preventiva**: Preferir um log por `clearId` (`entity_id` = quem mudou). Não assumir que a ficha do duplicata tem o audit.
- **Confiança**: alta

## 2026-09-03 — finishing-a-development-branch em `main` com docs unstaged

- **Tipo**: Ajuste de conduta / skill vs estado do git
- **Escopo**: skill finishing-a-development-branch
- **Memória**: Código da sessão já estava em `origin/main`. Restavam 3 arquivos de memória unstaged **em `main`**. A skill pede 4 opções incluindo “merge local”; merge local de docs soltos em `main` fura o fluxo de PR. Correto: branch `docs/…` + PR (#447), não commit direto em `main`.
- **Evidência**: Sessão 2026-09-03 — usuário “sigo sua recomendação” → opção 2.
- **Regra preventiva**: Se HEAD é `main` e o trabalho restante é docs, não oferecer merge local como default. Abrir branch e PR. Worktree da skill permanece para iterar o PR.
- **Confiança**: alta

## 2026-09-03 — npm audit: não usar `--force` no undici do Next

- **Tipo**: Armadilha de dependências
- **Escopo**: `npm audit`, Next.js
- **Memória**: Após bump coordenado do ecossistema `@tiptap/*` (3.24→3.31+) e `npm audit fix`, restou 1 moderate (`undici` transitiva do Next). Fix “oficial” pede `--force` fora do range — risco de quebrar Next. Aceitar residual até upgrade de Next.
- **Evidência**: PR #440; sessão 2026-09-03.
- **Regra preventiva**: Triage audit: (1) `audit fix` sem force, (2) bump coordenado de ecossistemas (tiptap), (3) transitivas do Next — documentar, não forçar.
- **Confiança**: alta

## 2026-07-09 — Diagnóstico de CI pelo nome do job (falso positivo leave_date)

- **Tipo**: Suposição incorreta / diagnóstico preguiçoso
- **Escopo**: CI Database Contract, migrations
- **Memória**: No PR #298 o job "Database Contract" falhou e a hipótese inicial foi "falta leave_date / migration 0030". O log real mostrou: `test:db` (schema) **passou**; a falha estava em `test:integration` com `server-only` (`This module cannot be imported from a Client Component module`) nos smokes de finance/activities/webhooks. Causa: `vitest.integration.config.ts` não aliasava `server-only` (unit config já aliasava).
- **Evidência**: Sessão 2026-07-08/09 — PR #298, run 28983717875; fix em `vitest.integration.config.ts` (commit 7ec7733).
- **Regra preventiva**: Ao falhar o job "Database Contract", ler o log completo e separar `test:db` vs `test:integration`. Não assumir migration/schema só pelo nome do job. Conferir alias de `server-only` em **ambos** os configs Vitest.
- **Confiança**: alta

## 2026-07-09 — Deploy Vercel ≠ migration aplicada no Neon

- **Tipo**: Armadilha operacional (reconfirmada e expandida)
- **Escopo**: Produção, smoke, schema
- **Memória**: Merge na `main` + deploy Vercel Ready **não** aplica migrations Drizzle. App em produção passou a SELECTionar `leave_date` enquanto a coluna ainda não existia no Neon → POST `/app/associados/novo` 500 (`42703 column "leave_date" does not exist`) e smoke #3 falhou no redirect. Sequência correta: merge → **migrate prod com `ALLOW_PRODUCTION_MIGRATIONS=true`** → validar coluna → smoke.
- **Evidência**: Sessão 2026-07-09 — Vercel logs + smoke run 28984631622; migrate via neonctl connection-string + `scripts/guarded-migrate.ts` resolveu.
- **Regra preventiva**: Todo PR com migration + código que usa a coluna exige checklist de pós-merge: (1) migrate no Neon `main`, (2) confirmar coluna/`__drizzle_migrations` count, (3) só então tratar smoke como sinal de go/no-go. Não esperar o smoke para "descobrir" schema atrasado se o log de deploy for claro.
- **Confiança**: alta

## 2026-07-09 — Smoke "CPF já existe" sem CPF no form = blind index de string vazia

- **Tipo**: Bug de domínio + diagnóstico incompleto
- **Escopo**: `buildPiiPatch`, create de associados, smoke prod
- **Memória**: O form envia PII vazia como `''`. `buildPiiPatch` **hasheava e criptografava `''`**, gerando o mesmo `cpf_hash`/`siape_hash` para todo create sem CPF/SIAPE. O 1º smoke passava; o 2º falhava com _Já existe um oficial cadastrado com este CPF_ embora o smoke só preencha `fullName`. Residual `SMOKE_%` agrava, mas a **raiz** era o hash de vazio. Fix (#302): blank/whitespace → clear (sem hash) + `emptyToNull` no create. Evidência: `cpf_hash === siape_hash` no residual; após fix, hashes NULL.
- **Evidência**: Sessão 2026-07-09 — smoke em cascata após #298; PR #302; prod id=6 hashes NULL.
- **Regra preventiva**: (1) Nunca hashear/encryptar PII blank. (2) Em "CPF já existe" no smoke, checar se `cpf_hash`/`siape_hash` estão SET e se são iguais entre campos. (3) Limpar `SMOKE_%` antes de re-run, mas não parar no cleanup se o bug de hash vazio ainda existir no código.
- **Confiança**: alta

## 2026-07-09 — Smoke fail-fast com `.text-red-*` gera falso positivo

- **Tipo**: Armadilha de seletor Playwright
- **Escopo**: `e2e/smoke-prod.spec.ts`
- **Memória**: Fail-fast com `.text-red-700` casou o botão **Remover** de dependentes (sempre visível). O race resolvia `form-error` antes do redirect e falhava o teste **enquanto o create em prod já tinha sucesso**. Só `form [role="alert"]` é seguro.
- **Evidência**: Sessão 2026-07-09 — smoke pós-#302 vermelho; associate id=6 no mesmo segundo; PR #303.
- **Regra preventiva**: Fail-fast de erro de form = `role="alert"` (ou seletor do container de erro), nunca classes de cor reutilizadas em botões. Se smoke falhar com `form-error` e body sem mensagem, checar se o create foi gravado no DB antes de reverter fix de produto.
- **Confiança**: alta

## 2026-07-09 — Smoke residual: SQL de limpeza não auto-executa

- **Tipo**: Armadilha de re-run / estado residual
- **Escopo**: `e2e/smoke-prod.spec.ts`, limpeza pós-smoke
- **Memória**: Após qualquer smoke (verde ou vermelho), residual `SMOKE_%` permanece — o SQL só é impresso no log. Combinar com a memória de hash de string vazia.
- **Evidência**: Sessão 2026-07-09 — cleanup manual via neonctl+psql após runs.
- **Regra preventiva**: Após smoke, executar o SQL impresso e confirmar counts zerados. Não depender só do próximo run “passar”.
- **Confiança**: alta

## 2026-07-09 — Orquestrador não "entrega" CI sem acompanhar até o fim

- **Tipo**: Ajuste de conduta
- **Escopo**: PR babysitting / CI
- **Memória**: Após push de fix de CI, reportar "aguardando re-run" e parar é insuficiente. O usuário espera que o orquestrador **polle** checks (Database Contract, E2E, Smoke), aja em falhas e só encerre com status final (merge/verde ou bloqueio explícito).
- **Evidência**: Sessão 2026-07-09 — "Você, como Orquestrador, é que tem que acompanhar isso, uai".
- **Regra preventiva**: Depois de push que afeta CI, loop de acompanhamento até todos os checks relevantes terminarem; em falha, log + fix + re-push/re-run; em verde, reportar mergeable e executar merge se o plano do usuário incluir "merge quando verde".
- **Confiança**: alta

## 2026-07-09 — Preprocess de FormData que engole validação

- **Tipo**: Bug de design de API de formulário
- **Escopo**: Dependentes no create de associados
- **Memória**: `pairDependentsFromForm` com `if (!name || !relationship) continue` **descartava silenciosamente** linhas parciais; o Zod do schema nunca via o erro. Secretaria perde dado sem feedback. Correto: falhar com mensagem explícita se um lado vier preenchido e o outro vazio; só skip linha totalmente vazia.
- **Evidência**: Code review local 2026-07-08; fix em `src/lib/associates/form-helpers.ts` + testes.
- **Regra preventiva**: Preprocess de FormData não deve "sanitizar para sucesso". Se a regra de negócio exige par de campos, a falha deve ser explícita (throw ou Zod), nunca drop silencioso.
- **Confiança**: alta

## 2026-07-09 — Normalização duplicada action vs service

- **Tipo**: Ambiguidade de contrato
- **Escopo**: `joinedAt` / `leaveDate` em associados
- **Memória**: Action chamava `toJoinedAtTimestamp` e o service chamava de novo (e ainda double-assign no object literal + if). Quem normaliza fica opaco e convida bugs em callers diretos do service.
- **Evidência**: Code review + fix: normalização canônica **só no service**; action repassa raw do form.
- **Regra preventiva**: Para datas de domínio, um único dono de normalização (preferir service). Action só faz parse/emptyToNull genérico se necessário; não ISO-ificar `joinedAt` em duas camadas.
- **Confiança**: alta

## 2026-07-09 — Documentar artefato inexistente no TODO/checklist

- **Tipo**: Honestidade de documentação
- **Escopo**: TODO-PROD / seeds
- **Memória**: TODO citou `scripts/seed-dev-data.ts` que não existia no tree (só `seed-dev.ts`). Checklist operacional com path fantasma engana o próximo agente.
- **Evidência**: Code review 2026-07-08.
- **Regra preventiva**: Antes de marcar item como feito com path de arquivo, `ls`/git path real. Preferir path existente ou criar o módulo de fato.
- **Confiança**: alta

## 2026-06-18 — Não basta mudar schema/UI; seeds e dados sintéticos precisam acompanhar

- **Tipo**: Lacuna de verificação
- **Escopo**: Mudanças de schema em `associates`
- **Memória**: Ao adicionar `retirementDate`, implementei schema, migration, UI, actions, relatórios e testes, mas inicialmente não atualizei os seeds. O banco local ficou com 8 oficiais sintéticos `aposentado` e 0 com `retirement_date`, reduzindo a utilidade do ambiente de desenvolvimento para testar o novo campo.
- **Evidência**: Sessão 2026-06-18 — após `db:seed:dev`, consulta SQL mostrou todos os aposentados sintéticos sem data; corrigido atualizando `scripts/seed-dev.ts` e `scripts/seed-e2e.ts`, depois validado com 8/8 aposentados contendo `retirement_date`.
- **Regra preventiva**: Sempre que um campo novo tiver semântica de domínio observável, atualizar também seed dev, seed E2E e dados de exemplo. Depois de rodar seed, fazer uma consulta SQL simples que valide a distribuição esperada, não apenas confiar que o script executou.
- **Confiança**: alta

## 2026-06-18 — Review com migration untracked deve virar ação operacional completa

- **Tipo**: Ajuste de conduta
- **Escopo**: Code review, deploy e migrations
- **Memória**: Na revisão, o risco importante era o arquivo untracked `drizzle/postgres/0026_add_associate_retirement_date.sql` ficar fora do commit e o deploy usar o campo antes da migration real em produção. O comentário correto não era só "inclua no commit": era garantir commit com migration, aplicar migration em produção antes do deploy, validar coluna e só então publicar o código que lê/escreve o campo.
- **Evidência**: Sessão 2026-06-18 — usuário pediu "Faça tudo isso"; migration 0026 foi aplicada e validada em produção antes do push/deploy do commit `288b51c`.
- **Regra preventiva**: Ao revisar mudanças com nova coluna usada por runtime, tratar deploy ordering como parte do escopo: migration incluída, journal atualizado, backup/rollback point, migration aplicada no banco correto, `test:db` validado e deploy apenas depois. Procurar explicitamente arquivos untracked em `drizzle/postgres/`.
- **Confiança**: alta

## 2026-06-12 — Excesso de repetição antes de pivotar

- **Tipo**: Erro de estratégia
- **Escopo**: Uso de API externa (Jules)
- **Memória**: Enviei 3 rodadas de `sendMessage` para cancelar sessões Jules vendo que o estado não mudava, sem mudar de abordagem. Deveria ter reconhecido a limitação da API e sugerido o web UI ao usuário após a 1ª tentativa sem efeito.
- **Evidência**: Sessão 2026-06-12 — comando de cancel repetido 3x sem efeito nas sessões `IN_PROGRESS`.
- **Regra preventiva**: Se uma API não oferece o endpoint esperado, não insista no mesmo mecanismo. Após 1 tentativa falha sem mudança de estado, pare e reavalie a abordagem com o usuário.
- **Confiança**: alta

## 2026-06-12 — Não investiguei estado real antes de agir

- **Tipo**: Falha de diagnóstico
- **Escopo**: Uso de API externa (Jules)
- **Memória**: Comecei a cancelar sessões Jules sem primeiro inspecionar as `activities` de cada uma para entender o estado real (o que o agente estava fazendo, qual pergunta havia feito ao usuário). Só fui ver as activities depois de múltiplas tentativas de cancel.
- **Evidência**: Sessão 2026-06-12 — as activities mostravam que os agentes estavam `AWAITING_USER_FEEDBACK` com perguntas específicas, e minha resposta genérica de "cancel" foi tratada como nova tarefa.
- **Regra preventiva**: Antes de interagir com um agente/sistema externo, investigue o estado atual via o endpoint de activities/logs correspondente. Isso evita enviar comandos ineficazes.
- **Confiança**: alta

## 2026-06-12 — Dependência excessiva de API sem fallback

- **Tipo**: Suposição incorreta
- **Escopo**: Uso de API externa (Jules)
- **Memória**: Assumi que a API Jules teria um endpoint de cancelamento de sessões ou que `sendMessage` seria suficiente. Não validei essa suposição verificando a documentação completa antes de começar a executar comandos com o usuário.
- **Evidência**: Sessão 2026-06-12 — a API v1alpha expõe apenas `create`, `get`, `list`, `sendMessage`, `approvePlan`. Sem `delete`, `cancel` ou `pause`.
- **Regra preventiva**: Antes de iniciar uma operação com API externa, verifique se o endpoint existe e se o comportamento é o esperado. Se não existir, comunique a limitação ao usuário imediatamente e proponha alternativas.
- **Confiança**: média

## 2026-06-12 — Git não autorizado por default

- **Tipo**: Erro de validação
- **Escopo**: Comandos git fora do sandbox
- **Memória**: O primeiro `git branch -d` ficou pendente por 386s aguardando aprovação. O usuário explicitou após o aborto que `uv`, `npm` e `gh` estão autorizados por default, mas `git` não estava incluído.
- **Evidência**: Comando abortado após 386.8s, usuário precisou intervir manualmente.
- **Regra preventiva**: Sempre solicitar aprovação explícita para comandos `git` que alteram o repositório (commit, push, branch -d, merge, reset). Não assumir que git está autorizado por default.
- **Confiança**: alta

## 2026-06-12 — Skip de commit durante rebase baseado em diff enganoso

- **Tipo**: Erro de estratégia
- **Escopo**: Git rebase com conflito
- **Memória**: Durante rebase, pulei o commit f7392fa porque `git diff origin/main HEAD -- schema.integration.test.ts` mostrou diferença zero, assumindo que o commit era redundante. Na verdade, ambos (origin/main e HEAD pré-rebase) tinham os mesmos valores **errados** — o commit pulado continha os valores **corretos**. Resultado: CI Database Contract falhou com 3 asserções. Tive que restaurar o arquivo do commit pulado e fazer novo commit.
- **Evidência**: Sessão 2026-06-12 — CI falhou com `expected [ Array(4) ] to deeply equal [ 'high', 'low', 'medium', 'urgent' ]` (activity_priority enum) e outras divergências de schema.
- **Regra preventiva**: Ao avaliar se um commit conflitante é redundante durante rebase, comparar o **conteúdo do commit** (`git show <hash>:<file>`) contra o resultado desejado, não apenas HEAD vs origin/main. Se o commit é um fix/teste de contrato, verificar se os valores corrigidos ainda estão presentes após resolução.
- **Confiança**: alta

## 2026-06-15 — Ignorar instrução explícita do usuário sobre VPS

- **Tipo**: Excesso de autonomia / esquecimento de instrução
- **Escopo**: Operações com VPS legada
- **Memória**: O usuário havia dito explicitamente "Não vamos mexer na outra VPS". Ainda assim, incluí rotação de credenciais da VPS 177.73.68.45 como item #1 do roadmap de próximos passos. O usuário precisou corrigir: "Se você já pegou os dados do relatório ao ler ele no chrome, porque ainda precisaria da VPS?"
- **Evidência**: Sessão 2026-06-15 — roadmap proposto com "Rotacionar credenciais VPS" como P0; usuário rejeitou e apontou que os dados web já eram suficientes.
- **Regra preventiva**: Quando o usuário diz "não vamos mexer em X", não incluir X em nenhum plano, roadmap ou lista de próximos passos. Se o objetivo já foi alcançado por outra via (ex: dados extraídos via web), reconhecer isso e simplificar o plano em vez de manter passos obsoletos.
- **Confiança**: alta

## 2026-06-15 — Tentativas repetidas com neonctl sem verificar compatibilidade com Vercel

- **Tipo**: Falha de validação / insistência ineficaz
- **Escopo**: Neon CLI (neonctl) com projeto Vercel-managed
- **Memória**: Tentei `neonctl projects list` repetidas vezes (printf, heredoc, script, expect) tentando bypassar o prompt interativo de org. Perdi ~10 turnos sem verificar que projetos Vercel-managed exigem `org_id` no header da API (retorna HTTP 400 sem ele). Só funcionou quando usei Node.js + Neon API com `?org_id=...`.
- **Evidência**: Sessão 2026-06-15 — múltiplos comandos neonctl falharam com prompt interativo; API retornou `{"message":"org_id is required"}`.
- **Regra preventiva**: Para projetos Neon conectados via Vercel Storage Integration, `neonctl` requer org_id. Se a CLI interativa não funciona em headless, usar a API REST direta (Node.js + `https.get`) com `?org_id=<org_id>` como fallback imediato. Não gastar mais de 2 tentativas com prompts interativos.
- **Confiança**: alta

## 2026-06-15 — Checkbox HTML envia "on", não "true" — Zod rejeita

- **Tipo**: Bug de validação
- **Escopo**: Formulários com checkbox + Zod schema
- **Memória**: Checkbox `<input type="checkbox">` sem `value` attribute envia a string `"on"` quando marcado, não `"true"`. O Zod schema para `ceocMember`/`caocMember` aceitava `z.boolean()`, `z.literal('true')`, `z.literal('false')`, `z.literal('')`, `z.null()` — mas NÃO `z.literal('on')`. Resultado: submit do formulário falhava com erro de validação. Autoreview capturou como P0.
- **Evidência**: Sessão 2026-06-15 — autoreview encontrou P0 "Checkbox 'on' value not handled". Corrigido adicionando `value="true"` nos checkbox inputs.
- **Regra preventiva**: Sempre adicionar `value="true"` em `<input type="checkbox">` quando o backend espera boolean. Nunca confiar no valor padrão "on" do browser. Testar submissão de formulário com checkbox marcado como parte do fluxo de verificação.
- **Confiança**: alta

## 2026-06-15 — Nullable enum select com "Selecione..." precisa `.or(z.literal(''))` no Zod

- **Tipo**: Padrão de validação
- **Escopo**: Zod schemas para enums com opção vazia
- **Memória**: Selects com `<option value="">Selecione...</option>` enviam string vazia `""`. O Zod schema `z.enum(values).nullable().optional()` rejeita `""`. O padrão correto é `z.enum(values).nullable().or(z.literal('')).optional()` com conversão `data.field === '' ? null : data.field` no server action. O campo `paymentMethod` foi implementado sem `.or(z.literal(''))` e sem a conversão de empty string, enquanto `sex`, `maritalStatus`, `missionType`, `careerOrigin` estavam corretos. Inconsistência detectada pelo autoreview.
- **Evidência**: Sessão 2026-06-15 — autoreview P1 em `paymentMethod`. Corrigido adicionando `.or(z.literal(''))` e `const paymentMethod = data.paymentMethod === '' ? null : data.paymentMethod`.
- **Regra preventiva**: Para todo enum select com default "Selecione..." (value=""), usar `.or(z.literal(''))` no Zod E `=== '' ? null : value` no action. Verificar consistência entre todos os campos enum no mesmo formulário.
- **Confiança**: alta

## 2026-06-15 — Assumir Free Tier sem branching sem verificar

- **Tipo**: Suposição incorreta
- **Escopo**: Neon PostgreSQL Free Tier
- **Memória**: Documentei que o Free Tier "sem branching (só main)" e propus estratégia de migration sem branching. Na verdade, `neonctl branch create --schema-only` funcionou perfeitamente no Free Tier. A limitação real é que o Free Tier tem PITR de apenas 6h e limites de compute, não ausência de branching.
- **Evidência**: Sessão 2026-06-15 — `neonctl branch create --name "dev/migration-test" --schema-only` criou branch com sucesso.
- **Regra preventiva**: Não assumir limitações do plano Free sem testar. Neon Free Tier suporta branching (incluindo schema-only). A limitação real é PITR de 6h (não 24h), não branching.
- **Confiança**: alta

## 2026-06-15 — `??` não captura empty string em campos date

- **Tipo**: Erro de validação
- **Escopo**: Zod schemas com `.or(z.literal(''))` para campos date
- **Memória**: Campos de data (`birthDate`, `rgExpeditionDate`, `assignmentStartDate`, etc.) usam Zod schema `.or(z.literal(''))` para aceitar selects vazios com value="". No action, `data.field ?? null` NÃO converte `''` para `null` porque `??` só trata `null`/`undefined`. O PostgreSQL rejeita `''` como `invalid input syntax for type date` (erro 22007).
- **Evidência**: Sessão 2026-06-15 — E2E "updates associate and redirects to profile" falhou com `PostgresError 22007: invalid input syntax for type date: ""`. Corrigido com `emptyToNull(v) = v === '' ? null : v ?? null`.
- **Regra preventiva**: Para todo campo que passa por `.or(z.literal(''))` no Zod, usar `=== '' ? null : value ?? null` no action, não `?? null` sozinho. Verificar especialmente campos date e enums.
- **Confiança**: alta

## 2026-06-15 — `Number(formData.get())` produz NaN e quebra WHERE clause

- **Tipo**: Erro de validação
- **Escopo**: Server actions com campos ocultos (associateId)
- **Memória**: `editDependentAction` e `editHealthAgreementAction` extraíam `associateId` manualmente com `Number(formData.get('associateId'))`. Quando o campo estava ausente, vazio ou malformado, `NaN` era passado para `eq(dependents.associateId, NaN)`, que nunca corresponde, causando update silencioso no-op.
- **Evidência**: Sessão 2026-06-15 — autoreview P2. Corrigido incluindo `associateId` no Zod schema (`z.coerce.number().int().positive()`) e desestruturando do objeto parseado.
- **Regra preventiva**: Nunca usar `Number()` direto em `formData.get()`. Sempre incluir campos numéricos no Zod schema com `z.coerce.number()` e desestruturar do resultado parseado.
- **Confiança**: alta

## 2026-06-15 — `git fetch --prune` removendo branches = já mergeados no GitHub

- **Tipo**: Suposição incorreta
- **Escopo**: Git workflow / análise de branches
- **Memória**: Ao analisar branches para merge/fix/delete, `git fetch --prune` removeu todos os branches remoto exceto `main` e `cancel-session`. Isso significa que eles já foram mergeados/deletados no GitHub. Não precisava de merge adicional.
- **Evidência**: Sessão 2026-06-15 — `git branch -r` mostrou apenas `origin/main` e `origin/cancel-session-...` após prune. `gh pr list --state open` retornou `[]`.
- **Regra preventiva**: Antes de propor merge/fix/delete de branches, fazer `git fetch --prune origin` e verificar se os branches ainda existem em `origin/`. Se sumiram, já estão mergeados.
- **Confiança**: alta

## 2026-06-15 — Cherry-pick abortado porque arquivo-alvo não existe mais

- **Tipo**: Falha de validação
- **Escopo**: Git cherry-pick de fix de branch obsoleto
- **Memória**: O branch `cancel-session` continha fix para `find_unused.sh`. Ao tentar cherry-pick `5a15e87` para `main`, ocorreu `CONFLICT (modify/delete): find_unused.sh deleted in HEAD and modified in`. O arquivo foi removido do repo em merge anterior, tornando o fix obsoleto.
- **Evidência**: Sessão 2026-06-15 — `git cherry-pick --abort` necessário. `find . -name find_unused.sh` retornou vazio.
- **Regra preventiva**: Antes de cherry-pick de um fix de branch antigo, verificar se o arquivo-alvo ainda existe no HEAD atual (`find` ou `git show HEAD:path`). Se foi removido, o fix é obsoleto — abortar e registrar.
- **Confiança**: alta
