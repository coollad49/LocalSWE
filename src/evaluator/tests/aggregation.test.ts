import { describe, test, expect } from "vitest";
import { aggregateResults } from "../aggregation.ts";
import type { EvaluationResult } from "../types.ts";

function mkResult(verdict: EvaluationResult["verdict"], status: EvaluationResult["status"] = "completed"): EvaluationResult {
  return {
    evaluationId: "eval",
    runId: "run",
    caseId: "case",
    benchmarkVersion: "0.4",
    benchmarkFingerprint: "sha256:abc",
    agentVersion: "test",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 100,
    status,
    verdict: verdict ?? undefined,
    verification: {
      patchApply: { status: "passed", durationMs: 10, command: "git apply" },
      reproduction: { status: verdict === "agent_failure" ? "failed" : "passed", durationMs: 10, command: "repro" },
      oracle: { status: verdict === "false_confidence" ? "failed" : verdict === "agent_failure" ? "skipped" : "passed", durationMs: 10, command: "oracle" },
      regression: { status: verdict === "regression_failure" ? "failed" : verdict && verdict !== "verified" ? "skipped" : "passed", durationMs: 10, command: "regression" },
    },
    workspace: { isolated: true },
  };
}

describe("aggregation", () => {
  test("VFR calculation", () => {
    const results = [
      mkResult("verified"),
      mkResult("verified"),
      mkResult("agent_failure"),
      mkResult("false_confidence"),
    ];
    const metrics = aggregateResults(results);
    expect(metrics.total).toBe(4);
    expect(metrics.byVerdict.verified).toBe(2);
    expect(metrics.rates.vfr).toBe(50); // 2/4 completed
  });

  test("handles errors and timeouts", () => {
    const results = [mkResult("verified"), mkResult(undefined, "error"), mkResult(undefined, "timeout")];
    const metrics = aggregateResults(results);
    expect(metrics.total).toBe(3);
    expect(metrics.completed).toBe(1);
    expect(metrics.errors).toBe(1);
    expect(metrics.timeouts).toBe(1);
    expect(metrics.rates.vfr).toBe(100); // 1/1 completed
  });
});
