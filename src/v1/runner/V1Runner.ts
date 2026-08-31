import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { WorkspaceManager, type Workspace } from "../../workspace/WorkspaceManager.ts";
import { CaseLoader } from "../../runner/CaseLoader.ts";
import { V1CodingAgent } from "../agent/V1CodingAgent.ts";
import type { V1Config } from "../config/V1Config.ts";
import type { RepairRun } from "../../agent/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export interface RunV1SingleOptions {
  caseId: string;
  runId?: string;
  config: V1Config;
  runsRoot?: string;
  keepWorkspace?: boolean;
}

export interface RunV1Options {
  caseIds?: string[];
  config: V1Config;
  runsRoot?: string;
  concurrency?: number;
  runsPerCase?: number;
}

export class V1Runner {
  private config: V1Config;
  private runsRoot: string;

  constructor(config: V1Config, runsRoot?: string) {
    this.config = config;
    this.runsRoot = runsRoot ?? join(ROOT, "experiments/runs");
  }

  async runCase(options: RunV1SingleOptions): Promise<RepairRun> {
    const { caseId, config } = options;
    const effectiveConfig = config ?? this.config;
    const runId = options.runId ?? `${caseId}-${randomUUID().slice(0, 8)}-${Date.now()}`;
    const runsRoot = options.runsRoot ?? this.runsRoot;

    let workspace: Workspace | undefined;

    const validation = await CaseLoader.validateCaseForRun(caseId);
    if (!validation.valid) {
      const error = `Invalid case ${caseId}: ${validation.errors.join("; ")}`;
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
      try {
        const { writeJsonFile } = await import("../../utils/fs.ts");
        await writeJsonFile(join(runsRoot, runId, "result.json"), result);
        await writeJsonFile(join(runsRoot, runId, "metadata.json"), {
          runId,
          caseId,
          benchmarkVersion: effectiveConfig.benchmarkVersion,
          agentVersion: effectiveConfig.agentVersion,
          error,
          status: "error",
        });
      } catch {}
      return result;
    }

    const loaded = await CaseLoader.loadCase(caseId);
    const startMs = Date.now();

    try {
      workspace = await WorkspaceManager.createWorkspace({ caseId, runId });
      const agent = new V1CodingAgent({ config: effectiveConfig, runsRoot });
      const task = {
        runId,
        caseId,
        workspacePath: workspace.path,
        issue: loaded.issue,
        agentVersion: effectiveConfig.agentVersion,
        benchmarkVersion: effectiveConfig.benchmarkVersion,
      };
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
        const { writeJsonFile } = await import("../../utils/fs.ts");
        await writeJsonFile(join(runsRoot, runId, "result.json"), result);
      } catch {}
      return result;
    } finally {
      const shouldCleanup = options.keepWorkspace === undefined ? effectiveConfig.cleanup : !options.keepWorkspace;
      if (workspace && shouldCleanup) {
        try {
          await workspace.cleanup();
        } catch (e) {
          try {
            const { appendFileSync } = await import("node:fs");
            const trajectoryPath = join(runsRoot, runId, "trajectory.jsonl");
            const line = JSON.stringify({
              timestamp: new Date().toISOString(),
              seq: 99999,
              source: "system",
              type: "cleanup_error",
              data: { error: (e as Error).message },
            });
            appendFileSync(trajectoryPath, line + "\n");
          } catch {}
        }
      }
    }
  }

  async runV1(options: RunV1Options): Promise<RepairRun[]> {
    const caseIds = options.caseIds ?? (await CaseLoader.listCases());
    const runsPerCase = options.runsPerCase ?? this.config.runsPerCase ?? 1;
    const concurrency = Math.max(1, Math.min(options.concurrency ?? 1, 16));

    const results: RepairRun[] = [];
    const queue: Array<{ caseId: string; runIndex: number }> = [];
    for (const caseId of caseIds) for (let i = 0; i < runsPerCase; i++) queue.push({ caseId, runIndex: i });

    const logProgress = (caseId: string, status: string, done: number, total: number) => {
      if (process.env.V1_LIVE_PROGRESS === "0" || process.env.BASELINE_LIVE_PROGRESS === "0") {
        console.log(`[${done}/${total}] ${caseId} → ${status}`);
      }
    };

    const total = queue.length;
    let done = 0;

    if (concurrency === 1) {
      for (const item of queue) {
        const runId = `${item.caseId}-run-${String(item.runIndex + 1).padStart(3, "0")}-${randomUUID().slice(0, 6)}`;
        const quiet = process.env.V1_LIVE_PROGRESS === "0" || process.env.BASELINE_LIVE_PROGRESS === "0";
        if (quiet) console.log(`[${done + 1}/${total}] ${item.caseId} (${runId}) started...`);
        const res = await this.runCase({ caseId: item.caseId, runId, config: this.config, runsRoot: options.runsRoot ?? this.runsRoot });
        done++;
        logProgress(item.caseId, res.status, done, total);
        results.push(res);
      }
      return results;
    }

    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        const runId = `${item.caseId}-run-${String(item.runIndex + 1).padStart(3, "0")}-${randomUUID().slice(0, 6)}`;
        const res = await this.runCase({ caseId: item.caseId, runId, config: this.config, runsRoot: options.runsRoot ?? this.runsRoot });
        done++;
        logProgress(item.caseId, res.status, done, total);
        results.push(res);
      }
    });
    await Promise.all(workers);
    results.sort((a, b) => a.caseId.localeCompare(b.caseId) || a.runId.localeCompare(b.runId));
    return results;
  }

  static async getFingerprint(): Promise<string | undefined> {
    try {
      const p = join(ROOT, "benchmark/validation-report.json");
      if (existsSync(p)) {
        const raw = readFileSync(p, "utf-8");
        const json = JSON.parse(raw) as { fingerprint?: string };
        return json.fingerprint;
      }
    } catch {}
    return undefined;
  }
}
