#!/usr/bin/env tsx
/**
 * Evaluator CLI
 * Usage:
 *   bun run evaluate -- --run <runId>
 *   npx tsx src/cli/evaluate.ts --run <runId>
 *   bun run evaluate -- --case hist-001 --patch path/to/patch.diff
 *   npx tsx src/cli/evaluate.ts --case synth-001 --patch patch.diff
 *
 * Also supports:
 *   --allow-mismatch   — allow benchmark version/fingerprint mismatch
 *   --keep-workspace   — keep temp dir for debugging
 *   --json             — output JSON only
 */

import { Evaluator } from "../evaluator/Evaluator.ts";
import { loadBenchmarkIdentity } from "../evaluator/benchmarkIdentity.ts";
import { aggregateResults, formatMetrics } from "../evaluator/aggregation.ts";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EvaluationResult } from "../evaluator/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function printHelp(): void {
  console.log(`Frontier Verifier Evaluator

Usage:
  evaluate --run <runId> [--allow-mismatch] [--keep-workspace] [--json]
  evaluate --case <caseId> --patch <path> [--allow-mismatch] [--json]
  evaluate --all [--runs-root <path>] [--allow-mismatch]

Options:
  --run <runId>         Evaluate a BaselineRunner run (experiments/runs/<runId>/patch.diff)
  --case <caseId>       Case ID for direct patch evaluation
  --patch <path>        Path to patch.diff
  --allow-mismatch      Allow benchmark version/fingerprint mismatch
  --keep-workspace      Keep isolated workspace after evaluation (debug)
  --json                Output machine-readable JSON only
  --all                 Evaluate all runs in experiments/runs/
  --help                Show this help

Examples:
  bun run evaluate -- --run synth-001-abc123-1234567890
  bun run evaluate -- --case hist-001 --patch ./patch.diff
  npm run evaluate -- --run hist-001-run-001-abc123
`);
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--run" && argv[i + 1]) out.run = argv[++i]!;
    else if (a === "--case" && argv[i + 1]) out.case = argv[++i]!;
    else if (a === "--patch" && argv[i + 1]) { const v = argv[++i] as string | undefined; if (v) out.patch = v; }
    else if (a === "--allow-mismatch") out.allowMismatch = true;
    else if (a === "--keep-workspace") out.keepWorkspace = true;
    else if (a === "--json") out.json = true;
    else if (a === "--all") out.all = true;
    else if (a === "--runs-root" && argv[i + 1]) { const v = argv[++i] as string | undefined; if (v) out.runsRoot = v; }
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const evaluator = new Evaluator();

  // --all mode
  if (args.all) {
    const runsRoot = (args.runsRoot as string) ?? join(ROOT, "experiments/runs");
    let entries: string[] = [];
    try {
      const items = await readdir(runsRoot, { withFileTypes: true });
      entries = items.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch (e) {
      console.error(`Cannot list runs at ${runsRoot}: ${(e as Error).message}`);
      process.exit(1);
    }
    // Filter to those with patch.diff
    const runIds: string[] = [];
    for (const name of entries) {
      if (existsSync(join(runsRoot, name, "patch.diff"))) runIds.push(name);
    }
    if (runIds.length === 0) {
      console.log(`No runs with patch.diff found in ${runsRoot}`);
      process.exit(0);
    }
    console.log(`Evaluating ${runIds.length} runs from ${runsRoot}...`);
    const results: EvaluationResult[] = [];
    for (const runId of runIds.sort()) {
      try {
        const result = await evaluator.evaluate({
          runId,
          allowBenchmarkMismatch: Boolean(args.allowMismatch),
          keepWorkspace: Boolean(args.keepWorkspace),
        });
        results.push(result);
        if (!args.json) {
          const identity = await loadBenchmarkIdentity();
          printEvaluationSummary(result, identity);
        }
      } catch (e) {
        console.error(`Failed to evaluate ${runId}: ${(e as Error).message}`);
      }
    }
    const metrics = aggregateResults(results);
    if (!args.json) {
      console.log(`\nAggregated:`);
      console.log(formatMetrics(metrics));
      console.log(`\nVFR = ${metrics.rates.vfr.toFixed(1)}% (${metrics.byVerdict.verified}/${metrics.completed} completed)`);
    } else {
      console.log(JSON.stringify({ results, metrics }, null, 2));
    }
    // Write aggregated report
    try {
      const reportPath = join(ROOT, "experiments/runs", `evaluation-report-${Date.now()}.json`);
      const { writeFile } = await import("node:fs/promises");
      await writeFile(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), total: results.length, metrics, results }, null, 2), "utf-8");
      if (!args.json) console.log(`Report written to ${reportPath}`);
    } catch {}
    process.exit(0);
  }

  // Single evaluation
  if (!args.run && !(args.case && args.patch)) {
    console.error("Error: provide --run <runId> or --case <caseId> --patch <path>");
    printHelp();
    process.exit(1);
  }

  let result: EvaluationResult;
  if (args.run) {
    result = await evaluator.evaluate({
      runId: args.run as string,
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
    // Also print JSON path
    console.log(`Machine-readable: experiments/runs/${result.runId}/evaluation/result.json`);
  }

  // Exit code: 0 if verified, 1 otherwise (but 2 for infrastructure error)
  if (result.status === "error" || result.status === "timeout") process.exit(2);
  if (result.verdict === "verified") process.exit(0);
  else process.exit(1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
