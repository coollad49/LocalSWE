/**
 * Per-run metrics extraction + statistical helpers.
 * Deterministic, no LLM.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { RunMetrics, RunCost } from "./types.ts";
import { loadPricingConfig, resolvePricing, computeCost, resolveCostWithProviderPreference } from "./pricing.ts";

// Statistical helpers (median + average) per §6
export function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  let sum = 0;
  for (const n of nums) sum += n;
  return sum / nums.length;
}

function parseTokens(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function tryParseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Extract token usage if available from metadata or trajectory.
 * Returns null if unavailable — never invents.
 */
async function extractTokens(params: {
  metadata: Record<string, unknown> | null;
  trajectoryPath: string;
  model: string | undefined;
}): Promise<{ inputTokens: number | null; outputTokens: number | null; providerCost: number | null }> {
  const meta = params.metadata;

  // 1. Direct metadata.tokenUsage
  if (meta) {
    const tu = meta.tokenUsage as unknown;
    if (tu && typeof tu === "object") {
      const obj = tu as Record<string, unknown>;
      let input = parseTokens(obj.inputTokens ?? obj.promptTokens ?? obj.input ?? obj.input_tokens);
      let output = parseTokens(obj.outputTokens ?? obj.completionTokens ?? obj.output ?? obj.output_tokens);
      if (input == null && output == null && (obj.usage as Record<string, unknown>)?.inputTokens != null) {
        const u = obj.usage as Record<string, unknown>;
        input = parseTokens(u.inputTokens ?? u.promptTokens);
        output = parseTokens(u.outputTokens ?? u.completionTokens);
      }
      if (input != null || output != null) {
        return { inputTokens: input, outputTokens: output, providerCost: parseTokens((meta as { cost?: unknown }).cost) };
      }
    }
    const directInput = parseTokens((meta as Record<string, unknown>).inputTokens ?? (meta as Record<string, unknown>).promptTokens);
    const directOutput = parseTokens((meta as Record<string, unknown>).outputTokens ?? (meta as Record<string, unknown>).completionTokens);
    if (directInput != null || directOutput != null) {
      return { inputTokens: directInput, outputTokens: directOutput, providerCost: parseTokens((meta as { cost?: unknown }).cost) };
    }
  }

  // 2. Trajectory scan: sum usage across all assistant message_end events
  if (existsSync(params.trajectoryPath)) {
    try {
      const raw = await readFile(params.trajectoryPath, "utf-8");
      const lines = raw.split("\n").filter(Boolean);
      let totalInput = 0;
      let totalOutput = 0;
      let totalProviderCost = 0;
      let observed = false;

      for (const line of lines) {
        const ev = tryParseJson(line) as Record<string, unknown> | null;
        if (!ev) continue;
        const data = ev.data as Record<string, unknown> | undefined;
        if (!data) continue;

        // Check data.message.usage (Pi 0.84.4 standard event)
        const msg = data.message as Record<string, unknown> | undefined;
        const usage = (msg?.usage ?? data.usage ?? data.tokenUsage ?? data.tokens) as Record<string, unknown> | undefined;
        if (usage && typeof usage === "object") {
          const inp = parseTokens(usage.input ?? usage.inputTokens ?? usage.promptTokens ?? usage.input_tokens);
          const out = parseTokens(usage.output ?? usage.outputTokens ?? usage.completionTokens ?? usage.output_tokens);
          if (inp != null || out != null) {
            observed = true;
            if (inp != null) totalInput += inp;
            if (out != null) totalOutput += out;
          }
          const costObj = usage.cost as Record<string, unknown> | undefined;
          const costVal = parseTokens(costObj?.total ?? costObj?.totalCost ?? data.cost ?? usage.cost);
          if (costVal != null) {
            totalProviderCost += costVal;
          }
        }
      }

      if (observed) {
        return {
          inputTokens: totalInput,
          outputTokens: totalOutput,
          providerCost: totalProviderCost > 0 ? Number(totalProviderCost.toFixed(6)) : null,
        };
      }
    } catch {
      // ignore
    }
  }

  const providerCost = meta ? parseTokens((meta as { cost?: unknown }).cost) : null;
  return { inputTokens: null, outputTokens: null, providerCost };
}

/**
 * Extract V1 iterations with explicit precedence per refinements.
 * Check v1-state.json or runMetadata.v1.iterationCount first, fallback heuristic/1.
 */
