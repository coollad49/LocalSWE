import { describe, test, expect } from "vitest";
import { computeVerdict } from "../verdict.ts";
import type { VerificationStageResult } from "../types.ts";

function mk(status: VerificationStageResult["status"]): VerificationStageResult {
  return { status, durationMs: 10, command: "test" };
}

describe("verdict mapping", () => {
  test("PASS PASS PASS -> verified", () => {
    expect(computeVerdict(mk("passed"), mk("passed"), mk("passed"))).toBe("verified");
  });

  test("FAIL -> agent_failure", () => {
    expect(computeVerdict(mk("failed"), mk("skipped"), mk("skipped"))).toBe("agent_failure");
  });

  test("PASS FAIL -> false_confidence", () => {
    expect(computeVerdict(mk("passed"), mk("failed"), mk("skipped"))).toBe("false_confidence");
  });

  test("PASS PASS FAIL -> regression_failure", () => {
    expect(computeVerdict(mk("passed"), mk("passed"), mk("failed"))).toBe("regression_failure");
  });

  test("PASS timeout -> no verdict", () => {
    expect(computeVerdict(mk("passed"), mk("timeout"), mk("skipped"))).toBeUndefined();
  });

  test("timeout reproduction -> no verdict", () => {
    expect(computeVerdict(mk("timeout"), mk("skipped"), mk("skipped"))).toBeUndefined();
  });

  test("error reproduction -> no verdict", () => {
    expect(computeVerdict(mk("error"), mk("skipped"), mk("skipped"))).toBeUndefined();
  });

  test("PASS PASS timeout -> no verdict (regression timeout)", () => {
    expect(computeVerdict(mk("passed"), mk("passed"), mk("timeout"))).toBeUndefined();
  });

  test("precedence: oracle fail vs regression fail -> false_confidence preferred when oracle fails", () => {
    // According to spec, if regression also fails but wasn't reached, prefer false_confidence.
    // Here we simulate oracle failed, regression skipped -> false_confidence
    expect(computeVerdict(mk("passed"), mk("failed"), mk("skipped"))).toBe("false_confidence");
    // If both could be failed but oracle is checked first, still false_confidence
    expect(computeVerdict(mk("passed"), mk("failed"), mk("failed"))).toBe("false_confidence");
  });
});
