import { AsyncQueue } from "../../../repositories/async-queue/src/queue.ts";

async function run(): Promise<boolean> {
  const q = new AsyncQueue<string>({ retryDelay: 0 });
  const job = q.enqueue("fail", { maxAttempts: 3 });
  const dequeued = q.dequeue();
  const handler = () => { throw new Error("fail"); };
  const r1 = await q.processJob(dequeued, handler);
  console.log(`r1 attempts=${r1.job.attempts} success=${r1.success} size=${q.size()} expected size 1`);
  const pass1 = q.size() === 1 && r1.job.attempts === 1 && !r1.success;
  if (!pass1) {
    console.log("FAIL: job not re-enqueued on first failure");
    return false;
  }
  const r2 = await q.processJob(q.dequeue(), handler);
  console.log(`r2 attempts=${r2.job.attempts} size=${q.size()} expected 1`);
  const pass2 = q.size() === 1 && r2.job.attempts === 2;
  if (!pass2) {
    console.log("FAIL: second retry not re-enqueued");
    return false;
  }
  const r3 = await q.processJob(q.dequeue(), handler);
  console.log(`r3 attempts=${r3.job.attempts} size=${q.size()} expected 0`);
  const pass3 = q.size() === 0 && r3.job.attempts === 3;
  if (!pass3) {
    console.log("FAIL: max attempts handling");
    return false;
  }
  console.log("PASS");
  return true;
}

if (import.meta.main) {
  run().then((ok) => process.exit(ok ? 0 : 1));
}
export { run };
