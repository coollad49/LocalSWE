#!/usr/bin/env tsx
import { loadV3Config } from "../v3/config/V3Config.ts";
import { V3Runner } from "../v3/runner/V3Runner.ts";
import { CaseLoader } from "../runner/CaseLoader.ts";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const caseId = args.find((a) => !a.startsWith("-"));

  if (!caseId) {
    console.error("Usage: bun run v3:run:case -- <caseId> [--mock] [--keep-workspace]");
    const available = await CaseLoader.listCases();
    console.error(`Available cases: ${available.join(", ")}`);
    process.exit(1);
  }

  const validation = await CaseLoader.validateCaseForRun(caseId);
  if (!validation.valid) {
    console.error(`Invalid case: ${caseId}: ${validation.errors.join("; ")}`);
    process.exit(1);
  }

  const useMock = args.includes("--mock") || process.env.V3_MOCK === "1" || process.env.BASELINE_MOCK === "1";
  if (useMock) {
    process.env.V3_MOCK = "1";
    process.env.BASELINE_MOCK = "1";
  }

  const config = await loadV3Config({
    overrides: {
      ...(useMock ? { model: "mock" } : {}),
    },
  });

  console.log(`LocalSWE (Agent V3) — running case ${caseId}`);
  console.log(`  model: ${config.model}`);
  console.log(`  hypothesisMemory: ${config.enableHypothesisMemory}`);
  console.log(`  concurrentFuzzing: ${config.enableConcurrentFuzzing}`);
  console.log(`  dependencyGraph: ${config.enableDependencyGraph}`);
  console.log(`  mock: ${useMock ? "yes" : "no"}\n`);

  const runner = new V3Runner(config);
  const start = Date.now();
  const result = await runner.runCase(caseId, {
    config,
    keepWorkspace: args.includes("--keep-workspace"),
  });

  console.log("\n=== Result ===");
  console.log(`  runId: ${result.runId}`);
  console.log(`  caseId: ${result.caseId}`);
  console.log(`  status: ${result.status}`);
  console.log(`  duration: ${result.durationMs}ms (${((Date.now() - start) / 1000).toFixed(1)}s)`);
  console.log(`  changedFiles: ${result.changedFiles?.join(", ") || "(none)"}`);
  if (result.patchPath) console.log(`  patch: ${result.patchPath}`);
  if (result.error) console.log(`  error: ${result.error}`);

  if (result.status !== "success") process.exit(1);
}

main().catch((e) => {
  console.error("V3 case run failed:", e);
  process.exit(1);
});
