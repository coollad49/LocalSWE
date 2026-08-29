import { describe, test, expect } from "bun:test";
import mri from "../lib/index.js";

describe("mri regression", () => {
  test("parses basic flags", () => {
    expect(mri(["--foo", "bar"])).toEqual({ _: [], foo: "bar" });
    expect(mri(["--foo", "--bar"])).toEqual({ _: [], foo: true, bar: true });
  });

  test("handles short flags", () => {
    expect(mri(["-a", "-b", "val"])).toEqual({ _: [], a: true, b: "val" });
    expect(mri(["-ab", "val"])).toEqual({ _: [], a: true, b: "val" });
  });

  test("handles -- separator", () => {
    expect(mri(["--", "--not-a-flag"])).toEqual({ _: ["--not-a-flag"] });
  });

  test("coerces numbers by default", () => {
    expect(mri(["--count", "42"])).toEqual({ _: [], count: 42 });
    expect(typeof mri(["--count", "42"]).count).toBe("number");
  });

  test("string opts preserve string values", () => {
    expect(mri(["-s", "0001234"], { string: "s" }).s).toBe("0001234");
    expect(typeof mri(["-s", "0001234"], { string: "s" }).s).toBe("string");
  });

  test("boolean flag with no value", () => {
    const res = mri(["-t", "moo"], { boolean: "t" });
    expect(res).toEqual({ t: true, _: ["moo"] });
    expect(typeof res.t).toBe("boolean");
  });

  test("alias mirrors values", () => {
    const res = mri(["--foo", "bar"], { alias: { foo: "f" } });
    expect(res.foo).toBe("bar");
    expect(res.f).toBe("bar");
  });

  test("default values", () => {
    const res = mri([], { default: { foo: "bar" } });
    expect(res).toEqual({ _: [], foo: "bar" });
  });

  test("unknown handler strict", () => {
    const unknown = (flag: string) => {
      throw new Error(`unknown ${flag}`);
    };
    expect(() => mri(["--unknown", "val"], { unknown })).toThrow();
  });
});
