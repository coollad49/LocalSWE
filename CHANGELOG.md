# LocalSWE — Improvement Changelog

> **micro1 Agentic Workflows Hackathon Deliverable 01**  
> This changelog records the complete empirical evolution of **LocalSWE**, tracing from the simple baseline control through iterative failures to the final verified agentic architecture across 130 real benchmark runs.

---

## The Improvement Progression Summary

| Stage | What We Tried and Why | Evidence (From 130 Real Benchmark Runs) | Decision / Learning |
| :--- | :--- | :--- | :--- |
| **Baseline v0** | Prompted the compact model (`Qwen3.8-27B` capability class) directly with standard file & shell tools. | **70.97% VFR** (44/62 verified across 62 runs, \$0.0639 / case, 300.7s avg duration). Failed completely on complex state management (`hard-001`: 0%). | **Established starting point.** Small models lack internal discipline to solve multi-file or proxy state mutations without guidance. |
| **Iteration 1 (`agent-v1`)** | Added unconstrained multi-turn tool execution, iterative feedback, and self-verification instructions. | **60.00% VFR** (30/50 verified across 50 runs, \$0.1225 / case, 437.3s avg duration, 152.8 avg turns). Performance dropped by 10.97 pp; costs doubled. | **REJECTED / PIVOTED.** Trajectory analysis revealed *error compounding*: multi-turn loops caused the model to edit broken code iteratively until context exhaustion. |
| **Iteration 2 (`agent-v2` / LocalSWE)** | Introduced **Adversarial Invariant Synthesis (property testing in `.v2/`)** and **Automated State Rollback on Regression (`git checkout -- .`)**. | **77.78% VFR** (14/18 verified across 18 runs, \$0.0243 / case, 253.7s avg duration, 88.89% repro rate). Solved `hard-001` (100%) and `hard-004` (100%). | **KEPT (Final Contribution).** 80% cheaper than V1 and 42% faster, with the highest fix rate across all difficulty tiers. |

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

### 3. Iteration 2 (`agent-v2` / LocalSWE) — The Breakthrough

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
- **Reproduction Pass Rate:** **88.89%** (highest across all agents).
- **Average Cost:** **\$0.0243 / case** — **80% cheaper than V1** and **62% cheaper than Baseline**.
- **Average Duration:** **253.7s** — **42% faster than V1**.
- **Average Turns:** **103.8 turns** (cut by 32% compared to V1).
- **Hard Tier Cases:** Solved `hard-001` (100%) and `hard-004` (100%).

#### Decision:
**KEPT as our final submission architecture.** Proves that state discipline and property fuzzing bridge the reasoning gap of compact models.

---

## 4. Main Failure Mode & Hot Take

### Observed Failure Mode:
On case `synth-006` (out-of-order queue race condition), LocalSWE reproduced the sequential bug and fixed sequential execution, but failed the hidden concurrent load test. Compact models still struggle with temporal intuition in concurrent systems.

### Our Hot Take:
> *"Giving smaller or local models unrestricted multi-turn loops without state rollback causes them to compound their own errors — editing on top of broken code until context collapse. The real breakthrough in making compact models reliable is STRICT STATE DISCIPLINE: automatically rolling back to a clean git commit the moment a test fails, paired with autonomous property fuzzing before patch submission."*
