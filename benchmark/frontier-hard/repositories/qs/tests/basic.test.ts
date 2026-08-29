import { describe, test, expect } from "vitest";
import qs from "../lib/index.js";

describe("qs regression", () => {
  test("basic parse", () => {
    expect(qs.parse("a=1&b=2")).toEqual({ a: "1", b: "2" });
  });
  test("basic stringify", () => {
    expect(qs.stringify({ a: 1, b: 2 })).toBe("a=1&b=2");
  });
  test("array parse", () => {
    expect(qs.parse("a[]=1&a[]=2")).toEqual({ a: ["1", "2"] });
  });
});
