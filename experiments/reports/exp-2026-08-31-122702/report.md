# Experiment Report — exp-2026-08-31-122702

> **Results are descriptive measurements from repeated runs, not statistically powered estimates.**
> With only 3 runs per case, small percentage differences are not statistically conclusive.

**Benchmark:** 0.5 `sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf`
**Evaluator:** `0.0.0`
**Experiment:** exp-2026-08-31-122702
**Runs Dir:** `C:\Users\cooll\Documents\code\frontier-verifier\experiments\runs`
**Timestamp:** 2026-08-31T11:44:47.113Z
**Total Runs:** 51 (valid 51, infra errors 0)

## Agent Versions

| Agent | Runs | VFR (overall) | VFR (valid) | Repro | Oracle | Regression-Free | FalseConf |
| --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | 17 | 70.59% | 70.59% | 70.59% | 70.59% | 100.00% | 0.00% |
| agent-v2 | 17 | 76.47% | 76.47% | 88.24% | 76.47% | 100.00% | 11.76% |
| baseline-v0 | 17 | 76.47% | 76.47% | 76.47% | 76.47% | 100.00% | 0.00% |

## Primary Outcome

- **VFR (overall):** 74.51% (38/51) — verified / total
- **VFR (valid):** 74.51% (38/51) — verified / valid (excludes infra errors)
- **Reproduction Rate:** 78.43% (40/51)
- **Oracle Pass Rate:** 74.51% (38/51)
- **Regression-Free Rate:** 100.00% (38/38) — regression passed / tested
- **Patch-Apply Success:** 100.00%
- **False Confidence Rate:** 3.92% (2/51)

## Outcome Breakdown

| Outcome | Count | % (overall) |
| --- | --- | --- |
| verified | 38 | 74.51% |
| agent_failure | 11 | 21.57% |
| false_confidence | 2 | 3.92% |
| regression_failure | 0 | 0.00% |
| patch_failed | 0 | 0.00% |
| timeout (non-patch) | 0 | 0.00% |
| error (infra) | 0 | 0.00% |

## Failure Analysis

### Where improvement is needed — by category (never merged)

- **Agent failures** (repro still failing): 11 — hard-001 (hard-001-run-001-6b5d9f), hard-003 (hard-003-run-001-7ba7a9), hist-001 (hist-001-run-001-09514a), hist-003 (hist-003-run-001-122aaf), hard-003 (hard-003-run-001-737a2e), hard-004 (hard-004-run-001-229ddd), hist-001 (hist-001-run-001-663a4f), hist-002 (hist-002-run-001-ec6bd1), synth-001 (synth-001-run-001-281284), hard-003 (hard-003-run-001-bba12d), hist-001 (hist-001-run-001-2f0d89)
- **False confidence** (repro pass / oracle fail): 2 — hist-004 (hist-004-run-001-0c6917), synth-006 (synth-006-run-001-08d85f)
  → Demonstrates visible reproduction success ≠ correctness.
- **Regression failures** (oracle pass / regression fail): 0 — _none_
- **Timeouts**: 0 — _none_
- **Infrastructure errors**: 0 — _none_

## Efficiency Metrics (per agent)

| Agent | Avg Cost | Median Cost | Total Cost | Avg Duration | Median Duration | Avg Turns | Median Turns | Avg ToolCalls | Median ToolCalls | Avg Tokens | Median Tokens | Avg Iter | TimeoutRate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | $0.1592 | $0.0613 | $2.7059 | 484118ms | 601690ms | 180.00 | 168.00 | 84.94 | 80.00 | 3551856.71 | 2902808.00 | 0.88 | 0.00% |
| agent-v2 | $0.0415 | $0.0338 | $0.7057 | 262389ms | 202047ms | 106.00 | 100.00 | 52.35 | 48.00 | 2619822.47 | 1679418.00 | 1.00 | 0.00% |
| baseline-v0 | $0.0531 | $0.0230 | $0.9030 | 287572ms | 186967ms | 77.18 | 84.00 | 37.53 | 36.00 | 742665.06 | 513236.00 | 1.00 | 0.00% |


