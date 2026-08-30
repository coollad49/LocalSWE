import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkflowEngine, InvalidTransitionError, GateFailedError } from "../workflow/WorkflowEngine.ts";
import { EvidenceStore } from "../workflow/EvidenceStore.ts";

function makeEngine(opts?: { maxIterations?: number; workspacePath?: string }) {
  const dir = opts?.workspacePath ?? mkdtempSync(join(tmpdir(), "v1-wf-test-"));
  const store = new EvidenceStore(); // in-memory to avoid dangling file handles in unit tests
  const engine = new WorkflowEngine({
    issue: "Test issue: fix the bug",
    maxIterations: opts?.maxIterations ?? 5,
    workspacePath: dir,
    evidenceStore: store,
    stateFilePath: join(dir, ".v1/state.json"),
  });
  return { engine, dir, store };
}

describe("WorkflowEngine - phase transitions", () => {
  it("starts at reconnaissance", () => {
    const { engine, dir } = makeEngine();
    expect(engine.getPhase()).toBe("reconnaissance");
    rmSync(dir, { recursive: true, force: true });
  });

  it("allows valid transition reconnaissance -> diagnosis after gate satisfied", async () => {
    const { engine, dir } = makeEngine();
    // Satisfy recon gate
    engine.recordFileInspected("package.json");
    engine.recordEvidence({ type: "command_result", description: "ls", source: "ls", phase: "reconnaissance" });
    engine.recordCommandExecution({ command: "ls -la", exitCode: 0, stdout: "", stderr: "", durationMs: 10, phase: "reconnaissance", timestamp: new Date().toISOString() });
    await engine.transitionTo("diagnosis");
    expect(engine.getPhase()).toBe("diagnosis");
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects invalid transition reconnaissance -> implementation", async () => {
    const { engine, dir } = makeEngine();
    await expect(engine.transitionTo("implementation")).rejects.toBeInstanceOf(InvalidTransitionError);
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects transition when gate fails", async () => {
    const { engine, dir } = makeEngine();
    // No evidence — recon gate should fail
    await expect(engine.transitionTo("diagnosis")).rejects.toBeInstanceOf(GateFailedError);
    rmSync(dir, { recursive: true, force: true });
  });

  it("allows diagnosis -> investigation after hypothesis", async () => {
    const { engine, dir } = makeEngine();
    engine.recordFileInspected("package.json");
    engine.recordEvidence({ type: "command_result", description: "ls", source: "ls", phase: "reconnaissance" });
    engine.recordCommandExecution({ command: "ls", exitCode: 0, stdout: "", stderr: "", durationMs: 1, phase: "reconnaissance", timestamp: new Date().toISOString() });
    await engine.transitionTo("diagnosis");
    const h = engine.addHypothesis({ description: "Hypo 1", evidence: ["evidence1"], confidence: 0.8 });
    engine.recordEvidence({ type: "other", description: "diagnosis evidence", source: "hypo", phase: "diagnosis" });
    await engine.transitionTo("investigation");
    expect(engine.getPhase()).toBe("investigation");
    expect(h.id).toBeDefined();
    rmSync(dir, { recursive: true, force: true });
  });

  it("investigation may loop back to diagnosis", async () => {
    const { engine, dir } = makeEngine();
    // Fast-forward to investigation
    engine.recordFileInspected("a.ts");
    engine.recordEvidence({ type: "command_result", description: "x", source: "x", phase: "reconnaissance" });
    engine.recordCommandExecution({ command: "ls", exitCode: 0, stdout: "", stderr: "", durationMs: 1, phase: "reconnaissance", timestamp: new Date().toISOString() });
    await engine.transitionTo("diagnosis");
    engine.addHypothesis({ description: "h", evidence: ["e"], confidence: 0.5 });
    engine.recordEvidence({ type: "other", description: "e", source: "s", phase: "diagnosis" });
    await engine.transitionTo("investigation");
    engine.recordEvidence({ type: "command_result", description: "inv", source: "bash", phase: "investigation" });
    engine.recordCommandExecution({ command: "grep", exitCode: 0, stdout: "", stderr: "", durationMs: 1, phase: "investigation", timestamp: new Date().toISOString() });
    await engine.transitionTo("diagnosis");
    expect(engine.getPhase()).toBe("diagnosis");
    rmSync(dir, { recursive: true, force: true });
  });

  it("verification failure may loop back to investigation/implementation", async () => {
    const { engine, dir } = makeEngine({ maxIterations: 2 });
    // Build to verification
    engine.recordFileInspected("a.ts");
    engine.recordEvidence({ type: "command_result", description: "x", source: "x", phase: "reconnaissance" });
    engine.recordCommandExecution({ command: "ls", exitCode: 0, stdout: "", stderr: "", durationMs: 1, phase: "reconnaissance", timestamp: new Date().toISOString() });
    await engine.transitionTo("diagnosis");
    const h = engine.addHypothesis({ description: "h", evidence: ["e"], confidence: 0.8 });
    engine.updateHypothesis(h.id, { status: "selected" });
    engine.recordEvidence({ type: "other", description: "e", source: "s", phase: "diagnosis" });
    await engine.transitionTo("investigation");
    engine.recordEvidence({ type: "command_result", description: "inv", source: "bash", phase: "investigation" });
    engine.recordCommandExecution({ command: "grep", exitCode: 0, stdout: "", stderr: "", durationMs: 1, phase: "investigation", timestamp: new Date().toISOString() });
    await engine.transitionTo("implementation");
    engine.recordFileChange({ path: "src/foo.ts", summary: "fix", iteration: 0 });
    await engine.transitionTo("verification");
    engine.recordVerificationAttempt({ method: "vitest", command: "vitest run", passed: false, output: "fail", phase: "verification" });
    engine.recordEvidence({ type: "test_result", description: "fail", source: "vitest", result: "contradicts", phase: "verification" });
    // verification -> investigation should increment iteration
    await engine.transitionTo("investigation");
    expect(engine.getIteration()).toBe(1);
    expect(engine.getPhase()).toBe("investigation");
    rmSync(dir, { recursive: true, force: true });
  });

  it("enforces iteration budget", async () => {
    const { engine, dir } = makeEngine({ maxIterations: 1 });
    engine.recordFileInspected("a.ts");
    engine.recordEvidence({ type: "command_result", description: "x", source: "x", phase: "reconnaissance" });
    engine.recordCommandExecution({ command: "ls", exitCode: 0, stdout: "", stderr: "", durationMs: 1, phase: "reconnaissance", timestamp: new Date().toISOString() });
    await engine.transitionTo("diagnosis");
    const h = engine.addHypothesis({ description: "h", evidence: ["e"], confidence: 0.8 });
    engine.updateHypothesis(h.id, { status: "selected" });
    engine.recordEvidence({ type: "other", description: "e", source: "s", phase: "diagnosis" });
    await engine.transitionTo("investigation");
    engine.recordEvidence({ type: "command_result", description: "inv", source: "bash", phase: "investigation" });
    engine.recordCommandExecution({ command: "grep", exitCode: 0, stdout: "", stderr: "", durationMs: 1, phase: "investigation", timestamp: new Date().toISOString() });
    await engine.transitionTo("implementation");
    engine.recordFileChange({ path: "src/foo.ts", summary: "fix", iteration: 0 });
    await engine.transitionTo("verification");
    engine.recordVerificationAttempt({ method: "vitest", command: "vitest run", passed: false, output: "fail", phase: "verification" });
    engine.recordEvidence({ type: "test_result", description: "fail", source: "vitest", result: "contradicts", phase: "verification" });
    await engine.transitionTo("investigation");
    expect(engine.getIteration()).toBe(1);
    // Second loop should exhaust budget (max 1)
    engine.recordEvidence({ type: "command_result", description: "inv2", source: "bash", phase: "investigation" });
    engine.recordCommandExecution({ command: "grep2", exitCode: 0, stdout: "", stderr: "", durationMs: 1, phase: "investigation", timestamp: new Date().toISOString() });
    await engine.transitionTo("implementation");
    engine.recordFileChange({ path: "src/foo2.ts", summary: "fix2", iteration: 1 });
    await engine.transitionTo("verification");
    engine.recordVerificationAttempt({ method: "vitest", command: "vitest run", passed: false, output: "fail2", phase: "verification" });
    engine.recordEvidence({ type: "test_result", description: "fail2", source: "vitest", result: "contradicts", phase: "verification" });
    await expect(engine.transitionTo("investigation")).rejects.toThrow(/Iteration budget exhausted/);
    expect(engine.isBudgetExhausted()).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  it("does not allow arbitrary uncontrolled phase transitions", async () => {
    const { engine, dir } = makeEngine();
    await expect(engine.transitionTo("verification")).rejects.toBeInstanceOf(InvalidTransitionError);
    await expect(engine.transitionTo("finalization")).rejects.toBeInstanceOf(InvalidTransitionError);
    rmSync(dir, { recursive: true, force: true });
  });

  it("tracks phaseHistory and phaseDurations", async () => {
    const { engine, dir } = makeEngine();
    expect(engine.getState().phaseHistory.length).toBe(1);
    expect(engine.getState().phaseHistory[0]!.to).toBe("reconnaissance");
    engine.recordFileInspected("a.ts");
    engine.recordEvidence({ type: "command_result", description: "x", source: "x", phase: "reconnaissance" });
    engine.recordCommandExecution({ command: "ls", exitCode: 0, stdout: "", stderr: "", durationMs: 1, phase: "reconnaissance", timestamp: new Date().toISOString() });
    await engine.transitionTo("diagnosis");
    const hist = engine.getState().phaseHistory;
    expect(hist.length).toBe(2);
    expect(hist[1]!.from).toBe("reconnaissance");
    expect(hist[1]!.to).toBe("diagnosis");
    // durations
    const durs = engine.getState().phaseDurations;
    expect(durs.length).toBe(2);
    expect(durs[0]!.phase).toBe("reconnaissance");
    expect(durs[0]!.exitedAt).toBeDefined();
    rmSync(dir, { recursive: true, force: true });
  });

  it("forceTransitionTo bypasses gate", async () => {
    const { engine, dir } = makeEngine();
    // No evidence — gate would fail, but force should pass
    await engine.forceTransitionTo("diagnosis");
    expect(engine.getPhase()).toBe("diagnosis");
    rmSync(dir, { recursive: true, force: true });
  });
});
