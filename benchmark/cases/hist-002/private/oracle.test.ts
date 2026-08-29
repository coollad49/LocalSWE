import { describe, test, expect } from "vitest";
import { defu, createDefu } from "../../../repositories/defu/src/defu.ts";

describe("hist-002 oracle: prototype pollution via __proto__", () => {
  test("blocks __proto__ pollution via defaults (Object.assign vs spread)", () => {
    delete (Object.prototype as any).polluted;
    const malicious = JSON.parse('{"__proto__":{"polluted":true}}');
    const result = defu({}, malicious);
    // Fixed: result should NOT have polluted via prototype, should have own __proto__ or no pollution
    // Buggy: Object.assign sets prototype to {polluted:true}
    expect((result as any).polluted).toBe(undefined);
    expect(Object.getPrototypeOf(result)?.polluted).toBe(undefined);
    expect((Object.prototype as any).polluted).toBe(undefined);
    expect(({} as any).polluted).toBe(undefined);
    // Fixed keeps __proto__ as own property (spread), buggy does not
    // On fixed, hasOwn __proto__ true and proto is null prototype or Object.prototype without pollution
    // We check that global not polluted and result not polluted
    delete (Object.prototype as any).polluted;
  });

  test("blocks __proto__ pollution with isAdmin payload (PR #156 case)", () => {
    delete (Object.prototype as any).isAdmin;
    const malicious = JSON.parse('{"__proto__":{"isAdmin":true}}');
    const result = defu(malicious, { isAdmin: false });
    expect((result as any).isAdmin).toBe(false);
    expect(({} as any).isAdmin).toBe(undefined);
    expect((Object.prototype as any).isAdmin).toBe(undefined);
    delete (Object.prototype as any).isAdmin;
  });

  test("blocks pollution when defaults is first pollution vector via JSON", () => {
    delete (Object.prototype as any).polluted;
    const payload = JSON.parse('{"__proto__":{"polluted":true}}');
    const r = defu({}, payload);
    expect((r as any).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(r).polluted).toBeUndefined();
    expect(({} as any).polluted).toBeUndefined();
    delete (Object.prototype as any).polluted;
  });

  test("blocks constructor.prototype pollution", () => {
    delete (Object.prototype as any).isAdmin;
    const payload = JSON.parse('{"constructor": {"prototype": {"isAdmin": true}}}');
    defu({}, payload);
    defu(payload, {});
    defu(payload, payload);
    expect(({} as any).isAdmin).toBe(undefined);
    expect((Object.prototype as any).isAdmin).toBe(undefined);
    delete (Object.prototype as any).isAdmin;
  });

  test("normal merging still works (regression)", () => {
    expect(defu({ a: "c" }, { a: "bbb", d: "c" })).toEqual({ a: "c", d: "c" });
    expect(defu({ a: { b: "c" } }, { a: { d: "e" } })).toEqual({ a: { b: "c", d: "e" } });
    expect(defu({ array: ["a", "b"] }, { array: ["c", "d"] })).toEqual({ array: ["a", "b", "c", "d"] });
    expect(defu({ a: 1 }, { b: 2, a: "x" }, { c: 3, a: "x", b: "x" })).toEqual({ a: 1, b: 2, c: 3 });
  });

  test("handles non-object defaults", () => {
    expect(defu({ d: true } as any, null as any)).toEqual({ d: true });
    expect(defu(null as any, { d: true })).toEqual({ d: true });
    expect(defu({ d: true } as any, undefined as any)).toEqual({ d: true });
  });

  test("merge with merger still works", () => {
    const ext = createDefu((obj, key, val) => {
      if (typeof val === "number") {
        (obj as any)[key] += val;
        return true;
      }
    });
    expect(ext({ cost: 15 }, { cost: 10 })).toEqual({ cost: 25 });
  });

  test("defu does not pollute global after multiple calls", () => {
    delete (Object.prototype as any).polluted;
    for (let i = 0; i < 3; i++) {
      const m = JSON.parse('{"__proto__":{"polluted":true}}');
      defu({}, m);
      defu(m, {});
    }
    expect(({} as any).polluted).toBe(undefined);
    expect((Object.prototype as any).polluted).toBe(undefined);
    delete (Object.prototype as any).polluted;
  });
});
