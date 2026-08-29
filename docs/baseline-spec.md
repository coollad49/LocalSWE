# Baseline v0 Specification

**Version:** baseline-v0 (frozen)
**Date:** 2026-08-29
**Benchmark:** v0.3 `sha256:4d739f6c4abd2bfc8dc663fb03731ab24c91d25d5d3d28b6b10a620e749b055c`
**Runtime:** Pi `@earendil-works/pi-coding-agent` 0.84.4

## Purpose

Establish the control condition for the Frontier Verifier experiment:

> How well can a straightforward Pi-based coding agent reproduce, diagnose, repair, and locally test a reported bug?

The baseline answers this without verification. The evaluator will independently decide correctness.

## Scope

* Pi is the only coding-agent runtime (via `CodingAgent` interface → `PiCodingAgent`).
* Agent runtime is separated from benchmark/evaluator.
* Repositories never mutated directly; each run gets isolated workspace.
* Instructions versioned at `experiments/agents/baseline-v0.md`; config explicit (`experiments/config/baseline.json` + `.env`).
* Patches, trajectories, metadata captured as machine-readable artifacts.
* Multiple runs + concurrency supported; timeout + structured errors; cleanup guaranteed.
* No evaluator, no scoring, no V1 verification.

## Workflow

```
Load benchmark case (CaseLoader)
        ↓
Create isolated working repository (WorkspaceManager: cp repo → overlay buggy → git init/commit)
        ↓
Start Pi session (createAgentSession, cwd=workspace, model from .env, tools read/bash/edit/write/grep/find/ls)
        ↓
Provide bug report (ISSUE.md) + reproduction (public/reproduce.ts rewritten to local imports)
        ↓
Agent inspects, reproduces, diagnoses, edits, runs tests (up to 3 reruns)
        ↓
Agent finishes → capture patch (git diff HEAD) + trajectory (JSONL via subscribe) + metadata (JSON)
        ↓
Cleanup workspace (if config.cleanup) → structured RepairRun
```

## Configuration

File `experiments/config/baseline.json` + env (`.env` with `PROVIDER`, `PROVIDER_API_KEY`, `AGENT_MODEL`):

```
AGENT_MODEL=opencode-go/muse-spark-1.2-contributor  # pi catalog id from node_modules/@earendil-works/pi-ai/dist/providers/data/opencode-go.json
PROVIDER=opencode-go
PROVIDER_API_KEY=<token>
AGENT_RUNTIME=pi
AGENT_VERSION=baseline-v0
BENCHMARK_VERSION=0.3
AGENT_THINKING_LEVEL=medium
AGENT_TIMEOUT_MS=600000
COMMAND_TIMEOUT_SEC=30
```

Defaults are for mock testing only; production model comes from `.env`.

## Agent Instructions

Stored at `experiments/agents/baseline-v0.md`. Summary: inspect repo, run `public/reproduce.ts`, diagnose, minimal edits, run `vitest run` / `npm test` until reproduction passes, summarize. Never read `private/` or `artifacts/`.

## Artifacts

Per run `experiments/runs/<runId>/`:

```
metadata.json  — RunMetadata (runId, caseId, benchmarkVersion, agentVersion, runtime, piVersion, model, thinkingLevel, maxTurns, timeouts, prompt path, start/end, duration, terminationStatus, changedFiles, testCommands, trajectory/patch/result paths, node/platform, fingerprint, tokenUsage/cost if available)
trajectory.jsonl — TrajectoryEvent[] (timestamp, seq, source system|agent|session|harness|runner, type agent_start|tool_execution_*, patch_captured, etc.)
patch.diff     — git diff HEAD (unified, empty if no changes)
result.json    — RepairRun (runId, caseId, agentVersion, benchmarkVersion, status success|failure|error|timeout, durationMs, changedFiles, patchPath, trajectoryPath, metadataPath, tests?, error?, model, thinkingLevel, piVersion, startedAt, endedAt)
```

## Security

* Workspace is temp dir (`/tmp/frontier-<case>-<run>-...`), isolated per case.
* Canonical `benchmark/repositories/*` never written.
* No secrets committed; `.env` in `.gitignore`; `ModelRuntime.setRuntimeApiKey` only passes `PROVIDER_API_KEY` for configured provider, not all env.
* No `private/oracle` or `artifacts` copied; `provenance.md` never copied.
* Best-effort cleanup via `rmSync(workspace, recursive:true)`.
* Exec helpers have `settled` guard + `SIGKILL` on timeout.

## Limitations

* Mock mode used for CI without keys (trivial patch); real VFR requires valid `PROVIDER_API_KEY` and model.
* No independent verification (evaluator is next component).
* Bash tool timeout is per-call, not global; harness enforces `agentTimeoutMs`.
* Historical `cac`/`mri` excluded from `tsconfig` for verbatim compatibility.

## Execution Commands

```bash
# one case, mock (no API key)
BASELINE_MOCK=1 bun run baseline:run:case -- synth-001
BASELINE_MOCK=1 bun run baseline:run:case -- hist-001 --mock

# one case, real (requires .env with PROVIDER, PROVIDER_API_KEY, AGENT_MODEL)
bun run baseline:run:case -- synth-001

# full baseline
BASELINE_MOCK=1 bun run baseline:run -- --mock --runs 1 --concurrency 2
bun run baseline:run -- hist-001 hist-002 --mock

# infra verification (17 checks, mock)
BASELINE_MOCK=1 npx tsx scripts/verify-baseline-infra.ts

# types
bun run check-types
bun run benchmark:check-types
bun run benchmark:validate
```

## Output Example

```
experiments/runs/synth-001-abc123-1717000000/
  trajectory.jsonl (21 lines, JSONL)
  patch.diff (diff --git a/src/task-manager.ts)
  metadata.json (benchmarkVersion 0.3, piVersion 0.84.4, model opencode-go/muse-spark-1.2-contributor)
  result.json (status success, durationMs 18000, changedFiles ["src/task-manager.ts"])
```
