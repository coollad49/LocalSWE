import type {
  ExperimentEvaluation,
  ExperimentReport,
  EvaluationResult,
  AggregatedMetrics,
  AgentMetrics,
  CaseReportRow,
  ComparisonRow,
  SummaryJson,
} from "./types.ts";
import { loadPricingConfig } from "./pricing.ts";
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function fmtPct(n: number | null): string {
  if (n == null) return "`null`";
  return `${n.toFixed(2)}%`;
}

function fmtNum(n: number | null, digits = 2): string {
  if (n == null) return "`null`";
  return n.toFixed(digits);
}

function fmtCost(n: number | null): string {
  if (n == null) return "`null`";
  return `$${n.toFixed(4)}`;
}

function fmtCountPct(count: number, total: number, pct: number): string {
  return `${count}/${total} (${pct.toFixed(2)}%)`;
}

function getEvaluatorVersion(): string {
  try {
    const raw = readFileSync(join(ROOT, "package.json"), "utf-8");
    const j = JSON.parse(raw) as { version?: string };
    return j.version ?? "0.0.0";
  } catch {
    return "unknown";
  }
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
    results: [...params.results].sort((a, b) => a.caseId.localeCompare(b.caseId) || a.runId.localeCompare(b.runId)),
  };
}

export function buildExperimentReport(params: {
  benchmarkVersion: string;
  benchmarkFingerprint: string;
  experimentId: string;
  runsDir: string;
  totalRuns: number;
  elapsedMs?: number;
  results: EvaluationResult[];
  summary: AggregatedMetrics;
  historicalVsSynthetic: ExperimentEvaluation["breakdowns"]["historicalVsSynthetic"];
  byDifficulty: ExperimentEvaluation["breakdowns"]["byDifficulty"];
  byCategory: ExperimentEvaluation["breakdowns"]["byCategory"];
  stability: ExperimentEvaluation["stability"];
  agents: AgentMetrics[];
  caseBreakdown: CaseReportRow[];
  comparison: ComparisonRow[] | null;
  failures: ExperimentReport["failures"];
  pricingSnapshot: ExperimentReport["costMethodology"]["pricingSnapshot"];
  timestamp?: string;
}): ExperimentReport {
  const evaluatorVersion = getEvaluatorVersion();
  const validRun = computeValidMetrics(params.results);
  // Sort results deterministically
  const sortedResults = [...params.results].sort((a, b) => a.caseId.localeCompare(b.caseId) || a.runId.localeCompare(b.runId));
  const sortedAgents = [...params.agents].sort((a, b) => a.agentVersion.localeCompare(b.agentVersion));
  const sortedCaseBreakdown = [...params.caseBreakdown].sort((a, b) => a.caseId.localeCompare(b.caseId) || a.agentVersion.localeCompare(b.agentVersion));
  const costMethodology = {
    pricingSnapshot: params.pricingSnapshot,
    costCalculation: "inputCost = inputTokens/1M * inputUsdPerMillion; outputCost = outputTokens/1M * outputUsdPerMillion; totalCost = inputCost+outputCost. If provider returns trustworthy cost, prefer provider cost and record source. If tokens unavailable, costUsd=null costStatus=unavailable, never $0.",
    note: params.pricingSnapshot ? `Pricing snapshot version ${params.pricingSnapshot.version}: ${params.pricingSnapshot.description ?? ""}` : "No pricing config found — all costs unavailable.",
  };
  const limitations = [
    "Results are descriptive measurements from repeated runs, not statistically powered estimates.",
    "With only 3 runs per case, small percentage differences are not statistically conclusive.",
    "Cost is null/unavailable when token usage not exposed by Pi 0.84.4; never assumed.",
    "VFR reported both overall (verified/total) and valid-agent-run (verified/valid) — see validRunRate.",
  ];
  return {
    experiment: {
      id: params.experimentId,
      runsDir: params.runsDir,
      timestamp: params.timestamp ?? new Date().toISOString(),
      totalRuns: params.totalRuns,
      elapsedMs: params.elapsedMs,
    },
    benchmark: {
      version: params.benchmarkVersion,
      fingerprint: params.benchmarkFingerprint,
    },
    evaluatorVersion,
    agents: sortedAgents,
    summary: params.summary,
    breakdowns: {
      historicalVsSynthetic: params.historicalVsSynthetic,
      byDifficulty: params.byDifficulty,
      byCategory: params.byCategory,
    },
    stability: [...params.stability].sort((a, b) => a.caseId.localeCompare(b.caseId)),
    caseBreakdown: sortedCaseBreakdown,
    comparison: params.comparison,
    failures: params.failures,
    costMethodology,
    limitations,
    results: sortedResults,
    validRunRate: validRun,
  };
}

