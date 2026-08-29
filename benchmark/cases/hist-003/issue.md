# Issue: spyOn leaks own property when spying on prototype method

**Repository:** `tinyspy` `src/spyOn.ts` + `src/utils.ts`
**Commit fixed:** `0372bfb` — fix: remove own properties if method defined on prototype
**Parent (buggy):** `0684083`

## Description

When `spyOn` is used to mock a method defined on the prototype (e.g., `class Foo { f() { return 'original' } }` and `foo = new Foo()`), the spy correctly replaces the method with a mock. However, upon `spy.restore()`, the buggy version re-defines a copy of the original descriptor as an own property on the instance instead of removing the own property. This leaves `Object.getOwnPropertyDescriptor(foo, 'f')` defined (leaked) and `Object.getOwnPropertyDescriptors(foo)` non-empty, whereas the correct behavior is to delete the own property and fall back to the prototype.

The fix makes `getDescriptor` return `[object, descriptor]` and changes `restore` to `Reflect.deleteProperty(obj, accessName)` when the original was not an own property. `src/utils.ts` also fixes `defineValue` to make properties `configurable:true, writable:true`.

## Steps to Reproduce

```ts
import { spyOn } from "./src/index.ts";

class Foo { f() { return 'original'; } }
const foo = new Foo();
console.log(Object.getOwnPropertyDescriptors(foo)); // {}

const spy = spyOn(foo, 'f');
spy.willCall(() => 'mocked');
console.log(foo.f()); // 'mocked'
console.log(Object.getOwnPropertyDescriptor(foo,'f')); // defined (own)

spy.restore();
console.log(foo.f()); // 'original'
console.log(Object.getOwnPropertyDescriptor(foo,'f')); // should be undefined (fixed) but is defined (buggy)
console.log(Object.getOwnPropertyDescriptors(foo)); // should be {} but is {f: ...} (buggy)
```

## Expected Behavior

- After `spy.restore()`, `Object.getOwnPropertyDescriptor(foo, 'f')` should be `undefined`.
- `Object.getOwnPropertyDescriptors(foo)` should be `{}` (no own properties).
- `foo.f()` should still return `'original'` via prototype.

## Actual (Buggy) Behavior

- After restore, `foo` retains an own property `f` shadowing the prototype.
- Leak is observable via `getOwnPropertyDescriptor` and `getOwnPropertyDescriptors`.

