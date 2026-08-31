import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnv } from "../../config/BaselineConfig.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const DEFAULT_CONFIG_PATH = join(ROOT, "experiments/config/agent-v3.json");

export interface V3Config {
  version: "v3";
  agentVersion: "agent-v3";
  model: string;
  maxTurns: number;
  maxIterations: number;
  timeoutMs: number;
  maxExplorationTurns: number;
  enableHypothesisMemory: boolean;
  enableConcurrentFuzzing: boolean;
  enableDependencyGraph: boolean;
  enableDiffAudit: boolean;
  enableRollbackOnRegression: boolean;
  maxRollbacks: number;
  temperature?: number;
  runsPerCase?: number;
}

export const DEFAULT_V3_CONFIG: V3Config = {
  version: "v3",
  agentVersion: "agent-v3",
  model: "opencode-go/mimo-v2.5",
  maxTurns: 35,
  maxIterations: 4,
  timeoutMs: 600000,
  maxExplorationTurns: 4,
  enableHypothesisMemory: true,
  enableConcurrentFuzzing: true,
  enableDependencyGraph: true,
  enableDiffAudit: true,
  enableRollbackOnRegression: true,
  maxRollbacks: 3,
  temperature: 0.1,
  runsPerCase: 1,
};

export async function loadV3Config(options?: {
  configPath?: string;
  overrides?: Partial<V3Config>;
}): Promise<V3Config> {
  await loadDotEnv();
  const path = options?.configPath ?? DEFAULT_CONFIG_PATH;
  let fileConfig: Partial<V3Config> = {};

  if (existsSync(path)) {
    try {
      const raw = await readFile(path, "utf-8");
      fileConfig = JSON.parse(raw);
    } catch {
      fileConfig = {};
    }
  }

  const envModel = process.env.AGENT_MODEL?.trim();
  const providerEnv = process.env.PROVIDER?.trim();
  let defaultModel = DEFAULT_V3_CONFIG.model;
  if (envModel) {
    defaultModel = providerEnv && !envModel.includes("/") ? `${providerEnv}/${envModel}` : envModel;
  }

  return {
    ...DEFAULT_V3_CONFIG,
    model: defaultModel,
    ...fileConfig,
    ...(options?.overrides ?? {}),
  };
}

export function loadV3ConfigSync(options?: {
  configPath?: string;
  overrides?: Partial<V3Config>;
}): V3Config {
  const path = options?.configPath ?? DEFAULT_CONFIG_PATH;
  let fileConfig: Partial<V3Config> = {};

  if (existsSync(path)) {
    try {
      const raw = readFileSync(path, "utf-8");
      fileConfig = JSON.parse(raw);
    } catch {
      fileConfig = {};
    }
  }

  return {
    ...DEFAULT_V3_CONFIG,
    ...fileConfig,
    ...(options?.overrides ?? {}),
  };
}
