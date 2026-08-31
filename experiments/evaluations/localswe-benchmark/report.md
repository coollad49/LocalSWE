# Baseline Evaluation Report — localswe-benchmark

**Benchmark:** 0.5 `sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf`
**Experiment:** localswe-benchmark
**Runs Dir:** `C:\Users\cooll\Documents\code\frontier-verifier\experiments\runs`
**Timestamp:** 2026-08-31T16:17:04.383Z
**Total Runs:** 148

| Metric | Baseline v0 | V1 (Target) | Status |
| --- | --- | --- | --- |
| **Verified Fix Rate (VFR)** | **69.59%** (103/148) | *Pending* | Primary Metric |
| **Reproduction Success Rate** | **75.68%** (112/148) | *Pending* | Public Repro |
| **Oracle Success Rate** | **70.27%** (104/148) | *Pending* | Hidden Spec |
| **Regression-Free Rate** | **99.04%** (103/104) | *Pending* | No Side Effects |
| **False Confidence Rate** | **5.41%** (8/148) | *Pending* | Repro Pass / Oracle Fail |

## Summary Metrics

- **Total Eligible Runs:** 148
- **Completed:** 147  **Errors:** 0  **Timeouts:** 1
- **VFR:** 69.59% (103/148)
- **Reproduction Rate:** 75.68% (112/148)
- **Oracle Rate:** 70.27% (104/148)
- **Regression-Free Rate:** 99.04% (103/104)
- **False Confidence Rate:** 5.41% (8/148)

## Failure Breakdown

| Outcome | Count | Percentage |
| --- | --- | --- |
| VERIFIED | 103 | 69.59% |
| AGENT_FAILURE | 36 | 24.32% |
| FALSE_CONFIDENCE | 8 | 5.41% |
| REGRESSION_FAILURE | 0 | 0.00% |
| PATCH_FAILED | 0 | 0.00% |
| TIMEOUT | 1 | 0.68% |
| ERROR | 0 | 0.00% |

## Historical vs Synthetic

| Type | Total | Verified | VFR | Oracle Rate | False Confidence |
| --- | --- | --- | --- | --- | --- |
| historical | 94 | 56 | 59.57% | 60.64% | 3.19% |
| synthetic | 54 | 47 | 87.04% | 87.04% | 9.26% |

## Difficulty Breakdown

| Difficulty | Total | Verified | VFR | Repro Rate | Oracle Rate |
| --- | --- | --- | --- | --- | --- |
| easy | 25 | 18 | 72.00% | 96.00% | 72.00% |
| medium | 62 | 50 | 80.65% | 80.65% | 80.65% |
| hard | 61 | 35 | 57.38% | 62.30% | 59.02% |

## Category Breakdown

| Category | Total | Verified | VFR | False Confidence |
| --- | --- | --- | --- | --- |
| alias-handling | 8 | 8 | 100.00% | 0.00% |
| api-behavior | 43 | 30 | 69.77% | 11.63% |
| asynchronous | 17 | 13 | 76.47% | 0.00% |
| boundary | 17 | 13 | 76.47% | 0.00% |
| business-logic | 22 | 20 | 90.91% | 0.00% |
| data-transformation | 18 | 17 | 94.44% | 0.00% |
| error-handling | 25 | 16 | 64.00% | 20.00% |
| lifecycle | 9 | 4 | 44.44% | 0.00% |
| parsing | 53 | 30 | 56.60% | 3.77% |
| security | 7 | 4 | 57.14% | 14.29% |
| serialization | 9 | 0 | 0.00% | 11.11% |
| state-management | 73 | 47 | 64.38% | 1.37% |
| type-coercion | 8 | 7 | 87.50% | 12.50% |
| validation | 25 | 13 | 52.00% | 4.00% |

## Case Stability

