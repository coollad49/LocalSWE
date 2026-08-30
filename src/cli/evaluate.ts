#!/usr/bin/env tsx
/**
 * Evaluator CLI — deterministic evaluation + reporting v1
 * Usage:
 *   bun run evaluate -- --run <runId>
 *   bun run evaluate -- --experiment <experimentId> [--runs-dir <path>] [--force] [--pricing <path>]
 *   bun run evaluate:experiment -- --experiment <experimentId>
 *   bun run evaluate -- --runs-dir experiments/runs
 *   bun run evaluate -- --case <caseId> --patch <path>
 */

import { Evaluator } from "../evaluator/Evaluator.ts";
import { loadBenchmarkIdentity } from "../evaluator/benchmarkIdentity.ts";
import {
  aggregateResults,
  computeCaseStability,
  computeAllAgentMetrics,
  computeAgentMetrics,
  computeCaseBreakdown,
  computeComparison,
  computeFailureAnalysis,
  computeValidRunMetrics,
} from "../evaluator/aggregation.ts";
import { computeHistoricalVsSynthetic, computeDifficultyBreakdown, computeCategoryBreakdown } from "../evaluator/breakdowns.ts";
import { buildExperimentEvaluation, buildExperimentReport, generateReportMarkdown, generateSummaryJson } from "../evaluator/report.ts";
import { loadPricingConfig } from "../evaluator/pricing.ts";
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile, mkdir, symlink, lstat } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { EvaluationResult, ExperimentReport } from "../evaluator/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function printHelp(): void {
  console.log(`Frontier Verifier Evaluator

Usage:
  evaluate --run <runId> [--allow-mismatch] [--keep-workspace] [--json] [--pricing <path>]
  evaluate --case <caseId> --patch <path> [--allow-mismatch] [--json] [--pricing <path>]
  evaluate --experiment <experimentId> [--runs-dir <path>] [--allow-mismatch] [--force] [--pricing <path>]
  evaluate --runs-dir <path> [--allow-mismatch] [--force] [--pricing <path>]
  evaluate --all [--runs-dir <path>]  (deprecated alias for --runs-dir)

Options:
  --run <runId>         Evaluate a BaselineRunner run (experiments/runs/<runId>/patch.diff)
  --case <caseId>       Case ID for direct patch evaluation
  --patch <path>        Path to patch.diff
  --experiment <id>     Evaluate entire experiment, write to experiments/reports/<id>/ (primary) + evaluations/<id>/ (compat)
  --runs-dir <path>     Directory containing run artifacts (default: experiments/runs)
  --runs-root <path>    Alias for --runs-dir
  --pricing <path>      Path to pricing.json (default: experiments/config/pricing.json)
  --allow-mismatch      Allow benchmark version/fingerprint mismatch
  --allow-cross-benchmark Allow mixing different benchmark versions/fingerprints within one experiment (cross-benchmark)
  --force, --no-cache   Force re-evaluation even if cached evaluation/result.json exists and fingerprint matches
  --keep-workspace      Keep isolated workspace after evaluation (debug)
  --json                Output machine-readable JSON only
  --all                 Deprecated: evaluate all runs in experiments/runs/ (use --runs-dir)
  --help                Show this help

Examples:
  bun run evaluate -- --run synth-001-abc123-1234567890
  bun run evaluate -- --experiment baseline-v0
  bun run evaluate:experiment -- --experiment baseline-v0
  bun run evaluate -- --experiment baseline-v0 --runs-dir experiments/runs --force
  bun run evaluate -- --runs-dir experiments/runs
  bun run evaluate -- --case hist-001 --patch ./patch.diff
`);
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--run" && argv[i + 1]) out.run = argv[++i]!;
    else if (a === "--case" && argv[i + 1]) out.case = argv[++i]!;
    else if (a === "--patch" && argv[i + 1]) {
      const v = argv[++i] as string | undefined;
      if (v) out.patch = v;
    } else if (a === "--pricing" && argv[i + 1]) {
      const v = argv[++i] as string | undefined;
      if (v) out.pricing = v;
    } else if (a === "--experiment" && argv[i + 1]) out.experiment = argv[++i]!;
    else if (a === "--runs-dir" && argv[i + 1]) {
      const v = argv[++i] as string | undefined;
      if (v) out.runsDir = v;
    } else if (a === "--runs-root" && argv[i + 1]) {
      const v = argv[++i] as string | undefined;
      if (v) out.runsRoot = v;
    } else if (a === "--allow-mismatch") out.allowMismatch = true;
    else if (a === "--allow-cross-benchmark") out.allowCrossBenchmark = true;
    else if (a === "--force" || a === "--no-cache") out.force = true;
    else if (a === "--keep-workspace") out.keepWorkspace = true;
    else if (a === "--json") out.json = true;
    else if (a === "--all") out.all = true;
    else if (a !== undefined && !a.startsWith("-") && !out.case) out.case = a;
  }
  return out;
}

