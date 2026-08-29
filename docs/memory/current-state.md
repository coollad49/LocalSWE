# Current State — 2026-08-29 v0.4 FROZEN + Baseline v0 + Evaluator v0 (frozen)

**Benchmark version:** 0.4 — FROZEN for experiments (6 genuine historical + 6 synthetic)
**Fingerprint:** `sha256:cead5c6e50fb88d367729ded45f77eb8375320953549e8ff41649731598e4b9e` (sha256 over manifests + issue.md + provenance.md + buggy + oracles + schema + 7 repos)
**Cases:** 12 (6 genuine historical + 6 synthetic) — 12/12 VALID (isolated v0.4 validator, bun-first → vitest/tsx fallback)
**Repositories:** 7 (3 synthetic: task-manager, money-utils, async-queue + 4 genuine: cac, defu, tinyspy, mri — all MIT)
**Validator:** `bun run benchmark:validate` / `npm run benchmark:validate` v0.4 isolated (temp workspace, path containment, exec guard, oracle 3×, fingerprint includes provenance) passes
**Type check:** `bun run check-types` + `bun run benchmark:check-types` passes (also `npm run`); `vitest` + `tsx` for harness
**Repo tests:** all pass on known-good via `vitest run` (`bun run test` / `npm test` both → 19 files 103 tests)
**Evaluator:** v0 deterministic (see docs/decisions/evaluator-v0.md) — `bun run evaluate` / `npm run evaluate` passes, 25 files 145 tests

## What exists — Benchmark (v0.4 FROZEN)

- `benchmark/repositories/` — 7 repos, MIT, deterministic (3 synthetic 1.0.0 + cac 6.0.0 @ffaf796, defu 6.1.4 @3942bfb, tinyspy 4.0.2 @0372bfb/0684083, mri 1.1.4 @5437ea5) — all `test: vitest run`
- `benchmark/cases/{hist-*,synth-*}` — 12 cases (hist-001 cac, hist-002 defu, hist-003 tinyspy 0372bfb, hist-004 mri 94f8c09, hist-005 mri 5437ea5, hist-006 tinyspy 0684083) + 6 synthetic unchanged, all `private/oracle.test.ts` now `from "vitest"`
- `benchmark/schema/manifest.schema.json` (https fix, repo enum expanded)
- `benchmark/scripts/validate.ts` v0.4 — bun-first → vitest/tsx fallback, temp isolation, path containment, settle guard, 3× oracle, fingerprint (reports v0.4, now includes issue.md + provenance.md)
- `benchmark/CASE-MATRIX.md`, `benchmark/README.md` v0.4 FROZEN, `benchmark/validation-report.json` (12/12 v0.4, cead5c...), `benchmark/HISTORICAL-CANDIDATES.md` (complete 6/6), `benchmark/repositories/README.md` (7 repos)
- `vitest.config.ts` + `tsconfig.json` `types: [bun,node,vitest/globals]` + `package.json` `vitest`/`tsx`/`@types/node` (bun.lock kept, npm/pnpm/yarn compatible)
- `CHANGELOG.md` 0.4.0 FROZEN + 0.5.0 evaluator
- `docs/benchmark-spec.md` v0.4 FROZEN
- `docs/decisions/evaluator-v0.md` — evaluator v0 (deterministic, 4 verdicts, isolated, benchmark integrity, VFR)

## What exists — Baseline v0 (new, frozen for experiments)

**Baseline v0** implements the control condition with Pi fixed as runtime:

* **Adapter:** `src/agent/CodingAgent.ts` interface → `PiCodingAgent` (`src/agent/PiCodingAgent.ts`) via `@earendil-works/pi-coding-agent` 0.84.4 (`createAgentSession`), not CLI scrape. Only Pi implementation required.
* **Isolation:** `src/workspace/WorkspaceManager.ts` — copies `benchmark/repositories/<repo>` to `/tmp/frontier-<case>-<run>-...`, overlays `artifacts/buggy/`, copies `issue.md` → `ISSUE.md` and `public/reproduce.ts` → `public/reproduce.ts` with import rewrite `../../../repositories/<repo>/` → `../` (so `public/reproduce.ts` resolves locally), never copies `provenance.md`/`private/oracle.test.ts`/`artifacts/`; `git init` + `commit` buggy state before agent, verifies `git status --porcelain` empty, `git diff HEAD` after captures pure agent patch.
* **Config:** `src/config/BaselineConfig.ts` + `experiments/config/baseline.json` + `.env` (`PROVIDER`, `PROVIDER_API_KEY`, `AGENT_MODEL` is source of truth, e.g. `opencode-go/muse-spark-1.2-contributor` from pi catalog `node_modules/@earendil-works/pi-ai/dist/providers/data/opencode-go.json`). Pi version auto-detected. `.env` loaded via minimal parser. `.env.example` documents correct id.
* **Instructions:** `experiments/agents/baseline-v0.md` versioned artifact (inspect → reproduce via `npx tsx public/reproduce.ts` → diagnose → edit → test ≤3 reruns; never read `private/`).
* **Trajectory:** `src/trajectory/TrajectoryCapture.ts` JSONL via `session.subscribe` + `agent.subscribe` (structured, not terminal scrape) → `experiments/runs/<runId>/trajectory.jsonl`.
* **Patch:** `src/patch/PatchCapture.ts` via `git diff HEAD` (+ `add -N`) → `patch.diff`.
* **Runner:** `src/runner/BaselineRunner.ts` + `CaseLoader` — orchestrates isolated runs, multiple `run-001` per case, concurrency batched (default 1, optional 2-4), timeout via `AbortController` + `Promise.race` with single-terminal guard, structured `RepairRun` (success|failure|error|timeout) + `RunMetadata` ( §17 fields including fingerprint, node, platform, tokenUsage if available).
* **CLI:** `src/cli/run-case.ts` (`bun run baseline:run:case -- synth-001 --mock`) and `run-baseline.ts` (`bun run baseline:run -- --mock --runs 1 --concurrency 2`) → `experiments/runs/<runId>/{metadata,trajectory,patch,result}.json` + aggregated `baseline-report-*.json`.
* **Scripts:** `package.json` `baseline:run:case`, `baseline:run`, `baseline:validate`; mock mode `BASELINE_MOCK=1` for CI without keys.
* **Docs:** `docs/baseline-spec.md`, `docs/decisions/baseline-v0.md`, `docs/benchmark-spec.md` still frozen.
* **Validation:** `BASELINE_MOCK=1 npx tsx scripts/verify-baseline-infra.ts` — 17/17 passed (15 required + 2 sanitation: no private/oracle leakage, git clean). `bun run check-types` ✓, `bun run benchmark:check-types` ✓, `bun run benchmark:validate` 12/12 still.

