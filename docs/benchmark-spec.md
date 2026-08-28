# Frontier Verifier Benchmark Specification

**Version:** 0.1
**Status:** Initial implementation specification
**Project:** micro1 Frontier Engineering Challenge 2026

---

## 1. Purpose

The benchmark is the fixed experimental environment used to measure the ability of an agent to diagnose, repair, and verify software defects.

The benchmark exists independently from the agent implementation.

The same benchmark must be used to evaluate:

* the baseline agent;
* every experimental agent version;
* the final agent.

The benchmark must remain stable while agent implementations are being improved.

The objective is not to determine whether an agent produced a patch that looks correct.

The objective is to determine whether the agent produced a **behaviorally correct, regression-free, reproducible fix supported by executable evidence**.

---

# 2. Core Principle

The benchmark is a measuring instrument.

```text
Benchmark
    │
    ├── Baseline Agent ──→ Result
    │
    ├── Agent V1 ─────────→ Result
    │
    ├── Agent V2 ─────────→ Result
    │
    └── Final Agent ──────→ Result
```

The benchmark must not be modified because an agent performs poorly on it.

If a benchmark case is invalid, unstable, incorrectly specified, or irreproducible, it must be rejected or repaired independently of agent performance.

---

# 3. Initial Benchmark Size

The initial benchmark target is:

**12 cases**

Composition:

* 6 historical cases;
* 6 synthetic cases.

The benchmark may later be expanded to 16–20 cases if the infrastructure becomes stable early enough.

Quality takes priority over quantity.

A smaller benchmark of highly reproducible cases is preferable to a larger benchmark containing unreliable cases.

---

# 4. Repository Strategy

Do not create a separate repository from scratch for every benchmark case.

Benchmark cases should reuse a small collection of suitable TypeScript repositories.

Target:

* 3–5 repositories initially;
* small or medium-sized;
* TypeScript/Node.js;
* locally reproducible;
* preferably containing automated tests;
* minimal or no external service dependencies;
* reasonable installation/runtime requirements;
* compatible with a reproducible clean environment;
* permissive open-source license suitable for inclusion in the project.

A single repository may provide multiple benchmark cases.

Example:

```text
repositories/
    repo-a/
    repo-b/
    repo-c/

cases/
    hist-001/
    hist-002/
    synth-001/
    synth-002/
```

Cases refer to repository snapshots rather than duplicating the entire repository.

---

# 5. Benchmark Case Definition

A benchmark case represents:

> One specific software defect in one specific repository state, together with enough information to reproduce and objectively verify the defect and its repair.

Every case must have:

1. a unique identifier;
2. a repository;
3. a known buggy state;
4. a known-good state;
5. an issue description;
6. a deterministic reproduction procedure;
7. a primary verification oracle;
8. regression verification;
9. provenance;
10. environment requirements;
11. difficulty classification.

---

# 6. Case Types

Each case must be one of:

```text
HISTORICAL
SYNTHETIC
```

## Historical

A defect derived from a real historical software defect.

The case should preserve evidence such as:

* repository;
* issue/bug description;
* buggy commit;
* fixed commit;
* relevant historical context;
* reproducible failure;
* reproducible fixed behavior.

Historical cases must be independently validated.

A historical case that cannot be reproduced deterministically is rejected.

---

## Synthetic

A defect deliberately introduced into an otherwise functioning repository.

The synthetic defect must represent a realistic engineering failure.

Synthetic cases should not merely be trivial syntax mistakes.

Possible classes include:

* incorrect business logic;
* boundary conditions;
* validation;
* state handling;
* asynchronous behavior;
* error handling;
* API contract violations;
* data transformation;
* integration behavior;
* regression-prone modifications.

Synthetic cases must have a known-good state and a deterministic buggy state.

---

# 7. Case Lifecycle

Every case must pass through:

```text
DISCOVER
    ↓
SELECT
    ↓
RECONSTRUCT
    ↓
REPRODUCE
    ↓
VERIFY GROUND TRUTH
    ↓
CREATE OR VALIDATE ORACLE
    ↓
RUN STABILITY CHECK
    ↓
ACCEPT
    ↓
FREEZE
```

Only accepted cases may enter the active benchmark.

---

