# qs combine overflow flatten bug

**Repository:** `qs` (`ljharb/qs`)
**Component:** `lib/utils.js` — `combine` function, overflow handling
**Related PR:** https://github.com/ljharb/qs/pull/558
**Commit:** fixed `d56f48c`, buggy parent `e83d321`

## Problem

When `arrayLimit` is exceeded, `qs` converts arrays into overflow objects (e.g., `{0:"1",1:"2",...}`). If a later duplicate key contributes additional values via `comma: true`, the `combine` function incorrectly nests the entire second collection under a single index instead of spreading it.

Example:

```js
import qs from "./lib/index.js";

const result = qs.parse("a=1,2,3,4,5,6&a=7,8", { comma: true, arrayLimit: 5 });
console.log(result);
// Expected (fixed): { a: { 0:"1", 1:"2", 2:"3", 3:"4", 4:"5", 5:"6", 6:"7", 7:"8" } }
// Actual (buggy):   { a: { 0:"1", 1:"2", 2:"3", 3:"4", 4:"5", 5:"6", 6:["7","8"] } }
//                                                              ^ nested array, should be flattened
```

The non-overflow path correctly uses `[].concat(a,b)` to spread, but the overflow branch assumed `b` is always a scalar and did `a[newIndex] = b`.

This also affects `plainObjects` mode and interactions with `arrayLimit` thresholds:

```js
// With plainObjects
qs.parse("a=1,2,3,4,5,6&a=7,8", { comma: true, arrayLimit: 5, plainObjects: true })
// Fixed: { __proto__:null, a:{ __proto__:null, 0:"1",...,7:"8" } }
// Buggy: nested group under 6

// Cumulative overflow with default arrayLimit (20)
const values = Array.from({length:21}, (_,i)=>String(i)); // 0..20 => exceeds default 20
qs.parse("a="+values.join(",")+"&a=x,y", { comma: true })
// Fixed: { a:{0:"0",...,20:"20",21:"x",22:"y"} }
// Buggy: { a:{0:"0",...,20:"20",21:["x","y"]} }
```

## Expected Behavior

- When `a` is already an overflow object and `b` is appended, `b` should be spread **one level** before assigning, matching the non-overflow ` [].concat(a,b)` behavior.
- If `b` is an array (e.g., a comma-split group `["7","8"]`), its elements should land at successive indices.
- If `b` is a scalar (e.g., `"7"`), it should land at `maxIndex+1`.
- A `[]=` comma group (e.g., `a[]=1,2`) that is itself an array should remain a single nested element when appended to an overflowed `a`, not double-nested — the overflow branch's one-level spread preserves this distinction because `b` in that context is `["1","2"]` wrapped as a single element vs flat.

Formally, fixed code does:

```js
var bValues = isArray(b) ? b : [b];
var newIndex = getMaxIndex(a);
for (var i=0; i<bValues.length; ++i) {
  newIndex += 1;
  a[newIndex] = bValues[i];
}
setMaxIndex(a, newIndex);
```

## Actual Behavior

Buggy code does:

```js
var newIndex = getMaxIndex(a) + 1;
a[newIndex] = b; // nests array b under one index
setMaxIndex(a, newIndex);
```

## Reproduction

```js
import qs from "../../../repositories/qs/lib/index.js";

const result = qs.parse("a=1,2,3,4,5,6&a=7,8", { comma: true, arrayLimit: 5 });
console.log(JSON.stringify(result));
// Buggy: {"a":{"0":"1","1":"2","2":"3","3":"4","4":"5","5":"6","6":["7","8"]}}
// Fixed: {"a":{"0":"1","1":"2","2":"3","3":"4","4":"5","5":"6","6":"7","7":"8"}}

const ok = JSON.stringify(result) === JSON.stringify({ a:{0:"1",1:"2",2:"3",3:"4",4:"5",5:"6",6:"7",7:"8"}});
console.log(ok ? "PASS" : "FAIL");
```

## Environment

- Node 22 / Bun 1.4.0
- `qs` 6.15.3 with `comma: true` and `arrayLimit` handling
- No network, deterministic

## Notes

- The fix is in `lib/utils.js` `combine` function's overflow branch.
- Do not assume `b` is always a scalar; handle array vs scalar.
- Check `lib/parse.js` for how `combine` is invoked, but primarily fix `utils.js`.
- Regression suite is in `benchmark/frontier-hard/repositories/qs/tests` (vitest).
