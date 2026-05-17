# Codebase Audit - 2026-05-17

## Objetivo

Registrar o estado atual da auditoria técnica do codebase, com foco em:

- endurecimento incremental de fluxos críticos;
- alinhamento entre UI, services, repositories e rotas;
- redução de gaps de parsing, auth, logging e consistência operacional;
- identificação das oportunidades remanescentes de melhoria e expansão.

## Baseline validado

Comandos executados e confirmados no estado atual:

```bash
npm run validate:quick
npm run validate:full
```

Resultado do baseline mais recente:

- `100` arquivos de teste passando
- `731` testes passando
- `test:db` verde
- `build` verde

Publicacao em `main`:

- commit publicado: `4e9adfa chore: harden intranet modules`
- remoto: `origin/main` em `4e9adfa5cb938fb020c114292929d1053a953737`
- validacoes executadas antes do push: `npm run typecheck`, `npm run test`, `npm run lint` e `npm run build`
- o push em `main` atualiza o codigo no GitHub, mas nao autoriza nem executa deploy de producao, migrations remotas ou alteracoes de env/secrets

Observacao: antes do push final, `origin/main` havia avancado com `171d5e8 docs: adiciona jornada da usuaria Bruna - Controle Financeiro`; o commit de hardening foi rebaseado sobre esse ponto e entao publicado.

## Frentes auditadas e endurecidas

### 1. Auth e sessão

- Lookup de sessão/login por email passou a ser case-insensitive real (`lower(email)`), reduzindo falha com registros legados em casing misto.
- Fluxo obrigatório de troca de senha (`/change-password`) ganhou rollback explícito entre Supabase Auth e banco local quando a persistência do novo hash falha após a troca no provedor.
- Actions/configs de auth e parsing de `DEV_USER_ID` foram endurecidos contra coerções permissivas.

### 2. Logs seguros e LGPD

- `toSafeErrorLog` foi adotado amplamente para evitar logging cru de objetos de erro.
- Error boundaries, server actions, rotas e helpers operacionais passaram a logar erros resumidos, preservando utilidade operacional sem expor PII.

### 3. Parsing e input externo

- Search params e IDs de rotas/actions foram endurecidos para aceitar apenas inteiros positivos/formatos explícitos onde aplicável.
- Superfícies saneadas incluem jurídico, financeiro, auditoria, notificações, integrações e múltiplas páginas de detalhe/edição.

### 4. Atividades

- `quick-add`, reatribuição, timeline e atualização persistida do board deixaram de depender de estado apenas cliente.
- `SummaryStrip`, estado do drawer e URL (`?open=`) passaram a refletir o conjunto filtrado e o estado real do board.
- A composição de `people/currentUser` agora preserva o usuário autenticado como fonte autoritativa, sem sobrescrita implícita por dados duplicados do banco.

### 5. Financeiro

- Regras de país doméstico/exterior foram centralizadas para evitar divergência entre dashboard, filtros e KPIs.
- Filtro por método de pagamento passou a usar o canal efetivo (`override mensal` ou `default`), em vez de semânticas divergentes entre backend e UI.
- Cache key de mensalidades foi normalizada para não fragmentar resultados equivalentes por whitespace em filtros de busca.

### 6. Jurídico

- Card de SLA e resumo por status foram alinhados ao comportamento real esperado na página principal.
- Parsing de filtros e paginação foi endurecido para evitar casts frágeis e offsets inválidos no repositório.

### 7. Notificações

- Hook realtime passou a tratar `INSERT`, `UPDATE` e `DELETE` com normalização mais rígida de payloads.
- Bell de notificações não navega mais quando `markAsRead` falha.
- Repositório agora tem fallback de dedupe determinístico no caso de conflito por `dedupeKey`.

### 8. Rate limiting e integrações

- Rate limiter genérico por IP foi refeito para fluxo write-first/condicional, reduzindo janela de race do modelo `select` + `update`.
- Dispatch manual de eventos/webhooks foi alinhado ao mesmo padrão de claim/lock da trilha batch.
- HMAC timestamp/config parsing ficou mais estrito.

### 9. Storage

- Clients e helpers de storage ganharam isolamento melhor de token/session e validação explícita de paginação/expiry.

## Cobertura estrutural observada

Na checagem atual, os módulos core nomeados por padrões como `actions`, `route`, `service`, `repository`, `queries`, `dashboard`, `session` e `policy` já não apresentam lacunas óbvias de teste dedicado dentro de `src/`.

Isso não prova cobertura total de comportamento, mas reduz bastante o espaço de risco em áreas críticas.

## Oportunidades remanescentes

Estas frentes ainda parecem plausíveis, mas já entraram em faixa de retorno decrescente comparadas ao que foi corrigido:

### 1. Auditoria funcional mais profunda de fluxos menos centrais

- validar se ainda existe algum acoplamento frágil entre páginas de `config` e services subjacentes;
- revisar componentes client-side que dependem de estado derivado sem repository/service próprio.

### 2. Expansão de observabilidade

- consolidar uma convenção formal para logs de warning/error operacionais por domínio;
- avaliar telemetria mais estruturada para falhas de actions críticas (auth, juridico, financeiro, ofícios).

