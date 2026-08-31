import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const DEFAULT_CONFIG_PATH = join(ROOT, "experiments/config/agent-v2.json");

export interface V2Config {
  version: "v2";
  agentVersion: "agent-v2";
  model: string;
  maxTurns: number;
  maxIterations: number;
  timeoutMs: number;
  maxExplorationTurns: number;
  enableInvariantSynthesis: boolean;
  maxInvariantPermutations: number;
  enableRollbackOnRegression: boolean;
  maxRollbacks: number;
  temperature?: number;
  runsPerCase?: number;
}

export const DEFAULT_V2_CONFIG: V2Config = {
  version: "v2",
  agentVersion: "agent-v2",
  model: "opencode-go/mimo-v2.5",
  maxTurns: 35,
  maxIterations: 4,
  timeoutMs: 600000, // 10 minutes per case
  maxExplorationTurns: 4,
  enableInvariantSynthesis: true,
  maxInvariantPermutations: 50,
  enableRollbackOnRegression: true,
  maxRollbacks: 3,
  temperature: 0.1,
  runsPerCase: 1,
};

export async function loadV2Config(options?: {
  configPath?: string;
  overrides?: Partial<V2Config>;
}): Promise<V2Config> {
  const path = options?.configPath ?? DEFAULT_CONFIG_PATH;
  let fileConfig: Partial<V2Config> = {};

  if (existsSync(path)) {
    try {
      const raw = await readFile(path, "utf-8");
      fileConfig = JSON.parse(raw);
    } catch {
      fileConfig = {};
    }
  }

  return {
    ...DEFAULT_V2_CONFIG,
    ...fileConfig,
    ...(options?.overrides ?? {}),
  };
}

export function loadV2ConfigSync(options?: {
  configPath?: string;
  overrides?: Partial<V2Config>;
}): V2Config {
  const path = options?.configPath ?? DEFAULT_CONFIG_PATH;
  let fileConfig: Partial<V2Config> = {};

  if (existsSync(path)) {
    try {
      const raw = readFileSync(path, "utf-8");
      fileConfig = JSON.parse(raw);
    } catch {
      fileConfig = {};
    }
  }

  return {
    ...DEFAULT_V2_CONFIG,
    ...fileConfig,
    ...(options?.overrides ?? {}),
  };
}