## Case-Level Breakdown

| Case | Difficulty | Category | Agent | Runs | Verified | AgentFail | FalseConf | RegFail | Timeouts | Errors | VFR | VFR(valid) | AvgCost | AvgDur | AvgTurns | AvgToolCalls | Consistency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hard-001 | hard | state-management | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0468 | 416436ms | 198.00 | 90.00 | 100.00% |
| hard-001 | hard | state-management | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0671 | 404154ms | 134.00 | 68.00 | 100.00% |
| hard-001 | hard | state-management | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0707 | 612377ms | 84.00 | 38.00 | 0.00% |
| hard-002 | hard | parsing | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0217 | 131861ms | 94.00 | 38.00 | 100.00% |
| hard-002 | hard | parsing | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0388 | 271226ms | 118.00 | 56.00 | 100.00% |
| hard-002 | hard | parsing | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0123 | 67268ms | 54.00 | 26.00 | 100.00% |
| hard-003 | hard | serialization | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0249 | 608778ms | 64.00 | 46.00 | 0.00% |
| hard-003 | hard | serialization | agent-v2 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0432 | 385435ms | 92.00 | 48.00 | 0.00% |
| hard-003 | hard | serialization | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0309 | 601208ms | 62.00 | 30.00 | 0.00% |
| hard-004 | hard | asynchronous | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0322 | 607819ms | 132.00 | 66.00 | 0.00% |
| hard-004 | hard | asynchronous | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.1201 | 753426ms | 242.00 | 118.00 | 100.00% |
| hard-004 | hard | asynchronous | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.3268 | 611530ms | 168.00 | 84.00 | 100.00% |
| hard-005 | hard | parsing | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0285 | 316927ms | 128.00 | 52.00 | 100.00% |
| hard-005 | hard | parsing | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.1538 | 890687ms | 246.00 | 118.00 | 100.00% |
| hard-005 | hard | parsing | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0256 | 557241ms | 114.00 | 56.00 | 100.00% |
| hist-001 | medium | validation | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0613 | 673825ms | 214.00 | 106.00 | 0.00% |
| hist-001 | medium | validation | agent-v2 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0338 | 195563ms | 100.00 | 46.00 | 0.00% |
| hist-001 | medium | validation | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0177 | 274285ms | 112.00 | 56.00 | 0.00% |
| hist-002 | hard | security | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.2603 | 604256ms | 166.00 | 80.00 | 0.00% |
| hist-002 | hard | security | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0380 | 280296ms | 124.00 | 62.00 | 100.00% |
| hist-002 | hard | security | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0230 | 368592ms | 104.00 | 54.00 | 100.00% |
| hist-003 | medium | state-management | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0125 | 141375ms | 78.00 | 28.00 | 100.00% |
| hist-003 | medium | state-management | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0307 | 202047ms | 92.00 | 48.00 | 100.00% |
| hist-003 | medium | state-management | baseline-v0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0379 | 601946ms | 84.00 | 36.00 | 0.00% |
| hist-004 | easy | parsing | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0308 | 252842ms | 108.00 | 46.00 | 100.00% |
| hist-004 | easy | parsing | agent-v2 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0431 | 217670ms | 116.00 | 54.00 | 0.00% |
| hist-004 | easy | parsing | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.1096 | 186967ms | 94.00 | 44.00 | 100.00% |
| hist-005 | medium | parsing | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.2902 | 601739ms | 176.00 | 82.00 | 100.00% |
| hist-005 | medium | parsing | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0273 | 169126ms | 106.00 | 52.00 | 100.00% |
| hist-005 | medium | parsing | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0693 | 101676ms | 98.00 | 46.00 | 100.00% |
| hist-006 | medium | state-management | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0311 | 259886ms | 96.00 | 54.00 | 100.00% |
| hist-006 | medium | state-management | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0365 | 229388ms | 102.00 | 52.00 | 100.00% |
| hist-006 | medium | state-management | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.1314 | 535262ms | 90.00 | 38.00 | 100.00% |
| synth-001 | medium | state-management | agent-v1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.1659 | 601690ms | 168.00 | 80.00 | 0.00% |
| synth-001 | medium | state-management | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0203 | 108403ms | 66.00 | 34.00 | 100.00% |
| synth-001 | medium | state-management | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0073 | 45910ms | 48.00 | 28.00 | 100.00% |
| synth-002 | easy | validation | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0892 | 600850ms | 330.00 | 158.00 | 100.00% |
| synth-002 | easy | validation | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0127 | 56462ms | 62.00 | 32.00 | 100.00% |
| synth-002 | easy | validation | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0209 | 78570ms | 50.00 | 22.00 | 100.00% |
| synth-003 | medium | error-handling | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.3960 | 603795ms | 238.00 | 112.00 | 100.00% |
| synth-003 | medium | error-handling | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0122 | 95035ms | 54.00 | 28.00 | 100.00% |
| synth-003 | medium | error-handling | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0073 | 115771ms | 50.00 | 28.00 | 100.00% |
| synth-004 | hard | state-management | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.3097 | 603553ms | 208.00 | 98.00 | 100.00% |
| synth-004 | hard | state-management | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0093 | 66936ms | 44.00 | 24.00 | 100.00% |
| synth-004 | hard | state-management | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0042 | 78949ms | 34.00 | 18.00 | 100.00% |
| synth-005 | medium | boundary | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.5410 | 603498ms | 380.00 | 182.00 | 100.00% |
| synth-005 | medium | boundary | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0104 | 81741ms | 58.00 | 28.00 | 100.00% |
| synth-005 | medium | boundary | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0040 | 28749ms | 34.00 | 18.00 | 100.00% |
| synth-006 | easy | api-behavior | agent-v1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.3639 | 600869ms | 282.00 | 126.00 | 100.00% |
| synth-006 | easy | api-behavior | agent-v2 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0085 | 53024ms | 46.00 | 22.00 | 0.00% |
| synth-006 | easy | api-behavior | baseline-v0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0039 | 22416ms | 32.00 | 16.00 | 100.00% |

