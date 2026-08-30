import type { TaskState, AgentPhase, Evidence } from "../types.ts";

export interface GateResult {
  passed: boolean;
  reason?: string;
  missing?: string[];
}

/**
 * Evidence gates — verify meaningful evidence exists, not specific commands.
 * Requirements are deliberately repo-agnostic.
 */

export function isReconnaissanceComplete(state: TaskState): GateResult {
  const missing: string[] = [];
  if (state.filesInspected.length < 1) missing.push("at least 1 file inspected");
  if (state.commandsExecuted.length < 1) {
    // also check evidence of file_inspection or command_result
    const hasInspection = state.evidence.some((e) => e.type === "file_inspection" && e.phase === "reconnaissance");
    const hasCommand = state.evidence.some((e) => e.type === "command_result" && e.phase === "reconnaissance");
    if (!hasInspection && !hasCommand) missing.push("meaningful repository inspection (file_inspection or command_result evidence)");
  }
  // Require at least one evidence item in reconnaissance
  const reconEvidence = state.evidence.filter((e) => e.phase === "reconnaissance");
  if (reconEvidence.length === 0) missing.push("at least 1 evidence item in reconnaissance");

  if (missing.length > 0) return { passed: false, reason: `RECONNAISSANCE gate failed: ${missing.join("; ")}`, missing };
  return { passed: true };
}

export function isDiagnosisComplete(state: TaskState): GateResult {
  const missing: string[] = [];
  if (state.hypotheses.length < 1) missing.push("at least 1 explicit hypothesis");
  const supported = state.hypotheses.some((h) => h.evidence.length > 0);
  if (!supported) missing.push("at least 1 hypothesis with supporting evidence");
  const diagnosisEvidence = state.evidence.filter((e) => e.phase === "diagnosis");
  if (diagnosisEvidence.length === 0) missing.push("at least 1 evidence item in diagnosis");

  if (missing.length > 0) return { passed: false, reason: `DIAGNOSIS gate failed: ${missing.join("; ")}`, missing };
  return { passed: true };
}

export function isInvestigationComplete(state: TaskState): GateResult {
  const missing: string[] = [];
  // Investigation must have at least one command execution or test evidence
  const invEvidence = state.evidence.filter((e) => e.phase === "investigation");
  if (invEvidence.length === 0) missing.push("at least 1 evidence item in investigation");
  const hasCommandEvidence = state.evidence.some(
    (e) => e.phase === "investigation" && (e.type === "command_result" || e.type === "test_result" || e.type === "reproduction"),
  );
  const hasCommands = state.commandsExecuted.some((c) => c.phase === "investigation");
  if (!hasCommandEvidence && !hasCommands) missing.push("at least 1 command/test execution in investigation");

  if (missing.length > 0) return { passed: false, reason: `INVESTIGATION gate failed: ${missing.join("; ")}`, missing };
  return { passed: true };
}

export function isImplementationComplete(state: TaskState): GateResult {
  const missing: string[] = [];
  if (!state.selectedHypothesis) {
    const selected = state.hypotheses.find((h) => h.status === "selected");
    if (!selected) missing.push("selected diagnosis (hypothesis with status 'selected')");
  }
  if (state.changesMade.length === 0) missing.push("at least 1 file change recorded (or explicit no-op with evidence)");

  if (missing.length > 0) return { passed: false, reason: `IMPLEMENTATION gate failed: ${missing.join("; ")}`, missing };
  return { passed: true };
}

export function isVerificationComplete(state: TaskState): GateResult {
  const missing: string[] = [];
  if (state.verificationAttempts.length === 0) missing.push("at least 1 verification attempt with actual execution evidence");
  const verEvidence = state.evidence.filter((e) => e.phase === "verification");
  if (verEvidence.length === 0) missing.push("at least 1 evidence item in verification");
  const hasVerificationEvidence = state.evidence.some(
    (e) => e.phase === "verification" && (e.type === "test_result" || e.type === "command_result" || e.type === "reproduction"),
  );
  if (!hasVerificationEvidence && state.verificationAttempts.length === 0) {
    missing.push("verification must include test/command/reproduction evidence");
  }

  if (missing.length > 0) return { passed: false, reason: `VERIFICATION gate failed: ${missing.join("; ")}`, missing };
  return { passed: true };
}

export function isFinalizationComplete(state: TaskState): GateResult {
  const missing: string[] = [];
  const hasDiffEvidence = state.evidence.some((e) => e.type === "diff_inspection" && e.phase === "finalization");
  if (!hasDiffEvidence) missing.push("final diff inspection evidence");
  // Also check evidence in finalization
  const finalEvidence = state.evidence.filter((e) => e.phase === "finalization");
  if (finalEvidence.length === 0) missing.push("at least 1 evidence item in finalization");

  if (missing.length > 0) return { passed: false, reason: `FINALIZATION gate failed: ${missing.join("; ")}`, missing };
  return { passed: true };
}

export function checkGateForPhase(phase: AgentPhase, state: TaskState): GateResult {
  switch (phase) {
    case "reconnaissance":
      return isReconnaissanceComplete(state);
    case "diagnosis":
      return isDiagnosisComplete(state);
    case "investigation":
      return isInvestigationComplete(state);
    case "implementation":
      return isImplementationComplete(state);
    case "verification":
      return isVerificationComplete(state);
    case "finalization":
      return isFinalizationComplete(state);
    default:
      return { passed: false, reason: `Unknown phase: ${phase}` };
  }
}

export function allGatesForCompletedRun(state: TaskState): { passed: boolean; failures: Array<{ phase: AgentPhase; reason: string }> } {
  const phases: AgentPhase[] = ["reconnaissance", "diagnosis", "investigation", "implementation", "verification", "finalization"];
  const failures: Array<{ phase: AgentPhase; reason: string }> = [];
  for (const p of phases) {
    const r = checkGateForPhase(p, state);
    if (!r.passed) failures.push({ phase: p, reason: r.reason ?? "failed" });
  }
  return { passed: failures.length === 0, failures };
}
