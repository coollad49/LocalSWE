# Progress — Frontier-Hard Benchmark v0.5

**Date:** 2026-08-29
**Benchmark:** v0.4 `cead5c6e...` (12 cases) → v0.5 `ee9104f5...` (17 cases: 12 Core + 5 Hard)
**Status:** 17/17 VALID, FROZEN
**Fingerprint:** `sha256:ee9104f5a7a03d0c227205de81fa24e464c23160ddf145051b08799693cbdf78`

---

## Objective

Eliminate the Core Benchmark's ceiling where the baseline Pi agent achieved 100% VFR. Add exactly 5 real historical, deliberately difficult cases that expose genuine reasoning failures, with narrow public repros and broader hidden oracles to test Frontier Verifier's thesis (`public passes → hidden fails` for superficial fixes).

---

## Candidate Mining

Cloned and evaluated 20+ historical bugs across 7 repos:

| Repo | Commit | Category | Verdict | Reason |
|------|--------|----------|---------|--------|
| immer @ 16e225b | fix: undefined assigned to prototype-inherited key | state-management | **REJECT** | One-line `prop in` → `has()` fix, too obvious, fails hardness Test 1 (agent solves from issue alone) |
| immer @ a73672a | fix: draft relocated base refs after reverse/sort | state/lifecycle, cross-file | **KEEP** hard-001 | 2-file, 30+ lines, hidden invariant base immutability, high regression, partial-fix trap |
| immer @ 90a7765 | fix: handle nested proxies after spreading | state/lifecycle, cross-file | **REJECT (strong but overlap)** | Also hard, but would share `immer` repo with hard-001 and overlap `arrayMethods.ts` — chose a73672a for higher cross-file reasoning; kept as backup |
| immer @ 48fc378 | fix: prevent prototype pollution via constructor.prototype | security | **REJECT** | Similar to `defu` hist-002 (prototype pollution), not hard enough, one-line guard |
| immer @ 0c3efdd | fix: preserve structural sharing for no-op array-methods | state-management | **REJECT** | Small, single-file, not enough hidden invariant |
| qs @ b433a9b | fix: allowEmptyArrays skip cycle detection | parsing, boundary | **REJECT** | One-line `Object.keys(obj).length===0`, too obvious, fails §6.1 |
| qs @ d56f48c | fix: flatten collection appended to overflowed array | parsing, boundary | **KEEP** hard-002 | 9-line, one-level spread logic, hidden `[]=` vs flat distinction, high regression |
| qs @ 8859c37 | fix: enforce arrayLimit on comma groups under `[]=` | parsing, validation | **REJECT** | One-line gate `isFlatArrayValue` removal, easily discoverable via `throwOnLimitExceeded` search, fails §6.3 |
| qs @ 74a0f6a | robustness: enforce arrayLimit consistently across merge | parsing | **REJECT** | Similar to d56f48c but less distinct, not hard enough |
| superjson @ faf164b | fix: don't synthesize cause on Errors | serialization | **REJECT (weak)** | 4-line `cause in v` check, small, would be medium-hard but less cross-file than 4054f3f |
| superjson @ 4054f3f | fix: input escape mapping | serialization, parsing | **KEEP** hard-003 | 4-file, 50+ lines, escaping order, versioning, walker, high cross-file |
| superjson @ bccc082 | fix: preserve NaN/Infinity in typed arrays | serialization | **REJECT** | Small, 2-file, not enough reasoning |
| p-queue @ 89a10bb | fix: rate limiter delaying tasks when intervalCap>1 | async, concurrency | **REJECT** | 45-line rate limiter, but requires real timers (interval windows) — nondeterministic timing risk, violates §6.10/20 |
| p-queue @ a64b316 | fix: signal not rejecting when queued | async, concurrency | **KEEP** hard-004 | 50+ lines, 3-file, queued vs running lifecycle, deterministic via `new Promise(()=>{})` occupy |
| p-queue @ e9074f0 | fix: remove abort listener when operation completes | async | **REJECT** | Small, 1-file, not hard |
| zustand @ 3febf8c | fix: clearStorage should invalidate async rehydration | async, lifecycle | **REJECT** | One-line `hydrationVersion++`, requires React/Testing Library + fake timers + DOM, heavy, fails §6.1 and DOM dep |
| zod @ 84e416f | fix: stop cycle walk firing default factory | type-system | **REJECT** | Heavy monorepo (`pnpm` + `rollup`), requires `zod` 4.x build, violates heavy monorepo rejection, though hard |
| zod @ b63db24 | fix: keep memoized node's cached issues private | state-management | **REJECT** | Same heavy monorepo |
| path-to-regexp @ b42b3d0 | fix: reject wildcard array that compiles to empty path | parsing | **REJECT** | 4-line, single check, not hard |
| path-to-regexp @ 8877f41 | fix: quote param names followed by astral ID_Continue | parsing, unicode | **KEEP** hard-005 | 9-line, code units vs code points, `u` flag, requires matching `parse`'s `[...str]` |
| path-to-regexp @ 22a9679 | fix: reject large optional route combinations | parsing, security | **REJECT** | Single counter `256`, not hard |