## Comparative V0 vs V1

| Metric | V0 | V1 | Delta |
| --- | --- | --- | --- |
| VFR | 76.47% | 76.47% | +0.00 pp |
| VFR (valid) | 76.47% | 76.47% | +0.00 pp |
| Reproduction Rate | 76.47% | 88.24% | +11.76 pp |
| Oracle Pass Rate | 76.47% | 76.47% | +0.00 pp |
| Regression-Free Rate | 100.00% | 100.00% | +0.00 pp |
| False Confidence Rate | 0.00% | 11.76% | +11.76 pp |
| Agent Failure Rate | 23.53% | 11.76% | -11.76 pp |
| Timeout Rate | 0.00% | 0.00% | +0.00 pp |
| Avg Cost (USD) | $0.0531 | $0.0415 | -0.01 |
| Median Cost (USD) | $0.0230 | $0.0338 | +0.01 |
| Total Cost (USD) | $0.9030 | $0.7057 | -0.20 |
| Avg Duration (ms) | 287571.59 | 262389.35 | -25182.24 |
| Median Duration (ms) | 186967.00 | 202047.00 | +15080.00 |
| Avg Turns | 77.18 | 106.00 | +28.82 |
| Median Turns | 84.00 | 100.00 | +16.00 |
| Avg Tool Calls | 37.53 | 52.35 | +14.82 |
| Median Tool Calls | 36.00 | 48.00 | +12.00 |
| Avg Tokens | 742665.06 | 2619822.47 | +1877157.41 |
| Median Tokens | 513236.00 | 1679418.00 | +1166182.00 |
| Avg Iterations | 1.00 | 1.00 | +0.00 |

