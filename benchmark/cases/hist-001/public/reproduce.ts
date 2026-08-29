import { TaskManager } from "../../../repositories/task-manager/src/task-manager.ts";

// This script is also runnable via `bun run` and via bun:test.
// When executed directly it prints PASS/FAIL.

function run(): boolean {
  const tm = new TaskManager();
  tm.createTask({ title: "overdue", priority: 1, dueDate: "2024-01-01" });
  tm.createTask({ title: "today", priority: 1, dueDate: "2024-06-15" });
  tm.createTask({ title: "future", priority: 1, dueDate: "2024-12-31" });
  const now = new Date("2024-06-15T12:00:00Z");
  const overdue = tm.getOverdueTasks(now);
  const titles = overdue.map((t) => t.title).sort();
  const expected = ["overdue"];
  const pass = JSON.stringify(titles) === JSON.stringify(expected);
  console.log(`Overdue titles: ${JSON.stringify(titles)} expected ${JSON.stringify(expected)} => ${pass ? "PASS" : "FAIL"}`);
  return pass;
}

if (import.meta.main) {
  const ok = run();
  process.exit(ok ? 0 : 1);
}

export { run };
