# p-queue signal abort while queued not rejected

**Repository:** `p-queue` (`sindresorhus/p-queue`)
**Component:** `source/index.ts` — queue `add` with `signal` option, `source/priority-queue.ts`, `source/queue.ts`
**Related Issue:** https://github.com/sindresorhus/p-queue/issues/241
**Commit:** fixed `a64b316`, buggy parent `3bd13ea`

## Problem

When a task is added to `p-queue` with an `AbortSignal` and the signal is aborted **while the task is still queued** (not yet running due to concurrency limit), the task is not rejected and remains in the queue. The `signal` handling only worked for tasks that were already running.

Example:

```js
import PQueue from "./source/index.js";

const queue = new PQueue({ concurrency: 1 });

// Occupy the queue
queue.add(() => new Promise(() => {})); // never resolves

const controller = new AbortController();
let ran = false;

const promise = queue.add(() => {
  ran = true;
  return "result";
}, { signal: controller.signal });

// Abort while queued
controller.abort();

try {
  await promise;
  console.log("should have rejected");
} catch (e) {
  console.log(e.name); // Expected: "AbortError", Actual (buggy): never rejects or runs
}

console.log(ran); // Expected: false, Buggy: true (task eventually runs) or promise never settles
console.log(queue.size); // Expected: 0, Buggy: 1 (still queued)
```

Similarly, if the signal is already aborted at the time `add` is called and the task cannot start immediately (needs to be queued), it should reject immediately instead of being queued:

```js
const controller = new AbortController();
controller.abort();

queue.add(() => new Promise(() => {})); // occupy
await queue.add(() => "x", { signal: controller.signal }); // should reject with AbortError, not queue
```

## Expected Behavior

- If `signal` is aborted while a task is queued, the task must be **removed from the queue** and the `add` promise must **reject with `signal.reason`** (which is an `AbortError` by default).
- If `signal` is already aborted and the task would need to be queued (concurrency full), `add` must reject **immediately** without queuing.
- The `AbortSignal` event listener must be cleaned up whether the task runs, is aborted, or is removed.
- `queue.size` must reflect the removal.
- The fix must not affect tasks that are already running — those continue to be handled via the existing running-task abort logic.

Formally, the fixed code in `source/index.ts` adds a `queueAbortHandler` that is registered on the signal when a task is queued, and removed when the task is dequeued or aborted. `source/priority-queue.ts` and `source/queue.ts` are updated to support removal by id.

## Actual Behavior

- `signal` abort while queued was ignored; the task stayed in the priority queue and would eventually run when concurrency allowed, even though the signal was aborted.
- `signal` already aborted at `add` time was not checked for queued tasks, so the task was queued instead of rejecting.
- Event listeners for queued tasks were not added/removed correctly, leading to potential leaks.

## Reproduction

```ts
import PQueue from "../../../repositories/p-queue/source/index.js";

const queue = new PQueue({ concurrency: 1 });
queue.add(() => new Promise(() => {})); // occupy

const controller = new AbortController();
let ran = false;
const promise = queue.add(() => { ran = true; return "result"; }, { signal: controller.signal });

controller.abort();

try {
  await promise;
  console.log("FAIL: should have rejected");
} catch (e) {
  console.log(e.name === "AbortError" ? "PASS" : "FAIL");
}
console.log(ran === false ? "PASS" : "FAIL");
console.log(queue.size === 0 ? "PASS" : "FAIL");
```

## Environment

- Node 22 / Bun 1.4.0
- `p-queue` 9.1.0 with `eventemitter3` and `p-timeout`
- No network, deterministic

## Notes

- Fix is in `source/index.ts` (queue abort handler), `source/priority-queue.ts` (remove by signal), `source/queue.ts`.
- Check how `PQueue.add` handles `signal` for queued vs running tasks.
- Regression suite is `bun test tests/` in the repository.