> Deltas for percentages are percentage-point changes (e.g., V0 50% → V1 66.7% = +16.7 pp), not relative % improvement.

## Trajectory & Behavioral Analytics

### Performance Grouped by Outcome

| Outcome | Runs | Avg Duration | Avg Tool Calls | Avg Thinking Chars | Avg Edits | Avg Tests | Avg Cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| verified | 38 | 302.9s | 59.6 | 1541244 | 7.8 | 8.3 | $0.0917 |
| agent_failure | 11 | 523.8s | 57.5 | 1142916 | 3.5 | 6.2 | $0.0708 |
| false_confidence | 2 | 134.2s | 38.0 | 2105305 | 9.0 | 4.0 | $0.0258 |

### Per-Run Tool & Resource Breakdown

| Case | Agent | Verdict | Duration | Cost | Reads | Edits | Bash | Tests | Repetitions | Thinking Chars | Expl/Edit Ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hard-001 | agent-v1 | VERIFIED | 416.4s | $0.0468 | 24 | 12 | 40 | 28 | 57 | 98720 | 6.5x |
| hard-001 | baseline-v0 | AGENT_FAILURE | 612.4s | $0.0707 | 18 | 0 | 10 | 2 | 19 | 38132 | — |
| hard-001 | agent-v2 | VERIFIED | 403.1s | $0.0671 | 26 | 12 | 18 | 10 | 39 | 8761137 | 4.67x |
| hard-002 | baseline-v0 | VERIFIED | 67.2s | $0.0123 | 8 | 2 | 10 | 4 | 14 | 18684 | 12x |
| hard-002 | agent-v2 | VERIFIED | 270.6s | $0.0388 | 18 | 8 | 22 | 6 | 35 | 1873951 | 6x |
| hard-002 | agent-v1 | VERIFIED | 131.8s | $0.0217 | 10 | 2 | 26 | 8 | 22 | 30016 | 18x |
| hard-003 | agent-v1 | AGENT_FAILURE | 608.6s | $0.0249 | 32 | 0 | 6 | 4 | 24 | 40672 | — |
| hard-003 | baseline-v0 | AGENT_FAILURE | 600.9s | $0.0309 | 18 | 0 | 6 | 4 | 15 | 146260 | — |
| hard-003 | agent-v2 | AGENT_FAILURE | 385.0s | $0.0432 | 22 | 6 | 12 | 6 | 30 | 9043658 | 7x |
| hard-004 | agent-v1 | AGENT_FAILURE | 607.8s | $0.0322 | 20 | 4 | 36 | 2 | 35 | 24402 | 15.5x |
| hard-004 | baseline-v0 | VERIFIED | 604.1s | $0.3268 | 20 | 6 | 54 | 30 | 46 | 173770 | 13x |
| hard-004 | agent-v2 | VERIFIED | 746.5s | $0.1201 | 26 | 34 | 52 | 10 | 85 | 7614933 | 2.47x |
| hard-005 | baseline-v0 | VERIFIED | 557.2s | $0.0256 | 14 | 12 | 24 | 16 | 38 | 79800 | 3.67x |
| hard-005 | agent-v1 | VERIFIED | 316.9s | $0.0285 | 8 | 4 | 34 | 12 | 31 | 62552 | 12x |
| hard-005 | agent-v2 | VERIFIED | 890.0s | $0.1538 | 14 | 46 | 50 | 8 | 80 | 19359607 | 1.57x |
| hist-001 | baseline-v0 | AGENT_FAILURE | 274.2s | $0.0177 | 20 | 2 | 28 | 16 | 33 | 36728 | 27x |
| hist-001 | agent-v2 | AGENT_FAILURE | 191.9s | $0.0338 | 16 | 6 | 18 | 6 | 27 | 2886492 | 6.67x |
| hist-001 | agent-v1 | AGENT_FAILURE | 673.8s | $0.0613 | 32 | 18 | 48 | 14 | 71 | 74460 | 4.89x |
| hist-002 | baseline-v0 | VERIFIED | 368.6s | $0.0230 | 14 | 6 | 30 | 4 | 28 | 64504 | 8x |
| hist-002 | agent-v2 | VERIFIED | 273.4s | $0.0380 | 18 | 18 | 20 | 6 | 46 | 4330356 | 2.44x |
| hist-002 | agent-v1 | AGENT_FAILURE | 603.6s | $0.2603 | 18 | 2 | 60 | 10 | 40 | 190740 | 39x |
| hist-003 | baseline-v0 | AGENT_FAILURE | 601.9s | $0.0379 | 20 | 0 | 12 | 0 | 18 | 48792 | — |
| hist-003 | agent-v1 | VERIFIED | 141.4s | $0.0125 | 10 | 2 | 14 | 10 | 19 | 33120 | 13x |
| hist-003 | agent-v2 | VERIFIED | 201.6s | $0.0307 | 22 | 6 | 14 | 6 | 29 | 5305126 | 7x |
| hist-004 | agent-v2 | FALSE_CONFIDENCE | 216.0s | $0.0431 | 12 | 16 | 20 | 4 | 35 | 4130739 | 2.38x |
| hist-004 | baseline-v0 | VERIFIED | 187.0s | $0.1096 | 12 | 2 | 26 | 4 | 24 | 79620 | 21x |
| hist-004 | agent-v1 | VERIFIED | 252.8s | $0.0308 | 10 | 2 | 26 | 10 | 28 | 126060 | 22x |
| hist-005 | baseline-v0 | VERIFIED | 101.7s | $0.0693 | 12 | 4 | 26 | 4 | 26 | 15044 | 10.5x |
| hist-005 | agent-v1 | VERIFIED | 601.7s | $0.2902 | 18 | 6 | 54 | 8 | 46 | 90200 | 12.67x |
| hist-005 | agent-v2 | VERIFIED | 168.2s | $0.0273 | 14 | 12 | 20 | 4 | 35 | 1856541 | 3.33x |
| hist-006 | agent-v1 | VERIFIED | 259.9s | $0.0311 | 22 | 10 | 14 | 4 | 32 | 46756 | 4.4x |
| hist-006 | agent-v2 | VERIFIED | 228.9s | $0.0365 | 20 | 6 | 16 | 6 | 33 | 6513851 | 7.67x |
| hist-006 | baseline-v0 | VERIFIED | 535.3s | $0.1314 | 22 | 2 | 8 | 4 | 20 | 199124 | 18x |
| synth-001 | agent-v1 | AGENT_FAILURE | 601.7s | $0.1659 | 22 | 0 | 52 | 4 | 43 | 41736 | — |
| synth-001 | baseline-v0 | VERIFIED | 45.9s | $0.0073 | 18 | 2 | 2 | 2 | 15 | 12924 | 13x |
| synth-001 | agent-v2 | VERIFIED | 107.3s | $0.0203 | 14 | 4 | 10 | 6 | 21 | 617146 | 7.5x |
| synth-002 | agent-v1 | VERIFIED | 600.8s | $0.0892 | 32 | 18 | 102 | 22 | 102 | 45844 | 7.78x |
| synth-002 | baseline-v0 | VERIFIED | 78.6s | $0.0209 | 12 | 2 | 4 | 2 | 12 | 828 | 10x |
| synth-002 | agent-v2 | VERIFIED | 55.9s | $0.0127 | 10 | 6 | 10 | 2 | 17 | 148187 | 4.33x |
| synth-003 | baseline-v0 | VERIFIED | 115.8s | $0.0073 | 14 | 2 | 6 | 2 | 15 | 8724 | 13x |
| synth-003 | agent-v1 | VERIFIED | 603.7s | $0.3960 | 30 | 8 | 64 | 12 | 64 | 74732 | 13x |
| synth-003 | agent-v2 | VERIFIED | 94.2s | $0.0122 | 14 | 2 | 6 | 4 | 16 | 390134 | 13x |
| synth-004 | agent-v1 | VERIFIED | 603.5s | $0.3097 | 22 | 4 | 66 | 8 | 53 | 63208 | 23.5x |
| synth-004 | baseline-v0 | VERIFIED | 78.9s | $0.0042 | 8 | 2 | 2 | 2 | 9 | 2632 | 8x |
| synth-004 | agent-v2 | VERIFIED | 65.7s | $0.0093 | 12 | 2 | 4 | 4 | 12 | 92741 | 11x |
| synth-005 | agent-v2 | VERIFIED | 81.1s | $0.0104 | 10 | 4 | 8 | 2 | 16 | 230591 | 6x |
| synth-005 | agent-v1 | VERIFIED | 603.5s | $0.5410 | 32 | 14 | 126 | 14 | 112 | 71662 | 12x |
| synth-005 | baseline-v0 | VERIFIED | 28.7s | $0.0040 | 8 | 2 | 2 | 2 | 9 | 4244 | 8x |
| synth-006 | agent-v2 | FALSE_CONFIDENCE | 52.3s | $0.0085 | 10 | 2 | 4 | 4 | 14 | 79870 | 10x |
| synth-006 | agent-v1 | VERIFIED | 600.9s | $0.3639 | 26 | 8 | 78 | 26 | 72 | 64292 | 14.75x |
| synth-006 | baseline-v0 | VERIFIED | 22.4s | $0.0039 | 6 | 2 | 2 | 2 | 8 | 5916 | 7x |

