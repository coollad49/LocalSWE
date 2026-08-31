#!/usr/bin/env tsx
/**
 * CLI: Run Agent V2 across multiple or all benchmark cases.
 * Usage:
 *   bun run v2:run
 *   bun run v2:run -- --concurrency 4 --runs 1
 */
import { loadV2Config } from "../v2/config/V2Config.ts";
import { V2Runner } from "../v2/runner/V2Runner.ts";
import { CaseLoader } from "../runner/CaseLoader.ts";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const useMock = args.includes("--mock") || process.env.V2_MOCK === "1" || process.env.BASELINE_MOCK === "1";
  if (useMock) {
    process.env.V2_MOCK = "1";
    process.env.BASELINE_MOCK = "1";
  }

  let runsPerCase = 1;
  const rpcIdx = args.indexOf("--runs");
  if (rpcIdx !== -1 && args[rpcIdx + 1]) {
    const n = Number.parseInt(args[rpcIdx + 1]!, 10);
    if (!Number.isNaN(n) && n > 0) runsPerCase = n;
  }

  let concurrency = 1;
  const concIdx = args.indexOf("--concurrency");
  if (concIdx !== -1 && args[concIdx + 1]) {
    const n = Number.parseInt(args[concIdx + 1]!, 10);
    if (!Number.isNaN(n) && n > 0) concurrency = n;
  }

  let caseIds: string[] | undefined;
  const casesIdx = args.indexOf("--cases");
  if (casesIdx !== -1 && args[casesIdx + 1]) {
    caseIds = args[casesIdx + 1]!.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const config = await loadV2Config({
    overrides: {
      ...(useMock ? { model: "mock" } : {}),
      runsPerCase,
    },
  });

  const allCases = caseIds ?? (await CaseLoader.listCases());

  console.log(`Agent V2 — Batch Run (${allCases.length} cases × ${runsPerCase} runs, concurrency=${concurrency})`);
  console.log(`  model: ${config.model}`);
  console.log(`  maxTurns: ${config.maxTurns}`);
  console.log(`  mock: ${useMock ? "yes" : "no"}`);

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const ROOT = resolve(__dirname, "../..");
  const runsRoot = useMock ? join(ROOT, "experiments/runs/mock-v2") : undefined;
  const runner = new V2Runner(config, runsRoot);
  const start = Date.now();

  const results = await runner.runV2({
    caseIds: allCases,
    config,
    concurrency,
    runsPerCase,
    runsRoot,
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const completed = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status !== "success").length;

  console.log("\n=== Batch Summary ===");
  console.log(`  total: ${results.length}`);
  console.log(`  completed: ${completed}`);
  console.log(`  failed: ${failed}`);
  console.log(`  elapsed: ${elapsed}s`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
