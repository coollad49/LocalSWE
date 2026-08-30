# Decision: Agent V1 — Structured Evidence-Aware Workflow

**Date:** 2026-08-30
**Status:** Accepted (frozen for experiments)
**Version:** agent-v1 (benchmark v0.5 FROZEN, `sha256:20f1003c3f0e10bcd6293f49ca2a2167011941f5b0677076c93103b10f411dde`)
**Previous:** baseline-v0 (unstructured, same Pi/model/workspace, 17/17 mock infra)

## Hypothesis

> Structured engineering state + evidence gates + bounded iteration improves verified bug-fixing performance (VFR) compared with the minimal V0 agent, under the same task information, model, and tools.

The principal independent variable is the workflow architecture; benchmark, issue, repository, model, model settings, tools, workspace, and timeout remain constant between V0 and V1.

## Architecture

```
Issue + Repository
        ↓
WorkspaceManager (same as V0: temp copy, buggy overlay, only ISSUE.md)
        ↓
V1CodingAgent — single persistent Pi session, phase turns
        ↓
WorkflowEngine (state machine) + EvidenceStore (file-based)
        ↓
patch.diff (scratch-clean) + trajectory + metadata+v1
        ↓
Evaluator v0 (downstream, no feedback to V1)
```

### Workflow Engine (src/v1/workflow/WorkflowEngine.ts)

- **Phases:** `reconnaissance → diagnosis → investigation → implementation → verification → finalization`
- **Allowed transitions:**

  | From | To |
  |------|----|
  | reconnaissance | diagnosis |
  | diagnosis | investigation |
  | investigation | diagnosis, implementation |
  | implementation | verification |
  | verification | finalization, investigation, implementation (loopback on failure) |
  | finalization | (terminal) |

- No arbitrary transitions; `InvalidTransitionError` on violation.
- **Phase tracking:** `phaseHistory: PhaseTransition[]`, `phaseDurations: PhaseDuration[]` with timestamps, iteration tagging.
- **State persistence:** `TaskState` persisted to `.v1/state.json` inside workspace (file-based, not regex). Queued writes (`persistChain`) avoid constructor race; `flushPersist()` for tests. Also mirrored to `experiments/runs/<runId>/v1-state.json` + `evidence.jsonl`.
- Intake: `issue`, `maxIterations` (default 5), `workspacePath`, `evidenceStore`, `stateFilePath`.

### Evidence System (src/v1/workflow/EvidenceStore.ts, src/v1/types.ts)

```ts
type EvidenceType = "file_inspection"|"command_result"|"test_result"|"reproduction"|"diff_inspection"|"other";
interface Evidence { id, type, description, source?, result?:"supports"|"contradicts"|"neutral", timestamp, phase }
```

- Internal telemetry only; never leaks hidden oracle (`private/oracle.test.ts`, `provenance.md`, `artifacts/buggy`).
- Helpers: `addFileInspection`, `addCommandResult`, `addTestResult`, `addReproduction`, `addDiffInspection`.
- Persisted as JSONL to `evidence.jsonl` (run dir) and mirrored via `.v1/state.json` (workspace).

### Evidence Gates (src/v1/workflow/gates.ts)

Gates require evidence, not prescribed commands (repo-agnostic):

- **RECON:** `filesInspected≥1` + `command_result|file_inspection` evidence + ≥1 evidence item.
- **DIAGNOSIS:** `hypotheses≥1` with `evidence.length>0` + ≥1 diagnosis evidence.
- **INVESTIGATION:** ≥1 `command_result|test_result|reproduction` evidence + command execution.
- **IMPLEMENTATION:** `selectedHypothesis` (or hypothesis status `selected`) + `changesMade≥1`.
- **VERIFICATION:** `verificationAttempts≥1` + `test_result|command_result|reproduction` evidence.
- **FINALIZATION:** `diff_inspection` evidence.

Gates are checked on `transitionTo(next)`; `forceTransitionTo`/`skipGate` only for budget exhaustion or deadlock.

