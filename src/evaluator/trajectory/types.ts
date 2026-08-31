/**
 * Trajectory Analytics Types — Deterministic Evidence & Metric Schemas
 *
 * Designed to extract granular telemetry, token economics, tool distributions,
 * reasoning character metrics, and verification activity from raw trajectory.jsonl.
 */

export interface NormalizedEvent {
  index: number;
  timestamp?: string;
  seq?: number;
  source: "system" | "harness" | "session" | "agent" | "unknown";
  type: string;
  actor: "system" | "user" | "assistant" | "tool" | "unknown";
  toolName?: string;
  args?: Record<string, unknown>;
  toolResult?: unknown;
  isError?: boolean;
  hasThinking?: boolean;
  thinkingContent?: string;
  hasText?: boolean;
  textContent?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  costBreakdown?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  phase?: string;
  iteration?: number;
  rawType?: string;
}

export interface ToolRepetition {
  signature: string;
  tool: string;
  target?: string;
  count: number;
}

export interface TrajectoryMetrics {
  schemaVersion: "1.0";
  analyticsVersion: "0.1";
  runId: string;
  caseId: string;
  agentVersion: string;
  benchmarkVersion: string;
  model?: string;
  trajectoryHash: string;

  trajectory: {
    eventCount: number;
    durationMs: number;
    eventTypes: Record<string, number>;
    assistantMessages: number;
    userMessages: number;
    toolCalls: number;
    toolResults: number;
    thinkingEvents: number;
    unknownEvents: number;
    parseErrors: number;
  };

  tools: {
    totalCalls: number;
    uniqueTools: number;
    byTool: Record<string, { calls: number; failures: number }>;
  };

  tokens: {
    input: number | null;
    output: number | null;
    cacheRead: number | null;
    cacheWrite: number | null;
    total: number | null;
    observed: boolean;
  };

  cost: {
    costUsd: number | null;
    inputCostUsd: number | null;
    outputCostUsd: number | null;
    costStatus: "computed" | "provider" | "unavailable";
    costSource: "computed" | "provider" | "none";
  };

  thinking: {
    eventCount: number;
    characterCount: number;
    averageCharacters: number;
    maxCharacters: number;
    firstThinkingAt?: string;
    lastThinkingAt?: string;
    thinkingDurationMs?: number;
  };

  editing: {
    editCalls: number;
    writeCalls: number;
    filesTouched: string[];
    uniqueFilesTouched: number;
  };

  exploration: {
    readCalls: number;
    grepCalls: number;
    findCalls: number;
    lsCalls: number;
    bashCalls: number;
    explorationToEditingRatio: number | null;
  };

  verification: {
    commandsDetected: number;
    testsRun: boolean;
    testCommandCount: number;
    buildRun: boolean;
    typecheckRun: boolean;
    reproductionDetected: boolean;
    commands: Array<{ command: string; exitCode?: number; durationMs?: number }>;
  };

  behavior: {
    repeatedToolCalls: number;
    duplicateReadTargets: number;
    duplicateEditTargets: number;
    toolFailureCount: number;
    topRepetitions: ToolRepetition[];
  };

  termination: {
    reason?: string;
    timedOut: boolean;
  };
}

export interface EvidenceTimelineEvent {
  index: number;
  timestamp?: string;
  phase?: string;
  iteration?: number;
  event: "read" | "edit" | "write" | "bash" | "ls" | "grep" | "find" | "phase_transition" | "test" | "other";
  tool?: string;
  target?: string;
  commandClass?: "test" | "build" | "typecheck" | "git" | "general";
  exitCode?: number;
  isError?: boolean;
  summary?: string;
}

export interface MilestoneMarker {
  type:
    | "first_read"
    | "first_repro"
    | "first_edit"
    | "first_test"
    | "verification_pass"
    | "verification_fail"
    | "phase_transition"
    | "final_diff";
  eventIndex: number;
  timestamp?: string;
  detail?: string;
}

export interface TrajectoryEvidence {
  schemaVersion: "1.0";
  analyticsVersion: "0.1";
  runId: string;
  caseId: string;
  agentVersion: string;
  timeline: EvidenceTimelineEvent[];
  milestones: MilestoneMarker[];
  errors: Array<{ index: number; tool?: string; error: string }>;
  repetitions: ToolRepetition[];
  verificationEvents: Array<{ index: number; command: string; exitCode?: number; outputSnippet?: string }>;
}

export interface TrajectoryDatasetEntry {
  runId: string;
  caseId: string;
  agentVersion: string;
  verdict?: string;
  durationMs: number;
  toolCalls: number;
  thinkingCharacters: number;
  testRuns: number;
  editCalls: number;
  filesTouched: string[];
  tokens: {
    input: number | null;
    output: number | null;
    total: number | null;
    observed: boolean;
  };
  costUsd: number | null;
  trajectoryHash: string;
  trajectoryMetricsPath: string;
  trajectoryEvidencePath: string;
}

export interface VerdictGroupStats {
  count: number;
  avgDurationMs: number;
  medianDurationMs: number;
  avgToolCalls: number;
  medianToolCalls: number;
  avgThinkingCharacters: number;
  avgEditCalls: number;
  avgTestRuns: number;
  avgTokens: number | null;
  avgCostUsd: number | null;
}

export interface TrajectoryDataset {
  schemaVersion: "1.0";
  analyticsVersion: "0.1";
  benchmark: {
    version: string;
    fingerprint: string;
  };
  generatedAt: string;
  runs: TrajectoryDatasetEntry[];
  byVerdict: Record<string, VerdictGroupStats>;
  byAgent: Record<string, {
    totalRuns: number;
    avgDurationMs: number;
    avgToolCalls: number;
    avgThinkingCharacters: number;
    avgEditCalls: number;
    avgTestRuns: number;
    avgCostUsd: number | null;
  }>;
}
