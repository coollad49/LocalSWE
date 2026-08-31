import { createHash } from "node:crypto";
import type {
  NormalizedEvent,
  TrajectoryMetrics,
  TrajectoryEvidence,
  EvidenceTimelineEvent,
  MilestoneMarker,
  ToolRepetition,
} from "./types.ts";
import type { ParsedTrajectory } from "./parser.ts";

const TEST_COMMAND_RE = /\b(vitest|jest|mocha|pytest|npm\s+test|bun\s+test|yarn\s+test|pnpm\s+test|tsx?\s+.*test|node\s+.*test)\b/i;
const BUILD_COMMAND_RE = /\b(npm\s+run\s+build|tsc|bun\s+run\s+build|vite\s+build)\b/i;
const TYPECHECK_COMMAND_RE = /\b(tsc|typecheck|check-types)\b/i;
const REPRO_COMMAND_RE = /\b(repro|reproduce|\.v1\/repro|test-.*\.ts|scratch)\b/i;

export class TrajectoryExtractor {
  /**
   * Normalize and sanitize filesystem paths to prevent leaking absolute machine paths.
   */
  static normalizePath(rawPath?: string): string | undefined {
    if (!rawPath) return undefined;
    let p = rawPath.replace(/\\/g, "/");

    // Strip temp prefixes like C:/Users/.../AppData/Local/Temp/frontier-.../ or /tmp/frontier-.../
    const tempMatch = p.match(/^(?:[a-zA-Z]:)?(?:\/.*?)?\/(?:Temp|tmp)\/[^/]+(?:\/)?(.*)/i) || p.match(/^\/tmp\/[^/]+(?:\/)?(.*)/i);
    if (tempMatch && tempMatch[1]) {
      p = tempMatch[1];
    } else {
      // Strip typical home dir or workspace prefixes if present
      p = p.replace(/^[a-zA-Z]:\/Users\/[^/]+\//i, "").replace(/^\/home\/[^/]+\//i, "");
    }

    return p || rawPath;
  }

  /**
   * Extract quantitative metrics from a parsed trajectory.
   */
  static extractMetrics(parsed: ParsedTrajectory, runContext: {
    runId: string;
    caseId: string;
    agentVersion: string;
    benchmarkVersion: string;
    model?: string;
    timedOut?: boolean;
    terminationReason?: string;
  }): TrajectoryMetrics {
    const { events, parseErrors, trajectoryHash } = parsed;

    const hasToolExecStarts = events.some((e) => e.type === "tool_execution_start");

    const eventTypes: Record<string, number> = {};
    let assistantMessages = 0;
    let userMessages = 0;
    let toolCalls = 0;
    let toolResults = 0;
    let thinkingEvents = 0;
    let unknownEvents = 0;

    const toolStats: Record<string, { calls: number; failures: number }> = {};
    const toolSignatures = new Map<string, { signature: string; tool: string; target?: string; count: number }>();
    const readTargets = new Map<string, number>();
    const editTargets = new Map<string, number>();
    const filesTouchedSet = new Set<string>();

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheRead = 0;
    let totalCacheWrite = 0;
    let totalTokensObserved = false;

    let totalCostUsd = 0;
    let inputCostUsd = 0;
    let outputCostUsd = 0;
    let costObserved = false;

    let thinkingCharacters = 0;
    let maxThinkingCharacters = 0;
    let firstThinkingAt: string | undefined;
    let lastThinkingAt: string | undefined;

    let editCalls = 0;
    let writeCalls = 0;
    let readCalls = 0;
    let grepCalls = 0;
    let findCalls = 0;
    let lsCalls = 0;
    let bashCalls = 0;

    let testsRun = false;
    let testCommandCount = 0;
    let buildRun = false;
    let typecheckRun = false;
    let reproductionDetected = false;
    const verificationCommands: Array<{ command: string; exitCode?: number; durationMs?: number }> = [];

    let firstTimestamp: number | undefined;
    let lastTimestamp: number | undefined;

    let lastBashCommand = "";
    for (const ev of events) {
      eventTypes[ev.type] = (eventTypes[ev.type] || 0) + 1;

      if (ev.timestamp) {
        const ms = Date.parse(ev.timestamp);
        if (!Number.isNaN(ms)) {
          if (firstTimestamp === undefined || ms < firstTimestamp) firstTimestamp = ms;
          if (lastTimestamp === undefined || ms > lastTimestamp) lastTimestamp = ms;
        }
      }

      if (ev.actor === "assistant") assistantMessages++;
      else if (ev.actor === "user") userMessages++;
      else if (ev.actor === "unknown") unknownEvents++;

      // Tokens & Cost
      if (typeof ev.totalTokens === "number" && ev.totalTokens > 0) {
        totalTokensObserved = true;
        totalInputTokens += ev.inputTokens || 0;
        totalOutputTokens += ev.outputTokens || 0;
        totalCacheRead += ev.cacheReadTokens || 0;
        totalCacheWrite += ev.cacheWriteTokens || 0;
      }
      if (typeof ev.costUsd === "number" && ev.costUsd > 0) {
        costObserved = true;
        totalCostUsd += ev.costUsd;
        if (ev.costBreakdown) {
          inputCostUsd += ev.costBreakdown.input || 0;
          outputCostUsd += ev.costBreakdown.output || 0;
        }
      }

      // Thinking
      if (ev.hasThinking && ev.thinkingContent) {
        thinkingEvents++;
        const len = ev.thinkingContent.length;
        thinkingCharacters += len;
        if (len > maxThinkingCharacters) maxThinkingCharacters = len;
        if (!firstThinkingAt && ev.timestamp) firstThinkingAt = ev.timestamp;
        if (ev.timestamp) lastThinkingAt = ev.timestamp;
      }

      // Tool Invocations (count from tool_execution_start if present, or assistant toolCall if standalone)
      const isToolInvocation = hasToolExecStarts ? (ev.type === "tool_execution_start") : (ev.actor === "assistant" && !!ev.toolName);
      if (isToolInvocation) {
        const tool = ev.toolName || "unknown";
        toolCalls++;
        if (!toolStats[tool]) toolStats[tool] = { calls: 0, failures: 0 };
        toolStats[tool].calls++;

        let target: string | undefined;
        if (ev.args) {
          target = (ev.args.path as string) || (ev.args.file as string) || (ev.args.command as string) || (ev.args.pattern as string);
        }
        const normTarget = this.normalizePath(target);

        // Track specific tool types
        if (tool === "read") {
          readCalls++;
          if (normTarget) readTargets.set(normTarget, (readTargets.get(normTarget) || 0) + 1);
        } else if (tool === "grep") grepCalls++;
        else if (tool === "find") findCalls++;
        else if (tool === "ls") lsCalls++;
        else if (tool === "edit") {
          editCalls++;
          if (normTarget) {
            filesTouchedSet.add(normTarget);
            editTargets.set(normTarget, (editTargets.get(normTarget) || 0) + 1);
          }
        } else if (tool === "write") {
          writeCalls++;
          if (normTarget) {
            filesTouchedSet.add(normTarget);
            editTargets.set(normTarget, (editTargets.get(normTarget) || 0) + 1);
          }
        } else if (tool === "bash") {
          bashCalls++;
          const cmd = (ev.args?.command as string) || "";
          lastBashCommand = cmd;
          if (TEST_COMMAND_RE.test(cmd)) {
            testsRun = true;
            testCommandCount++;
          }
          if (BUILD_COMMAND_RE.test(cmd)) buildRun = true;
          if (TYPECHECK_COMMAND_RE.test(cmd)) typecheckRun = true;
          if (REPRO_COMMAND_RE.test(cmd)) reproductionDetected = true;
        }

        // Repetition signature
        const sigData = `${tool}:${normTarget || JSON.stringify(ev.args || {})}`;
        const sigHash = createHash("sha256").update(sigData).digest("hex").slice(0, 12);
        const existingSig = toolSignatures.get(sigHash);
        if (existingSig) {
          existingSig.count++;
        } else {
          toolSignatures.set(sigHash, { signature: sigHash, tool, target: normTarget, count: 1 });
        }
      }

      // Tool Results & Failures
      if (ev.type === "tool_execution_end" || ev.actor === "tool") {
        toolResults++;
        const tool = ev.toolName || "unknown";
        if (!toolStats[tool]) toolStats[tool] = { calls: 0, failures: 0 };

        let exitCode: number | undefined;
        let isFail = ev.isError === true;
        if (ev.toolResult && typeof ev.toolResult === "object") {
          const tr = ev.toolResult as Record<string, unknown>;
          if (typeof tr.exitCode === "number") exitCode = tr.exitCode;
          else if (typeof tr.code === "number") exitCode = tr.code;
        }
        if (exitCode !== undefined && exitCode !== 0) isFail = true;

        if (isFail) {
          toolStats[tool].failures++;
        }

        // Track test execution outcomes
        const cmd = (ev.args?.command as string) || lastBashCommand;
        if (tool === "bash" && cmd) {
          if (TEST_COMMAND_RE.test(cmd) || REPRO_COMMAND_RE.test(cmd)) {
            verificationCommands.push({
              command: cmd.slice(0, 200),
              exitCode: exitCode ?? (isFail ? 1 : 0),
            });
          }
        }
      }
    }

    // Repetitions calculations
    let repeatedToolCalls = 0;
    let duplicateReadTargets = 0;
    let duplicateEditTargets = 0;
    let toolFailureCount = 0;

    const repetitions: ToolRepetition[] = [];
    for (const item of toolSignatures.values()) {
      if (item.count > 1) {
        repeatedToolCalls += (item.count - 1);
        repetitions.push(item);
      }
    }
    repetitions.sort((a, b) => b.count - a.count);

    for (const count of readTargets.values()) {
      if (count > 1) duplicateReadTargets += (count - 1);
    }
    for (const count of editTargets.values()) {
      if (count > 1) duplicateEditTargets += (count - 1);
    }
    for (const stat of Object.values(toolStats)) {
      toolFailureCount += stat.failures;
    }

    const durationMs = (firstTimestamp && lastTimestamp && lastTimestamp >= firstTimestamp)
      ? (lastTimestamp - firstTimestamp)
      : 0;

    const thinkingDurationMs = (firstThinkingAt && lastThinkingAt)
      ? Math.max(0, Date.parse(lastThinkingAt) - Date.parse(firstThinkingAt))
      : undefined;

    const totalEdits = editCalls + writeCalls;
    const totalExploration = readCalls + grepCalls + findCalls + lsCalls + bashCalls;
    const explorationToEditingRatio = totalEdits > 0
      ? Number((totalExploration / totalEdits).toFixed(2))
      : null;

    return {
      schemaVersion: "1.0",
      analyticsVersion: "0.1",
      runId: runContext.runId,
      caseId: runContext.caseId,
      agentVersion: runContext.agentVersion,
      benchmarkVersion: runContext.benchmarkVersion,
      model: runContext.model || parsed.meta.model,
      trajectoryHash,

      trajectory: {
        eventCount: events.length,
        durationMs,
        eventTypes,
        assistantMessages,
        userMessages,
        toolCalls,
        toolResults,
        thinkingEvents,
        unknownEvents,
        parseErrors,
      },

      tools: {
        totalCalls: toolCalls,
        uniqueTools: Object.keys(toolStats).length,
        byTool: toolStats,
      },

      tokens: {
        input: totalTokensObserved ? totalInputTokens : null,
        output: totalTokensObserved ? totalOutputTokens : null,
        cacheRead: totalTokensObserved ? totalCacheRead : null,
        cacheWrite: totalTokensObserved ? totalCacheWrite : null,
        total: totalTokensObserved ? (totalInputTokens + totalOutputTokens + totalCacheRead) : null,
        observed: totalTokensObserved,
      },

      cost: {
        costUsd: costObserved ? Number(totalCostUsd.toFixed(6)) : null,
        inputCostUsd: costObserved ? Number(inputCostUsd.toFixed(6)) : null,
        outputCostUsd: costObserved ? Number(outputCostUsd.toFixed(6)) : null,
        costStatus: costObserved ? "provider" : "unavailable",
        costSource: costObserved ? "provider" : "none",
      },

      thinking: {
        eventCount: thinkingEvents,
        characterCount: thinkingCharacters,
        averageCharacters: thinkingEvents > 0 ? Math.round(thinkingCharacters / thinkingEvents) : 0,
        maxCharacters: maxThinkingCharacters,
        firstThinkingAt,
        lastThinkingAt,
        thinkingDurationMs,
      },

      editing: {
        editCalls,
        writeCalls,
        filesTouched: Array.from(filesTouchedSet),
        uniqueFilesTouched: filesTouchedSet.size,
      },

      exploration: {
        readCalls,
        grepCalls,
        findCalls,
        lsCalls,
        bashCalls,
        explorationToEditingRatio,
      },

      verification: {
        commandsDetected: verificationCommands.length,
        testsRun,
        testCommandCount,
        buildRun,
        typecheckRun,
        reproductionDetected,
        commands: verificationCommands,
      },

      behavior: {
        repeatedToolCalls,
        duplicateReadTargets,
        duplicateEditTargets,
        toolFailureCount,
        topRepetitions: repetitions.slice(0, 10),
      },

      termination: {
        reason: runContext.terminationReason || parsed.meta.terminationReason || "completed",
        timedOut: runContext.timedOut === true,
      },
    };
  }

  /**
   * Extract qualitative milestone timeline and evidence log from parsed events.
   */
  static extractEvidence(parsed: ParsedTrajectory, runContext: {
    runId: string;
    caseId: string;
    agentVersion: string;
  }): TrajectoryEvidence {
    const { events } = parsed;
    const timeline: EvidenceTimelineEvent[] = [];
    const milestones: MilestoneMarker[] = [];
    const errors: Array<{ index: number; tool?: string; error: string }> = [];
    const verificationEvents: Array<{ index: number; command: string; exitCode?: number; outputSnippet?: string }> = [];

    let seenFirstRead = false;
    let seenFirstRepro = false;
    let seenFirstEdit = false;
    let seenFirstTest = false;

    const hasToolExecStarts = events.some((e) => e.type === "tool_execution_start");
    let lastBashCommand = "";
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (!ev) continue;

      const isToolInvocation = hasToolExecStarts ? (ev.type === "tool_execution_start") : (ev.actor === "assistant" && !!ev.toolName);
      if (isToolInvocation) {
        const tool = ev.toolName || "tool";
        let target: string | undefined;
        if (ev.args) {
          target = (ev.args.path as string) || (ev.args.file as string) || (ev.args.command as string) || (ev.args.pattern as string);
        }
        const normTarget = this.normalizePath(target);

        let eventType: EvidenceTimelineEvent["event"] = "other";
        let commandClass: EvidenceTimelineEvent["commandClass"];

        if (tool === "read") {
          eventType = "read";
          if (!seenFirstRead && normTarget) {
            seenFirstRead = true;
            milestones.push({ type: "first_read", eventIndex: ev.index, timestamp: ev.timestamp, detail: normTarget });
          }
        } else if (tool === "edit") {
          eventType = "edit";
          if (!seenFirstEdit && normTarget) {
            seenFirstEdit = true;
            milestones.push({ type: "first_edit", eventIndex: ev.index, timestamp: ev.timestamp, detail: normTarget });
          }
        } else if (tool === "write") {
          eventType = "write";
          if (!seenFirstEdit && normTarget) {
            seenFirstEdit = true;
            milestones.push({ type: "first_edit", eventIndex: ev.index, timestamp: ev.timestamp, detail: normTarget });
          }
        } else if (tool === "grep") eventType = "grep";
        else if (tool === "find") eventType = "find";
        else if (tool === "ls") eventType = "ls";
        else if (tool === "bash") {
          eventType = "bash";
          const cmd = (ev.args?.command as string) || "";
          lastBashCommand = cmd;
          if (TEST_COMMAND_RE.test(cmd)) {
            eventType = "test";
            commandClass = "test";
            if (!seenFirstTest) {
              seenFirstTest = true;
              milestones.push({ type: "first_test", eventIndex: ev.index, timestamp: ev.timestamp, detail: cmd.slice(0, 100) });
            }
          } else if (REPRO_COMMAND_RE.test(cmd)) {
            commandClass = "test";
            if (!seenFirstRepro) {
              seenFirstRepro = true;
              milestones.push({ type: "first_repro", eventIndex: ev.index, timestamp: ev.timestamp, detail: cmd.slice(0, 100) });
            }
          } else if (BUILD_COMMAND_RE.test(cmd)) commandClass = "build";
          else if (TYPECHECK_COMMAND_RE.test(cmd)) commandClass = "typecheck";
          else if (/\bgit\b/.test(cmd)) commandClass = "git";
          else commandClass = "general";
        }

        timeline.push({
          index: ev.index,
          timestamp: ev.timestamp,
          phase: ev.phase,
          iteration: ev.iteration,
          event: eventType,
          tool,
          target: normTarget?.slice(0, 150),
          commandClass,
        });
      }

      if (ev.type === "tool_execution_end" || ev.actor === "tool") {
        let isError = ev.isError === true;
        let exitCode: number | undefined;
        let snippet: string | undefined;

        if (ev.toolResult && typeof ev.toolResult === "object") {
          const tr = ev.toolResult as Record<string, unknown>;
          if (typeof tr.exitCode === "number") exitCode = tr.exitCode;
          if (exitCode !== undefined && exitCode !== 0) isError = true;
          if (Array.isArray(tr.content) && tr.content[0]?.text) {
            snippet = String(tr.content[0].text).slice(0, 500);
          }
        }

        if (isError) {
          errors.push({
            index: ev.index,
            tool: ev.toolName,
            error: snippet || `Tool failed with exitCode ${exitCode ?? 1}`,
          });
        }

        const cmd = (ev.args?.command as string) || lastBashCommand;
        const tool = ev.toolName || (cmd ? "bash" : "tool");
        if (tool === "bash" && cmd) {
          if (TEST_COMMAND_RE.test(cmd) || REPRO_COMMAND_RE.test(cmd)) {
            verificationEvents.push({
              index: ev.index,
              command: cmd.slice(0, 200),
              exitCode: exitCode ?? (isError ? 1 : 0),
              outputSnippet: snippet?.slice(0, 200),
            });
            if (exitCode === 0 && !isError) {
              milestones.push({ type: "verification_pass", eventIndex: ev.index, timestamp: ev.timestamp, detail: cmd.slice(0, 100) });
            } else if (isError || (exitCode !== undefined && exitCode !== 0)) {
              milestones.push({ type: "verification_fail", eventIndex: ev.index, timestamp: ev.timestamp, detail: cmd.slice(0, 100) });
            }
          }
        }
      }

      if (ev.type === "phase_transition") {
        const toPhase = ev.phase;
        if (toPhase) {
          milestones.push({ type: "phase_transition", eventIndex: ev.index, timestamp: ev.timestamp, detail: `to ${toPhase}` });
        }
      }
    }

    return {
      schemaVersion: "1.0",
      analyticsVersion: "0.1",
      runId: runContext.runId,
      caseId: runContext.caseId,
      agentVersion: runContext.agentVersion,
      timeline: timeline.slice(0, 250), // Cap timeline to 250 meaningful events
      milestones,
      errors: errors.slice(0, 50),
      repetitions: [],
      verificationEvents,
    };
  }
}
