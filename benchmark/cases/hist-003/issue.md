# Issue: Failed jobs are not retried

**Repository:** `async-queue`
**Component:** `AsyncQueue.processJob`

## Description

Jobs configured with `maxAttempts > 1` should be retried when the handler throws. Currently, after a handler failure, the job is not re-enqueued, so `maxAttempts` is effectively ignored and the queue loses the job.

## Steps to Reproduce

```ts
import { AsyncQueue } from "./src/queue.ts";

const q = new AsyncQueue<string>({ retryDelay: 0 });
q.enqueue("fail", { maxAttempts: 3 });
const job = q.dequeue();
await q.processJob(job, () => { throw new Error("fail"); });
console.log(q.size()); // Expected 1 (retried), got 0 (lost)
```

## Expected Behavior

- On handler failure with `attempts < maxAttempts`, the job should be re-enqueued for retry with incremented `attempts`.
- Only when `attempts >= maxAttempts` should the job be dropped and not re-enqueued.
- Successful jobs should not be re-enqueued.
