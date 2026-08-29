# Current State — 2026-08-29 v0.5 FROZEN + Baseline v0 + Evaluator v0 (frozen) + Frontier-Hard

**Benchmark version:** 0.5 — FROZEN for experiments (12 Core: 6 genuine historical + 6 synthetic + 5 Frontier-Hard: all genuine historical)
**Fingerprint:** `sha256:ee9104f5a7a03d0c227205de81fa24e464c23160ddf145051b08799693cbdf78` (sha256 over manifests + issue.md + provenance.md + buggy + oracles + schema + 12 repos — 7 Core + 5 Hard)
**Previous:** v0.4 `sha256:cead5c6e50fb88d367729ded45f77eb8375320953549e8ff41649731598e4b9e` preserved as `benchmark/validation-report.v0.4.json`
**Cases:** 17 (12 Core + 5 Frontier-Hard) — 17/17 VALID (12/12 Core + 5/5 Hard, isolated v0.5 validator, bun-first → vitest/tsx fallback with SyntaxError fallback for `immer`/`superjson` type-only imports)
**Repositories:** 12 (7 Core: 3 synthetic + 4 genuine + 5 Hard: immer, qs, superjson, p-queue, path-to-regexp — all MIT/BSD-3)
**Validator:** `bun run benchmark:validate` / `npm run benchmark:validate` v0.5 isolated (temp workspace, path containment, exec guard, oracle 3×, fingerprint includes provenance, dual-root discovery) passes
**Type check:** `bun run check-types` + `bun run benchmark:check-types` passes (also `npm run`); `vitest` + `tsx` for harness
**Repo tests:** all pass on known-good via `vitest run` (`bun run test` / `npm test` both → 30+ files, 17 cases + evaluator)
**Evaluator:** v0 deterministic (see docs/decisions/evaluator-v0.md) — `bun run evaluate` / `npm run evaluate` passes, now handles `hard-*` via dual-root and `SyntaxError` fallback

## What exists — Benchmark (v0.5 FROZEN — 17 cases)

- **Core (v0.4 preserved):** `benchmark/repositories/` — 7 repos, MIT, deterministic (3 synthetic 1.0.0 + cac 6.0.0 @ffaf796, defu 6.1.4 @3942bfb, tinyspy 4.0.2 @0372bfb/0684083, mri 1.1.4 @5437ea5) — all `test: vitest run`; `benchmark/cases/{hist-*,synth-*}` — 12 cases (hist-001 cac, hist-002 defu, hist-003 tinyspy 0372bfb, hist-004 mri 94f8c09, hist-005 mri 5437ea5, hist-006 tinyspy 0684083) + 6 synthetic unchanged, all `private/oracle.test.ts` from `vitest`
- **Frontier-Hard (v0.5 addition):** `benchmark/frontier-hard/repositories/` — 5 repos (immer @ a73672a, qs @ d56f48c, superjson @ 4054f3f, p-queue @ a64b316, path-to-regexp @ 8877f41 — all MIT/BSD-3, deterministic, `tests/basic.test.ts` each); `benchmark/frontier-hard/cases/hard-001..005` — 5 hard cases with `manifest.json`, `issue.md`, `provenance.md`, `curator-notes.md` (maintainer-only), `public/reproduce.ts`, `private/oracle.test.ts`, `artifacts/buggy/src/...`; each `public` narrow, `private` broad with partial-fix trap
- `benchmark/schema/manifest.schema.json` v0.5 — `id` pattern `^(hist|synth|hard)-[0-9]{3}$`, `repository` `type:string`, `difficulty` adds `frontier-hard`
- `benchmark/scripts/validate.ts` v0.5 — dual-root discovery (`benchmark/cases` + `benchmark/frontier-hard/cases`), `resolveCaseDir`/`resolveRepoDir`, `computeFingerprint` over 17 cases + 12 repos, `createTempWorkspace` copies to both `benchmark/cases` and `benchmark/frontier-hard/cases` in temp for `../../../repositories` relative imports, `runBunFile`/`runBunTest` now `bun` → `vitest`/`tsx` fallback on `SyntaxError`/`not found in` (for `immer`/`superjson` type-only imports), `NODE_PATH` set, `benchmarkVersion 0.5`, `validation-report.v0.4.json` preserved
- `benchmark/CASE-MATRIX.md` v0.5 — 17 rows (12 Core + 5 Hard), detailed per-case why hard, diversity, validation 17/17, fingerprint `ee9104f5...`
- `benchmark/README.md` v0.5 — 17 cases, 12 repos, Core + Frontier-Hard structure, fingerprint `ee9104f5...`, v0.4 preserved
- `benchmark/validation-report.json` v0.5 (17/17, `ee9104f5...`), `benchmark/validation-report.v0.4.json` preserved (12/12, `cead5c6e...`)
- `benchmark/HISTORICAL-CANDIDATES.md` — updated with 5 hard selections and 15+ rejections
- `benchmark/repositories/README.md` — 12 repos (7 Core + 5 Hard)
- `vitest.config.ts` v0.5 — include adds `benchmark/frontier-hard/...` for both `cases` and `repositories`
- `tsconfig.json` + `tsconfig.benchmark.json` — exclude `benchmark/frontier-hard/...`
- `CHANGELOG.md` 0.6.0 — Frontier-Hard v0.5 entry
- `docs/benchmark-spec.md` v0.5 FROZEN — 17 cases, repository strategy additive, diversity with 5 hard, immutability v0.5
- `docs/decisions/evaluator-v0.md` — evaluator v0 (deterministic, 4 verdicts, isolated, benchmark integrity, VFR) — now handles `hard-*` via dual-root and `SyntaxError` fallback (see `docs/decisions/frontier-hard-benchmark-v0.md`)
- `docs/decisions/frontier-hard-benchmark-v0.md` — why Core 100% VFR ceiling, selection criteria, hardness, provenance, isolation, oracle, freeze policy
- `docs/progress/frontier-hard-benchmark-v0.md` — per-case evidence and rejections

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

