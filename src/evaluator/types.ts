/**
 * Evaluator Types — deterministic verification result schema.
 * Rebuilt for baseline experiment evaluation (v0.3+).
 * See docs/evaluator decision for taxonomy.
 */

export type Verdict =
  | "verified"
  | "agent_failure"
  | "false_confidence"
  | "regression_failure";

export type EvaluationStatus =
  | "completed"
  | "error"
  | "timeout";

export type StageStatus =
  | "passed"
  | "failed"
  | "error"
  | "timeout"
  | "skipped";

export interface VerificationStageResult {
  status: StageStatus;
  exitCode?: number;
  durationMs: number;
  command: string;
  stdout?: string;
  stderr?: string;
  reason?: string;
  timedOut?: boolean;
}

export interface CaseMeta {
  type?: "historical" | "synthetic";
  difficulty?: "easy" | "medium" | "hard";
  categories?: string[];
  repository?: string;
}

export interface RunMetrics {
  durationMs: number | null;
  totalTurns: number | null;
  toolCalls: number | null;
  commandsExecuted: number | null;
  filesInspected: number | null;
  filesChanged: number | null;
  iterations: number | null;
  iterationsSource: "v1-state" | "metadata" | "trajectory" | "fallback" | "unavailable";
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

export interface RunCost {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  inputCostUsd: number | null;
  outputCostUsd: number | null;
  totalCostUsd: number | null;
  costUsd: number | null;
  costStatus: "computed" | "provider" | "unavailable";
  costSource: "computed" | "provider" | "none";
  pricingModel?: string;
}

export interface EvaluationResult {
  evaluationId: string;
  runId: string;
  caseId: string;

  benchmarkVersion: string;
  benchmarkFingerprint: string;

  agentVersion: string;
  model?: string;
  piVersion?: string;

  startedAt: string;
  completedAt: string;
  durationMs: number;

  patchPath?: string;

  status: EvaluationStatus;
  verdict?: Verdict;

  verification: {
    patchApply: VerificationStageResult;
    reproduction: VerificationStageResult;
    oracle: VerificationStageResult;
    regression: VerificationStageResult;
  };

  workspace?: {
    isolated: boolean;
    tmpRoot?: string;
    cleanupError?: string;
  };

  error?: {
    code: string;
    message: string;
  };

  /** Enriched from manifest.json for breakdowns */
  caseMeta?: CaseMeta;

  /** Per-run performance metrics (added v1 metrics upgrade) */
  metrics?: RunMetrics;

