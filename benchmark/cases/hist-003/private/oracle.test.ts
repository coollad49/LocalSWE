import { describe, test, expect } from "bun:test";
import { AsyncQueue } from "../../../repositories/async-queue/src/queue.ts";

describe("hist-003 oracle: retry re-enqueue", () => {
  test("re-enqueues on failure up to maxAttempts", async () => {
    const q = new AsyncQueue<string>({ retryDelay: 0 });
    q.enqueue("fail", { maxAttempts: 3 });
    const h = () => { throw new Error("fail"); };
    const j1 = q.dequeue();
    const r1 = await q.processJob(j1, h);
    expect(r1.success).toBe(false);
    expect(r1.job.attempts).toBe(1);
    expect(q.size()).toBe(1);
    const r2 = await q.processJob(q.dequeue(), h);
    expect(r2.job.attempts).toBe(2);
    expect(q.size()).toBe(1);
    const r3 = await q.processJob(q.dequeue(), h);
    expect(r3.job.attempts).toBe(3);
    expect(q.size()).toBe(0);
  });
  test("success does not re-enqueue", async () => {
    const q = new AsyncQueue<string>();
    q.enqueue("ok");
    const r = await q.processJob(q.dequeue(), async () => {});
    expect(r.success).toBe(true);
    expect(q.size()).toBe(0);
  });
  test("processNext retry flow", async () => {
    const q = new AsyncQueue<string>();
    q.enqueue("x", { maxAttempts: 2 });
    let c = 0;
    const h = () => { c++; throw new Error("oops"); };
    const r1 = await q.processNext(h);
    expect(r1!.success).toBe(false);
    expect(c).toBe(1);
    expect(q.size()).toBe(1);
    const r2 = await q.processNext(h);
    expect(r2!.success).toBe(false);
    expect(c).toBe(2);
    expect(q.isEmpty()).toBe(true);
  });
});
