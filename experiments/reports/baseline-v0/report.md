# Experiment Report — baseline-v0

> **Results are descriptive measurements from repeated runs, not statistically powered estimates.**
> With only 3 runs per case, small percentage differences are not statistically conclusive.

**Benchmark:** 0.5 `sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf`
**Evaluator:** `0.0.0`
**Experiment:** baseline-v0
**Runs Dir:** `C:\Users\cooll\Documents\code\frontier-verifier\experiments\runs`
**Timestamp:** 2026-08-31T11:59:59.502Z
**Total Runs:** 130 (valid 129, infra errors 1)
**Elapsed:** 269754ms

## Agent Versions

| Agent | Runs | VFR (overall) | VFR (valid) | Repro | Oracle | Regression-Free | FalseConf |
| --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | 50 | 60.00% | 60.00% | 64.00% | 60.00% | 100.00% | 4.00% |
| agent-v2 | 18 | 77.78% | 77.78% | 88.89% | 77.78% | 100.00% | 11.11% |
| baseline-v0 | 62 | 70.97% | 72.13% | 75.81% | 72.58% | 97.78% | 3.23% |

## Primary Outcome

- **VFR (overall):** 67.69% (88/130) — verified / total
- **VFR (valid):** 68.22% (88/129) — verified / valid (excludes infra errors)
- **Reproduction Rate:** 73.08% (95/130)
- **Oracle Pass Rate:** 68.46% (89/130)
- **Regression-Free Rate:** 98.88% (88/89) — regression passed / tested
- **Patch-Apply Success:** 100.00%
- **False Confidence Rate:** 4.62% (6/130)

## Outcome Breakdown

| Outcome | Count | % (overall) |
| --- | --- | --- |
| verified | 88 | 67.69% |
| agent_failure | 35 | 26.92% |
| false_confidence | 6 | 4.62% |
| regression_failure | 0 | 0.00% |
| patch_failed | 0 | 0.00% |
| timeout (non-patch) | 1 | 0.77% |
| error (infra) | 0 | 0.00% |

## Failure Analysis

### Where improvement is needed — by category (never merged)

- **Agent failures** (repro still failing): 35 — hard-001 (hard-001-run-001-214fa3), hard-001 (hard-001-run-001-6b5d9f), hard-001 (hard-001-run-001-7f51ea), hard-001 (hard-001-run-001-a76370), hard-001 (hard-001-run-001-c5db09), hard-002 (hard-002-run-001-a165f7), hard-002 (hard-002-run-001-a74613), hard-002 (hard-002-run-001-e88bde), hard-002 (hard-002-run-001-fbed24), hard-003 (hard-003-run-001-737a2e), hard-003 (hard-003-run-001-7ba7a9), hard-003 (hard-003-run-001-7d2b0b), hard-003 (hard-003-run-001-8f7ce7), hard-003 (hard-003-run-001-8fd896), hard-003 (hard-003-run-001-a317f1), hard-003 (hard-003-run-001-bba12d), hard-003 (hard-003-run-001-c041b3), hard-004 (hard-004-run-001-229ddd), hard-004 (hard-004-run-001-8ec14b), hard-004 (hard-004-run-001-dcbb8b), hard-005 (hard-005-run-001-6d1ede), hist-001 (hist-001-run-001-09514a), hist-001 (hist-001-run-001-0f86e4), hist-001 (hist-001-run-001-2f0d89), hist-001 (hist-001-run-001-663a4f), hist-001 (hist-001-run-001-a06884), hist-001 (hist-001-run-001-a20e85), hist-001 (hist-001-run-001-a6fcdc), hist-002 (hist-002-run-001-ec6bd1), hist-002 (hist-002-run-001-f867b2), hist-003 (hist-003-run-001-122aaf), hist-003 (hist-003-run-001-58c6e2), hist-006 (hist-006-run-001-c92da0), synth-001 (synth-001-run-001-281284), synth-002 (synth-002-run-001-dced56)
- **False confidence** (repro pass / oracle fail): 6 — hist-002 (hist-002-run-001-edd8d4), hist-004 (hist-004-run-001-0c6917), synth-006 (synth-006-run-001-08d85f), synth-006 (synth-006-run-001-445830), synth-006 (synth-006-run-001-b56c68), synth-006 (synth-006-run-001-f04458)
  → Demonstrates visible reproduction success ≠ correctness.
- **Regression failures** (oracle pass / regression fail): 0 — _none_
- **Timeouts**: 1 — hard-004 (hard-004-run-001-405360)
- **Infrastructure errors**: 1 — hard-004 (hard-004-run-001-405360) STAGE_TIMEOUT

## Efficiency Metrics (per agent)

| Agent | Avg Cost | Median Cost | Total Cost | Avg Duration | Median Duration | Avg Turns | Median Turns | Avg ToolCalls | Median ToolCalls | Avg Tokens | Median Tokens | Avg Iter | TimeoutRate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| agent-v1 | $0.1225 | $0.0459 | $6.1265 | 437285ms | 542664ms | 152.76 | 132.00 | 71.40 | 66.00 | 2906306.60 | 2201338.00 | 1.08 | 0.00% |
| agent-v2 | $0.0243 | $0.0196 | $0.4378 | 253735ms | 198805ms | 103.78 | 96.00 | 51.11 | 48.00 | 1538934.00 | 912318.00 | 1.00 | 0.00% |
| baseline-v0 | $0.0639 | $0.0282 | $3.9588 | 300740ms | 256568ms | 85.58 | 77.00 | 42.13 | 36.00 | 954473.23 | 537914.00 | 1.00 | 1.61% |


## Case-Level Breakdown

