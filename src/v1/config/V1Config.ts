import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { BaselineConfig, ThinkingLevel } from "../../config/BaselineConfig.ts";
import { loadBaselineConfig } from "../../config/BaselineConfig.ts";

export interface V1Config extends BaselineConfig {
  maxIterations: number;
  phaseTimeouts?: Partial<Record<string, number>>;
}

const V1_DEFAULTS = {
  maxIterations: 5,
};

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

async function resolvePiVersion(): Promise<string> {
  try {
    const possiblePaths = [
      resolve(process.cwd(), "node_modules/@earendil-works/pi-coding-agent/package.json"),
      resolve(dirname(fileURLToPath(import.meta.url)), "../../../node_modules/@earendil-works/pi-coding-agent/package.json"),
    ];
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        const raw = await readFile(p, "utf-8");
        const pkg = JSON.parse(raw) as { version: string };
        if (pkg.version) return pkg.version;
      }
    }
  } catch {}
  return "0.84.4";
}

export async function loadV1Config(options?: {
  configPath?: string;
  overrides?: Partial<V1Config>;
}): Promise<V1Config> {
  const baseline = await loadBaselineConfig(
    options?.configPath ? { configPath: options.configPath } : undefined,
  );

  // Try V1-specific config file
  let v1FileConfig: Partial<V1Config> = {};
  const candidatePaths = [
    options?.configPath,
    resolve(process.cwd(), "experiments/config/agent-v1.json"),
    resolve(process.cwd(), "experiments/config/baseline.json"),
  ].filter(Boolean) as string[];

  for (const p of candidatePaths) {
    if (existsSync(p)) {
      try {
        const raw = await readFile(p, "utf-8");
        const parsed = JSON.parse(raw) as Partial<V1Config>;
        // Only merge if this looks like a V1 config or baseline fallback
        if (parsed.maxIterations !== undefined || parsed.agentVersion === "agent-v1" || p.includes("agent-v1")) {
          v1FileConfig = parsed;
          break;
        }
        if (p.includes("baseline.json") && Object.keys(v1FileConfig).length === 0) {
          v1FileConfig = parsed;
        }
      } catch {}
    }
  }

  const piVersion = await resolvePiVersion();

  const envOverrides: Partial<V1Config> = {};
  if (process.env.V1_MAX_ITERATIONS) envOverrides.maxIterations = parseIntEnv(process.env.V1_MAX_ITERATIONS, V1_DEFAULTS.maxIterations);
  if (process.env.AGENT_MAX_ITERATIONS) envOverrides.maxIterations = parseIntEnv(process.env.AGENT_MAX_ITERATIONS, envOverrides.maxIterations ?? V1_DEFAULTS.maxIterations);
  if (process.env.V1_MODEL) envOverrides.model = process.env.V1_MODEL;
  // Also support generic AGENT_MODEL override for V1
  if (process.env.AGENT_MODEL) envOverrides.model = process.env.AGENT_MODEL;
  if (process.env.AGENT_VERSION) envOverrides.agentVersion = process.env.AGENT_VERSION;

  // Ensure V1 defaults for agentVersion if not explicitly baseline
  const merged: V1Config = {
    ...baseline,
    maxIterations: V1_DEFAULTS.maxIterations,
    ...v1FileConfig,
    ...envOverrides,
    ...(options?.overrides ?? {}),
  };

  // Force agentVersion to agent-v1 unless explicitly overridden to baseline-v0 or mock
  if (!options?.overrides?.agentVersion && !envOverrides.agentVersion && !v1FileConfig.agentVersion) {
    if (merged.agentVersion === "baseline-v0") merged.agentVersion = "agent-v1";
  }
  if (!merged.agentVersion) merged.agentVersion = "agent-v1";

  // Ensure piVersion resolved
  if (!merged.piVersion) merged.piVersion = piVersion;

  // Validate maxIterations bounds
  if (merged.maxIterations < 1) merged.maxIterations = 1;
  if (merged.maxIterations > 20) merged.maxIterations = 20;

  // Validate thinking level via baseline logic
  const validLevels: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
  if (!validLevels.includes(merged.thinkingLevel as ThinkingLevel)) {
    merged.thinkingLevel = "medium";
  }

  return merged;
}

export function getDefaultV1Config(): V1Config {
  return {
    agentRuntime: "pi",
    agentVersion: "agent-v1",
    benchmarkVersion: "0.5",
    model: "opencode-go/muse-spark-1.2-contributor",
    thinkingLevel: "medium",
    maxTurns: 25,
    agentTimeoutMs: 600_000,
    commandTimeoutSec: 30,
    runsPerCase: 1,
    cleanup: true,
    piVersion: "0.84.4",
    maxIterations: 5,
  };
}
