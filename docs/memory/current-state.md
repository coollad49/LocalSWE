# Current State — 2026-08-29 v0.2 (integrity pass)

**Benchmark version:** 0.2 (FROZEN pending final historical review)
**Fingerprint:** `sha256:42a6ef0ca73f3acb725fe316320715e5c7b2539b76dde855f6466adc19253ee7`
**Cases:** 12 (6 synthetic-pattern labeled historical pending real replacement + 6 synthetic) — 12/12 VALID (isolated v0.2)
**Repositories:** 3 (task-manager, money-utils, async-queue benchmark-owned, MIT)
**Validator:** `bun run benchmark:validate` v0.2 isolated (temp workspace, path containment, exec guard, oracle 3×) passes
**Type check:** `bun run check-types` + `bun run benchmark:check-types` passes
**Repo tests:** all pass on known-good

## What exists

- `benchmark/repositories/` — 3 TS libs, MIT, deterministic
- `benchmark/cases/{hist-*,synth-*}` — 12 cases (manifest, issue, provenance, public reproduce, private oracle, buggy artifact)
- `benchmark/schema/manifest.schema.json` (https fix)
- `benchmark/scripts/validate.ts` v0.2 — temp isolation, path containment, settle guard, 3× oracle, fingerprint
- `benchmark/CASE-MATRIX.md`, `benchmark/README.md`, `benchmark/validation-report.json` (v0.2 with fingerprint + stability), `benchmark/HISTORICAL-CANDIDATES.md`
- `tsconfig.benchmark.json` + `package.json:benchmark:check-types`
- `CHANGELOG.md` 0.2.0 with evidence + historical evaluation
- `docs/benchmark-spec.md` (spec frozen)

## Historical authenticity — update

Current `hist-*` are synthetic-pattern (honest labeling in `CASE-MATRIX.md` + `README.md`). Evaluated 4 provided candidates (`defu`, `cac`, `p-limit`, `kleur`) vs independent: `cac@ffaf796` strongest, `defu@3942bfb` strong alternative, `p-limit` trivial/flaky, `kleur` fragile. Not enough for 6 without further search. **Decision:** Freeze v0.2 with honest pattern labeling; incrementally replace one-by-one as each real case passes strict acceptance. See `benchmark/HISTORICAL-CANDIDATES.md`.

## Next step

Add first genuine historical case (`cac@ffaf796`) as candidate (not yet active) then evaluator workspace builder. Do NOT move to final evaluator until historical provenance reviewed. No repo/matrix changes during `baseline/agent-v1` after freeze.

## Known limitations (v0.2)

- Historical cases still synthetic-pattern (reported honestly, 1 strong real candidate ready)
- No cost/runtime tracking yet (future evaluator)
- Money/validators known-good not polished (intentionally left untouched per instruction)

## Agent used

- Muse Spark (opencode/muse-spark-1.2-contributor-free) for construction + integrity pass.