## Reliability Across Repeated Runs

| Case | Runs | Verified | Consistency | Has Variance |
| --- | --- | --- | --- | --- |
| hard-001 | 3 | 2 | 66.67% | YES |
| hard-002 | 3 | 3 | 100.00% | no |
| hard-003 | 3 | 0 | 0.00% | no |
| hard-004 | 3 | 2 | 66.67% | YES |
| hard-005 | 3 | 3 | 100.00% | no |
| hist-001 | 3 | 0 | 0.00% | no |
| hist-002 | 3 | 2 | 66.67% | YES |
| hist-003 | 3 | 2 | 66.67% | YES |
| hist-004 | 3 | 2 | 66.67% | YES |
| hist-005 | 3 | 3 | 100.00% | no |
| hist-006 | 3 | 3 | 100.00% | no |
| synth-001 | 3 | 2 | 66.67% | YES |
| synth-002 | 3 | 3 | 100.00% | no |
| synth-003 | 3 | 3 | 100.00% | no |
| synth-004 | 3 | 3 | 100.00% | no |
| synth-005 | 3 | 3 | 100.00% | no |
| synth-006 | 3 | 2 | 66.67% | YES |

**Unreliable cases (variance):** hard-001 (2/3 66.7%), hard-004 (2/3 66.7%), hist-002 (2/3 66.7%), hist-003 (2/3 66.7%), hist-004 (2/3 66.7%), synth-001 (2/3 66.7%), synth-006 (2/3 66.7%)

