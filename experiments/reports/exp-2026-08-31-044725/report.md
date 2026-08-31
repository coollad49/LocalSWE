# Experiment Report — exp-2026-08-31-044725

> **Results are descriptive measurements from repeated runs, not statistically powered estimates.**
> With only 3 runs per case, small percentage differences are not statistically conclusive.

**Benchmark:** 0.5 `sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf`
**Evaluator:** `0.0.0`
**Experiment:** exp-2026-08-31-044725
**Runs Dir:** `C:\Users\cooll\Documents\code\frontier-verifier\experiments\runs`
**Timestamp:** 2026-08-31T03:49:41.600Z
**Total Runs:** 2 (valid 2, infra errors 0)

## Agent Versions

| Agent | Runs | VFR (overall) | VFR (valid) | Repro | Oracle | Regression-Free | FalseConf |
| --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | 1 | 100.00% | 100.00% | 100.00% | 100.00% | 100.00% | 0.00% |
| baseline-v0 | 1 | 0.00% | 0.00% | 0.00% | 0.00% | `null` | 0.00% |

## Primary Outcome

- **VFR (overall):** 50.00% (1/2) — verified / total
- **VFR (valid):** 50.00% (1/2) — verified / valid (excludes infra errors)
- **Reproduction Rate:** 50.00% (1/2)
- **Oracle Pass Rate:** 50.00% (1/2)
- **Regression-Free Rate:** 100.00% (1/1) — regression passed / tested
- **Patch-Apply Success:** 100.00%
- **False Confidence Rate:** 0.00% (0/2)

## Outcome Breakdown

| Outcome | Count | % (overall) |
| --- | --- | --- |
| verified | 1 | 50.00% |
| agent_failure | 1 | 50.00% |
| false_confidence | 0 | 0.00% |
| regression_failure | 0 | 0.00% |
| patch_failed | 0 | 0.00% |
| timeout (non-patch) | 0 | 0.00% |
| error (infra) | 0 | 0.00% |

## Failure Analysis

### Where improvement is needed — by category (never merged)

- **Agent failures** (repro still failing): 1 — synth-001 (check-4-1788103946175)
- **False confidence** (repro pass / oracle fail): 0 — _none_
  → Demonstrates visible reproduction success ≠ correctness.
- **Regression failures** (oracle pass / regression fail): 0 — _none_
- **Timeouts**: 0 — _none_
- **Infrastructure errors**: 0 — _none_

## Efficiency Metrics (per agent)

| Agent | Avg Cost | Median Cost | Total Cost | Avg Duration | Median Duration | Avg Turns | Median Turns | Avg ToolCalls | Median ToolCalls | Avg Tokens | Median Tokens | Avg Iter | TimeoutRate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | `null` | `null` | `null` | 129927ms | 129927ms | 82.00 | 82.00 | 36.00 | 36.00 | `null` | `null` | 3.00 | 0.00% |
| baseline-v0 | `null` | `null` | `null` | 10086ms | 10086ms | 2.00 | 2.00 | 5.00 | 5.00 | `null` | `null` | 1.00 | 0.00% |

> Cost is `null`/`unavailable` when token usage not exposed by Pi 0.84.4. Pricing snapshot exists but never used to invent costs.

## Case-Level Breakdown

| Case | Difficulty | Category | Agent | Runs | Verified | AgentFail | FalseConf | RegFail | Timeouts | Errors | VFR | VFR(valid) | AvgCost | AvgDur | AvgTurns | AvgToolCalls | Consistency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| synth-001 | medium | state-management | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 129927ms | 82.00 | 36.00 | 100.00% |
| synth-001 | medium | state-management | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 10086ms | 2.00 | 5.00 | 0.00% |

## Comparative V0 vs V1

