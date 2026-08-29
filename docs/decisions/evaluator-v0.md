# Decision: Evaluator v0 — Deterministic Verification Layer

**Date:** 2026-08-29
**Status:** Accepted
**Version:** evaluator-v0 (runs against benchmark v0.4 FROZEN)
**Benchmark:** v0.4 `sha256:cead5c6e50fb88d367729ded45f77eb8375320953549e8ff41649731598e4b9e`
**Depends on:** baseline-v0, benchmark v0.4

## Context

After baseline-v0, the project has a functioning coding-agent runtime (Pi) that produces patches, but no independent way to determine whether a patch is actually correct. The central question is:

> When an AI agent claims it fixed a software defect, can we independently prove correctness?

We need a deterministic evaluation layer that turns an agent-produced `patch.diff` into executable evidence and a machine-readable verdict, without using an LLM as judge and without exposing hidden oracle information to the agent.

## Decision

Implement **Evaluator v0** as pure deterministic infrastructure:

```
Benchmark v0.4
      │
      ▼
Coding Agent (Pi) → patch.diff + metadata.json + trajectory.jsonl
      │
      ▼
Evaluator (this component)
      │
      ├── L1 Patch Apply (isolated temp, git apply --check)
      ├── L2 Public Reproduction (public/reproduce.ts, exit 0=pass)
      ├── L3 Hidden Oracle (private/oracle.test.ts, vitest, opaque)
      └── L4 Regression (benchmark/repositories/<repo>/tests, vitest)
      │
      ▼
Deterministic Verdict (verified | agent_failure | false_confidence | regression_failure)
      │
      ▼
Machine-readable EvaluationResult + logs in experiments/runs/<runId>/evaluation/
```

Evaluator is **not** a coding agent. It does not reason about bugs, modify source, call an LLM, compare patch text to historical fix, or parse oracle source. It only executes verification and records evidence.

### Architecture (project-owned, Pi-independent)

```
src/evaluator/
  types.ts              — Verdict, EvaluationStatus, StageResult, EvaluationResult, RunArtifact
  patchValidator.ts     — null-byte, absolute, traversal rejection for patch paths + diff headers
  exec.ts               — spawn() with explicit args, SIGTERM→SIGKILL, settled guard, timeout, stdout/stderr, bun-first→vitest/tsx fallback
  isolation.ts          — mkdtemp + cpSync (benchmark/repositories + benchmark/cases), git apply --check → git apply
  verdict.ts            — deterministic mapping (see taxonomy)
  benchmarkIdentity.ts  — load validation-report.json version+fingerprint, check mismatch
  aggregation.ts        — VFR + rates (verified/completed, repro/oracle/regression, failure rates)
  Evaluator.ts          — orchestration: artifact resolve → identity check → patch load → isolated workspace → ladder → verdict → persist
src/cli/evaluate.ts     — CLI: --run <runId>, --case <id> --patch <path>, --all, --allow-mismatch, --keep-workspace, --json, human-readable summary + JSON
```

Evaluator accepts a **run artifact**, not a Pi instance:

```
BaselineRunner → experiments/runs/<runId>/patch.diff → Evaluator
V1Runner       → patch.diff                         → Evaluator
V2Runner       → patch.diff                         → Evaluator
```

This decouples evaluator from `PiCodingAgent`/`BaselineRunner` except via the `patch.diff` + `metadata.json` contract.

### Verification Ladder (deterministic, short-circuit)

```
Patch Apply (10s)
    ↓ (must be "passed" to continue; empty patch counts as passed)
Reproduction (15s, public/reproduce.ts via bun run → tsx fallback)
    ↓ PASS → continue; FAIL → agent_failure; timeout/error → status timeout/error (no verdict)
Oracle (20s, private/oracle.test.ts via bun test → vitest fallback, opaque)
    ↓ PASS → continue; FAIL → false_confidence; timeout/error → status timeout/error
Regression (30s, benchmark/repositories/<repo>/tests via bun test → vitest fallback)
    ↓ PASS → verified; FAIL → regression_failure; timeout/error → status timeout/error
```

