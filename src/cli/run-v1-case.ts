#!/usr/bin/env tsx
/**
 * CLI: Run Agent V1 for a single case.
 * Usage:
 *   bun run v1:run:case -- hist-001
 *   V1_MOCK=1 bun run v1:run:case -- synth-001
 *   npx tsx src/cli/run-v1-case.ts synth-001 --mock
 */
import { loadV1Config } from "../v1/config/V1Config.ts";
import { V1Runner } from "../v1/runner/V1Runner.ts";
import { CaseLoader } from "../runner/CaseLoader.ts";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const caseId = args.find((a) => !a.startsWith("-")) ?? args[0];
  if (!caseId) {
    console.error("Usage: run-v1-case <caseId> [--mock] [--keep-workspace] [--max-iterations N]");
    console.error("Available cases:", (await CaseLoader.listCases()).join(", "));
    process.exit(1);
  }

  const useMock = args.includes("--mock") || process.env.V1_MOCK === "1" || process.env.BASELINE_MOCK === "1";
  if (useMock) {
    process.env.V1_MOCK = "1";
    process.env.BASELINE_MOCK = "1";
  }

  const keepWorkspace = args.includes("--keep-workspace");
  if (!args.includes("--quiet")) process.env.V1_LIVE_PROGRESS = "1";

  let maxIterations: number | undefined;
  const miIdx = args.indexOf("--max-iterations");
  if (miIdx !== -1 && args[miIdx + 1]) {
    const n = Number.parseInt(args[miIdx + 1]!, 10);
    if (!Number.isNaN(n)) maxIterations = n;
  }

  const config = await loadV1Config({
    overrides: {
      ...(useMock ? { model: "mock" } : {}),
      ...(maxIterations ? { maxIterations } : {}),
    },
  });

  const fingerprint = await V1Runner.getFingerprint();
  if (fingerprint) config.benchmarkFingerprint = fingerprint;

  console.log(`Agent V1 — running case ${caseId}`);
  console.log(`  agent: ${config.agentRuntime} ${config.piVersion} (${config.agentVersion})`);
  console.log(`  model: ${config.model} (${config.thinkingLevel})`);
  console.log(`  benchmark: ${config.benchmarkVersion} ${fingerprint ?? ""}`);
  console.log(`  timeout: ${config.agentTimeoutMs}ms`);
  console.log(`  maxIterations: ${config.maxIterations}`);
  console.log(`  mock: ${useMock ? "yes" : "no"}`);

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const ROOT = resolve(__dirname, "../..");
  const runsRoot = useMock ? join(ROOT, "experiments/runs/mock-v1") : undefined;
  const runner = new V1Runner(config, runsRoot);
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

  try {
    const metaPath = join(runsRoot ?? join(ROOT, "experiments/runs"), result.runId, "metadata.json");
    const { readFile } = await import("node:fs/promises");
    const metaRaw = await readFile(metaPath, "utf-8");
    const meta = JSON.parse(metaRaw) as { v1?: { iterationCount?: number; evidenceCount?: number; phaseTransitions?: unknown[] } };
    if (meta.v1) {
      console.log(`  v1 iterations: ${meta.v1.iterationCount}`);
      console.log(`  v1 evidence: ${meta.v1.evidenceCount}`);
      console.log(`  v1 phases: ${JSON.stringify(meta.v1.phaseTransitions?.map((p: unknown) => (p as { to: string }).to))}`);
    }
  } catch {}

  process.exit(result.status === "error" || result.status === "timeout" ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
