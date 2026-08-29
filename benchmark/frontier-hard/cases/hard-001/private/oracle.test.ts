import { describe, test, expect } from "vitest";
import { produce, isDraft, enableArrayMethods, enablePatches, applyPatches, produceWithPatches } from "../../../repositories/immer/src/immer";

enableArrayMethods();
enablePatches();

describe("hard-001 oracle: draft relocated base refs after reverse/sort", () => {
  test("mutating after reverse does not mutate base", () => {
    const reordered = { id: 3 };
    const baseState = [{ id: 1 }, { id: 2 }, reordered];
    const nextState = produce(baseState, (s: any) => {
      s.reverse();
      expect(isDraft(s[0])).toBe(true);
      s[0].id = 99;
    });
    expect(baseState).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(reordered).toEqual({ id: 3 });
    expect(nextState).toEqual([{ id: 99 }, { id: 2 }, { id: 1 }]);
  });

  test("mutating after sort does not mutate base and patches correct", () => {
    const baseState = [{ value: 3 }, { value: 1 }, { value: 2 }];
    const [nextState, patches, inverse] = produceWithPatches(baseState, (s: any) => {
      s.sort((a: any, b: any) => a.value - b.value);
      expect(isDraft(s[0])).toBe(true);
      s[0].value = 99;
    });
    expect(baseState).toEqual([{ value: 3 }, { value: 1 }, { value: 2 }]);
    expect(nextState).toEqual([{ value: 99 }, { value: 2 }, { value: 3 }]);
    expect(applyPatches(baseState, patches)).toEqual(nextState);
    expect(applyPatches(nextState, inverse)).toEqual(baseState);
  });

  test("reverse without mutation preserves structural sharing semantics", () => {
    const baseState = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const nextState = produce(baseState, (s: any) => {
      s.reverse();
    });
    expect(nextState).toEqual([{ id: 3 }, { id: 2 }, { id: 1 }]);
    expect(baseState).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    // Ensure patches work for pure reverse
    const [ns2, patches] = produceWithPatches(baseState, (s: any) => { s.reverse(); });
    expect(applyPatches(baseState, patches)).toEqual(ns2);
  });

  test("multiple reverse cycles still isolated", () => {
    const baseState = [{ v: 1 }, { v: 2 }];
    const baseCopy = JSON.parse(JSON.stringify(baseState));
    const next1 = produce(baseState, (s: any) => { s.reverse(); s[0].v = 10; });
    const next2 = produce(next1, (s: any) => { s.reverse(); });
    expect(baseState).toEqual(baseCopy);
    expect(next1).toEqual([{ v: 10 }, { v: 1 }]);
    expect(next2).toEqual([{ v: 1 }, { v: 10 }]);
    // Mutating next2 should not affect next1
    const next3 = produce(next2, (s: any) => { s[0].v = 99; });
    expect(next2).toEqual([{ v: 1 }, { v: 10 }]);
    expect(next3).toEqual([{ v: 99 }, { v: 10 }]);
  });

  test("sort with no mutation does not leak drafts", () => {
    const baseState = [{ n: 2 }, { n: 1 }];
    const nextState = produce(baseState, (s: any) => {
      s.sort((a: any, b: any) => a.n - b.n);
    });
    expect(nextState).toEqual([{ n: 1 }, { n: 2 }]);
    expect(baseState).toEqual([{ n: 2 }, { n: 1 }]);
  });

  test("push after reverse still works correctly", () => {
    const baseState = [{ id: 1 }, { id: 2 }];
    const nextState = produce(baseState, (s: any) => {
      s.reverse();
      s.push({ id: 3 });
    });
    expect(nextState).toEqual([{ id: 2 }, { id: 1 }, { id: 3 }]);
    expect(baseState).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test("assigned index after reorder not treated as relocated", () => {
    const baseState = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const nextState = produce(baseState, (s: any) => {
      s.reverse();
      s[0] = { id: 99 }; // explicit assign, not relocated detection
      s[1].id = 88;
    });
    expect(baseState).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(nextState[0]).toEqual({ id: 99 });
    expect(nextState[1]).toEqual({ id: 88 });
  });
});
