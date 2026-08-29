import type { ExperimentEvaluation, EvaluationResult, AggregatedMetrics } from "./types.ts";

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtCountPct(count: number, total: number, pct: number): string {
  return `${count}/${total} (${pct.toFixed(2)}%)`;
}

export function buildExperimentEvaluation(params: {
  benchmarkVersion: string;
  benchmarkFingerprint: string;
  experimentId: string;
  runsDir: string;
  totalRuns: number;
  results: EvaluationResult[];
  summary: AggregatedMetrics;
  historicalVsSynthetic: ExperimentEvaluation["breakdowns"]["historicalVsSynthetic"];
  byDifficulty: ExperimentEvaluation["breakdowns"]["byDifficulty"];
  byCategory: ExperimentEvaluation["breakdowns"]["byCategory"];
  stability: ExperimentEvaluation["stability"];
}): ExperimentEvaluation {
  return {
    benchmark: {
      version: params.benchmarkVersion,
      fingerprint: params.benchmarkFingerprint,
    },
    experiment: {
      id: params.experimentId,
      runsDir: params.runsDir,
      timestamp: new Date().toISOString(),
      totalRuns: params.totalRuns,
    },
    summary: params.summary,
    breakdowns: {
      historicalVsSynthetic: params.historicalVsSynthetic,
      byDifficulty: params.byDifficulty,
      byCategory: params.byCategory,
    },
    stability: params.stability,
    results: params.results,
  };
}

