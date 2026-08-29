import { describe, test, expect } from "vitest";
import { TaskManager } from "../../../repositories/task-manager/src/task-manager.ts";

describe("synth-004 oracle: filterByStatus cache invalidation", () => {
  test("reflects new tasks", () => {
    const tm = new TaskManager();
    tm.createTask({ title: "a", priority: 1, status: "pending" });
    expect(tm.filterByStatus("pending").length).toBe(1);
    tm.createTask({ title: "b", priority: 1, status: "pending" });
    expect(tm.filterByStatus("pending").length).toBe(2);
  });
  test("reflects status updates", () => {
    const tm = new TaskManager();
    tm.createTask({ title: "a", priority: 1, status: "pending" });
    tm.createTask({ title: "b", priority: 1, status: "pending" });
    const t = tm.filterByStatus("pending")[0]!;
    tm.updateTask(t.id, { status: "completed" });
    expect(tm.filterByStatus("pending").length).toBe(1);
    expect(tm.filterByStatus("completed").length).toBe(1);
  });
  test("reflects delete and clear", () => {
    const tm = new TaskManager();
    const t = tm.createTask({ title: "a", priority: 1, status: "pending" });
    tm.createTask({ title: "b", priority: 1, status: "completed" });
    tm.deleteTask(t.id);
    expect(tm.filterByStatus("pending").length).toBe(0);
    tm.clear();
    expect(tm.filterByStatus("completed").length).toBe(0);
  });
});
