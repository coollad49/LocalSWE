# Baseline Evaluation Report — exp-2026-08-31-050829

**Benchmark:** 0.5 `sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf`
**Experiment:** exp-2026-08-31-050829
**Runs Dir:** `C:\Users\cooll\Documents\code\frontier-verifier\experiments\runs`
**Timestamp:** 2026-08-31T08:44:39.846Z
**Total Runs:** 112

| Metric | Baseline v0 | V1 (Target) | Status |
| --- | --- | --- | --- |
| **Verified Fix Rate (VFR)** | **66.07%** (74/112) | *Pending* | Primary Metric |
| **Reproduction Success Rate** | **70.54%** (79/112) | *Pending* | Public Repro |
| **Oracle Success Rate** | **66.96%** (75/112) | *Pending* | Hidden Spec |
| **Regression-Free Rate** | **98.67%** (74/75) | *Pending* | No Side Effects |
| **False Confidence Rate** | **3.57%** (4/112) | *Pending* | Repro Pass / Oracle Fail |

## Summary Metrics

- **Total Eligible Runs:** 112
- **Completed:** 111  **Errors:** 0  **Timeouts:** 1
- **VFR:** 66.07% (74/112)
- **Reproduction Rate:** 70.54% (79/112)
- **Oracle Rate:** 66.96% (75/112)
- **Regression-Free Rate:** 98.67% (74/75)
- **False Confidence Rate:** 3.57% (4/112)

## Failure Breakdown

| Outcome | Count | Percentage |
| --- | --- | --- |
| VERIFIED | 74 | 66.07% |
| AGENT_FAILURE | 33 | 29.46% |
| FALSE_CONFIDENCE | 4 | 3.57% |
| REGRESSION_FAILURE | 0 | 0.00% |
| PATCH_FAILED | 0 | 0.00% |
| TIMEOUT | 1 | 0.89% |
| ERROR | 0 | 0.00% |

## Historical vs Synthetic

| Type | Total | Verified | VFR | Oracle Rate | False Confidence |
| --- | --- | --- | --- | --- | --- |
| historical | 72 | 39 | 54.17% | 55.56% | 1.39% |
| synthetic | 40 | 35 | 87.50% | 87.50% | 7.50% |

## Difficulty Breakdown

| Difficulty | Total | Verified | VFR | Repro Rate | Oracle Rate |
| --- | --- | --- | --- | --- | --- |
| easy | 19 | 15 | 78.95% | 94.74% | 78.95% |
| medium | 46 | 36 | 78.26% | 78.26% | 78.26% |
| hard | 47 | 23 | 48.94% | 53.19% | 51.06% |

## Category Breakdown

| Category | Total | Verified | VFR | False Confidence |
| --- | --- | --- | --- | --- |
| alias-handling | 6 | 6 | 100.00% | 0.00% |
| api-behavior | 33 | 22 | 66.67% | 9.09% |
| asynchronous | 13 | 9 | 69.23% | 0.00% |
| boundary | 13 | 9 | 69.23% | 0.00% |
| business-logic | 16 | 14 | 87.50% | 0.00% |
| data-transformation | 14 | 13 | 92.86% | 0.00% |
| error-handling | 19 | 12 | 63.16% | 15.79% |
| lifecycle | 7 | 2 | 28.57% | 0.00% |
| parsing | 41 | 23 | 56.10% | 0.00% |
| security | 5 | 2 | 40.00% | 20.00% |
| serialization | 7 | 0 | 0.00% | 0.00% |
| state-management | 55 | 31 | 56.36% | 0.00% |
| type-coercion | 6 | 6 | 100.00% | 0.00% |
| validation | 19 | 9 | 47.37% | 5.26% |

## Case Stability

| Case | Runs | Verified | Stability | Has Variance |
| --- | --- | --- | --- | --- |
| hard-001 | 7 | 2 | 28.57% | YES |
| hard-002 | 7 | 3 | 42.86% | YES |
| hard-003 | 7 | 0 | 0.00% | no |
| hard-004 | 7 | 3 | 42.86% | YES |
| hard-005 | 8 | 7 | 87.50% | YES |
| hist-001 | 7 | 1 | 14.29% | YES |
| hist-002 | 5 | 2 | 40.00% | YES |
| hist-003 | 6 | 4 | 66.67% | YES |
| hist-004 | 6 | 6 | 100.00% | no |
| hist-005 | 6 | 6 | 100.00% | no |
| hist-006 | 6 | 5 | 83.33% | YES |
| synth-001 | 9 | 8 | 88.89% | YES |
| synth-002 | 7 | 6 | 85.71% | YES |
| synth-003 | 6 | 6 | 100.00% | no |
| synth-004 | 6 | 6 | 100.00% | no |
| synth-005 | 6 | 6 | 100.00% | no |
| synth-006 | 6 | 3 | 50.00% | YES |

