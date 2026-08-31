# Current State — 2026-08-31 v0.5 FROZEN + Windows Cross-Platform Fixes + Master Experiment Runner

**Benchmark version:** 0.5 — FROZEN for experiments (12 Core: 6 genuine historical + 6 synthetic + 5 Frontier-Hard: all genuine historical)
**Fingerprint:** `sha256:9d5d8138fd0f0b726e46437b544ad010cd9b70242f879f3f80c9d191b55e55cf` (sha256 over manifests + issue.md + provenance.md + buggy + oracles + schema + 12 repos — 7 Core + 5 Hard)
**Cases:** 17 (12 Core + 5 Frontier-Hard) — 17/17 VALID on Windows & Linux (isolated v0.5 validator, bun-first → direct Node `process.execPath` + `.mjs` fallback for `tsx` and `vitest` to prevent `spawn ENOENT` on Windows).
**Repositories:** 12 (7 Core: 3 synthetic + 4 genuine + 5 Hard: immer, qs, superjson, p-queue, path-to-regexp — all MIT/BSD-3)
**Validator:** `bun run benchmark:validate` passes 17/17 cases deterministically.
**Infrastructure:** `bun run scripts/verify-baseline-infra.ts` passes 17/17 checks.
**Type check:** `bun run check-types` passes strictly.
**Evaluator:** v1 deterministic with pricing, metrics, comparison, and reporting.
**Agent V1:** High-performance autonomous SWE agent with workspace `node_modules` linking, continuous tool execution loop (diagnose → reproduce → edit → verify), passive telemetry extraction, active verification gating, and zero artificial prompt turn delays.
**Master Runner:** `bun run experiment` (`src/cli/run-experiment.ts`) orchestrates Baseline v0 vs Agent V1 across benchmark cases, supports `--reuse-baseline` to leverage completed baseline runs, streams real-time tool execution logs across concurrent workers, executes Evaluator, and outputs comparative delta table and reports in a single command.

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

## What exists — Evaluator v1 Reporting & Metrics Upgrade (extends v0, frozen)

**Evaluator v1** extends v0 without changing the verification ladder or verdict taxonomy — adds pricing, per-run metrics, aggregation, case breakdown, comparison, and machine-readable reporting:

* **Pricing:** `experiments/config/pricing.json` `2026-08-30-snapshot` (opencode-go/muse-spark-1.2-contributor `$0.15`/M in, `$0.60`/M out), `src/evaluator/pricing.ts` (`ModelPricing`, `loadPricingConfig`, `computeCost` guardrail `inputTokens==null → unavailable`, `resolveCostWithProviderPreference`).
* **Metrics:** `src/evaluator/metrics.ts` (`median`/`average`, `extractRunMetrics` with V1 precedence `v1-state.json` → `metadata.v1.iterationCount` → trajectory → `1`, token extraction from `metadata.tokenUsage`/trajectory, `RunMetrics`/`RunCost` on `EvaluationResult`).
* **Aggregation:** `src/evaluator/aggregation.ts` now `computeAgentMetrics`/`computeAllAgentMetrics`/`computeCaseBreakdown`/`computeComparison`/`computeFailureAnalysis`/`computeValidRunMetrics` (VFR overall + `vfrValid`, repair rates, efficiency medians/averages, timeout rate, case-level VFR valid, delta in `pp`).
* **Report:** `src/evaluator/report.ts` `buildExperimentReport` → `experiments/reports/<id>/report.json|report.md|summary.json` (primary source of truth) + compat `evaluations/<id>/`, `generateReportMarkdown`/`generateSummaryJson` (small-sample disclaimer, both denominators, failure categories never merged, cost methodology, limitations).
* **CLI:** `src/cli/evaluate.ts` supports `--force/--no-cache` (re-evaluate even if cached), `--pricing <path>`, `--allow-cross-benchmark`, preserves cached runs where fingerprint matches, rejects mixed fingerprints unless `allowCrossBenchmark`/`allowMismatch` via `process.exitCode=2; throw` (Bun async exit documented in `docs/experiments/README.md`), writes dual dirs + `cases/<runId>.json`.
* **Tests:** `pricing.test.ts` (guardrail), `metrics.test.ts` (V1 precedence, fallback `1`), `aggregation.v1.test.ts` (VFR, rates, medians, null cost, case breakdown, V0 vs V1 delta, zero/all-fail/infra/mixed/3-run variance, determinism, summary) — total `bun test` 43 files 274 tests. `package.json` adds `evaluate:experiment`.
* **Docs:** `docs/decisions/evaluator-v0.md` addendum, `docs/experiments/README.md`, `CHANGELOG.md` 0.7.1.

## What exists — Evaluator v0 (frozen, superseded by v1 upgrade above)

