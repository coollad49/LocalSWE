import { describe, test, expect } from "vitest";
import mri from "../../../repositories/mri/lib/index.js";

describe("hist-005 oracle: alias defaults string cascade (5437ea5)", () => {
  test("core bug: -a 01 with alias a->arg preserves string", () => {
    const out = mri(["-a", "01"], { alias: { a: ["arg"] }, default: { arg: "" } });
    expect(out).toEqual({ _: [], arg: "01", a: "01" });
    expect(typeof out.a).toBe("string");
    expect(typeof out.arg).toBe("string");
    // buggy gave 1 as number
    expect(out.a).not.toBe(1 as unknown as string);
  });

  test("all 5 variants from 5437ea5 fix", () => {
    // 1) --arg with alias a->arg
    expect(
      mri(["--arg", "01"], { alias: { a: ["arg"] }, default: { arg: "" } })
    ).toEqual({ _: [], arg: "01", a: "01" });

    // 2) -a with alias a->arg (discriminative)
    expect(
      mri(["-a", "01"], { alias: { a: ["arg"] }, default: { arg: "" } })
    ).toEqual({ _: [], arg: "01", a: "01" });

    // 3) -a with alias arg->a default a
    expect(
      mri(["-a", "01"], { alias: { arg: ["a"] }, default: { a: "" } })
    ).toEqual({ _: [], arg: "01", a: "01" });

    // 4) --arg with alias arg->a default a (discriminative)
    expect(
      mri(["--arg", "01"], { alias: { arg: ["a"] }, default: { a: "" } })
    ).toEqual({ _: [], arg: "01", a: "01" });

    // 5) -a with alias arg->a default arg (discriminative)
    expect(
      mri(["-a", "01"], { alias: { arg: ["a"] }, default: { arg: "" } })
    ).toEqual({ _: [], arg: "01", a: "01" });
  });

  test("string types for each alias variant", () => {
    const cases: Array<[string[], any]> = [
      [["-a", "01"], { alias: { a: ["arg"] }, default: { arg: "" } }],
      [["--arg", "01"], { alias: { arg: ["a"] }, default: { a: "" } }],
      [["-a", "01"], { alias: { arg: ["a"] }, default: { arg: "" } }],
    ];
    for (const [args, opts] of cases) {
      const out = mri(args, opts);
      expect(typeof out.a).toBe("string");
      expect(typeof out.arg).toBe("string");
      expect(out.a).toBe("01");
      expect(out.arg).toBe("01");
    }
  });

  test("numeric strings with leading zeros remain strings, numbers still coerce when not string-typed", () => {
    // Without string default, "01" should coerce to number 1
    const num = mri(["-a", "01"], { alias: { a: ["arg"] } });
    // alias without default: both should be numbers (default coercion)
    expect(num.a).toBe(1);
    expect(num.arg).toBe(1);
    // With string default, stays string
    const str = mri(["-a", "01"], { alias: { a: ["arg"] }, default: { arg: "" } });
    expect(str.a).toBe("01");
    expect(typeof str.a).toBe("string");
  });

  test("boolean defaults still cascade to alias (regression from hist-004)", () => {
    // Ensure fixedB still has boolean fix
    const out = mri(["-t"], { alias: { t: ["tt"] }, default: { t: true } });
    expect(out).toEqual({ _: [], t: true, tt: true });
    expect(out._.length).toBe(0);
  });

  test("regression: basic parsing unchanged", () => {
    expect(mri(["--foo", "bar"])).toEqual({ _: [], foo: "bar" });
    expect(mri(["--foo", "--bar"])).toEqual({ _: [], foo: true, bar: true });
  });
});
