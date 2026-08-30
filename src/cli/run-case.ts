#!/usr/bin/env tsx
/**
 * CLI: Run Baseline v0 for a single case.
 * Usage:
 *   bun run baseline:run:case -- hist-001
 *   npx tsx src/cli/run-case.ts hist-001
 *   BASELINE_MOCK=1 npx tsx src/cli/run-case.ts synth-001
 */

import { loadBaselineConfig } from "../config/BaselineConfig.ts";
import { BaselineRunner } from "../runner/BaselineRunner.ts";
import { CaseLoader } from "../runner/CaseLoader.ts";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const caseId = args.find((a) => !a.startsWith("-")) ?? args[0];
  if (!caseId) {
    console.error("Usage: run-case <caseId> [--mock] [--keep-workspace]");
    console.error("Available cases:", (await CaseLoader.listCases()).join(", "));
    process.exit(1);
  }

  const useMock = args.includes("--mock") || process.env.BASELINE_MOCK === "1";
  if (useMock) process.env.BASELINE_MOCK = "1";

  const keepWorkspace = args.includes("--keep-workspace");
  // Enable live tool progress streaming (clean, informative: tool invocations only, no token deltas)
  if (!args.includes("--quiet")) process.env.BASELINE_LIVE_PROGRESS = "1";

  const config = await loadBaselineConfig({
    overrides: useMock ? { model: "mock" } : undefined,
  });

  // Attach fingerprint
  const fingerprint = await BaselineRunner.getFingerprint();
  if (fingerprint) config.benchmarkFingerprint = fingerprint;

  console.log(`Baseline v0 — running case ${caseId}`);
  console.log(`  agent: ${config.agentRuntime} ${config.piVersion} (${config.agentVersion})`);
  console.log(`  model: ${config.model} (${config.thinkingLevel})`);
  console.log(`  benchmark: ${config.benchmarkVersion} ${fingerprint ?? ""}`);
  console.log(`  timeout: ${config.agentTimeoutMs}ms`);
  console.log(`  mock: ${useMock ? "yes" : "no"}`);
  if (useMock) console.log(`  runsRoot: experiments/runs/mock (mock)`);
  console.log("");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const ROOT = resolve(__dirname, "../..");
  const runsRoot = useMock ? join(ROOT, "experiments/runs/mock") : undefined;
  const runner = new BaselineRunner(config, runsRoot);
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
  console.log(`  trajectory: ${result.trajectoryPath ?? "(none)"}`);
  console.log(`  metadata: ${result.metadataPath ?? "(none)"}`);
  if (result.error) console.log(`  error: ${result.error}`);

  process.exit(result.status === "error" || result.status === "timeout" ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
