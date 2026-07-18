# Plano 058: Revogar sessões em toda troca de senha e bloquear sessões de rotação nas APIs

> **Instruções ao executor**: implemente primeiro os testes de regressão. A troca
> de senha própria deve encerrar a sessão atual de forma explícita; não tente
> preservar silenciosamente o cookie antigo depois de incrementar a versão.
>
> **Verificação de drift**:
> `git diff --stat 14dae8f..HEAD -- src/lib/auth/service.ts src/lib/auth/service.test.ts src/app/change-password/actions.ts src/app/change-password/actions.test.ts src/lib/integrations/verify-request.ts src/lib/integrations/verify-request.test.ts`

## Status

- **Prioridade**: P1
- **Esforço**: S
- **Risco**: MÉDIO
- **Depende de**: nenhum
- **Categoria**: security / bug
- **Planejado em**: `main` commit `14dae8f`, 2026-07-18

## Por que isso importa

Sessões duram até oito horas e são invalidadas por `admins.session_version`.
Hoje a troca própria e o reset administrativo alteram o hash sem incrementar a
versão, permitindo que cookies anteriores continuem válidos. A autenticação de
integrações por sessão também ignora `must_change_password`, contornando a
restrição aplicada às páginas e Server Actions.

## Estado atual

- `src/lib/auth/service.ts:155-164` atualiza senha própria sem `sessionVersion`.
- `src/lib/auth/service.ts:205-213` faz o mesmo no reset administrativo.
- `src/lib/auth/password-reset.ts:285-293` é o exemplar correto: incrementa
  `sessionVersion` atomicamente com o hash.
- `src/lib/auth/session.ts:173-175` rejeita cookies de versão antiga.
- `src/lib/integrations/verify-request.ts:346-369` aceita qualquer sessão ativa
  com role permitida, mesmo quando `mustChangePassword` é verdadeiro.
- `src/app/change-password/actions.ts:50-67` redireciona para `/app` e não destrói
  a sessão após a troca.

## Comandos necessários

| Finalidade  | Comando                                                                                                            | Resultado esperado |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------ |
| Auth        | `npx vitest run src/lib/auth/service.test.ts src/app/change-password/actions.test.ts src/lib/auth/session.test.ts` | todos passam       |
| Integrações | `npx vitest run src/lib/integrations/verify-request.test.ts`                                                       | todos passam       |
| Gate        | `npm run validate:quick`                                                                                           | exit 0             |

## Escopo

**Dentro do escopo**:

- `src/lib/auth/service.ts`, `src/lib/auth/service.test.ts`.
- `src/app/change-password/actions.ts`, `src/app/change-password/actions.test.ts`.
- `src/lib/integrations/verify-request.ts` e teste correspondente.
- `advisor-plans/README.md`.

**Fora do escopo**:

- Substituir o mecanismo de cookie/sessão.
- Alterar duração da sessão, bcrypt, fluxo por token ou política de senha.
- Remover o reset administrativo com senha temporária; esse sunset é direção
  posterior e não deve ampliar este PR.

## Fluxo Git

- Branch: `advisor/058-revoke-sessions-on-password-change`.
- Commit: `fix(auth): revoke sessions after password changes`.
- Não publique sem autorização.

## Etapas

### Etapa 1: Escrever testes vermelhos de revogação

Nos testes do serviço, exija que os updates de `changePassword` e
`resetPassword` incluam `sessionVersion = sessionVersion + 1` no mesmo `.set()`
do hash. Preserve as asserções de `mustChangePassword` atuais.

**Verificar**: os dois novos testes falham contra `14dae8f` pela ausência do
incremento, enquanto os testes preexistentes continuam verdes.

### Etapa 2: Incrementar a versão atomicamente

Adote nos dois updates o mesmo padrão SQL já usado em `password-reset.ts:290`.
Não faça uma segunda query e não incremente se validação/bcrypt falhar.

**Verificar**: `npx vitest run src/lib/auth/service.test.ts` passa.

### Etapa 3: Encerrar explicitamente a sessão da troca própria

Após sucesso do serviço, chame `destroySession()` e redirecione para
`/login?reset=success`, estado já suportado por `src/app/login/page.tsx`, sem
incluir e-mail ou senha na URL. Separe o `try/catch` do serviço daquele da
destruição para não capturar `NEXT_REDIRECT`. Se destruir o cookie falhar depois
do commit, registre erro sanitizado e ainda redirecione ao login de sucesso: a
versão antiga já está inválida e reportar falha incentivaria retry com senha que
deixou de ser atual.

**Verificar**: `npx vitest run src/app/change-password/actions.test.ts` passa e
nenhuma asserção espera redirect para `/app` após sucesso.

### Etapa 4: Bloquear sessão com troca obrigatória nas APIs

Em `getAuthorizedSessionPrincipal`, retorne 403 antes do teste de role quando
`session.mustChangePassword` for verdadeiro. Exponha handles hoisted para os
mocks hoje opacos de `getSession`/`canAccessRole` e crie do zero casos para admin
com troca obrigatória, admin normal e credencial M2M válida. O primeiro deve
provar que o helper de role nem foi chamado; API keys não podem ser bloqueadas.

**Verificar**: `npx vitest run src/lib/integrations/verify-request.test.ts` passa.

### Etapa 5: Rodar gates

Execute os testes focados e `npm run validate:quick`.

## Plano de testes

- Troca própria incrementa versão e encerra o cookie atual.
- Reset administrativo incrementa versão e mantém `mustChangePassword=true`.
- Senha atual inválida não incrementa versão.
- Sessão `mustChangePassword=true` recebe 403 numa rota de integração.
- Sessão normal e API key M2M preservam o comportamento existente.

## Critérios de conclusão

- [ ] Todos os três fluxos de senha incrementam `sessionVersion`.
- [ ] A troca própria termina em login explícito, não em sessão inválida oculta.
- [ ] APIs por sessão respeitam `mustChangePassword`.
- [ ] Testes focados e `npm run validate:quick` passam.
- [ ] Nenhum arquivo fora do escopo foi alterado.

## Condições de STOP

- Preservar a sessão atual exigir um novo formato de cookie ou autenticação
  paralela; use logout explícito conforme o plano.
- O reset administrativo possuir consumidor que dependa da sessão antiga.
- A mudança passar a bloquear autenticação M2M por API key.

## Notas de manutenção

Qualquer novo fluxo que persista `passwordHash` deve incrementar
`sessionVersion` na mesma operação. O revisor deve procurar updates de senha sem
essa dupla mutação.