| Case | Difficulty | Category | Agent | Runs | Verified | AgentFail | FalseConf | RegFail | Timeouts | Errors | VFR | VFR(valid) | AvgCost | AvgDur | AvgTurns | AvgToolCalls | Consistency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hard-001 | hard | state-management | agent-v1 | 3 | 1 | 2 | 0 | 0 | 0 | 0 | 33.33% | 33.33% | $0.0886 | 547240ms | 137.33 | 68.00 | 33.33% |
| hard-001 | hard | state-management | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0406 | 404154ms | 134.00 | 68.00 | 100.00% |
| hard-001 | hard | state-management | baseline-v0 | 4 | 1 | 3 | 0 | 0 | 0 | 0 | 25.00% | 25.00% | $0.1175 | 606224ms | 138.50 | 70.50 | 25.00% |
| hard-002 | hard | parsing | agent-v1 | 3 | 1 | 2 | 0 | 0 | 0 | 0 | 33.33% | 33.33% | $0.1130 | 447122ms | 126.67 | 58.67 | 33.33% |
| hard-002 | hard | parsing | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0241 | 271226ms | 118.00 | 56.00 | 100.00% |
| hard-002 | hard | parsing | baseline-v0 | 4 | 2 | 2 | 0 | 0 | 0 | 0 | 50.00% | 50.00% | $0.0510 | 463842ms | 82.50 | 40.00 | 50.00% |
| hard-003 | hard | serialization | agent-v1 | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0838 | 609525ms | 86.67 | 47.33 | 0.00% |
| hard-003 | hard | serialization | agent-v2 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0257 | 385435ms | 92.00 | 48.00 | 0.00% |
| hard-003 | hard | serialization | baseline-v0 | 4 | 0 | 4 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0756 | 608915ms | 82.00 | 41.50 | 0.00% |
| hard-004 | hard | asynchronous | agent-v1 | 3 | 1 | 2 | 0 | 0 | 0 | 0 | 33.33% | 33.33% | $0.1005 | 564675ms | 162.67 | 78.67 | 33.33% |
| hard-004 | hard | asynchronous | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0729 | 753426ms | 242.00 | 118.00 | 100.00% |
| hard-004 | hard | asynchronous | baseline-v0 | 4 | 2 | 1 | 0 | 0 | 1 | 0 | 50.00% | 66.67% | $0.1709 | 577411ms | 143.00 | 72.50 | 50.00% |
| hard-005 | hard | parsing | agent-v1 | 4 | 3 | 1 | 0 | 0 | 0 | 0 | 75.00% | 75.00% | $0.0595 | 499323ms | 146.00 | 68.00 | 75.00% |
| hard-005 | hard | parsing | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0922 | 890687ms | 246.00 | 118.00 | 100.00% |
| hard-005 | hard | parsing | baseline-v0 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.1400 | 482060ms | 159.50 | 77.50 | 100.00% |
| hist-001 | medium | validation | agent-v1 | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.1213 | 489121ms | 182.00 | 86.67 | 0.00% |
| hist-001 | medium | validation | agent-v2 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0209 | 195563ms | 100.00 | 46.00 | 0.00% |
| hist-001 | medium | validation | baseline-v0 | 4 | 1 | 3 | 0 | 0 | 0 | 0 | 25.00% | 25.00% | $0.1032 | 302783ms | 100.50 | 49.00 | 25.00% |
| hist-002 | hard | security | agent-v1 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 50.00% | 50.00% | $0.1521 | 521426ms | 165.00 | 75.00 | 50.00% |
| hist-002 | hard | security | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0238 | 280296ms | 124.00 | 62.00 | 100.00% |
| hist-002 | hard | security | baseline-v0 | 3 | 1 | 1 | 1 | 0 | 0 | 0 | 33.33% | 33.33% | $0.0358 | 350043ms | 84.00 | 41.33 | 33.33% |
| hist-003 | medium | state-management | agent-v1 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 50.00% | 50.00% | $0.0593 | 372541ms | 89.00 | 37.00 | 50.00% |
| hist-003 | medium | state-management | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0182 | 202047ms | 92.00 | 48.00 | 100.00% |
| hist-003 | medium | state-management | baseline-v0 | 4 | 3 | 1 | 0 | 0 | 0 | 0 | 75.00% | 75.00% | $0.0566 | 274884ms | 76.50 | 37.50 | 75.00% |
| hist-004 | easy | parsing | agent-v1 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.2018 | 426870ms | 158.00 | 70.00 | 100.00% |
| hist-004 | easy | parsing | agent-v2 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0267 | 217670ms | 116.00 | 54.00 | 0.00% |
| hist-004 | easy | parsing | baseline-v0 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0537 | 239644ms | 73.50 | 34.50 | 100.00% |
| hist-005 | medium | parsing | agent-v1 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.1519 | 360992ms | 135.00 | 60.00 | 100.00% |
| hist-005 | medium | parsing | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0166 | 169126ms | 106.00 | 52.00 | 100.00% |
| hist-005 | medium | parsing | baseline-v0 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0397 | 153466ms | 71.00 | 34.00 | 100.00% |
| hist-006 | medium | state-management | agent-v1 | 3 | 2 | 1 | 0 | 0 | 0 | 0 | 66.67% | 66.67% | $0.1247 | 448632ms | 142.67 | 68.67 | 66.67% |
| hist-006 | medium | state-management | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0219 | 229388ms | 102.00 | 52.00 | 100.00% |
| hist-006 | medium | state-management | baseline-v0 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0552 | 289532ms | 77.33 | 35.33 | 100.00% |
| synth-001 | medium | state-management | agent-v1 | 5 | 4 | 1 | 0 | 0 | 0 | 0 | 80.00% | 80.00% | $0.1587 | 316713ms | 173.60 | 79.20 | 80.00% |
| synth-001 | medium | state-management | agent-v2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0109 | 107511ms | 66.00 | 32.00 | 100.00% |
| synth-001 | medium | state-management | baseline-v0 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0287 | 92266ms | 65.00 | 33.00 | 100.00% |
| synth-002 | easy | validation | agent-v1 | 3 | 2 | 1 | 0 | 0 | 0 | 0 | 66.67% | 66.67% | $0.0835 | 441157ms | 186.67 | 86.00 | 66.67% |
| synth-002 | easy | validation | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0076 | 56462ms | 62.00 | 32.00 | 100.00% |
| synth-002 | easy | validation | baseline-v0 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0144 | 69408ms | 48.00 | 23.50 | 100.00% |
| synth-003 | medium | error-handling | agent-v1 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.1427 | 381412ms | 139.33 | 64.00 | 100.00% |
| synth-003 | medium | error-handling | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0074 | 95035ms | 54.00 | 28.00 | 100.00% |
| synth-003 | medium | error-handling | baseline-v0 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0554 | 190655ms | 88.67 | 45.33 | 100.00% |
| synth-004 | hard | state-management | agent-v1 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.1334 | 394363ms | 181.33 | 84.00 | 100.00% |
| synth-004 | hard | state-management | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0055 | 66936ms | 44.00 | 24.00 | 100.00% |
| synth-004 | hard | state-management | baseline-v0 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0135 | 137197ms | 49.33 | 24.00 | 100.00% |
| synth-005 | medium | boundary | agent-v1 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.1914 | 276008ms | 182.00 | 87.33 | 100.00% |
| synth-005 | medium | boundary | agent-v2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0065 | 81741ms | 58.00 | 28.00 | 100.00% |
| synth-005 | medium | boundary | baseline-v0 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 100.00% | 100.00% | $0.0122 | 58563ms | 38.67 | 19.33 | 100.00% |
| synth-006 | easy | api-behavior | agent-v1 | 3 | 1 | 0 | 2 | 0 | 0 | 0 | 33.33% | 33.33% | $0.1387 | 373984ms | 170.00 | 76.67 | 33.33% |
| synth-006 | easy | api-behavior | agent-v2 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0.00% | 0.00% | $0.0052 | 53024ms | 46.00 | 22.00 | 0.00% |
| synth-006 | easy | api-behavior | baseline-v0 | 3 | 2 | 0 | 1 | 0 | 0 | 0 | 66.67% | 66.67% | $0.0124 | 28093ms | 44.00 | 20.67 | 66.67% |

## Comparative V0 vs V1

