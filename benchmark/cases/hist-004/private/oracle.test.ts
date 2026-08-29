import { describe, test, expect } from "bun:test";
import { TaskManager } from "../../../repositories/task-manager/src/task-manager.ts";
import { isValidPriority } from "../../../repositories/task-manager/src/validators.ts";

describe("hist-004 oracle: priority validation", () => {
  test("rejects 0 and 6", () => {
    const tm = new TaskManager();
    expect(() => tm.createTask({ title: "x", priority: 0 as any })).toThrow(/Invalid priority/);
    expect(() => tm.createTask({ title: "x", priority: 6 as any })).toThrow(/Invalid priority/);
    expect(() => tm.createTask({ title: "x", priority: -1 as any })).toThrow();
    expect(() => tm.createTask({ title: "x", priority: 3.5 as any })).toThrow();
  });
  test("accepts 1-5", () => {
    const tm = new TaskManager();
    for (let p = 1; p <= 5; p++) {
      const t = tm.createTask({ title: `p${p}`, priority: p as any });
      expect(t.priority).toBe(p as any);
    }
  });
  test("isValidPriority", () => {
    expect(isValidPriority(0)).toBe(false);
    expect(isValidPriority(6)).toBe(false);
    expect(isValidPriority(3)).toBe(true);
    expect(isValidPriority(1)).toBe(true);
    expect(isValidPriority(5)).toBe(true);
  });
  test("updateTask validates", () => {
    const tm = new TaskManager();
    const t = tm.createTask({ title: "a", priority: 3 });
    expect(() => tm.updateTask(t.id, { priority: 0 as any })).toThrow();
  });
});
