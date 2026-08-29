# Frontier Verifier Benchmark — Case Matrix

**Version:** 0.3 (6 genuine historical + 6 synthetic, fingerprint `sha256:ef363fc1663524bb075e83635861df370aa573392d7470918376c48d5195b0aa`)
**Cases:** 12 (6 historical genuine + 6 synthetic)
**Repositories:** 7 (3 benchmark-owned: task-manager, money-utils, async-queue + 4 external historical: cac, defu, tinyspy, mri)
**Date:** 2026-08-29
**Validator:** `bun run benchmark:validate` v0.3 isolated (bun-first → vitest/tsx fallback, temp workspace, path containment, exec guard, 3× oracle) — 12/12 ✓ VALID (also `npm run benchmark:validate` via tsx)
**Fingerprint:** `sha256:ef363fc1663524bb075e83635861df370aa573392d7470918376c48d5195b0aa` (sha256 over manifests + buggy snapshots + oracles + schema + 7 repo hashes)
**Stability:** reproduction 3×, oracle 3× per state, regression 1×

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

---

## Historical Cases (Genuine — Externally Sourced)

All 6 historical cases are genuine external bugs with pinned buggyCommit → fixedCommit, reproduced buggy→fail / fixed→pass in isolated temp workspace, hidden behavioral oracle, MIT licensed.

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

## Synthetic Cases (Controlled Mutations)

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
| validation | hist-001, hist-002, synth-002, synth-004 |
| parsing | hist-001, hist-004, hist-005 |
| security | hist-002 |
| state-management | hist-003, hist-006, synth-001, synth-004 |
| api-behavior | hist-003, hist-006, synth-006 |
| data-transformation | synth-005 |
| type-coercion | hist-004 |
| alias-handling | hist-005 |
| business-logic | synth-001, synth-002 |
| error-handling | synth-003, synth-006 |
| asynchronous | synth-003 |
| boundary | synth-005 |

No duplicate bug pattern dominates.

---

## Validation

- Each case passes: buggy reproduces (3/3 fails), good passes (3/3), oracle passes 3× on good, fails 3× on buggy, regression passes, final stability 1× — all in isolated temp workspaces (no live repo mutation), path-contained, exec guarded.
- Run: `bun run benchmark:validate` (reports fingerprint) or `bun run benchmark:check-types` + `bun run check-types`
- Report: `benchmark/validation-report.json` (machine-readable `benchmarkVersion`, `fingerprint`, `stability`)
- Full 6 genuine historical cases now satisfy non-negotiable requirement; 2 mri + 2 tinyspy + 1 cac + 1 defu = 6 distinct genuine.