### 3. Testes de integração específicos por domínio

- ampliar testes além do contrato de schema e unitários/mocks para alguns fluxos ricos em persistência:
  - change-password completo;
  - dedupe de notificações;
  - webhooks/deliveries;
  - consultas jurídicas com paginação/filtros reais.

### 4. Expansão funcional futura

- timeline/histórico mais completo e consultável em atividades;
- trilha inbound de integrações, hoje ainda não aberta publicamente;
- maior cobertura de UX operacional em configurações e relatórios.

## Conclusão operacional

O codebase está significativamente mais consistente do que no início da auditoria:

- menos divergência entre UI e backend;
- menos parsing permissivo;
- menos logging inseguro;
- mais cobertura dedicada nas áreas centrais;
- baseline de validação integral verde.

Ainda assim, “auditoria completa” no sentido absoluto continua dependendo de julgamento de retorno marginal. No estado atual, os maiores riscos aparentes já foram tratados; o que resta tende mais a aprofundamento e expansão do que a fragilidade estrutural imediata.

## Lote de limpeza conservadora - código morto e documentação obsoleta

Data: 2026-05-17.

### Diagnóstico inicial

- `git status --short --branch` estava limpo em `main`.
- `npm run typecheck -- --noUnusedLocals --noUnusedParameters false` não encontrou imports, variáveis ou declarações locais não utilizadas.
- A varredura de rotas confirmou que `/app/config/auditoria` e `/app/config/usuarios` existem como páginas reais.
- A documentação ainda citava caminhos e descrições antigos: `src/app/app/auditoria/page.tsx`, `src/lib/notifications/events.ts`, `src/lib/ip.ts`, `usuarios/` como placeholder e auditoria/configuração como placeholder.

### Itens removidos ou atualizados

| Item | Ação | Justificativa |
|---|---|---|
| `.DS_Store` no root | Removido do filesystem local | Artefato de Finder; já está coberto por `.gitignore`; não é entrada de build, teste, rota, script ou runtime. |
| `jose` | Removido de `package.json` e `package-lock.json` | `rg` não encontrou import ou require em `src`, `scripts`, `e2e` ou testes; `src/lib/auth/session.ts` e `src/proxy.ts` usam Supabase Auth via helpers Supabase, não JWT customizado. |
| `ARCHITECTURE.md` | Atualizado | Removidas referências a paths inexistentes (`src/lib/ip.ts`, `src/lib/notifications/events.ts`, `src/app/app/usuarios`) e descrição antiga de placeholders administrativos. |
| `CLAUDE.md` | Atualizado | Corrigidos paths de configuração/auditoria/usuários e event bus real (`src/lib/events.ts`). |
| `README.md`, `CLAUDE.md`, `GEMINI.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `API.md`, `DEPENDENCIES.md` e plano E2E histórico | Atualizados | Removidas descrições obsoletas de JWT customizado/`jose`; a autenticação atual é Supabase Auth com revalidação local de admin. |
| `PAGES.md` | Atualizado | Auditoria não é mais placeholder; configuração tem hub real de integrações/webhooks e apenas uma área reservada para preferências futuras. |

### Candidatos mantidos por cautela

- `.claude/agents`, `.claude/commands` e `.agents/skills`: parecem fragmentar a árvore, mas são tooling de agentes e podem ser consumidos fora do build da aplicação.
- `docs/superpowers/*`, `docs/dbsave.md`, `docs/migrationdb.md`: há conteúdo histórico e alguns trechos antigos, mas servem como registros de decisões/planos; não foram removidos sem critério de arquivamento explícito.
- Migrations antigas e snapshots Drizzle: não remover sem evidência de journal/live DB e sem fluxo dedicado de migração.
- Campos `assigneeName`/`associateName` em `BoardActivity`: preservados conforme regra de domínio documentada em `AGENTS.md`.
- Achados do `knip --production`: mantidos por cautela quando eram rotas App Router, Server Actions, scripts operacionais, exports públicos ou dependiam de configuração externa. O próprio Knip avisou que não conseguiu carregar `drizzle.config.ts` sem URL de banco, então o relatório foi usado apenas como triagem auxiliar.

### Validações

- `npm run typecheck -- --noUnusedLocals --noUnusedParameters false` — passou.
- `npm exec knip -- --production --dependencies --reporter compact --no-exit-code --no-progress` — apontou apenas `jose` como dependência direta não usada; uma primeira execução sem env também emitiu aviso por falta de URL de banco ao carregar `drizzle.config.ts`.
- `env DATABASE_URL=postgres://gabrielramos@localhost:5432/asof_intranet npm exec knip -- --production --dependencies --reporter compact --no-exit-code --no-progress` — passou sem novos achados depois da remoção de `jose`.
- `npm run typecheck` — passou.
- `npm run lint` — passou.
- `npm run test` — passou (`100` arquivos de teste, `731` testes).
- `npm run build` — passou; o build confirmou as rotas App Router atuais, incluindo `/app/config/auditoria` e `/app/config/usuarios`.
- `npm audit --audit-level=low` — passou com `0` vulnerabilidades.
