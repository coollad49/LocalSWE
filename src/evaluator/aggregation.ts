import type {
  EvaluationResult,
  Verdict,
  AggregatedMetrics,
  FailureBreakdown,
  GroupMetrics,
  CaseStability,
  AgentMetrics,
  CaseReportRow,
  ComparisonRow,
  FailureAnalysis,
} from "./types.ts";
import { median, average } from "./metrics.ts";

function emptyFailureBreakdown(): FailureBreakdown {
  return {
    verified: 0,
    agent_failure: 0,
    false_confidence: 0,
    regression_failure: 0,
    patch_failed: 0,
    timeout: 0,
    error: 0,
  };
}

function emptyGroupMetrics(): GroupMetrics {
  return {
    total: 0,
    verified: 0,
    vfr: 0,
    reproductionRate: 0,
    oracleRate: 0,
    regressionFreeRate: 0,
    falseConfidenceRate: 0,
  };
}

export function aggregateResults(results: EvaluationResult[]): AggregatedMetrics {
  const total = results.length;
  const completed = results.filter((r) => r.status === "completed").length;
  const errors = results.filter((r) => r.status === "error").length;
  const timeouts = results.filter((r) => r.status === "timeout").length;

  const byVerdict: Record<Verdict, number> = {
    verified: 0,
    agent_failure: 0,
    false_confidence: 0,
    regression_failure: 0,
  };
  for (const r of results) {
    if (r.verdict) byVerdict[r.verdict]++;
  }

  const failureBreakdown: FailureBreakdown = emptyFailureBreakdown();
  for (const r of results) {
    if (r.verdict === "verified") failureBreakdown.verified++;
    else if (r.verdict === "agent_failure") failureBreakdown.agent_failure++;
    else if (r.verdict === "false_confidence") failureBreakdown.false_confidence++;
    else if (r.verdict === "regression_failure") failureBreakdown.regression_failure++;
    else if (r.verification.patchApply.status === "error" || r.verification.patchApply.status === "timeout") {
      failureBreakdown.patch_failed++;
    } else if (r.status === "timeout") failureBreakdown.timeout++;
    else if (r.status === "error") failureBreakdown.error++;
    else {
      if (r.status === "completed" && !r.verdict) failureBreakdown.error++;
      else failureBreakdown.error++;
    }
  }

  const totalEligible = total;
  const reproductionPassed = results.filter((r) => r.verification.reproduction.status === "passed").length;
  const oraclePassed = results.filter((r) => r.verification.oracle.status === "passed").length;
  const regressionTested = results.filter((r) => r.verification.regression.status !== "skipped").length;
  const regressionPassed = results.filter((r) => r.verification.regression.status === "passed").length;

  const pct = (num: number, denom: number): number => {
    if (denom === 0) return 0;
    return (num / denom) * 100;
  };

  const vfr = pct(byVerdict.verified, totalEligible);
  const reproductionRate = pct(reproductionPassed, totalEligible);
  const oracleRate = pct(oraclePassed, totalEligible);
  const regressionFreeRate = pct(regressionPassed, regressionTested);
  const falseConfidenceRate = pct(byVerdict.false_confidence, totalEligible);
  const agentFailureRate = pct(byVerdict.agent_failure, totalEligible);
  const regressionFailureRate = pct(byVerdict.regression_failure, totalEligible);

  return {
    total,
    completed,
    errors,
    timeouts,
    byVerdict,
    failureBreakdown,
    rates: {
      vfr,
      reproductionRate,
      oracleRate,
      regressionFreeRate,
      falseConfidenceRate,
      reproductionPassRate: reproductionRate,
      oraclePassRate: oracleRate,
      regressionPassRate: regressionFreeRate,
      agentFailureRate,
      regressionFailureRate,
    },
  };
}

