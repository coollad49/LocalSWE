# Experiment Report — exp-2026-08-31-034428

> **Results are descriptive measurements from repeated runs, not statistically powered estimates.**
> With only 3 runs per case, small percentage differences are not statistically conclusive.

**Benchmark:** 0.5 `sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf`
**Evaluator:** `0.0.0`
**Experiment:** exp-2026-08-31-034428
**Runs Dir:** `C:\Users\cooll\Documents\code\frontier-verifier\experiments\runs`
**Timestamp:** 2026-08-31T03:19:15.910Z
**Total Runs:** 30 (valid 30, infra errors 0)

## Agent Versions

| Agent | Runs | VFR (overall) | VFR (valid) | Repro | Oracle | Regression-Free | FalseConf |
| --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | 13 | 53.85% | 53.85% | 61.54% | 53.85% | 100.00% | 7.69% |
| baseline-v0 | 17 | 82.35% | 82.35% | 82.35% | 82.35% | 100.00% | 0.00% |

## Primary Outcome

- **VFR (overall):** 70.00% (21/30) — verified / total
- **VFR (valid):** 70.00% (21/30) — verified / valid (excludes infra errors)
- **Reproduction Rate:** 73.33% (22/30)
- **Oracle Pass Rate:** 70.00% (21/30)
- **Regression-Free Rate:** 100.00% (21/21) — regression passed / tested
- **Patch-Apply Success:** 100.00%
- **False Confidence Rate:** 3.33% (1/30)

## Outcome Breakdown

| Outcome | Count | % (overall) |
| --- | --- | --- |
| verified | 21 | 70.00% |
| agent_failure | 8 | 26.67% |
| false_confidence | 1 | 3.33% |
| regression_failure | 0 | 0.00% |
| patch_failed | 0 | 0.00% |
| timeout (non-patch) | 0 | 0.00% |
| error (infra) | 0 | 0.00% |

## Failure Analysis

### Where improvement is needed — by category (never merged)

- **Agent failures** (repro still failing): 8 — hard-001 (hard-001-run-001-c5db09), hard-003 (hard-003-run-001-7ba7a9), hist-001 (hist-001-run-001-09514a), hard-001 (hard-001-run-001-214fa3), hard-002 (hard-002-run-001-a165f7), hard-003 (hard-003-run-001-737a2e), hard-004 (hard-004-run-001-229ddd), hist-001 (hist-001-run-001-663a4f)
- **False confidence** (repro pass / oracle fail): 1 — synth-006 (synth-006-run-001-f04458)
  → Demonstrates visible reproduction success ≠ correctness.
- **Regression failures** (oracle pass / regression fail): 0 — _none_
- **Timeouts**: 0 — _none_
- **Infrastructure errors**: 0 — _none_

## Efficiency Metrics (per agent)

| Agent | Avg Cost | Median Cost | Total Cost | Avg Duration | Median Duration | Avg Turns | Median Turns | Avg ToolCalls | Median ToolCalls | Avg Tokens | Median Tokens | Avg Iter | TimeoutRate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | `null` | `null` | `null` | 475987ms | 600850ms | 148.77 | 120.00 | 75.85 | 66.00 | `null` | `null` | 0.00 | 0.00% |
| baseline-v0 | `null` | `null` | `null` | 233879ms | 68691ms | 70.50 | 55.00 | 36.63 | 30.00 | `null` | `null` | 1.00 | 0.00% |

> Cost is `null`/`unavailable` when token usage not exposed by Pi 0.84.4. Pricing snapshot exists but never used to invent costs.

## Case-Level Breakdown

