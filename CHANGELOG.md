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

## Unreleased

- Planned: incremental real historical cases (starting `cac@ffaf796`), evaluator workspace builder, baseline agent.
