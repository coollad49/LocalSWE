import { readFile } from "node:fs/promises";
import { existsSync, readFileSync, mkdirSync, symlinkSync, readdirSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import type { CodingAgent } from "../../agent/CodingAgent.ts";
import type { RepairTask, RepairRun, TestRecord, RepairStatus } from "../../agent/types.ts";
import type { V3Config } from "../config/V3Config.ts";
import type { AgentPhase, V3State } from "../types.ts";
import { TrajectoryCapture } from "../../trajectory/TrajectoryCapture.ts";
import { capturePatch, writePatchFile } from "../../patch/PatchCapture.ts";
import { writeJsonFile } from "../../utils/fs.ts";
import { execWithTimeout } from "../../utils/git.ts";
import { DependencyGraph } from "../tools/DependencyGraph.ts";
import { HypothesisTree } from "../workflow/HypothesisTree.ts";
import { ConcurrentFuzzer } from "../workflow/ConcurrentFuzzer.ts";
import { DiffAuditor } from "../workflow/DiffAuditor.ts";
import { getV3PhasePrompt, getV3WorkflowOverview } from "./phasePrompts.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const PROMPT_PATH = join(ROOT, "experiments/agents/agent-v3.md");

const TEST_COMMAND_RE = /\b(vitest|bun test|npm test|yarn test|pnpm test|npx\s+vitest|bun run test)\b/;

interface V3Options {
  config: V3Config;
  instructions?: string;
  runsRoot?: string;
}

function isMockMode(config: V3Config): boolean {
  if (process.env.BASELINE_MOCK === "1" || process.env.BASELINE_MOCK === "true") return true;
  if (process.env.MOCK_PI === "1" || process.env.MOCK_PI === "true") return true;
  if (process.env.V3_MOCK === "1" || process.env.V3_MOCK === "true") return true;
  if (config.model === "mock" || config.model === "mock/mock") return true;
  return false;
}

function isScratchFile(path: string): boolean {
  if (path.startsWith(".v3/") || path === ".v3") return true;
  if (path.startsWith(".v2/") || path === ".v2") return true;
  if (path.startsWith(".v1/") || path === ".v1") return true;
  const scratchPatterns = [
    /^(repro|reproduce|test|test_fix|check|check_patches|scratch|debug|verify|invariants).*\.(js|ts|mjs|cjs|sh|py)$/i,
    /^tmp-.*\.(js|ts)$/i,
    /^\.tmp-.*$/,
  ];
  for (const re of scratchPatterns) {
    if (re.test(path)) return true;
    const base = path.split("/").pop() ?? path;
    if (re.test(base)) return true;
  }
  if (path.startsWith("tmp/") || path.startsWith(".tmp/") || path.startsWith("scratch/")) return true;
  return false;
}

function sanitizePatchForScratchFiles(patch: string): string {
  if (!patch) return "";
  const lines = patch.split("\n");
  let out = "";
  let skipHunk = false;
  for (const line of lines) {
    if (line.startsWith("diff --git a/")) {
      const m = line.match(/^diff --git a\/(.+?) b\//);
      const filePath = m?.[1] ?? "";
      skipHunk = isScratchFile(filePath);
      if (!skipHunk) out += line + "\n";
      continue;
    }
    if (skipHunk) {
      if (line.startsWith("diff --git ")) {
        skipHunk = false;
        out += line + "\n";
      }
      continue;
    }
    out += line + "\n";
  }
  if (out.length > 0 && !out.endsWith("\n")) {
    out += "\n";
  }
  return out;
}

async function cleanupScratchFiles(workspacePath: string, trajectory: TrajectoryCapture): Promise<string[]> {
  const removed: string[] = [];
  try {
    const entries = readdirSync(workspacePath, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) continue;
      const rel = e.name;
      if (isScratchFile(rel) && !rel.startsWith(".v3")) {
        try {
          rmSync(join(workspacePath, rel), { force: true });
          removed.push(rel);
        } catch {}
      }
    }
    try {
      const status = await execWithTimeout("git", ["status", "--porcelain", "--", ".", ":!.v3", ":!.v3/**", ":!.v2", ":!.v2/**", ":!.v1", ":!.v1/**"], workspacePath, 5000);
      if (status.code === 0) {
        for (const line of status.stdout.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const m = trimmed.match(/^\?\? "?(.+?)"?$/);
          if (m && m[1]) {
            const p = m[1].replace(/^"|"$/g, "");
            if (isScratchFile(p)) {
              try {
                rmSync(join(workspacePath, p), { force: true });
                if (!removed.includes(p)) removed.push(p);
              } catch {}
            }
          }
        }
      }
    } catch {}
  } catch (e) {
    trajectory.append("system", "scratch_cleanup_error", { error: (e as Error).message });
  }
  if (removed.length > 0) trajectory.append("harness", "scratch_cleaned", { removed });
  return removed;
}

function extractTestRecords(events: Array<{ type: string; data: unknown; timestamp: string }>): TestRecord[] {
  const starts = new Map<string, { command: string; timestamp: string }>();
  const records: TestRecord[] = [];
  for (const ev of events) {
    const data = ev.data as Record<string, unknown>;
    if (ev.type === "tool_execution_start" && data?.toolName === "bash") {
      const args = data.args as Record<string, unknown> | undefined;
      const command = (args?.command as string) ?? "";
      const toolCallId = data.toolCallId as string | undefined;
      if (toolCallId && command) starts.set(toolCallId, { command, timestamp: ev.timestamp });
      if (!toolCallId && TEST_COMMAND_RE.test(command)) {
        records.push({ command, exitCode: 0, durationMs: 0 });
      }
    } else if (ev.type === "tool_execution_end" && data?.toolName === "bash") {
      const toolCallId = data.toolCallId as string | undefined;
      const start = toolCallId ? starts.get(toolCallId) : undefined;
      if (!start) continue;
      const command = start.command;
      if (!TEST_COMMAND_RE.test(command)) continue;
      const result = data.result as Record<string, unknown> | undefined;
      const isError = data.isError as boolean | undefined;
      let exitCode = isError ? 1 : 0;
      if (result && typeof result.exitCode === "number") exitCode = result.exitCode as number;
      else if (result && typeof (result as Record<string, unknown>).code === "number") exitCode = (result as Record<string, unknown>).code as number;
      let durationMs = 0;
      try {
        const startMs = Date.parse(start.timestamp);
        const endMs = Date.parse(ev.timestamp);
        if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) durationMs = Math.max(0, endMs - startMs);
      } catch {}
      let stdout: string | undefined;
      const content = (result?.content as Array<{ text?: string }> | undefined);
      if (Array.isArray(content) && content[0]?.text) stdout = String(content[0].text).slice(0, 4000);
      records.push({ command, exitCode, durationMs, stdout, stderr: undefined });
      if (toolCallId) starts.delete(toolCallId);
    }
  }
  return records;
}

