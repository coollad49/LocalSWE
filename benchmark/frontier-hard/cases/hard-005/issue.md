# path-to-regexp stringify fails to quote param names followed by astral ID_Continue

**Repository:** `path-to-regexp` (`pillarjs/path-to-regexp`)
**Component:** `src/index.ts` — `stringifyName` function
**Related Issue:** https://github.com/pillarjs/path-to-regexp/issues/451
**Commit:** fixed `8877f41`, buggy parent `bd12a33`

## Problem

When stringifying a parsed path, `stringify` must quote a parameter name if the next text segment starts with an `ID_Continue` character (so that `parse(stringify(parse(path)))` round-trips). The parser iterates the path string via `[...str]` (code points), correctly handling astral characters (those outside the BMP, represented as surrogate pairs in JavaScript).

The buggy `stringifyName` checked `ID_CONTINUE.test(next.value[0])`, which reads the first **code unit** (`[0]`), not the first **code point**. For an astral character like `U+1D6FC` (`\u{1D6FC}`, `𝛼`), `"\u{1D6FC}"[0]` is the lone high surrogate `"\uD835"`, which does **not** match `ID_Continue`, so the param name is left unquoted. The parser, however, iterates via `[...str]` and sees the full code point `\u{1D6FC}` as `ID_Continue`, so it incorrectly absorbs it into the param name.

Example:

```ts
import { TokenData, stringify } from "./src/index.ts";

const data = new TokenData([
  { type: "text", value: "/" },
  { type: "param", name: "test" },
  { type: "text", value: "\u{1D6FC}" }, // U+1D6FC is ID_Continue, astral (2 code units)
]);

console.log(stringify(data));
// Expected (fixed): '/:"test"\u{1D6FC}'  // quoted, since next starts with ID_Continue
// Actual (buggy):   '/:test\u{1D6FC}'   // not quoted, breaks round-trip
```

Similarly, a non-`ID_Continue` astral like `U+1F600` (`😀`) should **not** be quoted:

```ts
const data2 = new TokenData([
  { type: "text", value: "/" },
  { type: "param", name: "test" },
  { type: "text", value: "\u{1F600}" }, // not ID_Continue
]);
console.log(stringify(data2));
// Expected: '/:test\u{1F600}' (no quote) — both fixed and buggy happen to produce this, but for wrong reason in buggy
```

The fixed code uses destructuring to read the first code point:

```ts
const [first = ""] = next.value;
if (ID_CONTINUE.test(first)) return quoteName(name);
```

This matches `parse`, which does `const chars = [...str]`.

## Expected Behavior

- `stringify` must quote `test` when `next.value` starts with an astral `ID_Continue` character.
- `stringify` must **not** quote when `next.value` starts with a non-`ID_Continue` astral.
- `stringify(parse(path))` round-trip must be lossless for all valid paths, including those with astral characters.

## Actual Behavior

- Buggy `stringifyName` uses `next.value[0]` (code unit), so for `"\u{1D6FC}"` it tests `"\uD835"` (high surrogate) which is not `ID_Continue`, so it fails to quote.
- This breaks `parse` → `stringify` round-trip for paths containing `/:test` followed by an astral `ID_Continue`.

## Reproduction

```ts
import { TokenData, stringify } from "../../../repositories/path-to-regexp/src/index.js";

const data = new TokenData([
  { type: "text", value: "/" },
  { type: "param", name: "test" },
  { type: "text", value: "\u{1D6FC}" },
]);

console.log(JSON.stringify(stringify(data)));
// Buggy: "/:test\u{1D6FC}" (unquoted)
// Fixed: "/:\"test\"\u{1D6FC}" (quoted)
```

## Environment

- Node 22 / Bun 1.4.0
- `path-to-regexp` 8.4.2
- `vitest` for testing

## Notes

- Fix is in `src/index.ts` `stringifyName` (lines ~676-685).
- The regex `ID_CONTINUE` is `/^[$\u200c\u200d\p{ID_Continue}]$/u` — note the `u` flag for Unicode.
- Check `src/index.ts` `parse` function to see how it handles astral via `[...str]`.
- Regression suite is `bun test tests/` in the repository.
