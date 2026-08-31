import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { CaseLoader } from "../../runner/CaseLoader.ts";
import { WorkspaceManager, type Workspace } from "../../workspace/WorkspaceManager.ts";
import { V3CodingAgent } from "../agent/V3CodingAgent.ts";
import { loadV3Config, type V3Config } from "../config/V3Config.ts";
import type { RepairRun, RepairTask } from "../../agent/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export interface V3BatchOptions {
  caseIds?: string[];
  config?: V3Config;
  concurrency?: number;
  runsPerCase?: number;
  runsRoot?: string;
  keepWorkspace?: boolean;
}

export class V3Runner {
  private config: V3Config;
  private runsRoot: string;

  constructor(config?: V3Config, runsRoot?: string) {
    this.config = config ?? {
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
    this.runsRoot = runsRoot ?? join(ROOT, "experiments/runs");
  }

  async runCase(
    caseId: string,
    options: {
      runId?: string;
      config?: V3Config;
      runsRoot?: string;
      keepWorkspace?: boolean;
    } = {},
  ): Promise<RepairRun> {
    const runsRoot = options.runsRoot ?? this.runsRoot;
    const effectiveConfig = options.config ?? this.config;
    const runId = options.runId ?? `${caseId}-${randomUUID().slice(0, 6)}-${Date.now()}`;

    let workspace: Workspace | undefined;
    const validation = await CaseLoader.validateCaseForRun(caseId);
    if (!validation.valid) {
      const error = `Invalid case ${caseId}: ${validation.errors.join("; ")}`;
      const now = new Date().toISOString();
      const result: RepairRun = {
        runId,
        caseId,
        agentVersion: "agent-v3",
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
          agentVersion: "agent-v3",
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
      const agent = new V3CodingAgent({ config: effectiveConfig, runsRoot });
      const task: RepairTask = {
        runId,
        caseId,
        workspacePath: workspace.path,
        issue: loaded.issue,
        agentVersion: "agent-v3",
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
        agentVersion: "agent-v3",
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

  async runV3(options: V3BatchOptions = {}): Promise<RepairRun[]> {
    const config = options.config ?? this.config;
    const runsRoot = options.runsRoot ?? this.runsRoot;
    const concurrency = options.concurrency ?? 4;
    const runsPerCase = options.runsPerCase ?? config.runsPerCase ?? 1;

    let caseIds = options.caseIds;
    if (!caseIds || caseIds.length === 0) {
      caseIds = await CaseLoader.listCases();
    }

    const results: RepairRun[] = [];
    const queue: Array<{ caseId: string; runIndex: number }> = [];
    for (const caseId of caseIds) {
      for (let i = 0; i < runsPerCase; i++) queue.push({ caseId, runIndex: i });
    }

    const total = queue.length;
    let done = 0;

    if (concurrency === 1) {
      for (const item of queue) {
        const runId = `${item.caseId}-run-${String(item.runIndex + 1).padStart(3, "0")}-${randomUUID().slice(0, 6)}`;
        console.log(`[${done + 1}/${total}] ${item.caseId} (${runId}) started...`);
        const res = await this.runCase(item.caseId, { runId, config, runsRoot, keepWorkspace: options.keepWorkspace });
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
        const idx = total - queue.length;
        console.log(`[${idx}/${total}] ${item.caseId} (${runId}) started...`);
        const res = await this.runCase(item.caseId, { runId, config, runsRoot, keepWorkspace: options.keepWorkspace });
        done++;
        console.log(`[${done}/${total}] ${item.caseId} → ${res.status}`);
        results.push(res);
      }
    });

    await Promise.all(workers);
    return results;
  }
}
