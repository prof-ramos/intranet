# Análise de Dependências — ASOF Intranet

> Relatório de análise de dependências, vulnerabilidades e recomendações.
> Última atualização: 2026-05-17

---

## Índice

1. [Resumo Executivo](#resumo-executivo)
2. [Vulnerabilidades de Segurança](#vulnerabilidades-de-segurança)
3. [Pacotes Desatualizados](#pacotes-desatualizados)
4. [Dependências Problemáticas](#dependências-problemáticas)
5. [Alternativas Recomendadas](#alternativas-recomendadas)
6. [Padrões de Uso](#padrões-de-uso)
7. [Plano de Ação](#plano-de-ação)

---

## Resumo Executivo

| Métrica                          | Valor         |
| -------------------------------- | ------------- |
| **Dependências diretas**         | 12            |
| **DevDependencies**              | 17            |
| **Vulnerabilidades**             | **0**         |
| **Pacotes desatualizados**       | 3             |
| **Pacotes candidatos à remoção** | 1 (`daisyui`) |

**Conclusão**: `react-kanban-kit` foi removido e substituído por `@hello-pangea/dnd`, eliminando todas as vulnerabilidades transitivas. `@libsql/client` e o seed legado foram removidos. `jose` também foi removido em 2026-05-17 porque a autenticação atual usa Supabase Auth e não havia imports do pacote no código, scripts ou testes.

---

## Vulnerabilidades de Segurança

### Origem da Cadeia

```
react-kanban-kit@0.0.2-beta.7
└── vite-plugin-dts@3.9.1 (❌ deveria ser devDependency)
    ├── @microsoft/api-extractor@7.43.0
    │   ├── lodash@4.17.23        ← HIGH
    │   └── minimatch@3.0.4       ← HIGH
    │   └── @microsoft/tsdoc-config@0.16.2
    │       └── ajv@6.12.6        ← MODERATE
    └── vue-tsc@1.8.27
        └── @vue/language-core@1.8.27
            └── vue-template-compiler@2.7.16  ← MODERATE
```

### Detalhes

| Severidade   | Pacote                  | CVE/Advisory                                                             | Descrição                                    | Fix via                                    |
| ------------ | ----------------------- | ------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------ |
| **HIGH**     | `lodash`                | [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) | Code Injection via `_.template`              | `npm audit fix` (não resolve — transitiva) |
| **HIGH**     | `lodash`                | [GHSA-f23m-r3pf-42rh](https://github.com/advisories/GHSA-f23m-r3pf-42rh) | Prototype Pollution via `_.unset` / `_.omit` | override para lodash@4.17.21               |
| **HIGH**     | `minimatch`             | [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26) | ReDoS via wildcards                          | override para minimatch@9.0.0+             |
| **HIGH**     | `minimatch`             | [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj) | ReDoS via GLOBSTAR                           | override para minimatch@9.0.0+             |
| **MODERATE** | `ajv`                   | [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6) | ReDoS via `$data`                            | override para ajv@8.0.0+                   |
| **MODERATE** | `vue-template-compiler` | [GHSA-g3ch-rx76-35fx](https://github.com/advisories/GHSA-g3ch-rx76-35fx) | XSS no compilador de template Vue            | substituir react-kanban-kit                |

> ⚠️ **Nota**: `npm audit fix` não resolve estas vulnerabilidades porque elas estão em dependências transitivas de `react-kanban-kit` e o `audit fix` não consegue atualizar dependências de pacotes que não têm versões mais novas disponíveis.

---

## Pacotes Desatualizados

| Pacote                 | Atual   | Última | Tipo        | Risco de Update                            |
| ---------------------- | ------- | ------ | ----------- | ------------------------------------------ |
| `@libsql/client`       | 0.15.15 | 0.17.3 | Major (0.x) | Baixo (não usado diretamente)              |
| `@tailwindcss/postcss` | 4.2.4   | 4.3.0  | Minor       | Muito baixo                                |
| `tailwindcss`          | 4.2.4   | 4.3.0  | Minor       | Muito baixo                                |
| `eslint`               | 9.39.4  | 10.3.0 | Major       | **Médio** — ESLint 10 tem breaking changes |

### Análise

- **Tailwind CSS 4.2.4 → 4.3.0**: Atualização segura. A 4.3.0 inclui melhorias de performance e novos utilitários. Recomendado.
- **ESLint 9 → 10**: Breaking changes no formato de configuração. Requer revisão do `eslint.config.ts`. Não prioritário.
- **@libsql/client**: Atualização irrelevante — o pacote deve ser removido, não atualizado.

---

## Dependências Problemáticas

### 1. `react-kanban-kit` — Risco: ALTO (substituído)

**Status**: ✅ Substituído por `@hello-pangea/dnd` em `src/app/app/atividades/AtividadesBoard.tsx`.

**Problemas originais**:

- Versão beta (`0.0.2-beta.7`) sem garantia de estabilidade
- Traz `vite-plugin-dts` como **dependency** (deveria ser devDependency ou peerDependency)
- `vite-plugin-dts` traz `vue-tsc` e `@microsoft/api-extractor` com vulnerabilidades
- Dependências de build no bundle de produção = bundle maior e mais lento
- Não há atividade recente no repositório

**Remoção**: O pacote foi removido do `package.json`.

---

### 2. `@libsql/client` — Risco: NENHUM (removido)

**Status**: ✅ Removido do projeto.

O pacote foi uma dependência legada do SQLite/libSQL usada apenas pelo script `scripts/seed-associados.ts` (também removido). O projeto usa exclusivamente PostgreSQL via `postgres` + Drizzle ORM. Tanto `@libsql/client` quanto `seed-associados.ts` foram eliminados do `package.json` e do repositório.

---

### 3. `daisyui` — Risco: BAIXO

**Problemas**:

- O projeto está **fazendo transição para tokens de design próprios** (`src/lib/ui/tokens.ts`)
- DaisyUI está sendo gradualmente removido (vide `CLAUDE.md`)
- Classes como `btn btn-primary` estão sendo substituídas por utilitários Tailwind + tokens
- Adiciona ~60KB ao CSS bundle

**Recomendação**: Remover gradualmente conforme as telas são refatoradas. Não remover de uma só vez para evitar regressões visuais.

---

### 4. `overrides` no `package.json` — Risco: MÉDIO

```json
"overrides": {
  "esbuild": "0.28.0",
  "postcss": "8.5.14"
}
```

**Problemas**:

- **esbuild 0.28.0**: Versão pinada. Esbuild é uma dependência transitiva de Next.js e Vite. Fixar uma versão específica pode causar incompatibilidades com novas versões do Next.js.
- **postcss 8.5.14**: Versão pinada. Tailwind CSS 4 já inclui PostCSS internamente. Este override pode ser desnecessário.

**Recomendação**: Avaliar se os overrides ainda são necessários após atualizar Tailwind CSS. Se o problema original foi resolvido, removê-los.

---

### 5. `server-only` — Risco: NENHUM (observação)

**Status**: ✅ Boa prática. Marca módulos que não devem ser importados no cliente. Usado corretamente.

---

## Alternativas Recomendadas

### Substituir `react-kanban-kit`

| Alternativa               | Prós                                                                 | Contras                        | Nota                                            |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------- |
| **@hello-pangea/dnd**     | Estável, acessível, ativamente mantido (fork do react-beautiful-dnd) | Requer mais código boilerplate | ⭐ Recomendado                                  |
| **@dnd-kit/core**         | Modular, muito flexível, tree-shakeable                              | Curva de aprendizado maior     | Recomendado para casos complexos                |
| **Implementação própria** | Zero dependências externas, controle total                           | Mais trabalho inicial          | Viável para o caso de uso atual (colunas fixas) |

**Recomendação**: **@hello-pangea/dnd** é o drop-in replacement mais direto para `react-kanban-kit`. É o fork mantido do `react-beautiful-dnd`, que é a biblioteca subjacente do `react-kanban-kit`.

---

### Substituir `@libsql/client`

**Ação**: Mover para `devDependencies` (não é usado em runtime):

### Atualizar Tailwind CSS

```bash
npm update tailwindcss @tailwindcss/postcss
```

---

## Padrões de Uso

### Dependências de Produção (`dependencies`)

| Pacote                  | Uso                | Relevância                |
| ----------------------- | ------------------ | ------------------------- |
| `next`                  | Framework          | Essencial                 |
| `react` / `react-dom`   | UI                 | Essencial                 |
| `drizzle-orm`           | ORM                | Essencial                 |
| `postgres`              | Driver PostgreSQL  | Essencial                 |
| `bcryptjs`              | Hash de senha      | Essencial                 |
| `zod`                   | Validação          | Essencial                 |
| `lucide-react`          | Ícones             | Essencial                 |
| `@supabase/supabase-js` | SDK Supabase       | Essencial (scripts/admin) |
| `daisyui`               | Componentes UI     | 🚫 Remover gradualmente   |
| `server-only`           | Guarda de servidor | ✅ Manter                 |

### DevDependencies

| Pacote                                                     | Uso                     | Relevância |
| ---------------------------------------------------------- | ----------------------- | ---------- |
| `typescript`                                               | Type system             | Essencial  |
| `tailwindcss` / `@tailwindcss/postcss`                     | CSS                     | Essencial  |
| `eslint` / `eslint-config-next` / `eslint-config-prettier` | Lint                    | Essencial  |
| `prettier` / `prettier-plugin-tailwindcss`                 | Formatação              | Essencial  |
| `vitest` / `@vitejs/plugin-react`                          | Testes                  | Essencial  |
| `drizzle-kit`                                              | Migrations              | Essencial  |
| `tsx`                                                      | Runtime TS para scripts | Essencial  |
| `@types/*`                                                 | Tipos                   | Essencial  |

---

## Plano de Ação

### Prioridade 1: Segurança (HIGH)

1. **Substituir `react-kanban-kit`** ✅ Concluído

   ```bash
   npm uninstall react-kanban-kit
   npm install @hello-pangea/dnd
   ```

   - `src/app/app/atividades/AtividadesBoard.tsx` refatorado para `@hello-pangea/dnd`
   - Drag-and-drop validado com build e testes

2. **Verificar se vulnerabilidades foram eliminadas** ✅ Concluído

   ```bash
   npm audit
   # Resultado: found 0 vulnerabilities
   ```

### Prioridade 2: Limpeza (MEDIUM)

1. **Mover `@libsql/client` para devDependencies** ✅ Concluído

   ```bash
   npm uninstall @libsql/client
   npm install --save-dev @libsql/client
   ```

   - Pacote ainda necessário para `scripts/seed-associados.ts` (fonte SQLite legada)

2. **Atualizar Tailwind CSS** ⏳ Pendente

   ```bash
   npm update tailwindcss @tailwindcss/postcss
   ```

### Prioridade 3: Manutenção (LOW)

1. **Revisar overrides de `esbuild` e `postcss`**
   - Testar build sem overrides
   - Se tudo funcionar, remover do `package.json`

2. **Planejar remoção do `daisyui`**
   - Identificar todas as classes DaisyUI em uso
   - Substituir por tokens do design system ou utilitários Tailwind
   - Remover quando todas as telas forem migradas

### Comandos Resumidos

```bash
# 1. Substituir react-kanban-kit (PRIORIDADE ALTA)
npm uninstall react-kanban-kit
npm install @hello-pangea/dnd

# 2. Remover libsql (limpeza)
npm uninstall @libsql/client

# 3. Atualizar Tailwind
npm update tailwindcss @tailwindcss/postcss

# 4. Verificar auditoria
npm audit

# 5. Testar
npm run typecheck
npm run test
npm run build
```

---

## Checklist de Validação

Após executar o plano de ação:

- [x] `npm audit` retorna 0 vulnerabilidades
- [x] `npm run typecheck` passa sem erros
- [x] `npm run test` passa (25/25)
- [x] `npm run build` completa com sucesso
- [x] `npm run lint` passa sem warnings
- [x] Board de atividades funciona (drag-and-drop)
- [x] Dashboard funciona
- [x] Login funciona
- [x] Relatório CSV funciona
- [x] Módulo jurídico funciona
