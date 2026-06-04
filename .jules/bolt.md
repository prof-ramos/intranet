## 2026-06-04 - Memoization in Kanban boards
**Learning:** In highly interactive components like drag-and-drop Kanban boards, re-rendering every item during an interaction causes severe CPU usage. React's default behavior is to re-render all children when a parent state changes.
**Action:** Use `React.memo` on individual card and avatar components within the board list so that only the items actually changing state or position are re-rendered, reducing layout thrashing and improving drag fluidity.