### Hypothesis Tracking (file-based, per instruction #3)

- `Hypothesis { id, description, evidence[], confidence, status:"active"|"rejected"|"selected", files? }`
- Tracked via `.v1/state.json` read/written by agent, helper `src/v1/workflow/helpersTemplate.js` copied to workspace `.v1/helpers.js`:

  ```
  node .v1/helpers.js add-hypothesis '{"description":"...","evidence":["..."],"confidence":0.8}'
  node .v1/helpers.js select-hypothesis <id>
  node .v1/helpers.js add-evidence ...
  ```

- Engine merges file state on each phase turn (`syncStateFromWorkspaceFile`) deduplicating by id; `selectedHypothesis` is file-authoritative.
- No brittle regex text parsing; JSON is source of truth.

### Bounded Iteration

- Config `maxIterations` default 5, env `V1_MAX_ITERATIONS` / `AGENT_MAX_ITERATIONS`, persisted in `metadata.json: { modelConfiguration.maxIterations, v1.maxIterations }` and observable in run metadata.
- Incremented on `verification → investigation/implementation`.
- On `isBudgetExhausted()`: finalize with best available patch (or `iteration_exhausted`/`timeout` if no patch).
- No silent budget increase, no infinite loop.

### Single Persistent Pi Session (per instruction #1)

- One `createAgentSession` per case, `cwd = workspace`, same `SessionManager.inMemory(cwd)` as V0, same `ModelRuntime` + `DefaultResourceLoader` + `model` resolution (`PROVIDER`/`PROVIDER_API_KEY` via `setRuntimeApiKey`, `AGENT_MODEL` exact pi catalog id).
- Phases advance via **prompt turns**: initial `ISSUE.md + workflowOverview + reconnaissance prompt`, then sequential `getPhasePrompt(nextPhase)` appended with state summary, plus gate nudges and verification loopback prompts. All via `session.prompt(text)` with `AbortSignal` race.
- Subscriptions tag events with `_v1Phase`/`_v1Iteration`; tool calls auto-record `filesInspected`, `commandsExecuted`, `verificationAttempts`, and evidence types in real time.
- No re-instantiation of session between phases.

### Patch Hygiene (per instruction #2)

- Scratch files matching `isScratchFile` (`.v1/`, `repro.js`, `reproduce.ts`, `tmp/`, `.tmp/`, `scratch.js`, etc.) are **removed before capture** (`cleanupScratchFiles` scans workspace + `git status --porcelain` untracked).
- `.v1/` is **not added to `.gitignore`** to avoid patch pollution (prior implementation polluted `.gitignore` with `+.v1/` line). Hygiene is via `git` pathspec exclusions instead.
- `PatchCapture` (`src/patch/PatchCapture.ts`) now excludes `:!.v1`, `:!repro.js`, `:!tmp` etc. in `add -N` / `diff` / `status` / `diff --name-only`; `isIgnoredPath` extended for `.v1`, `repro.js`, `scratch.*`.
- Additional `sanitizePatchForScratchFiles` strips any leaked `.v1` hunks.
- Workspace `git` remains clean; canonical repos never mutated (PatchCapture pathspec).

### Telemetry (src/v1/types.ts, V1CodingAgent, V1Runner)

Extended `metadata.json` with `v1: { phaseTransitions, phaseDurations, iterationCount, maxIterations, commandsExecuted, commandCount, filesInspected, fileCount, filesChanged, toolCallCount, tokenUsage:null, cost:null, hypotheses, evidenceCount, verificationAttempts, finalPatchPath, trajectoryPath, evidencePath, v1StatePath }`.

- `tokenUsage`/`cost` are `null` when provider does not expose (no fabrication).
- Also persisted: `experiments/runs/<runId>/v1-state.json`, `evidence.jsonl`, `v1-workspace-state.json` (backup).
- All fields required for later evaluator/reporting: total cost, avg duration, tool calls, timeout rate, VFR, etc.

### Model / Tool Consistency

