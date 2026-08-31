#!/usr/bin/env tsx
/**
 * Master Experiment Runner CLI — Frontier Engineering Challenge
 * Executes Baseline v0 vs Agent V1 across benchmark cases,
 * evaluates all patches deterministically, and prints a comparative delta report.
 *
 * Usage:
 *   bun run experiment
 *   bun run experiment --concurrency 4 --runs 1
 *   bun run experiment --reuse-baseline
 *   bun run experiment --cases hist-001,synth-001
 *   bun run experiment --mock
 */

import { loadBaselineConfig } from "../config/BaselineConfig.ts";
import { BaselineRunner } from "../runner/BaselineRunner.ts";
import { loadV1Config } from "../v1/config/V1Config.ts";
import { V1Runner } from "../v1/runner/V1Runner.ts";
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
import { buildExperimentReport, generateReportMarkdown, generateSummaryJson } from "../evaluator/report.ts";
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
  experimentName: string;
}

function parseCliArgs(): ExperimentCliOptions {
  const args = process.argv.slice(2);
  const useMock = args.includes("--mock") || process.env.BASELINE_MOCK === "1" || process.env.V1_MOCK === "1";
  const verbose = args.includes("--verbose") || args.includes("-v");
  const quiet = args.includes("--quiet") || args.includes("-q");
  const skipBaseline = args.includes("--skip-baseline");
  const reuseBaseline = args.includes("--reuse-baseline");
  const skipV1 = args.includes("--skip-v1");

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
    experimentName,
  };
}

async function findExistingBaselineRuns(runsRoot: string, caseIds: string[]): Promise<Map<string, string[]>> {
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
          if (meta.agentVersion?.startsWith("baseline") && caseIds.includes(meta.caseId)) {
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
  }
  // Enable clean live tool progress by default unless explicitly silenced via --quiet
  const live = !opts.quiet;
  process.env.BASELINE_LIVE_PROGRESS = live ? "1" : "0";
  process.env.V1_LIVE_PROGRESS = live ? "1" : "0";

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
  console.log("=".repeat(78) + "\n");

  const runIdsToEvaluate: string[] = [];

  // --- Step 1: Baseline v0 (fresh or reused) ---
  if (!opts.skipBaseline) {
    let casesToRun = targetCases;
    if (opts.reuseBaseline) {
      const existing = await findExistingBaselineRuns(runsRoot, targetCases);
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
      const baselineConfig = await loadBaselineConfig({
        overrides: {
          ...(opts.useMock ? { model: "mock" } : {}),
          runsPerCase: opts.runsPerCase,
        },
      });
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

  // --- Step 2: Run Agent V1 ---
  if (!opts.skipV1) {
    console.log(`[2/3] Running Agent V1 (${targetCases.length} cases × ${opts.runsPerCase} runs)...`);
    const v1Config = await loadV1Config({
      overrides: {
        ...(opts.useMock ? { model: "mock" } : {}),
        runsPerCase: opts.runsPerCase,
      },
    });
    const v1Runner = new V1Runner(v1Config, runsRoot);
    const startV1 = Date.now();
    const v1Results = await v1Runner.runV1({
      caseIds: targetCases,
      config: v1Config,
      concurrency: opts.concurrency,
      runsPerCase: opts.runsPerCase,
      runsRoot,
    });
    const v1Elapsed = ((Date.now() - startV1) / 1000).toFixed(1);
    console.log(`  ✓ Agent V1 completed: ${v1Results.length} runs in ${v1Elapsed}s\n`);
    for (const r of v1Results) runIdsToEvaluate.push(r.runId);
  } else {
    console.log("[2/3] Skipping Agent V1 (--skip-v1)\n");
  }

  // --- Step 3: Evaluate All Runs ---
  console.log(`[3/3] Evaluating ${runIdsToEvaluate.length} run(s) against benchmark ground truth...`);
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
  const v1Version = evaluationResults.find((r) => r.agentVersion.includes("v1") || r.agentVersion.includes("agent-v1"))?.agentVersion ?? "agent-v1";
  const baselineMetrics = computeAgentMetrics(evaluationResults, baselineVersion);
  const v1Metrics = computeAgentMetrics(evaluationResults, v1Version);
  const comparison = computeComparison(baselineMetrics, v1Metrics);

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

  // --- Print Rich Terminal Comparative Summary ---
  console.log("\n" + "=".repeat(78));
  console.log("  EXPERIMENT RESULTS — COMPARATIVE PERFORMANCE");
  console.log("=".repeat(78));

  console.log("\n--- AGENT COMPARISON ---");
  const formatRate = (rate: number | null | undefined) => (rate != null ? `${rate.toFixed(1)}%` : "N/A");
  const formatDelta = (row?: { delta: number | null; deltaUnit: string }) => {
    if (!row || row.delta == null) return "";
    const sign = row.delta >= 0 ? "+" : "";
    return ` (${sign}${row.delta.toFixed(1)} ${row.deltaUnit})`;
  };

  const vfrRow = comparison?.find((r) => r.metric === "VFR");
  const reproRow = comparison?.find((r) => r.metric === "Reproduction Rate");
  const oracleRow = comparison?.find((r) => r.metric === "Oracle Pass Rate");
  const regrRow = comparison?.find((r) => r.metric === "Regression-Free Rate");

  console.log(`  Metric                 | Baseline v0      | Agent V1         | Delta`);
  console.log(`  -----------------------+------------------+------------------+-----------------`);
  console.log(`  Verified Fix Rate (VFR)| ${formatRate(baselineMetrics.rates.vfr).padEnd(16)} | ${formatRate(v1Metrics.rates.vfr).padEnd(16)} | ${vfrRow?.delta != null ? (vfrRow.delta >= 0 ? `+${vfrRow.delta.toFixed(1)} pp` : `${vfrRow.delta.toFixed(1)} pp`) : "N/A"}`);
  console.log(`  Reproduction Pass Rate | ${formatRate(baselineMetrics.rates.reproductionRate).padEnd(16)} | ${formatRate(v1Metrics.rates.reproductionRate).padEnd(16)} | ${formatDelta(reproRow)}`);
  console.log(`  Oracle Pass Rate       | ${formatRate(baselineMetrics.rates.oraclePassRate).padEnd(16)} | ${formatRate(v1Metrics.rates.oraclePassRate).padEnd(16)} | ${formatDelta(oracleRow)}`);
  console.log(`  Regression-Free Rate   | ${formatRate(baselineMetrics.rates.regressionFreeRate).padEnd(16)} | ${formatRate(v1Metrics.rates.regressionFreeRate).padEnd(16)} | ${formatDelta(regrRow)}`);
  console.log(`  Mean Duration (ms)     | ${(baselineMetrics.efficiency.averageDurationMs?.toFixed(0) ?? "N/A").padEnd(16)} | ${(v1Metrics.efficiency.averageDurationMs?.toFixed(0) ?? "N/A").padEnd(16)} |`);

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
