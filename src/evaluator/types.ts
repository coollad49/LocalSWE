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
