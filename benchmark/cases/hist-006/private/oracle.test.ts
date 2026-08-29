import { describe, test, expect } from "bun:test";
import { AsyncQueue } from "../../../repositories/async-queue/src/queue.ts";

describe("hist-006 oracle: pause/resume preserves jobs", () => {
  test("resume restores pending jobs", () => {
    const q = new AsyncQueue<string>();
    q.enqueue("a");
    q.enqueue("b");
    q.pause();
    q.enqueue("c");
    q.enqueue("d");
    expect(q.size()).toBe(4);
    q.resume();
    expect(q.size()).toBe(4);
    expect(q.dequeue().payload).toBe("a");
    expect(q.dequeue().payload).toBe("b");
    expect(q.dequeue().payload).toBe("c");
    expect(q.dequeue().payload).toBe("d");
  });
  test("multiple pause/resume cycles", () => {
    const q = new AsyncQueue<number>();
    q.pause();
    q.enqueue(1);
    q.resume();
    expect(q.size()).toBe(1);
    q.pause();
    q.enqueue(2);
    q.enqueue(3);
    expect(q.size()).toBe(3);
    q.resume();
    expect(q.size()).toBe(3);
    expect(q.getJobs().map(j=>j.payload)).toEqual([1,2,3]);
  });
  test("resume when not paused does nothing", () => {
    const q = new AsyncQueue<string>();
    q.enqueue("a");
    q.resume();
    expect(q.size()).toBe(1);
  });
});