function printEvaluationSummary(result: EvaluationResult, identity: { version: string; fingerprint: string }): void {
  console.log(`\nFrontier Verifier Evaluation`);
  console.log(`==============================`);
  console.log(`Case: ${result.caseId}`);
  console.log(`Run: ${result.runId}`);
  console.log(`Benchmark: ${identity.version}`);
  console.log(`Fingerprint: ${identity.fingerprint.slice(0, 16)}...`);
  console.log(`AgentVersion: ${result.agentVersion}`);
  if (result.model) console.log(`Model: ${result.model}`);
  console.log(``);
  console.log(`Patch: ${result.verification.patchApply.status === "passed" ? "APPLIED" : result.verification.patchApply.status.toUpperCase()} (${result.verification.patchApply.durationMs}ms)`);
  if (result.verification.patchApply.status !== "passed") {
    console.log(`  reason: ${result.verification.patchApply.reason ?? result.verification.patchApply.stderr?.slice(0, 200) ?? ""}`);
  }
  console.log(``);
  const repro = result.verification.reproduction;
  const oracle = result.verification.oracle;
  const regression = result.verification.regression;
  console.log(`Reproduction: ${repro.status === "passed" ? "PASS" : repro.status === "failed" ? "FAIL" : repro.status.toUpperCase()}  (${repro.durationMs}ms) ${repro.command}`);
  if (repro.status !== "skipped") console.log(`  exit=${repro.exitCode} ${repro.timedOut ? "(timeout)" : ""}`);
  console.log(`Oracle:        ${oracle.status === "passed" ? "PASS" : oracle.status === "failed" ? "FAIL" : oracle.status.toUpperCase()}  (${oracle.durationMs}ms) ${oracle.command}`);
  if (oracle.status !== "skipped") console.log(`  exit=${oracle.exitCode} ${oracle.timedOut ? "(timeout)" : ""}`);
  console.log(`Regression:    ${regression.status === "passed" ? "PASS" : regression.status === "failed" ? "FAIL" : regression.status.toUpperCase()}  (${regression.durationMs}ms) ${regression.command}`);
  if (regression.status !== "skipped") console.log(`  exit=${regression.exitCode} ${regression.timedOut ? "(timeout)" : ""}`);
  console.log(``);
  if (result.status === "completed" && result.verdict) {
    console.log(`VERDICT: ${result.verdict.toUpperCase()}`);
    if (result.verdict === "verified") console.log(`  → Fully verified repair`);
    else if (result.verdict === "agent_failure") console.log(`  → Reproduction still fails`);
    else if (result.verdict === "false_confidence") console.log(`  → Reproduction passed but oracle failed`);
    else if (result.verdict === "regression_failure") console.log(`  → Oracle passed but regression failed`);
  } else {
    console.log(`STATUS: ${result.status.toUpperCase()} ${result.error ? `(${result.error.code}: ${result.error.message.slice(0, 200)})` : ""}`);
    if (result.verdict) console.log(`VERDICT: ${result.verdict.toUpperCase()}`);
  }
  console.log(`Duration: ${result.durationMs}ms  Started: ${result.startedAt}  Completed: ${result.completedAt}`);
  if (result.metrics) {
    console.log(
      `Metrics: turns=${result.metrics.totalTurns ?? "null"} toolCalls=${result.metrics.toolCalls ?? "null"} filesChanged=${result.metrics.filesChanged ?? "null"} iterations=${result.metrics.iterations ?? "null"} tokens=${result.metrics.totalTokens ?? "null"}`,
    );
  }
  if (result.cost) {
    console.log(`Cost: ${result.cost.costUsd != null ? `$${result.cost.costUsd.toFixed(4)}` : "null"} (${result.cost.costStatus})`);
  }
  if (result.workspace?.cleanupError) console.log(`Cleanup warning: ${result.workspace.cleanupError}`);
  console.log(``);
}