async function extractIterations(params: {
  metadata: Record<string, unknown> | null;
  trajectoryPath: string;
  runDir: string;
  agentVersion: string | undefined;
}): Promise<{ iterations: number | null; source: RunMetrics["iterationsSource"] }> {
  const meta = params.metadata;
  const agentVersion = params.agentVersion ?? (meta?.agentVersion as string | undefined);

  // 1. v1-state.json in runDir (multiple possible names per spec ambiguity)
  const candidates = ["v1-state.json", ".v1-state.json", "v1_state.json", ".v1/state.json", "state.json"];
  // Also check .v1 subdirectory
  const tryPaths = [
    join(params.runDir, "v1-state.json"),
    join(params.runDir, ".v1-state.json"),
    join(params.runDir, ".v1", "state.json"),
    join(params.runDir, "v1_state.json"),
  ];
  for (const p of tryPaths) {
    if (existsSync(p)) {
      try {
        const raw = await readFile(p, "utf-8");
        const j = tryParseJson(raw) as Record<string, unknown> | null;
        if (j) {
          const val = (j.iterationCount ?? j.iterations ?? j.currentIteration ?? j.iteration ?? j.count) as unknown;
          const n = parseTokens(val);
          if (n != null) return { iterations: n, source: "v1-state" };
          // For V1 state machine, sometimes iterations tracked as array length
          if (Array.isArray(j.history) || Array.isArray(j.iterationsList)) {
            const arr = (j.history ?? j.iterationsList) as unknown[];
            if (arr.length > 0) return { iterations: arr.length, source: "v1-state" };
          }
          // Check nested v1 key
          const v1 = j.v1 as Record<string, unknown> | undefined;
          if (v1) {
            const vn = parseTokens(v1.iterationCount ?? v1.iterations);
            if (vn != null) return { iterations: vn, source: "v1-state" };
          }
        }
      } catch {
        // continue
      }
    }
  }

  // 2. metadata.v1.iterationCount
  if (meta) {
    const v1 = meta.v1 as Record<string, unknown> | undefined;
    if (v1 && v1.iterationCount != null) {
      const n = parseTokens(v1.iterationCount);
      if (n != null) return { iterations: n, source: "metadata" };
    }
    // Alternative flattened metadata.iterationCount
    const flat = parseTokens((meta as Record<string, unknown>).iterationCount ?? (meta as Record<string, unknown>).iterations);
    if (flat != null && (agentVersion === "agent-v1" || String(agentVersion ?? "").includes("v1"))) {
      return { iterations: flat, source: "metadata" };
    }
    // Check trajectory-derived iterations stored as metadata.v1 or metadata iterations
    if (meta && typeof meta.iterations === "number") {
      return { iterations: meta.iterations as number, source: "metadata" };
    }
  }

  // 3. Trajectory scan for V1 iteration events
  if (existsSync(params.trajectoryPath)) {
    try {
      const raw = await readFile(params.trajectoryPath, "utf-8");
      const lines = raw.split("\n").filter(Boolean);
      let maxIter: number | null = null;
      let foundV1 = false;
      for (const line of lines) {
        const ev = tryParseJson(line) as Record<string, unknown> | null;
        if (!ev) continue;
        const type = ev.type as string | undefined;
        const data = ev.data as Record<string, unknown> | undefined;
        if (!type) continue;
        const lower = type.toLowerCase();
        if (lower.includes("v1") && (lower.includes("iteration") || lower.includes("phase"))) {
          foundV1 = true;
          const n = parseTokens(data?.iterationCount ?? data?.iteration ?? data?.count ?? data?.currentIteration);
          if (n != null) {
            if (maxIter == null || n > maxIter) maxIter = n;
          } else if (data && typeof data.iteration === "number") {
            const nn = data.iteration as number;
            if (maxIter == null || nn > maxIter) maxIter = nn;
          }
        }
        // Also count iteration-like events explicitly
        if (lower === "v1_iteration" || lower === "iteration") {
          foundV1 = true;
          const n = parseTokens(data?.count ?? data?.iteration);
          if (n != null && (maxIter == null || n > maxIter)) maxIter = n;
        }
      }
      if (foundV1 && maxIter != null) return { iterations: maxIter, source: "trajectory" };
      if (foundV1 && maxIter == null) {
        // Count iteration events
        let count = 0;
        for (const line of lines) {
          const ev = tryParseJson(line) as Record<string, unknown> | null;
          if (ev && String(ev.type ?? "").toLowerCase().includes("iteration")) count++;
        }
        if (count > 0) return { iterations: count, source: "trajectory" };
      }
    } catch {
      // ignore
    }
  }

  // 4. Fallback per agent version
  if (agentVersion === "baseline-v0" || agentVersion === "baseline_v0" || String(agentVersion).includes("baseline")) {
    return { iterations: 1, source: "fallback" };
  }
  if (agentVersion === "agent-v1" || String(agentVersion ?? "").includes("v1")) {
    // V1 without explicit state — fallback to 1 but mark fallback (heuristics not invented)
    return { iterations: 1, source: "fallback" };
  }
  // Generic fallback: 1 if no better heuristic
  return { iterations: 1, source: "fallback" };
}

