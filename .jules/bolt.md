## 2024-06-10 - Batching Async Work with Promise.all
**Learning:** Sequential async operations inside a loop (N+1 query problem) create significant latency in database-heavy jobs.
**Action:** Always look for opportunities to replace `for...of` loops containing `await` with `await Promise.all(array.map(async item => ...))` when the order of execution doesn't matter and operations can be parallelized over a single connection.

## 2026-06-04 - Memoization in Kanban boards
**Learning:** In highly interactive components like drag-and-drop Kanban boards, re-rendering every item during an interaction causes severe CPU usage. React's default behavior is to re-render all children when a parent state changes.
**Action:** Use `React.memo` on individual card and avatar components within the board list so that only the items actually changing state or position are re-rendered, reducing layout thrashing and improving drag fluidity.

## 2026-06-05 - useMemo in Selectors/Dropdowns
**Learning:** Dropdowns or pickers that filter lists based on queries often trigger re-renders even when the query doesn't change (e.g. toggling the dropdown state). Doing array operations on every render like `.filter().slice()` causes unnecessary CPU cycles, specially if the list might grow.
**Action:** Use `useMemo` on list filtering operations inside components that contain internal state (like dropdowns) to prevent the derived data from being recalculated during unrelated state updates.

## 2026-06-07 - Optimizing AtividadesBoard with Memoization

**Learning:** Unmemoized complex components like `FilterBar`, `SummaryStrip`, and `QuickAdd` in the `AtividadesBoard` cause unnecessary re-renders when the parent's state changes (like when typing in an input field or dragging a board item). This affects the responsiveness of the app, especially as the number of items and interactions grows.

**Action:** Wrap these components with `React.memo` and ensure that the callbacks passed to them from `AtividadesBoard` are stabilized using `useCallback`. This prevents the components from re-rendering unless their props change. Use memoization selectively for expensive sub-components.

## 2026-06-08 - useCallback in Board Preferences
**Learning:** Exporting unmemoized state setters from a custom hook like `useBoardPreferences` causes downstream components wrapped in `React.memo` (e.g., `FilterBar`) to re-render unnecessarily on every state change because the setter function references change.
**Action:** Use `useCallback` when returning state setters from custom hooks to maintain referential equality, ensuring that `React.memo` optimizations in child components work effectively and prevent layout thrashing during interactions.

## 2026-06-10 - Drizzle ORM Select Chain Mocking with Limit
**Learning:** When writing tests that mock Drizzle ORM query chains that end in `.limit()`, ensuring they can also be awaited directly (like `.where(inArray(...))`) is tricky because returning `{ limit: vi.fn() }` prevents the Promise from resolving immediately.
**Action:** Use `Object.assign(Promise.resolve(rows), { limit: vi.fn().mockResolvedValue(rows) })` when creating the mock chain. This ensures the mock works interchangeably for queries that immediately await `.where()` and those that chain `.limit()` before awaiting.
