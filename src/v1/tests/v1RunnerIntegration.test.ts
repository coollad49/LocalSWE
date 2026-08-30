import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadV1Config } from "../config/V1Config.ts";
import { V1Runner } from "../runner/V1Runner.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

describe("V1Runner integration (mock)", () => {
  it("runs mock case and produces evidence, phases, and hygiene-clean patch", async () => {
    const config = await loadV1Config({ overrides: { model: "mock", maxIterations: 5, agentTimeoutMs: 60000 } });
    config.benchmarkFingerprint = await V1Runner.getFingerprint();
    const runsRoot = join(ROOT, `experiments/runs/mock-v1-test-${Date.now()}`);
    const runner = new V1Runner(config, runsRoot);
    const result = await runner.runCase({ caseId: "synth-001", config, runsRoot });
    expect(result.status).toBe("success");
    expect(result.patchPath).toBeDefined();
    expect(existsSync(result.patchPath!)).toBe(true);
    const patch = readFileSync(result.patchPath!, "utf-8");
    // Patch hygiene: scratch files like repro.js must not appear
    expect(patch).not.toContain("repro.js");
    expect(patch).not.toContain(".v1/");
    // changedFiles should not contain scratch
    expect(result.changedFiles.some((f) => f.includes("repro.js"))).toBe(false);
    expect(result.changedFiles.some((f) => f.startsWith(".v1"))).toBe(false);

    // Telemetry checks
    const metaPath = join(runsRoot, result.runId, "metadata.json");
    expect(existsSync(metaPath)).toBe(true);
    const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as {
      v1: {
        phaseTransitions: Array<{ from: string; to: string }>;
        phaseDurations: Array<{ phase: string }>;
        iterationCount: number;
        maxIterations: number;
        evidenceCount: number;
        hypotheses: unknown[];
        filesChanged: string[];
        commandCount: number;
        fileCount: number;
        toolCallCount?: number;
      };
    };
    expect(meta.v1).toBeDefined();
    expect(meta.v1.maxIterations).toBe(5);
    expect(meta.v1.iterationCount).toBeGreaterThanOrEqual(0);
    expect(meta.v1.evidenceCount).toBeGreaterThan(0);
    expect(Array.isArray(meta.v1.hypotheses)).toBe(true);
    expect(meta.v1.hypotheses.length).toBeGreaterThan(0);
    expect(meta.v1.phaseTransitions.length).toBeGreaterThan(1);
    expect(meta.v1.phaseDurations.length).toBeGreaterThan(1);
    // Phase order includes reconnaissance → diagnosis → ... → finalization
    const phases = meta.v1.phaseTransitions.map((p) => p.to);
    expect(phases).toContain("diagnosis");
    expect(phases).toContain("finalization");

    // Evidence file exists
    const evidencePath = join(runsRoot, result.runId, "evidence.jsonl");
    expect(existsSync(evidencePath)).toBe(true);
    const v1StatePath = join(runsRoot, result.runId, "v1-state.json");
    expect(existsSync(v1StatePath)).toBe(true);

    // Trajectory exists
    expect(existsSync(join(runsRoot, result.runId, "trajectory.jsonl"))).toBe(true);

    // Workspace isolation: canonical repo untouched
    const canonicalTaskPath = join(ROOT, "benchmark/repositories/task-manager/src/task-manager.ts");
    const canonicalContent = readFileSync(canonicalTaskPath, "utf-8");
    expect(canonicalContent).not.toContain("v1 mock edit");

    // Cleanup
    rmSync(runsRoot, { recursive: true, force: true });
  }, 30000);

  it("iteration budget is observable and bounded (maxIterations=2)", async () => {
    const config = await loadV1Config({ overrides: { model: "mock", maxIterations: 2 } });
    const runsRoot = join(ROOT, `experiments/runs/mock-v1-bounded-${Date.now()}`);
    const runner = new V1Runner(config, runsRoot);
    const result = await runner.runCase({ caseId: "synth-002", config, runsRoot });
    expect(result.status).toBe("success");
    const meta = JSON.parse(readFileSync(join(runsRoot, result.runId, "metadata.json"), "utf-8")) as {
      v1: { maxIterations: number; iterationCount: number };
    };
    expect(meta.v1.maxIterations).toBe(2);
    expect(meta.v1.iterationCount).toBeLessThanOrEqual(2);
    rmSync(runsRoot, { recursive: true, force: true });
  }, 30000);

  it("workspace does not leak private/oracle", async () => {
    const config = await loadV1Config({ overrides: { model: "mock" } });
    const runsRoot = join(ROOT, `experiments/runs/mock-v1-leak-${Date.now()}`);
    const runner = new V1Runner(config, runsRoot);
    // Use keepWorkspace to inspect
    const result = await runner.runCase({ caseId: "hist-001", config, runsRoot });
    expect(result.status).toBe("success");
    // Check trajectory does not contain private paths
    const traj = readFileSync(join(runsRoot, result.runId, "trajectory.jsonl"), "utf-8");
    expect(traj).not.toContain("private/oracle.test.ts");
    expect(traj).not.toContain("provenance.md");
    // Check no hard-coded reproduce leak via artifacts
    const evidence = readFileSync(join(runsRoot, result.runId, "evidence.jsonl"), "utf-8");
    expect(evidence).not.toContain("private/oracle");
    rmSync(runsRoot, { recursive: true, force: true });
  }, 30000);

  it("finalization requires diff_inspection evidence", async () => {
    const config = await loadV1Config({ overrides: { model: "mock" } });
    const runsRoot = join(ROOT, `experiments/runs/mock-v1-final-${Date.now()}`);
    const runner = new V1Runner(config, runsRoot);
    const result = await runner.runCase({ caseId: "synth-003", config, runsRoot });
    const meta = JSON.parse(readFileSync(join(runsRoot, result.runId, "metadata.json"), "utf-8")) as {
      v1: { evidenceCount: number };
    };
    // Ensure evidence includes diff_inspection via v1-state
    const v1State = JSON.parse(readFileSync(join(runsRoot, result.runId, "v1-state.json"), "utf-8")) as {
      evidence: Array<{ type: string; phase: string }>;
    };
    expect(v1State.evidence.some((e) => e.type === "diff_inspection" && e.phase === "finalization")).toBe(true);
    rmSync(runsRoot, { recursive: true, force: true });
  }, 30000);
});
