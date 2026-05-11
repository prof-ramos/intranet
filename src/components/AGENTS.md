# src/components — Componentes UI Compartilhados

Componentes React reutilizáveis entre múltiplas rotas. Não contêm lógica de negócio nem acessam `db` diretamente.

## Convenções

- Componentes puramente visuais (sem estado) são Server Components por padrão — não adicionar `'use client'` desnecessariamente.
- Componentes com estado, event handlers ou hooks do React recebem `'use client'`.
- Props tipadas explicitamente com `interface`; não usar `any`.
- Estilização via Tailwind inline; evitar CSS Modules ou styled-components.
- Ícones via `lucide-react` — não instalar outras bibliotecas de ícones.

## O que NÃO colocar aqui

- Componentes específicos de uma única rota devem ficar na própria pasta da rota (ex: `UserActionsPanel.tsx` fica em `src/app/app/usuarios/`).
- Nunca importar Server Actions de `src/app/` dentro de um componente em `src/components/`; passar actions como props.
