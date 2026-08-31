# ADR 021: MCP como control plane de operador

## Status

Aceito (2026-08-31)

## Contexto

A intranet opera quase todo o domínio por Server Actions + cookie de sessão. A superfície HTTP pública em `API.md` é intencionalmente pequena (health, events, crons, webhooks). O `.mcp.json` do repositório expõe Context7 e Postgres direto (`DATABASE_MIGRATION_URL`) só para agentes de engenharia — não é control plane de produto. Expor SQL ao agente contradiz o ADR 001 (barreira = app server, não cliente no banco).

A diretoria quer que operadores internos (`admin`, `diretoria`, `secretaria`) controlem a intranet a partir de clientes MCP (Claude, Cursor) com a **mesma identidade, as mesmas regras de role e a mesma auditoria** da UI.

O spec MCP para servidores HTTP remotos recomenda OAuth 2.1 + RFC 9728. O produto hoje não tem Authorization Server, PAT nem OAuth. Construir OAuth antes de provar o desenho é custo alto. Autenticação M2M (`integration_api_keys` + HMAC) não carrega `role` vivo nem atribui mutação a uma pessoa.

Conectar Claude/Cursor faz o modelo do operador processar dados pessoais. Isso é **finalidade nova** em relação à UI, mesmo com visibilidade integral no app (`CONTEXT.md`: a visibilidade no app não autoriza exposição fora da intranet).

## Decisão

1. **Control plane MCP no Next.js**, endpoint Streamable HTTP em `/api/mcp` via `mcp-handler` (stateless por request, adequado à Vercel). A UI permanece. Server Actions e tools MCP chamam os mesmos services em `src/lib/*/service.ts`. Não abrir REST CRUD ampla em `/api/v1/*`.

2. **Identidade de operador via PAT**, tabela `operator_mcp_tokens`, prefixo `asof_mcp_`. Token plaintext só na criação. Hash SHA-256 em repouso. Role sempre relida de `admins` (`isActive`, `mustChangePassword`). Usuário inativo ou com troca de senha pendente invalida o MCP na hora. Não reutilizar `integration_api_keys`.

3. **OAuth 2.1 / protected resource metadata fica adiada.** Follow-up deste ADR quando o PAT estiver em uso real e um cliente exigir o fluxo OAuth do spec.

4. **LGPD do canal MCP:**
   - Checkbox de ciência na criação do PAT (`lgpd_acknowledged_at`).
   - Tools de leitura: campos operacionais por padrão; CPF, SIAPE, e-mail, telefone, endereço, RG, data de nascimento, `internalNotes` e correlatos só com `include_sensitive: true`.
   - Cada tool call audita com `metadata.channel = 'mcp'` e o `adminId` da pessoa (`data_view` / mutações futuras).
   - Logger MCP usa `sanitizePii`. Nunca logar argumentos ou resultados em plaintext.
   - O `.mcp.json` com `server-postgres` permanece tooling de engenharia, não produto.

5. **Cobertura em ondas.** Onda 1 = leitura do Cadastro de Oficiais. Writes, demais módulos, export CSV, rotação de secrets, Gemini key, reset de senha e desligamento LGPD ficam fora até onda explícita.

6. **`src/proxy.ts` não redireciona `/api/mcp` para `/login`.** O handler autentica via Bearer (`withMcpAuth`).

## Consequências

- **Positivo:** Agentes operam o mesmo domínio da UI sem duplicar regras de negócio nem alargar a API pública.
- **Positivo:** Auditoria LGPD Art. 30/37 continua atribuível a um `admins.id`.
- **Positivo:** Secretaria não vê tools de financeiro/jurídico quando essas ondas existirem (`toolsForRole`).
- **Negativo:** PAT no cliente LLM é um segredo de longo prazo; expiração (90 dias) e revogação são obrigatórias.
- **Negativo:** O provedor do modelo escolhido pelo operador torna-se subprocessador de PII. A ciência no PAT documenta essa transferência; não substitui DPA institucional.
- **Negativo:** Sem OAuth, o cliente precisa colar o Bearer no MCP config (mesmo ritual das API keys).
- **Ação futura:** OAuth 2.1; ondas 2+ de tools; avaliar mascarar `fullName` em listagens se a operação permitir.

## Fora de escopo (este ADR)

- REST CRUD em `/api/v1/*`
- Automações M2M via MCP
- MCP stdio local com cookie de sessão
- `@modelcontextprotocol/server-postgres` como produto
- Módulo Documentos (ADR 008)
- Mutations de usuários, API keys, webhook secrets, retenção LGPD e jobs cron