**Short-circuit where appropriate** (spec §8). Do not run later stages when earlier required stages fail, unless diagnostics needed. Precedence is documented: `false_confidence` only when oracle actually executed and failed; `regression_failure` only when regression actually executed.

### Verdict Taxonomy (exactly four primary verdicts)

```ts
type Verdict = "verified" | "agent_failure" | "false_confidence" | "regression_failure";
```

- **verified**: `repro PASS, oracle PASS, regression PASS` — fully verified repair.
- **agent_failure**: `repro FAIL` — did not resolve reproduced bug (oracle/regression skipped).
- **false_confidence**: `repro PASS, oracle FAIL` — satisfies public repro but fails stronger behavioral oracle. Key Frontier signal: repro alone insufficient. If regression also fails but oracle already failed, verdict stays `false_confidence` (precedence documented).
- **regression_failure**: `repro PASS, oracle PASS, regression FAIL` — fixed target but broke existing behavior.

A patch is **verified only when all three pass**. Reproduction-only success is not counted.

### Infrastructure Errors

```ts
type EvaluationStatus = "completed" | "error" | "timeout";
```

Distinguishes agent result from infrastructure failure:

- `completed` + `verdict` — deterministic agent outcome (even if verdict is failure).
- `error` — malformed patch, patch cannot apply, missing repo/case, benchmark mismatch, spawn error, stage `error`.
- `timeout` — any stage `timeout` (process killed after SIGTERM→SIGKILL, settled guard ensures exactly-once resolution). Not auto-classified as agent bug.

Payload includes `error.code` (e.g., `PATCH_TRAVERSAL`, `PATCH_APPLY_FAILED`, `BENCHMARK_VERSION_MISMATCH`, `STAGE_TIMEOUT`) and `reason` with stdout/stderr excerpt.

### Benchmark Integrity

- Before evaluating, load `benchmark/validation-report.json` (`benchmarkVersion` + `fingerprint` `sha256:cead5c...`), compare to run's `metadata.json` `benchmarkVersion`/`benchmarkFingerprint`. Refuse if mismatch unless `--allow-mismatch` (or `allowBenchmarkMismatch:true` programmatically). Never silently mix `v0.3` vs `v0.4` results.
- Treat `benchmark/` as immutable input. All execution happens inside `mkdtemp` workspace at `/tmp/frontier-eval-<case>-<random>/` containing `benchmark/repositories/<repo>` + `benchmark/cases/<id>`. After evaluation, `git status --short -- benchmark/repositories/ benchmark/cases/ benchmark/schema/` remains clean. Cleanup via `rmSync(tmpRoot, recursive:true, force:true)` best-effort; cleanup error recorded but doesn't corrupt benchmark state.
- Fingerprint travels with every `EvaluationResult` (`benchmarkVersion`, `benchmarkFingerprint`).

### Security

- **Patch path**: reject null bytes; patch file location validated when runId mode (must be inside `experiments/runs`).
- **Repository paths**: `validatePatchContentPaths()` parses `diff --git`, `---`, `+++` headers, rejects absolute (`isAbsolute`), traversal (`../`, `/../`, `..`), null bytes via `resolve(base)` containment. Reused from `benchmark/scripts/validate.ts` path-containment strategy.
- **Commands**: never interpolate agent-controlled strings into shell; use `spawn(cmd, args, {shell:false})` with explicit args. Reproduction/oracle/regression invocations use fixed commands (`bun run`/`bun test` with fallback to `node_modules/.bin/tsx`/`vitest` or `npx`).
- **Timeouts**: every child process has timeout (`patch 10s, repro 15s, oracle 20s, regression 30s` by default, configurable via `EvaluateOptions.timeouts`). On timeout: `SIGTERM`, escalate to `SIGKILL` after 1s, wait for `close`, resolve exactly once via `settled` + `promiseResolved` guards, record `timedOut:true`.
- **Temporary directories**: `mkdtemp(join(tmpdir(), "frontier-eval-"))`, ensured cleanup (or retained with `--keep-workspace` for debugging).

### Determinism

