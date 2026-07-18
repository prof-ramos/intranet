# Plano 060: Vincular o smoke ao deployment esperado e impedir mutações em todo push

> **Instruções ao executor**: preserve o nome do job protegido `Smoke Test —
Production`. O caminho de push para `main` deve ser somente leitura. Mutações
> de produção só podem ocorrer em `workflow_dispatch` com input booleano
> explícito e continuam exigindo a limpeza controlada do Plano 057.
>
> **Verificação de drift**:
> `git diff --stat 14dae8f..HEAD -- .github/workflows/ci.yml e2e/smoke-prod.spec.ts playwright.smoke.config.ts src/app/api/v1/health/route.ts src/app/api/v1/health/route.test.ts TODO-PROD.md docs/runbook.md docs/release-1-operational-go-live.md docs/environments.md`

## Status

- **Prioridade**: P1
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: Plano 057 para zerar resíduos existentes
- **Categoria**: bug / tests / operação
- **Planejado em**: `main` commit `14dae8f`, 2026-07-18

## Por que isso importa

O job atual roda dez testes mutantes em todo push de `main`, mas o teardown
apenas imprime SQL; assim cada deploy deixa novos registros. O job também começa
sem provar que `intranet.asof.com.br` já aponta para o SHA que o acionou, podendo
validar a versão anterior. A solução deve manter um smoke contínuo read-only,
reservar mutações para janela manual e falhar antes delas quando o SHA divergir.

## Estado atual

- `.github/workflows/ci.yml:124-160` executa smoke em push ou dispatch, após
  build/E2E do repo, sem aguardar/identificar o deployment Vercel.
- `e2e/smoke-prod.spec.ts:134-306` cria associado, atividade, consulta e ofício.
- `e2e/smoke-prod.spec.ts:356-388` somente imprime SQL por prefixo amplo.
- `src/app/api/v1/health/route.ts:41-54` retorna saúde/capacidades, não o SHA.
- A documentação atual da Vercel informa que
  `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` contém o SHA completo no build/runtime de
  Next.js quando System Environment Variables estão habilitadas no projeto.
- ADR 009 exige janela controlada e limpeza SQL antes da liberação; não autoriza
  credencial de banco permanente no GitHub Actions.

## Comandos necessários

| Finalidade            | Comando                                                                          | Resultado esperado                            |
| --------------------- | -------------------------------------------------------------------------------- | --------------------------------------------- |
| Health                | `npx vitest run src/app/api/v1/health/route.test.ts`                             | todos passam                                  |
| Smoke local read-only | `SMOKE_EXPECTED_COMMIT_SHA=<sha> SMOKE_ALLOW_MUTATIONS=false npm run smoke:prod` | testes read-only passam; mutantes são skipped |
| Docs                  | `npm run docs:check`                                                             | exit 0                                        |
| Gate                  | `npm run pr:check`                                                               | exit 0                                        |

## Referência atual

- Vercel System Environment Variables:
  `https://vercel.com/docs/environment-variables/system-environment-variables`.
- Vercel Framework Environment Variables:
  `https://vercel.com/docs/environment-variables/framework-environment-variables`.

## Escopo

**Dentro do escopo**:

- `.github/workflows/ci.yml` sem renomear jobs protegidos.
- `e2e/smoke-prod.spec.ts`, `playwright.smoke.config.ts`.
- `src/app/api/v1/health/route.ts` e teste.
- `TODO-PROD.md`, `docs/runbook.md`, `docs/environments.md` e
  `docs/release-1-operational-go-live.md` somente para o contrato do smoke.
- `advisor-plans/README.md`.

**Fora do escopo**:

- Adicionar `DATABASE_MIGRATION_URL` ou credencial de banco ao GitHub Actions.
- Limpar produção automaticamente por endpoint HTTP novo.
- Tornar o health público ou expor mensagens/autor/branch do commit.
- Executar mutações ou limpeza produtiva durante implementação local.

## Fluxo Git

- Branch: `advisor/060-bind-and-contain-production-smoke`.
- Commits: `test(smoke): bind production checks to deployment sha` e
  `ci(smoke): make push validation read-only`.
- A execução integral já autoriza publicação. Smoke mutante continua condicionado
  ao input booleano explícito e ao run ID definidos neste plano.

## Etapas

### Etapa 1: Expor somente o SHA no health autenticado

