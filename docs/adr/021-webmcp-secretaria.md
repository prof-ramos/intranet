# ADR 021: WebMCP na intranet para a Secretaria

## Status

Aceito (2026-09-04)

## Contexto

Um agente de IA futuro da ASOF deve operar a intranet **com a sessão da secretaria já aberta no browser**, sem um segundo backend e sem UI de chat neste repositório. A spec [WebMCP](https://github.com/webmachinelearning/webmcp) expõe funções da página como tools (`document.modelContext.registerTool`) para agentes nativos do browser (Chrome Origin Trial 149+, Edge 150, ChatGPT Desktop).

Isto é complementar, não substituto, de um eventual **MCP operador** no servidor (draft #432). WebMCP preserva a UI humana, a sessão cookie e o `requireRole` das server actions. Associados da carreira **não** usam estas tools — só staff autenticado em `/app/*`.

## Decisão

1. **API imperativa** em client components, progressive enhancement: sem `document.modelContext` o registro é no-op e a UI não muda.
2. Tools só montam no layout autenticado [`src/app/app/layout.tsx`](../../src/app/app/layout.tsx). Role chega por props. Cada `execute` dispara a mesma server action (ou `router.push` para forms longos) que a UI já usa.
3. Catálogo filtrado por **role + rota**. Overlay de dependentes/convênios só na ficha `/app/associados/[id]`. Escritas longas (`createAssociate`, ofício TipTap) são `start-*` (navegam ao form). Escritas compactas (Assinafy, cancelar, IA, mala direta) executam a action e dão `router.refresh()`.
4. Origin Trial opcional via `WEBMCP_ORIGIN_TRIAL_TOKEN` em [`next.config.ts`](../../next.config.ts). Não publicar `Permissions-Policy: tools=()` (desligaria a API). Não setar `Origin-Agent-Cluster: ?0`.
5. PII: mesma visibilidade operacional da ficha para staff autenticado. Logs com `sanitizePii` / `toSafeErrorLog`. Sem tools em `/login`.

## Consequências

- O agente futuro descobre tools só com a intranet aberta e o browser compatível (flag local ou Origin Trial).
- Playwright E2E não cobre WebMCP nativo; a garantia é unitária com `document.modelContext` mockado + checklist manual no Chrome.
- Ampliar o catálogo (atividades, jurídico) exige nova decisão de orçamento de tools e de role.

## Follow-ups

- Token de Origin Trial de produção quando o domínio `intranet.asof.com.br` for inscrito no trial do Chrome/Edge.
- Agente da Secretaria: projeto separado; este ADR não autoriza UI de chat nem MCP servidor.
