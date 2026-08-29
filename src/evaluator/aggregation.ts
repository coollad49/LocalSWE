import type { EvaluationResult, Verdict, AggregatedMetrics, FailureBreakdown, GroupMetrics, CaseStability } from "./types.ts";

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

  // Failure breakdown per §9 — mutually exclusive terminal outcomes
  const failureBreakdown: FailureBreakdown = emptyFailureBreakdown();
  for (const r of results) {
    if (r.verdict === "verified") failureBreakdown.verified++;
    else if (r.verdict === "agent_failure") failureBreakdown.agent_failure++;
    else if (r.verdict === "false_confidence") failureBreakdown.false_confidence++;
    else if (r.verdict === "regression_failure") failureBreakdown.regression_failure++;
    else if (r.verification.patchApply.status === "error" || r.verification.patchApply.status === "timeout") {
      // PATCH_FAILED includes both error and timeout at patch stage
      failureBreakdown.patch_failed++;
      // Also count timeout separately if patch timed out? Keep mutually exclusive: patch_failed takes precedence
      // For spec's TIMEOUT we only count non-patch timeouts
    } else if (r.status === "timeout") failureBreakdown.timeout++;
    else if (r.status === "error") failureBreakdown.error++;
    else {
      // Fallback to error if status completed but no verdict (should be rare)
      if (r.status === "completed" && !r.verdict) failureBreakdown.error++;
      else failureBreakdown.error++;
    }
  }

  // Denominators per spec §8
  const totalEligible = total; // total eligible runs
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
      // legacy aliases
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

/**
 * Compute group metrics for a subset of results. Percentages to two decimals raw (no rounding here).
 */
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
  // Deterministic sort
  stabilities.sort((a, b) => a.caseId.localeCompare(b.caseId));
  return stabilities;
}
