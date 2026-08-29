import { describe, test, expect } from "vitest";
import { TaskManager } from "../src/task-manager.ts";

describe("TaskManager", () => {
  test("createTask creates task with defaults", () => {
    const tm = new TaskManager();
    const t = tm.createTask({ title: "Test", priority: 3 });
    expect(t.title).toBe("Test");
    expect(t.priority).toBe(3);
    expect(t.status).toBe("pending");
    expect(t.dueDate).toBeNull();
  });

  test("createTask validates priority", () => {
    const tm = new TaskManager();
    expect(() => tm.createTask({ title: "x", priority: 0 as any })).toThrow();
    expect(() => tm.createTask({ title: "x", priority: 6 as any })).toThrow();
    expect(() => tm.createTask({ title: "x", priority: 3.5 as any })).toThrow();
  });

  test("createTask validates title", () => {
    const tm = new TaskManager();
    expect(() => tm.createTask({ title: "", priority: 3 })).toThrow();
    expect(() => tm.createTask({ title: "   ", priority: 3 })).toThrow();
  });

  test("updateTask merges correctly without losing fields", () => {
    const tm = new TaskManager();
    const t = tm.createTask({ title: "Orig", priority: 2, description: "desc" });
    const updated = tm.updateTask(t.id, { title: "Updated" });
    expect(updated.title).toBe("Updated");
    expect(updated.description).toBe("desc");
    expect(updated.priority).toBe(2);
  });

  test("updateTask only updates provided fields", () => {
    const tm = new TaskManager();
    const t = tm.createTask({ title: "t", priority: 1 });
    const u = tm.updateTask(t.id, { status: "completed" });
    expect(u.status).toBe("completed");
    expect(u.title).toBe("t");
    expect(u.priority).toBe(1);
  });

  test("getOverdueTasks detects overdue correctly", () => {
    const tm = new TaskManager();
    tm.createTask({ title: "overdue", priority: 1, dueDate: "2024-01-01" });
    tm.createTask({ title: "today", priority: 1, dueDate: "2024-06-15" });
    tm.createTask({ title: "future", priority: 1, dueDate: "2024-12-31" });
    tm.createTask({ title: "no due", priority: 1, dueDate: null });
    const now = new Date("2024-06-15T12:00:00Z");
    const overdue = tm.getOverdueTasks(now);
    expect(overdue.length).toBe(1);
    expect(overdue[0]!.title).toBe("overdue");
  });

  test("getOverdueTasks excludes completed tasks", () => {
    const tm = new TaskManager();
    tm.createTask({ title: "done overdue", priority: 1, dueDate: "2024-01-01", status: "completed" });
    const now = new Date("2024-06-15T12:00:00Z");
    expect(tm.getOverdueTasks(now).length).toBe(0);
  });

  test("filterByStatus returns correct tasks and not stale", () => {
    const tm = new TaskManager();
    tm.createTask({ title: "a", priority: 1, status: "pending" });
    tm.createTask({ title: "b", priority: 1, status: "completed" });
    let pending = tm.filterByStatus("pending");
    expect(pending.length).toBe(1);
    // add another pending and ensure cache invalidates
    tm.createTask({ title: "c", priority: 1, status: "pending" });
    pending = tm.filterByStatus("pending");
    expect(pending.length).toBe(2);
    // update status
    const t = pending[0]!;
    tm.updateTask(t.id, { status: "completed" });
    expect(tm.filterByStatus("pending").length).toBe(1);
    expect(tm.filterByStatus("completed").length).toBe(2);
  });

  test("filterByStatus validates status", () => {
    const tm = new TaskManager();
    expect(() => tm.filterByStatus("invalid" as any)).toThrow();
  });

  test("getTasksByPriority filters correctly", () => {
    const tm = new TaskManager();
    tm.createTask({ title: "p1", priority: 1 });
    tm.createTask({ title: "p5", priority: 5 });
    expect(tm.getTasksByPriority(1).length).toBe(1);
    expect(tm.getTasksByPriority(5).length).toBe(1);
  });

  test("deleteTask removes task", () => {
    const tm = new TaskManager();
    const t = tm.createTask({ title: "del", priority: 1 });
    tm.deleteTask(t.id);
    expect(tm.getTask(t.id)).toBeUndefined();
    expect(tm.count()).toBe(0);
  });
});
