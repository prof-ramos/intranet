## 2024-06-10 - Batching Async Work with Promise.all
**Learning:** Sequential async operations inside a loop (N+1 query problem) create significant latency in database-heavy jobs.
**Action:** Always look for opportunities to replace `for...of` loops containing `await` with `await Promise.all(array.map(async item => ...))` when the order of execution doesn't matter and operations can be parallelized over a single connection.
