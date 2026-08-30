import { describe, test, expect } from "vitest";
import {
  aggregateResults,
  computeAgentMetrics,
  computeCaseBreakdown,
  computeComparison,
  computeFailureAnalysis,
  computeValidRunMetrics,
} from "../aggregation.ts";
import { buildExperimentReport, generateReportMarkdown, generateSummaryJson } from "../report.ts";
import { computeHistoricalVsSynthetic, computeDifficultyBreakdown, computeCategoryBreakdown } from "../breakdowns.ts";
import { computeCaseStability } from "../aggregation.ts";
import type { EvaluationResult } from "../types.ts";

function mk(
  verdict: EvaluationResult["verdict"],
  status: EvaluationResult["status"] = "completed",
  overrides?: Partial<EvaluationResult>,
): EvaluationResult {
  const base: EvaluationResult = {
    evaluationId: "eval",
    runId: overrides?.runId ?? `run-${Math.random().toString(36).slice(2, 6)}`,
    caseId: overrides?.caseId ?? "case",
    benchmarkVersion: overrides?.benchmarkVersion ?? "0.5",
    benchmarkFingerprint: overrides?.benchmarkFingerprint ?? "sha256:20f1003c3f0e10bcd6293f49ca2a2167011941f5b0677076c93103b10f411dde",
    agentVersion: overrides?.agentVersion ?? "baseline-v0",
    model: overrides?.model ?? "opencode-go/muse-spark-1.2-contributor",
    piVersion: "0.84.4",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: overrides?.durationMs ?? 1000,
    status,
    verdict: verdict ?? undefined,
    verification: {
      patchApply: { status: "passed", durationMs: 10, command: "git apply" },
      reproduction: { status: verdict === "agent_failure" ? "failed" : status === "error" || status === "timeout" ? status : "passed", durationMs: 10, command: "repro" },
      oracle: { status: verdict === "false_confidence" ? "failed" : verdict === "agent_failure" ? "skipped" : status === "error" || status === "timeout" ? "skipped" : "passed", durationMs: 10, command: "oracle" },
      regression: { status: verdict === "regression_failure" ? "failed" : verdict && verdict !== "verified" ? "skipped" : status === "error" || status === "timeout" ? "skipped" : "passed", durationMs: 10, command: "regression" },
    },
    workspace: { isolated: true },
    caseMeta: overrides?.caseMeta,
    metrics: overrides?.metrics,
    cost: overrides?.cost,
  };
  return { ...base, ...overrides, verification: overrides?.verification ?? base.verification, metrics: overrides?.metrics ?? base.metrics, cost: overrides?.cost ?? base.cost };
}

