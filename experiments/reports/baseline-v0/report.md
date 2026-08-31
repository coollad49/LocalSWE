# Experiment Report — baseline-v0

> **Results are descriptive measurements from repeated runs, not statistically powered estimates.**
> With only 3 runs per case, small percentage differences are not statistically conclusive.

**Benchmark:** 0.5 `sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf`
**Evaluator:** `0.0.0`
**Experiment:** baseline-v0
**Runs Dir:** `C:\Users\cooll\Documents\code\frontier-verifier\experiments\runs`
**Timestamp:** 2026-08-30T15:40:01.403Z
**Total Runs:** 44 (valid 41, infra errors 3)
**Elapsed:** 199268ms

## Agent Versions

| Agent | Runs | VFR (overall) | VFR (valid) | Repro | Oracle | Regression-Free | FalseConf |
| --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | 16 | 31.25% | 33.33% | 31.25% | 31.25% | 100.00% | 0.00% |
| baseline-v0 | 28 | 35.71% | 38.46% | 39.29% | 35.71% | 100.00% | 0.00% |

## Primary Outcome

- **VFR (overall):** 34.09% (15/44) — verified / total
- **VFR (valid):** 36.59% (15/41) — verified / valid (excludes infra errors)
- **Reproduction Rate:** 36.36% (16/44)
- **Oracle Pass Rate:** 34.09% (15/44)
- **Regression-Free Rate:** 100.00% (15/15) — regression passed / tested
- **Patch-Apply Success:** 100.00%
- **False Confidence Rate:** 0.00% (0/44)

## Outcome Breakdown

| Outcome | Count | % (overall) |
| --- | --- | --- |
| verified | 15 | 34.09% |
| agent_failure | 26 | 59.09% |
| false_confidence | 0 | 0.00% |
| regression_failure | 0 | 0.00% |
| patch_failed | 0 | 0.00% |
| timeout (non-patch) | 0 | 0.00% |
| error (infra) | 3 | 6.82% |

## Failure Analysis

### Where improvement is needed — by category (never merged)

- **Agent failures** (repro still failing): 26 — synth-001 (check-4-1788103946175), synth-001 (check-5-1788103957775), synth-001 (check-6-1788103972181), synth-001 (check-7-1788103984104), synth-001 (check-8-1788103996746), hard-002 (hard-002-run-001-a74613), hard-002 (hard-002-run-001-e88bde), hard-003 (hard-003-run-001-7d2b0b), hard-003 (hard-003-run-001-8fd896), hard-004 (hard-004-run-001-dcbb8b), hard-005 (hard-005-run-001-6d1ede), hist-001 (hist-001-run-001-a06884), hist-001 (hist-001-run-001-a20e85), hist-002 (hist-002-run-001-ec6bd1), hist-002 (hist-002-run-001-f867b2), hist-003 (hist-003-run-001-122aaf), hist-003 (hist-003-run-001-58c6e2), hist-006 (hist-006-run-001-c92da0), synth-001 (synth-001-05705073-1788104019984), synth-001 (synth-001-6a57f4e6-1788104043930), synth-001 (synth-001-ac6a3bd1-1788104031636), synth-001 (synth-001-b4e0ee0d-1788104008375), synth-001 (synth-001-run-001-281284), synth-001 (synth-001-run-001-91c1b7), synth-002 (synth-002-run-001-cc8cb0), synth-002 (synth-002-run-001-dced56)
- **False confidence** (repro pass / oracle fail): 0 — _none_
  → Demonstrates visible reproduction success ≠ correctness.
- **Regression failures** (oracle pass / regression fail): 0 — _none_
- **Timeouts**: 0 — _none_
- **Infrastructure errors**: 3 — hard-001 (hard-001-run-001-6b5d9f) STAGE_ERROR, hard-001 (hard-001-run-001-a76370) STAGE_ERROR, hard-004 (hard-004-run-001-405360) STAGE_ERROR

## Efficiency Metrics (per agent)

| Agent | Avg Cost | Median Cost | Total Cost | Avg Duration | Median Duration | Avg Turns | Median Turns | Avg ToolCalls | Median ToolCalls | Avg Tokens | Median Tokens | Avg Iter | TimeoutRate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | `null` | `null` | `null` | 605437ms | 603526ms | 182.00 | 172.00 | 85.75 | 81.00 | `null` | `null` | 0.00 | 0.00% |
| baseline-v0 | `null` | `null` | `null` | 268067ms | 136140ms | 55.93 | 62.00 | 27.00 | 28.00 | `null` | `null` | 1.00 | 0.00% |

