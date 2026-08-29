import { TaskManager } from "../../../repositories/task-manager/src/task-manager.ts";

function run(): boolean {
  const tm = new TaskManager();
  const t = tm.createTask({ title: "Orig", priority: 2, description: "keep me" });
  const updated = tm.updateTask(t.id, { title: "Updated" });
  console.log(`description=${JSON.stringify(updated.description)} expected "keep me"`);
  console.log(`priority=${updated.priority} expected 2`);
  console.log(`status=${updated.status} expected pending`);
  const pass = updated.description === "keep me" && updated.priority === 2 && updated.status === "pending" && updated.title === "Updated";
  console.log(pass ? "PASS" : "FAIL");
  return pass;
}
if (import.meta.main) process.exit(run() ? 0 : 1);
export { run };
