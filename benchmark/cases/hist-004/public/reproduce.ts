import { TaskManager } from "../../../repositories/task-manager/src/task-manager.ts";

function run(): boolean {
  const tm = new TaskManager();
  let failed0 = false, failed6 = false;
  try { tm.createTask({ title: "x", priority: 0 as any }); } catch { failed0 = true; }
  try { tm.createTask({ title: "x", priority: 6 as any }); } catch { failed6 = true; }
  console.log(`priority 0 throws? ${failed0} expected true`);
  console.log(`priority 6 throws? ${failed6} expected true`);
  // also 3 should not throw
  let ok3 = false;
  try { tm.createTask({ title: "ok", priority: 3 }); ok3 = true; } catch {}
  const pass = failed0 && failed6 && ok3;
  console.log(pass ? "PASS" : "FAIL");
  return pass;
}
if (import.meta.main) process.exit(run() ? 0 : 1);
export { run };