> Cost is `null`/`unavailable` when token usage not exposed by Pi 0.84.4. Pricing snapshot exists but never used to invent costs.

## Case-Level Breakdown

| Case | Difficulty | Category | Agent | Runs | Verified | AgentFail | FalseConf | RegFail | Timeouts | Errors | VFR | VFR(valid) | AvgCost | AvgDur | AvgTurns | AvgToolCalls | Consistency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hard-001 | hard | state-management | agent-v1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0.00% | `null` | `null` | 616724ms | 132.00 | 62.00 | 0.00% |
| hard-001 | hard | state-management | baseline-v0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0.00% | `null` | `null` | 612377ms | 84.00 | 38.00 | 0.00% |
| hard-002 | hard | parsing | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 601899ms | 202.00 | 96.00 | 0.00% |
| hard-002 | hard | parsing | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 601213ms | 76.00 | 34.00 | 0.00% |
| hard-003 | hard | serialization | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 618079ms | 86.00 | 36.00 | 0.00% |
| hard-003 | hard | serialization | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 612211ms | 72.00 | 30.00 | 0.00% |
| hard-004 | hard | asynchronous | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 617554ms | 144.00 | 68.00 | 0.00% |
| hard-004 | hard | asynchronous | baseline-v0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0.00% | `null` | `null` | 600574ms | 202.00 | 98.00 | 0.00% |
| hard-005 | hard | parsing | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 601253ms | 144.00 | 70.00 | 0.00% |
| hard-005 | hard | parsing | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 603205ms | 160.00 | 76.00 | 100.00% |
| hist-001 | medium | validation | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 604021ms | 204.00 | 98.00 | 0.00% |
| hist-001 | medium | validation | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 600465ms | `null` | `null` | 0.00% |
| hist-002 | hard | security | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 604256ms | 166.00 | 80.00 | 0.00% |
| hist-002 | hard | security | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 601415ms | 84.00 | 36.00 | 0.00% |
| hist-003 | medium | state-management | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 603706ms | 100.00 | 46.00 | 0.00% |
| hist-003 | medium | state-management | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 601946ms | 84.00 | 36.00 | 0.00% |
| hist-004 | easy | parsing | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 600897ms | 208.00 | 94.00 | 100.00% |
| hist-004 | easy | parsing | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 555363ms | 74.00 | 32.00 | 100.00% |
| hist-005 | medium | parsing | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 601739ms | 176.00 | 82.00 | 100.00% |
| hist-005 | medium | parsing | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 320461ms | 90.00 | 40.00 | 100.00% |
| hist-006 | medium | state-management | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 601533ms | 200.00 | 96.00 | 0.00% |
| hist-006 | medium | state-management | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 535262ms | 90.00 | 38.00 | 100.00% |
| synth-001 | medium | state-management | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 601690ms | 168.00 | 80.00 | 0.00% |
| synth-001 | medium | state-management | baseline-v0 | 11 | 1 | 10 | 0 | 0 | 0 | 0 | 9.09% | 9.09% | `null` | 23368ms | 8.55 | 7.64 | 9.09% |
| synth-002 | easy | validation | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | `null` | 602791ms | 156.00 | 72.00 | 0.00% |
| synth-002 | easy | validation | baseline-v0 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 50.00% | 50.00% | `null` | 69061ms | 28.00 | 14.50 | 50.00% |
| synth-003 | medium | error-handling | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 603795ms | 238.00 | 112.00 | 100.00% |
| synth-003 | medium | error-handling | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 419208ms | 170.00 | 82.00 | 100.00% |
| synth-004 | hard | state-management | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 603553ms | 208.00 | 98.00 | 100.00% |
| synth-004 | hard | state-management | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 303909ms | 66.00 | 28.00 | 100.00% |
| synth-005 | medium | boundary | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 603498ms | 380.00 | 182.00 | 100.00% |
| synth-005 | medium | boundary | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 111843ms | 46.00 | 20.00 | 100.00% |
| synth-006 | easy | api-behavior | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | `null` | 31245ms | 62.00 | 28.00 | 100.00% |

## Comparative V0 vs V1

