import { existsSync, rmSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { WorkspaceManager, type Workspace } from "../workspace/WorkspaceManager.ts";
import { CaseLoader } from "./CaseLoader.ts";
import { PiCodingAgent } from "../agent/PiCodingAgent.ts";
import type { BaselineConfig } from "../config/BaselineConfig.ts";
import type { RepairRun } from "../agent/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

export interface RunSingleCaseOptions {
  caseId: string;
  runId?: string;
  config: BaselineConfig;
  /** Optional runs root override */
  runsRoot?: string;
  /** Whether to keep workspace after run (for debugging). Defaults to config.cleanup inverse */
  keepWorkspace?: boolean;
}

export interface RunBaselineOptions {
  caseIds?: string[];
  config: BaselineConfig;
  runsRoot?: string;
  concurrency?: number;
  runsPerCase?: number;
}

export class BaselineRunner {
  private config: BaselineConfig;
  private runsRoot: string;

  constructor(config: BaselineConfig, runsRoot?: string) {
    this.config = config;
    this.runsRoot = runsRoot ?? join(ROOT, "experiments/runs");
  }

  /**
   * Run a single benchmark case with full isolation.
   * Guarantees canonical benchmark repositories are never mutated.
   */
  async runCase(options: RunSingleCaseOptions): Promise<RepairRun> {
    const { caseId, config } = options;
    const effectiveConfig = config ?? this.config;
    const runId = options.runId ?? `${caseId}-${randomUUID().slice(0, 8)}-${Date.now()}`;
    const runsRoot = options.runsRoot ?? this.runsRoot;

    let workspace: Workspace | undefined;
    let agent: PiCodingAgent | undefined;

    // Validate case before creating workspace
    const validation = await CaseLoader.validateCaseForRun(caseId);
    if (!validation.valid) {
      const error = `Invalid case ${caseId}: ${validation.errors.join("; ")}`;
      // Create a failed result without workspace
      const now = new Date().toISOString();
      const result: RepairRun = {
        runId,
        caseId,
        agentVersion: effectiveConfig.agentVersion,
        benchmarkVersion: effectiveConfig.benchmarkVersion,
        status: "error",
        durationMs: 0,
        changedFiles: [],
        error,
        model: effectiveConfig.model,
        thinkingLevel: effectiveConfig.thinkingLevel,
        piVersion: effectiveConfig.piVersion,
        startedAt: now,
        endedAt: now,
      };
      // Persist minimal result
      try {
        const { writeJsonFile } = await import("../utils/fs.ts");
        await writeJsonFile(join(runsRoot, runId, "result.json"), result);
        await writeJsonFile(join(runsRoot, runId, "metadata.json"), {
          runId,
          caseId,
          benchmarkVersion: effectiveConfig.benchmarkVersion,
          agentVersion: effectiveConfig.agentVersion,
          error,
          status: "error",
        });
      } catch {
        // ignore
      }
      return result;
    }

    const loaded = await CaseLoader.loadCase(caseId);
    const startMs = Date.now();

    try {
      // Create isolated workspace (contains buggy state)
      workspace = await WorkspaceManager.createWorkspace({ caseId, runId });

      // Create agent with workspace path
      agent = new PiCodingAgent({
        config: effectiveConfig,
        runsRoot,
      });

      const task = {
        runId,
        caseId,
        workspacePath: workspace.path,
        issue: loaded.issue,
        reproducePath: workspace.reproducePath,
        agentVersion: effectiveConfig.agentVersion,
        benchmarkVersion: effectiveConfig.benchmarkVersion,
      };

      // Run agent with timeout handling inside PiCodingAgent
      const result = await agent.run(task);

      return result;
    } catch (e) {
      const error = (e as Error).message ?? String(e);
      const now = new Date().toISOString();
      const result: RepairRun = {
        runId,
        caseId,
        agentVersion: effectiveConfig.agentVersion,
        benchmarkVersion: effectiveConfig.benchmarkVersion,
        status: "error",
        durationMs: Date.now() - startMs,
        changedFiles: [],
        error,
        model: effectiveConfig.model,
        thinkingLevel: effectiveConfig.thinkingLevel,
        piVersion: effectiveConfig.piVersion,
        startedAt: now,
        endedAt: now,
      };
      try {
        const { writeJsonFile } = await import("../utils/fs.ts");
        await writeJsonFile(join(runsRoot, runId, "result.json"), result);
      } catch {
        // ignore
      }
      return result;
    } finally {
      // Cleanup workspace if configured
      const shouldCleanup = options.keepWorkspace === undefined ? effectiveConfig.cleanup : !options.keepWorkspace;
      if (workspace && shouldCleanup) {
        try {
          await workspace.cleanup();
        } catch (e) {
          // Report cleanup failure but don't crash
          try {
            const trajectoryPath = join(runsRoot, runId, "trajectory.jsonl");
            const { appendFileSync } = await import("node:fs");
            const line = JSON.stringify({
              timestamp: new Date().toISOString(),
              seq: 99999,
              source: "system",
              type: "cleanup_error",
              data: { error: (e as Error).message },
            });
            appendFileSync(trajectoryPath, line + "\n");
          } catch {
            // ignore
          }
        }
      }
      // Ensure Pi session is disposed — handled inside PiCodingAgent
    }
  }

  /**
   * Run multiple cases sequentially (or with limited concurrency).
   * Prioritizes correctness and isolation over aggressive parallelism.
   */
  async runBaseline(options: RunBaselineOptions): Promise<RepairRun[]> {
    const caseIds = options.caseIds ?? (await CaseLoader.listCases());
    const runsPerCase = options.runsPerCase ?? this.config.runsPerCase ?? 1;
    const concurrency = Math.max(1, Math.min(options.concurrency ?? 1, 4)); // cap at 4 for safety

    const results: RepairRun[] = [];

    // Live progress is off for run-baseline; provide simple case-level progress (quiet, not tool-level)
    const quiet = process.env.BASELINE_LIVE_PROGRESS === "0";
    let done = 0;
    const total = caseIds.length * runsPerCase;
    const logProgress = (caseId: string, status: string) => {
      if (quiet) {
        done++;
        console.log(`[${done}/${total}] ${caseId} → ${status}`);
      }
    };

    // For baseline v0, prioritize correctness: run sequentially by default
    if (concurrency === 1) {
      for (const caseId of caseIds) {
        for (let i = 0; i < runsPerCase; i++) {
          const runId = `${caseId}-run-${String(i + 1).padStart(3, "0")}-${randomUUID().slice(0, 6)}`;
          if (quiet) console.log(`[${done + 1}/${total}] ${caseId} (${runId}) started...`);
          const res = await this.runCase({ caseId, runId, config: this.config, runsRoot: options.runsRoot ?? this.runsRoot });
          logProgress(caseId, res.status);
          results.push(res);
        }
      }
      return results;
    }

    // Concurrent mode: batch
    const queue: Array<{ caseId: string; runIndex: number }> = [];
    for (const caseId of caseIds) {
      for (let i = 0; i < runsPerCase; i++) queue.push({ caseId, runIndex: i });
    }

    const runWithConcurrency = async (): Promise<void> => {
      const workers = Array.from({ length: concurrency }, async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) break;
          if (quiet) console.log(`[${done + 1}/${total}] ${item.caseId} started (concurrency ${concurrency})...`);
          const runId = `${item.caseId}-run-${String(item.runIndex + 1).padStart(3, "0")}-${randomUUID().slice(0, 6)}`;
          const res = await this.runCase({ caseId: item.caseId, runId, config: this.config, runsRoot: options.runsRoot ?? this.runsRoot });
          logProgress(item.caseId, res.status);
          results.push(res);
        }
      });
      await Promise.all(workers);
    };

    await runWithConcurrency();
    // Sort for determinism
    results.sort((a, b) => a.caseId.localeCompare(b.caseId) || a.runId.localeCompare(b.runId));
    return results;
  }

  /** Get canonical benchmark fingerprint for metadata */
  static async getFingerprint(): Promise<string | undefined> {
    try {
      const p = join(ROOT, "benchmark/validation-report.json");
      if (existsSync(p)) {
        const raw = readFileSync(p, "utf-8");
        const json = JSON.parse(raw) as { fingerprint?: string };
        return json.fingerprint;
      }
    } catch {
      // ignore
    }
    return undefined;
  }
}