export async function extractRunMetrics(params: {
  runId: string;
  runsDir: string;
  agentVersion?: string;
  durationMsFallback?: number;
  pricingConfigPath?: string;
}): Promise<{ metrics: RunMetrics; cost: RunCost }> {
  const runDir = resolve(params.runsDir, params.runId);
  const metadataPath = join(runDir, "metadata.json");
  const trajectoryPath = join(runDir, "trajectory.jsonl");
  const resultPath = join(runDir, "result.json");

  let metadata: Record<string, unknown> | null = null;
  if (existsSync(metadataPath)) {
    try {
      metadata = JSON.parse(await readFile(metadataPath, "utf-8")) as Record<string, unknown>;
    } catch {
      metadata = null;
    }
  }
  // Fallback to result.json for minimal fields
  if (!metadata && existsSync(resultPath)) {
    try {
      metadata = JSON.parse(await readFile(resultPath, "utf-8")) as Record<string, unknown>;
    } catch {
      metadata = null;
    }
  }

  const agentVersion = params.agentVersion ?? (metadata?.agentVersion as string | undefined);
  const model = (metadata?.model as string | undefined) ?? params.agentVersion; // keep fallback? use metadata model

  // Duration
  let durationMs: number | null = null;
  if (metadata?.durationMs != null) durationMs = parseTokens(metadata.durationMs);
  if (durationMs == null && params.durationMsFallback != null) durationMs = params.durationMsFallback;

  // Trajectory counts
  let totalTurns: number | null = null;
  let toolCalls: number | null = null;
  let commandsExecuted: number | null = null;
  let filesInspected: number | null = null;

  if (existsSync(trajectoryPath)) {
    try {
      const raw = await readFile(trajectoryPath, "utf-8");
      const lines = raw.split("\n").filter(Boolean);
      let turns = 0;
      let tools = 0;
      let bashCount = 0;
      const inspectedSet = new Set<string>();
      for (const line of lines) {
        const ev = tryParseJson(line) as Record<string, unknown> | null;
        if (!ev) continue;
        const type = ev.type as string | undefined;
        const data = ev.data as Record<string, unknown> | undefined;
        if (!type) continue;
        if (type === "agent_end" || type === "message_start" || type === "agent_start") {
          // Turns should count agent messages; keep simple: count agent_end or message_start
          if (type === "message_start" || type === "agent_end") turns++;
        }
        if (type === "tool_execution_start") {
          tools++;
          const toolName = data?.toolName as string | undefined;
          const args = data?.args as Record<string, unknown> | undefined;
          if (toolName === "bash") bashCount++;
          if ((toolName === "read" || toolName === "edit" || toolName === "write") && args?.path != null) {
            inspectedSet.add(String(args.path));
          }
          if (toolName === "grep" || toolName === "find" || toolName === "ls") {
            // Not counted as file inspected but could be
          }
        }
      }
      // Normalize: if turns 0 but tools exist, estimate turns as ceil(tools/3) capped at 25? Keep null if zero?
      if (turns > 0) totalTurns = turns;
      else if (tools > 0) totalTurns = Math.ceil(tools / 3);
      toolCalls = tools > 0 ? tools : 0;
      commandsExecuted = bashCount > 0 ? bashCount : 0;
      filesInspected = inspectedSet.size > 0 ? inspectedSet.size : 0;
    } catch {
      // leave null
    }
  }

  // Files changed
  let filesChanged: number | null = null;
  if (metadata?.changedFiles && Array.isArray(metadata.changedFiles)) {
    filesChanged = (metadata.changedFiles as unknown[]).length;
  } else {
    // Check result.json changedFiles
    const rc = metadata?.changedFiles;
    if (Array.isArray(rc)) filesChanged = rc.length;
  }

  // Tokens & cost
  const tok = await extractTokens({ metadata, trajectoryPath, model });
  const pricingConfig = loadPricingConfig(params.pricingConfigPath);
  // Determine model for pricing
  const pricingModel = model ?? (metadata?.model as string | undefined);
  let costResult = resolveCostWithProviderPreference({
    inputTokens: tok.inputTokens,
    outputTokens: tok.outputTokens,
    providerCostUsd: tok.providerCost,
    model: pricingModel,
    pricingConfig,
  });

  // Ensure strict guardrail: if tokens null, cost unavailable even with pricing
  // Already enforced in computeCost.

  // Iterations with V1 precedence
  const iter = await extractIterations({
    metadata,
    trajectoryPath,
    runDir,
    agentVersion,
  });

  const metrics: RunMetrics = {
    durationMs,
    totalTurns,
    toolCalls,
    commandsExecuted,
    filesInspected,
    filesChanged,
    iterations: iter.iterations,
    iterationsSource: iter.source,
    inputTokens: tok.inputTokens,
    outputTokens: tok.outputTokens,
    totalTokens: tok.inputTokens != null && tok.outputTokens != null ? tok.inputTokens + tok.outputTokens : null,
  };

  const cost: RunCost = {
    inputTokens: tok.inputTokens,
    outputTokens: tok.outputTokens,
    totalTokens: tok.inputTokens != null && tok.outputTokens != null ? tok.inputTokens + tok.outputTokens : null,
    inputCostUsd: costResult.inputCostUsd,
    outputCostUsd: costResult.outputCostUsd,
    totalCostUsd: costResult.totalCostUsd,
    costUsd: costResult.totalCostUsd,
    costStatus: costResult.costStatus,
    costSource: costResult.costSource,
    pricingModel: pricingModel ?? costResult.pricingModel,
  };

  return { metrics, cost };
}

export function isV1Agent(agentVersion: string | undefined): boolean {
  if (!agentVersion) return false;
  return agentVersion === "agent-v1" || agentVersion.includes("v1");
}