| Case | Runs | Verified | Stability | Has Variance |
| --- | --- | --- | --- | --- |
| hard-001 | 9 | 4 | 44.44% | YES |
| hard-002 | 9 | 5 | 55.56% | YES |
| hard-003 | 9 | 0 | 0.00% | no |
| hard-004 | 9 | 5 | 55.56% | YES |
| hard-005 | 10 | 9 | 90.00% | YES |
| hist-001 | 9 | 1 | 11.11% | YES |
| hist-002 | 7 | 4 | 57.14% | YES |
| hist-003 | 8 | 6 | 75.00% | YES |
| hist-004 | 8 | 7 | 87.50% | YES |
| hist-005 | 8 | 8 | 100.00% | no |
| hist-006 | 8 | 7 | 87.50% | YES |
| synth-001 | 13 | 12 | 92.31% | YES |
| synth-002 | 9 | 8 | 88.89% | YES |
| synth-003 | 8 | 8 | 100.00% | no |
| synth-004 | 8 | 8 | 100.00% | no |
| synth-005 | 8 | 8 | 100.00% | no |
| synth-006 | 8 | 3 | 37.50% | YES |

**Non-deterministic cases (variance):** hard-001 (4/9), hard-002 (5/9), hard-004 (5/9), hard-005 (9/10), hist-001 (1/9), hist-002 (4/7), hist-003 (6/8), hist-004 (7/8), hist-006 (7/8), synth-001 (12/13), synth-002 (8/9), synth-006 (3/8)

## Per-Case Results

