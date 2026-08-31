import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TrajectoryParser } from "../parser.ts";
import { TrajectoryExtractor } from "../extractor.ts";
import { TrajectoryDatasetAggregator } from "../aggregation.ts";

describe("TrajectoryParser", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `test-traj-parser-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  it("parses valid JSONL events including messages, thinking, tools, and usage", async () => {
    const jsonlPath = join(testDir, "trajectory.jsonl");
    const sampleEvents = [
      { timestamp: "2026-08-31T04:00:00.000Z", seq: 0, source: "system", type: "run_start", data: { runId: "test-run-001", caseId: "synth-001", agentVersion: "agent-v1", benchmarkVersion: "0.5", model: "mimo-v2.5" } },
      { timestamp: "2026-08-31T04:00:01.000Z", seq: 1, source: "session", type: "message_start", data: { message: { role: "user", content: [{ type: "text", text: "Fix bug in ISSUE.md" }] } } },
      { timestamp: "2026-08-31T04:00:02.000Z", seq: 2, source: "session", type: "message_end", data: { message: { role: "assistant", content: [{ type: "thinking", thinking: "I need to inspect the code." }, { type: "toolCall", id: "c1", name: "read", arguments: { path: "src/index.ts" } }], usage: { input: 100, output: 50, totalTokens: 150, cost: { total: 0.0005 } } } } },
      { timestamp: "2026-08-31T04:00:03.000Z", seq: 3, source: "session", type: "tool_execution_start", data: { toolName: "read", args: { path: "src/index.ts" } } },
      { timestamp: "2026-08-31T04:00:04.000Z", seq: 4, source: "session", type: "tool_execution_end", data: { toolName: "read", result: { content: [{ type: "text", text: "code content" }] }, isError: false } },
    ];

    await writeFile(jsonlPath, sampleEvents.map((e) => JSON.stringify(e)).join("\n"), "utf-8");

    const parsed = await TrajectoryParser.parseFile(jsonlPath);
    expect(parsed.parseErrors).toBe(0);
    expect(parsed.events.length).toBe(5);
    expect(parsed.trajectoryHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(parsed.meta.runId).toBe("test-run-001");
    expect(parsed.meta.caseId).toBe("synth-001");
    expect(parsed.meta.model).toBe("mimo-v2.5");

    const assistantMsg = parsed.events.find((e) => e.actor === "assistant");
    expect(assistantMsg?.hasThinking).toBe(true);
    expect(assistantMsg?.thinkingContent).toBe("I need to inspect the code.");
    expect(assistantMsg?.totalTokens).toBe(150);
    expect(assistantMsg?.costUsd).toBe(0.0005);
  });

  it("tolerates malformed JSON lines without crashing", async () => {
    const jsonlPath = join(testDir, "trajectory.jsonl");
    const content = `{"seq":0,"type":"run_start","data":{"runId":"test"}}\nNOT_A_JSON_LINE\n{"seq":1,"type":"tool_execution_start","data":{"toolName":"read"}}\n`;
    await writeFile(jsonlPath, content, "utf-8");

    const parsed = await TrajectoryParser.parseFile(jsonlPath);
    expect(parsed.parseErrors).toBe(1);
    expect(parsed.events.length).toBe(2);
  });

  it("handles missing trajectory gracefully", async () => {
    const parsed = await TrajectoryParser.parseFile(join(testDir, "non-existent.jsonl"));
    expect(parsed.events.length).toBe(0);
    expect(parsed.parseErrors).toBe(0);
  });
});

describe("TrajectoryExtractor", () => {
  it("normalizes and sanitizes file paths to avoid machine path leakage", () => {
    expect(TrajectoryExtractor.normalizePath("C:\\Users\\cooll\\AppData\\Local\\Temp\\frontier-hard-001-12345\\src\\index.ts")).toBe("src/index.ts");
    expect(TrajectoryExtractor.normalizePath("/tmp/frontier-hist-001-abc/lib/parser.js")).toBe("lib/parser.js");
    expect(TrajectoryExtractor.normalizePath("src/task-manager.ts")).toBe("src/task-manager.ts");
  });

  it("extracts comprehensive quantitative metrics and qualitative timeline", () => {
    const parsed = {
      events: [
        TrajectoryParser.normalizeRawEvent({ timestamp: "2026-08-31T04:00:00.000Z", source: "session", type: "message_end", data: { message: { role: "assistant", content: [{ type: "thinking", thinking: "Step 1" }, { type: "toolCall", name: "read", arguments: { path: "src/a.ts" } }], usage: { input: 1000, output: 200, totalTokens: 1200, cost: { total: 0.002 } } } } }, 1),
        TrajectoryParser.normalizeRawEvent({ timestamp: "2026-08-31T04:00:01.000Z", source: "session", type: "tool_execution_start", data: { toolName: "read", args: { path: "src/a.ts" } } }, 2),
        TrajectoryParser.normalizeRawEvent({ timestamp: "2026-08-31T04:00:02.000Z", source: "session", type: "tool_execution_end", data: { toolName: "read", result: { content: [{ text: "ok" }] }, isError: false } }, 3),
        TrajectoryParser.normalizeRawEvent({ timestamp: "2026-08-31T04:00:03.000Z", source: "session", type: "tool_execution_start", data: { toolName: "read", args: { path: "src/a.ts" } } }, 4), // duplicate read
        TrajectoryParser.normalizeRawEvent({ timestamp: "2026-08-31T04:00:04.000Z", source: "session", type: "tool_execution_end", data: { toolName: "read", result: { content: [{ text: "ok" }] }, isError: false } }, 5),
        TrajectoryParser.normalizeRawEvent({ timestamp: "2026-08-31T04:00:05.000Z", source: "session", type: "tool_execution_start", data: { toolName: "edit", args: { path: "src/a.ts" } } }, 6),
        TrajectoryParser.normalizeRawEvent({ timestamp: "2026-08-31T04:00:06.000Z", source: "session", type: "tool_execution_end", data: { toolName: "edit", result: { content: [{ text: "edited" }] }, isError: false } }, 7),
        TrajectoryParser.normalizeRawEvent({ timestamp: "2026-08-31T04:00:07.000Z", source: "session", type: "tool_execution_start", data: { toolName: "bash", args: { command: "vitest run" } } }, 8),
        TrajectoryParser.normalizeRawEvent({ timestamp: "2026-08-31T04:00:08.000Z", source: "session", type: "tool_execution_end", data: { toolName: "bash", result: { exitCode: 0, content: [{ text: "1 passed" }] }, isError: false } }, 9),
      ],
      parseErrors: 0,
      trajectoryHash: "sha256:dummyhash123",
      meta: { runId: "r1", caseId: "c1", agentVersion: "agent-v1", benchmarkVersion: "0.5", model: "mimo" },
    };

    const metrics = TrajectoryExtractor.extractMetrics(parsed, {
      runId: "r1",
      caseId: "c1",
      agentVersion: "agent-v1",
      benchmarkVersion: "0.5",
    });

    expect(metrics.trajectory.eventCount).toBe(9);
    expect(metrics.tools.totalCalls).toBe(4); // 2 reads, 1 edit, 1 bash
    expect(metrics.tokens.observed).toBe(true);
    expect(metrics.tokens.total).toBe(1200);
    expect(metrics.cost.costUsd).toBe(0.002);
    expect(metrics.thinking.eventCount).toBe(1);
    expect(metrics.editing.editCalls).toBe(1);
    expect(metrics.editing.filesTouched).toContain("src/a.ts");
    expect(metrics.verification.testsRun).toBe(true);
    expect(metrics.verification.commands[0]?.command).toBe("vitest run");
    expect(metrics.behavior.duplicateReadTargets).toBe(1);

    const evidence = TrajectoryExtractor.extractEvidence(parsed, {
      runId: "r1",
      caseId: "c1",
      agentVersion: "agent-v1",
    });

    expect(evidence.milestones.some((m) => m.type === "first_read")).toBe(true);
    expect(evidence.milestones.some((m) => m.type === "first_edit")).toBe(true);
    expect(evidence.milestones.some((m) => m.type === "first_test")).toBe(true);
    expect(evidence.milestones.some((m) => m.type === "verification_pass")).toBe(true);
  });
});

describe("TrajectoryDatasetAggregator", () => {
  it("aggregates multiple runs and computes verdict-grouped statistics", () => {
    const dummyMetrics = (id: string, agent: string, dur: number, tools: number, tokens: number | null): any => ({
      schemaVersion: "1.0",
      analyticsVersion: "0.1",
      runId: id,
      caseId: "c1",
      agentVersion: agent,
      benchmarkVersion: "0.5",
      trajectoryHash: `sha256:${id}`,
      trajectory: { eventCount: 10, durationMs: dur, eventTypes: {} },
      tools: { totalCalls: tools, uniqueTools: 2, byTool: {} },
      tokens: { input: tokens ? tokens / 2 : null, output: tokens ? tokens / 2 : null, total: tokens, observed: tokens != null },
      cost: { costUsd: tokens ? 0.001 : null, costStatus: tokens ? "provider" : "unavailable" },
      thinking: { eventCount: 1, characterCount: 500, averageCharacters: 500, maxCharacters: 500 },
      editing: { editCalls: 1, writeCalls: 0, filesTouched: ["src/a.ts"], uniqueFilesTouched: 1 },
      exploration: { readCalls: 2, grepCalls: 0, findCalls: 0, lsCalls: 0, bashCalls: 1, explorationToEditingRatio: 3.0 },
      verification: { commandsDetected: 1, testsRun: true, testCommandCount: 1, buildRun: false, typecheckRun: false, reproductionDetected: false, commands: [] },
      behavior: { repeatedToolCalls: 0, duplicateReadTargets: 0, duplicateEditTargets: 0, toolFailureCount: 0, topRepetitions: [] },
      termination: { timedOut: false },
    });

    const runs = [
      { metrics: dummyMetrics("r1", "baseline-v0", 10000, 10, 1000), verdict: "verified" },
      { metrics: dummyMetrics("r2", "baseline-v0", 20000, 20, 2000), verdict: "agent_failure" },
      { metrics: dummyMetrics("r3", "agent-v1", 8000, 8, 800), verdict: "verified" },
      { metrics: dummyMetrics("r4", "agent-v1", 9000, 12, 900), verdict: "verified" },
    ];

    const dataset = TrajectoryDatasetAggregator.buildDataset({
      benchmarkVersion: "0.5",
      benchmarkFingerprint: "sha256:abc",
      runs,
    });

    expect(dataset.runs.length).toBe(4);
    expect(dataset.byVerdict["verified"]?.count).toBe(3);
    expect(dataset.byVerdict["agent_failure"]?.count).toBe(1);
    expect(dataset.byAgent["baseline-v0"]?.totalRuns).toBe(2);
    expect(dataset.byAgent["agent-v1"]?.totalRuns).toBe(2);
  });
});
