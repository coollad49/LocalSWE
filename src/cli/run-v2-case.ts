#!/usr/bin/env tsx
/**
 * CLI: Run Agent V2 for a single case.
 * Usage:
 *   bun run v2:run:case -- hist-001
 *   V2_MOCK=1 bun run v2:run:case -- synth-001
 */
import { loadV2Config } from "../v2/config/V2Config.ts";
import { V2Runner } from "../v2/runner/V2Runner.ts";
import { CaseLoader } from "../runner/CaseLoader.ts";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const caseId = args.find((a) => !a.startsWith("-")) ?? args[0];
  if (!caseId) {
    console.error("Usage: run-v2-case <caseId> [--mock] [--keep-workspace]");
    console.error("Available cases:", (await CaseLoader.listCases()).join(", "));
    process.exit(1);
  }

  const useMock = args.includes("--mock") || process.env.V2_MOCK === "1" || process.env.BASELINE_MOCK === "1";
  if (useMock) {
    process.env.V2_MOCK = "1";
    process.env.BASELINE_MOCK = "1";
  }

  const keepWorkspace = args.includes("--keep-workspace");

  const config = await loadV2Config({
    overrides: {
      ...(useMock ? { model: "mock" } : {}),
    },
  });

  console.log(`Agent V2 — running case ${caseId}`);
  console.log(`  model: ${config.model}`);
  console.log(`  maxTurns: ${config.maxTurns}`);
  console.log(`  invariants: ${config.enableInvariantSynthesis}`);
  console.log(`  rollback: ${config.enableRollbackOnRegression}`);
  console.log(`  mock: ${useMock ? "yes" : "no"}`);

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const ROOT = resolve(__dirname, "../..");
  const runsRoot = useMock ? join(ROOT, "experiments/runs/mock-v2") : undefined;
  const runner = new V2Runner(config, runsRoot);
  const start = Date.now();
  const result = await runner.runCase({ caseId, config, keepWorkspace: keepWorkspace ? true : undefined, runsRoot });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log("\n=== Result ===");
  console.log(`  runId: ${result.runId}`);
  console.log(`  caseId: ${result.caseId}`);
  console.log(`  status: ${result.status}`);
  console.log(`  duration: ${result.durationMs}ms (${elapsed}s)`);
  console.log(`  changedFiles: ${result.changedFiles.join(", ") || "(none)"}`);
  console.log(`  patch: ${result.patchPath ?? "(none)"}`);
  if (result.error) console.log(`  error: ${result.error}`);

  process.exit(result.status === "error" ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
