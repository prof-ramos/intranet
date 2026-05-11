# Plano de Refatoracao - Manutenibilidade e Modularidade

> Atualizado em: 2026-05-11
> Escopo: arquitetura interna da base atual, com foco em manutenibilidade, modularidade e escalabilidade

## Resumo Executivo

A base esta em um ponto intermediario bom: o monolito full-stack em Next.js 16 continua simples de operar, `auth` esta relativamente bem centralizado, e o modulo `juridico` ja demonstra um padrao de modulo mais profundo, com separacao entre leitura, regra de negocio e SQL.

O principal problema atual nao e fundacao quebrada. O problema e a falta de consistencia entre modulos:

- `juridico` ja tem seam real.
- `atividades`, `associados` e parte do dashboard ainda concentram orquestracao, transformacao de dados e UI no mesmo arquivo.
- politicas de autorizacao e regras de dominio ainda aparecem em mais de um lugar.

O caminho recomendado e uma sequencia de refatoracoes pequenas, sem mudanca de comportamento, para aproximar os modulos mais rasos do padrao que ja existe em `src/lib/juridico`.

## Estado Atual

### Fundacoes boas

- Estrutura raiz clara entre `src/app`, `src/components` e `src/lib`.
- Guarda coarse-grained em `proxy.ts` e revalidacao forte no servidor via `requireAuth()` e `requireRole()`.
- DTOs e preocupacao explicita com LGPD.
- Cobertura de testes razoavel para auth, validacao, schema e fluxos E2E principais.

### Hotspots reais

- `src/app/app/atividades/AtividadesBoard.tsx`
- `src/app/app/atividades/nova/NovaAtividadeForm.tsx`
- `src/app/app/associados/[id]/page.tsx`
- `src/app/app/page.tsx`
- `src/app/app/associados/relatorio/download/route.ts`

### Assimetrias arquiteturais

- `src/lib/juridico` usa separacao por modulo.
- `atividades` ainda usa `db` direto na pagina e move muita logica para TSX.
- `associados` mistura query, view model e layout em paginas grandes.
- `reports` ainda duplica auth, role, parsing e auditoria no route handler.

## Objetivos

1. Reduzir arquivos de alta responsabilidade.
2. Padronizar seams por feature.
3. Concentrar regras de autorizacao e de dominio.
4. Melhorar localidade para manutencao e testes.
5. Escalar sem migrar para arquitetura mais pesada do que o problema exige.

## Principios

- Refatorar por slices pequenos e reversiveis.
- Nao introduzir abstractions genericas cedo demais.
- Preferir modulo por feature, nao por tipo tecnico global.
- Cada modulo deve deixar claro:
  interface de leitura, interface de escrita, regras de negocio, tipos de view model.
- Quando houver regra repetida em page, action e route handler, a regra esta no lugar errado.
- Politicas de auth, sanitizacao e auditoria devem ser verificadas em cada fronteira entre UI, action, service e repository.
- Dados sensiveis nao devem aparecer em logs, cache keys, query params compartilhaveis ou payloads de view model sem DTO explicito.

## Prioridades

### Fase 1 - Ganho rapido de localidade

#### 1. Extrair o modulo de policy para relatorios

**Arquivos principais**

- `src/app/app/associados/relatorio/download/route.ts`
- `src/lib/auth/authorization.ts`
- novo `src/lib/reports/policy.ts` ou equivalente

**Problema**

O route handler de download concentra rate limit, auth, role, parsing de filtros, geracao do CSV e auditoria. Isso aumenta o acoplamento e incentiva duplicacao em futuros exports.

**Mudanca**

- Extrair verificacao de permissao para gerar relatorios.
- Extrair parsing dos filtros de exportacao.
- Extrair auditoria de download para helper dedicado.

**Beneficio**

- Mais localidade para regras sensiveis de exportacao.
- Menos duplicacao de auth/role fora do modulo `auth`.
- Testes menores e mais previsiveis.

**Auditoria LGPD**

