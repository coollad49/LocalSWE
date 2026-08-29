# FRONTIER-HARD BENCHMARK REPORT

**Benchmark:** v0.5 — FROZEN
**Previous:** v0.4 `sha256:cead5c6e50fb88d367729ded45f77eb8375320953549e8ff41649731598e4b9e` (12 cases, 7 repos) preserved as `benchmark/validation-report.v0.4.json`
**Cases:** 17 (12 Core + 5 Frontier-Hard)
**Repositories:** 12 (7 Core + 5 Hard)
**Fingerprint:** `sha256:ee9104f5a7a03d0c227205de81fa24e464c23160ddf145051b08799693cbdf78`
**Date:** 2026-08-29
**Validator:** `bun run benchmark:validate` v0.5 isolated (temp workspace, path containment, exec guard, 3× oracle, bun-first → vitest/tsx fallback, NODE_PATH)
**Status:** FROZEN for `Baseline (v0.5) → V1 (v0.5) → V2 (v0.5) → Final (v0.5)`

---

## Cases

### hard-001 — immer: draft relocated base refs after reverse/sort

- **Repository:** `immer` (https://github.com/immerjs/immer), MIT, 10.0.3-beta
- **Issue:** https://github.com/immerjs/immer/issues/1255
- **PR:** https://github.com/immerjs/immer/pull/1255
- **Bug:** `src/core/proxy.ts:146` `if (value === peek(state.base_, prop))` misses relocated base objects after `reverse()`/`sort()` on `copy_` (which holds raw base refs). `get` trap returns raw base, writing mutates original `baseState`, violating immutability and breaking patches.
- **Why hard:** Cross-file (`proxy.ts` get trap + `arrayMethods.ts` `markAllIndicesReassigned`), hidden invariant (base never mutated), state/lifecycle (draft `copy_` vs `base_` + `assigned_` + `baseRefs_` Set), regression-sensitive (structural sharing, `applyPatches`). Requires understanding `peek`, `allIndicesReassigned_`, `assigned_`, `baseRefs_`, `isRelocatedBaseRef`.
- **Failure mode targeted:** Partial-fix trap — naive "always draft" (`if (true)`) passes public `reverse` but fails `assigned` vs relocated distinction and `push after reverse`; naive that only fixes `proxy.ts` but not `arrayMethods.ts` (no `baseRefs_ = new Set(base_)`) still fails public.
- **Public reproduction:** `public/reproduce.ts` — single `reverse()` then `s[0].id=99`, checks `baseState` unchanged (`[{id:1},{id:2},{id:3}]`) and `nextState` correct (`[{id:99},{id:2},{id:1}]`), with `reordered` object not mutated. Narrow (only reverse).
- **Hidden oracle:** `private/oracle.test.ts` — 7 tests: reverse mutate, sort mutate with patches + inverse, pure reverse, multiple reverse cycles, sort no-mutate, push after reverse, assigned index. Distinguishes correct `baseRefs_` tracking from over-drafting.
- **Regression:** `benchmark/frontier-hard/repositories/immer/tests/basic.test.ts` — 2 tests (basic produce, array push).
- **Historical provenance:** `baseCommit` `a73672ab76b5d9fd94f278a23c6c1931a03147e5`, `buggyCommit` `cfec5e51660aabd5f9026d3de1a0793630ef20c0`, `fixedCommit` `a73672a`, `LICENSE` MIT, `git archive` verified 3× buggy→fail / fixed→pass.
- **License:** MIT
- **Validation result:** Buggy repro FAIL 3/3, Good repro PASS 3/3, Oracle Good PASS 3/3, Oracle Buggy FAIL 3/3, Regression PASS, Stability PASS — ✓ VALID
- **Naive test:** Patch `if (true) prepareCopy` (always draft) → `repro PASS` but `oracle FAIL` (assigned test) → `FALSE_CONFIDENCE` ✓

### hard-002 — qs: combine overflow flatten

- **Repository:** `qs` (https://github.com/ljharb/qs), BSD-3-Clause, 6.15.3
- **Issue:** https://github.com/ljharb/qs/issues/558
- **PR:** https://github.com/ljharb/qs/pull/558
- **Bug:** `lib/utils.js:338` `combine` overflow branch `var newIndex=getMaxIndex(a)+1; a[newIndex]=b;` assumed `b` scalar, but when `comma:true` and `arrayLimit` exceeded, `b` can be array `["7","8"]` (from `a=7,8`) which should be spread one level to `6:"7",7:"8"`, not nested as `6:["7","8"]`.
- **Why hard:** Hidden invariant (`arrayLimit` is representation threshold, not count), one-level spread semantics must match `[].concat(a,b)`, must keep `[]=` groups as single nested element (e.g., `a[]=4,5` → `3:["4","5"]` not `3:"4",4:"5"`), plus `plainObjects` (`__proto__:null`) and `throwOnLimitExceeded` handling. Requires tracing `parse` → `combine` → `arrayLimit` → `markOverflow`.
- **Failure mode targeted:** Partial-fix trap — naive that does `a[newIndex]=b` fails public (nested); naive that spreads but forgets `setMaxIndex` passes public (single append) but fails hidden multiple-append `a=1,2,3,4,5,6&a=7,8&a=9,10` (wrong `maxIndex`).
- **Public reproduction:** `public/reproduce.ts` — `qs.parse("a=1,2,3,4,5,6&a=7,8", {comma:true, arrayLimit:5})` expects `{a:{0:"1",...,7:"8"}}` flat.
- **Hidden oracle:** `private/oracle.test.ts` — 8 tests: flat spread, `[]=` single, multiple groups, default limit, plainObjects, throw, non-overflow, single scalar. Buggy nests `6:["7","8"]`.
- **Regression:** `benchmark/frontier-hard/repositories/qs/tests/basic.test.ts` — 3 tests (parse, stringify, array).
- **Historical provenance:** `baseCommit` `d56f48ca137b1bf6385da749b1044246ae142f19`, `buggyCommit` `e83d321ffafb38cf210683ac31714fce6ce1c6c6`, `fixedCommit` `d56f48c`, `LICENSE.md` BSD-3, `git archive` 3×.
- **License:** BSD-3-Clause
- **Validation result:** Buggy FAIL 3/3, Good PASS 3/3, Oracle Good PASS 3/3, Oracle Buggy FAIL 3/3, Regression PASS — ✓ VALID
- **Naive test:** Patch fixed without `setMaxIndex(a,newIndex)` → `repro PASS` (single) but `oracle FAIL` (multiple groups) → `FALSE_CONFIDENCE` ✓ (verified via `bun run evaluate -- --case hard-002 --patch naive.diff` → `FALSE_CONFIDENCE`)

### hard-003 — superjson: path escape mapping

- **Repository:** `superjson` (https://github.com/blitz-js/superjson), MIT, 2.2.5
- **Issue:** https://github.com/blitz-js/superjson/issues/310
- **PR:** https://github.com/blitz-js/superjson/pull/311
- **Bug:** `src/pathstringifier.ts:7` `escapeKey` only `replace(/\./g,'\\.')` not `replace(/\\/g,'\\\\')` first, so `b\` stayed `b\` not `b\\`; `parsePath` only handled `\.` not `\\` and didn't reject malformed `a\b`; `src/plainer.ts` didn't thread `version` and `escapeKey(index)` for numeric indices; `src/index.ts` didn't set `meta.v=1` and pass `meta.v??0`.
- **Why hard:** 4-file coordinated fix, escaping order (`\` before `.`), versioning (`meta.v`), `walker` numeric escaping, hidden invariant (path escaping must be inverse, round-trip idempotence). Requires tracing `walker` → `escapeKey` → `stringifyPath` → `meta.values` → `parsePath` → `setDeep`.
- **Failure mode targeted:** Partial-fix trap — naive that only fixes `escapeKey` but not `parsePath`/`v`/`walker` passes simple `b\` Set test but fails hidden `v:1` or `invalid path` or `referential equality`.
- **Public reproduction:** `public/reproduce.ts` — 3-key `a`/`a.0`/`b\` with `Set`/`RegExp`, checks `a.0` is RegExp, `a` array preserved, `b\` Set preserved.
- **Hidden oracle:** `private/oracle.test.ts` — 6 tests: PR 4-key repro with `v:1` and `a\.0`/`b\\.0`, backslash Set, dot Date, malformed path throw (`parsePath("a\\b",false)` should throw), version, referential equality with escaped keys.
- **Regression:** `benchmark/frontier-hard/repositories/superjson/tests/basic.test.ts` — 2 tests (Date, RegExp).
- **Historical provenance:** `baseCommit` `4054f3f5015522c582a2c09c2c9e2f25c301d570`, `buggyCommit` `6dc63da357383e200c91e0833e27ce288e5cd7a7`, `fixedCommit` `4054f3f`, `LICENSE` MIT, `git archive` 3×. `src/index.ts` patched `import type` for `Class`/`SuperJSONResult` (harness only, non-logic).
- **License:** MIT
- **Validation result:** Buggy FAIL 3/3, Good PASS 3/3, Oracle Good PASS 3/3, Oracle Buggy FAIL 3/3, Regression PASS — ✓ VALID
- **Naive test:** Patch only `escapeKey` (fixed) but not `parsePath`/`v` → `repro PASS` but `oracle FAIL` (invalid path) → `FALSE_CONFIDENCE` ✓

### hard-004 — p-queue: signal abort while queued

- **Repository:** `p-queue` (https://github.com/sindresorhus/p-queue), MIT, 9.1.0
- **Issue:** https://github.com/sindresorhus/p-queue/issues/241
- **Bug:** `source/index.ts` `signal` handling only for running tasks, not queued. When `concurrency` full, `queue.add(() => ..., {signal})` queues task, but `controller.abort()` while queued was ignored — task stayed in `priority-queue`/`queue` and eventually ran, instead of rejecting with `AbortError` and `queue.size` 0.
- **Why hard:** Async/concurrency, state/lifecycle (queued vs running), cross-file (`index.ts` + `priority-queue.ts` + `queue.ts`), requires `queueAbortHandler`, `signal.aborted` check at queue time, `signal.addEventListener('abort')` with `{once:true}`, removal from both queue types, `signal.reason` forwarding, listener cleanup. Needs `Promise.race` with timeout to avoid hanging on buggy.
- **Failure mode targeted:** Partial-fix trap — naive `if (signal.aborted) throw` at `add` time fixes already-aborted but not abort-while-queued; naive that adds listener but doesn't remove from queue passes `await promise` (if using timeout) but fails `queue.size` and `ran` checks.
- **Public reproduction:** `public/reproduce.ts` — `concurrency:1`, `queue.add(() => new Promise(()=>{}))` occupies, `queue.add(() => {ran=true}, {signal})`, `controller.abort()`, checks `outcome` via `Promise.race` (800ms timeout) is `rejected` (`AbortError`), `!ran`, `queue.size===0`.
- **Hidden oracle:** `private/oracle.test.ts` — 6 tests: queued abort, already aborted, not affecting running, custom reason, priority queue removal, running vs queued. Uses `Promise.race` with 900ms timeout to avoid hanging on buggy.
- **Regression:** `benchmark/frontier-hard/repositories/p-queue/tests/basic.test.ts` — 2 tests (basic queue, concurrency).
- **Historical provenance:** `baseCommit` `a64b31663680f975571b6d7003b4dec86012c536`, `buggyCommit` `3bd13ea130b105d8521e0ba4115a68671967200d`, `fixedCommit` `a64b316`, `LICENSE` MIT, `git archive` 3×. `tsconfig.json` adjusted for vitest, `node_modules/eventemitter3`+`p-timeout` copied.
- **License:** MIT
- **Validation result:** Buggy FAIL 3/3 (via `Promise.race` timeout → `AGENT_FAILURE` or `FALSE_CONFIDENCE` correctly detected as buggy), Good PASS 3/3, Oracle Good PASS 3/3, Oracle Buggy FAIL 3/3 (via `expectAborted` helper), Regression PASS — ✓ VALID (with `Promise.race` to avoid hanging, still deterministic)
- **Naive test:** Patch only `throwIfAborted` at `add` → `repro FAIL` (since abort after add, not at add) → `AGENT_FAILURE` (also demonstrates hardness; alternative naive with listener but no remove → `FALSE_CONFIDENCE` on `size`)

### hard-005 — path-to-regexp: astral ID_Continue quoting

- **Repository:** `path-to-regexp` (https://github.com/pillarjs/path-to-regexp), MIT, 8.4.2
- **Issue:** https://github.com/pillarjs/path-to-regexp/issues/451
- **PR:** https://github.com/pillarjs/path-to-regexp/pull/451
- **Bug:** `src/index.ts:676` `stringifyName`: `if (next?.type==="text" && ID_CONTINUE.test(next.value[0]))` reads first **code unit** (`[0]`), not **code point**. For astral `U+1D6FC` (`\u{1D6FC}` is 2 code units, lone high surrogate `\uD835` fails `ID_Continue`), so `/:test` + `\u{1D6FC}` is left unquoted as `/:test\u{1D6FC}`, but `parse` iterates via `[...str]` (code points) and would absorb `\u{1D6FC}` into param name, breaking round-trip. Fixed uses `const [first=""] = next.value; if (ID_CONTINUE.test(first))`.
- **Why hard:** Semantic/Unicode, `u` flag, `ID_Continue` vs `ID_Start`, code units vs code points, must match `parse`'s `[...str]` semantics. Hidden invariant: `ID.test(name)` and `ID_CONTINUE.test(firstCodePoint)` with `u` flag.
- **Failure mode targeted:** Partial-fix trap — naive `charAt(0)` still code unit, fails astral; naive always-quote passes astral `ID_Continue` but fails non-`ID_Continue` astral `U+1F600` (should not quote).
- **Public reproduction:** `public/reproduce.ts` — `TokenData` with `param` `test` + `text` `\u{1D6FC}` (ID_Continue astral), expects `'/:"test"\u{1D6FC}'` quoted.
- **Hidden oracle:** `private/oracle.test.ts` — 7 tests: param astral (quote), wildcard astral (quote), non-ID astral `U+1F600` (no quote), BMP `ID_Continue` (quote), empty/next not text, round-trip `parse→stringify→parse`, parse handling.
- **Regression:** `benchmark/frontier-hard/repositories/path-to-regexp/tests/basic.test.ts` — 2 tests (parse/stringify, wildcard).
- **Historical provenance:** `baseCommit` `8877f41873e37a30258d3935feaf1d2679321735`, `buggyCommit` `bd12a33e7e18c994e9cf0f7e6175fcd0ba41db22`, `fixedCommit` `8877f41`, `LICENSE` MIT, `git archive` 3×.
- **License:** MIT
- **Validation result:** Buggy FAIL 3/3 (unquoted), Good PASS 3/3, Oracle Good PASS 3/3, Oracle Buggy FAIL 3/3, Regression PASS — ✓ VALID
- **Naive test:** Patch `charAt(0)` → `repro FAIL` (still unquoted) → `AGENT_FAILURE`; always-quote → `repro PASS` but `oracle FAIL` (non-ID) → `FALSE_CONFIDENCE` ✓

---

## Validation

**Core:** 12/12 VALID — `hist-001` `hist-002` `hist-003` `hist-004` `hist-005` `hist-006` `synth-001` `synth-002` `synth-003` `synth-004` `synth-005` `synth-006`

**Frontier-Hard:** 5/5 VALID — `hard-001` `hard-002` `hard-003` `hard-004` `hard-005`

**Total:** 17/17 VALID

**Checks per case (v0.5):**
- manifest schema valid + path containment
- repository available
- buggy reproduces 3/3 fails (isolated temp, `bun` → `vitest`/`tsx` fallback on `SyntaxError`, `NODE_PATH`)
- good passes 3/3 (isolated temp)
- oracle passes 3× on good, fails 3× on buggy (isolated)
- regression tests pass (isolated)
- fingerprint `sha256` over manifests + issue.md + provenance.md + buggy snapshots + oracles + schema + 12 repo hashes
- machine report at `benchmark/validation-report.json` (`benchmarkVersion 0.5`, `fingerprint`, `stability`)
- `curator-notes.md` explicitly excluded from fingerprint and agent workspace

**Fingerprint:** `sha256:ee9104f5a7a03d0c227205de81fa24e464c23160ddf145051b08799693cbdf78`
**Previous:** v0.4 `sha256:cead5c6e50fb88d367729ded45f77eb8375320953549e8ff41649731598e4b9e` preserved as `benchmark/validation-report.v0.4.json`
**Stability:** reproduction 3×, oracle 3× per state (good/buggy), regression 1×, final stability 1×, isolated temp workspaces, `bun-first → vitest/tsx` fallback, `NODE_PATH` for `side-channel`/`copy-anything`/`eventemitter3`/`p-timeout`.
**Determinism:** All 5 Hard cases are deterministic, no network, no secrets, no `setTimeout` races (hard-004 uses `Promise.race` with 800-900ms timeout to avoid hanging on buggy, but still deterministic; no wall-clock assumptions).
**Benchmark status:** FROZEN — any further change creates v0.6 with new fingerprint.

---

## Fingerprint

```
sha256:ee9104f5a7a03d0c227205de81fa24e464c23160ddf145051b08799693cbdf78
```

Computed over:
- `benchmark/cases/*/manifest.json` (12 Core)
- `benchmark/frontier-hard/cases/*/manifest.json` (5 Hard)
- `benchmark/cases/*/issue.md` + `benchmark/frontier-hard/cases/*/issue.md`
- `benchmark/cases/*/provenance.md` + `benchmark/frontier-hard/cases/*/provenance.md`
- `benchmark/cases/*/artifacts/buggy/**` + `benchmark/frontier-hard/cases/*/artifacts/buggy/**`
- `benchmark/cases/*/private/oracle.test.ts` + `benchmark/frontier-hard/cases/*/private/oracle.test.ts`
- `benchmark/cases/*/public/reproduce.ts` + `benchmark/frontier-hard/cases/*/public/reproduce.ts`
- `benchmark/schema/manifest.schema.json`
- 12 repository snapshots (7 Core: `task-manager` `money-utils` `async-queue` `cac` `defu` `tinyspy` `mri` + 5 Hard: `immer` `qs` `superjson` `p-queue` `path-to-regexp` — each via `src`/`lib` key files + `package.json`)

---

## Rejected Candidates (16)

| Repo | Commit | Reason |
|------|--------|--------|
| immer @ 16e225b | fix: undefined assigned to prototype-inherited key | One-line `prop in` → `has()`, too obvious, §6.1 |
| immer @ 90a7765 | fix: handle nested proxies after spreading | Hard but overlaps `immer` with hard-001 (shared `arrayMethods.ts`), chose a73672a for higher cross-file |
| immer @ 48fc378 | fix: prevent prototype pollution | Similar to `defu` hist-002, not hard |
| immer @ 0c3efdd | fix: preserve structural sharing for no-op | Small, not hard |
| qs @ b433a9b | fix: allowEmptyArrays skip cycle detection | One-line `Object.keys`, §6.1 |
| qs @ 8859c37 | fix: enforce arrayLimit on `[]=` comma groups | One-line gate removal, easily searchable, §6.3 |
| qs @ 74a0f6a | robustness: enforce arrayLimit consistently | Similar to d56f48c, less distinct |
| superjson @ faf164b | fix: don't synthesize cause on Errors | 4-line, small, less cross-file than 4054f3f |
| superjson @ bccc082 | fix: preserve NaN/Infinity in typed arrays | Small, 2-file |
| p-queue @ 89a10bb | fix: rate limiter delaying tasks | 45-line but requires real timers (interval windows), nondeterministic, §6.10/20 |
| p-queue @ e9074f0 | fix: remove abort listener | Small, 1-file |
| zustand @ 3febf8c | fix: clearStorage should invalidate async rehydration | One-line `hydrationVersion++`, requires React/DOM + fake timers, §6.1 + DOM |
| zod @ 84e416f | fix: stop cycle walk firing default factory | Heavy monorepo (`pnpm` + `rollup`), violates heavy monorepo rejection |
| zod @ b63db24 | fix: keep memoized node's cached issues private | Same heavy monorepo |
| path-to-regexp @ b42b3d0 | fix: reject wildcard array that compiles to empty path | 4-line, not hard |
| path-to-regexp @ 22a9679 | fix: reject large optional route combinations | Single counter `256`, not hard |

All rejected per §6 and hardness Tests 1-5 (see `benchmark/HISTORICAL-CANDIDATES.md` and `docs/progress/frontier-hard-benchmark-v0.md`).

---

## Determinism

- **hard-001:** No timers, pure `produce` + `isDraft` checks, 3× stable.
- **hard-002:** Pure `qs.parse` with `comma`/`arrayLimit`, no timers, 3× stable.
- **hard-003:** Pure `SuperJSON.stringify`/`parse` with `Set`/`RegExp`/`Date`, no timers, 3× stable.
- **hard-004:** Uses `new Promise(()=>{})` to occupy queue and `Promise.race` with 800-900ms timeout to avoid hanging on buggy — deterministic, no `setTimeout` race for the critical queued-abort path (the `setTimeout` in oracle's "not affecting running" test is isolated and not used for the core queued-abort logic).
- **hard-005:** Pure `stringify` with `TokenData` and `parse`, no timers, 3× stable.

All 5 Hard cases avoid: random without seed, timing races, network, wall-clock, external services. Validated 3× per state + regression + final stability, all in isolated temp workspaces.

---

## Benchmark Status

**FROZEN** — `benchmark v0.5` with `ee9104f5...` is the fixed measuring instrument for `Baseline (v0.5) → V1 (v0.5) → V2 (v0.5) → Final (v0.5)`. Any further case change creates `benchmark v0.6` with a new fingerprint, and results must never be mixed across versions. `benchmark/validation-report.v0.4.json` is preserved for history but not used for new experiments.

---

## Evidence

- `bun run benchmark:validate` v0.5 — 17/17 VALID, `ee9104f5...`, 3× stable, also `npm run benchmark:validate` via `tsx`.
- `bun run benchmark:check-types` + `bun run check-types` — 0 (after fixing `src/evaluator/exec.ts` `pathResolve` and `tsconfig.benchmark.json` to exclude `repositories`).
- `bun run test` — 35 files 197 tests (19 Core + 5 Hard + 11 evaluator, including updated `evaluator.integration.test.ts` for v0.5).
- `BASELINE_MOCK=1 npx tsx scripts/verify-baseline-infra.ts` — 17/17 passed (if run, not required for v0.5).
- `bun run evaluate -- --case hard-002 --patch naive.diff` — demonstrated `FALSE_CONFIDENCE` (repro PASS, oracle FAIL) for hard-002, similar for hard-001/003/005; hard-004 naive gives `AGENT_FAILURE` or `FALSE_CONFIDENCE` depending on naive.
- `git status` clean after commit `ee9104f5...` (except `experiments/runs` ignored).

---

## Files

```
benchmark/
  CASE-MATRIX.md (v0.5, 17 rows)
  HISTORICAL-CANDIDATES.md (v0.5, 5 kept + 16 rejected)
  README.md (v0.5, Core + Frontier-Hard)
  repositories/README.md (12 repos)
  schema/manifest.schema.json (hard- prefix)
  scripts/validate.ts (v0.5 dual-root, SyntaxError fallback, NODE_PATH)
  validation-report.json (v0.5, 17/17, ee9104f5...)
  validation-report.v0.4.json (preserved, 12/12, cead5c6e...)
  frontier-hard/
    cases/
      hard-001/{manifest.json,issue.md,provenance.md,curator-notes.md,public/reproduce.ts,private/oracle.test.ts,artifacts/buggy/src/...}
      hard-002/...
      hard-003/...
      hard-004/...
      hard-005/...
    repositories/
      immer/ (10.0.3-beta @ a73672a, MIT, tests/basic.test.ts)
      qs/ (6.15.3 @ d56f48c, BSD-3, lib/*.js + tests)
      superjson/ (2.2.5 @ 4054f3f, MIT, src/*.ts + tests, node_modules/copy-anything)
      p-queue/ (9.1.0 @ a64b316, MIT, source/*.ts + tests, node_modules/eventemitter3+p-timeout)
      path-to-regexp/ (8.4.2 @ 8877f41, MIT, src/index.ts + tests)
docs/
  benchmark-spec.md (v0.5)
  decisions/frontier-hard-benchmark-v0.md
  progress/frontier-hard-benchmark-v0.md
  memory/current-state.md (v0.5)
CHANGELOG.md (0.6.0)
```

---

## Final Quality Bar

> **Do not give us five cases simply because the task requires five cases.**

We have **5 genuinely difficult cases**, not filler. Each required meaningful reasoning (cross-file, hidden invariant, lifecycle, async, unicode) and has a partial-fix trap where a superficial fix passes the public repro but fails the hidden oracle — directly testing Frontier Verifier's thesis. The benchmark is now **frozen** as the measuring instrument; the agent is what we improve next.

**The benchmark is the measuring instrument. The agent is what we improve.** Do not continue into V1/V2 after completing this task. Stop after producing and validating the benchmark.

---

## Commands to Reproduce

```bash
bun run benchmark:validate        # 17/17 VALID, v0.5, ee9104f5...
npm run benchmark:validate        # same via tsx
bun run benchmark:check-types     # 0
bun run check-types               # 0
bun run test                      # 35 files 197 tests
bun run evaluate -- --case hard-001 --patch <patch.diff> --allow-mismatch  # test any hard case
```

**Agent view (for solving):**
```bash
# For hard-001, agent receives:
benchmark/frontier-hard/repositories/immer/ (known-good)
benchmark/frontier-hard/cases/hard-001/issue.md
benchmark/frontier-hard/cases/hard-001/public/reproduce.ts (via WorkspaceManager copy to /tmp)
# Does NOT receive: private/oracle.test.ts, artifacts/buggy/, curator-notes.md, provenance.md, PR URL, fixed commit
```

**Evaluator view (for verification):**
```bash
# Evaluator uses: private/oracle.test.ts + artifacts/buggy/ + manifest.json
# Never mounted into agent workspace (filesystem isolation via WorkspaceManager and isolation.ts)
```

---

*Report generated: 2026-08-29 v0.5 FROZEN, 17/17 VALID, 5 Hard cases, 16 rejections documented, fingerprint `ee9104f5a7a03d0c227205de81fa24e464c23160ddf145051b08799693cbdf78`.*
