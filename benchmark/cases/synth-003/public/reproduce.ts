import { AsyncQueue } from "../../../repositories/async-queue/src/queue.ts";

async function run(): Promise<boolean> {
  const q = new AsyncQueue<string>({ retryDelay: 0 });
  q.enqueue("fail", { maxAttempts: 3 });
  const job = q.dequeue();
  const r = await q.processJob(job, () => { throw new Error("oops"); });
  console.log(`success=${r.success} expected false`);
  console.log(`attempts=${r.job.attempts} expected 1`);
  console.log(`size=${q.size()} expected 1 (retry)`);
  const pass = r.success === false && r.job.attempts === 1 && q.size() === 1;
  console.log(pass ? "PASS" : "FAIL");
  return pass;
}
if (import.meta.main) run().then(ok => process.exit(ok ? 0 : 1));
export { run };
