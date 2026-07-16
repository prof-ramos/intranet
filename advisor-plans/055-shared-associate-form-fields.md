# Plano 055: Compartilhar os campos de criação e edição de associados

> **Instruções ao executor**: extraia somente campos/seções comuns. Preserve os
> wrappers de submit, redirects, permissões, dependentes e defaults próprios. Não
> combine este plano com migração visual DaisyUI.
>
> **Verificação de drift**:
> `git diff --stat f6cb73e..HEAD -- src/app/app/associados/novo/CriarAssociadoForm.tsx src/app/app/associados/[id]/editar/EditarAssociadoForm.tsx src/lib/validation/schemas.ts src/lib/associates/form-helpers.ts src/lib/associates/form-helpers.test.ts DESIGN.md`

## Status

- **Prioridade**: P3
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: nenhum
- **Categoria**: tech-debt
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

Os formulários têm 632 e 780 linhas e duplicam opções, field components e cerca
de 39 inputs. Cada mudança cadastral exige dois edits e pode divergir em label,
default, máscara ou visibilidade. O schema já demonstra a relação correta:
criação reutiliza o schema de edição sem `id` e adiciona dependentes.

## Estado atual

- Ambos definem `inputStyle`, `selectStyle`, `textareaStyle`, listas de opções,
  `SelectField` e `CheckboxField` nas primeiras ~180 linhas.
- `CriarAssociadoForm.tsx:245-577` e `EditarAssociadoForm.tsx:224-728` repetem
  Identificação, Endereço, Dados Profissionais e Administrativo.
- Criação mantém `DependentsCreateSection` e defaults de status/método.
- Edição mantém hidden `id`, values existentes e conversão date-only.
- `validation/schemas.ts:261-280`: `createAssociateSchema` reutiliza
  `updateAssociateSchema.omit({ id: true })`.
- `DESIGN.md:389` registra retirada gradual de DaisyUI; não é objetivo deste plano.

## Comandos necessários

| Finalidade  | Comando                                                                                 | Resultado esperado                 |
| ----------- | --------------------------------------------------------------------------------------- | ---------------------------------- |
| Componentes | `npx vitest run src/app/app/associados src/lib/associates/form-helpers.test.ts`         | todos os testes encontrados passam |
| Gates       | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0                       |

## Escopo

**Dentro do escopo**:

- os dois formulários citados
- novo componente/helper sob `src/app/app/associados/_components/`
- testes novos no mesmo diretório
- `src/lib/associates/form-helpers.ts` apenas se conversão comum for necessária
- `advisor-plans/README.md`

**Fora do escopo**:

- Actions/services/schemas, salvo types importados sem mudança semântica.
- Dependentes na edição ou mudança de UX.
- Substituir DaisyUI, tokens ou redesenhar o formulário.
- Alterar nomes de campos/FormData ou política de notas internas.

## Fluxo Git

- Branch: `advisor/055-shared-associate-form-fields`
- Commit: `refactor(associates): share create and edit form fields`
- Não publique sem autorização.

## Etapas

### Etapa 1: Criar contrato de valores compartilhados

Defina tipo explícito para os campos comuns e um objeto de values normalizados.
Criação passa strings vazias/defaults (`nao_associado`, `inadimplente`, `folha`);
edição passa os valores do associado, convertendo datas como hoje. Não use
`Record<string, unknown>`.

**Verificar**: typecheck prova todas as chaves e defaults.

### Etapa 2: Extrair primitives e opções

Mova listas de opções, `SelectField`, `CheckboxField` e estilos para o módulo
compartilhado. Preserve IDs, names, labels, required, autocomplete, spellcheck,
placeholders e ordem atual.

**Verificar**: teste renderiza os nomes esperados e opções enum sem duplicatas.

### Etapa 3: Extrair seções comuns

Crie `AssociateFormFields` (ou seções menores) para Identificação, Endereço,
Dados Profissionais e Administrativo. Props: values, mode e
`canEditInternalNotes` apenas quando realmente necessário. Evite config genérica
de dezenas de objetos; JSX tipado explícito é mais fácil de manter.

**Verificar**: criação e edição renderizam os mesmos names comuns exatamente uma
vez, com defaults próprios.

### Etapa 4: Manter wrappers específicos

Criação conserva submit/create, estado, dependentes e defaults. Edição conserva
hidden ID, submit/update e values existentes. Não compartilhe lifecycle só para
reduzir linhas.

**Verificar**: testes de submit mockado confirmam FormData equivalente antes/depois.

### Etapa 5: Rodar gates

Execute sequência oficial. Faça diff visual/manual simples dos dois formulários
em viewport desktop e mobile, sem alterar estilos.

## Plano de testes

- Todos os names comuns aparecem em ambos os modos.
- Defaults de criação e values de edição.
- Campo `id` apenas edição; dependentes apenas criação.
- Notas internas obedecem permission flag.
- Datas e checkboxes preservam serialização FormData.

## Critérios de conclusão

- [ ] Opções/primitives comuns têm uma fonte.
- [ ] Seções comuns não estão duplicadas nos wrappers.
- [ ] Names/defaults/permissões e submit permanecem compatíveis.
- [ ] Nenhuma migração visual foi feita.
- [ ] Gates passam; índice atualizado.

## Condições de STOP

- Create/edit possuem semântica divergente para o mesmo campo não expressável
  por value/mode simples.
- Extração exige alterar action/schema/serviço.
- Testes mostram diferença de FormData ou visibilidade.
- Arquivos estão sendo migrados visualmente em outra branch.

## Notas de manutenção

Novos campos cadastrais comuns devem entrar no componente compartilhado e nos
dois testes de modo. Dependentes e lifecycle continuam deliberadamente fora.
