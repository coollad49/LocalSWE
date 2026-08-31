# Baseline Evaluation Report — baseline-v0

**Benchmark:** 0.5 `sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf`
**Experiment:** baseline-v0
**Runs Dir:** `C:\Users\cooll\Documents\code\frontier-verifier\experiments\runs`
**Timestamp:** 2026-08-31T11:59:59.495Z
**Total Runs:** 130

| Metric | Baseline v0 | V1 (Target) | Status |
| --- | --- | --- | --- |
| **Verified Fix Rate (VFR)** | **67.69%** (88/130) | *Pending* | Primary Metric |
| **Reproduction Success Rate** | **73.08%** (95/130) | *Pending* | Public Repro |
| **Oracle Success Rate** | **68.46%** (89/130) | *Pending* | Hidden Spec |
| **Regression-Free Rate** | **98.88%** (88/89) | *Pending* | No Side Effects |
| **False Confidence Rate** | **4.62%** (6/130) | *Pending* | Repro Pass / Oracle Fail |

## Summary Metrics

- **Total Eligible Runs:** 130
- **Completed:** 129  **Errors:** 0  **Timeouts:** 1
- **VFR:** 67.69% (88/130)
- **Reproduction Rate:** 73.08% (95/130)
- **Oracle Rate:** 68.46% (89/130)
- **Regression-Free Rate:** 98.88% (88/89)
- **False Confidence Rate:** 4.62% (6/130)

## Failure Breakdown

| Outcome | Count | Percentage |
| --- | --- | --- |
| VERIFIED | 88 | 67.69% |
| AGENT_FAILURE | 35 | 26.92% |
| FALSE_CONFIDENCE | 6 | 4.62% |
| REGRESSION_FAILURE | 0 | 0.00% |
| PATCH_FAILED | 0 | 0.00% |
| TIMEOUT | 1 | 0.77% |
| ERROR | 0 | 0.00% |

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

## Case Stability

| Case | Runs | Verified | Stability | Has Variance |
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

**Non-deterministic cases (variance):** hard-001 (3/8), hard-002 (4/8), hard-004 (4/8), hard-005 (8/9), hist-001 (1/8), hist-002 (3/6), hist-003 (5/7), hist-004 (6/7), hist-006 (6/7), synth-001 (10/11), synth-002 (7/8), synth-006 (3/7)

## Per-Case Results

