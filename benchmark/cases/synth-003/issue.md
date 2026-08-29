# Issue: Failed jobs are reported as successful

**Repository:** `async-queue`
**Component:** `AsyncQueue.processJob` / `processNext`

## Description

When a job handler throws, `processJob` currently returns `{ success: true }` and does not trigger retry logic. Failures are invisible to the caller and retries never happen.

## Steps to Reproduce

```ts
import { AsyncQueue } from "./src/queue.ts";
const q = new AsyncQueue<string>();
q.enqueue("fail", { maxAttempts: 3 });
const job = q.dequeue();
const result = await q.processJob(job, () => { throw new Error("oops"); });
console.log(result.success); // Expected false, got true
console.log(q.size()); // Expected 1 (retry), got 0
```

## Expected Behavior

- On handler throw, `processJob` should return `success: false` and re-enqueue if `attempts < maxAttempts`
- `processNext` should propagate retry behavior