describe("outcome aggregation VFR", () => {
  test("VFR overall and valid", () => {
    const results = [
      mk("verified", "completed", { agentVersion: "baseline-v0", caseId: "hist-001" }),
      mk("verified", "completed", { agentVersion: "baseline-v0", caseId: "hist-002" }),
      mk("agent_failure", "completed", { agentVersion: "baseline-v0", caseId: "hist-003" }),
      mk(undefined, "error", {
        agentVersion: "baseline-v0",
        caseId: "hist-004",
        verification: {
          patchApply: { status: "error", durationMs: 10, command: "git apply" },
          reproduction: { status: "skipped", durationMs: 0, command: "repro" },
          oracle: { status: "skipped", durationMs: 0, command: "oracle" },
          regression: { status: "skipped", durationMs: 0, command: "regression" },
        },
      }),
    ];
    const m = computeAgentMetrics(results, "baseline-v0");
    expect(m.runs).toBe(4);
    expect(m.rates.vfr).toBe(50); // 2/4
    expect(m.rates.vfrValid).toBeCloseTo(66.666, 1); // 2/3 valid
    expect(m.outcomes.verified).toBe(2);
    expect(m.outcomes.agentFailure).toBe(1);
  });

  test("reproduction/oracle/regression rates", () => {
    const results = [
      mk("verified", "completed", { caseId: "a", agentVersion: "baseline-v0" }),
      mk("false_confidence", "completed", { caseId: "b", agentVersion: "baseline-v0" }),
      mk("agent_failure", "completed", { caseId: "c", agentVersion: "baseline-v0" }),
    ];
    const m = computeAgentMetrics(results, "baseline-v0");
    expect(m.rates.reproductionRate).toBeCloseTo(66.66, 1); // 2 passed /3
    expect(m.rates.oraclePassRate).toBeCloseTo(33.33, 1); // 1 passed /3
    expect(m.rates.regressionFreeRate).toBe(100); // 1 passed /1 tested
    expect(m.rates.patchApplySuccessRate).toBe(100);
  });

  test("average/median cost", () => {
    const results = [
      mk("verified", "completed", { agentVersion: "v0", cost: { totalCostUsd: 0.1, costUsd: 0.1, inputTokens: 100, outputTokens: 100, totalTokens: 200, inputCostUsd: 0.01, outputCostUsd: 0.09, costStatus: "computed", costSource: "computed" }, metrics: { durationMs: 1000, totalTurns: 5, toolCalls: 10, commandsExecuted: 2, filesInspected: 2, filesChanged: 1, iterations: 1, iterationsSource: "fallback", inputTokens: 100, outputTokens: 100, totalTokens: 200 } }),
      mk("verified", "completed", { agentVersion: "v0", cost: { totalCostUsd: 0.3, costUsd: 0.3, inputTokens: 200, outputTokens: 200, totalTokens: 400, inputCostUsd: 0.03, outputCostUsd: 0.27, costStatus: "computed", costSource: "computed" }, metrics: { durationMs: 3000, totalTurns: 10, toolCalls: 20, commandsExecuted: 4, filesInspected: 3, filesChanged: 1, iterations: 2, iterationsSource: "fallback", inputTokens: 200, outputTokens: 200, totalTokens: 400 } }),
    ];
    const m = computeAgentMetrics(results, "v0");
    expect(m.efficiency.averageCostUsd).toBeCloseTo(0.2, 5);
    expect(m.efficiency.medianCostUsd).toBeCloseTo(0.2, 5);
    expect(m.efficiency.totalCostUsd).toBeCloseTo(0.4, 5);
    expect(m.efficiency.averageDurationMs).toBe(2000);
    expect(m.efficiency.medianDurationMs).toBe(2000);
    expect(m.efficiency.averageTurns).toBe(7.5);
    expect(m.efficiency.medianTurns).toBe(7.5);
    expect(m.efficiency.averageToolCalls).toBe(15);
    expect(m.efficiency.averageTokens).toBe(300);
    expect(m.efficiency.medianTokens).toBe(300);
  });

  test("null cost when unavailable", () => {
    const results = [
      mk("verified", "completed", { agentVersion: "v0", cost: { totalCostUsd: null, costUsd: null, inputTokens: null, outputTokens: null, totalTokens: null, inputCostUsd: null, outputCostUsd: null, costStatus: "unavailable", costSource: "none" }, metrics: { durationMs: 1000, totalTurns: null, toolCalls: null, commandsExecuted: null, filesInspected: null, filesChanged: null, iterations: 1, iterationsSource: "fallback", inputTokens: null, outputTokens: null, totalTokens: null } }),
    ];
    const m = computeAgentMetrics(results, "v0");
    expect(m.efficiency.averageCostUsd).toBe(null);
    expect(m.efficiency.medianCostUsd).toBe(null);
    expect(m.efficiency.totalCostUsd).toBe(null);
  });

  test("timeout rate", () => {
    const results = [
      mk("verified", "completed", { agentVersion: "v0" }),
      mk(undefined, "timeout", { agentVersion: "v0", verification: { patchApply: { status: "timeout", durationMs: 10, command: "git apply" }, reproduction: { status: "skipped", durationMs: 0, command: "repro" }, oracle: { status: "skipped", durationMs: 0, command: "oracle" }, regression: { status: "skipped", durationMs: 0, command: "regression" } } }),
    ];
    const m = computeAgentMetrics(results, "v0");
    expect(m.rates.timeoutRate).toBe(50);
  });

  test("failure rates", () => {
    const results = [
      mk("verified", "completed", { agentVersion: "v0" }),
      mk("agent_failure", "completed", { agentVersion: "v0" }),
      mk("false_confidence", "completed", { agentVersion: "v0" }),
      mk("regression_failure", "completed", { agentVersion: "v0" }),
    ];
    const m = computeAgentMetrics(results, "v0");
    expect(m.rates.agentFailureRate).toBe(25);
    expect(m.rates.falseConfidenceRate).toBe(25);
    expect(m.rates.regressionFailureRate).toBe(25);
  });
});

