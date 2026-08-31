#!/usr/bin/env tsx
import { loadV3Config } from "../v3/config/V3Config.ts";
import { V3Runner } from "../v3/runner/V3Runner.ts";
import { CaseLoader } from "../runner/CaseLoader.ts";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const useMock = args.includes("--mock") || process.env.V3_MOCK === "1" || process.env.BASELINE_MOCK === "1";
  if (useMock) {
    process.env.V3_MOCK = "1";
    process.env.BASELINE_MOCK = "1";
  }

  const runsIdx = args.indexOf("--runs");
  const runsPerCase = runsIdx !== -1 && args[runsIdx + 1] ? Number.parseInt(args[runsIdx + 1]!, 10) : 1;

  const concurrencyIdx = args.indexOf("--concurrency");
  const concurrency = concurrencyIdx !== -1 && args[concurrencyIdx + 1] ? Number.parseInt(args[concurrencyIdx + 1]!, 10) : 4;

  const runsRootIdx = args.indexOf("--runs-root");
  const runsRoot = runsRootIdx !== -1 ? args[runsRootIdx + 1] : undefined;

  const casesIdx = args.indexOf("--cases");
  let targetCases: string[] | undefined;
  if (casesIdx !== -1 && args[casesIdx + 1]) {
    targetCases = args[casesIdx + 1]!.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const config = await loadV3Config({
    overrides: {
      ...(useMock ? { model: "mock" } : {}),
      runsPerCase,
    },
  });

  const allCases = targetCases ?? (await CaseLoader.listCases());

  console.log("\n=======================================================");
  console.log(`  LocalSWE (Agent V3) Batch Execution`);
  console.log(`  Model:        ${config.model}`);
  console.log(`  Cases:        ${allCases.length} (${allCases.join(", ")})`);
  console.log(`  Concurrency:  ${concurrency}`);
  console.log(`  Runs / Case:  ${runsPerCase}`);
  console.log(`  Execution:    ${useMock ? "Mock Agent" : "Live Model"}`);
  console.log("=======================================================\n");

  const runner = new V3Runner(config, runsRoot);
  const start = Date.now();

  const results = await runner.runV3({
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
  console.error("V3 batch runner failed:", e);
  process.exit(1);
});
