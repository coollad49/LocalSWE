import { describe, test, expect } from "bun:test";
import { TaskManager } from "../../../repositories/task-manager/src/task-manager.ts";
import { isOverdue } from "../../../repositories/task-manager/src/utils.ts";

describe("hist-001 oracle: getOverdueTasks boundary", () => {
  test("does not include tasks due today", () => {
    const tm = new TaskManager();
    tm.createTask({ title: "overdue", priority: 1, dueDate: "2024-01-01" });
    tm.createTask({ title: "today", priority: 1, dueDate: "2024-06-15" });
    tm.createTask({ title: "future", priority: 1, dueDate: "2024-12-31" });
    const overdue = tm.getOverdueTasks(new Date("2024-06-15T12:00:00Z"));
    expect(overdue.map((t) => t.title).sort()).toEqual(["overdue"]);
  });

  test("excludes null dueDate and completed", () => {
    const tm = new TaskManager();
    tm.createTask({ title: "null", priority: 1, dueDate: null });
    tm.createTask({ title: "completed overdue", priority: 1, dueDate: "2024-01-01", status: "completed" });
    tm.createTask({ title: "archived overdue", priority: 1, dueDate: "2024-01-01", status: "archived" });
    expect(tm.getOverdueTasks(new Date("2024-06-15T12:00:00Z")).length).toBe(0);
  });

  test("isOverdue helper strictly less than today", () => {
    const now = new Date("2024-06-15T12:00:00Z");
    expect(isOverdue("2024-06-14", now, "pending")).toBe(true);
    expect(isOverdue("2024-06-15", now, "pending")).toBe(false);
    expect(isOverdue("2024-06-16", now, "pending")).toBe(false);
    expect(isOverdue(null, now, "pending")).toBe(false);
    expect(isOverdue("2024-06-14", now, "completed")).toBe(false);
  });

  test("multiple overdue correctly filtered", () => {
    const tm = new TaskManager();
    tm.createTask({ title: "a", priority: 2, dueDate: "2023-12-31" });
    tm.createTask({ title: "b", priority: 2, dueDate: "2024-01-15" });
    tm.createTask({ title: "c", priority: 2, dueDate: "2024-06-15" });
    const overdue = tm.getOverdueTasks(new Date("2024-06-15T00:00:00Z"));
    expect(overdue.length).toBe(2);
    expect(overdue.map((t) => t.title).sort()).toEqual(["a", "b"]);
  });
});