## Historical vs Synthetic

| Type | Total | Verified | VFR | Oracle Rate | False Confidence |
| --- | --- | --- | --- | --- | --- |
| historical | 33 | 22 | 66.67% | 66.67% | 3.03% |
| synthetic | 18 | 16 | 88.89% | 88.89% | 5.56% |

## Difficulty Breakdown

| Difficulty | Total | Verified | VFR | Repro Rate | Oracle Rate |
| --- | --- | --- | --- | --- | --- |
| easy | 9 | 7 | 77.78% | 100.00% | 77.78% |
| medium | 21 | 16 | 76.19% | 76.19% | 76.19% |
| hard | 21 | 15 | 71.43% | 71.43% | 71.43% |

## Category Breakdown

| Category | Total | Verified | VFR | False Confidence |
| --- | --- | --- | --- | --- |
| alias-handling | 3 | 3 | 100.00% | 0.00% |
| api-behavior | 15 | 12 | 80.00% | 6.67% |
| asynchronous | 6 | 5 | 83.33% | 0.00% |
| boundary | 6 | 6 | 100.00% | 0.00% |
| business-logic | 6 | 5 | 83.33% | 0.00% |
| data-transformation | 6 | 6 | 100.00% | 0.00% |
| error-handling | 9 | 7 | 77.78% | 11.11% |
| lifecycle | 3 | 2 | 66.67% | 0.00% |
| parsing | 18 | 11 | 61.11% | 5.56% |
| security | 3 | 2 | 66.67% | 0.00% |
| serialization | 3 | 0 | 0.00% | 0.00% |
| state-management | 24 | 17 | 70.83% | 0.00% |
| type-coercion | 3 | 2 | 66.67% | 33.33% |
| validation | 9 | 5 | 55.56% | 0.00% |

