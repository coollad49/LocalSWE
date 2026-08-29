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

### Decisions

- Keep 7 repos (exceeds 3–5 target) to meet 6 genuine (2 tinyspy + 2 mri share repos, so 4 external repos for 6 cases) — diversity preserved.
- Leave `money.ts:13`/`validators.ts:38-41` untouched per instruction (predictable reference, not polish).
- `cac` historical uses `@ts-nocheck` for `verbatimModuleSyntax` (external code).
- Shared repos (`mri` at `5437ea5`, `tinyspy` at `0372bfb`) contain both fixes for that repo — `hist-004` baseCommit `5437ea5` includes `94f8c09` fix (documented).

## Unreleased

- Planned: evaluator workspace builder, baseline agent (FROZEN v0.3, no benchmark changes).

