# Curator Notes — hard-003

## Why This Is Hard

This bug spans **4 files** and requires understanding **path escaping, versioning, and referential integrity**:

- `src/pathstringifier.ts` `escapeKey` must escape both `\` and `.` in the correct order (`\` first, then `.`). Doing `.` first would double-escape the `\` introduced for `.`.
- `parsePath` must handle `\\` → `\`, `\.` → `.`, and reject malformed `\<char>` where `<char>` is not `.` or `\` when `legacyPaths` is false. The old code only handled `\.` and silently ignored lone `\`.
- `src/plainer.ts` `traverse` and `walker` must thread `version` and `legacyPaths` through all recursive calls; `walker` must use `escapeKey(index)` for numeric indices, otherwise `a.0` vs `a[0]` collide.
- `src/index.ts` must set `meta.v = 1` and pass `meta.v ?? 0` on deserialize; forgetting `v` breaks legacy compatibility.
- The hidden invariant is **round-trip idempotence**: `SuperJSON.parse(SuperJSON.stringify(obj))` must deeply equal `obj` even when keys contain `.` and `\` and values are annotated (Set, Date, RegExp). The buggy version breaks this for `b\` and `a.0` keys.

A fix that only changes `escapeKey` but not `parsePath` or versioning will pass a simple `b\` test but fail the malformed path throw or legacy version tests. A fix that escapes but in wrong order will still fail.

## Expected Agent Failure Mode

- **Naive fix 1:** Only change `escapeKey` to `replace(/\./g, '\\.').replace(/\\/g, '\\\\')` (wrong order) — then `a.b` with `\` and `.` would be double-escaped incorrectly, failing the `a.0` regex test.
- **Naive fix 2:** Change `escapeKey` correctly but not update `parsePath` to handle `\\` and throw on invalid — passes the simple `b\` Set test (since `b\\` would be correctly escaped and parsed as `b\` even without `\\` handling? Actually without `\\` handling, `parsePath("b\\\\")` would see `\` + `\` as `\\` → `\`, but old code only handled `\.`, so `b\\\\` would be parsed as `b\` + `\` + `\`? Not correctly, so it would fail the `b\\` test.
- **Naive fix 3:** Fix `escapeKey` and `parsePath` but forget `version`/`meta.v` — then new serializations are correct, but `parsePath` with `legacyPaths=true` vs `false` distinction is lost; the `version` test and `referential equality with escaped keys` would fail because old payloads without `v` would be parsed with new strict mode and throw.
- **Naive fix 4:** Fix `escapeKey` and `parsePath` and `v` but forget `walker`'s `escapeKey(index)` — then `a: ["/'a'[0]: ..."]` vs `'a.0'` would still collide, failing the main repro where `a[0]` string vs `a.0` regex are confused.

## Naive Fix

```ts
// Only fix escapeKey, forget parsePath and version
export const escapeKey = (key: string) => key.replace(/\./g, '\\.').replace(/\\/g, '\\\\'); // wrong order, and no parsePath change
```

## Why Naive Fix Fails

- Wrong order produces `a\` → `a\\` (correct) but `a.b` → `a\.b` then `\` not escaped correctly? Actually `a\b` with `.` and `\` would be wrong.
- Without `parsePath` handling `\\`, the deserializer will not correctly unescape `b\\` → `b\`, so `parsed["b\\"]` will be undefined or wrong key.
- Without `v`, the `invalid path` throw test would fail because `parsePath("a\\b", false)` should throw but buggy would not, or legacy payloads would throw incorrectly.

## Hidden Invariant

- `escapeKey` → `stringifyPath` → `parsePath` must be **inverse** for all keys, including those with `.` and `\`.
- `meta.v` must be `1` for new payloads, and `parsePath` must be lenient for `v<1`.
- `walker` must escape numeric indices.

## Cross-File Reasoning

- `pathstringifier.ts` (escape/parse)
- `plainer.ts` (traverse with version, walker with escapeKey)
- `index.ts` (set and pass `v`)
- `types.ts` (add `v` field)

The agent must trace a value's path: `walker` → `escapeKey` → `stringifyPath` → `meta.values` → `parsePath` → `setDeep`/`getDeep`.

## Regression Surface

- Basic `stringify`/`parse` for Date, Set, RegExp (regression `tests/basic.test.ts`).
- Existing `src/index.test.ts` has many cases expecting `v:1`; our oracle checks that.

## Why This Is Suitable For Frontier Verifier

- **Public repro narrow:** tests 3 keys (`a`, `a.0`, `b\`) with simple types.
- **Hidden oracle broad:** tests full 4-key PR repro with `v:1` and `a\.0`/`b\\.0` annotations, backslash Set, dot Date, invalid path throw, referential equality with escaped keys — distinguishes correct 4-file fix from partial.
- **High cross-file reasoning:** 4 files, order-sensitive escaping, versioning.
- **Deterministic:** pure serialization, no timers.

## Verification Plan

- Public: 3-key repro → PASS on fixed, FAIL on buggy (since `a.0` regex lost or `b\` Set lost).
- Oracle: 6 tests — main repro, backslash Set, dot Date, invalid path, version, referential equality.
- Buggy: public fails (since `a.0` or `b\` wrong), oracle fails (≥3).
- Fixed: all pass 3×.

## Difficulty Rating

**Frontier-Hard** — requires 4-file coordinated fix, understanding escaping order and versioning, and the `walker` numeric index escaping — not just a single `replace` change.
