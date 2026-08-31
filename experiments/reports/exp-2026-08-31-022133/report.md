# Experiment Report — exp-2026-08-31-022133

> **Results are descriptive measurements from repeated runs, not statistically powered estimates.**
> With only 3 runs per case, small percentage differences are not statistically conclusive.

**Benchmark:** 0.5 `sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf`
**Evaluator:** `0.0.0`
**Experiment:** exp-2026-08-31-022133
**Runs Dir:** `C:\Users\cooll\Documents\code\frontier-verifier\experiments\runs`
**Timestamp:** 2026-08-31T01:21:57.563Z
**Total Runs:** 6 (valid 6, infra errors 0)

## Agent Versions

| Agent | Runs | VFR (overall) | VFR (valid) | Repro | Oracle | Regression-Free | FalseConf |
| --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | 3 | 0.00% | 0.00% | 0.00% | 0.00% | `null` | 0.00% |
| baseline-v0 | 3 | 0.00% | 0.00% | 0.00% | 0.00% | `null` | 0.00% |

## Primary Outcome

- **VFR (overall):** 0.00% (0/6) — verified / total
- **VFR (valid):** 0.00% (0/6) — verified / valid (excludes infra errors)
- **Reproduction Rate:** 0.00% (0/6)
- **Oracle Pass Rate:** 0.00% (0/6)
- **Regression-Free Rate:** 0.00% (0/6) — regression passed / tested
- **Patch-Apply Success:** 100.00%
- **False Confidence Rate:** 0.00% (0/6)

## Outcome Breakdown

| Outcome | Count | % (overall) |
| --- | --- | --- |
| verified | 0 | 0.00% |
| agent_failure | 6 | 100.00% |
| false_confidence | 0 | 0.00% |
| regression_failure | 0 | 0.00% |
| patch_failed | 0 | 0.00% |
| timeout (non-patch) | 0 | 0.00% |
| error (infra) | 0 | 0.00% |

## Failure Analysis

### Where improvement is needed — by category (never merged)

- **Agent failures** (repro still failing): 6 — hist-001 (hist-001-run-001-0f9e67), synth-001 (synth-001-run-001-99c9c4), synth-002 (synth-002-run-001-7b51ec), hist-001 (hist-001-run-001-73356f), synth-001 (synth-001-run-001-7f63d2), synth-002 (synth-002-run-001-c2e896)
- **False confidence** (repro pass / oracle fail): 0 — _none_
  → Demonstrates visible reproduction success ≠ correctness.
- **Regression failures** (oracle pass / regression fail): 0 — _none_
- **Timeouts**: 0 — _none_
- **Infrastructure errors**: 0 — _none_

## Efficiency Metrics (per agent)

| Agent | Avg Cost | Median Cost | Total Cost | Avg Duration | Median Duration | Avg Turns | Median Turns | Avg ToolCalls | Median ToolCalls | Avg Tokens | Median Tokens | Avg Iter | TimeoutRate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | `null` | `null` | `null` | 2245ms | 2292ms | 7.00 | 7.00 | 5.00 | 5.00 | `null` | `null` | 0.00 | 0.00% |
| baseline-v0 | `null` | `null` | `null` | 894ms | 975ms | 2.00 | 2.00 | 5.00 | 5.00 | `null` | `null` | 1.00 | 0.00% |

> Cost is `null`/`unavailable` when token usage not exposed by Pi 0.84.4. Pricing snapshot exists but never used to invent costs.

## Case-Level Breakdown

| Case | Difficulty | Category | Agent | Runs | Verified | AgentFail | FalseConf | RegFail | Timeouts | Errors | VFR | VFR(valid) | AvgCost | AvgDur | AvgTurns | AvgToolCalls | Consistency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hist-001 | medium | validation | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 2012ms | 7.00 | 5.00 | 0.00% |
| hist-001 | medium | validation | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 467ms | 2.00 | 5.00 | 0.00% |
| synth-001 | medium | state-management | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 2430ms | 7.00 | 5.00 | 0.00% |
| synth-001 | medium | state-management | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 1241ms | 2.00 | 5.00 | 0.00% |
| synth-002 | easy | validation | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 2292ms | 7.00 | 5.00 | 0.00% |
| synth-002 | easy | validation | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 975ms | 2.00 | 5.00 | 0.00% |

