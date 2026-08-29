# Decision: Baseline v0 — Pi Coding Agent Runtime

**Date:** 2026-08-29
**Status:** Accepted
**Version:** baseline-v0 (frozen for experiments)
**Benchmark:** v0.3 (fingerprint `sha256:4d739f6c4abd2bfc8dc663fb03731ab24c91d25d5d3d28b6b10a620e749b055c`)

## Context

The project requires a reproducible control condition for measuring repair/verification improvements. The benchmark (12 cases, 6 genuine historical) is frozen; the agent runtime must remain constant across baseline → v1 → v2 → v3 while verification methodology evolves.

The competition charter fixes the coding-agent runtime:

> **Pi is the coding-agent runtime.** (`@earendil-works/pi-coding-agent` 0.84.4 + `@earendil-works/pi-agent-core` 0.84.4 + `@earendil-works/pi-ai` 0.84.4)

Pi owns the coding-agent interaction; the project owns benchmark, orchestration, evaluation, evidence, metrics.

## Decision

Implement **Baseline v0** as a competent conventional Pi-based workflow:

```
Load case → isolated workspace (temp, no canonical mutation) → Pi session (cwd = workspace) → bug report → inspect → reproduce → diagnose → edit → test → iterate → git diff → trajectory → metadata
```

Baseline is *not* responsible for determining correctness; the future evaluator is.

### Architecture (project-owned abstraction)

```
Benchmark
    │
    ▼
BaselineRunner (src/runner/BaselineRunner.ts)
    │
    ▼
CodingAgent interface (src/agent/CodingAgent.ts)
    │
    ▼
PiCodingAgent (src/agent/PiCodingAgent.ts)  ← only implementation required
    │
    ▼
Isolated Repository (WorkspaceManager)
    │
    ▼
Candidate Patch + Trajectory + Metadata
```

* `CodingAgent { run(task: RepairTask): Promise<RepairRun> }` decouples benchmark/evaluator/reporting from Pi SDK types.
* `PiCodingAgent` adapts Pi via `createAgentSession` (SDK), not terminal scraping. Falls back to deterministic mock when `BASELINE_MOCK=1` or `AGENT_MODEL=mock` for CI without keys.
* `WorkspaceManager` copies `benchmark/repositories/<repo>` to temp, overlays `artifacts/buggy/`, copies `issue.md` → `ISSUE.md` and `public/reproduce.ts` → `workspace/public/reproduce.ts` (with import rewrite `../../../repositories/<repo>/` → `../`), never copies `provenance.md`/`private/oracle.test.ts`/`artifacts/`. Initializes `git` and commits buggy state so `git diff HEAD` after = pure agent patch. Verifies `git status --porcelain` empty before agent start.
* `BaselineConfig` (`src/config/BaselineConfig.ts`) loads from `experiments/config/baseline.json` + env (`AGENT_MODEL` from `.env` is source of truth, no synthesis; `PROVIDER`/`PROVIDER_API_KEY` only for `ModelRuntime.setRuntimeApiKey`). Supports `AGENT_THINKING_LEVEL`, `AGENT_TIMEOUT_MS`, `COMMAND_TIMEOUT_SEC`, `BENCHMARK_VERSION`, `AGENT_VERSION`, `PI_VERSION`. Pi version auto-detected from `node_modules/@earendil-works/pi-coding-agent/package.json`.
* Trajectory via `session.subscribe` + `agent.subscribe` → `TrajectoryCapture` JSONL (structured, not terminal scrape).
* Patch via `git diff HEAD` after `git add -N .`; changed files via `git status --porcelain` + `git diff --name-only HEAD`.
* `CaseLoader` validates manifest/path containment before workspace creation.
* Timeouts: `agentTimeoutMs` (default 600s) via `AbortController` + `Promise.race`; `commandTimeoutSec` for local `exec` helpers. Single terminal transition (`setTerminal` guard) prevents timeout/close races.
* Error handling: invalid case / missing repo / workspace failure / Pi init failure / timeout / command timeout / malformed response / filesystem / cleanup → structured `RepairRun.status = error|timeout` rather than crash; cleanup best-effort.
* Multiple runs: `runId = <caseId>-run-XXX-<uuid>`; concurrency via batched workers (default 1 for correctness, optional `--concurrency 2-4`).

