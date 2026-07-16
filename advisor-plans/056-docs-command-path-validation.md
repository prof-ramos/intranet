# Plano 056: Validar comandos e caminhos operacionais da documentação

> **Instruções ao executor**: o Plano 054 deve estar concluído para evitar
> conflito no CI/package. Não invente conteúdo para paths inexistentes; remova ou
> corrija referências conforme a árvore real.
>
> **Verificação de drift**:
> `git diff --stat 45b9ba3..HEAD -- README.md docs scripts/AGENTS.md package.json .github/workflows/ci.yml`

## Status

- **Prioridade**: P3
- **Esforço**: M
- **Risco**: BAIXO
- **Depende de**: Plano 054
- **Categoria**: docs
- **Planejado em**: `main` commit `45b9ba3`, 2026-07-16

## Por que isso importa

Documentos operacionais anunciam comandos removidos, diretório inexistente,
AGENTS filhos ausentes e threshold errado. Como agentes e pessoas tratam esses
arquivos como instruções executáveis, referências plausíveis porém quebradas são
mais perigosas que ausência de documentação. Um check automático deve impedir
nova deriva básica.

## Estado atual

- `docs/development/test-metrics.md:54-79` orienta `test:metrics`,
  `test:metrics:clean` e flag que não existem no `package.json`.
- `scripts/AGENTS.md:26-28` lista `scripts/test-metrics/`, ausente.
- `docs/AGENTS.md:21-29` referencia AGENTS filhos que não existem na árvore.
- `README.md:208` informa functions 75%; `vitest.config.ts:29-35` configura 70%.
- Não há script de validação de `npm run` documentado nem de links Markdown.

## Comandos necessários

| Finalidade       | Comando                                                                                 | Resultado esperado                   |
| ---------------- | --------------------------------------------------------------------------------------- | ------------------------------------ |
| Check docs       | `npm run docs:check`                                                                    | exit 0, sem comandos/links inválidos |
| Teste do checker | `npx vitest run scripts/check-docs.test.ts`                                             | todos passam                         |
| Gates            | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0                         |

## Escopo

**Dentro do escopo**:

- `README.md`, `docs/AGENTS.md`, `scripts/AGENTS.md`
- `docs/development/test-metrics.md` (corrigir/remover conforme evidência)
- checker/teste novos sob `scripts/`
- `package.json`
- `.github/workflows/ci.yml` para rodar `docs:check`
- outros Markdown somente quando o checker provar a mesma referência quebrada
- `advisor-plans/README.md`

**Fora do escopo**:

- Criar AGENTS vazios só para satisfazer path.
- Remover tabelas `test_runs`/`test_results` ou criar migration.
- Reescrever documentação de produto/ADRs sem finding concreto.
- Alterar thresholds de cobertura para coincidir com texto; o código é fonte.

## Fluxo Git

- Branch: `advisor/056-docs-command-path-validation`
- Commit: `docs: validate documented commands and paths`
- Não publique sem autorização.

## Etapas

### Etapa 1: Corrigir drift comprovado

Remova/arquive instruções de test-metrics se não houver runtime/script consumidor;
documente tabelas remanescentes como legado somente se necessário. Remova
referência ao diretório ausente. Em `docs/AGENTS.md`, transforme paths válidos em
links reais e retire “see AGENTS.md” quando o arquivo não existe. Corrija threshold
de functions para 70% e ordem descrita de `validate:quick`.

**Verificar**: `rg -n "test:metrics|scripts/test-metrics|functions 75" README.md docs scripts/AGENTS.md`
→ nenhum resultado operacional obsoleto.

### Etapa 2: Criar checker determinístico

Implemente script read-only que:

1. carrega scripts reais do `package.json`;
2. varre Markdown versionado por tokens `npm run <nome>` e falha para nomes
   inexistentes;
3. valida links relativos Markdown para arquivos/diretórios locais;
4. ignora URLs, anchors e exemplos explicitamente fenced quando apropriado;
5. produz caminho/linha, sem conteúdo sensível.

Não use rede nem nova dependência se parser simples testado for suficiente.

**Verificar**: fixtures temporárias do teste cobrem comando válido/inválido, link
válido/quebrado, URL e anchor.

### Etapa 3: Integrar ao tooling/CI

Adicione `docs:check` ao package e step no job validate após lint. Não duplique a
suíte unitária corrigida pelo Plano 054 nem renomeie jobs protegidos.

**Verificar**: checker sai 0 no repo e falha numa fixture inválida.

### Etapa 4: Rodar gates

Execute checker, teste focado e sequência oficial.

## Plano de testes

- Comando npm existente/inexistente.
- Link relativo existente/quebrado e path com anchor.
- URL externa não causa acesso de rede.
- Code fences não geram falso positivo indevido.
- Diagnóstico contém arquivo/linha e exit code 1.

## Critérios de conclusão

- [ ] Drift listado foi corrigido com base na árvore real.
- [ ] `docs:check` valida scripts e links relativos.
- [ ] CI executa o check sem rede.
- [ ] Threshold documentado coincide com config.
- [ ] Gates passam; índice atualizado.

## Condições de STOP

- Documento de test-metrics ainda corresponde a código ativo não encontrado no
  baseline auditado.
- Checker exige parser Markdown de terceiros para evitar falsos positivos.
- Plano 054 ainda está alterando os mesmos arquivos de CI/package.
- Corrigir referência exige decisão de produto/arquitetura, não simples drift.

## Notas de manutenção

Novos comandos documentados devem existir no package; paths devem ser links
relativos verificáveis. O checker não substitui revisão semântica de ADRs.
