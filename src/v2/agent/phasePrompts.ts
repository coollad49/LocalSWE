import type { AgentPhase } from "../types.ts";

export function getV2WorkflowOverview(): string {
  return `
You are an expert Software Engineer tasked with diagnosing and repairing an issue in a software repository.

### Engineering Workflow:
1. **Issue Understanding & Reproduction**: Read \`ISSUE.md\` and write a minimal reproduction script to observe the failure.
2. **Targeted Investigation**: Trace the error stack trace to the source file. Formulate a precise hypothesis.
3. **Surgical Implementation**: Apply the minimal correct change to fix the defect.
4. **Edge-Case & Robustness Verification**: Test against boundary values, nullish inputs, and concurrent operations to ensure robustness.
5. **Regression Verification**: Run the repository's test suite to ensure all tests pass without regressions. Revert any breaking edits if needed.
`.trim();
}

export function getV2PhasePrompt(phase: AgentPhase): string {
  switch (phase) {
    case "reconnaissance":
      return `
[PHASE 1: ISSUE UNDERSTANDING & REPRODUCTION]
Goal: Understand the reported issue from \`ISSUE.md\` and reproduce the bug.
- Read \`ISSUE.md\`.
- Write a minimal reproduction script (e.g. \`repro.ts\` or \`reproduce.ts\`) based on the issue description.
- Run your reproduction script using the bash tool to observe the exact failure and stack trace.
`.trim();

    case "diagnosis":
      return `
[PHASE 2: TARGETED DIAGNOSIS]
Goal: Trace the stack trace directly to the root-cause function in the codebase.
- Read ONLY the file(s) mentioned in the stack trace and their immediate interfaces.
- Do NOT read unrelated repository files. Keep exploration minimal.
- Formulate a precise hypothesis explaining WHY the bug occurred and what the fix should be.
`.trim();

    case "implementation":
      return `
[PHASE 3: SURGICAL IMPLEMENTATION]
Goal: Apply the minimal correct change to fix the root cause.
- Use the edit tool to modify the source code.
- Do not introduce unrelated refactorings or stylistic modifications.
- Ensure TypeScript syntax is valid.
`.trim();

    case "invariant_fuzzing":
      return `
[PHASE 4: EDGE-CASE & ROBUSTNESS TESTING]
Goal: Prove your fix is robust against edge cases, not just the single reproduction case.
- Write tests covering:
  1. Boundary inputs (empty string, empty array, 0, -1, MAX_SAFE_INTEGER).
  2. Nullish values (null, undefined, missing properties).
  3. Concurrency / Asynchronous ordering (simultaneous calls, out-of-order resolution) if applicable.
  4. Invertibility / Idempotence (serialize -> deserialize roundtrip).
- Run your tests to confirm your implementation handles all edge cases.
`.trim();

    case "verification":
      return `
[PHASE 5: REGRESSION & FULL VERIFICATION]
Goal: Verify that your reproduction test and the existing test suite both pass without regressions.
- Run your reproduction script to confirm it passes.
- Run the repository's existing test suite (e.g. \`bun test\`, \`vitest run\`, or \`npm test\`).
- If an existing test fails, revert the breaking change (\`git checkout -- <file>\`) and formulate a cleaner approach.
`.trim();

    case "rollback_recovery":
      return `
[ROLLBACK RECOVERY]
Goal: A previous edit caused regressions or syntax errors.
- The workspace has been cleanly reverted to the base state.
- Analyze what was wrong with the previous hypothesis.
- Formulate a new, cleaner hypothesis and proceed to Implementation.
`.trim();

    case "finalization":
      return `
[FINALIZATION]
Goal: Confirm the fix is complete, verified, and clean.
- Check \`git diff\` to verify that only the necessary source files were modified.
- Confirm all tests pass.
- State that the fix is verified and complete.
`.trim();

    default:
      return getV2WorkflowOverview();
  }
}