### Pi Configuration

* **Runtime:** `pi` (`@earendil-works/pi-coding-agent` 0.84.4, catalog at `node_modules/@earendil-works/pi-ai/dist/providers/data/opencode-go.json`)
* **Model:** sourced from `.env` `AGENT_MODEL=opencode-go/muse-spark-1.2-contributor` (exact pi catalog id; not `meta/muse-spark-1.2`). `PROVIDER=opencode-go` + `PROVIDER_API_KEY` injected via `ModelRuntime.setRuntimeApiKey`. No hard-coded synthesis in code; `DEFAULTS.model` fallback only for mock tests.
* **Thinking:** `medium` (env `AGENT_THINKING_LEVEL`)
* **Tools:** `read, bash, edit, write, grep, find, ls` (Pi's `createCodingTools` + grep/find/ls)
* **Timeouts:** `agentTimeoutMs=600000`, `commandTimeoutSec=30`
* **Prompt:** versioned artifact `experiments/agents/baseline-v0.md` (also appended via `DefaultResourceLoader.appendSystemPromptOverride`; task prompt adds `ISSUE.md` + steps). No hidden oracle.

### Agent Instructions (verbatim → `experiments/agents/baseline-v0.md`)

See `experiments/agents/baseline-v0.md` — role, workflow (inspect → reproduce via `npx tsx public/reproduce.ts` → diagnose → edit → test → iterate ≤3×), constraints (never read `private/`/`artifacts/`), output expectation. Stored as versioned file, not only in TS.

### What baseline does NOT do (reserved for evaluator/v1)

Independent reproduction, hidden oracle execution, scoring, regression scoring, evidence grading, statistical aggregation, adversarial testing, multi-agent verification, semantic patch analysis.

### Alternatives considered

* Low-level `Agent` (`@earendil-works/pi-agent-core`) with manual tool wiring — rejected: more code, duplicates Pi coding-agent's tool wiring and session handling; `createAgentSession` already provides correct read/bash/edit/write + session persistence.
* CLI spawning `pi -p` — rejected: would scrape terminal output instead of structured `subscribe` events (§14).
* Custom LLM loop via raw API — rejected per §1.

### Consequences

* `benchmark/repositories/*` never mutated (copy-on-write temp).
* Every run isolated; `git diff HEAD` captures only agent work.
* Trajectory JSONL + patch diff + metadata.json + result.json per `experiments/runs/<runId>/` enables future evaluator.
* Mock mode allows 17/17 infrastructure checks to pass without API keys (`BASELINE_MOCK=1`).
* Pi remains constant; improvements are verification-side.

### Evidence

* `bun run check-types` ✓ 0, `bun run benchmark:check-types` ✓ 0
* `bun run benchmark:validate` 12/12 VALID fingerprint `sha256:4d739f6c...`
* `BASELINE_MOCK=1 npx tsx scripts/verify-baseline-infra.ts` — 17/17 passed (15 required + 2 sanitation): loads case, workspace, canonical untouched, Pi session, instructions, inspect, modify, commands, trajectory JSONL, patch `git diff`, metadata, timeout (exec), cleanup, failed-case isolation, concurrent 2×, plus private/oracle leakage guard and git clean state.
* Manual: `BASELINE_MOCK=1 bun run baseline:run:case -- synth-001` → `src/task-manager.ts` patch, `trajectory.jsonl` 21 lines, `metadata.json` with `benchmarkFingerprint`; `hist-001` similar `src/CAC.ts`.

### Risks / Limitations

* Mock edits are trivial comments, not real fixes — ok for infra tests; real model needed for true VFR measurement.
* `mri`/`cac` historical repos excluded from `tsconfig` via `exclude` for type hygiene.
* Concurrency capped at 4 for safety; evaluator will need stronger sandbox before untrusted code at scale.