export function formatMetrics(m: AggregatedMetrics): string {
  const lines: string[] = [];
  lines.push(`Total: ${m.total} (completed=${m.completed} errors=${m.errors} timeouts=${m.timeouts})`);
  lines.push(`Verified: ${m.byVerdict.verified} — VFR ${m.rates.vfr.toFixed(2)}%`);
  lines.push(`Agent failure: ${m.byVerdict.agent_failure} (${m.rates.agentFailureRate.toFixed(2)}%)`);
  lines.push(`False confidence: ${m.byVerdict.false_confidence} (${m.rates.falseConfidenceRate.toFixed(2)}%)`);
  lines.push(`Regression failure: ${m.byVerdict.regression_failure} (${m.rates.regressionFailureRate.toFixed(2)}%)`);
  lines.push(`Repro pass: ${m.rates.reproductionRate.toFixed(2)}%  Oracle pass: ${m.rates.oracleRate.toFixed(2)}%  RegressionFree: ${m.rates.regressionFreeRate.toFixed(2)}%`);
  return lines.join("\n");
}

export function computeGroupMetrics(results: EvaluationResult[]): GroupMetrics {
  const total = results.length;
  if (total === 0) return emptyGroupMetrics();
  const verified = results.filter((r) => r.verdict === "verified").length;
  const reproductionPassed = results.filter((r) => r.verification.reproduction.status === "passed").length;
  const oraclePassed = results.filter((r) => r.verification.oracle.status === "passed").length;
  const regressionTested = results.filter((r) => r.verification.regression.status !== "skipped").length;
  const regressionPassed = results.filter((r) => r.verification.regression.status === "passed").length;
  const falseConfidence = results.filter((r) => r.verdict === "false_confidence").length;

  const pct = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100);

  return {
    total,
    verified,
    vfr: pct(verified, total),
    reproductionRate: pct(reproductionPassed, total),
    oracleRate: pct(oraclePassed, total),
    regressionFreeRate: pct(regressionPassed, regressionTested),
    falseConfidenceRate: pct(falseConfidence, total),
  };
}

export function computeCaseStability(results: EvaluationResult[]): CaseStability[] {
  const byCase = new Map<string, EvaluationResult[]>();
  for (const r of results) {
    const arr = byCase.get(r.caseId) ?? [];
    arr.push(r);
    byCase.set(r.caseId, arr);
  }
  const stabilities: CaseStability[] = [];
  for (const [caseId, runs] of byCase.entries()) {
    const totalRuns = runs.length;
    const verifiedCount = runs.filter((r) => r.verdict === "verified").length;
    const stabilityRate = totalRuns === 0 ? 0 : (verifiedCount / totalRuns) * 100;
    const byVerdict: Record<Verdict, number> = {
      verified: 0,
      agent_failure: 0,
      false_confidence: 0,
      regression_failure: 0,
    };
    const failureCounts: FailureBreakdown = emptyFailureBreakdown();
    for (const r of runs) {
      if (r.verdict) byVerdict[r.verdict]++;
      if (r.verdict === "verified") failureCounts.verified++;
      else if (r.verdict === "agent_failure") failureCounts.agent_failure++;
      else if (r.verdict === "false_confidence") failureCounts.false_confidence++;
      else if (r.verdict === "regression_failure") failureCounts.regression_failure++;
      else if (r.verification.patchApply.status === "error" || r.verification.patchApply.status === "timeout") failureCounts.patch_failed++;
      else if (r.status === "timeout") failureCounts.timeout++;
      else if (r.status === "error") failureCounts.error++;
      else failureCounts.error++;
    }
    const hasVariance = verifiedCount > 0 && verifiedCount < totalRuns;
    stabilities.push({
      caseId,
      totalRuns,
      verifiedCount,
      stabilityRate,
      byVerdict,
      failureCounts,
      hasVariance,
    });
  }
  stabilities.sort((a, b) => a.caseId.localeCompare(b.caseId));
  return stabilities;
}

// ─── New helpers for v1 upgrade ───────────────────────────────────────────────

function pctOrNull(num: number, denom: number): number | null {
  if (denom === 0) return null;
  return (num / denom) * 100;
}

function isInfraError(r: EvaluationResult): boolean {
  // Infrastructure error if status error/timeout and not counted as verdict and patch failed? patch_failed already infra?
  // Per spec infra = evaluator/runner problems that should not be interpreted as agent failures.
  // Here we treat patch_failed/timeout/error without verdict as infra when status error/timeout.
  if (r.status === "error" || r.status === "timeout") {
    // If verdict exists, it's agent result even if timed out? Actually verdict undefined when timeout/error
    if (!r.verdict) return true;
  }
  return false;
}

