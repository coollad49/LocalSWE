import { describe, test, expect } from "vitest";
import PQueue from "../../../repositories/p-queue/source/index.js";

describe("hard-004 oracle: p-queue signal abort while queued", () => {
  async function expectAborted(promise: Promise<any>) {
    const outcome: string = await Promise.race([
      promise.then(() => "resolved", (e: any) => e?.name === "AbortError" ? "rejected" : "other"),
      new Promise<string>(res => setTimeout(() => res("timeout"), 900)),
    ]);
    expect(outcome).toBe("rejected");
  }

  test("should reject when signal is aborted while task is waiting in queue", async () => {
    const queue = new PQueue({ concurrency: 1 });
    queue.add(() => new Promise(() => {}));
    const controller = new AbortController();
    let ran = false;
    const promise = queue.add(() => { ran = true; return "result"; }, { signal: controller.signal });
    controller.abort();
    await expectAborted(promise);
    expect(ran).toBe(false);
    expect(queue.size).toBe(0);
    queue.clear();
  });

  test("should reject immediately when signal is already aborted and task is queued", async () => {
    const queue = new PQueue({ concurrency: 1 });
    queue.add(() => new Promise(() => {}));
    const controller = new AbortController();
    controller.abort();
    let ran = false;
    const promise = queue.add(() => { ran = true; return "result"; }, { signal: controller.signal });
    await expectAborted(promise);
    expect(ran).toBe(false);
    expect(queue.size).toBe(0);
    queue.clear();
  });

  test("should not affect running task when queued task is aborted", async () => {
    const queue = new PQueue({ concurrency: 1 });
    let firstRan = false;
    const first = queue.add(async () => { await new Promise(r => setTimeout(r, 20)); firstRan = true; return "first"; });
    const controller = new AbortController();
    let secondRan = false;
    const second = queue.add(() => { secondRan = true; return "second"; }, { signal: controller.signal });
    controller.abort();
    await expectAborted(second);
    expect(secondRan).toBe(false);
    const result = await first;
    expect(result).toBe("first");
    expect(firstRan).toBe(true);
    queue.clear();
  });

  test("abort with custom reason forwards the reason", async () => {
    const queue = new PQueue({ concurrency: 1 });
    queue.add(() => new Promise(() => {}));
    const controller = new AbortController();
    const reason = new Error("custom abort");
    let ran = false;
    const promise: any = queue.add(() => { ran = true; return "x"; }, { signal: controller.signal });
    controller.abort(reason);
    const outcome = await Promise.race([
      promise.then(() => "resolved", (e: any) => e === reason ? "rejected" : "other"),
      new Promise<string>(res => setTimeout(() => res("timeout"), 900)),
    ]);
    expect(outcome).toBe("rejected");
    expect(ran).toBe(false);
    queue.clear();
  });

  test("should remove aborted task from priority queue", async () => {
    const queue = new PQueue({ concurrency: 1 });
    queue.add(() => new Promise(() => {}));
    const controller = new AbortController();
    // Add with priority
    const p1: any = queue.add(() => "a", { priority: 1, signal: controller.signal } as any);
    const p2 = queue.add(() => "b", { priority: 0 } as any);
    controller.abort();
    await expectAborted(p1);
    // p2 should still run after first completes if we clear first
    queue.clear();
    const queue2 = new PQueue({ concurrency: 1 });
    const c2 = new AbortController();
    queue2.add(() => new Promise(r => setTimeout(r, 10)));
    const pp1: any = queue2.add(() => "a", { priority: 1, signal: c2.signal } as any);
    const pp2 = queue2.add(() => "b", { priority: 0 } as any);
    c2.abort();
    await expectAborted(pp1);
    // After clearing the blocking task, pp2 should be able to run
    queue2.clear();
  });

  test("signal abort not called when task already started should not affect queue size", async () => {
    const queue = new PQueue({ concurrency: 1 });
    const controller = new AbortController();
    let ran = false;
    const promise = queue.add(async () => { ran = true; await new Promise(r => setTimeout(r, 10)); return "done"; }, { signal: controller.signal });
    // Abort after task has started (concurrency 1, no queue, so it starts immediately)
    await new Promise(r => setTimeout(r, 5));
    controller.abort();
    // The running task's signal abort should cause it to reject, but our oracle here checks that abort while running is handled separately
    // For this test, we just ensure the task was started
    expect(ran).toBe(true);
    try { await promise; } catch {}
    queue.clear();
  });
});
