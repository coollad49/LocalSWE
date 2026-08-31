import type {
  TrajectoryMetrics,
  TrajectoryDataset,
  TrajectoryDatasetEntry,
  VerdictGroupStats,
} from "./types.ts";

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export class TrajectoryDatasetAggregator {
  /**
   * Build a unified TrajectoryDataset across multiple evaluated runs.
   */
  static buildDataset(params: {
    benchmarkVersion: string;
    benchmarkFingerprint: string;
    runs: Array<{
      metrics: TrajectoryMetrics;
      verdict?: string;
      metricsPath?: string;
      evidencePath?: string;
    }>;
  }): TrajectoryDataset {
    const { benchmarkVersion, benchmarkFingerprint, runs } = params;

    const datasetEntries: TrajectoryDatasetEntry[] = [];
    const verdictBuckets = new Map<string, Array<{ metrics: TrajectoryMetrics; verdict?: string }>>();
    const agentBuckets = new Map<string, Array<{ metrics: TrajectoryMetrics; verdict?: string }>>();

    for (const item of runs) {
      const m = item.metrics;
      const v = item.verdict || "unknown";

      const entry: TrajectoryDatasetEntry = {
        runId: m.runId,
        caseId: m.caseId,
        agentVersion: m.agentVersion,
        verdict: v,
        durationMs: m.trajectory.durationMs,
        toolCalls: m.tools.totalCalls,
        thinkingCharacters: m.thinking.characterCount,
        testRuns: m.verification.testCommandCount,
        editCalls: m.editing.editCalls + m.editing.writeCalls,
        filesTouched: m.editing.filesTouched,
        tokens: {
          input: m.tokens.input,
          output: m.tokens.output,
          total: m.tokens.total,
          observed: m.tokens.observed,
        },
        costUsd: m.cost.costUsd,
        trajectoryHash: m.trajectoryHash,
        trajectoryMetricsPath: item.metricsPath || `experiments/runs/${m.runId}/trajectory-metrics.json`,
        trajectoryEvidencePath: item.evidencePath || `experiments/runs/${m.runId}/trajectory-evidence.json`,
      };

      datasetEntries.push(entry);

      if (!verdictBuckets.has(v)) verdictBuckets.set(v, []);
      verdictBuckets.get(v)!.push(item);

      if (!agentBuckets.has(m.agentVersion)) agentBuckets.set(m.agentVersion, []);
      agentBuckets.get(m.agentVersion)!.push(item);
    }

    const byVerdict: Record<string, VerdictGroupStats> = {};
    for (const [verdict, group] of verdictBuckets.entries()) {
      const durations = group.map((g) => g.metrics.trajectory.durationMs);
      const toolCalls = group.map((g) => g.metrics.tools.totalCalls);
      const thinkingChars = group.map((g) => g.metrics.thinking.characterCount);
      const editCalls = group.map((g) => g.metrics.editing.editCalls + g.metrics.editing.writeCalls);
      const testRuns = group.map((g) => g.metrics.verification.testCommandCount);
      const tokenList = group.map((g) => g.metrics.tokens.total).filter((t): t is number => typeof t === "number");
      const costList = group.map((g) => g.metrics.cost.costUsd).filter((c): c is number => typeof c === "number");

      byVerdict[verdict] = {
        count: group.length,
        avgDurationMs: Math.round(mean(durations)),
        medianDurationMs: Math.round(median(durations)),
        avgToolCalls: Number(mean(toolCalls).toFixed(1)),
        medianToolCalls: Math.round(median(toolCalls)),
        avgThinkingCharacters: Math.round(mean(thinkingChars)),
        avgEditCalls: Number(mean(editCalls).toFixed(1)),
        avgTestRuns: Number(mean(testRuns).toFixed(1)),
        avgTokens: tokenList.length > 0 ? Math.round(mean(tokenList)) : null,
        avgCostUsd: costList.length > 0 ? Number(mean(costList).toFixed(6)) : null,
      };
    }

    const byAgent: TrajectoryDataset["byAgent"] = {};
    for (const [agent, group] of agentBuckets.entries()) {
      const durations = group.map((g) => g.metrics.trajectory.durationMs);
      const toolCalls = group.map((g) => g.metrics.tools.totalCalls);
      const thinkingChars = group.map((g) => g.metrics.thinking.characterCount);
      const editCalls = group.map((g) => g.metrics.editing.editCalls + g.metrics.editing.writeCalls);
      const testRuns = group.map((g) => g.metrics.verification.testCommandCount);
      const costList = group.map((g) => g.metrics.cost.costUsd).filter((c): c is number => typeof c === "number");

      byAgent[agent] = {
        totalRuns: group.length,
        avgDurationMs: Math.round(mean(durations)),
        avgToolCalls: Number(mean(toolCalls).toFixed(1)),
        avgThinkingCharacters: Math.round(mean(thinkingChars)),
        avgEditCalls: Number(mean(editCalls).toFixed(1)),
        avgTestRuns: Number(mean(testRuns).toFixed(1)),
        avgCostUsd: costList.length > 0 ? Number(mean(costList).toFixed(6)) : null,
      };
    }

    return {
      schemaVersion: "1.0",
      analyticsVersion: "0.1",
      benchmark: {
        version: benchmarkVersion,
        fingerprint: benchmarkFingerprint,
      },
      generatedAt: new Date().toISOString(),
      runs: datasetEntries,
      byVerdict,
      byAgent,
    };
  }
}
