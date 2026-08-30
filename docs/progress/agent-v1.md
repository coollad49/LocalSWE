# Progress — Agent V1

**Date:** 2026-08-30
**Agent:** agent-v1 (structured workflow around same Pi/model/workspace as V0)
**Benchmark:** v0.5 FROZEN `sha256:20f1003c3f0e10bcd6293f49ca2a2167011941f5b0677076c93103b10f411dde` (17 cases, 12 repos) — unchanged, no mixing
**Model:** `opencode-go/muse-spark-1.2-contributor` (same as V0, via `.env` `AGENT_MODEL`), Pi 0.84.4
**Status:** Implemented, type-checked, tested, mock-validated

## Hypothesis

Structured state (recon→diagnosis→investigation→implementation→verification→finalization) + evidence gates + file-based hypothesis tracking + bounded iteration improves verified rate (VFR) vs unstructured V0, holding model/tools/workspace constant.

## What Was Built

### Core (src/v1/)

- `src/v1/types.ts` — `AgentPhase`, `Hypothesis`, `Evidence`, `CommandExecution`, `FileChange`, `VerificationAttempt`, `TaskState`, `V1Telemetry`, `ALLOWED_TRANSITIONS`, `PHASE_ORDER`.
- `src/v1/config/V1Config.ts` — extends `BaselineConfig` with `maxIterations` (default 5, env `V1_MAX_ITERATIONS`/`AGENT_MAX_ITERATIONS`, file `experiments/config/agent-v1.json`), validated bounds 1–20.
- `src/v1/workflow/EvidenceStore.ts` — EvidenceStore with file+in-memory, JSONL persist, typed helpers, error-suppressed writeStream (fixes Vitest ENOENT after tmpdir delete).
- `src/v1/workflow/gates.ts` — pure gate functions per phase, repo-agnostic (checks evidence types, not fixed commands).
- `src/v1/workflow/WorkflowEngine.ts` — state machine with `transitionTo` (gate-checked), `forceTransitionTo`, `canTransitionTo`, iteration increment on `verification→investigation/implementation`, `phaseHistory/phaseDurations` tracking, `.v1/state.json` file-based persistence via queued writes (`persistChain` + `flushPersist` to avoid constructor race; skips initial overwrite if file exists).
- `src/v1/workflow/helpersTemplate.js` — helper copied to workspace `.v1/helpers.js` for `add-hypothesis`, `select-hypothesis`, `add-evidence`, etc. (file-based, not regex).
- `src/v1/agent/phasePrompts.ts` — per-phase instructions + workflow overview (generic constraints, no `private/`/`provenance.md` leak).
- `src/v1/agent/V1CodingAgent.ts` — implements `CodingAgent`, single persistent Pi session (per #1), phase turns via `session.prompt`, real-time evidence/files/hypothesis tracking, `syncStateFromWorkspaceFile` merging, gate nudge + verification loopback prompts, bounded iteration, patch hygiene (per #2), telemetry enrichment, mock mode mirroring all phases.
- `src/v1/runner/V1Runner.ts` — mirrors `BaselineRunner`, delegates to `V1CodingAgent`, same concurrency/timeout/cleanup, fingerprint via `benchmark/validation-report.json`.

### Patch Hygiene & Security

- `src/patch/PatchCapture.ts` updated: `isIgnoredPath` now includes `.v1`, `repro.js`, `scratch.*`; all `git add -N`/`diff`/`status` calls exclude `:!.v1`, `:!repro.js`, `:!tmp` etc. Defensive `sanitizePatchForScratchFiles` remains.
- `cleanupScratchFiles` in V1 removes `repro.js` etc. before capture; `.gitignore` is **not** modified (avoids `+.v1/` patch pollution).
- `WorkspaceManager` unchanged (still only `ISSUE.md` in workspace, no `provenance.md`/`private`/`artifacts`/`curator-notes.md`).

### CLI & Config

- `experiments/agents/agent-v1.md` — versioned prompt with phase responsibilities, generic hidden-file constraint.
- `experiments/config/agent-v1.json` — `maxIterations:5`, same timeouts/model as baseline.
- `src/cli/run-v1-case.ts` (`bun run v1:run:case -- hist-001 --mock`), `src/cli/run-v1.ts` (`bun run v1:run -- --mock --runs 1 --concurrency 1`), package scripts `v1:run:case`, `v1:run`, `v1:validate`.

### Tests (src/v1/tests/)

- `workflow.test.ts` — phase transitions (valid, invalid, gate failure, loopback, budget exhaustion, history/durations, force).
- `evidenceGates.test.ts` — gate pure functions, repo-agnostic (custom repro passes).
- `evidenceStore.test.ts` — record/count/filter, persistence, no leakage.
- `hypothesis.test.ts` — file-based hypothesis tracking, select/reject, JSON structure over regex, `loadState`.
- `v1RunnerIntegration.test.ts` — mock end-to-end (evidence, phases, hygiene, budget, isolation, diff_inspection), all via `V1_MOCK=1`, `mock-v1` runs root, canonical repo untouched.

Total: 40 files, 233 tests (was 25 files 145 tests before V1).

## Verification (exact commands)

```bash
bun run check-types                    # 0
bun run benchmark:check-types          # 0
bun run benchmark:validate             # 17/17 VALID 20f1003c...
bun run test                           # 40 files 233 tests (vitest)
npm test                               # same
V1_MOCK=1 bun run v1:run:case -- synth-001 --mock   # patch excludes .v1/repro.js, metadata.v1 evidencia
V1_MOCK=1 bun run v1:run:case -- hist-001 --mock    # trajectory has no private/oracle leak
```

All passed 2026-08-30.

## Telemetry Example (mock run synth-001)

`metadata.json:v1` contains `phaseTransitions[6]`, `phaseDurations[6]`, `iterationCount:0`, `maxIterations:5`, `commandCount:3`, `fileCount:2`, `toolCallCount`, `tokenUsage:null`, `cost:null`, `hypotheses[1]`, `evidenceCount:9`, `verificationAttempts[1]`, `evidence.jsonl`, `v1-state.json` with `.v1/state.json` merge.

## Iterative Fixes During Build

- Initial `check-types` failed due to `WorkflowEngine.addHypothesis` required `status` (made optional), `VerificationAttempt` missing `iteration` (made optional), `WorkflowEngine persistState` callback-type mismatch (fixed to `fs/promises`), `V1CodingAgent` narrowed `status === "timeout"` (cast to `string`), typo `contradricts` vs `contradricts` (fixed `types.ts` typo `contradricts` → `contradicts`), `ROOT` resolution off by one (`../..` → `../../..` for `src/v1/*`), `EvidenceStore` ENOENT after tmpdir delete (added error listener + in-memory stores for unit tests), `WorkflowEngine` constructor race overwriting `state.json` (queued writes + skip if exists), patch hygiene `+.v1/` in `.gitignore` (removed modification, rely on pathspec), prompt leakage `provenance.md` in trajectory (made generic).

## Next

- Run real V1 (non-mock) on v0.5 17 cases, evaluate via `bun run evaluate` to measure VFR vs baseline, per `docs/decisions/agent-v1.md` experiment protocol. Do not mix v0.3 results.
