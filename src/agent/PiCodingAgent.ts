import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CodingAgent } from "./CodingAgent.ts";
import type { RepairTask, RepairRun, TestRecord } from "./types.ts";
import type { BaselineConfig } from "../config/BaselineConfig.ts";
import { TrajectoryCapture } from "../trajectory/TrajectoryCapture.ts";
import { capturePatch, writePatchFile } from "../patch/PatchCapture.ts";
import { writeJsonFile } from "../utils/fs.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const PROMPT_PATH = join(ROOT, "experiments/agents/baseline-v0.md");

interface PiCodingAgentOptions {
  config: BaselineConfig;
  /** Optional override for instructions; defaults to reading baseline-v0.md */
  instructions?: string;
  /** Optional trajectory dir; defaults to experiments/runs/<runId> */
  runsRoot?: string;
}

function loadInstructionsSync(_config: BaselineConfig): string {
  try {
    if (existsSync(PROMPT_PATH)) {
      return readFileSync(PROMPT_PATH, "utf-8");
    }
  } catch {
    // ignore
  }
  // Fallback minimal — SWE-bench alignment: bare-bones
  return `You are an autonomous software engineer working in this repository.\nFix the issue described in ISSUE.md.`;
}

async function loadInstructions(config: BaselineConfig, override?: string): Promise<string> {
  if (override) return override;
  try {
    if (existsSync(PROMPT_PATH)) {
      return await readFile(PROMPT_PATH, "utf-8");
    }
  } catch {
    // ignore
  }
  return loadInstructionsSync(config);
}

function isMockMode(config: BaselineConfig): boolean {
  if (process.env.BASELINE_MOCK === "1" || process.env.BASELINE_MOCK === "true") return true;
  if (process.env.MOCK_PI === "1" || process.env.MOCK_PI === "true") return true;
  if (config.model === "mock" || config.model === "mock/mock") return true;
  // If no API key env for any provider and model not mock, we may still want to mock in CI without keys
  // But don't auto-mock if user explicitly wants real run; allow error to surface.
  // For infrastructure tests we set BASELINE_MOCK=1.
  return false;
}

const TEST_COMMAND_RE = /\b(vitest|bun test|npm test|yarn test|pnpm test|npx\s+vitest|bun run test)\b/;

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
      // Also capture direct bash without toolCallId? Use command as key fallback
      if (!toolCallId && TEST_COMMAND_RE.test(command)) {
        // synthesize record without end yet
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
      // Try to extract exitCode from result
      let exitCode = isError ? 1 : 0;
      if (result && typeof result.exitCode === "number") exitCode = result.exitCode as number;
      else if (result && typeof (result as Record<string, unknown>).code === "number") exitCode = (result as Record<string, unknown>).code as number;
      // Duration via timestamps
      let durationMs = 0;
      try {
        const startMs = Date.parse(start.timestamp);
        const endMs = Date.parse(ev.timestamp);
        if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) durationMs = Math.max(0, endMs - startMs);
      } catch {}
      // stdout preview
      let stdout: string | undefined;
      const content = (result?.content as Array<{ text?: string }> | undefined);
      if (Array.isArray(content) && content[0]?.text) stdout = String(content[0].text).slice(0, 4000);
      records.push({ command, exitCode, durationMs, stdout, stderr: undefined });
      if (toolCallId) starts.delete(toolCallId);
    }
  }
  return records;
}

export class PiCodingAgent implements CodingAgent {
  private config: BaselineConfig;
  private instructionsPromise: Promise<string>;
  private runsRoot: string;

  constructor(options: PiCodingAgentOptions) {
    this.config = options.config;
    this.runsRoot = options.runsRoot ?? join(ROOT, "experiments/runs");
    this.instructionsPromise = loadInstructions(options.config, options.instructions);
  }

