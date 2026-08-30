# Frontier Verifier Benchmark — Case Matrix

**Version:** 0.5 — FROZEN for experiments (12 Core: 6 genuine historical + 6 synthetic + 5 Frontier-Hard genuine historical, fingerprint `sha256:20f1003c3f0e10bcd6293f49ca2a2167011941f5b0677076c93103b10f411dde`)
**Cases:** 17 (12 Core + 5 Frontier-Hard)
**Repositories:** 12 (7 Core: 3 benchmark-owned: task-manager, money-utils, async-queue + 4 external historical: cac, defu, tinyspy, mri + 5 Frontier-Hard: immer, qs, superjson, p-queue, path-to-regexp)
**Date:** 2026-08-29
**Validator:** `bun run benchmark:validate` v0.5 isolated (bun-first → vitest/tsx fallback, temp workspace, path containment, exec guard, 3× oracle) — 17/17 ✓ VALID (12/12 Core + 5/5 Frontier-Hard, also `npm run benchmark:validate` via tsx)
**Fingerprint:** `sha256:20f1003c3f0e10bcd6293f49ca2a2167011941f5b0677076c93103b10f411dde` (sha256 over manifests + issue.md + provenance.md + buggy snapshots + oracles + schema + 12 repo hashes)
**Stability:** reproduction 3×, oracle 3× per state, regression 1×
**Previous:** v0.4 `sha256:cead5c6e50fb88d367729ded45f77eb8375320953549e8ff41649731598e4b9e` preserved as `benchmark/validation-report.v0.4.json`

---

## Summary Table

| ID | Type | Repository | Difficulty | Category | Reproducible | Verified |
| -- | ---- | ---------- | ---------- | -------- | ------------ | -------- |
| hist-001 | historical | cac | medium | validation, parsing | ✓ | ✓ |
| hist-002 | historical | defu | hard | security, validation | ✓ | ✓ |
| hist-003 | historical | tinyspy | medium | state-management, api-behavior | ✓ | ✓ |
| hist-004 | historical | mri | easy | parsing, type-coercion | ✓ | ✓ |
| hist-005 | historical | mri | medium | parsing, alias-handling | ✓ | ✓ |
| hist-006 | historical | tinyspy | medium | state-management | ✓ | ✓ |
| synth-001 | synthetic | task-manager | medium | state-management, business-logic | ✓ | ✓ |
| synth-002 | synthetic | money-utils | easy | validation, business-logic | ✓ | ✓ |
| synth-003 | synthetic | async-queue | medium | error-handling, asynchronous | ✓ | ✓ |
| synth-004 | synthetic | task-manager | hard | state-management, api-behavior | ✓ | ✓ |
| synth-005 | synthetic | money-utils | medium | boundary, data-transformation | ✓ | ✓ |
| synth-006 | synthetic | async-queue | easy | api-behavior, error-handling | ✓ | ✓ |
| hard-001 | historical | immer | hard | state-management, lifecycle, api-behavior | ✓ | ✓ |
| hard-002 | historical | qs | hard | parsing, boundary, state-management | ✓ | ✓ |
| hard-003 | historical | superjson | hard | serialization, parsing, state-management | ✓ | ✓ |
| hard-004 | historical | p-queue | hard | asynchronous, state-management, error-handling | ✓ | ✓ |
| hard-005 | historical | path-to-regexp | hard | parsing, api-behavior, data-transformation | ✓ | ✓ |

---

## Historical Cases (Genuine — Externally Sourced) — Core

All 6 historical Core cases are genuine external bugs with pinned buggyCommit → fixedCommit, reproduced buggy→fail / fixed→pass in isolated temp workspace, hidden behavioral oracle, MIT licensed.

