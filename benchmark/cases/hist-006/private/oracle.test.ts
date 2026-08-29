import { describe, test, expect } from "vitest";
import { spyOn } from "../../../repositories/tinyspy/src/index.ts";

describe("hist-006 oracle: inherited methods", () => {
  test("mocks inherited getter preserves setter", () => {
    class Bar {
      _bar = 'bar';
      get bar(): string { return this._bar; }
      set bar(v: string) { this._bar = v; }
    }
    class Foo extends Bar {}
    const foo = new Foo();
    expect(foo.bar).toBe('bar');
    spyOn(foo, { getter: 'bar' }, () => 'foo');
    expect(foo.bar).toBe('foo');
    expect(() => { foo.bar = 'baz'; }).not.toThrow();
    expect(foo.bar).toBe('foo');
    expect((foo as any)._bar).toBe('baz');
  });

  test("mocks deeply inherited getter preserves setter", () => {
    class GrandBar {
      _x = 'grand';
      get x(): string { return this._x; }
      set x(v: string) { this._x = v; }
    }
    class Bar extends GrandBar {}
    class Foo extends Bar {}
    const foo = new Foo();
    expect(foo.x).toBe('grand');
    spyOn(foo, { getter: 'x' }, () => 'mocked');
    expect(foo.x).toBe('mocked');
    expect(() => { foo.x = 'new'; }).not.toThrow();
    expect(foo.x).toBe('mocked');
    expect((foo as any)._x).toBe('new');
  });

  test("mocks inherited overridden getter - setter throws", () => {
    class Bar {
      _bar = 'bar';
      get bar(): string { return this._bar; }
      set bar(v: string) { this._bar = v; }
    }
    class Foo extends Bar {
      override get bar(): string { return `${super.bar}-foo`; }
    }
    const foo = new Foo();
    expect(foo.bar).toBe('bar-foo');
    spyOn(foo, { getter: 'bar' }, () => 'foo');
    expect(foo.bar).toBe('foo');
    expect(() => { (foo as any).bar = 'baz'; }).toThrow();
    expect(foo.bar).toBe('foo');
  });
});
