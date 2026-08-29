import type { EvaluationResult, Verdict, AggregatedMetrics } from "./types.ts";

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

  const denominator = completed || total || 1;
  // VFR = verified / completed *100 (or total? spec says verified runs / completed agent runs)
  // Use completed as denominator when available, else total
  const vfrDenom = completed > 0 ? completed : total;
  const vfr = vfrDenom > 0 ? (byVerdict.verified / vfrDenom) * 100 : 0;

  const reproductionPassRate = denominator ? (results.filter((r) => r.verification.reproduction.status === "passed").length / denominator) * 100 : 0;
  const oraclePassRate = denominator ? (results.filter((r) => r.verification.oracle.status === "passed").length / denominator) * 100 : 0;
  const regressionPassRate = denominator ? (results.filter((r) => r.verification.regression.status === "passed").length / denominator) * 100 : 0;

  const agentFailureRate = vfrDenom ? (byVerdict.agent_failure / vfrDenom) * 100 : 0;
  const falseConfidenceRate = vfrDenom ? (byVerdict.false_confidence / vfrDenom) * 100 : 0;
  const regressionFailureRate = vfrDenom ? (byVerdict.regression_failure / vfrDenom) * 100 : 0;

  return {
    total,
    completed,
    errors,
    timeouts,
    byVerdict,
    rates: {
      vfr,
      reproductionPassRate,
      oraclePassRate,
      regressionPassRate,
      agentFailureRate,
      falseConfidenceRate,
      regressionFailureRate,
    },
  };
}

export function formatMetrics(m: AggregatedMetrics): string {
  const lines: string[] = [];
  lines.push(`Total: ${m.total} (completed=${m.completed} errors=${m.errors} timeouts=${m.timeouts})`);
  lines.push(`Verified: ${m.byVerdict.verified} — VFR ${m.rates.vfr.toFixed(1)}%`);
  lines.push(`Agent failure: ${m.byVerdict.agent_failure} (${m.rates.agentFailureRate.toFixed(1)}%)`);
  lines.push(`False confidence: ${m.byVerdict.false_confidence} (${m.rates.falseConfidenceRate.toFixed(1)}%)`);
  lines.push(`Regression failure: ${m.byVerdict.regression_failure} (${m.rates.regressionFailureRate.toFixed(1)}%)`);
  lines.push(`Repro pass: ${m.rates.reproductionPassRate.toFixed(1)}%  Oracle pass: ${m.rates.oraclePassRate.toFixed(1)}%  Regression pass: ${m.rates.regressionPassRate.toFixed(1)}%`);
  return lines.join("\n");
}