describe("case-level breakdown", () => {
  test("per-case rows group by caseId+agentVersion", () => {
    const results = [
      mk("verified", "completed", { caseId: "hist-001", agentVersion: "baseline-v0", runId: "r1", caseMeta: { difficulty: "medium", categories: ["validation"] } }),
      mk("agent_failure", "completed", { caseId: "hist-001", agentVersion: "baseline-v0", runId: "r2", caseMeta: { difficulty: "medium", categories: ["validation"] } }),
      mk("verified", "completed", { caseId: "hist-001", agentVersion: "agent-v1", runId: "r3", caseMeta: { difficulty: "medium", categories: ["validation"] } }),
    ];
    const rows = computeCaseBreakdown(results);
    expect(rows.length).toBe(2); // hist-001 baseline + hist-001 v1
    const base = rows.find((r) => r.agentVersion === "baseline-v0");
    expect(base?.runs).toBe(2);
    expect(base?.verified).toBe(1);
    expect(base?.vfr).toBe(50);
    const v1 = rows.find((r) => r.agentVersion === "agent-v1");
    expect(v1?.runs).toBe(1);
    expect(v1?.vfr).toBe(100);
  });

  test("case breakdown includes avgCost/avgDuration etc", () => {
    const results = [
      mk("verified", "completed", {
        caseId: "synth-001",
        agentVersion: "baseline-v0",
        runId: "a",
        caseMeta: { difficulty: "easy", categories: ["parsing"] },
        cost: { totalCostUsd: 0.1, costUsd: 0.1, inputTokens: 100, outputTokens: 100, totalTokens: 200, inputCostUsd: 0.01, outputCostUsd: 0.09, costStatus: "computed", costSource: "computed" },
        metrics: { durationMs: 1000, totalTurns: 5, toolCalls: 10, commandsExecuted: 2, filesInspected: 1, filesChanged: 1, iterations: 1, iterationsSource: "fallback", inputTokens: 100, outputTokens: 100, totalTokens: 200 },
      }),
      mk("verified", "completed", {
        caseId: "synth-001",
        agentVersion: "baseline-v0",
        runId: "b",
        caseMeta: { difficulty: "easy", categories: ["parsing"] },
        cost: { totalCostUsd: 0.3, costUsd: 0.3, inputTokens: 200, outputTokens: 200, totalTokens: 400, inputCostUsd: 0.03, outputCostUsd: 0.27, costStatus: "computed", costSource: "computed" },
        metrics: { durationMs: 3000, totalTurns: 10, toolCalls: 20, commandsExecuted: 2, filesInspected: 1, filesChanged: 1, iterations: 1, iterationsSource: "fallback", inputTokens: 200, outputTokens: 200, totalTokens: 400 },
      }),
    ];
    const rows = computeCaseBreakdown(results);
    expect(rows[0]?.avgCost).toBeCloseTo(0.2, 5);
    expect(rows[0]?.avgDuration).toBe(2000);
    expect(rows[0]?.avgTurns).toBe(7.5);
  });
});

describe("V0 vs V1 delta", () => {
  test("delta in pp for percentages", () => {
    const v0Results = [
      mk("verified", "completed", { agentVersion: "baseline-v0", caseId: "a" }),
      mk("agent_failure", "completed", { agentVersion: "baseline-v0", caseId: "b" }),
    ];
    const v1Results = [
      mk("verified", "completed", { agentVersion: "agent-v1", caseId: "a" }),
      mk("verified", "completed", { agentVersion: "agent-v1", caseId: "b" }),
      mk("verified", "completed", { agentVersion: "agent-v1", caseId: "c" }),
    ];
    const all = [...v0Results, ...v1Results];
    const v0 = computeAgentMetrics(all, "baseline-v0");
    const v1 = computeAgentMetrics(all, "agent-v1");
    const comp = computeComparison(v0, v1)!;
    const vfrRow = comp.find((r) => r.metric === "VFR")!;
    expect(vfrRow.v0).toBe(50);
    expect(vfrRow.v1).toBeCloseTo(100, 1);
    expect(vfrRow.delta).toBeCloseTo(50, 1);
    expect(vfrRow.deltaUnit).toBe("pp");
  });

  test("null handling in comparison", () => {
    const v0 = computeAgentMetrics([mk("verified", "completed", { agentVersion: "v0", cost: { totalCostUsd: null, costUsd: null, inputTokens: null, outputTokens: null, totalTokens: null, inputCostUsd: null, outputCostUsd: null, costStatus: "unavailable", costSource: "none" }, metrics: { durationMs: null, totalTurns: null, toolCalls: null, commandsExecuted: null, filesInspected: null, filesChanged: null, iterations: null, iterationsSource: "unavailable", inputTokens: null, outputTokens: null, totalTokens: null } })], "v0");
    const v1 = computeAgentMetrics([mk("verified", "completed", { agentVersion: "v1", cost: { totalCostUsd: 0.5, costUsd: 0.5, inputTokens: 100, outputTokens: 100, totalTokens: 200, inputCostUsd: 0.1, outputCostUsd: 0.4, costStatus: "computed", costSource: "computed" }, metrics: { durationMs: 1000, totalTurns: 5, toolCalls: 10, commandsExecuted: 2, filesInspected: 1, filesChanged: 1, iterations: 1, iterationsSource: "fallback", inputTokens: 100, outputTokens: 100, totalTokens: 200 } })], "v1");
    const comp = computeComparison(v0, v1)!;
    const costRow = comp.find((r) => r.metric === "Avg Cost (USD)")!;
    expect(costRow.v0).toBe(null);
    expect(costRow.delta).toBe(null);
  });
});

