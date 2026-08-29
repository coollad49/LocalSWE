/**
 * Evaluator Types — deterministic verification result schema.
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
  timeouts?: {
    patchApplyMs?: number;
    reproductionMs?: number;
    oracleMs?: number;
    regressionMs?: number;
  };
  keepWorkspace?: boolean;
}

export interface AggregatedMetrics {
  total: number;
  completed: number;
  errors: number;
  timeouts: number;
  byVerdict: Record<Verdict, number>;
  rates: {
    vfr: number; // verified / completed *100
    reproductionPassRate: number;
    oraclePassRate: number;
    regressionPassRate: number;
    agentFailureRate: number;
    falseConfidenceRate: number;
    regressionFailureRate: number;
  };
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
