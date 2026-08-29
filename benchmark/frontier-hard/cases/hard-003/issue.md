# SuperJSON path escape mapping mishandles backslashes and versioning

**Repository:** `superjson` (`blitz-js/superjson`)
**Component:** `src/pathstringifier.ts` — `escapeKey`/`parsePath`, `src/plainer.ts` — `traverse` and `apply*Annotations`, `src/index.ts` — version handling
**Related Issue:** https://github.com/blitz-js/superjson/issues/310
**Related PR:** https://github.com/blitz-js/superjson/pull/311
**Commit:** fixed `4054f3f`, buggy parent `6dc63da`

## Problem

SuperJSON serializes non-JSON types (e.g., `Set`, `Date`, `RegExp`) by storing them as JSON and keeping a `meta` object that records the path to each annotated value. Paths are strings like `"a\\.0"` where `\.` escapes a dot in a key and `\\` escapes a backslash.

The original `escapeKey` only escaped dots:

```ts
export const escapeKey = (key: string) => key.replace(/\./g, '\\.');
```

So a key containing a backslash, like `"b\\"`, was not correctly escaped. For `"b\\"`, the fixed `escapeKey` produces `"b\\\\"` (each `\` → `\\`, then `.` → `\.`), but the buggy version left it as `"b\\"`.

Similarly, `parsePath` only handled `\.` but not `\\`, and didn't reject malformed paths like `"a\\b"` where `\` is not followed by `.` or `\`.

Additionally, the fix introduces versioning (`meta.v = 1`) so that old payloads with the buggy escaping can still be deserialized via `legacyPaths` mode. `traverse`, `applyValueAnnotations`, and `applyReferentialEqualityAnnotations` were updated to take a `version` parameter and call `parsePath(key, legacyPaths)`.

Example failure:

```ts
import SuperJSON from "./src/index.ts";

const input = {
  a: ["/'a'[0]: string that becomes a regex/"],
  'a.0': /'a.0': regex that becomes a string/,
  'b.0': "/'b.0': string that becomes a regex/",
  'b\\': [/'b\\'[0]: regex that becomes a string/],
};

const str = SuperJSON.stringify(input);
const parsed = SuperJSON.parse(str);

console.log(parsed['a.0'] instanceof RegExp); // Expected true, buggy: false (string)
console.log(parsed['b\\'][0] instanceof RegExp); // Expected true, buggy: false
console.log(JSON.parse(str).meta.values['a\\.0']); // Expected ['regexp'], buggy: missing or wrong
```

More minimal:

```ts
const input = { "b\\": new Set([1]) };
const str = SuperJSON.stringify(input); // meta should be {"b\\\\": ["set"]}
const parsed = SuperJSON.parse(str);
console.log(parsed["b\\"] instanceof Set); // Expected true, buggy: false or wrong key
```

And `parsePath("a\\b", false)` should throw `Error("invalid path")`, but buggy silently accepted it.

## Expected Behavior

- `escapeKey` must escape **both** backslashes and dots: `key.replace(/\\/g, '\\\\').replace(/\./g, '\\.')`.
- `stringifyPath` must use the new `escapeKey`.
- `parsePath(string, legacyPaths)` must handle `\\` → `\`, `\.` → `.`, and throw on `\` not followed by `.` or `\` when `legacyPaths` is false. When `legacyPaths` is true (version < 1), it should keep old lenient behavior.
- `SuperJSON.serialize` must set `meta.v = 1`.
- `SuperJSON.deserialize` must pass `meta.v ?? 0` to `applyValueAnnotations` and `applyReferentialEqualityAnnotations`, which in turn pass `enableLegacyPaths(version)` to `parsePath`.
- `walker` must escape numeric indices via `escapeKey(index)` when building `innerAnnotations`.

## Actual Behavior

- `escapeKey` only escaped dots, so keys with backslashes produced ambiguous paths.
- `parsePath` didn't handle `\\` and didn't validate malformed escapes.
- No versioning, so old payloads and new payloads used same parsing, breaking round-trip for keys with backslashes/dots.
- `walker` used `innerAnnotations[index]` (numeric) without escaping, so paths like `"a.0"` vs `a[0]` could collide.

## Reproduction

```ts
import SuperJSON from "../../../repositories/superjson/src/index.ts";

const input = {
  a: ["/'a'[0]: string that becomes a regex/"],
  'a.0': /test-regex/,
  'b\\': [new Set([1])],
};

const str = SuperJSON.stringify(input);
const parsed: any = SuperJSON.parse(str);

console.log(parsed['a.0'] instanceof RegExp); // should be true
console.log(Array.isArray(parsed.a) && parsed.a[0] === "/'a'[0]: string that becomes a regex/"); // should be true
console.log(parsed['b\\'][0] instanceof Set); // should be true
```

## Environment

- Node 22 / Bun 1.4.0
- `superjson` 2.2.5
- `vitest` for testing

## Notes

- Fix is in `src/pathstringifier.ts` (escapeKey, parsePath), `src/plainer.ts` (traverse, walker, version), `src/index.ts` (set v), `src/types.ts` (v field).
- Do not hardcode paths; understand the escaping and versioning.
- Regression suite is `bun test tests/` in the repository.
