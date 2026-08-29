import { describe, test, expect } from "vitest";
import { spyOn } from "../../../repositories/tinyspy/src/index.ts";

describe("hist-003 oracle: prototype restore leak", () => {
  test("restore deletes own property for prototype method", () => {
    class Foo {
      f() { return 'original'; }
    }
    const foo = new Foo();
    expect(foo.f()).toBe('original');
    expect(Object.getOwnPropertyDescriptors(foo as any)).toEqual({} as any);
    const spy = spyOn(foo, 'f');
    spy.willCall(() => 'mocked');
    expect(Object.getOwnPropertyDescriptor(foo, 'f')).toBeDefined();
    expect(foo.f()).toBe('mocked');
    spy.restore();
    expect(foo.f()).toBe('original');
    expect(Object.getOwnPropertyDescriptor(foo, 'f')).toBeUndefined();
    expect(Object.getOwnPropertyDescriptors(foo as any)).toEqual({} as any);
  });

  test("multiple spy/restore cycles remain clean", () => {
    class Foo {
      g() { return 1; }
    }
    const foo = new Foo();
    for (let i = 0; i < 3; i++) {
      const spy = spyOn(foo, 'g');
      spy.willCall(() => 2);
      expect(foo.g()).toBe(2);
      expect(Object.getOwnPropertyDescriptor(foo, 'g')).toBeDefined();
      spy.restore();
      expect(Object.getOwnPropertyDescriptor(foo, 'g')).toBeUndefined();
      expect(foo.g()).toBe(1);
    }
    expect(Object.getOwnPropertyDescriptors(foo as any)).toEqual({} as any);
  });

  test("prototype still owns method after restore", () => {
    class Foo {
      f() { return 'orig'; }
    }
    const foo1 = new Foo();
    const foo2 = new Foo();
    const spy = spyOn(foo1, 'f');
    spy.willCall(() => 'mock');
    expect(foo1.f()).toBe('mock');
    expect(foo2.f()).toBe('orig');
    spy.restore();
    expect(foo1.f()).toBe('orig');
    expect(Object.getOwnPropertyDescriptor(foo1, 'f')).toBeUndefined();
    expect(foo2.f()).toBe('orig');
    expect(Foo.prototype.f.call(foo1)).toBe('orig');
    expect(Object.getOwnPropertyDescriptors(foo1 as any)).toEqual({} as any);
  });
});