| Metric | V0 | V1 | Delta |
| --- | --- | --- | --- |
| VFR | 70.97% | 60.00% | -10.97 pp |
| VFR (valid) | 72.13% | 60.00% | -12.13 pp |
| Reproduction Rate | 75.81% | 64.00% | -11.81 pp |
| Oracle Pass Rate | 72.58% | 60.00% | -12.58 pp |
| Regression-Free Rate | 97.78% | 100.00% | +2.22 pp |
| False Confidence Rate | 3.23% | 4.00% | +0.77 pp |
| Agent Failure Rate | 24.19% | 36.00% | +11.81 pp |
| Timeout Rate | 1.61% | 0.00% | -1.61 pp |
| Avg Cost (USD) | $0.0639 | $0.1225 | +0.06 |
| Median Cost (USD) | $0.0282 | $0.0459 | +0.02 |
| Total Cost (USD) | $3.9588 | $6.1265 | +2.17 |
| Avg Duration (ms) | 300739.66 | 437284.56 | +136544.90 |
| Median Duration (ms) | 256567.50 | 542664.00 | +286096.50 |
| Avg Turns | 85.58 | 152.76 | +67.18 |
| Median Turns | 77.00 | 132.00 | +55.00 |
| Avg Tool Calls | 42.13 | 71.40 | +29.27 |
| Median Tool Calls | 36.00 | 66.00 | +30.00 |
| Avg Tokens | 954473.23 | 2906306.60 | +1951833.37 |
| Median Tokens | 537914.00 | 2201338.00 | +1663424.00 |
| Avg Iterations | 1.00 | 1.08 | +0.08 |

> Deltas for percentages are percentage-point changes (e.g., V0 50% → V1 66.7% = +16.7 pp), not relative % improvement.

## Trajectory & Behavioral Analytics

### Performance Grouped by Outcome

| Outcome | Runs | Avg Duration | Avg Tool Calls | Avg Thinking Chars | Avg Edits | Avg Tests | Avg Cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| verified | 88 | 273.9s | 53.6 | 54803 | 6.2 | 8.3 | $0.0710 |
| agent_failure | 35 | 555.1s | 58.8 | 89641 | 2.9 | 7.2 | $0.1107 |
| false_confidence | 6 | 150.0s | 38.7 | 24213 | 6.3 | 6.7 | $0.0163 |

### Per-Run Tool & Resource Breakdown