| Metric | V0 | V1 | Delta |
| --- | --- | --- | --- |
| VFR | 35.71% | 31.25% | -4.46 pp |
| VFR (valid) | 38.46% | 33.33% | -5.13 pp |
| Reproduction Rate | 39.29% | 31.25% | -8.04 pp |
| Oracle Pass Rate | 35.71% | 31.25% | -4.46 pp |
| Regression-Free Rate | 100.00% | 100.00% | +0.00 pp |
| False Confidence Rate | 0.00% | 0.00% | +0.00 pp |
| Agent Failure Rate | 57.14% | 62.50% | +5.36 pp |
| Timeout Rate | 0.00% | 0.00% | +0.00 pp |
| Avg Cost (USD) | `null` | `null` | `null` |
| Median Cost (USD) | `null` | `null` | `null` |
| Total Cost (USD) | `null` | `null` | `null` |
| Avg Duration (ms) | 268066.75 | 605436.75 | +337370.00 |
| Median Duration (ms) | 136139.50 | 603525.50 | +467386.00 |
| Avg Turns | 55.93 | 182.00 | +126.07 |
| Median Turns | 62.00 | 172.00 | +110.00 |
| Avg Tool Calls | 27.00 | 85.75 | +58.75 |
| Median Tool Calls | 28.00 | 81.00 | +53.00 |
| Avg Tokens | `null` | `null` | `null` |
| Median Tokens | `null` | `null` | `null` |
| Avg Iterations | 1.00 | 0.00 | -1.00 |

> Deltas for percentages are percentage-point changes (e.g., V0 50% → V1 66.7% = +16.7 pp), not relative % improvement.

## Reliability Across Repeated Runs

| Case | Runs | Verified | Consistency | Has Variance |
| --- | --- | --- | --- | --- |
| hard-001 | 2 | 0 | 0.00% | no |
| hard-002 | 2 | 0 | 0.00% | no |
| hard-003 | 2 | 0 | 0.00% | no |
| hard-004 | 2 | 0 | 0.00% | no |
| hard-005 | 2 | 1 | 50.00% | YES |
| hist-001 | 2 | 0 | 0.00% | no |
| hist-002 | 2 | 0 | 0.00% | no |
| hist-003 | 2 | 0 | 0.00% | no |
| hist-004 | 2 | 2 | 100.00% | no |
| hist-005 | 2 | 2 | 100.00% | no |
| hist-006 | 2 | 1 | 50.00% | YES |
| synth-001 | 12 | 1 | 8.33% | YES |
| synth-002 | 3 | 1 | 33.33% | YES |
| synth-003 | 2 | 2 | 100.00% | no |
| synth-004 | 2 | 2 | 100.00% | no |
| synth-005 | 2 | 2 | 100.00% | no |
| synth-006 | 1 | 1 | 100.00% | no |

**Unreliable cases (variance):** hard-005 (1/2 50.0%), hist-006 (1/2 50.0%), synth-001 (1/12 8.3%), synth-002 (1/3 33.3%)

## Historical vs Synthetic

| Type | Total | Verified | VFR | Oracle Rate | False Confidence |
| --- | --- | --- | --- | --- | --- |
| historical | 22 | 6 | 27.27% | 27.27% | 0.00% |
| synthetic | 22 | 9 | 40.91% | 40.91% | 0.00% |

## Difficulty Breakdown

| Difficulty | Total | Verified | VFR | Repro Rate | Oracle Rate |
| --- | --- | --- | --- | --- | --- |
| easy | 6 | 4 | 66.67% | 66.67% | 66.67% |
| medium | 24 | 8 | 33.33% | 33.33% | 33.33% |
| hard | 14 | 3 | 21.43% | 28.57% | 21.43% |

## Category Breakdown

