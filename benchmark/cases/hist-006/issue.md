# Issue: Jobs enqueued while paused are lost after resume

**Repository:** `async-queue`
**Component:** `AsyncQueue.pause` / `resume`

## Description

When the queue is paused, newly enqueued jobs should be buffered in `pendingJobs` and moved back to the main queue on `resume()`. Currently they are lost.

## Steps to Reproduce

```ts
import { AsyncQueue } from "./src/queue.ts";
const q = new AsyncQueue<string>();
q.enqueue("a");
q.enqueue("b");
q.pause();
q.enqueue("c");
q.enqueue("d");
console.log(q.size()); // 4 expected
q.resume();
console.log(q.size()); // Expected 4, got 2 (c,d lost)
console.log(q.dequeue().payload); // should be a, then b, c, d
```

## Expected Behavior

- `pause()` should set paused flag
- Jobs enqueued while paused go to pending
- `resume()` should move pending jobs into main queue preserving order
- No jobs lost across pause/resume cycles