## Comparative V0 vs V1

| Metric | V0 | V1 | Delta |
| --- | --- | --- | --- |
| VFR | 0.00% | `null` | `null` |
| VFR (valid) | 0.00% | `null` | `null` |
| Reproduction Rate | 0.00% | `null` | `null` |
| Oracle Pass Rate | 0.00% | `null` | `null` |
| Regression-Free Rate | `null` | `null` | `null` |
| False Confidence Rate | 0.00% | `null` | `null` |
| Agent Failure Rate | 100.00% | `null` | `null` |
| Timeout Rate | 0.00% | `null` | `null` |
| Avg Cost (USD) | `null` | `null` | `null` |
| Median Cost (USD) | `null` | `null` | `null` |
| Total Cost (USD) | `null` | `null` | `null` |
| Avg Duration (ms) | 894.33 | `null` | `null` |
| Median Duration (ms) | 975.00 | `null` | `null` |
| Avg Turns | 2.00 | `null` | `null` |
| Median Turns | 2.00 | `null` | `null` |
| Avg Tool Calls | 5.00 | `null` | `null` |
| Median Tool Calls | 5.00 | `null` | `null` |
| Avg Tokens | `null` | `null` | `null` |
| Median Tokens | `null` | `null` | `null` |
| Avg Iterations | 1.00 | `null` | `null` |

> Deltas for percentages are percentage-point changes (e.g., V0 50% → V1 66.7% = +16.7 pp), not relative % improvement.

## Reliability Across Repeated Runs

| Case | Runs | Verified | Consistency | Has Variance |
| --- | --- | --- | --- | --- |
| hist-001 | 2 | 0 | 0.00% | no |
| synth-001 | 2 | 0 | 0.00% | no |
| synth-002 | 2 | 0 | 0.00% | no |

All repeated cases deterministic (no variance).

## Historical vs Synthetic

| Type | Total | Verified | VFR | Oracle Rate | False Confidence |
| --- | --- | --- | --- | --- | --- |
| historical | 2 | 0 | 0.00% | 0.00% | 0.00% |
| synthetic | 4 | 0 | 0.00% | 0.00% | 0.00% |

## Difficulty Breakdown

| Difficulty | Total | Verified | VFR | Repro Rate | Oracle Rate |
| --- | --- | --- | --- | --- | --- |
| easy | 2 | 0 | 0.00% | 0.00% | 0.00% |
| medium | 4 | 0 | 0.00% | 0.00% | 0.00% |
| hard | 0 | 0 | 0.00% | 0.00% | 0.00% |

## Category Breakdown

| Category | Total | Verified | VFR | False Confidence |
| --- | --- | --- | --- | --- |
| business-logic | 4 | 0 | 0.00% | 0.00% |
| parsing | 2 | 0 | 0.00% | 0.00% |
| state-management | 2 | 0 | 0.00% | 0.00% |
| validation | 4 | 0 | 0.00% | 0.00% |

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
| hist-001-run-001-0f9e67 | hist-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1807ms | `unav` | 2 |  | 1 |
| hist-001-run-001-73356f | hist-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1437ms | `unav` | 7 |  | 0 |
| synth-001-run-001-7f63d2 | synth-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2915ms | `unav` | 7 |  | 0 |
| synth-001-run-001-99c9c4 | synth-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1865ms | `unav` | 2 |  | 1 |
| synth-002-run-001-7b51ec | synth-002 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1510ms | `unav` | 2 |  | 1 |
| synth-002-run-001-c2e896 | synth-002 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1983ms | `unav` | 7 |  | 0 |

---
*Generated from executable evidence. Benchmark 0.5 sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf — Evaluator 0.0.0.*
