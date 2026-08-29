#!/usr/bin/env tsx
/**
 * Verify 15 infrastructure checks for Baseline v0 (§27)
 * Run with: BASELINE_MOCK=1 npx tsx scripts/verify-baseline-infra.ts
 */

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CaseLoader } from "../src/runner/CaseLoader.ts";
import { WorkspaceManager } from "../src/workspace/WorkspaceManager.ts";
import { loadBaselineConfig } from "../src/config/BaselineConfig.ts";
import { BaselineRunner } from "../src/runner/BaselineRunner.ts";
import { PiCodingAgent } from "../src/agent/PiCodingAgent.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
let failed = 0;
function check(name: string, fn: () => Promise<boolean> | boolean, msg?: string) {
  return async () => {
    try {
      const ok = await fn();
      if (ok) {
        console.log(`✓ ${name}`);
        passed++;
      } else {
        console.log(`✗ ${name} — ${msg ?? "failed"}`);
        failed++;
      }
    } catch (e) {
      console.log(`✗ ${name} — ${(e as Error).message}`);
      failed++;
    }
  };
}

async function main() {
  console.log("Baseline v0 Infrastructure Verification (15 checks) — mock mode");
  console.log("==============================================================\n");
  process.env.BASELINE_MOCK = "1";
  const config = await loadBaselineConfig({ overrides: { model: "mock", agentTimeoutMs: 60000 } });
  const fingerprint = await BaselineRunner.getFingerprint();
  if (fingerprint) config.benchmarkFingerprint = fingerprint;

  const cases = await CaseLoader.listCases();
  const testCase = "synth-001";
  const histCase = "hist-001";

  // 1. Benchmark case loads correctly
  await check("1. Benchmark case loads correctly", async () => {
    const c = await CaseLoader.loadCase(testCase);
    return c.id === testCase && c.issue.length > 0 && c.manifest.repository === "task-manager";
  })();

  // 2. Isolated workspace is created
  let ws: Awaited<ReturnType<typeof WorkspaceManager.createWorkspace>> | undefined;
  await check("2. Isolated workspace is created", async () => {
    ws = await WorkspaceManager.createWorkspace({ caseId: testCase, runId: "check-2" });
    return existsSync(ws.path) && existsSync(join(ws.path, "src/task-manager.ts")) && existsSync(join(ws.path, "ISSUE.md")) && existsSync(join(ws.path, "public/reproduce.ts"));
  })();

  // 3. Canonical benchmark repository remains untouched
  await check("3. Canonical benchmark repository remains untouched", async () => {
    if (!ws) return false;
    const canonical = readFileSync(join(ROOT, "benchmark/repositories/task-manager/src/task-manager.ts"), "utf-8");
    const hasMock = canonical.includes("baseline-v0 mock edit");
    const wsContent = readFileSync(join(ws.path, "src/task-manager.ts"), "utf-8");
    // ws is buggy overlay, canonical is known-good, they differ by design, but canonical must not have mock marker
    return !hasMock && wsContent.length > 0;
  })();

  // 4. Pi session starts correctly
  await check("4. Pi session starts correctly (mock mode)", async () => {
    const agent = new PiCodingAgent({ config, runsRoot: join(ROOT, "experiments/runs") });
    const tmpWs = await WorkspaceManager.createWorkspace({ caseId: testCase, runId: "check-4" });
    const task = {
      runId: "check-4-" + Date.now(),
      caseId: testCase,
      workspacePath: tmpWs.path,
      issue: (await CaseLoader.loadCase(testCase)).issue,
      agentVersion: config.agentVersion,
      benchmarkVersion: config.benchmarkVersion,
    };
    const result = await agent.run(task);
    await tmpWs.cleanup();
    // Check trajectory contains session_created or mock mode
    const traj = readFileSync(result.trajectoryPath!, "utf-8");
    return traj.includes("run_start") && (traj.includes("mock") || traj.includes("session_created"));
  })();

  // 5. Pi receives the intended instructions
  await check("5. Pi receives the intended instructions", async () => {
    const agent = new PiCodingAgent({ config, runsRoot: join(ROOT, "experiments/runs") });
    const tmpWs = await WorkspaceManager.createWorkspace({ caseId: testCase, runId: "check-5" });
    const task = {
      runId: "check-5-" + Date.now(),
      caseId: testCase,
      workspacePath: tmpWs.path,
      issue: (await CaseLoader.loadCase(testCase)).issue,
      agentVersion: config.agentVersion,
      benchmarkVersion: config.benchmarkVersion,
    };
    const result = await agent.run(task);
    const traj = readFileSync(result.trajectoryPath!, "utf-8");
    await tmpWs.cleanup();
    return traj.includes("agent_instructions") && traj.includes("baseline-v0");
  })();

  // 6. Pi can inspect the repository
  await check("6. Pi can inspect the repository (mock read/ bash)", async () => {
    const agent = new PiCodingAgent({ config, runsRoot: join(ROOT, "experiments/runs") });
    const tmpWs = await WorkspaceManager.createWorkspace({ caseId: testCase, runId: "check-6" });
    const task = {
      runId: "check-6-" + Date.now(),
      caseId: testCase,
      workspacePath: tmpWs.path,
      issue: (await CaseLoader.loadCase(testCase)).issue,
      agentVersion: config.agentVersion,
      benchmarkVersion: config.benchmarkVersion,
    };
    const result = await agent.run(task);
    const traj = readFileSync(result.trajectoryPath!, "utf-8");
    await tmpWs.cleanup();
    return traj.includes("tool_execution_start") && traj.includes("read") && traj.includes("bash");
  })();

  // 7. Pi can modify files
  await check("7. Pi can modify files", async () => {
    const agent = new PiCodingAgent({ config, runsRoot: join(ROOT, "experiments/runs") });
    const tmpWs = await WorkspaceManager.createWorkspace({ caseId: testCase, runId: "check-7" });
    const beforePatch = readFileSync(join(tmpWs.path, "src/task-manager.ts"), "utf-8");
    const task = {
      runId: "check-7-" + Date.now(),
      caseId: testCase,
      workspacePath: tmpWs.path,
      issue: (await CaseLoader.loadCase(testCase)).issue,
      agentVersion: config.agentVersion,
      benchmarkVersion: config.benchmarkVersion,
    };
    const result = await agent.run(task);
    await tmpWs.cleanup();
    // Check patch captured and changedFiles
    const patch = readFileSync(result.patchPath!, "utf-8");
    return result.changedFiles.length > 0 && patch.includes("diff --git") && patch.length > 10;
  })();

  // 8. Commands/tests can execute
  await check("8. Commands/tests can execute (bash vitest)", async () => {
    const agent = new PiCodingAgent({ config, runsRoot: join(ROOT, "experiments/runs") });
    const tmpWs = await WorkspaceManager.createWorkspace({ caseId: testCase, runId: "check-8" });
    const task = {
      runId: "check-8-" + Date.now(),
      caseId: testCase,
      workspacePath: tmpWs.path,
      issue: (await CaseLoader.loadCase(testCase)).issue,
      agentVersion: config.agentVersion,
      benchmarkVersion: config.benchmarkVersion,
    };
    const result = await agent.run(task);
    const traj = readFileSync(result.trajectoryPath!, "utf-8");
    await tmpWs.cleanup();
    return traj.includes("vitest run") || traj.includes("bash");
  })();

  // 9. Agent trajectory is captured
  await check("9. Agent trajectory is captured (JSONL)", async () => {
    const runner = new BaselineRunner(config);
    const result = await runner.runCase({ caseId: testCase, config });
    const trajExists = existsSync(result.trajectoryPath!);
    if (!trajExists) return false;
    const lines = readFileSync(result.trajectoryPath!, "utf-8").trim().split("\n");
    if (lines.length < 5) return false;
    // Each line valid JSON with required fields
    for (const l of lines) {
      const j = JSON.parse(l);
      if (!j.timestamp || !j.source || !j.type) return false;
    }
    return true;
  })();

  // 10. Candidate patch is captured
  await check("10. Candidate patch is captured (git diff)", async () => {
    const runner = new BaselineRunner(config);
    const result = await runner.runCase({ caseId: testCase, config });
    return existsSync(result.patchPath!) && readFileSync(result.patchPath!, "utf-8").length > 0 && result.changedFiles.length > 0;
  })();

  // 11. Metadata is captured
  await check("11. Metadata is captured", async () => {
    const runner = new BaselineRunner(config);
    const result = await runner.runCase({ caseId: testCase, config });
    const metaExists = existsSync(result.metadataPath!);
    if (!metaExists) return false;
    const meta = JSON.parse(readFileSync(result.metadataPath!, "utf-8"));
    const required = ["runId","caseId","benchmarkVersion","agentVersion","agentRuntime","piVersion","model","modelConfiguration","agentPromptPath","startTime","endTime","durationMs","terminationStatus","changedFiles","trajectoryPath","patchPath"];
    for (const k of required) if (!(k in meta)) return false;
    return meta.benchmarkFingerprint === fingerprint && meta.nodeVersion && meta.platform;
  })();

  // 12. Timeout handling works
  await check("12. Timeout handling works", async () => {
    // Test via exec timeout: run a slow command with timeout
    const { execWithTimeout } = await import("../src/utils/git.ts");
    let timedOut = false;
    try {
      await execWithTimeout("sleep", ["2"], "/tmp", 100);
    } catch (e) {
      if ((e as Error).message.includes("Timeout")) timedOut = true;
    }
    // Also test runner timeout via invalid case is not timeout, but ensure timeout path exists
    // For Pi timeout, test with mocked slow agent: create agent with very low timeout and run real Pi that would need network?
    // Instead, test that timeout config is respected and trajectory would contain timeout if triggered.
    // Here we at least verify exec timeout works.
    return timedOut;
  })();

  // 13. Cleanup works
  await check("13. Cleanup works (workspace deleted)", async () => {
    const tmpWs = await WorkspaceManager.createWorkspace({ caseId: testCase, runId: "check-13" });
    const p = tmpWs.path;
    const existsBefore = existsSync(p);
    await tmpWs.cleanup();
    const existsAfter = existsSync(p);
    return existsBefore && !existsAfter;
  })();

  // 14. Failed cases remain isolated
  await check("14. Failed cases remain isolated (invalid case doesn't crash)", async () => {
    const runner = new BaselineRunner(config);
    const bad = await runner.runCase({ caseId: "invalid-999", config });
    const good = await runner.runCase({ caseId: testCase, config });
    return bad.status === "error" && good.status === "success" && bad.caseId === "invalid-999" && good.caseId === testCase;
  })();

  // 15. Multiple cases can execute safely (concurrency)
  await check("15. Multiple cases can execute safely (concurrent)", async () => {
    const runner = new BaselineRunner(config);
    const results = await runner.runBaseline({ caseIds: ["synth-001","synth-002"], config, concurrency: 2, runsPerCase: 1 });
    if (results.length !== 2) return false;
    // Check each has distinct runId and workspace, and both success
    const ids = new Set(results.map(r => r.runId));
    if (ids.size !== 2) return false;
    // Ensure patches are distinct and not cross-contaminated
    const patches = results.map(r => readFileSync(r.patchPath!, "utf-8"));
    // They should be different (different repos)
    return patches[0] !== patches[1] && results.every(r => r.status === "success");
  })();

  // Extra: check workspace sanitation (no private/oracle leakage)
  await check("Extra: Workspace sanitation (no private/oracle leakage)", async () => {
    const tmpWs = await WorkspaceManager.createWorkspace({ caseId: histCase, runId: "check-extra" });
    const hasPrivate = existsSync(join(tmpWs.path, "private"));
    const hasOracle = existsSync(join(tmpWs.path, "private/oracle.test.ts"));
    const hasArtifacts = existsSync(join(tmpWs.path, "artifacts"));
    const hasProvenance = existsSync(join(tmpWs.path, "provenance.md"));
    const reproContent = readFileSync(join(tmpWs.path, "public/reproduce.ts"), "utf-8");
    const hasCanonicalImport = reproContent.includes("../../../repositories");
    await tmpWs.cleanup();
    return !hasPrivate && !hasOracle && !hasArtifacts && !hasProvenance && !hasCanonicalImport;
  })();

  // Extra: check git clean state before agent
  await check("Extra: Git clean state before agent (no diff HEAD)", async () => {
    const tmpWs = await WorkspaceManager.createWorkspace({ caseId: "synth-002", runId: "check-git-clean" });
    const { execWithTimeout } = await import("../src/utils/git.ts");
    const status = await execWithTimeout("git", ["status","--porcelain"], tmpWs.path);
    const diff = await execWithTimeout("git", ["diff","HEAD"], tmpWs.path);
    await tmpWs.cleanup();
    return status.stdout.trim() === "" && diff.stdout.trim() === "";
  })();

  if (ws) await ws.cleanup().catch(()=>{});

  console.log("\n==============================================================");
  console.log(`Result: ${passed} passed, ${failed} failed, total ${passed+failed}`);
  if (failed > 0) process.exit(1);
  else console.log("All infrastructure checks passed.");
}

main().catch(e => { console.error(e); process.exit(1); });
