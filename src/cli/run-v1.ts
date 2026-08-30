#!/usr/bin/env tsx
/**
 * CLI: Run Agent V1 across benchmark.
 * Usage:
 *   bun run v1:run -- --mock --runs 1 --concurrency 1
 *   V1_MOCK=1 npx tsx src/cli/run-v1.ts --runs 1
 */
import { loadV1Config } from "../v1/config/V1Config.ts";
import { V1Runner } from "../v1/runner/V1Runner.ts";
import { CaseLoader } from "../runner/CaseLoader.ts";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeJsonFile } from "../utils/fs.ts";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const useMock = args.includes("--mock") || process.env.V1_MOCK === "1" || process.env.BASELINE_MOCK === "1";
  if (useMock) {
    process.env.V1_MOCK = "1";
    process.env.BASELINE_MOCK = "1";
  }

  const runsPerCaseIdx = args.indexOf("--runs");
  const runsPerCase = runsPerCaseIdx !== -1 && args[runsPerCaseIdx + 1] ? Number.parseInt(args[runsPerCaseIdx + 1]!, 10) : 1;
  const concurrencyIdx = args.indexOf("--concurrency");
  const concurrency = concurrencyIdx !== -1 && args[concurrencyIdx + 1] ? Number.parseInt(args[concurrencyIdx + 1]!, 10) : 1;
  const miIdx = args.indexOf("--max-iterations");
  let maxIterations: number | undefined;
  if (miIdx !== -1 && args[miIdx + 1]) {
    const n = Number.parseInt(args[miIdx + 1]!, 10);
    if (!Number.isNaN(n)) maxIterations = n;
  }

  const casesIdx = args.indexOf("--cases");
  let caseIds: string[] | undefined;
  if (casesIdx !== -1 && args[casesIdx + 1]) {
    caseIds = args[casesIdx + 1]!.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    // Also support positional case list e.g. -- synth-001,synth-002
    const positionalCases = args.filter((a) => !a.startsWith("-") && a.includes("-"));
    if (positionalCases.length > 0 && positionalCases[0] !== args[0]) {
      // already handled by positional? keep
    }
  }
  // Filter out known flags values from case detection
  const possibleCases = args.filter((a) => !a.startsWith("-") && /^(hist|synth|hard)-[0-9]{3}$/.test(a));
  if (possibleCases.length > 0) caseIds = possibleCases;

  const config = await loadV1Config({
    overrides: {
      ...(useMock ? { model: "mock" } : {}),
      ...(maxIterations ? { maxIterations } : {}),
      runsPerCase,
    },
  });
  const fingerprint = await V1Runner.getFingerprint();
  if (fingerprint) config.benchmarkFingerprint = fingerprint;

  console.log(`Agent V1 — running benchmark`);
  console.log(`  agent: ${config.agentRuntime} ${config.piVersion} (${config.agentVersion})`);
  console.log(`  model: ${config.model} (${config.thinkingLevel})`);
  console.log(`  benchmark: ${config.benchmarkVersion} ${fingerprint ?? ""}`);
  console.log(`  maxIterations: ${config.maxIterations}`);
  console.log(`  runsPerCase: ${runsPerCase}, concurrency: ${concurrency}, mock: ${useMock ? "yes" : "no"}`);
  if (caseIds) console.log(`  cases: ${caseIds.join(", ")}`);

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const ROOT = resolve(__dirname, "../..");
  const runsRoot = useMock ? join(ROOT, "experiments/runs/mock-v1") : undefined;
  const runner = new V1Runner(config, runsRoot);

  const allCases = caseIds ?? (await CaseLoader.listCases());
  const results = await runner.runV1({ caseIds: allCases, config, concurrency, runsPerCase, runsRoot });

  const byStatus: Record<string, number> = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  console.log(`\n=== Summary (${results.length} runs) ===`);
  for (const [k, v] of Object.entries(byStatus)) console.log(`  ${k}: ${v}`);

  const reportPath = join(runsRoot ?? join(ROOT, "experiments/runs"), `v1-report-${Date.now()}.json`);
  await writeJsonFile(reportPath, {
    timestamp: new Date().toISOString(),
    config,
    fingerprint,
    total: results.length,
    byStatus,
    results: results.map((r) => ({ runId: r.runId, caseId: r.caseId, status: r.status, changedFiles: r.changedFiles, durationMs: r.durationMs, error: r.error })),
  });
  console.log(`Report: ${reportPath}`);

  const hasError = results.some((r) => r.status === "error" || r.status === "timeout");
  process.exit(hasError ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