export function generateReportMarkdown(evalData: ExperimentEvaluation): string {
  const { benchmark, experiment, summary, breakdowns, stability, results } = evalData;
  const total = summary.total;
  const verified = summary.byVerdict.verified;
  const reproPassed = results.filter((r) => r.verification.reproduction.status === "passed").length;
  const oraclePassed = results.filter((r) => r.verification.oracle.status === "passed").length;
  const regressionPassed = results.filter((r) => r.verification.regression.status === "passed").length;
  const regressionTested = results.filter((r) => r.verification.regression.status !== "skipped").length;
  const falseConf = summary.byVerdict.false_confidence;

  // Primary comparison table values
  const vfrStr = `**${summary.rates.vfr.toFixed(2)}%** (${verified}/${total})`;
  const reproStr = `**${summary.rates.reproductionRate.toFixed(2)}%** (${reproPassed}/${total})`;
  const oracleStr = `**${summary.rates.oracleRate.toFixed(2)}%** (${oraclePassed}/${total})`;
  const regressionStr =
    regressionTested > 0
      ? `**${summary.rates.regressionFreeRate.toFixed(2)}%** (${regressionPassed}/${regressionTested})`
      : `**${summary.rates.regressionFreeRate.toFixed(2)}%** (${regressionPassed}/${total})`;
  const falseConfStr = `**${summary.rates.falseConfidenceRate.toFixed(2)}%** (${falseConf}/${total})`;

  const lines: string[] = [];
  lines.push(`# Baseline Evaluation Report — ${experiment.id}`);
  lines.push(``);
  lines.push(`**Benchmark:** ${benchmark.version} \`${benchmark.fingerprint}\``);
  lines.push(`**Experiment:** ${experiment.id}`);
  lines.push(`**Runs Dir:** \`${experiment.runsDir}\``);
  lines.push(`**Timestamp:** ${experiment.timestamp}`);
  lines.push(`**Total Runs:** ${total}`);
  lines.push(``);
  lines.push(`| Metric | Baseline v0 | V1 (Target) | Status |`);
  lines.push(`| --- | --- | --- | --- |`);
  lines.push(`| **Verified Fix Rate (VFR)** | ${vfrStr} | *Pending* | Primary Metric |`);
  lines.push(`| **Reproduction Success Rate** | ${reproStr} | *Pending* | Public Repro |`);
  lines.push(`| **Oracle Success Rate** | ${oracleStr} | *Pending* | Hidden Spec |`);
  lines.push(`| **Regression-Free Rate** | ${regressionStr} | *Pending* | No Side Effects |`);
  lines.push(`| **False Confidence Rate** | ${falseConfStr} | *Pending* | Repro Pass / Oracle Fail |`);
  lines.push(``);

  lines.push(`## Summary Metrics`);
  lines.push(``);
  lines.push(`- **Total Eligible Runs:** ${total}`);
  lines.push(`- **Completed:** ${summary.completed}  **Errors:** ${summary.errors}  **Timeouts:** ${summary.timeouts}`);
  lines.push(`- **VFR:** ${fmtPct(summary.rates.vfr)} (${verified}/${total})`);
  lines.push(`- **Reproduction Rate:** ${fmtPct(summary.rates.reproductionRate)} (${reproPassed}/${total})`);
  lines.push(`- **Oracle Rate:** ${fmtPct(summary.rates.oracleRate)} (${oraclePassed}/${total})`);
  lines.push(`- **Regression-Free Rate:** ${fmtPct(summary.rates.regressionFreeRate)} (${regressionPassed}/${regressionTested || total})`);
  lines.push(`- **False Confidence Rate:** ${fmtPct(summary.rates.falseConfidenceRate)} (${falseConf}/${total})`);
  lines.push(``);

  lines.push(`## Failure Breakdown`);
  lines.push(``);
  lines.push(`| Outcome | Count | Percentage |`);
  lines.push(`| --- | --- | --- |`);
  const fb = summary.failureBreakdown;
  const pct = (c: number) => (total === 0 ? 0 : (c / total) * 100);
  lines.push(`| VERIFIED | ${fb.verified} | ${pct(fb.verified).toFixed(2)}% |`);
  lines.push(`| AGENT_FAILURE | ${fb.agent_failure} | ${pct(fb.agent_failure).toFixed(2)}% |`);
  lines.push(`| FALSE_CONFIDENCE | ${fb.false_confidence} | ${pct(fb.false_confidence).toFixed(2)}% |`);
  lines.push(`| REGRESSION_FAILURE | ${fb.regression_failure} | ${pct(fb.regression_failure).toFixed(2)}% |`);
  lines.push(`| PATCH_FAILED | ${fb.patch_failed} | ${pct(fb.patch_failed).toFixed(2)}% |`);
  lines.push(`| TIMEOUT | ${fb.timeout} | ${pct(fb.timeout).toFixed(2)}% |`);
  lines.push(`| ERROR | ${fb.error} | ${pct(fb.error).toFixed(2)}% |`);
  lines.push(``);

  lines.push(`## Historical vs Synthetic`);
  lines.push(``);
  lines.push(`| Type | Total | Verified | VFR | Oracle Rate | False Confidence |`);
  lines.push(`| --- | --- | --- | --- | --- | --- |`);
  const h = breakdowns.historicalVsSynthetic.historical;
  const s = breakdowns.historicalVsSynthetic.synthetic;
  lines.push(`| historical | ${h.total} | ${h.verified} | ${h.vfr.toFixed(2)}% | ${h.oracleRate.toFixed(2)}% | ${h.falseConfidenceRate.toFixed(2)}% |`);
  lines.push(`| synthetic | ${s.total} | ${s.verified} | ${s.vfr.toFixed(2)}% | ${s.oracleRate.toFixed(2)}% | ${s.falseConfidenceRate.toFixed(2)}% |`);
  lines.push(``);

  lines.push(`## Difficulty Breakdown`);
  lines.push(``);
  lines.push(`| Difficulty | Total | Verified | VFR | Repro Rate | Oracle Rate |`);
  lines.push(`| --- | --- | --- | --- | --- | --- |`);
  for (const diff of ["easy", "medium", "hard"] as const) {
    const d = breakdowns.byDifficulty[diff];
    lines.push(`| ${diff} | ${d.total} | ${d.verified} | ${d.vfr.toFixed(2)}% | ${d.reproductionRate.toFixed(2)}% | ${d.oracleRate.toFixed(2)}% |`);
  }
  lines.push(``);

  lines.push(`## Category Breakdown`);
  lines.push(``);
  if (Object.keys(breakdowns.byCategory).length === 0) {
    lines.push(`_No category data (manifest categories missing)_`);
    lines.push(``);
  } else {
    lines.push(`| Category | Total | Verified | VFR | False Confidence |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const [cat, m] of Object.entries(breakdowns.byCategory)) {
      lines.push(`| ${cat} | ${m.total} | ${m.verified} | ${m.vfr.toFixed(2)}% | ${m.falseConfidenceRate.toFixed(2)}% |`);
    }
    lines.push(``);
  }

  lines.push(`## Case Stability`);
  lines.push(``);
  if (stability.length === 0) {
    lines.push(`_No stability data_`);
    lines.push(``);
  } else {
    lines.push(`| Case | Runs | Verified | Stability | Has Variance |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const cs of stability) {
      lines.push(`| ${cs.caseId} | ${cs.totalRuns} | ${cs.verifiedCount} | ${cs.stabilityRate.toFixed(2)}% | ${cs.hasVariance ? "YES" : "no"} |`);
    }
    lines.push(``);
    const varianceCases = stability.filter((c) => c.hasVariance);
    if (varianceCases.length > 0) {
      lines.push(`**Non-deterministic cases (variance):** ${varianceCases.map((c) => `${c.caseId} (${c.verifiedCount}/${c.totalRuns})`).join(", ")}`);
      lines.push(``);
    } else {
      lines.push(`All cases show deterministic outcomes (no variance).`);
      lines.push(``);
    }
  }

  lines.push(`## Per-Case Results`);
  lines.push(``);
  lines.push(`| Run | Case | Verdict | Patch | Repro | Oracle | Regression | Duration |`);
  lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const r of [...results].sort((a, b) => a.caseId.localeCompare(b.caseId) || a.runId.localeCompare(b.runId))) {
    const verdict = r.verdict ? r.verdict.toUpperCase() : r.status.toUpperCase();
    const patch = r.verification.patchApply.status.toUpperCase();
    const repro = r.verification.reproduction.status.toUpperCase();
    const oracle = r.verification.oracle.status.toUpperCase();
    const regression = r.verification.regression.status.toUpperCase();
    lines.push(`| ${r.runId} | ${r.caseId} | ${verdict} | ${patch} | ${repro} | ${oracle} | ${regression} | ${r.durationMs}ms |`);
  }
  lines.push(``);

  lines.push(`## What The Baseline Struggled With`);
  lines.push(``);
  // Observed vs Hypothesis separated
  lines.push(`### Observed`);
  lines.push(``);
  lines.push(`- False confidence occurred in ${falseConf}/${total} runs (${summary.rates.falseConfidenceRate.toFixed(2)}%).`);
  lines.push(`- Agent failure (reproduction still failing) in ${summary.byVerdict.agent_failure}/${total} runs (${(total ? (summary.byVerdict.agent_failure / total) * 100 : 0).toFixed(2)}%).`);
  lines.push(`- Regression failure in ${summary.byVerdict.regression_failure}/${total} runs (${(total ? (summary.byVerdict.regression_failure / total) * 100 : 0).toFixed(2)}%).`);
  lines.push(`- Patch failed to apply in ${fb.patch_failed}/${total} runs (${pct(fb.patch_failed).toFixed(2)}%).`);
  lines.push(`- Timeout/error in ${summary.timeouts + summary.errors}/${total} runs (${pct(summary.timeouts + summary.errors).toFixed(2)}%).`);
  if (breakdowns.historicalVsSynthetic.historical.total > 0 && breakdowns.historicalVsSynthetic.synthetic.total > 0) {
    const hv = breakdowns.historicalVsSynthetic.historical.vfr;
    const sv = breakdowns.historicalVsSynthetic.synthetic.vfr;
    lines.push(`- Historical VFR ${hv.toFixed(2)}% vs Synthetic VFR ${sv.toFixed(2)}% (delta ${(hv - sv).toFixed(2)}%).`);
  }
  const varCases = stability.filter((c) => c.hasVariance);
  if (varCases.length > 0) {
    lines.push(`- Non-deterministic variance observed in ${varCases.length} case(s): ${varCases.map((c) => `${c.caseId} ${c.verifiedCount}/${c.totalRuns}`).join(", ")}.`);
  } else if (stability.some((c) => c.totalRuns > 1)) {
    lines.push(`- No variance observed across repeated runs (all repeated cases deterministic).`);
  }
  // Category observation: find worst category
  const catEntries = Object.entries(breakdowns.byCategory);
  if (catEntries.length > 0) {
    const sortedByVfr = [...catEntries].sort((a, b) => a[1].vfr - b[1].vfr);
    if (sortedByVfr[0]) {
      lines.push(`- Lowest VFR category: \`${sortedByVfr[0][0]}\` at ${sortedByVfr[0][1].vfr.toFixed(2)}% (${sortedByVfr[0][1].verified}/${sortedByVfr[0][1].total}).`);
    }
  }
  lines.push(``);
  lines.push(`### Hypotheses`);
  lines.push(``);
  if (summary.rates.falseConfidenceRate > 10) {
    lines.push(`- The agent overfits to visible reproduction scripts without checking invariant boundaries (high false confidence).`);
  } else if (falseConf > 0) {
    lines.push(`- The agent satisfies the public repro but misses hidden edge cases captured by the oracle.`);
  } else {
    lines.push(`- No strong false-confidence signal; oracle alignment appears adequate for this sample.`);
  }
  if (summary.byVerdict.agent_failure > summary.byVerdict.verified) {
    lines.push(`- Primary blocker is diagnosis/reproduction: agent often fails to make reproduction pass, suggesting insufficient exploration or editing strategy.`);
  }
  if (summary.byVerdict.regression_failure > 0) {
    lines.push(`- Repairs that fix the target but break existing tests indicate lack of regression awareness before submission.`);
  }
  if (fb.patch_failed > 0) {
    lines.push(`- Some patches fail to apply cleanly against the buggy workspace, indicating diff context mismatches or malformed diffs.`);
  }
  if (varCases.length > 0) {
    lines.push(`- Non-determinism suggests flaky agent behavior or timing-sensitive repairs; recommend fixed seeds and deterministic prompting.`);
  }
  lines.push(`- Sample size is ${total} runs; breakdowns by difficulty/category should be interpreted with caution until more runs per case are collected.`);
  lines.push(``);

  lines.push(`## Recommended V1 Focus`);
  lines.push(``);
  lines.push(`1. **Test-driven feedback loop:** After each edit, automatically run \`public/reproduce.ts\` and surface output to the agent before considering the fix done.`);
  lines.push(`2. **Oracle-inspired edge-case synthesis:** Generate additional invariant checks for the changed function (e.g., property-based tests for state-management and validation categories) before finalizing.`);
  lines.push(`3. **Regression guardrail:** Run \`tests/\` suite after reproduction passes; if regression fails, feed failures back to the agent for iterative repair.`);
  lines.push(`4. **Patch hygiene:** Ensure diffs are generated via \`git diff HEAD --whitespace=nowarn\` from a clean buggy baseline commit to avoid hunk rejections.`);
  if (summary.rates.falseConfidenceRate > 10) {
    lines.push(`5. **Visible-vs-hidden parity:** Add a small hidden-test proxy (e.g., second reproduction variant) that the agent can optionally run locally without exposing oracle source.`);
  }
  if (breakdowns.byCategory["validation"] && breakdowns.byCategory["validation"].vfr < 50) {
    lines.push(`6. **Category focus — validation:** Historical validation bugs (alias handling, prototype pollution) show low VFR; prioritize careful input-parsing review.`);
  }
  lines.push(`7. **Repeated-trial analysis:** Run 3 trials per case to measure stability; prioritize cases with variance for deeper debugging.`);
  lines.push(``);

  lines.push(`---`);
  lines.push(`*Generated from executable evidence. Benchmark ${benchmark.version} ${benchmark.fingerprint}.*`);
  lines.push(``);

  return lines.join("\n");
}