| Category | Total | Verified | VFR | False Confidence |
| --- | --- | --- | --- | --- |
| alias-handling | 2 | 2 | 100.00% | 0.00% |
| api-behavior | 9 | 4 | 44.44% | 0.00% |
| asynchronous | 4 | 2 | 50.00% | 0.00% |
| boundary | 4 | 2 | 50.00% | 0.00% |
| business-logic | 15 | 2 | 13.33% | 0.00% |
| data-transformation | 4 | 3 | 75.00% | 0.00% |
| error-handling | 5 | 3 | 60.00% | 0.00% |
| lifecycle | 2 | 0 | 0.00% | 0.00% |
| parsing | 12 | 5 | 41.67% | 0.00% |
| security | 2 | 0 | 0.00% | 0.00% |
| serialization | 2 | 0 | 0.00% | 0.00% |
| state-management | 26 | 4 | 15.38% | 0.00% |
| type-coercion | 2 | 2 | 100.00% | 0.00% |
| validation | 7 | 1 | 14.29% | 0.00% |

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
| hard-001-run-001-6b5d9f | hard-001 | baseline-v0 | ERROR | PASSED | ERROR | SKIPPED | SKIPPED | 2669ms | `unav` | 84 |  | 1 |
| hard-001-run-001-a76370 | hard-001 | agent-v1 | ERROR | PASSED | ERROR | SKIPPED | SKIPPED | 2448ms | `unav` | 132 |  | 0 |
| hard-002-run-001-a74613 | hard-002 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1936ms | `unav` | 202 |  | 0 |
| hard-002-run-001-e88bde | hard-002 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2054ms | `unav` | 76 |  | 1 |
| hard-003-run-001-7d2b0b | hard-003 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1661ms | `unav` | 86 |  | 0 |
| hard-003-run-001-8fd896 | hard-003 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1967ms | `unav` | 72 |  | 1 |
| hard-004-run-001-405360 | hard-004 | baseline-v0 | ERROR | PASSED | PASSED | ERROR | SKIPPED | 2965ms | `unav` | 202 |  | 1 |
| hard-004-run-001-dcbb8b | hard-004 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2497ms | `unav` | 144 |  | 0 |
| hard-005-run-001-6d1ede | hard-005 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1408ms | `unav` | 144 |  | 0 |
| hard-005-run-001-c5c839 | hard-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1883ms | `unav` | 160 |  | 1 |
| hist-001-run-001-a06884 | hist-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1506ms | `unav` |  |  | 1 |
| hist-001-run-001-a20e85 | hist-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1526ms | `unav` | 204 |  | 0 |
| hist-002-run-001-ec6bd1 | hist-002 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1205ms | `unav` | 166 |  | 0 |
| hist-002-run-001-f867b2 | hist-002 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1237ms | `unav` | 84 |  | 1 |
| hist-003-run-001-122aaf | hist-003 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1385ms | `unav` | 84 |  | 1 |
| hist-003-run-001-58c6e2 | hist-003 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1462ms | `unav` | 100 |  | 0 |
| hist-004-run-001-9ebfc0 | hist-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2967ms | `unav` | 74 |  | 1 |
| hist-004-run-001-e166c8 | hist-004 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1861ms | `unav` | 208 |  | 0 |
| hist-005-run-001-411a8d | hist-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1964ms | `unav` | 176 |  | 0 |
| hist-005-run-001-4b73f1 | hist-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1915ms | `unav` | 90 |  | 1 |
| hist-006-run-001-96aa54 | hist-006 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2146ms | `unav` | 90 |  | 1 |
| hist-006-run-001-c92da0 | hist-006 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1470ms | `unav` | 200 |  | 0 |
| check-4-1788103946175 | synth-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1977ms | `unav` | 2 |  | 1 |
| check-5-1788103957775 | synth-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1867ms | `unav` | 2 |  | 1 |
| check-6-1788103972181 | synth-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1466ms | `unav` | 2 |  | 1 |
| check-7-1788103984104 | synth-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1915ms | `unav` | 2 |  | 1 |
| check-8-1788103996746 | synth-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2493ms | `unav` | 2 |  | 1 |
| synth-001-05705073-1788104019984 | synth-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1405ms | `unav` | 2 |  | 1 |
| synth-001-6a57f4e6-1788104043930 | synth-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1411ms | `unav` | 2 |  | 1 |
| synth-001-ac6a3bd1-1788104031636 | synth-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1683ms | `unav` | 2 |  | 1 |
| synth-001-b4e0ee0d-1788104008375 | synth-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2360ms | `unav` | 2 |  | 1 |
| synth-001-run-001-281284 | synth-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2420ms | `unav` | 168 |  | 0 |
| synth-001-run-001-91c1b7 | synth-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1743ms | `unav` | 2 |  | 1 |
| synth-001-run-001-cc74e7 | synth-001 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2487ms | `unav` | 74 |  | 1 |
| synth-002-run-001-9a5f3f | synth-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2212ms | `unav` | 54 |  | 1 |
| synth-002-run-001-cc8cb0 | synth-002 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1418ms | `unav` | 2 |  | 1 |
| synth-002-run-001-dced56 | synth-002 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2163ms | `unav` | 156 |  | 0 |
| synth-003-run-001-264a83 | synth-003 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2028ms | `unav` | 238 |  | 0 |
| synth-003-run-001-2b9680 | synth-003 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1863ms | `unav` | 170 |  | 1 |
| synth-004-run-001-3a67f2 | synth-004 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1838ms | `unav` | 208 |  | 0 |
| synth-004-run-001-eb669c | synth-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1676ms | `unav` | 66 |  | 1 |
| synth-005-run-001-190edb | synth-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1770ms | `unav` | 380 |  | 0 |
| synth-005-run-001-ae9403 | synth-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1725ms | `unav` | 46 |  | 1 |
| synth-006-run-001-b538c3 | synth-006 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1828ms | `unav` | 62 |  | 1 |

---
*Generated from executable evidence. Benchmark 0.5 sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf — Evaluator 0.0.0.*