| Case | Agent | Verdict | Duration | Cost | Reads | Edits | Bash | Tests | Repetitions | Thinking Chars | Expl/Edit Ratio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hard-001 | agent-v1 | VERIFIED | 416.4s | $0.0468 | 24 | 12 | 40 | 28 | 57 | 98720 | 6.5x |
| hard-001 | agent-v1 | AGENT_FAILURE | 608.3s | $0.0313 | 34 | 0 | 18 | 4 | 26 | 74792 | — |
| hard-001 | baseline-v0 | AGENT_FAILURE | 612.4s | $0.0707 | 18 | 0 | 10 | 2 | 19 | 38132 | — |
| hard-001 | baseline-v0 | VERIFIED | 551.0s | $0.0697 | 36 | 16 | 34 | 20 | 59 | 249472 | 4.38x |
| hard-001 | baseline-v0 | AGENT_FAILURE | 660.0s | $0.2967 | 28 | 0 | 42 | 10 | 44 | 209368 | — |
| hard-001 | agent-v1 | AGENT_FAILURE | 616.7s | $0.1876 | 40 | 0 | 10 | 0 | 31 | 71572 | — |
| hard-001 | agent-v2 | VERIFIED | 403.1s | $0.0406 | 26 | 12 | 18 | 10 | 39 | 129978 | 4.67x |
| hard-001 | baseline-v0 | AGENT_FAILURE | 601.3s | $0.0328 | 22 | 4 | 30 | 18 | 41 | 71320 | 17.5x |
| hard-002 | baseline-v0 | VERIFIED | 67.2s | $0.0123 | 8 | 2 | 10 | 4 | 14 | 18684 | 12x |
| hard-002 | agent-v2 | VERIFIED | 270.6s | $0.0241 | 18 | 8 | 22 | 6 | 35 | 53262 | 6x |
| hard-002 | agent-v1 | VERIFIED | 131.8s | $0.0217 | 10 | 2 | 26 | 8 | 22 | 30016 | 18x |
| hard-002 | agent-v1 | AGENT_FAILURE | 607.6s | $0.0144 | 10 | 0 | 26 | 6 | 21 | 20152 | — |
| hard-002 | agent-v1 | AGENT_FAILURE | 601.9s | $0.3029 | 28 | 0 | 64 | 6 | 57 | 39920 | — |
| hard-002 | baseline-v0 | AGENT_FAILURE | 601.2s | $0.0589 | 10 | 0 | 20 | 6 | 17 | 10712 | — |
| hard-002 | baseline-v0 | VERIFIED | 583.2s | $0.0172 | 14 | 2 | 16 | 4 | 23 | 20992 | 19x |
| hard-002 | baseline-v0 | AGENT_FAILURE | 603.6s | $0.1158 | 12 | 2 | 42 | 24 | 32 | 18860 | 29x |
| hard-003 | agent-v1 | AGENT_FAILURE | 608.6s | $0.0249 | 32 | 0 | 6 | 4 | 24 | 40672 | — |
| hard-003 | baseline-v0 | AGENT_FAILURE | 600.9s | $0.0309 | 18 | 0 | 6 | 4 | 15 | 146260 | — |
| hard-003 | agent-v1 | AGENT_FAILURE | 618.0s | $0.1283 | 20 | 0 | 16 | 0 | 18 | 58948 | — |
| hard-003 | baseline-v0 | AGENT_FAILURE | 604.1s | $0.1704 | 22 | 0 | 24 | 8 | 25 | 63754 | — |
| hard-003 | baseline-v0 | AGENT_FAILURE | 612.2s | $0.0576 | 18 | 0 | 4 | 0 | 18 | 19204 | — |
| hard-003 | baseline-v0 | AGENT_FAILURE | 610.7s | $0.0435 | 26 | 10 | 14 | 12 | 31 | 132854 | 4.6x |
| hard-003 | agent-v2 | AGENT_FAILURE | 385.0s | $0.0257 | 22 | 6 | 12 | 6 | 30 | 150468 | 7x |
| hard-003 | agent-v1 | AGENT_FAILURE | 601.7s | $0.0982 | 24 | 8 | 18 | 6 | 32 | 594172 | 6.5x |
| hard-004 | agent-v1 | AGENT_FAILURE | 607.8s | $0.0322 | 20 | 4 | 36 | 2 | 35 | 24402 | 15.5x |
| hard-004 | baseline-v0 | VERIFIED | 604.1s | $0.3268 | 20 | 6 | 54 | 30 | 46 | 173770 | 13x |
| hard-004 | baseline-v0 | TIMEOUT | 600.5s | $0.3010 | 24 | 8 | 60 | 14 | 57 | 101908 | 11.25x |
| hard-004 | baseline-v0 | AGENT_FAILURE | 600.8s | $0.0305 | 14 | 6 | 30 | 2 | 30 | 31184 | 8.33x |
| hard-004 | agent-v1 | VERIFIED | 468.6s | $0.0572 | 28 | 14 | 50 | 28 | 71 | 109032 | 6.29x |
| hard-004 | baseline-v0 | VERIFIED | 496.6s | $0.0255 | 22 | 8 | 16 | 10 | 30 | 50180 | 5.5x |
| hard-004 | agent-v1 | AGENT_FAILURE | 617.5s | $0.2122 | 22 | 0 | 40 | 8 | 35 | 44182 | — |
| hard-004 | agent-v2 | VERIFIED | 746.5s | $0.0729 | 26 | 34 | 52 | 10 | 85 | 165324 | 2.47x |
| hard-005 | baseline-v0 | VERIFIED | 557.2s | $0.0256 | 14 | 12 | 24 | 16 | 38 | 79800 | 3.67x |
| hard-005 | baseline-v0 | VERIFIED | 371.6s | $0.2684 | 26 | 12 | 54 | 20 | 66 | 70080 | 7.83x |
| hard-005 | agent-v1 | VERIFIED | 316.9s | $0.0285 | 8 | 4 | 34 | 12 | 31 | 62552 | 12x |
| hard-005 | agent-v1 | AGENT_FAILURE | 601.2s | $0.1224 | 16 | 0 | 46 | 8 | 39 | 8076 | — |
| hard-005 | baseline-v0 | VERIFIED | 396.1s | $0.0504 | 16 | 14 | 34 | 18 | 46 | 124388 | 4.14x |
| hard-005 | agent-v1 | VERIFIED | 471.2s | $0.0433 | 12 | 10 | 56 | 28 | 49 | 46660 | 7.2x |
| hard-005 | agent-v1 | VERIFIED | 607.9s | $0.0439 | 22 | 10 | 28 | 10 | 40 | 46362 | 5.6x |
| hard-005 | baseline-v0 | VERIFIED | 603.2s | $0.2154 | 22 | 4 | 42 | 6 | 45 | 52788 | 18x |
| hard-005 | agent-v2 | VERIFIED | 890.0s | $0.0922 | 14 | 46 | 50 | 8 | 80 | 236460 | 1.57x |
| hist-001 | baseline-v0 | AGENT_FAILURE | 274.2s | $0.0177 | 20 | 2 | 28 | 16 | 33 | 36728 | 27x |
| hist-001 | baseline-v0 | AGENT_FAILURE | 97.5s | $0.0153 | 18 | 6 | 6 | 6 | 24 | 32672 | 5x |
| hist-001 | agent-v2 | AGENT_FAILURE | 191.9s | $0.0209 | 16 | 6 | 18 | 6 | 27 | 75264 | 6.67x |
| hist-001 | agent-v1 | AGENT_FAILURE | 673.8s | $0.0613 | 32 | 18 | 48 | 14 | 71 | 74460 | 4.89x |
| hist-001 | baseline-v0 | AGENT_FAILURE | 600.5s | $0.2669 | 20 | 12 | 20 | 0 | 31 | 433268 | 3.67x |
| hist-001 | agent-v1 | AGENT_FAILURE | 604.0s | $0.2823 | 24 | 0 | 70 | 16 | 51 | 72580 | — |
| hist-001 | agent-v1 | AGENT_FAILURE | 189.5s | $0.0203 | 14 | 8 | 28 | 10 | 37 | 29900 | 6x |
| hist-001 | baseline-v0 | VERIFIED | 238.8s | $0.1128 | 20 | 2 | 22 | 12 | 28 | 69500 | 23x |
| hist-002 | baseline-v0 | VERIFIED | 368.6s | $0.0230 | 14 | 6 | 30 | 4 | 28 | 64504 | 8x |
| hist-002 | agent-v2 | VERIFIED | 273.4s | $0.0238 | 18 | 18 | 20 | 6 | 46 | 81624 | 2.44x |
| hist-002 | agent-v1 | AGENT_FAILURE | 603.6s | $0.2603 | 18 | 2 | 60 | 10 | 40 | 190740 | 39x |
| hist-002 | baseline-v0 | FALSE_CONFIDENCE | 80.1s | $0.0095 | 14 | 4 | 10 | 8 | 19 | 19016 | 7.5x |
| hist-002 | baseline-v0 | AGENT_FAILURE | 601.4s | $0.0750 | 14 | 4 | 18 | 6 | 18 | 79180 | 8x |
| hist-002 | agent-v1 | VERIFIED | 438.6s | $0.0440 | 14 | 4 | 46 | 16 | 44 | 130624 | 16.5x |
| hist-003 | baseline-v0 | AGENT_FAILURE | 601.9s | $0.0379 | 20 | 0 | 12 | 0 | 18 | 48792 | — |
| hist-003 | agent-v1 | VERIFIED | 141.4s | $0.0125 | 10 | 2 | 14 | 10 | 19 | 33120 | 13x |
| hist-003 | baseline-v0 | VERIFIED | 348.5s | $0.1647 | 18 | 4 | 20 | 6 | 26 | 157332 | 10.5x |
| hist-003 | agent-v1 | AGENT_FAILURE | 603.6s | $0.1062 | 24 | 0 | 18 | 4 | 23 | 44284 | — |
| hist-003 | baseline-v0 | VERIFIED | 55.6s | $0.0110 | 22 | 2 | 2 | 2 | 20 | 21260 | 16x |
| hist-003 | agent-v2 | VERIFIED | 201.6s | $0.0182 | 22 | 6 | 14 | 6 | 29 | 82566 | 7x |
| hist-003 | baseline-v0 | VERIFIED | 93.4s | $0.0126 | 18 | 4 | 6 | 6 | 22 | 38316 | 7.5x |
| hist-004 | agent-v2 | FALSE_CONFIDENCE | 216.0s | $0.0267 | 12 | 16 | 20 | 4 | 35 | 66390 | 2.38x |
| hist-004 | baseline-v0 | VERIFIED | 187.0s | $0.1096 | 12 | 2 | 26 | 4 | 24 | 79620 | 21x |
| hist-004 | agent-v1 | VERIFIED | 252.8s | $0.0308 | 10 | 2 | 26 | 10 | 28 | 126060 | 22x |
| hist-004 | baseline-v0 | VERIFIED | 555.4s | $0.0799 | 10 | 2 | 16 | 4 | 17 | 74072 | 15x |
| hist-004 | baseline-v0 | VERIFIED | 136.2s | $0.0151 | 8 | 4 | 26 | 4 | 21 | 37856 | 8.5x |
| hist-004 | agent-v1 | VERIFIED | 600.9s | $0.3728 | 16 | 4 | 70 | 10 | 53 | 131400 | 22.5x |
| hist-004 | baseline-v0 | VERIFIED | 80.0s | $0.0103 | 10 | 4 | 4 | 2 | 13 | 43664 | 5x |
| hist-005 | baseline-v0 | VERIFIED | 101.7s | $0.0693 | 12 | 4 | 26 | 4 | 26 | 15044 | 10.5x |
| hist-005 | agent-v1 | VERIFIED | 601.7s | $0.2902 | 18 | 6 | 54 | 8 | 46 | 90200 | 12.67x |
| hist-005 | baseline-v0 | VERIFIED | 320.5s | $0.0676 | 16 | 4 | 16 | 6 | 24 | 34852 | 9x |
| hist-005 | baseline-v0 | VERIFIED | 68.7s | $0.0069 | 10 | 2 | 4 | 2 | 12 | 17348 | 10x |
| hist-005 | agent-v1 | VERIFIED | 120.2s | $0.0137 | 10 | 4 | 18 | 8 | 24 | 24924 | 8.5x |
| hist-005 | baseline-v0 | VERIFIED | 123.0s | $0.0150 | 12 | 4 | 6 | 4 | 17 | 62508 | 6x |
| hist-005 | agent-v2 | VERIFIED | 168.2s | $0.0166 | 14 | 12 | 20 | 4 | 35 | 48726 | 3.33x |
| hist-006 | agent-v1 | VERIFIED | 259.9s | $0.0311 | 22 | 10 | 14 | 4 | 32 | 46756 | 4.4x |
| hist-006 | agent-v2 | VERIFIED | 228.9s | $0.0219 | 20 | 6 | 16 | 6 | 33 | 92394 | 7.67x |
| hist-006 | baseline-v0 | VERIFIED | 535.3s | $0.1314 | 22 | 2 | 8 | 4 | 20 | 199124 | 18x |
| hist-006 | agent-v1 | AGENT_FAILURE | 601.4s | $0.3025 | 18 | 0 | 74 | 16 | 52 | 75572 | — |
| hist-006 | agent-v1 | VERIFIED | 484.5s | $0.0406 | 16 | 8 | 26 | 10 | 33 | 210924 | 6x |
| hist-006 | baseline-v0 | VERIFIED | 44.8s | $0.0086 | 12 | 2 | 2 | 2 | 12 | 20128 | 10x |
| hist-006 | baseline-v0 | VERIFIED | 288.6s | $0.0257 | 12 | 10 | 16 | 14 | 31 | 107288 | 3.6x |
| synth-001 | agent-v2 | VERIFIED | 106.1s | $0.0099 | 8 | 6 | 10 | 2 | 16 | 13488 | 4x |
| synth-001 | agent-v1 | AGENT_FAILURE | 601.7s | $0.1659 | 22 | 0 | 52 | 4 | 43 | 41736 | — |
| synth-001 | baseline-v0 | VERIFIED | 45.9s | $0.0073 | 18 | 2 | 2 | 2 | 15 | 12924 | 13x |
| synth-001 | agent-v1 | VERIFIED | 267.5s | $0.5201 | 26 | 10 | 96 | 36 | 79 | 55840 | 13.4x |
| synth-001 | baseline-v0 | VERIFIED | 27.3s | $0.0056 | 16 | 2 | 2 | 2 | 14 | 4860 | 12x |
| synth-001 | agent-v1 | VERIFIED | 110.9s | $0.0099 | 16 | 2 | 12 | 10 | 22 | 9104 | 17x |
| synth-001 | baseline-v0 | VERIFIED | 148.4s | $0.0592 | 20 | 2 | 22 | 6 | 23 | 16888 | 21x |
| synth-001 | agent-v1 | VERIFIED | 129.9s | $0.0108 | 16 | 2 | 12 | 10 | 22 | 6488 | 17x |
| synth-001 | baseline-v0 | VERIFIED | 147.5s | $0.0426 | 18 | 2 | 10 | 2 | 18 | 15604 | 16x |
| synth-001 | agent-v1 | VERIFIED | 473.4s | $0.0867 | 34 | 16 | 42 | 10 | 69 | 51240 | 5.25x |
| synth-001 | agent-v2 | VERIFIED | 107.3s | $0.0119 | 14 | 4 | 10 | 6 | 21 | 29016 | 7.5x |
| synth-002 | agent-v1 | VERIFIED | 600.8s | $0.0892 | 32 | 18 | 102 | 22 | 102 | 45844 | 7.78x |
| synth-002 | baseline-v0 | VERIFIED | 78.6s | $0.0209 | 12 | 2 | 4 | 2 | 12 | 828 | 10x |
| synth-002 | agent-v2 | VERIFIED | 55.9s | $0.0076 | 10 | 6 | 10 | 2 | 17 | 8550 | 4.33x |
| synth-002 | baseline-v0 | VERIFIED | 124.8s | $0.0251 | 12 | 2 | 6 | 2 | 13 | 5056 | 11x |
| synth-002 | agent-v1 | VERIFIED | 119.8s | $0.0075 | 8 | 2 | 12 | 10 | 18 | 6780 | 13x |
| synth-002 | baseline-v0 | VERIFIED | 43.7s | $0.0068 | 12 | 2 | 6 | 2 | 14 | 7068 | 12x |
| synth-002 | agent-v1 | AGENT_FAILURE | 602.8s | $0.1537 | 10 | 2 | 60 | 8 | 36 | 33260 | 35x |
| synth-002 | baseline-v0 | VERIFIED | 30.5s | $0.0045 | 12 | 2 | 2 | 2 | 12 | 5460 | 10x |
| synth-003 | baseline-v0 | VERIFIED | 115.8s | $0.0073 | 14 | 2 | 6 | 2 | 15 | 8724 | 13x |
| synth-003 | agent-v1 | VERIFIED | 603.7s | $0.3960 | 30 | 8 | 64 | 12 | 64 | 74732 | 13x |
| synth-003 | baseline-v0 | VERIFIED | 419.2s | $0.1520 | 14 | 2 | 62 | 8 | 42 | 46352 | 40x |
| synth-003 | agent-v2 | VERIFIED | 94.2s | $0.0074 | 14 | 2 | 6 | 4 | 16 | 22812 | 13x |
| synth-003 | agent-v1 | VERIFIED | 270.1s | $0.0230 | 18 | 6 | 18 | 6 | 28 | 26248 | 7x |
| synth-003 | agent-v1 | VERIFIED | 270.4s | $0.0091 | 12 | 2 | 12 | 10 | 20 | 18284 | 15x |
| synth-003 | baseline-v0 | VERIFIED | 37.0s | $0.0069 | 14 | 2 | 4 | 2 | 14 | 9488 | 12x |
| synth-004 | agent-v1 | VERIFIED | 603.5s | $0.3097 | 22 | 4 | 66 | 8 | 53 | 63208 | 23.5x |
| synth-004 | baseline-v0 | VERIFIED | 78.9s | $0.0042 | 8 | 2 | 2 | 2 | 9 | 2632 | 8x |
| synth-004 | agent-v2 | VERIFIED | 65.7s | $0.0055 | 12 | 2 | 4 | 4 | 12 | 7266 | 11x |
| synth-004 | agent-v1 | VERIFIED | 483.1s | $0.0826 | 18 | 8 | 96 | 16 | 75 | 49496 | 14.25x |
| synth-004 | baseline-v0 | VERIFIED | 303.9s | $0.0313 | 18 | 2 | 4 | 2 | 15 | 3288 | 13x |
| synth-004 | baseline-v0 | VERIFIED | 28.7s | $0.0050 | 16 | 2 | 2 | 2 | 16 | 4696 | 12x |
| synth-004 | agent-v1 | VERIFIED | 96.4s | $0.0080 | 12 | 2 | 12 | 10 | 20 | 5700 | 15x |
| synth-005 | agent-v2 | VERIFIED | 81.1s | $0.0065 | 10 | 4 | 8 | 2 | 16 | 14658 | 6x |
| synth-005 | agent-v1 | VERIFIED | 603.5s | $0.5410 | 32 | 14 | 126 | 14 | 112 | 71662 | 12x |
| synth-005 | agent-v1 | VERIFIED | 96.0s | $0.0094 | 10 | 2 | 18 | 10 | 18 | 10724 | 14x |
| synth-005 | baseline-v0 | VERIFIED | 28.7s | $0.0040 | 8 | 2 | 2 | 2 | 9 | 4244 | 8x |
| synth-005 | baseline-v0 | VERIFIED | 111.8s | $0.0277 | 12 | 2 | 6 | 2 | 11 | 21016 | 9x |
| synth-005 | agent-v1 | VERIFIED | 128.5s | $0.0238 | 18 | 10 | 14 | 2 | 30 | 20036 | 4x |
| synth-005 | baseline-v0 | VERIFIED | 35.1s | $0.0051 | 10 | 2 | 2 | 2 | 11 | 6836 | 9x |
| synth-006 | agent-v2 | FALSE_CONFIDENCE | 52.3s | $0.0052 | 10 | 2 | 4 | 4 | 14 | 9606 | 10x |
| synth-006 | agent-v1 | VERIFIED | 600.9s | $0.3639 | 26 | 8 | 78 | 26 | 72 | 64292 | 14.75x |
| synth-006 | baseline-v0 | VERIFIED | 22.4s | $0.0039 | 6 | 2 | 2 | 2 | 8 | 5916 | 7x |
| synth-006 | agent-v1 | FALSE_CONFIDENCE | 263.7s | $0.0071 | 8 | 2 | 12 | 10 | 18 | 4788 | 13x |
| synth-006 | baseline-v0 | VERIFIED | 31.2s | $0.0288 | 14 | 2 | 8 | 2 | 15 | 5104 | 13x |
| synth-006 | baseline-v0 | FALSE_CONFIDENCE | 30.6s | $0.0045 | 8 | 2 | 2 | 2 | 10 | 6688 | 8x |
| synth-006 | agent-v1 | FALSE_CONFIDENCE | 257.4s | $0.0450 | 26 | 12 | 30 | 12 | 49 | 38788 | 5.33x |

