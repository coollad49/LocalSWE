# Issue: Boolean defaults leak into _ (mri)

**Repository:** `lukeed/mri`
**Component:** `lib/index.js:toVal`
**Fixed commit:** `94f8c09 fix: check for boolean value before boolean cast`
**Buggy state:** `a4759d5` / blob `b4d8a0a` (prior to fix)
**Issue:** https://github.com/lukeed/mri/issues/8

## Description

When a boolean default is provided (e.g. `{default:{t:true}}`) and a flag is supplied as `-t`, the parser incorrectly treats the boolean `true` default value through the `opts.boolean` branch instead of the `typeof val === 'boolean'` early return. The boolean branch does `val === 'false' ? false : val === 'true' || (out._.push(...), !!val)` which evaluates `true` as truthy and pushes a coerced numeric value (`1`) into `out._` before returning `!!val`.

## Steps to Reproduce

```js
import mri from "./lib/index.js";
console.log(mri(['-t'], {default:{t:true}}));
// buggy: {"_":[1],"t":true}
// fixed: {"_":[],"t":true}
console.log(mri(['-t'], {default:{t:true}})._); // buggy length 1, fixed 0
```

## Expected Behavior

- `mri(['-t'], {default:{t:true}})` => `{"_":[],"t":true}` with `typeof t === 'boolean'` and `_.length === 0`.
- `mri(['-t'], {default:{t:false}})` => `{"_":[],"t":true}` (flag overrides default).
- `mri(['--no-two'], {default:{two:true}})` => `{"_":[],"two":false}`.
- No numeric values should be leaked into `_`.

## Root Cause

`toVal` order was:

```js
!!~opts.string.indexOf(key) ? ...
: !!~opts.boolean.indexOf(key) ? (val === 'false' ? false : val === 'true' || (out._.push((x=+val, x*0===0)?x:val), !!val))
: typeof val === 'boolean' ? val
: ...
```

Fixed order moves `typeof val === 'boolean' ? val` before the `opts.boolean` check, so already-boolean values are returned directly.

## Environment

Bun 1.4.0, Node >=4