  async run(task: RepairTask): Promise<RepairRun> {
    const startTime = new Date().toISOString();
    const startMs = Date.now();
    const runId = task.runId;
    const trajectoryPath = join(this.runsRoot, runId, "trajectory.jsonl");
    const patchPath = join(this.runsRoot, runId, "patch.diff");
    const metadataPath = join(this.runsRoot, runId, "metadata.json");
    const resultPath = join(this.runsRoot, runId, "result.json");

    const trajectory = new TrajectoryCapture(trajectoryPath);
    // Live progress: stream high-level tool invocations to console for run-case.ts
    // Enabled via BASELINE_LIVE_PROGRESS=1 (run-case sets it, run-baseline keeps quiet)
    const liveProgress = process.env.BASELINE_LIVE_PROGRESS === "1" || process.env.BASELINE_VERBOSE === "1";
    const origAppend = trajectory.append.bind(trajectory);
    trajectory.append = (source: string, type: string, data: unknown) => {
      origAppend(source as never, type as never, data);
      if (!liveProgress) return;
      try {
        if (type === "tool_execution_start" && source === "agent") {
          const d = data as Record<string, unknown>;
          const toolName = (d.toolName as string) ?? "tool";
          const args = d.args as Record<string, unknown> | undefined;
          let detail = "";
          if (toolName === "bash" && args?.command) detail = String(args.command).slice(0, 120);
          else if ((toolName === "edit" || toolName === "write" || toolName === "read") && args?.path) detail = String(args.path);
          else if (toolName === "grep" && (args?.pattern || args?.query)) detail = String(args.pattern ?? args.query).slice(0, 80);
          else if (args) detail = JSON.stringify(args).slice(0, 80);
          console.log(`[tool] ${toolName}: ${detail}`);
        } else if (type === "tool_execution_end" && source === "agent") {
          const d = data as Record<string, unknown>;
          const toolName = (d.toolName as string) ?? "tool";
          const isError = d.isError as boolean | undefined;
          const result = d.result as Record<string, unknown> | undefined;
          let exitInfo = "";
          if (toolName === "bash") {
            const code = (result as Record<string, unknown> | undefined)?.exitCode ?? (isError ? 1 : 0);
            exitInfo = `exit ${code} ${code === 0 ? "(passed)" : "(failed)"}`;
          } else {
            exitInfo = isError ? "failed" : "ok";
          }
          console.log(`[tool] ${toolName}: ↳ ${exitInfo}`);
        } else if (type === "agent_start") {
          console.log(`[agent] started`);
        } else if (type === "agent_end") {
          console.log(`[agent] ended`);
        }
      } catch {}
    };
    let status: RepairRun["status"] = "success";
    let error: string | undefined;
    let changedFiles: string[] = [];
    let tests: TestRecord[] | undefined;

    // Ensure single terminal transition
    let terminated = false;
    const setTerminal = (s: RepairRun["status"], e?: string) => {
      if (terminated) return;
      terminated = true;
      status = s;
      if (e) error = e;
    };

    // Record initial context
    const instructions = await this.instructionsPromise;
    trajectory.append("system", "run_start", {
      runId,
      caseId: task.caseId,
      workspacePath: task.workspacePath,
      agentVersion: task.agentVersion,
      benchmarkVersion: task.benchmarkVersion,
      model: this.config.model,
      thinkingLevel: this.config.thinkingLevel,
      piVersion: this.config.piVersion,
      startTime,
    });
    trajectory.append("system", "agent_instructions", {
      promptPath: PROMPT_PATH,
      instructions: instructions.slice(0, 8000), // avoid huge
    });
    trajectory.append("system", "task_issue", {
      issue: task.issue.slice(0, 10000),
    });

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let abortController: AbortController | undefined;

    try {
      if (isMockMode(this.config)) {
        trajectory.append("harness", "mode", { mode: "mock", reason: "BASELINE_MOCK enabled or model=mock" });
        await this.runMock(task, trajectory);
      } else {
        // Real Pi execution
        abortController = new AbortController();
        const agentTimeoutMs = this.config.agentTimeoutMs;

        // Timeout promise with abort
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            abortController?.abort();
            setTerminal("timeout", `Agent timeout after ${agentTimeoutMs}ms`);
            reject(new Error(`Agent timeout after ${agentTimeoutMs}ms`));
          }, agentTimeoutMs);
          // Ensure timer doesn't keep process alive if not needed
          if (timeoutHandle && typeof (timeoutHandle as unknown as { unref?: () => void }).unref === "function") {
            (timeoutHandle as unknown as { unref: () => void }).unref();
          }
        });

        const runPromise = this.runWithPi(task, trajectory, abortController.signal);
        // Race with timeout; but ensure we capture result even if timeout occurs
        try {
          await Promise.race([runPromise, timeoutPromise]);
        } catch (e) {
          if ((e as Error).message?.includes("timeout")) {
            setTerminal("timeout", (e as Error).message);
            trajectory.append("system", "timeout", { message: (e as Error).message, timeoutMs: agentTimeoutMs });
          } else {
            throw e;
          }
        } finally {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        }
      }

      // After agent finish (or timeout), capture patch and changed files
      try {
        const patchResult = await capturePatch(task.workspacePath);
        changedFiles = patchResult.changedFiles;
        await writePatchFile(patchPath, patchResult.patch);
        trajectory.append("harness", "patch_captured", {
          patchPath,
          changedFiles,
          patchLength: patchResult.patch.length,
          patchEmpty: patchResult.patch.trim().length === 0,
        });

        // Populate testCommands from trajectory: extract agent-ran bash commands matching test runners
        try {
          const events = trajectory.getEvents();
          const testRecords = extractTestRecords(events);
          if (testRecords.length > 0) {
            tests = testRecords;
            trajectory.append("harness", "test_commands_extracted", {
              count: testRecords.length,
              commands: testRecords.map((t) => t.command),
            });
          }
        } catch (e) {
          trajectory.append("system", "test_extract_error", { error: (e as Error).message });
        }
      } catch (e) {
        const msg = `Patch capture failed: ${(e as Error).message}`;
        trajectory.append("system", "patch_error", { error: msg });
        if (!terminated) setTerminal("error", msg);
      }
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      // If already terminated as timeout, don't override
      if (!terminated) {
        if (msg.includes("timeout")) setTerminal("timeout", msg);
        else setTerminal("error", msg);
      }
      error = msg;
      trajectory.append("system", "run_error", { error: msg, stack: (e as Error).stack });
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      try {
        await trajectory.close();
      } catch {
        await trajectory.flush().catch(() => {});
      }

      // Ensure at least an empty trajectory file exists
      if (!existsSync(trajectoryPath)) {
        await trajectory.flush().catch(() => {});
      }
    }

    const endMs = Date.now();
    const endTime = new Date().toISOString();
    const durationMs = endMs - startMs;

    // Determine final status if not set
    if (!terminated) {
      // Baseline not responsible for correctness, just capture. Success if agent completed without error.
      status = "success";
    }

    // Write metadata
    const metadata = {
      runId,
      caseId: task.caseId,
      benchmarkVersion: task.benchmarkVersion,
      agentVersion: task.agentVersion,
      agentRuntime: this.config.agentRuntime,
      piVersion: this.config.piVersion,
      model: this.config.model,
      modelConfiguration: {
        thinkingLevel: this.config.thinkingLevel,
        maxTurns: this.config.maxTurns,
        agentTimeoutMs: this.config.agentTimeoutMs,
        commandTimeoutSec: this.config.commandTimeoutSec,
      },
      agentPromptVersion: this.config.agentVersion,
      agentPromptPath: PROMPT_PATH,
      startTime,
      endTime,
      durationMs,
      terminationStatus: status,
      changedFiles,
      testCommands: tests?.map((t) => t.command) ?? [],
      testResults: tests,
      trajectoryPath,
      patchPath,
      resultPath,
      workspacePath: task.workspacePath,
      error,
      nodeVersion: process.version,
      platform: process.platform,
      benchmarkFingerprint: this.config.benchmarkFingerprint,
    };

    try {
      await writeJsonFile(metadataPath, metadata);
      trajectory.append("system", "metadata_written", { metadataPath });
    } catch (e) {
      // ignore metadata write failure but record
    }

    const result: RepairRun = {
      runId,
      caseId: task.caseId,
      agentVersion: task.agentVersion,
      benchmarkVersion: task.benchmarkVersion,
      status,
      durationMs,
      changedFiles,
      patchPath,
      trajectoryPath,
      metadataPath,
      tests,
      error,
      model: this.config.model,
      thinkingLevel: this.config.thinkingLevel,
      piVersion: this.config.piVersion,
      startedAt: startTime,
      endedAt: endTime,
    };

    try {
      await writeJsonFile(resultPath, result);
    } catch {
      // ignore
    }

    return result;
  }

  /**
   * Real Pi execution via @earendil-works/pi-coding-agent
   */
  private async runWithPi(task: RepairTask, trajectory: TrajectoryCapture, signal: AbortSignal): Promise<void> {
    // Dynamic import to avoid loading Pi if not needed and to handle missing package
    let createAgentSession: any;
    let SessionManager: any;
    let DefaultResourceLoader: any;
    let getAgentDir: any;
    let ModelRuntime: any;
    let getModel: any;

    try {
      const piCoding = await import("@earendil-works/pi-coding-agent");
      createAgentSession = piCoding.createAgentSession;
      SessionManager = piCoding.SessionManager;
      DefaultResourceLoader = piCoding.DefaultResourceLoader;
      getAgentDir = piCoding.getAgentDir;
      ModelRuntime = piCoding.ModelRuntime;
    } catch (e) {
      throw new Error(`Failed to load @earendil-works/pi-coding-agent: ${(e as Error).message}. Ensure pi is installed.`);
    }
    try {
      const piAiCompat = await import("@earendil-works/pi-ai/compat");
      getModel = piAiCompat.getModel;
    } catch (e) {
      throw new Error(`Failed to load @earendil-works/pi-ai: ${(e as Error).message}`);
    }

    const instructions = await this.instructionsPromise;

    // Resolve model — inject provider key from .env (PROVIDER / PROVIDER_API_KEY) for opencode-go
    const modelRuntime = await ModelRuntime.create();
    // Support .env with PROVIDER=opencode-go and PROVIDER_API_KEY=<token>
    // Follow pi catalog: correct id is opencode-go/muse-spark-1.2-contributor (not meta/muse-spark-1.2)
    // If env PROVIDER is set, register its key with ModelRuntime so getAvailable() sees it
    const providerEnv = process.env.PROVIDER?.trim();
    const providerKey = process.env.PROVIDER_API_KEY?.trim() ?? process.env.OPENCODE_API_KEY?.trim() ?? process.env.OPENCODE_GO_API_KEY?.trim();
    if (providerEnv && providerKey) {
      try {
        await (modelRuntime as { setRuntimeApiKey: (p: string, k: string) => Promise<void> }).setRuntimeApiKey(providerEnv, providerKey);
        trajectory.append("harness", "runtime_key_set", { provider: providerEnv });
      } catch (e) {
        trajectory.append("system", "runtime_key_error", { error: (e as Error).message, provider: providerEnv });
      }
    }
    let model: unknown = null;
    let modelFound = false;

    // Model resolution: use AGENT_MODEL from .env exactly as provided (standard way)
    // No synthesis or normalization — pass through to pi catalog via getModel(provider, id)
    const modelStr = this.config.model; // e.g. "opencode-go/muse-spark-1.2-contributor" from .env AGENT_MODEL
    const slashIdx = modelStr.indexOf("/");
    let provider: string | undefined;
    let modelId: string | undefined;
    if (slashIdx > 0) {
      provider = modelStr.slice(0, slashIdx);
      modelId = modelStr.slice(slashIdx + 1);
      try {
        model = getModel(provider, modelId);
        if (model) {
          modelFound = true;
          trajectory.append("harness", "model_resolved", { provider, modelId, via: "getModel", catalog: "pi-ai" });
        } else {
          trajectory.append("system", "model_not_found", { provider, modelId, hint: "exact id must match pi catalog; use .env AGENT_MODEL value" });
        }
      } catch (e) {
        trajectory.append("system", "model_resolve_error", { error: (e as Error).message, provider, modelId });
      }
    }

    if (!modelFound) {
      // Try to get available models (have keys)
      try {
        const available = await (modelRuntime as { getAvailable: () => Promise<unknown[]> }).getAvailable();
        trajectory.append("harness", "available_models", { count: available.length, models: (available as Array<{ provider: string; id: string }>).slice(0, 5).map((m) => `${m.provider}/${m.id}`) });
        if (available.length > 0) {
          model = available[0];
          modelFound = true;
        }
      } catch (e) {
        trajectory.append("system", "available_models_error", { error: (e as Error).message });
      }
    }

    if (!model) {
      throw new Error(
        `No model available for ${modelStr}. Set AGENT_MODEL in .env to exact pi catalog id (e.g. opencode-go/muse-spark-1.2-contributor) and ensure PROVIDER_API_KEY is set. For testing without keys, set BASELINE_MOCK=1.`
      );
    }

    // Prepare resource loader with appended baseline instructions
    // Do not expose unnecessary env vars - Pi will handle PI_* itself
    const cwd = task.workspacePath;
    const agentDir = getAgentDir ? getAgentDir() : join(process.env.HOME ?? "/tmp", ".pi/agent");

    const loader = new DefaultResourceLoader({
      cwd,
      agentDir,
      // Append baseline prompt to system prompt
      appendSystemPromptOverride: (base: string[]) => [...base, instructions],
    });
    await loader.reload();
    trajectory.append("harness", "resource_loader_ready", { cwd, agentDir });

    // Check for auth via modelRuntime - log without leaking secrets
    trajectory.append("harness", "auth_check", { hasModel: !!model });

    const sessionManager = SessionManager.inMemory(cwd);
    let session: {
      subscribe: (fn: (event: unknown) => void) => () => void;
      prompt: (text: string) => Promise<void>;
      dispose: () => void;
      agent: {
        subscribe: (fn: (event: unknown, signal: AbortSignal) => void) => () => void;
        state: { messages: unknown[] };
      };
    };

    try {
      const result = await createAgentSession({
        cwd,
        model: model as never,
        thinkingLevel: this.config.thinkingLevel,
        modelRuntime,
        resourceLoader: loader,
        tools: ["read", "bash", "edit", "write", "grep", "find", "ls"],
        sessionManager,
      });
      session = result.session as never;
    } catch (e) {
      throw new Error(`Failed to create Pi session: ${(e as Error).message}`);
    }

    trajectory.append("harness", "session_created", { cwd, model: modelStr });

    // Subscribe to session and agent events for trajectory
    const unsubSession = session.subscribe((event: unknown) => {
      const ev = event as { type: string };
      trajectory.append("session", ev.type ?? "unknown", event);
    });

    const unsubAgent = session.agent.subscribe((event: unknown, _signal: AbortSignal) => {
      const ev = event as { type: string };
      // Avoid huge payloads: stringify but truncate
      trajectory.append("agent", ev.type ?? "unknown", event);
    });

    // Propagate abort signal to Pi if timeout occurs
    const abortListener = () => {
      try {
        session.agent.subscribe; // ensure agent exists
        // Pi's Agent has abort() method, but via session we can abort?
        // SessionManager's agent abort may be via session.agent.abort?
        const maybeAbort = (session.agent as unknown as { abort?: () => void }).abort;
        if (maybeAbort) maybeAbort.call(session.agent);
      } catch {
        // ignore
      }
    };
    signal.addEventListener("abort", abortListener);

    try {
      // Build prompt from issue
      const prompt = this.buildPrompt(task, instructions);
      trajectory.append("harness", "prompt_sent", { prompt: prompt.slice(0, 8000), length: prompt.length });

      // Run prompt with signal awareness
      // Pi's session.prompt doesn't directly take signal, but we can race with signal
      const promptPromise = session.prompt(prompt);

      const signalPromise = new Promise<never>((_, reject) => {
        if (signal.aborted) reject(new Error("Aborted before prompt"));
        signal.addEventListener("abort", () => reject(new Error("Aborted via signal")), { once: true });
      });

      await Promise.race([promptPromise, signalPromise]);

      trajectory.append("harness", "prompt_completed", { messages: session.agent.state.messages.length });

      // Capture final response
      const messages = session.agent.state.messages as Array<{ role: string; content?: unknown }>;
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
      if (lastAssistant) {
        trajectory.append("harness", "final_response", { content: lastAssistant.content });
      }
    } finally {
      signal.removeEventListener("abort", abortListener);
      unsubSession();
      unsubAgent();
      try {
        session.dispose();
      } catch {
        // ignore
      }
      trajectory.append("harness", "session_disposed", {});
    }
  }

  private buildPrompt(task: RepairTask, instructions: string): string {
    return `${instructions}\n\n${task.issue}`;
  }

  /**
   * Mock execution for CI / infrastructure tests without real LLM.
   * Simulates a competent agent: inspects repo, runs reproduce, makes a trivial fix, runs tests.
   */
  private async runMock(task: RepairTask, trajectory: TrajectoryCapture): Promise<void> {
    const workspace = task.workspacePath;
    trajectory.append("agent", "agent_start", { mock: true });

    // Simulate assistant thinking
    trajectory.append("agent", "message_start", { role: "assistant", mock: true });
    trajectory.append("agent", "message_update", {
      mock: true,
      content: "Inspecting repository and issue...",
      toolCalls: [],
    });

    // Simulate tool calls: read ISSUE.md
    trajectory.append("agent", "tool_execution_start", {
      toolCallId: "mock-read-1",
      toolName: "read",
      args: { path: join(workspace, "ISSUE.md") },
    });

    let issueContent = "";
    try {
      issueContent = await readFile(join(workspace, "ISSUE.md"), "utf-8");
      trajectory.append("agent", "tool_execution_end", {
        toolCallId: "mock-read-1",
        toolName: "read",
        result: { content: [{ type: "text", text: issueContent.slice(0, 2000) }] },
        isError: false,
      });
    } catch (e) {
      trajectory.append("agent", "tool_execution_end", {
        toolCallId: "mock-read-1",
        toolName: "read",
        result: { content: [{ type: "text", text: `Error: ${(e as Error).message}` }] },
        isError: true,
      });
    }

    // Simulate bash: list files
    trajectory.append("agent", "tool_execution_start", {
      toolCallId: "mock-bash-1",
      toolName: "bash",
      args: { command: "ls -la" },
    });
    try {
      const { execWithTimeout } = await import("../utils/git.ts");
      const res = await execWithTimeout("ls", ["-la"], workspace, 5000);
      trajectory.append("agent", "tool_execution_end", {
        toolCallId: "mock-bash-1",
        toolName: "bash",
        result: { content: [{ type: "text", text: res.stdout.slice(0, 2000) }] },
        isError: false,
      });
    } catch (e) {
      trajectory.append("agent", "tool_execution_end", {
        toolCallId: "mock-bash-1",
        toolName: "bash",
        result: { content: [{ type: "text", text: `Error: ${(e as Error).message}` }] },
        isError: true,
      });
    }

    // Simulate exploring repo (SWE-bench: no public/reproduce.ts provided)
    trajectory.append("agent", "tool_execution_start", {
      toolCallId: "mock-bash-2",
      toolName: "bash",
      args: { command: "grep -r TODO src --include=*.ts | head" },
    });
    try {
      const { execWithTimeout } = await import("../utils/git.ts");
      const res = await execWithTimeout("grep", ["-r", "TODO", "src", "--include=*.ts"], workspace, 5000).catch(() => ({ stdout: "no TODOs", stderr: "", code: 0 }));
      trajectory.append("agent", "tool_execution_end", {
        toolCallId: "mock-bash-2",
        toolName: "bash",
        result: { content: [{ type: "text", text: res.stdout.slice(0, 3000) }], exitCode: res.code },
        isError: false,
      });
    } catch (e) {
      trajectory.append("agent", "tool_execution_end", {
        toolCallId: "mock-bash-2",
        toolName: "bash",
        result: { content: [{ type: "text", text: `Error: ${(e as Error).message}` }] },
        isError: true,
      });
    }

    // Mock edit: create a trivial change to demonstrate patch capture
    // For testing we need to ensure at least one file is modified in a controlled way.
    // We add a comment to a source file without breaking functionality.
    // Find a src file to patch
    try {
      const { readdir } = await import("node:fs/promises");
      const { existsSync } = await import("node:fs");

      let targetFile: string | undefined;
      const candidates = ["src/task-manager.ts", "src/money.ts", "src/queue.ts", "src/CAC.ts", "src/defu.ts", "src/spyOn.ts", "lib/index.js"];
      for (const c of candidates) {
        if (existsSync(join(workspace, c))) {
          targetFile = c;
          break;
        }
      }
      // Fallback: find any .ts/.js file
      if (!targetFile) {
        const walk = async (dir: string): Promise<string | undefined> => {
          const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
          for (const e of entries) {
            if (e.name.startsWith(".") || e.name === "node_modules" || e.name === ".git") continue;
            const full = join(dir, e.name);
            const rel = full.startsWith(workspace) ? full.slice(workspace.length + 1) : full;
            if (e.isDirectory()) {
              const found = await walk(full);
              if (found) return found;
            } else if (rel.endsWith(".ts") || rel.endsWith(".js")) {
              // Skip ISSUE.md
              if (rel.includes("ISSUE")) continue;
              return rel;
            }
          }
          return undefined;
        };
        targetFile = await walk(workspace);
      }

      if (targetFile) {
        trajectory.append("agent", "tool_execution_start", {
          toolCallId: "mock-edit-1",
          toolName: "edit",
          args: { path: targetFile },
        });
        const fullPath = join(workspace, targetFile);
        const original = await readFile(fullPath, "utf-8").catch(() => "");
        // Add a baseline mock comment at top if not present
        const marker = `// baseline-v0 mock edit ${task.runId.slice(0, 8)} — mock agent touched file`;
        let newContent: string;
        if (original.includes(marker)) {
          newContent = original;
        } else {
          newContent = `${marker}\n${original}`;
        }
        await import("node:fs/promises").then((m) => m.writeFile(fullPath, newContent, "utf-8"));
        trajectory.append("agent", "tool_execution_end", {
          toolCallId: "mock-edit-1",
          toolName: "edit",
          result: { content: [{ type: "text", text: `Edited ${targetFile}` }] },
          isError: false,
        });
        trajectory.append("harness", "mock_edit_applied", { file: targetFile });
      } else {
        trajectory.append("harness", "mock_edit_skipped", { reason: "no target file found" });
      }
    } catch (e) {
      trajectory.append("system", "mock_edit_error", { error: (e as Error).message });
    }

    // Simulate test run
    trajectory.append("agent", "tool_execution_start", {
      toolCallId: "mock-bash-3",
      toolName: "bash",
      args: { command: "vitest run" },
    });
    try {
      const { execWithTimeout } = await import("../utils/git.ts");
      const res = await execWithTimeout("npx", ["vitest", "run", "--run"], workspace, 15000).catch(() => ({ stdout: "mock test output", stderr: "", code: 0 }));
      trajectory.append("agent", "tool_execution_end", {
        toolCallId: "mock-bash-3",
        toolName: "bash",
        result: { content: [{ type: "text", text: res.stdout.slice(0, 3000) }], exitCode: res.code },
        isError: res.code !== 0,
      });
    } catch (e) {
      trajectory.append("agent", "tool_execution_end", {
        toolCallId: "mock-bash-3",
        toolName: "bash",
        result: { content: [{ type: "text", text: `Error: ${(e as Error).message}` }] },
        isError: true,
      });
    }

    trajectory.append("agent", "agent_end", { messages: [{ role: "assistant", content: "Mock repair completed" }], mock: true });
    trajectory.append("harness", "mock_completed", { caseId: task.caseId, workspace });
  }
}
