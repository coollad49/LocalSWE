import PQueue from "../../../repositories/p-queue/source/index.js";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function run(): Promise<boolean> {
  let allPass = true;

  // Test: signal aborted while queued should reject and not run
  {
    const queue = new PQueue({ concurrency: 1 });
    // Occupy the concurrency slot with a never-resolving task
    queue.add(() => new Promise(() => {}));
    const controller = new AbortController();
    let ran = false;
    const promise: any = queue.add(() => { ran = true; return "result"; }, { signal: controller.signal });
    // Abort while queued
    controller.abort();
    // Use timeout to avoid hanging on buggy (which never rejects)
    const outcome: string = await Promise.race([
      promise.then(() => "resolved", (e: any) => e?.name === "AbortError" ? "rejected" : "other"),
      new Promise<string>(res => setTimeout(() => res("timeout"), 800)),
    ]);
    const isAbort = outcome === "rejected";
    const notRan = !ran;
    const sizeOk = (queue as any).size === 0;
    const pass = isAbort && notRan && sizeOk;
    console.log(`Test queued abort: outcome=${outcome} notRan=${notRan} sizeOk=${sizeOk} => ${pass ? "PASS" : "FAIL"}`);
    if (!pass) allPass = false;
    queue.clear();
  }

  console.log(`Overall reproduce: ${allPass ? "PASS" : "FAIL"}`);
  return allPass;
}

const _isMain = (import.meta as any).main ?? process.argv[1]?.endsWith("reproduce.ts");
if (_isMain) {
  run().then(ok => process.exit(ok ? 0 : 1)).catch(e => { console.error(e); process.exit(1); });
}

export { run };