### hist-001 — cac: option default leaks to alias names (cacjs/cac @ ffaf796)
- **Repository:** `cac` (https://github.com/cacjs/cac), MIT, 6.0.0, commit `ffaf796fc5a0d776147178055b91677346c0e69a` (PR #153)
- **Buggy Commit:** `8342919821fbffa733c6ab9558f4d60fc43f9ff0` (parent of ffaf796)
- **Fixed Commit:** `ffaf796` — applies default only if none of the names was parsed: `parsedOptionNames = cliOption.names.filter(n=>parsed[n]!==undefined)` length 0 check.
- **Bug:** `src/CAC.ts:286` sets default for all names unconditionally: `for (name of cliOption.names) options[name]=default`. Parsing `node bin --base-url https://gitlab.com` with option `-b, --base-url` leaks `b: https://github.com` default even though alias was parsed.
- **Why:** Tests alias/option parsing, default precedence, validation.
- **Files:** `src/CAC.ts`
- **Oracle:** 4 hidden tests: no-args defaults both, `-b` both, `--base-url` only baseUrl, skip boolean. Buggy fails `--base-url` case (leaked `b`).
- **Provenance:** `benchmark/cases/hist-001/provenance.md`, `benchmark/repositories/cac` at 6.0.0 (fixed). Bug via `git archive` blobs verified 3×.

### hist-002 — defu: prototype pollution via __proto__ (unjs/defu @ 3942bfb)
- **Repository:** `defu` (https://github.com/unjs/defu), MIT, 6.1.4, commit `3942bfbbcaa72084bd4284846c83bd61ed7c8b29` (PR #156)
- **Buggy:** `d3ef16dabe861713192ba8679c5db8e0ac143f9b` (parent)
- **Fixed:** `3942bfb` — `Object.assign({}, defaults)` → `{ ...defaults }` preserves `__proto__` as own property rather than polluting prototype.
- **Bug:** `src/defu.ts:10` pollutes `Object.prototype` when defaults contains `{"__proto__":{"polluted":true}}`.
- **Why:** Security / validation / data-transformation, tests prototype safety.
- **Files:** `src/defu.ts`
- **Oracle:** 8 hidden tests: 3 pollution blocked, constructor/global, 3 normal merges. Buggy leaks pollution.
- **Provenance:** `benchmark/cases/hist-002/provenance.md`.

### hist-003 — tinyspy: prototype restore leak (tinylibs/tinyspy @ 0372bfb)
- **Repository:** `tinyspy` (https://github.com/tinylibs/tinyspy), MIT, 4.0.2, commit `0372bfb952fe761742f1b96165c3b6a25d499588`
- **Buggy:** `0684083fc217e18d21ea404b3461bde52b60fdb3` (parent of 0372bfb)
- **Fixed:** `0372bfb` — tracks `originalDescriptorObject` and `Reflect.deleteProperty` if method defined on prototype; `utils.ts:29` `defineValue` configurable.
- **Bug:** `src/spyOn.ts:22` + `restore()` leaks own property on instances where method lives on prototype.
- **Why:** State-management, tests descriptor semantics.
- **Files:** `src/spyOn.ts`, `src/utils.ts`
- **Oracle:** 3 hidden tests: single restore clean, 3× cycles, prototype ownership. Buggy leaves own `f`.
- **Repro:** `class Foo { f(){return 'original'}} spyOn(foo,'f') restore check descriptor undefined`.

### hist-004 — mri: boolean defaults leak numeric into _ (lukeed/mri @ 94f8c09)
- **Repository:** `mri` (https://github.com/lukeed/mri), MIT, 1.1.4 (5437ea5 includes fix, baseCommit 5437ea5 but fixed PR 94f8c09), commit `94f8c0941088716be3c86b850a40dedbe0a2e520` (Issue #8)
- **Buggy:** `a4759d51a5a5c86b902cf9d5484654fdfb1e2750` (blob b4d8a0a)
- **Fixed:** `94f8c09` — `toVal` swaps `typeof val==='boolean'` before `opts.boolean` check to preserve boolean typed defaults.
- **Bug:** `lib/index.js:5` boolean default `true` coerced via boolean branch pushes `1` into `out._`.
- **Why:** Parsing / type-coercion.
- **Files:** `lib/index.js`
- **Oracle:** 6 hidden tests: core leak, boolean with default/alias/string. Buggy `mri(['-t'],{default:{t:true}})` gives `{"_":[1]}`.
- **Provenance:** `benchmark/cases/hist-004/provenance.md`.

### hist-005 — mri: alias defaults type not cascaded (lukeed/mri @ 5437ea5)
- **Repository:** `mri`, 1.1.4, commit `5437ea5cd9afcfcfe50c1c316aff990cac21231b` (Issue #10)
- **Buggy:** `40051e689d80f77136ac990dafa2f27cdca48086` (parent 3a9e1c6)
- **Fixed:** `5437ea5` — pushes both `k` and each alias entry into `opts[string/boolean]` when cascading default types.
- **Bug:** `lib/index.js:46` only `k` added, aliases ignored → `"01"` coerced to number `1` instead of string `"01"`.
- **Why:** Parsing / alias-handling.
- **Files:** `lib/index.js`
- **Oracle:** 6 hidden tests: core `"-a 01"` with alias `a:['arg']` default string, 5 variants.
- **Repro:** `mri(['-a','01'],{alias:{a:['arg']},default:{arg:''}})` buggy `1` vs fixed `"01"`.

### hist-006 — tinyspy: inherited methods (tinylibs/tinyspy @ 0684083)
- **Repository:** `tinyspy`, 4.0.2, commit `0684083fc217e18d21ea404b3461bde52b60fdb3` (PR #50)
- **Buggy:** `f42d54522dc94b2102558172ab7c0766f1d65110`
- **Fixed:** `0684083` — `getDescriptor` walks full prototype chain `while(currentProto!==null)` instead of own + direct proto.
- **Bug:** `src/spyOn.ts:22` fails for deep inherit `Foo extends Bar` getter mock `spyOn(foo,{getter:'bar'})`.
- **Why:** State-management / prototype.
- **Files:** `src/spyOn.ts`
- **Oracle:** 3 hidden tests: inherited getter, deeply inherited, overridden getter throws. Buggy `TypeError: readonly`.

---

## Synthetic Cases (Controlled Mutations) — Core

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

## Frontier-Hard Cases (Deliberately Difficult — Genuine Historical)

All 5 Frontier-Hard cases are genuine external historical bugs selected for **high reasoning, not large repo size**. Each has a narrow public repro and a broader hidden oracle that distinguishes a correct fix from a plausible incorrect one (partial-fix trap). All are MIT/BSD-3, deterministic, 3× validated.

### hard-001 — immer: draft relocated base refs after reverse/sort (immerjs/immer @ a73672a)
- **Repository:** `immer` (https://github.com/immerjs/immer), MIT, 10.0.3-beta, commit `a73672ab76b5d9fd94f278a23c6c1931a03147e5` (PR #1255)
- **Buggy Commit:** `cfec5e51660aabd5f9026d3de1a0793630ef20c0` (parent)
- **Fixed Commit:** `a73672a` — adds `baseRefs_?: Set<any>` to `ProxyArrayState`, `markAllIndicesReassigned` captures `new Set(base_)`, `get` trap checks `isRelocatedBaseRef` (checks `allIndicesReassigned_`, `assigned_`, draftable, `baseRefs_.has(value)`).
- **Bug:** `src/core/proxy.ts:146` `if (value === peek(base, prop))` misses relocated base objects after `reverse()`/`sort()` on `copy_` (which holds raw base refs). `get` trap returns raw base, writing mutates original `baseState`.
- **Why Hard:** Cross-file (`proxy.ts` + `arrayMethods.ts`), hidden invariant (base never mutated), state/lifecycle (draft `copy_` vs `base_`), regression-sensitive (structural sharing, patches). Public only tests `reverse` mutate, hidden tests `sort`, patches, multiple cycles, `push` after reverse, and `assigned` vs relocated distinction. Naive "always draft" passes public but fails `assigned` and sharing.
- **Files:** `src/core/proxy.ts`, `src/plugins/arrayMethods.ts`
- **Oracle:** 7 hidden tests: reverse mutate, sort mutate with patches, pure reverse, multiple cycles, sort no-mutate, push after reverse, assigned index. Buggy mutates base and breaks patches.
- **Provenance:** `benchmark/frontier-hard/cases/hard-001/provenance.md`, `benchmark/frontier-hard/repositories/immer` at `a73672a` (fixed), `vitest` regression `tests/basic.test.ts` (2 tests).

### hard-002 — qs: combine overflow flatten (ljharb/qs @ d56f48c)
- **Repository:** `qs` (https://github.com/ljharb/qs), BSD-3-Clause, 6.15.3, commit `d56f48ca137b1bf6385da749b1044246ae142f19` (PR #558)
- **Buggy:** `e83d321ffafb38cf210683ac31714fce6ce1c6c6`
- **Fixed:** `d56f48c` — `lib/utils.js` `combine` overflow branch: `var newIndex=getMaxIndex(a)+1; a[newIndex]=b;` → `var bValues=isArray(b)?b:[b]; var newIndex=getMaxIndex(a); for(...){newIndex+=1; a[newIndex]=bValues[i];} setMaxIndex(a,newIndex);` one-level spread matching `[].concat(a,b)`.
- **Bug:** When `a` is already overflow object (arrayLimit exceeded) and `b` is a comma group `["7","8"]`, the overflow branch nested it as single `6:["7","8"]` instead of spreading to `6:"7",7:"8"`.
- **Why Hard:** Hidden invariant (`arrayLimit` is representation threshold, not count), parsing state, partial-fix trap: public only tests flat `a=1,2,3,4,5,6&a=7,8`, but hidden tests `a[]=1&a[]=2&a[]=3&a[]=4,5` where `b` is `[["4","5"]]` should stay single `3:["4","5"]` (not double-spread), plus `plainObjects`, `throwOnLimitExceeded`, multiple appends. Naive that always does `a[newIndex]=b` fails public; naive that always spreads without distinguishing `[]=` vs flat would fail the `[]=` test. Correct is one-level spread.
- **Files:** `lib/utils.js`
- **Oracle:** 8 hidden tests: flat spread, `[]=` single, multiple groups, default limit, plainObjects, throw, non-overflow, single scalar. Buggy nests `6:["7","8"]`.
- **Provenance:** `benchmark/frontier-hard/cases/hard-002/provenance.md`, `benchmark/frontier-hard/repositories/qs` at `d56f48c` (fixed), `tests/basic.test.ts` (3 tests).

### hard-003 — superjson: path escape mapping (blitz-js/superjson @ 4054f3f)
- **Repository:** `superjson` (https://github.com/blitz-js/superjson), MIT, 2.2.5, commit `4054f3f5015522c582a2c09c2c9e2f25c301d570` (Issue #310, PR #311)
- **Buggy:** `6dc63da357383e200c91e0833e27ce288e5cd7a7`
- **Fixed:** `4054f3f` — `src/pathstringifier.ts` `escapeKey` now `key.replace(/\\/g,'\\\\').replace(/\./g,'\\.')` (was only `\.`), `parsePath` takes `legacyPaths` boolean, handles `\\` → `\`, `\.` → `.`, throws on invalid `\<char>`, `src/plainer.ts` threads `version` and `escapeKey(index)`, `src/index.ts` sets `meta.v=1` and passes `meta.v??0`.
- **Bug:** `escapeKey` only escaped `.` so key `b\` stayed `b\` not `b\\`, causing path `b\.0` vs `b\\.0` confusion; `parsePath` didn't handle `\\` and didn't reject malformed; `walker` used `index` without escaping, so `a.0` vs `a[0]` could collide.
- **Why Hard:** 4-file coordinated fix, cross-file (`pathstringifier` + `plainer` + `index` + `types`), hidden invariant (path escaping must be inverse), versioning (`meta.v`), and `walker` numeric escaping. Public only tests 3-key `a`/`a.0`/`b\` with Set/RegExp, hidden tests full 4-key PR repro with `v:1` and `a\.0`/`b\\.0`, backslash Set, dot Date, invalid path throw, and referential equality with escaped keys. Naive that only fixes `escapeKey` but not `parsePath`/`v`/`walker` passes public but fails hidden `v` or `invalid path`.
- **Files:** `src/pathstringifier.ts`, `src/plainer.ts`, `src/index.ts`, `src/types.ts`
- **Oracle:** 6 hidden tests: PR 4-key repro with `v:1`, backslash Set, dot Date, malformed path throw, version, referential equality. Buggy loses `a.0` RegExp or `b\` Set.
- **Provenance:** `benchmark/frontier-hard/cases/hard-003/provenance.md`, `benchmark/frontier-hard/repositories/superjson` at `4054f3f` (fixed, `import type` harness fix), `tests/basic.test.ts` (2 tests).

### hard-004 — p-queue: signal abort while queued (sindresorhus/p-queue @ a64b316)
- **Repository:** `p-queue` (https://github.com/sindresorhus/p-queue), MIT, 9.1.0, commit `a64b31663680f975571b6d7003b4dec86012c536` (Issue #241)
- **Buggy:** `3bd13ea130b105d8521e0ba4115a68671967200d`
- **Fixed:** `a64b316` — `source/index.ts` adds `queueAbortHandler` for queued tasks: checks `signal.aborted` at queue time, registers `signal.addEventListener('abort', handler, {once:true})`, removes task from `queue`/`priority-queue` on abort and rejects with `signal.reason`, cleans up listeners; `source/priority-queue.ts` and `source/queue.ts` support removal.
- **Bug:** `signal` abort while task is queued (concurrency full) was ignored; task stayed in queue and eventually ran, instead of rejecting with `AbortError` and `queue.size` 0.
- **Why Hard:** Async/concurrency, state/lifecycle (queued vs running), cross-file (3 files), partial-fix trap: public only tests queued abort, hidden tests already-aborted, custom reason, priority queue removal, and not affecting running tasks. Naive that only checks `signal.aborted` at `add` time fixes already-aborted but not abort-while-queued; naive that adds listener but doesn't remove from queue passes `await promise` (if you `await` with timeout) but fails `queue.size` and `notRan`.
- **Files:** `source/index.ts`, `source/priority-queue.ts`, `source/queue.ts`
- **Oracle:** 6 hidden tests: queued abort, already aborted, not affecting running, custom reason, priority removal, running vs queued. Buggy hangs or `ran` true, `size` 1.
- **Provenance:** `benchmark/frontier-hard/cases/hard-004/provenance.md`, `benchmark/frontier-hard/repositories/p-queue` at `a64b316` (fixed, `tsconfig` adjusted, `node_modules/eventemitter3`+`p-timeout` copied), `tests/basic.test.ts` (2 tests).

### hard-005 — path-to-regexp: astral ID_Continue quoting (pillarjs/path-to-regexp @ 8877f41)
- **Repository:** `path-to-regexp` (https://github.com/pillarjs/path-to-regexp), MIT, 8.4.2, commit `8877f41873e37a30258d3935feaf1d2679321735` (PR #451)
- **Buggy:** `bd12a33e7e18c994e9cf0f7e6175fcd0ba41db22`
- **Fixed:** `8877f41` — `src/index.ts` `stringifyName`: `if (next?.type==="text" && ID_CONTINUE.test(next.value[0]))` → `if (next?.type==="text") { const [first=""] = next.value; if (ID_CONTINUE.test(first)) return quoteName(name); }` code-point aware.
- **Bug:** `next.value[0]` reads first **code unit**, not **code point**; for astral `U+1D6FC` (`\u{1D6FC}` is 2 code units, lone high surrogate `\uD835` fails `ID_Continue`), so `stringify` fails to quote `/:test` when followed by `U+1D6FC`, breaking `parse(stringify(parse(path)))` round-trip. `parse` correctly iterates via `[...str]` (code points).
- **Why Hard:** Semantic/Unicode, hidden invariant (code units vs code points, `u` flag, `ID_Continue`), requires matching `parse`'s `[...str]` semantics. Public only tests `param` + astral `ID_Continue` (should quote), hidden tests `wildcard` astral, non-`ID_Continue` astral (`U+1F600` should not quote), BMP `ID_Continue`, empty/next not text, and round-trip. Naive `charAt(0)` still code unit, fails astral; naive always-quote passes astral but fails non-`ID_Continue` astral.
- **Files:** `src/index.ts`
- **Oracle:** 7 hidden tests: param astral, wildcard astral, non-ID astral, BMP, empty, round-trip, parse. Buggy produces `/:test\u{1D6FC}` unquoted vs `'/:"test"\u{1D6FC}'` quoted.
- **Provenance:** `benchmark/frontier-hard/cases/hard-005/provenance.md`, `benchmark/frontier-hard/repositories/path-to-regexp` at `8877f41` (fixed, `tsconfig` adjusted), `tests/basic.test.ts` (2 tests).

---

## Diversity Coverage

| Category | Cases |
| -------- | ----- |
| validation | hist-001, hist-002, synth-002, synth-004, hard-001 |
| parsing | hist-001, hist-004, hist-005, hard-002, hard-005 |
| security | hist-002, hard-003 |
| state-management | hist-003, hist-006, synth-001, synth-004, hard-001, hard-002, hard-003, hard-004 |
| api-behavior | hist-003, hist-006, synth-006, hard-001, hard-005 |
| data-transformation | synth-005, hard-003, hard-005 |
| type-coercion | hist-004 |
| alias-handling | hist-005 |
| business-logic | synth-001, synth-002 |
| error-handling | synth-003, synth-006, hard-004 |
| asynchronous | synth-003, hard-004 |
| boundary | synth-005, hard-002 |
| lifecycle | hard-001, hard-004 |
| serialization | hard-003 |
| concurrency | hard-004 |

No duplicate bug pattern dominates. Frontier-Hard adds 5 distinct hard patterns: lifecycle (immer), boundary (qs), serialization (superjson), concurrency (p-queue), unicode (path-to-regexp).

---

## Validation

- Each case passes: buggy reproduces (3/3 fails), good passes (3/3), oracle passes 3× on good, fails 3× on buggy, regression passes, final stability 1× — all in isolated temp workspaces (no live repo mutation), path-contained, exec guarded, `bun` → `vitest`/`tsx` fallback on `SyntaxError`.
- Run: `bun run benchmark:validate` v0.5 (reports `ee9104f5...` FROZEN, 17/17) or `bun run benchmark:check-types` + `bun run check-types`
- Report: `benchmark/validation-report.json` (machine-readable `benchmarkVersion 0.5`, `fingerprint`, `stability`) — v0.5 FROZEN, v0.4 preserved as `validation-report.v0.4.json`
- Core 12/12 + Frontier-Hard 5/5 = 17/17 VALID, 3× stable, deterministic, no network, no secrets.