- No LLM inside evaluator, no heuristic scoring, no natural-language judgment (“looks good”). Correctness from exit codes only (0=pass, 1=fail, timeout/error distinct). Multiple runs of `evaluate(patch)` against same benchmark yield same verdict unless underlying test is nondeterministic (benchmark validation already checks 3× stability).
- `benchmarkVersion` + `fingerprint` + `caseId` + `runId` + `startedAt`/`completedAt`/`durationMs` recorded for reproducibility. Aggregated metrics (`VFR = verified / completed ×100`) calculated from raw results.

### Evidence Preservation

Per run `experiments/runs/<runId>/evaluation/`:

```
result.json         — EvaluationResult (machine-readable, deterministic, includes all stage results)
reproduction.log    — command, exitCode, status, stdout, stderr
oracle.log          — same (oracle output opaque but preserved)
regression.log      — same
patch-apply.log     — same
```

Raw evidence never thrown away; summary reproducible from `result.json`. Also supports direct `--case --patch` mode where `runId` is synthetic and evaluation is still persisted under `experiments/runs/<runId>/evaluation/`.

### CLI

```bash
# run artifact
bun run evaluate -- --run <runId>
npm run evaluate -- --run <runId>
npx tsx src/cli/evaluate.ts --run <runId>

# direct patch
bun run evaluate -- --case hist-001 --patch path/to/patch.diff
bun run evaluate -- --case synth-001 --patch patch.diff --allow-mismatch --json

# all runs
bun run evaluate -- --all

# keep workspace for debugging
bun run evaluate -- --run <runId> --keep-workspace
```

Human-readable summary:

```
Frontier Verifier Evaluation
Case: hist-001  Run: baseline-001  Benchmark: v0.4  Fingerprint: sha256:...
Patch: APPLIED
Reproduction: PASS
Oracle:        PASS
Regression:    PASS
VERDICT: VERIFIED
```

For `false_confidence`:

```
Reproduction: PASS
Oracle:        FAIL
Regression:    SKIPPED
VERDICT: FALSE_CONFIDENCE
```

Machine-readable JSON also printed with `--json` and always written to `evaluation/result.json`.

### Aggregation (minimal, future-compatible)

`src/evaluator/aggregation.ts` provides `aggregateResults(results: EvaluationResult[]) → AggregatedMetrics` with:

- `total`, `completed`, `errors`, `timeouts`
- `byVerdict: {verified, agent_failure, false_confidence, regression_failure}`
- `rates: {vfr, reproductionPassRate, oraclePassRate, regressionPassRate, agentFailureRate, falseConfidenceRate, regressionFailureRate}`

`VFR = verified / completed ×100` (or verified/total if no completed). Documented formula, not silent repro-only. Currently used by `evaluate --all` for summary; full V1/V2 reporting deferred (no dashboards).

### Tests

Evaluator tests cover (§20):

- **Patch handling**: valid patch applies, malformed patch, patch cannot apply (nonexistent file), traversal, absolute path, null byte (`patchValidator.test.ts`, `evaluator.integration.test.ts` 6 tests).
- **Reproduction**: passes, fails, timeout, process error (`exec.test.ts`, integration `verified` vs `agent_failure`, timeout with 1ms).
- **Oracle**: passes, fails, timeout (integration `verified` vs `false_confidence`, exec timeout).
- **Regression**: passes, fails, timeout (integration `verified` vs `regression_failure`, exec timeout).
- **Verdict mapping**: explicit `PASS PASS PASS → verified`, `FAIL → agent_failure`, `PASS FAIL → false_confidence`, `PASS PASS FAIL → regression_failure` (`verdict.test.ts` 9 tests).
- **Isolation**: does not modify `benchmark/repositories/`, `benchmark/cases/`, `git status` clean, temp cleanup, `keepWorkspace` (`isolation.test.ts` 4 tests).
- **Repeatability**: same known-good patch 3× stable (`evaluator.integration.test.ts`).
- **Benchmark identity**: mismatched version/fingerprint rejected, allowed with flag (integration 2 tests).
- Plus exec unit (6 tests: stdout, exit code, timeout SIGKILL, missing executable, stderr, no shell interpolation) and aggregation (2 tests). Total evaluator tests: 31 (plus 114 benchmark/repo/oracle tests).