| Case | Difficulty | Category | Agent | Runs | Verified | AgentFail | FalseConf | RegFail | Timeouts | Errors | VFR | VFR(valid) | AvgCost | AvgDur | AvgTurns | AvgToolCalls | Consistency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hard-001 | hard | state-management | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 608561ms | 82.00 | 52.00 | 0.00% |
| hard-001 | hard | state-management | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 601416ms | 144.00 | 74.00 | 0.00% |
| hard-002 | hard | parsing | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 607605ms | 84.00 | 42.00 | 0.00% |
| hard-002 | hard | parsing | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 583284ms | 80.00 | 40.00 | 100.00% |
| hard-003 | hard | serialization | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 608778ms | 64.00 | 46.00 | 0.00% |
| hard-003 | hard | serialization | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 601208ms | `null` | `null` | 0.00% |
| hard-004 | hard | asynchronous | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 607819ms | 132.00 | 66.00 | 0.00% |
| hard-004 | hard | asynchronous | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 496712ms | 96.00 | 52.00 | 100.00% |
| hard-005 | hard | parsing | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 607905ms | 120.00 | 66.00 | 100.00% |
| hard-005 | hard | parsing | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 557241ms | 114.00 | 56.00 | 100.00% |
| hist-001 | medium | validation | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 673825ms | 214.00 | 106.00 | 0.00% |
| hist-001 | medium | validation | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 274285ms | 112.00 | 56.00 | 0.00% |
| hist-002 | hard | security | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 368592ms | 104.00 | 54.00 | 100.00% |
| hist-003 | medium | state-management | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 55646ms | 62.00 | 34.00 | 100.00% |
| hist-004 | easy | parsing | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 136229ms | 78.00 | 38.00 | 100.00% |
| hist-005 | medium | parsing | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 68691ms | 42.00 | 22.00 | 100.00% |
| hist-006 | medium | state-management | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 259886ms | 96.00 | 54.00 | 100.00% |
| hist-006 | medium | state-management | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 44762ms | 44.00 | 22.00 | 100.00% |
| synth-001 | medium | state-management | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 473455ms | 216.00 | 100.00 | 100.00% |
| synth-001 | medium | state-management | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 27258ms | 44.00 | 26.00 | 100.00% |
| synth-002 | easy | validation | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 600850ms | 330.00 | 158.00 | 100.00% |
| synth-002 | easy | validation | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 43731ms | 48.00 | 26.00 | 100.00% |
| synth-003 | medium | error-handling | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 270070ms | 94.00 | 48.00 | 100.00% |
| synth-003 | medium | error-handling | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 36985ms | 46.00 | 26.00 | 100.00% |
| synth-004 | hard | state-management | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 483138ms | 258.00 | 122.00 | 100.00% |
| synth-004 | hard | state-management | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 28733ms | 48.00 | 26.00 | 100.00% |
| synth-005 | medium | boundary | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 128544ms | 92.00 | 50.00 | 100.00% |
| synth-005 | medium | boundary | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 28749ms | 34.00 | 18.00 | 100.00% |
| synth-006 | easy | api-behavior | agent-v1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 257394ms | 152.00 | 76.00 | 0.00% |
| synth-006 | easy | api-behavior | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 22416ms | 32.00 | 16.00 | 100.00% |

## Comparative V0 vs V1

| Metric | V0 | V1 | Delta |
| --- | --- | --- | --- |
| VFR | 82.35% | 53.85% | -28.51 pp |
| VFR (valid) | 82.35% | 53.85% | -28.51 pp |
| Reproduction Rate | 82.35% | 61.54% | -20.81 pp |
| Oracle Pass Rate | 82.35% | 53.85% | -28.51 pp |
| Regression-Free Rate | 100.00% | 100.00% | +0.00 pp |
| False Confidence Rate | 0.00% | 7.69% | +7.69 pp |
| Agent Failure Rate | 17.65% | 38.46% | +20.81 pp |
| Timeout Rate | 0.00% | 0.00% | +0.00 pp |
| Avg Cost (USD) | `null` | `null` | `null` |
| Median Cost (USD) | `null` | `null` | `null` |
| Total Cost (USD) | `null` | `null` | `null` |
| Avg Duration (ms) | 233878.71 | 475986.92 | +242108.22 |
| Median Duration (ms) | 68691.00 | 600850.00 | +532159.00 |
| Avg Turns | 70.50 | 148.77 | +78.27 |
| Median Turns | 55.00 | 120.00 | +65.00 |
| Avg Tool Calls | 36.63 | 75.85 | +39.22 |
| Median Tool Calls | 30.00 | 66.00 | +36.00 |
| Avg Tokens | `null` | `null` | `null` |
| Median Tokens | `null` | `null` | `null` |
| Avg Iterations | 1.00 | 0.00 | -1.00 |

> Deltas for percentages are percentage-point changes (e.g., V0 50% → V1 66.7% = +16.7 pp), not relative % improvement.

## Reliability Across Repeated Runs

| Case | Runs | Verified | Consistency | Has Variance |
| --- | --- | --- | --- | --- |
| hard-001 | 2 | 0 | 0.00% | no |
| hard-002 | 2 | 1 | 50.00% | YES |
| hard-003 | 2 | 0 | 0.00% | no |
| hard-004 | 2 | 1 | 50.00% | YES |
| hard-005 | 2 | 2 | 100.00% | no |
| hist-001 | 2 | 0 | 0.00% | no |
| hist-002 | 1 | 1 | 100.00% | no |
| hist-003 | 1 | 1 | 100.00% | no |
| hist-004 | 1 | 1 | 100.00% | no |
| hist-005 | 1 | 1 | 100.00% | no |
| hist-006 | 2 | 2 | 100.00% | no |
| synth-001 | 2 | 2 | 100.00% | no |
| synth-002 | 2 | 2 | 100.00% | no |
| synth-003 | 2 | 2 | 100.00% | no |
| synth-004 | 2 | 2 | 100.00% | no |
| synth-005 | 2 | 2 | 100.00% | no |
| synth-006 | 2 | 1 | 50.00% | YES |

**Unreliable cases (variance):** hard-002 (1/2 50.0%), hard-004 (1/2 50.0%), synth-006 (1/2 50.0%)

## Historical vs Synthetic

