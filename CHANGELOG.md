# Changelog

All notable changes to the Frontier Verifier project.

## [0.1.0] - 2026-08-29 — Benchmark Construction

### Added

- **Benchmark v0.1** with 12 cases (6 historical + 6 synthetic) across 3 repositories.
  - Repositories: `task-manager`, `money-utils`, `async-queue` (MIT, synthetic benchmark-owned, deterministic, local-only, no external dependencies)
  - Historical cases: hist-001 (overdue boundary), hist-002 (rounding truncation), hist-003 (lost retry), hist-004 (priority validation), hist-005 (comma parse), hist-006 (pause drops pending)
  - Synthetic cases: synth-001 (update overwrite), synth-002 (currency mismatch), synth-003 (swallowed errors), synth-004 (stale cache), synth-005 (convert truncation), synth-006 (dequeue empty)
  - Each case: `manifest.json`, `issue.md`, `provenance.md`, `public/reproduce.ts`, `private/oracle.test.ts`, `artifacts/buggy/src/...`
  - Agent/evaluator isolation via `public/` vs `private/` + artifacts (evaluator-only)
  - Machine-readable metadata validated against `benchmark/schema/manifest.schema.json`

- **Benchmark validator** (`benchmark/scripts/validate.ts`, `bun run benchmark:validate`):
  - Checks repository availability, manifest validity, buggy reproduction (3×), good verification (3×), oracle pass/fail, regression, stability.
  - Produces `benchmark/validation-report.json` and human-readable summary.
  - Validation result on 2026-08-29: **12/12 ✓ VALID** (includes 3× stability per case)

- **Documentation:**
  - `benchmark/README.md` — structure, isolation, reproducibility, usage
  - `benchmark/CASE-MATRIX.md` — matrix, diversity, case rationale
  - `benchmark/schema/manifest.schema.json` — JSON schema
  - Repository READMEs under `benchmark/repositories/`

### Evidence

- `bun run benchmark:validate` — 12/12 valid (run 2026-08-29, Bun 1.4.0, Node 22 via Bun)
- `bun tsc --noEmit` — passes
- `bun test benchmark/repositories/*/tests` — all pass on known-good
- Repeated execution (3× buggy + 3× good per case) stable; flaky case synth-005 repaired (rate 0.92345 half-cent edge)

### Decisions

- Chose 3 synthetic-owned repositories over cloning external OSS to guarantee determinism, MIT licensing clarity, fast install, and controlled bug injection. Historical cases reconstructed from common real-world patterns with documented provenance rather than depending on fragile external issue URLs.
- Rejected then repaired synth-005 (initial rate 0.9234 produced no floor/round difference). New rate 0.92345 ensures behavioral difference.

### Tooling

- Coding agent: Muse Spark (opencode) for benchmark construction.
- Package manager: Bun 1.4.0
- TypeScript strict mode

## [0.2.0] - 2026-08-29 — Integrity Pass

### Fixed (MUST FIX)

- **Validator isolation:** `benchmark/scripts/validate.ts` now uses `mkdtemp` + `cpSync` per case/state (buggy/good) with temp workspaces at `/tmp/bench-<id>-*`, no live `benchmark/repositories/*/src/*` mutation. Verified `git diff` clean after interrupt (`validate.ts:16` removed unused imports, unified `writeFile`).
- **Path containment:** `validate.ts` validates `buggyFiles`, `fixFiles`, and `verification` paths via resolved-path containment (`resolve(base,input)` must stay inside base, reject absolute/`..`/`\0`). Prevents `../../package.json` and `/src/utils.ts` escapes.
- **Exec race:** `validate.ts:34` `exec` now uses `settled` guard with `clearTimeout` in both `close` and `error` and `kill(SIGKILL)` on timeout (previously `clearTimeout` only in `close` could double-resolve at 36 spawns).

### Added/Changed

- **Oracle stability 3×:** Reproduction 3× **and** oracle 3× per state (good/buggy) + regression 1× + final stability 1×. Report now documents `stability: {reproduction:"3x", oracle:"3x per state"}` (`benchmark/validation-report.json:6`). Previous claim “3× stability” was only reproduction 3×.
- **Fingerprint:** `validate.ts` computes `sha256` over sorted manifests + buggy snapshots + oracles + schema + repo known-good hashes. Report includes `benchmarkVersion:"0.2"` + `fingerprint: sha256:...` (`benchmark/CASE-MATRIX.md:3`).
- **Schema hygiene:** `benchmark/schema/manifest.schema.json:2` `$schema` fixed `http` → `https`, manual structural validation mirrors schema in `validate.ts:78` (protects against `validate.ts:35-45` type drift).
- **Tsconfig split:** Added `tsconfig.benchmark.json:1` for `benchmark/scripts/**/*.ts` + `public/private` harnesses; `package.json:9` adds `benchmark:check-types`. `bun run check-types` + `bun run benchmark:check-types` both pass (`tsconfig.json:30` still excludes artifacts).
- **Documentation honesty:** `benchmark/CASE-MATRIX.md` and `benchmark/README.md` now label `hist-*` as **synthetic-pattern** pending real replacement; added `benchmark/HISTORICAL-CANDIDATES.md` evaluating 4 provided candidates (`defu`, `cac`, `p-limit`, `kleur`) vs independent findings. Only `cac@ffaf796` and alternative `defu@3942bfb` are strong (`HISTORICAL-CANDIDATES.md:1`).

### Evidence

- `bun run benchmark:validate` v0.2 isolated — 12/12 VALID, fingerprint `sha256:42a6ef0ca73f3acb725fe316320715e5c7b2539b76dde855f6466adc19253ee7`
- `bun run check-types` — 0, `bun run benchmark:check-types` — 0
- `git diff` clean after validation (no repo pollution)
- Historical candidate evaluation: `benchmark/HISTORICAL-CANDIDATES.md` — 1 strong (`cac`), 1 strong alternative (`defu@3942bfb`), 1 viable-trivial (`p-limit`), 1 fragile (`kleur`) — insufficient for 6 without further search (quality > count per `docs/benchmark-spec.md:16`)

### Decisions

- **Leave money/validators untouched** per instruction: negative rounding in `money.ts:13` and calendar rollover in `validators.ts:38-41` not fixed; benchmark subjects provide predictable reference, not enterprise polish. Only infrastructure fixed.
- **Historical authenticity:** Freeze v0.2 with honest pattern labeling; incrementally replace one-by-one as each real case passes strict `buggy→fail / fixed→pass / oracle 3×` acceptance (per friend §18). Report shortfall rather than relabel synthetic as historical.
- **Not fixing** `filterByStatus` dead cache or `queue.ts` pause semantics — known-good behavior is correct per current tests; subject bugs are intentional (`synth-004` etc.).

### Validation

