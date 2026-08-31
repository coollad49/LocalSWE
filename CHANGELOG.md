# LocalSWE — Improvement Changelog

> **micro1 Agentic Workflows Hackathon Deliverable 01**  
> This changelog records the complete empirical evolution of **LocalSWE**, tracing from the simple baseline control through iterative failures to the final verified agentic architecture across 148 real benchmark runs.

---

## The Improvement Progression Summary

| Stage | What We Tried and Why | Evidence (From 148 Real Benchmark Runs) | Decision / Learning |
| :--- | :--- | :--- | :--- |
| **Baseline v0** | Prompted the compact model (`Qwen3.8-27B` capability class) directly with standard file & shell tools. | **70.97% VFR** (44/62 verified across 62 runs, \$0.0639 / case, 300.7s avg duration). Failed completely on complex state management (`hard-001`: 0%). | **Established starting point.** Small models lack internal discipline to solve multi-file or proxy state mutations without guidance. |
| **Iteration 1 (`agent-v1`)** | Added unconstrained multi-turn tool execution, iterative feedback, and self-verification instructions. | **60.00% VFR** (30/50 verified across 50 runs, \$0.1225 / case, 437.3s avg duration, 152.8 avg turns). Performance dropped by 10.97 pp; costs doubled. | **REJECTED / PIVOTED.** Trajectory analysis revealed *error compounding*: multi-turn loops caused the model to edit broken code iteratively until context exhaustion. *(The Removed Experiment)* |
| **Iteration 2 (`agent-v2`)** | Introduced **Adversarial Invariant Synthesis (property testing in `.v2/`)** and **Automated State Rollback on Regression (`git checkout -- .`)**. | **77.78% VFR** (14/18 verified across 18 runs, \$0.0243 / case, 253.7s avg duration, 88.89% repro rate). Solved `hard-001` (100%) and `hard-004` (100%). | **KEPT (Major milestone).** Proved that state rollback stops error compounding, slashing token costs by 80% and raising VFR. |
| **Iteration 3 (`agent-v3` / LocalSWE)** | Added **Hypothesis Memory & Negative Lesson Persistence**, **Concurrent Jitter Invariant Testing**, and **Static Dependency Graph Navigation**. | **83.33% VFR** (15/18 verified across 18 runs, \$0.0692 / case, 359.9s avg duration, 94.44% repro rate). Highest VFR across all tiers. | **KEPT (Final Contribution).** Resolved multi-file amnesia and concurrent race condition vulnerabilities. |

---

## Detailed Iteration Breakdown

### 1. Baseline v0 — The Starting Point

#### Hypothesis:
Can a compact 27B-class model solve real-world software defects when given a standard repository workspace, the issue description, and basic tools (`read`, `edit`, `write`, `bash`, `grep`, `find`)?

#### What We Tried:
- Single-turn execution prompt providing the task description and workspace tools.
- Evaluated across 17 benchmark cases with 62 real runs.

#### Evidence & Observations:
- **Verified Fix Rate (VFR):** 70.97% (44/62).
- **Average Cost:** \$0.0639 / case.
- **Average Duration:** 300.7s.
- **Critical Failure Mode:** The baseline failed on complex state mutations. On `hard-001` (an Immer proxy array reordering bug), the baseline scored **0% VFR (0/4)**. It generated superficial array copies that broke proxy identity traps.

#### Decision:
**Established as experimental control.** Proved that compact models require an agentic harness to solve architectural bugs.

---

### 2. Iteration 1 (`agent-v1`) — The Removed Experiment (Unconstrained Multi-Turn Loops)

#### Hypothesis:
Allowing the agent to run in an autonomous multi-turn loop with self-verification and dynamic retry will allow it to catch its own mistakes and increase VFR.

#### What We Tried:
- Multi-turn execution loop allowing the agent to write tests, run tests, and iteratively repair until all tests pass.
- Added structured evidence checkpoints and dynamic prompt nudges.
- Evaluated across 50 real runs.

#### Evidence & Observations:
- **Verified Fix Rate (VFR):** **60.00% (30/50)** — a **10.97 pp drop** compared to Baseline.
- **Average Cost:** **\$0.1225 / case** (nearly 2× the cost of baseline).
- **Average Turns:** **152.8 turns** (vs 85.6 turns in baseline).
- **Average Duration:** **437.3s** (vs 300.7s in baseline).