Adicione `deployment.gitCommitSha`, obtido de
`NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`, ao payload autenticado. Normalize como SHA
hexadecimal completo ou `null`; não exponha mensagem, autor, branch ou envs.
Teste valor válido, ausência e valor malformado.

**Verificar**: `npx vitest run src/app/api/v1/health/route.test.ts` passa.

### Etapa 2: Fazer o primeiro teste aguardar o SHA esperado

Exija `SMOKE_EXPECTED_COMMIT_SHA` no CI. Após login, o primeiro teste serial deve
consultar `/api/v1/health` com a mesma sessão e repetir com backoff limitado até
o SHA ser exatamente igual. Em timeout, falhe mostrando apenas SHA esperado e
observado. Por estar antes dos demais em modo serial, nenhuma mutação pode começar
quando o deployment ainda é antigo.

**Verificar**: teste controlado com SHA divergente falha antes de criar dados;
SHA igual prossegue.

### Etapa 3: Separar smoke read-only de smoke mutante

Introduza `SMOKE_ALLOW_MUTATIONS`, default `false`. Login, health/SHA, dashboard,
financeiro read-only e abertura da central continuam em todo push. Cadastro de
associado, atividade, consulta, ofício e reset de senha devem usar skip
declarativo quando a flag não for `true`.

**Verificar**: execução com `false` não contém títulos `SMOKE_` e reporta os
testes mutantes como skipped, não passed.

### Etapa 4: Tornar a janela mutante explícita e run-scoped

Adicione input booleano `production_mutations` ao `workflow_dispatch`, default
false. Passe `SMOKE_ALLOW_MUTATIONS=true` somente quando esse input for verdadeiro.
Para mutações, exija `SMOKE_RUN_ID` derivado de `github.run_id` e
`github.run_attempt`; incorpore-o a todos os marcadores e ao SQL impresso para
evitar apagar execuções alheias.

**Verificar**: YAML parseia; push comum define false; dispatch default define
false; apenas dispatch explicitamente verdadeiro habilita mutações.

### Etapa 5: Configurar CI e timeout de deployment

Passe `SMOKE_EXPECTED_COMMIT_SHA=${{ github.sha }}` e o run ID. Ajuste timeout do
job/teste para comportar a espera limitada pelo deployment sem exceder o job.
Confirme no projeto Vercel que System Environment Variables estão habilitadas;
isso é configuração externa read-only neste plano.

**Verificar**: um run de main mostra SHA esperado = observado antes dos módulos.

### Etapa 6: Corrigir o contrato documental

Documente que push é read-only, dispatch mutante é excepcional, limpeza continua
manual/obrigatória e o job valida SHA. Remova alegações de “limpeza automática”.

**Verificar**: `rg -n "limpeza automática|script garante a limpeza" TODO-PROD.md docs` não encontra afirmações falsas; `npm run docs:check` passa.

### Etapa 7: Rodar gates

Execute teste focado, lint, typecheck, unitários, build e `npm run pr:check`.

## Plano de testes

- Health autenticado retorna SHA válido ou null, sem outros metadados Git.
- SHA divergente impede todos os testes posteriores.
- Push/default dispatch executam apenas subset read-only.
- Dispatch booleano verdadeiro habilita mutações com prefixo run-scoped.
- Credenciais ausentes e System Env desabilitada falham com diagnóstico seguro.

## Critérios de conclusão

- [ ] Todo smoke prova o SHA antes de testar funcionalidades.
- [ ] Push de main não grava dados.
- [ ] Mutações exigem dispatch + input explícito + run ID.
- [ ] Nenhuma credencial de banco foi adicionada ao Actions.
- [ ] Documentação descreve limpeza manual com precisão.
- [ ] Gates oficiais passam.

## Condições de STOP

- System Environment Variables não podem ser habilitadas no projeto Vercel.
- O SHA do deployment não corresponde ao SHA de main por uma transformação não
  documentada; não aceite prefixo ou “último sucesso” como substituto.
- Separar testes exige tornar o health público ou adicionar credencial nova.
- O workflow protegido precisaria ser renomeado.

## Notas de manutenção

O SHA é identificador, não secret. Se o provider mudar a variável, atualize o
health e o teste juntos, citando documentação atual. A limpeza de uma execução
mutante continua pertencendo ao Plano 057.
