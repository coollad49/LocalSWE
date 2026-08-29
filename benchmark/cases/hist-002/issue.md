# Issue: Prototype pollution via `__proto__` in defaults

**Repository:** `defu` (`unjs/defu`)
**Component:** `src/defu.ts` — `_defu` defaults merging
**Fix commit:** `3942bfb` — PR #156

## Description

`defu` merges defaults into a base object via `Object.assign({}, defaults)` in `src/defu.ts:10`. When `defaults` is an object containing `__proto__` as an own property (e.g., parsed from JSON `{"__proto__":{"polluted":true}}`), `Object.assign` triggers the `__proto__` setter and causes prototype pollution of the returned object.

On the buggy version:

```js
const malicious = JSON.parse('{"__proto__":{"polluted":true}}');
const result = defu({}, malicious);
console.log(result.polluted); // true via prototype (polluted)
console.log(Object.getPrototypeOf(result)); // {polluted: true}
console.log({}.polluted); // undefined (global not yet polluted, but result is polluted)
```

On the fixed version (`{ ...defaults }`), `__proto__` is preserved as an own property without setting prototype:

```js
const result = defu({}, JSON.parse('{"__proto__":{"polluted":true}}'));
console.log(result.polluted); // undefined
console.log(Object.hasOwn(result, "__proto__")); // true on fixed, false on buggy
console.log(Object.getPrototypeOf(result).polluted); // undefined
```

The fix replaces `Object.assign({}, defaults)` with `{ ...defaults }` to prevent pollution (spread does not invoke `__proto__` setter).

## Steps to Reproduce

```ts
import { defu } from "./src/defu.ts";

// Clean
delete (Object.prototype as any).polluted;

const malicious = JSON.parse('{"__proto__":{"polluted":true}}');
const result = defu({}, malicious);

// Buggy: result.polluted === true (via prototype)
// Fixed: result.polluted === undefined
console.log("polluted:", (result as any).polluted);
console.log("proto polluted:", Object.getPrototypeOf(result)?.polluted);
console.log("global polluted:", ({} as any).polluted);

// Normal merging should still work
console.log(defu({ a: "c" }, { a: "bbb", d: "c" })); // {a:"c", d:"c"}
console.log(defu({ a: { b: "c" } }, { a: { d: "e" } })); // {a:{b:"c", d:"e"}}
```

Expected on fixed: `result.polluted` is `undefined`, prototype not polluted, global not polluted, normal merges still correct.
Actual on buggy: `result.polluted` is `true` via prototype.

## Expected Behavior

- `defu({}, JSON.parse('{"__proto__":{"polluted":true}}'))` must NOT cause `result.polluted` to be `true`.
- `Object.getPrototypeOf(result).polluted` must be `undefined`.
- `({}).polluted` and `Object.prototype.polluted` must remain `undefined` after calls.
- `defu(malicious, {isAdmin:false})` where malicious is `JSON.parse('{"__proto__":{"isAdmin":true}}')` should return `{isAdmin:false}` and not pollute.
- Normal merging (missing defaults, nested objects, arrays) must continue to work.

## Environment

- Node 22 / Bun 1.4.0
- `bun test` should pass after fix
- File to fix: `src/defu.ts:10`

## Notes

- Check `src/_utils.ts` `isPlainObject` and how `_defu` handles `__proto__` / `constructor` for `baseObject` but not for `defaults` copying.
- The fix is a single-line change: `Object.assign({}, defaults)` → `{ ...defaults }`.
