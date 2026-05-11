# src/app/app/associados — Módulo de Associados

Gestão do cadastro dos ~763 associados da ASOF. Rota principal: `/app/associados`. Acesso liberado para todos os roles autenticados.

## Arquivos

- `page.tsx` — listagem paginada com busca full-text (`pg_trgm`) por nome, SIAPE, e-mail e lotação. Filtros por `associationStatus`, `functionalStatus`, `contributionStatus` e `locationCountry`.
- `actions.ts` — Server Actions: `updateAssociate`, `exportAssociates` (CSV).
- `[id]/page.tsx` — detalhe do associado; exibe dados protegidos pela LGPD apenas para `admin` e `diretoria`.
- `relatorio/page.tsx` — relatório gerencial agregado.

## Regras de domínio

- **CPF, SIAPE, e-mail e endereço** são dados LGPD — não exibir em listagem pública ou logs.
- O campo canônico de nome é `associates.name`; os campos `assigneeName`/`associateName` em `BoardActivity` são fallbacks de renderização otimista — não os usar como fonte autoritativa.
- `assignment` armazena lotação/posto (ex: `"Embaixada em Paris"`, `"SERE"`).
- `classPattern` segue a progressão Classe A → B → C → Especial, cada uma com 5 padrões.
- Ao atualizar `contributionStatus`, registrar entrada em `audit_logs` com `entity_type = 'associate'`.

## Busca full-text

Usa `pg_trgm` (GIN index). Queries de busca devem usar `ilike` com `%termo%` ou a função `similarity`. Não usar LIKE sem índice em tabelas com >500 linhas.