# 8. Case Acceptance Criteria

A case is valid only if all applicable checks pass.

### Repository

* repository can be obtained reproducibly;
* license is documented;
* required runtime versions are known;
* dependencies install successfully;
* repository does not require unavailable credentials;
* required external services are avoided or deterministically simulated.

### Buggy state

The reported defect can be reproduced.

### Known-good state

The intended behavior passes verification.

### Determinism

Repeated executions produce consistent results.

### Verification

The evaluator can objectively determine whether the defect was fixed.

### Regression

Relevant existing behavior can be tested after the candidate patch.

### Isolation

The agent cannot access hidden oracle information.

### Documentation

The provenance and reproduction procedure are documented.

If any required condition fails, the case is not accepted.

---

# 9. Agent View vs Evaluator View

Every benchmark case has two conceptual views.

## Agent View

The agent receives only information a developer could reasonably receive.

Typical contents:

```text
repository
issue.md
visible tests
normal development tools
environment information
```

The agent must not receive the answer key.

---

## Evaluator View

The evaluator may access:

```text
ground truth
hidden tests
reference fixed state
historical fixed commit
verification criteria
regression tests
benchmark metadata
```

The evaluator's private information must never be mounted into the agent's working environment.

---

# 10. Oracle

The oracle defines what constitutes a verified fix.

The oracle must be behavioral rather than textual.

The benchmark must not require an agent to reproduce a particular reference patch.

Two different implementations are valid if they satisfy the required behavior and regression constraints.

Example:

```text
Reference implementation:
return normalize(value);

Agent implementation:
const normalized = normalize(value);
return normalized;
```

Both may be valid.

---

# 11. Verification Ladder

A case should be evaluated through multiple levels.

## Level 1 — Reproduction

Can the reported defect be reproduced?

## Level 2 — Target Fix

Does the original failure disappear after the agent's changes?

## Level 3 — Regression

Do relevant existing tests continue to pass?

## Level 4 — Hidden Verification

Do independent hidden tests covering the intended behavior pass?

## Level 5 — Final Verdict

The case is considered a **Verified Fix** only when all mandatory verification conditions pass.

---

# 12. Primary Metric

The primary benchmark metric is:

## Verified Fix Rate (VFR)

```text
VFR =
verified cases
---------------- × 100
total valid cases
```

Example:

```text
9 verified / 12 cases = 75%
```

The benchmark should also record:

* reproduction rate;
* repair rate;
* regression-free rate;
* hidden-verification rate;
* average runtime;
* average model/tool cost;
* number of attempts;
* failure category.

---

# 13. Secondary Metrics

### Reproduction Rate

Percentage of cases for which the agent successfully establishes the reported failure.

### Repair Rate

Percentage of cases for which the agent produces a patch that removes the original failure.

### Regression-Free Rate

Percentage of cases where the original defect is fixed without violating required existing behavior.

### Evidence/Verification Rate

Percentage of cases where the final solution satisfies the benchmark's verification requirements.

### Runtime

Average and per-case execution time.

### Cost

Estimated agent/model/tool cost per case.

### Attempts

Number of repair/verification cycles required.

---

# 14. Difficulty

Each case receives:

```text
EASY
MEDIUM
HARD
```

Difficulty should consider:

* complexity of the root cause;
* repository size;
* ambiguity of the issue;
* number of relevant files;
* difficulty of reproduction;
* difficulty of verification;
* potential for misleading symptoms;
* regression risk.

Difficulty must be assigned before final evaluation whenever possible.

---

# 15. Benchmark Diversity

The initial 12 cases should provide meaningful diversity.

Target categories include:

* business logic;
* validation;
* boundary/edge cases;
* API behavior;
* data transformation;
* asynchronous behavior;
* state management;
* error handling;
* integration behavior;
* regression-prone changes.

The benchmark must avoid excessive duplication of the same bug pattern.

---

# 16. Historical Case Ground Truth

Where possible, a historical case should preserve:

```text
buggy commit
    ↓
agent works here
    ↓
historical fixed commit
```

The historical fixed commit is evidence of intended behavior, not a requirement for textual patch similarity.

The benchmark must independently verify that:

```text
buggy state → fails
fixed state → passes
```

---

# 17. Synthetic Case Ground Truth

