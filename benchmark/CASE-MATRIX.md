# Frontier Verifier Benchmark — Case Matrix

**Version:** 0.2 (integrity pass, fingerprint `sha256:42a6ef0ca73f3acb725fe316320715e5c7b2539b76dde855f6466adc19253ee7`)
**Cases:** 12 (6 synthetic-pattern labeled historical pending real replacement + 6 synthetic) — see note below
**Repositories:** 3 (task-manager, money-utils, async-queue benchmark-owned, MIT)
**Date:** 2026-08-29
**Validator:** `bun run benchmark:validate` v0.2 isolated (temp workspace, path containment, exec guard, 3× oracle) — 12/12 ✓ VALID
**Fingerprint:** `sha256:42a6ef0ca73f3acb725fe316320715e5c7b2539b76dde855f6466adc19253ee7` (sha256 over manifests + buggy snapshots + oracles + schema)
**Stability:** reproduction 3×, oracle 3× per state, regression 1×

---

## Summary Table

| ID | Type | Repository | Difficulty | Category | Reproducible | Verified |
| -- | ---- | ---------- | ---------- | -------- | ------------ | -------- |
| hist-001 | historical | task-manager | medium | boundary, business-logic | ✓ | ✓ |
| hist-002 | historical | money-utils | medium | business-logic, data-transformation | ✓ | ✓ |
| hist-003 | historical | async-queue | hard | asynchronous, error-handling, state-management | ✓ | ✓ |
| hist-004 | historical | task-manager | easy | validation | ✓ | ✓ |
| hist-005 | historical | money-utils | medium | data-transformation, validation | ✓ | ✓ |
| hist-006 | historical | async-queue | hard | state-management, api-behavior | ✓ | ✓ |
| synth-001 | synthetic | task-manager | medium | state-management, business-logic | ✓ | ✓ |
| synth-002 | synthetic | money-utils | easy | validation, business-logic | ✓ | ✓ |
| synth-003 | synthetic | async-queue | medium | error-handling, asynchronous | ✓ | ✓ |
| synth-004 | synthetic | task-manager | hard | state-management, api-behavior | ✓ | ✓ |
| synth-005 | synthetic | money-utils | medium | boundary, data-transformation | ✓ | ✓ |
| synth-006 | synthetic | async-queue | easy | api-behavior, error-handling | ✓ | ✓ |

---

## Case Details

### hist-001 — Overdue boundary (task-manager)
- **Bug:** `isOverdue` uses `<=` instead of `<`; tasks due today incorrectly flagged overdue.
- **Why it exists:** Tests ability to reason about date boundary logic and off-by-one errors.
- **Engineering behavior tested:** Reproduce with controlled clock, locate comparison operator, verify edge cases (null, completed).
- **Files:** `src/utils.ts`
- **Oracle:** Hidden tests assert `dueDate < today` strictly, exclude null/completed.

### hist-002 — Truncation instead of rounding (money-utils)
- **Bug:** `roundToCents` uses `Math.floor` instead of `Math.round`.
- **Why:** Financial rounding bugs are high-impact, subtle, and require independent verification.
- **Tests:** Hidden checks 1.005→1.01, 2.675→2.68, formatMoney.
- **Files:** `src/money.ts`

### hist-003 — Lost retry (async-queue)
- **Bug:** `processJob` does not re-enqueue on failure; `maxAttempts` ignored.
- **Why:** Asynchronous retry logic is hard to verify; agent must understand re-enqueue semantics.
- **Oracle:** Verifies size stays 1 after first failure, drops only after maxAttempts.

### hist-004 — Priority validation too permissive (task-manager)
- **Bug:** `isValidPriority` allows 0 and 6 (`>=0 && <=6`) instead of 1-5.
- **Why:** Simple validation bug, tests agent's ability to locate validator and enforce spec.
- **Difficulty:** Easy (single function).

