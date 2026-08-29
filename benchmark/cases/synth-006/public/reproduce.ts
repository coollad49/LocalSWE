import { AsyncQueue } from "../../../repositories/async-queue/src/queue.ts";

function run(): boolean {
  const q = new AsyncQueue<string>();
  let threw = false;
  try {
    const v = q.dequeue();
    console.log(`dequeue returned ${v} expected throw`);
  } catch (e: any) {
    console.log(`threw: ${e.message} PASS`);
    threw = true;
  }
  if (!threw) { console.log("FAIL: did not throw"); return false; }
  // after enqueue, should not throw
  q.enqueue("a");
  try {
    const j = q.dequeue();
    console.log(`dequeue after enqueue ${j.payload} expected a`);
    if (j.payload !== "a") return false;
  } catch { console.log("FAIL: threw after enqueue"); return false; }
  console.log("PASS");
  return true;
}
if (import.meta.main) process.exit(run() ? 0 : 1);
export { run };
