import { describe, test, expect } from "vitest";
import { aggregateResults, computeGroupMetrics, computeCaseStability } from "../aggregation.ts";
import { computeHistoricalVsSynthetic, computeDifficultyBreakdown, computeCategoryBreakdown } from "../breakdowns.ts";
import type { EvaluationResult } from "../types.ts";

function mkResult(verdict: EvaluationResult["verdict"], status: EvaluationResult["status"] = "completed", overrides?: Partial<EvaluationResult>): EvaluationResult {
  const base: EvaluationResult = {
    evaluationId: "eval",
    runId: "run",
    caseId: overrides?.caseId ?? "case",
    benchmarkVersion: "0.4",
    benchmarkFingerprint: "sha256:abc",
    agentVersion: "test",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 100,
    status,
    verdict: verdict ?? undefined,
    verification: {
      patchApply: { status: "passed", durationMs: 10, command: "git apply --whitespace=nowarn" },
      reproduction: { status: verdict === "agent_failure" ? "failed" : status === "error" || status === "timeout" ? status : "passed", durationMs: 10, command: "repro" },
      oracle: { status: verdict === "false_confidence" ? "failed" : verdict === "agent_failure" ? "skipped" : status === "error" || status === "timeout" ? "skipped" : "passed", durationMs: 10, command: "oracle" },
      regression: { status: verdict === "regression_failure" ? "failed" : verdict && verdict !== "verified" ? "skipped" : status === "error" || status === "timeout" ? "skipped" : "passed", durationMs: 10, command: "regression" },
    },
    workspace: { isolated: true },
    caseMeta: overrides?.caseMeta,
  };
  return { ...base, ...overrides, verification: overrides?.verification ?? base.verification };
}

