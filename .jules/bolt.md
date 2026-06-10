## 2026-06-10 - Resolving N+1 Database Queries

**Learning:** When executing multiple independent actions in a loop, sequential database calls create a significant performance bottleneck (N+1 problem). Calling asynchronous DB-backed services sequentially causes cumulative IO latency.

**Action:** Whenever looping over operations that do not depend on the previous iterations, hoist shared operations (like caching static user IDs) out of the loop. Map the collection to promises and use `Promise.all` or `Promise.allSettled` (with proper error boundaries to replicate independent execution contexts) to allow concurrent I/O.