export function computeAgentMetrics(results: EvaluationResult[], agentVersion: string): AgentMetrics {
  const filtered = results.filter((r) => r.agentVersion === agentVersion);
  const runs = filtered.length;

  // Outcomes
  const outcomes = {
    verified: 0,
    agentFailure: 0,
    falseConfidence: 0,
    regressionFailure: 0,
    timeout: 0,
    error: 0,
    patchFailed: 0,
  };
  for (const r of filtered) {
    if (r.verdict === "verified") outcomes.verified++;
    else if (r.verdict === "agent_failure") outcomes.agentFailure++;
    else if (r.verdict === "false_confidence") outcomes.falseConfidence++;
    else if (r.verdict === "regression_failure") outcomes.regressionFailure++;
    else if (r.verification.patchApply.status === "error" || r.verification.patchApply.status === "timeout") outcomes.patchFailed++;
    else if (r.status === "timeout") outcomes.timeout++;
    else if (r.status === "error") outcomes.error++;
    else outcomes.error++;
  }

  const total = runs;
  const infraCount = filtered.filter(isInfraError).length;
  const validRuns = total - infraCount;
  const verified = outcomes.verified;

  const reproductionPassed = filtered.filter((r) => r.verification.reproduction.status === "passed").length;
  const oraclePassed = filtered.filter((r) => r.verification.oracle.status === "passed").length;
  const patchPassed = filtered.filter((r) => r.verification.patchApply.status === "passed").length;
  const regressionTested = filtered.filter((r) => r.verification.regression.status !== "skipped").length;
  const regressionPassed = filtered.filter((r) => r.verification.regression.status === "passed").length;

  const vfr = total === 0 ? null : (verified / total) * 100;
  const vfrValid = validRuns === 0 ? null : (verified / validRuns) * 100;

  const rates = {
    vfr,
    vfrValid,
    reproductionRate: pctOrNull(reproductionPassed, total),
    oraclePassRate: pctOrNull(oraclePassed, total),
    regressionFreeRate: regressionTested === 0 ? null : (regressionPassed / regressionTested) * 100,
    patchApplySuccessRate: pctOrNull(patchPassed, total),
    falseConfidenceRate: pctOrNull(outcomes.falseConfidence, total),
    agentFailureRate: pctOrNull(outcomes.agentFailure, total),
    regressionFailureRate: pctOrNull(outcomes.regressionFailure, total),
    timeoutRate: pctOrNull(outcomes.timeout + outcomes.patchFailed, total), // count patch timeout as timeout?
  };

  // Efficiency: collect numeric arrays where not null
  const costs = filtered.map((r) => r.cost?.totalCostUsd ?? r.cost?.costUsd ?? null).filter((v): v is number => v != null);
  const durations = filtered.map((r) => r.metrics?.durationMs ?? r.durationMs ?? null).filter((v): v is number => v != null);
  const turns = filtered.map((r) => r.metrics?.totalTurns ?? null).filter((v): v is number => v != null);
  const toolCalls = filtered.map((r) => r.metrics?.toolCalls ?? null).filter((v): v is number => v != null);
  const tokens = filtered.map((r) => r.metrics?.totalTokens ?? null).filter((v): v is number => v != null);
  const iterations = filtered.map((r) => r.metrics?.iterations ?? null).filter((v): v is number => v != null);

  const totalCostUsd = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) : null;

  const efficiency = {
    totalCostUsd,
    averageCostUsd: average(costs),
    medianCostUsd: median(costs),
    averageDurationMs: average(durations),
    medianDurationMs: median(durations),
    averageTurns: average(turns),
    medianTurns: median(turns),
    averageToolCalls: average(toolCalls),
    medianToolCalls: median(toolCalls),
    averageTokens: average(tokens),
    medianTokens: median(tokens),
    averageIterations: average(iterations),
    medianIterations: median(iterations),
    timeoutRate: rates.timeoutRate ?? 0,
  };

  return {
    agentVersion,
    runs,
    outcomes,
    rates,
    efficiency,
  };
}