describe("edge cases", () => {
  test("zero runs", () => {
    const m = computeAgentMetrics([], "baseline-v0");
    expect(m.runs).toBe(0);
    expect(m.rates.vfr).toBe(null);
    expect(m.efficiency.averageCostUsd).toBe(null);
  });

  test("all fail", () => {
    const results = [mk("agent_failure", "completed", { agentVersion: "v0", caseId: "a" }), mk("agent_failure", "completed", { agentVersion: "v0", caseId: "b" })];
    const m = computeAgentMetrics(results, "v0");
    expect(m.rates.vfr).toBe(0);
  });

  test("one infrastructure error", () => {
    const results = [
      mk("verified", "completed", { agentVersion: "v0" }),
      mk(undefined, "error", { agentVersion: "v0", verification: { patchApply: { status: "error", durationMs: 10, command: "git apply" }, reproduction: { status: "skipped", durationMs: 0, command: "repro" }, oracle: { status: "skipped", durationMs: 0, command: "oracle" }, regression: { status: "skipped", durationMs: 0, command: "regression" } } }),
    ];
    const valid = computeValidRunMetrics(results);
    expect(valid.total).toBe(2);
    expect(valid.infraErrors).toBe(1);
    expect(valid.valid).toBe(1);
    expect(valid.vfrOverall).toBe(50);
    expect(valid.vfrValid).toBe(100);
  });

  test("mixed models accounted via agentVersion grouping", () => {
    const results = [
      mk("verified", "completed", { agentVersion: "baseline-v0", model: "opencode-go/muse-spark-1.2-contributor" }),
      mk("verified", "completed", { agentVersion: "agent-v1", model: "opencode-go/muse-spark-1.2-contributor" }),
    ];
    const all = computeCaseBreakdown(results);
    expect(all.length).toBe(2);
  });

  test("three repeated runs with different outcomes", () => {
    const results = [
      mk("verified", "completed", { caseId: "synth-004", agentVersion: "agent-v1", runId: "a" }),
      mk("agent_failure", "completed", { caseId: "synth-004", agentVersion: "agent-v1", runId: "b" }),
      mk("false_confidence", "completed", { caseId: "synth-004", agentVersion: "agent-v1", runId: "c" }),
    ];
    const rows = computeCaseBreakdown(results);
    expect(rows[0]?.runs).toBe(3);
    expect(rows[0]?.verified).toBe(1);
    expect(rows[0]?.vfr).toBeCloseTo(33.33, 1);
    expect(rows[0]?.consistency).toBeCloseTo(33.33, 1);
  });

  test("mixed benchmark fingerprints detection", () => {
    const results = [
      mk("verified", "completed", { caseId: "a", benchmarkFingerprint: "sha256:aaa" }),
      mk("verified", "completed", { caseId: "b", benchmarkFingerprint: "sha256:bbb" }),
    ];
    const fps = new Set(results.map((r) => r.benchmarkFingerprint));
    expect(fps.size).toBe(2);
  });
});

