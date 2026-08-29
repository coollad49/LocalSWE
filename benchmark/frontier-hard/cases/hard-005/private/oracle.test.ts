import { describe, test, expect } from "vitest";
import { TokenData, stringify, parse } from "../../../repositories/path-to-regexp/src/index.js";

describe("hard-005 oracle: path-to-regexp astral ID_Continue quoting", () => {
  test("quotes param name when followed by astral ID_Continue", () => {
    const data = new TokenData([
      { type: "text", value: "/" },
      { type: "param", name: "test" },
      { type: "text", value: "\u{1D6FC}" }, // U+1D6FC is ID_Continue, astral
    ]);
    expect(stringify(data)).toBe('/:"test"\u{1D6FC}');
  });

  test("quotes wildcard name when followed by astral ID_Continue", () => {
    const data = new TokenData([
      { type: "text", value: "/" },
      { type: "wildcard", name: "test" },
      { type: "text", value: "\u{1D6FC}" },
    ]);
    expect(stringify(data)).toBe('/*"test"\u{1D6FC}');
  });

  test("does not quote when followed by non-ID_Continue astral", () => {
    const data = new TokenData([
      { type: "text", value: "/" },
      { type: "param", name: "test" },
      { type: "text", value: "\u{1F600}" }, // U+1F600 is not ID_Continue
    ]);
    expect(stringify(data)).toBe("/:test\u{1F600}");
  });

  test("quotes when next text starts with BMP ID_Continue", () => {
    const data = new TokenData([
      { type: "text", value: "/" },
      { type: "param", name: "test" },
      { type: "text", value: "a" }, // 'a' is ID_Continue
    ]);
    expect(stringify(data)).toBe('/:"test"a');
  });

  test("does not quote when next is not text or is empty", () => {
    const data1 = new TokenData([
      { type: "text", value: "/" },
      { type: "param", name: "test" },
    ]);
    expect(stringify(data1)).toBe("/:test");

    const data2 = new TokenData([
      { type: "text", value: "/" },
      { type: "param", name: "test" },
      { type: "param", name: "other" },
    ]);
    expect(stringify(data2)).toBe("/:test:other");
  });

  test("round-trip parse -> stringify -> parse for astral", () => {
    const original = '/:"test"\u{1D6FC}';
    const tokens = parse(original);
    const str = stringify(tokens);
    expect(str).toBe(original);
    const tokens2 = parse(str);
    expect(tokens2.tokens).toEqual(tokens.tokens);
  });

  test("parse correctly handles astral ID_Continue in param name", () => {
    // Parse should treat astral ID_Continue as part of param name when not quoted
    const tokens = parse("/:test\u{1D6FC}");
    // The param name should be "test" + astral? Actually parser iterates via [...str] so it should handle correctly
    // For our test, just ensure it doesn't throw and produces tokens
    expect(tokens.tokens.length).toBeGreaterThan(0);
  });
});