- Registrar somente metadados nao sensiveis: chaves de filtros, campos exportados e quantidade de linhas.
- Nao registrar valores de CPF, SIAPE, email, endereco, telefone, nomes ou texto livre em `audit_logs`.
- Incluir rastreabilidade minima: `performedBy`, role quando disponivel, timestamp, request id/IP quando houver politica clara, formato e hash dos filtros se o valor bruto for sensivel.
- Manter indice para consulta por usuario, entidade e data; validar em testes que downloads nao gravam PII em `changes`/`metadata`.
- Se a politica mudar, criar ADR curto antes do rollout e uma migracao de limpeza para registros antigos que tenham PII.

#### 2. Transformar a dashboard em pagina fina

**Arquivos principais**

- `src/app/app/page.tsx`
- novo `src/lib/dashboard/view-model.ts`
- possivelmente novos componentes em `src/app/app/_dashboard/`

**Problema**

A pagina mistura fetch paralelo, agregacao, formatacao de data, montagem de cards e renderizacao.

**Mudanca**

- Mover a montagem do payload da dashboard para um view-model builder.
- Extrair blocos visuais em subcomponentes pequenos, sem mover regra de negocio para eles.

**Beneficio**

- Interface menor para a pagina.
- Reuso e teste direto do view model.
- Menor custo cognitivo ao alterar layout ou origem dos dados.

### Fase 2 - Padronizar modulos por feature

#### 3. Criar um modulo `atividades` no `src/lib`

**Arquivos principais**

- `src/app/app/atividades/page.tsx`
- `src/app/app/atividades/AtividadesBoard.tsx`
- `src/app/app/atividades/nova/NovaAtividadeForm.tsx`
- novos arquivos em `src/lib/activities/`

**Problema**

Hoje o dominio de atividades esta repartido entre a pagina, componentes client-heavy e helpers de UI. Falta um seam claro para leitura, escrita e transformacao do board.

**Mudanca**

- Criar `src/lib/activities/queries.ts` para leitura do board.
- Criar `src/lib/activities/types.ts` para tipos compartilhados do dominio.
- Criar `src/lib/activities/mappers.ts` ou `board-view-model.ts` para transformar rows em `BoardActivity`.

**Beneficio**

- `AtividadesPage` vira orquestradora fina.
- `AtividadesBoard` para de receber transformacoes implcitas vindas da pagina.
- O board ganha profundidade real, nao apenas subcomponentes de UI.

**Estrategia de performance**

- Evitar consultas sem limite no board; usar `limit`/`offset` ou cursor com teto conservador por request.
- Planejar endpoints com parametros explicitos (`limit`, `offset`/`cursor`, filtros por status/assignee) antes de crescimento do board.
- Criar indices compostos alinhados aos filtros e ordenacoes reais, como status/prioridade/vencimento e associado/vencimento/id.
- Medir `EXPLAIN ANALYZE` nas queries principais antes e depois de cada indice novo.
- Usar eager loading intencional para nomes de responsaveis/associados, sem loops N+1.
- Definir cache e `revalidateTag` por feature; invalidar apenas tags relacionadas a atividades quando houver mutacao.
- Adicionar benchmark simples ou teste de carga local com volume sintetico antes de aumentar o limite padrao.

#### 4. Criar o modulo de perfil de associado

**Arquivos principais**

- `src/app/app/associados/[id]/page.tsx`
- novos arquivos em `src/lib/associates/`

**Problema**

A pagina de perfil concentra leitura do banco, LGPD, formatacao, calculos derivados e sections visuais.

**Mudanca**

- Extrair query de perfil para `src/lib/associates/queries.ts` ou arquivo adjacente.
- Extrair `profile-view-model.ts` para normalizacao, datas, pills e blocos derivados.
- Manter a pagina como composicao de secoes.

**Beneficio**

- Melhor localidade para evolucao do dominio do associado.
- Fica mais facil aplicar LGPD, auditoria e exportacao de modo coerente.

**ADR LGPD antes do rollout**

- Listar campos PII do perfil: CPF, SIAPE, email, endereco, telefone, WhatsApp, data de nascimento e observacoes internas.
- Mapear role para visibilidade de campo (`admin`/`diretoria` completos; `secretaria` com mascaramento/minimizacao).
- Centralizar mascaras em DTOs e proibir que pages consumam diretamente rows completas quando houver PII.
- Evitar PII em logs, cache keys, URL e mensagens de erro.
- Cobrir DTOs com testes de mascaramento e regressao para cada role.

### Fase 3 - Unificar o dominio juridico

