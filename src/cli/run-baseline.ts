#!/usr/bin/env tsx
/**
 * CLI: Run Baseline v0 for all cases (or subset).
 * Usage:
 *   bun run baseline:run -- --mock
 *   npx tsx src/cli/run-baseline.ts --mock
 *   npx tsx src/cli/run-baseline.ts hist-001 synth-001 --mock --runs 3
 */

import { loadBaselineConfig } from "../config/BaselineConfig.ts";
import { BaselineRunner } from "../runner/BaselineRunner.ts";
import { CaseLoader } from "../runner/CaseLoader.ts";
import { writeFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const useMock = args.includes("--mock") || process.env.BASELINE_MOCK === "1";
  if (useMock) process.env.BASELINE_MOCK = "1";

  const runsArgIdx = args.indexOf("--runs");
  const runsPerCase = runsArgIdx >= 0 ? Number.parseInt(args[runsArgIdx + 1] ?? "1", 10) : undefined;

  const concurrencyIdx = args.indexOf("--concurrency");
  const concurrency = concurrencyIdx >= 0 ? Number.parseInt(args[concurrencyIdx + 1] ?? "1", 10) : 1;

  const filterCases = args.filter((a) => !a.startsWith("-") && !["--mock"].includes(a) && a !== args[runsArgIdx + 1] && a !== args[concurrencyIdx + 1]);

  let caseIds: string[] | undefined;
  if (filterCases.length > 0) {
    caseIds = filterCases;
    // Validate
    const available = await CaseLoader.listCases();
    for (const c of caseIds) {
      if (!available.includes(c)) {
        console.error(`Unknown case: ${c}. Available: ${available.join(", ")}`);
        process.exit(1);
      }
    }
  } else {
    caseIds = await CaseLoader.listCases();
  }

  const config = await loadBaselineConfig({
    overrides: {
      ...(useMock ? { model: "mock" } : {}),
      ...(runsPerCase ? { runsPerCase } : {}),
    },
  });
  const fingerprint = await BaselineRunner.getFingerprint();
  if (fingerprint) config.benchmarkFingerprint = fingerprint;

  console.log(`Baseline v0 — running ${caseIds.length} case(s) × ${config.runsPerCase} run(s)`);
  console.log(`  cases: ${caseIds.join(", ")}`);
  console.log(`  agent: ${config.agentRuntime} ${config.piVersion} (${config.agentVersion})`);
  console.log(`  model: ${config.model} (${config.thinkingLevel})`);
  console.log(`  benchmark: ${config.benchmarkVersion} ${fingerprint ?? ""}`);
  console.log(`  timeout: ${config.agentTimeoutMs}ms`);
  console.log(`  concurrency: ${concurrency}`);
  console.log(`  mock: ${useMock ? "yes" : "no"}`);
  console.log("");

  const runner = new BaselineRunner(config);
  const start = Date.now();
  const results = await runner.runBaseline({
    caseIds,
    config,
    concurrency,
    runsPerCase: config.runsPerCase,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // Summary
  const byStatus: Record<string, number> = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

  console.log("\n=== Summary ===");
  console.log(`  total runs: ${results.length}`);
  for (const [s, n] of Object.entries(byStatus)) console.log(`  ${s}: ${n}`);
  console.log(`  elapsed: ${elapsed}s`);
  console.log("");

  for (const r of results) {
    console.log(`  ${r.caseId} ${r.runId} ${r.status} ${r.durationMs}ms files=${r.changedFiles.length} patch=${r.patchPath ? "yes" : "no"}`);
  }

  // Write aggregated report
  const reportPath = join(ROOT, "experiments/runs", `baseline-report-${Date.now()}.json`);
  const report = {
    benchmarkVersion: config.benchmarkVersion,
    agentVersion: config.agentVersion,
    agentRuntime: config.agentRuntime,
    piVersion: config.piVersion,
    model: config.model,
    thinkingLevel: config.thinkingLevel,
    fingerprint,
    timestamp: new Date().toISOString(),
    concurrency,
    runsPerCase: config.runsPerCase,
    total: results.length,
    byStatus,
    results: results.map((r) => ({
      runId: r.runId,
      caseId: r.caseId,
      status: r.status,
      durationMs: r.durationMs,
      changedFiles: r.changedFiles,
      patchPath: r.patchPath,
      trajectoryPath: r.trajectoryPath,
      error: r.error,
    })),
  };
  try {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(ROOT, "experiments/runs"), { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`\nReport written to ${reportPath}`);
  } catch (e) {
    console.error("Failed to write report:", e);
  }

  const hadError = results.some((r) => r.status === "error");
  process.exit(hadError ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
