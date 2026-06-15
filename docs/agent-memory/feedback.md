# Feedback do Agente — Erros e Ajustes de Conduta

> Registro de erros cometidos pelo agente, falhas de interpretação, comandos inadequados e ajustes de conduta para evitar repetição.

---

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