* **Core:** `src/evaluator/Evaluator.ts` — accepts `patch.diff` artifact (via `--run` or `--case --patch`), checks benchmark identity (version+fingerprint, `--allow-mismatch` override), validates patch paths (traversal/absolute/null), creates isolated `mkdtemp` workspace (`benchmark/repositories/<repo>` + `benchmark/cases/<id>`), applies patch via `git apply --check` → `git apply`, runs ladder `reproduce → oracle → regression` with `spawn()` explicit args, timeouts (10s/15s/20s/30s), settled guard, bun-first → `vitest`/`tsx` fallback, computes verdict `verified|agent_failure|false_confidence|regression_failure` with `completed|error|timeout` status, persists `experiments/runs/<runId>/evaluation/{result.json,*.log}`.
* **Types:** `src/evaluator/types.ts` (`Verdict`, `EvaluationStatus`, `VerificationStageResult`, `EvaluationResult` with fingerprint, runId, caseId, durations, stdout/stderr, workspace isolated flag), `aggregation.ts` (VFR = verified/completed×100 + rates).
* **Security:** path containment (`resolve(base)`), no shell interpolation, SIGTERM→SIGKILL, `mkdtemp` cleanup, benchmark read-only (`benchmark/repositories`/`cases` never mutated, `git status` clean), oracle opaque (only exit code).
* **CLI:** `src/cli/evaluate.ts` (`bun run evaluate -- --run <runId>` or `--case <id> --patch <path>`, `--all`, `--json`, `--keep-workspace`) → human summary + machine JSON, also `npm run evaluate`.
* **Tests:** `src/evaluator/tests/` 31 tests covering patch validation, exec, verdict, isolation, repeatability, benchmark identity, false_confidence/regression_failure scenarios, timeout, etc. Total `bun run test` → 25 files 145 tests.
* **Docs:** `docs/decisions/evaluator-v0.md` (responsibility, ladder, taxonomy, isolation, integrity, determinism, VFR), `package.json` scripts `evaluate`/`evaluator:test`.

## Agent V1 (new, frozen for experiments)

**Agent V1** implements the structured variable against baseline’s unstructured workflow, holding model/tools/workspace constant:

* **Workflow:** `src/v1/workflow/WorkflowEngine.ts` — state machine `reconnaissance→diagnosis→investigation→implementation→verification→finalization`, `ALLOWED_TRANSITIONS`, `phaseHistory/phaseDurations`, `TaskState` persisted to `.v1/state.json` (file-based, not regex, helper `src/v1/workflow/helpersTemplate.js` → `.v1/helpers.js`), gates per phase, bounded `maxIterations=5` observable in metadata.
* **Evidence:** `src/v1/workflow/EvidenceStore.ts` (`file_inspection|command_result|test_result|reproduction|diff_inspection|other`, `result: supports|contradicts|neutral`), `src/v1/workflow/gates.ts` (repo-agnostic, no prescribed `npm test`), internal telemetry only.
* **Hypothesis:** file-based via `.v1/state.json` (`Hypothesis {id, description, evidence[], confidence, status}`), helper `add-hypothesis`/`select-hypothesis`, engine merges by id, no regex.
* **Session:** `src/v1/agent/V1CodingAgent.ts` — **single persistent Pi session** per case, phases via prompt turns (`getPhasePrompt`), same Pi 0.84.4 / `opencode-go/muse-spark-1.2-contributor` / tools, `syncStateFromWorkspaceFile` each turn, gate nudge + loopback prompts, `WorkflowEngine`+`EvidenceStore` tracking, `isMock` mock mirrors all phases + `cleanupScratchFiles`.
* **Hygiene:** `src/patch/PatchCapture.ts` now excludes `:!.v1`, `:!repro.js`, etc.; `V1CodingAgent` `cleanupScratchFiles` removes `repro.js` before `capturePatch`, `sanitizePatchForScratchFiles`, no `.gitignore` pollution.
* **Telemetry:** `metadata.json:v1` with `phaseTransitions/durations`, `iterationCount/maxIterations`, `commandsExecuted/fileCount`, `toolCallCount`, `tokenUsage:null`/`cost:null` when unavailable, `hypotheses/evidenceCount/verificationAttempts`, `evidence.jsonl`, `v1-state.json`.
* **Config/CLI:** `src/v1/config/V1Config.ts` (`maxIterations` via `agent-v1.json` + `V1_MAX_ITERATIONS`), `src/v1/runner/V1Runner.ts`, `src/cli/run-v1-case.ts` (`bun run v1:run:case -- hist-001 --mock`), `run-v1.ts` (`bun run v1:run -- --mock --runs 1 --concurrency 1`), `experiments/agents/agent-v1.md`, `experiments/config/agent-v1.json`, `package.json` scripts `v1:run:case`, `v1:run`, `v1:validate`.
* **Tests:** `src/v1/tests/` 5 files (workflow, gates, evidenceStore, hypothesis, v1RunnerIntegration mock) — total `bun run test` 40 files 233 tests, `bun run benchmark:validate` still 17/17 `20f1003c...`, `V1_MOCK=1` produces clean patch (`repro.js` removed, `.v1` excluded, `v1-state` has hypotheses).
* **Docs:** `docs/decisions/agent-v1.md`, `docs/progress/agent-v1.md`.

## Next step

FROZEN v0.5 (`20f1003c...` — 17 cases 12 repos) + baseline-v0 + evaluator-v0 + **agent-v1** for `v2/final` experiments (no benchmark changes without v0.6). Previous v0.4 preserved but not mixed. Next: run real V1 (non-mock) on v0.5 17 cases and evaluate VFR via `bun run evaluate` per experiment protocol in `docs/decisions/agent-v1.md`.

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