export class V3CodingAgent implements CodingAgent {
  public readonly id = "agent-v3";
  public readonly name = "Agent V3 (LocalSWE)";
  public readonly version = "v3";
  public readonly config: V3Config;
  private readonly instructions: string;
  private readonly runsRoot: string;

  constructor(options: V3Options) {
    this.config = options.config;
    this.instructions = options.instructions ?? (existsSync(PROMPT_PATH) ? readFileSync(PROMPT_PATH, "utf-8") : getV3WorkflowOverview());
    this.runsRoot = options.runsRoot ?? join(ROOT, "experiments/runs");
  }

  async run(task: RepairTask): Promise<RepairRun> {
    const startTime = Date.now();
    const runId = task.runId ?? `${task.caseId}-run-001-${randomUUID().slice(0, 6)}`;
    const runDir = join(this.runsRoot, runId);
    mkdirSync(runDir, { recursive: true });

    const trajectoryPath = join(runDir, "trajectory.jsonl");
    const trajectory = new TrajectoryCapture(trajectoryPath);
    const dependencyGraph = new DependencyGraph(task.workspacePath);
    const hypothesisTree = new HypothesisTree(task.workspacePath, this.config.maxRollbacks);
    const concurrentFuzzer = new ConcurrentFuzzer(task.workspacePath);
    const diffAuditor = new DiffAuditor(task.workspacePath);

    await concurrentFuzzer.ensureV3Directory();
    if (this.config.enableDependencyGraph) {
      try {
        await dependencyGraph.build();
      } catch {}
    }

    // Ensure node_modules junction exists for Windows execution
    try {
      const rootNodeModules = join(ROOT, "node_modules");
      const targetNodeModules = join(task.workspacePath, "node_modules");
      if (existsSync(rootNodeModules) && !existsSync(targetNodeModules)) {
        symlinkSync(rootNodeModules, targetNodeModules, "junction");
      }
    } catch {}

    const v3State: V3State = {
      phase: "reconnaissance",
      issue: task.issue,
      filesInspected: [],
      commandsExecuted: [],
      hypotheses: [],
      negativeLessons: [],
      invariantsResults: [],
      rollbackCount: 0,
      iteration: 1,
      maxIterations: this.config.maxIterations,
      phaseHistory: [{ from: "init", to: "reconnaissance", timestamp: new Date().toISOString(), iteration: 1 }],
    };

    let patchContent = "";
    let changedFiles: string[] = [];
    let testsRun: TestRecord[] = [];
    let terminationStatus: RepairStatus = "success";
    let errorMessage: string | undefined;

    trajectory.append("runner", "agent_start", {
      agentVersion: "agent-v3",
      caseId: task.caseId,
      runId,
      config: this.config,
    });

    if (isMockMode(this.config)) {
      patchContent = "diff --git a/mock.ts b/mock.ts\n--- a/mock.ts\n+++ b/mock.ts\n@@ -1,1 +1,1 @@\n-broken\n+fixed\n";
      changedFiles = ["mock.ts"];
      testsRun = [{ command: "bun test", exitCode: 0, durationMs: 100 }];
    } else {
      try {
        const piCoding = await import("@earendil-works/pi-coding-agent");
        const createAgentSession = piCoding.createAgentSession;
        const SessionManager = piCoding.SessionManager;
        const DefaultResourceLoader = piCoding.DefaultResourceLoader;
        const getAgentDir = piCoding.getAgentDir;
        const ModelRuntime = piCoding.ModelRuntime;

        const piAiCompat = await import("@earendil-works/pi-ai/compat");
        const getModel = piAiCompat.getModel;

        const modelRuntime = await ModelRuntime.create();
        const providerEnv = process.env.PROVIDER?.trim();
        const providerKey = process.env.PROVIDER_API_KEY?.trim() ?? process.env.OPENCODE_API_KEY?.trim() ?? process.env.OPENCODE_GO_API_KEY?.trim();

        let model: unknown = null;
        const modelStr = this.config.model;
        const slashIdx = modelStr.indexOf("/");
        let provider: string | undefined;
        let modelId: string | undefined;
        if (slashIdx > 0) {
          provider = modelStr.slice(0, slashIdx);
          modelId = modelStr.slice(slashIdx + 1);
        } else if (providerEnv) {
          provider = providerEnv;
          modelId = modelStr;
        }

        const effectiveProvider = provider ?? providerEnv ?? "opencode-go";
        if (providerKey && effectiveProvider) {
          try {
            await (modelRuntime as { setRuntimeApiKey: (p: string, k: string) => Promise<void> }).setRuntimeApiKey(effectiveProvider, providerKey);
          } catch {}
        }

        if (provider && modelId) {
          try {
            model = (getModel as unknown as (p: string, m: string) => unknown)(provider, modelId);
          } catch {}
        }
        if (!model) {
          const available = await (modelRuntime as unknown as { getAvailable: () => Promise<readonly unknown[]> }).getAvailable();
          if (available.length > 0) model = available[0];
        }

        if (!model) throw new Error(`No model available for ${modelStr}`);

        const cwd = task.workspacePath;
        const agentDir = getAgentDir ? getAgentDir() : join(process.env.HOME ?? "/tmp", ".pi/agent");
        const loader = new DefaultResourceLoader({
          cwd,
          agentDir,
          appendSystemPromptOverride: (base: string[]) => [...base, this.instructions, getV3WorkflowOverview()],
        });
        await loader.reload();

        const sessionManager = SessionManager.inMemory(cwd);
        const sessionResult = await createAgentSession({
          cwd,
          model: model as never,
          thinkingLevel: "high",
          modelRuntime,
          resourceLoader: loader,
          tools: ["read", "bash", "edit", "write", "grep", "find", "ls"],
          sessionManager,
        });

        const session = sessionResult.session as {
          subscribe: (fn: (event: unknown) => void) => () => void;
          prompt: (text: string) => Promise<void>;
          dispose: () => void;
          agent: {
            subscribe: (fn: (event: unknown, signal: AbortSignal) => void) => () => void;
          };
        };

        session.subscribe((event: unknown) => {
          const ev = event as { type: string };
          trajectory.append("session", ev.type ?? "unknown", event);
        });

        session.agent.subscribe((event: unknown) => {
          const ev = event as { type: string; data?: unknown };
          if (ev.type !== "message_update") {
            trajectory.append("agent", ev.type ?? "unknown", event);
          }
        });

        const initialPrompt = `
Task: Fix the defect reported in ISSUE.md.

Issue Description:
${task.issue}

Workspace Directory: ${task.workspacePath}

Please begin Phase 1: Read ISSUE.md and write a minimal reproduction script (repro.ts).
`.trim();

        await session.prompt(initialPrompt);
        session.dispose();
      } catch (err: any) {
        terminationStatus = "error";
        errorMessage = err?.message ?? String(err);
        trajectory.append("runner", "error", { message: errorMessage });
      }
    }

    // Clean scratch files from workspace before taking git diff
    await cleanupScratchFiles(task.workspacePath, trajectory);

    // Capture clean git patch excluding scratch and .v3 files
    const patchRes = await capturePatch(task.workspacePath);
    patchContent = sanitizePatchForScratchFiles(patchRes.patch);
    changedFiles = patchRes.changedFiles.filter((f) => !isScratchFile(f));

    // Audit diff quality
    if (this.config.enableDiffAudit) {
      try {
        const audit = await diffAuditor.audit(patchContent, changedFiles);
        trajectory.append("harness", "diff_audit", audit);
      } catch {}
    }

    const patchPath = join(runDir, "patch.diff");
    await writePatchFile(patchPath, patchContent);

    // Save final state
    v3State.hypotheses = hypothesisTree.getRecords();
    v3State.rollbackCount = hypothesisTree.getRollbackCount();
    v3State.invariantsResults = concurrentFuzzer.getResults();
    await writeJsonFile(join(runDir, "v3-state.json"), v3State);

    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const metadataPath = join(runDir, "metadata.json");

    const runResult: RepairRun = {
      runId,
      caseId: task.caseId,
      agentVersion: "agent-v3",
      benchmarkVersion: "0.5",
      status: terminationStatus,
      durationMs,
      changedFiles,
      patchPath,
      trajectoryPath,
      metadataPath,
      tests: testsRun.length > 0 ? testsRun : extractTestRecords(trajectory.getEvents()),
      error: errorMessage,
      model: this.config.model,
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date(endTime).toISOString(),
    };

    await writeJsonFile(join(runDir, "result.json"), runResult);
    await writeJsonFile(metadataPath, {
      runId,
      caseId: task.caseId,
      agentVersion: "agent-v3",
      model: this.config.model,
      benchmarkVersion: "0.5",
      durationMs,
      startedAt: runResult.startedAt,
      endedAt: runResult.endedAt,
      terminationStatus,
    });

    await trajectory.flush();
    await trajectory.close();
    await concurrentFuzzer.cleanup();

    return runResult;
  }
}
