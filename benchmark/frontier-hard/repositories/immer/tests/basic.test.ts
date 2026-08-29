import { describe, test, expect } from "vitest";
import { produce } from "../src/immer";

describe("immer regression", () => {
  test("basic produce", () => {
    const base = { a: 1, b: { c: 2 } };
    const next = produce(base, (d) => { d.a = 2; d.b.c = 3; });
    expect(next.a).toBe(2);
    expect(next.b.c).toBe(3);
    expect(base.a).toBe(1);
  });
  test("array push", () => {
    const base = [1,2,3] as number[];
    const next = produce(base, d => { d.push(4); });
    expect(next).toEqual([1,2,3,4]);
    expect(base).toEqual([1,2,3]);
  });
});