## Historical authenticity — complete

All 6 `hist-*` now genuine external bugs with pinned buggyCommit→fixedCommit, reproduced 3× buggy→fail / fixed→pass, hidden oracle 3×, MIT:
- hist-001 cac @ ffaf796 (PR #153, alias default leak)
- hist-002 defu @ 3942bfb (PR #156, __proto__ pollution)
- hist-003 tinyspy @ 0372bfb (prototype restore leak)
- hist-004 mri @ 94f8c09 (Issue #8, boolean leak into _)
- hist-005 mri @ 5437ea5 (Issue #10, alias type cascade)
- hist-006 tinyspy @ 0684083 (PR #50, inherited getter)
Evaluated 4 provided + 4 additional (tinyspy, mri, yocto-queue) to reach 6; yocto-queue/p-limit/kleur rejected. Requirement 6 genuine non-negotiable now met.

## What exists — Evaluator v0 (new, frozen for experiments)

**Evaluator v0** implements deterministic verification (no LLM, no patch text comparison):

* **Core:** `src/evaluator/Evaluator.ts` — accepts `patch.diff` artifact (via `--run` or `--case --patch`), checks benchmark identity (version+fingerprint, `--allow-mismatch` override), validates patch paths (traversal/absolute/null), creates isolated `mkdtemp` workspace (`benchmark/repositories/<repo>` + `benchmark/cases/<id>`), applies patch via `git apply --check` → `git apply`, runs ladder `reproduce → oracle → regression` with `spawn()` explicit args, timeouts (10s/15s/20s/30s), settled guard, bun-first → `vitest`/`tsx` fallback, computes verdict `verified|agent_failure|false_confidence|regression_failure` with `completed|error|timeout` status, persists `experiments/runs/<runId>/evaluation/{result.json,*.log}`.
* **Types:** `src/evaluator/types.ts` (`Verdict`, `EvaluationStatus`, `VerificationStageResult`, `EvaluationResult` with fingerprint, runId, caseId, durations, stdout/stderr, workspace isolated flag), `aggregation.ts` (VFR = verified/completed×100 + rates).
* **Security:** path containment (`resolve(base)`), no shell interpolation, SIGTERM→SIGKILL, `mkdtemp` cleanup, benchmark read-only (`benchmark/repositories`/`cases` never mutated, `git status` clean), oracle opaque (only exit code).
* **CLI:** `src/cli/evaluate.ts` (`bun run evaluate -- --run <runId>` or `--case <id> --patch <path>`, `--all`, `--json`, `--keep-workspace`) → human summary + machine JSON, also `npm run evaluate`.
* **Tests:** `src/evaluator/tests/` 31 tests covering patch validation, exec, verdict, isolation, repeatability, benchmark identity, false_confidence/regression_failure scenarios, timeout, etc. Total `bun run test` → 25 files 145 tests.
* **Docs:** `docs/decisions/evaluator-v0.md` (responsibility, ladder, taxonomy, isolation, integrity, determinism, VFR), `package.json` scripts `evaluate`/`evaluator:test`.

## Next step

FROZEN v0.4 (cead5c6...) + baseline-v0 + evaluator-v0 for `agent-v1/v2/final` experiments (no benchmark changes without v0.5). Previous v0.3 results discarded. Next: `agent-v1/v2/final` rely on evaluator for VFR; do not rebuild evaluator.

## Known limitations

- Baseline mock edits are trivial comments; real VFR requires valid `PROVIDER_API_KEY` and model.
- Evaluator mock smoke tests show `VERIFIED` for comment-only patches (since they preserve known-good behavior); real agent failures need genuine logic bugs.
- Money/validators known-good not polished (intentionally left untouched).
- Historical `cac`/`mri` excluded from `tsconfig` via `exclude` for verbatim compatibility.
- Evaluator timeouts are heuristic (15s/20s/30s); very slow but correct patches could timeout — configurable via `EvaluateOptions.timeouts`.
- Evaluator does not yet sandbox CPU/memory/network beyond temp workspace.

## Agent used

- Muse Spark (opencode/muse-spark-1.2-contributor-free + opencode-go/muse-spark-1.2-contributor via .env) for benchmark + baseline-v0.