| Metric | V0 | V1 | Delta |
| --- | --- | --- | --- |
| VFR | 0.00% | 100.00% | +100.00 pp |
| VFR (valid) | 0.00% | 100.00% | +100.00 pp |
| Reproduction Rate | 0.00% | 100.00% | +100.00 pp |
| Oracle Pass Rate | 0.00% | 100.00% | +100.00 pp |
| Regression-Free Rate | `null` | 100.00% | `null` |
| False Confidence Rate | 0.00% | 0.00% | +0.00 pp |
| Agent Failure Rate | 100.00% | 0.00% | -100.00 pp |
| Timeout Rate | 0.00% | 0.00% | +0.00 pp |
| Avg Cost (USD) | `null` | `null` | `null` |
| Median Cost (USD) | `null` | `null` | `null` |
| Total Cost (USD) | `null` | `null` | `null` |
| Avg Duration (ms) | 10086.00 | 129927.00 | +119841.00 |
| Median Duration (ms) | 10086.00 | 129927.00 | +119841.00 |
| Avg Turns | 2.00 | 82.00 | +80.00 |
| Median Turns | 2.00 | 82.00 | +80.00 |
| Avg Tool Calls | 5.00 | 36.00 | +31.00 |
| Median Tool Calls | 5.00 | 36.00 | +31.00 |
| Avg Tokens | `null` | `null` | `null` |
| Median Tokens | `null` | `null` | `null` |
| Avg Iterations | 1.00 | 3.00 | +2.00 |

> Deltas for percentages are percentage-point changes (e.g., V0 50% → V1 66.7% = +16.7 pp), not relative % improvement.

## Reliability Across Repeated Runs

| Case | Runs | Verified | Consistency | Has Variance |
| --- | --- | --- | --- | --- |
| synth-001 | 2 | 1 | 50.00% | YES |

**Unreliable cases (variance):** synth-001 (1/2 50.0%)

## Historical vs Synthetic

| Type | Total | Verified | VFR | Oracle Rate | False Confidence |
| --- | --- | --- | --- | --- | --- |
| historical | 0 | 0 | 0.00% | 0.00% | 0.00% |
| synthetic | 2 | 1 | 50.00% | 50.00% | 0.00% |

## Difficulty Breakdown

| Difficulty | Total | Verified | VFR | Repro Rate | Oracle Rate |
| --- | --- | --- | --- | --- | --- |
| easy | 0 | 0 | 0.00% | 0.00% | 0.00% |
| medium | 2 | 1 | 50.00% | 50.00% | 50.00% |
| hard | 0 | 0 | 0.00% | 0.00% | 0.00% |

## Category Breakdown

| Category | Total | Verified | VFR | False Confidence |
| --- | --- | --- | --- | --- |
| business-logic | 2 | 1 | 50.00% | 0.00% |
| state-management | 2 | 1 | 50.00% | 0.00% |

## Cost Methodology

- **Formula:** inputCost = inputTokens/1M * inputUsdPerMillion; outputCost = outputTokens/1M * outputUsdPerMillion; totalCost = inputCost+outputCost. If provider returns trustworthy cost, prefer provider cost and record source. If tokens unavailable, costUsd=null costStatus=unavailable, never $0.
- **Snapshot:** `v2026-08-30-snapshot` Experiment pricing snapshot — not live provider billing; historical reports remain reproducible via embedded snapshot. Rates are benchmark baselines for opencode-go/muse-spark-1.2-contributor.
  - `opencode-go/muse-spark-1.2-contributor`: input ${m.inputUsdPerMillionTokens}/M, output ${m.outputUsdPerMillionTokens}/M
- **Guardrail:** If `inputTokens` is null, evaluator outputs `costUsd: null`, `costStatus: "unavailable"` even if pricing exists. Never $0.00.
- **Source:** Prefer provider-returned trustworthy cost (`costSource: provider`) else computed (`costSource: computed`). Recorded per-run.

## Limitations & Confidence

- Results are descriptive measurements from repeated runs, not statistically powered estimates.
- With only 3 runs per case, small percentage differences are not statistically conclusive.
- Cost is null/unavailable when token usage not exposed by Pi 0.84.4; never assumed.
- VFR reported both overall (verified/total) and valid-agent-run (verified/valid) — see validRunRate.

## Per-Run Results

| Run | Case | Agent | Verdict | Patch | Repro | Oracle | Regression | Duration | Cost | Turns | Tokens | Iter |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| check-4-1788103946175 | synth-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1756ms | `unav` | 2 |  | 1 |
| synth-001-run-001-b91481 | synth-001 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1825ms | `unav` | 82 |  | 3 |

---
*Generated from executable evidence. Benchmark 0.5 sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf — Evaluator 0.0.0.*
