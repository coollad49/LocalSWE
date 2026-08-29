# Provenance — hard-003

**Repository:** `superjson` (https://github.com/blitz-js/superjson)
**Repository URL:** https://github.com/blitz-js/superjson
**Issue URL:** https://github.com/blitz-js/superjson/issues/310
**Pull Request URL:** https://github.com/blitz-js/superjson/pull/311
**License:** MIT
**License URL:** https://github.com/blitz-js/superjson/blob/main/LICENSE

**Base Commit (fixed):** `4054f3f5015522c582a2c09c2c9e2f25c301d570`
**Buggy Commit (parent):** `6dc63da357383e200c91e0833e27ce288e5cd7a7`
**Fixed Commit:** `4054f3f5015522c582a2c09c2c9e2f25c301d570`

**Original Issue Title:** input escape mapping
**Original Issue Date:** 2025-08-06
**Author:** Simon Knott

**Description of Fix:**
- `src/pathstringifier.ts`: `escapeKey` changed from `key.replace(/\./g, '\\.')` to `key.replace(/\\/g, '\\\\').replace(/\./g, '\\.')`; `parsePath` now takes `legacyPaths` boolean, correctly handles `\\` → `\`, `\.` → `.`, and throws `Error('invalid path')` when `\` not followed by `.` or `\` when not legacy; `stringifyPath` unchanged but uses new `escapeKey`.
- `src/plainer.ts`: Added `enableLegacyPaths(version)` helper, `traverse` now takes `version` and passes `legacyPaths` to `parsePath`, `applyValueAnnotations` and `applyReferentialEqualityAnnotations` take `version`, `walker` now uses `escapeKey(index)` for numeric indices.
- `src/index.ts`: `serialize` now sets `res.meta.v = 1` and `deserialize` passes `meta.v ?? 0` to apply functions.
- `src/types.ts`: Added `v?: number` to `SuperJSONResult.meta`.
- Tests in `src/index.test.ts` updated to expect `v:1` and added `repro #310` cases.

**Buggy State Reproduction:**
```
git checkout 6dc63da
# SuperJSON.stringify({ "b\\": new Set([1]) }) => meta {"b\\": ["set"]} (single) not {"b\\\\": ["set"]}
# SuperJSON.parse then loses Set
```

**Fixed State Verification:**
```
git checkout 4054f3f
# Same => meta {"b\\\\": ["set"]} and roundtrip preserves Set
```

**Test Evidence:**
- Original PR added `src/index.test.ts` `repro #310` with 4-key object and updated `outputAnnotations` to `a\\.0` and `b\\\\.0`, plus `pathstringifier.test.ts` for invalid path.
- Our oracle has 6 tests covering the repro, backslash Set, dot Date, malformed path throw, version, and referential equality with escaped keys.

**Retrieval Date:** 2026-08-29
**Retrieval Method:** `git archive` from pinned commits, verified `buggy→fail / fixed→pass` 3×.

**Modifications for Benchmark:**
- Repository snapshot at fixed commit `4054f3f` under `benchmark/frontier-hard/repositories/superjson` (MIT), with `import type` fix for `Class`/`SuperJSONResult` to be `bun`/`tsx` compatible (non-logic, harness only).
- Buggy files isolated under `artifacts/buggy/src/{plainer,pathstringifier,index,types}.ts` (with same `import type` fix for `index.ts` to allow `tsx` execution).
- `tests/basic.test.ts` added for regression; `copy-anything` dependency available via host `node_modules` and `NODE_PATH` in validator/evaluator.

**License Verification:** MIT — permissive, documented in `LICENSE`, compatible.
