import type { VerificationStageResult, Verdict } from "./types.ts";

/**
 * Deterministic verdict mapping.
 * Precedence:
 * - patchApply failed/error/timeout → no verdict, handled as evaluation error/timeout
 * - reproduction FAIL → agent_failure (short-circuit; oracle/regression skipped)
 * - reproduction PASS, oracle FAIL → false_confidence (even if regression also fails but wasn't run)
 * - reproduction PASS, oracle PASS, regression FAIL → regression_failure
 * - all PASS → verified
 *
 * If any stage timed out or errored, verdict is undefined and top-level status is error/timeout.
 * Documented precedence: false_confidence only when oracle actually executed and failed; regression_failure only when regression actually executed.
 */

export function computeVerdict(
  reproduction: VerificationStageResult,
  oracle: VerificationStageResult,
  regression: VerificationStageResult,
): Verdict | undefined {
  // Patch apply handled separately; assume it passed here.

  // Reproduction failed → agent_failure (regardless of oracle/regression status, but they should be skipped)
  if (reproduction.status === "failed") {
    return "agent_failure";
  }
  if (reproduction.status === "timeout" || reproduction.status === "error") {
    // Don't assign verdict for timeout/error; evaluator will set status accordingly
    return undefined;
  }
  if (reproduction.status !== "passed") {
    return undefined;
  }

  // Reproduction passed
  if (oracle.status === "failed") {
    return "false_confidence";
  }
  if (oracle.status === "timeout" || oracle.status === "error") {
    return undefined;
  }
  if (oracle.status === "skipped") {
    // Should not happen in success path; but treat as incomplete
    return undefined;
  }
  if (oracle.status !== "passed") {
    return undefined;
  }

  // Oracle passed
  if (regression.status === "failed") {
    return "regression_failure";
  }
  if (regression.status === "timeout" || regression.status === "error") {
    return undefined;
  }
  if (regression.status === "passed") {
    return "verified";
  }
  // If regression skipped (shouldn't after oracle pass), not verified
  return undefined;
}

export function verdictToString(v: Verdict | undefined): string {
  if (!v) return "NONE";
  return v.toUpperCase();
}
