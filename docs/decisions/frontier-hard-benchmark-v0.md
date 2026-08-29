# Decision: Frontier-Hard Benchmark v0.5

**Date:** 2026-08-29
**Status:** Accepted — FROZEN
**Benchmark:** v0.4 `cead5c6e...` (12 cases) → v0.5 `ee9104f5...` (17 cases: 12 Core + 5 Hard)
**Fingerprint:** `sha256:ee9104f5a7a03d0c227205de81fa24e464c23160ddf145051b08799693cbdf78`

---

## Context

The Core Benchmark (v0.4) achieved **100% VFR** with the baseline Pi coding agent, indicating a **ceiling effect** — the measuring instrument was not discriminative enough to guide subsequent improvements (`Baseline V0 → Agent V1 → V2 → Final`).

The task per `AGENTS.md` §9–10 is to **build an agent whose claims survive independent verification**, not to make the agent look intelligent. A benchmark where the baseline already scores 100% cannot measure progress.

We needed a small, deliberately difficult subset that exposes **genuine reasoning failures** in strong coding agents, without destroying the existing 12 cases or introducing flaky infrastructure.

---

## Decision

Introduce **Frontier-Hard**: exactly **5 real historical JavaScript/TypeScript bug-fix cases**, all **genuine historical** (not synthetic), selected for **high reasoning** rather than large repo size.

**Structure:** Additive, per spec §2:

```
benchmark/
  cases/ + repositories/           → Core (12, v0.4 preserved)
  frontier-hard/cases/ + repositories/ → Frontier-Hard (5, v0.5 addition)
```

- Keep `benchmark/cases` and `benchmark/repositories` physically intact (no risky move to `core/`).
- Validator and evaluator are updated to discover both roots via `resolveCaseDir`/`resolveRepoDir`, but the conceptual distinction (`Core` vs `Frontier-Hard`) is documented.
- The Core's 12 cases remain **byte-identical** in behavior; only the validator's fingerprint input and docs were updated to include Frontier-Hard.

**Versioning:** `v0.4 → v0.5` is a **material benchmark change**; `benchmark/validation-report.v0.4.json` is preserved, and `benchmark/validation-report.json` is now v0.5 with a new fingerprint. Results must never be mixed across versions.

---

## Why Core Was Insufficient

- 6 synthetic cases are controlled but not discriminative enough for strong agents.
- 6 historical Core cases (cac, defu, tinyspy×2, mri×2) are genuine but relatively **single-file, limited cross-file reasoning** and without strong partial-fix traps.
- The baseline's 100% VFR suggests the agent can follow the reproduction script and produce a plausible patch without deep reasoning.
- Frontier-Verifier's thesis is `Agent changes obvious line → Public reproduction passes → Hidden correctness test FAILS` — Core had limited opportunity for this.

---

## Selection Criteria (Hardness First)

A case is **NOT hard** merely because the repo is large, the PR is large, or the issue has many comments. Those are weak indicators.

**Required hardness (per spec §5):**

- **A. Cross-file reasoning** — `issue → API layer → helper → state transformation → actual defect`
- **B. Hidden invariant** — `X is broken` but `X must work WITHOUT violating invariant Y`
- **C. State/lifecycle bugs** — cache, ownership, subscription, restoration, stale state
- **D. Async/concurrency** — promise ordering, cancellation, queue, race (deterministic)
- **E. Partial-fix traps** (highest value) — `Public passes → Hidden FAILS`
- **F. Regression-sensitive** — must fix issue **and** preserve previous behavior
- **G. Semantic/type-system** — but not just a complicated TS error

**Ideal profile:** `repo small→medium, changed files 2–10, reasoning HIGH, reproduction deterministic, regression HIGH, superficial-fix risk HIGH, hidden-correctness HIGH`.

---

## Rejection Criteria (Strict)

Reject if **any** of §6 is true: one-line obvious fix, issue tells exact line, error message search reveals fix, public repro proves correctness, no regression surface, no architecture understanding needed, external service/network/secrets, non-deterministic, non-MIT/BSD, unverifiable provenance, not a bug, docs/UI, too large for infra, solvable by following repro, requires unavailable knowledge, cannot be evaluated deterministically.

---

## Provenance Policy

Every case preserves:

```
repository, repositoryUrl, issueUrl, pullRequestUrl, license, baseCommit, buggyCommit, fixedCommit, originalIssueTitle, originalIssueDate
```

Verified: `buggyCommit → reproduce FAILS` and `fixedCommit → reproduce PASSES` via `git archive`/`git show`, not just PR description. License verified MIT/BSD-3 with `LICENSE` file.

