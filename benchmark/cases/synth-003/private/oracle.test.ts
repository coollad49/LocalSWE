import { describe, test, expect } from "bun:test";
import { AsyncQueue } from "../../../repositories/async-queue/src/queue.ts";

describe("synth-003 oracle: error handling", () => {
  test("reports failure and retries", async () => {
    const q = new AsyncQueue<string>({ retryDelay: 0 });
    q.enqueue("fail", { maxAttempts: 3 });
    const r1 = await q.processJob(q.dequeue(), () => { throw new Error("oops"); });
    expect(r1.success).toBe(false);
    expect(q.size()).toBe(1);
    const r2 = await q.processJob(q.dequeue(), () => { throw new Error("oops"); });
    expect(r2.success).toBe(false);
    expect(q.size()).toBe(1);
  });
  test("success true only on no throw", async () => {
    const q = new AsyncQueue<string>();
    q.enqueue("ok");
    const r = await q.processJob(q.dequeue(), async () => {});
    expect(r.success).toBe(true);
    expect(q.size()).toBe(0);
  });
  test("processNext retries", async () => {
    const q = new AsyncQueue<string>();
    q.enqueue("x", { maxAttempts: 2 });
    const r1 = await q.processNext(() => { throw new Error("fail"); });
    expect(r1!.success).toBe(false);
    expect(q.size()).toBe(1);
  });
});