| Run | Case | Verdict | Patch | Repro | Oracle | Regression | Duration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| hard-001-run-001-14d43b | hard-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 8025ms |
| hard-001-run-001-214fa3 | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2284ms |
| hard-001-run-001-6b5d9f | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2524ms |
| hard-001-run-001-72f0a8 | hard-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 8304ms |
| hard-001-run-001-7f51ea | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2654ms |
| hard-001-run-001-a76370 | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2454ms |
| hard-001-run-001-c320c2 | hard-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 8135ms |
| hard-001-run-001-c5db09 | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 3264ms |
| hard-002-run-001-1d7540 | hard-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1965ms |
| hard-002-run-001-48007a | hard-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2139ms |
| hard-002-run-001-686cde | hard-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2605ms |
| hard-002-run-001-a165f7 | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1176ms |
| hard-002-run-001-a74613 | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2031ms |
| hard-002-run-001-e88bde | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1608ms |
| hard-002-run-001-f38dcb | hard-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2274ms |
| hard-002-run-001-fbed24 | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1685ms |
| hard-003-run-001-737a2e | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1647ms |
| hard-003-run-001-7ba7a9 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1847ms |
| hard-003-run-001-7d2b0b | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1162ms |
| hard-003-run-001-8f7ce7 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1816ms |
| hard-003-run-001-8fd896 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1341ms |
| hard-003-run-001-a317f1 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2010ms |
| hard-003-run-001-bba12d | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1604ms |
| hard-003-run-001-c041b3 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1379ms |
| hard-004-run-001-229ddd | hard-004 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2012ms |
| hard-004-run-001-36f07b | hard-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1925ms |
| hard-004-run-001-405360 | hard-004 | TIMEOUT | PASSED | PASSED | PASSED | TIMEOUT | 31510ms |
| hard-004-run-001-8ec14b | hard-004 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1545ms |
| hard-004-run-001-9398e0 | hard-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1698ms |
| hard-004-run-001-a53c6e | hard-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2318ms |
| hard-004-run-001-dcbb8b | hard-004 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1882ms |
| hard-004-run-001-ee4d7d | hard-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1531ms |
| hard-005-run-001-017ebf | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2102ms |
| hard-005-run-001-1f527a | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1689ms |
| hard-005-run-001-2598bc | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1633ms |
| hard-005-run-001-6d1ede | hard-005 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1129ms |
| hard-005-run-001-810dbc | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1613ms |
| hard-005-run-001-8beefc | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1402ms |
| hard-005-run-001-8f0888 | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1436ms |
| hard-005-run-001-c5c839 | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1571ms |
| hard-005-run-001-eafe4b | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1460ms |
| hist-001-run-001-09514a | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1290ms |
| hist-001-run-001-0f86e4 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1224ms |
| hist-001-run-001-2f0d89 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1183ms |
| hist-001-run-001-663a4f | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1435ms |
| hist-001-run-001-a06884 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1129ms |
| hist-001-run-001-a20e85 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1054ms |
| hist-001-run-001-a6fcdc | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1104ms |
| hist-001-run-001-d913a2 | hist-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1902ms |
| hist-002-run-001-751380 | hist-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1292ms |
| hist-002-run-001-8641aa | hist-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1672ms |
| hist-002-run-001-ec6bd1 | hist-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 777ms |
| hist-002-run-001-edd8d4 | hist-002 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1237ms |
| hist-002-run-001-f867b2 | hist-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 955ms |
| hist-002-run-001-f9fffa | hist-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1278ms |
| hist-003-run-001-122aaf | hist-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1895ms |
| hist-003-run-001-28a3f7 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1756ms |
| hist-003-run-001-383e28 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1589ms |
| hist-003-run-001-58c6e2 | hist-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2144ms |
| hist-003-run-001-650a23 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1799ms |
| hist-003-run-001-8c14a5 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1404ms |
| hist-003-run-001-8f9ea0 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1625ms |
| hist-004-run-001-0c6917 | hist-004 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1141ms |
| hist-004-run-001-2610c2 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1554ms |
| hist-004-run-001-7c58e0 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1298ms |
| hist-004-run-001-9ebfc0 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1328ms |
| hist-004-run-001-ca680a | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1284ms |
| hist-004-run-001-e166c8 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1481ms |
| hist-004-run-001-ea63f6 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1485ms |
| hist-005-run-001-2da2d5 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1346ms |
| hist-005-run-001-411a8d | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1491ms |
| hist-005-run-001-4b73f1 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1353ms |
| hist-005-run-001-524675 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1294ms |
| hist-005-run-001-79d6f0 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1232ms |
| hist-005-run-001-dab367 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1662ms |
| hist-005-run-001-ea5728 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1217ms |
| hist-006-run-001-2f12b5 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1636ms |
| hist-006-run-001-5fac47 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1264ms |
| hist-006-run-001-96aa54 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1409ms |
| hist-006-run-001-c92da0 | hist-006 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 952ms |
| hist-006-run-001-d3064d | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1588ms |
| hist-006-run-001-d74f57 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1450ms |
| hist-006-run-001-f415e7 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1678ms |
| synth-001-fce4ddf9-1788175245246 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1477ms |
| synth-001-run-001-281284 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 846ms |
| synth-001-run-001-703bcb | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1489ms |
| synth-001-run-001-808c47 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1338ms |
| synth-001-run-001-94da3e | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1597ms |
| synth-001-run-001-9e3426 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1333ms |
| synth-001-run-001-a4c9d9 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1633ms |
| synth-001-run-001-b91481 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1308ms |
| synth-001-run-001-cc74e7 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1659ms |
| synth-001-run-001-dcd329 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1321ms |
| synth-001-run-001-f903f7 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1645ms |
| synth-002-run-001-274217 | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1219ms |
| synth-002-run-001-7f79f7 | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1295ms |
| synth-002-run-001-8da458 | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1241ms |
| synth-002-run-001-9a5f3f | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1478ms |
| synth-002-run-001-a9bece | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1200ms |
| synth-002-run-001-bf1de8 | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1427ms |
| synth-002-run-001-dced56 | synth-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1001ms |
| synth-002-run-001-ef444f | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1249ms |
| synth-003-run-001-23ed30 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1539ms |
| synth-003-run-001-264a83 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1216ms |
| synth-003-run-001-2b9680 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1356ms |
| synth-003-run-001-36927f | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1235ms |
| synth-003-run-001-daafee | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1279ms |
| synth-003-run-001-e42ff2 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1532ms |
| synth-003-run-001-fdbe69 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1368ms |
| synth-004-run-001-3a67f2 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1475ms |
| synth-004-run-001-56ae0c | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1251ms |
| synth-004-run-001-a50efb | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1540ms |
| synth-004-run-001-c6b9e2 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1275ms |
| synth-004-run-001-eb669c | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1560ms |
| synth-004-run-001-f4c644 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1273ms |
| synth-004-run-001-fb40e1 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1543ms |
| synth-005-run-001-013483 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1437ms |
| synth-005-run-001-190edb | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1402ms |
| synth-005-run-001-60a979 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1267ms |
| synth-005-run-001-738d06 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1371ms |
| synth-005-run-001-ae9403 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1349ms |
| synth-005-run-001-dd8b5c | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1352ms |
| synth-005-run-001-e03bab | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1446ms |
| synth-006-run-001-08d85f | synth-006 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1097ms |
| synth-006-run-001-13a5ed | synth-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1549ms |
| synth-006-run-001-41b611 | synth-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1221ms |
| synth-006-run-001-445830 | synth-006 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1229ms |
| synth-006-run-001-b538c3 | synth-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1292ms |
| synth-006-run-001-b56c68 | synth-006 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1213ms |
| synth-006-run-001-f04458 | synth-006 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1278ms |

