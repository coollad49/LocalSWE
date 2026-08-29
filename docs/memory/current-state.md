# Current State — 2026-08-29 v0.3 (6 genuine historical — requirement met, vitest compatible)

**Benchmark version:** 0.3 (6 genuine historical + 6 synthetic, FROZEN for experiments)
**Fingerprint:** `sha256:ef363fc1663524bb075e83635861df370aa573392d7470918376c48d5195b0aa`
**Cases:** 12 (6 genuine historical + 6 synthetic) — 12/12 VALID (isolated v0.3 validator, bun-first → vitest/tsx fallback)
**Repositories:** 7 (3 synthetic: task-manager, money-utils, async-queue + 4 genuine: cac, defu, tinyspy, mri — all MIT)
**Validator:** `bun run benchmark:validate` / `npm run benchmark:validate` v0.3 isolated (temp workspace, path containment, exec guard, oracle 3×) passes
**Type check:** `bun run check-types` + `bun run benchmark:check-types` passes (also `npm run`); `vitest` + `tsx` for harness
**Repo tests:** all pass on known-good via `vitest run` (`bun run test` / `npm test` both → 19 files 103 tests)

## What exists

- `benchmark/repositories/` — 7 repos, MIT, deterministic (3 synthetic 1.0.0 + cac 6.0.0 @ffaf796, defu 6.1.4 @3942bfb, tinyspy 4.0.2 @0372bfb/0684083, mri 1.1.4 @5437ea5) — all `test: vitest run`
- `benchmark/cases/{hist-*,synth-*}` — 12 cases (hist-001 cac, hist-002 defu, hist-003 tinyspy 0372bfb, hist-004 mri 94f8c09, hist-005 mri 5437ea5, hist-006 tinyspy 0684083) + 6 synthetic unchanged, all `private/oracle.test.ts` now `from "vitest"`
- `benchmark/schema/manifest.schema.json` (https fix, repo enum expanded)
- `benchmark/scripts/validate.ts` v0.3 — bun-first → vitest/tsx fallback, temp isolation, path containment, settle guard, 3× oracle, fingerprint (reports v0.3)
- `benchmark/CASE-MATRIX.md`, `benchmark/README.md` v0.3 (fingerprint ef363...), `benchmark/validation-report.json` (fingerprint ef363..., 12/12), `benchmark/HISTORICAL-CANDIDATES.md` (complete 6/6), `benchmark/repositories/README.md` (7 repos)
- `vitest.config.ts` + `tsconfig.json` `types: [bun,node,vitest/globals]` + `package.json` `vitest`/`tsx`/`@types/node` (bun.lock kept, npm/pnpm/yarn compatible)
- `cac/src/CAC.ts` + `Command.ts` `import type` patches + `@ts-nocheck` + `mri.d.ts`
- `CHANGELOG.md` 0.3.0 + 0.3 compat
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
