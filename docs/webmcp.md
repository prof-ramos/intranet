# WebMCP da Secretaria

**Status:** em produção no layout autenticado; descoberta nativa depende de Chrome/Edge com WebMCP.
**Escopo:** tools no `document.modelContext` para um agente no browser, com a sessão da staff já aberta. Não é um servidor MCP e não altera a UI humana.

A decisão está no [ADR 021](./adr/021-webmcp-secretaria.md). O MCP externo de Atividades (API key, issue #432) continua em [mcp.md](./mcp.md) e **não** está implementado.

## 1. O que é e o que não é

WebMCP ([spec](https://github.com/webmachinelearning/webmcp)) expõe funções da página como tools. A intranet registra o catálogo só em `/app/*`, para `admin`, `diretoria` e `secretaria`. Associados da carreira **não** usam estas tools.

| Isto | Não isto |
| ---- | -------- |
| Tools no browser, com cookie de sessão | Servidor MCP, API key ou M2M |
| As mesmas Server Actions e `router.push` da UI | Segunda camada de domínio |
| Progressive enhancement: sem `document.modelContext`, registro é no-op | UI de chat neste repositório |
| PII operacional igual à ficha para staff autenticado | Tools em `/login` |

Há duas superfícies no repositório. Não misturar os nomes:

- **WebMCP (este documento):** hífen, client-side, `search-officials`, `complete-activity`.
- **MCP externo previsto:** underscore, `activities_list`, `activity_complete`. Não adicionar esses nomes em `WEBMCP_CATALOG`.

## 2. Como registra

```text
layout autenticado (`src/app/app/layout.tsx`)
  └── WebMcpRegistryWrapper (dynamic, ssr: false)
        └── WebMcpRegistry
              ├── listToolNamesFor(role, pathname)
              ├── buildSecretariaTools(router, { officialId })
              └── registerTools → document.modelContext.registerTool
```

`WebMcpRegistry` reexecuta o registro quando mudam `pathname`, `role` ou `router`. O `AbortController` do `useEffect` cancela o registro anterior; o runtime nativo deve desmontar as tools abortadas.

Sem `document.modelContext` (`src/lib/webmcp/detect.ts`), `registerTools` devolve `0` e a UI não muda.

### Origem Trial e flag local

`WEBMCP_ORIGIN_TRIAL_TOKEN` é opcional, lida em `next.config.ts` (não em `src/lib/env.ts`). Sem token:

- desenvolvimento: `chrome://flags/#enable-webmcp-testing`;
- produção: o agente nativo não descobre tools até o domínio `intranet.asof.com.br` estar no trial.

Não publicar `Permissions-Policy: tools=()` (desligaria a API). Não setar `Origin-Agent-Cluster: ?0`.

## 3. Filtro por role e rota

Fonte: [`src/lib/webmcp/catalog.ts`](../src/lib/webmcp/catalog.ts).

- `roles: 'any'` = qualquer staff autenticado (`admin`, `diretoria`, `secretaria`).
- `scope: 'app'` = qualquer rota em `/app/*`.
- `scope: 'official-profile'` = só `/app/associados/:id` (ficha). Não vale em `/app/associados`, `/novo` nem `/editar`.

`diretoria` **não** recebe `start-create-official`, `generate-institutional-email` nem `open-email-generator`. Escritas de atividade (`start-create-activity`, `complete-activity`, `assign-activity`) acompanham `updateActivityAction`: admin, diretoria e secretaria.

## 4. Catálogo

Os schemas e o `execute` vivem em [`src/lib/webmcp/build-tools.ts`](../src/lib/webmcp/build-tools.ts). A tabela abaixo é o índice; não duplicar o schema aqui.

Legenda de efeito:

- **Ler** — Server Action, sem navegação.
- **Abrir** — `router.push` para a UI humana; tools `start-*` **não gravam**.
- **Escrever** — action + `router.refresh()`.
- **Destrutivo** — `destructiveHint`; sem o diálogo de confirmação da UI.

### Cadastro de oficiais

| Tool | Efeito | Roles | Notas |
| ---- | ------ | ----- | ----- |
| `global-search` | Ler | any | Nome de oficial e título de atividade. **Não** busca CPF/SIAPE. |
| `search-officials` | Ler | any | Nome / CPF / SIAPE. Ver contrato abaixo. |
| `get-official-profile` | Ler | any | Ficha operacional serializada (sem colunas ciphertext). |
| `open-officials-list` | Abrir | any | `/app/associados`, opcional `?q=`. |
| `open-official-profile` | Abrir | any | `/app/associados/:id`. |
| `start-create-official` | Abrir | admin, secretaria | `/app/associados/novo`. |
| `start-edit-official` | Abrir | any | `/app/associados/:id/editar`. |

`search-officials` compartilha `searchBy=name\|cpf\|siape` com a listagem humana. Não apagar `searchBy` da query string da UI.

| `searchBy` | Quando dispara lookup | Comportamento |
| ---------- | --------------------- | ------------- |
| `name` (padrão) | ≥ 2 caracteres | Match parcial. |
| `cpf` | 11 dígitos | Match exato por hash. Pontuação é ignorada. CPF incompleto **não** consulta o banco; devolve o texto de ajuda. |
| `siape` | ≥ 5 dígitos | Match exato por hash. |

Sem termo pronto e sem filtro (`associationStatus`, `functionalStatus`, `contributionStatus`, `location`), a action devolve `rows: []` e uma mensagem pedindo termo ou filtro. Não inventar um segundo query do cadastro.

### Ofícios

| Tool | Efeito | Roles |
| ---- | ------ | ----- |
| `list-official-letters` | Ler | admin, diretoria, secretaria |
| `get-official-letter` | Ler | admin, diretoria, secretaria |
| `start-create-official-letter` | Abrir | admin, diretoria, secretaria |
| `start-edit-official-letter` | Abrir | admin, diretoria, secretaria |
| `generate-official-letter-draft` | Ler (IA) | admin, diretoria, secretaria |
| `send-official-letter-for-signature` | Escrever | admin, diretoria, secretaria |
| `cancel-official-letter` | Destrutivo | admin, diretoria, secretaria |

`generate-official-letter-draft` **não** persiste o ofício. `get-official-letter` devolve corpo em texto plano, sem HTML.

### Mala direta e e-mail

| Tool | Efeito | Roles | Notas |
| ---- | ------ | ----- | ----- |
| `count-mailing-audience` | Ler | admin, diretoria, secretaria | Filtros iguais à tela de exportação. |
| `export-gmail-contacts-csv` | Escrever (download) | admin, diretoria, secretaria | CSV Google Contacts; **não** envia e-mail. |
| `generate-institutional-email` | Ler (IA) | admin, secretaria | Assunto + HTML; **não** envia. |
| `open-mala-direta` | Abrir | admin, diretoria, secretaria | `/app/mala-direta`. |
| `open-email-generator` | Abrir | admin, secretaria | `/app/secretaria/emails/gerar`. |

### Atividades

Não existe `list-activities`. O board loader é da página; o tool não dispara uma segunda query do quadro. Não há rota `/app/atividades/[id]`.

| Tool | Efeito | Roles | Notas |
| ---- | ------ | ----- | ----- |
| `open-activities` | Abrir | any | `/app/atividades`. |
| `open-activity` | Abrir | any | `/app/atividades?open=:id` (gaveta). |
| `start-create-activity` | Abrir | admin, diretoria, secretaria | `/app/atividades/nova`; o form completo não é POST pelo tool. |
| `complete-activity` | Escrever | admin, diretoria, secretaria | `updateActivityAction` com `status: 'concluido'`. |
| `assign-activity` | Escrever | admin, diretoria, secretaria | `updateActivityAction` com `assigneeId`. |

Jurídico continua fora do orçamento. Nova tool de jurídico exige decisão de role/orçamento.

### Overlay da ficha (`/app/associados/:id`)

`associateId`, se enviado, precisa coincidir com o id da rota. Omitido, usa a ficha aberta. Fora da ficha estas tools **não** entram no catálogo.

| Tool | Efeito |
| ---- | ------ |
| `add-dependent` | Escrever |
| `edit-dependent` | Escrever |
| `remove-dependent` | Destrutivo |
| `add-health-agreement` | Escrever |
| `edit-health-agreement` | Escrever |
| `remove-health-agreement` | Destrutivo |

## 5. PII, logs e autorização

- A tool corre no browser da staff. A visibilidade é a da ficha; não reintroduzir máscara por role sem nova decisão de produto.
- Server Actions continuam em `requireAuth` / `requireRole`. O catálogo WebMCP **filtra descoberta**; a action ainda recusa papel indevido.
- Logs: `sanitizePii` / `toSafeErrorLog`. Falha de `registerTool` vira `warn` no logger `webmcp`, sem plaintext.
- `serializeOfficialProfile` e os serializers de ofício omitem colunas ciphertext.

## 6. Arquivos

| Caminho | Função |
| ------- | ------ |
| `src/lib/webmcp/catalog.ts` | Nomes, roles, scope |
| `src/lib/webmcp/build-tools.ts` | Schemas e `execute` |
| `src/lib/webmcp/register.ts` | `document.modelContext.registerTool` |
| `src/lib/webmcp/detect.ts` | `getModelContext()` |
| `src/lib/webmcp/result.ts` | JSON / texto / erro / navegação |
| `src/components/webmcp/WebMcpRegistry.tsx` | Efeito de registro |
| `src/app/app/associados/webmcp-actions.ts` | `searchOfficialsAction`, `getOfficialProfileAction` |
| `src/app/app/layout.tsx` | Monta o wrapper com `user.role` |
| `src/types/webmcp.d.ts` | Tipos `webmcp-types` |

## 7. Como testar

Playwright **não** cobre WebMCP nativo. A garantia automatizada é unitária, com `document.modelContext` mockado.

```bash
npx vitest run src/lib/webmcp src/components/webmcp src/app/app/associados/webmcp-actions.test.ts
```

Checklist no Chrome (flag ou Origin Trial):

1. Abrir `/app` autenticado. Sem a API, a UI humana permanece idêntica.
2. Com a API, o agente nativo lista as 24 tools de `scope: 'app'` (admin). `add-dependent` **não** aparece fora da ficha.
3. Em `/app/associados/:id`, passam a existir as 6 tools de overlay.
4. `search-officials` com nome ≥ 2 caracteres devolve linhas; CPF curto devolve ajuda e `total: 0`.
5. `open-activity` navega para `/app/atividades?open=:id` e abre a gaveta. Não existe `/app/atividades/[id]`.
6. Overlay com `associateId` de outro oficial deve falhar com a mensagem da ficha aberta.

Sem runtime nativo, injetar `document.modelContext` **antes** dos scripts da página (init script) e recarregar `/app` exercita o mesmo `execute` das Server Actions. Um polyfill que só acumula tools no `Map`, sem honrar o `AbortSignal`, **não** prova o desmonte ao sair da ficha.

Não disparar em massa `complete-activity`, `cancel-official-letter` nem `send-official-letter-for-signature` em dados que importam.

## 8. Fora desta superfície

- Servidor MCP / issue #432 — [mcp.md](./mcp.md).
- Tools `activities_*` — contrato-alvo do adaptador externo, não do `WEBMCP_CATALOG`.
- Jurídico.
- Chat embutido na intranet.

## Referências

- [ADR 021](./adr/021-webmcp-secretaria.md)
- [PAGES.md](../PAGES.md) — área autenticada
- [CONTEXT.md](../CONTEXT.md) — vocabulário (lotação, vínculo ASOF, ofício)
- [activities.md](./activities.md) — evolução do módulo Atividades
- [mcp.md](./mcp.md) — MCP externo previsto
- [plans/018-webmcp-atividades-spike.md](../plans/018-webmcp-atividades-spike.md)