---

## Isolation Policy

- **Agent view (via `WorkspaceManager`):** `benchmark/frontier-hard/repositories/<repo>` (known-good) + `issue.md` + `public/reproduce.ts` (with `../../../repositories` relative import). **Never** `provenance.md`, `private/oracle.test.ts`, `artifacts/buggy/`, `curator-notes.md`.
- **Evaluator view:** `private/oracle.test.ts` + `artifacts/buggy/` + `manifest.json` — never mounted into agent workspace.
- **Workspace:** `mkdtemp` + `cpSync` per case/state, `git init` + `commit` buggy state before agent, `git diff HEAD` after for patch. `curator-notes.md` explicitly excluded (new for Frontier-Hard).
- **One case cannot contaminate another:** each workspace is `mkdtemp` with its own `benchmark/repositories/<repo>` + `benchmark/cases/<id>` copy; `artifacts/buggy` overlay is per-case via `manifest.buggyFiles`.

---

## Oracle Policy

- **Public (`public/reproduce.ts`):** narrow symptom check, `exit 0` pass / `1` fail, deterministic, `<5s`, no network, `import.meta` + `process.argv` guard for `bun`/`tsx`.
- **Private (`private/oracle.test.ts`):** behavioral, `vitest`, `from "vitest"`, never compares source or patch text, never checks for historical patch strings — a valid alternative implementation must pass. Tests hidden invariant + edge cases + regression.
- **Public must be narrower than oracle** whenever historical issue allows it — this enables `false_confidence` detection.

---

## Benchmark Freeze Policy

- **v0.5 is FROZEN** for `Baseline (v0.5) → V1 (v0.5) → V2 (v0.5) → Final (v0.5)`.
- Any change to cases, repositories, `issue.md`, `provenance.md`, `public/reproduce.ts`, `private/oracle.test.ts`, `artifacts/buggy`, `schema`, or repo snapshots creates **v0.6** with a new fingerprint.
- `benchmark/validation-report.v0.4.json` is preserved; never mix `cead5c6e...` and `ee9104f5...` results.
- The fingerprint is `sha256` over sorted `manifest.json` + `issue.md` + `provenance.md` + `buggyFiles` + `private/oracle.test.ts` + `public/reproduce.ts` + `schema` + 12 repo hashes (7 Core + 5 Hard). `curator-notes.md` is **not** in the fingerprint (maintainer-only).

---

## Consequences

- Benchmark size: 12 → 17 cases, 7 → 12 repos.
- The measuring instrument is now discriminative: baseline scored 100% on v0.4, but is **not** expected to score 100% on v0.5's 5 hard cases.
- Subsequent experiments (`EXP-003` etc.) will measure `VFR` on the 17-case frozen benchmark and must report `hard-*` failure breakdown.

---

## Alternatives Considered

- **Move Core to `benchmark/core/`:** Rejected — would require updating 20+ imports/configs/evaluator/validator/docs/fingerprint simultaneously, risking the v0.4 freeze. Additive is the smallest safe change.
- **Synthetic hard cases:** Rejected — spec requires all 5 be **real historical** with verifiable provenance.
- **Heavy monorepo builds (e.g., zod 4.x):** Rejected — requires `pnpm` + `rollup` + heavy deps, violates determinism and infra budget. Chose self-contained high-logic libs (immer, qs, superjson, p-queue, path-to-regexp) that are small/medium and deterministic.
- **Network/DOM-dependent cases (e.g., zustand persist with React/Testing Library, `kleur` `process.env`):** Rejected — fragile, non-deterministic.

---

## Evidence

- `bun run benchmark:validate` v0.5 isolated — **17/17 VALID** `sha256:ee9104f5...` (`reproduction 3×, oracle 3× per state, regression 1×`, `bun` → `vitest`/`tsx` fallback on `SyntaxError` for `immer`/`superjson` type-only imports, `NODE_PATH` for `side-channel`/`copy-anything`).
- `bun run check-types` + `bun run benchmark:check-types` — 0.
- `bun run test` — 30+ files (Core + Hard + evaluator) — all pass.

---

## References

- `benchmark/CASE-MATRIX.md` v0.5 — 17 rows, 5 hard detailed.
- `benchmark/HISTORICAL-CANDIDATES.md` — 5 kept, 15+ rejected.
- `docs/progress/frontier-hard-benchmark-v0.md` — per-case evidence.
- `CHANGELOG.md` 0.6.0 — entry.