## Cost Methodology

- **Formula:** inputCost = inputTokens/1M * inputUsdPerMillion; outputCost = outputTokens/1M * outputUsdPerMillion; totalCost = inputCost+outputCost. If provider returns trustworthy cost, prefer provider cost and record source. If tokens unavailable, costUsd=null costStatus=unavailable, never $0.
- **Snapshot:** `v2026-08-30-snapshot` Experiment pricing snapshot — not live provider billing; historical reports remain reproducible via embedded snapshot. Rates are benchmark baselines for opencode-go/muse-spark-1.2-contributor.
  - `mimo-v2.5`: input ${m.inputUsdPerMillionTokens}/M, output ${m.outputUsdPerMillionTokens}/M
  - `opencode-go/mimo-v2.5`: input ${m.inputUsdPerMillionTokens}/M, output ${m.outputUsdPerMillionTokens}/M
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
| hard-001-run-001-14d43b | hard-001 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 11992ms | $0.0468 | 198 | 4237540 | 3 |
| hard-001-run-001-6b5d9f | hard-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 3169ms | $0.0707 | 84 | 837912 | 1 |
| hard-001-run-001-c320c2 | hard-001 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 7281ms | $0.0671 | 134 | 4008588 | 1 |
| hard-002-run-001-1d7540 | hard-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1975ms | $0.0123 | 54 | 449500 | 1 |
| hard-002-run-001-48007a | hard-002 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1702ms | $0.0388 | 118 | 2703768 | 1 |
| hard-002-run-001-686cde | hard-002 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1951ms | $0.0217 | 94 | 1167956 | 3 |
| hard-003-run-001-737a2e | hard-003 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1643ms | $0.0249 | 64 | 531248 | 0 |
| hard-003-run-001-7ba7a9 | hard-003 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1617ms | $0.0309 | 62 | 513236 | 1 |
| hard-003-run-001-bba12d | hard-003 | agent-v2 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1455ms | $0.0432 | 92 | 1679418 | 1 |
| hard-004-run-001-229ddd | hard-004 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1831ms | $0.0322 | 132 | 2801514 | 0 |
| hard-004-run-001-36f07b | hard-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2284ms | $0.3268 | 168 | 4037088 | 1 |
| hard-004-run-001-ee4d7d | hard-004 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1524ms | $0.1201 | 242 | 11147531 | 1 |
| hard-005-run-001-017ebf | hard-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2005ms | $0.0256 | 114 | 1288116 | 1 |
| hard-005-run-001-2598bc | hard-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1677ms | $0.0285 | 128 | 1707276 | 3 |
| hard-005-run-001-eafe4b | hard-005 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1426ms | $0.1538 | 246 | 12639300 | 1 |
| hist-001-run-001-09514a | hist-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1791ms | $0.0177 | 112 | 1156584 | 1 |
| hist-001-run-001-2f0d89 | hist-001 | agent-v2 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1160ms | $0.0338 | 100 | 1745771 | 1 |
| hist-001-run-001-663a4f | hist-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1155ms | $0.0613 | 214 | 5308288 | 0 |
| hist-002-run-001-751380 | hist-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 5934ms | $0.0230 | 104 | 871832 | 1 |
| hist-002-run-001-8641aa | hist-002 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1443ms | $0.0380 | 124 | 1833677 | 1 |
| hist-002-run-001-ec6bd1 | hist-002 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1180ms | $0.2603 | 166 | 2902808 | 0 |
| hist-003-run-001-122aaf | hist-003 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2888ms | $0.0379 | 84 | 438278 | 1 |
| hist-003-run-001-28a3f7 | hist-003 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1544ms | $0.0125 | 78 | 590016 | 3 |
| hist-003-run-001-8c14a5 | hist-003 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1488ms | $0.0307 | 92 | 1309031 | 1 |
| hist-004-run-001-0c6917 | hist-004 | agent-v2 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1695ms | $0.0431 | 116 | 1764169 | 1 |
| hist-004-run-001-2610c2 | hist-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1979ms | $0.1096 | 94 | 786996 | 1 |
| hist-004-run-001-7c58e0 | hist-004 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1670ms | $0.0308 | 108 | 1357996 | 3 |
| hist-005-run-001-2da2d5 | hist-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2477ms | $0.0693 | 98 | 629888 | 1 |
| hist-005-run-001-411a8d | hist-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1634ms | $0.2902 | 176 | 3431036 | 0 |
| hist-005-run-001-ea5728 | hist-005 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1565ms | $0.0273 | 106 | 1329914 | 1 |
| hist-006-run-001-2f12b5 | hist-006 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2055ms | $0.0311 | 96 | 1560436 | 0 |
| hist-006-run-001-5fac47 | hist-006 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1993ms | $0.0365 | 102 | 1863565 | 1 |
| hist-006-run-001-96aa54 | hist-006 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2150ms | $0.1314 | 90 | 803832 | 1 |
| synth-001-run-001-281284 | synth-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1097ms | $0.1659 | 168 | 2025144 | 0 |
| synth-001-run-001-703bcb | synth-001 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1454ms | $0.0073 | 48 | 167356 | 1 |
| synth-001-run-001-f903f7 | synth-001 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1461ms | $0.0203 | 66 | 612834 | 1 |
| synth-002-run-001-274217 | synth-002 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1660ms | $0.0892 | 330 | 12180100 | 0 |
| synth-002-run-001-7f79f7 | synth-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1395ms | $0.0209 | 50 | 174260 | 1 |
| synth-002-run-001-8da458 | synth-002 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1628ms | $0.0127 | 62 | 480156 | 1 |
| synth-003-run-001-23ed30 | synth-003 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1410ms | $0.0073 | 50 | 193408 | 1 |
| synth-003-run-001-264a83 | synth-003 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1573ms | $0.3960 | 238 | 4911636 | 0 |
| synth-003-run-001-36927f | synth-003 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1393ms | $0.0122 | 54 | 403400 | 1 |
| synth-004-run-001-3a67f2 | synth-004 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1352ms | $0.3097 | 208 | 3930364 | 0 |
| synth-004-run-001-56ae0c | synth-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1653ms | $0.0042 | 34 | 96568 | 1 |
| synth-004-run-001-a50efb | synth-004 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1549ms | $0.0093 | 44 | 275587 | 1 |
| synth-005-run-001-013483 | synth-005 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1483ms | $0.0104 | 58 | 423841 | 1 |
| synth-005-run-001-190edb | synth-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1391ms | $0.5410 | 380 | 7429422 | 0 |
| synth-005-run-001-738d06 | synth-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1350ms | $0.0040 | 34 | 90156 | 1 |
| synth-006-run-001-08d85f | synth-006 | agent-v2 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1324ms | $0.0085 | 46 | 316432 | 1 |
| synth-006-run-001-13a5ed | synth-006 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1244ms | $0.3639 | 282 | 4308784 | 0 |
| synth-006-run-001-41b611 | synth-006 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1673ms | $0.0039 | 32 | 90296 | 1 |

---
*Generated from executable evidence. Benchmark 0.5 sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf — Evaluator 0.0.0.*
