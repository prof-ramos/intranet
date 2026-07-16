# Plano 040: Alinhar as Server Actions do Jurídico à fronteira de roles

> **Instruções ao executor**: siga cada etapa e rode as verificações indicadas.
> Pare nas condições de STOP; não amplie o escopo. Ao concluir, atualize apenas
> a linha deste plano em `advisor-plans/README.md`, salvo orientação do revisor.
>
> **Verificação de drift (primeiro comando)**:
> `git diff --stat f6cb73e..HEAD -- src/app/app/juridico/actions.ts src/app/app/juridico/actions.test.ts src/app/app/juridico/layout.tsx src/lib/server-actions/define-form-action.ts`
> Se `actions.ts`, o factory ou a regra de layout mudaram semanticamente, compare
> com os trechos abaixo e pare antes de editar.

## Status

- **Prioridade**: P1
- **Esforço**: S
- **Risco**: BAIXO
- **Depende de**: nenhum
- **Categoria**: segurança
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

O layout do Jurídico bloqueia `secretaria`, mas layout não é uma fronteira de
autorização para Server Actions. As três mutações aceitam explicitamente essa
role e podem ser invocadas sem navegar pelo layout. O resultado é autorização
de escrita mais ampla que a política institucional registrada em `CONTEXT.md`.

## Estado atual

- `CONTEXT.md:328`: somente `admin` e `diretoria` acessam o Jurídico;
  `secretaria` é bloqueada.
- `src/app/app/juridico/layout.tsx:3-5` aplica
  `requireRole(['admin', 'diretoria'])`.
- `src/app/app/juridico/actions.ts:16-18`, `35-37` e `49-51` usam hoje:

```ts
auth: ['admin', 'diretoria', 'secretaria'],
```

- `src/lib/server-actions/define-form-action.ts:46-50,77-88` delega exatamente
  o array `auth` a `requireRole`; não existe outra checagem implícita.
- Exemplo a seguir: `src/app/app/financeiro/mensalidades/actions.ts:34-36`
  usa `auth: ['admin', 'diretoria']` na própria action.

## Comandos necessários

| Finalidade   | Comando                                               | Resultado esperado |
| ------------ | ----------------------------------------------------- | ------------------ |
| Teste focado | `npx vitest run src/app/app/juridico/actions.test.ts` | todos passam       |
| Lint         | `npm run lint`                                        | exit 0             |
| Tipos        | `npm run typecheck`                                   | exit 0             |
| Unitários    | `npm run test`                                        | todos passam       |
| Gate final   | `npm run test:db && npm run build`                    | exit 0 na ordem    |

## Escopo

**Dentro do escopo**:

- `src/app/app/juridico/actions.ts`
- `src/app/app/juridico/actions.test.ts`
- `advisor-plans/README.md` apenas para status

**Fora do escopo**:

- Layout, services, schemas ou permissões de outros módulos.
- Alterar a política de acesso descrita em `CONTEXT.md`.
- Criar permissão parcial para `secretaria`; isso exige decisão de produto.

## Fluxo Git

- Branch sugerida: `advisor/040-juridico-action-role-boundary`
- Commit sugerido: `fix(auth): enforce juridico role boundary in actions`
- Não faça push, PR, merge ou rebase sem autorização explícita.

## Etapas

### Etapa 1: Restringir as três actions

Em `actions.ts`, troque o array `auth` de `createConsultation`,
`updateConsultationStatusFromForm` e `addNote` para
`['admin', 'diretoria']`. Não adicione checagem manual duplicada.

**Verificar**:
`rg -n "auth: \\['admin', 'diretoria', 'secretaria'\\]" src/app/app/juridico/actions.ts`
→ nenhum resultado (exit 1 esperado).

### Etapa 2: Fixar a autorização em testes

Em `actions.test.ts`, acrescente cobertura que prove que cada action chama
`requireRole` com `['admin', 'diretoria']`. Faça também um caso em que
`requireRoleMock` rejeita e confirme que o service correspondente não é chamado.
Use payload válido para que a validação Zod não esconda a checagem de auth.

**Verificar**: teste focado passa e contém ao menos uma asserção negativa de
service após rejeição de role.

### Etapa 3: Rodar gates oficiais

Execute lint → typecheck → unitários → `test:db` → build.

**Verificar**: todos saem 0; `git diff --name-only` contém somente os dois
arquivos de código/teste permitidos e o índice, se atualizado.

## Plano de testes

- Caminho feliz existente para as três actions continua passando.
- Array autorizado exato: `admin`, `diretoria`.
- Falha de autorização não chama create, update nem add-note service.
- Modele mocks e `FormData` pelos testes existentes no mesmo arquivo.

## Critérios de conclusão

- [ ] Nenhuma action do arquivo autoriza `secretaria`.
- [ ] O teste prova a role exata e a ausência de efeitos após negação.
- [ ] Gates oficiais passam na ordem do repositório.
- [ ] Nenhum arquivo fora do escopo foi modificado.
- [ ] Índice atualizado.

## Condições de STOP

- `CONTEXT.md` ou uma ADR vigente passou a autorizar `secretaria` no Jurídico.
- A UI legítima de outro módulo invoca uma dessas actions como `secretaria`.
- O factory deixou de delegar `auth` diretamente a `requireRole`.
- Uma verificação falha duas vezes após ajuste restrito ao escopo.

## Notas de manutenção

Layout guards são defesa de navegação, não substitutos de autorização na action.
Revisores devem exigir que futuras mutações do Jurídico declarem a mesma lista
de roles no boundary server-side.