### hist-005 — Comma handling in parseMoney (money-utils)
- **Bug:** `parseMoney` missing `replace(/,/g,"")`, so `parseFloat("1,000.00")` → 1.
- **Why:** Data transformation / parsing diversity; validated with multiple comma formats.
- **Oracle:** Checks 12,345,678.90 parsing.

### hist-006 — Pause drops pending jobs (async-queue)
- **Bug:** `resume()` clears `pendingJobs` without moving to main queue.
- **Why:** State management across pause/resume cycles, order preservation.
- **Oracle:** Checks size and order after multiple cycles.

### synth-001 — updateTask overwrites with undefined (task-manager)
- **Mutation:** Spread `updates` directly, overwriting existing values with `undefined`.
- **Why:** Synthetic state-management bug not covered by historical cases; tests careful merging logic.

### synth-002 — Missing currency check in add/subtract (money-utils)
- **Mutation:** Removed `if (a.currency !== b.currency) throw`.
- **Why:** Validation / API contract violation; easy to detect via hidden mismatch tests.

### synth-003 — Swallowed errors (async-queue)
- **Mutation:** `catch` returns `success:true` unconditionally.
- **Why:** Error-handling diversity; oracle verifies success=false and retry.

### synth-004 — Stale cache (task-manager)
- **Mutation:** `invalidateCache` is no-op; `filterByStatus` returns stale results.
- **Why:** State-management / caching regression, requires understanding invalidation.

### synth-005 — Convert truncation (money-utils)
- **Mutation:** `convertCurrency` uses `Math.floor(converted*100)/100`.
- **Why:** Boundary / data-transformation; uses half-cent edge (92.345 → 92.35) to detect floor vs round.

### synth-006 — Dequeue undefined on empty (async-queue)
- **Mutation:** `dequeue` returns `undefined` instead of throwing.
- **Why:** API behavior / error handling; tests contract enforcement.

---

## Diversity Coverage

| Category | Cases |
| -------- | ----- |
| business-logic | hist-001, hist-002, synth-001, synth-002 |
| validation | hist-004, hist-005, synth-002 |
| boundary | hist-001, synth-005 |
| data-transformation | hist-002, hist-005, synth-005 |
| state-management | hist-003, hist-006, synth-001, synth-004 |
| asynchronous | hist-003, synth-003 |
| error-handling | hist-003, synth-003, synth-006 |
| api-behavior | hist-006, synth-004, synth-006 |

No duplicate bug pattern dominates; each category appears at least twice.

---

## Note on Historical Cases (Integrity)

Current `hist-001..006` are **synthetic-pattern cases** (reconstructed from common real-world patterns on benchmark-owned repos) — honest provenance notes `buggy-hist-*` synthetic with `synthetic-pattern` inspiration. They are labeled `historical` in `manifest.json:type` for v0.1 compatibility but should be read as `pattern-*` until replaced with genuine external historical commits.

**Evaluation 2026-08-29:** 4 external candidates evaluated (`unjs/defu`, `cacjs/cac`, `sindresorhus/p-limit`, `lukeed/kleur`) — see `benchmark/HISTORICAL-CANDIDATES.md`. Only `cacjs/cac@ffaf796` (mixed option names default) and alternative `defu@3942bfb` (prototype pollution) are strong deterministic genuine historical candidates. Not enough to replace all 6 without further search. **Decision:** Freeze v0.2 with honest pattern labeling; incrementally replace one-by-one as each new real case passes strict `buggy→fail / fixed→pass / oracle 3×` acceptance. See `benchmark/HISTORICAL-CANDIDATES.md` for ranked evidence. Quality > count.

## Validation

- Each case passes: buggy reproduces (3/3 fails), good passes (3/3), oracle passes 3× on good, fails 3× on buggy, regression passes, final stability 1× — all in isolated temp workspaces (no live repo mutation), path-contained, exec guarded.
- Run: `bun run benchmark:validate` (reports fingerprint) or `bun run benchmark:check-types` + `bun run check-types`
- Report: `benchmark/validation-report.json` (machine-readable `benchmarkVersion`, `fingerprint`, `stability`)
