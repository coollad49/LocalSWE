/**
 * Baseline v0 — Stable run result types.
 * Decoupled from Pi SDK types to allow runtime replacement.
 */

export type RepairStatus = "success" | "failure" | "error" | "timeout";

export interface TestRecord {
  command: string;
  exitCode: number;
  durationMs: number;
  stdout?: string;
  stderr?: string;
}

export interface RepairTask {
  runId: string;
  caseId: string;
  workspacePath: string;
  /** Full issue text from benchmark/cases/<id>/issue.md */
  issue: string;
  /** Path to public reproduce script inside workspace (if present) */
  reproducePath?: string;
  agentVersion: string;
  benchmarkVersion: string;
}

export interface RepairRun {
  runId: string;
  caseId: string;
  agentVersion: string;
  benchmarkVersion: string;
  status: RepairStatus;
  durationMs: number;
  changedFiles: string[];
  patchPath?: string;
  trajectoryPath?: string;
  metadataPath?: string;
  tests?: TestRecord[];
  error?: string;
  model?: string;
  thinkingLevel?: string;
  piVersion?: string;
  startedAt: string;
  endedAt: string;
}

/** Experiment metadata persisted alongside result */
export interface RunMetadata {
  runId: string;
  caseId: string;
  benchmarkVersion: string;
  agentVersion: string;
  agentRuntime: string;
  piVersion: string;
  model: string;
  modelConfiguration: {
    thinkingLevel: string;
    maxTurns?: number;
    agentTimeoutMs: number;
    commandTimeoutSec: number;
  };
  agentPromptVersion: string;
  agentPromptPath: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  terminationStatus: RepairStatus;
  changedFiles: string[];
  testCommands: string[];
  testResults?: TestRecord[];
  trajectoryPath: string;
  patchPath: string;
  resultPath: string;
  workspacePath: string;
  tokenUsage?: unknown;
  cost?: unknown;
  error?: string;
  benchmarkFingerprint?: string;
  nodeVersion: string;
  platform: string;
}

/** Trajectory event stored as JSONL */
export interface TrajectoryEvent {
  timestamp: string;
  seq: number;
  source: "agent" | "session" | "harness" | "runner" | "system";
  type: string;
  data: unknown;
}
