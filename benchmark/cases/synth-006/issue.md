# Issue: dequeue silently returns undefined on empty queue

**Repository:** `async-queue`
**Component:** `AsyncQueue.dequeue`

## Description

Calling `dequeue()` on an empty queue should throw `Queue is empty` but currently returns `undefined`, leading to downstream errors.

## Steps to Reproduce

```ts
import { AsyncQueue } from "./src/queue.ts";
const q = new AsyncQueue();
console.log(q.dequeue()); // Expected throw, got undefined
try { q.dequeue(); console.log("FAIL not thrown"); } catch(e) { console.log("threw correctly", e.message); }
```

## Expected Behavior

- Throw `Error("Queue is empty")` when queue empty
- `processNext` should return `null` on empty (not throw via dequeue)
- Other methods should not be affected
