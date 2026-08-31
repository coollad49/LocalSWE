import type { AgentPhase } from "../types.ts";

export function getV3WorkflowOverview(): string {
  return `
You are an expert principal software engineer tasked with fixing a bug in this repository.

Follow this systematic 4-phase engineering discipline:

Phase 1 — Reconnaissance & Reproduction:
1. Read ISSUE.md carefully to understand the expected vs actual behavior.
2. Locate the relevant source files and inspect the symbol dependencies.
3. Write a standalone reproduction script (e.g. \`repro.ts\`) in the root directory.
4. Run \`bun run repro.ts\` to confirm the failure and observe the stack trace.

Phase 2 — Surgical Repair:
1. Formulate a targeted fix addressing the root cause.
2. Apply edits cleanly to only the affected repository files.
3. Run your reproduction script (\`bun run repro.ts\`) to confirm the bug is resolved.
4. Run the repository test suite (e.g. \`bun test\`) to verify no regressions were introduced.

Phase 3 — Concurrent & Boundary Invariant Testing:
1. Write edge-case and boundary property tests in \`.v3/invariants.test.ts\`.
2. Test asynchronous ordering, concurrent promises, null/empty inputs, and boundary parameters.
3. Run \`bun test .v3/invariants.test.ts\`.
4. If any test fails, immediately revert broken changes (\`git checkout -- .\`) and try a fresh hypothesis.

Phase 4 — Clean Finalization:
1. Delete any temporary reproduction scripts (\`rm repro.ts\`).
2. Verify all repository tests pass cleanly.
`.trim();
}

export function getV3PhasePrompt(phase: AgentPhase, context?: { negativeLessons?: string; dependencySummary?: string }): string {
  const negativeSection = context?.negativeLessons ? `\n\n${context.negativeLessons}\n` : "";
  const depSection = context?.dependencySummary ? `\n\n${context.dependencySummary}\n` : "";

  switch (phase) {
    case "reconnaissance":
      return `Phase 1: Read ISSUE.md and write a minimal reproduction script (repro.ts). Run it to confirm the bug reproduces.${depSection}`;
    case "dependency_mapping":
      return `Phase 1b: Inspect the module dependencies and callers for the targeted files.${depSection}`;
    case "hypothesis_formulation":
      return `Phase 2a: Formulate an architectural hypothesis based on root-cause analysis.${negativeSection}`;
    case "surgical_repair":
      return `Phase 2b: Apply the surgical fix and run existing repository tests.${negativeSection}`;
    case "invariant_synthesis":
      return `Phase 3: Write and execute property stress tests in .v3/invariants.test.ts covering concurrent jitter and boundary inputs.`;
    case "verification":
      return `Phase 3b: Run the full test suite to verify the fix is complete and regression-free.`;
    case "diff_audit":
      return `Phase 4a: Audit the diff, strip any stray console.log statements, and ensure code formatting is clean.`;
    case "finalization":
      return `Phase 4b: Clean up any temporary files (rm repro.ts) and verify the final state.`;
  }
}
