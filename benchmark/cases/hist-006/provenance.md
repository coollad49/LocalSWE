# Provenance — hist-006

- **Repository:** https://github.com/tinylibs/tinyspy (MIT)
- **License:** MIT — https://github.com/tinylibs/tinyspy/blob/main/LICENCE
- **Fixed commit:** `0684083fc217e18d21ea404b3461bde52b60fdb3` — fix: correctly spy on inherited methods (#50)
- **Buggy commit (parent):** `f42d54522dc94b2102558172ab7c0766f1d65110` — chore: release v4.0.2 (contains bug where getDescriptor only checks own + direct prototype)
- **Base version:** 4.0.2 (package.json from fixed commit, though both share version)
- **Fixed file:** `src/spyOn.ts` — walks full prototype chain to find descriptor and preserves setter on reassign
- **Buggy file:** `src/spyOn.ts` parent state
- **Retrieval:** `git archive` for fixed repository state; `git show` for buggy artifact (verified via `git show f42d545:src/spyOn.ts` vs `git show 0684083:src/spyOn.ts`)
- **Verification:** `public/reproduce.ts` checks Inherited getter setter preservation (throws on buggy, passes on fixed); `private/oracle.test.ts` has 3 tests covering basic inherited, deeply inherited, and overridden cases.
- **Reproduction:** fixed exits 0 (setter preserved), buggy exits 1 (TypeError readonly).