## What The Baseline Struggled With

### Observed

- False confidence occurred in 6/130 runs (4.62%).
- Agent failure (reproduction still failing) in 35/130 runs (26.92%).
- Regression failure in 0/130 runs (0.00%).
- Patch failed to apply in 0/130 runs (0.00%).
- Timeout/error in 1/130 runs (0.77%).
- Historical VFR 56.63% vs Synthetic VFR 87.23% (delta -30.61%).
- Non-deterministic variance observed in 12 case(s): hard-001 3/8, hard-002 4/8, hard-004 4/8, hard-005 8/9, hist-001 1/8, hist-002 3/6, hist-003 5/7, hist-004 6/7, hist-006 6/7, synth-001 10/11, synth-002 7/8, synth-006 3/7.
- Lowest VFR category: `serialization` at 0.00% (0/8).

### Hypotheses

- The agent satisfies the public repro but misses hidden edge cases captured by the oracle.
- Non-determinism suggests flaky agent behavior or timing-sensitive repairs; recommend fixed seeds and deterministic prompting.
- Sample size is 130 runs; breakdowns by difficulty/category should be interpreted with caution until more runs per case are collected.

## Recommended V1 Focus

1. **Test-driven feedback loop:** After each edit, automatically run `public/reproduce.ts` and surface output to the agent before considering the fix done.
2. **Oracle-inspired edge-case synthesis:** Generate additional invariant checks for the changed function (e.g., property-based tests for state-management and validation categories) before finalizing.
3. **Regression guardrail:** Run `tests/` suite after reproduction passes; if regression fails, feed failures back to the agent for iterative repair.
4. **Patch hygiene:** Ensure diffs are generated via `git diff HEAD --whitespace=nowarn` from a clean buggy baseline commit to avoid hunk rejections.
7. **Repeated-trial analysis:** Run 3 trials per case to measure stability; prioritize cases with variance for deeper debugging.

---
*Generated from executable evidence. Benchmark 0.5 sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf.*
