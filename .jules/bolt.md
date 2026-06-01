## 2026-06-01 - React.memo for Kanban Board Cards
**Learning:** In a drag-and-drop Kanban board environment (`AtividadesBoard.tsx`), children components (`ActivityCardContent`, `Avatar`) heavily benefit from `React.memo()`. This prevents the entire board from re-rendering during drag operations or minor state updates, resolving potential 60fps drops.
**Action:** Always verify if list/board items have complex renders and wrap them in `React.memo` for immediate frame-rate boosts.
