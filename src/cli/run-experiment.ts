#!/usr/bin/env tsx
/**
 * Master Experiment Runner CLI — Frontier Engineering Challenge
 * Executes Baseline v0, Agent V1, and Agent V2 across benchmark cases,
 * evaluates all patches deterministically, and prints a comparative delta report.
 *
 * Usage:
 *   bun run experiment --v2 --reuse-baseline --reuse-v1 --concurrency 4
 *   bun run experiment --reuse-baseline
 *   bun run experiment --cases hist-001,synth-001
 *   bun run experiment --mock
 */

import { loadBaselineConfig } from "../config/BaselineConfig.ts";
import { BaselineRunner } from "../runner/BaselineRunner.ts";
import { loadV1Config } from "../v1/config/V1Config.ts";
import { V1Runner } from "../v1/runner/V1Runner.ts";
import { loadV2Config } from "../v2/config/V2Config.ts";
import { V2Runner } from "../v2/runner/V2Runner.ts";
import { CaseLoader } from "../runner/CaseLoader.ts";
import { Evaluator } from "../evaluator/Evaluator.ts";
import { loadBenchmarkIdentity } from "../evaluator/benchmarkIdentity.ts";
import {
  aggregateResults,
  computeAllAgentMetrics,
  computeAgentMetrics,
  computeComparison,
  computeCaseBreakdown,
  computeCaseStability,
  computeFailureAnalysis,
} from "../evaluator/aggregation.ts";
import {
  computeHistoricalVsSynthetic,
  computeDifficultyBreakdown,
  computeCategoryBreakdown,
} from "../evaluator/breakdowns.ts";
import {
  buildExperimentReport,
  generateReportMarkdown,
  generateSummaryJson,
} from "../evaluator/report.ts";
import { TrajectoryDatasetAggregator } from "../evaluator/trajectory/aggregation.ts";
import { vacuumTrajectories } from "../../scripts/clean-trajectories.ts";
import { loadPricingConfig } from "../evaluator/pricing.ts";
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EvaluationResult } from "../evaluator/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

interface ExperimentCliOptions {
  caseIds?: string[];
  concurrency: number;
  runsPerCase: number;
  useMock: boolean;
  verbose: boolean;
  quiet: boolean;
  skipBaseline: boolean;
  reuseBaseline: boolean;
  skipV1: boolean;
  reuseV1: boolean;
  runV2: boolean;
  skipV2: boolean;
  experimentName: string;
}

function parseCliArgs(): ExperimentCliOptions {
  const args = process.argv.slice(2);
  const useMock = args.includes("--mock") || process.env.BASELINE_MOCK === "1" || process.env.V1_MOCK === "1" || process.env.V2_MOCK === "1";
  const verbose = args.includes("--verbose") || args.includes("-v");
  const quiet = args.includes("--quiet") || args.includes("-q");
  const skipBaseline = args.includes("--skip-baseline");
  const reuseBaseline = args.includes("--reuse-baseline");
  const skipV1 = args.includes("--skip-v1");
  const reuseV1 = args.includes("--reuse-v1");
  const runV2 = args.includes("--v2") || args.includes("--agent-v2");
  const skipV2 = args.includes("--skip-v2");

  const runsIdx = args.indexOf("--runs");
  const runsPerCase = runsIdx !== -1 && args[runsIdx + 1] ? Math.max(1, Number.parseInt(args[runsIdx + 1]!, 10)) : 1;

  const concurrencyIdx = args.indexOf("--concurrency");
  const concurrency = concurrencyIdx !== -1 && args[concurrencyIdx + 1] ? Math.max(1, Number.parseInt(args[concurrencyIdx + 1]!, 10)) : 4;

  const expIdx = args.indexOf("--experiment") !== -1 ? args.indexOf("--experiment") : args.indexOf("--name");
  const now = new Date();
  const dateStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const experimentName = expIdx !== -1 && args[expIdx + 1] ? args[expIdx + 1]! : `exp-${dateStamp}`;

  let caseIds: string[] | undefined;
  const casesIdx = args.indexOf("--cases");
  if (casesIdx !== -1 && args[casesIdx + 1]) {
    caseIds = args[casesIdx + 1]!.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    const directCases = args.filter((a) => !a.startsWith("-") && /^(hist|synth|hard)-[0-9]{3}$/.test(a));
    if (directCases.length > 0) caseIds = directCases;
  }

  return {
    caseIds,
    concurrency,
    runsPerCase,
    useMock,
    verbose,
    quiet,
    skipBaseline,
    reuseBaseline,
    skipV1,
    reuseV1,
    runV2,
    skipV2,
    experimentName,
  };
}

