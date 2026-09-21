# ADR 022: Servidor MCP da intranet sobre HTTP com token de operador

## Status

Aceito (2026-09-21). Implementação em andamento nesta data; este ADR registra a decisão, não uma entrega concluída.

## Contexto

A intranet expõe tools a agentes de duas formas. O WebMCP de navegador ([ADR 021](./021-webmcp-secretaria.md)) registra tools no `document.modelContext` com a sessão da staff já aberta. Não existe servidor MCP: um agente no Claude, Cursor ou ChatGPT Desktop, fora da página, não consegue operar a intranet.

A diretoria quer que operadores internos (`admin`, `diretoria`, `secretaria`) usem clientes MCP com a mesma identidade, as mesmas regras de role e a mesma auditoria da UI.

Três restrições moldam a decisão:

1. **A spec MCP prevê OAuth 2.1 para HTTP.** Um servidor HTTP que implemente autorização deve conformar à spec de autorização (OAuth 2.1, Protected Resource Metadata RFC 9728, resource indicators RFC 8707). O produto não tem Authorization Server, e construir OAuth antes de provar o desenho é custo alto.
2. **A autenticação M2M existente não serve para agente.** `/api/v1` usa `x-asof-key` + `x-asof-timestamp` + `x-asof-signature` (HMAC). Cliente MCP de IDE não assina isso: envia `Authorization: Bearer`. Além disso, `integration_api_keys` não carrega role vivo nem atribui a mutação a uma pessoa.
3. **Cookie de sessão não é identidade de agente.** A spec MCP é explícita: "MCP servers that implement authorization MUST verify all inbound requests. MCP servers MUST NOT use sessions for authentication."

Expor PII a um modelo de linguagem é **finalidade nova** em relação à UI. O `CONTEXT.md` escopa o "sem máscara" a dentro da intranet (linha 341) e afirma que a visibilidade integral no app não autoriza exposição fora da intranet (linha 342).

## Decisão

1. **Servidor MCP em Streamable HTTP no Next.js**, endpoint `/api/mcp` via `mcp-handler`, stateless por requisição, adequado à Vercel. A UI permanece; as tools MCP e as Server Actions chamam os mesmos services em `src/lib/*/`. Não abrir REST CRUD ampla em `/api/v1/*`.

2. **Identidade de operador por token de acesso pessoal (PAT).** Bearer `asof_mcp_…`, tabela `operator_mcp_tokens`, hash SHA-256 em repouso, plaintext exibido uma única vez na criação, com rotação e revogação, expiração de 90 dias. A role é relida de `admins` a cada requisição e nunca viaja no token: admin inativo ou com troca de senha pendente invalida o acesso imediatamente. `integration_api_keys` continua sendo o mecanismo de automação M2M em `/api/v1` e não é substituído por esta decisão.

3. **OAuth 2.1 fica adiado.** Desvio deliberado e aceito da spec de autorização do MCP. Follow-up quando o PAT estiver em uso real e um cliente exigir o fluxo OAuth.

4. **Rate limit e semântica de erro.** Dois limitadores: por IP antes da autenticação e por token depois. Limite excedido responde **429 com `Retry-After`**. Falha do armazenamento de limite responde **503**. Nunca 401 — 401 sinalizaria credencial inválida e faria o cliente descartar um token válido. Isto melhora deliberadamente as rotas de integração existentes, que omitem `Retry-After` e deixam falha de store virar 500.

5. **Nomes de tool com underscore e prefixo de serviço:** `officials_search`, `official_get`, `global_search`, além da listagem de dependentes e convênios. `search` puro é evitado porque servidores MCP convivem com outros e nomes genéricos colidem. A onda 1 é somente leitura sobre o Cadastro de Oficiais. Tools de navegação (`open-*`, `start-*`) não existem no servidor: não há browser. O catálogo WebMCP com hífen não é copiado, e nomes de servidor não entram no `WEBMCP_CATALOG`.

