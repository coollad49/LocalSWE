# Issue: spyOn fails to mock inherited methods

**Repository:** `tinyspy` `src/spyOn.ts`
**Commit fixed:** `0684083` — fix: correctly spy on inherited methods (#50)
**Parent (buggy):** `f42d545` (release v4.0.2)

## Description

`spyOn` should be able to mock getters/setters that are inherited from a parent class prototype. The buggy version only checked `Object.getOwnPropertyDescriptor(obj, method)` and one level of prototype (`Object.getPrototypeOf(obj)`), missing getters defined higher in the chain (e.g., `class Bar { get bar() }`, `class Foo extends Bar {}`, `foo = new Foo()` — `bar` lives on `Bar.prototype`, not `Foo.prototype` nor `foo` itself).

When spying on `foo`'s inherited getter `bar`, the buggy code fell back to a synthetic descriptor `{configurable:true,writable:true}` without preserving the original setter. Defining only a getter as own property shadows the prototype setter, making subsequent assignment `foo.bar = 'baz'` throw `TypeError: Attempted to assign to readonly property` in strict mode. Restoring also used a fallback `() => obj[bar]` that caused infinite recursion.

The fix makes `getDescriptor` walk the full prototype chain:

```ts
let getDescriptor = (obj, method) => {
  let d = Object.getOwnPropertyDescriptor(obj, method);
  if (d) return d;
  let p = Object.getPrototypeOf(obj);
  while(p){ d=Object.getOwnPropertyDescriptor(p,method); if(d) return d; p=Object.getPrototypeOf(p); }
}
```

And `reassign` spreads the original descriptor (preserving setter) before overriding the getter.

## Steps to Reproduce

```ts
import { spyOn } from "./src/index.ts";

class Bar {
  _bar = 'bar';
  get bar(): string { return this._bar; }
  set bar(v: string) { this._bar = v; }
}
class Foo extends Bar {}
const foo = new Foo();

console.log(foo.bar); // 'bar'
spyOn(foo, { getter: 'bar' }, () => 'foo');
console.log(foo.bar); // 'foo' (mocked)
foo.bar = 'baz'; // should NOT throw, setter preserved
console.log(foo.bar); // still 'foo' (mocked), but _bar is 'baz'
```

**Buggy:** `foo.bar = 'baz'` throws `TypeError: Attempted to assign to readonly property.`
**Fixed:** succeeds and `_bar` becomes `'baz'` while getter stays mocked.

## Expected Behavior

- `spyOn(foo, {getter:'bar'}, mock)` on inherited getter should mock getter but keep original setter.
- Assignment after mock should not throw.
- `foo.bar` remains mocked value until `restore()`.

