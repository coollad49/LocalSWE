# Provenance — hard-004

**Repository:** `p-queue` (https://github.com/sindresorhus/p-queue)
**Repository URL:** https://github.com/sindresorhus/p-queue
**Issue URL:** https://github.com/sindresorhus/p-queue/issues/241
**Pull Request URL:** https://github.com/sindresorhus/p-queue/pull/241
**License:** MIT
**License URL:** https://github.com/sindresorhus/p-queue/blob/main/license

**Base Commit (fixed):** `a64b31663680f975571b6d7003b4dec86012c536`
**Buggy Commit (parent):** `3bd13ea130b105d8521e0ba4115a68671967200d`
**Fixed Commit:** `a64b31663680f975571b6d7003b4dec86012c536`

**Original Issue Title:** Fix `signal` option not rejecting when task is aborted while queued
**Original Issue Date:** 2026-03-31
**Author:** Sindre Sorhus

**Description of Fix:**
- `source/index.ts`: Added `queueAbortHandler` for queued tasks, checks `signal.aborted` at queue time and rejects immediately if already aborted, registers `signal.addEventListener('abort', handler, {once:true})` when task is queued, and removes the task from the queue via `this.queueClass.dequeue` / `priorityQueue` removal on abort, with proper `removeEventListener` cleanup. Also handles `signal.reason` forwarding.
- `source/priority-queue.ts`: Added ability to filter/remove queued items by signal, and `dequeue` logic for abort.
- `source/queue.ts`: Minor update to support removal.

**Buggy State Reproduction:**
```
git checkout 3bd13ea
# queue concurrency 1, add blocking task, add queued task with signal, abort -> queued task not rejected, queue.size still 1, eventually runs
```

**Fixed State Verification:**
```
git checkout a64b316
# same -> queued task rejects with AbortError, not run, queue.size 0
```

**Test Evidence:**
- Original PR added `test/advanced.ts` 453 lines covering `signal` while queued, already aborted, custom reason, priority queue removal, and event listener cleanup.
- Our oracle has 6 tests covering queued abort, already aborted, not affecting running, custom reason, priority removal, and running abort distinction.

**Retrieval Date:** 2026-08-29
**Retrieval Method:** `git archive` from pinned commits, verified `buggy→fail / fixed→pass` 3×.

**Modifications for Benchmark:**
- Repository snapshot at fixed commit `a64b316` under `benchmark/frontier-hard/repositories/p-queue` (MIT), with `tsconfig.json` adjusted for vitest and `node_modules/eventemitter3` and `p-timeout` copied for `bun`/`vitest` resolution.
- Buggy files isolated under `artifacts/buggy/source/{index,priority-queue,queue}.ts`.
- `tests/basic.test.ts` added for regression; `eventemitter3` and `p-timeout` available via host `node_modules` and repo `node_modules`.

**License Verification:** MIT — permissive, documented in `license`, compatible.