## Reliability Across Repeated Runs

| Case | Runs | Verified | Consistency | Has Variance |
| --- | --- | --- | --- | --- |
| hard-001 | 8 | 3 | 37.50% | YES |
| hard-002 | 8 | 4 | 50.00% | YES |
| hard-003 | 8 | 0 | 0.00% | no |
| hard-004 | 8 | 4 | 50.00% | YES |
| hard-005 | 9 | 8 | 88.89% | YES |
| hist-001 | 8 | 1 | 12.50% | YES |
| hist-002 | 6 | 3 | 50.00% | YES |
| hist-003 | 7 | 5 | 71.43% | YES |
| hist-004 | 7 | 6 | 85.71% | YES |
| hist-005 | 7 | 7 | 100.00% | no |
| hist-006 | 7 | 6 | 85.71% | YES |
| synth-001 | 11 | 10 | 90.91% | YES |
| synth-002 | 8 | 7 | 87.50% | YES |
| synth-003 | 7 | 7 | 100.00% | no |
| synth-004 | 7 | 7 | 100.00% | no |
| synth-005 | 7 | 7 | 100.00% | no |
| synth-006 | 7 | 3 | 42.86% | YES |

**Unreliable cases (variance):** hard-001 (3/8 37.5%), hard-002 (4/8 50.0%), hard-004 (4/8 50.0%), hard-005 (8/9 88.9%), hist-001 (1/8 12.5%), hist-002 (3/6 50.0%), hist-003 (5/7 71.4%), hist-004 (6/7 85.7%), hist-006 (6/7 85.7%), synth-001 (10/11 90.9%), synth-002 (7/8 87.5%), synth-006 (3/7 42.9%)

