# Plano 039: Separar o redirect do tratamento de erros no login

> **Instruções ao executor**: siga cada etapa e comando. Em uma condição de
> STOP, pare e reporte; não improvise. Ao final, atualize o status em
> `advisor-plans/README.md`.
>
> **Verificação de drift (primeiro comando)**:
> `git diff e0be30d..HEAD -- src/app/login/actions.ts src/app/login/actions.test.ts src/lib/auth/session.ts src/lib/auth/login-rate-limit.ts`
> Compare o fluxo de sucesso com o estado abaixo e pare em caso de divergência
> semântica. Se o próprio arquivo deste plano (`advisor-plans/039-login-redirect-session-error-boundary.md`)
> for a única diferença, prossiga normalmente.

## Status

- **Prioridade**: P1
- **Esforço**: S
- **Risco**: BAIXO
- **Depende de**: nenhum
- **Categoria**: bug
- **Planejado em**: commit `e0be30d`, 2026-07-14

## Por que isso importa

No App Router, `redirect()` encerra o fluxo lançando um erro interno do Next.js.
O login o chama dentro do mesmo `try` que cobre reset do rate limit e criação de
sessão. Assim, o sucesso normal é capturado e registrado como falha de reset
antes de um segundo redirect. O mesmo `catch` engole falha real de
`createSession` e ainda direciona para `/app`, embora a sessão possa não existir.

## Estado atual

```ts
// src/app/login/actions.ts:118-129
try {
  await loginRateLimiter.reset(email);
  await createSession({ userId: user.id, email: user.email });
  return redirect(user.mustChangePassword ? '/change-password' : '/app');
} catch (error) {
  logger.warn('[Login] Rate-limit reset failed after successful login.', ...);
}
redirect(user.mustChangePassword ? '/change-password' : '/app');
```

- `actions.test.ts:50-53` simula corretamente `redirect` como throw.
- Testes de sucesso conferem destino, mas não que a chamada ocorreu uma vez.
- A documentação do Next.js 16 determina `redirect()` fora de `try/catch`.
- Reset do rate limit é best-effort após autenticação válida; criação de sessão
  não é, pois estabelece o estado autenticado.
- `/login?error=1` já é o destino genérico de falha; não exponha detalhes da
  sessão ao usuário.

## Comandos necessários

| Finalidade | Comando | Resultado esperado |
| --- | --- | --- |
| Teste focado | `npx vitest run src/app/login/actions.test.ts` | todos passam |
| Testes auth | `npx vitest run src/lib/auth` | todos passam |
| Gate completo | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0, nessa ordem |

## Ferramentas sugeridas ao executor

- Consulte os guias oficiais do Next.js 16 sobre `redirect` e autenticação. A
  regra é manter `redirect()` fora de `try/catch`; `unstable_rethrow` é
  desnecessário quando a estrutura pode ser corrigida diretamente.

## Escopo

**Dentro do escopo**:

- `src/app/login/actions.ts`
- `src/app/login/actions.test.ts`
- `advisor-plans/README.md` apenas para status

**Fora do escopo**:

- Credenciais, hash de senha e autenticação principal.
- Formato/duração de cookie e sessão.
- Política, limites ou storage do rate limiter.
- UI/copy do login.
- Migração para `defineFormAction`; login é holdout intencional.
- Adicionar `unstable_rethrow` quando mover redirect resolve o problema.

## Fluxo Git

- Branch: `advisor/039-login-redirect-session-error-boundary`
- Commit sugerido: `fix(auth): separate login redirect from fallible setup`
- Não faça push nem abra PR sem instrução.

## Etapas

### Etapa 1: Isolar o reset best-effort

Mantenha `loginRateLimiter.reset(email)` em `try/catch` estreito. Na falha,
registre somente o evento sanitizado `login_rate_limit_reset_failed` sem email,
senha, userId, IP, metadados, mensagens de erro, objetos Error ou objetos de
usuário. Continue para criar a sessão.

