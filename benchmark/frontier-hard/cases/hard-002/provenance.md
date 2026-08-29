# Provenance — hard-002

**Repository:** `qs` (https://github.com/ljharb/qs)
**Repository URL:** https://github.com/ljharb/qs
**Issue URL:** https://github.com/ljharb/qs/issues/558
**Pull Request URL:** https://github.com/ljharb/qs/pull/558
**License:** BSD-3-Clause
**License URL:** https://github.com/ljharb/qs/blob/main/LICENSE.md

**Base Commit (fixed):** `d56f48ca137b1bf6385da749b1044246ae142f19`
**Buggy Commit (parent):** `e83d321ffafb38cf210683ac31714fce6ce1c6c6`
**Fixed Commit:** `d56f48ca137b1bf6385da749b1044246ae142f19`

**Original Issue Title:** flatten a collection appended to an overflowed array
**Original Issue Date:** 2026-07-23
**Author:** Yarchik

**Description of Fix:**
- `lib/utils.js` `combine` overflow branch: previously `var newIndex = getMaxIndex(a)+1; a[newIndex]=b;` assumed `b` scalar. Fixed to `var bValues = isArray(b) ? b : [b]; var newIndex = getMaxIndex(a); for(...){ newIndex+=1; a[newIndex]=bValues[i]; }` to spread one level, matching `[].concat(a,b)` used in non-overflow path. This ensures `a=1,2,3,4,5,6&a=7,8` with `arrayLimit:5` flattens to `6:"7",7:"8"` not `6:["7","8"]`, while `a[]=1&a[]=2&a[]=3&a[]=4,5` keeps nested group as single element.

**Buggy State Reproduction:**
```
git checkout e83d321
node -e "import qs from './lib/index.js'; console.log(JSON.stringify(qs.parse('a=1,2,3,4,5,6&a=7,8',{comma:true,arrayLimit:5})))" 
# => {"a":{"0":"1","1":"2","2":"3","3":"4","4":"5","5":"6","6":["7","8"]}} (nested)
```

**Fixed State Verification:**
```
git checkout d56f48c
# same => {"a":{"0":"1","1":"2","2":"3","3":"4","4":"5","5":"6","6":"7","7":"8"}} (flat)
```

**Test Evidence:**
- Original PR added `test/parse.js` 6 new subtests covering overflow flatten, `[]=` group as single element, multiple groups, default limit, plainObjects, throwOnLimitExceeded.
- Our oracle mirrors those 8 tests.

**Retrieval Date:** 2026-08-29
**Retrieval Method:** `git archive` from pinned commits, verified `buggy→fail / fixed→pass` 3×.

**Modifications for Benchmark:**
- Repository snapshot at fixed commit `d56f48c` under `benchmark/frontier-hard/repositories/qs` (BSD-3-Clause).
- Buggy file isolated under `artifacts/buggy/lib/utils.js`.
- `tests/basic.test.ts` added for regression; `side-channel` and `es-define-property` from host `node_modules` available via `NODE_PATH` in validator/evaluator.

**License Verification:** BSD-3-Clause — permissive, documented in `LICENSE.md`, compatible with benchmark inclusion.
