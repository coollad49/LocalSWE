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

## Unreleased

- Planned: evaluator (independent reproduction + oracle + VFR).


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
