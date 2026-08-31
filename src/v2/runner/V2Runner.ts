import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { WorkspaceManager, type Workspace } from "../../workspace/WorkspaceManager.ts";
import { CaseLoader } from "../../runner/CaseLoader.ts";
import { V2CodingAgent } from "../agent/V2CodingAgent.ts";
import type { V2Config } from "../config/V2Config.ts";
import type { RepairRun, RepairTask } from "../../agent/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export interface RunV2SingleOptions {
  caseId: string;
  runId?: string;
  config: V2Config;
  runsRoot?: string;
  keepWorkspace?: boolean;
}

export interface RunV2Options {
  caseIds?: string[];
  config: V2Config;
  runsRoot?: string;
  concurrency?: number;
  runsPerCase?: number;
}

export class V2Runner {
  private config: V2Config;
  private runsRoot: string;

  constructor(config: V2Config, runsRoot?: string) {
    this.config = config;
    this.runsRoot = runsRoot ?? join(ROOT, "experiments/runs");
  }

  async runCase(options: RunV2SingleOptions): Promise<RepairRun> {
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
        agentVersion: "agent-v2",
        benchmarkVersion: "0.5",
        status: "error",
        durationMs: 0,
        changedFiles: [],
        error,
        model: effectiveConfig.model,
        startedAt: now,
        endedAt: now,
      };
      try {
        const { writeJsonFile } = await import("../../utils/fs.ts");
        await writeJsonFile(join(runsRoot, runId, "result.json"), result);
        await writeJsonFile(join(runsRoot, runId, "metadata.json"), {
          runId,
          caseId,
          benchmarkVersion: "0.5",
          agentVersion: "agent-v2",
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
      const agent = new V2CodingAgent({ config: effectiveConfig, runsRoot });
      const task: RepairTask = {
        runId,
        caseId,
        workspacePath: workspace.path,
        issue: loaded.issue,
        agentVersion: "agent-v2",
        benchmarkVersion: "0.5",
      };
      const result = await agent.run(task);
      return result;
    } catch (e) {
      const error = (e as Error).message ?? String(e);
      const now = new Date().toISOString();
      const result: RepairRun = {
        runId,
        caseId,
        agentVersion: "agent-v2",
        benchmarkVersion: "0.5",
        status: "error",
        durationMs: Date.now() - startMs,
        changedFiles: [],
        error,
        model: effectiveConfig.model,
        startedAt: now,
        endedAt: now,
      };
      try {
        const { writeJsonFile } = await import("../../utils/fs.ts");
        await writeJsonFile(join(runsRoot, runId, "result.json"), result);
      } catch {}
      return result;
    } finally {
      if (workspace && !options.keepWorkspace) {
        try {
          await workspace.cleanup();
        } catch {}
      }
    }
  }

  async runV2(options: RunV2Options): Promise<RepairRun[]> {
    const caseIds = options.caseIds ?? (await CaseLoader.listCases());
    const runsPerCase = options.runsPerCase ?? this.config.runsPerCase ?? 1;
    const concurrency = Math.max(1, Math.min(options.concurrency ?? 1, 16));

    const results: RepairRun[] = [];
    const queue: Array<{ caseId: string; runIndex: number }> = [];
    for (const caseId of caseIds) for (let i = 0; i < runsPerCase; i++) queue.push({ caseId, runIndex: i });

    const total = queue.length;
    let done = 0;

    if (concurrency === 1) {
      for (const item of queue) {
        const runId = `${item.caseId}-run-${String(item.runIndex + 1).padStart(3, "0")}-${randomUUID().slice(0, 6)}`;
        console.log(`[${done + 1}/${total}] ${item.caseId} (${runId}) started...`);
        const res = await this.runCase({ caseId: item.caseId, runId, config: this.config, runsRoot: options.runsRoot ?? this.runsRoot });
        done++;
        console.log(`[${done}/${total}] ${item.caseId} → ${res.status}`);
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
        console.log(`[${done}/${total}] ${item.caseId} → ${res.status}`);
        results.push(res);
      }
    });
    await Promise.all(workers);
    results.sort((a, b) => a.caseId.localeCompare(b.caseId) || a.runId.localeCompare(b.runId));
    return results;
  }
}
