# Provenance — hist-004

- Repository: `lukeed/mri`
- Source URL: `https://github.com/lukeed/mri`
- License: MIT (`https://opensource.org/licenses/MIT`)
- Bug: Boolean defaults leak numeric values into `_` due to `toVal` order

## Commits

- Buggy commit: `a4759d51a5a5c86b902cf9d5484654fdfb1e2750` (parent of fix; blob `b4d8a0a00016a1bb360e204d484f630bbbf7a017` for `lib/index.js`)
- Fixed commit: `94f8c0941088716be3c86b850a40dedbe0a2e520` (`fix: check for boolean value before boolean cast`, closes #8, blob `3a9e1c688f3b5c02cc10f1776febb34138035df1`)
- Known-good repository state: `5437ea5cd9afcfcfe50c1c316aff990cac21231b` (`1.1.4`, includes this fix + later alias fix)
- Retrieval: `git clone https://github.com/lukeed/mri` and `git cat-file -p <blob>`
- Diff: `lib/index.js:toVal` 2-line swap — `typeof val === 'boolean' ? val` moved before `!!~opts.boolean.indexOf(key)` branch

## Reproduction

- Buggy: `mri(['-t'], {default:{t:true}})` => `{"_":[1],"t":true}`
- Fixed: `mri(['-t'], {default:{t:true}})` => `{"_":[],"t":true}`

## Verification

- Reproduction (`public/reproduce.ts`) checks `_` empty and `t === true` boolean.
- Oracle (`private/oracle.test.ts`) covers `flag boolean with default`, `with alias`, `with string default` from `test/index.js` added at `a4759d5` and `94f8c09`.
- Regression: `bun test tests/` (mri regression suite) must pass on known-good.

## License Retrieval

- `git show 94f8c09:license.md` / `5437ea5:license.md` — MIT

## Notes

Known-good at `5437ea5` (1.1.4) is later than `94f8c09` (2018) but still contains the boolean fix, so overlaying buggy `b4d8a0a` over `5437ea5` correctly reintroduces only the boolean bug for this case (alias bug also present in that blob but does not affect the boolean reproduce).
