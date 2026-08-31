# Experiment Report — exp-2026-08-31-022252

> **Results are descriptive measurements from repeated runs, not statistically powered estimates.**
> With only 3 runs per case, small percentage differences are not statistically conclusive.

**Benchmark:** 0.5 `sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf`
**Evaluator:** `0.0.0`
**Experiment:** exp-2026-08-31-022252
**Runs Dir:** `C:\Users\cooll\Documents\code\frontier-verifier\experiments\runs`
**Timestamp:** 2026-08-31T01:29:57.719Z
**Total Runs:** 2 (valid 2, infra errors 0)

## Agent Versions

| Agent | Runs | VFR (overall) | VFR (valid) | Repro | Oracle | Regression-Free | FalseConf |
| --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | 1 | 100.00% | 100.00% | 100.00% | 100.00% | 100.00% | 0.00% |
| baseline-v0 | 1 | 100.00% | 100.00% | 100.00% | 100.00% | 100.00% | 0.00% |

## Primary Outcome

- **VFR (overall):** 100.00% (2/2) — verified / total
- **VFR (valid):** 100.00% (2/2) — verified / valid (excludes infra errors)
- **Reproduction Rate:** 100.00% (2/2)
- **Oracle Pass Rate:** 100.00% (2/2)
- **Regression-Free Rate:** 100.00% (2/2) — regression passed / tested
- **Patch-Apply Success:** 100.00%
- **False Confidence Rate:** 0.00% (0/2)

## Outcome Breakdown

| Outcome | Count | % (overall) |
| --- | --- | --- |
| verified | 2 | 100.00% |
| agent_failure | 0 | 0.00% |
| false_confidence | 0 | 0.00% |
| regression_failure | 0 | 0.00% |
| patch_failed | 0 | 0.00% |
| timeout (non-patch) | 0 | 0.00% |
| error (infra) | 0 | 0.00% |

## Failure Analysis

### Where improvement is needed — by category (never merged)

- **Agent failures** (repro still failing): 0 — _none_
- **False confidence** (repro pass / oracle fail): 0 — _none_
  → Demonstrates visible reproduction success ≠ correctness.
- **Regression failures** (oracle pass / regression fail): 0 — _none_
- **Timeouts**: 0 — _none_
- **Infrastructure errors**: 0 — _none_

## Efficiency Metrics (per agent)

| Agent | Avg Cost | Median Cost | Total Cost | Avg Duration | Median Duration | Avg Turns | Median Turns | Avg ToolCalls | Median ToolCalls | Avg Tokens | Median Tokens | Avg Iter | TimeoutRate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | `null` | `null` | `null` | 267536ms | 267536ms | 318.00 | 318.00 | 144.00 | 144.00 | `null` | `null` | 0.00 | 0.00% |
| baseline-v0 | `null` | `null` | `null` | 148404ms | 148404ms | 94.00 | 94.00 | 44.00 | 44.00 | `null` | `null` | 1.00 | 0.00% |

> Cost is `null`/`unavailable` when token usage not exposed by Pi 0.84.4. Pricing snapshot exists but never used to invent costs.

## Case-Level Breakdown

| Case | Difficulty | Category | Agent | Runs | Verified | AgentFail | FalseConf | RegFail | Timeouts | Errors | VFR | VFR(valid) | AvgCost | AvgDur | AvgTurns | AvgToolCalls | Consistency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| synth-001 | medium | state-management | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 267536ms | 318.00 | 144.00 | 100.00% |
| synth-001 | medium | state-management | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 148404ms | 94.00 | 44.00 | 100.00% |

## Comparative V0 vs V1

| Metric | V0 | V1 | Delta |
| --- | --- | --- | --- |
| VFR | 100.00% | 100.00% | +0.00 pp |
| VFR (valid) | 100.00% | 100.00% | +0.00 pp |
| Reproduction Rate | 100.00% | 100.00% | +0.00 pp |
| Oracle Pass Rate | 100.00% | 100.00% | +0.00 pp |
| Regression-Free Rate | 100.00% | 100.00% | +0.00 pp |
| False Confidence Rate | 0.00% | 0.00% | +0.00 pp |
| Agent Failure Rate | 0.00% | 0.00% | +0.00 pp |
| Timeout Rate | 0.00% | 0.00% | +0.00 pp |
| Avg Cost (USD) | `null` | `null` | `null` |
| Median Cost (USD) | `null` | `null` | `null` |
| Total Cost (USD) | `null` | `null` | `null` |
| Avg Duration (ms) | 148404.00 | 267536.00 | +119132.00 |
| Median Duration (ms) | 148404.00 | 267536.00 | +119132.00 |
| Avg Turns | 94.00 | 318.00 | +224.00 |
| Median Turns | 94.00 | 318.00 | +224.00 |
| Avg Tool Calls | 44.00 | 144.00 | +100.00 |
| Median Tool Calls | 44.00 | 144.00 | +100.00 |
| Avg Tokens | `null` | `null` | `null` |
| Median Tokens | `null` | `null` | `null` |
| Avg Iterations | 1.00 | 0.00 | -1.00 |

> Deltas for percentages are percentage-point changes (e.g., V0 50% → V1 66.7% = +16.7 pp), not relative % improvement.

## Reliability Across Repeated Runs

| Case | Runs | Verified | Consistency | Has Variance |
| --- | --- | --- | --- | --- |
| synth-001 | 2 | 2 | 100.00% | no |

All repeated cases deterministic (no variance).

## Historical vs Synthetic

| Type | Total | Verified | VFR | Oracle Rate | False Confidence |
| --- | --- | --- | --- | --- | --- |
| historical | 0 | 0 | 0.00% | 0.00% | 0.00% |
| synthetic | 2 | 2 | 100.00% | 100.00% | 0.00% |

## Difficulty Breakdown

| Difficulty | Total | Verified | VFR | Repro Rate | Oracle Rate |
| --- | --- | --- | --- | --- | --- |
| easy | 0 | 0 | 0.00% | 0.00% | 0.00% |
| medium | 2 | 2 | 100.00% | 100.00% | 100.00% |
| hard | 0 | 0 | 0.00% | 0.00% | 0.00% |

## Category Breakdown

| Category | Total | Verified | VFR | False Confidence |
| --- | --- | --- | --- | --- |
| business-logic | 2 | 2 | 100.00% | 0.00% |
| state-management | 2 | 2 | 100.00% | 0.00% |

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
| synth-001-run-001-808c47 | synth-001 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1790ms | `unav` | 318 |  | 0 |
| synth-001-run-001-a4c9d9 | synth-001 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1989ms | `unav` | 94 |  | 1 |

---
*Generated from executable evidence. Benchmark 0.5 sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf — Evaluator 0.0.0.*