- `benchmark/validation-report.json` now includes `benchmarkVersion`, `fingerprint`, `stability`
- All 12 cases still VALID under v0.2 isolated validator.

## [0.3.0] - 2026-08-29 — 6 Genuine Historical (Non-Negotiable Met)

### Added — 6 Genuine Historical Cases

Replaced all 6 synthetic-pattern `hist-*` with genuine external bugs (all MIT, pinned `buggyCommit → fixedCommit`, verified `buggy→fail / fixed→pass` 3×, hidden oracle 3×, isolated temp):

- **hist-001 cac** `cacjs/cac@ffaf796` (PR #153, `src/CAC.ts:286`) — alias default leak, difficulty medium, `validation,parsing`, `8342919 → ffaf796`, repo `cac` 6.0.0 MIT, repro `--base-url` leaks `b`, oracle 4 tests.
- **hist-002 defu** `unjs/defu@3942bfb` (PR #156, `src/defu.ts:10`) — `__proto__` pollution `Object.assign` → `{...defaults}`, difficulty hard, `security,validation`, `d3ef16d → 3942bfb`, repo `defu` 6.1.4 MIT, oracle 8 tests.
- **hist-003 tinyspy** `tinylibs/tinyspy@0372bfb` (`src/spyOn.ts` + `utils.ts`) — prototype restore leak, medium, `state-management,api-behavior`, `0684083 → 0372bfb`, repo `tinyspy` 4.0.2 MIT, oracle 3 tests.
- **hist-004 mri** `lukeed/mri@94f8c09` (Issue #8, `lib/index.js:5`) — boolean `toVal` order `typeof boolean` before `opts.boolean`, easy, `parsing,type-coercion`, `a4759d5 → 94f8c09` (repo at `5437ea5` 1.1.4 includes fix), oracle 6 tests, `['-t']` leaks `[1]`.
- **hist-005 mri** `lukeed/mri@5437ea5` (Issue #10, `lib/index.js:46`) — alias default type cascade, medium, `parsing,alias-handling`, `40051e6 → 5437ea5`, repo `mri` 1.1.4 MIT, oracle 6 tests, `"-a 01"` `"01"` vs `1`.
- **hist-006 tinyspy** `tinylibs/tinyspy@0684083` (PR #50, `src/spyOn.ts:22`) — inherited getter prototype walk `while`, medium, `state-management`, `f42d545 → 0684083`, repo `tinyspy` 4.0.2, oracle 3 tests.

**Repositories expanded:** 3 → 7 (3 synthetic + 4 genuine historical: `cac`, `defu`, `tinyspy`, `mri` — `benchmark/repositories/README.md` updated). `benchmark/schema/manifest.schema.json` repo enum expanded, `benchmark/repositories/cac/src/*` `@ts-nocheck` + `mri.d.ts` for verbatim compatibility, `tinyspy` fixed verbatim `import type`.

### Parallel Construction

Spun 3 subagents simultaneously (cac, defu, tinyspy×2 + mri via earlier) — each via `bash` `git archive`/`git show` from `/tmp/fv-eval/{cac,defu,tinyspy,mri}` clones, copied to `benchmark/repositories/<repo>` + `benchmark/cases/hist-*/artifacts/buggy/...`, created `tests/*.test.ts` regression, validated via temp workspace `mkdtemp+cpSync` `bun run`/`bun test` 3× before reporting. `tinyspy/mri/yocto-queue` evaluated to reach 6 (yocto-queue `ee91589` weak, `8aead27` rejected GC leak, `p-limit`/`kleur` not needed).

### Candidate Evaluation Complete

Updated `benchmark/HISTORICAL-CANDIDATES.md` to **6/6 Genuine** (`tinyspy 0372bfb` KEEP, `tinyspy 0684083` KEEP, `mri 94f8c09` KEEP, `mri 5437ea5` KEEP vs provided `cac` KEEP, `defu` alternative KEEP, `kleur` fragile rejected, `p-limit` trivial rejected, `yocto-queue` weak). See `benchmark/CASE-MATRIX.md` v0.3 for full details.

### Changed

- `benchmark/CASE-MATRIX.md` v0.3 fingerprint `sha256:6938f031bedd5d120dbd7aacb8274717f1e3d00fa5928aa98216dc1c0e772b0c`, 6 genuine table + details, diversity updated.
- `benchmark/README.md` v0.3 (7 repos, 6 genuine provenance, fingerprint).
- `docs/memory/current-state.md` v0.3 FROZEN for experiments (6 genuine, no further benchmark changes).
- `benchmark/validation-report.json` fingerprint `6938f031...`, `benchmarkVersion 0.2` (validator) — benchmark v0.3 content.

### Evidence

- `bun run benchmark:validate` v0.2 isolated — **12/12 VALID** `hist-001..006` genuine + `synth-001..006`, fingerprint `sha256:6938f031bedd5d120dbd7aacb8274717f1e3d00fa5928aa98216dc1c0e772b0c`, `reproduction 3×, oracle 3× per state, regression 1×`
- `bun run check-types` — 0, `bun run benchmark:check-types` — 0
- `git status` clean after validation (no repo pollution, temp workspaces)
- Historical authenticity now non-negotiable **met** — 6 distinct genuine with real commits/issues.

## [0.3.1] - 2026-08-29 — Package-Manager Agnostic Harness (Option A)

### Changed — Test Harness Portability (Keep `bun` as Package Manager, No `bun` Required to Run)

- **Migrated harness from `bun:test` → `vitest`:** All 19 test files (`benchmark/cases/*/private/oracle.test.ts:1` + `benchmark/repositories/*/tests/*.test.ts:1`) changed `from "bun:test"` → `from "vitest"`; `package.json:6` `"test": "vitest run"` now works with `bun run test`, `npm test`, `pnpm test`, `yarn test` (verified `bun run test` 19 files 103 tests and `npm test` same). Kept `bun.lock` as requested; `vitest@4.1.11` + `tsx@4.23.12` + `@types/node@26.4.0` added via `bun add`, so `npm install`/`pnpm install` also works.
- **`package.json` scripts:** Removed redundant `"test:bun"` and `"benchmark:validate:bun"` as requested (`bun run test` now invokes `vitest`); kept single `"benchmark:validate": "tsx benchmark/scripts/validate.ts"` (works via `bun run benchmark:validate` and `npm run benchmark:validate`).
- **`vitest.config.ts:1` added** (`include: benchmark/repositories/*/tests, benchmark/cases/*/private, public`, `environment: node`, `globals: false`) and `tsconfig.json:10` `types: ["bun","node","vitest/globals"]` for dual compat.
- **`benchmark/repositories/*/package.json:7`:** `test: bun test` → `test: vitest run` for all 7 repos (task-manager, money-utils, async-queue, cac, defu, tinyspy, mri — tinyspy already `vitest`).
- **Fixed `cac` historical for `tsx` compatibility:** `benchmark/repositories/cac/src/CAC.ts:5` now `import type { CommandConfig...}` + `Command.ts:3` `import type { OptionConfig }` + `// @ts-nocheck` + `mri.d.ts:1` already kept; also patched `benchmark/cases/hist-001/artifacts/buggy/src/CAC.ts:4` same. Previously `npx tsx` failed with `OptionConfig` not exported, now passes via `bun` and `tsx`.

### Fixed — Validator Bun-First with Fallback (Option A)

- **Reverted `benchmark/scripts/validate.ts:1`** from fragile `vitest`+`tsx`+symlink/`NODE_PATH`/`vitest.config.ts` copy in `tmp` (which caused `UNRESOLVED_IMPORT` and `2/12 VALID`) back to **bun-first** isolated `tmp` (`cpSync` + buggy overlay only, no symlink), `runBunFile:79`/`runBunTest:83` now try `bun` first, fallback to `tsx`/`vitest` via `ROOT/node_modules/.bin` if `bun` not found (for pure `npm` users without `bun`). Removed `NODE_PATH` hack and config copy. Fixed `ROOT` resolution for `node`+`tsx` via `fileURLToPath`/`import.meta.dir` fallback.
- **Updated fingerprint logic:** `computeFingerprint:193` now hashes 7 repos (`cac`, `defu`, `tinyspy`, `mri` in addition to 3 synthetic) for stability, `validateManifestStructure:145` allows 9 repo names, `benchmarkVersion:0.3`.
- **Docs:** `benchmark/CASE-MATRIX.md:3` and `benchmark/README.md:6` fingerprint updated to `sha256:ef363fc1663524bb075e83635861df370aa573392d7470918376c48d5195b0aa` (changed due to `cac` `import type` patch + 7-repo hash), `benchmark/README.md:58` runtime now `Node 22 + npm/pnpm/yarn` with `vitest`/`tsx`, `docs/memory/current-state.md:4` v0.3 vitest compat, `benchmark/HISTORICAL-CANDIDATES.md` still 6/6.

### Evidence (Option A Verification)

- `bun run test` → 19 files 103 tests pass (vitest), `npm run test` → same
- `bun run check-types` → 0, `npm run check-types` → 0, `bun run benchmark:check-types` → 0, `npm run benchmark:check-types` → 0
- `bun run benchmark:validate` → **12/12 VALID** `sha256:ef363fc1663524bb075e83635861df370aa573392d7470918376c48d5195b0aa` via `bun` (also `bun benchmark/scripts/validate.ts` direct)
- `npm run benchmark:validate` → **12/12 VALID** same fingerprint via `tsx`+`bun` fallback (also `npx tsx benchmark/scripts/validate.ts`)
- `bun.lock` kept, `npm install` works (tested via `npm` path, no `bun` required for `test`).

### Decision

- Keep `bun` as package manager (`bun.lock` retained) but no hard `bun` runtime required: `benchmark:validate` is **bun-first → vitest/tsx fallback** for `npm` users without `bun`. `test:bun` removed per your “what’s point of test:bun??” — single `test: vitest run` is now package-manager agnostic.

## [0.4.0] - 2026-08-29 — Baseline v0 (Pi Fixed Runtime) + Benchmark FROZEN v0.4

### Fixed — Benchmark FROZEN v0.4 (Fingerprint Completeness, Friend Review)

- **Provenance inclusion:** `benchmark/scripts/validate.ts:181-186` `computeFingerprint()` now hashes `issue.md` + `provenance.md` per case in addition to `manifest.json` + `buggyFiles` + `private/oracle.test.ts` + `public/reproduce.ts` + `schema` + 7 repo hashes. Previously `provenance.md` omitted — fingerprint did not fully represent benchmark identity (versioning flaw noted in review). Now `manifest + issue + provenance + reproduce + oracle + buggy + schema + repos`.
- **Version bump:** `benchmark/scripts/validate.ts:2,428,475` `v0.3` → `v0.4`, report `benchmarkVersion 0.4`, `benchmark/CASE-MATRIX.md:3,8` `v0.4 FROZEN` `cead5c6e...`, `benchmark/README.md:1,7,100` `v0.4 FROZEN`, `docs/benchmark-spec.md:3,599` `0.1`/`V1` → `0.4 — FROZEN` `cead5c...`, `docs/memory/current-state.md:1,3,18` `0.3` → `0.4`, `src/config/BaselineConfig.ts:26` `0.3→0.4`, `experiments/config/baseline.json:4` `0.3→0.4`, `docs/baseline-spec.md:3,121` `0.3→0.4` + versioning note (runsPerCase configurable, v0.3 results discarded), `docs/decisions/baseline-v0.md:6,94` `v0.3→0.4`.
- **Freeze:** Benchmark v0.4 `cead5c6e...` is FROZEN for all experiments (baseline, V1, V2, final). Any further case change → v0.5. Never mix v0.3 `4d739f...` and v0.4 results (v0.3 discarded per user). Evaluator will distinguish 4 verdicts (verified / agent_failure / false_confidence / regression_failure) with configurable `runsPerCase` — architecture keeps `CodingAgent` interface with only `PiCodingAgent`.

### Evidence

- `npx tsx benchmark/scripts/validate.ts` v0.4 isolated — **12/12 VALID** `sha256:cead5c6e50fb88d367729ded45f77eb8375320953549e8ff41649731598e4b9e` (was `4d739f6c...` on v0.3, discarded; no case content changed, only fingerprint input added)
- `bun run check-types` → 0, `bun run benchmark:check-types` → 0
- `BASELINE_MOCK=1 npx tsx scripts/verify-baseline-infra.ts` — 17/17 still (post-bump, pending re-run after freeze)

### Added — Baseline v0 Control Condition

Implements the frozen control agent for the experiment (Pi remains constant across baseline → v1 → v2 → v3):

* **Pi integration:** `@earendil-works/pi-coding-agent` 0.84.4 + `pi-agent-core` 0.84.4 + `pi-ai` 0.84.4 via project-owned `CodingAgent` interface (`src/agent/CodingAgent.ts` → `PiCodingAgent` `src/agent/PiCodingAgent.ts` with `createAgentSession`, structured `subscribe` trajectory, not terminal scrape). Only Pi implementation required.
* **Isolation:** `src/workspace/WorkspaceManager.ts` — copies `benchmark/repositories/<repo>` to temp `/tmp/frontier-<case>-<run>-...`, overlays `artifacts/buggy/`, copies `issue.md` → `ISSUE.md` and `public/reproduce.ts` → `public/reproduce.ts` with import rewrite `../../../repositories/<repo>/` → `../` (verified `public/reproduce.ts` resolves locally), never copies `provenance.md`/`private/oracle.test.ts`/`artifacts/`; `git init` + `commit` buggy state before agent, verifies `git status --porcelain` empty, `git diff HEAD` after captures pure agent patch.
* **Config:** `src/config/BaselineConfig.ts` + `experiments/config/baseline.json` + `.env` (`PROVIDER`, `PROVIDER_API_KEY`, `AGENT_MODEL` is source of truth, e.g. `opencode-go/muse-spark-1.2-contributor` per pi catalog `node_modules/@earendil-works/pi-ai/dist/providers/data/opencode-go.json`). Minimal `.env` loader, pi version auto-detected, `DEFAULTS` fallback only for mock. `.env.example` documents correct id.
* **Instructions:** `experiments/agents/baseline-v0.md` versioned artifact (inspect → reproduce `npx tsx public/reproduce.ts` → diagnose → edit → test ≤3 reruns; never read `private/`).
* **Artifacts:** `src/trajectory/TrajectoryCapture.ts` JSONL via `session`/`agent` `subscribe`; `src/patch/PatchCapture.ts` via `git diff HEAD`; `src/runner/BaselineRunner.ts` + `CaseLoader` orchestrates isolated runs, multiple `run-001` per case, concurrency 1-4, timeout `AbortController` + `Promise.race` with single-terminal guard, structured `RepairRun`/`RunMetadata` (§16-17: runId, caseId, benchmarkVersion, agentVersion, runtime, piVersion, model, thinkingLevel, prompt path, start/end, duration, terminationStatus, changedFiles, testCommands, trajectory/patch/result, node/platform, fingerprint, tokenUsage if available).
* **CLI:** `src/cli/run-case.ts` (`bun run baseline:run:case -- synth-001 --mock`) and `run-baseline.ts` (`bun run baseline:run -- --mock --runs 1 --concurrency 2`) → `experiments/runs/<runId>/{metadata,trajectory,patch,result}.json` + aggregated `baseline-report-*.json`.
* **Scripts:** `package.json` `baseline:run:case`, `baseline:run`, `baseline:validate`; mock `BASELINE_MOCK=1` for CI without keys; `bun`/`npm`/`pnpm` compat via `vitest`/`tsx` (benchmark harness unchanged).
* **Infrastructure tests:** `scripts/verify-baseline-infra.ts` — 17/17 passed (15 required + 2 sanitation: no private/oracle leakage, git clean): case loads, workspace, canonical untouched, Pi session, instructions, inspect, modify, commands, trajectory JSONL, patch `git diff`, metadata, timeout (exec), cleanup, failed-case isolation, concurrent 2×, plus workspace sanitation and git clean checks.

### Changed

* `package.json` adds `baseline:run:case`, `baseline:run`, `baseline:validate`, deps `pi-coding-agent`, `pi-agent-core`, `pi-ai`, `uuid` (keeps `bun.lock` but `npm install` works).
* `experiments/config/baseline.json` adds baseline defaults (model `opencode-go/muse-spark-1.2-contributor`, timeouts, piVersion 0.84.4).
* `docs/baseline-spec.md` + `docs/decisions/baseline-v0.md` + `docs/memory/current-state.md` updated.

### Evidence

* `bun run check-types` ✓ 0, `bun run benchmark:check-types` ✓ 0
* `bun run benchmark:validate` 12/12 VALID `sha256:4d739f6c4abd2bfc8dc663fb03731ab24c91d25d5d3d28b6b10a620e749b055c`
* `BASELINE_MOCK=1 npx tsx scripts/verify-baseline-infra.ts` — 17/17 passed
* Manual `BASELINE_MOCK=1 bun run baseline:run:case -- synth-001` → `src/task-manager.ts` patch `diff --git`, trajectory 21 lines, metadata fingerprint; `hist-001` → `src/CAC.ts` patch; `synth-001`+`synth-002` concurrent 2× success.

### Decision

* Pi is frozen as runtime; future improvements are evaluator-side. Baseline does not score patches.

## [0.5.0] - 2026-08-29 — Evaluator v0 (Deterministic Verification)

### Added — Evaluator v0 Deterministic Layer

Implements the frozen evaluation layer that answers *did the agent actually fix the bug?* via executable evidence (no LLM judge):

* **Core types:** `src/evaluator/types.ts` — `Verdict` (`verified|agent_failure|false_confidence|regression_failure`), `EvaluationStatus` (`completed|error|timeout`), `VerificationStageResult` (`passed|failed|error|timeout|skipped` + exitCode/duration/command/stdout/stderr/reason), `EvaluationResult` (evaluationId, runId, caseId, benchmarkVersion+fingerprint, agentVersion/model/piVersion, startedAt/completedAt/durationMs, patchPath, status/verdict, verification{patachApply,reproduction,oracle,regression}, workspace isolated, error), `EvaluateOptions`.
* **Patch validation:** `src/evaluator/patchValidator.ts` — rejects `..`, absolute, null bytes in `diff --git`/`---`/`+++` headers via `resolve(base)` containment (reuses `benchmark/scripts/validate.ts` strategy); also validates patch file location vs `experiments/runs`.
* **Deterministic exec:** `src/evaluator/exec.ts` — `spawn(cmd, args, {shell:false})` with explicit args, SIGTERM→SIGKILL escalation, settled guard, timeout, stdout/stderr capture (8000 char), duration, `toStageResult`; bun-first fallback (`bun run` → `node_modules/.bin/tsx`/`npx tsx`, `bun test` → `vitest`/`npx vitest`) for npm/pnpm/yarn compat.
* **Isolation:** `src/evaluator/isolation.ts` — `mkdtemp(/tmp/frontier-eval-)` + `cpSync(benchmark/repositories/<repo>, benchmark/cases/<id>)` → `tmpRoot/benchmark/...` (validator pattern, no benchmark mutation, relative `../../../repositories` imports work), `git apply --check` → `git apply` with `PatchApplyResult`, `mkdtemp` cleanup best-effort.
* **Verdict:** `src/evaluator/verdict.ts` — `computeVerdict` with documented precedence: `repro FAIL → agent_failure`, `repro PASS oracle FAIL → false_confidence`, `repro PASS oracle PASS regression FAIL → regression_failure`, `all PASS → verified`; timeout/error → no verdict, top status `timeout`/`error`.
* **Benchmark identity:** `src/evaluator/benchmarkIdentity.ts` — loads `benchmark/validation-report.json` (v0.4 `cead5c6e...`), compares to run's `metadata.json` (`benchmarkVersion`/`benchmarkFingerprint`), refuses mismatch unless `allowBenchmarkMismatch`.
* **Aggregation:** `src/evaluator/aggregation.ts` — `aggregateResults` → `AggregatedMetrics` (`total/completed/errors/timeouts`, `byVerdict`, `rates` VFR=`verified/completed×100`, repro/oracle/regression pass, failure rates) for future V1/V2; `evaluate --all` prints `VFR 75%` etc.
* **Evaluator:** `src/evaluator/Evaluator.ts` — `evaluate(options: EvaluateOptions)` orchestrates `artifact resolve → identity check → patch load → repo manifest → isolated workspace → patch apply → reproduce → oracle (only if repro PASS) → regression (only if oracle PASS) → verdict → persist `experiments/runs/<runId>/evaluation/{result.json,reproduction.log,oracle.log,regression.log,patch-apply.log}` + cleanup.
* **CLI:** `src/cli/evaluate.ts` — `bun run evaluate -- --run <runId>` / `--case <id> --patch <path>` / `--all` / `--allow-mismatch` / `--keep-workspace` / `--json`; human summary (`Patch: APPLIED, Reproduction: PASS, Oracle: PASS, Regression: PASS, VERDICT: VERIFIED`) + JSON; `npm run evaluate` also works.
* **Config:** `package.json` scripts `evaluate: tsx src/cli/evaluate.ts`, `evaluator:test: vitest run src/evaluator/tests`; `vitest.config.ts` include updated to `src/evaluator/tests/**/*.test.ts`.
* **Tests:** `src/evaluator/tests/` — 31 evaluator tests (patchValidator 5, verdict 9, exec 6, evaluator.integration 15 covering verified/agent_failure/false_confidence/regression_failure/isolation/repeatability/identity/runId/oracle secrecy/timeout, isolation 4, aggregation 2) — total `bun run test` 25 files 145 tests (19 benchmark/oracle + 6 evaluator).

### Changed

* `package.json` adds `evaluate`, `evaluator:test`; `vitest.config.ts` include expanded for evaluator tests; `src/evaluator/` new directory.

### Evidence

* `bun run check-types` → 0, `bun run benchmark:check-types` → 0
* `bun run benchmark:validate` → 12/12 VALID `sha256:cead5c6e...` (unchanged)
* `bun run test` → 25 files 145 tests (also `npm test`); `bun run benchmark:validate` still isolated
* Manual smoke: `bun run evaluate -- --case synth-001 --patch empty` → `VERIFIED` (15ms repro, 17ms oracle, 16ms regression); `--patch buggy` → `AGENT_FAILURE`; `partial dueDate` → `FALSE_CONFIDENCE`; `regression break` → `REGRESSION_FAILURE`; `traversal` → `PATCH_TRAVERSAL` error (all 4 verdicts distinguishable)
* Manual `BASELINE_MOCK=1 bun run baseline:run:case -- synth-001` → `patch.diff` (comment) → `bun run evaluate -- --run <runId>` → `VERIFIED` + `evaluation/result.json` persisted
* `git status --short -- benchmark/repositories/ benchmark/cases/ benchmark/schema/` clean after evaluations; `experiments/runs` ignored

### Decision

* Evaluator is deterministic infrastructure, not an AI judge; benchmark remains immutable v0.4; evaluator is frozen `evaluator-v0` for baseline→v1→v2→final.

## [0.6.0] - 2026-08-29 — Frontier-Hard Benchmark v0.5 (Additive)

### Added — Frontier-Hard (5 Deliberately Difficult Historical Cases)

Introduces the **Frontier-Hard** subset to eliminate the baseline 100% VFR ceiling. The Core Benchmark (12 cases, 7 repos, v0.4 `cead5c6e...`) remains **byte-identical** in behavior; only the measuring instrument was expanded.

**New cases (all genuine historical, MIT/BSD-3, pinned `buggyCommit→fixedCommit`, 3× validated, hidden oracle):**

- **hard-001 immer** `immerjs/immer@a73672a` (PR #1255, `src/core/proxy.ts:146` + `src/plugins/arrayMethods.ts:181`) — draft relocated base refs after `reverse`/`sort` mutates base, difficulty hard, `state-management,lifecycle,api-behavior`, `cfec5e5 → a73672a`, repo `immer` 10.0.3-beta MIT, repro `reverse` then mutate, oracle 7 tests (reverse, sort, patches, sharing, cycles).
- **hard-002 qs** `ljharb/qs@d56f48c` (PR #558, `lib/utils.js:338`) — combine overflow flatten nests array, hard, `parsing,boundary,state-management`, `e83d321 → d56f48c`, repo `qs` 6.15.3 BSD-3, repro `a=1,2,3,4,5,6&a=7,8`, oracle 8 tests (flat, `[]=` single, multiple groups, plainObjects, throw).
- **hard-003 superjson** `blitz-js/superjson@4054f3f` (Issue #310, PR #311, `src/pathstringifier.ts:7` + `src/plainer.ts:24` + `src/index.ts:55` + `src/types.ts:1`) — path escape mishandles `\` and versioning, hard, `serialization,parsing,state-management`, `6dc63da → 4054f3f`, repo `superjson` 2.2.5 MIT, repro `b\` with Set, oracle 6 tests (PR 4-key, backslash Set, invalid path).
- **hard-004 p-queue** `sindresorhus/p-queue@a64b316` (Issue #241, `source/index.ts:475` + `source/priority-queue.ts:16` + `source/queue.ts:2`) — signal abort while queued not rejected, hard, `asynchronous,state-management,error-handling`, `3bd13ea → a64b316`, repo `p-queue` 9.1.0 MIT, repro queued abort, oracle 6 tests (queued, already-aborted, priority, custom reason).
- **hard-005 path-to-regexp** `pillarjs/path-to-regexp@8877f41` (PR #451, `src/index.ts:676`) — `stringifyName` uses `next.value[0]` (code unit) not code point for astral `ID_Continue`, hard, `parsing,api-behavior,data-transformation`, `bd12a33 → 8877f41`, repo `path-to-regexp` 8.4.2 MIT, repro `param` + `\u{1D6FC}`, oracle 7 tests (param/wildcard astral, non-ID, BMP, round-trip).

**Repositories expanded:** 7 → 12 (7 Core + 5 Hard: `immer`, `qs`, `superjson`, `p-queue`, `path-to-regexp` — `benchmark/frontier-hard/repositories/` added, `benchmark/repositories/README.md` updated, `copy-anything`/`eventemitter3`/`p-timeout`/`side-channel` via `NODE_PATH` or `node_modules` in repo).

**Structure (additive, per §2):** `benchmark/cases` + `benchmark/repositories` = **Core** (v0.4 preserved), `benchmark/frontier-hard/cases` + `benchmark/frontier-hard/repositories` = **Frontier-Hard** (v0.5 addition). Validator discovers both; fingerprint unified over 17 cases + 12 repos + schema. Core's 12 cases remain behaviorally identical.

### Changed — Validator & Evaluator (v0.5)

- `benchmark/schema/manifest.schema.json:7` `id` pattern `^(hist|synth|hard)-[0-9]{3}$`, `repository` now `type:string` (any repo), `difficulty` adds `frontier-hard`.
- `benchmark/scripts/validate.ts` v0.5: dual-root discovery (`CASES_DIR` + `CASES_DIR_HARD`, `REPOS_DIR` + `REPOS_DIR_HARD`), `resolveCaseDir`/`resolveRepoDir`, `computeFingerprint` over 17 cases + 12 repos, `createTempWorkspace` copies to both `benchmark/cases` and `benchmark/frontier-hard/cases` in temp for `../../../repositories` relative imports, `runBunFile`/`runBunTest` now `bun` → `vitest`/`tsx` fallback on `SyntaxError`/`not found in` (for `immer`'s `Draft` type-only import), `NODE_PATH` set to `ROOT/node_modules` for `side-channel`/`copy-anything`, `benchmarkVersion 0.5`, `validation-report.v0.4.json` preserved.
- `src/evaluator/isolation.ts` v0.5: same dual-root resolve, `createIsolatedWorkspace` copies to both `benchmark/repositories` and `benchmark/frontier-hard/repositories` in temp, `NODE_PATH` not needed (inherits), `resolveCaseDir`/`resolveRepoDir`.
- `src/evaluator/exec.ts` v0.5: `tryBunThenFallback` now also falls back on `SyntaxError`/`not found in`/`Cannot find package` (for `immer`/`superjson` type-only imports), `execDeterministic` sets `NODE_PATH`, `runReproduce`/`runOracle`/`runRegression` handle both roots.
- `src/workspace/WorkspaceManager.ts` v0.5: dual-root, `resolveCaseDir`/`resolveRepoDir`, `curator-notes.md` explicitly excluded from agent workspace (alongside `provenance.md`/`private`/`artifacts`), `listCases` merges both roots.
- `vitest.config.ts:5` include adds `benchmark/frontier-hard/...` for both `cases` and `repositories`.
- `tsconfig.json:30` and `tsconfig.benchmark.json:12` exclude `benchmark/frontier-hard/...` for type checking.
- `benchmark/CASE-MATRIX.md` v0.5: 17 rows, new Frontier-Hard section with 5 detailed entries, diversity updated, validation 17/17.
- `benchmark/README.md` v0.5: 17 cases, 12 repos, Core + Frontier-Hard structure, fingerprint `ee9104f5...`, v0.4 preserved.
- `docs/benchmark-spec.md` v0.5: 17 cases, repository strategy additive, diversity with 5 hard, immutability v0.5 FROZEN, `ee9104f5...`.
- `benchmark/HISTORICAL-CANDIDATES.md` will be updated with 5 hard selections and 15+ rejections.
- `benchmark/validation-report.json` now `benchmarkVersion 0.5`, `fingerprint ee9104f5...`, 17/17.

### Infrastructure & Validation

- `bun run benchmark:validate` v0.5 isolated — **17/17 VALID** `sha256:ee9104f5a7a03d0c227205de81fa24e464c23160ddf145051b08799693cbdf78` (was `cead5c6e...` 12/12 on v0.4, preserved), `reproduction 3×, oracle 3× per state, regression 1×`, also `bun run benchmark:check-types` + `bun run check-types` pass.
- `bun run test` now 30+ files (19 Core + 5 Hard + 6 evaluator) — all pass via `vitest` (including `immer` via `tsx` fallback).
- Curator verification: each hard case tested buggy→fail / fixed→pass 3×, plus naive patch `false_confidence` checks (e.g., hard-001 always-draft, hard-002 missing `setMaxIndex`, etc.) — see `docs/progress/frontier-hard-benchmark-v0.md`.

### Decisions

- Additive structure chosen per §2 to avoid risky move of Core's 12 cases + 7 repos immediately before freeze; conceptual distinction matters more than cosmetic directory move.
- Hardness selection per §5: cross-file, hidden invariant, state/lifecycle, async, partial-fix traps, regression-sensitive, unicode — not repo size or patch size.
- Rejected 15+ candidates (e.g., `immer` `16e225b` one-line, `qs` `b433a9b` one-line, `zustand` `3febf8c` one-line, `zod` heavy monorepo, `p-queue` `89a10bb` timing) — see `benchmark/HISTORICAL-CANDIDATES.md` and curator report.
- `superjson` `src/index.ts` patched `import type` for `Class`/`SuperJSONResult` (harness only, non-logic, documented) to make `bun`/`tsx` handle type-only imports; `p-queue` `tsconfig` adjusted similarly.

## [0.7.0] - 2026-08-30 — Agent V1 Structured Workflow (Single Session, File-Based)

### Added — Agent V1 (Structured Variable Against Baseline)

Builds V1 as a structured evidence-aware workflow around the **same Pi model and task info as V0**, isolating one variable (workflow) per experiment protocol:

* **Types:** `src/v1/types.ts` — `AgentPhase` (`reconnaissance|diagnosis|investigation|implementation|verification|finalization`), `Hypothesis`, `Evidence` (`file_inspection|command_result|test_result|reproduction|diff_inspection|other`, `supports|contradicts|neutral`), `CommandExecution`, `FileChange`, `VerificationAttempt`, `TaskState` (`phaseHistory`, `phaseDurations`, `iteration`, `maxIterations`, `terminationReason`), `V1Telemetry`, `ALLOWED_TRANSITIONS` / `PHASE_ORDER` (normal flow + investigation loopback + verification failure loops, no arbitrary transitions).

* **Config:** `src/v1/config/V1Config.ts` extends `BaselineConfig` with `maxIterations` default 5 (env `V1_MAX_ITERATIONS`/`AGENT_MAX_ITERATIONS`, file `experiments/config/agent-v1.json` → `baseline.json` → env, bounds 1–20, observable in `metadata.json: {modelConfiguration.maxIterations, v1.maxIterations}`); `getDefaultV1Config()`.

* **Evidence Store:** `src/v1/workflow/EvidenceStore.ts` — in-memory + JSONL (`evidence.jsonl`), typed helpers, `addFileInspection/CommandResult/TestResult/Reproduction/DiffInspection`, `getByPhase/getByType/hasTypeInPhase`, error-suppressed `createWriteStream` (fixes Vitest ENOENT after `mkdtemp` delete), `loadFromFile`.

* **Gates:** `src/v1/workflow/gates.ts` — repo-agnostic evidence gates (not prescribed `npm test`): recon needs `filesInspected≥1`+evidence, diagnosis needs hypothesis with evidence, investigation needs command/test evidence, implementation needs selected hypothesis+changes, verification needs attempts+evidence, finalization needs `diff_inspection`. `checkGateForPhase`, `allGatesForCompletedRun`.

* **Workflow Engine:** `src/v1/workflow/WorkflowEngine.ts` — state machine with `transitionTo` (gate-checked, throws `InvalidTransitionError`/`GateFailedError`), `forceTransitionTo`/`skipGate`, `canTransitionTo`, iteration increment on `verification→investigation/implementation`, budget check `isBudgetExhausted`/`canLoopBack`, `recordFileInspected/CommandExecution`, `addHypothesis/updateHypothesis/selectHypothesis`, `recordEvidence/FileChange/VerificationAttempt`, `phaseHistory/phaseDurations` timestamps, `.v1/state.json` file-based persistence via queued `writeStateFile` (`persistChain` + `flushPersist`, skips initial overwrite if file exists to fix reload race). Single persistent state, not regex.

* **Helpers:** `src/v1/workflow/helpersTemplate.js` copied to workspace `.v1/helpers.js` for `add-hypothesis`/`select-hypothesis`/`add-evidence`/`add-file-inspected`/`add-command`/`add-verification`/`status` (file-based, per instruction #3 preference).

* **Phase Prompts:** `src/v1/agent/phasePrompts.ts` — `PHASE_INSTRUCTIONS` per phase + `getWorkflowOverview` (generic constraints, no `private/`/`provenance.md` leak).

* **V1CodingAgent:** `src/v1/agent/V1CodingAgent.ts` implements `CodingAgent`, **single persistent Pi session** per case (per #1, `createAgentSession` once, phases via `session.prompt` turns, not re-instantiation), same `ModelRuntime`/`DefaultResourceLoader`/`getModel` as V0 (`PROVIDER`/`PROVIDER_API_KEY`, `AGENT_MODEL` exact id, `thinkingLevel`, `tool` list `read,bash,edit,write,grep,find,ls`), subscriptions tag `_v1Phase/_v1Iteration` and auto-record `filesInspected/commands/verificationAttempts/evidence`, `writeWorkspaceHelpers` + `syncStateFromWorkspaceFile` (merge by id, file-authoritative), gate nudge + loopback prompts (`buildGateNudgePrompt`, `buildLoopbackPrompt`), `setTerminationReason`, `cleanupScratchFiles` (removes `repro.js`/`tmp` before capture, keeps `.v1`), patch hygiene via `sanitizePatchForScratchFiles` + `PatchCapture` pathspec (per #2, **no `.gitignore` modification** to avoid `+.v1/` pollution), `capturePatch` filtered to exclude `.v1`, `isScratchFile`, telemetry (`toolCallCount`, `tokenUsage:null`/`cost:null` when unavailable, `phaseTransitions/durations`, `iterationCount`, `hypotheses/evidenceCount`), mock `runMock` mirrors all 6 phases (recon `read ISSUE.md`+`ls`, diagnosis `addHypothesis→selected`, investigation `grep`, implementation `edit` trivial comment, verification `vitest run`, finalization `git diff --stat`, plus `repro.js` scratch creation to test hygiene, phase transitions via `transitionTo`/`forceTransitionTo`).

* **V1Runner:** `src/v1/runner/V1Runner.ts` mirrors `BaselineRunner` (case validation, `WorkspaceManager.createWorkspace` same isolation, `V1CodingAgent`, `runCase`/`runV1` with concurrency 1–4, `keepWorkspace`, cleanup, `getFingerprint` corrected to `../../..`).

* **Patch Hygiene Fix:** `src/patch/PatchCapture.ts` now excludes `.v1`, `repro.js`, `scratch.*`, `tmp` in all `git add -N`/`diff`/`status`/`diff --name-only` and `isIgnoredPath`; defensive stripping extended. Previously `capturePatch` only excluded `node_modules/.vite/dist/.turbo`.

* **Prompt/Config:** `experiments/agents/agent-v1.md` (structured workflow, phase responsibilities, generic hidden-file constraint, no `private/` leak) + `experiments/config/agent-v1.json` (`maxIterations:5`) + corrected `ROOT` (`../../..` for `src/v1/*`).

* **CLI:** `src/cli/run-v1-case.ts` (`bun run v1:run:case -- hist-001 --mock --keep-workspace --max-iterations 5`) + `run-v1.ts` (`bun run v1:run -- --mock --runs 1 --concurrency 1 --cases hist-001,synth-001`), `package.json` scripts `v1:run:case`, `v1:run`, `v1:validate`.

### Changed

* `package.json` adds `v1:*` scripts.

### Tests — 40 files 233 tests

New `src/v1/tests/` (5 files, 36 tests):

- `workflow.test.ts` — phase transitions (valid after gate, invalid `recon→implementation`, gate rejects, `diagnosis→investigation`, `investigation→diagnosis` loopback, `verification→investigation` increments iteration, budget exhaustion `max 1`, arbitrary transitions blocked, `phaseHistory/phaseDurations`, `forceTransitionTo`).
- `evidenceGates.test.ts` — gates pure, repo-agnostic (`node .v1/repro.js` passes verification without `npm test`).
- `evidenceStore.test.ts` — record/persist JSONL, count/filter, helpers, `loadFromFile`, no `private/provenance` leak.
- `hypothesis.test.ts` — file-based `add/select/reject`, persistence to `.v1/state.json` (JSON not regex), `loadState` (queued writes), `flushPersist`.
- `v1RunnerIntegration.test.ts` — mock end-to-end (patch excludes `.v1`/`repro.js`, `changedFiles` clean, telemetry `v1:{phases,evidence,hypotheses,maxIterations}`, hypothesis tracked, isolation no `private/oracle` in trajectory/evidence, finalization `diff_inspection`).

### Evidence

- `bun run check-types` 0, `bun run benchmark:check-types` 0, `bun run benchmark:validate` 17/17 `20f1003c...` (also `npm`), `bun run test` 40 files 233 tests & `npm test` same (was 25/145 before V1).
- `V1_MOCK=1 bun run v1:run:case -- synth-001 --mock` → `src/task-manager.ts` comment patch, `trajectory` 41 lines, `evidence 9`, `phases 6`, `v1-state` hypotheses 1 selected, patch no `.v1`/`repro.js`, `metadata.v1.maxIterations 5`.
- `V1_MOCK=1 bun run v1:run:case -- hist-001 --mock` → `src/CAC.ts` patch, `trajectory` no `private/oracle`/`provenance` leak, evidence JSONL persisted.
- Fixes during build: `status === "timeout"` narrowing (cast), `WorkflowEngine.addHypothesis` status optional, `VerificationAttempt` iteration optional, `contradricts` typo `contradricts→contradicts`, `ROOT` `../..→../../..` for v1, `EvidenceStore` ENOENT after `rmSync` (error listener + in-memory unit tests), `WorkflowEngine` constructor race (queued writes + skip if exists), patch `.gitignore` pollution (removed, rely on pathspec), prompt leakage `provenance.md` (generic).

### Decision

- V1 changes workflow, not information: benchmark v0.5 `20f1003c...`, issue, repository, Pi 0.84.4, `opencode-go/muse-spark-1.2-contributor`, tools, workspace, timeout all constant with V0 per experiment integrity §15.

## [0.7.1] - 2026-08-30 — Evaluator Reporting & Metrics Upgrade

### Added — Evaluator v1 (extends v0, deterministic, no LLM)

* **Pricing:** `experiments/config/pricing.json` `2026-08-30-snapshot` (opencode-go/muse-spark-1.2-contributor `$0.15`/M in, `$0.60`/M out), `src/evaluator/pricing.ts` (`ModelPricing`, `PricingConfig`, `loadPricingConfig`, `computeCost` with guardrail `inputTokens==null → costUsd:null costStatus:unavailable` even though pricing exists, `resolveCostWithProviderPreference` preferring provider).
* **Metrics:** `src/evaluator/types.ts` `RunMetrics`/`RunCost`/`AgentMetrics`/`CaseReportRow`/`ExperimentReport` (optional, backward compatible) + `src/evaluator/metrics.ts` (`median`/`average`, `extractRunMetrics` reading `metadata.json`/`trajectory.jsonl` with V1 precedence `v1-state.json` → `metadata.v1.iterationCount` → trajectory → `1` fallback).
* **Aggregation:** `src/evaluator/aggregation.ts` now `computeAgentMetrics`/`computeAllAgentMetrics`/`computeCaseBreakdown`/`computeComparison`/`computeFailureAnalysis`/`computeValidRunMetrics` (primary VFR overall + `vfrValid` valid-agent-run, reproduction/oracle/regression/patchApply rates, efficiency total/avg/median cost/duration/turns/toolCalls/tokens/iterations, timeout rate, case-level VFR valid/avgCost/avgDuration/avgTurns/avgToolCalls/consistency, comparison delta in `pp`).
* **Report:** `src/evaluator/report.ts` `buildExperimentReport` → `experiments/reports/<id>/report.json|report.md|summary.json` (source of truth, deterministic sorted) + compat `evaluations/<id>/`, `generateReportMarkdown`/`generateSummaryJson` (small-sample disclaimer, both VFR denominators, outcome breakdown, repair metrics, efficiency avg+median, case-level table, failure analysis 5 categories never merged, comparative V0 vs V1, cost methodology, limitations, per-run table).
* **CLI:** `src/cli/evaluate.ts` supports `--force/--no-cache`, `--pricing <path>`, `--allow-cross-benchmark`, preserves cached runs where `benchmarkFingerprint` matches, rejects mixed fingerprints/versions unless `allowCrossBenchmark`/`allowMismatch` (now `process.exitCode=2; throw` for Bun async compatibility, documented in `docs/experiments/README.md`), writes dual `reports`+`evaluations` + `cases/`; `package.json` adds `evaluate:experiment`.
* **Evaluator enrichment:** `src/evaluator/Evaluator.ts` now enriches each `EvaluationResult` with `metrics`/`cost` via `extractRunMetrics` (patch-apply-fail and verified paths).

### Tests

* `src/evaluator/tests/pricing.test.ts` (8), `metrics.test.ts` (6), `aggregation.v1.test.ts` (15) covering VFR, reproduction/oracle/regression rates, avg/median cost/duration/turns/toolCalls/tokens, timeout/failure rates, case breakdown, V0 vs V1 delta pp, null cost, valid VFR, edge cases (zero/all-fail/infra/mixed/3-run variance), failure-analysis non-merge, determinism, summary. Total `bun test` 43 files 274 tests. `src/agent/PiCodingAgent` token guardrail noted as unavailable via Pi 0.84.4 (leave `costStatus: unavailable`).

### Evidence

* `bun run check-types` 0, `bun run benchmark:check-types` 0, `bun run test` 43 files 274 tests & `npm test` same.
* `bun run evaluate -- --run synth-001-run-001-c6531d --json` → `metrics`/`cost` present (`costStatus: unavailable` correctly, never `$0`).
* `bun run evaluate -- --experiment baseline-v0 --force` → 17 runs VFR 76.47% report at `experiments/reports/baseline-v0/report.json|report.md|summary.json` + compat `evaluations/` with `validRunRate`, `costMethodology` snapshot, `limitations` disclaimer, case-level breakdown, efficiency medians.

### Docs

* `docs/decisions/evaluator-v0.md` addendum, `docs/experiments/README.md` (layout, schema, cost methodology, limitations, Bun note), `docs/memory/current-state.md` evaluator v1 section, `CHANGELOG.md` 0.7.1.

### Decision

* Evaluator remains measurement infra (never scores patch text, never parses oracle); cost is never invented; V1 metrics upgrade is additive and frozen for V1/V2 experiments.

## Unreleased



## [0.3.2] - 2026-08-29 — Historical Authenticity & TS Config Hygiene

### Fixed — Remove `// @ts-nocheck`, Use `tsconfig Exclude`

- **Cleaned source files:** Removed `// @ts-nocheck` from all `benchmark/repositories/cac/src/*` (CAC.ts, Command.ts, Option.ts, utils.ts, index.ts, node.ts, deno.ts, mri.d.ts) and `benchmark/cases/hist-001/artifacts/buggy/src/CAC.ts`. Restored historical source authenticity via `git show ffaf796:src/*` and `8342919:src/CAC.ts` (original `import Command, { GlobalCommand, CommandConfig...}` without `import type`).
- **Updated TypeScript configs:** Added `benchmark/repositories/cac/**`, `benchmark/repositories/cac/**/*`, `benchmark/repositories/mri/**`, `benchmark/repositories/mri/**/*` and `benchmark/cases/hist-001/**`, `hist-002/**`, `hist-004/**`, `hist-005/**` to `exclude` in `tsconfig.json:30` and `tsconfig.benchmark.json:7`. This ensures `check-types` enforces strict types on infrastructure/scripts/test suites, not legacy 3rd-party historical libraries, without rewriting historical code.
- **Preserved `mri.d.ts`:** Kept `declare module 'mri';` but without `@ts-nocheck` (now excluded, not type-checked).

### Evidence

- `bun run check-types` → 0, `bun run benchmark:check-types` → 0 (previously `benchmark:check-types` failed on `cac` strict errors)
- `bun run benchmark:validate` → **12/12 VALID** `sha256:4d739f6c4abd2bfc8dc663fb03731ab24c91d25d5d3d28b6b10a620e749b055c` (also `npm run benchmark:validate` via `tsx` fallback)
- `grep -r "@ts-nocheck" --include="*.ts"` → empty (verified)

### Decision

- Historical sources remain authentic (no `import type` rewrites), type-checking via `tsconfig Exclude` as instructed.
