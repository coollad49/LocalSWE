# Immer array methods reverse/sort mutates base state

**Repository:** `immer` (`immerjs/immer`)
**Component:** `src/core/proxy.ts` — proxy get trap, `src/plugins/arrayMethods.ts` — arrayMethods plugin
**Related PR:** https://github.com/immerjs/immer/pull/1255

## Problem

When `enableArrayMethods()` is enabled, calling `reverse()` or `sort()` on a draft array and then mutating an element of the reordered array incorrectly mutates the original base state. This violates Immer's core guarantee that the base state is never mutated, and also produces incorrect patches and inverse patches.

For example:

```ts
import { produce, enableArrayMethods, isDraft } from "./src/immer";

enableArrayMethods();

const reordered = { id: 3 };
const baseState = [{ id: 1 }, { id: 2 }, reordered];

const nextState = produce(baseState, (s) => {
  s.reverse();
  // After reverse, s[0] should be a draft of the original reordered object
  s[0].id = 99;
});

console.log(baseState);
// Expected (fixed): [{ id: 1 }, { id: 2 }, { id: 3 }]
// Actual (buggy):   [{ id: 1 }, { id: 2 }, { id: 99 }]  // base mutated!

console.log(reordered);
// Expected: { id: 3 }
// Actual (buggy): { id: 99 }

console.log(nextState);
// [{ id: 99 }, { id: 2 }, { id: 1 }] in both, but buggy also corrupted base
```

The same issue occurs with `sort()`:

```ts
const baseState = [{ value: 3 }, { value: 1 }, { value: 2 }];
const [nextState, patches, inverse] = produceWithPatches(baseState, (s) => {
  s.sort((a, b) => a.value - b.value);
  s[0].value = 99;
});
// Fixed: patches correctly transform base -> next and inverse -> base
// Buggy: patches are wrong, base mutated
```

## Expected Behavior

- After `reverse()` or `sort()` on a draft array, every element accessed via the draft must be a draft proxy, not the raw base object, even if the element was relocated to a different index.
- Mutating a relocated element must not mutate the original base state or any object reachable from it.
- `produceWithPatches` must generate correct patches and inverse patches for these operations.
- `isDraft(s[0])` should be `true` after `reverse()` for relocated elements.

## Actual Behavior

- After `reverse()`/`sort()`, the `copy_` array holds raw base references that have been relocated. The proxy `get` trap only drafts values where `value === peek(base, prop)` (same index). For a relocated object, `base[prop]` is a different object, so the check fails and the raw base is returned.
- Writing to that raw base mutates user data outside the draft.

## Reproduction

```ts
import { produce, enableArrayMethods } from "../../../repositories/immer/src/immer";

enableArrayMethods();

const reordered = { id: 3 };
const baseState = [{ id: 1 }, { id: 2 }, reordered];
const baseCopy = JSON.parse(JSON.stringify(baseState));

const nextState = produce(baseState, (s) => {
  s.reverse();
  s[0].id = 99;
});

console.log(JSON.stringify(baseState) === JSON.stringify(baseCopy)); // should be true
console.log(reordered.id === 3); // should be true
console.log(JSON.stringify(nextState) === JSON.stringify([{ id: 99 }, { id: 2 }, { id: 1 }])); // should be true
```

## Environment

- Node 22 / Bun 1.4.0
- `immer` with `enableArrayMethods()` enabled
- `vitest` for testing

## Notes

- The fix involves tracking which array indices were reassigned and which values are original base references, then drafting relocated values on access.
- Check `src/core/proxy.ts` get trap and `src/plugins/arrayMethods.ts` array method handling, but do not modify unrelated files unless necessary.
- Regression suite is `bun test tests/` in the repository.