describe("aggregation", () => {
  test("VFR calculation uses total denominator", () => {
    const results = [
      mkResult("verified"),
      mkResult("verified"),
      mkResult("agent_failure"),
      mkResult("false_confidence"),
    ];
    const metrics = aggregateResults(results);
    expect(metrics.total).toBe(4);
    expect(metrics.byVerdict.verified).toBe(2);
    expect(metrics.rates.vfr).toBe(50); // 2/4 total
    expect(metrics.rates.vfr.toFixed(2)).toBe("50.00");
    expect(metrics.rates.reproductionRate).toBeCloseTo(75, 1); // 3 passed /4 (verified+verified+false_confidence have repro passed)
  });

  test("handles errors and timeouts with total denominator", () => {
    const results = [mkResult("verified"), mkResult(undefined, "error"), mkResult(undefined, "timeout")];
    const metrics = aggregateResults(results);
    expect(metrics.total).toBe(3);
    expect(metrics.completed).toBe(1);
    expect(metrics.errors).toBe(1);
    expect(metrics.timeouts).toBe(1);
    // VFR = verified / total = 1/3 ~33.33
    expect(metrics.rates.vfr).toBeCloseTo(33.33, 1);
    expect(metrics.failureBreakdown.verified).toBe(1);
    expect(metrics.failureBreakdown.error).toBe(1);
    expect(metrics.failureBreakdown.timeout).toBe(1);
  });

  test("regressionFreeRate uses regression tested denominator", () => {
    const results = [
      mkResult("verified"),
      mkResult("verified"),
      mkResult("false_confidence"), // regression skipped
      mkResult("agent_failure"), // regression skipped
    ];
    const metrics = aggregateResults(results);
    // regression tested = 2 (only verified have regression passed)
    expect(metrics.rates.regressionFreeRate).toBe(100); // 2 passed /2 tested
  });

  test("denominator protections on empty", () => {
    const metrics = aggregateResults([]);
    expect(metrics.total).toBe(0);
    expect(metrics.rates.vfr).toBe(0);
    expect(metrics.rates.reproductionRate).toBe(0);
    expect(metrics.rates.falseConfidenceRate).toBe(0);
  });

  test("multi-label category aggregation", () => {
    const results = [
      mkResult("verified", "completed", { caseId: "synth-001", caseMeta: { categories: ["validation", "parsing"], difficulty: "medium", type: "synthetic" } }),
      mkResult("agent_failure", "completed", { caseId: "synth-002", caseMeta: { categories: ["validation"], difficulty: "hard", type: "synthetic" } }),
    ];
    const byCat = computeCategoryBreakdown(results);
    expect(byCat["validation"]?.total).toBe(2);
    expect(byCat["parsing"]?.total).toBe(1);
    expect(byCat["validation"]?.vfr).toBe(50);
    expect(byCat["parsing"]?.vfr).toBe(100);
  });

  test("historical vs synthetic breakdown", () => {
    const results = [
      mkResult("verified", "completed", { caseId: "hist-001", caseMeta: { type: "historical", difficulty: "medium", categories: ["validation"] } }),
      mkResult("agent_failure", "completed", { caseId: "synth-001", caseMeta: { type: "synthetic", difficulty: "easy", categories: ["parsing"] } }),
    ];
    const hvs = computeHistoricalVsSynthetic(results);
    expect(hvs.historical.total).toBe(1);
    expect(hvs.synthetic.total).toBe(1);
    expect(hvs.historical.vfr).toBe(100);
    expect(hvs.synthetic.vfr).toBe(0);
  });

  test("difficulty breakdown", () => {
    const results = [
      mkResult("verified", "completed", { caseId: "hist-001", caseMeta: { difficulty: "easy", categories: ["a"], type: "historical" } }),
      mkResult("verified", "completed", { caseId: "hist-002", caseMeta: { difficulty: "medium", categories: ["b"], type: "historical" } }),
      mkResult("agent_failure", "completed", { caseId: "synth-001", caseMeta: { difficulty: "hard", categories: ["c"], type: "synthetic" } }),
    ];
    const byDiff = computeDifficultyBreakdown(results);
    expect(byDiff.easy.total).toBe(1);
    expect(byDiff.medium.total).toBe(1);
    expect(byDiff.hard.total).toBe(1);
    expect(byDiff.easy.vfr).toBe(100);
    expect(byDiff.hard.vfr).toBe(0);
  });

  test("case stability with variance detection", () => {
    const results = [
      mkResult("verified", "completed", { caseId: "synth-001", runId: "a" }),
      mkResult("agent_failure", "completed", { caseId: "synth-001", runId: "b" }),
      mkResult("verified", "completed", { caseId: "synth-001", runId: "c" }),
      mkResult("verified", "completed", { caseId: "hist-001", runId: "d" }),
    ];
    const stability = computeCaseStability(results);
    const synth = stability.find((s) => s.caseId === "synth-001");
    expect(synth?.totalRuns).toBe(3);
    expect(synth?.verifiedCount).toBe(2);
    expect(synth?.hasVariance).toBe(true);
    expect(synth?.stabilityRate).toBeCloseTo(66.66, 1);
    const hist = stability.find((s) => s.caseId === "hist-001");
    expect(hist?.hasVariance).toBe(false);
  });

  test("failure breakdown counts PATCH_FAILED", () => {
    const patchFailed: EvaluationResult = mkResult(undefined, "error", {
      verification: {
        patchApply: { status: "error", durationMs: 10, command: "git apply" },
        reproduction: { status: "skipped", durationMs: 0, command: "repro", reason: "skipped due to patch apply failure" },
        oracle: { status: "skipped", durationMs: 0, command: "oracle" },
        regression: { status: "skipped", durationMs: 0, command: "regression" },
      },
    });
    const results = [patchFailed, mkResult("verified"), mkResult("agent_failure")];
    const m = aggregateResults(results);
    expect(m.failureBreakdown.patch_failed).toBe(1);
    expect(m.failureBreakdown.verified).toBe(1);
    expect(m.failureBreakdown.agent_failure).toBe(1);
  });
});
