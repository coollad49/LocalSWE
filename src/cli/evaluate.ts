#!/usr/bin/env tsx
/**
 * Evaluator CLI — rebuilt for baseline experiment evaluation
 * Usage:
 *   bun run evaluate -- --run <runId>
 *   bun run evaluate -- --experiment <experimentId> [--runs-dir <path>]
 *   bun run evaluate -- --runs-dir experiments/runs
 *   bun run evaluate -- --case <caseId> --patch <path>
 */

import { Evaluator } from "../evaluator/Evaluator.ts";
import { loadBenchmarkIdentity } from "../evaluator/benchmarkIdentity.ts";
import { aggregateResults, computeCaseStability } from "../evaluator/aggregation.ts";
import { computeHistoricalVsSynthetic, computeDifficultyBreakdown, computeCategoryBreakdown } from "../evaluator/breakdowns.ts";
import { buildExperimentEvaluation, generateReportMarkdown } from "../evaluator/report.ts";
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { EvaluationResult } from "../evaluator/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function printHelp(): void {
  console.log(`Frontier Verifier Evaluator

Usage:
  evaluate --run <runId> [--allow-mismatch] [--keep-workspace] [--json]
  evaluate --case <caseId> --patch <path> [--allow-mismatch] [--json]
  evaluate --experiment <experimentId> [--runs-dir <path>] [--allow-mismatch]
  evaluate --runs-dir <path> [--allow-mismatch]
  evaluate --all [--runs-dir <path>]  (deprecated alias for --runs-dir)

Options:
  --run <runId>         Evaluate a BaselineRunner run (experiments/runs/<runId>/patch.diff)
  --case <caseId>       Case ID for direct patch evaluation
  --patch <path>        Path to patch.diff
  --experiment <id>     Evaluate entire experiment, write to experiments/evaluations/<id>/
  --runs-dir <path>     Directory containing run artifacts (default: experiments/runs)
  --runs-root <path>    Alias for --runs-dir
  --allow-mismatch      Allow benchmark version/fingerprint mismatch
  --keep-workspace      Keep isolated workspace after evaluation (debug)
  --json                Output machine-readable JSON only
  --all                 Deprecated: evaluate all runs in experiments/runs/ (use --runs-dir)
  --help                Show this help

Examples:
  bun run evaluate -- --run synth-001-abc123-1234567890
  bun run evaluate -- --experiment baseline-v0
  bun run evaluate -- --experiment baseline-v0 --runs-dir experiments/runs
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
    } else if (a === "--experiment" && argv[i + 1]) out.experiment = argv[++i]!;
    else if (a === "--runs-dir" && argv[i + 1]) {
      const v = argv[++i] as string | undefined;
      if (v) out.runsDir = v;
    } else if (a === "--runs-root" && argv[i + 1]) {
      const v = argv[++i] as string | undefined;
      if (v) out.runsRoot = v;
    } else if (a === "--allow-mismatch") out.allowMismatch = true;
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
  if (result.workspace?.cleanupError) console.log(`Cleanup warning: ${result.workspace.cleanupError}`);
  console.log(``);
}

async function evaluateExperimentRuns(params: {
  experimentId: string;
  runsDir: string;
  allowMismatch: boolean;
  keepWorkspace: boolean;
  jsonOnly: boolean;
}): Promise<void> {
  const { experimentId, runsDir, allowMismatch, keepWorkspace, jsonOnly } = params;
  const resolvedRunsDir = resolve(ROOT, runsDir);
  const evaluationsRoot = join(ROOT, "experiments/evaluations", experimentId);

  let entries: string[] = [];
  try {
    const items = await readdir(resolvedRunsDir, { withFileTypes: true });
    entries = items.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (e) {
    console.error(`Cannot list runs at ${resolvedRunsDir}: ${(e as Error).message}`);
    process.exit(1);
  }

  const runIds: string[] = [];
  for (const name of entries) {
    if (existsSync(join(resolvedRunsDir, name, "patch.diff"))) runIds.push(name);
  }
  if (runIds.length === 0) {
    console.log(`No runs with patch.diff found in ${resolvedRunsDir}`);
    // Still generate empty evaluation?
    // Create empty evaluation artifacts
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
    await mkdir(evaluationsRoot, { recursive: true });
    await writeFile(join(evaluationsRoot, "evaluation.json"), JSON.stringify(evalData, null, 2), "utf-8");
    await writeFile(join(evaluationsRoot, "report.md"), generateReportMarkdown(evalData), "utf-8");
    console.log(`Empty evaluation written to ${evaluationsRoot}`);
    process.exit(0);
  }

  console.log(`Evaluating ${runIds.length} runs from ${resolvedRunsDir} for experiment ${experimentId}...`);
  const evaluator = new Evaluator();
  const results: EvaluationResult[] = [];
  const startAll = Date.now();

  for (const runId of runIds.sort()) {
    try {
      const result = await evaluator.evaluate({
        runId,
        runsDir: resolvedRunsDir,
        allowBenchmarkMismatch: allowMismatch,
        keepWorkspace,
      });
      results.push(result);
      if (!jsonOnly) {
        const identity = await loadBenchmarkIdentity();
        printEvaluationSummary(result, identity);
      }
    } catch (e) {
      console.error(`Failed to evaluate ${runId}: ${(e as Error).message}`);
      // Push error result? evaluator should have returned error result, but if thrown we count as error
    }
  }

  const identity = await loadBenchmarkIdentity();
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
  // Add elapsedMs
  (evalData.experiment as { elapsedMs?: number }).elapsedMs = Date.now() - startAll;

  // Write outputs to experiments/evaluations/<experiment-id>/
  await mkdir(evaluationsRoot, { recursive: true });
  await mkdir(join(evaluationsRoot, "cases"), { recursive: true });

  const evalJsonPath = join(evaluationsRoot, "evaluation.json");
  await writeFile(evalJsonPath, JSON.stringify(evalData, null, 2), "utf-8");

  const reportMdPath = join(evaluationsRoot, "report.md");
  const reportMd = generateReportMarkdown(evalData);
  await writeFile(reportMdPath, reportMd, "utf-8");

  // Per-run cases/<runId>.json
  for (const r of results) {
    const casePath = join(evaluationsRoot, "cases", `${r.runId}.json`);
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

  if (!jsonOnly) {
    console.log(`\nAggregated:`);
    const { formatMetrics } = await import("../evaluator/aggregation.ts");
    console.log(formatMetrics(summary));
    console.log(`\nVFR = ${summary.rates.vfr.toFixed(2)}% (${summary.byVerdict.verified}/${summary.total} total)`);
    console.log(`Reproduction = ${summary.rates.reproductionRate.toFixed(2)}%  Oracle = ${summary.rates.oracleRate.toFixed(2)}%  RegressionFree = ${summary.rates.regressionFreeRate.toFixed(2)}%`);
    console.log(`\nEvaluation written to ${evalJsonPath}`);
    console.log(`Report written to ${reportMdPath}`);
    console.log(`Per-run cases written to ${join(evaluationsRoot, "cases/")}`);
  } else {
    console.log(JSON.stringify(evalData, null, 2));
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
    // Handle --all deprecation
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
      // Derive experimentId from runsDir if not provided; default to baseline-v0 for default runs dir
      const resolved = resolve(ROOT, runsDir);
      const defaultRuns = join(ROOT, "experiments/runs");
      if (resolved === defaultRuns) experimentId = "baseline-v0";
      else experimentId = basename(resolved) || "evaluation";
    } else {
      // --all alone
      runsDir = (args.runsRoot as string) ?? (args.runsDir as string) ?? join(ROOT, "experiments/runs");
      experimentId = "baseline-v0";
    }

    await evaluateExperimentRuns({
      experimentId,
      runsDir,
      allowMismatch: Boolean(args.allowMismatch),
      keepWorkspace: Boolean(args.keepWorkspace),
      jsonOnly: Boolean(args.json),
    });
    process.exit(0);
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
    // Single run may need runsDir if custom? For now default; but allow passing via --runs-dir for single too
    const runsDirOpt = (args.runsDir ?? args.runsRoot) as string | undefined;
    result = await evaluator.evaluate({
      runId: args.run as string,
      runsDir: runsDirOpt ? resolve(ROOT, runsDirOpt) : undefined,
      allowBenchmarkMismatch: Boolean(args.allowMismatch),
      keepWorkspace: Boolean(args.keepWorkspace),
    });
  } else {
    const caseId = args.case as string;
    const patchPath = args.patch as string;
    if (!existsSync(patchPath)) {
      console.error(`Patch not found: ${patchPath}`);
      process.exit(1);
    }
    result = await evaluator.evaluate({
      caseId,
      patchPath,
      allowBenchmarkMismatch: Boolean(args.allowMismatch),
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

  if (result.status === "error" || result.status === "timeout") process.exit(2);
  if (result.verdict === "verified") process.exit(0);
  else process.exit(1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