| Run | Case | Verdict | Patch | Repro | Oracle | Regression | Duration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| hard-001-run-001-14d43b | hard-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 11411ms |
| hard-001-run-001-214fa3 | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 3831ms |
| hard-001-run-001-6b5d9f | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 4947ms |
| hard-001-run-001-72f0a8 | hard-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 9400ms |
| hard-001-run-001-7f51ea | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2727ms |
| hard-001-run-001-a76370 | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 3416ms |
| hard-001-run-001-c320c2 | hard-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 8812ms |
| hard-001-run-001-c5db09 | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2613ms |
| hard-001-run-001-dfce26 | hard-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 11310ms |
| hard-002-run-001-1d7540 | hard-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2646ms |
| hard-002-run-001-48007a | hard-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2031ms |
| hard-002-run-001-686cde | hard-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2417ms |
| hard-002-run-001-699e35 | hard-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2104ms |
| hard-002-run-001-a165f7 | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1264ms |
| hard-002-run-001-a74613 | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1573ms |
| hard-002-run-001-e88bde | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1498ms |
| hard-002-run-001-f38dcb | hard-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 3102ms |
| hard-002-run-001-fbed24 | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2241ms |
| hard-003-run-001-737a2e | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1962ms |
| hard-003-run-001-7ba7a9 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1419ms |
| hard-003-run-001-7d2b0b | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1186ms |
| hard-003-run-001-877413 | hard-003 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1580ms |
| hard-003-run-001-8f7ce7 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1811ms |
| hard-003-run-001-8fd896 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1290ms |
| hard-003-run-001-a317f1 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1564ms |
| hard-003-run-001-bba12d | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1535ms |
| hard-003-run-001-c041b3 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1783ms |
| hard-004-run-001-01524c | hard-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2345ms |
| hard-004-run-001-229ddd | hard-004 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2117ms |
| hard-004-run-001-36f07b | hard-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1774ms |
| hard-004-run-001-405360 | hard-004 | TIMEOUT | PASSED | PASSED | PASSED | TIMEOUT | 31405ms |
| hard-004-run-001-8ec14b | hard-004 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1200ms |
| hard-004-run-001-9398e0 | hard-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2110ms |
| hard-004-run-001-a53c6e | hard-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2736ms |
| hard-004-run-001-dcbb8b | hard-004 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2393ms |
| hard-004-run-001-ee4d7d | hard-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1850ms |
| hard-005-run-001-017ebf | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1951ms |
| hard-005-run-001-1f527a | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1865ms |
| hard-005-run-001-2598bc | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1481ms |
| hard-005-run-001-6d1ede | hard-005 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1497ms |
| hard-005-run-001-740e59 | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1923ms |
| hard-005-run-001-810dbc | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1688ms |
| hard-005-run-001-8beefc | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1576ms |
| hard-005-run-001-8f0888 | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1785ms |
| hard-005-run-001-c5c839 | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1780ms |
| hard-005-run-001-eafe4b | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2011ms |
| hist-001-run-001-09514a | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1693ms |
| hist-001-run-001-0b2e9b | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1433ms |
| hist-001-run-001-0f86e4 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1184ms |
| hist-001-run-001-2f0d89 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1633ms |
| hist-001-run-001-663a4f | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2261ms |
| hist-001-run-001-a06884 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1337ms |
| hist-001-run-001-a20e85 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1638ms |
| hist-001-run-001-a6fcdc | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1472ms |
| hist-001-run-001-d913a2 | hist-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1998ms |
| hist-002-run-001-751380 | hist-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1834ms |
| hist-002-run-001-8641aa | hist-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2289ms |
| hist-002-run-001-aa05d0 | hist-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1717ms |
| hist-002-run-001-ec6bd1 | hist-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 892ms |
| hist-002-run-001-edd8d4 | hist-002 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1385ms |
| hist-002-run-001-f867b2 | hist-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1083ms |
| hist-002-run-001-f9fffa | hist-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2005ms |
| hist-003-run-001-122aaf | hist-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1371ms |
| hist-003-run-001-14986a | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2399ms |
| hist-003-run-001-28a3f7 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1676ms |
| hist-003-run-001-383e28 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1459ms |
| hist-003-run-001-58c6e2 | hist-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1141ms |
| hist-003-run-001-650a23 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1949ms |
| hist-003-run-001-8c14a5 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1556ms |
| hist-003-run-001-8f9ea0 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2227ms |
| hist-004-run-001-0c6917 | hist-004 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1566ms |
| hist-004-run-001-2610c2 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1519ms |
| hist-004-run-001-7c58e0 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1509ms |
| hist-004-run-001-80bf0e | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1655ms |
| hist-004-run-001-9ebfc0 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1448ms |
| hist-004-run-001-ca680a | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2010ms |
| hist-004-run-001-e166c8 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1753ms |
| hist-004-run-001-ea63f6 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1960ms |
| hist-005-run-001-2da2d5 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2201ms |
| hist-005-run-001-3e6504 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1957ms |
| hist-005-run-001-411a8d | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1532ms |
| hist-005-run-001-4b73f1 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1584ms |
| hist-005-run-001-524675 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1636ms |
| hist-005-run-001-79d6f0 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1784ms |
| hist-005-run-001-dab367 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1661ms |
| hist-005-run-001-ea5728 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1646ms |
| hist-006-run-001-2f12b5 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2089ms |
| hist-006-run-001-5fac47 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1548ms |
| hist-006-run-001-96aa54 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1855ms |
| hist-006-run-001-c92da0 | hist-006 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1041ms |
| hist-006-run-001-d3064d | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1724ms |
| hist-006-run-001-d74f57 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1795ms |
| hist-006-run-001-e350cf | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2659ms |
| hist-006-run-001-f415e7 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1763ms |
| synth-001-36e3cb-1788186141766 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1841ms |
| synth-001-fce4ddf9-1788175245246 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1722ms |
| synth-001-run-001-281284 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1073ms |
| synth-001-run-001-703bcb | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1726ms |
| synth-001-run-001-808c47 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1619ms |
| synth-001-run-001-94da3e | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1536ms |
| synth-001-run-001-9e3426 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2423ms |
| synth-001-run-001-a4c9d9 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2456ms |
| synth-001-run-001-b91481 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1594ms |
| synth-001-run-001-c76cd7 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2234ms |
| synth-001-run-001-cc74e7 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1533ms |
| synth-001-run-001-dcd329 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1610ms |
| synth-001-run-001-f903f7 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1857ms |
| synth-002-run-001-0c9c83 | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2207ms |
| synth-002-run-001-274217 | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1710ms |
| synth-002-run-001-7f79f7 | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1467ms |
| synth-002-run-001-8da458 | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1752ms |
| synth-002-run-001-9a5f3f | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1376ms |
| synth-002-run-001-a9bece | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1733ms |
| synth-002-run-001-bf1de8 | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1780ms |
| synth-002-run-001-dced56 | synth-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1621ms |
| synth-002-run-001-ef444f | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1677ms |
| synth-003-run-001-23ed30 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1788ms |
| synth-003-run-001-264a83 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1914ms |
| synth-003-run-001-2b9680 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1828ms |
| synth-003-run-001-36927f | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1415ms |
| synth-003-run-001-daafee | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1834ms |
| synth-003-run-001-e42ff2 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1865ms |
| synth-003-run-001-f9bac8 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1948ms |
| synth-003-run-001-fdbe69 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1817ms |
| synth-004-run-001-3a67f2 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1996ms |
| synth-004-run-001-438fad | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1848ms |
| synth-004-run-001-56ae0c | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1716ms |
| synth-004-run-001-a50efb | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1489ms |
| synth-004-run-001-c6b9e2 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1764ms |
| synth-004-run-001-eb669c | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1604ms |
| synth-004-run-001-f4c644 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1907ms |
| synth-004-run-001-fb40e1 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1698ms |
| synth-005-run-001-013483 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1710ms |
| synth-005-run-001-190edb | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1583ms |
| synth-005-run-001-60a979 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1492ms |
| synth-005-run-001-738d06 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1624ms |
| synth-005-run-001-7c5251 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1817ms |
| synth-005-run-001-ae9403 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1575ms |
| synth-005-run-001-dd8b5c | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1503ms |
| synth-005-run-001-e03bab | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1936ms |
| synth-006-run-001-08d85f | synth-006 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1806ms |
| synth-006-run-001-13a5ed | synth-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1221ms |
| synth-006-run-001-41b611 | synth-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1915ms |
| synth-006-run-001-445830 | synth-006 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1425ms |
| synth-006-run-001-678039 | synth-006 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1543ms |
| synth-006-run-001-b538c3 | synth-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1916ms |
| synth-006-run-001-b56c68 | synth-006 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1811ms |
| synth-006-run-001-f04458 | synth-006 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1872ms |