## Historical vs Synthetic

| Type | Total | Verified | VFR | Oracle Rate | False Confidence |
| --- | --- | --- | --- | --- | --- |
| historical | 83 | 47 | 56.63% | 57.83% | 2.41% |
| synthetic | 47 | 41 | 87.23% | 87.23% | 8.51% |

## Difficulty Breakdown

| Difficulty | Total | Verified | VFR | Repro Rate | Oracle Rate |
| --- | --- | --- | --- | --- | --- |
| easy | 22 | 16 | 72.73% | 95.45% | 72.73% |
| medium | 54 | 43 | 79.63% | 79.63% | 79.63% |
| hard | 54 | 29 | 53.70% | 57.41% | 55.56% |

## Category Breakdown

| Category | Total | Verified | VFR | False Confidence |
| --- | --- | --- | --- | --- |
| alias-handling | 7 | 7 | 100.00% | 0.00% |
| api-behavior | 38 | 26 | 68.42% | 10.53% |
| asynchronous | 15 | 11 | 73.33% | 0.00% |
| boundary | 15 | 11 | 73.33% | 0.00% |
| business-logic | 19 | 17 | 89.47% | 0.00% |
| data-transformation | 16 | 15 | 93.75% | 0.00% |
| error-handling | 22 | 14 | 63.64% | 18.18% |
| lifecycle | 8 | 3 | 37.50% | 0.00% |
| parsing | 47 | 26 | 55.32% | 2.13% |
| security | 6 | 3 | 50.00% | 16.67% |
| serialization | 8 | 0 | 0.00% | 0.00% |
| state-management | 64 | 39 | 60.94% | 0.00% |
| type-coercion | 7 | 6 | 85.71% | 14.29% |
| validation | 22 | 11 | 50.00% | 4.55% |

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
| hard-001-run-001-14d43b | hard-001 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 8025ms | $0.0468 | 198 | 4237540 | 3 |
| hard-001-run-001-214fa3 | hard-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2284ms | $0.0313 | 82 | 1380040 | 0 |
| hard-001-run-001-6b5d9f | hard-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2524ms | $0.0707 | 84 | 837912 | 1 |
| hard-001-run-001-72f0a8 | hard-001 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 8304ms | $0.0697 | 158 | 4616880 | 1 |
| hard-001-run-001-7f51ea | hard-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2654ms | $0.2967 | 168 | 3089650 | 1 |
| hard-001-run-001-a76370 | hard-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2454ms | $0.1876 | 132 | 2365468 | 0 |
| hard-001-run-001-c320c2 | hard-001 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 8135ms | $0.0406 | 134 | 2467040 | 1 |
| hard-001-run-001-c5db09 | hard-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 3264ms | $0.0328 | 144 | 2505124 | 1 |
| hard-002-run-001-1d7540 | hard-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1965ms | $0.0123 | 54 | 449500 | 1 |
| hard-002-run-001-48007a | hard-002 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2139ms | $0.0241 | 118 | 1688776 | 1 |
| hard-002-run-001-686cde | hard-002 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2605ms | $0.0217 | 94 | 1167956 | 3 |
| hard-002-run-001-a165f7 | hard-002 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1176ms | $0.0144 | 84 | 992748 | 0 |
| hard-002-run-001-a74613 | hard-002 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2031ms | $0.3029 | 202 | 3979976 | 0 |
| hard-002-run-001-e88bde | hard-002 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1608ms | $0.0589 | 76 | 609796 | 1 |
| hard-002-run-001-f38dcb | hard-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2274ms | $0.0172 | 80 | 895912 | 1 |
| hard-002-run-001-fbed24 | hard-002 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1685ms | $0.1158 | 120 | 1391098 | 1 |
| hard-003-run-001-737a2e | hard-003 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1647ms | $0.0249 | 64 | 531248 | 0 |
| hard-003-run-001-7ba7a9 | hard-003 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1847ms | $0.0309 | 62 | 513236 | 1 |
| hard-003-run-001-7d2b0b | hard-003 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1162ms | $0.1283 | 86 | 1220004 | 0 |
| hard-003-run-001-8f7ce7 | hard-003 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1816ms | $0.1704 | 100 | 1475264 | 1 |
| hard-003-run-001-8fd896 | hard-003 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1341ms | $0.0576 | 72 | 511172 | 1 |
| hard-003-run-001-a317f1 | hard-003 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2010ms | $0.0435 | 94 | 1754722 | 1 |
| hard-003-run-001-bba12d | hard-003 | agent-v2 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1604ms | $0.0257 | 92 | 1002280 | 1 |
| hard-003-run-001-c041b3 | hard-003 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1379ms | $0.0982 | 110 | 3047370 | 0 |
| hard-004-run-001-229ddd | hard-004 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2012ms | $0.0322 | 132 | 2801514 | 0 |
| hard-004-run-001-36f07b | hard-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1925ms | $0.3268 | 168 | 4037088 | 1 |
| hard-004-run-001-405360 | hard-004 | baseline-v0 | TIMEOUT | PASSED | PASSED | PASSED | TIMEOUT | 31510ms | $0.3010 | 202 | 3659480 | 1 |
| hard-004-run-001-8ec14b | hard-004 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1545ms | $0.0305 | 106 | 1771240 | 1 |
| hard-004-run-001-9398e0 | hard-004 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1698ms | $0.0572 | 212 | 5006332 | 3 |
| hard-004-run-001-a53c6e | hard-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2318ms | $0.0255 | 96 | 1326904 | 1 |
| hard-004-run-001-dcbb8b | hard-004 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1882ms | $0.2122 | 144 | 2712180 | 0 |
| hard-004-run-001-ee4d7d | hard-004 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1531ms | $0.0729 | 242 | 6896532 | 1 |
| hard-005-run-001-017ebf | hard-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2102ms | $0.0256 | 114 | 1288116 | 1 |
| hard-005-run-001-1f527a | hard-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1689ms | $0.2684 | 218 | 3298540 | 1 |
| hard-005-run-001-2598bc | hard-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1633ms | $0.0285 | 128 | 1707276 | 3 |
| hard-005-run-001-6d1ede | hard-005 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1129ms | $0.1224 | 144 | 1559118 | 0 |
| hard-005-run-001-810dbc | hard-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1613ms | $0.0504 | 146 | 2697292 | 1 |
| hard-005-run-001-8beefc | hard-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1402ms | $0.0433 | 192 | 4356484 | 3 |
| hard-005-run-001-8f0888 | hard-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1436ms | $0.0439 | 120 | 2996870 | 0 |
| hard-005-run-001-c5c839 | hard-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1571ms | $0.2154 | 160 | 2474336 | 1 |
| hard-005-run-001-eafe4b | hard-005 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1460ms | $0.0922 | 246 | 7698820 | 1 |
| hist-001-run-001-09514a | hist-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1290ms | $0.0177 | 112 | 1156584 | 1 |
| hist-001-run-001-0f86e4 | hist-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1224ms | $0.0153 | 70 | 592052 | 1 |
| hist-001-run-001-2f0d89 | hist-001 | agent-v2 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1183ms | $0.0209 | 100 | 1060352 | 1 |
| hist-001-run-001-663a4f | hist-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1435ms | $0.0613 | 214 | 5308288 | 0 |
| hist-001-run-001-a06884 | hist-001 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1129ms | $0.2669 | 118 | 1590904 | 1 |
| hist-001-run-001-a20e85 | hist-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1054ms | $0.2823 | 204 | 3636960 | 0 |
| hist-001-run-001-a6fcdc | hist-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1104ms | $0.0203 | 128 | 1199780 | 3 |
| hist-001-run-001-d913a2 | hist-001 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1902ms | $0.1128 | 102 | 1074132 | 1 |
| hist-002-run-001-751380 | hist-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1292ms | $0.0230 | 104 | 871832 | 1 |
| hist-002-run-001-8641aa | hist-002 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1672ms | $0.0238 | 124 | 1149932 | 1 |
| hist-002-run-001-ec6bd1 | hist-002 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 777ms | $0.2603 | 166 | 2902808 | 0 |
| hist-002-run-001-edd8d4 | hist-002 | baseline-v0 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1237ms | $0.0095 | 64 | 306056 | 1 |
| hist-002-run-001-f867b2 | hist-002 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 955ms | $0.0750 | 84 | 536444 | 1 |
| hist-002-run-001-f9fffa | hist-002 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1278ms | $0.0440 | 164 | 2442712 | 3 |
| hist-003-run-001-122aaf | hist-003 | baseline-v0 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1895ms | $0.0379 | 84 | 438278 | 1 |
| hist-003-run-001-28a3f7 | hist-003 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1756ms | $0.0125 | 78 | 590016 | 3 |
| hist-003-run-001-383e28 | hist-003 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1589ms | $0.1647 | 98 | 1382980 | 1 |
| hist-003-run-001-58c6e2 | hist-003 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2144ms | $0.1062 | 100 | 1103620 | 0 |
| hist-003-run-001-650a23 | hist-003 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1799ms | $0.0110 | 62 | 372164 | 1 |
| hist-003-run-001-8c14a5 | hist-003 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1404ms | $0.0182 | 92 | 799660 | 1 |
| hist-003-run-001-8f9ea0 | hist-003 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1625ms | $0.0126 | 62 | 413528 | 1 |
| hist-004-run-001-0c6917 | hist-004 | agent-v2 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1141ms | $0.0267 | 116 | 1101524 | 1 |
| hist-004-run-001-2610c2 | hist-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1554ms | $0.1096 | 94 | 786996 | 1 |
| hist-004-run-001-7c58e0 | hist-004 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1298ms | $0.0308 | 108 | 1357996 | 3 |
| hist-004-run-001-9ebfc0 | hist-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1328ms | $0.0799 | 74 | 521352 | 1 |
| hist-004-run-001-ca680a | hist-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1284ms | $0.0151 | 78 | 539384 | 1 |
| hist-004-run-001-e166c8 | hist-004 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1481ms | $0.3728 | 208 | 4255680 | 0 |
| hist-004-run-001-ea63f6 | hist-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1485ms | $0.0103 | 48 | 235868 | 1 |
| hist-005-run-001-2da2d5 | hist-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1346ms | $0.0693 | 98 | 629888 | 1 |
| hist-005-run-001-411a8d | hist-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1491ms | $0.2902 | 176 | 3431036 | 0 |
| hist-005-run-001-4b73f1 | hist-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1353ms | $0.0676 | 90 | 579812 | 1 |
| hist-005-run-001-524675 | hist-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1294ms | $0.0069 | 42 | 158472 | 1 |
| hist-005-run-001-79d6f0 | hist-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1232ms | $0.0137 | 94 | 674468 | 3 |
| hist-005-run-001-dab367 | hist-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1662ms | $0.0150 | 54 | 357784 | 1 |
| hist-005-run-001-ea5728 | hist-005 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1217ms | $0.0166 | 106 | 822356 | 1 |
| hist-006-run-001-2f12b5 | hist-006 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1636ms | $0.0311 | 96 | 1560436 | 0 |
| hist-006-run-001-5fac47 | hist-006 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1264ms | $0.0219 | 102 | 1124908 | 1 |
| hist-006-run-001-96aa54 | hist-006 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1409ms | $0.1314 | 90 | 803832 | 1 |
| hist-006-run-001-c92da0 | hist-006 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 952ms | $0.3025 | 200 | 3691796 | 0 |
| hist-006-run-001-d3064d | hist-006 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1588ms | $0.0406 | 132 | 2037208 | 3 |
| hist-006-run-001-d74f57 | hist-006 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1450ms | $0.0086 | 44 | 204628 | 1 |
| hist-006-run-001-f415e7 | hist-006 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1678ms | $0.0257 | 98 | 1051472 | 1 |
| synth-001-fce4ddf9-1788175245246 | synth-001 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1477ms | $0.0099 | 66 | 392220 | 1 |
| synth-001-run-001-281284 | synth-001 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 846ms | $0.1659 | 168 | 2025144 | 0 |
| synth-001-run-001-703bcb | synth-001 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1489ms | $0.0073 | 48 | 167356 | 1 |
| synth-001-run-001-808c47 | synth-001 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1338ms | $0.5201 | 318 | 6881764 | 0 |
| synth-001-run-001-94da3e | synth-001 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1597ms | $0.0056 | 44 | 136836 | 1 |
| synth-001-run-001-9e3426 | synth-001 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1333ms | $0.0099 | 84 | 476852 | 3 |
| synth-001-run-001-a4c9d9 | synth-001 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1633ms | $0.0592 | 94 | 570128 | 1 |
| synth-001-run-001-b91481 | synth-001 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1308ms | $0.0108 | 82 | 456156 | 3 |
| synth-001-run-001-cc74e7 | synth-001 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1659ms | $0.0426 | 74 | 392544 | 1 |
| synth-001-run-001-dcd329 | synth-001 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1321ms | $0.0867 | 216 | 9019464 | 0 |
| synth-001-run-001-f903f7 | synth-001 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1645ms | $0.0119 | 66 | 360180 | 1 |
| synth-002-run-001-274217 | synth-002 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1219ms | $0.0892 | 330 | 12180100 | 0 |
| synth-002-run-001-7f79f7 | synth-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1295ms | $0.0209 | 50 | 174260 | 1 |
| synth-002-run-001-8da458 | synth-002 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1241ms | $0.0076 | 62 | 285600 | 1 |
| synth-002-run-001-9a5f3f | synth-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1478ms | $0.0251 | 54 | 201340 | 1 |
| synth-002-run-001-a9bece | synth-002 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1200ms | $0.0075 | 74 | 372176 | 3 |
| synth-002-run-001-bf1de8 | synth-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1427ms | $0.0068 | 48 | 181576 | 1 |
| synth-002-run-001-dced56 | synth-002 | agent-v1 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1001ms | $0.1537 | 156 | 1819272 | 0 |
| synth-002-run-001-ef444f | synth-002 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1249ms | $0.0045 | 40 | 114616 | 1 |
| synth-003-run-001-23ed30 | synth-003 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1539ms | $0.0073 | 50 | 193408 | 1 |
| synth-003-run-001-264a83 | synth-003 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1216ms | $0.3960 | 238 | 4911636 | 0 |
| synth-003-run-001-2b9680 | synth-003 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1356ms | $0.1520 | 170 | 1663988 | 1 |
| synth-003-run-001-36927f | synth-003 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1235ms | $0.0074 | 54 | 237476 | 1 |
| synth-003-run-001-daafee | synth-003 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1279ms | $0.0230 | 94 | 1245656 | 0 |
| synth-003-run-001-e42ff2 | synth-003 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1532ms | $0.0091 | 86 | 451100 | 3 |
| synth-003-run-001-fdbe69 | synth-003 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1368ms | $0.0069 | 46 | 162800 | 1 |
| synth-004-run-001-3a67f2 | synth-004 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1475ms | $0.3097 | 208 | 3930364 | 0 |
| synth-004-run-001-56ae0c | synth-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1251ms | $0.0042 | 34 | 96568 | 1 |
| synth-004-run-001-a50efb | synth-004 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1540ms | $0.0055 | 44 | 159200 | 1 |
| synth-004-run-001-c6b9e2 | synth-004 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1275ms | $0.0826 | 258 | 10419032 | 0 |
| synth-004-run-001-eb669c | synth-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1560ms | $0.0313 | 66 | 299388 | 1 |
| synth-004-run-001-f4c644 | synth-004 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1273ms | $0.0050 | 48 | 148496 | 1 |
| synth-004-run-001-fb40e1 | synth-004 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1543ms | $0.0080 | 78 | 393924 | 3 |
| synth-005-run-001-013483 | synth-005 | agent-v2 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1437ms | $0.0065 | 58 | 262384 | 1 |
| synth-005-run-001-190edb | synth-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1402ms | $0.5410 | 380 | 7429422 | 0 |
| synth-005-run-001-60a979 | synth-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1267ms | $0.0094 | 74 | 390132 | 3 |
| synth-005-run-001-738d06 | synth-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1371ms | $0.0040 | 34 | 90156 | 1 |
| synth-005-run-001-ae9403 | synth-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1349ms | $0.0277 | 46 | 186548 | 1 |
| synth-005-run-001-dd8b5c | synth-005 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1352ms | $0.0238 | 92 | 1208080 | 0 |
| synth-005-run-001-e03bab | synth-005 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1446ms | $0.0051 | 36 | 95860 | 1 |
| synth-006-run-001-08d85f | synth-006 | agent-v2 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1097ms | $0.0052 | 46 | 191572 | 1 |
| synth-006-run-001-13a5ed | synth-006 | agent-v1 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1549ms | $0.3639 | 282 | 4308784 | 0 |
| synth-006-run-001-41b611 | synth-006 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1221ms | $0.0039 | 32 | 90296 | 1 |
| synth-006-run-001-445830 | synth-006 | agent-v1 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1229ms | $0.0071 | 76 | 349760 | 3 |
| synth-006-run-001-b538c3 | synth-006 | baseline-v0 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1292ms | $0.0288 | 62 | 276788 | 1 |
| synth-006-run-001-b56c68 | synth-006 | baseline-v0 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1213ms | $0.0045 | 38 | 126684 | 1 |
| synth-006-run-001-f04458 | synth-006 | agent-v1 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1278ms | $0.0450 | 152 | 2791584 | 0 |

---
*Generated from executable evidence. Benchmark 0.5 sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf — Evaluator 0.0.0.*
