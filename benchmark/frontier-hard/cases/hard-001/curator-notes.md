# Curator Notes — hard-001

## Why This Is Hard

This bug requires **cross-file reasoning** across `src/core/proxy.ts` (proxy get trap) and `src/plugins/arrayMethods.ts` (arrayMethods plugin). The agent must understand:

- How `enableArrayMethods()` intercepts `reverse()`/`sort()` and runs them natively on `copy_` which holds raw base references.
- Why `copy_` after reorder contains relocated base objects that no longer satisfy `value === peek(base, prop)` positional check.
- That the get trap's normal draft check (`value === peek(base, prop)`) misses relocated refs, returning raw base and breaking immutability.
- The hidden invariant: *base state must never be mutated* — even when accessed via a relocated index.
- The fix requires introducing a `baseRefs_` Set to track original base values and a helper `isRelocatedBaseRef` that checks `allIndicesReassigned_`, `assigned_`, draftable, and membership in `baseRefs_`.

A single-file fix is insufficient; both `proxy.ts` (detection) and `arrayMethods.ts` (capture) must be coordinated.

## Expected Agent Failure Mode

- **Naive fix 1:** Disable `enableArrayMethods` or make `reverse`/`sort` create a copy via `shallowCopy` instead of native. This would pass the simple reverse test but break structural sharing and the plugin's performance contract, failing oracle tests for pure reverse patches and `push` after reverse.
- **Naive fix 2:** Always draft any array element on get (remove positional check). This passes the bug repro but defeats the optimization that avoids drafting unmodified elements, causing unnecessary drafts and failing the `assigned` check and structural sharing tests.
- **Naive fix 3:** Only handle `reverse` but not `sort`, or forget to check `assigned_` (explicitly assigned indices should not be treated as relocated). This passes the public `reverse` repro but fails the hidden `sort` oracle and the `assigned index` test.
- **Naive fix 4:** Implement `baseRefs_` but forget to set it in `markAllIndicesReassigned`, or implement check but miss one guard (`isDraftable`, `DRAFT_STATE`, `allIndicesReassigned_`). This would be a partial fix.

## Naive Fix

```ts
// proxy.ts — just broaden condition without tracking baseRefs
if (value === peek(state.base_, prop) || isDraftable(value)) {
  prepareCopy(state);
  // ...
}
```

This drafts everything, appears to fix the symptom but breaks `assigned_` semantics and causes over-drafting.

## Why Naive Fix Fails

- Over-drafting changes behavior for non-reordered arrays (e.g., `push` without reorder should still share structure for untouched elements).
- The oracle tests `assigned index after reorder not treated as relocated` — explicit `s[0] = {id:99}` after reverse should be treated as assigned, not relocated. A naive always-draft would still work there but would hide the real bug of missing `baseRefs_` tracking vs over-drafting.
- More importantly, the correct fix must **only** draft when `allIndicesReassigned` is true and the value is a known base ref not explicitly assigned. The naive fix drafts even when not reordered, which could be detected via performance or via `isDraft` checks on non-relocated elements (not in our oracle but would be a regression).

Our oracle's `multiple reverse cycles` and `push after reverse` tests distinguish these.

## Hidden Invariant

- `baseState` and any nested object reachable from it must remain **structurally shared and unmodified** after `produce`, even if accessed via a relocated index.
- `applyPatches(base, patches) === nextState` and `applyPatches(next, inverse) === base` must hold for `reverse`/`sort` cases.
- `isDraft(s[0]) === true` for relocated elements.

## Cross-File Reasoning

- `proxy.ts` get trap: where the bug manifests (returns raw base).
- `arrayMethods.ts`: where `markAllIndicesReassigned` must be augmented to capture `baseRefs_`.
- `types` and `scope` interactions: `assigned_` map tracks explicitly assigned indices.
- The agent must trace the flow: `s.reverse()` → `executeArrayMethod` → `state.copy_.reverse()` → `markAllIndicesReassigned(state)` → later `s[0]` get trap.

## Regression Surface

- Basic `produce` with object mutation, array push, etc. (regression `tests/basic.test.ts`).
- Original immer test suite includes many array method tests; our oracle adds 7 focused tests that would fail if agent breaks normal proxy behavior.
- Structural sharing for non-mutating `reverse` (patches correct, base unchanged).

## Why This Is Suitable For Frontier Verifier

- **Public repro narrow:** only checks `reverse` then mutate, base not mutated, next correct. Passes with any fix that drafts relocated refs, even over-broad ones.
- **Hidden oracle broad:** checks `sort`, patches, multiple cycles, `push` after reverse, assigned vs relocated distinction — distinguishes correct fine-grained fix from coarse naive fixes.
- **Had historical provenance:** real bug from `immerjs/immer` PR #1255, pinned commits, MIT.
- **Deterministic:** synchronous, no timers, no network, 3× stable.
- **High reasoning:** requires understanding proxy traps, draft lifecycle, array plugin interaction — not just a one-line `in` vs `hasOwn` fix.

## Verification Plan

- Public: `reverse` + mutate → base unchanged (1 test).
- Oracle: 7 tests covering reverse, sort, patches, sharing, cycles, push, assigned.
- Regression: `tests/basic.test.ts` (2 tests).
- Buggy: public fails (base mutated), oracle fails (3+ tests fail).
- Fixed: all pass 3×.

## Difficulty Rating

**Frontier-Hard** — requires reading 2 files, understanding draft lifecycle, and implementing a novel `Set` tracking mechanism. Baseline agents that only search for the failing line will not discover the `baseRefs_` invariant.
