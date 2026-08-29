# Provenance — hard-001

**Repository:** `immer` (https://github.com/immerjs/immer)
**Repository URL:** https://github.com/immerjs/immer
**Issue URL:** https://github.com/immerjs/immer/issues/1255
**Pull Request URL:** https://github.com/immerjs/immer/pull/1255
**License:** MIT
**License URL:** https://github.com/immerjs/immer/blob/main/LICENSE

**Base Commit (fixed):** `a73672ab76b5d9fd94f278a23c6c1931a03147e5`
**Buggy Commit (parent):** `cfec5e51660aabd5f9026d3de1a0793630ef20c0`
**Fixed Commit:** `a73672ab76b5d9fd94f278a23c6c1931a03147e5`

**Original Issue Title:** draft relocated base refs after reverse/sort in array-methods plugin
**Original Issue Date:** 2026-07-16
**Author:** spokodev

**Description of Fix:**
- `src/core/proxy.ts`: Added `baseRefs_?: Set<any>` to `ProxyArrayState`, modified `get` trap to check `isRelocatedBaseRef(state, prop, value)` alongside `value === peek(state.base_, prop)`, and added `isRelocatedBaseRef` helper that checks `allIndicesReassigned_`, `assigned_`, draftable, and `baseRefs_.has(value)`.
- `src/plugins/arrayMethods.ts`: Modified `markAllIndicesReassigned` to also capture `state.baseRefs_ = new Set(state.base_)`.

**Buggy State Reproduction:**
```
git checkout cfec5e5
# reproduce: produce([{id:1},{id:2},{id:3}], s=>{ s.reverse(); s[0].id=99 }) mutates base
```

**Fixed State Verification:**
```
git checkout a73672a
# same reproduce: base unchanged, nextState correct, patches correct
```

**Test Evidence:**
- Original test added in `__tests__/base.js` at `a73672a`: two new tests (`mutating an element after reverse() does not mutate the base`, `mutating an element after sort() does not mutate the base`).
- Our oracle extends to 7 tests covering reverse, sort, structural sharing, patches, multiple cycles, push after reverse, assigned index handling.

**Retrieval Date:** 2026-08-29
**Retrieval Method:** `git archive` from pinned commits, verified `buggy→fail / fixed→pass` via isolated reproduction 3× and oracle 3×.

**Modifications for Benchmark:**
- Repository snapshot at fixed commit `a73672a` placed under `benchmark/frontier-hard/repositories/immer` (MIT).
- Buggy files isolated under `artifacts/buggy/src/core/proxy.ts` and `src/plugins/arrayMethods.ts`.
- `vitest.config.ts` updated to include `tests/**/*.test.ts` for regression; `tests/basic.test.ts` added as regression (2 tests).

**License Verification:** MIT — permissive, documented in `LICENSE` file, compatible with benchmark inclusion.
