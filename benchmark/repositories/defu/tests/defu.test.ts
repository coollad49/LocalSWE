import { describe, test, expect } from "bun:test";
import { defu, createDefu } from "../src/defu.ts";

describe("defu regression", () => {
  test("copies missing defaults", () => {
    const result = defu({ a: "c" }, { a: "bbb", d: "c" });
    expect(result).toEqual({ a: "c", d: "c" });
  });

  test("fills null values from defaults", () => {
    const result = defu({ a: null as any }, { a: "c", d: "c" });
    expect(result).toEqual({ a: "c", d: "c" });
  });

  test("merges nested objects", () => {
    const result = defu({ a: { b: "c" } }, { a: { d: "e" } });
    expect(result).toEqual({ a: { b: "c", d: "e" } });
  });

  test("concats arrays by default", () => {
    const result = defu({ array: ["a", "b"] }, { array: ["c", "d"] });
    expect(result).toEqual({ array: ["a", "b", "c", "d"] });
  });

  test("multi defaults", () => {
    const result = defu({ a: 1 }, { b: 2, a: "x" }, { c: 3, a: "x", b: "x" });
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  test("handles non-object defaults", () => {
    expect(defu({ d: true } as any, null as any)).toEqual({ d: true });
    expect(defu(null as any, { d: true })).toEqual({ d: true });
  });

  test("does not override Object prototype via constructor", () => {
    const payload = JSON.parse('{"constructor": {"prototype": {"isAdmin": true}}}');
    defu({}, payload);
    defu(payload, {});
    defu(payload, payload);
    // @ts-ignore
    expect(({} as any).isAdmin).toBe(undefined);
  });
});
