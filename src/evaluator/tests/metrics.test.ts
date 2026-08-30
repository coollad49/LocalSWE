import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { median, average, extractRunMetrics } from "../metrics.ts";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

describe("median/average", () => {
  test("median odd", () => expect(median([3, 1, 2])).toBe(2));
  test("median even", () => expect(median([1, 2, 3, 4])).toBe(2.5));
  test("median empty null", () => expect(median([])).toBe(null));
  test("average", () => expect(average([1, 2, 3])).toBe(2));
  test("average empty null", () => expect(average([])).toBe(null));
  test("median single", () => expect(median([5])).toBe(5));
  test("average single", () => expect(average([7])).toBe(7));
});

describe("extractRunMetrics V1 precedence", () => {
  let tmpRoot: string;
  beforeEach(() => {
    tmpRoot = join(tmpdir(), `metrics-test-${randomUUID().slice(0, 6)}`);
    mkdirSync(tmpRoot, { recursive: true });
  });
  afterEach(() => {
    try {
      rmSync(tmpRoot, { recursive: true, force: true });
    } catch {}
  });

  test("V1 with v1-state.json iterationCount takes precedence", async () => {
    const runId = "hist-001-abc123";
    const runDir = join(tmpRoot, runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(
      join(runDir, "metadata.json"),
      JSON.stringify({
        runId,
        caseId: "hist-001",
        agentVersion: "agent-v1",
        model: "opencode-go/muse-spark-1.2-contributor",
        durationMs: 5000,
        changedFiles: ["src/a.ts"],
        tokenUsage: { inputTokens: 1000, outputTokens: 2000 },
      }),
    );
    writeFileSync(join(runDir, "v1-state.json"), JSON.stringify({ iterationCount: 3 }));
    writeFileSync(join(runDir, "trajectory.jsonl"), `{"type":"tool_execution_start","data":{"toolName":"bash","args":{"command":"ls"}}}\n`);
    const { metrics } = await extractRunMetrics({ runId, runsDir: tmpRoot, agentVersion: "agent-v1" });
    expect(metrics.iterations).toBe(3);
    expect(metrics.iterationsSource).toBe("v1-state");
    expect(metrics.inputTokens).toBe(1000);
    expect(metrics.outputTokens).toBe(2000);
  });

  test("V1 with metadata.v1.iterationCount", async () => {
    const runId = "hist-002-def456";
    const runDir = join(tmpRoot, runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(
      join(runDir, "metadata.json"),
      JSON.stringify({
        runId,
        caseId: "hist-002",
        agentVersion: "agent-v1",
        durationMs: 1234,
        changedFiles: [],
        v1: { iterationCount: 5 },
      }),
    );
    writeFileSync(join(runDir, "trajectory.jsonl"), ``);
    const { metrics } = await extractRunMetrics({ runId, runsDir: tmpRoot });
    expect(metrics.iterations).toBe(5);
    expect(metrics.iterationsSource).toBe("metadata");
  });

  test("V0 falls back to 1 iteration", async () => {
    const runId = "synth-001-baseline";
    const runDir = join(tmpRoot, runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(
      join(runDir, "metadata.json"),
      JSON.stringify({
        runId,
        caseId: "synth-001",
        agentVersion: "baseline-v0",
        durationMs: 1000,
        changedFiles: [],
      }),
    );
    writeFileSync(join(runDir, "trajectory.jsonl"), `{"type":"tool_execution_start","data":{"toolName":"bash","args":{"command":"vitest"}}}\n`);
    const { metrics } = await extractRunMetrics({ runId, runsDir: tmpRoot });
    expect(metrics.iterations).toBe(1);
    expect(metrics.iterationsSource).toBe("fallback");
  });

  test("cost unavailable when tokens null even with pricing", async () => {
    const runId = "synth-002-nocost";
    const runDir = join(tmpRoot, runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(
      join(runDir, "metadata.json"),
      JSON.stringify({
        runId,
        caseId: "synth-002",
        agentVersion: "baseline-v0",
        durationMs: 800,
        changedFiles: [],
      }),
    );
    writeFileSync(join(runDir, "trajectory.jsonl"), ``);
    const { metrics, cost } = await extractRunMetrics({ runId, runsDir: tmpRoot });
    expect(metrics.inputTokens).toBe(null);
    expect(cost.costUsd).toBe(null);
    expect(cost.costStatus).toBe("unavailable");
  });

  test("duration, toolCalls, filesInspected extracted from trajectory", async () => {
    const runId = "synth-003-trajectory";
    const runDir = join(tmpRoot, runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(
      join(runDir, "metadata.json"),
      JSON.stringify({ runId, caseId: "synth-003", agentVersion: "baseline-v0", durationMs: 2000, changedFiles: ["src/x.ts", "src/y.ts"] }),
    );
    writeFileSync(
      join(runDir, "trajectory.jsonl"),
      [
        `{"type":"tool_execution_start","data":{"toolName":"read","args":{"path":"src/x.ts"}}}`,
        `{"type":"tool_execution_start","data":{"toolName":"bash","args":{"command":"ls"}}}`,
        `{"type":"tool_execution_start","data":{"toolName":"bash","args":{"command":"vitest run"}}}`,
        `{"type":"tool_execution_start","data":{"toolName":"edit","args":{"path":"src/x.ts"}}}`,
        `{"type":"message_start","data":{}}`,
      ].join("\n"),
    );
    const { metrics } = await extractRunMetrics({ runId, runsDir: tmpRoot });
    expect(metrics.toolCalls).toBe(4);
    expect(metrics.commandsExecuted).toBe(2);
    expect(metrics.filesInspected).toBe(1); // distinct read paths: src/x.ts counted once? edit also adds but set dedupes
    expect(metrics.filesChanged).toBe(2);
  });
});
