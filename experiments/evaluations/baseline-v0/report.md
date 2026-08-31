# Baseline Evaluation Report — baseline-v0

**Benchmark:** 0.5 `sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf`
**Experiment:** baseline-v0
**Runs Dir:** `C:\Users\cooll\Documents\code\frontier-verifier\experiments\runs`
**Timestamp:** 2026-08-30T15:40:01.391Z
**Total Runs:** 44

| Metric | Baseline v0 | V1 (Target) | Status |
| --- | --- | --- | --- |
| **Verified Fix Rate (VFR)** | **34.09%** (15/44) | *Pending* | Primary Metric |
| **Reproduction Success Rate** | **36.36%** (16/44) | *Pending* | Public Repro |
| **Oracle Success Rate** | **34.09%** (15/44) | *Pending* | Hidden Spec |
| **Regression-Free Rate** | **100.00%** (15/15) | *Pending* | No Side Effects |
| **False Confidence Rate** | **0.00%** (0/44) | *Pending* | Repro Pass / Oracle Fail |

## Summary Metrics

- **Total Eligible Runs:** 44
- **Completed:** 41  **Errors:** 3  **Timeouts:** 0
- **VFR:** 34.09% (15/44)
- **Reproduction Rate:** 36.36% (16/44)
- **Oracle Rate:** 34.09% (15/44)
- **Regression-Free Rate:** 100.00% (15/15)
- **False Confidence Rate:** 0.00% (0/44)

## Failure Breakdown

| Outcome | Count | Percentage |
| --- | --- | --- |
| VERIFIED | 15 | 34.09% |
| AGENT_FAILURE | 26 | 59.09% |
| FALSE_CONFIDENCE | 0 | 0.00% |
| REGRESSION_FAILURE | 0 | 0.00% |
| PATCH_FAILED | 0 | 0.00% |
| TIMEOUT | 0 | 0.00% |
| ERROR | 3 | 6.82% |

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

## Case Stability

| Case | Runs | Verified | Stability | Has Variance |
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

**Non-deterministic cases (variance):** hard-005 (1/2), hist-006 (1/2), synth-001 (1/12), synth-002 (1/3)

## Per-Case Results

| Run | Case | Verdict | Patch | Repro | Oracle | Regression | Duration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| hard-001-run-001-6b5d9f | hard-001 | ERROR | PASSED | ERROR | SKIPPED | SKIPPED | 2669ms |
| hard-001-run-001-a76370 | hard-001 | ERROR | PASSED | ERROR | SKIPPED | SKIPPED | 2448ms |
| hard-002-run-001-a74613 | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1936ms |
| hard-002-run-001-e88bde | hard-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2054ms |
| hard-003-run-001-7d2b0b | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1661ms |
| hard-003-run-001-8fd896 | hard-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1967ms |
| hard-004-run-001-405360 | hard-004 | ERROR | PASSED | PASSED | ERROR | SKIPPED | 2965ms |
| hard-004-run-001-dcbb8b | hard-004 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2497ms |
| hard-005-run-001-6d1ede | hard-005 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1408ms |
| hard-005-run-001-c5c839 | hard-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1883ms |
| hist-001-run-001-a06884 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1506ms |
| hist-001-run-001-a20e85 | hist-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1526ms |
| hist-002-run-001-ec6bd1 | hist-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1205ms |
| hist-002-run-001-f867b2 | hist-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1237ms |
| hist-003-run-001-122aaf | hist-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1385ms |
| hist-003-run-001-58c6e2 | hist-003 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1462ms |
| hist-004-run-001-9ebfc0 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2967ms |
| hist-004-run-001-e166c8 | hist-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1861ms |
| hist-005-run-001-411a8d | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1964ms |
| hist-005-run-001-4b73f1 | hist-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1915ms |
| hist-006-run-001-96aa54 | hist-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2146ms |
| hist-006-run-001-c92da0 | hist-006 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1470ms |
| check-4-1788103946175 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1977ms |
| check-5-1788103957775 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1867ms |
| check-6-1788103972181 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1466ms |
| check-7-1788103984104 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1915ms |
| check-8-1788103996746 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2493ms |
| synth-001-05705073-1788104019984 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1405ms |
| synth-001-6a57f4e6-1788104043930 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1411ms |
| synth-001-ac6a3bd1-1788104031636 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1683ms |
| synth-001-b4e0ee0d-1788104008375 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2360ms |
| synth-001-run-001-281284 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2420ms |
| synth-001-run-001-91c1b7 | synth-001 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1743ms |
| synth-001-run-001-cc74e7 | synth-001 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2487ms |
| synth-002-run-001-9a5f3f | synth-002 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2212ms |
| synth-002-run-001-cc8cb0 | synth-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 1418ms |
| synth-002-run-001-dced56 | synth-002 | AGENT_FAILURE | PASSED | FAILED | SKIPPED | SKIPPED | 2163ms |
| synth-003-run-001-264a83 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 2028ms |
| synth-003-run-001-2b9680 | synth-003 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1863ms |
| synth-004-run-001-3a67f2 | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1838ms |
| synth-004-run-001-eb669c | synth-004 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1676ms |
| synth-005-run-001-190edb | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1770ms |
| synth-005-run-001-ae9403 | synth-005 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1725ms |
| synth-006-run-001-b538c3 | synth-006 | VERIFIED | PASSED | PASSED | PASSED | PASSED | 1828ms |

## What The Baseline Struggled With

### Observed

- False confidence occurred in 0/44 runs (0.00%).
- Agent failure (reproduction still failing) in 26/44 runs (59.09%).
- Regression failure in 0/44 runs (0.00%).
- Patch failed to apply in 0/44 runs (0.00%).
- Timeout/error in 3/44 runs (6.82%).
- Historical VFR 27.27% vs Synthetic VFR 40.91% (delta -13.64%).
- Non-deterministic variance observed in 4 case(s): hard-005 1/2, hist-006 1/2, synth-001 1/12, synth-002 1/3.
- Lowest VFR category: `lifecycle` at 0.00% (0/2).

### Hypotheses

- No strong false-confidence signal; oracle alignment appears adequate for this sample.
- Primary blocker is diagnosis/reproduction: agent often fails to make reproduction pass, suggesting insufficient exploration or editing strategy.
- Non-determinism suggests flaky agent behavior or timing-sensitive repairs; recommend fixed seeds and deterministic prompting.
- Sample size is 44 runs; breakdowns by difficulty/category should be interpreted with caution until more runs per case are collected.

## Recommended V1 Focus

1. **Test-driven feedback loop:** After each edit, automatically run `public/reproduce.ts` and surface output to the agent before considering the fix done.
2. **Oracle-inspired edge-case synthesis:** Generate additional invariant checks for the changed function (e.g., property-based tests for state-management and validation categories) before finalizing.
3. **Regression guardrail:** Run `tests/` suite after reproduction passes; if regression fails, feed failures back to the agent for iterative repair.
4. **Patch hygiene:** Ensure diffs are generated via `git diff HEAD --whitespace=nowarn` from a clean buggy baseline commit to avoid hunk rejections.
6. **Category focus — validation:** Historical validation bugs (alias handling, prototype pollution) show low VFR; prioritize careful input-parsing review.
7. **Repeated-trial analysis:** Run 3 trials per case to measure stability; prioritize cases with variance for deeper debugging.

---
*Generated from executable evidence. Benchmark 0.5 sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf.*
