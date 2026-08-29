import { TaskManager } from "../../../repositories/task-manager/src/task-manager.ts";

function run(): boolean {
  const tm = new TaskManager();
  tm.createTask({ title: "a", priority: 1, status: "pending" });
  const c1 = tm.filterByStatus("pending").length;
  console.log(`after 1 pending: ${c1} expected 1`);
  tm.createTask({ title: "b", priority: 1, status: "pending" });
  const c2 = tm.filterByStatus("pending").length;
  console.log(`after 2 pending: ${c2} expected 2`);
  if (c1 !== 1 || c2 !== 2) { console.log("FAIL: stale cache on create"); return false; }
  const t = tm.filterByStatus("pending")[0]!;
  tm.updateTask(t.id, { status: "completed" });
  const pending = tm.filterByStatus("pending").length;
  const completed = tm.filterByStatus("completed").length;
  console.log(`after update pending=${pending} expected 1, completed=${completed} expected 1`);
  const pass = pending === 1 && completed === 1;
  console.log(pass ? "PASS" : "FAIL");
  return pass;
}
if (import.meta.main) process.exit(run() ? 0 : 1);
export { run };