A synthetic case should begin from a known-good repository state.

Then a deterministic mutation is applied:

```text
KNOWN GOOD
    ↓
BUG INJECTION
    ↓
KNOWN BUGGY STATE
```

The benchmark must demonstrate:

```text
GOOD STATE
    → verification passes

BUGGY STATE
    → reproduction fails

GOOD/FIXED STATE
    → verification passes
```

The mutation must be recorded and reproducible.

---

# 18. Case Manifest

Each case must have machine-readable metadata.

Example:

```json
{
  "id": "synth-001",
  "type": "synthetic",
  "repository": "repo-a",
  "baseCommit": "abc123",
  "buggyCommit": "generated",
  "difficulty": "medium",
  "categories": [
    "validation",
    "edge-case"
  ],
  "runtime": {
    "node": "22"
  },
  "verification": {
    "target": "hidden-test-suite",
    "regression": true
  }
}
```

The exact schema may evolve during implementation.

---

# 19. Repository Provenance

Every repository must record:

* source URL;
* repository name;
* commit/version used;
* license;
* license URL where appropriate;
* retrieval date;
* modifications made by the benchmark;
* whether the case is historical or synthetic.

The benchmark must not silently modify external source code without documenting the modification.

---

# 20. Reproducibility

Every benchmark case must be reproducible from a clean environment.

The case should define:

* runtime version;
* package manager;
* dependency installation command;
* preparation command;
* reproduction command;
* verification command;
* cleanup/reset procedure.

A clean evaluator must not depend on the developer's local machine state.

---

# 21. Case Isolation

Each evaluation must run in an isolated workspace.

The agent must not be able to access:

* other benchmark cases;
* evaluator source;
* hidden tests;
* oracle metadata;
* reference patches;
* previous agent results.

The evaluator should create a fresh workspace for each case.

---

# 22. Benchmark Immutability During Experiments

After the benchmark is frozen:

```text
Benchmark V1
```

must remain unchanged while comparing:

```text
Baseline
V1
V2
V3
Final
```

If the benchmark is changed, it becomes a new benchmark version.

Example:

```text
Benchmark v0.1
Benchmark v0.2
```

Results must never silently mix benchmark versions.

---

# 23. Benchmark Validator

The benchmark validator is separate from the agent evaluator.

Its responsibility is:

> Determine whether the benchmark itself is healthy.

Conceptually:

```text
benchmark validate
```

For every case:

```text
✓ repository available
✓ dependencies install
✓ buggy state reproducible
✓ known-good state passes
✓ hidden tests execute
✓ regression tests execute
✓ repeated runs stable
✓ environment reproducible
✓ oracle available
✓ case metadata valid
```

Only cases that pass validation enter the evaluation pool.

---

# 24. Benchmark Results

Benchmark execution should produce machine-readable results.

Example:

```json
{
  "benchmarkVersion": "0.1",
  "agentVersion": "baseline",
  "timestamp": "...",
  "cases": {
    "hist-001": {
      "reproduced": true,
      "repaired": true,
      "regressionFree": true,
      "verified": true
    }
  },
  "summary": {
    "total": 12,
    "verified": 9,
    "verifiedFixRate": 75
  }
}
```

Human-readable reports may be generated from these results.

---

# 25. Benchmark Construction Rule

AI agents may be used to accelerate benchmark construction.

However:

> AI-generated benchmark cases are proposals, not ground truth.

Every case must pass the benchmark validation pipeline before acceptance.

The benchmark must never rely solely on an AI agent's claim that a bug is reproducible or that a test is correct.

---

# 26. Benchmark Design Goal

The benchmark should measure engineering judgment rather than patch generation alone.

A strong case should create opportunities for the agent to:

1. understand the issue;
2. inspect the repository;
3. reproduce the defect;
4. form a hypothesis;
5. investigate evidence;
6. implement a repair;
7. test the repair;
8. investigate failures;
9. check for regressions;
10. establish evidence for the final claim.

---

# 27. Final Principle

The benchmark must answer one question reliably:

> **When an AI agent claims that it fixed a software defect, how often can we independently prove that the claim is actually true?**

The benchmark is successful if improvements to the agent produce measurable improvements on this question without changing the measuring instrument.
