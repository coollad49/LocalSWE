# LocalSWE — Reproduction & Evaluation Guide

> **micro1 Agentic Workflows Hackathon Deliverable 02**  
> This guide walks judges, evaluators, and engineers through reproducing all benchmark runs, evaluations, and metrics from a clean environment.

---

## 1. System Requirements & Setup

- **Runtime:** [Bun](https://bun.sh) v1.2+ (or Node.js v20+)
- **Tools:** Git 2.30+
- **Hardware:** Any standard developer laptop or workstation (tested on a 64 GB workstation).
- **Supported Platforms:** Windows, macOS, Linux.
- **Foundational Runtime:** Powered by **Pi Agent** (`@earendil-works/pi-coding-agent`) for low-level session execution.

---

## 2. Getting the Codebase

### Option A: From Downloaded Submission Archive (`.zip` / `.tar.gz`)
```bash
# Unpack the downloaded archive
unzip localswe.zip
cd localswe

# Install dependencies
bun install
```

### Option B: From GitHub Repository
```bash
# Clone the repository
git clone https://github.com/coollad49/LocalSWE.git
cd LocalSWE

# Install dependencies
bun install
```

---

## 3. Quick Verification: Deterministic Evaluation (0 API Cost, ~5 Seconds)

The repository includes all **130 authentic LLM trajectory runs and patch diffs** in `experiments/runs/`. You can evaluate the entire dataset deterministically against the private benchmark oracle without needing an API key:

```bash
bun run evaluate -- --runs-dir experiments/runs --force
```

### Expected Output:
```text
Evaluating 130 runs from experiments/runs...
[progress] [1/130] hard-001-run-001-14d43b — starting...
...
[progress] [130/130] synth-006-run-001-f04458 — starting...

==============================================================================
  EXPERIMENT RESULTS — COMPARATIVE PERFORMANCE
==============================================================================

--- AGENTS OVERVIEW ---
  agent-v2 (LocalSWE)| Runs: 18   | VFR: 77.8%    | AvgCost: $0.0243    | AvgDur: 253.7s
  baseline-v0        | Runs: 62   | VFR: 71.0%    | AvgCost: $0.0639    | AvgDur: 300.7s
  agent-v1           | Runs: 50   | VFR: 60.0%    | AvgCost: $0.1225    | AvgDur: 437.3s
```

---

## 4. Live Cloud / API Execution & CLI Capabilities

To execute live test runs against the capability-equivalent cloud model (`opencode-go/mimo-v2.5`):

### 1. Configure Environment:
Create a `.env` file in the root directory:
```env
PROVIDER=opencode-go
PROVIDER_API_KEY=<your_api_key>
AGENT_MODEL=opencode-go/mimo-v2.5
```

### 2. Run Any Specific Case for Any Agent:
```bash
# Run LocalSWE (Agent V2) on a specific case:
bun run v2:run:case -- synth-001
bun run v2:run:case -- hard-001

# Run Agent V1 on a specific case:
bun run v1:run:case -- synth-001

# Run Baseline v0 on a specific case:
bun run baseline:run:case -- synth-001
```

### 3. Run a Completely Fresh Master Experiment from Scratch:
If you want to run all 3 agents (Baseline, V1, and LocalSWE) live without reusing any cached runs from disk:
```bash
bun run experiment -- --concurrency 4
```
- Creates a dedicated timestamped report: `experiments/reports/exp-<timestamp>/report.md`
- Runs all 17 benchmark cases live for each agent.

### 4. Run the Fast LocalSWE Comparative Experiment:
If you want to evaluate LocalSWE live across all 17 cases while reusing frozen Baseline and V1 runs:
```bash
bun run experiment:v2 -- --concurrency 4
```
- **Approximate Runtime:** ~15–20 minutes across all 17 cases.
- **Approximate Cost:** ~\$0.70 total (~\$0.041 per case).

### 5. Evaluate Any Specific Run or Experiment:
```bash
# Evaluate a specific single run:
bun run evaluate -- --run <runId>

# Evaluate a specific experiment folder:
bun run evaluate -- --experiment exp-2026-08-31-122702
```

---

## 5. Offline Mock Execution (CI / Smoke Testing)

To test the complete execution, state rollback, and evaluation pipeline offline with mock agents:

```bash
bun run experiment:mock
```

---

## 6. Inspecting Generated Artifacts

All results are strictly portable and saved under relative directory paths:
- **Comprehensive Benchmark Report:** `experiments/reports/localswe-benchmark/report.md`
- **Machine-Readable Summary JSON:** `experiments/reports/localswe-benchmark/summary.json`
- **Unified Trajectory Dataset:** `evaluation/trajectory-dataset.json`
- **Individual Run Logs & Diffs:** `experiments/runs/<runId>/`
  - `patch.diff`: Clean, isolated patch captured by the agent.
  - `result.json`: Run status, duration, and test command outputs.
  - `trajectory.jsonl`: Complete token-by-token trajectory stream.