**Non-deterministic cases (variance):** hard-001 (2/7), hard-002 (3/7), hard-004 (3/7), hard-005 (7/8), hist-001 (1/7), hist-002 (2/5), hist-003 (4/6), hist-006 (5/6), synth-001 (8/9), synth-002 (6/7), synth-006 (3/6)

## Per-Case Results

| Run | Case | Verdict | Patch | Repro | Oracle | Regression | Duration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| hard-001-run-001-14d43b | hard-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 12779ms |
| hard-001-run-001-214fa3 | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 3834ms |
| hard-001-run-001-6b5d9f | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 3143ms |
| hard-001-run-001-72f0a8 | hard-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 14679ms |
| hard-001-run-001-7f51ea | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2984ms |
| hard-001-run-001-a76370 | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2912ms |
| hard-001-run-001-c5db09 | hard-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 4242ms |
| hard-002-run-001-1d7540 | hard-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 3061ms |
| hard-002-run-001-686cde | hard-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 3133ms |
| hard-002-run-001-a165f7 | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2301ms |
| hard-002-run-001-a74613 | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2170ms |
| hard-002-run-001-e88bde | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1734ms |
| hard-002-run-001-f38dcb | hard-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2371ms |
| hard-002-run-001-fbed24 | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2379ms |
| hard-003-run-001-737a2e | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2184ms |
| hard-003-run-001-7ba7a9 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1880ms |
| hard-003-run-001-7d2b0b | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1639ms |
| hard-003-run-001-8f7ce7 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2198ms |
| hard-003-run-001-8fd896 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1845ms |
| hard-003-run-001-a317f1 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2353ms |
| hard-003-run-001-c041b3 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1823ms |
| hard-004-run-001-229ddd | hard-004 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2083ms |
| hard-004-run-001-36f07b | hard-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2414ms |
| hard-004-run-001-405360 | hard-004 | TIMEOUT | PASSED | PASSED | PASSED | TIMEOUT | 32584ms |
| hard-004-run-001-8ec14b | hard-004 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1620ms |
| hard-004-run-001-9398e0 | hard-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2067ms |
| hard-004-run-001-a53c6e | hard-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 3525ms |
| hard-004-run-001-dcbb8b | hard-004 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2426ms |
| hard-005-run-001-017ebf | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1827ms |
| hard-005-run-001-1f527a | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1837ms |
| hard-005-run-001-2598bc | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2266ms |
| hard-005-run-001-6d1ede | hard-005 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1530ms |
| hard-005-run-001-810dbc | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1854ms |
| hard-005-run-001-8beefc | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1833ms |
| hard-005-run-001-8f0888 | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2343ms |
| hard-005-run-001-c5c839 | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1890ms |
| hist-001-run-001-09514a | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1532ms |
| hist-001-run-001-0f86e4 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1668ms |
| hist-001-run-001-663a4f | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1791ms |
| hist-001-run-001-a06884 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1717ms |
| hist-001-run-001-a20e85 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 3227ms |
| hist-001-run-001-a6fcdc | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2198ms |
| hist-001-run-001-d913a2 | hist-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2325ms |
| hist-002-run-001-751380 | hist-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2104ms |
| hist-002-run-001-ec6bd1 | hist-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1461ms |
| hist-002-run-001-edd8d4 | hist-002 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1904ms |
| hist-002-run-001-f867b2 | hist-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1386ms |
| hist-002-run-001-f9fffa | hist-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2367ms |
| hist-003-run-001-122aaf | hist-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2390ms |
| hist-003-run-001-28a3f7 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 3182ms |
| hist-003-run-001-383e28 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2190ms |
| hist-003-run-001-58c6e2 | hist-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1785ms |
| hist-003-run-001-650a23 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1980ms |
| hist-003-run-001-8f9ea0 | hist-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2053ms |
| hist-004-run-001-2610c2 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2319ms |
| hist-004-run-001-7c58e0 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2254ms |
| hist-004-run-001-9ebfc0 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1938ms |
| hist-004-run-001-ca680a | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1856ms |
| hist-004-run-001-e166c8 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1942ms |
| hist-004-run-001-ea63f6 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2043ms |
| hist-005-run-001-2da2d5 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1856ms |
| hist-005-run-001-411a8d | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1925ms |
| hist-005-run-001-4b73f1 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1895ms |
| hist-005-run-001-524675 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2146ms |
| hist-005-run-001-79d6f0 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2018ms |
| hist-005-run-001-dab367 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1765ms |
| hist-006-run-001-2f12b5 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1980ms |
| hist-006-run-001-96aa54 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2227ms |
| hist-006-run-001-c92da0 | hist-006 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1477ms |
| hist-006-run-001-d3064d | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1933ms |
| hist-006-run-001-d74f57 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2009ms |
| hist-006-run-001-f415e7 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2951ms |
| synth-001-run-001-281284 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1165ms |
| synth-001-run-001-703bcb | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2117ms |
| synth-001-run-001-808c47 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1838ms |
| synth-001-run-001-94da3e | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2796ms |
| synth-001-run-001-9e3426 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1932ms |
| synth-001-run-001-a4c9d9 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2125ms |
| synth-001-run-001-b91481 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2096ms |
| synth-001-run-001-cc74e7 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2046ms |
| synth-001-run-001-dcd329 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1941ms |
| synth-002-run-001-274217 | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1866ms |
| synth-002-run-001-7f79f7 | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2028ms |
| synth-002-run-001-9a5f3f | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1870ms |
| synth-002-run-001-a9bece | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1677ms |
| synth-002-run-001-bf1de8 | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1943ms |
| synth-002-run-001-dced56 | synth-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1204ms |
| synth-002-run-001-ef444f | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1875ms |
| synth-003-run-001-23ed30 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1893ms |
| synth-003-run-001-264a83 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2632ms |
| synth-003-run-001-2b9680 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2113ms |
| synth-003-run-001-daafee | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1933ms |
| synth-003-run-001-e42ff2 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1811ms |
| synth-003-run-001-fdbe69 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1940ms |
| synth-004-run-001-3a67f2 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2250ms |
| synth-004-run-001-56ae0c | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1893ms |
| synth-004-run-001-c6b9e2 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1877ms |
| synth-004-run-001-eb669c | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1905ms |
| synth-004-run-001-f4c644 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2065ms |
| synth-004-run-001-fb40e1 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2030ms |
| synth-005-run-001-190edb | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2715ms |
| synth-005-run-001-60a979 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1867ms |
| synth-005-run-001-738d06 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1865ms |
| synth-005-run-001-ae9403 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1843ms |
| synth-005-run-001-dd8b5c | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1765ms |
| synth-005-run-001-e03bab | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2241ms |
| synth-006-run-001-13a5ed | synth-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1950ms |
| synth-006-run-001-41b611 | synth-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1773ms |
| synth-006-run-001-445830 | synth-006 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1707ms |
| synth-006-run-001-b538c3 | synth-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2111ms |
| synth-006-run-001-b56c68 | synth-006 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 1622ms |
| synth-006-run-001-f04458 | synth-006 | FALSE_CONFIDENCE | PASSED | PASSED | FAILED | SKIPPED | 2074ms |

