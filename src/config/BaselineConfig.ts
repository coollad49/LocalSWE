import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export interface BaselineConfig {
  agentRuntime: string;
  agentVersion: string;
  benchmarkVersion: string;
  model: string;
  thinkingLevel: ThinkingLevel;
  maxTurns?: number;
  agentTimeoutMs: number;
  commandTimeoutSec: number;
  runsPerCase: number;
  cleanup: boolean;
  piVersion: string;
  benchmarkFingerprint?: string;
}

const DEFAULTS: BaselineConfig = {
  agentRuntime: "pi",
  agentVersion: "baseline-v0",
  benchmarkVersion: "0.5",
  // Model is sourced from environment (.env) via AGENT_MODEL; DEFAULTS is fallback for local mock/testing only.
  // Example .env: AGENT_MODEL=opencode-go/muse-spark-1.2-contributor (see pi catalog at node_modules/@earendil-works/pi-ai/dist/providers/data/opencode-go.json)
  model: "opencode-go/muse-spark-1.2-contributor",
  thinkingLevel: "medium",
  maxTurns: 25,
  agentTimeoutMs: 600_000, // 10 min per case
  commandTimeoutSec: 30,
  runsPerCase: 1,
  cleanup: true,
  piVersion: "0.84.4",
};

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function parseBoolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

/**
 * Resolve Pi version from installed package.
 * Falls back to defaults if not found.
 */
async function resolvePiVersion(): Promise<string> {
  try {
    // Try to read from node_modules
    const possiblePaths = [
      resolve(process.cwd(), "node_modules/@earendil-works/pi-coding-agent/package.json"),
      resolve(dirname(fileURLToPath(import.meta.url)), "../../node_modules/@earendil-works/pi-coding-agent/package.json"),
    ];
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        const raw = await readFile(p, "utf-8");
        const pkg = JSON.parse(raw) as { version: string };
        if (pkg.version) return pkg.version;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULTS.piVersion;
}

/**
 * Minimal .env loader (no dotenv dependency). Populates process.env from .env if present.
 * Standard way: .env contains PROVIDER, PROVIDER_API_KEY, AGENT_MODEL, etc.
 */
async function loadDotEnv(): Promise<void> {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  try {
    const raw = await readFile(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

/**
 * Load baseline config from:
 * 1. defaults
 * 2. optional JSON file (experiments/config/baseline.json)
 * 3. environment variables (highest priority, including .env file)
 */
export async function loadBaselineConfig(options?: {
  configPath?: string;
  overrides?: Partial<BaselineConfig>;
}): Promise<BaselineConfig> {
  await loadDotEnv();
  let fileConfig: Partial<BaselineConfig> = {};
  const candidatePaths = [
    options?.configPath,
    resolve(process.cwd(), "experiments/config/baseline.json"),
    resolve(process.cwd(), "benchmark/../experiments/config/baseline.json"),
  ].filter(Boolean) as string[];

  for (const p of candidatePaths) {
    if (existsSync(p)) {
      try {
        const raw = await readFile(p, "utf-8");
        fileConfig = JSON.parse(raw) as Partial<BaselineConfig>;
        break;
      } catch {
        // ignore parse errors, use defaults
      }
    }
  }

  const piVersion = await resolvePiVersion();

  const envOverrides: Partial<BaselineConfig> = {};
  if (process.env.AGENT_RUNTIME) envOverrides.agentRuntime = process.env.AGENT_RUNTIME;
  // Model is sourced from .env via AGENT_MODEL (standard way, no synthesis)
  // Example .env: AGENT_MODEL=opencode-go/muse-spark-1.2-contributor (pi catalog id)
  // Do not synthesize model from PROVIDER; pass through exactly what env provides.
  if (process.env.AGENT_MODEL) envOverrides.model = process.env.AGENT_MODEL;
  if (process.env.AGENT_THINKING_LEVEL) envOverrides.thinkingLevel = process.env.AGENT_THINKING_LEVEL as ThinkingLevel;
  if (process.env.AGENT_VERSION) envOverrides.agentVersion = process.env.AGENT_VERSION;
  if (process.env.BENCHMARK_VERSION) envOverrides.benchmarkVersion = process.env.BENCHMARK_VERSION;
  if (process.env.AGENT_TIMEOUT_MS) envOverrides.agentTimeoutMs = parseIntEnv(process.env.AGENT_TIMEOUT_MS, DEFAULTS.agentTimeoutMs);
  if (process.env.COMMAND_TIMEOUT_SEC) envOverrides.commandTimeoutSec = parseIntEnv(process.env.COMMAND_TIMEOUT_SEC, DEFAULTS.commandTimeoutSec);
  if (process.env.PI_VERSION) envOverrides.piVersion = process.env.PI_VERSION;
  // Allow piVersion auto-detection unless env overrides
  if (!envOverrides.piVersion) envOverrides.piVersion = piVersion;

  const merged: BaselineConfig = {
    ...DEFAULTS,
    ...fileConfig,
    ...envOverrides,
    ...(options?.overrides ?? {}),
  };

  // Validate thinking level
  const validLevels: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
  if (!validLevels.includes(merged.thinkingLevel)) {
    merged.thinkingLevel = DEFAULTS.thinkingLevel;
  }

  // Ensure piVersion is set to resolved if not overridden and file didn't set it
  if (!merged.piVersion) merged.piVersion = piVersion;

  return merged;
}

export function getDefaultConfig(): BaselineConfig {
  return { ...DEFAULTS };
}
