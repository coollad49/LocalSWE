import { describe, test, expect } from "vitest";
import { parse, stringify } from "../src/index.js";

describe("path-to-regexp regression", () => {
  test("basic parse/stringify", () => {
    const tokens = parse("/user/:id");
    expect(tokens).toBeDefined();
    const str = stringify(tokens);
    expect(str).toBe("/user/:id");
  });
  test("wildcard", () => {
    const tokens = parse("/*splat");
    expect(tokens).toBeDefined();
  });
});
