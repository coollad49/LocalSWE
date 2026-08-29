import { AsyncQueue } from "../../../repositories/async-queue/src/queue.ts";

function run(): boolean {
  const q = new AsyncQueue<string>();
  q.enqueue("a");
  q.enqueue("b");
  q.pause();
  q.enqueue("c");
  q.enqueue("d");
  if (q.size() !== 4) { console.log(`size after enqueue paused ${q.size()} expected 4 FAIL`); return false; }
  q.resume();
  console.log(`size after resume ${q.size()} expected 4`);
  if (q.size() !== 4) { console.log("FAIL: lost pending jobs"); return false; }
  const order = [q.dequeue().payload, q.dequeue().payload, q.dequeue().payload, q.dequeue().payload];
  console.log(`order ${JSON.stringify(order)} expected ["a","b","c","d"]`);
  const pass = JSON.stringify(order) === JSON.stringify(["a","b","c","d"]);
  console.log(pass ? "PASS" : "FAIL");
  return pass;
}
if (import.meta.main) process.exit(run() ? 0 : 1);
export { run };
