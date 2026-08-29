# Progress — Evaluator v0

**Date:** 2026-08-29
**Benchmark:** v0.4 FROZEN `sha256:cead5c6e50fb88d367729ded45f77eb8375320953549e8ff41649731598e4b9e`
**Previous:** baseline-v0 (frozen)
**Current:** evaluator-v0 (frozen, this document)
**Next:** agent-v1/v2 experiments (use evaluator for VFR)

## Goal

Build deterministic evaluation layer that turns `patch.diff` into executable evidence and verdict (`verified|agent_failure|false_confidence|regression_failure`) without LLM, without mutating benchmark, with benchmark identity check.

## What was built

- `src/evaluator/types.ts`, `patchValidator.ts`, `exec.ts`, `isolation.ts`, `verdict.ts`, `benchmarkIdentity.ts`, `aggregation.ts`, `Evaluator.ts`
- `src/cli/evaluate.ts` (CLI), `package.json` scripts `evaluate`/`evaluator:test`, `vitest.config.ts` include updated
- `src/evaluator/tests/` 31 tests (patch, verdict, exec, integration, isolation, aggregation)
- `docs/decisions/evaluator-v0.md` (architecture, ladder, taxonomy, isolation, security, determinism, VFR)
- `docs/memory/current-state.md` updated, `CHANGELOG.md` 0.5.0, `benchmark/validation-report.json` unchanged (timestamp only, reverted)

## Verification ladder implemented

```
Patch Apply (git apply --check→apply, 10s, empty=pass)
  → Reproduction (public/reproduce.ts, bun run→tsx, 15s, exit 0=pass)
  → Oracle (private/oracle.test.ts, bun test→vitest, 20s, opaque)
  → Regression (tests/, bun test→vitest, 30s)
  → Verdict (verified / agent_failure / false_confidence / regression_failure)
```

Short-circuit documented; `false_confidence` preferred over `regression_failure` when oracle already failed.

## Evidence

- `bun run check-types` 0, `bun run benchmark:check-types` 0
- `bun run benchmark:validate` 12/12 VALID `cead5c...`
- `bun run test` 25 files 145 tests (19 benchmark + 6 evaluator) — also `npm test`
- Manual smoke 4 verdicts + error: `empty→VERIFIED`, `buggy→AGENT_FAILURE`, `partial→FALSE_CONFIDENCE`, `regression→REGRESSION_FAILURE`, `traversal→PATCH_TRAVERSAL`
- Mock baseline `BASELINE_MOCK=1 bun run baseline:run:case -- synth-001` → `bun run evaluate -- --run <runId>` → `VERIFIED` + `evaluation/result.json`
- `git status --short -- benchmark/repositories/ benchmark/cases/ benchmark/schema/` clean; `experiments/runs` ignored; temp workspaces cleaned via `mkdtemp` + `rmSync`

## Decisions kept

- Evaluator not a coding agent; no LLM, no patch text comparison, no oracle parsing.
- Benchmark read-only, evaluator isolated temp, benchmark identity checked (fingerprint travels with result).
- Aggregation minimal (VFR etc) for future V1/V2, no dashboards.

## Known limitations (deferred)

- Timeouts heuristic (configurable), no CPU/memory sandbox beyond temp workspace.
- No dashboards/charts (deferred).
- Mock baseline still trivial comments (real VFR needs API key).

## Next

Use evaluator to measure baseline VFR (36 runs if `runsPerCase=3`) and then V1/V2; do not rebuild evaluator.

## Files changed

- Added: `src/evaluator/**`, `src/cli/evaluate.ts`, `docs/decisions/evaluator-v0.md`, `docs/progress/evaluator-v0.md`
- Modified: `package.json`, `vitest.config.ts`, `docs/memory/current-state.md`, `CHANGELOG.md`

## Commit suggestion

```
feat(evaluator): deterministic verification layer v0

Implements isolated patch→verdict pipeline (reproduce/oracle/regression),
4-way verdict taxonomy, benchmark identity check, secure spawn with timeouts,
CLI (bun/npm), 31 evaluator tests, 145 total, benchmark v0.4 unchanged.
```

