import { describe, test, expect } from "vitest";
import mri from "../../../repositories/mri/lib/index.js";

describe("hist-004 oracle: boolean defaults toVal order (94f8c09)", () => {
  test("core bug: -t with default true does not leak into _", () => {
    const out = mri(["-t"], { default: { t: true } });
    expect(out).toEqual({ _: [], t: true });
    expect(out._).toEqual([]);
    expect(typeof out.t).toBe("boolean");
    // buggy gave {"_":[1],"t":true}
    expect(out._.includes(1 as unknown as string)).toBe(false);
  });

  test("flag boolean with default variations", () => {
    const foo = mri(["-t"], { default: { t: true } });
    expect(foo).toEqual({ t: true, _: [] });
    expect(typeof foo.t).toBe("boolean");

    const bar = mri(["-t"], { default: { t: false } });
    expect(bar).toEqual({ t: true, _: [] });
    expect(typeof bar.t).toBe("boolean");

    const baz = mri(["--no-two"], { default: { two: true } });
    expect(baz).toEqual({ two: false, _: [] });
    expect(typeof baz.two).toBe("boolean");
  });

  test("flag boolean with default & alias", () => {
    const alias = { t: ["tt"], two: ["toot"] };

    const foo = mri(["-t"], { alias, default: { t: true } });
    expect(foo).toEqual({ t: true, tt: true, _: [] });
    expect(typeof foo.t).toBe("boolean");

    const bar = mri(["-t"], { alias, default: { t: false } });
    expect(bar).toEqual({ t: true, tt: true, _: [] });
    expect(typeof bar.t).toBe("boolean");

    const baz = mri(["--no-two"], { alias, default: { two: true } });
    expect(baz).toEqual({ two: false, toot: false, _: [] });
    expect(typeof baz.two).toBe("boolean");
  });

  test("flag boolean with default string & alias (string coercion branch)", () => {
    const foo = mri(["-t"], { default: { t: "hi" } });
    expect(foo).toEqual({ t: "", _: [] });
    expect(typeof foo.t).toBe("string");

    const bar = mri(["-t"], { alias: { t: "tt" }, default: { t: "boo" } });
    expect(bar).toEqual({ t: "", tt: "", _: [] });
    expect(typeof bar.t).toBe("string");

    // --no-* overrides string default to boolean false
    const baz = mri(["--no-two"], { default: { two: "hi" } });
    expect(baz).toEqual({ two: false, _: [] });
    expect(typeof baz.two).toBe("boolean");
  });

  test("no numeric pollution in _ for boolean defaults", () => {
    const cases: Array<[string[], any, any]> = [
      [["-t"], { default: { t: true } }, { _: [], t: true }],
      [["-t"], { alias: { t: ["tt"] }, default: { t: true } }, { _: [], t: true, tt: true }],
      [["-b"], { default: { b: true } }, { _: [], b: true }],
    ];
    for (const [args, opts, expected] of cases) {
      const out = mri(args, opts);
      expect(out).toEqual(expected);
      expect(out._.length).toBe(0);
    }
  });

  test("regression: basic non-boolean parsing still works", () => {
    expect(mri(["--foo", "bar"])).toEqual({ _: [], foo: "bar" });
    expect(mri(["--count", "42"]).count).toBe(42);
  });
});