function computeValidMetrics(results: EvaluationResult[]): ExperimentReport["validRunRate"] {
  const total = results.length;
  const verified = results.filter((r) => r.verdict === "verified").length;
  const infra = results.filter((r) => (r.status === "error" || r.status === "timeout") && !r.verdict).length;
  const valid = total - infra;
  return {
    vfrOverall: total === 0 ? null : (verified / total) * 100,
    vfrValid: valid === 0 ? null : (verified / valid) * 100,
    total,
    valid,
    infraErrors: infra,
  };
}

export function generateSummaryJson(report: ExperimentReport): SummaryJson {
  return {
    experimentId: report.experiment.id,
    benchmark: report.benchmark,
    evaluatorVersion: report.evaluatorVersion,
    timestamp: report.experiment.timestamp,
    totalRuns: report.experiment.totalRuns,
    agents: report.agents.map((a) => ({
      agentVersion: a.agentVersion,
      runs: a.runs,
      vfr: a.rates.vfr,
      vfrValid: a.rates.vfrValid,
      avgCost: a.efficiency.averageCostUsd,
      medianCost: a.efficiency.medianCostUsd,
      avgDuration: a.efficiency.averageDurationMs,
      medianDuration: a.efficiency.medianDurationMs,
    })),
    comparison: report.comparison,
    limitations: report.limitations,
  };
}

// Legacy markdown for ExperimentEvaluation (keep backwards compatibility)
export function generateReportMarkdown(evalData: ExperimentEvaluation | ExperimentReport): string {
  // Dispatch based on shape
  if ("agents" in evalData && "caseBreakdown" in evalData) {
    return generateExperimentReportMarkdown(evalData as ExperimentReport);
  }
  return generateLegacyReportMarkdown(evalData as ExperimentEvaluation);
}

