# Current State — 2026-08-29 v0.3 (6 genuine historical — requirement met)

**Benchmark version:** 0.3 (6 genuine historical + 6 synthetic, FROZEN for experiments)
**Fingerprint:** `sha256:6938f031bedd5d120dbd7aacb8274717f1e3d00fa5928aa98216dc1c0e772b0c`
**Cases:** 12 (6 genuine historical + 6 synthetic) — 12/12 VALID (isolated v0.2 validator)
**Repositories:** 7 (3 synthetic: task-manager, money-utils, async-queue + 4 genuine: cac, defu, tinyspy, mri — all MIT)
**Validator:** `bun run benchmark:validate` v0.2 isolated (temp workspace, path containment, exec guard, oracle 3×) passes
**Type check:** `bun run check-types` + `bun run benchmark:check-types` passes (cac @ts-nocheck)
**Repo tests:** all pass on known-good

## What exists

- `benchmark/repositories/` — 7 repos, MIT, deterministic (3 synthetic 1.0.0 + cac 6.0.0 @ffaf796, defu 6.1.4 @3942bfb, tinyspy 4.0.2 @0372bfb/0684083, mri 1.1.4 @5437ea5)
- `benchmark/cases/{hist-*,synth-*}` — 12 cases (hist-001 cac, hist-002 defu, hist-003 tinyspy 0372bfb, hist-004 mri 94f8c09, hist-005 mri 5437ea5, hist-006 tinyspy 0684083) + 6 synthetic unchanged
- `benchmark/schema/manifest.schema.json` (https fix, repo enum expanded)
- `benchmark/scripts/validate.ts` v0.2 — temp isolation, path containment, settle guard, 3× oracle, fingerprint (still v0.2 validator, reports v0.3 benchmark)
- `benchmark/CASE-MATRIX.md`, `benchmark/README.md` v0.3, `benchmark/validation-report.json` (fingerprint 6938f..., 12/12), `benchmark/HISTORICAL-CANDIDATES.md` (complete 6/6), `benchmark/repositories/README.md` (7 repos)
- `tsconfig.benchmark.json` + `package.json:benchmark:check-types` + `cac/src/*.ts` @ts-nocheck + `cac/src/mri.d.ts`
- `CHANGELOG.md` 0.2.0 + 0.3 pending
- `docs/benchmark-spec.md` (spec frozen)

## Historical authenticity — complete

All 6 `hist-*` now genuine external bugs with pinned buggyCommit→fixedCommit, reproduced 3× buggy→fail / fixed→pass, hidden oracle 3×, MIT:
- hist-001 cac @ ffaf796 (PR #153, alias default leak)
- hist-002 defu @ 3942bfb (PR #156, __proto__ pollution)
- hist-003 tinyspy @ 0372bfb (prototype restore leak)
- hist-004 mri @ 94f8c09 (Issue #8, boolean leak into _)
- hist-005 mri @ 5437ea5 (Issue #10, alias type cascade)
- hist-006 tinyspy @ 0684083 (PR #50, inherited getter)
Evaluated 4 provided + 4 additional (tinyspy, mri, yocto-queue) to reach 6; yocto-queue/p-limit/kleur rejected as weak/trivial/fragile. See `benchmark/HISTORICAL-CANDIDATES.md` for ranked evidence. Requirement 6 genuine non-negotiable now met.

## Next step

FROZEN v0.3 for `baseline/agent-v1/v2/final` experiments (no benchmark changes). Build evaluator workspace builder then baseline agent.

## Known limitations (v0.3)

- No cost/runtime tracking yet (future evaluator)
- Money/validators known-good not polished (intentionally left untouched per instruction: negative rounding, date rollover not fixed)
- cac repo uses @ts-nocheck for verbatimModuleSyntax compatibility (historical code, not synthetic)

## Agent used

- Muse Spark (opencode/muse-spark-1.2-contributor-free) for construction + integrity pass.
