# Frontier Verifier Benchmark v0.5 — FROZEN

**Version:** 0.5 — FROZEN for experiments
**Cases:** 17 (12 Core: 6 genuine historical + 6 synthetic + 5 Frontier-Hard: all genuine historical)
**Repositories:** 12 (7 Core: 3 benchmark-owned + 4 external historical + 5 Frontier-Hard: immer, qs, superjson, p-queue, path-to-regexp — all MIT/BSD-3)
**Status:** Validated — 17/17 ✓ VALID (12/12 Core + 5/5 Frontier-Hard, isolated v0.5 validator, bun-first → vitest/tsx fallback)
**Fingerprint:** `sha256:20f1003c3f0e10bcd6293f49ca2a2167011941f5b0677076c93103b10f411dde`
**Stability:** reproduction 3×, oracle 3× per state, regression 1×, isolated temp workspaces
**Previous:** v0.4 `sha256:cead5c6e50fb88d367729ded45f77eb8375320953549e8ff41649731598e4b9e` preserved as `benchmark/validation-report.v0.4.json`

---

## Structure

```
benchmark/
  repositories/         # 7 Core repositories (MIT)
    task-manager/
    money-utils/
    async-queue/
    cac/
    defu/
    tinyspy/
    mri/
  cases/                # 12 Core cases (hist-001..006, synth-001..006)
    hist-001/
      manifest.json
      issue.md
      provenance.md
      public/reproduce.ts
      private/oracle.test.ts
      artifacts/buggy/src/...
    ...
  frontier-hard/        # 5 Frontier-Hard cases (hard-001..005) — deliberate hard subset
    repositories/       # 5 Frontier-Hard repositories (MIT/BSD-3)
      immer/
      qs/
      superjson/
      p-queue/
      path-to-regexp/
    cases/
      hard-001/
        manifest.json
        issue.md
        provenance.md
        curator-notes.md  # maintainer-only, never agent-visible
        public/reproduce.ts
        private/oracle.test.ts
        artifacts/buggy/src/...
      ...
  schema/
    manifest.schema.json
  scripts/
    validate.ts         # benchmark validator (discovers both Core and Frontier-Hard)
  CASE-MATRIX.md
  validation-report.json # v0.5 unified (17/17)
  validation-report.v0.4.json # preserved v0.4 (12/12)
```

**Conceptual organization:** `benchmark/cases` + `benchmark/repositories` = **Core Benchmark** (v0.4 frozen). `benchmark/frontier-hard/cases` + `benchmark/frontier-hard/repositories` = **Frontier-Hard** (v0.5 addition). Physical structure is additive to avoid risky moves; validator discovers both.

**Historical note:** The Core Benchmark remains byte-identical in behavior; only the validator and fingerprint were updated to include Frontier-Hard. See `docs/decisions/frontier-hard-benchmark-v0.md`.

## Agent View vs Evaluator View

- **Agent receives:** `benchmark/repositories/<repo>` (known-good), plus `issue.md` + `public/reproduce.ts` via workspace copy. **Does NOT receive** `private/oracle.test.ts` or `artifacts/buggy/`.
- **Evaluator uses:** `private/oracle.test.ts` + `artifacts/buggy/` + `manifest.json` to independently verify `buggy→fail`, `fixed→pass`.

Isolation is enforced by filesystem: evaluator creates per-case workspace copying only public assets. Never mount `private/` into agent environment.

## Reproducibility

Each case defines:
- runtime: Node 22, Bun 1.4.0 (or Node 22 + npm/pnpm/yarn with `vitest`/`tsx`), `bun install` / `npm install` + `npm test` / `bun run test` (`vitest run`)
- buggy state: apply `artifacts/buggy/src/...` over repository
- known-good: restore repository
- reproduction: `npx tsx benchmark/cases/<id>/public/reproduce.ts` or `bun run benchmark/cases/<id>/public/reproduce.ts` (exit 0 = pass, 1 = fail)
- oracle: `npx vitest run benchmark/cases/<id>/private/oracle.test.ts` or `bun test` fallback
- regression: `npx vitest run benchmark/repositories/<repo>/tests` or `bun test`

## Validation

