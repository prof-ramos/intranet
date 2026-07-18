# Plano 063: Reconciliar runbook, contratos funcionais e índices de agentes com o código

> **Instruções ao executor**: handlers, schemas e scripts presentes na árvore são
> a fonte canônica. Não recrie ferramentas one-off removidas só para satisfazer
> documentação. Este plano sucede o 056: o checker básico já existe; amplie-o sem
> desfazer seus testes.
>
> **Verificação de drift**:
> `git diff --stat 14dae8f..HEAD -- docs/runbook.md PAGES.md ARCHITECTURE.md src/lib/AGENTS.md scripts/AGENTS.md scripts/check-docs.mjs scripts/check-docs.test.ts`

## Status

- **Prioridade**: P2
- **Esforço**: M
- **Risco**: BAIXO
- **Depende de**: Planos 057 e 060, que atualizam evidência e contrato do smoke
- **Categoria**: docs / dx
- **Planejado em**: `main` commit `14dae8f`, 2026-07-18

## Por que isso importa

O runbook manda executar scripts removidos, `PAGES.md` descreve semântica de API
e financeiro diferente da implementação, e instruções de agentes listam módulos
e dependências inexistentes. O checker atual valida scripts npm e links Markdown,
mas não caminhos de arquivos escritos em fences shell, deixando comandos
plausíveis e quebrados passarem no CI.

## Estado atual

- `docs/runbook.md:123-130` manda usar dois scripts ausentes para restaurar dados.
- `scripts/AGENTS.md:9-23` lista vários arquivos que não existem na árvore.
- `PAGES.md:305-314` usa estados/KPIs diferentes de
  `src/lib/db/schema/finance.ts:17-48` e `FinanceKPIs.tsx:20-67`.
- `PAGES.md:672-690` diz que POST cria evento e GET lista pendentes; o handler
  atual informa outbound-only no GET e despacha eventos existentes no POST.
- `ARCHITECTURE.md:79-97` possui localização/eventos/status Assinafy antigos.
- `src/lib/AGENTS.md:34-46,83-84` lista `documents/`, `storage/`, viem/ws e SDK AI
  que não correspondem à árvore/package atual.
- `scripts/check-docs.mjs:127-145` valida npm em fences e links fora delas, mas
  não tokens de caminhos em comandos shell.

## Comandos necessários

| Finalidade  | Comando                                     | Resultado esperado   |
| ----------- | ------------------------------------------- | -------------------- |
| Checker     | `npx vitest run scripts/check-docs.test.ts` | todos passam         |
| Docs        | `npm run docs:check`                        | exit 0               |
| Referências | `git ls-files \| sort`                      | fonte de paths reais |
| Gate        | `npm run pr:check`                          | exit 0               |

## Escopo

**Dentro do escopo**:

- `docs/runbook.md`, `PAGES.md`, `ARCHITECTURE.md`.
- `src/lib/AGENTS.md`, `scripts/AGENTS.md`.
- `scripts/check-docs.mjs`, `scripts/check-docs.test.ts`.
- Outros Markdown somente quando o checker novo provar o mesmo tipo de path
  quebrado; liste-os no PR.
- `advisor-plans/README.md`.

**Fora do escopo**:

- Implementar features descritas por documentação antiga.
- Recriar importadores, storage, blockchain ou SDKs removidos.
- Alterar API, schema financeiro ou estados Assinafy para combinar com o texto.
- Reescrever ADRs históricos; adicione nota de supersessão quando necessário.

## Fluxo Git

- Branch: `advisor/063-reconcile-operational-docs`.
- Commits: `test(docs): detect missing paths in shell fences` e
  `docs: reconcile operational contracts with runtime`.
- A execução integral já autoriza publicação, promoção, merge e limpeza da branch
  depois dos gates e da revisão Standards/Spec.

## Etapas

### Etapa 1: Criar inventário determinístico de drift

Compare cada path/comando listado com `git ls-files`, cada contrato de API com o
handler e cada enum/KPI com schema/componente. Registre a fonte canônica na
mensagem do commit; não use memória ou plano antigo como prova.

**Verificar**: todo item alterado possui um arquivo/símbolo executável citado.

### Etapa 2: Estender o checker para paths em shell fences

Adicione parser conservador para argumentos repo-relativos evidentes em fences
`bash`, `sh`, `shell` e `zsh`. Valide paths iniciados por diretórios versionados
conhecidos ou extensões de script; ignore placeholders, variáveis, globs, URLs,
flags e arquivos deliberadamente externos. Diagnóstico deve incluir arquivo e
linha, sem acessar rede.

**Verificar**: fixtures cobrem path existente, ausente, placeholder, variável,
URL, glob, multiline e o comando quebrado do runbook.

### Etapa 3: Corrigir o runbook e índices de agentes

Remova os importadores ausentes. Para banco novo/restaurado, aponte ao fluxo de
backup/restore autorizado existente; não invente mecanismo de reconstrução de
PII. Faça as tabelas de `scripts/AGENTS.md` e `src/lib/AGENTS.md` refletirem
somente árvore e package atuais.

**Verificar**: todos os paths restantes nessas tabelas existem em `git ls-files`.

### Etapa 4: Corrigir contratos de produto/API

Atualize financeiro para `payment_status` real e KPIs de contagem atuais.
Descreva `/api/v1/events` como operador outbound-only: GET anuncia capacidade e
POST despacha ID/fila já persistida. Atualize Assinafy com os status/eventos e a
localização real de `sendForSignature`.

**Verificar**: nomes documentados aparecem nos schemas/handlers correspondentes;
`npm run docs:check` passa.

### Etapa 5: Rodar gates

Execute teste do checker, docs check e `npm run pr:check`.

## Plano de testes

- Paths shell válidos/inválidos com linha exata.
- Nenhum acesso de rede no checker.
- Placeholders e variáveis não geram falso positivo.
- Regressões preexistentes de links/npm continuam cobertas.
- Rodada completa em todo Markdown versionado sai 0.

## Critérios de conclusão

- [ ] Runbook não referencia script removido.
- [ ] AGENTS listam apenas módulos/dependências atuais.
- [ ] `PAGES.md` coincide com handlers, schema e KPIs executáveis.
- [ ] Arquitetura Assinafy coincide com tipos e serviços atuais.
- [ ] Checker impede paths shell inexistentes com baixa taxa de falso positivo.
- [ ] `npm run pr:check` passa.

## Condições de STOP

- Corrigir o runbook exigir escolher uma nova fonte de dados reais/PII.
- Semântica do handler estiver deliberadamente em migração por outro PR.
- Parser simples não conseguir evitar falsos positivos sem dependência nova.
- Planos 057/060 ainda estiverem alterando os mesmos parágrafos do smoke.

## Notas de manutenção

O checker detecta existência, não verdade semântica. Mudanças de API/schema devem
atualizar `PAGES.md`/`ARCHITECTURE.md` no mesmo PR.
