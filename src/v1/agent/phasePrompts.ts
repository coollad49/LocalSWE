import type { AgentPhase } from "../types.ts";

export const PHASE_INSTRUCTIONS: Record<AgentPhase, string> = {
  reconnaissance: [
    "## Phase: RECONNAISSANCE",
    "Goal: understand the repository before changing code.",
    "- Inspect repository structure (ls, package.json, source files, tests, config).",
    "- Identify the relevant area for the issue described in ISSUE.md.",
    "- Do NOT edit code yet. Gather evidence via read/grep/bash.",
    "- When you have meaningful inspection, write your findings to .v1/state.json via tool calls (use bash to cat/write) or proceed when confident.",
    "- Record hypotheses only after gathering inspection evidence.",
  ].join("\n"),

  diagnosis: [
    "## Phase: DIAGNOSIS",
    "Goal: form explicit hypotheses for the root cause.",
    "Each hypothesis should have: description, supporting evidence, confidence, relevant files.",
    "Write hypotheses to .v1/state.json. Use the helper script or direct file write.",
    "Helper: `node .v1/helpers.js add-hypothesis '{\"description\":\"...\",\"evidence\":[\"...\"]}'` then `node .v1/helpers.js select-hypothesis <id>`",
    "Or write directly: update `.v1/state.json` hypotheses array (read existing first).",
    "Distinguish hypothesis from established evidence. At least one hypothesis must cite evidence from your inspection.",
  ].join("\n"),

  investigation: [
    "## Phase: INVESTIGATION",
    "Goal: gather evidence to validate or reject your hypothesis.",
    "You may: inspect additional code, run focused commands, build a minimal reproduction script, run existing tests on the relevant file.",
    "Do NOT use the hidden benchmark reproduction (public/reproduce.ts is not provided). Create your own minimal repro if useful, preferably under .v1/ or /tmp.",
    "Record command results as evidence — run commands and observe output.",
  ].join("\n"),

  implementation: [
    "## Phase: IMPLEMENTATION",
    "Goal: modify the repository minimally to fix the selected hypothesis.",
    "You must have a selected hypothesis (status=selected) before editing source files.",
    "Keep changes focused. Avoid unrelated refactors.",
    "After editing, note the changed files (they will be tracked via .v1/state.json and git).",
  ].join("\n"),

  verification: [
    "## Phase: VERIFICATION",
    "Goal: gather evidence that your implementation works.",
    "Run relevant checks: relevant existing tests (vitest), your reproduction script, type checks (tsc --noEmit), build checks.",
    "Do NOT assume success — you must execute a verification command and observe its result.",
    "If verification fails, you will be asked to loop back to investigation/implementation.",
  ].join("\n"),

  finalization: [
    "## Phase: FINALIZATION",
    "Goal: inspect final diff, ensure change is focused, report evidence.",
    "Run `git diff HEAD --stat` and `git diff HEAD` to review your changes.",
    "Remove any scratchpad files you created outside .v1/ that should not be part of the patch (e.g., /tmp files are fine, but untracked files in repo root will be excluded).",
    "Summarize verification evidence in your final response.",
  ].join("\n"),
};

export function getPhasePrompt(phase: AgentPhase): string {
  return PHASE_INSTRUCTIONS[phase] ?? "";
}

export function getWorkflowOverview(): string {
  return [
    "# Frontier Verifier V1 — Structured Workflow",
    "You are an autonomous software engineer. Follow the structured phases in order:",
    "RECONNAISSANCE → DIAGNOSIS → INVESTIGATION → IMPLEMENTATION → VERIFICATION → FINALIZATION",
    "You will be guided phase-by-phase via system turns. Do not skip phases.",
    "Evidence is required to advance; the harness tracks your progress via .v1/state.json.",
    "Iteration budget: 5 engineering loops max if verification fails.",
    "",
    "## Workspace hygiene",
    "- Create scratchpad repro scripts under `.v1/` or `/tmp` if needed; they will be excluded from the final patch.",
    "- Do NOT create files at repo root unrelated to the fix unless they are the fix itself.",
    "",
    "## Hypothesis tracking (file-based, not regex)",
    "- Use the helper `.v1/helpers.js` or direct read/write of `.v1/state.json`.",
    "- Hypotheses live in `state.hypotheses[]` with {id, description, evidence[], confidence, status}.",
    "- Set one to `selected` before implementation.",
    "",
  ].join("\n");
}
