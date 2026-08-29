import { describe, test, expect } from "vitest";
import { spyOn, spy } from "../src/index.ts";

describe("tinyspy regression", () => {
  test("spyOn mocks prototype method and restores cleanly", () => {
    class Foo { f() { return 'original'; } }
    const foo = new Foo();
    expect(foo.f()).toBe('original');
    const s = spyOn(foo, 'f');
    s.willCall(() => 'mocked');
    expect(foo.f()).toBe('mocked');
    s.restore();
    expect(foo.f()).toBe('original');
    expect(Object.getOwnPropertyDescriptor(foo, 'f')).toBeUndefined();
  });

  test("spy creates mock function with call tracking", () => {
    const fn = spy();
    expect(fn.called).toBe(false);
    expect(fn.callCount).toBe(0);
    fn('a', 'b');
    expect(fn.called).toBe(true);
    expect(fn.callCount).toBe(1);
    expect(fn.calls[0]).toEqual(['a', 'b']);
    fn.reset();
    expect(fn.called).toBe(false);
  });

  test("spyOn inherited getter preserves setter", () => {
    class Bar {
      _v = 'bar';
      get v(): string { return this._v; }
      set v(v: string) { this._v = v; }
    }
    class Foo extends Bar {}
    const foo = new Foo();
    const s = spyOn(foo, { getter: 'v' }, () => 'mocked');
    expect(foo.v).toBe('mocked');
    expect(() => { foo.v = 'test'; }).not.toThrow();
    expect(foo.v).toBe('mocked');
    s.restore();
    expect(foo.v).toBe('test');
  });
});
