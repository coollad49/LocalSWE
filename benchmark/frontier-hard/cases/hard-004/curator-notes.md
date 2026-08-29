# Curator Notes — hard-004

## Why This Is Hard

This bug requires **async/concurrency reasoning** and **lifecycle management**:

- `p-queue` has two distinct states for a task: **queued** (waiting in `priority-queue`/`queue`) vs **running** (executing with concurrency slot).
- The `signal` option was only handled for **running** tasks (via `p-timeout` and `signal` abort during execution), but not for **queued** tasks.
- The fix must:
  1. Check `signal.aborted` at `add` time — if true and task would be queued, reject immediately without queuing.
  2. If task is queued and signal later aborts, **remove** the task from the priority queue (which requires `priority-queue.ts` to support removal by signal/id) and reject the `add` promise with `signal.reason`.
  3. Clean up the `abort` event listener in all paths (run, abort, dequeue) to avoid leaks — the PR even added a test that spies on `addEventListener`/`removeEventListener`.
  4. Handle `priority` correctly — aborting a task must remove the correct one from the priority queue, not just any.

A superficial fix that only adds `signal.throwIfAborted()` at the start of `add` would handle the "already aborted" case but not the "abort while queued" case. A fix that just rejects but doesn't remove from queue would pass the simple `await promise` test but fail `queue.size` and subsequent queue behavior.

## Expected Agent Failure Mode

- **Naive fix 1:** Add `if (signal.aborted) throw signal.reason` at top of `add` — fixes "already aborted" but not "abort while queued" (since signal not aborted at add time, but aborts later). Public repro (abort after add) would still fail.
- **Naive fix 2:** In `add`, register `signal.addEventListener('abort', () => reject(reason))` but forget to **remove** the task from the queue — the `add` promise rejects, but `queue.size` stays 1 and the task later runs anyway (or `ran` becomes true), failing oracle's `notRan` and `sizeOk`.
- **Naive fix 3:** Remove from queue but forget to clean up listener — passes functional tests but fails the `event listener cleanup` hidden test (the PR's test that checks `removeEventListener` called).
- **Naive fix 4:** Handle `queue` (FIFO) but not `priority-queue` — passes non-priority tests but fails the `priority removal` oracle test.

## Naive Fix

```ts
// Only check at add time
if (options.signal?.aborted) {
  throw options.signal.reason;
}
// No handling for abort while queued
```

## Why Naive Fix Fails

- Public repro does `controller.abort()` **after** `queue.add` while task is queued, not before. So `signal.aborted` is false at `add` time, naive check does nothing, promise never rejects, test hangs or `ran` becomes true.
- Even if agent adds a listener, but doesn't remove from queue, `queue.size` stays 1 and the task will be dequeued and run later, violating `notRan`.

## Hidden Invariant

- Queued tasks must be **removable** from both `queue` (FIFO) and `priority-queue` (priority) via signal.
- `signal.reason` must be forwarded, not just `AbortError` with default message.
- Event listeners must be added with `{once:true}` and removed on `abort`, `run`, and `clear`.

## Cross-File Reasoning

- `source/index.ts` (main `PQueue` class, `add` logic, `queueAbortHandler`)
- `source/priority-queue.ts` (priority queue's `enqueue`/`dequeue` and filtering)
- `source/queue.ts` (simple queue)

The agent must understand how `PQueue` uses `this._queue` (which is either `PriorityQueue` or `Queue` based on options) and how to remove a specific task.

## Regression Surface

- Basic queue with concurrency 2, concurrency 1 with `onIdle` (regression `tests/basic.test.ts`).
- Original `p-queue` test suite has many `signal` tests for running tasks; our oracle adds queued-specific tests.

## Why This Is Suitable For Frontier Verifier

- **Public narrow:** single `abort while queued` case.
- **Hidden broad:** 6 tests covering already aborted, queued abort, not affecting running, custom reason, priority removal, and running vs queued distinction — distinguishes correct removal+reject+cleanup from partial.
- **High async reasoning:** requires understanding `AbortSignal` lifecycle, `queue.size`, `priority`, and promise settlement.
- **Deterministic:** Uses `new Promise(() => {})` never-resolving to keep task queued, no real timers for the critical path (only `setTimeout` for running test, but isolated).

## Verification Plan

- Public: queued abort → `AbortError`, `notRan`, `size 0` → PASS on fixed, FAIL (hang or `ran` true) on buggy.
- Oracle: 6 tests — queued abort, already aborted, not affecting running, custom reason, priority removal, running vs queued.
- Buggy: public fails (promise never rejects or `ran` true), oracle fails (≥3).
- Fixed: all pass 3×.

## Difficulty Rating

**Frontier-Hard** — requires 3-file fix, understanding queued vs running states, and proper queue removal and listener cleanup — not just a one-line `throwIfAbported` check.
