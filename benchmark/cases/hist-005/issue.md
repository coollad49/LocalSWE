# Issue: Alias defaults do not preserve string type (mri)

**Repository:** `lukeed/mri`
**Component:** `lib/index.js:defaults handling (alias loop)`
**Fixed commit:** `5437ea5 fix: ensure default types cascade to alibi`
**Buggy state:** `40051e6` (1.1.4) / blob `3a9e1c688f3b5c02cc10f1776febb34138035df1`
**Issue:** https://github.com/lukeed/mri/issues/10

## Description

When an option has a string default (e.g. `default: {arg:''}`) and an alias is defined (e.g. `alias:{a:['arg']}`), the parser should treat both `a` and `arg` as string-typed keys. In the buggy version, only the base key `arg` is pushed into `opts.string`; its alias `a` is not. Consequently, parsing `['-a','01']` coerces `"01"` to the number `1` (via `(x=+val,x*0===0)?x:val`) instead of preserving the string.

## Steps to Reproduce

```js
import mri from "./lib/index.js";

console.log(mri(['-a','01'], {alias:{a:['arg']}, default:{arg:''}}));
// buggy: {"_":[],"a":1,"arg":1}  (numbers)
// fixed: {"_":[],"a":"01","arg":"01"} (strings)

console.log(mri(['-a','01'], {alias:{arg:['a']}, default:{arg:''}}));
// buggy: {"_":[],"a":1,"arg":1}
// fixed: {"_":[],"a":"01","arg":"01"}
```

## Expected Behavior

- `mri(['-a','01'], {alias:{a:['arg']}, default:{arg:''}})` should return `{"_":[],"arg":"01","a":"01"}` with both values as strings `"01"`.
- `mri(['--arg','01'], {alias:{arg:['a']}, default:{a:''}})` should also preserve `"01"` as string.
- All alias variants where the default defines a string type for either the key or its alias must preserve string types for both.

## Root Cause

Buggy defaults handling:

```js
for (k in opts.default) {
  opts.alias[k] = opts.alias[k] || [];
  (opts[typeof opts.default[k]] || []).push(k);
}
```

Only pushes `k` itself, not its alias entries. Fixed code:

```js
for (k in opts.default) {
  name = typeof opts.default[k];
  arr = opts.alias[k] = opts.alias[k] || [];
  if (opts[name] !== void 0) {
    opts[name].push(k);
    for (i=0; i < arr.length; i++) opts[name].push(arr[i]);
  }
}
```

This cascades the type (`string`/`boolean`) to each alias. Similar fix also guards `opts[name] !== void 0`.

## Environment

Bun 1.4.0, Node >=4
