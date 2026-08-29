# Curator Notes — hard-005

## Why This Is Hard

This bug requires **Unicode-aware reasoning** and understanding **code units vs code points**:

- JavaScript strings are UTF-16 code units; astral characters (outside BMP, like `U+1D6FC` `𝛼` or `U+1F600` `😀`) are stored as **surrogate pairs** (2 code units).
- `str[0]` reads the first **code unit** (e.g., `"\u{1D6FC}"[0]` is `"\uD835"`, lone high surrogate), while `[...str][0]` or `const [first] = str` reads the first **code point** (`"\u{1D6FC}"`).
- `ID_Continue` regex is `/^[$\u200c\u200d\p{ID_Continue}]$/u` with `u` flag, which correctly matches astral `ID_Continue` when given a full code point, but **not** when given a lone surrogate.
- `parse` correctly iterates via `const chars = [...str]` (code points), so it sees `"\u{1D6FC}"` as one `ID_Continue` and would absorb it into a param name if not quoted.
- `stringify` must quote the param name when `next.value` starts with `ID_Continue`, but the buggy `stringifyName` tests `next.value[0]` (code unit) and thus **misses** astral `ID_Continue`, failing to quote, breaking `parse(stringify(parse(path)))` round-trip.

A superficial fix that just changes `[0]` to `charAt(0)` would still be wrong (still code unit). The correct fix must use code-point-aware access.

## Expected Agent Failure Mode

- **Naive fix 1:** Change `next.value[0]` to `next.value.charAt(0)` — still code unit, same bug, passes BMP `ID_Continue` test but fails astral.
- **Naive fix 2:** Change to `next.value.slice(0,2)` or `next.value.substring(0,2)` — would handle astral but also incorrectly handle BMP, and would not match `parse`'s `[...str]` semantics for all cases.
- **Naive fix 3:** Always quote param names (remove the `ID_Continue` check) — passes the astral `ID_Continue` test (since it quotes) but fails the non-`ID_Continue` astral test (`U+1F600` should not be quoted).
- **Naive fix 4:** Fix only `param` but not `wildcard` — the PR's second test is for `wildcard` (`/*` + `test` + astral), so it would pass the public `param` repro but fail the hidden `wildcard` oracle.

## Naive Fix

```ts
// Still code unit, not code point
if (next?.type === "text" && ID_CONTINUE.test(next.value.charAt(0))) {
  return quoteName(name);
}
```

## Why Naive Fix Fails

- Public repro only tests `param` + astral `ID_Continue` (`/:test` + `\u{1D6FC}`), so a fix that always quotes would **pass** public (since it would quote `test` correctly), but the hidden `wildcard` test would still pass if the agent only fixes `param`? Actually wildcard also needs same fix, so if agent only fixes `param` case by hardcoding, wildcard would fail. But the main hidden that distinguishes is the `non-ID_Continue` astral test: a fix that always quotes would incorrectly quote `/:test\u{1F600}` as `/:"test"\u{1F600}`, failing that test.

## Hidden Invariant

- `ID.test(name)` and `ID_CONTINUE.test(firstCodePoint)` must be used with `u` flag and code-point `first`.
- `parse` iterates via `[...str]`, so `stringify` must use same code-point logic (`[...next.value][0]` or `const [first] = next.value`).

## Cross-File Reasoning

- `src/index.ts` `parse` (correctly handles astral via `[...str]`)
- `src/index.ts` `stringifyName` (buggy, must be fixed to match `parse`)
- The agent must compare the two and realize the mismatch.

## Regression Surface

- Basic `parse`/`stringify` for `"/user/:id"` and `"/*splat"` (regression `tests/basic.test.ts`).
- The `cases.spec.ts` at fixed includes 26+ stringify tests; our oracle covers the 3 new ones plus BMP and round-trip.

## Why This Is Suitable For Frontier Verifier

- **Public narrow:** single `param` + astral `ID_Continue` (quotes).
- **Hidden broad:** 7 tests covering `param` astral, `wildcard` astral, non-`ID_Continue` astral, BMP `ID_Continue`, empty/next not text, and round-trip — distinguishes correct code-point fix from `charAt` or always-quote.
- **High Unicode reasoning:** requires knowing surrogate pairs, `u` flag, and `[...str]` vs `[0]`.
- **Deterministic:** pure string manipulation, no timers.

## Verification Plan

- Public: `stringify` with `param` + `\u{1D6FC}` → `'/:"test"\u{1D6FC}'` → PASS on fixed, FAIL (unquoted) on buggy.
- Oracle: 7 tests — 2 astral `ID_Continue` (param, wildcard), 1 non-`ID_Continue` astral (should not quote), 1 BMP `ID_Continue`, 1 empty, 1 round-trip, 1 parse.
- Buggy: public fails (unquoted), oracle fails (≥2).
- Fixed: all pass 3×.

## Difficulty Rating

**Frontier-Hard** — requires Unicode code-point awareness and matching `parse`'s `[...str]` semantics — not just a one-character `charAt` change.
