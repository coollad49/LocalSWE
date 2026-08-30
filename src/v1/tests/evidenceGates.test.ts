import { describe, it, expect } from "vitest";
import type { TaskState } from "../types.ts";
import {
  isReconnaissanceComplete,
  isDiagnosisComplete,
  isInvestigationComplete,
  isImplementationComplete,
  isVerificationComplete,
  isFinalizationComplete,
  checkGateForPhase,
} from "../workflow/gates.ts";

function baseState(overrides: Partial<TaskState> = {}): TaskState {
  return {
    phase: "reconnaissance",
    issue: "issue",
    filesInspected: [],
    commandsExecuted: [],
    hypotheses: [],
    changesMade: [],
    verificationAttempts: [],
    evidence: [],
    iteration: 0,
    maxIterations: 5,
    phaseHistory: [],
    phaseDurations: [],
    ...overrides,
  };
}

describe("evidence gates", () => {
  it("reconnaissance requires file inspection and evidence", () => {
    const s = baseState();
    expect(isReconnaissanceComplete(s).passed).toBe(false);
    const s2 = baseState({
      filesInspected: ["package.json"],
      commandsExecuted: [{ command: "ls", exitCode: 0, stdout: "", stderr: "", durationMs: 1, phase: "reconnaissance", timestamp: new Date().toISOString() }],
      evidence: [{ id: "1", type: "file_inspection", description: "read package.json", source: "package.json", timestamp: new Date().toISOString(), phase: "reconnaissance" }],
    });
    expect(isReconnaissanceComplete(s2).passed).toBe(true);
  });

  it("reconnaissance can pass with command_result evidence even without commandsExecuted? No - needs at least file or command evidence", () => {
    const s = baseState({
      filesInspected: ["a.ts"],
      evidence: [{ id: "1", type: "command_result", description: "bash ls", source: "ls", timestamp: new Date().toISOString(), phase: "reconnaissance" }],
    });
    // filesInspected present + evidence => should pass even if commandsExecuted empty? Our gate checks filesInspected length and evidence.
    // In gate we require filesInspected>=1 and (hasInspection or hasCommand via evidence). So this should pass.
    expect(isReconnaissanceComplete(s).passed).toBe(true);
  });

  it("diagnosis requires at least one hypothesis with evidence", () => {
    const s = baseState({ phase: "diagnosis" });
    expect(isDiagnosisComplete(s).passed).toBe(false);
    const s2 = baseState({
      phase: "diagnosis",
      hypotheses: [{ id: "h1", description: "hypo", evidence: [], confidence: 0.5, status: "active" }],
      evidence: [{ id: "1", type: "other", description: "e", timestamp: new Date().toISOString(), phase: "diagnosis" }],
    });
    // hypothesis has no evidence -> fails
    expect(isDiagnosisComplete(s2).passed).toBe(false);
    const s3 = baseState({
      phase: "diagnosis",
      hypotheses: [{ id: "h1", description: "hypo", evidence: ["file:line"], confidence: 0.8, status: "active" }],
      evidence: [{ id: "1", type: "other", description: "e", timestamp: new Date().toISOString(), phase: "diagnosis" }],
    });
    expect(isDiagnosisComplete(s3).passed).toBe(true);
  });

  it("investigation requires command/test evidence", () => {
    const s = baseState({ phase: "investigation" });
    expect(isInvestigationComplete(s).passed).toBe(false);
    const s2 = baseState({
      phase: "investigation",
      commandsExecuted: [{ command: "grep", exitCode: 0, stdout: "", stderr: "", durationMs: 1, phase: "investigation", timestamp: new Date().toISOString() }],
      evidence: [{ id: "1", type: "command_result", description: "grep", source: "grep", timestamp: new Date().toISOString(), phase: "investigation" }],
    });
    expect(isInvestigationComplete(s2).passed).toBe(true);
  });

  it("implementation requires selected hypothesis and changes", () => {
    const s = baseState({ phase: "implementation" });
    expect(isImplementationComplete(s).passed).toBe(false);
    const s2 = baseState({
      phase: "implementation",
      hypotheses: [{ id: "h1", description: "h", evidence: ["e"], confidence: 0.9, status: "selected" }],
      selectedHypothesis: "h1",
      changesMade: [{ path: "src/foo.ts", summary: "fix", iteration: 0, timestamp: new Date().toISOString() }],
    });
    expect(isImplementationComplete(s2).passed).toBe(true);
  });

  it("implementation can also pass via hypothesis status selected", () => {
    const s = baseState({
      phase: "implementation",
      hypotheses: [{ id: "h1", description: "h", evidence: ["e"], confidence: 0.9, status: "selected" }],
      changesMade: [{ path: "src/foo.ts", summary: "fix", iteration: 0, timestamp: new Date().toISOString() }],
    });
    expect(isImplementationComplete(s).passed).toBe(true);
  });

  it("verification requires verification attempt and evidence", () => {
    const s = baseState({ phase: "verification" });
    expect(isVerificationComplete(s).passed).toBe(false);
    const s2 = baseState({
      phase: "verification",
      verificationAttempts: [{ id: "v1", iteration: 0, method: "vitest", command: "vitest run", passed: true, output: "pass", timestamp: new Date().toISOString(), phase: "verification" }],
      evidence: [{ id: "1", type: "test_result", description: "vitest", source: "vitest", result: "supports", timestamp: new Date().toISOString(), phase: "verification" }],
    });
    expect(isVerificationComplete(s2).passed).toBe(true);
  });

  it("finalization requires diff_inspection evidence", () => {
    const s = baseState({ phase: "finalization" });
    expect(isFinalizationComplete(s).passed).toBe(false);
    const s2 = baseState({
      phase: "finalization",
      evidence: [{ id: "1", type: "diff_inspection", description: "git diff", source: "git diff", timestamp: new Date().toISOString(), phase: "finalization" }],
    });
    expect(isFinalizationComplete(s2).passed).toBe(true);
  });

  it("checkGateForPhase delegates correctly", () => {
    const sRecon = baseState({ filesInspected: ["a"], commandsExecuted: [{ command: "ls", exitCode: 0, stdout: "", stderr: "", durationMs: 1, phase: "reconnaissance", timestamp: new Date().toISOString() }], evidence: [{ id: "1", type: "file_inspection", description: "x", timestamp: new Date().toISOString(), phase: "reconnaissance" }] });
    expect(checkGateForPhase("reconnaissance", sRecon).passed).toBe(true);
  });

  it("gates are repo-agnostic: do not require npm test specifically", () => {
    // Verification can pass with any command, not just npm test
    const s = baseState({
      phase: "verification",
      verificationAttempts: [{ id: "v1", iteration: 0, method: "custom", command: "node .v1/repro.js", passed: true, output: "ok", timestamp: new Date().toISOString(), phase: "verification" }],
      evidence: [{ id: "1", type: "command_result", description: "custom repro", source: "node .v1/repro.js", timestamp: new Date().toISOString(), phase: "verification" }],
    });
    expect(isVerificationComplete(s).passed).toBe(true);
  });
});
