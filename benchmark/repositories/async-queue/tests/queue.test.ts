import { describe, test, expect } from "bun:test";
import { AsyncQueue } from "../src/queue.ts";

describe("AsyncQueue", () => {
  test("enqueue and dequeue", () => {
    const q = new AsyncQueue<string>();
    q.enqueue("a");
    q.enqueue("b");
    expect(q.size()).toBe(2);
    expect(q.dequeue().payload).toBe("a");
    expect(q.dequeue().payload).toBe("b");
    expect(q.isEmpty()).toBe(true);
  });

  test("dequeue throws on empty", () => {
    const q = new AsyncQueue();
    expect(() => q.dequeue()).toThrow(/empty/i);
  });

  test("pause and resume preserves jobs", () => {
    const q = new AsyncQueue<string>();
    q.enqueue("a");
    q.enqueue("b");
    q.pause();
    expect(q.isPaused()).toBe(true);
    q.enqueue("c");
    q.enqueue("d");
    expect(q.size()).toBe(4);
    q.resume();
    expect(q.isPaused()).toBe(false);
    expect(q.size()).toBe(4);
    expect(q.dequeue().payload).toBe("a");
    expect(q.dequeue().payload).toBe("b");
    expect(q.dequeue().payload).toBe("c");
    expect(q.dequeue().payload).toBe("d");
  });

  test("pause resume multiple cycles", () => {
    const q = new AsyncQueue<number>();
    q.pause();
    q.enqueue(1);
    q.resume();
    q.pause();
    q.enqueue(2);
    q.resume();
    expect(q.size()).toBe(2);
    expect(q.getJobs().map((j) => j.payload)).toEqual([1, 2]);
  });

  test("processJob retry re-enqueues", async () => {
    const q = new AsyncQueue<string>({ retryDelay: 0 });
    const job = q.enqueue("fail", { maxAttempts: 3 });
    // dequeue first
    const dequeued = q.dequeue();
    let attempts = 0;
    const handler = () => {
      attempts++;
      throw new Error("fail");
    };
    const r1 = await q.processJob(dequeued, handler);
    expect(r1.success).toBe(false);
    expect(r1.job.attempts).toBe(1);
    expect(q.size()).toBe(1); // re-enqueued
    const r2 = await q.processJob(q.dequeue(), handler);
    expect(r2.job.attempts).toBe(2);
    expect(q.size()).toBe(1);
    const r3 = await q.processJob(q.dequeue(), handler);
    expect(r3.job.attempts).toBe(3);
    expect(q.size()).toBe(0); // max attempts reached, not re-enqueued
    expect(r3.success).toBe(false);
  });

  test("processJob succeeds", async () => {
    const q = new AsyncQueue<string>();
    const job = q.enqueue("ok");
    const dequeued = q.dequeue();
    const r = await q.processJob(dequeued, async () => {});
    expect(r.success).toBe(true);
    expect(r.job.attempts).toBe(1);
    expect(q.size()).toBe(0);
  });

  test("processNext handles empty", async () => {
    const q = new AsyncQueue<string>();
    expect(await q.processNext(async () => {})).toBeNull();
  });

  test("processNext surfaces errors via retry", async () => {
    const q = new AsyncQueue<string>();
    q.enqueue("x", { maxAttempts: 2 });
    let called = 0;
    const handler = () => {
      called++;
      throw new Error("oops");
    };
    const r1 = await q.processNext(handler);
    expect(r1!.success).toBe(false);
    expect(called).toBe(1);
    const r2 = await q.processNext(handler);
    expect(r2!.success).toBe(false);
    expect(called).toBe(2);
    expect(q.isEmpty()).toBe(true);
    // next should be null
    expect(await q.processNext(handler)).toBeNull();
  });

  test("clear empties queue", () => {
    const q = new AsyncQueue<string>();
    q.enqueue("a");
    q.pause();
    q.enqueue("b");
    q.clear();
    expect(q.isEmpty()).toBe(true);
    expect(q.size()).toBe(0);
  });
});