async function evaluateExperimentRuns(params: {
  experimentId: string;
  runsDir: string;
  allowMismatch: boolean;
  allowCrossBenchmark: boolean;
  force: boolean;
  pricingPath?: string;
  keepWorkspace: boolean;
  jsonOnly: boolean;
}): Promise<void> {
  const { experimentId, runsDir, allowMismatch, allowCrossBenchmark, force, pricingPath, keepWorkspace, jsonOnly } = params;
  const resolvedRunsDir = resolve(ROOT, runsDir);
  const reportsRoot = join(ROOT, "experiments/reports", experimentId);
  const evaluationsRoot = join(ROOT, "experiments/evaluations", experimentId);

  let entries: string[] = [];
  try {
    const items = await readdir(resolvedRunsDir, { withFileTypes: true });
    entries = items.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (e) {
    console.error(`Cannot list runs at ${resolvedRunsDir}: ${(e as Error).message}`);
    process.exitCode = 1;
    throw e;
  }

  const runIds: string[] = [];
  for (const name of entries) {
    if (existsSync(join(resolvedRunsDir, name, "patch.diff"))) runIds.push(name);
  }
  if (runIds.length === 0) {
    console.log(`No runs with patch.diff found in ${resolvedRunsDir}`);
    const identity = await loadBenchmarkIdentity();
    const summary = aggregateResults([]);
    const historicalVsSynthetic = computeHistoricalVsSynthetic([]);
    const byDifficulty = computeDifficultyBreakdown([]);
    const byCategory = computeCategoryBreakdown([]);
    const stability = computeCaseStability([]);
    const evalData = buildExperimentEvaluation({
      benchmarkVersion: identity.version,
      benchmarkFingerprint: identity.fingerprint,
      experimentId,
      runsDir: resolvedRunsDir,
      totalRuns: 0,
      results: [],
      summary,
      historicalVsSynthetic,
      byDifficulty,
      byCategory,
      stability,
    });
    // Build report with empty
    const pricingSnapshot = loadPricingConfig(pricingPath) ?? null;
    const agents: ExperimentReport["agents"] = [];
    const caseBreakdown = computeCaseBreakdown([]);
    const failures = computeFailureAnalysis([]);
    const report = buildExperimentReport({
      benchmarkVersion: identity.version,
      benchmarkFingerprint: identity.fingerprint,
      experimentId,
      runsDir: resolvedRunsDir,
      totalRuns: 0,
      results: [],
      summary,
      historicalVsSynthetic,
      byDifficulty,
      byCategory,
      stability,
      agents,
      caseBreakdown,
      comparison: null,
      failures,
      pricingSnapshot,
    });
    await mkdir(reportsRoot, { recursive: true });
    await writeFile(join(reportsRoot, "report.json"), JSON.stringify(report, null, 2), "utf-8");
    await writeFile(join(reportsRoot, "report.md"), generateReportMarkdown(report), "utf-8");
    await writeFile(join(reportsRoot, "summary.json"), JSON.stringify(generateSummaryJson(report), null, 2), "utf-8");
    await mkdir(evaluationsRoot, { recursive: true });
    await writeFile(join(evaluationsRoot, "evaluation.json"), JSON.stringify(evalData, null, 2), "utf-8");
    await writeFile(join(evaluationsRoot, "report.md"), generateReportMarkdown(evalData), "utf-8");
    console.log(`Empty evaluation written to ${reportsRoot} and ${evaluationsRoot}`);
    process.exit(0);
  }

  console.log(`Evaluating ${runIds.length} runs from ${resolvedRunsDir} for experiment ${experimentId}... (force=${force})`);
  console.log(`[progress] 0/${runIds.length} evaluated — starting...`);
  const evaluator = new Evaluator();
  const results: EvaluationResult[] = [];
  const startAll = Date.now();
  const identity = await loadBenchmarkIdentity();
  let evaluated = 0;
  const sortedRunIds = runIds.sort();
  const progInterval = setInterval(() => {
    if (jsonOnly) return;
    const elapsed = ((Date.now() - startAll) / 1000).toFixed(0);
    console.log(`[heartbeat] ${evaluated}/${sortedRunIds.length} evaluated, elapsed ${elapsed}s — still verifying...`);
  }, 30000);

  for (const runId of sortedRunIds) {
    const idx = evaluated + 1;
    if (!jsonOnly) console.log(`[progress] [${idx}/${sortedRunIds.length}] ${runId} — starting...`);
    // Caching: preserve already evaluated runs where identity matches, unless --force
    const cachedPath = join(resolvedRunsDir, runId, "evaluation", "result.json");
    if (!force && existsSync(cachedPath)) {
      try {
        const cachedRaw = await readFile(cachedPath, "utf-8");
        const cached = JSON.parse(cachedRaw) as EvaluationResult;
        // Check fingerprint + agentVersion match and not stale
        // Also check metadata fingerprint vs cached to detect stale metadata edit
        let metadataFingerprint: string | null = null;
        let metadataVersion: string | null = null;
        try {
          const metaPath = join(resolvedRunsDir, runId, "metadata.json");
          if (existsSync(metaPath)) {
            const metaRaw = await readFile(metaPath, "utf-8");
            const metaJson = JSON.parse(metaRaw) as { benchmarkFingerprint?: string; benchmarkVersion?: string };
            metadataFingerprint = metaJson.benchmarkFingerprint ?? null;
            metadataVersion = metaJson.benchmarkVersion ?? null;
          }
        } catch {}
        const cacheStaleByMetadata =
          (metadataFingerprint != null && metadataFingerprint !== cached.benchmarkFingerprint) ||
          (metadataVersion != null && metadataVersion !== cached.benchmarkVersion);
        if (
          cached.benchmarkFingerprint === identity.fingerprint &&
          cached.benchmarkVersion === identity.version &&
          cached.benchmarkFingerprint &&
          cached.benchmarkVersion &&
          !cacheStaleByMetadata
        ) {
          // Also check patch still exists (already guaranteed) and metrics refresh? Reuse but ensure metrics present
          // If cached missing metrics/cost, we can enrich without re-running full ladder? But spec says preserve where identity matches
          // We'll enrich missing metrics lazily
          if (!cached.metrics || !cached.cost) {
            // Try to enrich via metrics extraction without re-executing verification
            try {
              const { extractRunMetrics } = await import("../evaluator/metrics.ts");
              const { metrics, cost } = await extractRunMetrics({
                runId: cached.runId,
                runsDir: resolvedRunsDir,
                agentVersion: cached.agentVersion,
                durationMsFallback: cached.durationMs,
                pricingConfigPath: pricingPath,
              });
              cached.metrics = metrics;
              cached.cost = cost;
            } catch {
              // ignore
            }
          }
          results.push(cached);
          evaluated++;
          if (!jsonOnly) {
            console.log(`[cached] [${idx}/${sortedRunIds.length}] ${runId} → ${cached.verdict?.toUpperCase() ?? cached.status.toUpperCase()} (${cached.durationMs}ms)`);
            printEvaluationSummary(cached, identity);
          }
          continue;
        } else {
          if (!allowMismatch && !allowCrossBenchmark) {
            console.log(`[stale cache] ${runId} fingerprint mismatch cached=${cached.benchmarkFingerprint?.slice(0, 8)} current=${identity.fingerprint.slice(0, 8)} → re-evaluating`);
          }
        }
      } catch (e) {
        console.log(`[cache read error] ${runId}: ${(e as Error).message} → re-evaluating`);
      }
    }

    try {
      const result = await evaluator.evaluate({
        runId,
        runsDir: resolvedRunsDir,
        allowBenchmarkMismatch: allowMismatch,
        allowCrossBenchmark,
        pricingConfigPath: pricingPath,
        keepWorkspace,
      });
      results.push(result);
      evaluated++;
      if (!jsonOnly) {
        console.log(`[done] [${idx}/${sortedRunIds.length}] ${runId} → ${result.verdict?.toUpperCase() ?? result.status.toUpperCase()} (${result.durationMs}ms)`);
        printEvaluationSummary(result, identity);
      }
    } catch (e) {
      evaluated++;
      console.error(`[error] [${idx}/${sortedRunIds.length}] Failed to evaluate ${runId}: ${(e as Error).message}`);
    }
  }
  clearInterval(progInterval);
  if (!jsonOnly) console.log(`[progress] ${evaluated}/${sortedRunIds.length} evaluated in ${((Date.now() - startAll) / 1000).toFixed(1)}s`);

   // Data integrity: reject mixed benchmark fingerprints within one experiment
  const fingerprints = new Set(results.map((r) => r.benchmarkFingerprint));
  const versions = new Set(results.map((r) => r.benchmarkVersion));
  if (!allowCrossBenchmark && (fingerprints.size > 1 || versions.size > 1)) {
    console.error(`ERROR: Mixed benchmark fingerprints/versions within experiment "${experimentId}":`);
    console.error(`  fingerprints: ${[...fingerprints].join(", ")}`);
    console.error(`  versions: ${[...versions].join(", ")}`);
    console.error(`Rejecting experiment to prevent mixing. Use --allow-cross-benchmark if intentional cross-benchmark comparison.`);
    process.exitCode = 2;
    throw new Error(`BENCHMARK_FINGERPRINT_MISMATCH: mixed fingerprints within experiment`);
  }

  // Also reject mixing benchmark vs current if results contain fingerprint not equal to current identity
  if (!allowMismatch && !allowCrossBenchmark) {
    const mismatched = results.filter((r) => r.benchmarkFingerprint !== identity.fingerprint || r.benchmarkVersion !== identity.version);
    if (mismatched.length > 0) {
      console.error(`ERROR: ${mismatched.length} runs have benchmark fingerprint/version different from current benchmark ${identity.version} ${identity.fingerprint.slice(0, 16)}...`);
      for (const m of mismatched.slice(0, 3)) console.error(`  ${m.runId}: ${m.benchmarkVersion} ${m.benchmarkFingerprint.slice(0, 16)}...`);
      console.error(`Use --allow-mismatch to override or --allow-cross-benchmark for cross comparison.`);
      process.exitCode = 2;
      throw new Error(`BENCHMARK_MISMATCH: fingerprint vs current benchmark`);
    }
  }

  // Reject if any run failed benchmark identity check (even though result carries actual fingerprint)
  if (!allowMismatch && !allowCrossBenchmark) {
    const benchmarkErrors = results.filter((r) => r.error?.code && r.error.code.includes("BENCHMARK"));
    if (benchmarkErrors.length > 0) {
      console.error(`ERROR: ${benchmarkErrors.length} runs have benchmark identity mismatch (see error codes):`);
      for (const e of benchmarkErrors.slice(0, 3)) console.error(`  ${e.runId}: ${e.error?.code} ${e.error?.message.slice(0, 120)}`);
      console.error(`Use --allow-mismatch to override or --allow-cross-benchmark for cross comparison.`);
      process.exitCode = 2;
      throw new Error(`BENCHMARK_IDENTITY_ERROR: ${benchmarkErrors.length} runs mismatch`);
    }
  }

  const summary = aggregateResults(results);
  const historicalVsSynthetic = computeHistoricalVsSynthetic(results);
  const byDifficulty = computeDifficultyBreakdown(results);
  const byCategory = computeCategoryBreakdown(results);
  const stability = computeCaseStability(results);

  const evalData = buildExperimentEvaluation({
    benchmarkVersion: identity.version,
    benchmarkFingerprint: identity.fingerprint,
    experimentId,
    runsDir: resolvedRunsDir,
    totalRuns: results.length,
    results,
    summary,
    historicalVsSynthetic,
    byDifficulty,
    byCategory,
    stability,
  });
  (evalData.experiment as { elapsedMs?: number }).elapsedMs = Date.now() - startAll;

  // New report
  const agents = computeAllAgentMetrics(results);
  const caseBreakdown = computeCaseBreakdown(results);
  const failures = computeFailureAnalysis(results);
  const pricingSnapshot = loadPricingConfig(pricingPath) ?? null;

  // Comparison: need at least 2 versions; sort versions lexicographically, take first two? Actually baseline-v0 vs agent-v1 expected
  let comparison: ExperimentReport["comparison"] = null;
  if (agents.length >= 2) {
    // Deterministic: sort agents, then pick lowest and highest lexicographically? Better pick baseline-v0 and agent-v1 if present else first two
    const sorted = [...agents].sort((a, b) => a.agentVersion.localeCompare(b.agentVersion));
    // Prefer baseline-v0 vs agent-v1 if both present
    let v0: typeof sorted[0] | null = null;
    let v1: typeof sorted[0] | null = null;
    const base = sorted.find((a) => a.agentVersion === "baseline-v0");
    const v1a = sorted.find((a) => a.agentVersion === "agent-v1" || a.agentVersion === "v1");
    if (base && v1a) {
      v0 = base;
      v1 = v1a;
    } else {
      v0 = sorted[0] ?? null;
      v1 = sorted[1] ?? null;
    }
    if (v0 && v1) comparison = computeComparison(v0, v1);
  }

  const report = buildExperimentReport({
    benchmarkVersion: identity.version,
    benchmarkFingerprint: identity.fingerprint,
    experimentId,
    runsDir: resolvedRunsDir,
    totalRuns: results.length,
    elapsedMs: Date.now() - startAll,
    results,
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

  // Write primary reports
  await mkdir(reportsRoot, { recursive: true });
  await mkdir(join(reportsRoot, "cases"), { recursive: true });

  const reportJsonPath = join(reportsRoot, "report.json");
  await writeFile(reportJsonPath, JSON.stringify(report, null, 2), "utf-8");

  const reportMdPath = join(reportsRoot, "report.md");
  const reportMd = generateReportMarkdown(report);
  await writeFile(reportMdPath, reportMd, "utf-8");

  const summaryPath = join(reportsRoot, "summary.json");
  await writeFile(summaryPath, JSON.stringify(generateSummaryJson(report), null, 2), "utf-8");

  // Per-run cases/<runId>.json under reports
  for (const r of results) {
    const casePath = join(reportsRoot, "cases", `${r.runId}.json`);
    const perRun = {
      runId: r.runId,
      caseId: r.caseId,
      agentVersion: r.agentVersion,
      benchmarkVersion: r.benchmarkVersion,
      benchmarkFingerprint: r.benchmarkFingerprint,
      model: r.model,
      piVersion: r.piVersion,
      status: r.status,
      verdict: r.verdict,
      durationMs: r.durationMs,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      caseMeta: r.caseMeta,
      metrics: r.metrics,
      cost: r.cost,
      verification: {
        patchApply: {
          status: r.verification.patchApply.status,
          exitCode: r.verification.patchApply.exitCode,
          durationMs: r.verification.patchApply.durationMs,
          command: r.verification.patchApply.command,
          stdout: r.verification.patchApply.stdout?.slice(0, 2000),
          stderr: r.verification.patchApply.stderr?.slice(0, 2000),
          reason: r.verification.patchApply.reason,
          timedOut: r.verification.patchApply.timedOut,
        },
        reproduction: {
          status: r.verification.reproduction.status,
          exitCode: r.verification.reproduction.exitCode,
          durationMs: r.verification.reproduction.durationMs,
          command: r.verification.reproduction.command,
          stdout: r.verification.reproduction.stdout?.slice(0, 2000),
          stderr: r.verification.reproduction.stderr?.slice(0, 2000),
          reason: r.verification.reproduction.reason,
          timedOut: r.verification.reproduction.timedOut,
        },
        oracle: {
          status: r.verification.oracle.status,
          exitCode: r.verification.oracle.exitCode,
          durationMs: r.verification.oracle.durationMs,
          command: r.verification.oracle.command,
          stdout: r.verification.oracle.stdout?.slice(0, 2000),
          stderr: r.verification.oracle.stderr?.slice(0, 2000),
          reason: r.verification.oracle.reason,
          timedOut: r.verification.oracle.timedOut,
        },
        regression: {
          status: r.verification.regression.status,
          exitCode: r.verification.regression.exitCode,
          durationMs: r.verification.regression.durationMs,
          command: r.verification.regression.command,
          stdout: r.verification.regression.stdout?.slice(0, 2000),
          stderr: r.verification.regression.stderr?.slice(0, 2000),
          reason: r.verification.regression.reason,
          timedOut: r.verification.regression.timedOut,
        },
      },
      error: r.error,
    };
    await writeFile(casePath, JSON.stringify(perRun, null, 2), "utf-8");
  }

  // Backwards compat: also write to evaluationsRoot
  await mkdir(evaluationsRoot, { recursive: true });
  await mkdir(join(evaluationsRoot, "cases"), { recursive: true });
  const evalJsonPath = join(evaluationsRoot, "evaluation.json");
  await writeFile(evalJsonPath, JSON.stringify(evalData, null, 2), "utf-8");
  const evalMdPath = join(evaluationsRoot, "report.md");
  await writeFile(evalMdPath, generateReportMarkdown(evalData), "utf-8");
  for (const r of results) {
    const casePath = join(evaluationsRoot, "cases", `${r.runId}.json`);
    try {
      // Avoid overwriting if reports already have same
      const perRun = {
        runId: r.runId,
        caseId: r.caseId,
        agentVersion: r.agentVersion,
        benchmarkVersion: r.benchmarkVersion,
        benchmarkFingerprint: r.benchmarkFingerprint,
        status: r.status,
        verdict: r.verdict,
        durationMs: r.durationMs,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        caseMeta: r.caseMeta,
        verification: {
          patchApply: { status: r.verification.patchApply.status, exitCode: r.verification.patchApply.exitCode, durationMs: r.verification.patchApply.durationMs, command: r.verification.patchApply.command, stdout: r.verification.patchApply.stdout?.slice(0, 2000), stderr: r.verification.patchApply.stderr?.slice(0, 2000), reason: r.verification.patchApply.reason, timedOut: r.verification.patchApply.timedOut },
          reproduction: { status: r.verification.reproduction.status, exitCode: r.verification.reproduction.exitCode, durationMs: r.verification.reproduction.durationMs, command: r.verification.reproduction.command, stdout: r.verification.reproduction.stdout?.slice(0, 2000), stderr: r.verification.reproduction.stderr?.slice(0, 2000), reason: r.verification.reproduction.reason, timedOut: r.verification.reproduction.timedOut },
          oracle: { status: r.verification.oracle.status, exitCode: r.verification.oracle.exitCode, durationMs: r.verification.oracle.durationMs, command: r.verification.oracle.command, stdout: r.verification.oracle.stdout?.slice(0, 2000), stderr: r.verification.oracle.stderr?.slice(0, 2000), reason: r.verification.oracle.reason, timedOut: r.verification.oracle.timedOut },
          regression: { status: r.verification.regression.status, exitCode: r.verification.regression.exitCode, durationMs: r.verification.regression.durationMs, command: r.verification.regression.command, stdout: r.verification.regression.stdout?.slice(0, 2000), stderr: r.verification.regression.stderr?.slice(0, 2000), reason: r.verification.regression.reason, timedOut: r.verification.regression.timedOut },
        },
        error: r.error,
        metrics: r.metrics,
        cost: r.cost,
      };
      await writeFile(casePath, JSON.stringify(perRun, null, 2), "utf-8");
    } catch {}
  }

  // Try to keep reports and evaluations in sync via symlink attempt is omitted for simplicity (both dirs written)

  if (!jsonOnly) {
    console.log(`\nAggregated:`);
    const { formatMetrics } = await import("../evaluator/aggregation.ts");
    console.log(formatMetrics(summary));
    console.log(`\nVFR = ${summary.rates.vfr.toFixed(2)}% (${summary.byVerdict.verified}/${summary.total} total)`);
    console.log(`Reproduction = ${summary.rates.reproductionRate.toFixed(2)}%  Oracle = ${summary.rates.oracleRate.toFixed(2)}%  RegressionFree = ${summary.rates.regressionFreeRate.toFixed(2)}%`);
    console.log(`Valid VFR = ${computeValidRunMetrics(results).vfrValid?.toFixed(2) ?? "null"}% (excludes infra)`);
    if (agents.length > 0) {
      console.log(`\nPer-agent:`);
      for (const a of agents) {
        console.log(`  ${a.agentVersion}: ${a.runs} runs VFR ${a.rates.vfr?.toFixed(2) ?? "null"}% avgCost ${a.efficiency.averageCostUsd != null ? `$${a.efficiency.averageCostUsd.toFixed(4)}` : "null"} avgDuration ${a.efficiency.averageDurationMs?.toFixed(0) ?? "null"}ms`);
      }
    }
    if (comparison) {
      console.log(`\nComparison (delta in pp where applicable):`);
      for (const c of comparison.slice(0, 5)) console.log(`  ${c.metric}: ${c.v0?.toFixed(2) ?? "null"} → ${c.v1?.toFixed(2) ?? "null"} delta ${c.delta?.toFixed(2) ?? "null"}${c.deltaUnit === "pp" ? "pp" : ""}`);
    }
    console.log(`\nReport JSON written to ${reportJsonPath}`);
    console.log(`Report MD written to ${reportMdPath}`);
    console.log(`Summary JSON written to ${summaryPath}`);
    console.log(`Compat evaluation written to ${evalJsonPath}`);
    console.log(`Per-run cases written to ${join(reportsRoot, "cases/")}`);
  } else {
    // When jsonOnly, output the new report json
    console.log(JSON.stringify(report, null, 2));
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const hasBatch =
    Boolean(args.experiment) || Boolean(args.runsDir) || Boolean(args.runsRoot) || Boolean(args.all);

  if (hasBatch) {
    if (args.all && !args.experiment && !args.runsDir && !args.runsRoot) {
      console.warn("Deprecation: --all is deprecated, use --experiment <id> or --runs-dir <path>");
    }

    let experimentId: string;
    let runsDir: string;

    if (args.experiment) {
      experimentId = args.experiment as string;
      runsDir = (args.runsDir as string) ?? (args.runsRoot as string) ?? join(ROOT, "experiments/runs");
    } else if (args.runsDir || args.runsRoot) {
      runsDir = (args.runsDir as string) ?? (args.runsRoot as string) ?? join(ROOT, "experiments/runs");
      const resolved = resolve(ROOT, runsDir);
      const defaultRuns = join(ROOT, "experiments/runs");
      if (resolved === defaultRuns) experimentId = "baseline-v0";
      else experimentId = basename(resolved) || "evaluation";
    } else {
      runsDir = (args.runsRoot as string) ?? (args.runsDir as string) ?? join(ROOT, "experiments/runs");
      experimentId = "baseline-v0";
    }

    await evaluateExperimentRuns({
      experimentId,
      runsDir,
      allowMismatch: Boolean(args.allowMismatch),
      allowCrossBenchmark: Boolean(args.allowCrossBenchmark),
      force: Boolean(args.force),
      pricingPath: args.pricing as string | undefined,
      keepWorkspace: Boolean(args.keepWorkspace),
      jsonOnly: Boolean(args.json),
    });
    process.exitCode = 0;
    return;
  }

  // Single evaluation
  if (!args.run && !(args.case && args.patch)) {
    console.error("Error: provide --run <runId> or --case <caseId> --patch <path> or --experiment <id>");
    printHelp();
    process.exit(1);
  }

  const evaluator = new Evaluator();
  let result: EvaluationResult;
  if (args.run) {
    const runsDirOpt = (args.runsDir ?? args.runsRoot) as string | undefined;
    result = await evaluator.evaluate({
      runId: args.run as string,
      runsDir: runsDirOpt ? resolve(ROOT, runsDirOpt) : undefined,
      allowBenchmarkMismatch: Boolean(args.allowMismatch),
      allowCrossBenchmark: Boolean(args.allowCrossBenchmark),
      pricingConfigPath: args.pricing as string | undefined,
      keepWorkspace: Boolean(args.keepWorkspace),
    });
  } else {
    const caseId = args.case as string;
    const patchPath = args.patch as string;
    if (!existsSync(patchPath)) {
      console.error(`Patch not found: ${patchPath}`);
      process.exitCode = 1;
      return;
    }
    result = await evaluator.evaluate({
      caseId,
      patchPath,
      allowBenchmarkMismatch: Boolean(args.allowMismatch),
      allowCrossBenchmark: Boolean(args.allowCrossBenchmark),
      pricingConfigPath: args.pricing as string | undefined,
      keepWorkspace: Boolean(args.keepWorkspace),
    });
  }

  const identity = await loadBenchmarkIdentity();

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printEvaluationSummary(result, identity);
    console.log(`Machine-readable: experiments/runs/${result.runId}/evaluation/result.json`);
  }

  if (result.status === "error" || result.status === "timeout") {
    process.exitCode = 2;
    return;
  }
  if (result.verdict === "verified") {
    process.exitCode = 0;
    return;
  } else {
    process.exitCode = 1;
    return;
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  // Use exitCode for bun compatibility (process.exit inside async may not propagate)
  process.exitCode = 2;
  // Also attempt immediate exit for npx/tsx
  try {
    process.exit(2);
  } catch {}
});