### What evaluator does NOT do (reserved)

- Does not generate fixes, modify source, or call LLM.
- Does not inspect patch “looks correct” or compare to historical fix.
- Does not parse oracle source for expected strings.
- Does not score via heuristics or natural language.
- Does not build V1/V2 experiment system, dashboards, or charts (aggregation is minimal types/interfaces for future).

### Alternatives considered

- **Reuse WorkspaceManager for evaluator**: considered but evaluator needs benchmark-structured tmpRoot (`benchmark/repositories` + `benchmark/cases`) so `../../../repositories` imports resolve without rewrite; WorkspaceManager uses repo-root workspace with import rewrite. Chose to replicate validator isolation (`mkdtemp` + `cpSync` of repo + case) for fidelity.
- **Git patch apply vs `patch -p1`**: chose `git apply --check` then `git apply` for stricter context validation and path traversal detection via `diff --git` parsing; fallback not needed as `git` is available.
- **Bun-only vs fallback**: chose bun-first (`bun run`/`bun test`) with fallback to `node_modules/.bin/tsx`/`vitest` or `npx` for npm/pnpm/yarn users without bun, mirroring `benchmark/scripts/validate.ts`.
- **Top-level `timeout` vs `completed` with timeout stage**: chose `status=timeout` when any stage timeout, `verdict=undefined` for timeouts to distinguish infrastructure from agent failure; `completed` only when verdict determined. Documented precedence.

### Consequences

- Benchmark remains frozen v0.4; evaluator is versioned independently (`evaluator-v0`) and can evaluate `baseline-v0`, `v1`, `v2` without rewrite.
- Every run now has deterministic, independently verifiable evidence (`evaluation/result.json` + logs).
- Security posture improved: untrusted patches treated as untrusted input (path containment, no shell, timeouts).
- `benchmark/repositories/` never mutated (copy-on-write temp).
- Future experiment aggregation can consume `EvaluationResult` without changing evaluator.

### Evidence

- `bun run check-types` → 0, `bun run benchmark:check-types` → 0
- `bun run benchmark:validate` → 12/12 VALID `sha256:cead5c6e...` (unchanged)
- `bun run test` → 25 files 145 tests (19 benchmark/oracle + 6 evaluator) — all pass (`npm test` same)
- Manual smoke: `bun run evaluate -- --case synth-001 --patch empty` → `VERIFIED`; `--patch buggy` → `AGENT_FAILURE`; `partial` → `FALSE_CONFIDENCE`; `regression` → `REGRESSION_FAILURE`; `traversal` → `PATCH_TRAVERSAL` error
- Manual `BASELINE_MOCK=1 bun run baseline:run:case -- synth-001` → `patch.diff` (comment) → `bun run evaluate -- --run <runId>` → `VERIFIED`, `experiments/runs/<runId>/evaluation/result.json` persisted
- `git status --short -- benchmark/repositories/ benchmark/cases/ benchmark/schema/` clean after evaluations; `experiments/runs` ignored via `.gitignore`
- `npm run evaluate -- --case synth-001 --patch /tmp/empty.patch` also works (vitest fallback if no bun)

### Risks / Limitations

- Mock baseline patches are trivial comments; real VFR measurement requires valid `PROVIDER_API_KEY` and model (same as baseline).
- Historical `cac`/`mri` excluded from `tsconfig` via `exclude` for verbatim compatibility (unchanged).
- Timeout values are heuristic (15s repro, 20s oracle, 30s regression); very slow but correct patches could be misclassified as timeout — configurable via `EvaluateOptions.timeouts`.
- Evaluator does not yet sandbox CPU/memory or network; trusts `vitest`/`tsx` to not exfiltrate, but runs isolated via temp workspace.

## References

- `benchmark/validation-report.json` v0.4 `cead5c6e...`
- `src/evaluator/Evaluator.ts` (orchestrator)
- `src/cli/evaluate.ts` (CLI)
- `src/evaluator/tests/` (31 evaluator tests)
- `package.json` scripts `evaluate`, `evaluator:test`