```bash
bun run benchmark:validate        # via tsx, isolated temp, bun-first → vitest/tsx fallback (also npm run benchmark:validate)
npm run benchmark:validate        # same via tsx, works without bun (vitest fallback)
bun run benchmark:check-types     # benchmark harness types (also npm)
bun run check-types               # main project types
```

Checks for every case (v0.5 FROZEN — 17/17):

- manifest schema valid + path containment (absolute/traversal rejected) — now allows `hard-` ids and any repository
- repository available (Core + Frontier-Hard)
- dependencies install (pre-checked, `copy-anything`, `side-channel`, `eventemitter3`, `p-timeout` via `NODE_PATH`/`node_modules` in temp)
- buggy reproduces 3/3 fails (isolated temp, `bun` → `vitest`/`tsx` fallback for `immer` type-only imports)
- good passes 3/3 (isolated temp)
- oracle passes 3× on good, fails 3× on buggy (isolated, `bun` → `vitest` fallback on `SyntaxError`)
- regression tests pass (isolated)
- fingerprint `sha256` over manifests + issue.md + provenance.md + buggy + oracles + schema + 12 repos (7 Core + 5 Hard) included in report
- curator-notes.md explicitly excluded from fingerprint (maintainer-only, not verification)
- machine report at `benchmark/validation-report.json` (`benchmarkVersion 0.5`, `fingerprint`, `stability`); v0.4 report preserved at `validation-report.v0.4.json`

Example output:

```
Benchmark Validation
hist-001   ✓ VALID
...
12/12 cases valid
```

## Adding a Case

1. Choose repository (or add new under `benchmark/repositories/` with MIT license documented).
2. Create `benchmark/cases/<id>/` with `manifest.json`, `issue.md`, `public/reproduce.ts`, `private/oracle.test.ts`, `artifacts/buggy/src/...`.
3. Run `bun run benchmark:validate` — case must be VALID to be accepted.
4. Update `benchmark/CASE-MATRIX.md`.

## Provenance

All 11 historical cases are genuine external bugs with pinned buggyCommit → fixedCommit:
- Core: cac @ ffaf796, defu @ 3942bfb, tinyspy @ 0372bfb & 0684083, mri @ 94f8c09 & 5437ea5
- Frontier-Hard: immer @ a73672a, qs @ d56f48c, superjson @ 4054f3f, p-queue @ a64b316, path-to-regexp @ 8877f41
— all MIT/BSD-3, see each `provenance.md` and `manifest.json` + `benchmark/HISTORICAL-CANDIDATES.md` for evaluation. Synthetic cases are deterministic mutations from known-good on 3 benchmark-owned repos. See each `provenance.md` and `manifest.json` for license, source URL, commit, and mutation details. Benchmark now satisfies 11 genuine historical (6 Core + 5 Hard) and the hard subset is deliberately difficult.

## Frontier-Hard Purpose

The Core Benchmark achieved 100% VFR with the baseline Pi agent, indicating a ceiling effect. **Frontier-Hard** is a deliberately difficult 5-case subset designed to eliminate that ceiling and expose genuine reasoning failures. Cases were selected for **high reasoning, not large repo size** — e.g., a 300-line repo with a subtle invariant bug is preferred to a 20k-line repo with an obvious one-line fix. Selection criteria per `docs/decisions/frontier-hard-benchmark-v0.md`: cross-file reasoning, hidden invariant, state/lifecycle, async/concurrency, partial-fix traps, regression-sensitive, semantic/type-system. Each case has a narrow public repro and a broader hidden oracle that distinguishes a correct fix from a plausible incorrect one.

## Versioning

Benchmark v0.4 is preserved as `benchmark/validation-report.v0.4.json` (`cead5c6e...` 12/12). Benchmark v0.5 is now **FROZEN** for all subsequent experiments (baseline, V1, V2, final) with `ee9104f5...` (17/17). The Core Benchmark's 12 cases remain behaviorally identical; only the validator, fingerprint, and docs were updated to include Frontier-Hard. Any further change creates Benchmark v0.6. Never mix results across versions (v0.4 vs v0.5).

## License

Benchmark code: MIT. Repository licenses documented per case/manifest.

## Validation Report

See `benchmark/validation-report.json` for machine-readable results.
