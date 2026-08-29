import { describe, test, expect } from "vitest";
import SuperJSON from "../src/index.js";

describe("superjson regression", () => {
  test("basic stringify/parse", () => {
    const obj = { a: new Date("2020-01-01"), b: new Set([1,2]) };
    const s = SuperJSON.stringify(obj);
    const p = SuperJSON.parse(s);
    expect(p.a).toEqual(obj.a);
    expect(p.b).toEqual(obj.b);
  });
  test("regexp", () => {
    const obj = { r: /test/g };
    const s = SuperJSON.stringify(obj);
    const p = SuperJSON.parse(s);
    expect(p.r).toEqual(obj.r);
  });
});