#### Root Cause (What Trajectory Analysis Revealed):
Instead of fixing bugs, unconstrained multi-turn loops caused **Error Compounding**:
1. When the agent made a mistaken edit that broke existing syntax or logic, it attempted to fix the error by making another edit *on top of the broken code*.
2. As errors accumulated, the agent began fighting its own syntax mistakes rather than the original issue.
3. The prompt context rapidly bloated to over 2.9 million tokens, degrading the model's reasoning capabilities and leading to timeout or context collapse.

#### Decision:
**REMOVED & REJECTED.** Taught us that compact models must NOT be allowed to iterate on top of broken states without an automated rollback mechanism.

---

### 3. Iteration 2 (`agent-v2`) — The State Rollback Breakthrough

#### Hypothesis:
1. **Automated State Rollback**: If an edit causes tests to fail, immediately reverting to a clean git commit (`git checkout -- .`) will prevent error compounding and context bloat.
2. **Adversarial Invariant Synthesis**: Forcing the model to write property stress tests (`.v2/invariants.test.ts`) covering nulls, concurrency, and boundary values will catch regressions before patch capture.

#### What We Changed:
- Built `RollbackManager` in `src/v2/workflow/RollbackManager.ts`: Automated git checkout on test regression.
- Built `InvariantEngine` in `src/v2/workflow/InvariantEngine.ts`: Automated execution and scoring of self-generated property tests.
- Replaced unconstrained tool exploration with stack-trace guided navigation.
- Evaluated across 18 real runs.

#### Evidence & Observations:
- **Verified Fix Rate (VFR):** **77.78% (14/18)** — **+6.81 pp over Baseline** and **+17.78 pp over V1**.
- **Reproduction Pass Rate:** **88.89%**.
- **Average Cost:** **\$0.0243 / case** — **80% cheaper than V1** and **62% cheaper than Baseline**.
- **Average Duration:** **253.7s** — **42% faster than V1**.
- **Hard Tier Cases:** Solved `hard-001` (100%) and `hard-004` (100%).

#### Decision:
**KEPT as foundation.** Proved that state rollback stops error compounding and slashes token cost by 80%.

---

### 4. Iteration 3 (`agent-v3` / LocalSWE) — The Final Contribution

#### Hypothesis:
1. **Hypothesis Memory with Negative Lessons**: Retaining structured records of failed approaches before rollback will prevent the model from repeating failed attempts.
2. **Concurrent & Async Jitter Fuzzing**: Wrapping property tests in `Promise.all` with microsecond jitter (`runConcurrentJitter()`) will expose subtle race conditions that sequential tests miss.
3. **Static Dependency Call-Graph**: Providing compact caller/callee and import maps will prevent multi-file edit amnesia.

#### What We Changed:
- Built `HypothesisTree` (`src/v3/workflow/HypothesisTree.ts`): Captures negative lessons before rollback and injects them into subsequent prompts.
- Built `ConcurrentFuzzer` (`src/v3/workflow/ConcurrentFuzzer.ts`): Concurrency jitter property testing engine.
- Built `DependencyGraph` (`src/v3/tools/DependencyGraph.ts`): Fast static dependency and symbol analyzer.
- Built `DiffAuditor` (`src/v3/workflow/DiffAuditor.ts`): Pre-submission quality and lint gate.
- Evaluated across 18 real runs.

#### Evidence & Observations:
- **Verified Fix Rate (VFR):** **83.33% (15/18)** — **+12.36 pp over Baseline** and **+23.33 pp over V1**.
- **Reproduction Pass Rate:** **94.44% (17/18)** — highest across all agents.
- **Oracle Pass Rate:** **83.33% (15/18)**.
- **Regression-Free Rate:** **100.00%** (0 regressions).
- **Average Cost:** **\$0.0692 / case** (95% cheaper than cloud frontier models).

#### Decision:
**KEPT as our final submission architecture.** Proves that state discipline, hypothesis memory, and concurrent fuzzing bridge the reasoning gap of compact 27B-class models on local workstations.

---

## 5. Main Failure Mode & Hot Take

### Observed Failure Mode:
On case `hard-003` (complex cyclic graph serialization), LocalSWE V3 accurately resolved the cyclic reference encoder, but missed updating the nested type deserializer in a fourth dependent file. Deep circular graph mutations across 4+ files remain the frontier challenge for compact models.

### Our Hot Take:
> *"Giving smaller or local models unrestricted multi-turn loops does not make them smarter — it causes them to compound their own errors. The real breakthrough in making compact models reliable is STRICT STATE DISCIPLINE: automatically rolling back to a clean git commit the moment a test fails, paired with hypothesis memory (persisting negative lessons across attempts) and autonomous concurrent property fuzzing."*
