import { describe, test, expect } from "bun:test";
import { AsyncQueue } from "../../../repositories/async-queue/src/queue.ts";

describe("synth-006 oracle: dequeue throws on empty", () => {
  test("throws when empty", () => {
    const q = new AsyncQueue<string>();
    expect(() => q.dequeue()).toThrow(/Queue is empty/);
  });
  test("does not throw when not empty", () => {
    const q = new AsyncQueue<string>();
    q.enqueue("a");
    expect(q.dequeue().payload).toBe("a");
    expect(() => q.dequeue()).toThrow();
  });
  test("processNext returns null on empty, not throw", async () => {
    const q = new AsyncQueue<string>();
    expect(await q.processNext(async () => {})).toBeNull();
  });
  test("clear then dequeue throws", () => {
    const q = new AsyncQueue<string>();
    q.enqueue("a");
    q.clear();
    expect(() => q.dequeue()).toThrow();
  });
});