describe("failure analysis & report determinism", () => {
  test("failure analysis never merges categories", () => {
    const results = [
      mk("agent_failure", "completed", { caseId: "a", runId: "r1", agentVersion: "v0" }),
      mk("false_confidence", "completed", { caseId: "b", runId: "r2", agentVersion: "v0" }),
      mk("regression_failure", "completed", { caseId: "c", runId: "r3", agentVersion: "v0" }),
      mk(undefined, "timeout", { caseId: "d", runId: "r4", agentVersion: "v0", verification: { patchApply: { status: "timeout", durationMs: 10, command: "git apply" }, reproduction: { status: "skipped", durationMs: 0, command: "repro" }, oracle: { status: "skipped", durationMs: 0, command: "oracle" }, regression: { status: "skipped", durationMs: 0, command: "regression" } } }),
      mk(undefined, "error", { caseId: "e", runId: "r5", agentVersion: "v0", verification: { patchApply: { status: "error", durationMs: 10, command: "git apply" }, reproduction: { status: "skipped", durationMs: 0, command: "repro" }, oracle: { status: "skipped", durationMs: 0, command: "oracle" }, regression: { status: "skipped", durationMs: 0, command: "regression" } } }),
    ];
    const fa = computeFailureAnalysis(results);
    expect(fa.agentFailures.length).toBe(1);
    expect(fa.falseConfidences.length).toBe(1);
    expect(fa.regressionFailures.length).toBe(1);
    expect(fa.timeouts.length).toBeGreaterThanOrEqual(1);
    expect(fa.infrastructureErrors.length).toBeGreaterThanOrEqual(1);
    // Ensure no run appears in two of agentFailures/falseConfidences/regressionFailures
    const allIds = [...fa.agentFailures, ...fa.falseConfidences, ...fa.regressionFailures].map((x) => x.runId);
    expect(new Set(allIds).size).toBe(3);
  });

  test("deterministic report generation sorted", async () => {
    const results = [
      mk("verified", "completed", { caseId: "hist-002", runId: "b", agentVersion: "baseline-v0", durationMs: 2000 }),
      mk("verified", "completed", { caseId: "hist-001", runId: "a", agentVersion: "baseline-v0", durationMs: 1000 }),
    ];
    const summary = aggregateResults(results);
    const report = buildExperimentReport({
      benchmarkVersion: "0.5",
      benchmarkFingerprint: "sha256:abc",
      experimentId: "test",
      runsDir: "experiments/runs",
      totalRuns: results.length,
      results,
      summary,
      historicalVsSynthetic: computeHistoricalVsSynthetic(results),
      byDifficulty: computeDifficultyBreakdown(results),
      byCategory: computeCategoryBreakdown(results),
      stability: computeCaseStability(results),
      agents: [computeAgentMetrics(results, "baseline-v0")],
      caseBreakdown: computeCaseBreakdown(results),
      comparison: null,
      failures: computeFailureAnalysis(results),
      pricingSnapshot: null,
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    expect(report.results[0]?.caseId).toBe("hist-001");
    expect(report.results[1]?.caseId).toBe("hist-002");
    const md1 = generateReportMarkdown(report);
    const md2 = generateReportMarkdown(report);
    expect(md1).toBe(md2);
    const json1 = JSON.stringify(report);
    const json2 = JSON.stringify(report);
    expect(json1).toBe(json2);
    // Ensure md contains limitations disclaimer
    expect(md1).toContain("not statistically powered");
  });

  test("summary.json shape", () => {
    const results = [mk("verified", "completed", { caseId: "a", agentVersion: "baseline-v0" })];
    const summary = aggregateResults(results);
    const report = buildExperimentReport({
      benchmarkVersion: "0.5",
      benchmarkFingerprint: "sha256:abc",
      experimentId: "exp1",
      runsDir: "experiments/runs",
      totalRuns: results.length,
      results,
      summary,
      historicalVsSynthetic: computeHistoricalVsSynthetic(results),
      byDifficulty: computeDifficultyBreakdown(results),
      byCategory: computeCategoryBreakdown(results),
      stability: computeCaseStability(results),
      agents: [computeAgentMetrics(results, "baseline-v0")],
      caseBreakdown: computeCaseBreakdown(results),
      comparison: null,
      failures: computeFailureAnalysis(results),
      pricingSnapshot: null,
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    const summaryJson = generateSummaryJson(report);
    expect(summaryJson.experimentId).toBe("exp1");
    expect(summaryJson.agents[0]?.vfr).toBe(100);
  });
});