async function findExistingRuns(runsRoot: string, caseIds: string[], versionPrefix: string): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  try {
    const entries = await readdir(runsRoot, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const metaPath = join(runsRoot, e.name, "metadata.json");
      const patchPath = join(runsRoot, e.name, "patch.diff");
      if (existsSync(metaPath) && existsSync(patchPath)) {
        try {
          const raw = await readFile(metaPath, "utf-8");
          const meta = JSON.parse(raw);
          if (meta.agentVersion?.startsWith(versionPrefix) && caseIds.includes(meta.caseId)) {
            const list = map.get(meta.caseId) ?? [];
            list.push(e.name);
            map.set(meta.caseId, list);
          }
        } catch {}
      }
    }
  } catch {}
  return map;
}

async function main(): Promise<void> {
  const opts = parseCliArgs();
  if (opts.useMock) {
    process.env.BASELINE_MOCK = "1";
    process.env.V1_MOCK = "1";
    process.env.V2_MOCK = "1";
  }

  const live = !opts.quiet;
  process.env.BASELINE_LIVE_PROGRESS = live ? "1" : "0";
  process.env.V1_LIVE_PROGRESS = live ? "1" : "0";
  process.env.V2_LIVE_PROGRESS = live ? "1" : "0";

  const allAvailableCases = await CaseLoader.listCases();
  const targetCases = opts.caseIds && opts.caseIds.length > 0 ? opts.caseIds : allAvailableCases;

  for (const c of targetCases) {
    if (!allAvailableCases.includes(c)) {
      console.error(`Unknown case: ${c}. Available: ${allAvailableCases.join(", ")}`);
      process.exit(1);
    }
  }

  const identity = await loadBenchmarkIdentity();
  const runsRoot = join(ROOT, "experiments/runs");
  await mkdir(runsRoot, { recursive: true });

  const baselineConfig = await loadBaselineConfig({
    overrides: {
      ...(opts.useMock ? { model: "mock" } : {}),
      runsPerCase: opts.runsPerCase,
    },
  });

  const providerEnv = process.env.PROVIDER?.trim();
  const rawModel = process.env.AGENT_MODEL?.trim() ?? baselineConfig.model;
  const currentModel = opts.useMock
    ? "mock"
    : (providerEnv && !rawModel.includes("/") ? `${providerEnv}/${rawModel}` : rawModel);

  console.log("\n" + "=".repeat(78));
  console.log("  Frontier Verifier — Master Experiment Harness");
  console.log("=".repeat(78));
  console.log(`  Experiment:   ${opts.experimentName}`);
  console.log(`  Benchmark:    ${targetCases.length} cases (Fingerprint: ${identity.fingerprint.slice(0, 16)}...)`);
  console.log(`  Model:        ${currentModel} (Provider: ${providerEnv ?? "default"})`);
  console.log(`  Concurrency:  ${opts.concurrency} worker(s)`);
  console.log(`  Runs / Case:  ${opts.runsPerCase} run(s) per case`);
  console.log(`  Execution:    ${opts.useMock ? "Mock Agent" : "Live Cloud API"}`);
  if (opts.reuseBaseline) console.log(`  Baseline:     Reusing completed baseline runs (--reuse-baseline)`);
  if (opts.reuseV1) console.log(`  Agent V1:     Reusing completed V1 runs (--reuse-v1)`);
  if (opts.runV2) console.log(`  Agent V2:     Active execution (--v2)`);
  console.log("=".repeat(78) + "\n");

  const runIdsToEvaluate: string[] = [];

  // --- Step 1: Baseline v0 (fresh or reused) ---
  if (!opts.skipBaseline) {
    let casesToRun = targetCases;
    if (opts.reuseBaseline) {
      const existing = await findExistingRuns(runsRoot, targetCases, "baseline");
      const reusedRuns: string[] = [];
      const missingCases: string[] = [];
      for (const c of targetCases) {
        const found = existing.get(c);
        if (found && found.length >= opts.runsPerCase) {
          reusedRuns.push(...found.slice(0, opts.runsPerCase));
        } else {
          missingCases.push(c);
        }
      }
      if (reusedRuns.length > 0) {
        console.log(`[1/3] Reusing ${reusedRuns.length} existing Baseline v0 run(s) from disk...`);
        for (const id of reusedRuns) runIdsToEvaluate.push(id);
      }
      casesToRun = missingCases;
    }

    if (casesToRun.length > 0) {
      console.log(`[1/3] Running Baseline v0 for ${casesToRun.length} case(s) × ${opts.runsPerCase} runs...`);
      const baselineRunner = new BaselineRunner(baselineConfig, runsRoot);
      const startBaseline = Date.now();
      const baselineResults = await baselineRunner.runBaseline({
        caseIds: casesToRun,
        config: baselineConfig,
        concurrency: opts.concurrency,
        runsPerCase: opts.runsPerCase,
        runsRoot,
      });
      const baselineElapsed = ((Date.now() - startBaseline) / 1000).toFixed(1);
      console.log(`  ✓ Baseline v0 completed: ${baselineResults.length} runs in ${baselineElapsed}s\n`);
      for (const r of baselineResults) runIdsToEvaluate.push(r.runId);
    } else if (opts.reuseBaseline) {
      console.log(`  ✓ All ${targetCases.length} Baseline runs successfully loaded from disk.\n`);
    }
  } else {
    console.log("[1/3] Skipping Baseline v0 (--skip-baseline)\n");
  }

  // --- Step 2: Agent V1 (fresh or reused) ---
  if (!opts.skipV1) {
    let casesToRun = targetCases;
    if (opts.reuseV1) {
      const existing = await findExistingRuns(runsRoot, targetCases, "agent-v1");
      const reusedRuns: string[] = [];
      const missingCases: string[] = [];
      for (const c of targetCases) {
        const found = existing.get(c);
        if (found && found.length >= opts.runsPerCase) {
          reusedRuns.push(...found.slice(0, opts.runsPerCase));
        } else {
          missingCases.push(c);
        }
      }
      if (reusedRuns.length > 0) {
        console.log(`[2/3] Reusing ${reusedRuns.length} existing Agent V1 run(s) from disk...`);
        for (const id of reusedRuns) runIdsToEvaluate.push(id);
      }
      casesToRun = missingCases;
    }

    if (casesToRun.length > 0) {
      console.log(`[2/3] Running Agent V1 (${casesToRun.length} cases × ${opts.runsPerCase} runs)...`);
      const v1Config = await loadV1Config({
        overrides: {
          ...(opts.useMock ? { model: "mock" } : {}),
          runsPerCase: opts.runsPerCase,
        },
      });
      const v1Runner = new V1Runner(v1Config, runsRoot);
      const startV1 = Date.now();
      const v1Results = await v1Runner.runV1({
        caseIds: casesToRun,
        config: v1Config,
        concurrency: opts.concurrency,
        runsPerCase: opts.runsPerCase,
        runsRoot,
      });
      const v1Elapsed = ((Date.now() - startV1) / 1000).toFixed(1);
      console.log(`  ✓ Agent V1 completed: ${v1Results.length} runs in ${v1Elapsed}s\n`);
      for (const r of v1Results) runIdsToEvaluate.push(r.runId);
    } else if (opts.reuseV1) {
      console.log(`  ✓ All ${targetCases.length} Agent V1 runs successfully loaded from disk.\n`);
    }
  } else {
    console.log("[2/3] Skipping Agent V1 (--skip-v1)\n");
  }

  // --- Step 3: Agent V2 ---
  if (opts.runV2 && !opts.skipV2) {
    console.log(`[3/3] Running Agent V2 (${targetCases.length} cases × ${opts.runsPerCase} runs)...`);
    const v2Config = await loadV2Config({
      overrides: {
        ...(opts.useMock ? { model: "mock" } : {}),
        runsPerCase: opts.runsPerCase,
      },
    });
    const v2Runner = new V2Runner(v2Config, runsRoot);
    const startV2 = Date.now();
    const v2Results = await v2Runner.runV2({
      caseIds: targetCases,
      config: v2Config,
      concurrency: opts.concurrency,
      runsPerCase: opts.runsPerCase,
      runsRoot,
    });
    const v2Elapsed = ((Date.now() - startV2) / 1000).toFixed(1);
    console.log(`  ✓ Agent V2 completed: ${v2Results.length} runs in ${v2Elapsed}s\n`);
    for (const r of v2Results) runIdsToEvaluate.push(r.runId);
  }

  // --- Step 4: Deterministic Evaluation Across All Collected Runs ---
  console.log(`\nEvaluating ${runIdsToEvaluate.length} run(s) against benchmark ground truth...`);
  const evaluator = new Evaluator();

  const evaluationResults: EvaluationResult[] = [];
  let evalDone = 0;
  for (const runId of runIdsToEvaluate) {
    const runDir = join(runsRoot, runId);
    const metaPath = join(runDir, "metadata.json");

    if (!existsSync(metaPath)) continue;
    try {
      const res = await evaluator.evaluate({
        runId,
        runsDir: runsRoot,
      });
      evaluationResults.push(res);
      evalDone++;
      if (opts.verbose) {
        console.log(`  [${evalDone}/${runIdsToEvaluate.length}] ${runId} (${res.caseId}) → ${res.verdict === "verified" ? "VERIFIED" : "FAILED"}`);
      }
    } catch (e: any) {
      console.warn(`  Evaluation error on ${runId}: ${e.message}`);
    }
  }

  // Aggregate comparative statistics
  const summary = aggregateResults(evaluationResults);
  const agents = computeAllAgentMetrics(evaluationResults);
  const historicalVsSynthetic = computeHistoricalVsSynthetic(evaluationResults);
  const byDifficulty = computeDifficultyBreakdown(evaluationResults);
  const byCategory = computeCategoryBreakdown(evaluationResults);
  const stability = computeCaseStability(evaluationResults);
  const caseBreakdown = computeCaseBreakdown(evaluationResults);
  const failures = computeFailureAnalysis(evaluationResults);
  const pricingSnapshot = loadPricingConfig() ?? null;

  const baselineVersion = evaluationResults.find((r) => r.agentVersion.includes("baseline"))?.agentVersion ?? "baseline-v0";
  const comparisonAgentVersion = evaluationResults.find((r) => r.agentVersion.includes("v2"))?.agentVersion
    ?? evaluationResults.find((r) => r.agentVersion.includes("v1"))?.agentVersion
    ?? "agent-v1";

  const baselineMetrics = computeAgentMetrics(evaluationResults, baselineVersion);
  const compMetrics = computeAgentMetrics(evaluationResults, comparisonAgentVersion);
  const comparison = computeComparison(baselineMetrics, compMetrics);

  const report = buildExperimentReport({
    benchmarkVersion: identity.version,
    benchmarkFingerprint: identity.fingerprint,
    experimentId: opts.experimentName,
    runsDir: runsRoot,
    totalRuns: evaluationResults.length,
    results: evaluationResults,
    summary,
    historicalVsSynthetic,
    byDifficulty,
    byCategory,
    stability,
    agents,
    caseBreakdown,
    comparison,
    failures,
    pricingSnapshot,
  });

  // Write reports to disk
  const reportDir = join(ROOT, "experiments/reports", opts.experimentName);
  await mkdir(reportDir, { recursive: true });
  const mdReport = generateReportMarkdown(report);
  await writeFile(join(reportDir, "report.md"), mdReport, "utf-8");
  await writeFile(join(reportDir, "report.json"), JSON.stringify(report, null, 2), "utf-8");
  const summaryJson = generateSummaryJson(report);
  await writeFile(join(reportDir, "summary.json"), JSON.stringify(summaryJson, null, 2), "utf-8");

  // Trajectory Dataset Aggregation (cross-run dataset grouped by verdict & agent)
  const runsWithTraj = evaluationResults.filter((r) => r.trajectoryMetrics);
  if (runsWithTraj.length > 0) {
    const trajDataset = TrajectoryDatasetAggregator.buildDataset({
      benchmarkVersion: identity.version,
      benchmarkFingerprint: identity.fingerprint,
      runs: runsWithTraj.map((r) => ({
        metrics: r.trajectoryMetrics!,
        verdict: r.verdict,
      })),
    });
    await writeFile(join(reportDir, "trajectory-dataset.json"), JSON.stringify(trajDataset, null, 2), "utf-8");
    try {
      await mkdir(join(ROOT, "evaluation"), { recursive: true });
      await writeFile(join(ROOT, "evaluation/trajectory-dataset.json"), JSON.stringify(trajDataset, null, 2), "utf-8");
    } catch {}
  }

  // --- Step 5: Auto-Vacuum Trajectory Logs to Reclaim Disk Space ---
  try {
    const vacuumRes = await vacuumTrajectories(runsRoot, true);
    if (vacuumRes.savedMb > 0) {
      console.log(`\n  [Storage] Auto-vacuum reclaimed ${vacuumRes.savedMb} MB of trajectory logs.`);
    }
  } catch {}

  // --- Print Rich Terminal Comparative Summary ---
  console.log("\n" + "=".repeat(78));
  console.log("  EXPERIMENT RESULTS — COMPARATIVE PERFORMANCE");
  console.log("=".repeat(78));

  const formatRate = (rate: number | null | undefined) => (rate != null ? `${rate.toFixed(1)}%` : "N/A");

  console.log("\n--- AGENTS OVERVIEW ---");
  for (const a of agents) {
    const costStr = a.efficiency.averageCostUsd != null ? `$${a.efficiency.averageCostUsd.toFixed(4)}` : "N/A";
    const durStr = a.efficiency.averageDurationMs != null ? `${(a.efficiency.averageDurationMs / 1000).toFixed(1)}s` : "N/A";
    console.log(`  ${a.agentVersion.padEnd(16)} | Runs: ${String(a.runs).padEnd(4)} | VFR: ${formatRate(a.rates.vfr).padEnd(8)} | AvgCost: ${costStr.padEnd(10)} | AvgDur: ${durStr}`);
  }

  console.log("\n--- CASE-BY-CASE BREAKDOWN ---");
  console.log(`  Case ID      | Agent Version    | Runs | Verified | VFR    | Avg Duration`);
  console.log(`  -------------+------------------+------+----------+--------+-------------`);
  for (const c of caseBreakdown) {
    const durStr = c.avgDuration ? `${(c.avgDuration / 1000).toFixed(1)}s` : "—";
    console.log(`  ${c.caseId.padEnd(12)} | ${c.agentVersion.padEnd(16)} | ${String(c.runs).padEnd(4)} | ${String(c.verified).padEnd(8)} | ${formatRate(c.vfr).padEnd(6)} | ${durStr}`);
  }

  console.log("\n" + "=".repeat(78));
  console.log(`  Full Report Written: ${join("experiments/reports", opts.experimentName, "report.md")}`);
  console.log("=".repeat(78) + "\n");
}

main().catch((e) => {
  console.error("Experiment runner failed:", e);
  process.exit(1);
});