## What The Baseline Struggled With

### Observed

- False confidence occurred in 8/148 runs (5.41%).
- Agent failure (reproduction still failing) in 36/148 runs (24.32%).
- Regression failure in 0/148 runs (0.00%).
- Patch failed to apply in 0/148 runs (0.00%).
- Timeout/error in 1/148 runs (0.68%).
- Historical VFR 59.57% vs Synthetic VFR 87.04% (delta -27.46%).
- Non-deterministic variance observed in 12 case(s): hard-001 4/9, hard-002 5/9, hard-004 5/9, hard-005 9/10, hist-001 1/9, hist-002 4/7, hist-003 6/8, hist-004 7/8, hist-006 7/8, synth-001 12/13, synth-002 8/9, synth-006 3/8.
- Lowest VFR category: `serialization` at 0.00% (0/9).

### Hypotheses

- The agent satisfies the public repro but misses hidden edge cases captured by the oracle.
- Non-determinism suggests flaky agent behavior or timing-sensitive repairs; recommend fixed seeds and deterministic prompting.
- Sample size is 148 runs; breakdowns by difficulty/category should be interpreted with caution until more runs per case are collected.

## Recommended V1 Focus

1. **Test-driven feedback loop:** After each edit, automatically run `public/reproduce.ts` and surface output to the agent before considering the fix done.
2. **Oracle-inspired edge-case synthesis:** Generate additional invariant checks for the changed function (e.g., property-based tests for state-management and validation categories) before finalizing.
3. **Regression guardrail:** Run `tests/` suite after reproduction passes; if regression fails, feed failures back to the agent for iterative repair.
4. **Patch hygiene:** Ensure diffs are generated via `git diff HEAD --whitespace=nowarn` from a clean buggy baseline commit to avoid hunk rejections.
7. **Repeated-trial analysis:** Run 3 trials per case to measure stability; prioritize cases with variance for deeper debugging.

---
*Generated from executable evidence. Benchmark 0.5 sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf.*
