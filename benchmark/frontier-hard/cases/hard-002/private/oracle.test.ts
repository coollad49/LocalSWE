import { describe, test, expect } from "vitest";
import qs from "../../../repositories/qs/lib/index.js";

describe("hard-002 oracle: qs combine overflow flatten", () => {
  test("spreads a comma group appended to an already-overflowed object", () => {
    const result = qs.parse("a=1,2,3,4,5,6&a=7,8", { comma: true, arrayLimit: 5 } as any);
    expect(result).toEqual({ a: { 0: "1", 1: "2", 2: "3", 3: "4", 4: "5", 5: "6", 6: "7", 7: "8" } });
  });

  test("keeps a []= comma group as one element when appended to an already-overflowed key", () => {
    const result = qs.parse("a[]=1&a[]=2&a[]=3&a[]=4,5", { comma: true, arrayLimit: 2 } as any);
    expect(result).toEqual({ a: { 0: "1", 1: "2", 2: "3", 3: ["4", "5"] } });
  });

  test("spreads every later comma group appended to an already-overflowed object", () => {
    const result = qs.parse("a=1,2,3,4,5,6&a=7,8&a=9,10", { comma: true, arrayLimit: 5 } as any);
    expect(result).toEqual({ a: { 0: "1", 1: "2", 2: "3", 3: "4", 4: "5", 5: "6", 6: "7", 7: "8", 8: "9", 9: "10" } });
  });

  test("spreads a comma group appended to an object overflowed under the default arrayLimit", () => {
    const values: string[] = [];
    for (let i = 0; i <= 20; i++) values.push(String(i));
    const expected: Record<string, string> = {};
    for (let j = 0; j < values.length; j++) expected[j] = values[j];
    expected[21] = "x";
    expected[22] = "y";
    const result = qs.parse("a=" + values.join(",") + "&a=x,y", { comma: true } as any);
    expect(result).toEqual({ a: expected });
  });

  test("spreads a comma group appended to an already-overflowed object with plainObjects", () => {
    const result = qs.parse("a=1,2,3,4,5,6&a=7,8", { comma: true, arrayLimit: 5, plainObjects: true } as any);
    expect(result).toEqual({ __proto__: null, a: { __proto__: null, 0: "1", 1: "2", 2: "3", 3: "4", 4: "5", 5: "6", 6: "7", 7: "8" } } as any);
  });

  test("still throws with throwOnLimitExceeded when a comma group is appended to an already-overflowed object", () => {
    expect(() => {
      qs.parse("a=1,2,3,4,5,6&a=7,8", { comma: true, arrayLimit: 5, throwOnLimitExceeded: true } as any);
    }).toThrow(/Array limit exceeded/);
  });

  test("does not throw for comma groups nested under bracket notation", () => {
    const result = qs.parse("a[]=1,2,3&a[]=4,5,6", { comma: true, arrayLimit: 5, throwOnLimitExceeded: true } as any);
    expect(result).toEqual({ a: [["1", "2", "3"], ["4", "5", "6"]] });
  });

  test("single scalar after overflow not nested", () => {
    const result = qs.parse("a=1,2,3,4,5,6&a=7", { comma: true, arrayLimit: 5 } as any);
    expect(result).toEqual({ a: { 0: "1", 1: "2", 2: "3", 3: "4", 4: "5", 5: "6", 6: "7" } });
  });
});