#### 5. Criar uma unica fonte para status e transicoes

**Arquivos principais**

- `src/lib/db/schema/legal-consultations.ts`
- `src/lib/validation/schemas.ts`
- `src/app/app/juridico/page.tsx`
- `src/app/app/juridico/consultas/page.tsx`
- `src/app/app/juridico/actions.ts`

**Problema**

O schema usa `aguardando_escritorio`, mas a validacao em `schemas.ts` ainda declara `em_analise`. Isso e sinal de drift de dominio.

**Mudanca**

- Criar um modulo `src/lib/juridico/status.ts` ou equivalente.
- Derivar labels, opcoes e validacoes dessa fonte.
- Remover listas paralelas espalhadas em pages e schemas.

**Beneficio**

- Menos risco de divergencia entre banco, action e UI.
- O modulo juridico fica mais profundo e mais seguro para evolucao.

**Plano de migracao e validacao**

- Confirmar valores atuais no banco antes de trocar enum/listas em codigo.
- Centralizar `LEGAL_CONSULTATION_STATUSES`, labels, opcoes de filtro e badge em `src/lib/juridico/status.ts`.
- Atualizar schema Drizzle, validacoes Zod, pages e actions para importar a fonte unica.
- Rodar teste de schema/validacao e smoke E2E do juridico antes de aplicar em producao.
- Manter rollback simples: migracao reversivel ou compatibilidade temporaria se houver status legado no banco.

#### 6. Separar melhor repository, service e action no juridico

**Arquivos principais**

- `src/app/app/juridico/actions.ts`
- `src/lib/juridico/service.ts`
- `src/lib/juridico/repository.ts`

**Problema**

O juridico e o melhor modulo da base, mas ainda ha acoplamento de parsing, autorizacao, rate limit e invalidacao de cache nas actions.

**Mudanca**

- Manter autorizacao nas actions.
- Mover regras de negocio e transicoes para o service.
- Deixar repository estritamente responsavel por persistencia.

**Beneficio**

- O juridico vira referencia para os demais modulos.
- Facilita testes de regra sem depender de Next APIs.

## Roadmap sugerido

1. `reports` policy + parsing + audit helper.
2. dashboard view model + subcomponentes.
3. modulo `activities` em `src/lib`.
4. modulo de perfil do associado.
5. unificacao de status no juridico.
6. segunda passada para limpar actions grandes.

## Quality gates e rollback

- Cada slice deve passar em typecheck, lint, testes unitarios focados e smoke/E2E da feature afetada.
- Mudancas de schema precisam de migracao, teste de contrato e plano de reversao documentado.
- Mudancas LGPD precisam de teste que prove ausencia de PII no payload/log/auditoria.
- Rollback deve ser por commit pequeno e reversivel; evitar misturar refatoracao estrutural com mudanca funcional ampla.

## O que nao fazer agora

- Nao migrar para microservicos ou separar backend.
- Nao criar camada de service generica para todo o projeto de uma vez.
- Nao mover tudo para `src/components` sem clarificar o dominio.
- Nao abrir uma refatoracao ampla de design junto com refatoracao estrutural.

## Critérios de sucesso

- Nenhuma page principal mistura query SQL, regra de negocio e view model grande no mesmo arquivo.
- `atividades`, `associados`, `juridico` e `reports` seguem um desenho parecido o bastante para serem previsiveis.
- Regras de role e exportacao ficam em modulos reutilizaveis.
- Status e labels de dominio nao ficam duplicados em schema, UI e validacao.
- Hotspots atuais deixam de ser arquivos "centro do universo" da feature.
- Queries principais de dashboard/atividades/perfil respondem em tempo previsivel com volume sintetico de pelo menos 10k atividades.
- Downloads e auditoria mantem PII fora de logs/metadados, com teste automatizado cobrindo o contrato.

## Slice recomendado para iniciar

Se a execucao comecar agora, o melhor primeiro slice continua sendo:

1. refatorar `src/app/app/associados/relatorio/download/route.ts` para extrair policy, parsing e auditoria;
2. em seguida, transformar `src/app/app/page.tsx` em pagina fina;
3. depois, abrir o modulo `activities`.

Essa ordem preserva comportamento, reduz duplicacao sensivel e cria um padrao claro para o restante da base.
