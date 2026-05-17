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