export function computeAllAgentMetrics(results: EvaluationResult[]): AgentMetrics[] {
  const versions = [...new Set(results.map((r) => r.agentVersion))].sort();
  return versions.map((v) => computeAgentMetrics(results, v));
}

export function computeCaseBreakdown(results: EvaluationResult[]): CaseReportRow[] {
  // Group by caseId + agentVersion
  const map = new Map<string, EvaluationResult[]>();
  for (const r of results) {
    const key = `${r.caseId}::${r.agentVersion}`;
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  const rows: CaseReportRow[] = [];
  for (const [, group] of map.entries()) {
    const first = group[0]!;
    const caseId = first.caseId;
    const agentVersion = first.agentVersion;
    const difficulty = first.caseMeta?.difficulty;
    const categories = first.caseMeta?.categories;
    const category = categories?.[0];
    const runs = group.length;
    const verified = group.filter((r) => r.verdict === "verified").length;
    const agentFailures = group.filter((r) => r.verdict === "agent_failure").length;
    const falseConfidence = group.filter((r) => r.verdict === "false_confidence").length;
    const regressionFailures = group.filter((r) => r.verdict === "regression_failure").length;
    const timeouts = group.filter((r) => r.status === "timeout").length;
    const errors = group.filter((r) => r.status === "error" && !(r.verification.patchApply.status === "error" || r.verification.patchApply.status === "timeout")).length;
    const patchFailed = group.filter((r) => r.verification.patchApply.status === "error" || r.verification.patchApply.status === "timeout").length;
    const infra = group.filter(isInfraError).length;
    const vfr = runs === 0 ? null : (verified / runs) * 100;
    const vfrValid = runs - infra === 0 ? null : (verified / (runs - infra)) * 100;
    const consistency = runs === 0 ? null : (verified / runs) * 100;

    const costs = group.map((r) => r.cost?.totalCostUsd ?? r.cost?.costUsd ?? null).filter((v): v is number => v != null);
    const durations = group.map((r) => r.metrics?.durationMs ?? r.durationMs ?? null).filter((v): v is number => v != null);
    const turns = group.map((r) => r.metrics?.totalTurns ?? null).filter((v): v is number => v != null);
    const toolCalls = group.map((r) => r.metrics?.toolCalls ?? null).filter((v): v is number => v != null);
    const tokens = group.map((r) => r.metrics?.totalTokens ?? null).filter((v): v is number => v != null);

    rows.push({
      caseId,
      difficulty,
      category,
      categories,
      agentVersion,
      runs,
      verified,
      agentFailures,
      falseConfidence,
      regressionFailures,
      timeouts,
      errors,
      patchFailed,
      vfr,
      vfrValid,
      avgCost: average(costs),
      medianCost: median(costs),
      avgDuration: average(durations),
      medianDuration: median(durations),
      avgTurns: average(turns),
      avgToolCalls: average(toolCalls),
      avgTokens: average(tokens),
      consistency,
    });
  }
  rows.sort((a, b) => a.caseId.localeCompare(b.caseId) || a.agentVersion.localeCompare(b.agentVersion));
  return rows;
}

export function computeComparison(v0: AgentMetrics | null, v1: AgentMetrics | null): ComparisonRow[] | null {
  if (!v0 || !v1) return null;
  const rows: ComparisonRow[] = [];
  const push = (metric: string, v0v: number | null, v1v: number | null, unit: ComparisonRow["deltaUnit"]) => {
    const delta = v0v == null || v1v == null ? null : v1v - v0v;
    rows.push({ metric, v0: v0v, v1: v1v, delta, deltaUnit: unit });
  };
  push("VFR", v0.rates.vfr, v1.rates.vfr, "pp");
  push("VFR (valid)", v0.rates.vfrValid, v1.rates.vfrValid, "pp");
  push("Reproduction Rate", v0.rates.reproductionRate, v1.rates.reproductionRate, "pp");
  push("Oracle Pass Rate", v0.rates.oraclePassRate, v1.rates.oraclePassRate, "pp");
  push("Regression-Free Rate", v0.rates.regressionFreeRate, v1.rates.regressionFreeRate, "pp");
  push("False Confidence Rate", v0.rates.falseConfidenceRate, v1.rates.falseConfidenceRate, "pp");
  push("Agent Failure Rate", v0.rates.agentFailureRate, v1.rates.agentFailureRate, "pp");
  push("Timeout Rate", v0.rates.timeoutRate, v1.rates.timeoutRate, "pp");
  push("Avg Cost (USD)", v0.efficiency.averageCostUsd, v1.efficiency.averageCostUsd, "absolute");
  push("Median Cost (USD)", v0.efficiency.medianCostUsd, v1.efficiency.medianCostUsd, "absolute");
  push("Total Cost (USD)", v0.efficiency.totalCostUsd, v1.efficiency.totalCostUsd, "absolute");
  push("Avg Duration (ms)", v0.efficiency.averageDurationMs, v1.efficiency.averageDurationMs, "absolute");
  push("Median Duration (ms)", v0.efficiency.medianDurationMs, v1.efficiency.medianDurationMs, "absolute");
  push("Avg Turns", v0.efficiency.averageTurns, v1.efficiency.averageTurns, "absolute");
  push("Median Turns", v0.efficiency.medianTurns, v1.efficiency.medianTurns, "absolute");
  push("Avg Tool Calls", v0.efficiency.averageToolCalls, v1.efficiency.averageToolCalls, "absolute");
  push("Median Tool Calls", v0.efficiency.medianToolCalls, v1.efficiency.medianToolCalls, "absolute");
  push("Avg Tokens", v0.efficiency.averageTokens, v1.efficiency.averageTokens, "absolute");
  push("Median Tokens", v0.efficiency.medianTokens, v1.efficiency.medianTokens, "absolute");
  push("Avg Iterations", v0.efficiency.averageIterations, v1.efficiency.averageIterations, "absolute");
  return rows;
}

export function computeFailureAnalysis(results: EvaluationResult[]): FailureAnalysis {
  const agentFailures = results
    .filter((r) => r.verdict === "agent_failure")
    .map((r) => ({ runId: r.runId, caseId: r.caseId, agentVersion: r.agentVersion }));
  const falseConfidences = results
    .filter((r) => r.verdict === "false_confidence")
    .map((r) => ({ runId: r.runId, caseId: r.caseId, agentVersion: r.agentVersion }));
  const regressionFailures = results
    .filter((r) => r.verdict === "regression_failure")
    .map((r) => ({ runId: r.runId, caseId: r.caseId, agentVersion: r.agentVersion }));
  const timeouts = results
    .filter((r) => r.status === "timeout" || r.verification.patchApply.status === "timeout" || r.verification.reproduction.status === "timeout" || r.verification.oracle.status === "timeout" || r.verification.regression.status === "timeout")
    .map((r) => ({ runId: r.runId, caseId: r.caseId, agentVersion: r.agentVersion }));
  const infrastructureErrors = results
    .filter((r) => isInfraError(r))
    .map((r) => ({ runId: r.runId, caseId: r.caseId, agentVersion: r.agentVersion, code: r.error?.code }));

  // Deduplicate timeouts vs infra? Keep separate per spec never merge
  return {
    agentFailures,
    falseConfidences,
    regressionFailures,
    timeouts,
    infrastructureErrors,
  };
}

export function computeValidRunMetrics(results: EvaluationResult[]): { vfrOverall: number | null; vfrValid: number | null; total: number; valid: number; infraErrors: number } {
  const total = results.length;
  if (total === 0) return { vfrOverall: null, vfrValid: null, total: 0, valid: 0, infraErrors: 0 };
  const verified = results.filter((r) => r.verdict === "verified").length;
  const infra = results.filter(isInfraError).length;
  const valid = total - infra;
  return {
    vfrOverall: (verified / total) * 100,
    vfrValid: valid === 0 ? null : (verified / valid) * 100,
    total,
    valid,
    infraErrors: infra,
  };
}