function generateLegacyReportMarkdown(evalData: ExperimentEvaluation): string {
  const { benchmark, experiment, summary, breakdowns, stability, results } = evalData;
  const total = summary.total;
  const verified = summary.byVerdict.verified;
  const reproPassed = results.filter((r) => r.verification.reproduction.status === "passed").length;
  const oraclePassed = results.filter((r) => r.verification.oracle.status === "passed").length;
  const regressionPassed = results.filter((r) => r.verification.regression.status === "passed").length;
  const regressionTested = results.filter((r) => r.verification.regression.status !== "skipped").length;
  const falseConf = summary.byVerdict.false_confidence;

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

function generateExperimentReportMarkdown(report: ExperimentReport): string {
  const { benchmark, experiment, summary, breakdowns, stability, results, agents, caseBreakdown, comparison, failures, costMethodology, limitations } = report;
  const total = summary.total;
  const verified = summary.byVerdict.verified;
  const reproPassed = results.filter((r) => r.verification.reproduction.status === "passed").length;
  const oraclePassed = results.filter((r) => r.verification.oracle.status === "passed").length;
  const regressionPassed = results.filter((r) => r.verification.regression.status === "passed").length;
  const regressionTested = results.filter((r) => r.verification.regression.status !== "skipped").length;
  const falseConf = summary.byVerdict.false_confidence;
  const valid = report.validRunRate;

  const lines: string[] = [];
  lines.push(`# Experiment Report — ${experiment.id}`);
  lines.push(``);
  lines.push(`> **Results are descriptive measurements from repeated runs, not statistically powered estimates.**`);
  lines.push(`> With only 3 runs per case, small percentage differences are not statistically conclusive.`);
  lines.push(``);
  lines.push(`**Benchmark:** ${benchmark.version} \`${benchmark.fingerprint}\``);
  lines.push(`**Evaluator:** \`${report.evaluatorVersion}\``);
  lines.push(`**Experiment:** ${experiment.id}`);
  lines.push(`**Runs Dir:** \`${experiment.runsDir}\``);
  lines.push(`**Timestamp:** ${experiment.timestamp}`);
  lines.push(`**Total Runs:** ${total} (valid ${valid?.valid ?? total}, infra errors ${valid?.infraErrors ?? 0})`);
  if (experiment.elapsedMs != null) lines.push(`**Elapsed:** ${experiment.elapsedMs}ms`);
  lines.push(``);

  // Agents overview
  lines.push(`## Agent Versions`);
  lines.push(``);
  if (agents.length === 0) {
    lines.push(`_No agent data (zero runs)_`);
    lines.push(``);
  } else {
    lines.push(`| Agent | Runs | VFR (overall) | VFR (valid) | Repro | Oracle | Regression-Free | FalseConf |`);
    lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
    for (const a of agents) {
      lines.push(
        `| ${a.agentVersion} | ${a.runs} | ${fmtPct(a.rates.vfr)} | ${fmtPct(a.rates.vfrValid)} | ${fmtPct(a.rates.reproductionRate)} | ${fmtPct(a.rates.oraclePassRate)} | ${fmtPct(a.rates.regressionFreeRate)} | ${fmtPct(a.rates.falseConfidenceRate)} |`,
      );
    }
    lines.push(``);
  }

  // Primary metrics (overall)
  const vfrOverall = valid ? fmtPct(valid.vfrOverall) : fmtPct(summary.rates.vfr);
  const vfrValidStr = valid ? fmtPct(valid.vfrValid) : "`null`";
  lines.push(`## Primary Outcome`);
  lines.push(``);
  lines.push(`- **VFR (overall):** ${vfrOverall} (${verified}/${total}) — verified / total`);
  lines.push(`- **VFR (valid):** ${vfrValidStr} (${verified}/${valid?.valid ?? total}) — verified / valid (excludes infra errors)`);
  lines.push(`- **Reproduction Rate:** ${fmtPct(summary.rates.reproductionRate)} (${reproPassed}/${total})`);
  lines.push(`- **Oracle Pass Rate:** ${fmtPct(summary.rates.oracleRate)} (${oraclePassed}/${total})`);
  lines.push(`- **Regression-Free Rate:** ${fmtPct(summary.rates.regressionFreeRate)} (${regressionPassed}/${regressionTested || total}) — regression passed / tested`);
  lines.push(`- **Patch-Apply Success:** ${fmtPct(agents[0]?.rates.patchApplySuccessRate ?? null)}`);
  lines.push(`- **False Confidence Rate:** ${fmtPct(summary.rates.falseConfidenceRate)} (${falseConf}/${total})`);
  lines.push(``);

  // Outcome breakdown
  lines.push(`## Outcome Breakdown`);
  lines.push(``);
  lines.push(`| Outcome | Count | % (overall) |`);
  lines.push(`| --- | --- | --- |`);
  const fb = summary.failureBreakdown;
  const pct = (c: number) => (total === 0 ? 0 : (c / total) * 100);
  lines.push(`| verified | ${fb.verified} | ${pct(fb.verified).toFixed(2)}% |`);
  lines.push(`| agent_failure | ${fb.agent_failure} | ${pct(fb.agent_failure).toFixed(2)}% |`);
  lines.push(`| false_confidence | ${fb.false_confidence} | ${pct(fb.false_confidence).toFixed(2)}% |`);
  lines.push(`| regression_failure | ${fb.regression_failure} | ${pct(fb.regression_failure).toFixed(2)}% |`);
  lines.push(`| patch_failed | ${fb.patch_failed} | ${pct(fb.patch_failed).toFixed(2)}% |`);
  lines.push(`| timeout (non-patch) | ${fb.timeout} | ${pct(fb.timeout).toFixed(2)}% |`);
  lines.push(`| error (infra) | ${fb.error} | ${pct(fb.error).toFixed(2)}% |`);
  lines.push(``);

  // Failure analysis
  lines.push(`## Failure Analysis`);
  lines.push(``);
  lines.push(`### Where improvement is needed — by category (never merged)`);
  lines.push(``);
  lines.push(`- **Agent failures** (repro still failing): ${failures.agentFailures.length} — ${failures.agentFailures.map((f) => `${f.caseId} (${f.runId})`).join(", ") || "_none_"}`);
  lines.push(`- **False confidence** (repro pass / oracle fail): ${failures.falseConfidences.length} — ${failures.falseConfidences.map((f) => `${f.caseId} (${f.runId})`).join(", ") || "_none_"}`);
  lines.push(`  → Demonstrates visible reproduction success ≠ correctness.`);
  lines.push(`- **Regression failures** (oracle pass / regression fail): ${failures.regressionFailures.length} — ${failures.regressionFailures.map((f) => `${f.caseId} (${f.runId})`).join(", ") || "_none_"}`);
  lines.push(`- **Timeouts**: ${failures.timeouts.length} — ${failures.timeouts.map((f) => `${f.caseId} (${f.runId})`).join(", ") || "_none_"}`);
  lines.push(`- **Infrastructure errors**: ${failures.infrastructureErrors.length} — ${failures.infrastructureErrors.map((f) => `${f.caseId} (${f.runId})${f.code ? ` ${f.code}` : ""}`).join(", ") || "_none_"}`);
  lines.push(``);

  // Efficiency metrics per agent
  lines.push(`## Efficiency Metrics (per agent)`);
  lines.push(``);
  if (agents.length === 0) {
    lines.push(`_No efficiency data_`);
    lines.push(``);
  } else {
    lines.push(`| Agent | Avg Cost | Median Cost | Total Cost | Avg Duration | Median Duration | Avg Turns | Median Turns | Avg ToolCalls | Median ToolCalls | Avg Tokens | Median Tokens | Avg Iter | TimeoutRate |`);
    lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
    for (const a of agents) {
      const e = a.efficiency;
      lines.push(
        `| ${a.agentVersion} | ${fmtCost(e.averageCostUsd)} | ${fmtCost(e.medianCostUsd)} | ${fmtCost(e.totalCostUsd)} | ${e.averageDurationMs != null ? `${e.averageDurationMs.toFixed(0)}ms` : "`null`"} | ${e.medianDurationMs != null ? `${e.medianDurationMs.toFixed(0)}ms` : "`null`"} | ${fmtNum(e.averageTurns)} | ${fmtNum(e.medianTurns)} | ${fmtNum(e.averageToolCalls)} | ${fmtNum(e.medianToolCalls)} | ${fmtNum(e.averageTokens)} | ${fmtNum(e.medianTokens)} | ${fmtNum(e.averageIterations)} | ${fmtPct(e.timeoutRate)} |`,
      );
    }
    lines.push(``);
    const anyNull = agents.some((a) => a.efficiency.averageCostUsd == null);
    if (anyNull) lines.push(`> Cost is \`null\`/\`unavailable\` when token usage not exposed by Pi 0.84.4. Pricing snapshot exists but never used to invent costs.`);
    lines.push(``);
  }

  // Case-level breakdown
  lines.push(`## Case-Level Breakdown`);
  lines.push(``);
  if (caseBreakdown.length === 0) {
    lines.push(`_No case data_`);
    lines.push(``);
  } else {
    lines.push(`| Case | Difficulty | Category | Agent | Runs | Verified | AgentFail | FalseConf | RegFail | Timeouts | Errors | VFR | VFR(valid) | AvgCost | AvgDur | AvgTurns | AvgToolCalls | Consistency |`);
    lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
    for (const r of caseBreakdown) {
      lines.push(
        `| ${r.caseId} | ${r.difficulty ?? ""} | ${r.category ?? ""} | ${r.agentVersion} | ${r.runs} | ${r.verified} | ${r.agentFailures} | ${r.falseConfidence} | ${r.regressionFailures} | ${r.timeouts} | ${r.errors} | ${fmtPct(r.vfr)} | ${fmtPct(r.vfrValid)} | ${fmtCost(r.avgCost)} | ${r.avgDuration != null ? `${r.avgDuration.toFixed(0)}ms` : "`null`"} | ${fmtNum(r.avgTurns)} | ${fmtNum(r.avgToolCalls)} | ${fmtPct(r.consistency)} |`,
      );
    }
    lines.push(``);
  }

  // Comparison V0 vs V1
  if (comparison) {
    lines.push(`## Comparative V0 vs V1`);
    lines.push(``);
    lines.push(`| Metric | V0 | V1 | Delta |`);
    lines.push(`| --- | --- | --- | --- |`);
    for (const c of comparison) {
      const unit = c.deltaUnit === "pp" ? "pp" : "";
      const v0s = c.v0 == null ? "`null`" : c.metric.toLowerCase().includes("cost") ? fmtCost(c.v0) : c.metric.toLowerCase().includes("rate") || c.metric.includes("VFR") ? fmtPct(c.v0) : fmtNum(c.v0);
      const v1s = c.v1 == null ? "`null`" : c.metric.toLowerCase().includes("cost") ? fmtCost(c.v1) : c.metric.toLowerCase().includes("rate") || c.metric.includes("VFR") ? fmtPct(c.v1) : fmtNum(c.v1);
      const ds = c.delta == null ? "`null`" : c.deltaUnit === "pp" ? `${c.delta >= 0 ? "+" : ""}${c.delta.toFixed(2)} pp` : `${c.delta >= 0 ? "+" : ""}${c.delta.toFixed(2)}`;
      lines.push(`| ${c.metric} | ${v0s} | ${v1s} | ${ds} |`);
    }
    lines.push(``);
    lines.push(`> Deltas for percentages are percentage-point changes (e.g., V0 50% → V1 66.7% = +16.7 pp), not relative % improvement.`);
    lines.push(``);
  } else if (agents.length === 1) {
    lines.push(`## Comparative V0 vs V1`);
    lines.push(``);
    lines.push(`_Single agent version present — comparison requires ≥2 versions (e.g., baseline-v0 and agent-v1). Run both and re-evaluate to populate this table._`);
    lines.push(``);
  }

  // Trajectory & Behavioral Analytics (Verdict Grouping & Tool Distributions)
  const runsWithTraj = results.filter((r) => r.trajectoryMetrics);
  if (runsWithTraj.length > 0) {
    lines.push(`## Trajectory & Behavioral Analytics`);
    lines.push(``);
    lines.push(`### Performance Grouped by Outcome`);
    lines.push(``);
    lines.push(`| Outcome | Runs | Avg Duration | Avg Tool Calls | Avg Thinking Chars | Avg Edits | Avg Tests | Avg Cost |`);
    lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- |`);

    const verdicts = ["verified", "agent_failure", "false_confidence", "regression_failure"];
    for (const v of verdicts) {
      const vRuns = runsWithTraj.filter((r) => r.verdict === v || (r.status === "error" && v === "agent_failure"));
      if (vRuns.length > 0) {
        const avgDur = vRuns.reduce((s, r) => s + (r.trajectoryMetrics?.trajectory.durationMs || r.durationMs), 0) / vRuns.length;
        const avgTools = vRuns.reduce((s, r) => s + (r.trajectoryMetrics?.tools.totalCalls || 0), 0) / vRuns.length;
        const avgThinking = vRuns.reduce((s, r) => s + (r.trajectoryMetrics?.thinking.characterCount || 0), 0) / vRuns.length;
        const avgEdits = vRuns.reduce((s, r) => s + ((r.trajectoryMetrics?.editing.editCalls || 0) + (r.trajectoryMetrics?.editing.writeCalls || 0)), 0) / vRuns.length;
        const avgTests = vRuns.reduce((s, r) => s + (r.trajectoryMetrics?.verification.testCommandCount || 0), 0) / vRuns.length;
        const costList = vRuns.map((r) => r.cost?.totalCostUsd).filter((c): c is number => typeof c === "number");
        const avgCost = costList.length > 0 ? costList.reduce((s, c) => s + c, 0) / costList.length : null;

        lines.push(`| ${v} | ${vRuns.length} | ${(avgDur / 1000).toFixed(1)}s | ${avgTools.toFixed(1)} | ${Math.round(avgThinking)} | ${avgEdits.toFixed(1)} | ${avgTests.toFixed(1)} | ${fmtCost(avgCost)} |`);
      }
    }
    lines.push(``);

    lines.push(`### Per-Run Tool & Resource Breakdown`);
    lines.push(``);
    lines.push(`| Case | Agent | Verdict | Duration | Cost | Reads | Edits | Bash | Tests | Repetitions | Thinking Chars | Expl/Edit Ratio |`);
    lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
    for (const r of [...runsWithTraj].sort((a, b) => a.caseId.localeCompare(b.caseId) || a.runId.localeCompare(b.runId))) {
      const tm = r.trajectoryMetrics!;
      const verdict = (r.verdict || r.status).toUpperCase();
      const dur = `${(tm.trajectory.durationMs / 1000).toFixed(1)}s`;
      const cost = r.cost?.totalCostUsd != null ? fmtCost(r.cost.totalCostUsd) : (r.cost?.costStatus === "unavailable" ? "`unav`" : "`null`");
      const reads = tm.exploration.readCalls;
      const edits = tm.editing.editCalls + tm.editing.writeCalls;
      const bash = tm.exploration.bashCalls;
      const tests = tm.verification.testCommandCount;
      const reps = tm.behavior.repeatedToolCalls;
      const thinking = tm.thinking.characterCount;
      const ratio = tm.exploration.explorationToEditingRatio != null ? `${tm.exploration.explorationToEditingRatio}x` : "—";

      lines.push(`| ${r.caseId} | ${r.agentVersion} | ${verdict} | ${dur} | ${cost} | ${reads} | ${edits} | ${bash} | ${tests} | ${reps} | ${thinking} | ${ratio} |`);
    }
    lines.push(``);
  }

  // Reliability across repeated runs (stability already)
  lines.push(`## Reliability Across Repeated Runs`);
  lines.push(``);
  if (stability.length === 0) {
    lines.push(`_No stability data_`);
    lines.push(``);
  } else {
    lines.push(`| Case | Runs | Verified | Consistency | Has Variance |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const cs of stability) {
      lines.push(`| ${cs.caseId} | ${cs.totalRuns} | ${cs.verifiedCount} | ${cs.stabilityRate.toFixed(2)}% | ${cs.hasVariance ? "YES" : "no"} |`);
    }
    lines.push(``);
    const varianceCases = stability.filter((c) => c.hasVariance);
    if (varianceCases.length > 0) {
      lines.push(`**Unreliable cases (variance):** ${varianceCases.map((c) => `${c.caseId} (${c.verifiedCount}/${c.totalRuns} ${c.stabilityRate.toFixed(1)}%)`).join(", ")}`);
      lines.push(``);
    } else if (stability.some((c) => c.totalRuns > 1)) {
      lines.push(`All repeated cases deterministic (no variance).`);
      lines.push(``);
    } else {
      lines.push(`Single run per case — run 3 trials per case to assess reliability.`);
      lines.push(``);
    }
  }

  // Historical vs synthetic etc (keep for compatibility)
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
    lines.push(`_No category data_`);
    lines.push(``);
  } else {
    lines.push(`| Category | Total | Verified | VFR | False Confidence |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const [cat, m] of Object.entries(breakdowns.byCategory)) {
      lines.push(`| ${cat} | ${m.total} | ${m.verified} | ${m.vfr.toFixed(2)}% | ${m.falseConfidenceRate.toFixed(2)}% |`);
    }
    lines.push(``);
  }

  // Cost methodology
  lines.push(`## Cost Methodology`);
  lines.push(``);
  lines.push(`- **Formula:** ${costMethodology.costCalculation}`);
  lines.push(`- **Snapshot:** ${costMethodology.pricingSnapshot ? `\`v${costMethodology.pricingSnapshot.version}\` ${costMethodology.pricingSnapshot.description ?? ""}` : costMethodology.note}`);
  if (costMethodology.pricingSnapshot) {
    for (const m of costMethodology.pricingSnapshot.models) {
      lines.push(`  - \`${m.model}\`: input \${m.inputUsdPerMillionTokens}/M, output \${m.outputUsdPerMillionTokens}/M`);
    }
  }
  lines.push(`- **Guardrail:** If \`inputTokens\` is null, evaluator outputs \`costUsd: null\`, \`costStatus: "unavailable"\` even if pricing exists. Never \$0.00.`);
  lines.push(`- **Source:** Prefer provider-returned trustworthy cost (\`costSource: provider\`) else computed (\`costSource: computed\`). Recorded per-run.`);
  lines.push(``);

  // Limitations
  lines.push(`## Limitations & Confidence`);
  lines.push(``);
  for (const l of limitations) lines.push(`- ${l}`);
  lines.push(``);

  // Per-case results
  lines.push(`## Per-Run Results`);
  lines.push(``);
  lines.push(`| Run | Case | Agent | Verdict | Patch | Repro | Oracle | Regression | Duration | Cost | Turns | Tokens | Iter |`);
  lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const r of [...results].sort((a, b) => a.caseId.localeCompare(b.caseId) || a.runId.localeCompare(b.runId))) {
    const verdict = r.verdict ? r.verdict.toUpperCase() : r.status.toUpperCase();
    const patch = r.verification.patchApply.status.toUpperCase();
    const repro = r.verification.reproduction.status.toUpperCase();
    const oracle = r.verification.oracle.status.toUpperCase();
    const regression = r.verification.regression.status.toUpperCase();
    const cost = r.cost?.totalCostUsd != null ? fmtCost(r.cost.totalCostUsd) : r.cost?.costStatus === "unavailable" ? "`unav`" : "`null`";
    const turns = r.metrics?.totalTurns != null ? String(r.metrics.totalTurns) : "";
    const tokens = r.metrics?.totalTokens != null ? String(r.metrics.totalTokens) : "";
    const iter = r.metrics?.iterations != null ? String(r.metrics.iterations) : "";
    lines.push(`| ${r.runId} | ${r.caseId} | ${r.agentVersion} | ${verdict} | ${patch} | ${repro} | ${oracle} | ${regression} | ${r.durationMs}ms | ${cost} | ${turns} | ${tokens} | ${iter} |`);
  }
  lines.push(``);

  lines.push(`---`);
  lines.push(`*Generated from executable evidence. Benchmark ${benchmark.version} ${benchmark.fingerprint} — Evaluator ${report.evaluatorVersion}.*`);
  lines.push(``);

  return lines.join("\n");
}
