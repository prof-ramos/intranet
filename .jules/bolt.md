## 2026-06-04 - Memoization in Kanban boards
**Learning:** In highly interactive components like drag-and-drop Kanban boards, re-rendering every item during an interaction causes severe CPU usage. React's default behavior is to re-render all children when a parent state changes.
**Action:** Use `React.memo` on individual card and avatar components within the board list so that only the items actually changing state or position are re-rendered, reducing layout thrashing and improving drag fluidity.

## 2026-06-05 - useMemo in Selectors/Dropdowns
**Learning:** Dropdowns or pickers that filter lists based on queries often trigger re-renders even when the query doesn't change (e.g. toggling the dropdown state). Doing array operations on every render like `.filter().slice()` causes unnecessary CPU cycles, specially if the list might grow.
**Action:** Use `useMemo` on list filtering operations inside components that contain internal state (like dropdowns) to prevent the derived data from being recalculated during unrelated state updates.
## 2024-06-07 - Optimizing AtividadesBoard with Memoization

**Learning:** Unmemoized complex components like `FilterBar`, `SummaryStrip`, and `QuickAdd` in the `AtividadesBoard` cause unnecessary re-renders when the parent's state changes (like when typing in an input field or dragging a board item). This affects the responsiveness of the app, especially as the number of items and interactions grows.

**Action:** Wrap these components with `React.memo` and ensure that the callbacks passed to them from `AtividadesBoard` are stabilized using `useCallback`. This prevents the components from re-rendering unless their props change. Use memoization selectively for expensive sub-components.
