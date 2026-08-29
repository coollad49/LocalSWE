import { describe, test, expect } from "vitest";
import PQueue from "../source/index.js";

describe("p-queue regression", () => {
  test("basic queue", async () => {
    const queue = new PQueue({ concurrency: 2 });
    const results: number[] = [];
    await queue.add(() => { results.push(1); return Promise.resolve(); });
    await queue.add(() => { results.push(2); return Promise.resolve(); });
    await queue.onIdle();
    expect(results).toEqual([1,2]);
  });
  test("concurrency", async () => {
    const queue = new PQueue({ concurrency: 1 });
    let running = 0;
    let max = 0;
    const task = async () => { running++; max = Math.max(max, running); await new Promise(r=>setTimeout(r,10)); running--; };
    await Promise.all([queue.add(task), queue.add(task), queue.add(task)]);
    expect(max).toBe(1);
  });
});
