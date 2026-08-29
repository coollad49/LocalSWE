import { describe, test, expect } from "vitest";
import { TaskManager } from "../../../repositories/task-manager/src/task-manager.ts";

describe("synth-001 oracle: updateTask preserves fields", () => {
  test("update only provided field", () => {
    const tm = new TaskManager();
    const t = tm.createTask({ title: "Orig", priority: 2, description: "desc", dueDate: "2024-12-31" });
    const u = tm.updateTask(t.id, { title: "Updated" });
    expect(u.title).toBe("Updated");
    expect(u.description).toBe("desc");
    expect(u.priority).toBe(2);
    expect(u.status).toBe("pending");
    expect(u.dueDate).toBe("2024-12-31");
  });
  test("update multiple fields preserves others", () => {
    const tm = new TaskManager();
    const t = tm.createTask({ title: "a", priority: 1 });
    const u = tm.updateTask(t.id, { status: "completed", priority: 5 });
    expect(u.status).toBe("completed");
    expect(u.priority).toBe(5);
    expect(u.title).toBe("a");
  });
  test("update with empty object changes nothing except updatedAt", () => {
    const tm = new TaskManager();
    const t = tm.createTask({ title: "x", priority: 3 });
    const u = tm.updateTask(t.id, {});
    expect(u.title).toBe("x");
    expect(u.priority).toBe(3);
  });
});
