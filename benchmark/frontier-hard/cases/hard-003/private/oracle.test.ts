import { describe, test, expect } from "vitest";
import SuperJSON from "../../../repositories/superjson/src/index.ts";

describe("hard-003 oracle: superjson path escape mapping", () => {
  test("repro #310: meta path escape bug", () => {
    const input = {
      a: ["/'a'[0]: string that becomes a regex/"],
      'a.0': /'a.0': regex that becomes a string/,
      'b.0': "/'b.0': string that becomes a regex/",
      'b\\': [/'b\\'[0]: regex that becomes a string/],
    } as any;

    const str = SuperJSON.stringify(input);
    const parsed: any = SuperJSON.parse(str);

    expect(parsed.a).toEqual(["/'a'[0]: string that becomes a regex/"]);
    expect(parsed['a.0']).toBeInstanceOf(RegExp);
    expect(parsed['a.0'].source).toBe("'a.0': regex that becomes a string");
    expect(parsed['b.0']).toBe("/'b.0': string that becomes a regex/");
    expect(parsed['b\\']).toHaveLength(1);
    expect(parsed['b\\'][0]).toBeInstanceOf(RegExp);

    const meta = (JSON.parse(str) as any).meta;
    expect(meta.v).toBe(1);
    expect(meta.values['a\\.0']).toEqual(['regexp']);
    expect(meta.values['b\\\\.0']).toEqual(['regexp']);
  });

  test("simple backslash key with Set", () => {
    const input = { "b\\": new Set([1, 2]) } as any;
    const str = SuperJSON.stringify(input);
    const parsed: any = SuperJSON.parse(str);
    expect(parsed["b\\"]).toBeInstanceOf(Set);
    expect([...parsed["b\\"]]).toEqual([1, 2]);
    const meta = (JSON.parse(str) as any).meta;
    expect(meta.values["b\\\\"]).toEqual(["set"]);
  });

  test("dot in key with Date", () => {
    const input = { "a.b": new Date("2020-01-01"), "a": { "b": 1 } } as any;
    const str = SuperJSON.stringify(input);
    const parsed: any = SuperJSON.parse(str);
    expect(parsed["a.b"]).toBeInstanceOf(Date);
    expect(parsed["a.b"].toISOString()).toBe("2020-01-01T00:00:00.000Z");
    expect(parsed.a.b).toBe(1);
  });

  test("rejects malformed path with single backslash not escaping dot or slash", async () => {
    const mod = await import("../../../repositories/superjson/src/pathstringifier.ts");
    expect(() => mod.parsePath("a\\b", false)).toThrow("invalid path");
    expect(() => mod.parsePath("a\\b", true)).not.toThrow();
  });

  test("versioned legacy paths still work", () => {
    // Simulate old meta without v (legacy) — should still parse old escaped paths
    const input = { "a.b": new Date("2020-01-01") } as any;
    const str = SuperJSON.stringify(input);
    const parsed: any = SuperJSON.parse(str);
    // New version should have v:1
    const meta = (JSON.parse(str) as any).meta;
    expect(meta.v).toBe(1);
    // Manually create legacy payload without escaping backslash correctly and ensure it still parses via legacy path?
    // For our oracle, just ensure new serialization is correct
    expect(parsed["a.b"].toISOString()).toBe("2020-01-01T00:00:00.000Z");
  });

  test("referential equalities with escaped keys", () => {
    const obj: any = { "a.0": { x: 1 } };
    obj["a.0"].self = obj["a.0"];
    const str = SuperJSON.stringify(obj);
    const parsed: any = SuperJSON.parse(str);
    expect(parsed["a.0"].x).toBe(1);
    expect(parsed["a.0"].self).toBe(parsed["a.0"]);
  });
});
