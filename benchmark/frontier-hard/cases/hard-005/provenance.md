# Provenance — hard-005

**Repository:** `path-to-regexp` (https://github.com/pillarjs/path-to-regexp)
**Repository URL:** https://github.com/pillarjs/path-to-regexp
**Issue URL:** https://github.com/pillarjs/path-to-regexp/issues/451
**Pull Request URL:** https://github.com/pillarjs/path-to-regexp/pull/451
**License:** MIT
**License URL:** https://github.com/pillarjs/path-to-regexp/blob/master/LICENSE

**Base Commit (fixed):** `8877f41873e37a30258d3935feaf1d2679321735`
**Buggy Commit (parent):** `bd12a33e7e18c994e9cf0f7e6175fcd0ba41db22`
**Fixed Commit:** `8877f41873e37a30258d3935feaf1d2679321735`

**Original Issue Title:** Quote param names followed by astral ID_Continue text
**Original Issue Date:** 2026-08-28
**Author:** Dylan Pulver

**Description of Fix:**
- `src/index.ts` `stringifyName`: Changed `if (next?.type === "text" && ID_CONTINUE.test(next.value[0]))` to:
  ```ts
  if (next?.type === "text") {
    const [first = ""] = next.value;
    if (ID_CONTINUE.test(first)) return quoteName(name);
  }
  ```
  This reads the first **code point** via destructuring `[...str]` semantics, matching `parse` which iterates via `const chars = [...str]`, instead of reading the first **code unit** via `[0]` which would be a lone surrogate for astral characters and fail the `ID_Continue` test.

**Buggy State Reproduction:**
```
git checkout bd12a33
# stringify(new TokenData([{type:"text",value:"/"},{type:"param",name:"test"},{type:"text",value:"\u{1D6FC}"}]))
# => "/:test\u{1D6FC}" (unquoted, buggy)
```

**Fixed State Verification:**
```
git checkout 8877f41
# same => '/:"test"\u{1D6FC}' (quoted)
```

**Test Evidence:**
- Original PR added `src/cases.spec.ts` 3 new `STRINGIFY_TESTS`: astral `ID_Continue` quoted for `param` and `wildcard`, and non-`ID_Continue` astral not quoted.
- Our oracle has 7 tests covering astral `ID_Continue` (param, wildcard), non-`ID_Continue` astral, BMP `ID_Continue`, empty/next not text, and round-trip parse/stringify.

**Retrieval Date:** 2026-08-29
**Retrieval Method:** `git archive` from pinned commits, verified `buggy→fail / fixed→pass` 3×.

**Modifications for Benchmark:**
- Repository snapshot at fixed commit `8877f41` under `benchmark/frontier-hard/repositories/path-to-regexp` (MIT), with `tsconfig.json` adjusted for vitest and `tests/basic.test.ts` added for regression.
- Buggy file isolated under `artifacts/buggy/src/index.ts`.
- No additional dependencies.

**License Verification:** MIT — permissive, documented in `LICENSE`, compatible.
