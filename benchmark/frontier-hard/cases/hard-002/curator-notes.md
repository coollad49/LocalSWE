# Curator Notes — hard-002

## Why This Is Hard

This bug requires understanding `qs`'s `arrayLimit` **representation threshold** invariant: when an array exceeds `arrayLimit`, it is converted to an overflow object via `arrayToObject` and `markOverflow`, but the threshold is *not* an element-count cap on the overflow object — it is a trigger for representation change. The `combine` function has two distinct paths:

- Non-overflow: ` [].concat(a,b)` correctly spreads `b` whether scalar or array.
- Overflow: `a[newIndex]=b` incorrectly assumed `b` scalar, nesting arrays.

The agent must:

- Trace `parse` → `combine` → `arrayLimit` → `markOverflow`/`getMaxIndex` flow.
- Realize `b` can be an array when `comma:true` and the key is flat (`a=1,2`), but must *not* be double-spread when `b` is already a nested group from `[]=` (where `b` is `["4","5"]` but should stay as single element `3:["4","5"]`).
- The correct fix spreads **one level** (`isArray(b) ? b : [b]`) — matching `[].concat` semantics — not deep flatten, not no-spread.

Public repro only shows the simple flatten case (`a=1,2,3,4,5,6&a=7,8`); hidden oracle distinguishes the `[]=` single-element preservation, multiple appended groups, `plainObjects` null-prototype, and `throwOnLimitExceeded` still throwing.

## Expected Agent Failure Mode

- **Naive fix 1:** Change `a[newIndex]=b` to `a[newIndex]=b[0]` or only handle scalar — fixes scalar append but still nests comma groups, fails public repro.
- **Naive fix 2:** Flatten deeply (`a[newIndex]=b.flat()`) or `a[newIndex]=...b` spread incorrectly double-nests `[]=` groups — public passes (flat case) but hidden `a[]=1&a[]=2&a[]=3&a[]=4,5` expects `3:["4","5"]` not `3:"4",4:"5"` — fails.
- **Naive fix 3:** Use `[].concat(a,b)` for overflow too without handling `getMaxIndex` correctly — would reintroduce array and lose overflow object's `__proto__:null` and `getMaxIndex` tracking, breaking `plainObjects` and subsequent appends.
- **Naive fix 4:** Forget to update `setMaxIndex` after loop or use `getMaxIndex(a)+1` per iteration incorrectly — off-by-one, fails multiple groups test.

## Naive Fix

```js
// Just handle scalar
var newIndex = getMaxIndex(a) + 1;
a[newIndex] = Array.isArray(b) ? b[0] : b; // wrong
```

This would make `a=7,8` become `6:"7"` losing `"8"`.

## Why Naive Fix Fails

- The public repro checks `a=1,2,3,4,5,6&a=7,8` expecting `6:"7",7:"8"` — any fix that only takes `b[0]` loses `"8"`; any fix that nests loses flatten.
- Hidden `a[]=...` case requires *not* spreading the inner group array's elements into separate indices, but keeping it as one element. A naive that always spreads `b` flat would break that.
- The correct semantics are subtle: `b` is *already* the value to assign; if `b` is array from comma split, it should be spread one level; if `b` is scalar, wrapped then spread.

## Hidden Invariant

- `arrayLimit` overflow objects store `maxIndex` via `side-channel`; `combine` must maintain it via `getMaxIndex`/`setMaxIndex`.
- `plainObjects` uses `{__proto__:null}` objects — must preserve that.
- `throwOnLimitExceeded` must still throw before spreading when overflowed, not after.

## Cross-File Reasoning

- `lib/utils.js` `combine` is the bug site, but understanding it requires reading `lib/parse.js` where `combine` is called with `arrayLimit` and `comma` options, and how `parseArrayValue` and `arrayToObject` interact.
- The overflow concept is implemented across `utils.js` (`markOverflow`, `isOverflow`, `getMaxIndex`, `arrayToObject`) and `parse.js`.

## Regression Surface

- Basic `parse`/`stringify` (regression `tests/basic.test.ts`).
- `arrayLimit` default (20) still works for large arrays.
- `plainObjects` and `throwOnLimitExceeded` interactions.

## Why This Is Suitable For Frontier Verifier

- **Public narrow:** single `a=1,2,3,4,5,6&a=7,8` case.
- **Hidden broad:** 8 tests covering `[]=` vs flat, multiple appends, default limit, `plainObjects`, `throwOnLimit`.
- **Partial-fix trap:** agent that only fixes flat case but breaks `[]=` group will pass public but fail oracle — exactly the `false_confidence` thesis.
- **Deterministic:** pure parsing, no timers, no network.
- **Historical:** real `qs` PR, pinned commits, BSD-3.

## Verification Plan

- Buggy: public fails (nested), oracle fails (≥3 tests fail).
- Fixed: all pass 3×.
- Naive that nests: public fails; naive that over-spreads: public passes but hidden `[]=` fails (`false_confidence`).

## Difficulty Rating

**Frontier-Hard** — requires reading overflow representation, understanding `comma` vs `[]=` distinction, and implementing one-level spread correctly — not just changing `a[newIndex]=b` to `a[newIndex]=b[0]`.
