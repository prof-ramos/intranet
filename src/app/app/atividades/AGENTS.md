# src/app/app/atividades — Módulo Kanban de Atividades

Board Kanban para acompanhamento de atividades internas da ASOF. Rota: `/app/atividades`. Acesso para todos os roles.

## Arquivos principais

- `page.tsx` — Server Component; carrega atividades e lista de admins para o board.
- `AtividadesBoard.tsx` — Client Component principal do Kanban (drag-and-drop de colunas de status).
- `ReassignModal.tsx` — modal para reatribuir responsável de uma atividade.
- `_board/` — subcomponentes internos do board (cards, colunas, etc.); prefixo `_` os exclui do roteamento.
- `nova/` — formulário de criação de nova atividade.

## Schema relevante (`activities`)

- `status`: enum `pending | in_progress | done | cancelled`
- `assigneeId`: FK para `admins.id` — responsável pela atividade
- `assigneeName`: fallback de renderização otimista; não é a fonte canônica (usar `peopleById` map)
- `dueDate`: timestamp; exibir alerta visual se `dueDate < now()` e status ≠ `done`

## Regras

- O mapa `peopleById` (carregado no Server Component) é autoritativo para nomes — não usar `assigneeName` como fonte de exibição principal.
- Mutations de status e reatribuição devem registrar em `audit_logs` com `entity_type = 'activity'`.
- Drag-and-drop é otimista: aplica mudança local imediata e reverte em caso de erro da Server Action.
- Não adicionar campos de PII de associados em `BoardActivity`.