6. **PII mascarada por canal, com opt-in explícito.** As tools devolvem campos operacionais por padrão. Campos pessoais (CPF, SIAPE, e-mail, telefone, WhatsApp, endereço, RG, data de nascimento, bairro, CEP, `internalNotes`) só com `includeSensitive: true`. Base documental: `CONTEXT.md` linha 341 escopa o "sem máscara" a dentro da intranet, e a linha 342 nega que a visibilidade no app autorize exposição externa. Como o cliente MCP está fora da intranet por definição e o modelo do operador passa a tratar os dados, devolver PII integral sem pedido explícito contrariaria essa política. Isto **não** reintroduz máscara por role: o `AGENTS.md` proíbe máscara por role, e o que se implementa aqui é máscara por **canal**, eixo diferente.

7. **Auditoria com ator distinguível.** Cada chamada autenticada gera registro com `metadata.channel = 'mcp'` e o `adminId` atuante. Token, segredo e PII em claro nunca aparecem em log, erro ou metadado de auditoria; o logging passa por `sanitizePii`. As colunas `actor_type` e `actor_api_key_id` **não existem** hoje em `audit_logs`; adicioná-las pertence a outra fase, então esta decisão usa o marcador de canal no `metadata` existente.

8. **Feature flag `MCP_ENABLED`** controla a publicação do endpoint. Não reutilizar `ACTIVITY_MCP_ENABLED`, que pertence à fase de Atividades.

9. **Procedência da implementação: recuperação seletiva com revisão obrigatória.** O PR #432 fechado implementava esta mesma arquitetura e foi fechado **sem nunca ter sido revisado** — zero reviews formais, zero comentários inline, e os revisores automáticos pularam (um por falta do label `review-ready`, outro por cota esgotada). O ref ainda é recuperável. A decisão é recuperar apenas os arquivos específicos de MCP, revisar cada um contra as convenções atuais antes de aceitar, descartar as mudanças não relacionadas e renumerar migration e ADR, porque os números originais já estão ocupados. O código recuperado era não revisado; a revisão é pré-condição de aceitação.

10. **Correção factual em [mcp.md](../mcp.md).** Aquele documento citava "#432" como issue aberta. #432 é um **pull request fechado** e seu código não está em `main`.

## Consequências

- **Positivo:** agentes operam o mesmo domínio da UI sem duplicar regra de negócio nem alargar a API pública.
- **Positivo:** a auditoria continua atribuível a um `admins.id`, com o canal MCP distinguível de um clique humano.
- **Positivo:** `toolsForRole` permite que a Secretaria não veja tools de módulos que o role dela não alcança, quando essas ondas existirem.
- **Negativo:** o PAT no cliente é segredo de longo prazo; expiração e revogação são obrigatórias, não opcionais.
- **Negativo:** o provedor do modelo escolhido pelo operador torna-se subprocessador de PII quando `includeSensitive: true` é usado. Isto precisa constar do inventário LGPD.
- **Negativo:** sem OAuth, o cliente cola o Bearer na configuração do MCP, o mesmo ritual das API keys.
- **Negativo:** desvio consciente da spec de autorização do MCP. Um cliente que exija OAuth não conecta até o follow-up.
- **Negativo:** a migration `operator_mcp_tokens` foi renumerada de `0033` para `0041` porque `0033` já era `0033_unique_associate_identity_hashes.sql` e as migrations corriam até `0040`. Este ADR é o `022` porque o `021` do PR colidia com [021-webmcp-secretaria.md](./021-webmcp-secretaria.md).

## Follow-ups

- Implementar as colunas `actor_type` e `actor_api_key_id` em `audit_logs` na fase de Atividades (#507), não aqui.
- Avaliar mascarar `fullName` em listagens se a operação permitir.
- Onda 2: ofícios e mala direta. Onda 3: Atividades via #508, sobre a API de #507.
- Revisar a postura de PII se o uso real mostrar que `includeSensitive` é acionado em toda chamada — isso indicaria que a máscara por canal está no lugar errado.
- OAuth 2.1 quando houver cliente que exija o fluxo.

## Nota de processo

A consulta ao agente de raciocínio Oracle foi solicitada para esta decisão de arquitetura e **expirou após 30 minutos de inatividade sem retornar resultado**. A decisão foi tomada sem ela.
