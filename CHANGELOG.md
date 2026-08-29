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

## Unreleased

- Planned: evaluator isolation workspace builder, baseline agent, VFR metric pipeline.
