# Provenance — hist-005

- Repository: `lukeed/mri`
- Source URL: `https://github.com/lukeed/mri`
- License: MIT (`https://opensource.org/licenses/MIT`)
- Bug: Alias defaults do not preserve string type (numeric coercion)

## Commits

- Buggy commit: `40051e689d80f77136ac990dafa2f27cdca48086` (1.1.4 tag, blob `3a9e1c688f3b5c02cc10f1776febb34138035df1` for `lib/index.js`)
- Fixed commit: `5437ea5cd9afcfcfe50c1c316aff990cac21231b` (`fix: ensure default types cascade to alibi`, closes #10, blob `25fbf07329d2a8e53d0a2ed91ac3c3257b650684`)
- Known-good repository state: `5437ea5` (1.1.4, includes both boolean and alias fixes)
- Parent of fix: `40051e6` correctly reproduces buggy alias behavior; overlaying its blob over `5437ea5` fixed repo reintroduces only alias bug (boolean already fixed in both).
- Retrieval: `git clone https://github.com/lukeed/mri && git cat-file -p <blob>`
- Diff: `lib/index.js:47-52` alias loop — 2 lines replaced with 8-line cascade

## Reproduction

- Buggy: `mri(['-a','01'], {alias:{a:['arg']}, default:{arg:''}})` => `{"_":[],"a":1,"arg":1}` numbers
- Fixed: same => `{"_":[],"a":"01","arg":"01"}` strings
- Additional discriminative variants: `['--arg','01'] alias arg->a default a''` and `['-a','01'] alias arg->a default arg''`

## Verification

- Reproduction (`public/reproduce.ts`) checks primary alias case preserves `"01"` as string.
- Oracle (`private/oracle.test.ts`) covers all 5 deepEqual cases added in `5437ea5:test/index.js:93-140`.
- Regression: `bun test tests/` (mri regression suite) must pass on known-good.

## License Retrieval

- `git show 5437ea5:license.md` — MIT

## Notes

Known-good at `5437ea5` contains both fixes (boolean `94f8c09` + alias `5437ea5`). Buggy overlay for this case is `3a9e1c6` (parent) which retains boolean fix but lacks alias cascade.