  /** Per-run cost (null if unavailable, never $0 invent) */
  cost?: RunCost;
}

export interface EvaluateOptions {
  runId?: string;
  caseId?: string;
  patchPath?: string;
  patchContent?: string;
  agentVersion?: string;
  model?: string;
  piVersion?: string;
  benchmarkVersion?: string;
  benchmarkFingerprint?: string;
  allowBenchmarkMismatch?: boolean;
  allowCrossBenchmark?: boolean;
  force?: boolean;
  pricingConfigPath?: string;
  runsDir?: string;
  timeouts?: {
    patchApplyMs?: number;
    reproductionMs?: number;
    oracleMs?: number;
    regressionMs?: number;
  };
  keepWorkspace?: boolean;
}

export interface FailureBreakdown {
  verified: number;
  agent_failure: number;
  false_confidence: number;
  regression_failure: number;
  patch_failed: number;
  timeout: number;
  error: number;
}

export interface GroupMetrics {
  total: number;
  verified: number;
  vfr: number;
  reproductionRate: number;
  oracleRate: number;
  regressionFreeRate: number;
  falseConfidenceRate: number;
}

export interface HistoricalVsSyntheticBreakdown {
  historical: GroupMetrics;
  synthetic: GroupMetrics;
}

export interface DifficultyBreakdown {
  easy: GroupMetrics;
  medium: GroupMetrics;
  hard: GroupMetrics;
}

export type CategoryBreakdown = Record<string, GroupMetrics>;

export interface CaseStability {
  caseId: string;
  totalRuns: number;
  verifiedCount: number;
  stabilityRate: number;
  byVerdict: Record<Verdict, number>;
  failureCounts: FailureBreakdown;
  hasVariance: boolean;
}

export interface AggregatedMetrics {
  total: number;
  completed: number;
  errors: number;
  timeouts: number;
  byVerdict: Record<Verdict, number>;
  failureBreakdown: FailureBreakdown;
  rates: {
    vfr: number; // verified / total *100
    reproductionRate: number; // reproduction passed / total *100
    oracleRate: number; // oracle passed / total *100
    regressionFreeRate: number; // regression passed / regression tested *100
    falseConfidenceRate: number; // false_confidence / total *100
    // Legacy aliases (kept for backward compat, mirror new names)
    reproductionPassRate: number;
    oraclePassRate: number;
    regressionPassRate: number;
    agentFailureRate: number;
    regressionFailureRate: number;
  };
}

export interface ExperimentEvaluation {
  benchmark: {
    version: string;
    fingerprint: string;
  };
  experiment: {
    id: string;
    runsDir: string;
    timestamp: string;
    totalRuns: number;
    elapsedMs?: number;
  };
  summary: AggregatedMetrics;
  breakdowns: {
    historicalVsSynthetic: HistoricalVsSyntheticBreakdown;
    byDifficulty: DifficultyBreakdown;
    byCategory: CategoryBreakdown;
  };
  stability: CaseStability[];
  results: EvaluationResult[];
}

export interface AgentMetrics {
  agentVersion: string;
  runs: number;
  outcomes: {
    verified: number;
    agentFailure: number;
    falseConfidence: number;
    regressionFailure: number;
    timeout: number;
    error: number;
    patchFailed: number;
  };
  rates: {
    vfr: number | null;
    vfrValid: number | null;
    reproductionRate: number | null;
    oraclePassRate: number | null;
    regressionFreeRate: number | null;
    patchApplySuccessRate: number | null;
    falseConfidenceRate: number | null;
    agentFailureRate: number | null;
    regressionFailureRate: number | null;
    timeoutRate: number | null;
  };
  efficiency: {
    totalCostUsd: number | null;
    averageCostUsd: number | null;
    medianCostUsd: number | null;
    averageDurationMs: number | null;
    medianDurationMs: number | null;
    averageTurns: number | null;
    medianTurns: number | null;
    averageToolCalls: number | null;
    medianToolCalls: number | null;
    averageTokens: number | null;
    medianTokens: number | null;
    averageIterations: number | null;
    medianIterations: number | null;
    timeoutRate: number;
  };
}

export interface CaseReportRow {
  caseId: string;
  difficulty?: string;
  category?: string;
  categories?: string[];
  agentVersion: string;
  runs: number;
  verified: number;
  agentFailures: number;
  falseConfidence: number;
  regressionFailures: number;
  timeouts: number;
  errors: number;
  patchFailed: number;
  vfr: number | null;
  vfrValid: number | null;
  avgCost: number | null;
  medianCost: number | null;
  avgDuration: number | null;
  medianDuration: number | null;
  avgTurns: number | null;
  avgToolCalls: number | null;
  avgTokens: number | null;
  consistency: number | null;
}

export interface ComparisonRow {
  metric: string;
  v0: number | null;
  v1: number | null;
  delta: number | null;
  deltaUnit: "pp" | "absolute" | "percent";
  v0Label?: string;
  v1Label?: string;
}

export interface FailureAnalysis {
  agentFailures: { runId: string; caseId: string; agentVersion: string }[];
  falseConfidences: { runId: string; caseId: string; agentVersion: string }[];
  regressionFailures: { runId: string; caseId: string; agentVersion: string }[];
  timeouts: { runId: string; caseId: string; agentVersion: string }[];
  infrastructureErrors: { runId: string; caseId: string; agentVersion: string; code?: string }[];
}

export interface CostMethodology {
  pricingSnapshot: import("./pricing.ts").PricingConfig | null;
  costCalculation: string;
  note: string;
}

export interface ExperimentReport {
  experiment: {
    id: string;
    runsDir: string;
    timestamp: string;
    totalRuns: number;
    elapsedMs?: number;
  };
  benchmark: {
    version: string;
    fingerprint: string;
  };
  evaluatorVersion: string;
  agents: AgentMetrics[];
  summary: AggregatedMetrics;
  breakdowns: {
    historicalVsSynthetic: HistoricalVsSyntheticBreakdown;
    byDifficulty: DifficultyBreakdown;
    byCategory: CategoryBreakdown;
  };
  stability: CaseStability[];
  caseBreakdown: CaseReportRow[];
  comparison: ComparisonRow[] | null;
  failures: FailureAnalysis;
  costMethodology: CostMethodology;
  limitations: string[];
  results: EvaluationResult[];
  validRunRate?: {
    vfrOverall: number | null;
    vfrValid: number | null;
    total: number;
    valid: number;
    infraErrors: number;
  };
}

export interface SummaryJson {
  experimentId: string;
  benchmark: { version: string; fingerprint: string };
  evaluatorVersion: string;
  timestamp: string;
  totalRuns: number;
  agents: Array<{
    agentVersion: string;
    runs: number;
    vfr: number | null;
    vfrValid: number | null;
    avgCost: number | null;
    medianCost: number | null;
    avgDuration: number | null;
    medianDuration: number | null;
  }>;
  comparison: ComparisonRow[] | null;
  limitations: string[];
}

/**
 * Run artifact contract — minimal fields evaluator reads from experiments/runs/<runId>/
 */
export interface RunArtifact {
  runId: string;
  caseId: string;
  agentVersion?: string;
  benchmarkVersion?: string;
  benchmarkFingerprint?: string;
  model?: string;
  piVersion?: string;
  patchPath: string;
  metadataPath?: string;
}
