import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { NormalizedEvent } from "./types.ts";

export interface ParsedTrajectory {
  events: NormalizedEvent[];
  parseErrors: number;
  trajectoryHash: string;
  meta: {
    runId?: string;
    caseId?: string;
    agentVersion?: string;
    benchmarkVersion?: string;
    model?: string;
    startTime?: string;
    terminationReason?: string;
  };
}

export class TrajectoryParser {
  /**
   * Parse a trajectory.jsonl file line-by-line into normalized events.
   * Tolerates malformed lines, missing fields, and varied event formats.
   */
  static async parseFile(filePath: string): Promise<ParsedTrajectory> {
    if (!existsSync(filePath)) {
      return {
        events: [],
        parseErrors: 0,
        trajectoryHash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        meta: {},
      };
    }

    const events: NormalizedEvent[] = [];
    let parseErrors = 0;
    const meta: ParsedTrajectory["meta"] = {};
    const hashSum = createHash("sha256");

    const fileStream = createReadStream(filePath, { encoding: "utf-8" });
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    let index = 0;
    for await (const line of rl) {
      if (!line.trim()) continue;
      hashSum.update(line + "\n");

      let raw: any;
      try {
        raw = JSON.parse(line);
      } catch {
        parseErrors++;
        continue;
      }

      index++;
      const norm = this.normalizeRawEvent(raw, index);
      events.push(norm);

      // Extract metadata from run_start or workflow_init
      if (raw.type === "run_start" && raw.data) {
        if (raw.data.runId) meta.runId = String(raw.data.runId);
        if (raw.data.caseId) meta.caseId = String(raw.data.caseId);
        if (raw.data.agentVersion) meta.agentVersion = String(raw.data.agentVersion);
        if (raw.data.benchmarkVersion) meta.benchmarkVersion = String(raw.data.benchmarkVersion);
        if (raw.data.model) meta.model = String(raw.data.model);
        if (raw.data.startTime) meta.startTime = String(raw.data.startTime);
      } else if (raw.type === "session_created" && raw.data?.model && !meta.model) {
        meta.model = String(raw.data.model);
      }
    }

    return { events, parseErrors, trajectoryHash: "sha256:" + hashSum.digest("hex"), meta };
  }

  /**
   * Normalize an arbitrary raw trajectory event into a consistent internal schema.
   */
  static normalizeRawEvent(raw: any, index: number): NormalizedEvent {
    const timestamp = typeof raw.timestamp === "string" ? raw.timestamp : undefined;
    const seq = typeof raw.seq === "number" ? raw.seq : undefined;
    const source = raw.source === "system" || raw.source === "harness" || raw.source === "session" || raw.source === "agent"
      ? raw.source
      : "unknown";
    const type = typeof raw.type === "string" ? raw.type : "unknown";

    const data = raw.data && typeof raw.data === "object" ? raw.data : {};
    const phase = typeof data._v1Phase === "string" ? data._v1Phase : (typeof data.phase === "string" ? data.phase : undefined);
    const iteration = typeof data._v1Iteration === "number" ? data._v1Iteration : (typeof data.iteration === "number" ? data.iteration : undefined);

    let actor: NormalizedEvent["actor"] = "unknown";
    let toolName: string | undefined;
    let args: Record<string, unknown> | undefined;
    let toolResult: unknown;
    let isError: boolean | undefined;
    let hasThinking = false;
    let thinkingContent: string | undefined;
    let hasText = false;
    let textContent: string | undefined;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let cacheReadTokens: number | undefined;
    let cacheWriteTokens: number | undefined;
    let totalTokens: number | undefined;
    let costUsd: number | undefined;
    let costBreakdown: NormalizedEvent["costBreakdown"];

    if (source === "system" || source === "harness") {
      actor = "system";
    }

    // Inspect Pi message structures
    const message = data.message || raw.message;
    if (message && typeof message === "object") {
      if (message.role === "user") {
        actor = "user";
        hasText = true;
        if (Array.isArray(message.content)) {
          const texts = message.content.filter((c: any) => c.type === "text").map((c: any) => c.text);
          if (texts.length > 0) textContent = texts.join("\n");
        }
      } else if (message.role === "assistant") {
        actor = "assistant";
        if (Array.isArray(message.content)) {
          for (const item of message.content) {
            if (item.type === "thinking" && typeof item.thinking === "string") {
              hasThinking = true;
              thinkingContent = (thinkingContent ? thinkingContent + "\n" : "") + item.thinking;
            } else if (item.type === "text" && typeof item.text === "string") {
              hasText = true;
              textContent = (textContent ? textContent + "\n" : "") + item.text;
            } else if (item.type === "toolCall" && typeof item.name === "string") {
              toolName = item.name;
              args = item.arguments;
            }
          }
        }
      } else if (message.role === "toolResult") {
        actor = "tool";
        toolName = message.toolName;
        toolResult = message.content;
        isError = message.isError;
      }

      // Usage & cost attached to message
      if (message.usage && typeof message.usage === "object") {
        if (typeof message.usage.input === "number") inputTokens = message.usage.input;
        if (typeof message.usage.output === "number") outputTokens = message.usage.output;
        if (typeof message.usage.cacheRead === "number") cacheReadTokens = message.usage.cacheRead;
        if (typeof message.usage.cacheWrite === "number") cacheWriteTokens = message.usage.cacheWrite;
        if (typeof message.usage.totalTokens === "number") totalTokens = message.usage.totalTokens;

        if (message.usage.cost && typeof message.usage.cost === "object") {
          const c = message.usage.cost;
          if (typeof c.total === "number") costUsd = c.total;
          costBreakdown = {
            input: typeof c.input === "number" ? c.input : 0,
            output: typeof c.output === "number" ? c.output : 0,
            cacheRead: typeof c.cacheRead === "number" ? c.cacheRead : 0,
            cacheWrite: typeof c.cacheWrite === "number" ? c.cacheWrite : 0,
            total: typeof c.total === "number" ? c.total : 0,
          };
        }
      }
    }

    // Inspect tool execution start/end events
    if (type === "tool_execution_start") {
      actor = "tool";
      toolName = typeof data.toolName === "string" ? data.toolName : (typeof raw.toolName === "string" ? raw.toolName : undefined);
      args = data.args || raw.args;
    } else if (type === "tool_execution_end") {
      actor = "tool";
      toolName = typeof data.toolName === "string" ? data.toolName : (typeof raw.toolName === "string" ? raw.toolName : undefined);
      toolResult = data.result || raw.result;
      isError = typeof data.isError === "boolean" ? data.isError : (typeof raw.isError === "boolean" ? raw.isError : undefined);
    }

    return {
      index,
      timestamp,
      seq,
      source,
      type,
      actor,
      toolName,
      args,
      toolResult,
      isError,
      hasThinking,
      thinkingContent,
      hasText,
      textContent,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      totalTokens,
      costUsd,
      costBreakdown,
      phase,
      iteration,
      rawType: type,
    };
  }
}