## What The Baseline Struggled With

### Observed

- False confidence occurred in 4/112 runs (3.57%).
- Agent failure (reproduction still failing) in 33/112 runs (29.46%).
- Regression failure in 0/112 runs (0.00%).
- Patch failed to apply in 0/112 runs (0.00%).
- Timeout/error in 1/112 runs (0.89%).
- Historical VFR 54.17% vs Synthetic VFR 87.50% (delta -33.33%).
- Non-deterministic variance observed in 11 case(s): hard-001 2/7, hard-002 3/7, hard-004 3/7, hard-005 7/8, hist-001 1/7, hist-002 2/5, hist-003 4/6, hist-006 5/6, synth-001 8/9, synth-002 6/7, synth-006 3/6.
- Lowest VFR category: `serialization` at 0.00% (0/7).

### Hypotheses

- The agent satisfies the public repro but misses hidden edge cases captured by the oracle.
- Non-determinism suggests flaky agent behavior or timing-sensitive repairs; recommend fixed seeds and deterministic prompting.
- Sample size is 112 runs; breakdowns by difficulty/category should be interpreted with caution until more runs per case are collected.

## Recommended V1 Focus

1. **Test-driven feedback loop:** After each edit, automatically run `public/reproduce.ts` and surface output to the agent before considering the fix done.
2. **Oracle-inspired edge-case synthesis:** Generate additional invariant checks for the changed function (e.g., property-based tests for state-management and validation categories) before finalizing.
3. **Regression guardrail:** Run `tests/` suite after reproduction passes; if regression fails, feed failures back to the agent for iterative repair.
4. **Patch hygiene:** Ensure diffs are generated via `git diff HEAD --whitespace=nowarn` from a clean buggy baseline commit to avoid hunk rejections.
6. **Category focus — validation:** Historical validation bugs (alias handling, prototype pollution) show low VFR; prioritize careful input-parsing review.
7. **Repeated-trial analysis:** Run 3 trials per case to measure stability; prioritize cases with variance for deeper debugging.

---
*Generated from executable evidence. Benchmark 0.5 sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf.*