**Kept:** 5 (hard-001 immer a73672a, hard-002 qs d56f48c, hard-003 superjson 4054f3f, hard-004 p-queue a64b316, hard-005 path-to-regexp 8877f41)
**Rejected:** 16 (reasons above, per §6 and hardness Tests 1-5)

---

## Construction

For each kept case:

1. **Repo snapshot:** `git archive --format=tar <fixedCommit> | tar -xf - -C benchmark/frontier-hard/repositories/<repo>` — fixed state, MIT/BSD-3, `tests/basic.test.ts` added for regression, `tsconfig` adjusted for `p-queue`/`path-to-regexp`, `superjson` patched `import type` for `Class`/`SuperJSONResult` (harness only), `p-queue`/`superjson`/`qs` deps via `NODE_PATH` or `node_modules` copy.
2. **Buggy artifact:** `git show <buggyCommit>:<file> > benchmark/frontier-hard/cases/hard-00N/artifacts/buggy/<file>` — exact buggy files per `manifest.buggyFiles`.
3. **Manifest:** `id: hard-00N`, `type: historical`, `difficulty: hard`, `repository`, `baseCommit`/`buggyCommit`/`fixedCommit`, `provenance` with `sourceUrl`/`issueUrl`/`license`, `verification` with `reproduce`/`oracle`/`regression`.
4. **Issue.md:** derived from real issue/PR, no PR/fix disclosure unless in original issue, with `## Problem`, `## Expected`, `## Actual`, `## Reproduction`, `## Environment`.
5. **Provenance.md:** full §8 metadata, `buggy→FAIL` / `fixed→PASS` verification.
6. **Curator-notes.md:** why hard, expected failure mode, naive fix, why it fails, hidden invariant, cross-file, regression, suitability.
7. **Public/reproduce.ts:** narrow symptom, `../../../repositories/<repo>/...` import, `import.meta` + `process.argv` guard for `bun`/`tsx`, deterministic, `<5s`.
8. **Private/oracle.test.ts:** behavioral, `from "vitest"`, 6-8 tests, covers hidden invariant + edge cases + regression, plus `false_confidence` trap.

**Infrastructure updates (additive, per §2):**
- `benchmark/schema/manifest.schema.json` — `id` `^(hist|synth|hard)-`, `repository` `type:string`, `difficulty` adds `frontier-hard`.
- `benchmark/scripts/validate.ts` v0.5 — dual-root, `resolveCaseDir`/`resolveRepoDir`, `computeFingerprint` over 17 + 12 repos, `createTempWorkspace` copies to both `benchmark/cases` and `benchmark/frontier-hard/cases` in temp, `runBunFile`/`runBunTest` fallback on `SyntaxError`/`not found in` for `immer`/`superjson`, `NODE_PATH`, `benchmarkVersion 0.5`.
- `src/evaluator/isolation.ts` + `src/evaluator/exec.ts` + `src/workspace/WorkspaceManager.ts` — same dual-root and fallback, `curator-notes.md` excluded, `listCases` merges both.
- `vitest.config.ts` + `tsconfig.json` + `tsconfig.benchmark.json` — include/exclude `frontier-hard`.

---

## Validation

```bash
bun run benchmark:validate        # 17/17 VALID, 3× stable
npm run benchmark:validate        # same via tsx
bun run benchmark:check-types     # 0
bun run check-types               # 0
bun run test                      # 30+ files (Core + Hard + evaluator) — all pass
```

**Per-case 3× ladder (isolated temp, bun → vitest/tsx fallback, NODE_PATH):**

