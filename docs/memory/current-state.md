# Current State — 2026-08-29

**Benchmark version:** 0.1
**Cases:** 12 (6 hist + 6 synth) — 12/12 VALID
**Repositories:** 3 (task-manager, money-utils, async-queue)
**Validator:** `bun run benchmark:validate` passes
**Type check:** `bun tsc --noEmit` passes
**Repo tests:** all pass on known-good

## What exists

- `benchmark/repositories/` — 3 TS libraries, MIT, deterministic
- `benchmark/cases/{hist-*,synth-*}` — 12 cases with manifest, issue, public reproduce, private oracle, buggy artifact
- `benchmark/schema/manifest.schema.json`
- `benchmark/scripts/validate.ts` — validates buggy fails / good passes / oracle / regression / stability
- `benchmark/CASE-MATRIX.md`, `benchmark/README.md`, `benchmark/validation-report.json`
- `CHANGELOG.md` with construction evidence
- `docs/benchmark-spec.md` (spec frozen)

## Next step

Build evaluator workspace isolation (do NOT implement final agent evaluator yet beyond validation helper). Then baseline agent.

## Known limitations

- Repositories are synthetic-owned, not external OSS clones (chosen for determinism). Historical cases are reconstructed patterns, not pointers to live external issues.
- No cost/runtime tracking yet (future evaluator).

## Agent used

- Muse Spark (opencode/muse-spark-1.2-contributor-free) for construction.
