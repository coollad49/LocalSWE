# Agent V2 Architecture Specification: Adversarial Invariant Synthesis & Automated Rollback

## 1. Executive Summary & Experimental Context

- **Baseline-v0 (Frozen)**: Single-session fixed prompt, 70.59% VFR (12/17).
- **Agent-v1 (Frozen)**: Autonomous SWE loop with workspace node_modules junctions and active verification gate, **82.35% VFR (14/17)** (+11.76 pp improvement, 50% reduction in false confidence).
- **Agent-v2 Objective**: Reach **94.1% - 100% VFR** by eliminating the remaining 3 failure modes identified in V1 trajectory analytics.

---

## 2. Empirical Failure Analysis of V1 (Why V1 Failed on 3 Cases)

| Case ID | Benchmark Difficulty & Category | V1 Outcome | Root Cause Analysis | V2 Architectural Solution |
| :--- | :--- | :--- | :--- | :--- |
| `synth-006` | Easy / `api-behavior` (async-queue) | **False Confidence** (Repro PASS, Oracle FAIL) | Agent fixed visible sequential queue behavior in `reproduce.ts` but missed race conditions when resolving high-concurrency promises. | **Adversarial Invariant Synthesis (Property Fuzzing)**: Generates 100 concurrent promise permutations before finalizing. |
| `hist-001` | Medium / `validation` (superstruct) | **Agent Failure** (Repro FAIL) | Agent edited `src/index.ts` iteratively, compounding syntax and coercion errors on top of broken AST states without resetting. | **Automated State Rollback & Branching**: Discards failed edits (`git checkout`) and tests Hypothesis B instead of compounding errors. |
| `hard-003` | Hard / `serialization` (flatted) | **Agent Failure** (Repro FAIL) | Agent spent excessive turns reading repository files broadly without focused reproduction-guided inspection. | **AST Call-Graph Targeting & Budget Gate**: Enforces maximum 3 exploration turns before mandatory reproduction execution. |

---

## 3. Agent V2 Core Innovations

```text
               ┌────────────────────────────────────────────────────────┐
               │                Agent V2 Autonomous Loop                 │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                        1. Focused Reproduction Capture
                          (Execute reproduce.ts + AST trace)
                                          │
                                          ▼
                         2. Hypothesis & Minimal Diff
                                          │
                                          ▼
                         3. Automated Snapshot Checkpoint
                             (Save working workspace state)
                                          │
                                          ▼
                        4. Adversarial Invariant Synthesis
                          (Generate .v2/invariants.test.ts:
                           fuzzing, nullish, concurrency, boundaries)
                                          │
                     ┌────────────────────┴────────────────────┐
                     │                                         │
               Invariants FAIL                           Invariants PASS
                     │                                         │
                     ▼                                         ▼
            Rollback to Snapshot                     5. Regression Gate
         (git checkout & try Hyp B)                 (Run full repo test suite)
                                                               │
                                                               ▼
                                                      6. Verified Submission
```

### Key Modules:
1. **Adversarial Invariant Synthesis Gate (`.v2/invariants.test.ts`)**:
   - Synthesizes property-based stress tests targeting:
     - Nullish inputs (`null`, `undefined`, empty string, empty array, prototype-less objects).
     - Boundary values (`0`, `-1`, `MAX_SAFE_INTEGER`, NaN).
     - Concurrency / asynchronous ordering (rejections, simultaneous resolves).
     - Circular references and deep object trees.
2. **Automated State Rollback on Regression**:
   - Creates a lightweight git commit checkpoint before applying any patch.
   - If an edit fails verification or breaks existing tests, V2 automatically rolls back (`git reset --hard`) to the last known-good state.
3. **Multi-Angle Verification Gate**:
   - Must pass 3 independent deterministic gates before exit:
     1. Public reproduction (`reproduce.ts` passes).
     2. Synthesized invariants (`.v2/invariants.test.ts` passes).
     3. Regression suite (`tests/` passes without new failures).

---

## 4. Proposed Directory Layout

```text
src/v2/
├── agent/
│   ├── V2CodingAgent.ts        # Core V2 orchestrator with invariant gate & rollback
│   └── InvariantSynthesizer.ts # Property test generator for edge-case defense
├── prompt/
│   └── agent-v2.md             # Multi-stage prompt template with invariant synthesis
├── runner/
│   ├── V2Runner.ts             # Experiment runner for Agent V2
│   └── config.ts               # V2 configuration schema
└── index.ts                    # Public exports
```

---

## 5. Experimental Protocol (EXP-002: Agent-v2 vs Frozen V1 & V0)

- **Hypothesis**: Adversarial invariant synthesis will eliminate false-confidence outcomes (targeting 0.0% false confidence) and raise Verified Fix Rate (VFR) to $\ge 94.1\%$.
- **Benchmark Version**: Frozen Benchmark `v0.5` (`sha256:9d5d8138...`).
- **Baseline Control**: Frozen `baseline-v0` (70.59% VFR).
- **V1 Control**: Frozen `agent-v1` (82.35% VFR).
- **Measurement**: Verified Fix Rate (VFR), False Confidence Rate (FCR), Iterations to Fix, Cost per Verified Fix.