| Type | Total | Verified | VFR | Oracle Rate | False Confidence |
| --- | --- | --- | --- | --- | --- |
| historical | 18 | 10 | 55.56% | 55.56% | 0.00% |
| synthetic | 12 | 11 | 91.67% | 91.67% | 8.33% |

## Difficulty Breakdown

| Difficulty | Total | Verified | VFR | Repro Rate | Oracle Rate |
| --- | --- | --- | --- | --- | --- |
| easy | 5 | 4 | 80.00% | 100.00% | 80.00% |
| medium | 12 | 10 | 83.33% | 83.33% | 83.33% |
| hard | 13 | 7 | 53.85% | 53.85% | 53.85% |

## Category Breakdown

| Category | Total | Verified | VFR | False Confidence |
| --- | --- | --- | --- | --- |
| alias-handling | 1 | 1 | 100.00% | 0.00% |
| api-behavior | 9 | 6 | 66.67% | 11.11% |
| asynchronous | 4 | 3 | 75.00% | 0.00% |
| boundary | 4 | 3 | 75.00% | 0.00% |
| business-logic | 4 | 4 | 100.00% | 0.00% |
| data-transformation | 4 | 4 | 100.00% | 0.00% |
| error-handling | 6 | 4 | 66.67% | 16.67% |
| lifecycle | 2 | 0 | 0.00% | 0.00% |
| parsing | 10 | 5 | 50.00% | 0.00% |
| security | 1 | 1 | 100.00% | 0.00% |
| serialization | 2 | 0 | 0.00% | 0.00% |
| state-management | 15 | 9 | 60.00% | 0.00% |
| type-coercion | 1 | 1 | 100.00% | 0.00% |
| validation | 5 | 3 | 60.00% | 0.00% |

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
| hard-001-run-001-214fa3 | hard-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2434ms | `unav` | 82 |  | 0 |
| hard-001-run-001-c5db09 | hard-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2983ms | `unav` | 144 |  | 1 |
| hard-002-run-001-a165f7 | hard-002 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1203ms | `unav` | 84 |  | 0 |
| hard-002-run-001-f38dcb | hard-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 3465ms | `unav` | 80 |  | 1 |
| hard-003-run-001-737a2e | hard-003 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1361ms | `unav` | 64 |  | 0 |
| hard-003-run-001-7ba7a9 | hard-003 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1279ms | `unav` |  |  | 1 |
| hard-004-run-001-229ddd | hard-004 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1851ms | `unav` | 132 |  | 0 |
| hard-004-run-001-a53c6e | hard-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2313ms | `unav` | 96 |  | 1 |
| hard-005-run-001-017ebf | hard-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1644ms | `unav` | 114 |  | 1 |
| hard-005-run-001-8f0888 | hard-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1553ms | `unav` | 120 |  | 0 |
| hist-001-run-001-09514a | hist-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1355ms | `unav` | 112 |  | 1 |
| hist-001-run-001-663a4f | hist-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1341ms | `unav` | 214 |  | 0 |
| hist-002-run-001-751380 | hist-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1640ms | `unav` | 104 |  | 1 |
| hist-003-run-001-650a23 | hist-003 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1646ms | `unav` | 62 |  | 1 |
| hist-004-run-001-ca680a | hist-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1557ms | `unav` | 78 |  | 1 |
| hist-005-run-001-524675 | hist-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1554ms | `unav` | 42 |  | 1 |
| hist-006-run-001-2f12b5 | hist-006 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1556ms | `unav` | 96 |  | 0 |
| hist-006-run-001-d74f57 | hist-006 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1502ms | `unav` | 44 |  | 1 |
| synth-001-run-001-94da3e | synth-001 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1587ms | `unav` | 44 |  | 1 |
| synth-001-run-001-dcd329 | synth-001 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1541ms | `unav` | 216 |  | 0 |
| synth-002-run-001-274217 | synth-002 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1502ms | `unav` | 330 |  | 0 |
| synth-002-run-001-bf1de8 | synth-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1454ms | `unav` | 48 |  | 1 |
| synth-003-run-001-daafee | synth-003 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1515ms | `unav` | 94 |  | 0 |
| synth-003-run-001-fdbe69 | synth-003 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1645ms | `unav` | 46 |  | 1 |
| synth-004-run-001-c6b9e2 | synth-004 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1496ms | `unav` | 258 |  | 0 |
| synth-004-run-001-f4c644 | synth-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1561ms | `unav` | 48 |  | 1 |
| synth-005-run-001-738d06 | synth-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1406ms | `unav` | 34 |  | 1 |
| synth-005-run-001-dd8b5c | synth-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1380ms | `unav` | 92 |  | 0 |
| synth-006-run-001-41b611 | synth-006 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1680ms | `unav` | 32 |  | 1 |
| synth-006-run-001-f04458 | synth-006 | agent-v1 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1320ms | `unav` | 152 |  | 0 |

---
*Generated from executable evidence. Benchmark 0.5 sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf — Evaluator 0.0.0.*