**Verificar**: teste com reset rejeitado ainda cria sessão e chama o destino de
sucesso exatamente uma vez. Teste confirma os argumentos exatos do logger:
apenas `login_rate_limit_reset_failed`, sem dados sensíveis.

### Etapa 2: Tornar criação de sessão condição obrigatória

Defina o contrato de falha de `createSession`: o erro é tratado genericamente
(redirect para `/login?error=1`), sem expor detalhes. A saída é:
- `redirect('/login?error=1')` chamado exatamente uma vez;
- nenhum destino autenticado (`/app` ou `/change-password`) é alcançado;
- log contém apenas `session_creation_failed`, sem email, userId, IP, metadados,
  mensagens de erro, objetos Error ou objetos de usuário.

Chame `createSession` fora do catch de reset. Trate sua falha separadamente:

- registre somente o evento `session_creation_failed` com os mesmos critérios de
  allowlist do reset;
- redirect para `/login?error=1` — nunca continuar para `/app` ou
  `/change-password`.

Se usar o redirect genérico, faça-o após o catch de sessão ou retorne um estado
e ramifique fora do catch. Não coloque `redirect()` em bloco que possa capturar
o próprio controle de fluxo.

**Verificar**: `createSession` rejeitado não chama destino autenticado.
Testes verificam os argumentos exatos do logger: apenas `session_creation_failed`
e campos fixos não sensíveis. Nenhum email, senha, secret de sessão ou erro
bruto aparece no log.

### Etapa 3: Colocar o redirect de sucesso por último

Depois da sessão criada, calcule o destino uma vez e chame
`redirect(destination)` como última instrução, fora de todos os `try/catch`. Não
use `return`; `redirect` tem tipo `never`.

**Verificar**: sucesso comum e troca obrigatória de senha usam
`toHaveBeenCalledTimes(1)` e o destino exato. Sucesso normal não gera warning.

### Etapa 4: Fortalecer regressões

Adicione/ajuste casos:

- sucesso → sessão criada, um redirect `/app`, sem warning;
- troca obrigatória → um redirect `/change-password`;
- falha do reset → sessão criada, um redirect de sucesso, um warning;
- falha da sessão → nenhum destino autenticado, tratamento genérico uma vez;
- credencial inválida e rate limit permanecem iguais.

Mantenha o mock de redirect como função que lança; não o enfraqueça.

**Verificar**: teste focado passa e falharia contra a estrutura original.

### Etapa 5: Rodar gates oficiais

Rode testes de auth e a sequência oficial. Revise o diff contra log de PII.

**Verificar**: todos passam; apenas os dois arquivos fonte/teste e o índice
mudaram.

## Plano de testes

- Contagem/destino do redirect nos dois sucessos.
- Falha de reset é não fatal e corretamente rotulada.
- Falha de sessão não alcança destino autenticado.
- Nenhum email, senha, secret de sessão ou erro bruto aparece no log.
- Falhas e lockout existentes continuam verdes.

## Critérios de conclusão

- [ ] Redirect de sucesso está fora de todos os `try/catch`.
- [ ] Login bem-sucedido chama redirect uma vez.
- [ ] Falha do reset não impede criação de sessão.
- [ ] Falha de sessão nunca direciona para área autenticada.
- [ ] Logs distinguem reset/sessão e permanecem sanitizados.
- [ ] Testes focados e gates completos passam.
- [ ] `advisor-plans/README.md` foi atualizado.

## Condições de STOP

- Next.js ou wrapper local não usa mais redirect como controle por throw.
- Produto exige erro específico de sessão em vez do erro genérico.
- A correção exige alterar cookie/sessão internamente.
- Testes existentes demonstram que dois redirects são intencionais.
- Um gate falha duas vezes após correção razoável.

## Notas de manutenção

Operações falíveis futuras após autenticação devem terminar antes do redirect ou
ter boundary estreito próprio. Prefira estruturar o redirect fora dos catches a
capturá-lo e chamar `unstable_rethrow`; é mais simples de revisar e testar.