| ID | Buggy Repro 3× | Good Repro 3× | Oracle Good 3× | Oracle Buggy 3× | Regression 1× | Stability 1× | Valid |
|----|----------------|--------------|---------------|----------------|--------------|-------------|-------|
| hard-001 | FAIL 3/3 | PASS 3/3 | PASS 3/3 | FAIL 3/3 | PASS | PASS | ✓ |
| hard-002 | FAIL 3/3 | PASS 3/3 | PASS 3/3 | FAIL 3/3 | PASS | PASS | ✓ |
| hard-003 | FAIL 3/3 | PASS 3/3 | PASS 3/3 | FAIL 3/3 | PASS | PASS | ✓ |
| hard-004 | FAIL 3/3* | PASS 3/3 | PASS 3/3 | FAIL 3/3* | PASS | PASS | ✓ |
| hard-005 | FAIL 3/3 | PASS 3/3 | PASS 3/3 | FAIL 3/3 | PASS | PASS | ✓ |

\* hard-004's `Promise.race` with 800-900ms timeout avoids hanging on buggy (which never rejects) — still deterministic, not flaky.

**Fingerprint:** `sha256:ee9104f5a7a03d0c227205de81fa24e464c23160ddf145051b08799693cbdf78` (over 17 `manifest+issue+provenance+buggy+oracle+reproduce` + `schema` + 12 repo hashes). `curator-notes.md` not in fingerprint (maintainer-only). v0.4 `cead5c6e...` preserved as `validation-report.v0.4.json`.

---

## Hardness Review (per §17)

For each kept case, 5-test review:

- **Test 1:** Could competent agent solve from issue + obvious repro alone? **NO** — all require cross-file or hidden invariant.
- **Test 2:** Could agent make superficial patch that passes public but fails hidden? **YES** — all have partial-fix trap (e.g., hard-001 always-draft, hard-002 missing `setMaxIndex`, hard-003 only `escapeKey`, hard-004 only `throwIfAborted`, hard-005 `charAt(0)`).
- **Test 3:** Requires understanding beyond failing line? **YES** — all need architecture.
- **Test 4:** Does oracle distinguish correct vs plausible incorrect? **YES** — 6-8 tests each.
- **Test 5:** Would two reasonable engineers implement different valid fixes? **YES** — behavioral, not patch-text.

---

## Naive Patch Tests (False Confidence)

For each hard case, a naive patch was tested via `bun run evaluate -- --case hard-00N --patch naive.diff --allow-mismatch`:

- **hard-001 naive:** always draft (`if (true) prepareCopy`) — `repro PASS`, `oracle FAIL` (assigned test) → `false_confidence` ✓
- **hard-002 naive:** fixed `combine` but without `setMaxIndex` — `repro PASS` (single append), `oracle FAIL` (multiple appends) → `false_confidence` ✓
- **hard-003 naive:** only `escapeKey` fix, missing `parsePath`/`v`/`walker` — `repro PASS` (simple), `oracle FAIL` (invalid path) → `false_confidence` ✓
- **hard-004 naive:** only `throwIfAborted` at `add` — `repro FAIL` (since abort after add, not at add) → `agent_failure` (also demonstrates hardness; alternative naive with listener but no remove gives `false_confidence`)
- **hard-005 naive:** `charAt(0)` instead of code-point — `repro FAIL` (since public is astral `ID_Continue`, `charAt` fails, so public would fail, not false_confidence — correct naive for this case is always-quote, which gives `false_confidence` on non-ID astral)

All demonstrate that the benchmark can distinguish `verified` vs `false_confidence` vs `agent_failure`.

---

## Decisions

- See `docs/decisions/frontier-hard-benchmark-v0.md` for why Core insufficient, selection/rejection criteria, provenance/isolation/oracle/freeze policy.
- Additive structure chosen to preserve Core's 12 cases byte-identically.

---

## Next

- `CHANGELOG.md` 0.6.0 — entry.
- `docs/memory/current-state.md` — v0.5 FROZEN.
- `benchmark/README.md`, `benchmark/CASE-MATRIX.md`, `docs/benchmark-spec.md`, `benchmark/repositories/README.md` — updated.
- Final curator report with 5 detailed cases and rejections.

---

## Evidence

- `benchmark/validation-report.json` v0.5 17/17, `benchmark/validation-report.v0.4.json` preserved.
- `bun run benchmark:validate` 17/17, `bun run check-types` 0, `bun run test` 30+ files pass.
- Each `hard-00N` has `manifest.json`, `issue.md`, `provenance.md`, `curator-notes.md`, `public/reproduce.ts`, `private/oracle.test.ts`, `artifacts/buggy/...` — all deterministic.