- Same Pi version `0.84.4`, same tools `read, bash, edit, write, grep, find, ls`, same `.env` `AGENT_MODEL` resolution, same workspace isolation (`WorkspaceManager`), same timeout.
- V1 prompt `experiments/agents/agent-v1.md` does **not** expose `public/reproduce.ts`, `private/oracle.test.ts`, `artifacts/buggy`, `provenance.md`, `benchmark case IDs` beyond normal issue text, or oracle results. Workspace still only contains `ISSUE.md` (no `public/reproduce.ts` per SWE-bench alignment).
- No hidden test, no benchmark-specific commands.

### Config & CLI

- `src/v1/config/V1Config.ts` extends `BaselineConfig` with `maxIterations`; loads `experiments/config/agent-v1.json` > `baseline.json` > env.
- `V1CodingAgent` / `V1Runner` mirror `PiCodingAgent`/`BaselineRunner` contracts, same `CodingAgent` interface.
- CLI `src/cli/run-v1-case.ts` (`bun run v1:run:case -- hist-001 --mock`), `run-v1.ts` (`bun run v1:run -- --mock --runs 1 --concurrency 1 --max-iterations 5`), scripts in `package.json`.

## What Changed from V0 / What Stayed Constant

| Aspect | V0 (baseline-v0) | V1 (agent-v1) | Constant? |
|--------|-------------------|---------------|-----------|
| Pi runtime / model | `pi 0.84.4`, `opencode-go/muse-spark-1.2-contributor` | same | **yes** |
| Tools | read,bash,edit,write,grep,find,ls | same | **yes** |
| Workspace | temp copy + buggy overlay, only ISSUE.md | same | **yes** |
| Benchmark | v0.5 17 cases `20f1003c...` | same | **yes** |
| Instructions | minimal | structured workflow prompt | **no** (IV) |
| State | implicit (agent memory) | explicit `WorkflowEngine` + `TaskState` + `.v1/state.json` | **no** (IV) |
| Evidence | none formal | `EvidenceStore` + gates | **no** (IV) |
| Iteration | unbounded (≤3 reruns hint) | bounded 5, observable | **no** (IV) |
| Patch hygiene | `.gitignore` + node_modules only | `.v1`+ scratch exclusion via pathspec + removal | **improved** |
| Session | single Pi session | single Pi session (phase turns, not re-instantiation) | **same pattern** |
| Telemetry | basic `RepairRun`/`RunMetadata` | extended with `v1:{phases,evidence,hypotheses}` | **extended** |

## Alternatives Considered

- Per-phase Pi session re-instantiation — rejected per instruction: leaks context, wastes tokens, harder to maintain coherence; single persistent session chosen.
- Regex text parsing for hypotheses — rejected per instruction; file-based JSON chosen.
- Modifying `.gitignore` to hide `.v1/` — rejected (pollutes patch); pathspec exclusion chosen.

## Evidence

- `bun run check-types` ✓ 0, `bun run benchmark:check-types` ✓ 0, `bun run benchmark:validate` 17/17 `20f1003c...` unchanged, `bun run test` 40 files 233 tests, `npm test` same.
- Mock runs: `V1_MOCK=1 bun run v1:run:case -- synth-001` → patch excludes `.v1/` and `repro.js`, `v1-state.json` has hypotheses/evidence/phases, `metadata.json:v1.maxIterations=5`, `evidence.jsonl` persisted.
- Workspace isolation verified: `private/oracle.test.ts` and `provenance.md` never appear in workspace or evaluator patch (path containment + workspace guards).
- Patch hygiene verified: `repro.js` created in mock is removed before capture; `git diff` with `:!.v1` excludes `.v1` hunks.

## Limitations

- Real V1 VFR requires valid `PROVIDER_API_KEY` and model; mock uses trivial comment patch (same as baseline mock) and will not achieve high `verified` without real LLM.
- Token/cost remains `null` if provider does not expose usage (no fake pricing).
- Evaluator remains downstream; V1 does not receive oracle feedback (V2 will).