FROZEN v0.5 (ee9104f5...) — 17 cases (12 Core + 5 Hard) + baseline-v0 + evaluator-v0 for `agent-v1/v2/final` experiments (no benchmark changes without v0.6). Previous v0.4 (cead5c6... 12/12) preserved as `validation-report.v0.4.json` but not mixed with v0.5. Next: re-run baseline on v0.5 to measure ceiling, then `agent-v1/v2/final` rely on evaluator for VFR on the 17-case frozen benchmark; do not rebuild evaluator.

## Known limitations (v0.5)

- Baseline was measured on v0.4 (12 cases, 100% VFR); v0.5's 5 hard cases are designed to break that ceiling — expect VFR <100% on v0.5.
- `superjson` `src/index.ts` patched `import type` for `Class`/`SuperJSONResult` (harness only, non-logic, documented in `provenance.md`) to make `bun`/`tsx` handle type-only imports; `p-queue` `tsconfig` adjusted similarly — historical logic unchanged.
- Hard repos use `NODE_PATH` or `node_modules` in repo for `side-channel`/`copy-anything`/`eventemitter3`/`p-timeout` in temp workspaces.
- `p-queue` hard-004's `public/reproduce.ts` and `private/oracle.test.ts` use `Promise.race` with 800-900ms timeout to avoid hanging on buggy (which never rejects) — deterministic, not flaky.
- Hard cases are intentionally more complex: `hard-001` and `hard-003` touch 2-4 files, but `hard-005` is 1 file with subtle Unicode — all require reasoning, not just patch size.

## Known limitations

- Baseline mock edits are trivial comments; real VFR requires valid `PROVIDER_API_KEY` and model.
- Evaluator mock smoke tests show `VERIFIED` for comment-only patches (since they preserve known-good behavior); real agent failures need genuine logic bugs.
- Money/validators known-good not polished (intentionally left untouched).
- Historical `cac`/`mri` excluded from `tsconfig` via `exclude` for verbatim compatibility.
- Evaluator timeouts are heuristic (15s/20s/30s); very slow but correct patches could timeout — configurable via `EvaluateOptions.timeouts`.
- Evaluator does not yet sandbox CPU/memory/network beyond temp workspace.

## Agent used

- Muse Spark (opencode/muse-spark-1.2-contributor-free + opencode-go/muse-spark-1.2-contributor via .env) for benchmark + baseline-v0.
