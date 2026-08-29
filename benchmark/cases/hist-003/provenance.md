# Provenance — hist-003

- **Repository:** https://github.com/tinylibs/tinyspy (MIT)
- **License:** MIT — https://github.com/tinylibs/tinyspy/blob/main/LICENCE
- **Fixed commit:** `0372bfb952fe761742f1b96165c3b6a25d499588` — fix: remove own properties if method defined on prototype
- **Buggy commit (parent):** `0684083fc217e18d21ea404b3461bde52b60fdb3` — fix: correctly spy on inherited methods (#50) (includes prior fix but not prototype leak fix)
- **Base version:** 4.0.2 (package.json from fixed commit)
- **Fixed files:** `src/spyOn.ts` (getDescriptor returns [obj, descriptor], restore deletes own property if original not own), `src/utils.ts` (defineValue adds configurable:true writable:true)
- **Buggy files:** `src/spyOn.ts`, `src/utils.ts` (parent state)
- **Retrieval:** `git archive` from fixed commit for repository; `git show` for buggy artifacts (verified via `git show 0372bfb` and `git show 0684083`)
- **Verification:** `public/reproduce.ts` checks prototype leak; `private/oracle.test.ts` has 3 tests covering single restore, multiple cycles, and prototype ownership.
- **Reproduction:** fixed state exits 0 (no leak), buggy state exits 1 (leak detected).
